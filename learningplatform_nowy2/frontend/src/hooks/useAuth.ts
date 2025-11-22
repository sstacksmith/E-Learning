import { useEffect, useState, useCallback } from 'react';
import { auth } from '../config/firebase';
import { User, UserCredential } from 'firebase/auth';
import { db } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UseAuthState } from '@/types/hooks';

const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minut przed wygaśnięciem
const TOKEN_KEY = 'firebaseToken';
const TOKEN_EXPIRY_KEY = 'firebaseTokenExpiry';

// Używamy sessionStorage dla bezpieczeństwa - sesja wygasa po zamknięciu przeglądarki
function getStoredToken() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;

  const expiryTime = parseInt(expiry, 10);
  if (Date.now() + TOKEN_EXPIRY_BUFFER >= expiryTime) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }

  return token;
}

function storeToken(token: string, expiryTime: number) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

export function useAuth(): UseAuthState & {
  getAuthToken: () => Promise<string | null>;
  loginWithApproval: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tokenRefreshTimeout, setTokenRefreshTimeout] = useState<NodeJS.Timeout | null>(null);

  // Funkcja do dekodowania JWT i pobrania czasu wygaśnięcia
  const getTokenExpiry = useCallback((token: string): number => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      const payload = JSON.parse(jsonPayload);
      return payload.exp * 1000; // konwersja na milisekundy
    } catch (e) {
      console.error('Error decoding token:', e);
      return Date.now() + 3600 * 1000; // domyślnie 1 godzina
    }
  }, []);

  // Funkcja do planowania odświeżenia tokenu
  const scheduleTokenRefresh = useCallback((token: string): void => {
    if (tokenRefreshTimeout) {
      clearTimeout(tokenRefreshTimeout);
    }

    const expiryTime = getTokenExpiry(token);
    const timeUntilRefresh = Math.max(0, expiryTime - Date.now() - TOKEN_EXPIRY_BUFFER);

    const timeout = setTimeout(async () => {
      if (user) {
        try {
          const newToken = await user.getIdToken(true);
          const newExpiryTime = getTokenExpiry(newToken);
          storeToken(newToken, newExpiryTime);
          scheduleTokenRefresh(newToken);
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }
    }, timeUntilRefresh);

    setTokenRefreshTimeout(timeout);
  }, [tokenRefreshTimeout, user, getTokenExpiry]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Najpierw sprawdź czy mamy ważny token w cache
          const cachedToken = getStoredToken();
          if (cachedToken) {
            setUser(firebaseUser);
          } else {
            // Jeśli nie ma ważnego tokenu, pobierz nowy
            const token = await firebaseUser.getIdToken();
            const expiryTime = getTokenExpiry(token);
            storeToken(token, expiryTime);
            scheduleTokenRefresh(token);
          }
          setUser(firebaseUser);
        } catch (error) {
          console.error('Error in auth state change:', error);
          setError(error as Error);
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
          setUser(null);
        }
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
        if (tokenRefreshTimeout) {
          clearTimeout(tokenRefreshTimeout);
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
    };
  }, [scheduleTokenRefresh, tokenRefreshTimeout, user, getTokenExpiry]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    console.log('getAuthToken called, user:', user?.uid);
    
    if (!user) {
      console.log('getAuthToken: No user, returning null');
      return null;
    }

    try {
      // Najpierw sprawdź cache
      const cachedToken = getStoredToken();
      console.log('getAuthToken: Cached token exists:', !!cachedToken);
      
      if (cachedToken) {
        console.log('getAuthToken: Returning cached token');
        return cachedToken;
      }

      // Jeśli nie ma ważnego tokenu w cache, pobierz nowy
      console.log('getAuthToken: Getting fresh token from Firebase');
      const token = await user.getIdToken();
      const expiryTime = getTokenExpiry(token);
      storeToken(token, expiryTime);
      scheduleTokenRefresh(token);
      console.log('getAuthToken: Returning fresh token');
      return token;
      } catch (error) {
        console.error('Error getting auth token:', error);
        setError(error as Error);
      return null;
    }
  }, [user, getTokenExpiry, scheduleTokenRefresh]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await auth.signOut();
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error as Error);
    }
  }, [tokenRefreshTimeout]);

  const loginWithApproval = useCallback(async (email: string, password: string): Promise<UserCredential> => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
    
    if (!userDoc.exists() || !userDoc.data().approved) {
      await auth.signOut();
      throw new Error("Twoje konto oczekuje na zatwierdzenie przez administratora.");
    }
    
    const token = await userCred.user.getIdToken();
    const expiryTime = getTokenExpiry(token);
    storeToken(token, expiryTime);
    scheduleTokenRefresh(token);
    
    return userCred;
  }, [getTokenExpiry, scheduleTokenRefresh]);

  return {
    user,
    loading,
    error,
    getAuthToken,
    logout,
    loginWithApproval
  };
} 