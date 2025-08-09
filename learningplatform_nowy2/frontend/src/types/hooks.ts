import { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';

export interface UseApiConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface UseApiMethods {
  get<T>(url: string, config?: RequestInit): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestInit): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestInit): Promise<T>;
  delete<T>(url: string, config?: RequestInit): Promise<T>;
}

export interface UseApiError {
  status: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface UseAuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAuthMethods {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export interface UseLearningTrackerState {
  isTracking: boolean;
  activeSession: {
    startTime: number;
    courseId?: string;
    activityType: 'course' | 'quiz' | 'assignment' | 'other';
  };
  totalTime: number;
}

export interface UseLearningTrackerMethods {
  startTracking: (courseId?: string, activityType?: 'course' | 'quiz' | 'assignment' | 'other') => void;
  stopTracking: () => void;
  resetTime: () => void;
}

export interface UseAppCheckDebugConfig {
  app: FirebaseApp;
  debug?: boolean;
}

export interface UseTimeTrackingState {
  isTracking: boolean;
  currentSession: {
    startTime: number;
    courseId?: string;
    activityType: string;
  };
  totalTime: number;
  lastUpdate: number;
}

export interface UseTimeTrackingMethods {
  startTracking: (courseId?: string, activityType?: string) => void;
  stopTracking: () => void;
  resetTime: () => void;
  saveSession: () => Promise<void>;
}
