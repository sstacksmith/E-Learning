"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, MessageSquare, Mail, Phone, Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const faqs = [
  {
    question: "Jak zapisać się na egzamin?",
    answer:
      "Aby zapisać się na egzamin, przejdź do zakładki 'Moje kursy', wybierz odpowiedni przedmiot i kliknij przycisk 'Zapisz się na egzamin'. Potwierdź swój wybór i gotowe!",
    lazyLink: "/homelogin/my-courses",
  },
  {
    question: "Gdzie mogę sprawdzić swoje oceny?",
    answer:
      "Swoje oceny znajdziesz w zakładce 'Dziennik' lub w profilu użytkownika. Tam zobaczysz wszystkie wyniki z testów, egzaminów i zadań domowych.",
    lazyLink: "/homelogin/grades",
  },
  {
    question: "Co zrobić, gdy zapomnę hasła?",
    answer:
      "Kliknij na stronie logowania 'Nie pamiętasz hasła?', podaj swój e-mail i postępuj zgodnie z instrukcjami, które otrzymasz na maila.",
    lazyLink: "/forgot-password",
  },
  {
    question: "Czy mogę korzystać z platformy na telefonie?",
    answer:
      "Tak! Nasza platforma działa na smartfonach i tabletach. Wystarczy przeglądarka internetowa.",
  },
  {
    question: "Jak skontaktować się z nauczycielem?",
    answer:
      "Aby skontaktować się z nauczycielem, wejdź w zakładkę 'Moje kursy', a następnie kliknij w wybrany kurs. W nagłówku każdego kursu znajdziesz adres e-mail prowadzącego – napisz do niego bezpośrednio, aby uzyskać pomoc lub zadać pytanie.",
    lazyLink: "/homelogin/my-courses",
  },
  {
    question: "Gdzie znajdę materiały do nauki?",
    answer:
      "Materiały do nauki są dostępne w zakładce 'Biblioteka' oraz w poszczególnych kursach. Możesz je przeglądać online lub pobrać na komputer.",
    lazyLink: "/homelogin/library",
    extraLink: "/homelogin/my-courses",
  },
  {
    question: "Jak rozwiązywać zadania na platformie?",
    answer:
      "Po wejściu w wybrany kurs lub temat, znajdziesz sekcję 'Zadania'. Kliknij na zadanie, przeczytaj polecenie i wyślij swoją odpowiedź przez platformę.",
    lazyLink: "/homelogin/my-courses",
  },
  {
    question: "Czy mogę pobrać materiały na swój komputer?",
    answer:
      "Po wejściu w dany kurs w zakładce 'Moje kursy' znajdziesz materiały od prowadzącego. Tam możesz kliknąć ikonę pobrania przy wybranym pliku lub prezentacji, aby pobrać je na swój komputer.",
    lazyLink: "/homelogin/my-courses",
  },
  {
    question: "Co zrobić, gdy mam problem techniczny?",
    answer:
      "Jeśli napotkasz problem techniczny, napisz do nas przez zakładkę 'Support & FAQs', skontaktuj się z administratorem platformy lub napisz bezpośrednio na adres e-mail: learningtreatment.admin@gmail.com.",
    lazyLink: "/homelogin/support",
  },
  {
    question: "Jakie przedmioty są dostępne na platformie?",
    answer:
      "Na platformie znajdziesz przedmioty takie jak: matematyka, język polski, angielski, biologia, chemia, fizyka, historia i wiele innych!",
    lazyLink: "/courses",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header z przyciskiem powrotu */}
      <div className="w-full bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/homelogin')}
              className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do strony głównej
            </button>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Wsparcie i FAQ
            </h1>
            
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Główny kontener - pełna szerokość */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Sekcja kontaktowa - pełna szerokość z wyrównaną wysokością */}
        <div className="w-full grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          <div className="xl:col-span-3">
            <div className="w-full h-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Potrzebujesz pomocy?</h2>
                  <p className="text-gray-600">Skontaktuj się z naszym zespołem wsparcia</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl h-20">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">Email</p>
                    <p className="text-sm text-gray-600">pomoc@cogito.pl</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl h-20">
                  <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">Telefon</p>
                    <p className="text-sm text-gray-600">+48 123 456 789</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl h-20">
                  <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">Godziny pracy</p>
                    <p className="text-sm text-gray-600">pon-pt 9:00-17:00</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl h-20">
                  <MessageSquare className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">Czat</p>
                    <p className="text-sm text-gray-600">Dostępny 24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="xl:col-span-1">
            <div className="w-full h-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Szybkie linki</h3>
              <div className="space-y-3 flex-1">
                <Link 
                  href="/homelogin/my-courses"
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors h-14"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">K</span>
                  </div>
                  <span className="font-medium text-gray-800">Moje kursy</span>
                </Link>
                
                <Link 
                  href="/homelogin/grades"
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors h-14"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">O</span>
                  </div>
                  <span className="font-medium text-gray-800">Dziennik ocen</span>
                </Link>
                
                <Link 
                  href="/homelogin/library"
                  className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors h-14"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">B</span>
                  </div>
                  <span className="font-medium text-gray-800">Biblioteka</span>
                </Link>
                
                <Link 
                  href="/homelogin/group-chats"
                  className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors h-14"
                >
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">C</span>
                  </div>
                  <span className="font-medium text-gray-800">Czat grupowy</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Sekcja FAQ - pełna szerokość z wyrównaną wysokością */}
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">FAQ – Najczęściej Zadawane Pytania</h2>
              <p className="text-gray-600">Tutaj znajdziesz odpowiedzi na najczęstsze pytania dotyczące korzystania z naszej platformy edukacyjnej.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                ref={(el) => {
                  faqRefs.current[idx] = el;
                }}
                className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 hover:bg-gray-50 transition-colors flex flex-col"
              >
                <button
                  className="w-full flex justify-between items-center px-6 py-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-blue-50/50 transition-colors min-h-[72px]"
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  aria-expanded={openIndex === idx}
                  aria-controls={`faq-panel-${idx}`}
                >
                  <span className="font-semibold text-gray-800 text-left pr-4">{faq.question}</span>
                  {openIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {openIndex === idx && (
                  <div
                    id={`faq-panel-${idx}`}
                    className="px-6 pb-6 text-gray-700 animate-fadeIn flex-1"
                  >
                    <div className="pt-2 pb-4 border-t border-gray-200">
                      <p className="text-gray-700 leading-relaxed mb-4">{faq.answer}</p>
                      
                      <div className="flex flex-wrap gap-3">
                        {faq.lazyLink && (
                          <Link
                            href={faq.lazyLink}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
                          >
                            Przejdź do sekcji
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        {faq.extraLink && (
                          <Link
                            href={faq.extraLink}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors shadow-sm hover:shadow-md"
                          >
                            Materiały w kursach
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 

