'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import useApi from '@/hooks/useApi';
import { doc, setDoc, getDoc, updateDoc, collection, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface TimeTrackingContextType {
  isTracking: boolean;
  currentSessionTime: number;
  startTracking: () => void;
  stopTracking: () => void;
  resetSession: () => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
};

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const api = useApi();
  const [isTracking, setIsTracking] = useState(false);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastUpdateRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(0);
  const lastAggregatedMinuteRef = useRef<number>(0);

  // Zapisz czas sesji do Firebase Storage
  const saveSessionToFirebase = useCallback(async (sessionTime: number, sessionStart: number) => {
    if (!user?.uid) return;

    try {
      const sessionDoc = doc(db, 'userSessions', user.uid);
      await setDoc(sessionDoc, {
        currentSessionTime: sessionTime,
        sessionStartTime: sessionStart,
        lastUpdated: Date.now(),
        isActive: true
      }, { merge: true });
      
      // Backup do localStorage
      localStorage.setItem(`session_${user.uid}`, JSON.stringify({
        currentSessionTime: sessionTime,
        sessionStartTime: sessionStart,
        lastUpdated: Date.now(),
        isActive: true
      }));
    } catch (error) {
      console.error('Error saving session to Firebase:', error);
      
      // Jeśli Firebase nie działa, zapisz tylko do localStorage
      if (user?.uid) {
        localStorage.setItem(`session_${user.uid}`, JSON.stringify({
          currentSessionTime: sessionTime,
          sessionStartTime: sessionStart,
          lastUpdated: Date.now(),
          isActive: true
        }));
      }
    }
  }, [user]);

  // Zaktualizuj dzienny agregat czasu w kolekcji `learningTime`
  const updateDailyAggregate = useCallback(async (minutesToAdd: number) => {
    if (!user?.uid || minutesToAdd <= 0) return;
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD
      const hour = now.getHours().toString();
      const weekday = now.getDay().toString(); // 0=ndz

      const col = collection(db, 'learningTime');
      const docId = `${user.uid}_${dateKey}`;
      const ltDoc = doc(col, docId);
      await setDoc(ltDoc, {
        userId: user.uid,
        dateKey,
        date: Timestamp.fromDate(new Date(year, now.getMonth(), now.getDate())),
        minutes: increment(minutesToAdd),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // inkrementuj rozkład godzinowy i dni tygodnia
      await updateDoc(ltDoc, {
        [`byHour.${hour}`]: increment(minutesToAdd),
        [`byWeekday.${weekday}`]: increment(minutesToAdd),
      });
    } catch (e) {
      console.error('Error updating daily aggregate', e);
    }
  }, [user]);

  // helper: czy ten sam dzień (lokalna strefa)
  const isSameDay = (t1: number, t2: number) => {
    const a = new Date(t1);
    const b = new Date(t2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  // Wczytaj czas sesji z Firebase Storage
  const loadSessionFromFirebase = useCallback(async () => {
    if (!user?.uid) return;

    try {
      // Najpierw spróbuj z localStorage (szybsze)
      const localSession = localStorage.getItem(`session_${user.uid}`);
      if (localSession) {
        const localData = JSON.parse(localSession);
        const startTs = localData.sessionStartTime || Date.now();
        if (isSameDay(startTs, Date.now())) {
          const timeSinceLastUpdate = Math.floor((Date.now() - (localData.lastUpdated || Date.now())) / 60000);
          const savedTime = localData.currentSessionTime || 0;
          const totalTime = (localData.isActive ? savedTime + timeSinceLastUpdate : savedTime);
          setCurrentSessionTime(totalTime);
          sessionStartTimeRef.current = startTs;
          setIsTracking(Boolean(localData.isActive));
        } else {
          // Stara sesja (inny dzień) — wyczyść
          localStorage.removeItem(`session_${user.uid}`);
          setCurrentSessionTime(0);
          sessionStartTimeRef.current = Date.now();
          setIsTracking(false);
        }
        
        console.log(`Loaded session from localStorage`);
      }

      // Następnie spróbuj z Firebase (dokładniejsze)
      const sessionDoc = doc(db, 'userSessions', user.uid);
      const sessionSnap = await getDoc(sessionDoc);
      
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const sessionStart = data.sessionStartTime || Date.now();
        const lastUpdated = data.lastUpdated || Date.now();
        const isActive = Boolean(data.isActive);
        const savedTime = data.currentSessionTime || 0;

        if (isSameDay(sessionStart, Date.now())) {
          const timeSinceLastUpdate = Math.floor((Date.now() - lastUpdated) / 60000);
          const totalTime = isActive ? savedTime + timeSinceLastUpdate : savedTime;
          setCurrentSessionTime(totalTime);
          sessionStartTimeRef.current = sessionStart;
          setIsTracking(isActive);
          console.log(`Loaded session from Firebase: started ${new Date(sessionStart).toLocaleString()}, active=${isActive}`);
        } else {
          // Nowy dzień — wyzeruj dzisiejszą sesję
          setCurrentSessionTime(0);
          sessionStartTimeRef.current = Date.now();
          setIsTracking(false);
        }
      } else {
        // Brak sesji w Firebase, sprawdź localStorage
        if (!localSession) {
          setCurrentSessionTime(0);
          sessionStartTimeRef.current = Date.now();
          setIsTracking(false);
        }
      }
    } catch (error) {
      console.error('Error loading session from Firebase:', error);
      
      // W przypadku błędu Firebase, użyj localStorage
      const localSession = localStorage.getItem(`session_${user.uid}`);
      if (localSession) {
        const localData = JSON.parse(localSession);
        const startTs = localData.sessionStartTime || Date.now();
        if (isSameDay(startTs, Date.now())) {
          const timeSinceLastUpdate = Math.floor((Date.now() - (localData.lastUpdated || Date.now())) / 60000);
          const savedTime = localData.currentSessionTime || 0;
          const totalTime = (localData.isActive ? savedTime + timeSinceLastUpdate : savedTime);
          setCurrentSessionTime(totalTime);
          sessionStartTimeRef.current = startTs;
          setIsTracking(Boolean(localData.isActive));
        } else {
          // Stara sesja
          setCurrentSessionTime(0);
          sessionStartTimeRef.current = Date.now();
          setIsTracking(false);
        }
        
        console.log(`Loaded session from localStorage (fallback)`);
      } else {
        // Brak sesji w localStorage, zacznij nową
        setCurrentSessionTime(0);
        sessionStartTimeRef.current = Date.now();
        setIsTracking(false);
      }
    } finally {
      setHasLoadedSession(true);
    }
  }, [user]);

  // Aktualizuj aktywność użytkownika
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  // Sprawdź czy użytkownik jest aktywny (ostatnia aktywność w ciągu 5 minut)
  const isUserActive = () => {
    return Date.now() - lastActivityRef.current < 5 * 60 * 1000; // 5 minut
  };

  // Wyślij czas do backendu
  const sendTimeToBackend = useCallback(async (minutes: number) => {
    if (!user?.uid || minutes <= 0) {
      console.log(`Not sending time to backend: user=${!!user?.uid}, minutes=${minutes}`);
      return;
    }

    try {
      console.log(`Sending ${minutes} minutes to backend for user ${user.uid}`);
      const response = await api.post('/api/update-learning-time/', {
        lesson_id: 'general_learning',
        time_spent_minutes: minutes
      });
      console.log(`Successfully sent ${minutes} minutes to backend:`, response);
    } catch (error) {
      console.error('Error sending time to backend:', error);
    }
  }, [api, user]);

  const startTracking = useCallback(() => {
    if (!user) return;
    
    setIsTracking(true);
    sessionStartTimeRef.current = Date.now();
    setCurrentSessionTime(0);
    
    // Zapisz początek sesji do Firebase
    saveSessionToFirebase(0, sessionStartTimeRef.current);
    
    console.log('Started time tracking');
  }, [user, saveSessionToFirebase]);

  const stopTracking = useCallback(async () => {
    if (!user) return;
    
    setIsTracking(false);
    
    // Nie wysyłamy dodatkowo czasu tutaj, bo wysyłamy co minutę podczas trwania sesji
    
    // Zapisz zakończenie sesji w Firebase
    if (user?.uid) {
      try {
        const sessionDoc = doc(db, 'userSessions', user.uid);
        await updateDoc(sessionDoc, {
          isActive: false,
          sessionEndTime: Date.now(),
          totalSessionTime: currentSessionTime
        });
        
        // Usuń z localStorage
        localStorage.removeItem(`session_${user.uid}`);
      } catch (error) {
        console.error('Error updating session end in Firebase:', error);
        
        // Jeśli Firebase nie działa, usuń tylko z localStorage
        localStorage.removeItem(`session_${user.uid}`);
      }
    }
    
    setCurrentSessionTime(0);
    console.log('Stopped time tracking');
  }, [user, currentSessionTime, sendTimeToBackend]);

  const resetSession = () => {
    setCurrentSessionTime(0);
    sessionStartTimeRef.current = Date.now();
    
    if (user?.uid) {
      saveSessionToFirebase(0, sessionStartTimeRef.current);
    }
  };

  // Wyczyść stare sesje (starsze niż 24h)
  const cleanupOldSessions = useCallback(() => {
    if (!user?.uid) return;
    
    try {
      const localSession = localStorage.getItem(`session_${user.uid}`);
      if (localSession) {
        const localData = JSON.parse(localSession);
        const hoursSinceLastUpdate = (Date.now() - localData.lastUpdated) / (1000 * 60 * 60);
        
        if (hoursSinceLastUpdate > 24) {
          localStorage.removeItem(`session_${user.uid}`);
          console.log('Cleaned up old session from localStorage');
        }
      }
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }, [user]);

  // Timer do aktualizacji czasu sesji
  useEffect(() => {
    if (isTracking && user) {
      intervalRef.current = setInterval(() => {
        if (isUserActive()) {
          setCurrentSessionTime(prev => {
            const newTime = prev + 1;
            
            console.log(`Session time updated: ${newTime} minutes`);
            
            // Zapisz do Firebase co minutę
            if (newTime % 1 === 0) {
              console.log(`Saving to Firebase: ${newTime} minutes`);
              saveSessionToFirebase(newTime, sessionStartTimeRef.current);
              // agreguj do dziennego podsumowania tylko nowo dodaną minutę
              if (newTime > lastAggregatedMinuteRef.current) {
                updateDailyAggregate(newTime - lastAggregatedMinuteRef.current);
                lastAggregatedMinuteRef.current = newTime;
              }
            }
            
            // Wyślij do backendu co minutę (1 minuta)
            console.log(`Sending to backend: 1 minute`);
            sendTimeToBackend(1);
            
            return newTime;
          });
        }
      }, 60000); // Co minutę
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking, user, saveSessionToFirebase, sendTimeToBackend, updateDailyAggregate]);

  // Wczytaj sesję z Firebase przy starcie
  useEffect(() => {
    if (user) {
      cleanupOldSessions();
      loadSessionFromFirebase();
    }
  }, [user, cleanupOldSessions, loadSessionFromFirebase]);

  // Po załadowaniu sesji: wznów śledzenie bez resetu (jeśli są już minuty), w przeciwnym razie rozpocznij nową sesję
  useEffect(() => {
    if (!user || !hasLoadedSession) return;
    if (!isTracking) {
      if (currentSessionTime > 0) {
        setIsTracking(true);
        if (!sessionStartTimeRef.current) {
          sessionStartTimeRef.current = Date.now();
        }
        saveSessionToFirebase(currentSessionTime, sessionStartTimeRef.current);
      } else {
        startTracking();
      }
    }
  }, [user, hasLoadedSession, isTracking, currentSessionTime, startTracking, saveSessionToFirebase]);

  // Dodaj event listeners dla aktywności użytkownika
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Zatrzymaj śledzenie gdy użytkownik się wyloguje
  useEffect(() => {
    if (!user && isTracking) {
      stopTracking();
    }
  }, [user, isTracking, stopTracking]);

  // Zapisz sesję przed zamknięciem strony
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.uid && isTracking) {
        saveSessionToFirebase(currentSessionTime, sessionStartTimeRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, isTracking, currentSessionTime, saveSessionToFirebase]);

  const value: TimeTrackingContextType = {
    isTracking,
    currentSessionTime,
    startTracking,
    stopTracking,
    resetSession
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}; 