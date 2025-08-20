"use client";
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, getDocs, query, where, DocumentData, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { FaFilePdf, FaLink, FaChevronDown, FaChevronUp, FaQuestionCircle } from "react-icons/fa";
import { Course, Section, Content, Quiz } from '@/types';

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
  const router = useRouter();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [showSection, setShowSection] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionContents, setSectionContents] = useState<Record<string, Content[]>>({});
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, number>>({});
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);;

  // Fetch quiz results
  const fetchQuizResults = useCallback(async (quizIds: string[]) => {
    if (!user || !quizIds || quizIds.length === 0) return;
    
    try {
      const resultsCollection = collection(db, 'quiz_results');
      const resultsQuery = query(
        resultsCollection,
        where('user_id', '==', user.uid),
        where('quiz_id', 'in', quizIds)
      );
      
      const resultsSnapshot = await getDocs(resultsQuery);
      const results: {[key: string]: number} = {};
      const completed: string[] = [];
      
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        results[data.quiz_id] = data.score;
        completed.push(data.quiz_id);
      });
      
      setQuizResults(results);
      setCompletedQuizzes(completed);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    }
  }, [user, setQuizResults, setCompletedQuizzes]);

  // Fetch quiz attempts
  const fetchQuizAttempts = useCallback(async (quizIds: string[]) => {
    if (!user || !quizIds || quizIds.length === 0) return;
    
    try {
      const attemptsCollection = collection(db, 'quiz_attempts');
      const attemptsQuery = query(
        attemptsCollection,
        where('user_id', '==', user.uid),
        where('quiz_id', 'in', quizIds)
      );
      
      const attemptsSnapshot = await getDocs(attemptsQuery);
      const attempts: {[key: string]: number} = {};
      
      attemptsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        attempts[data.quiz_id] = (attempts[data.quiz_id] || 0) + 1;
      });
      
      setQuizAttempts(attempts);
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
    }
  }, [user, setQuizAttempts]);

  // Fetch course details
  const fetchCourseDetail = useCallback(async () => {
    if (!slug) return;

    try {
      console.log('[DEBUG] Fetching course details for slug:', slug);
      
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
      const courseData = courseDoc.data() as DocumentData;
      console.log('[DEBUG] Course data from Firestore:', courseData);
      
      const mappedCourse: Course = {
        id: courseDoc.id,
        title: courseData.title || 'Kurs bez tytułu',
        slug: courseData.slug || slug,
        description: courseData.description || 'Brak opisu kursu',
        thumbnail: courseData.thumbnail || '/puzzleicon.png',
        level: courseData.level || 'Podstawowy',
        subject: courseData.subject || '',
        year_of_study: courseData.year_of_study || 1,
        category: courseData.category,
        category_name: courseData.category_name,
        is_active: courseData.is_active ?? true,
        teacherEmail: courseData.teacherEmail || '',
        instructor_name: courseData.instructor_name,
        assignedUsers: courseData.assignedUsers || [],
        sections: courseData.sections || [],
        pdfUrls: courseData.pdfUrls || [],
        links: courseData.links || [],
        created_at: courseData.created_at || new Date().toISOString(),
        updated_at: courseData.updated_at || new Date().toISOString(),
        created_by: courseData.created_by || null
      };
      
      console.log('[DEBUG] Mapped course:', mappedCourse);
      setCourse(mappedCourse);
      setSections(courseData.sections || []);
      
      // Pobierz zawartość sekcji
      if (courseData.sections && Array.isArray(courseData.sections)) {
        const initialSectionContents: Record<string, Content[]> = {};
        courseData.sections.forEach((section: Section) => {
          if (section.contents && Array.isArray(section.contents)) {
            initialSectionContents[section.id] = section.contents;
            console.log(`[DEBUG] Section ${section.id} contents loaded:`, section.contents);
          }
        });
        setSectionContents(initialSectionContents);
        console.log('[DEBUG] Initial sectionContents set:', initialSectionContents);
      }
      
      if (user) {
        const assignedUsers = courseData.assignedUsers || [];
        
        // Sprawdź czy uczeń jest przypisany do kursu przez assignedUsers
        const userIsAssignedByUsers = assignedUsers.includes(user.uid) || assignedUsers.includes(user.email);
        
        // Sprawdź czy uczeń jest przypisany do nauczyciela kursu
        let userIsAssignedToTeacher = false;
        let userIsAssignedAsParent = false;
        
        if (user.role === 'student') {
          // Pobierz dane ucznia z kolekcji users
          const usersRef = collection(db, 'users');
          const userQuery = query(usersRef, where('uid', '==', user.uid));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            // Sprawdź czy uczeń ma przypisanego nauczyciela
            if (userData.assignedToTeacher) {
              // Sprawdź czy nauczyciel tego kursu to ten sam nauczyciel
              // assignedToTeacher to uid nauczyciela, więc musimy porównać z uid nauczyciela kursu
              const courseTeacherEmail = courseData.created_by || courseData.teacherEmail;
              
              // Znajdź uid nauczyciela na podstawie emaila
              const teacherQuery = query(usersRef, where('email', '==', courseTeacherEmail));
              const teacherSnapshot = await getDocs(teacherQuery);
              
              if (!teacherSnapshot.empty) {
                const teacherData = teacherSnapshot.docs[0].data();
                const courseTeacherUid = teacherData.uid;
                userIsAssignedToTeacher = userData.assignedToTeacher === courseTeacherUid;
              }
            }
          }
        } else if (user.role === 'parent') {
          // Sprawdź czy rodzic ma przypisane dziecko, które jest na tym kursie
          const parentStudentsRef = collection(db, 'parent_students');
          const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
          const parentStudentsSnapshot = await getDocs(parentStudentsQuery);
          
          if (!parentStudentsSnapshot.empty) {
            const studentId = parentStudentsSnapshot.docs[0].data().student;
            // Sprawdź czy dziecko jest przypisane do tego kursu
            const assignedUsers = courseData.assignedUsers || [];
            userIsAssignedAsParent = assignedUsers.includes(studentId);
            
            // Sprawdź też czy dziecko jest przypisane do nauczyciela kursu
            const usersRef = collection(db, 'users');
            const studentQuery = query(usersRef, where('uid', '==', studentId));
            const studentSnapshot = await getDocs(studentQuery);
            
            if (!studentSnapshot.empty) {
              const studentData = studentSnapshot.docs[0].data();
              if (studentData.assignedToTeacher) {
                const courseTeacherEmail = courseData.created_by || courseData.teacherEmail;
                
                // Znajdź uid nauczyciela na podstawie emaila
                const teacherQuery = query(usersRef, where('email', '==', courseTeacherEmail));
                const teacherSnapshot = await getDocs(teacherQuery);
                
                if (!teacherSnapshot.empty) {
                  const teacherData = teacherSnapshot.docs[0].data();
                  const courseTeacherUid = teacherData.uid;
                  userIsAssignedAsParent = userIsAssignedAsParent || (studentData.assignedToTeacher === courseTeacherUid);
                }
              }
            }
          }
        }
        
        const userIsAssigned = userIsAssignedByUsers || userIsAssignedToTeacher || userIsAssignedAsParent;
        setIsAssigned(userIsAssigned);
        
        console.log('[DEBUG] User assigned to course by users:', userIsAssignedByUsers);
        console.log('[DEBUG] User assigned to course by teacher:', userIsAssignedToTeacher);
        console.log('[DEBUG] User assigned to course as parent:', userIsAssignedAsParent);
        console.log('[DEBUG] Final user assigned to course:', userIsAssigned);
      }
      
    } catch (err) {
      console.error('[DEBUG] Error fetching course from Firestore:', err);
      setError('Błąd ładowania kursu. Spróbuj ponownie później.');
    } finally {
      setLoading(false);
    }
  }, [slug, user, setError, setLoading, setCourse, setSections, setIsAssigned]);

  const fetchQuizzes = useCallback(async (courseId: string) => {
    try {
      setLoadingQuizzes(true);
      setQuizError(null);
      
      console.log('[DEBUG] Fetching quizzes for course ID:', courseId);
      const quizzesCollection = collection(db, 'quizzes');
      const quizzesQuery = query(quizzesCollection, where('course_id', '==', courseId));
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      const quizzesList = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];
      
      console.log('[DEBUG] Found quizzes:', quizzesList);
      setQuizzes(quizzesList);
      
      // Sprawdź czy są quizy przed wywołaniem funkcji z filtrem 'in'
      if (quizzesList.length > 0) {
        await Promise.all([
          fetchQuizAttempts(quizzesList.map(q => q.id)),
          fetchQuizResults(quizzesList.map(q => q.id))
        ]);
      }
    } catch (quizError) {
      console.error('[DEBUG] Error fetching quizzes:', quizError);
      setQuizError('Nie udało się załadować quizów');
    } finally {
      setLoadingQuizzes(false);
    }
  }, [fetchQuizAttempts, fetchQuizResults, setLoadingQuizzes, setQuizError, setQuizzes]);

  useEffect(() => {
    fetchCourseDetail();
  }, [fetchCourseDetail]);

  useEffect(() => {
    if (course) {
      fetchQuizzes(course.id.toString());
    }
  }, [course, fetchQuizzes]);

  // Zapisz aktywność użytkownika w tym kursie, aby sekcja „Ostatnio aktywne kursy” mogła ją odczytać
  useEffect(() => {
    const saveActivity = async () => {
      try {
        if (!user || !course) return;
        const activityRef = doc(collection(db, 'courseActivity'), `${user.uid}_${course.id}`);
        await setDoc(activityRef, {
          userId: user.uid,
          courseId: course.id,
          lastAccessed: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.error('Nie udało się zapisać aktywności kursu', e);
      }
    };
    saveActivity();
  }, [user, course]);

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
        {/* Sekcja quizów */}
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold text-[#4067EC] flex items-center gap-2">
              <FaQuestionCircle />
              Quizy
            </h2>
          </div>
          <div className="px-6 pb-6">
            {loadingQuizzes ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4067EC] border-r-transparent"></div>
                <span className="ml-3 text-gray-600">Ładowanie quizów...</span>
              </div>
            ) : quizError ? (
              <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                {quizError}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Brak dostępnych quizów dla tego kursu.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sekcja nierozwiązanych quizów */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Quizy do rozwiązania</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quizzes
                      .filter(quiz => !completedQuizzes.includes(quiz.id))
                      .map(quiz => (
                        <div key={quiz.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-lg text-gray-900">{quiz.title}</h3>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {quiz.subject}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">{quiz.description}</p>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{quiz.questions?.length || 0} pytań</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              <span>Pozostało prób: {Math.max(0, (quiz.max_attempts || 1) - (quizAttempts[quiz.id] || 0))}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => router.push(`/courses/${slug}/quiz/${quiz.id}`)}
                            className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center ${
                              (quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1)
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'bg-[#4067EC] text-white hover:bg-[#3155d4]'
                            }`}
                            disabled={(quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1)}
                          >
                            {(quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1) ? (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Wykorzystano wszystkie próby
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Rozpocznij quiz
                              </>
                            )}
                          </button>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Sekcja rozwiązanych quizów */}
                {completedQuizzes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Rozwiązane quizy</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {quizzes
                        .filter(quiz => completedQuizzes.includes(quiz.id))
                        .map(quiz => (
                          <div key={quiz.id} className="bg-gray-50 border rounded-xl p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-semibold text-lg text-gray-900">{quiz.title}</h3>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Ukończony
                              </span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Wynik:</span>
                                <span className="font-semibold text-green-600">{quizResults[quiz.id]?.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${quizResults[quiz.id]}%` }}
                                />
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Wykorzystane próby: {quizAttempts[quiz.id] || 0} z {quiz.max_attempts || 1}</span>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


        
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
                  {sectionContents[section.id]?.map((item: Content) => (
                    <div key={item.id} className="flex flex-col gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.fileUrl && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                        {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                        {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                        <span className="font-semibold">{item.name || item.link || 'Materiał'}</span>
                        {item.fileUrl && (
                          <a href={item.fileUrl} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">
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