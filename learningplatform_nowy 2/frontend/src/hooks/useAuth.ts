import { useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';
import { db } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Pobierz nowy token
        const token = await user.getIdToken();
        localStorage.setItem('firebaseToken', token);
        setUser(user);
      } else {
        localStorage.removeItem('firebaseToken');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('firebaseToken');
  };

  const logout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('firebaseToken');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loginWithApproval = async (email: string, password: string) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
    if (!userDoc.exists() || !userDoc.data().approved) {
      await auth.signOut();
      throw new Error("Twoje konto oczekuje na zatwierdzenie przez administratora.");
    }
    return userCred;
  };

  return {
    user,
    loading,
    getAuthToken,
    logout,
    loginWithApproval
  };
} 