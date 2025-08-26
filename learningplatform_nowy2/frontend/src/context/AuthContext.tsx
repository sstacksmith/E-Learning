"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';

export type User = {
  uid: string;
  email: string;
  role: UserRole;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string, displayName: string, role: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  loginWithApproval: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  getCurrentUserRole: () => Promise<UserRole | null>;
  isAuthenticated: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          const role = userData.role as UserRole || 'student';

          console.log('AuthContext - Firebase user data:', userData);
          console.log('AuthContext - Detected role:', role);

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: role,
          });
          setIsAuthenticated(true);

          // Store the token
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('firebaseToken', token);

          // Nie przekierowujemy rodzica nigdzie - ma widzieć normalną stronę homelogin
        } else {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('firebaseToken');
        }
      } catch (err) {
        console.error('AuthContext error:', err);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('firebaseToken');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Register user with email, password, and role
  const register = async (email: string, password: string, displayName: string, role: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        role
      });
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Login user with approval check
  const loginWithApproval = async (email: string, password: string) => {
    console.log('loginWithApproval wywołane', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error('Użytkownik nie istnieje.');
    }

    const userData = userDoc.data();
    console.log('loginWithApproval - User data from Firestore:', userData);
    console.log('loginWithApproval - User role:', userData.role);
    
    if (!userData.approved && userData.role !== 'parent') {
      await signOut(auth);
      throw new Error('Twoje konto oczekuje na zatwierdzenie przez administratora.');
    }

    // Zapisz token JWT do localStorage pod kluczem 'token'
    const token = await user.getIdToken();
    console.log('Pobrany token:', token);
    localStorage.setItem('token', token);
    console.log('Token zapisany do localStorage');

    // Zwróć userCredential aby można było pobrać rolę w komponencie logowania
    return userCredential;
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Get current user role
  const getCurrentUserRole = async (): Promise<UserRole | null> => {
    if (!auth.currentUser) return null;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!userDoc.exists()) return null;
    return userDoc.data().role as UserRole || null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, loginWithApproval, logout, getCurrentUserRole, isAuthenticated, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 