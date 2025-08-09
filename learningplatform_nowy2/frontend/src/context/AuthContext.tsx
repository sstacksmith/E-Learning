"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  // User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

export type User = {
  uid: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string, displayName: string, role: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  loginWithApproval: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUserRole: () => Promise<'student' | 'teacher' | 'admin' | null>;
  isAuthenticated: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'firebaseToken';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          const role = userData.role as 'student' | 'teacher' | 'admin' || 'student';

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: role,
          });
          setIsAuthenticated(true);

          // Store the token
          const token = await firebaseUser.getIdToken(true);
          console.log('Storing fresh token in AuthContext');
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (err) {
        console.error('AuthContext error:', err);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
    console.log('loginWithApproval called', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists() || !userDoc.data().approved) {
      await signOut(auth);
      throw new Error('Twoje konto oczekuje na zatwierdzenie przez administratora.');
    }
    
    // Get and store fresh token
    const token = await user.getIdToken(true);
    console.log('Got fresh token after login');
    localStorage.setItem(TOKEN_KEY, token);
    console.log('Token stored in localStorage');
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem(TOKEN_KEY);
      console.log('Logged out and removed token');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Get current user role
  const getCurrentUserRole = async (): Promise<'student' | 'teacher' | 'admin' | null> => {
    if (!auth.currentUser) return null;
    const idTokenResult = await auth.currentUser.getIdTokenResult();
    return idTokenResult.claims.role as 'student' | 'teacher' | 'admin' || null;
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