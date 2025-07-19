"use client";
import { useState, useEffect } from "react";
// Usunięte nieużywane importy Firebase Storage
import { db } from '../../../../config/firebase';
import Link from "next/link";
import Image from "next/image";
import { useAuth } from '@/context/AuthContext';

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
  created_by?: string;
}

// Usunięte SUBJECTS - nieużywane po usunięciu formularza tworzenia kursów

export default function TeacherCourses() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total_pages: 1,
    count: 0
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null);

  useEffect(() => {
    // Natychmiastowe pobranie kursów bez cache'owania przy pierwszym ładowaniu
    fetchCourses(1, false);
  }, []);

  // Cache'owanie kursów w localStorage - tylko dla kolejnych odświeżeń
  const cacheKey = 'teacher_courses_cache';
  const cacheExpiry = 2 * 60 * 1000; // 2 minuty (krótszy czas)

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

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey);
    }
  };

  const fetchCourses = async (page = 1, useCache = true, retryCount = 0) => {
    console.log(`[DEBUG] fetchCourses called - page: ${page}, useCache: ${useCache}, retryCount: ${retryCount}`);
    
    setLoading(true);
    setError(null);
    
    // Sprawdź cache tylko dla kolejnych odświeżeń, nie przy pierwszym ładowaniu
    if (page === 1 && useCache) {
      const cached = getCachedCourses();
      if (cached) {
        console.log('[DEBUG] Using cached courses');
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
      console.log('[DEBUG] Fetching courses from Firestore...');
      
      // Pobierz kursy bezpośrednio z Firestore
      const { collection, getDocs, query, where, orderBy, limit, startAfter } = await import('firebase/firestore');
      const coursesCollection = collection(db, 'courses');
      
      // Pobierz tylko kursy przypisane do zalogowanego nauczyciela
      const teacherEmail = user?.email;
      console.log('[DEBUG] Teacher email:', teacherEmail);
      
      if (!teacherEmail) {
        setError('Nie można zidentyfikować nauczyciela');
        setLoading(false);
        return;
      }
      
      // Filtruj kursy po teacherEmail
      const coursesSnapshot = await getDocs(coursesCollection);
      
      const firestoreCourses = coursesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            title: data.title || '',
            description: data.description || '',
            year_of_study: data.year_of_study || data.year || 1,
            subject: data.subject || '',
            is_active: data.is_active !== undefined ? data.is_active : true,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
            pdfUrls: data.pdfUrls || [],
            links: data.links || [],
            slug: data.slug || '',
            created_by: data.created_by || null,
            teacherEmail: data.teacherEmail || '',
            assignedUsers: data.assignedUsers || [],
            sections: data.sections || []
          };
        })
        .filter(course => course.teacherEmail === teacherEmail); // Filtruj tylko kursy nauczyciela
      
      console.log('[DEBUG] Firestore courses loaded:', firestoreCourses.length);
      console.log('[DEBUG] Teacher courses:', firestoreCourses.map(c => ({ title: c.title, teacherEmail: c.teacherEmail })));
      
      // Sortuj po dacie utworzenia (najnowsze pierwsze)
      const sortedCourses = firestoreCourses.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Paginacja po stronie klienta
      const pageSize = 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedCourses = sortedCourses.slice(startIndex, endIndex);
      
      const paginationData = {
        page: page,
        page_size: pageSize,
        total_pages: Math.ceil(sortedCourses.length / pageSize),
        count: sortedCourses.length
      };
      
      console.log('[DEBUG] Pagination data:', paginationData);
      console.log('[DEBUG] Courses for current page:', paginatedCourses.length);
      
      setCourses(paginatedCourses);
      setPagination(paginationData);
      
      // Cache'uj tylko pierwszą stronę
      if (page === 1) {
        console.log('[DEBUG] Caching first page data');
        setCachedCourses({
          results: paginatedCourses,
          pagination: paginationData
        });
      }
      
      console.log('[DEBUG] Courses loaded successfully from Firestore');
    } catch (err: any) {
      console.error('[DEBUG] Error fetching courses from Firestore:', err);
      
      // Retry logic dla błędów sieciowych
      if (retryCount < 2) {
        console.log(`[DEBUG] Retrying... Attempt ${retryCount + 1}`);
        setTimeout(() => {
          fetchCourses(page, useCache, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(`Failed to load courses from Firestore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Usunięte funkcje związane z tworzeniem kursów - tylko admin może tworzyć kursy

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten kurs? Ta operacja jest nieodwracalna.')) {
      return;
    }

    setDeletingCourse(courseId);
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'courses', courseId));
      
      setSuccess('Kurs został pomyślnie usunięty');
      clearCache();
      fetchCourses(pagination.page, false);
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Błąd podczas usuwania kursu');
    } finally {
      setDeletingCourse(null);
    }
  };

  // Usunięta funkcja handleCreateCourse - tylko admin może tworzyć kursy

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
            <h1 className="text-3xl font-bold text-[#4067EC] mb-2">
              {isAdmin ? 'Wszystkie kursy' : 'Moje kursy'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Zarządzaj wszystkimi kursami w systemie' : 'Zarządzaj swoimi kursami i materiałami dydaktycznymi'}
            </p>
          </div>
          <button
            onClick={() => {
              // Wyczyść cache i odśwież z wymuszeniem świeżych danych
              clearCache();
              setLoading(true);
              setError(null);
              fetchCourses(1, false, 0);
            }}
            className="bg-[#4067EC] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3155d4] transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Odśwież</span>
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
                    
                    {isAdmin && course.created_by && (
                      <div className="text-xs text-gray-500 mb-4">
                        Nauczyciel: {course.created_by}
                      </div>
                    )}
                    
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
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteCourse(course.id.toString())}
                          disabled={deletingCourse === course.id.toString()}
                          className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Usuń kurs"
                        >
                          {deletingCourse === course.id.toString() ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
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

        {/* Info about course management */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-blue-800 mb-4">Zarządzanie kursami</h2>
          <p className="text-blue-700 mb-4">
            Tutaj widzisz kursy, które zostały Ci przypisane przez administratora. Możesz zarządzać zawartością każdego kursu, 
            dodawać lekcje, materiały i zadania.
          </p>
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Co możesz robić:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Dodawać i edytować lekcje</li>
              <li>• Uploadować materiały dydaktyczne</li>
              <li>• Tworzyć zadania i quizy</li>
              <li>• Przeglądać postępy studentów</li>
              <li>• Zarządzać ocenami</li>
            </ul>
          </div>
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mt-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{success}</span>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-600 hover:text-green-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 