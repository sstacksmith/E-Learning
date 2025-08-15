'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Clock, CheckCircle, XCircle, BarChart3, Calendar, User, Book } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  completed: boolean;
  lastViewed?: string;
  timeSpent?: number;
  score?: number;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

interface CourseDetails {
  id: string;
  title: string;
  description: string;
  teacher: {
    name: string;
    email: string;
  };
  modules: Module[];
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  totalTimeSpent: number;
  lastAccessed?: string;
  averageScore?: number;
}

interface AssignedStudent {
  id: string;
  name: string;
  email: string;
}

export default function ParentCourseDetails() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [assignedStudent, setAssignedStudent] = useState<AssignedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonFilter, setLessonFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');

  const fetchCourseDetails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Fetching course details for:', courseId);

      // 1. Znajdź przypisanego ucznia
      const parentStudentsRef = collection(db, 'parent_students');
      const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
      const parentStudentsSnapshot = await getDocs(parentStudentsQuery);

      if (parentStudentsSnapshot.empty) {
        setError('Nie masz przypisanego żadnego ucznia.');
        setLoading(false);
        return;
      }

      const studentId = parentStudentsSnapshot.docs[0].data().student;

      // 2. Pobierz dane ucznia
      const usersRef = collection(db, 'users');
      const studentQuery = query(usersRef, where('uid', '==', studentId));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        setError('Nie znaleziono danych ucznia.');
        setLoading(false);
        return;
      }

      const studentData = studentSnapshot.docs[0].data();
      setAssignedStudent({
        id: studentId,
        name: studentData.displayName || studentData.email || 'Nieznany uczeń',
        email: studentData.email || ''
      });

      // 3. Pobierz szczegóły kursu
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      if (!courseDoc.exists()) {
        setError('Nie znaleziono kursu.');
        setLoading(false);
        return;
      }

      const courseData = courseDoc.data();

      // 4. Sprawdź czy uczeń jest przypisany do kursu
      const assignedUsers = courseData.assignedUsers || [];
      if (!assignedUsers.includes(studentId) && !assignedUsers.includes(studentData.email)) {
        setError('Uczeń nie jest przypisany do tego kursu.');
        setLoading(false);
        return;
      }

      // 5. Pobierz dane nauczyciela
      let teacherData = {};
      if (courseData.teacher) {
        const teacherQuery = query(usersRef, where('uid', '==', courseData.teacher));
        const teacherSnapshot = await getDocs(teacherQuery);
        if (!teacherSnapshot.empty) {
          teacherData = teacherSnapshot.docs[0].data();
        }
      }

      // 6. Pobierz moduły i lekcje kursu - sprawdzenie różnych struktur danych
      console.log('Fetching modules for course:', courseId);
      
      // Próbuj znaleźć moduły - sprawdź różne warianty nazw pól
      const modulesRef = collection(db, 'modules');
      let modulesQuery = query(modulesRef, where('courseId', '==', courseId));
      let modulesSnapshot = await getDocs(modulesQuery);
      
      // Jeśli nie ma wyników, spróbuj course_id
      if (modulesSnapshot.empty) {
        modulesQuery = query(modulesRef, where('course_id', '==', courseId));
        modulesSnapshot = await getDocs(modulesQuery);
      }
      
      // Jeśli nadal brak, spróbuj course
      if (modulesSnapshot.empty) {
        modulesQuery = query(modulesRef, where('course', '==', courseId));
        modulesSnapshot = await getDocs(modulesQuery);
      }

      console.log('Modules found:', modulesSnapshot.docs.length);

      const modules: Module[] = [];
      let totalLessons = 0;
      let completedLessons = 0;
      let totalTimeSpent = 0;
      let totalScore = 0;
      let scoresCount = 0;

      // Pobierz wszystkie lekcje i postęp dla tego kursu jednocześnie dla lepszej wydajności
      const allLessonsRef = collection(db, 'lessons');
      const allLessonsSnapshot = await getDocs(allLessonsRef);
      
      const allProgressRef = collection(db, 'progress');
      let allProgressQuery = query(allProgressRef, where('studentId', '==', studentId));
      let allProgressSnapshot = await getDocs(allProgressQuery);
      
      // Pobierz również dodatkowe dane czasowe z user_learning_time
      const learningTimeRef = collection(db, 'user_learning_time');
      let learningTimeQuery = query(learningTimeRef, where('userId', '==', studentId));
      let learningTimeSnapshot = await getDocs(learningTimeQuery);
      
      // Jeśli nie ma wyników, spróbuj user_id
      if (learningTimeSnapshot.empty) {
        learningTimeQuery = query(learningTimeRef, where('user_id', '==', studentId));
        learningTimeSnapshot = await getDocs(learningTimeQuery);
      }
      
      console.log('Learning time records found:', learningTimeSnapshot.docs.length);
      
      // Jeśli nie ma wyników, spróbuj user_id
      if (allProgressSnapshot.empty) {
        allProgressQuery = query(allProgressRef, where('user_id', '==', studentId));
        allProgressSnapshot = await getDocs(allProgressQuery);
      }
      
      // Jeśli nadal brak, spróbuj userId
      if (allProgressSnapshot.empty) {
        allProgressQuery = query(allProgressRef, where('userId', '==', studentId));
        allProgressSnapshot = await getDocs(allProgressQuery);
      }
      
      console.log('Total progress records found:', allProgressSnapshot.docs.length);
      
      // Stwórz mapę postępu dla szybkiego dostępu
      const progressMap = new Map();
      allProgressSnapshot.docs.forEach(doc => {
        const progressData = doc.data();
        const lessonId = progressData.lessonId || progressData.lesson_id || progressData.lesson;
        if (lessonId) {
          progressMap.set(lessonId, progressData);
        }
      });
      
      // Oblicz dodatkowy czas z learning_time dla tego kursu
      let additionalTimeSpent = 0;
      learningTimeSnapshot.docs.forEach(doc => {
        const timeData = doc.data();
        const courseIdFromTime = timeData.courseId || timeData.course_id || timeData.course;
        if (courseIdFromTime === courseId) {
          additionalTimeSpent += timeData.time_spent_minutes || timeData.timeSpent || 0;
        }
      });
      
      console.log('Additional time spent from learning_time collection:', additionalTimeSpent, 'minutes');

      for (const moduleDoc of modulesSnapshot.docs) {
        const moduleData = moduleDoc.data();
        
        // Znajdź lekcje należące do tego modułu
        const moduleLessons = allLessonsSnapshot.docs.filter(lessonDoc => {
          const lessonData = lessonDoc.data();
          return lessonData.moduleId === moduleDoc.id || 
                 lessonData.module_id === moduleDoc.id || 
                 lessonData.module === moduleDoc.id;
        });

        console.log(`Module "${moduleData.title}" has ${moduleLessons.length} lessons`);

        const lessons: Lesson[] = [];

        for (const lessonDoc of moduleLessons) {
          const lessonData = lessonDoc.data();
          totalLessons++;

          // Pobierz postęp ucznia dla tej lekcji z mapy
          const progressData = progressMap.get(lessonDoc.id);
          
          let completed = false;
          let timeSpent = 0;
          let score: number | undefined = undefined;
          let lastViewed: string | undefined = undefined;

          if (progressData) {
            completed = progressData.completed || false;
            timeSpent = progressData.timeSpent || progressData.time_spent || progressData.time_spent_minutes || 0;
            score = progressData.score;
            lastViewed = progressData.lastViewed || progressData.last_viewed;
            
            console.log(`Lesson "${lessonData.title}": completed=${completed}, timeSpent=${timeSpent}min`);

            if (completed) completedLessons++;
            totalTimeSpent += timeSpent;
            if (score !== undefined && score !== null) {
              totalScore += score;
              scoresCount++;
            }
          } else {
            console.log(`No progress found for lesson: ${lessonData.title}`);
          }

          lessons.push({
            id: lessonDoc.id,
            title: lessonData.title || 'Bez nazwy',
            description: lessonData.description,
            duration: lessonData.duration || lessonData.duration_minutes,
            completed,
            lastViewed,
            timeSpent,
            score
          });
        }

        modules.push({
          id: moduleDoc.id,
          title: moduleData.title || 'Bez nazwy',
          description: moduleData.description,
          lessons
        });
      }

      // 7. Pobierz oceny z kursów dla tego ucznia aby obliczyć średnią
      console.log('Fetching grades for student in course context...');
      const gradesRef = collection(db, 'grades');
      let gradesQuery = query(gradesRef, where('studentId', '==', studentId));
      let gradesSnapshot = await getDocs(gradesQuery);
      
      // Jeśli nie ma wyników, spróbuj inne warianty
      if (gradesSnapshot.empty) {
        gradesQuery = query(gradesRef, where('user_id', '==', studentId));
        gradesSnapshot = await getDocs(gradesQuery);
      }
      
      if (gradesSnapshot.empty) {
        gradesQuery = query(gradesRef, where('student', '==', studentId));
        gradesSnapshot = await getDocs(gradesQuery);
      }
      
      console.log('Grades found for student:', gradesSnapshot.docs.length);
      
      // Filtruj oceny związane z tym kursem (jeśli mają course_id)
      const courseGrades = gradesSnapshot.docs.filter(doc => {
        const gradeData = doc.data();
        return gradeData.course_id === courseId || gradeData.courseId === courseId || gradeData.course === courseId;
      });
      
      console.log('Course-specific grades found:', courseGrades.length);
      
      // Jeśli są oceny z kursu, dodaj je do średniej
      if (courseGrades.length > 0) {
        courseGrades.forEach(doc => {
          const gradeData = doc.data();
          const gradeValue = gradeData.value || gradeData.grade;
          if (gradeValue !== undefined && gradeValue !== null) {
            totalScore += parseFloat(gradeValue);
            scoresCount++;
          }
        });
      }
      
      // 8. Jeśli nie ma żadnych danych, pokaż informację
      if (modules.length === 0) {
        console.log('No modules found in Firebase for course:', courseId);
        
        // Utwórz pustą strukturę pokazującą że nie ma danych
        modules.push({
          id: 'no-data',
          title: 'Brak danych modułów',
          description: 'Ten kurs nie ma jeszcze utworzonych modułów w systemie.',
          lessons: [{
            id: 'no-lessons',
            title: 'Brak lekcji',
            description: 'Ten kurs nie ma jeszcze lekcji. Skontaktuj się z nauczycielem.',
            completed: false,
            timeSpent: 0
          }]
        });
        
        totalLessons = 1;
        completedLessons = 0;
        totalTimeSpent = 0;
      }

      // Dodaj dodatkowy czas z learning_time do całkowitego czasu
      totalTimeSpent += additionalTimeSpent;
      
      const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      const averageScore = scoresCount > 0 ? totalScore / scoresCount : undefined;
      
      // Znajdź ostatnią aktywność
      const allLessonsWithViews = modules.flatMap(m => m.lessons).filter(l => l.lastViewed);
      const lastAccessed = allLessonsWithViews.length > 0 ? 
        allLessonsWithViews.sort((a, b) => 
          new Date(b.lastViewed!).getTime() - new Date(a.lastViewed!).getTime()
        )[0].lastViewed : undefined;

      console.log('Final statistics:', {
        totalLessons,
        completedLessons,
        progressPercentage: Math.round(progressPercentage),
        totalTimeSpent,
        averageScore: averageScore ? Math.round(averageScore) : undefined,
        lastAccessed
      });

      setCourseDetails({
        id: courseId,
        title: courseData.title || 'Bez nazwy',
        description: courseData.description || 'Brak opisu',
        teacher: {
          name: (teacherData as any).displayName || (teacherData as any).email || 'Nieznany nauczyciel',
          email: (teacherData as any).email || ''
        },
        modules,
        totalLessons,
        completedLessons,
        progressPercentage,
        totalTimeSpent,
        averageScore,
        lastAccessed
      });

    } catch (err) {
      console.error('Error fetching course details:', err);
      setError('Wystąpił błąd podczas pobierania szczegółów kursu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && courseId) {
      fetchCourseDetails();
    }
  }, [user, courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4067EC]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wystąpił problem</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Wróć
          </button>
        </div>
      </div>
    );
  }

  if (!courseDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Brak danych kursu</p>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{courseDetails.title}</h1>
          <p className="text-gray-600">
            Postęp {assignedStudent?.name || 'ucznia'} w kursie
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Postęp</p>
              <p className="text-lg font-semibold text-gray-900">
                {Math.round(courseDetails.progressPercentage)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Ukończone</p>
              <p className="text-lg font-semibold text-gray-900">
                {courseDetails.completedLessons}/{courseDetails.totalLessons}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Czas nauki</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(courseDetails.totalTimeSpent)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <User className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Śr. ocena</p>
              <p className="text-lg font-semibold text-gray-900">
                {courseDetails.averageScore ? 
                  (courseDetails.averageScore <= 6 ? 
                    `${courseDetails.averageScore.toFixed(1)}` : 
                    `${(courseDetails.averageScore / 20).toFixed(1)}`
                  ) : 'Brak'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Course Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacje o kursie</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Opis kursu</p>
            <p className="text-gray-900">{courseDetails.description}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Nauczyciel</p>
            <p className="text-gray-900">{courseDetails.teacher.name}</p>
            <p className="text-sm text-gray-500">{courseDetails.teacher.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Aktywność ucznia</p>
            <div className="space-y-1">
              <p className="text-sm text-gray-900">
                Najbardziej aktywny: {(() => {
                  const allLessons = courseDetails.modules.flatMap(m => m.lessons);
                  const maxTime = Math.max(...allLessons.map(l => l.timeSpent || 0));
                  if (maxTime > 0) {
                    const mostActiveLesson = allLessons.find(l => (l.timeSpent || 0) === maxTime);
                    return mostActiveLesson ? 
                      `${mostActiveLesson.title.substring(0, 25)}${mostActiveLesson.title.length > 25 ? '...' : ''} (${formatTime(maxTime)})` 
                      : 'Brak aktywności';
                  }
                  return 'Brak aktywności';
                })()}
              </p>
              <p className="text-sm text-gray-500">
                Ostatnia aktywność: {courseDetails.lastAccessed ? 
                  new Date(courseDetails.lastAccessed).toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Brak'}
              </p>
              <p className="text-sm text-gray-500">
                Całkowity czas: {formatTime(courseDetails.totalTimeSpent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ogólny postęp</h2>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${courseDetails.progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {courseDetails.completedLessons} z {courseDetails.totalLessons} lekcji ukończonych 
          ({Math.round(courseDetails.progressPercentage)}%)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setLessonFilter('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              lessonFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Wszystkie ({courseDetails.totalLessons})
          </button>
          <button 
            onClick={() => setLessonFilter('completed')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              lessonFilter === 'completed' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ukończone ({courseDetails.completedLessons})
          </button>
          <button 
            onClick={() => setLessonFilter('in_progress')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              lessonFilter === 'in_progress' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            W trakcie ({courseDetails.modules.flatMap(m => m.lessons).filter(l => !l.completed && (l.timeSpent || 0) > 0).length})
          </button>
          <button 
            onClick={() => setLessonFilter('not_started')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              lessonFilter === 'not_started' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Nierozpoczęte ({courseDetails.modules.flatMap(m => m.lessons).filter(l => !l.completed && (l.timeSpent || 0) === 0).length})
          </button>
        </div>
      </div>

      {/* Modules and Lessons */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Szczegółowy postęp</h2>
        
        {courseDetails.modules.map((module) => {
          // Filtruj lekcje na podstawie aktualnego filtra
          const filteredLessons = module.lessons.filter(lesson => {
            switch (lessonFilter) {
              case 'completed':
                return lesson.completed;
              case 'in_progress':
                return !lesson.completed && (lesson.timeSpent || 0) > 0;
              case 'not_started':
                return !lesson.completed && (lesson.timeSpent || 0) === 0;
              default:
                return true; // 'all'
            }
          });

          // Jeśli nie ma lekcji do pokazania w tym module, pomiń go
          if (filteredLessons.length === 0) {
            return null;
          }

          return (
          <div key={module.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Module Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{module.title}</h3>
              {module.description && (
                <p className="text-sm text-gray-600 mt-1">{module.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>
                  {module.lessons.filter(l => l.completed).length}/{module.lessons.length} lekcji
                  {filteredLessons.length !== module.lessons.length && 
                    ` (pokazano ${filteredLessons.length})`
                  }
                </span>
                <span>
                  {formatTime(module.lessons.reduce((sum, l) => sum + (l.timeSpent || 0), 0))} czasu
                </span>
              </div>
            </div>

            {/* Lessons */}
            <div className="divide-y divide-gray-200">
              {filteredLessons.map((lesson) => (
                <div 
                  key={lesson.id} 
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedLesson(lesson);
                    setShowLessonModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {lesson.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {lesson.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(lesson.duration)}
                            </span>
                          )}
                          
                          {lesson.timeSpent !== undefined && lesson.timeSpent > 0 && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              Spędzono: {formatTime(lesson.timeSpent)}
                            </span>
                          )}
                          
                          {lesson.score !== undefined && (
                            <span className="flex items-center gap-1">
                              <Book className="w-3 h-3" />
                              Wynik: {lesson.score}%
                            </span>
                          )}
                          
                          {lesson.lastViewed && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(lesson.lastViewed)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {lesson.completed ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ukończona
                        </span>
                      ) : lesson.timeSpent && lesson.timeSpent > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          W trakcie
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Nierozpoczęta
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        }).filter(Boolean)}
      </div>

      {/* Lesson Details Modal */}
      {showLessonModal && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedLesson.title}</h3>
                <button 
                  onClick={() => setShowLessonModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Lesson Status */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  {selectedLesson.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-300" />
                  )}
                  <span className={`font-medium ${
                    selectedLesson.completed ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {selectedLesson.completed ? 'Ukończona' : 'Nieukończona'}
                  </span>
                </div>
                
                {selectedLesson.score !== undefined && (
                  <div className="flex items-center gap-2">
                    <Book className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-blue-700">
                      Wynik: {selectedLesson.score}%
                    </span>
                  </div>
                )}
              </div>

              {/* Lesson Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informacje o lekcji</h4>
                  <div className="space-y-3">
                    {selectedLesson.description && (
                      <div>
                        <p className="text-sm text-gray-600">Opis</p>
                        <p className="text-gray-900">{selectedLesson.description}</p>
                      </div>
                    )}
                    
                    {selectedLesson.duration && (
                      <div>
                        <p className="text-sm text-gray-600">Planowany czas</p>
                        <p className="text-gray-900">{formatTime(selectedLesson.duration)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Aktywność ucznia</h4>
                  <div className="space-y-3">
                    {selectedLesson.timeSpent !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Czas spędzony</p>
                        <p className="text-gray-900">{formatTime(selectedLesson.timeSpent)}</p>
                        {selectedLesson.duration && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min((selectedLesson.timeSpent / selectedLesson.duration) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedLesson.lastViewed && (
                      <div>
                        <p className="text-sm text-gray-600">Ostatnio oglądana</p>
                        <p className="text-gray-900">{formatDate(selectedLesson.lastViewed)}</p>
                      </div>
                    )}

                    {selectedLesson.completed && (
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Ukończona
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              {selectedLesson.duration && selectedLesson.timeSpent !== undefined && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Postęp w lekcji</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Postęp czasowy</span>
                      <span className="font-medium text-gray-900">
                        {Math.round((selectedLesson.timeSpent / selectedLesson.duration) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((selectedLesson.timeSpent / selectedLesson.duration) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatTime(selectedLesson.timeSpent)} z {formatTime(selectedLesson.duration)} 
                      {selectedLesson.timeSpent > selectedLesson.duration && ' (przekroczono planowany czas)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
