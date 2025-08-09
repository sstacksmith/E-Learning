import { useState } from 'react';
import { signInWithPopup, AuthProvider } from 'firebase/auth';
import { auth, googleProvider, microsoftProvider } from '@/lib/firebase-config';
import Image from 'next/image';

interface AuthUser {
  name: string;
  email: string;
  uid: string;
}

export default function LoginButtons() {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const handleLogin = async (provider: AuthProvider) => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, provider);
      const userToken = await result.user.getIdToken();
      
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
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        onClick={() => handleLogin(googleProvider)}
        className="flex items-center justify-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
      >
        <Image 
          src="/google-icon.svg" 
          alt="Google" 
          width={20} 
          height={20} 
          className="w-5 h-5" 
        />
        Sign in with Google
      </button>

      <button
        onClick={() => handleLogin(microsoftProvider)}
        className="flex items-center justify-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
      >
        <Image 
          src="/microsoft-icon.svg" 
          alt="Microsoft" 
          width={20} 
          height={20} 
          className="w-5 h-5" 
        />
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