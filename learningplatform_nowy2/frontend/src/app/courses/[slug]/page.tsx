"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { FaFilePdf, FaLink, FaChevronDown, FaChevronUp } from "react-icons/fa";

// Types
interface Section {
  id: number;
  name: string;
  type: string;
  deadline?: string;
  contents: Content[];
  submissions?: any[];
}

interface Content {
  id: number;
  name: string;
  fileUrl?: string;
  link?: string;
  text?: string;
  type?: string;
  duration_minutes?: number;
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
  sections: Section[];
}

export default function CourseDetailPage() {
  return (
    <ProtectedRoute>
      <CourseDetail />
    </ProtectedRoute>
  );
}

function CourseDetail() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [showSection, setShowSection] = useState<{[id:number]: boolean}>({});
  const [sections, setSections] = useState<any[]>([]);
  const [sectionContents, setSectionContents] = useState<{[id:number]: any[]}>({});

  // Fetch course details
  useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        console.log('[DEBUG] Slug:', slug);
        console.log('[DEBUG] Fetching from Firestore...');
        
        // Pobierz kurs z Firestore po slug
        const coursesCollection = collection(db, "courses");
        const q = query(coursesCollection, where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('[DEBUG] No course found with slug:', slug);
          setError('Nie znaleziono kursu.');
          setLoading(false);
          return;
        }
        
        const courseDoc = querySnapshot.docs[0];
        const courseData = courseDoc.data();
        console.log('[DEBUG] Course data from Firestore:', courseData);
        
        // Mapuj dane z Firestore na format oczekiwany przez komponent
        const mappedCourse: Course = {
          id: parseInt(courseDoc.id),
          title: courseData.title || 'Kurs bez tytułu',
          slug: courseData.slug || slug,
          description: courseData.description || 'Brak opisu kursu',
          thumbnail: courseData.thumbnail || '/puzzleicon.png',
          level: courseData.level || 'Podstawowy',
          category: courseData.category || 1,
          category_name: courseData.category_name || 'Ogólny',
          instructor: courseData.instructor || 1,
          instructor_name: courseData.instructor_name || 'Instructor',
          sections: courseData.sections || []
        };
        
        setCourse(mappedCourse);
        setSections(courseData.sections || []);
        
        // Sprawdź czy użytkownik jest przypisany do kursu
        if (user) {
          const assignedUsers = courseData.assignedUsers || [];
          const userIsAssigned = assignedUsers.includes(user.uid) || assignedUsers.includes(user.email);
          setIsAssigned(userIsAssigned);
          console.log('[DEBUG] User assigned to course:', userIsAssigned);
        }
        
        // Pobierz zawartość sekcji
        if (courseData.sections && courseData.sections.length > 0) {
          const contentsMap: {[id:number]: any[]} = {};
          for (const section of courseData.sections) {
            contentsMap[section.id] = section.contents || [];
          }
          setSectionContents(contentsMap);
        }
        
      } catch (err) {
        console.error('[DEBUG] Error fetching course from Firestore:', err);
        setError('Błąd ładowania kursu. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCourseDetail();
    }
  }, [slug, user]);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center py-6 px-2 sm:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
          <span className="ml-3 text-gray-600">Ładowanie kursu...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center py-6 px-2 sm:px-6">
        <div className="w-full max-w-5xl bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          <p>{error || 'Nie znaleziono kursu'}</p>
          <div className="mt-4 flex space-x-4">
            <button 
              className="text-sm text-[#4067EC] hover:underline"
              onClick={() => window.location.reload()}
            >
              Spróbuj ponownie
            </button>
            <Link href="/homelogin" className="text-sm text-[#4067EC] hover:underline">
              Wróć do dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Sprawdź czy użytkownik jest przypisany do kursu
  if (!isAssigned && user?.role === 'student') {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center py-6 px-2 sm:px-6">
        <div className="w-full max-w-5xl text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Dostęp ograniczony</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nie jesteś przypisany do tego kursu. Skontaktuj się z nauczycielem, aby uzyskać dostęp.
          </p>
          <div className="mt-4">
            <Link 
              href="/homelogin" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#4067EC] hover:bg-[#3155d4]"
            >
              Wróć do dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center py-6 px-2 sm:px-6">
      {/* Przycisk powrotu do dashboardu */}
      <div className="w-full max-w-5xl mb-4 flex justify-start">
        <Link 
          href="/homelogin" 
          className="flex items-center gap-2 bg-white text-[#4067EC] px-4 py-2 rounded-lg font-semibold shadow hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Wróć do dashboardu
        </Link>
      </div>

      {/* BANNER - taki sam jak w panelu nauczyciela */}
      <div className="w-full max-w-5xl mb-6 relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-[#4067EC] to-[#7aa2f7] flex items-center justify-between h-48 sm:h-56">
        <div className="p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg mb-2">{course?.title || 'Tytuł kursu'}</h1>
          <p className="text-white text-lg font-medium drop-shadow">{course?.description || 'Opis kursu'}</p>
        </div>
        <div className="hidden sm:block h-full">
          <Image src="/puzzleicon.png" alt="Baner kursu" width={180} height={180} className="object-contain h-full w-auto opacity-60" />
        </div>
      </div>

      {/* SEKCJE (Accordion) - taki sam jak w panelu nauczyciela */}
      <div className="w-full max-w-5xl flex flex-col gap-4">
        {sections.length > 0 ? (
          sections.map(section => (
            <div key={section.id} className="bg-white rounded-2xl shadow-lg">
              <div className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] focus:outline-none">
                <button 
                  onClick={() => setShowSection(s => ({...s, [section.id]: !s[section.id]}))} 
                  className="mr-3 text-[#4067EC] text-2xl focus:outline-none"
                >
                  {showSection[section.id] ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                <span className="flex-1">
                  {section.name} <span className="text-base font-normal">({section.type})</span>
                  {section.type === 'zadanie' && section.deadline && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                    </span>
                  )}
                </span>
              </div>
              {showSection[section.id] && (
                <div className="px-6 pb-6 flex flex-col gap-4">
                  {/* Lista materiałów/zadań/aktywności */}
                  {(sectionContents[section.id]?.length === 0 || !sectionContents[section.id]) && (
                    <div className="text-gray-400 italic">Brak materiałów.</div>
                  )}
                  {sectionContents[section.id]?.map((item: any) => (
                    <div key={item.id} className="flex flex-col gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                      <div className="flex items-center gap-3">
                        {(item.fileUrl || item.file) && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                        {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                        {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                        <span className="font-semibold">{item.name || (item.file?.name || item.link || 'Materiał')}</span>
                        {item.fileUrl && (
                          <a href={item.fileUrl} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">
                            Pobierz
                          </a>
                        )}
                        {item.file && !item.fileUrl && (
                          <a href={URL.createObjectURL(item.file)} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">
                            Pobierz
                          </a>
                        )}
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">
                            Otwórz link
                          </a>
                        )}
                      </div>
                      {item.text && (
                        <div className="mt-2 p-3 bg-white rounded border-l-4 border-[#4067EC]">
                          <div className="text-sm text-gray-600 mb-1">Treść:</div>
                          <div 
                            className="whitespace-pre-wrap text-gray-800 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: item.text
                                .replace(/\n/g, '<br>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="w-full max-w-5xl text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Brak dostępnych materiałów</h3>
            <p className="mt-1 text-sm text-gray-500">Ten kurs nie ma jeszcze żadnych sekcji ani materiałów.</p>
          </div>
        )}
      </div>
    </div>
  );
} 