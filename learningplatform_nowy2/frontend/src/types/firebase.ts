import { Timestamp } from 'firebase/firestore';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'student' | 'teacher' | 'admin';
}

export interface FirebaseDocument {
  id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;
}

export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface FirebaseError {
  code: string;
  message: string;
  details?: unknown;
}

export interface FirebaseQueryResult<T> {
  docs: Array<{
    id: string;
    data(): T;
  }>;
  empty: boolean;
  size: number;
}

export interface FirebaseDocumentData {
  [field: string]: unknown;
}
