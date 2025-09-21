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
          // Sprawdź cache przed żądaniem do Firestore
          const cacheKey = `userData_${firebaseUser.uid}`;
          const cachedData = localStorage.getItem(cacheKey);
          let userData: any = {};
          let role: UserRole = 'student';

          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              // Sprawdź czy cache nie jest starszy niż 5 minut
              if (parsed.timestamp && Date.now() - parsed.timestamp < 300000) {
                userData = parsed.data;
                role = (userData as any).role as UserRole || 'student';
                console.log('📦 Używam cached danych użytkownika');
              } else {
                throw new Error('Cache expired');
              }
            } catch {
              // Cache nieprawidłowy lub wygasł, pobierz nowe dane
              console.log('🔄 Cache nieprawidłowy, pobieram nowe dane');
            }
          }

          if (!cachedData || Object.keys(userData).length === 0) {
            // Get additional user data from Firestore z timeoutem
            const userDocPromise = getDoc(doc(db, 'users', firebaseUser.uid));
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout pobierania danych użytkownika')), 3000)
            );
            
            const userDoc = await Promise.race([userDocPromise, timeoutPromise]) as any;
            userData = userDoc.exists() ? userDoc.data() : {};
            role = (userData as any).role as UserRole || 'student';

            // Zapisz do cache
            localStorage.setItem(cacheKey, JSON.stringify({
              data: userData,
              timestamp: Date.now()
            }));
            console.log('💾 Dane użytkownika zapisane do cache');
          }

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
          // Wyczyść cache przy wylogowaniu
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('userData_')) {
              localStorage.removeItem(key);
            }
          });
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

    // Ustaw custom claims w Firebase Auth jeśli rola jest teacher/admin
    if (userData.role === 'teacher' || userData.role === 'admin') {
      try {
        // Dodaj timeout dla API call - maksymalnie 3 sekundy
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`/api/set-${userData.role}-role-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: user.uid }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ Custom claims set for ${userData.role}`);
        } else {
          console.warn(`⚠️ Failed to set custom claims for ${userData.role}`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⚠️ Custom claims API timeout for ${userData.role} - continuing login`);
        } else {
          console.error('Error setting custom claims:', error);
        }
      }
    }

    // Zapisz token JWT do localStorage - używamy tylko jednego klucza
    const token = await user.getIdToken();
    console.log('Pobrany token:', token);
    localStorage.setItem('firebaseToken', token);
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