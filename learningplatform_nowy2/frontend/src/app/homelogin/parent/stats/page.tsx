'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Award,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}

interface SubjectProgress {
  subject: string;
  progress: number;
  color: string;
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  averageScore?: number;
}

interface Achievement {
  title: string;
  description: string;
  date: string;
  icon: string;
}

export default function ParentStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedStudent, setAssignedStudent] = useState<{ id: string; name: string; email: string } | null>(null);
  const [realStatCards, setRealStatCards] = useState<StatCard[]>([]);
  const [realSubjectProgress, setRealSubjectProgress] = useState<SubjectProgress[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRealStatistics();
  }, [user]);

  const fetchRealStatistics = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');

      // 1. Znajdź przypisanego ucznia
      console.log('Fetching assigned student for parent:', user.uid);
      const parentStudentsRef = collection(db, 'parent_students');
      const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
      const parentStudentsSnapshot = await getDocs(parentStudentsQuery);
      
      if (parentStudentsSnapshot.empty) {
        setError('Nie masz przypisanego żadnego ucznia.');
        setLoading(false);
        return;
      }

      const studentId = parentStudentsSnapshot.docs[0].data().student;
      console.log('Found assigned student:', studentId);

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

      // 3. Pobierz kursy przypisane do ucznia
      console.log('Fetching courses for student:', studentId);
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      const studentCourses = [];

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const isAssignedByUID = courseData.assignedUsers && courseData.assignedUsers.includes(studentId);
        const isAssignedByEmail = courseData.assignedUsers && courseData.assignedUsers.includes(studentData.email);

        if (isAssignedByUID || isAssignedByEmail) {
          studentCourses.push({
            id: courseDoc.id,
            ...courseData
          });
        }
      }

      console.log('Found courses for student:', studentCourses.length);

      // 4. Dla każdego kursu, oblicz statystyki
      const courseProgressData = [];
      let totalLessonsOverall = 0;
      let totalCompletedOverall = 0;
      let totalGradesSum = 0;
      let totalGradesCount = 0;

      for (const course of studentCourses) {
        const courseStats = await calculateCourseStatistics(studentId, course.id);
        courseProgressData.push({
          courseId: course.id,
          subject: (course as any).title || 'Nieznany kurs',
          progress: courseStats.progressPercentage,
          color: getRandomColor(courseProgressData.length),
          totalLessons: courseStats.totalLessons,
          completedLessons: courseStats.completedLessons,
          averageScore: courseStats.averageScore
        });

        // Sumuj ogólne statystyki
        totalLessonsOverall += courseStats.totalLessons;
        totalCompletedOverall += courseStats.completedLessons;
        
        if (courseStats.averageScore !== undefined && courseStats.averageScore !== null) {
          totalGradesSum += courseStats.averageScore;
          totalGradesCount++;
        }
      }

      // 5. Oblicz ogólne statystyki
      const overallAverage = totalGradesCount > 0 ? totalGradesSum / totalGradesCount : 0;
      const progressPercentage = totalLessonsOverall > 0 ? (totalCompletedOverall / totalLessonsOverall) * 100 : 0;

      // 6. Utwórz karty statystyk
      const statCards: StatCard[] = [
        {
          title: "Średnia Ogólna",
          value: overallAverage > 0 ? overallAverage.toFixed(2) : "Brak",
          description: totalGradesCount > 0 ? `z ${totalGradesCount} kursów` : "Brak ocen",
          icon: GraduationCap,
          trend: overallAverage > 4 ? "up" : undefined
        },
        {
          title: "Ukończone Lekcje",
          value: totalCompletedOverall.toString(),
          description: `z ${totalLessonsOverall} zaplanowanych`,
          icon: BookOpen,
        },
        {
          title: "Postęp Ogólny",
          value: `${Math.round(progressPercentage)}%`,
          description: `średnio we wszystkich kursach`,
          icon: TrendingUp,
        },
        {
          title: "Aktywne Kursy",
          value: studentCourses.length.toString(),
          description: "przypisanych kursów",
          icon: Award,
        },
      ];

      setRealStatCards(statCards);
      setRealSubjectProgress(courseProgressData);

    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Wystąpił błąd podczas pobierania statystyk.');
    } finally {
      setLoading(false);
    }
  };

  const calculateCourseStatistics = async (studentId: string, courseId: string) => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');

      // Pobierz moduły kursu
      const modulesRef = collection(db, 'modules');
      let modulesQuery = query(modulesRef, where('courseId', '==', courseId));
      let modulesSnapshot = await getDocs(modulesQuery);
      
      if (modulesSnapshot.empty) {
        modulesQuery = query(modulesRef, where('course_id', '==', courseId));
        modulesSnapshot = await getDocs(modulesQuery);
      }

      // Pobierz wszystkie lekcje dla tych modułów
      const allLessonsRef = collection(db, 'lessons');
      const allLessonsSnapshot = await getDocs(allLessonsRef);
      const courseLessons = allLessonsSnapshot.docs.filter(lessonDoc => {
        const lessonData = lessonDoc.data();
        return modulesSnapshot.docs.some(moduleDoc => 
          lessonData.moduleId === moduleDoc.id || 
          lessonData.module_id === moduleDoc.id || 
          lessonData.module === moduleDoc.id
        );
      });

      // Pobierz postęp ucznia
      const progressRef = collection(db, 'progress');
      let progressQuery = query(progressRef, where('studentId', '==', studentId));
      let progressSnapshot = await getDocs(progressQuery);
      
      if (progressSnapshot.empty) {
        progressQuery = query(progressRef, where('user_id', '==', studentId));
        progressSnapshot = await getDocs(progressQuery);
      }

      const progressMap = new Map();
      progressSnapshot.docs.forEach(doc => {
        const progressData = doc.data();
        const lessonId = progressData.lessonId || progressData.lesson_id || progressData.lesson;
        if (lessonId) {
          progressMap.set(lessonId, progressData);
        }
      });

      // Oblicz statystyki
      const totalLessons = courseLessons.length;
      let completedLessons = 0;
      let totalTimeSpent = 0;

      courseLessons.forEach(lessonDoc => {
        const progressData = progressMap.get(lessonDoc.id);
        if (progressData) {
          if (progressData.completed) completedLessons++;
          totalTimeSpent += progressData.timeSpent || progressData.time_spent || 0;
        }
      });

      // Pobierz oceny z kursu
      const gradesRef = collection(db, 'grades');
      let gradesQuery = query(gradesRef, where('studentId', '==', studentId));
      let gradesSnapshot = await getDocs(gradesQuery);
      
      if (gradesSnapshot.empty) {
        gradesQuery = query(gradesRef, where('user_id', '==', studentId));
        gradesSnapshot = await getDocs(gradesQuery);
      }

      const courseGrades = gradesSnapshot.docs.filter(doc => {
        const gradeData = doc.data();
        return gradeData.course_id === courseId || gradeData.courseId === courseId;
      });

      let averageScore = undefined;
      if (courseGrades.length > 0) {
        const gradesSum = courseGrades.reduce((sum, doc) => {
          const gradeData = doc.data();
          const value = gradeData.value || gradeData.grade || 0;
          return sum + parseFloat(value);
        }, 0);
        averageScore = gradesSum / courseGrades.length;
      }

      const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      return {
        totalLessons,
        completedLessons,
        progressPercentage: Math.round(progressPercentage),
        totalTimeSpent,
        averageScore
      };

    } catch (error) {
      console.error('Error calculating course statistics:', error);
      return {
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: 0,
        totalTimeSpent: 0,
        averageScore: undefined
      };
    }
  };

  const getRandomColor = (index: number) => {
    const colors = [
      'bg-green-500',
      'bg-blue-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-gray-500'
    ];
    return colors[index % colors.length];
  };

  // Używamy rzeczywistych danych zamiast mock data
  const statCards = realStatCards;
  const subjectProgress = realSubjectProgress;

  const achievements: Achievement[] = [
    {
      title: "Mistrz Matematyki",
      description: "Za rozwiązanie 50 zadań z algebry",
      date: "14.01.2024",
      icon: "🏆",
    },
    {
      title: "Ekspert Gramatyki",
      description: "Za bezbłędne wypracowanie",
      date: "12.01.2024",
      icon: "📝",
    },
    {
      title: "Poliglota",
      description: "Za ukończenie poziomu B1 z angielskiego",
      date: "10.01.2024",
      icon: "🌍",
    },
    {
      title: "Badacz Przyrody",
      description: "Za projekt o ekosystemach",
      date: "08.01.2024",
      icon: "🔬",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Błąd</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <div className="flex gap-4">
            <button 
              onClick={fetchRealStatistics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Spróbuj ponownie
            </button>
            <button 
              onClick={() => window.location.href = '/homelogin'}
              className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do strony głównej
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            Statystyki i Postępy
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Statystyki i Postępy</h2>
            <p className="text-gray-600 mb-6">
              {assignedStudent ? 
                `Analiza postępów w nauce ${assignedStudent.name}` : 
                'Analiza postępów w nauce'
              }
            </p>
          </div>

      {/* Stat Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-600 flex items-center">
                {stat.trend === "up" && <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />}
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Postęp w Kursach</h3>
            <p className="text-sm text-gray-600">Procentowy postęp w każdym kursie</p>
          </div>
          <div className="p-6 space-y-6">
            {subjectProgress.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Brak przypisanych kursów</p>
              </div>
            ) : (
              subjectProgress.map((item, index) => (
                <div key={index} className="space-y-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{item.subject}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>
                          {item.completedLessons} / {item.totalLessons} lekcji
                        </span>
                        {item.averageScore !== undefined && (
                          <span>
                            Średnia: {item.averageScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-gray-900 ml-4">
                      {item.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Rozpoczęty</span>
                    <span>
                      {item.progress === 100 ? 'Ukończony' : 
                       item.progress > 0 ? 'W trakcie' : 'Nierozpoczęty'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ostatnie Osiągnięcia</h3>
            <p className="text-sm text-gray-600">Najnowsze zdobyte odznaki i certyfikaty</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{achievement.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
