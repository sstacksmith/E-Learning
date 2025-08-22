"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Calendar from '../../components/Calendar';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';


import Providers from '@/components/Providers';

// Add Course interface
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
  is_featured: boolean;
  assignedUsers?: string[];
  firebase_id?: string;
}

// Add Teacher interface
interface Teacher {
  uid: string;
  displayName: string;
  email: string;
  subject: string;
  role: string;
  photoURL?: string;
}

// Add SearchResult interface
interface SearchResult {
  type: 'course' | 'teacher';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  photoURL?: string;
}

// Function to get sidebar links based on user role
const getSidebarLinks = (userRole?: string) => {
  const baseLinks = [
    {
      label: "Moje kursy",
      icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4M4 7h16" /></svg>,
      href: "/homelogin/my-courses"
    },
    {
      label: "Plan lekcji",
      icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      href: "/homelogin/schedule"
    }
  ];

  // Add group chat with appropriate link based on role
  baseLinks.push({
    label: "Czat grupowy",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    href: userRole === 'teacher' ? "/homelogin/teacher/group-chats" : "/homelogin/group-chats"
  });

  baseLinks.push(
  {
    label: "Biblioteka",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H6a2 2 0 01-2-2V6a2 2 0 012-2h6" /></svg>,
    href: "/homelogin/library"
  },
  {
    label: "Dziennik",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h2l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg>,
    href: "/homelogin/grades"
  },
  {
    label: "Instructors",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    href: "/homelogin/instructors/tutors"
  },
  {
    label: "Ankiety",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
    href: "/homelogin/ankiety"
  },
  {
    label: "ZPE.gov.pl",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    href: "https://zpe.gov.pl"
  },
  {
    label: "Support & FAQs",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    href: "/homelogin/support"
  });
  
  return baseLinks;
};



const podstawoweKursy = [
  'Język polski',
  'Język angielski',
  'Język hiszpański',
  'Filozofia',
  'Matematyka',
  'Historia',
  'Historia i Teraźniejszość',
  'Biznes i Zarządzanie',
  'Podstawy Przedsiębiorczości',
  'Edukacja dla Bezpieczeństwa',
  'Biologia',
  'Chemia',
  'Fizyka',
  'Geografia',
  'Informatyka',
  'Wychowanie fizyczne',
];
const dodatkoweKursy = [
  'mindfunless',
  'mikroekspresja',
  'gotowanie',
  'szachy',
  'zarzadzanie',
  'podstawy prawa',
  'dietetyka',
  'psychologia',
  'pedagogika',
  'neurodydaktyka',
  'dziennikarstwo',
  'rysunek',
  'ikigai',
  'rodzicielstwo',
  'social media',
];
const wszystkieKursy = [...podstawoweKursy, ...dodatkoweKursy];

function DashboardPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      console.log('HomeLogin useEffect - User:', user, 'Role:', user.role);
      // Przekieruj na podstawie roli użytkownika
      if (user.role === 'teacher') {
        console.log('Redirecting teacher to /homelogin/teacher');
        router.replace('/homelogin/teacher');
      } else if (user.role === 'admin') {
        console.log('Redirecting admin to /homelogin/superadmin');
        router.replace('/homelogin/superadmin');
      } else if (user.role === 'parent') {
        console.log('Redirecting parent to /homelogin/parent');
        router.replace('/homelogin/parent');
      } else {
        // Student - zostaje na tej stronie
        console.log('User is student, staying on dashboard');
      }
    } else {
      console.log('HomeLogin useEffect - Loading:', loading, 'User:', user);
    }
  }, [user, loading, router]);

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardPageContent />
    </Providers>
  );
}

function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  console.log('user in Dashboard:', user);
  
  // Get sidebar links based on user role
  const sidebarLinks = getSidebarLinks(user?.role);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  interface Notification {
    id: string;
    title: string;
    description?: string;
    deadline: string;
    isOverdue?: boolean;
    students?: string[];
    type?: 'assignment' | 'exam' | 'announcement' | 'grade' | 'course';
    courseId?: string;
    courseTitle?: string;
    actionUrl?: string;
    priority?: 'low' | 'medium' | 'high';
    read?: boolean;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);





  // Pobierz kursy przypisane do użytkownika
  useEffect(() => {
    if (!user) return;
    const fetchAssignedCourses = async () => {
      setLoadingAssigned(true);
      try {
        // Pobierz wszystkie kursy z Firestore
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        
        console.log('All courses from Firestore:', coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Filtruj kursy, do których użytkownik jest przypisany
        const assigned = coursesSnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            firebase_id: doc.id,
            ...doc.data() 
          } as unknown as Course))
          .filter(course => {
            const assignedUsers = course.assignedUsers || [];
            console.log(`Course ${course.title} assignedUsers:`, assignedUsers, 'User:', user.uid, user.email);
            return assignedUsers.includes(user.uid) || assignedUsers.includes(user.email);
          });
        
        console.log('Assigned courses for user:', user.uid, assigned);
        setAssignedCourses(assigned);
      } catch (error) {
        console.error('Error fetching assigned courses:', error);
        setAssignedCourses([]);
      } finally {
        setLoadingAssigned(false);
      }
    };
    fetchAssignedCourses();
  }, [user]);

  // Pobierz nauczycieli z Firestore
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        console.log('All users from Firestore:', usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const teachersList = usersSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              uid: doc.id,
              displayName: data.displayName || '',
              email: data.email || '',
              subject: data.subject || '',
              role: data.role || '',
              photoURL: data.photoURL || '',
            };
          })
          .filter(user => user.role === 'teacher' || user.role === 'tutor');
        
        console.log('Filtered teachers:', teachersList);
        setTeachers(teachersList);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        setTeachers([]);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  // Nowa funkcja wyszukiwania - wyświetla wszystko na początku
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    
    // Zawsze pokazuj wyniki, nawet przy pustym polu
    const results: SearchResult[] = [];
    
    if (value.length === 0) {
      // Pokaż wszystkie kursy i nauczycieli
      assignedCourses.forEach(course => {
        results.push({
          type: 'course',
          id: course.firebase_id || course.id.toString(),
          title: course.title,
          subtitle: course.category_name,
          description: course.description,
          photoURL: course.thumbnail
        });
      });
      
      teachers.forEach(teacher => {
        results.push({
          type: 'teacher',
          id: teacher.uid,
          title: teacher.displayName,
          subtitle: teacher.subject,
          description: teacher.email,
          photoURL: teacher.photoURL
        });
      });
    } else {
      // Filtruj na podstawie wyszukiwania
      // Wyszukaj w kursach przypisanych do użytkownika
      assignedCourses.forEach(course => {
        const title = course.title?.toLowerCase() || '';
        const description = course.description?.toLowerCase() || '';
        const searchTerm = value.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
          results.push({
            type: 'course',
            id: course.firebase_id || course.id.toString(),
            title: course.title,
            subtitle: course.category_name,
            description: course.description,
            photoURL: course.thumbnail
          });
        }
      });
      
      // Wyszukaj w nauczycielach/tutorach
      teachers.forEach(teacher => {
        const name = teacher.displayName?.toLowerCase() || '';
        const email = teacher.email?.toLowerCase() || '';
        const subject = teacher.subject?.toLowerCase() || '';
        const searchTerm = value.toLowerCase();
        
        if (name.includes(searchTerm) || email.includes(searchTerm) || subject.includes(searchTerm)) {
          results.push({
            type: 'teacher',
            id: teacher.uid,
            title: teacher.displayName,
            subtitle: teacher.subject,
            description: teacher.email,
            photoURL: teacher.photoURL
          });
        }
      });
    }
    
    setSearchResults(results);
    setShowSearchResults(true);
  };

  // Funkcja do pokazania wszystkich wyników przy focusie
  const handleSearchFocus = () => {
    if (search.length === 0) {
      const results: SearchResult[] = [];
      
      // Dodaj wszystkie kursy
      assignedCourses.forEach(course => {
        results.push({
          type: 'course',
          id: course.firebase_id || course.id.toString(),
          title: course.title,
          subtitle: course.category_name,
          description: course.description,
          photoURL: course.thumbnail
        });
      });
      
      // Dodaj wszystkich nauczycieli
      teachers.forEach(teacher => {
        results.push({
          type: 'teacher',
          id: teacher.uid,
          title: teacher.displayName,
          subtitle: teacher.subject,
          description: teacher.email,
          photoURL: teacher.photoURL
        });
      });
      
      setSearchResults(results);
      setShowSearchResults(true);
    }
  };

  // Funkcja nawigacji do kursu
  const handleCourseClick = (courseId: string) => {
    console.log('Navigating to course:', courseId);
    // Sprawdź czy kurs ma slug, jeśli nie użyj ID
    const course = assignedCourses.find(c => (c.firebase_id || c.id.toString()) === courseId);
    if (course && course.slug) {
      console.log('Using slug for navigation:', course.slug);
      router.push(`/courses/${course.slug}`);
    } else {
      console.log('Using ID for navigation:', courseId);
      router.push(`/courses/${courseId}`);
    }
    setSearch('');
    setShowSearchResults(false);
  };

  // Funkcja nawigacji do profilu nauczyciela
  const handleTeacherClick = (teacherId: string) => {
    console.log('Navigating to teacher:', teacherId);
    // Przejdź do strony nauczycieli z możliwością filtrowania
    router.push(`/homelogin/instructors/tutors?teacher=${teacherId}`);
    setSearch('');
    setShowSearchResults(false);
  };

  // Obsługa kliknięć poza wyszukiwarką
  useEffect(() => {
    if (!showSearchResults) return;
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Pobierz eventy jako powiadomienia
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      let eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Student widzi tylko swoje eventy
      if (user.role === 'student') {
        eventsList = eventsList.filter((ev) => (ev as Notification).students && (ev as Notification).students?.includes(user.uid));
      }

      // Sortuj po dacie malejąco
      eventsList.sort((a, b) => new Date((b as Notification).deadline).getTime() - new Date((a as Notification).deadline).getTime());
      
      // Dodaj informację o przekroczonym terminie i wzbogac dane
      const now = new Date();
      eventsList = eventsList.map((ev) => {
        const deadline = new Date((ev as Notification).deadline);
        const isOverdue = deadline < now;
        const timeDiff = deadline.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Określ priorytet na podstawie czasu do deadline
        let priority: 'low' | 'medium' | 'high' = 'low';
        if (isOverdue) priority = 'high';
        else if (daysDiff <= 3) priority = 'high';
        else if (daysDiff <= 7) priority = 'medium';
        
        // Określ typ powiadomienia na podstawie tytułu
        let type: 'assignment' | 'exam' | 'announcement' | 'grade' | 'course' = 'announcement';
        const title = (ev as Notification).title.toLowerCase();
        if (title.includes('zadanie') || title.includes('assignment')) type = 'assignment';
        else if (title.includes('egzamin') || title.includes('exam') || title.includes('test')) type = 'exam';
        else if (title.includes('ocena') || title.includes('grade')) type = 'grade';
        else if (title.includes('kurs') || title.includes('course')) type = 'course';
        
        return {
          ...ev,
          isOverdue,
          priority,
          type,
          read: false
        };
      });

      setNotifications(eventsList as Notification[]);
      
      // Sprawdź, czy są nieprzeczytane
      const lastRead = localStorage.getItem('lastNotifRead');
      if (!lastRead || eventsList.length > 0 && eventsList[0].id !== lastRead) {
        setHasUnread(true);
      } else {
        setHasUnread(false);
      }
    };
    fetchNotifications();
  }, [user]);

  // Obsługa wysyłki maila
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccess(null);
    setSendError(null);
    setSending(true);
    try {
      const teacher = teachers.find(t => t.uid === selectedTeacher);
      if (!teacher) throw new Error('Nie wybrano nauczyciela.');
      // Przygotuj dane do wysyłki
      const formData = new FormData();
      formData.append('to', teacher.email);
      formData.append('subject', `Wiadomość od ucznia przez platformę`);
      formData.append('body', message);
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
          formData.append('attachments', file, file.name);
        });
      }
      // Wywołaj endpoint backendu (np. /api/send-email)
      const res = await fetch('/api/send-email', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Błąd wysyłki maila.');
      setSendSuccess('Wiadomość została wysłana!');
      setMessage('');
      setSelectedFiles([]);
      setSelectedTeacher('');
    } catch (err) {
      setSendError((err as Error).message || 'Błąd wysyłki.');
    } finally {
      setSending(false);
    }
  };

  // Funkcja do obsługi kliknięcia w powiadomienie
  const handleNotificationClick = (notification: Notification) => {
    // Zaznacz jako przeczytane
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
    
    // Sprawdź czy są nieprzeczytane powiadomienia
    const unreadCount = notifications.filter(n => !n.read).length;
    setHasUnread(unreadCount > 1);
    
    // Nawiguj do odpowiedniej strony
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    } else if (notification.courseId) {
      // Znajdź kurs i nawiguj do niego
      const course = assignedCourses.find(c => (c.firebase_id || c.id.toString()) === notification.courseId);
      if (course && course.slug) {
        router.push(`/courses/${course.slug}`);
      } else if (notification.courseId) {
        router.push(`/courses/${notification.courseId}`);
      }
    } else if (notification.type === 'grade') {
      router.push('/homelogin/grades');
    } else if (notification.type === 'course') {
      router.push('/homelogin/my-courses');
    }
    
    // Zamknij dropdown powiadomień
    setShowNotifications(false);
  };

  // Zaznacz powiadomienia jako przeczytane po otwarciu
  const handleNotifClick = () => {
    setShowNotifications((prev) => !prev);
    if (notifications.length > 0) {
      localStorage.setItem('lastNotifRead', notifications[0].id);
      setHasUnread(false);
    }
  };

  useEffect(() => {
    if (!showNotifications) return;
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    // Sprawdź liczbę plików
    if (files.length + selectedFiles.length > 3) {
      setFileError('Możesz dodać maksymalnie 3 pliki.');
      return;
    }
    // Sprawdź typy i sumę rozmiarów
    const allFiles = [...selectedFiles, ...files];
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    let totalSize = 0;
    for (const file of allFiles) {
      if (!allowedTypes.includes(file.type)) {
        setFileError('Dozwolone są tylko pliki JPG, PNG lub PDF.');
        return;
      }
      totalSize += file.size;
    }
    if (totalSize > 30 * 1024 * 1024) {
      setFileError('Łączny rozmiar plików nie może przekraczać 30 MB.');
      return;
    }
    setFileError(null);
    setSelectedFiles(allFiles);
  };

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] opacity-100">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <svg className="w-6 h-6 text-[#4067EC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r-2 border-gray-200 flex flex-col min-h-screen transition-transform duration-300 ease-in-out`} style={{height: '100vh'}}>
        <div className="flex items-center gap-2 px-4 sm:px-6 py-4 sm:py-6 justify-between">
          <div className="flex items-center gap-2">
            <Image src="/puzzleicon.png" alt="Logo" width={28} height={28} className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-lg sm:text-xl font-bold text-[#4067EC]">COGITO</span>
          </div>
        </div>
        <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2">
          {sidebarLinks.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link 
                  href={item.href} 
                  className="flex items-center text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-[#F1F4FE] cursor-pointer transition duration-200 hover:scale-105 text-sm sm:text-base"
                  target={user?.role === 'student' ? undefined : "_blank"}
                  rel={user?.role === 'student' ? undefined : "noopener noreferrer"}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {user?.role !== 'student' && (
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </Link>
              ) : (
                <div className="flex items-center text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-[#F1F4FE] cursor-pointer transition duration-200 hover:scale-105 text-sm sm:text-base">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
              )}

            </div>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col w-full lg:w-auto bg-[#F8F9FB] opacity-100">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white border-b border-gray-200 relative gap-3 sm:gap-0">
          <div className="relative w-full sm:w-1/2 lg:w-1/3" ref={searchRef}>
            <div className="flex">
              <input
                type="text"
                placeholder="Szukaj kursu lub nauczyciela..."
                className="w-full px-3 sm:px-4 py-2 rounded-l-lg border border-gray-200 border-r-0 focus:outline-none focus:ring-2 focus:ring-[#4067EC] text-[#222] font-semibold pr-10 text-sm sm:text-base"
                value={search}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
              />
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setShowSearchResults(false);
                  setSearchResults([]);
                }}
                className="px-2 sm:px-3 py-2 bg-[#4067EC] text-white rounded-r-lg border border-[#4067EC] hover:bg-[#3155d4] focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors"
                aria-label="Wyczyść wyszukiwanie"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {searchResults.length > 0 && showSearchResults && (
              <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 z-50 shadow-lg max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {/* Kolumna z kursami */}
                  <div>
                    <h3 className="text-sm font-bold text-[#4067EC] mb-3 pb-2 border-b border-gray-200">
                      Kursy ({searchResults.filter(r => r.type === 'course').length})
                    </h3>
                    <div className="space-y-2">
                      {searchResults
                        .filter(result => result.type === 'course')
                        .map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center p-3 hover:bg-[#F1F4FE] cursor-pointer transition rounded-lg border border-transparent hover:border-[#4067EC]"
                            onClick={() => handleCourseClick(result.id)}
                          >
                            <div className="flex-shrink-0 w-10 h-10 bg-[#4067EC] rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[#1a237e] text-sm truncate">{result.title}</div>
                              {result.subtitle && <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Kolumna z nauczycielami */}
                  <div>
                    <h3 className="text-sm font-bold text-[#4067EC] mb-3 pb-2 border-b border-gray-200">
                      Nauczyciele ({searchResults.filter(r => r.type === 'teacher').length})
                    </h3>
                    <div className="space-y-2">
                      {searchResults
                        .filter(result => result.type === 'teacher')
                        .map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center p-3 hover:bg-[#F1F4FE] cursor-pointer transition rounded-lg border border-transparent hover:border-[#4067EC]"
                            onClick={() => handleTeacherClick(result.id)}
                          >
                            <div className="flex-shrink-0 w-10 h-10 bg-[#4CAF50] rounded-full flex items-center justify-center mr-3 overflow-hidden">
                              {result.photoURL ? (
                                <Image src={result.photoURL} alt={result.title} width={40} height={40} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                  </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[#1a237e] text-sm truncate">{result.title}</div>
                              {result.subtitle && <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>}
                              {result.description && <div className="text-xs text-gray-700 truncate">{result.description}</div>}
                </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <button
                  className="relative p-1.5 sm:p-2 rounded-full hover:bg-[#F1F4FE] cursor-pointer transition-colors duration-200"
                  onClick={handleNotifClick}
                  aria-label="Powiadomienia"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {hasUnread && (
                    <span className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                {showNotifications && (
                  <div ref={notifRef} className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm sm:text-base">Powiadomienia</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {notifications.filter(n => !n.read).length} nowych
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Brak powiadomień</p>
                        <p className="text-gray-400 text-xs mt-1">Wszystko jest na bieżąco!</p>
                      </div>
                    ) : (
                      <ul className="max-h-96 overflow-y-auto">
                        {notifications.map((notif, index) => {
                          const isUnread = !notif.read;
                          const getPriorityColor = () => {
                            if (notif.priority === 'high') return 'border-l-red-500 bg-red-50';
                            if (notif.priority === 'medium') return 'border-l-orange-500 bg-orange-50';
                            return 'border-l-blue-500 bg-blue-50';
                          };
                          
                          const getTypeIcon = () => {
                            switch (notif.type) {
                              case 'assignment':
                                return (
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h2l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
                                  </svg>
                                );
                              case 'exam':
                                return (
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                );
                              case 'grade':
                                return (
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                );
                              default:
                                return (
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                );
                            }
                          };
                          
                          return (
                            <li 
                              key={notif.id} 
                              className={`p-4 border-l-4 ${getPriorityColor()} hover:bg-white hover:shadow-md transition-colors duration-200 cursor-pointer`}
                              onClick={() => handleNotificationClick(notif)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUnread ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                  {getTypeIcon()}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-semibold text-sm ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                      {notif.title}
                                    </h4>
                                    {isUnread && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500 mb-2">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>
                                        {new Date(notif.deadline).toLocaleString('pl-PL', { 
                                year: 'numeric',
                                          month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                                      </span>
                              {notif.isOverdue && (
                                        <span className="text-red-600 font-bold text-xs">⚠️ Po terminie</span>
                              )}
                            </div>
                                  </div>
                                  
                            {notif.description && (
                                    <p className="text-xs text-gray-600 line-clamp-2">{notif.description}</p>
                                  )}
                                  
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/60 text-gray-600">
                                      {notif.type === 'assignment' ? 'Zadanie' : 
                                       notif.type === 'exam' ? 'Egzamin' : 
                                       notif.type === 'grade' ? 'Ocena' : 
                                       notif.type === 'course' ? 'Kurs' : 'Ogłoszenie'}
                                    </span>
                                    <span className="text-xs text-gray-400">Kliknij aby przejść →</span>
                                  </div>
                                </div>
                              </div>
                          </li>
                          );
                        })}
                      </ul>
                    )}
                    
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50">
                        <button 
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            setHasUnread(false);
                          }}
                          className="w-full text-xs text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Zaznacz wszystkie jako przeczytane
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Image 
                src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&h=256&facepad=2" 
                alt="Profile" 
                width={32} 
                height={32} 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#4067EC] object-cover cursor-pointer" 
                onClick={() => router.push('/profile')} 
              />
              <button onClick={logout} className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs sm:text-sm">Wyloguj się</button>
            </div>
          </div>
        </header>
        
        {/* Dashboard grid */}
        <div className="flex-1 p-3 sm:p-4 lg:p-8 bg-[#F8F9FB]">
          {/* Main dashboard */}
          <section className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Progress & Chart */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
              {/* Shortcut/statystyka do statystyk profilu */}
              <div className="w-1/3">
                <a href="/profile/statistics" className="block bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg transition cursor-pointer border-2 border-[#e3eafe] hover:border-[#4067EC] h-full">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="bg-[#F1F4FE] p-2 sm:p-3 rounded-lg">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4" /></svg>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Statystyki profilu</div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Zobacz szczegóły &rarr;</div>
                    </div>
                  </div>
                  <div className="h-24 sm:h-32 flex items-center justify-center">
                    <svg viewBox="0 0 200 80" className="w-full h-20 sm:h-24">
                      <rect x="20" y="40" width="20" height="30" fill="#4067EC" rx="4" />
                      <rect x="50" y="30" width="20" height="40" fill="#4067EC" rx="4" />
                      <rect x="80" y="20" width="20" height="50" fill="#4067EC" rx="4" />
                      <rect x="110" y="10" width="20" height="60" fill="#4067EC" rx="4" />
                      <rect x="140" y="25" width="20" height="45" fill="#4067EC" rx="4" />
                    </svg>
                  </div>
                </a>
              </div>

              {/* Chat with Teacher */}
              <div className="w-1/3">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-6 h-full">
                  <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Napisz do nauczyciela</h2>
                  <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleSendMessage}>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700">Wybierz nauczyciela</label>
                    <select
                      className="border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-[#4067EC] bg-white text-[#1a237e] font-semibold text-xs sm:text-sm"
                      required
                      value={selectedTeacher}
                      onChange={e => setSelectedTeacher(e.target.value)}
                    >
                      <option value="">-- Wybierz --</option>
                      {teachers.map(t => (
                        <option key={t.uid} value={t.uid}>{t.displayName || t.email} | {t.subject || 'przedmiot'} | {t.email}</option>
                      ))}
                    </select>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700">Wiadomość (max 300 słów)</label>
                    <textarea
                      className="border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-[#4067EC] resize-none min-h-[60px] sm:min-h-[80px] max-h-[200px] bg-white text-[#1a237e] font-semibold placeholder-gray-400 text-xs sm:text-sm"
                      maxLength={2000}
                      placeholder="Napisz wiadomość..."
                      required
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                    />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs sm:text-sm font-semibold text-gray-700">Załącz pliki (max 3, jpg/png/pdf, max 30MB łącznie)</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
                        multiple
                        onChange={handleFileChange}
                        disabled={selectedFiles.length >= 3}
                      />
                      {fileError && <div className="text-red-500 text-xs mt-1">{fileError}</div>}
                      <ul className="mt-1 space-y-1">
                        {selectedFiles.map((file) => (
                          <li key={file.name} className="flex items-center gap-2 text-xs text-[#1a237e] font-semibold">
                            <span>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span>
                            <button type="button" className="text-red-500 hover:underline" onClick={() => handleRemoveFile(selectedFiles.indexOf(file))}>Usuń</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </form>
                  {sendSuccess && <div className="text-green-600 text-xs sm:text-sm mt-1">{sendSuccess}</div>}
                  {sendError && <div className="text-red-600 text-xs sm:text-sm mt-1">{sendError}</div>}
                  <button
                    type="submit"
                    className="bg-[#4067EC] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105 mt-2 text-xs sm:text-sm"
                    disabled={!!fileError || selectedFiles.length > 3 || sending}
                  >{sending ? 'Wysyłanie...' : 'Wyślij'}</button>
                </div>
              </div>

              {/* Ankiety */}
              <div className="w-1/3">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-6 h-full flex flex-col justify-between">
                    <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Ankiety</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mb-4">Twoja opinia jest dla nas ważna!</p>
                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                      <div className="bg-[#F1F4FE] p-2 sm:p-3 rounded-lg">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-500">Wypełnij ankiety</div>
                        <div className="text-sm sm:text-base font-semibold text-gray-800">Pomóż nam się rozwijać</div>
                      </div>
                    </div>
                  </div>
                  <a 
                    href="/homelogin/ankiety" 
                    className="inline-flex items-center bg-[#4067EC] text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#3050b3] transition duration-200 hover:scale-105 w-full justify-center"
                  >
                    Przejdź do ankiet
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Top Courses (przypisane do użytkownika) */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-6">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-800">Moje kursy</h2>
              </div>
              {loadingAssigned ? (
                <div className="text-[#4067EC] text-sm">Ładowanie kursów...</div>
              ) : assignedCourses.length === 0 ? (
                <div className="text-gray-500 text-sm">Nie przypisano żadnych kursów.</div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {assignedCourses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between bg-[#F1F4FE] rounded-lg p-2 sm:p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Image src="/thumb.png" alt={course.title} width={32} height={32} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
                        <span className="font-medium text-gray-800 text-sm sm:text-base">{course.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/courses/${course.slug || course.id}`}>
                          <button className="bg-[#4067EC] text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105">Otwórz</button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Kalendarz */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Kalendarz i Aktywności</h2>
              <Calendar />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
