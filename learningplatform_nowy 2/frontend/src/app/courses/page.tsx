"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Types

const podstawoweKursy = [
  'Język polski',
  'Język angielski',
  'Język hiszpański',
  'Filozofia',
  'Matematyka',
  'Historia',
  'Historia i Teraźniejszość',
  'Biznes i Zarządzanie',
  'Podstawy Przedsiębiorczości',
  'Edukacja dla Bezpieczeństwa',
  'Biologia',
  'Chemia',
  'Fizyka',
  'Geografia',
  'Informatyka',
  'Wychowanie fizyczne',
];

const dodatkoweKursy = [
  'mindfunless',
  'mikroekspresja',
  'gotowanie',
  'szachy',
  'zarzadzanie',
  'podstawy prawa',
  'dietetyka',
  'psychologia',
  'pedagogika',
  'neurodydaktyka',
  'dziennikarstwo',
  'rysunek',
  'ikigai',
  'rodzicielstwo',
  'social media',
];

// Funkcja do generowania sluga z tytułu kursu
function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ż/g, 'z')
    .replace(/ź/g, 'z')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default function CoursesPage() {
  const router = useRouter();
  const handleLogout = () => {
    localStorage.removeItem('firebaseToken');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F1F4FE] flex flex-col">
      {/* Navigation Bar */}
      <nav className="w-full bg-[#4067EC] py-4 px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Image src="/puzzleicon.png" alt="Logo" width={32} height={32} />
          <span className="text-white text-xl font-bold tracking-wide">COGITO</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/homelogin')} className="text-white font-medium hover:underline">Home</button>
          <button onClick={() => router.push('/profile')} className="text-white font-medium hover:underline">Profile</button>
          <button onClick={handleLogout} className="bg-white text-[#4067EC] font-semibold px-4 py-2 rounded shadow hover:bg-blue-100 transition">Wyloguj się</button>
        </div>
      </nav>

      <div className="flex-1 w-full flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-5xl">
          {/* Podstawa */}
          <h2 className="text-2xl font-extrabold text-[#4067EC] mb-4">Podstawa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
            {podstawoweKursy.map((title) => {
              const slug = toSlug(title);
              return (
                <Link key={title} href={`/courses/${slug}`} className="bg-white rounded-xl shadow p-6 flex items-center font-semibold text-[#222] border border-[#e3eafe] hover:shadow-lg transition cursor-pointer">
                  <span>{title}</span>
                </Link>
              );
            })}
          </div>

          {/* Moduły dodatkowe */}
          <h2 className="text-2xl font-extrabold text-[#4067EC] mb-4 mt-8">Moduły dodatkowe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {dodatkoweKursy.map((title) => (
              <div key={title} className="bg-white rounded-xl shadow p-6 flex items-center font-semibold text-[#4067EC] border border-[#e3eafe] hover:shadow-lg transition">
                <span>{title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 