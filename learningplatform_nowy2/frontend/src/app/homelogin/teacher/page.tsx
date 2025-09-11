"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "next/navigation";
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import ClassManagement from '@/components/ClassManagement';
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
  const [showClassManagement, setShowClassManagement] = useState(false);
  const [showTutorManagement, setShowTutorManagement] = useState(false);
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    gradesToCheck: 0,
    averageGrade: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const isAdmin = user?.role === 'admin';

  // Pobierz statystyki
  const fetchStats = useCallback(async () => {
    if (!user?.email) {
      console.log('No user email found');
      return;
    }

    console.log('=== FETCHING TEACHER STATS ===');
    console.log('Current user:', {
      email: user.email,
      uid: user.uid,
      role: user.role,
      displayName: (user as any)?.displayName
    });
    
    try {
      console.log('Fetching teacher stats...');
      console.log('Current user email:', user.email);
      
      // Pobierz kursy nauczyciela - sprawdź oba pola
      const coursesCollection = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesCollection);
      
      console.log(`Total courses in Firestore: ${coursesSnapshot.docs.length}`);
      
      const courses = coursesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((course: any) => {
          // Sprawdź czy kurs należy do tego nauczyciela
          const isTeacher = 
            course.created_by === user.email ||
            course.teacherEmail === user.email ||
            course.created_by === user.uid;
          
          console.log(`Course "${course.title}":`, {
            id: course.id,
            created_by: course.created_by,
            teacherEmail: course.teacherEmail,
            userEmail: user.email,
            userUid: user.uid,
            isTeacher
          });
          
          return isTeacher;
        }) as Course[];
      
      console.log(`Found ${courses.length} courses for teacher ${user.email}`);
      
      // Pobierz wszystkich uczniów przypisanych do kursów nauczyciela
      const allAssignedUsers = new Set<string>();
      courses.forEach(course => {
        if (course.assignedUsers && Array.isArray(course.assignedUsers)) {
          course.assignedUsers.forEach(userId => allAssignedUsers.add(userId));
        }
      });
      
      console.log(`Total assigned users across all courses: ${allAssignedUsers.size}`);
      console.log('Assigned user IDs:', Array.from(allAssignedUsers));
      
      // Pobierz dane uczniów
      const studentsCollection = collection(db, 'users');
      const studentsData: Student[] = [];
      
      for (const userId of allAssignedUsers) {
        try {
          // Sprawdź czy to email czy UID
          let userQuery;
          if (userId.includes('@')) {
            // To email - znajdź użytkownika po email
            userQuery = query(studentsCollection, where("email", "==", userId));
          } else {
            // To UID - znajdź użytkownika po UID
            userQuery = query(studentsCollection, where("uid", "==", userId));
          }
          
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data() as Student;
            studentsData.push(userData);
            console.log(`Found student: ${userData.displayName || userData.email}`);
          } else {
            console.log(`User not found for ID: ${userId}`);
          }
        } catch (error) {
          console.error('Error fetching user data for:', userId, error);
        }
      }
      
      console.log(`Successfully fetched ${studentsData.length} student records`);
      
      // Pobierz zadania do sprawdzenia z sekcji kursów
      let gradesToCheck = 0;
      for (const course of courses) {
        if (course.sections && Array.isArray(course.sections)) {
          course.sections.forEach((section: any) => {
            if (section.type === 'assignment' && section.submissions && Array.isArray(section.submissions)) {
              // Sprawdź przesłania bez ocen
              const ungradedSubmissions = section.submissions.filter((sub: any) => {
                // Jeśli nie ma oceny lub ocena jest 0/undefined
                return !sub.grade && sub.grade !== 0;
              });
              gradesToCheck += ungradedSubmissions.length;
            }
          });
        }
      }
      
      console.log(`Found ${gradesToCheck} assignments to grade`);
      
      // Oblicz średnią ocen z quizów (jeśli istnieją)
      let totalQuizScore = 0;
      let quizCount = 0;
      
      try {
        const quizResultsCollection = collection(db, 'quiz_results');
        for (const course of courses) {
          const quizResultsQuery = query(
            quizResultsCollection,
            where('course_id', '==', course.id)
          );
          const quizResultsSnapshot = await getDocs(quizResultsQuery);
          
          console.log(`Quiz results for course "${course.title}": ${quizResultsSnapshot.docs.length} results`);
          
          quizResultsSnapshot.docs.forEach(doc => {
            const result = doc.data();
            console.log('Quiz result:', result);
            
            if (result.score !== undefined && result.score !== null) {
              // Sprawdź czy score jest w rozsądnym zakresie (0-100 lub 0-10)
              const score = Number(result.score);
              if (!isNaN(score) && score >= 0 && score <= 100) {
                // Jeśli score > 10, prawdopodobnie jest w procentach, podziel przez 10
                const normalizedScore = score > 10 ? score / 10 : score;
                totalQuizScore += normalizedScore;
                quizCount++;
                console.log(`Valid score: ${score} -> normalized: ${normalizedScore}`);
              } else {
                console.log(`Invalid score: ${score} (skipping)`);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching quiz results for average:', error);
      }
      
      const averageGrade = quizCount > 0 ? totalQuizScore / quizCount : 4.2; // Fallback jeśli brak wyników
      
      console.log(`Quiz average calculation: totalScore=${totalQuizScore}, count=${quizCount}, average=${averageGrade}`);
      
      // Ogranicz średnią do rozsądnego zakresu (0-10)
      const clampedAverage = Math.max(0, Math.min(10, averageGrade));
      
      setStats({
        courses: courses.length,
        students: studentsData.length,
        gradesToCheck,
        averageGrade: Math.round(clampedAverage * 10) / 10 // Zaokrąglij do 1 miejsca po przecinku
      });
      
      console.log('=== FINAL STATS ===');
      console.log('Final stats:', {
        courses: courses.length,
        students: studentsData.length,
        gradesToCheck,
        averageGrade: Math.round(clampedAverage * 10) / 10,
        rawAverage: averageGrade,
        clampedAverage: clampedAverage
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user]);

  // Pobierz ostatnie aktywności
  const fetchRecentActivities = useCallback(async () => {
    if (!user?.email) return;

    try {
      console.log('=== FETCHING RECENT ACTIVITIES ===');
      const activities: RecentActivity[] = [];
      
      // Pobierz kursy nauczyciela - użyj tej samej logiki co w fetchStats
      const coursesCollection = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesCollection);
      
      const courses = coursesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((course: any) => {
          // Sprawdź czy kurs należy do tego nauczyciela
          const isTeacher = 
            course.created_by === user.email ||
            course.teacherEmail === user.email ||
            course.created_by === user.uid;
          
          return isTeacher;
        }) as Course[];
      
      console.log(`Found ${courses.length} courses for activities`);
      
      // Pobierz aktywności z sekcji kursów
      for (const course of courses) {
        console.log(`Checking course: ${course.title} (ID: ${course.id})`);
        
        if (course.sections && Array.isArray(course.sections)) {
          console.log(`Course has ${course.sections.length} sections`);
          
          course.sections.forEach((section: any, index: number) => {
            console.log(`Section ${index}: ${section.name} (type: ${section.type})`);
            
            // Sprawdź czy sekcja ma zadania z przesłaniami
            if (section.type === 'assignment' && section.submissions && section.submissions.length > 0) {
              console.log(`Section has ${section.submissions.length} submissions`);
              
              const latestSubmission = section.submissions.reduce((latest: any, current: any) => {
                const latestDate = new Date(latest.submittedAt || 0);
                const currentDate = new Date(current.submittedAt || 0);
                return currentDate > latestDate ? current : latest;
              });
              
              console.log('Latest submission:', latestSubmission);
              
              activities.push({
                id: `${course.id}-${section.id}-${latestSubmission.userId}`,
                type: 'assignment',
                title: 'Nowe przesłanie zadania',
                description: `Uczeń przesłał zadanie "${section.name}" w kursie "${course.title}"`,
                timestamp: latestSubmission.submittedAt ? new Date(latestSubmission.submittedAt).toLocaleString('pl-PL') : 'Nieznana data',
                icon: ClipboardList
              });
              
              console.log('Added assignment activity');
            }
            
            // Sprawdź czy sekcja ma nowe materiały
            if (section.contents && section.contents.length > 0) {
              console.log(`Section has ${section.contents.length} contents`);
              
              const latestContent = section.contents.reduce((latest: any, current: any) => {
                const latestDate = new Date(latest.createdAt || latest.timestamp || 0);
                const currentDate = new Date(current.createdAt || current.timestamp || 0);
                return currentDate > latestDate ? current : latest;
              });
              
              console.log('Latest content:', latestContent);
              
              activities.push({
                id: `${course.id}-${section.id}-${latestContent.id}`,
                type: 'course',
                title: 'New material',
                description: `Dodano "${latestContent.name || 'materiał'}" do sekcji "${section.name}" w kursie "${course.title}"`,
                timestamp: latestContent.createdAt || latestContent.timestamp ? new Date(latestContent.createdAt || latestContent.timestamp).toLocaleString('pl-PL') : 'Nieznana data',
                icon: BookOpen
              });
              
              console.log('Added content activity');
            }
          });
        } else {
          console.log(`Course has no sections or sections is not an array`);
        }
      }
      
      // Pobierz ostatnie quizy
      console.log('Fetching quizzes...');
      const quizzesCollection = collection(db, 'quizzes');
      const quizzesQuery = query(
        quizzesCollection,
        where('created_by', '==', user.email),
        orderBy('created_at', 'desc'),
        limit(3)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      console.log(`Found ${quizzesSnapshot.docs.length} quizzes created by teacher`);
      
      quizzesSnapshot.docs.forEach(doc => {
        const quiz = doc.data();
        console.log('Quiz data:', quiz);
        
        let timestamp = 'Nieznana data';
        try {
          if (quiz.created_at && quiz.created_at.toDate) {
            timestamp = quiz.created_at.toDate().toLocaleString('pl-PL');
          } else if (quiz.created_at) {
            timestamp = new Date(quiz.created_at).toLocaleString('pl-PL');
          }
        } catch (error) {
          console.error('Error parsing quiz date:', error);
        }
        
        activities.push({
          id: doc.id,
          type: 'quiz',
          title: 'Nowy quiz',
          description: `Utworzono quiz "${quiz.title}"`,
          timestamp: timestamp,
          icon: Award
        });
        
        console.log('Added quiz activity');
      });
      
      // Pobierz aktywności uczniów (nowe przesłania, quizy ukończone)
      console.log('Fetching student activities...');
      for (const course of courses) {
        if (course.assignedUsers && Array.isArray(course.assignedUsers)) {
          console.log(`Course "${course.title}" has ${course.assignedUsers.length} assigned users`);
          
          // Sprawdź quizy ukończone przez uczniów
          try {
            const quizResultsCollection = collection(db, 'quiz_results');
            const quizResultsQuery = query(
              quizResultsCollection,
              where('course_id', '==', course.id)
            );
            const quizResultsSnapshot = await getDocs(quizResultsQuery);
            
            console.log(`Found ${quizResultsSnapshot.docs.length} quiz results for course "${course.title}"`);
            
            quizResultsSnapshot.docs.forEach(doc => {
              const result = doc.data();
              console.log('Quiz result:', result);
              
              let timestamp = 'Nieznana data';
              try {
                if (result.completed_at && result.completed_at.toDate) {
                  timestamp = result.completed_at.toDate().toLocaleString('pl-PL');
                } else if (result.completed_at) {
                  timestamp = new Date(result.completed_at).toLocaleString('pl-PL');
                }
              } catch (error) {
                console.error('Error parsing quiz result date:', error);
              }
              
              activities.push({
                id: `quiz-result-${doc.id}`,
                type: 'quiz',
                title: 'Quiz ukończony',
                description: `Uczeń ukończył quiz w kursie "${course.title}" z wynikiem ${result.score || 'N/A'}`,
                timestamp: timestamp,
                icon: Award
              });
              
              console.log('Added quiz result activity');
            });
          } catch (error) {
            console.error('Error fetching quiz results:', error);
          }
        }
      }
      
      // 🆕 NOWE - Pobierz ankiety nauczyciela
      console.log('Fetching teacher surveys...');
      try {
        const surveysQuery = query(
          collection(db, 'teacherSurveys'),
          where('teacherId', '==', user.uid)
        );
        const surveysSnapshot = await getDocs(surveysQuery);
        
        console.log(`Found ${surveysSnapshot.docs.length} surveys for teacher`);
        
        surveysSnapshot.docs.forEach(doc => {
          const survey = doc.data();
          console.log('Survey result:', survey);
          
          let timestamp = 'Nieznana data';
          try {
            if (survey.submittedAt && survey.submittedAt.toDate) {
              timestamp = survey.submittedAt.toDate().toLocaleString('pl-PL');
            } else if (survey.submittedAt) {
              timestamp = new Date(survey.submittedAt).toLocaleString('pl-PL');
            }
          } catch (error) {
            console.error('Error parsing survey date:', error);
          }
          
          activities.push({
            id: `survey-${doc.id}`,
            type: 'survey',
            title: 'Nowa ankieta',
            description: `Uczeń wypełnił ankietę oceniającą - średnia ocena: ${survey.averageScore?.toFixed(1) || 'N/A'}/10`,
            timestamp: timestamp,
            icon: Award
          });
          
          console.log('Added survey activity');
        });
      } catch (error) {
        console.error('Error fetching teacher surveys:', error);
      }
      
      console.log(`Total activities before sorting: ${activities.length}`);
      
      // Sortuj aktywności po czasie (najnowsze pierwsze)
      activities.sort((a, b) => {
        try {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Error sorting activities:', error);
          return 0;
        }
      });
      
      // Usuń duplikaty i weź pierwsze 4
      const uniqueActivities = activities.filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      );
      
      console.log(`Found ${uniqueActivities.length} unique activities`);
      console.log('Activities:', uniqueActivities);
      
      setRecentActivities(uniqueActivities.slice(0, 4));
      
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

  const statCards: StatCard[] = [
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
  ];

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
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Witaj z powrotem, {(user as any)?.displayName || user?.email || 'Nauczycielu'}!
        </h2>
        <p className="text-gray-600 mb-6">
          {isAdmin ? 'Przegląd aktywności w systemie edukacyjnym' : 'Przegląd Twoich kursów i aktywności uczniów'}
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

              <button
                onClick={() => setShowClassManagement(true)}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-indigo-600" />
                <div>
                  <div className="font-medium text-gray-900">Zarządzaj Klasami</div>
                  <div className="text-sm text-gray-600">Twórz klasy i dodawaj uczniów</div>
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ostatnia aktywność</h3>
              <p className="text-sm text-gray-600">Co się dzieje w Twoich kursach</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => {
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
                            <span className="text-xs text-gray-500">{activity.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Brak ostatnich aktywności
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Zobacz wszystkie aktywności
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal zarządzania klasami */}
      {showClassManagement && (
        <ClassManagement onClose={() => setShowClassManagement(false)} />
      )}

      {/* Modal zarządzania tutorami */}
      {showTutorManagement && (
        <TutorManagement onClose={() => setShowTutorManagement(false)} />
      )}
    </div>
  );
} 