"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

// Types
interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  level: string;
  category: number;
  category_name: string;
  instructor: number;
  instructor_name: string;
  is_featured: boolean;
}

const subjects = [
  {
    title: "Matematyka",
    icon: (
      <svg className="w-8 h-8 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 012 2v2M8 20H6a2 2 0 01-2-2v-2m12 0h2a2 2 0 002-2v-2m-6 6v-2m0-4V8m0 0V6m0 2h2m-2 0H8" /></svg>
    ),
    topics: [
      "Dodawanie i odejmowanie",
      "Tabliczka mnożenia",
      "Ułamki i procenty",
      "Geometria",
      "Przygotowanie do egzaminu",
    ],
    gradient: "from-[#e0e7ff] to-[#f1f4fe]"
  },
  {
    title: "Język polski",
    icon: (
      <svg className="w-8 h-8 text-[#F6A623]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
    ),
    topics: [
      "Ortografia i gramatyka",
      "Czytanie ze zrozumieniem",
      "Redagowanie tekstów",
      "Lektury szkolne",
      "Przygotowanie do egzaminu",
    ],
    gradient: "from-[#fff7e0] to-[#f1f4fe]"
  },
  {
    title: "Przyroda",
    icon: (
      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 00-7.07 17.07A10 10 0 1012 2zm0 0v10l6 3" /></svg>
    ),
    topics: [
      "Świat roślin i zwierząt",
      "Eksperymenty domowe",
      "Ekologia",
      "Geografia Polski",
    ],
    gradient: "from-[#e0ffe7] to-[#f1f4fe]"
  },
  {
    title: "Historia",
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    topics: [
      "Starożytność",
      "Średniowiecze",
      "Historia Polski",
      "Wielkie odkrycia",
    ],
    gradient: "from-[#ffe0e0] to-[#f1f4fe]"
  },
  {
    title: "Języki obce",
    icon: (
      <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
    ),
    topics: [
      "Angielski: podstawy i konwersacje",
      "Niemiecki: słownictwo i gramatyka",
      "Hiszpański: nauka przez zabawę",
    ],
    gradient: "from-[#ffe0fa] to-[#f1f4fe]"
  },
  {
    title: "Materiały do pobrania",
    icon: (
      <svg className="w-8 h-8 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
    ),
    topics: [
      "Plany nauki tygodniowe",
      "Karty pracy PDF",
      "Przykładowe testy",
      "Poradniki dla rodziców",
    ],
    gradient: "from-[#e0f7ff] to-[#f1f4fe]"
  },
];

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

function Courses() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories and courses on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/categories/');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again later.');
      }
    };

    const fetchCourses = async () => {
      try {
        let url = 'http://localhost:8000/api/courses/';
        if (selectedCategory) {
          url = `http://localhost:8000/api/courses/by_category/?category_id=${selectedCategory}`;
        }
        if (searchQuery) {
          url = `http://localhost:8000/api/courses/?search=${encodeURIComponent(searchQuery)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch courses');
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchCourses();
  }, [selectedCategory, searchQuery]);

  // Handle category selection
  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already triggered by the useEffect when searchQuery changes
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative overflow-hidden rounded-full h-8 w-8">
                <Image
                  src="/puzzleicon.png"
                  alt="Cogito Logo"
                  width={32}
                  height={32}
                />
              </div>
              <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
            </Link>
          </div>
        </header>
        
        <main className="flex-grow bg-gray-100 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center items-center h-64">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
              <span className="ml-3 text-gray-600">Loading courses...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative overflow-hidden rounded-full h-8 w-8">
                <Image
                  src="/puzzleicon.png"
                  alt="Cogito Logo"
                  width={32}
                  height={32}
                />
              </div>
              <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
            </Link>
          </div>
        </header>
        
        <main className="flex-grow bg-gray-100 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
              <p>{error}</p>
              <button 
                className="mt-2 text-sm text-[#4067EC] hover:underline"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with navigation */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative overflow-hidden rounded-full h-8 w-8">
              <Image
                src="/puzzleicon.png"
                alt="Cogito Logo"
                width={32}
                height={32}
              />
            </div>
            <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
          </Link>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="/homelogin" className="text-gray-600 hover:text-[#4067EC]">Dashboard</Link>
            <Link href="/courses" className="text-[#4067EC] font-medium">Courses</Link>
            <Link href="/about" className="text-gray-600 hover:text-[#4067EC]">About</Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearchSubmit} className="hidden md:block relative">
              <input
                type="text"
                placeholder="Search courses..."
                className="pl-8 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </form>
            
            <Link href="/homelogin" className="bg-[#4067EC] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#3155d4]">
              My Dashboard
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Hero section */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Explore Our Courses</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Discover a wide range of courses designed to help you master new skills, advance your career, or explore new subjects.
            </p>
          </div>
          
          {/* Category filters */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-full border ${selectedCategory === null ? 'bg-[#4067EC] text-white border-[#4067EC]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                onClick={() => handleCategorySelect(null)}
              >
                All Courses
              </button>
              
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`px-4 py-2 rounded-full border ${selectedCategory === category.id ? 'bg-[#4067EC] text-white border-[#4067EC]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Mobile search */}
          <div className="mb-6 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </form>
          </div>
          
          {/* Courses grid */}
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="relative h-48 bg-gray-200">
                    {course.thumbnail ? (
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                        <span className="text-gray-500">No image</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-xs font-medium">
                      {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <span className="bg-[#F1F4FE] text-[#4067EC] px-2 py-1 rounded-full">{course.category_name}</span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">{course.title}</h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        By: {course.instructor_name}
                      </div>
                      
                      <Link href={`/courses/${course.slug}`}
                        className="px-3 py-1 bg-[#4067EC] text-white rounded-md text-sm font-medium hover:bg-[#3155d4]"
                      >
                        View Course
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No courses found</h3>
              <p className="mt-1 text-gray-500">
                {searchQuery 
                  ? `No results for "${searchQuery}". Try a different search.` 
                  : selectedCategory 
                    ? "No courses in this category yet." 
                    : "No courses available at the moment."}
              </p>
              {(searchQuery || selectedCategory) && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="mt-4 text-[#4067EC] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:justify-between">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="relative overflow-hidden rounded-full h-8 w-8">
                  <Image
                    src="/puzzleicon.png"
                    alt="Cogito Logo"
                    width={32}
                    height={32}
                  />
                </div>
                <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Learning that transforms lives
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase mb-3">Platform</h3>
                <ul className="space-y-2">
                  <li><Link href="/" className="text-gray-600 hover:text-gray-800">Home</Link></li>
                  <li><Link href="/courses" className="text-gray-600 hover:text-gray-800">Courses</Link></li>
                  <li><Link href="/about" className="text-gray-600 hover:text-gray-800">About</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase mb-3">Support</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Help Center</Link></li>
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Contact</Link></li>
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">FAQ</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase mb-3">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Privacy Policy</Link></li>
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Cogito Learning. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 