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
    label: "Dziennik",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h2l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg>,
    href: "/homelogin/grades"
  },
  {
    label: "Instructors",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    href: "/homelogin/instructors"
  },
  {
    label: "Specjaliści",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    href: "/homelogin/specialists"
  },
  {
    label: "Zgłoś błąd platformy",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    href: "/homelogin/report-bug"
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
  const [searchPosition, setSearchPosition] = useState({ left: 0, width: 0 });





  // Oblicz pozycję i szerokość pola wyszukiwania
  useEffect(() => {
    const updateSearchPosition = () => {
      if (searchRef.current) {
        const rect = searchRef.current.getBoundingClientRect();
        setSearchPosition({
          left: rect.left,
          width: rect.width
        });
      }
    };
    
    updateSearchPosition();
    window.addEventListener('resize', updateSearchPosition);
    return () => window.removeEventListener('resize', updateSearchPosition);
  }, []);

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
    <>
      {/* Search Results Portal - rendered outside main container */}
      {searchResults.length > 0 && showSearchResults && (
        <div ref={searchRef} className="fixed top-20 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-h-96 overflow-y-auto" style={{ 
          zIndex: 999999,
          left: `${searchPosition.left}px`,
          width: `${searchPosition.width}px`
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Kolumna z kursami */}
            <div>
              <h3 className="text-sm font-bold text-[#4067EC] mb-4 pb-3 border-b border-white/20">
                Kursy ({searchResults.filter(r => r.type === 'course').length})
              </h3>
              <div className="space-y-3">
                {searchResults
                  .filter(result => result.type === 'course')
                  .map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center p-4 hover:bg-gradient-to-r hover:from-[#F1F4FE] hover:to-white cursor-pointer transition-all duration-200 rounded-xl border border-transparent hover:border-[#4067EC] hover:shadow-lg"
                      onClick={() => handleCourseClick(result.id)}
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#4067EC] to-[#5577FF] rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm truncate">{result.title}</div>
                        {result.subtitle && <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Kolumna z nauczycielami */}
            <div>
              <h3 className="text-sm font-bold text-[#4067EC] mb-4 pb-3 border-b border-white/20">
                Nauczyciele ({searchResults.filter(r => r.type === 'teacher').length})
              </h3>
              <div className="space-y-3">
                {searchResults
                  .filter(result => result.type === 'teacher')
                  .map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center p-4 hover:bg-gradient-to-r hover:from-[#F1F4FE] hover:to-white cursor-pointer transition-all duration-200 rounded-xl border border-transparent hover:border-[#4067EC] hover:shadow-lg"
                      onClick={() => handleTeacherClick(result.id)}
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mr-4 overflow-hidden shadow-lg">
                        {result.photoURL ? (
                          <Image src={result.photoURL} alt={result.title} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm truncate">{result.title}</div>
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

      {/* Notifications Portal - rendered outside main container */}
      {showNotifications && (
        <div ref={notifRef} className="fixed top-20 right-6 w-80 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 999999 }}>
          <div className="p-4 border-b border-white/20 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Powiadomienia</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
                  {notifications.filter(n => !n.read).length} nowych
                </span>
              </div>
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Brak powiadomień</p>
              <p className="text-gray-400 text-sm mt-1">Wszystko jest na bieżąco! 🎉</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((notif, index) => {
                const isUnread = !notif.read;
                
                // Różnorodne kolory dla różnych typów powiadomień
                const getNotificationColors = () => {
                  switch (notif.type) {
                    case 'assignment':
                      return {
                        bg: 'bg-blue-50',
                        border: 'border-l-blue-500',
                        icon: 'bg-blue-500',
                        text: 'text-blue-700'
                      };
                    case 'exam':
                      return {
                        bg: 'bg-red-50',
                        border: 'border-l-red-500',
                        icon: 'bg-red-500',
                        text: 'text-red-700'
                      };
                    case 'grade':
                      return {
                        bg: 'bg-green-50',
                        border: 'border-l-green-500',
                        icon: 'bg-green-500',
                        text: 'text-green-700'
                      };
                    case 'course':
                      return {
                        bg: 'bg-purple-50',
                        border: 'border-l-purple-500',
                        icon: 'bg-purple-500',
                        text: 'text-purple-700'
                      };
                    default:
                      return {
                        bg: 'bg-orange-50',
                        border: 'border-l-orange-500',
                        icon: 'bg-orange-500',
                        text: 'text-orange-700'
                      };
                  }
                };
                
                const colors = getNotificationColors();
                
                const getTypeIcon = () => {
                  switch (notif.type) {
                    case 'assignment':
                      return (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h2l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
                        </svg>
                      );
                    case 'exam':
                      return (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      );
                    case 'grade':
                      return (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      );
                    case 'course':
                      return (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      );
                    default:
                      return (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      );
                  }
                };
                
                return (
                  <li 
                    key={notif.id} 
                    className={`p-4 border-l-4 ${colors.border} ${colors.bg} hover:bg-white hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 ${colors.icon} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                        {getTypeIcon()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-bold text-sm ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notif.title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
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
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{notif.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full ${colors.text} bg-white/80 font-medium`}>
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
            <div className="p-4 border-t border-white/20 bg-gray-50/50">
              <button 
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  setHasUnread(false);
                }}
                className="w-full text-sm text-gray-600 hover:text-emerald-600 transition-colors font-medium"
              >
                Zaznacz wszystkie jako przeczytane
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 hover:bg-white hover:shadow-xl transition-all duration-200"
        >
          <svg className="w-6 h-6 text-[#4067EC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur-xl border-r border-white/20 flex flex-col min-h-screen transition-transform duration-300 ease-in-out shadow-xl`} style={{height: '100vh'}}>
        <div className="flex items-center gap-3 px-6 py-6 justify-between bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white rounded-br-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Image src="/puzzleicon.png" alt="Logo" width={24} height={24} className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">COGITO</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {sidebarLinks.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link 
                  href={item.href} 
                  className="flex items-center text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-white hover:text-[#4067EC] hover:shadow-lg cursor-pointer transition-all duration-200 hover:scale-105 text-sm shadow-sm border border-transparent hover:border-[#4067EC]/20 group"
                  target={item.href.startsWith('http') ? "_blank" : undefined}
                  rel={item.href.startsWith('http') ? "noopener noreferrer" : undefined}
                >
                  <div className="w-8 h-8 bg-[#F1F4FE] rounded-lg flex items-center justify-center mr-3 group-hover:bg-[#4067EC] group-hover:text-white transition-all duration-200">
                    {item.icon}
                  </div>
                  <span className="truncate">{item.label}</span>
                  {item.href.startsWith('http') && (
                    <svg className="w-4 h-4 ml-auto text-gray-400 group-hover:text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </Link>
              ) : (
                <div className="flex items-center text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-white hover:text-[#4067EC] hover:shadow-lg cursor-pointer transition-all duration-200 hover:scale-105 text-sm shadow-sm border border-transparent hover:border-[#4067EC]/20 group">
                  <div className="w-8 h-8 bg-[#F1F4FE] rounded-lg flex items-center justify-center mr-3 group-hover:bg-[#4067EC] group-hover:text-white transition-all duration-200">
                    {item.icon}
                  </div>
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
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col w-full lg:w-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 lg:px-8 py-6 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm relative gap-4 sm:gap-0">
          <div className="relative w-full sm:w-1/2 lg:w-1/3" ref={searchRef}>
            <div className="flex">
              <input
                type="text"
                placeholder="Szukaj kursu lub nauczyciela..."
                className="w-full px-4 py-3 rounded-l-xl border border-white/30 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:bg-white text-gray-800 font-semibold pr-10 text-sm shadow-sm"
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
                className="px-4 py-3 bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white rounded-r-xl border border-[#4067EC] hover:from-[#3155d4] hover:to-[#4067EC] focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-all duration-200 shadow-sm hover:shadow-lg"
                aria-label="Wyczyść wyszukiwanie"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            

          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  className="relative p-3 rounded-xl bg-white/60 backdrop-blur-sm hover:bg-white hover:shadow-lg cursor-pointer transition-all duration-200 border border-white/20"
                  onClick={handleNotifClick}
                  aria-label="Powiadomienia"
                >
                  <svg className="w-6 h-6 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {hasUnread && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3 p-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => router.push('/profile')}>
                <Image 
                  src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&h=256&facepad=2" 
                  alt="Profile" 
                  width={32} 
                  height={32} 
                  className="w-8 h-8 rounded-full border-2 border-[#4067EC] object-cover" 
                />
                <span className="text-sm font-semibold text-gray-700 hidden sm:block">Profil</span>
              </div>
              <button onClick={logout} className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-lg text-sm font-semibold">Wyloguj się</button>
            </div>
          </div>
        </header>
        
        {/* Dashboard grid */}
        <div className="flex-1 p-6 lg:p-8">
          {/* Main dashboard */}
          <section className="space-y-6 lg:space-y-8">
            {/* Progress & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Shortcut/statystyka do statystyk profilu */}
              <div className="lg:col-span-1">
                <a href="/profile/statistics" className="block bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 cursor-pointer border border-white/20 hover:border-[#4067EC] h-full group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-gradient-to-r from-[#4067EC] to-[#5577FF] p-3 rounded-xl text-white shadow-lg">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4" /></svg>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Statystyki profilu</div>
                      <div className="text-xl font-bold text-gray-800 group-hover:text-[#4067EC] transition-colors">Zobacz szczegóły &rarr;</div>
                    </div>
                  </div>
                  <div className="h-32 flex items-center justify-center">
                    <svg viewBox="0 0 200 80" className="w-full h-24">
                      <rect x="20" y="40" width="20" height="30" fill="url(#gradient)" rx="4" />
                      <rect x="50" y="30" width="20" height="40" fill="url(#gradient)" rx="4" />
                      <rect x="80" y="20" width="20" height="50" fill="url(#gradient)" rx="4" />
                      <rect x="110" y="10" width="20" height="60" fill="url(#gradient)" rx="4" />
                      <rect x="140" y="25" width="20" height="45" fill="url(#gradient)" rx="4" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{stopColor: '#4067EC'}} />
                          <stop offset="100%" style={{stopColor: '#5577FF'}} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </a>
              </div>

              {/* Chat with Teacher */}
              <div className="lg:col-span-1">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 h-full border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl text-white shadow-lg">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Napisz do nauczyciela</h2>
                  </div>
                  <form className="flex flex-col gap-4" onSubmit={handleSendMessage}>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Wybierz nauczyciela</label>
                      <select
                        className="w-full border border-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#4067EC] bg-white/60 backdrop-blur-sm text-gray-800 font-medium text-sm shadow-sm"
                        required
                        value={selectedTeacher}
                        onChange={e => setSelectedTeacher(e.target.value)}
                      >
                        <option value="">-- Wybierz nauczyciela --</option>
                        {teachers.map(t => (
                          <option key={t.uid} value={t.uid}>{t.displayName || t.email} | {t.subject || 'przedmiot'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Wiadomość</label>
                      <textarea
                        className="w-full border border-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#4067EC] resize-none min-h-[100px] max-h-[200px] bg-white/60 backdrop-blur-sm text-gray-800 font-medium placeholder-gray-400 text-sm shadow-sm"
                        maxLength={2000}
                        placeholder="Napisz wiadomość..."
                        required
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Załącz pliki (max 3, jpg/png/pdf, max 30MB)</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="w-full border border-white/30 rounded-xl px-4 py-3 text-sm bg-white/60 backdrop-blur-sm shadow-sm"
                        multiple
                        onChange={handleFileChange}
                        disabled={selectedFiles.length >= 3}
                      />
                      {fileError && <div className="text-red-500 text-sm mt-2">{fileError}</div>}
                      <ul className="mt-2 space-y-2">
                        {selectedFiles.map((file) => (
                          <li key={file.name} className="flex items-center justify-between bg-white/40 rounded-lg p-2 text-sm text-gray-700">
                            <span className="font-medium">{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span>
                            <button type="button" className="text-red-500 hover:text-red-700 font-semibold" onClick={() => handleRemoveFile(selectedFiles.indexOf(file))}>Usuń</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {sendSuccess && <div className="text-green-600 text-sm bg-green-50 rounded-lg p-3">{sendSuccess}</div>}
                    {sendError && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{sendError}</div>}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 hover:from-[#3155d4] hover:to-[#4067EC] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      disabled={!!fileError || selectedFiles.length > 3 || sending}
                    >
                      {sending ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Ankiety */}
              <div className="lg:col-span-1">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 h-full flex flex-col justify-between border border-white/20">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-xl text-white shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-bold text-gray-800">Ankiety</h2>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Twoja opinia jest dla nas bardzo ważna! Pomóż nam rozwijać platformę.</p>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-gradient-to-r from-[#4067EC] to-[#5577FF] p-3 rounded-xl text-white shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 font-medium">Wypełnij ankiety</div>
                        <div className="text-base font-semibold text-gray-800">Pomóż nam się rozwijać</div>
                      </div>
                    </div>
                  </div>
                  <a 
                    href="/homelogin/ankiety" 
                    className="inline-flex items-center justify-center bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#3155d4] hover:to-[#4067EC] transition-all duration-200 hover:shadow-lg w-full group shadow-md"
                  >
                    <span className="text-white font-bold">Przejdź do ankiet</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Top Courses (przypisane do użytkownika) */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 rounded-xl text-white shadow-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Moje kursy</h2>
              </div>
              {loadingAssigned ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  <span className="ml-3 text-emerald-600 font-medium">Ładowanie kursów...</span>
                </div>
              ) : assignedCourses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Nie przypisano żadnych kursów.</p>
                  <p className="text-gray-400 text-sm mt-1">Skontaktuj się z nauczycielem, aby zostać dodanym do kursu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignedCourses.map((course, index) => {
                    const colors = [
                      'from-emerald-500 to-emerald-600',
                      'from-orange-500 to-orange-600', 
                      'from-purple-500 to-purple-600',
                      'from-pink-500 to-pink-600',
                      'from-indigo-500 to-indigo-600',
                      'from-teal-500 to-teal-600'
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <div key={course.id} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-xl transition-all duration-300 group hover:border-gray-200">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`w-16 h-16 bg-gradient-to-r ${colorClass} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                            <Image src="/thumb.png" alt={course.title} width={32} height={32} className="w-8 h-8 rounded" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-base truncate group-hover:text-gray-900 transition-colors">{course.title}</h3>
                            {course.category_name && (
                              <p className="text-sm text-gray-500 truncate mt-1">{course.category_name}</p>
                            )}
                          </div>
                        </div>
                        <Link href={`/courses/${course.slug || course.id}`}>
                          <button className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg group-hover:scale-105 border border-slate-500/20">
                            Otwórz kurs
                          </button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Kalendarz */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-3 rounded-xl text-white shadow-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Kalendarz i Aktywności</h2>
              </div>
              <Calendar />
            </div>
          </section>
        </div>
      </main>
    </div>
    </>
  );
}
