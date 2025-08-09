import { useState, useEffect, useRef, useCallback } from 'react';
import useApi from './useApi';
import { UseLearningTrackerState, UseLearningTrackerMethods } from '@/types/hooks';

interface LearningSession {
  lessonId: string;
  startTime: number;
  isActive: boolean;
}

export const useLearningTracker = (): UseLearningTrackerState & UseLearningTrackerMethods => {
  const api = useApi();
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Rozpocznij sesję nauki
  // Removed unused startLearning to satisfy strict lint rules

  // Zakończ sesję nauki
  const stopLearning = useCallback(async (): Promise<void> => {
    if (!activeSession) return;

    const timeSpentMinutes = Math.floor((Date.now() - activeSession.startTime) / (1000 * 60));
    
    if (timeSpentMinutes > 0) {
      try {
        await api.post('/api/update-learning-time/', {
          lesson_id: activeSession.lessonId,
          time_spent_minutes: timeSpentMinutes
        });
      } catch (error) {
        console.error('Error updating learning time:', error);
      }
    }

    setActiveSession(null);
  }, [activeSession, api]);

  // Aktualizuj czas co minutę
  useEffect(() => {
    if (activeSession?.isActive) {
      intervalRef.current = setInterval(async () => {
        const timeSpentMinutes = Math.floor((Date.now() - activeSession.startTime) / (1000 * 60));
        
        if (timeSpentMinutes > 0) {
          try {
            await api.post('/api/update-learning-time/', {
              lesson_id: activeSession.lessonId,
              time_spent_minutes: 1 // Dodaj 1 minutę
            });
            
            // Zaktualizuj startTime
            setActiveSession(prev => prev ? {
              ...prev,
              startTime: Date.now()
            } : null);
          } catch (error) {
            console.error('Error updating learning time:', error);
          }
        }
      }, 60000); // Co minutę
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeSession?.isActive, activeSession?.lessonId, activeSession?.startTime, api]);

  // Zatrzymaj śledzenie przy odmontowaniu
  useEffect(() => {
    return () => {
      if (activeSession) {
        stopLearning();
      }
    };
  }, [stopLearning, activeSession]);

  return {
    isTracking: !!activeSession?.isActive,
    activeSession: activeSession
      ? {
          startTime: activeSession.startTime,
          courseId: activeSession.lessonId,
          activityType: 'course'
        }
      : {
          startTime: 0,
          activityType: 'other'
        },
    totalTime: 0,
    startTracking: (courseId?: string) => {
      setActiveSession({
        lessonId: courseId || 'unknown',
        startTime: Date.now(),
        isActive: true
      });
    },
    stopTracking: () => { void stopLearning(); },
    resetTime: () => { /* no-op for now */ }
  };
}; 