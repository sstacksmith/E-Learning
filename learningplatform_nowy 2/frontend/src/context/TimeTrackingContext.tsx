"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface TimeEntry {
  date: string; // YYYY-MM-DD
  timeSpent: number; // w minutach
}

interface TimeTrackingData {
  totalTime: number;
  dailyTime: TimeEntry[];
  weeklyTime: number;
  monthlyTime: number;
}

interface TimeTrackingContextType {
  timeData: TimeTrackingData;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  getTodayTime: () => number;
  getWeekTime: () => number;
  getMonthTime: () => number;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [timeData, setTimeData] = useState<TimeTrackingData>({
    totalTime: 0,
    dailyTime: [],
    weeklyTime: 0,
    monthlyTime: 0
  });
  const [isTracking, setIsTracking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const syncRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const timeDataRef = useRef<TimeTrackingData>(timeData);

  // Aktualizuj ref gdy timeData się zmienia
  useEffect(() => {
    timeDataRef.current = timeData;
  }, [timeData]);

  // Ładowanie danych z Firestore
  useEffect(() => {
    if (!user) return;
    
    const loadTimeData = async () => {
      try {
        // Najpierw spróbuj załadować z localStorage
        const localData = localStorage.getItem(`timeTracking_${user.uid}`);
        if (localData) {
          const parsedData = JSON.parse(localData);
          setTimeData({
            totalTime: parsedData.totalTime || 0,
            dailyTime: parsedData.dailyTime || [],
            weeklyTime: calculateWeekTime(parsedData.dailyTime || []),
            monthlyTime: calculateMonthTime(parsedData.dailyTime || [])
          });
        }
        
        // Następnie załaduj z Firestore
        const userDocRef = doc(db, 'userTimeTracking', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const firestoreData = {
            totalTime: data.totalTime || 0,
            dailyTime: data.dailyTime || [],
            weeklyTime: calculateWeekTime(data.dailyTime || []),
            monthlyTime: calculateMonthTime(data.dailyTime || [])
          };
          
          setTimeData(firestoreData);
          // Zapisz do localStorage
          localStorage.setItem(`timeTracking_${user.uid}`, JSON.stringify(firestoreData));
        }
      } catch (error) {
        console.error('Error loading time data:', error);
      }
    };

    loadTimeData();
  }, [user]);

  // Automatyczne rozpoczęcie śledzenia przy wejściu na stronę
  useEffect(() => {
    if (user && !isTracking) {
      startTracking();
    }
    
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [user]);

  // Kalkulacja czasu tygodniowego
  const calculateWeekTime = (dailyEntries: TimeEntry[]): number => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return dailyEntries
      .filter(entry => new Date(entry.date) >= oneWeekAgo)
      .reduce((total, entry) => total + entry.timeSpent, 0);
  };

  // Kalkulacja czasu miesięcznego
  const calculateMonthTime = (dailyEntries: TimeEntry[]): number => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return dailyEntries
      .filter(entry => new Date(entry.date) >= oneMonthAgo)
      .reduce((total, entry) => total + entry.timeSpent, 0);
  };

  const startTracking = () => {
    if (isTracking || !user) return;
    
    setIsTracking(true);
    startTimeRef.current = new Date();
    
    // Timer do aktualizacji co minutę
    timerRef.current = setInterval(() => {
      updateTimeData();
    }, 60000); // co 60 sekund
    
    // Synchronizacja z Firestore co 5 minut
    syncRef.current = setInterval(() => {
      syncToFirestore();
    }, 300000); // co 5 minut
  };

  const stopTracking = () => {
    if (!isTracking) return;
    
    updateTimeData();
    syncToFirestore();
    setIsTracking(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (syncRef.current) {
      clearInterval(syncRef.current);
      syncRef.current = null;
    }
    
    startTimeRef.current = null;
  };

  const updateTimeData = () => {
    if (!startTimeRef.current) return;
    
    const now = new Date();
    const sessionTime = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 60000); // w minutach
    
    if (sessionTime < 1) return; // Nie zapisuj jeśli mniej niż minuta
    
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    setTimeData(prevData => {
      const newDailyTime = [...prevData.dailyTime];
      const todayIndex = newDailyTime.findIndex(entry => entry.date === today);
      
      if (todayIndex >= 0) {
        newDailyTime[todayIndex].timeSpent += sessionTime;
      } else {
        newDailyTime.push({ date: today, timeSpent: sessionTime });
      }
      
      // Sortuj po dacie (najnowsze pierwsze)
      newDailyTime.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Zachowaj tylko ostatnie 90 dni
      const last90Days = newDailyTime.slice(0, 90);
      
      const updatedData = {
        totalTime: prevData.totalTime + sessionTime,
        dailyTime: last90Days,
        weeklyTime: calculateWeekTime(last90Days),
        monthlyTime: calculateMonthTime(last90Days)
      };
      
      // Zapisz do localStorage
      if (user) {
        localStorage.setItem(`timeTracking_${user.uid}`, JSON.stringify(updatedData));
      }
      
      // Natychmiast zapisz do Firestore
      setTimeout(() => syncToFirestore(updatedData), 100);
      
      return updatedData;
    });
    
    // Reset czasu rozpoczęcia sesji
    startTimeRef.current = now;
  };

  const syncToFirestore = async (dataToSync?: TimeTrackingData) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'userTimeTracking', user.uid);
      const dataToSave = dataToSync || timeDataRef.current;
      await setDoc(userDocRef, dataToSave, { merge: true });
      
      // Również zapisz do localStorage
      localStorage.setItem(`timeTracking_${user.uid}`, JSON.stringify(dataToSave));
      
      console.log('Time data synced to Firestore and localStorage:', dataToSave);
    } catch (error) {
      console.error('Error syncing time data:', error);
    }
  };

  const getTodayTime = (): number => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = timeData.dailyTime.find(entry => entry.date === today);
    return todayEntry ? todayEntry.timeSpent : 0;
  };

  const getWeekTime = (): number => {
    return timeData.weeklyTime;
  };

  const getMonthTime = (): number => {
    return timeData.monthlyTime;
  };

  return (
    <TimeTrackingContext.Provider value={{
      timeData,
      isTracking,
      startTracking,
      stopTracking,
      getTodayTime,
      getWeekTime,
      getMonthTime
    }}>
      {children}
    </TimeTrackingContext.Provider>
  );
};

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
}; 