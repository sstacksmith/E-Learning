"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Providers from "@/components/Providers";
import ClassManagement from "@/components/ClassManagement";
import ThemeToggle from "@/components/ThemeToggle";

function HomeContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [showClassManagement, setShowClassManagement] = useState(false);
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center cursor-pointer group" onClick={() => router.push("/")}>
                <div className="relative overflow-hidden rounded-xl p-2 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
                  <Image 
                    src="/puzzleicon.png" 
                    alt="COGITO Logo" 
                    width={32} 
                    height={32} 
                    className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  COGITO
                </span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/about" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium">
                  O platformie
                </Link>
                <Link href="/courses" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium">
                  Materiały
                </Link>
                <Link href="/community" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium">
                  Społeczność
                </Link>
                <Link href="/contact" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium">
                  Kontakt
                </Link>
              </div>
                             <div className="flex items-center space-x-4">
                 <ThemeToggle />
                 <Link 
                   href="/login" 
                   className="px-6 py-2.5 text-blue-700 font-semibold hover:bg-blue-50 hover:text-blue-800 rounded-xl transition-all duration-200"
                 >
                   Zaloguj się
                 </Link>
                 <Link 
                   href="/register" 
                   className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:from-blue-800 hover:to-indigo-800 transition-all duration-200"
                 >
                   Zarejestruj się
                 </Link>
               </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  ✨ Nowoczesna edukacja domowa
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Edukacja domowa
                  </span>
                  <br />
                  <span className="text-slate-800">w nowym wymiarze</span>
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Odkryj nowoczesną platformę edukacyjną, która wspiera rodziny w skutecznym nauczaniu domowym. 
                  Materiały, narzędzia i społeczność w jednym miejscu.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-base">Indywidualne podejście</h3>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-base">Bogate materiały</h3>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-base">Społeczność</h3>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-base">Elastyczność</h3>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  href="/register" 
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-center"
                >
                  Rozpocznij za darmo
                </Link>
                <Link 
                  href="/about" 
                  className="px-8 py-4 border-2 border-blue-600 text-blue-700 font-bold rounded-xl hover:bg-blue-50 hover:text-blue-800 transition-all duration-200 text-center"
                >
                  Dowiedz się więcej
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center lg:justify-start space-x-8 text-sm text-slate-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Bezpieczna platforma</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Pełna Edukacja</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative">
              <div className="relative z-10">
                <Image 
                  src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80" 
                  alt="Edukacja domowa" 
                  width={600} 
                  height={500} 
                  className="rounded-2xl shadow-2xl w-full h-auto object-cover"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-20 blur-xl"></div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slate-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
              <div>
                <div className="flex items-center mb-4">
                  <div className="relative overflow-hidden rounded-xl p-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Image 
                      src="/puzzleicon.png" 
                      alt="COGITO Logo" 
                      width={24} 
                      height={24} 
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="ml-2 text-xl font-bold">COGITO</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Nowoczesna platforma edukacyjna dla edukacji domowej
                </p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-4">Platforma</h3>
                <ul className="space-y-2 text-slate-400">
                  <li><Link href="/about" className="hover:text-white transition-colors">O platformie</Link></li>
                  <li><Link href="/courses" className="hover:text-white transition-colors">Materiały</Link></li>
                  <li><Link href="/community" className="hover:text-white transition-colors">Społeczność</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Kontakt</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-4">Funkcje</h3>
                <ul className="space-y-2 text-slate-400">
                  <li><span className="hover:text-white transition-colors">Zarządzanie kursami</span></li>
                  <li><span className="hover:text-white transition-colors">Quizy i testy</span></li>
                  <li><span className="hover:text-white transition-colors">Czaty grupowe</span></li>
                  <li><span className="hover:text-white transition-colors">Dziennik ocen</span></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-4">Wsparcie</h3>
                <ul className="space-y-2 text-slate-400">
                  <li><span className="hover:text-white transition-colors">Pomoc</span></li>
                  <li><span className="hover:text-white transition-colors">FAQ</span></li>
                  <li><span className="hover:text-white transition-colors">Kontakt</span></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-4">Prawne</h3>
                <ul className="space-y-2 text-slate-400">
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Polityka prywatności</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Regulamin</Link></li>
                  <li><Link href="/cookies" className="hover:text-white transition-colors">Polityka cookies</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-700 text-center">
              <p className="text-slate-400 text-sm">
                © {new Date().getFullYear()} COGITO. Wszelkie prawa zastrzeżone.
              </p>
                      </div>
        </div>
      </footer>

      {/* 🆕 NOWE - Modal zarządzania klasami */}
      {showClassManagement && (
        <ClassManagement onClose={() => setShowClassManagement(false)} />
      )}
    </div>
  );
}

  const navLinks = [
    { label: "Strona główna", href: "/", key: "home" },
    { label: "Materiały", href: "/courses", key: "courses" },
    { label: "Społeczność", href: "/community", key: "community" },
    { label: "Wsparcie", href: "/support", key: "support" },
    { label: "Kontakt", href: "/contact", key: "contact" },
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center cursor-pointer" onClick={() => router.push("/")}> 
            <Image src="/puzzleicon.png" alt="Logo" width={32} height={32} className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="ml-2 sm:ml-3 text-xl sm:text-2xl font-bold text-blue-600">COGITO</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 lg:gap-8">
            {navLinks.map((link) => (
              <button 
                key={link.key}
                onClick={() => {
                  setActiveTab(link.key);
                  if (link.key === 'classes') {
                    // 🆕 NOWE - Otwórz modal zarządzania klasami
                    setShowClassManagement(true);
                  } else {
                    router.push(link.href);
                  }
                }}
                className={`text-sm sm:text-base font-medium px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap ${activeTab === link.key ? "bg-blue-100 text-blue-600 shadow-sm" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"}`}
              >
                {link.label}
              </button>
            ))}
          </div>
                     <div className="flex items-center gap-3 sm:gap-4">
             <Link href="/login" className="px-4 sm:px-6 py-2 rounded-xl text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition-all duration-200 text-sm sm:text-base font-medium">Logowanie</Link>
             <Link href="/register" className="px-4 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white hover:shadow-lg hover:from-blue-800 hover:to-indigo-800 transition-all duration-200 text-sm sm:text-base font-medium">Rejestracja</Link>
           </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          <div className="max-w-2xl w-full text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              🎓 Nowoczesna edukacja domowa
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Wspieramy <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">domową edukację</span> – Twoja platforma do nauczania domowego
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
              Odkryj nowoczesne narzędzia, materiały i społeczność, które pomogą Twojej rodzinie w skutecznym i radosnym nauczaniu domowym. Ucz się w swoim tempie, zgodnie z własnymi wartościami i potrzebami.
            </p>
                         <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
               <Link href="/register" className="px-8 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:from-blue-800 hover:to-indigo-800 transition-all duration-200 text-center">
                 Załóż konto
               </Link>
               <Link href="/about" className="px-8 py-4 border-2 border-blue-600 text-blue-700 font-bold rounded-xl hover:bg-blue-50 hover:text-blue-800 transition-all duration-200 text-center">
                 Dowiedz się więcej
               </Link>
             </div>
          </div>
          <div className="w-full max-w-lg lg:max-w-xl">
            <Image src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=600&q=80" alt="Hero" width={500} height={400} className="rounded-2xl shadow-2xl w-full h-auto object-cover" />
          </div>
        </div>
        {/* Category Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-4 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-white font-semibold text-sm sm:text-base">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Materiały
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                </svg>
                Wsparcie
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Indywidualizacja
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Społeczność
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Elastyczność
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us / Features */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Dlaczego warto wybrać <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">COGITO</span>?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Oferujemy kompleksowe rozwiązania dla rodzin edukujących domowo
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200/50">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-4 text-slate-900">Indywidualne podejście</h3>
              <p className="text-slate-600 leading-relaxed">Dostosuj naukę do potrzeb swojego dziecka. Twórz własne ścieżki edukacyjne i korzystaj z gotowych planów.</p>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200/50">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-4 text-slate-900">Bogate materiały</h3>
              <p className="text-slate-600 leading-relaxed">Korzystaj z interaktywnych lekcji, ćwiczeń, testów i inspiracji do nauki w domu – od przedszkola po liceum.</p>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200/50">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-4 text-slate-900">Wsparcie ekspertów</h3>
              <p className="text-slate-600 leading-relaxed">Konsultacje z nauczycielami, webinary, grupy wsparcia i inspirujące historie rodzin edukujących domowo.</p>
            </div>
            {/* Card 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200/50">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-4 text-slate-900">Społeczność</h3>
              <p className="text-slate-600 leading-relaxed">Dołącz do aktywnej społeczności rodziców i dzieci. Wymieniaj się materiałami, pomysłami i wsparciem.</p>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Dołącz do nas <span className="text-amber-300">już dziś</span>
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Stwórz konto i przekonaj się, jak łatwa i przyjemna może być edukacja domowa z COGITO!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-block px-10 py-5 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-lg hover:bg-blue-50 hover:text-blue-800">
              Załóż darmowe konto
            </Link>
            <Link href="/login" className="inline-block px-10 py-5 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-blue-700 transition-all duration-200 text-lg">
              Zaloguj się
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="relative overflow-hidden rounded-xl p-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Image 
                    src="/puzzleicon.png" 
                    alt="COGITO Logo" 
                    width={24} 
                    height={24} 
                    className="w-6 h-6"
                  />
                </div>
                <span className="ml-2 text-xl font-bold">COGITO</span>
              </div>
              <p className="text-slate-400 text-sm">
                Nowoczesna platforma edukacyjna dla edukacji domowej
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Platforma</h3>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">O platformie</Link></li>
                <li><Link href="/courses" className="hover:text-white transition-colors">Materiały</Link></li>
                <li><Link href="/community" className="hover:text-white transition-colors">Społeczność</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Kontakt</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Funkcje</h3>
              <ul className="space-y-2 text-slate-400">
                <li><span className="hover:text-white transition-colors">Zarządzanie kursami</span></li>
                <li><span className="hover:text-white transition-colors">Quizy i testy</span></li>
                <li><span className="hover:text-white transition-colors">Czaty grupowe</span></li>
                <li><span className="hover:text-white transition-colors">Dziennik ocen</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Wsparcie</h3>
              <ul className="space-y-2 text-slate-400">
                <li><span className="hover:text-white transition-colors">Pomoc</span></li>
                <li><span className="hover:text-white transition-colors">FAQ</span></li>
                <li><span className="hover:text-white transition-colors">Kontakt</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Prawne</h3>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Polityka prywatności</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Regulamin</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Polityka cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-700 text-center">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} COGITO. Wszelkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </footer>

      {/* 🆕 NOWE - Modal zarządzania klasami */}
      {showClassManagement && (
        <ClassManagement onClose={() => setShowClassManagement(false)} />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <HomeContent />
    </Providers>
  );
}
