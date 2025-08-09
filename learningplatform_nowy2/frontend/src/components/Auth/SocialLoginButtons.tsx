import { signInWithPopup, AuthProvider } from 'firebase/auth';
import { auth, googleProvider, microsoftProvider } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface User {
  uid: string;
  email: string;
  displayName: string;
}

interface SocialLoginButtonsProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
}

export default function SocialLoginButtons({ onSuccess, onError }: SocialLoginButtonsProps) {
  const { setUser } = useAuth();

  const handleLogin = async (provider: AuthProvider) => {
    try {
      console.log('Starting social login with provider:', provider.providerId);
      const result = await signInWithPopup(auth, provider);
      console.log('Firebase auth successful, getting token...');
      const userToken = await result.user.getIdToken();
      
      // Send token to Django backend
      console.log('Sending token to backend...');
              const response = await fetch('/api/auth/firebase-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend response error:', errorData);
        throw new Error(errorData.detail || 'Failed to authenticate with backend');
      }

      const data = await response.json();
      console.log('Backend authentication successful:', data);
      
      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('firebaseToken', userToken);
      
      // Update user context
      setUser({
        uid: data.user.id,
        email: data.user.email,
        role: data.user.role || 'student',
      });

      if (onSuccess) {
        onSuccess(data.user);
      }
      
    } catch (err: unknown) {
      console.error('Social login error:', err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'An error occurred during social login');
      }
    }
  };

  return (
    <div className="w-full">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">lub kontynuuj z</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleLogin(googleProvider)}
          className="flex items-center justify-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <Image src="/google-icon.svg" alt="Google" width={20} height={20} className="w-5 h-5" />
          <span>Google</span>
        </button>

        <button
          onClick={() => handleLogin(microsoftProvider)}
          className="flex items-center justify-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <Image src="/microsoft-icon.svg" alt="Microsoft" width={20} height={20} className="w-5 h-5" />
          <span>Microsoft</span>
        </button>
      </div>
    </div>
  );
} 