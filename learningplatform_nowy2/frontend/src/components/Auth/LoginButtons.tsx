import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, microsoftProvider } from '@/lib/firebase-config';

export default function LoginButtons() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const handleLogin = async (provider: any) => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, provider);
      const userToken = await result.user.getIdToken();
      setToken(userToken);
      
      // Send token to Django backend
              const response = await fetch('/api/auth/firebase-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with backend');
      }

      const data = await response.json();
      setUser(data.user);
      
      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        onClick={() => handleLogin(googleProvider)}
        className="flex items-center justify-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
      >
        <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
        Sign in with Google
      </button>

      <button
        onClick={() => handleLogin(microsoftProvider)}
        className="flex items-center justify-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
      >
        <img src="/microsoft-icon.svg" alt="Microsoft" className="w-5 h-5" />
        Sign in with Microsoft
      </button>

      {error && (
        <div className="text-red-500 mt-2">
          {error}
        </div>
      )}

      {user && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold mb-2">Welcome, {user.name}!</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
      )}
    </div>
  );
} 