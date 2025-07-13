"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Providers from "@/components/Providers";

function HomeContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("home");
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-md w-full">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4067EC] leading-tight">Witaj w COGITO!</h1>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-4 w-full sm:w-auto">
            <Link href="/login" className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-[#4067EC] border-2 border-[#4067EC] text-base sm:text-lg font-bold hover:bg-blue-50 transition-colors duration-200 text-center">Zaloguj się</Link>
            <Link href="/register" className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-[#4067EC] text-white text-base sm:text-lg font-bold hover:bg-[#3155d4] transition-colors duration-200 shadow-lg text-center" style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.125rem', lineHeight: '1.75rem', textShadow: '0 1px 2px rgba(0,0,0,0.08)', zIndex: 2 }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.125rem', lineHeight: '1.75rem', textShadow: '0 1px 2px rgba(0,0,0,0.08)', zIndex: 2 }}>Zarejestruj się</span>
            </Link>
          </div>
        </div>
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <div className="flex items-center cursor-pointer" onClick={() => router.push("/")}> 
            <Image src="/puzzleicon.png" alt="Logo" width={32} height={32} className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="ml-2 sm:ml-3 text-xl sm:text-2xl font-bold text-[#4067EC]">COGITO</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 lg:gap-6">
            {navLinks.map((link) => (
              <button 
                key={link.key}
                onClick={() => {
                  setActiveTab(link.key);
                  router.push(link.href);
                }}
                className={`text-sm sm:text-base font-medium px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === link.key ? "bg-[#F1F4FE] text-[#4067EC]" : "text-gray-700 hover:bg-[#F1F4FE] hover:text-[#4067EC]"}`}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[#4067EC] hover:bg-blue-50 transition-colors duration-300 text-sm sm:text-base">Logowanie</Link>
            <Link href="/register" className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#4067EC] text-white hover:bg-[#3155d4] transition-colors duration-300 shadow-sm text-sm sm:text-base">Rejestracja</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-[#F1F4FE] pb-4 sm:pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="max-w-xl w-full text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              Wspieramy <span className="text-[#F6A623]">domową edukację</span> – Twoja platforma do nauczania domowego
              </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
              Odkryj nowoczesne narzędzia, materiały i społeczność, które pomogą Twojej rodzinie w skutecznym i radosnym nauczaniu domowym. Ucz się w swoim tempie, zgodnie z własnymi wartościami i potrzebami.
              </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link href="/register" className="bg-[#4067EC] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold shadow hover:bg-[#3155d4] transition-colors duration-200 text-sm sm:text-base text-center">Załóż konto</Link>
              <Link href="/about" className="bg-white border-2 border-[#4067EC] text-[#4067EC] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200 text-sm sm:text-base text-center">Dowiedz się więcej</Link>
            </div>
          </div>
          <div className="w-full max-w-md lg:max-w-lg">
            <Image src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=600&q=80" alt="Hero" width={500} height={400} className="rounded-xl shadow-lg w-full h-auto object-cover" />
          </div>
        </div>
        {/* Category Bar */}
        <div className="bg-[#F6A623] py-2 sm:py-3 flex flex-wrap justify-center gap-4 sm:gap-8 text-white font-semibold text-xs sm:text-sm shadow">
          <span>Materiały</span>
          <span>Wsparcie</span>
          <span>Indywidualizacja</span>
          <span>Społeczność</span>
          <span>Elastyczność</span>
        </div>
      </section>

      {/* Why Choose Us / Features */}
      <section className="py-8 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-[#4067EC] mb-8 sm:mb-12 leading-tight">Dlaczego warto wybrać COGITO?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Card 1 */}
            <div className="bg-[#F1F4FE] rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200">
              <Image src="https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80" alt="Indywidualne podejście" width={400} height={200} className="rounded mb-3 sm:mb-4 w-full h-24 sm:h-32 object-cover" />
              <h3 className="font-bold text-base sm:text-lg mb-2 leading-tight">Indywidualne podejście</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Dostosuj naukę do potrzeb swojego dziecka. Twórz własne ścieżki edukacyjne i korzystaj z gotowych planów.</p>
            </div>
            {/* Card 2 */}
            <div className="bg-[#F1F4FE] rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200">
              <Image src="https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80" alt="Materiały i narzędzia" width={400} height={200} className="rounded mb-3 sm:mb-4 w-full h-24 sm:h-32 object-cover" />
              <h3 className="font-bold text-base sm:text-lg mb-2 leading-tight">Bogate materiały i narzędzia</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Korzystaj z interaktywnych lekcji, ćwiczeń, testów i inspiracji do nauki w domu – od przedszkola po liceum.</p>
            </div>
            {/* Card 3 */}
            <div className="bg-[#F1F4FE] rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200">
              <Image src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80" alt="Wsparcie ekspertów" width={400} height={200} className="rounded mb-3 sm:mb-4 w-full h-24 sm:h-32 object-cover" />
              <h3 className="font-bold text-base sm:text-lg mb-2 leading-tight">Wsparcie ekspertów</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Konsultacje z nauczycielami, webinary, grupy wsparcia i inspirujące historie rodzin edukujących domowo.</p>
            </div>
            {/* Card 4 */}
            <div className="bg-[#F1F4FE] rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200">
              <Image src="https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80" alt="Społeczność" width={400} height={200} className="rounded mb-3 sm:mb-4 w-full h-24 sm:h-32 object-cover" />
              <h3 className="font-bold text-base sm:text-lg mb-2 leading-tight">Społeczność i wymiana doświadczeń</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Dołącz do aktywnej społeczności rodziców i dzieci. Wymieniaj się materiałami, pomysłami i wsparciem.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-8 sm:py-12 lg:py-16 bg-[#F1F4FE]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-[#4067EC] mb-8 sm:mb-12 leading-tight">Co mówią rodziny edukujące domowo?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <span className="text-yellow-400 text-lg sm:text-xl mb-2">★★★★★</span>
              <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">Dzięki COGITO nauka w domu stała się prostsza i bardziej uporządkowana. Moje dzieci chętniej się uczą!</p>
              <span className="font-semibold text-[#4067EC] text-xs sm:text-sm">Anna, mama dwójki dzieci</span>
              </div>
            {/* Testimonial 2 */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <span className="text-yellow-400 text-lg sm:text-xl mb-2">★★★★★</span>
              <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">Świetne materiały i ogromne wsparcie społeczności. Polecam każdej rodzinie!</p>
              <span className="font-semibold text-[#4067EC] text-xs sm:text-sm">Marek, tata nastolatka</span>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <span className="text-yellow-400 text-lg sm:text-xl mb-2">★★★★★</span>
              <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">Platforma daje mi pewność, że nie przegapię ważnych tematów i mogę dostosować naukę do potrzeb syna.</p>
              <span className="font-semibold text-[#4067EC] text-xs sm:text-sm">Katarzyna, edukacja domowa od 3 lat</span>
            </div>
            {/* Testimonial 4 */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <span className="text-yellow-400 text-lg sm:text-xl mb-2">★★★★★</span>
              <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">Najbardziej cenię elastyczność i możliwość kontaktu z innymi rodzicami.</p>
              <span className="font-semibold text-[#4067EC] text-xs sm:text-sm">Joanna, mama trójki dzieci</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4067EC] mb-4 sm:mb-6 leading-tight">Dołącz do nas <span className="text-[#F6A623]">już dziś</span></h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed">Stwórz konto i przekonaj się, jak łatwa i przyjemna może być edukacja domowa z COGITO!</p>
          <Link href="/register" className="bg-[#4067EC] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold shadow hover:bg-[#3155d4] transition-colors duration-200 text-base sm:text-lg inline-block">Załóż darmowe konto</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#222] text-white py-6 sm:py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center">
            <Image src="/puzzleicon.png" alt="Logo" width={24} height={24} className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="ml-2 text-base sm:text-lg font-bold">COGITO</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
            <Link href="/about" className="hover:underline transition-colors duration-200">O platformie</Link>
            <Link href="/courses" className="hover:underline transition-colors duration-200">Materiały</Link>
            <Link href="/community" className="hover:underline transition-colors duration-200">Społeczność</Link>
            <Link href="/support" className="hover:underline transition-colors duration-200">Wsparcie</Link>
            <Link href="/contact" className="hover:underline transition-colors duration-200">Kontakt</Link>
          </div>
          <div className="text-xs text-gray-400 text-center sm:text-left">© {new Date().getFullYear()} COGITO. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
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
