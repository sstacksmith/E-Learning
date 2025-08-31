"use client";
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, getDocs, query, where, DocumentData, doc, setDoc, serverTimestamp, DocumentSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { FaFilePdf, FaLink, FaChevronDown, FaChevronUp, FaQuestionCircle } from "react-icons/fa";
import VideoPlayer from '@/components/VideoPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import { ArrowLeft, BookOpen, PenTool, FileText, GraduationCap, Users, Calendar, Star, User, Clock, CheckCircle, Play, Download, ExternalLink, ChevronRight, BookOpenCheck, Target, Trophy, TrendingUp } from 'lucide-react';
import { Course, Section, Content, Quiz } from '@/types';
import { CourseNotFound } from '@/components/CourseNotFound';

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
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [courseStats, setCourseStats] = useState({
    totalStudents: 0,
    averageRating: 0,
    instructorName: 'Brak informacji'
  });

  // Helper function to convert Firestore Timestamp to Date
  const convertTimestampToDate = (timestamp: any): Date => {
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp || 0);
  };

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
  }, [user]);

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
  }, [user]);

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
      
      // Debug logging for sections
      console.log('[DEBUG] Raw sections from courseData:', courseData.sections);
      console.log('[DEBUG] Sections state after setSections:', courseData.sections || []);
      
      // Pobierz zawartość sekcji - obsłuż obie struktury: starą (contents) i nową (subsections)
      if (courseData.sections && courseData.sections.length > 0) {
        const contents: Record<string, Content[]> = {};
        for (const section of courseData.sections) {
          console.log('[DEBUG] Processing section:', section);
          console.log('[DEBUG] Section has contents:', !!section.contents);
          console.log('[DEBUG] Section has subsections:', !!section.subsections);
          
          // Obsłuż nową strukturę (subsections)
          if (section.subsections && section.subsections.length > 0) {
            console.log('[DEBUG] Using NEW structure (subsections) for section:', section.id);
            // Zbierz wszystkie materiały z podsekcji
            const allMaterials: Content[] = [];
            section.subsections.forEach((subsection: any) => {
              if (subsection.materials && subsection.materials.length > 0) {
                subsection.materials.forEach((material: any) => {
                  allMaterials.push({
                    id: material.id,
                    name: material.title || material.name || "Materiał",
                    type: material.type || "text",
                    text: material.content || material.text || "",
                    fileUrl: material.fileUrl || material.file,
                    link: material.youtubeUrl || material.url || material.link,
                    order: material.order || 0,
                    created_at: material.createdAt || material.created_at || new Date().toISOString(),
                    updated_at: material.updatedAt || material.updated_at || new Date().toISOString(),
                    created_by: material.createdBy || material.created_by || ""
                  });
                });
              }
            });
            contents[section.id] = allMaterials;
            console.log('[DEBUG] Section subsections materials for', section.id, ':', allMaterials);
          }
          // Obsłuż starą strukturę (contents)
          else if (section.contents) {
            console.log('[DEBUG] Using OLD structure (contents) for section:', section.id);
            contents[section.id] = section.contents;
            console.log('[DEBUG] Section contents for', section.id, ':', section.contents);
          }
        }
        setSectionContents(contents);
        console.log('[DEBUG] Final sectionContents:', contents);
      } else {
        console.log('[DEBUG] No sections found in courseData');
      }
      
      // Sprawdź czy użytkownik jest przypisany do kursu
      if (user) {
        const assignedUsers = courseData.assignedUsers || [];
        const isUserAssigned = assignedUsers.includes(user.uid) || assignedUsers.includes(user.email);
        setIsAssigned(isUserAssigned);
        console.log('[DEBUG] User assignment check:', { userUid: user.uid, userEmail: user.email, assignedUsers, isUserAssigned });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('[DEBUG] Error fetching course details:', error);
      setError('Błąd podczas ładowania kursu.');
      setLoading(false);
    }
  }, [slug, user]);

  // Fetch quizzes
  const fetchQuizzes = useCallback(async () => {
    if (!slug) return;
    
    try {
      setLoadingQuizzes(true);
      setQuizError(null);
      
      console.log('[DEBUG] Fetching quizzes for slug:', slug);
      
      const quizzesCollection = collection(db, 'quizzes');
      
      // Try different possible field names for course identification
      let querySnapshot;
      
      // First try: course_slug
      try {
        const q1 = query(quizzesCollection, where('course_slug', '==', slug));
        querySnapshot = await getDocs(q1);
        console.log('[DEBUG] Found quizzes by course_slug:', querySnapshot.docs.length);
      } catch (error) {
        console.log('[DEBUG] No quizzes found by course_slug, trying course_id...');
      }
      
      // Second try: course_id (if course exists)
      if ((!querySnapshot || querySnapshot.empty) && course?.id) {
        try {
          const q2 = query(quizzesCollection, where('course_id', '==', course.id));
          querySnapshot = await getDocs(q2);
          console.log('[DEBUG] Found quizzes by course_id:', querySnapshot.docs.length);
        } catch (error) {
          console.log('[DEBUG] No quizzes found by course_id');
        }
      }
      
      // Third try: get all quizzes and filter by slug in title/description
      if (!querySnapshot || querySnapshot.empty) {
        try {
          const q3 = query(quizzesCollection);
          querySnapshot = await getDocs(q3);
          const filteredQuizzes = querySnapshot.docs.filter((doc: DocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            if (!data) return false;
            return data.title?.toLowerCase().includes(slug.toLowerCase()) ||
                   data.description?.toLowerCase().includes(slug.toLowerCase()) ||
                   data.subject?.toLowerCase().includes(slug.toLowerCase());
          });
          console.log('[DEBUG] Found quizzes by filtering:', filteredQuizzes.length);
          
          // Create new query snapshot with filtered results
          querySnapshot = {
            docs: filteredQuizzes,
            empty: filteredQuizzes.length === 0
          } as any;
        } catch (error) {
          console.log('[DEBUG] Error filtering quizzes:', error);
        }
      }
      
      if (querySnapshot && !querySnapshot.empty) {
        const quizzesList = querySnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as Quiz[];
        
        console.log('[DEBUG] Final quizzes list:', quizzesList);
        setQuizzes(quizzesList);
        
        // Pobierz wyniki i próby dla quizów
        if (quizzesList.length > 0) {
          const quizIds = quizzesList.map(q => q.id);
          await Promise.all([
            fetchQuizResults(quizIds),
            fetchQuizAttempts(quizIds)
          ]);
        }
      } else {
        console.log('[DEBUG] No quizzes found for this course');
        setQuizzes([]);
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching quizzes:', error);
      setQuizError('Błąd podczas ładowania quizów.');
    } finally {
      setLoadingQuizzes(false);
    }
  }, [slug, course?.id, fetchQuizResults, fetchQuizAttempts]);

  // Get real deadlines data
  const getUpcomingDeadlines = () => {
    const deadlines: Array<{
      id: string;
      title: string;
      deadline: string;
      points: number;
      type: string;
      isUrgent: boolean;
    }> = [];
    
    sections.forEach(section => {
      if (section.deadline) {
        const deadlineDate = new Date(section.deadline);
        const today = new Date();
        
        // Only show future deadlines
        if (deadlineDate > today) {
          deadlines.push({
            id: section.id,
            title: section.name,
            deadline: section.deadline,
            points: 0, // Default points if not specified
            type: section.type,
            isUrgent: deadlineDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
          });
        }
      }
    });
    
    // Sort by deadline date
    return deadlines.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  };

  // Fetch activities for the course
  const fetchActivities = useCallback(async () => {
    if (!slug || !course) return;
    
    try {
      setLoadingActivities(true);
      const activitiesList = [];
      
      // 1. Pobierz ostatnie zmiany w kursie (sections, contents)
      if (sections.length > 0) {
        const recentSections = sections
          .filter(section => section.updated_at || section.created_at)
          .sort((a, b) => {
            const dateA = convertTimestampToDate(a.updated_at || a.created_at);
            const dateB = convertTimestampToDate(b.updated_at || b.created_at);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 3);
        
        recentSections.forEach(section => {
          // Mapuj angielskie typy na polskie nazwy
          const typeLabels = {
            'material': 'Materiał',
            'assignment': 'Zadanie',
            'form': 'Egzamin'
          };
          
          activitiesList.push({
            id: `section_${section.id}`,
            type: 'course_update',
            title: `Zaktualizowano: ${section.name}`,
            date: convertTimestampToDate(section.updated_at || section.created_at),
            description: `Sekcja ${typeLabels[section.type as keyof typeof typeLabels] || section.type} została ${section.updated_at ? 'zaktualizowana' : 'utworzona'}`,
            isActive: true
          });
        });
      }
      
      // 2. Pobierz nowe quizy
      if (quizzes.length > 0) {
        const newQuizzes = quizzes
          .filter(quiz => quiz.created_at)
          .sort((a, b) => {
            const dateA = convertTimestampToDate(a.created_at);
            const dateB = convertTimestampToDate(b.created_at);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 2);
        
        newQuizzes.forEach(quiz => {
          activitiesList.push({
            id: `quiz_${quiz.id}`,
            type: 'new_quiz',
            title: `Nowy quiz: ${quiz.title}`,
            date: convertTimestampToDate(quiz.created_at),
            description: `Dostępny nowy quiz z ${quiz.questions?.length || 0} pytaniami`,
            isActive: true
          });
        });
      }
      
      // 3. Pobierz aktywności użytkownika w tym kursie
      if (user) {
        try {
          const userActivitiesCollection = collection(db, 'user_activities');
          const userActivitiesQuery = query(
            userActivitiesCollection,
            where('user_id', '==', user.uid),
            where('course_id', '==', course.id)
          );
          const userActivitiesSnapshot = await getDocs(userActivitiesQuery);
          
          if (!userActivitiesSnapshot.empty) {
            const userActivity = userActivitiesSnapshot.docs[0].data();
            if (userActivity.last_accessed) {
              // Handle Firestore Timestamp
              let lastAccessDate;
              if (userActivity.last_accessed && typeof userActivity.last_accessed === 'object' && userActivity.last_accessed.toDate) {
                lastAccessDate = userActivity.last_accessed.toDate();
              } else {
                lastAccessDate = new Date(userActivity.last_accessed || 0);
              }
              
              activitiesList.push({
                id: 'user_last_access',
                type: 'user_activity',
                title: 'Ostatnie odwiedziny kursu',
                date: lastAccessDate,
                description: `Ostatni dostęp: ${lastAccessDate.toLocaleDateString('pl-PL')}`,
                isActive: true
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user activities:', error);
        }
      }
      
      // 4. Pobierz nadchodzące terminy jako aktywności (wywołamy po zdefiniowaniu funkcji)
      const upcomingDeadlines = getUpcomingDeadlines();
      upcomingDeadlines.slice(0, 2).forEach(deadline => {
        activitiesList.push({
          id: `deadline_${deadline.id}`,
          type: 'deadline',
          title: `Termin: ${deadline.title}`,
          date: deadline.deadline,
          description: `Termin upływa: ${new Date(deadline.deadline).toLocaleDateString('pl-PL')}`,
          isActive: true,
          isUrgent: deadline.isUrgent
        });
      });
      
      // Sortuj wszystkie aktywności po dacie
      activitiesList.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  }, [slug, course, user]); // Usunąłem sections i quizzes z zależności

  // Debug sections data
  useEffect(() => {
    console.log('[DEBUG] Sections state changed:', sections);
    console.log('[DEBUG] Section contents state:', sectionContents);
    console.log('[DEBUG] Materials count:', sections.filter(s => s.type === 'material').length);
    console.log('[DEBUG] Tasks count:', sections.filter(s => s.type === 'assignment').length);
    console.log('[DEBUG] Exams count:', sections.filter(s => s.type === 'form').length);
  }, [sections, sectionContents]);

  useEffect(() => {
    fetchCourseDetail();
  }, [fetchCourseDetail]);

  useEffect(() => {
    if (course) {
      fetchQuizzes();
    }
  }, [course, fetchQuizzes]);

  useEffect(() => {
    if (course) {
      fetchActivities();
    }
  }, [course, fetchActivities]);

  // Refresh activities when sections and quizzes are loaded
  useEffect(() => {
    if (course && activities.length > 0 && sections.length > 0 && quizzes.length > 0) {
      // Only refresh if we already have activities loaded
      fetchActivities();
    }
  }, [sections, quizzes]); // Nie dodaję fetchActivities do zależności

  // Save user activity
  useEffect(() => {
    if (!user || !course) return;
    
    const saveActivity = async () => {
      try {
        const activityRef = doc(db, 'user_activities', `${user.uid}_${course.id}`);
        await setDoc(activityRef, {
          user_id: user.uid,
          course_id: course.id,
          course_title: course.title,
          last_accessed: serverTimestamp(),
          access_count: 1
        }, { merge: true });
      } catch (e) {
        console.error('Nie udało się zapisać aktywności kursu', e);
      }
    };
    saveActivity();
  }, [user, course]);

  // Get real course statistics
  useEffect(() => {
    const getCourseStats = async () => {
      const totalStudents = course?.assignedUsers?.length || 0;
      const instructorName = course?.instructor_name || 'Brak informacji';
      
      // Pobierz rzeczywiste oceny kursu z Firestore
      let averageRating = 0;
      try {
        if (course?.id) {
          const ratingsCollection = collection(db, 'course_ratings');
          const ratingsQuery = query(ratingsCollection, where('course_id', '==', course.id));
          const ratingsSnapshot = await getDocs(ratingsQuery);
          
          if (!ratingsSnapshot.empty) {
            const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating || 0);
            const validRatings = ratings.filter(rating => rating > 0);
            
            if (validRatings.length > 0) {
              averageRating = Math.round((validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length) * 10) / 10;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching course ratings:', error);
        averageRating = 0;
      }
      
      // Jeśli brak ocen, pokaż domyślną wartość
      if (averageRating === 0) {
        averageRating = 0;
      }
      
      setCourseStats({ totalStudents, averageRating, instructorName });
    };
    getCourseStats();
  }, [course]);

  // Add course rating
  const addCourseRating = async (rating: number) => {
    if (!user || !course?.id) return;
    
    try {
      const ratingData = {
        course_id: course.id,
        user_id: user.uid,
        user_email: user.email,
        rating: rating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Zapisz ocenę do Firestore
      await addDoc(collection(db, 'course_ratings'), ratingData);
      
      // Odśwież statystyki kursu
      const getCourseStats = async () => {
        const totalStudents = course?.assignedUsers?.length || 0;
        const instructorName = course?.instructor_name || 'Brak informacji';
        
        let averageRating = 0;
        try {
          const ratingsCollection = collection(db, 'course_ratings');
          const ratingsQuery = query(ratingsCollection, where('course_id', '==', course.id));
          const ratingsSnapshot = await getDocs(ratingsQuery);
          
          if (!ratingsSnapshot.empty) {
            const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating || 0);
            const validRatings = ratings.filter(rating => rating > 0);
            
            if (validRatings.length > 0) {
              averageRating = Math.round((validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length) * 10) / 10;
            }
          }
        } catch (error) {
          console.error('Error fetching course ratings:', error);
        }
        
        setCourseStats({ totalStudents, averageRating, instructorName });
      };
      
      getCourseStats();
      
    } catch (error) {
      console.error('Error adding course rating:', error);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-2 sm:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
          <span className="ml-3 text-gray-600">Ładowanie kursu...</span>
        </div>
      </div>
    );
  }

  // Render course not found state
  if (error && error.includes('Nie znaleziono kursu')) {
    return <CourseNotFound />;
  }

  // Render error state
  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-2 sm:px-6">
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-2 sm:px-6">
        <div className="w-full max-w-5xl text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

  // Calculate course statistics
  const totalQuizzes = quizzes.length;
  const totalMaterials = sections.filter(s => s.type === 'material').length;
  const totalTasks = sections.filter(s => s.type === 'assignment').length;
  const totalExams = sections.filter(s => s.type === 'form').length;
  
  // Calculate real course progress based on completed items
  const calculateCourseProgress = () => {
    if (sections.length === 0) return 0;
    
    let completedItems = 0;
    let totalItems = 0;
    
    sections.forEach(section => {
      if (section.contents) {
        totalItems += section.contents.length;
        // Check if items are completed (you can add completion logic here)
        // For now, we'll use a simple calculation
      }
    });
    
    // Add quizzes to progress calculation
    totalItems += totalQuizzes;
    completedItems += completedQuizzes.length;
    
    if (totalItems === 0) return 0;
    return Math.round((completedItems / totalItems) * 100);
  };
  
  const courseProgress = calculateCourseProgress();
  
  const upcomingDeadlines = getUpcomingDeadlines();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button - positioned like in "Moje kursy" */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => window.location.href = '/homelogin/my-courses'}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do moich kursów
          </button>
        </div>
      </div>

      {/* Course Header - Blue background */}
      <div className="bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            {/* Left side - Course info */}
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">{course?.title || 'Tytuł kursu'}</h1>
              <p className="text-lg text-blue-100 mb-6">{course?.description || 'Opis kursu'}</p>
              
              {/* Instructor info */}
              <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="w-5 h-5" />
                <span className="text-blue-100">Nauczyciel: {course?.instructor_name || 'Brak informacji'}</span>
              </div>

              {/* Course progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-100 font-medium">Postęp kursu</span>
                  <span className="text-white font-bold">{courseProgress}%</span>
                </div>
                <div className="w-full bg-blue-200/30 rounded-full h-3">
                  <div 
                    className="bg-white h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${courseProgress}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Right side - Course Image */}
            <div className="lg:ml-8 mt-6 lg:mt-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 max-w-sm">
                {course?.thumbnail ? (
                  <div className="relative">
                    <img 
                      src={course.thumbnail} 
                      alt={`Zdjęcie kursu: ${course.title}`}
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-xl"></div>
        </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center relative overflow-hidden">
                    {/* Animated background elements */}
                    <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/10 rounded-full translate-x-8 translate-y-8"></div>
                    <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-white/10 rounded-full -translate-x-6 -translate-y-6"></div>
                    
                    {/* Course logo with initials */}
                    <div className="text-center z-10">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
                        <span className="text-2xl font-bold text-white">
                          {course?.title ? course.title.charAt(0).toUpperCase() : 'K'}
                        </span>
                      </div>
                      <p className="text-white/90 text-sm font-medium">Logo kursu</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Przegląd', icon: BookOpen },
              { id: 'quizzes', label: 'Quizy', icon: PenTool },
              { id: 'materials', label: 'Materiały', icon: FileText },
              { id: 'tasks', label: 'Zadania', icon: Calendar },
              { id: 'exams', label: 'Egzaminy', icon: GraduationCap },
              { id: 'activities', label: 'Aktywności', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'border-[#4067EC] text-[#4067EC] bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#4067EC]' : 'text-gray-500'}`} />
                  <span className={isActive ? 'text-[#4067EC]' : 'text-gray-500'}>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <PenTool className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalQuizzes}</div>
                <div className="text-sm text-gray-600">Quizy</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalMaterials}</div>
                <div className="text-sm text-gray-600">Materiały</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
                <div className="text-sm text-gray-600">Zadania</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalExams}</div>
                <div className="text-sm text-gray-600">Egzaminy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Latest Activities */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ostatnie aktywności</h3>
            {loadingActivities ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#4067EC] border-r-transparent"></div>
                <span className="ml-2 text-sm text-gray-500">Ładowanie aktywności...</span>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    activity.type === 'deadline' && activity.isUrgent ? 'bg-red-50 border border-red-200' :
                    activity.type === 'deadline' ? 'bg-orange-50 border border-orange-200' :
                    activity.type === 'course_update' ? 'bg-blue-50 border border-blue-200' :
                    activity.type === 'new_quiz' ? 'bg-green-50 border border-green-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'deadline' && activity.isUrgent ? 'bg-red-500' :
                        activity.type === 'deadline' ? 'bg-orange-500' :
                        activity.type === 'course_update' ? 'bg-blue-500' :
                        activity.type === 'new_quiz' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800 block">{activity.title}</span>
                        {activity.description && (
                          <span className="text-xs text-gray-600 block mt-1">{activity.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {activity.date instanceof Date ? 
                        activity.date.toLocaleDateString('pl-PL') : 
                        new Date(activity.date).toLocaleDateString('pl-PL')
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Brak aktywności do wyświetlenia
              </div>
            )}
          </div>

          {/* Right Column - Upcoming Deadlines */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nadchodzące terminy</h3>
            <div className="space-y-4">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    deadline.isUrgent ? 'bg-red-50' : 'bg-orange-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{deadline.title}</span>
                      {deadline.points > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          deadline.isUrgent 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {deadline.points} pkt
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      Termin: {new Date(deadline.deadline).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Brak nadchodzących terminów
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Przegląd kursu</h3>
            <p className="text-gray-600 mb-6">{course?.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-800 mb-4 text-lg">Informacje o kursie</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>Poziom:</strong> {course?.level}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>Kategoria:</strong> {course?.category_name}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>Nauczyciel:</strong> {course?.instructor_name}
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-4 text-lg">Statystyki</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>Liczba sekcji:</strong> {sections.length}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>Liczba quizów:</strong> {totalQuizzes}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>Postęp:</strong> {courseProgress}%
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Quizy</h3>
            {loadingQuizzes ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4067EC] border-r-transparent"></div>
                <span className="ml-3 text-gray-600">Ładowanie quizów...</span>
              </div>
            ) : quizError ? (
              <div className="bg-red-50 text-red-800 p-4 rounded-lg">{quizError}</div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Brak dostępnych quizów dla tego kursu.</div>
            ) : (
              <div className="space-y-6">
                {/* Quizy do rozwiązania */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Quizy do rozwiązania</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes
                      .filter(quiz => !completedQuizzes.includes(quiz.id))
                      .map(quiz => (
                        <div key={quiz.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-semibold text-lg text-gray-900">{quiz.title}</h5>
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
                              <span>
                                Próby: {quizAttempts[quiz.id] || 0} z {quiz.max_attempts || 1}
                                {quizAttempts[quiz.id] && quizAttempts[quiz.id] > 0 && (
                                  <span className="ml-1 text-blue-600 font-medium">
                                    (Pozostało: {Math.max(0, (quiz.max_attempts || 1) - (quizAttempts[quiz.id] || 0))})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                          <button 
                              onClick={() => {
                                console.log('[DEBUG] Navigating to quiz:', `/courses/${slug}/quiz/${quiz.id}`);
                                router.push(`/courses/${slug}/quiz/${quiz.id}`);
                              }}
                              className={`flex-1 py-3 px-4 rounded-lg transition-colors flex items-center justify-center ${
                              (quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1)
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'bg-[#4067EC] text-white hover:bg-[#3155d4]'
                            }`}
                            disabled={(quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1)}
                          >
                            {(quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1) ? (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                            
                            {/* Fallback Link */}
                            <Link 
                              href={`/courses/${slug}/quiz/${quiz.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex-1 py-3 px-4 rounded-lg transition-colors flex items-center justify-center border-2 border-[#4067EC] text-[#4067EC] hover:bg-[#4067EC] hover:text-white ${
                                (quizAttempts[quiz.id] || 0) >= (quiz.max_attempts || 1)
                                  ? 'opacity-50 cursor-not-allowed pointer-events-none'
                                  : ''
                              }`}
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Otwórz w nowej karcie
                            </Link>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Rozwiązane quizy */}
                {completedQuizzes.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Rozwiązane quizy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quizzes
                        .filter(quiz => completedQuizzes.includes(quiz.id))
                        .map(quiz => (
                          <div key={quiz.id} className="bg-green-50 border border-green-200 rounded-xl p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h5 className="font-semibold text-lg text-gray-900">{quiz.title}</h5>
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
                                <span>
                                  Wykorzystane próby: {quizAttempts[quiz.id] || 0} z {quiz.max_attempts || 1}
                                  {quizAttempts[quiz.id] && quizAttempts[quiz.id] > 1 && (
                                    <span className="ml-1 text-orange-600 font-medium">
                                      (Ostatnia próba była najlepsza)
                                    </span>
                                  )}
                                </span>
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
        )}

        {activeTab === 'materials' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Materiały</h3>
            {sections.length > 0 ? (
              <div className="space-y-6">
                {sections
                  .filter(section => section.type === 'material')
                  .map(section => (
                    <div key={section.id} className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">{section.name}</h4>
                      <div className="space-y-3">
                                                {sectionContents[section.id]?.map((item: Content) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            
                            {/* Header z ikoną i tytułem */}
                            <div className="flex items-center gap-3 p-4">
                              {item.fileUrl && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                              {item.link && !item.text && !item.type?.includes('video') && !item.link.includes('youtube') && <FaLink className="text-2xl text-[#4067EC]" />}
                              {item.text && !item.link && <span className="text-2xl text-[#4067EC]">📝</span>}
                              {(item.type?.includes('video') || item.link?.includes('youtube')) && <span className="text-2xl text-[#4067EC]">🎥</span>}
                              <span className="font-medium flex-1">{item.name || 'Materiał'}</span>
                              {item.fileUrl && (
                                <a href={item.fileUrl} target="_blank" rel="noopener" className="text-[#4067EC] underline">
                                  Pobierz
                                </a>
                              )}
                              {item.link && !item.text && !item.type?.includes('video') && !item.link.includes('youtube') && (
                                <a href={item.link} target="_blank" rel="noopener" className="text-[#4067EC] underline">
                                  Otwórz link
                                </a>
                              )}
                            </div>
                            
                            {/* YouTube Video Player */}
                            {(item.type?.includes('video') || item.link?.includes('youtube')) && (
                              <div className="px-4 pb-4">
                                <YouTubePlayer 
                                  youtubeUrl={item.link || ''} 
                                  title={item.name || 'Film YouTube'}
                                  className="w-full aspect-video"
                                />
                              </div>
                            )}
                            
                            {/* Text Content */}
                            {item.text && !item.link && (
                              <div className="px-4 pb-4">
                                <div className="bg-gray-50 p-3 rounded border">
                                  <div className="text-sm text-gray-600 mb-2">Treść:</div>
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
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Brak dostępnych materiałów. 
                <div className="text-xs text-gray-400 mt-2">
                  Liczba sekcji: {sections.length}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Zadania</h3>
        {sections.length > 0 ? (
              <div className="space-y-6">
                {sections
                  .filter(section => section.type === 'assignment')
                  .map(section => (
                    <div key={section.id} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">{section.name}</h4>
                        {section.deadline && (
                          <span className="text-sm text-gray-600">
                      Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                    </span>
                  )}
              </div>
                      <div className="space-y-3">
                        {sectionContents[section.id]?.map((item: Content) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Header z ikoną i tytułem */}
                            <div className="flex items-center gap-3 p-4">
                              {item.fileUrl && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                              {item.link && !item.text && !item.type?.includes('video') && !item.link.includes('youtube') && <FaLink className="text-2xl text-[#4067EC]" />}
                              {item.text && !item.link && <span className="text-2xl text-[#4067EC]">📝</span>}
                              {(item.type?.includes('video') || item.link?.includes('youtube')) && <span className="text-2xl text-[#4067EC]">🎥</span>}
                              <span className="font-medium flex-1">{item.name || 'Zadanie'}</span>
                              {item.fileUrl && (
                                <a href={item.fileUrl} target="_blank" rel="noopener" className="text-[#4067EC] underline">
                                  Pobierz
                                </a>
                              )}
                              {item.link && !item.text && !item.type?.includes('video') && !item.link.includes('youtube') && (
                                <a href={item.link} target="_blank" rel="noopener" className="text-[#4067EC] underline">
                                  Otwórz link
                                </a>
                              )}
                            </div>
                            
                            {/* YouTube Video Player */}
                            {(item.type?.includes('video') || item.link?.includes('youtube')) && (
                              <div className="px-4 pb-4">
                                <YouTubePlayer 
                                  youtubeUrl={item.link || ''} 
                                  title={item.name || 'Film YouTube'}
                                  className="w-full aspect-video"
                                />
                              </div>
                            )}
                            
                            {/* Text Content */}
                            {item.text && !item.link && (
                              <div className="px-4 pb-4">
                                <div className="bg-gray-50 p-3 rounded border">
                                  <div className="text-sm text-gray-600 mb-2">Treść zadania:</div>
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
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Brak dostępnych zadań.</div>
            )}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Egzaminy</h3>
            {sections.length > 0 ? (
              <div className="space-y-6">
                {sections
                  .filter(section => section.type === 'form')
                  .map(section => (
                    <div key={section.id} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">{section.name}</h4>
                        {section.deadline && (
                          <span className="text-sm text-gray-600">
                            Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                  {sectionContents[section.id]?.map((item: Content) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Header z ikoną i tytułem */}
                            <div className="flex items-center gap-3 p-4">
                              {item.fileUrl && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                              {item.link && !item.text && !item.type?.includes('video') && !item.link.includes('youtube') && <FaLink className="text-2xl text-[#4067EC]" />}
                              {item.text && !item.link && <span className="text-2xl text-[#4067EC]">📝</span>}
                              {(item.type?.includes('video') || item.link?.includes('youtube')) && <span className="text-2xl text-[#4067EC]">🎥</span>}
                              <span className="font-medium flex-1">{item.name || 'Egzamin'}</span>
                              {item.fileUrl && (
                                <a href={item.fileUrl} target="_blank" rel="noopener" className="text-[#4067EC] underline">
                                  Pobierz
                                </a>
                              )}
                              {item.link && !item.text && !item.type?.includes('video') && !item.link.includes('youtube') && (
                                <a href={item.link} target="_blank" rel="noopener" className="text-[#4067EC] underline">
                                  Otwórz link
                                </a>
                              )}
                            </div>
                            
                            {/* YouTube Video Player */}
                            {(item.type?.includes('video') || item.link?.includes('youtube')) && (
                              <div className="px-4 pb-4">
                                <YouTubePlayer 
                                  youtubeUrl={item.link || ''} 
                                  title={item.name || 'Film YouTube'}
                                  className="w-full aspect-video"
                                />
                              </div>
                            )}
                            
                            {/* Text Content */}
                            {item.text && !item.link && (
                              <div className="px-4 pb-4">
                                <div className="bg-gray-50 p-3 rounded border">
                                  <div className="text-sm text-gray-600 mb-2">Treść egzaminu:</div>
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
                              </div>
                            )}
                          </div>
                        ))}
                        </div>
                    </div>
                  ))}
                </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Brak dostępnych egzaminów.</div>
              )}
            </div>
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Aktywności</h3>
            {loadingActivities ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4067EC] border-r-transparent"></div>
                <span className="ml-3 text-gray-500">Ładowanie aktywności...</span>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                    activity.type === 'deadline' && activity.isUrgent ? 'bg-red-50 border-red-200' :
                    activity.type === 'deadline' ? 'bg-orange-50 border-orange-200' :
                    activity.type === 'course_update' ? 'bg-blue-50 border-blue-200' :
                    activity.type === 'new_quiz' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${
                        activity.type === 'deadline' && activity.isUrgent ? 'bg-red-500' :
                        activity.type === 'deadline' ? 'bg-orange-500' :
                        activity.type === 'course_update' ? 'bg-blue-500' :
                        activity.type === 'new_quiz' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800 block">{activity.title}</span>
                        {activity.description && (
                          <span className="text-xs text-gray-600 block mt-1">{activity.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-3">
                      {activity.date instanceof Date ? 
                        activity.date.toLocaleDateString('pl-PL') : 
                        new Date(activity.date).toLocaleDateString('pl-PL')
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Brak aktywności do wyświetlenia
          </div>
        )}
      </div>
        )}
      </div>
    </div>
  );
} 