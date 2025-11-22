import { useAuth } from './useAuth';
import { useCallback } from 'react';
import { UseApiMethods } from '@/types/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Konfiguracja ponownych prób
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 sekunda
const NETWORK_TIMEOUT = 10000; // 10 sekund

// Funkcja pomocnicza do opóźnienia
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Funkcja pomocnicza do sprawdzania czy błąd jest związany z siecią
const isNetworkError = (error: unknown): boolean => {
  return (
    error instanceof TypeError && (
      error.message === 'Failed to fetch' ||
      error.message === 'Network request failed' ||
      error.message.includes('network') ||
      !navigator.onLine
    )
  );
};

const useApi = (): UseApiMethods => {
  const { getAuthToken } = useAuth();

  const fetchWithRetry = useCallback(async (
    url: string,
    options: RequestInit,
    retryCount: number = RETRY_COUNT
  ): Promise<Response> => {
    try {
      // Dodaj timeout do fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (retryCount === 0 || !isNetworkError(error)) {
        throw error;
      }

      // Czekaj przed kolejną próbą
      await delay(RETRY_DELAY);

      // Spróbuj ponownie
      return fetchWithRetry(url, options, retryCount - 1);
    }
  }, []);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      console.log(`=== API REQUEST START ===`);
      console.log(`URL: ${url}`);
      console.log(`Options:`, options);
      
      const token = await getAuthToken();
      console.log(`Token obtained: ${!!token}`);
      console.log(`Token preview: ${token ? token.substring(0, 20) + '...' : 'null'}`);
      
      if (!token) {
        throw new Error('Brak tokenu autoryzacji. Zaloguj się ponownie.');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

      console.log(`Making API request to: ${fullUrl}`);
      console.log(`Request method: ${options.method || 'GET'}`);
      console.log(`Request headers:`, headers);
      console.log(`Request body:`, options.body);

      // Sprawdź połączenie z internetem
      if (!navigator.onLine) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      }

      const response = await fetchWithRetry(fullUrl, {
        ...options,
        headers,
      });

      console.log(`API response status: ${response.status}`);
      console.log(`API response URL: ${response.url}`);
      console.log(`API response headers:`, Object.fromEntries(response.headers.entries()));

      if (response.status === 401) {
        console.log(`❌ 401 Unauthorized - redirecting to login`);
        // Wyloguj użytkownika tylko jeśli token jest nieprawidłowy
        sessionStorage.removeItem('firebaseToken');
        sessionStorage.removeItem('firebaseTokenExpiry');
        sessionStorage.removeItem('lastActivity');
        // Wyczyść również localStorage dla kompatybilności wstecznej
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('firebaseTokenExpiry');
        window.location.href = '/login';
        throw new Error('Sesja wygasła. Zaloguj się ponownie.');
      }

      if (response.status === 403) {
        console.log(`❌ 403 Forbidden - checking response body`);
        try {
          const errorText = await response.text();
          console.log(`403 Error response body:`, errorText);
        } catch (e) {
          console.log(`Could not read 403 response body:`, e);
        }
        throw new Error('Brak uprawnień do wykonania tej operacji.');
      }

      if (response.status === 404) {
        throw new Error('Nie znaleziono zasobu.');
      }

      if (!response.ok) {
        // Próba pobrania szczegółów błędu z odpowiedzi
        let errorMessage = `Błąd serwera (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Jeśli nie można sparsować JSON, użyj domyślnej wiadomości
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Konwertuj błędy AbortController na bardziej przyjazne
      if ((error as Error).name === 'AbortError') {
        throw new Error('Przekroczono czas oczekiwania na odpowiedź serwera.');
      }

      // Jeśli to błąd sieciowy, dodaj bardziej przyjazny komunikat
      if (isNetworkError(error)) {
        throw new Error('Problem z połączeniem sieciowym. Sprawdź swoje połączenie internetowe i spróbuj ponownie.');
      }

      // Przekaż dalej błąd z oryginalną wiadomością
      throw error;
    }
  }, [getAuthToken, fetchWithRetry]);

  const get = useCallback(<T>(url: string): Promise<T> => (
    fetchWithAuth(url) as Promise<T>
  ), [fetchWithAuth]);

  const post = useCallback(<T>(url: string, data?: unknown): Promise<T> => (
    fetchWithAuth(url, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }) as Promise<T>
  ), [fetchWithAuth]);

  const put = useCallback(<T>(url: string, data?: unknown): Promise<T> => (
    fetchWithAuth(url, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }) as Promise<T>
  ), [fetchWithAuth]);

  const del = useCallback(<T>(url: string): Promise<T> => (
    fetchWithAuth(url, {
      method: 'DELETE',
    }) as Promise<T>
  ), [fetchWithAuth]);

  return {
    get,
    post,
    put,
    delete: del,
  };
};

export default useApi; 