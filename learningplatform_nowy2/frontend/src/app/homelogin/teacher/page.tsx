"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "next/navigation";
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

  // Filtruj aktywności według wybranej zakładki
  const filteredActivities = recentActivities.filter(activity => {
    if (activeTab === 'all') return true;
    return activity.type === activeTab;
  });

  // Definicje zakładek
  const tabs = [
    { id: 'all', label: 'Wszystkie', icon: '📊', count: recentActivities.length },
    { id: 'quiz', label: 'Quizy', icon: '🧪', count: recentActivities.filter(a => a.type === 'quiz').length },
    { id: 'grade', label: 'Oceny', icon: '📝', count: recentActivities.filter(a => a.type === 'grade').length },
    { id: 'course', label: 'Kursy', icon: '📚', count: recentActivities.filter(a => a.type === 'course').length }
  ];

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
      
      // 🆕 1. AKTYWNOŚCI Z TWORZENIA KURSÓW PRZEZ NAUCZYCIELA
      console.log('Fetching teacher course creation activities...');
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
      
      // Dodaj aktywności z tworzenia kursów
      courses.forEach(course => {
        let timestamp = 'Nieznana data';
        try {
          if (course.created_at && course.created_at.toDate) {
            timestamp = course.created_at.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
          } else if (course.created_at) {
            timestamp = new Date(course.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
          }
        } catch (error) {
          console.error('Error parsing course creation date:', error);
        }
        
        activities.push({
          id: `course-created-${course.id}`,
          type: 'course',
          title: 'Kurs utworzony',
          description: `Utworzono nowy kurs "${course.title}"`,
          timestamp: timestamp,
          icon: BookOpen
        });
      });
      
      // 🆕 2. AKTYWNOŚCI Z WYSTAWIANIA OCEN PRZEZ NAUCZYCIELA
      console.log('Fetching teacher grading activities...');
      try {
        const gradesCollection = collection(db, 'grades');
        const gradesQuery = query(
          gradesCollection,
          where('graded_by', '==', user.email),
          limit(10)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        
        console.log(`Found ${gradesSnapshot.docs.length} grades given by teacher`);
        console.log('🔍 DEBUG: Teacher email for grades query:', user.email);
        console.log('🔍 DEBUG: All grades found:', gradesSnapshot.docs.map(doc => ({
          id: doc.id,
          graded_by: doc.data().graded_by,
          studentEmail: doc.data().studentEmail,
          quiz_title: doc.data().quiz_title,
          value: doc.data().value,
          graded_at: doc.data().graded_at
        })));
        
        // Sortuj oceny po dacie w JavaScript
        const sortedGrades = gradesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => {
            const dateA = a.graded_at?.toDate ? a.graded_at.toDate() : new Date(a.graded_at || 0);
            const dateB = b.graded_at?.toDate ? b.graded_at.toDate() : new Date(b.graded_at || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5); // Weź tylko 5 najnowszych
        
        sortedGrades.forEach((grade: any) => {
          console.log('Grade data:', grade);
          
          let timestamp = 'Nieznana data';
          try {
            if (grade.graded_at && grade.graded_at.toDate) {
              timestamp = grade.graded_at.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
            } else if (grade.graded_at) {
              timestamp = new Date(grade.graded_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
            }
          } catch (error) {
            console.error('Error parsing grade date:', error);
          }
          
          activities.push({
            id: `grade-given-${grade.id}`,
            type: 'grade',
            title: 'Ocena wystawiona',
            description: `Wystawiono ocenę ${grade.value || grade.grade} z ${grade.subject || 'przedmiotu'} dla ${grade.studentName || 'ucznia'}`,
            timestamp: timestamp,
            icon: Award
          });
        });
      } catch (error) {
        console.error('Error fetching teacher grades:', error);
      }
      
      // 🆕 3. AKTYWNOŚCI Z DODAWANIA UCZNIÓW DO KURSÓW
      console.log('Fetching student assignment activities...');
      for (const course of courses) {
        if (course.assignedUsers && Array.isArray(course.assignedUsers) && course.assignedUsers.length > 0) {
          // Sprawdź czy kurs ma uczniów przypisanych
          activities.push({
            id: `students-assigned-${course.id}`,
            type: 'student',
            title: 'Uczniowie przypisani',
            description: `Przypisano ${course.assignedUsers.length} uczniów do kursu "${course.title}"`,
            timestamp: course.updated_at ? new Date(course.updated_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/') : 'Nieznana data',
            icon: Users
          });
        }
      }
      
      // 🆕 4. AKTYWNOŚCI Z CZATU GRUPOWEGO NAUCZYCIELA
      console.log('Fetching teacher chat activities...');
      try {
        const chatMessagesCollection = collection(db, 'group_chat_messages');
        const chatQuery = query(
          chatMessagesCollection,
          where('senderEmail', '==', user.email),
          limit(5)
        );
        const chatSnapshot = await getDocs(chatQuery);
        
        console.log(`Found ${chatSnapshot.docs.length} chat messages from teacher`);
        
        // Sortuj wiadomości po dacie w JavaScript
        const sortedMessages = chatSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 3); // Weź tylko 3 najnowsze
        
        sortedMessages.forEach((message: any) => {
          console.log('Chat message:', message);
          
          let timestamp = 'Nieznana data';
          try {
            if (message.timestamp && message.timestamp.toDate) {
              timestamp = message.timestamp.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
            } else if (message.timestamp) {
              timestamp = new Date(message.timestamp).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
            }
          } catch (error) {
            console.error('Error parsing chat message date:', error);
          }
          
          activities.push({
            id: `chat-message-${message.id}`,
            type: 'assignment',
            title: 'Wiadomość w czacie',
            description: `Wysłano wiadomość w czacie grupowym: "${message.text?.substring(0, 50)}${message.text?.length > 50 ? '...' : ''}"`,
            timestamp: timestamp,
            icon: MessageSquare
          });
        });
      } catch (error) {
        console.error('Error fetching teacher chat messages:', error);
      }
      
      // 🆕 5. AKTYWNOŚCI Z TWORZENIA QUIZÓW PRZEZ NAUCZYCIELA
      console.log('Fetching teacher quiz creation activities...');
      const quizzesCollection = collection(db, 'quizzes');
      const quizzesQuery = query(
        quizzesCollection,
        where('created_by', '==', user.email),
        limit(10)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      console.log(`Found ${quizzesSnapshot.docs.length} quizzes created by teacher`);
      
      // 🔍 DEBUG: Sprawdź wszystkie quizy przed sortowaniem
      console.log('🔍 DEBUG: All quizzes before sorting:', quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        created_at: doc.data().created_at,
        created_by: doc.data().created_by,
        subject: doc.data().subject
      })));
      
      // Sortuj po stronie klienta według created_at (najnowsze pierwsze)
      const sortedQuizzes = quizzesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a, b) => {
          const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
          const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3); // Weź tylko 3 najnowsze
      
      sortedQuizzes.forEach(quiz => {
        console.log('🔍 DEBUG: Processing quiz:', {
          id: quiz.id,
          title: quiz.title,
          created_at: quiz.created_at,
          created_by: quiz.created_by,
          subject: quiz.subject,
          course_id: quiz.course_id
        });
        
        let timestamp = 'Nieznana data';
        try {
          if (quiz.created_at && quiz.created_at.toDate) {
            timestamp = quiz.created_at.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
          } else if (quiz.created_at) {
            timestamp = new Date(quiz.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
          }
        } catch (error) {
          console.error('Error parsing quiz date:', error);
        }
        
        console.log('✅ DEBUG: Adding quiz activity:', {
          id: `quiz-created-${quiz.id}`,
          title: quiz.title,
          timestamp: timestamp
        });
        
        activities.push({
          id: `quiz-created-${quiz.id}`,
          type: 'quiz',
          title: 'Quiz utworzony',
          description: `Utworzono quiz "${quiz.title}" dla kursu "${quiz.subject || 'nieznanego'}"`,
          timestamp: timestamp,
          icon: Award
        });
      });
      
      // 🆕 6. AKTYWNOŚCI Z UKOŃCZENIA QUIZÓW PRZEZ UCZNIÓW (dla kontekstu nauczyciela)
      console.log('Fetching student quiz completion activities...');
      
      // Pobierz wszystkich uczniów przypisanych do tego nauczyciela
      const studentsCollection = collection(db, 'users');
      const studentsQuery = query(
        studentsCollection,
        where('primaryTutorId', '==', user.uid)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const teacherStudentEmails = studentsSnapshot.docs.map(doc => doc.data().email);
      
      console.log('🔍 DEBUG: Teacher info:', {
        uid: user.uid,
        email: user.email,
        displayName: (user as any)?.displayName
      });
      
      console.log('🔍 DEBUG: Students query result:', {
        totalDocs: studentsSnapshot.docs.length,
        docs: studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      });
      
      // 🧪 TEST: Sprawdź czy są uczniowie z różnymi primaryTutorId
      console.log('🧪 TEST: Checking all students in system...');
      try {
        const allStudentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), limit(10));
        const allStudentsSnapshot = await getDocs(allStudentsQuery);
        
        console.log('🧪 TEST: All students in system:', allStudentsSnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          primaryTutorId: doc.data().primaryTutorId,
          assignedToTeacher: doc.data().assignedToTeacher
        })));
      } catch (error) {
        console.error('🧪 TEST: Error checking all students:', error);
      }
      
      console.log(`🔍 DEBUG: Found ${teacherStudentEmails.length} students assigned to teacher:`, teacherStudentEmails);
      
      // 🧪 TEST: Sprawdź czy w ogóle są jakieś quizy w systemie
      console.log('🧪 TEST: Checking all quiz data in system...');
      try {
        const allQuizResultsQuery = query(collection(db, 'quiz_results'), limit(5));
        const allQuizAttemptsQuery = query(collection(db, 'quiz_attempts'), limit(5));
        
        const [allQuizResultsSnapshot, allQuizAttemptsSnapshot] = await Promise.all([
          getDocs(allQuizResultsQuery),
          getDocs(allQuizAttemptsQuery)
        ]);
        
        console.log('🧪 TEST: All quiz results in system:', allQuizResultsSnapshot.docs.map(doc => ({
          id: doc.id,
          user_email: doc.data().user_email,
          course_id: doc.data().course_id,
          score: doc.data().score
        })));
        
        console.log('🧪 TEST: All quiz attempts in system:', allQuizAttemptsSnapshot.docs.map(doc => ({
          id: doc.id,
          user_email: doc.data().user_email,
          quiz_id: doc.data().quiz_id,
          score: doc.data().score,
          completed_at: doc.data().completed_at
        })));
      } catch (error) {
        console.error('🧪 TEST: Error checking all quiz data:', error);
      }
      
      for (const course of courses) {
        if (course.assignedUsers && Array.isArray(course.assignedUsers)) {
          console.log(`Course "${course.title}" has ${course.assignedUsers.length} assigned users`);
          
          try {
            // Sprawdź obie kolekcje - quiz_results i quiz_attempts
            const quizResultsCollection = collection(db, 'quiz_results');
            const quizAttemptsCollection = collection(db, 'quiz_attempts');
            
            const quizResultsQuery = query(
              quizResultsCollection,
              where('course_id', '==', course.id),
              limit(5)
            );
            const quizAttemptsQuery = query(
              quizAttemptsCollection,
              limit(10) // Pobierz więcej prób, potem przefiltrujemy
            );
            
            const [quizResultsSnapshot, quizAttemptsSnapshot] = await Promise.all([
              getDocs(quizResultsQuery),
              getDocs(quizAttemptsQuery)
            ]);
            
            console.log(`Found ${quizResultsSnapshot.docs.length} quiz results for course "${course.title}"`);
            console.log(`Found ${quizAttemptsSnapshot.docs.length} quiz attempts total`);
            
            // Połącz dane z obu kolekcji - TYLKO od uczniów tego nauczyciela
            const allQuizData: any[] = [];
            
            // Dodaj quiz_results - tylko od uczniów tego nauczyciela
            quizResultsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              console.log(`🔍 DEBUG: Quiz result from course "${course.title}":`, {
                docId: doc.id,
                user_email: data.user_email,
                isTeacherStudent: teacherStudentEmails.includes(data.user_email),
                score: data.score,
                completed_at: data.completed_at
              });
              
              // Sprawdź czy to uczeń tego nauczyciela
              if (teacherStudentEmails.includes(data.user_email)) {
                console.log(`✅ DEBUG: Adding quiz result from teacher's student: ${data.user_email}`);
                allQuizData.push({
                  id: `result-${doc.id}`,
                  ...data,
                  source: 'quiz_results'
                });
              } else {
                console.log(`❌ DEBUG: Skipping quiz result from non-teacher student: ${data.user_email}`);
              }
            });
            
            // Dodaj quiz_attempts (tylko ukończone) - tylko od uczniów tego nauczyciela
            quizAttemptsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              console.log(`🔍 DEBUG: Quiz attempt from course "${course.title}":`, {
                docId: doc.id,
                user_email: data.user_email,
                isTeacherStudent: teacherStudentEmails.includes(data.user_email),
                hasCompletedAt: !!data.completed_at,
                hasScore: data.score !== undefined,
                score: data.score,
                completed_at: data.completed_at
              });
              
              if (data.completed_at && data.score !== undefined && teacherStudentEmails.includes(data.user_email)) {
                console.log(`✅ DEBUG: Adding quiz attempt from teacher's student: ${data.user_email}`);
                allQuizData.push({
                  id: `attempt-${doc.id}`,
                  ...data,
                  source: 'quiz_attempts'
                });
              } else {
                console.log(`❌ DEBUG: Skipping quiz attempt - reasons:`, {
                  hasCompletedAt: !!data.completed_at,
                  hasScore: data.score !== undefined,
                  isTeacherStudent: teacherStudentEmails.includes(data.user_email)
                });
              }
            });
            
            console.log(`Filtered quiz data for course "${course.title}": ${allQuizData.length} results from teacher's students`);
            
            // Sortuj wszystkie dane po dacie
            const sortedQuizResults = allQuizData
              .sort((a: any, b: any) => {
                const dateA = a.completed_at?.toDate ? a.completed_at.toDate() : new Date(a.completed_at || 0);
                const dateB = b.completed_at?.toDate ? b.completed_at.toDate() : new Date(b.completed_at || 0);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 3); // Weź tylko 3 najnowsze
            
            sortedQuizResults.forEach((result: any) => {
              console.log('Quiz result data:', {
                id: result.id,
                source: result.source,
                score: result.score,
                percentage: result.percentage,
                finalScore: result.finalScore,
                totalScore: result.totalScore,
                completed_at: result.completed_at,
                allFields: Object.keys(result)
              });
              
              let timestamp = 'Nieznana data';
              try {
                if (result.completed_at && result.completed_at.toDate) {
                  timestamp = result.completed_at.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
                } else if (result.completed_at) {
                  timestamp = new Date(result.completed_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
                }
              } catch (error) {
                console.error('Error parsing quiz result date:', error);
              }
              
              // Sprawdź różne możliwe pola z wynikiem
              const score = result.score || result.percentage || result.finalScore || result.totalScore;
              
              // 🆕 FILTROWANIE: Pomiń quizy z wynikiem 0% lub bez wyniku
              if (score === undefined || score === null || score === 0) {
                console.log(`❌ DEBUG: Skipping quiz with no/zero score: ${score}`);
                return;
              }
              
              const scoreText = `${score}%`;
              
              // 🆕 UNIKALNE ID: Użyj kombinacji user_email + course_id + timestamp dla unikalności
              const uniqueId = `quiz-completed-${result.user_email}-${course.id}-${result.completed_at?.toDate?.()?.getTime() || result.completed_at}`;
              
              activities.push({
                id: uniqueId,
                type: 'quiz',
                title: 'Quiz ukończony przez ucznia',
                description: `Uczeń ukończył quiz w kursie "${course.title}" z wynikiem ${scoreText}`,
                timestamp: timestamp,
                icon: Award
              });
            });
          } catch (error) {
            console.error('Error fetching quiz results:', error);
          }
        }
      }
      
      // 🆕 7. AKTYWNOŚCI Z ANKIET NAUCZYCIELA
      console.log('Fetching teacher surveys...');
      try {
        const surveysQuery = query(
          collection(db, 'teacherSurveys'),
          where('teacherId', '==', user.uid),
          limit(5)
        );
        const surveysSnapshot = await getDocs(surveysQuery);
        
        console.log(`Found ${surveysSnapshot.docs.length} surveys for teacher`);
        
        // Sortuj ankiety po dacie w JavaScript
        const sortedSurveys = surveysSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => {
            const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt || 0);
            const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 3); // Weź tylko 3 najnowsze
        
        sortedSurveys.forEach((survey: any) => {
          console.log('Survey result:', survey);
          
          let timestamp = 'Nieznana data';
          try {
            if (survey.submittedAt && survey.submittedAt.toDate) {
              timestamp = survey.submittedAt.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
            } else if (survey.submittedAt) {
              timestamp = new Date(survey.submittedAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
            }
          } catch (error) {
            console.error('Error parsing survey date:', error);
          }
          
          activities.push({
            id: `survey-${survey.id}`,
            type: 'survey',
            title: 'Ankieta wypełniona',
            description: `Uczeń wypełnił ankietę oceniającą - średnia ocena: ${survey.averageScore?.toFixed(1) || 'N/A'}/10`,
            timestamp: timestamp,
            icon: Award
          });
        });
      } catch (error) {
        console.error('Error fetching teacher surveys:', error);
      }
      
      console.log(`Total activities before sorting: ${activities.length}`);
      console.log('Sample activities with timestamps:', activities.slice(0, 3).map(a => ({
        id: a.id,
        title: a.title,
        timestamp: a.timestamp,
        timestampType: typeof a.timestamp
      })));
      
      // 🔍 DEBUG: Sprawdź formaty timestamp przed sortowaniem
      console.log('🔍 DEBUG: Timestamps before sorting:', activities.map(a => ({
        id: a.id,
        title: a.title,
        timestamp: a.timestamp,
        timestampType: typeof a.timestamp
      })));
      
      // Sortuj aktywności po czasie (najnowsze pierwsze)
      activities.sort((a, b) => {
        try {
          // Parsuj timestamp - może być string lub Firestore Timestamp
          let dateA: Date;
          let dateB: Date;
          
          if (typeof a.timestamp === 'string') {
            // Obsłuż różne formaty dat
            const slashMatch = a.timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            const isoMatch = a.timestamp.match(/^\d{4}-\d{2}-\d{2}/);
            
            if (slashMatch) {
              // Format dd/mm/yyyy
              const [, dd, mm, yyyy] = slashMatch;
              dateA = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
            } else if (isoMatch) {
              // Format ISO (yyyy-mm-dd)
              dateA = new Date(a.timestamp);
            } else {
              // Inne formaty - spróbuj standardowego parsowania
              dateA = new Date(a.timestamp);
            }
          } else if (a.timestamp && typeof a.timestamp === 'object' && (a.timestamp as any).toDate) {
            // Firestore Timestamp
            dateA = (a.timestamp as any).toDate();
          } else {
            dateA = new Date();
          }
          
          if (typeof b.timestamp === 'string') {
            // Obsłuż różne formaty dat
            const slashMatch = b.timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            const isoMatch = b.timestamp.match(/^\d{4}-\d{2}-\d{2}/);
            
            if (slashMatch) {
              // Format dd/mm/yyyy
              const [, dd, mm, yyyy] = slashMatch;
              dateB = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
            } else if (isoMatch) {
              // Format ISO (yyyy-mm-dd)
              dateB = new Date(b.timestamp);
            } else {
              // Inne formaty - spróbuj standardowego parsowania
              dateB = new Date(b.timestamp);
            }
          } else if (b.timestamp && typeof b.timestamp === 'object' && (b.timestamp as any).toDate) {
            // Firestore Timestamp
            dateB = (b.timestamp as any).toDate();
          } else {
            dateB = new Date();
          }
          
          // Sprawdź czy daty są poprawne
          if (isNaN(dateA.getTime())) {
            console.warn('⚠️ Invalid dateA:', a.timestamp, 'for activity:', a.title);
            dateA = new Date(0);
          }
          if (isNaN(dateB.getTime())) {
            console.warn('⚠️ Invalid dateB:', b.timestamp, 'for activity:', b.title);
            dateB = new Date(0);
          }
          
          const result = dateB.getTime() - dateA.getTime();
          
          // 🔍 DEBUG: Loguj porównanie dat
          if (Math.abs(result) < 1000) { // Różnica mniejsza niż 1 sekunda
            console.log('🔍 DEBUG: Similar timestamps:', {
              activityA: { title: a.title, timestamp: a.timestamp, date: dateA.toISOString() },
              activityB: { title: b.title, timestamp: b.timestamp, date: dateB.toISOString() },
              result: result
            });
          }
          
          return result;
        } catch (error) {
          console.error('Error sorting activities:', error, 'Activity A:', a, 'Activity B:', b);
          return 0;
        }
      });
      
      // 🆕 ULEPSZONA DEDUPLIKACJA: Usuń duplikaty na podstawie ID i opisu
      const uniqueActivities = activities.filter((activity, index, self) => {
        // Sprawdź duplikaty po ID
        const isUniqueById = index === self.findIndex(a => a.id === activity.id);
        
        // Sprawdź duplikaty po opisie (dla przypadków gdzie ID może się różnić ale treść jest taka sama)
        const isUniqueByDescription = index === self.findIndex(a => 
          a.description === activity.description && 
          a.timestamp === activity.timestamp
        );
        
        return isUniqueById && isUniqueByDescription;
      });
      
      console.log(`Found ${uniqueActivities.length} unique activities (filtered from ${activities.length} total)`);
      console.log('🔍 DEBUG: Top 10 activities after sorting:', uniqueActivities.slice(0, 10).map(a => ({
        id: a.id,
        title: a.title,
        timestamp: a.timestamp,
        description: a.description,
        parsedDate: (() => {
          try {
            if (typeof a.timestamp === 'string') {
              const slashMatch = a.timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
              if (slashMatch) {
                const [, dd, mm, yyyy] = slashMatch;
                return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).toISOString();
              }
            }
            return new Date(a.timestamp).toISOString();
          } catch {
            return 'Invalid date';
          }
        })()
      })));
      
      // 🆕 DEBUG: Sprawdź czy są duplikaty w finalnej liście
      const duplicateIds = uniqueActivities.map(a => a.id).filter((id, index, self) => self.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('⚠️ WARNING: Found duplicate IDs in final activities list:', duplicateIds);
      }
      
      // Weź 10 najnowszych aktywności (od najnowszej do najstarszej)
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
              <div className="space-y-4">
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