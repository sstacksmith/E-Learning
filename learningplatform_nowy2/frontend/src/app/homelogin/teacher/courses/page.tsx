"use client";
import { useState, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../../../config/firebase';
import Link from "next/link";
import Image from "next/image";

interface Course {
  id: number;
  title: string;
  description: string;
  year_of_study: number;
  subject: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  pdfUrls: string[];
  links: string[];
  slug: string;
}

const SUBJECTS = [
  'Matematyka',
  'Język polski',
  'Język angielski',
  'Fizyka',
  'Chemia',
  'Biologia',
  'Historia',
  'Geografia',
  'Informatyka',
  'Wychowanie fizyczne',
];

export default function TeacherCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total_pages: 1,
    count: 0
  });
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    year_of_study: 1,
    subject: SUBJECTS[0],
    links: [''],
    pdfs: [] as File[],
    pdfUrls: [] as string[],
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Dodaj debouncing dla lepszej wydajności
    const timer = setTimeout(() => {
      fetchCourses();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Dodaj cache'owanie kursów w localStorage
  const cacheKey = 'teacher_courses_cache';
  const cacheExpiry = 5 * 60 * 1000; // 5 minut

  const getCachedCourses = () => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheExpiry) {
        return data;
      }
    }
    return null;
  };

  const setCachedCourses = (data: any) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  };

  const fetchCourses = async (page = 1, useCache = true, retryCount = 0) => {
    setLoading(true);
    setError(null);
    
    // Sprawdź cache dla pierwszej strony
    if (page === 1 && useCache) {
      const cached = getCachedCourses();
      if (cached) {
        setCourses(cached.results || cached);
        setPagination(cached.pagination || {
          page: 1,
          page_size: 20,
          total_pages: 1,
          count: cached.results?.length || cached.length || 0
        });
        setLoading(false);
        return;
      }
    }
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('firebaseToken') : null;
      
      // Dodaj timeout dla requestu
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sekund timeout
      
      const response = await fetch(`/api/courses/?page=${page}&page_size=20`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Wymuś świeże dane
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token wygasł - wyczyść cache i spróbuj ponownie
          if (typeof window !== 'undefined') {
            localStorage.removeItem(cacheKey);
          }
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Obsługuj nową strukturę odpowiedzi z paginacją
      if (data.results) {
        setCourses(data.results);
        const paginationData = {
          page: data.page || 1,
          page_size: data.page_size || 20,
          total_pages: data.total_pages || 1,
          count: data.count || 0
        };
        setPagination(paginationData);
        
        // Cache'uj tylko pierwszą stronę
        if (page === 1) {
          setCachedCourses({
            results: data.results,
            pagination: paginationData
          });
        }
      } else {
        // Fallback dla starej struktury
        setCourses(data);
        const paginationData = {
          page: 1,
          page_size: 20,
          total_pages: 1,
          count: data.length || 0
        };
        setPagination(paginationData);
        
        // Cache'uj tylko pierwszą stronę
        if (page === 1) {
          setCachedCourses({
            results: data,
            pagination: paginationData
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      
      // Retry logic dla błędów sieciowych
      if (retryCount < 2 && (err.name === 'AbortError' || err.message.includes('Failed to fetch'))) {
        console.log(`Retrying... Attempt ${retryCount + 1}`);
        setTimeout(() => {
          fetchCourses(page, useCache, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(`Failed to load courses: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewCourse({ ...newCourse, pdfs: Array.from(e.target.files) });
    }
  };

  const handleLinkChange = (idx: number, value: string) => {
    const links = [...newCourse.links];
    links[idx] = value;
    setNewCourse({ ...newCourse, links });
  };

  const addLinkField = () => {
    setNewCourse({ ...newCourse, links: [...newCourse.links, ''] });
  };

  const removeLinkField = (idx: number) => {
    const links = [...newCourse.links];
    links.splice(idx, 1);
    setNewCourse({ ...newCourse, links });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);
    let pdfUrls: string[] = [];
    
    try {
      console.log("Starting course creation process...");
      
      // Upload PDF files to Firebase Storage
      if (newCourse.pdfs.length > 0) {
        console.log(`Uploading ${newCourse.pdfs.length} PDF files...`);
        const storage = getStorage();
        for (const file of newCourse.pdfs) {
          const storageRef = ref(storage, `courses/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          pdfUrls.push(url);
        }
        console.log("PDF uploads completed");
      }
      
      setUploading(false);
      const token = typeof window !== 'undefined' ? localStorage.getItem('firebaseToken') : null;
      console.log("Firebase token available:", !!token);
      
      const requestData = {
        ...newCourse,
        pdfUrls,
        links: newCourse.links.filter(l => l.trim() !== ''),
      };
      console.log("Request data:", requestData);
      
      const response = await fetch('/api/courses/', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(`Server error: ${errorData.detail || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log("Course created successfully:", data);
      setSuccess('Course created successfully!');
      setNewCourse({ title: '', description: '', year_of_study: 1, subject: SUBJECTS[0], links: [''], pdfs: [], pdfUrls: [] });
      fetchCourses();
    } catch (err: any) {
      console.error("Course creation error:", err);
      setError(`Failed to create course: ${err.message || 'Unknown error'}`);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F4FE]">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/homelogin" className="flex items-center space-x-2">
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
            <Link href="/courses" className="text-gray-600 hover:text-[#4067EC]">Courses</Link>
            <Link href="/about" className="text-gray-600 hover:text-[#4067EC]">About</Link>
          </nav>
          
          <Link href="/homelogin" className="bg-[#4067EC] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#3155d4]">
            My Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#4067EC] mb-2">Moje kursy</h1>
            <p className="text-gray-600">Zarządzaj swoimi kursami i materiałami dydaktycznymi</p>
          </div>
          <button
            onClick={() => {
              // Wyczyść cache i odśwież
              if (typeof window !== 'undefined') {
                localStorage.removeItem(cacheKey);
              }
              fetchCourses(1, false);
            }}
            className="bg-[#4067EC] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3155d4] transition-colors"
          >
            Odśwież
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-gray-600">Ładowanie kursów...</p>
            <p className="text-sm text-gray-500 mt-2">To może potrwać kilka sekund</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                          {courses.map((course) => (
              <div key={`${course.id}-${course.updated_at || course.created_at}`} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        course.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {course.is_active ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                      <span className="text-xs text-gray-500">Rok {course.year_of_study}</span>
                    </div>
                    
                    <Link href={`/homelogin/teacher/courses/${course.id}`} className="block">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-[#4067EC] transition-colors">
                        {course.title}
                      </h3>
                    </Link>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {course.subject}
                      </span>
                      <span>
                        {course.pdfUrls?.length || 0} PDF • {course.links?.length || 0} Linków
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link 
                        href={`/homelogin/teacher/courses/${course.id}`}
                        className="flex-1 bg-[#4067EC] text-white text-center py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#3155d4] transition-colors"
                      >
                        Zarządzaj
                      </Link>
                      <Link 
                        href={`/courses/${course.slug}`}
                        className="flex-1 border border-[#4067EC] text-[#4067EC] text-center py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#F1F4FE] transition-colors"
                      >
                        Podgląd
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Paginacja */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center space-x-2 mb-8">
                <button
                  onClick={() => fetchCourses(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Poprzednia
                </button>
                
                <span className="px-4 py-2 text-sm text-gray-700">
                  Strona {pagination.page} z {pagination.total_pages} ({pagination.count} kursów)
                </span>
                
                <button
                  onClick={() => fetchCourses(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Następna
                </button>
              </div>
            )}
          </>
        )}

        {/* Create Course Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-[#4067EC] mb-6">Utwórz nowy kurs</h2>
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}
          
          <form onSubmit={handleCreateCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tytuł kursu *
                </label>
                <input 
                  type="text" 
                  value={newCourse.title} 
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors" 
                  placeholder="np. Podstawy matematyki"
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Przedmiot *
                </label>
                <select 
                  value={newCourse.subject} 
                  onChange={e => setNewCourse({ ...newCourse, subject: e.target.value })} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors" 
                  required
                >
                  {SUBJECTS.map(subj => <option key={subj} value={subj}>{subj}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opis kursu *
              </label>
              <textarea 
                value={newCourse.description} 
                onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors" 
                rows={4}
                placeholder="Opisz czego uczniowie będą się uczyć w tym kursie..."
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rok nauki *
                </label>
                <select 
                  value={newCourse.year_of_study} 
                  onChange={e => setNewCourse({ ...newCourse, year_of_study: Number(e.target.value) })} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors" 
                  required
                >
                  {[1,2,3,4,5].map(year => <option key={year} value={year}>Rok {year}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pliki PDF
                </label>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  multiple 
                  onChange={handlePdfChange} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors" 
                />
                {newCourse.pdfs.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Wybrane pliki:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {newCourse.pdfs.map((file, idx) => <li key={idx}>• {file.name}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Odnośniki (linki)
              </label>
              {newCourse.links.map((link, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input 
                    type="url" 
                    value={link} 
                    onChange={e => handleLinkChange(idx, e.target.value)} 
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors" 
                    placeholder="https://..." 
                  />
                  {newCourse.links.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeLinkField(idx)} 
                      className="text-red-500 hover:text-red-700 px-3 py-3 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                onClick={addLinkField} 
                className="text-[#4067EC] hover:text-[#3155d4] text-sm font-medium transition-colors"
              >
                + Dodaj kolejny link
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                className="bg-[#4067EC] text-white py-3 px-8 rounded-lg font-medium hover:bg-[#3155d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={uploading}
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Przesyłanie...
                  </div>
                ) : (
                  'Utwórz kurs'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 