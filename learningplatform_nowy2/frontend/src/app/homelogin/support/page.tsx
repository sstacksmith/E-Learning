"use client";
import { useState, useRef } from "react";
import Link from "next/link";

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
    // lazyLink usunięty, nie wyświetlamy przycisku
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

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col md:flex-row items-start py-6 md:py-10 px-2 md:px-8 gap-4 md:gap-8">
      {/* Przycisk powrotu na górze po lewej */}
      <Link
        href="/homelogin"
        className="mb-4 self-start inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-bold shadow-lg hover:bg-[#4067EC] hover:text-white transition-colors text-xs md:text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
      >
        ← Wróć do panelu głównego
      </Link>
      {/* Główna sekcja FAQ */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-8 mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-[#4067EC] mb-4 md:mb-6 text-center">FAQ – Najczęściej Zadawane Pytania</h1>
        <p className="text-gray-600 mb-4 md:mb-8 text-center text-xs md:text-base">
          Tutaj znajdziesz odpowiedzi na najczęstsze pytania dotyczące korzystania z naszej platformy edukacyjnej.
        </p>
        <div className="space-y-2 md:space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              ref={(el) => {
                faqRefs.current[idx] = el;
              }}
              className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
            >
              <button
                className="w-full flex justify-between items-center px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#4067EC] hover:bg-[#F1F4FE] transition-colors text-xs md:text-base"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                aria-expanded={openIndex === idx}
                aria-controls={`faq-panel-${idx}`}
              >
                <span className="font-semibold text-gray-800">{faq.question}</span>
                <svg
                  className={`w-5 h-5 ml-2 transform transition-transform ${openIndex === idx ? "rotate-180" : "rotate-0"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === idx && (
                <div
                  id={`faq-panel-${idx}`}
                  className="px-4 pb-4 text-gray-700 animate-fadeIn flex flex-col gap-2 text-xs md:text-base"
                >
                  <span>{faq.answer}</span>
                  {faq.lazyLink && (
                    <Link
                      href={faq.lazyLink}
                      className="self-start mt-2 inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-bold shadow-lg hover:bg-[#4067EC] hover:text-white transition-colors text-xs md:text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      Dla leniwych
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  )}
                  {/* Dodaj drugi przycisk tylko dla pytania o materiały do nauki */}
                  {faq.extraLink && (
                    <Link
                      href={faq.extraLink}
                      className="self-start mt-2 inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-bold shadow-lg hover:bg-[#4067EC] hover:text-white transition-colors text-xs md:text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      Materiały w kursach
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 