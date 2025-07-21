"use client";
import Image from 'next/image';
import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Notification from '@/components/Notification';
import { useAuth } from '@/context/AuthContext';
import { auth } from "@/config/firebase";
import SocialLoginButtons from '@/components/Auth/SocialLoginButtons';
import Providers from '@/components/Providers';

function LoginPageContent() {
  const router = useRouter();
  const { loginWithApproval } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [firebaseError, setFirebaseError] = useState("");


  // Load data from localStorage on first render
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("rememberedEmail");
      const savedPassword = localStorage.getItem("rememberedPassword");
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (err) {
      console.error("Error loading saved credentials:", err);
    }
  }, []);

  // Show notification when auth error occurs
  useEffect(() => {
    if (firebaseError) {
      showNotification('error', firebaseError);
    }
  }, [firebaseError]);

  // Function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    
    // Automatically hide notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Handle remember me toggle
  const handleRememberMeToggle = () => {
    setRememberMe(!rememberMe);
  };

  // Handle form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFirebaseError("");
    setIsSubmitting(true);
    
    // Basic client-side validation
    const tempErrors: {[key: string]: string} = {};
    if (!email) tempErrors.email = "Username or email is required";
    if (!password) tempErrors.password = "Password is required";
    
    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      setIsSubmitting(false);
      return;
    }
    
    // Save data in localStorage if "Remember me" is checked
    try {
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
    } catch (err) {
      console.error("Error saving credentials:", err);
    }
    
    try {
      await loginWithApproval(email, password);
      router.push("/homelogin");
    } catch (err: unknown) {
      setFirebaseError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLoginSuccess = (user: unknown) => {
    console.log('handleSocialLoginSuccess called, user:', user);
    router.push('/homelogin');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {notification && (
        <Notification 
          type={notification.type} 
          message={notification.message} 
          onClose={() => setNotification(null)}
        />
      )}
      {/* Logo */}
      <div 
        className="absolute top-3 sm:top-4 left-3 sm:left-4 flex items-center z-20 cursor-pointer group transition-all duration-300" 
        onClick={() => router.push('/')}
      >
        <div className="relative overflow-hidden rounded-full">
          <Image 
            src="/puzzleicon.png" 
            alt="Puzzle Icon" 
            width={28} 
            height={28} 
            className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <span className="ml-2 text-base sm:text-lg font-normal text-[#222] group-hover:text-[#4067EC] transition-colors duration-300">Cogito</span>
      </div>
      {/* Left: Login Form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-[60vh] lg:min-h-screen bg-[#F1F4FE] py-8 sm:py-12 px-3 sm:px-4 lg:px-8">
        <div className="w-full max-w-md mx-auto px-0 lg:px-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4067EC] text-center mb-2 leading-tight">Account Log In</h1>
          <p className="text-center text-gray-500 mb-6 sm:mb-8 tracking-widest text-xs sm:text-sm">PLEASE LOGIN TO CONTINUE TO YOUR ACCOUNT</p>
          <form className="space-y-3 sm:space-y-4 w-full mx-auto" onSubmit={handleLogin}>
            <div>
              <input
                type="text"
                placeholder="Username or Email"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:border-[#4067EC] transition-colors duration-200 text-sm sm:text-base`}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg pr-10 focus:outline-none focus:border-[#4067EC] transition-colors duration-200 text-sm sm:text-base`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4067EC] text-white p-1 rounded shadow hover:bg-[#3155d4] transition-colors duration-200 border border-white"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            {firebaseError && <p className="text-red-500 text-xs">{firebaseError}</p>}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleRememberMeToggle}
                  className="w-4 h-4 text-[#4067EC] bg-gray-100 border-gray-300 rounded focus:ring-[#4067EC] focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-[#4067EC] hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#4067EC] text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold hover:bg-[#3155d4] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>
          </form>
          
          <div className="mt-6 sm:mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-[#F1F4FE] text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6">
              <SocialLoginButtons onSuccess={handleSocialLoginSuccess} />
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#4067EC] hover:underline font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right: Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#4067EC] items-center justify-center p-8">
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-lg opacity-90">Access your learning platform and continue your educational journey.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Providers>
      <LoginPageContent />
    </Providers>
  );
}
