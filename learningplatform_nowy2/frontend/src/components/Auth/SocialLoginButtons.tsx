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
      console.log('🔐 Starting social login with provider:', provider.providerId);
      
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Firebase auth successful');
      
      const userEmail = result.user.email;
      console.log('📧 User email:', userEmail);
      
      // Walidacja domeny @cogitowroclaw.pl
      if (!userEmail || !userEmail.endsWith('@cogitowroclaw.pl')) {
        console.error('❌ Invalid domain:', userEmail);
        // Wyloguj użytkownika z Firebase
        await auth.signOut();
        const errorMessage = 'Tylko adresy email z domeny @cogitowroclaw.pl są dozwolone';
        if (onError) {
          onError(errorMessage);
        }
        throw new Error(errorMessage);
      }
      
      console.log('✅ Domain validation passed');
      const userToken = await result.user.getIdToken();
      
      // Send token to Django backend
      console.log('📤 Sending token to backend...');
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
        console.error('❌ Backend response error:', errorData);
        await auth.signOut();
        throw new Error(errorData.detail || 'Nie udało się uwierzytelnić z backendem');
      }

      const data = await response.json();
      console.log('✅ Backend authentication successful:', data);
      
      // Store tokens in sessionStorage (bezpieczniejsze)
      sessionStorage.setItem('accessToken', data.access);
      sessionStorage.setItem('refreshToken', data.refresh);
      sessionStorage.setItem('firebaseToken', userToken);
      sessionStorage.setItem('lastActivity', Date.now().toString());
      
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
      console.error('❌ Social login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas logowania';
      if (onError) {
        onError(errorMessage);
      } else {
        // Pokaż alert jeśli nie ma handlera błędów
        alert(errorMessage);
      }
    }
  };

  return (
    <div className="w-full">
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