"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocialLoginButtons from '@/components/Auth/SocialLoginButtons';
import Providers from '@/components/Providers';
import { doc, setDoc } from "firebase/firestore";

function RegisterPageContent() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { } = useAuth();

  const validate = () => {
    if (!firstName.trim()) {
      setError("First name is required.");
      return false;
    }
    if (!lastName.trim()) {
      setError("Last name is required.");
      return false;
    }
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setError("Enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (!acceptTerms) {
      setError("You must accept the terms and conditions.");
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = `${firstName} ${lastName}`.trim();
      // Tworzymy użytkownika w Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // Zapisujemy dane w Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        approved: false,
        createdAt: new Date(),
        role: "student"
      });
      setSuccess("Rejestracja przebiegła pomyślnie. Poczekaj na zatwierdzenie przez administratora.");
      await auth.signOut(); // NIE loguj automatycznie!
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji');
    } finally {
      setIsSubmitting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSocialLoginSuccess = (_: unknown) => {
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left: Form */}
      <div className="flex flex-col w-full lg:w-1/2 bg-[#f5f7ff] min-h-[60vh] lg:min-h-screen py-8 sm:py-12 px-3 sm:px-4 lg:px-8">
        <div className="flex items-center px-2 lg:px-8 py-3 sm:py-4 lg:py-6">
          <span className="font-bold text-base sm:text-lg"><span role="img" aria-label="logo">🧩</span> Cogito</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#4a6cf7] mb-6 sm:mb-8 lg:mb-10 mt-4 text-center leading-tight">Sign up as:</h1>
          <form onSubmit={handleRegister} className="w-full max-w-md space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="firstName" className="block mb-1 text-gray-700 font-medium text-sm sm:text-base">Imię</label>
              <input
                id="firstName"
                type="text"
                placeholder="Wpisz imię"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#4a6cf7] text-gray-900 text-sm sm:text-base transition-colors duration-200"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block mb-1 text-gray-700 font-medium text-sm sm:text-base">Nazwisko</label>
              <input
                id="lastName"
                type="text"
                placeholder="Wpisz nazwisko"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#4a6cf7] text-gray-900 text-sm sm:text-base transition-colors duration-200"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-1 text-gray-700 font-medium text-sm sm:text-base">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Wpisz email"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#4a6cf7] text-gray-900 text-sm sm:text-base transition-colors duration-200"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1 text-gray-700 font-medium text-sm sm:text-base">Hasło</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Wpisz hasło"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#4a6cf7] text-gray-900 text-sm sm:text-base transition-colors duration-200 pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4a6cf7] text-white p-1 rounded shadow hover:bg-blue-700 transition-colors duration-200 border border-white"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-1 text-gray-700 font-medium text-sm sm:text-base">Powtórz hasło</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Powtórz hasło"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#4a6cf7] text-gray-900 text-sm sm:text-base transition-colors duration-200 pr-10"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4a6cf7] text-white p-1 rounded shadow hover:bg-blue-700 transition-colors duration-200 border border-white"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={() => setAcceptTerms(v => !v)}
                className="mr-2 accent-blue-600 scale-110 sm:scale-125"
                required
              />
              <label htmlFor="acceptTerms" className="text-xs sm:text-sm select-none cursor-pointer text-gray-700">Akceptuję regulamin</label>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 sm:py-3 bg-[#4a6cf7] text-white font-bold rounded-lg mt-2 transition-all duration-300 hover:bg-blue-700 hover:shadow-md cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
            </button>
            <div className="text-center mt-2">
              <a href="/login" className="text-[#4a6cf7] hover:underline text-xs sm:text-sm transition-colors duration-200">Masz już konto? Zaloguj się</a>
            </div>
            {error && <div className="text-red-600 mt-2 text-center text-xs sm:text-sm">{error}</div>}
            {success && <div className="text-green-600 mt-2 text-center text-xs sm:text-sm">{success}</div>}
          </form>
          
          <div className="mt-6 sm:mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-[#f5f7ff] text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6">
              <SocialLoginButtons onSuccess={handleSocialLoginSuccess} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Right: Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#4a6cf7] items-center justify-center p-8">
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Join COGITO!</h2>
          <p className="text-lg opacity-90">Start your educational journey with our comprehensive learning platform.</p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Providers>
      <RegisterPageContent />
    </Providers>
  );
}