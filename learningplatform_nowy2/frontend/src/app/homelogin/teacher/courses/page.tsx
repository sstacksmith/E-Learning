"use client";
import { useState, useEffect, useCallback } from "react";
// Usunięte nieużywane importy Firebase Storage
import { db } from '../../../../config/firebase';
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface Course {
  id: string;
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
  teacherEmail?: string;
  assignedUsers?: string[];
  sections?: unknown[];
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
  
  // States for creating new course
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    subject: '',
    year_of_study: 1
  });
  const [creatingCourse, setCreatingCourse] = useState(false);

  

  // Cache'owanie kursów w localStorage - tylko dla kolejnych odświeżeń
  const cacheKey = 'teacher_courses_cache';
  const cacheExpiry = 2 * 60 * 1000; // 2 minuty (krótszy czas)

  const getCachedCourses = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheExpiry) {
        return data;
      }
    }
    return null;
  }, [cacheKey, cacheExpiry]);

  const setCachedCourses = (data: { results: Course[]; pagination: { page: number; page_size: number; total_pages: number; count: number; }; }) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  };

  const clearCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey]);

  const fetchCourses = useCallback(async (page = 1, useCache = true, retryCount = 0) => {
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
      const { collection, getDocs } = await import('firebase/firestore');
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
        .filter(course => (course.teacherEmail || '') === (teacherEmail || '')); // Filtruj tylko kursy nauczyciela
      
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
    } catch (err) {
      console.error('[DEBUG] Error fetching courses from Firestore:', err);
      
      // Retry logic dla błędów sieciowych
      if (retryCount < 2) {
        console.log(`[DEBUG] Retrying... Attempt ${retryCount + 1}`);
        setTimeout(() => {
          fetchCourses(page, useCache, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      if (err instanceof Error) {
        setError(`Failed to load courses from Firestore: ${err.message}`);
      } else {
        setError('Failed to load courses from Firestore');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.email, setLoading, setError, setCourses, setPagination, getCachedCourses]);

  useEffect(() => {
    // Natychmiastowe pobranie kursów bez cache'owania przy pierwszym ładowaniu
    fetchCourses(1, false);
  }, [fetchCourses]);

  // Usunięte funkcje związane z tworzeniem kursów - tylko admin może tworzyć kursy

  // Funkcja sprawdzająca czy nauczyciel może usunąć kurs
  const canDeleteCourse = useCallback((course: Course) => {
    if (isAdmin) return true; // Admin może usunąć każdy kurs
    if (!user?.email) return false;
    
    // Nauczyciel może usunąć kurs, który sam utworzył
    return course.created_by === user.email || course.teacherEmail === user.email;
  }, [isAdmin, user?.email]);

  const handleDeleteCourse = useCallback(async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const confirmMessage = isAdmin 
      ? 'Czy na pewno chcesz usunąć ten kurs? Ta operacja jest nieodwracalna.'
      : 'Czy na pewno chcesz usunąć swój kurs? Ta operacja jest nieodwracalna.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingCourse(courseId);
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'courses', courseId));
      
      const successMessage = isAdmin 
        ? 'Kurs został pomyślnie usunięty'
        : 'Twój kurs został pomyślnie usunięty';
      
      setSuccess(successMessage);
      clearCache();
      fetchCourses(pagination.page, false);
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Błąd podczas usuwania kursu');
    } finally {
      setDeletingCourse(null);
    }
  }, [setDeletingCourse, setSuccess, clearCache, fetchCourses, pagination.page, setError, courses, isAdmin]);

  // Usunięta funkcja handleCreateCourse - tylko admin może tworzyć kursy

  // Function to create new course
  const handleCreateCourse = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCourse.title.trim() || !newCourse.description.trim() || !newCourse.subject.trim()) {
      setError('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    if (!user?.email) {
      setError('Nie można zidentyfikować użytkownika');
      return;
    }
    
    setCreatingCourse(true);
    setError(null);
    
    try {
      console.log('Creating new course:', newCourse);
      
      // Generate slug from title
      const generateSlug = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Remove double hyphens
          .trim();
      };
      
      const slug = generateSlug(newCourse.title);
      
      const courseData = {
        title: newCourse.title.trim(),
        description: newCourse.description.trim(),
        subject: newCourse.subject.trim(),
        year_of_study: newCourse.year_of_study,
        teacherEmail: user.email,
        created_by: user.email,
        assignedUsers: [],
        sections: [],
        pdfUrls: [],
        links: [],
        slug: slug,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving course data to Firestore:', courseData);
      
      const { addDoc, collection } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'courses'), courseData);
      
      console.log('Course created successfully with ID:', docRef.id);
      
      setSuccess('Kurs został pomyślnie utworzony!');
      setShowCreateCourse(false);
      setNewCourse({
        title: '',
        description: '',
        subject: '',
        year_of_study: 1
      });
      
      // Refresh courses list
      clearCache();
      fetchCourses(1, false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error creating course:', error);
      setError('Błąd podczas tworzenia kursu. Spróbuj ponownie.');
    } finally {
      setCreatingCourse(false);
    }
  }, [newCourse, user, clearCache, fetchCourses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/homelogin'}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </button>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isAdmin ? 'Wszystkie kursy' : 'Moje kursy'}
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 border border-white/20">
          
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#4067EC] mb-1">
                {isAdmin ? 'Wszystkie kursy' : 'Moje kursy'}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                {isAdmin ? 'Zarządzaj wszystkimi kursami w systemie' : 'Zarządzaj swoimi kursami, materiałami dydaktycznymi i usuń niepotrzebne kursy'}
              </p>
            </div>
                          <div className="flex gap-2">
              {/* Add Course Button - only for teachers */}
              {!isAdmin && (
                                  <button
                    onClick={() => setShowCreateCourse(true)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                    <span>Dodaj kurs</span>
                  </button>
              )}
              
              <button
                onClick={() => {
                  // Wyczyść cache i odśwież z wymuszeniem świeżych danych
                  clearCache();
                  setLoading(true);
                  setError(null);
                  fetchCourses(1, false, 0);
                }}
                className="bg-[#4067EC] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#3155d4] transition-colors flex items-center space-x-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Odśwież</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                              <p className="mt-3 text-gray-600">Ładowanie kursów...</p>
                <p className="text-sm text-gray-500 mt-1">To może potrwać kilka sekund</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg mb-4">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-6">
                {courses.map((course) => (
                  <div key={`${course.id}-${course.updated_at || course.created_at}`} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col h-full min-h-[350px]">
                    {/* Course Header - Fixed height */}
                    <div className="bg-gradient-to-r from-[#4067EC] to-[#7aa2f7] p-3 text-white h-28 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.is_active 
                            ? 'bg-green-500/20 text-green-100' 
                            : 'bg-red-500/20 text-red-100'
                        }`}>
                          {course.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </span>
                        <span className="text-xs text-white/80">Rok {course.year_of_study}</span>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <Link href={`/homelogin/teacher/courses/${course.id}`} className="block">
                          <h3 className="text-lg font-bold text-white mb-1 hover:text-white/90 transition-colors line-clamp-1">
                            {course.title}
                          </h3>
                        </Link>
                        
                        <p className="text-white/90 text-sm line-clamp-2">{course.description}</p>
                      </div>
                    </div>
                    
                    {/* Course Content */}
                    <div className="p-3 flex-1 flex flex-col">
                      {/* Subject Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold border border-blue-200">
                          {course.subject}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {course.pdfUrls?.length || 0} PDF • {course.links?.length || 0} Linków
                        </span>
                      </div>
                      
                      {/* Course Stats */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-xl font-bold text-[#4067EC]">
                            {course.sections?.length || 0}
                          </div>
                          <div className="text-xs text-gray-600 font-medium">Sekcji</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-xl font-bold text-green-600">
                            {course.assignedUsers?.length || 0}
                          </div>
                          <div className="text-xs text-gray-600 font-medium">Uczniów</div>
                        </div>
                      </div>
                      
                      {/* Admin Info */}
                      {isAdmin && course.created_by && (
                        <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded">
                          Nauczyciel: {course.created_by}
                        </div>
                      )}
                      
                      {/* Action Buttons - Fixed at bottom */}
                      <div className="mt-auto">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => window.location.href = `/homelogin/teacher/courses/${course.id}`}
                            className="flex-1 bg-[#4067EC] text-white text-center py-3 px-3 rounded-lg text-sm font-semibold hover:bg-[#3155d4] transition-colors shadow-sm hover:shadow-md min-h-[44px] flex items-center justify-center !important"
                            style={{
                              backgroundColor: '#4067EC !important',
                              color: 'white !important',
                              padding: '16px !important',
                              minHeight: '48px !important',
                              display: 'flex !important',
                              alignItems: 'center !important',
                              justifyContent: 'center !important',
                              width: '100% !important',
                              height: 'auto !important',
                              overflow: 'visible !important',
                              border: 'none !important',
                              cursor: 'pointer !important'
                            }}
                          >
                            <span className="text-white font-semibold" style={{color: 'white !important', fontWeight: '600 !important', fontSize: '14px !important'}}>Zarządzaj</span>
                          </button>
                          <Link 
                            href={`/courses/${course.slug}`}
                            className="flex-1 border-2 border-[#4067EC] text-[#4067EC] text-center py-3 px-3 rounded-lg text-sm font-semibold hover:bg-[#F1F4FE] transition-colors shadow-sm hover:shadow-md min-h-[44px] flex items-center justify-center"
                          >
                            Podgląd
                          </Link>
                        </div>
                        
                        {/* Delete button for teachers and admins */}
                        {canDeleteCourse(course) && (
                          <div className="mt-2">
                            <button
                              onClick={() => handleDeleteCourse(course.id.toString())}
                              disabled={deletingCourse === course.id.toString()}
                              className="w-full bg-red-500 text-white px-3 py-3 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md min-h-[44px] flex items-center justify-center"
                              title={isAdmin ? "Usuń kurs (Admin)" : "Usuń swój kurs"}
                            >
                              {deletingCourse === course.id.toString() ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                              ) : (
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Paginacja */}
              {pagination.total_pages > 1 && (
                <div className="flex justify-center items-center space-x-2 mb-6">
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                          <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-3">Zarządzanie kursami</h2>
              <p className="text-blue-700 mb-3 text-sm sm:text-base">
              {isAdmin 
                ? 'Tutaj widzisz wszystkie kursy w systemie. Możesz zarządzać zawartością każdego kursu, dodawać lekcje, materiały i zadania, a także usuwać kursy.'
                : 'Tutaj widzisz kursy, które zostały Ci przypisane przez administratora lub które sam utworzyłeś. Możesz zarządzać zawartością każdego kursu, dodawać lekcje, materiały i zadania, a także usuwać swoje kursy.'
              }
            </p>
                        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
              <h3 className="font-semibold text-blue-800 mb-1">Co możesz robić:</h3>
              <ul className="text-blue-700 text-sm space-y-0.5">
                <li>• Dodawać i edytować lekcje</li>
                <li>• Uploadować materiały dydaktyczne</li>
                <li>• Tworzyć zadania i quizy</li>
                <li>• Przeglądać postępy studentów</li>
                <li>• Zarządzać ocenami</li>
                {!isAdmin && <li>• Usuwać swoje kursy</li>}
                {isAdmin && <li>• Usuwać dowolne kursy</li>}
              </ul>
            </div>
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg mt-3 flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{success}</span>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Course Modal */}
      {showCreateCourse && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl font-bold">+</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Utwórz nowy kurs</h2>
                </div>
                <button
                  onClick={() => setShowCreateCourse(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
                >
                  <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
                </button>
              </div>
              
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tytuł kursu *
                  </label>
                  <input
                    type="text"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                    placeholder="Wprowadź tytuł kursu"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opis kursu *
                  </label>
                  <textarea
                    value={newCourse.description}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                    placeholder="Wprowadź opis kursu"
                    rows={3}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Przedmiot *
                  </label>
                  <input
                    type="text"
                    value={newCourse.subject}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                    placeholder="np. Matematyka, Historia, Fizyka"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rok studiów
                  </label>
                  <select
                    value={newCourse.year_of_study}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, year_of_study: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                  >
                    <option value={1}>Rok 1</option>
                    <option value={2}>Rok 2</option>
                    <option value={3}>Rok 3</option>
                    <option value={4}>Rok 4</option>
                    <option value={5}>Rok 5</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={creatingCourse}
                    className="flex-1 bg-[#4067EC] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#3155d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingCourse ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Tworzenie...
                      </div>
                    ) : (
                      'Utwórz kurs'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowCreateCourse(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 