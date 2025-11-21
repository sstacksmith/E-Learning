"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import TutorManagement from '@/components/TutorManagement';
import {
  BookOpen,
  Users,
  ClipboardList,
  BarChart3,
  Calendar,
  MessageSquare,
  Award,
  TrendingUp,
  Clock,
  UserPlus
} from 'lucide-react';

// Funkcja do formatowania względnego czasu
function formatRelativeTime(timestamp: string): string {
  try {
    // Obsłuż ręcznie format dd/mm/yyyy (i opcjonalnie hh:mm)
    let date: Date;
    const slashMatch = timestamp && timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if (slashMatch) {
      const [, dd, mm, yyyy, hh, min] = slashMatch;
      date = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        hh !== undefined ? Number(hh) : 0,
        min !== undefined ? Number(min) : 0,
        0,
        0
      );
    } else {
      date = new Date(timestamp);
    }
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'przed chwilą';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minut temu`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} godzin temu`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} dni temu`;
    } else {
      return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
    }
  } catch (error) {
    return timestamp;
  }
}

interface StatCard {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'course' | 'student' | 'grade' | 'quiz' | 'assignment' | 'survey';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Course {
  id: string;
  title: string;
  assignedUsers: string[];
  created_by: string;
  created_at?: any;
  updated_at?: any;
  sections?: any[];
}

interface Student {
  uid: string;
  displayName: string;
  email: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showTutorManagement, setShowTutorManagement] = useState(false);
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    gradesToCheck: 0,
    averageGrade: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const isAdmin = user?.role === 'admin';

  // Memoizuj filtrowane aktywności
  const filteredActivities = useMemo(() => {
    return recentActivities.filter(activity => {
      if (activeTab === 'all') return true;
      return activity.type === activeTab;
    });
  }, [recentActivities, activeTab]);

  // Memoizuj definicje zakładek
  const tabs = useMemo(() => [
    { id: 'all', label: 'Wszystkie', icon: '📊', count: recentActivities.length },
    { id: 'quiz', label: 'Quizy', icon: '🧪', count: recentActivities.filter(a => a.type === 'quiz').length },
    { id: 'grade', label: 'Oceny', icon: '📝', count: recentActivities.filter(a => a.type === 'grade').length },
    { id: 'course', label: 'Kursy', icon: '📚', count: recentActivities.filter(a => a.type === 'course').length }
  ], [recentActivities]);

  // Pobierz statystyki - zoptymalizowane
  const fetchStats = useCallback(async () => {
    if (!user?.email || !user?.uid) return;
    
    try {
      // Pobierz kursy nauczyciela - użyj query zamiast pobierania wszystkich
      const coursesCollection = collection(db, 'courses');
      const [coursesByEmail, coursesByUid, coursesByTeacherEmail] = await Promise.all([
        getDocs(query(coursesCollection, where('created_by', '==', user.email))),
        getDocs(query(coursesCollection, where('created_by', '==', user.uid))),
        getDocs(query(coursesCollection, where('teacherEmail', '==', user.email)))
      ]);
      
      // Połącz i deduplikuj kursy
      const coursesMap = new Map<string, Course>();
      [coursesByEmail, coursesByUid, coursesByTeacherEmail].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course);
        });
      });
      const courses = Array.from(coursesMap.values());
      
      // Pobierz wszystkich uczniów przypisanych do kursów nauczyciela
      const allAssignedUsers = new Set<string>();
      courses.forEach(course => {
        if (course.assignedUsers && Array.isArray(course.assignedUsers)) {
          course.assignedUsers.forEach(userId => allAssignedUsers.add(userId));
        }
      });
      
      // Pobierz dane uczniów - batch query zamiast pętli
      const studentsCollection = collection(db, 'users');
      const studentQueries = Array.from(allAssignedUsers).map(userId => {
        if (userId.includes('@')) {
          return getDocs(query(studentsCollection, where("email", "==", userId), limit(1)));
        } else {
          return getDocs(query(studentsCollection, where("uid", "==", userId), limit(1)));
        }
      });
      
      const studentSnapshots = await Promise.all(studentQueries);
      const studentsData: Student[] = studentSnapshots
        .filter(snapshot => !snapshot.empty)
        .map(snapshot => snapshot.docs[0].data() as Student);
      
      // Pobierz zadania do sprawdzenia z sekcji kursów
      let gradesToCheck = 0;
      courses.forEach(course => {
        if (course.sections && Array.isArray(course.sections)) {
          course.sections.forEach((section: any) => {
            if (section.type === 'assignment' && section.submissions && Array.isArray(section.submissions)) {
              const ungradedSubmissions = section.submissions.filter((sub: any) => !sub.grade && sub.grade !== 0);
              gradesToCheck += ungradedSubmissions.length;
            }
          });
        }
      });
      
      // Oblicz średnią ocen z quizów - tylko dla kursów nauczyciela, z limitem
      let totalQuizScore = 0;
      let quizCount = 0;
      
      if (courses.length > 0) {
        const quizResultsCollection = collection(db, 'quiz_results');
        const courseIds = courses.map(c => c.id);
        
        // Pobierz quiz results dla wszystkich kursów jednocześnie (maksymalnie 10 na kurs)
        const quizQueries = courseIds.slice(0, 10).map(courseId => 
          getDocs(query(quizResultsCollection, where('course_id', '==', courseId), limit(10)))
        );
        
        const quizSnapshots = await Promise.all(quizQueries);
        quizSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            const result = doc.data();
            if (result.score !== undefined && result.score !== null) {
              const score = Number(result.score);
              if (!isNaN(score) && score >= 0 && score <= 100) {
                const normalizedScore = score > 10 ? score / 10 : score;
                totalQuizScore += normalizedScore;
                quizCount++;
              }
            }
          });
        });
      }
      
      const averageGrade = quizCount > 0 ? totalQuizScore / quizCount : 4.2;
      const clampedAverage = Math.max(0, Math.min(10, averageGrade));
      
      setStats({
        courses: courses.length,
        students: studentsData.length,
        gradesToCheck,
        averageGrade: Math.round(clampedAverage * 10) / 10
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user]);

  // Pobierz ostatnie aktywności - zoptymalizowane
  const fetchRecentActivities = useCallback(async () => {
    if (!user?.email || !user?.uid) return;

    try {
      const activities: RecentActivity[] = [];
      
      // Pobierz kursy nauczyciela - użyj query zamiast pobierania wszystkich
      const coursesCollection = collection(db, 'courses');
      const [coursesByEmail, coursesByUid, coursesByTeacherEmail] = await Promise.all([
        getDocs(query(coursesCollection, where('created_by', '==', user.email), limit(50))),
        getDocs(query(coursesCollection, where('created_by', '==', user.uid), limit(50))),
        getDocs(query(coursesCollection, where('teacherEmail', '==', user.email), limit(50)))
      ]);
      
      // Połącz i deduplikuj kursy
      const coursesMap = new Map<string, Course>();
      [coursesByEmail, coursesByUid, coursesByTeacherEmail].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course);
        });
      });
      const courses = Array.from(coursesMap.values());
      
      // Helper function do parsowania dat
      const parseTimestamp = (ts: any): string => {
        try {
          if (ts?.toDate) return ts.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
          if (ts) return new Date(ts).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
          return 'Nieznana data';
        } catch {
          return 'Nieznana data';
        }
      };
      
      // Helper function do parsowania daty do Date object
      const parseDate = (ts: any): Date => {
        try {
          if (ts?.toDate) return ts.toDate();
          if (typeof ts === 'string') {
            const slashMatch = ts.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (slashMatch) {
              const [, dd, mm, yyyy] = slashMatch;
              return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
            }
            return new Date(ts);
          }
          return new Date(ts || 0);
        } catch {
          return new Date(0);
        }
      };
      
      // 1. Aktywności z tworzenia kursów (tylko 5 najnowszych)
      courses.slice(0, 5).forEach(course => {
        activities.push({
          id: `course-created-${course.id}`,
          type: 'course',
          title: 'Kurs utworzony',
          description: `Utworzono nowy kurs "${course.title}"`,
          timestamp: parseTimestamp(course.created_at),
          icon: BookOpen
        });
      });
      
      // 2-7. Pobierz wszystkie aktywności równolegle
      const [gradesSnapshot, chatSnapshot, quizzesSnapshot, studentsSnapshot, surveysSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'grades'), where('graded_by', '==', user.email), orderBy('graded_at', 'desc'), limit(5))),
        getDocs(query(collection(db, 'group_chat_messages'), where('senderEmail', '==', user.email), orderBy('timestamp', 'desc'), limit(3))),
        getDocs(query(collection(db, 'quizzes'), where('created_by', '==', user.email), orderBy('created_at', 'desc'), limit(3))),
        getDocs(query(collection(db, 'users'), where('primaryTutorId', '==', user.uid))),
        getDocs(query(collection(db, 'teacherSurveys'), where('teacherId', '==', user.uid), orderBy('submittedAt', 'desc'), limit(3)))
      ]);
      
      const teacherStudentEmails = studentsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);
      
      // 2. Oceny
      gradesSnapshot.docs.forEach(doc => {
        const grade = doc.data();
        activities.push({
          id: `grade-given-${doc.id}`,
          type: 'grade',
          title: 'Ocena wystawiona',
          description: `Wystawiono ocenę ${grade.value || grade.grade} z ${grade.subject || 'przedmiotu'} dla ${grade.studentName || 'ucznia'}`,
          timestamp: parseTimestamp(grade.graded_at),
          icon: Award
        });
      });
      
      // 3. Czat
      chatSnapshot.docs.forEach(doc => {
        const message = doc.data();
        activities.push({
          id: `chat-message-${doc.id}`,
          type: 'assignment',
          title: 'Wiadomość w czacie',
          description: `Wysłano wiadomość w czacie grupowym: "${message.text?.substring(0, 50)}${message.text?.length > 50 ? '...' : ''}"`,
          timestamp: parseTimestamp(message.timestamp),
          icon: MessageSquare
        });
      });
      
      // 4. Quizy
      quizzesSnapshot.docs.forEach(doc => {
        const quiz = doc.data();
        activities.push({
          id: `quiz-created-${doc.id}`,
          type: 'quiz',
          title: 'Quiz utworzony',
          description: `Utworzono quiz "${quiz.title}" dla kursu "${quiz.subject || 'nieznanego'}"`,
          timestamp: parseTimestamp(quiz.created_at),
          icon: Award
        });
      });
      
      // 5. Ankiety
      surveysSnapshot.docs.forEach(doc => {
        const survey = doc.data();
        activities.push({
          id: `survey-${doc.id}`,
          type: 'survey',
          title: 'Ankieta wypełniona',
          description: `Uczeń wypełnił ankietę oceniającą - średnia ocena: ${survey.averageScore?.toFixed(1) || 'N/A'}/10`,
          timestamp: parseTimestamp(survey.submittedAt),
          icon: Award
        });
      });
      
      // 6. Quizy ukończone przez uczniów (tylko jeśli są uczniowie)
      if (teacherStudentEmails.length > 0 && courses.length > 0) {
        const courseIds = courses.slice(0, 5).map(c => c.id);
        const quizQueries = courseIds.map(courseId => 
          getDocs(query(collection(db, 'quiz_results'), where('course_id', '==', courseId), limit(5)))
        );
        const quizSnapshots = await Promise.all(quizQueries);
        
        quizSnapshots.forEach((snapshot, idx) => {
          const course = courses[idx];
          snapshot.docs.forEach(doc => {
            const result = doc.data();
            if (teacherStudentEmails.includes(result.user_email) && result.score > 0) {
              activities.push({
                id: `quiz-completed-${result.user_email}-${course.id}-${doc.id}`,
                type: 'quiz',
                title: 'Quiz ukończony przez ucznia',
                description: `Uczeń ukończył quiz w kursie "${course.title}" z wynikiem ${result.score || result.percentage || 0}%`,
                timestamp: parseTimestamp(result.completed_at),
                icon: Award
              });
            }
          });
        });
      }
      
      // Sortuj i deduplikuj aktywności
      activities.sort((a, b) => {
        const dateA = parseDate(a.timestamp);
        const dateB = parseDate(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      const uniqueActivities = activities.filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      );
      
      setRecentActivities(uniqueActivities.slice(0, 10));
      
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      Promise.all([fetchStats(), fetchRecentActivities()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchStats, fetchRecentActivities]);

  // Memoizuj statCards aby uniknąć niepotrzebnych re-renderów
  const statCards: StatCard[] = useMemo(() => [
    {
      title: "Moje Kursy",
      value: stats.courses.toString(),
      description: "aktywnych kursów",
      icon: BookOpen,
      color: "bg-blue-500"
    },
    {
      title: "Uczniowie", 
      value: stats.students.toString(),
      description: "wszystkich uczniów",
      icon: Users,
      color: "bg-green-500"
    },
    {
      title: "Oceny do sprawdzenia",
      value: stats.gradesToCheck.toString(),
      description: "oczekuje na ocenę",
      icon: ClipboardList,
      color: "bg-orange-500"
    },
    {
      title: "Średnia ocen",
      value: stats.averageGrade.toFixed(1),
      description: "+0.3 w tym miesiącu",
      icon: BarChart3,
      trend: "up",
      color: "bg-purple-500"
    },
  ], [stats.courses, stats.students, stats.gradesToCheck, stats.averageGrade]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-gray-900">
          Witaj z powrotem, {(user as any)?.displayName || user?.email || 'Nauczycielu'}!
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {isAdmin ? 'Przegląd aktywności w systemie edukacyjnym' : 'Przegląd Twoich kursów i aktywności uczniów'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isCoursesCard = stat.title === "Moje Kursy";
          const isStudentsCard = stat.title === "Uczniowie";
          const isClickableCard = isCoursesCard || isStudentsCard;
          
          const cardContent = (
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${isClickableCard ? 'hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-600 flex items-center">
                {stat.trend === "up" && <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />}
                {stat.description}
              </p>
            </div>
          );
          
          if (isCoursesCard) {
            return (
              <Link key={index} href="/homelogin/teacher/courses">
                {cardContent}
              </Link>
            );
          } else if (isStudentsCard) {
            return (
              <Link key={index} href="/homelogin/teacher/students">
                {cardContent}
              </Link>
            );
          } else {
            return (
              <div key={index}>
                {cardContent}
              </div>
            );
          }
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Szybkie akcje</h3>
              <p className="text-sm text-gray-600">Najczęściej używane funkcje</p>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => router.push('/homelogin/teacher/courses')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Zarządzaj kursami</div>
                  <div className="text-sm text-gray-600">Dodaj nowe materiały</div>
                </div>
              </button>

              <button
                onClick={() => router.push('/homelogin/teacher/students')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Lista uczniów</div>
                  <div className="text-sm text-gray-600">Zobacz postępy</div>
                </div>
              </button>

              <button
                onClick={() => router.push('/homelogin/teacher/grades')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ClipboardList className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900">Dziennik ocen</div>
                  <div className="text-sm text-gray-600">Wystaw oceny</div>
                </div>
              </button>

              <button
                onClick={() => router.push('/homelogin/teacher/calendar')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium text-gray-900">Kalendarz</div>
                  <div className="text-sm text-gray-600">Zaplanuj zajęcia</div>
                </div>
              </button>

              <button
                onClick={() => router.push('/homelogin/group-chats')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Czat grupowy</div>
                  <div className="text-sm text-gray-600">Komunikuj się</div>
                </div>
              </button>


              {/* Admin Only - Tutor Management */}
              {isAdmin && (
                <button
                  onClick={() => setShowTutorManagement(true)}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <UserPlus className="h-5 w-5 text-teal-600" />
                  <div>
                    <div className="font-medium text-gray-900">Zarządzaj Tutorami</div>
                    <div className="text-sm text-gray-600">Przypisz tutorów do studentów</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Twoje ostatnie aktywności</h3>
                <p className="text-sm text-gray-600">Co robiłeś w systemie - kursy, oceny, quizy, czat</p>
              </div>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchRecentActivities().finally(() => setLoading(false));
                }}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                Odśwież
              </button>
            </div>
            
            {/* Zakładki */}
            <div className="px-6 py-3 border-b border-gray-200">
              <div className="flex space-x-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6">
              <div className="max-h-96 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="p-2 bg-white rounded-lg border">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{activity.title}</h4>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {activity.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {activeTab === 'all' 
                      ? 'Brak ostatnich aktywności' 
                      : `Brak aktywności typu "${tabs.find(t => t.id === activeTab)?.label}"`
                    }
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </div>


      {/* Modal zarządzania tutorami */}
      {showTutorManagement && (
        <TutorManagement onClose={() => setShowTutorManagement(false)} />
      )}
    </div>
  );
} 