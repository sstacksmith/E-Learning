import { useAuth } from './useAuth';

export function useApi() {
  const { getAuthToken } = useAuth();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token wygasł lub jest nieprawidłowy
      window.location.href = '/login';
      return;
    }

    return response;
  };

  return {
    fetchWithAuth,
  };
} 