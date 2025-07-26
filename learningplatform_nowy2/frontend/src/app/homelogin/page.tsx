"use client";
import { useState, useEffect, useRef, useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Calendar from '../../components/Calendar';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addDoc } from 'firebase/firestore';

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
}

const sidebarLinks = [
  {
    label: "Moje kursy",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4M4 7h16" /></svg>,
    href: "/homelogin/my-courses"
  },
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
    sub: [
      { label: "Tutors", href: "/homelogin/instructors/tutors" }
    ],
  },
  {
    label: "Ankiety",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
    href: "/homelogin/ankiety"
  },
  {
    label: "ZPE.gov.pl",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    href: "https://zpe.gov.pl",
    external: true
  },
  {
    label: "Support & FAQs",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    href: "/homelogin/support"
  },
  {
    label: "Wszystkie kursy",
    icon: <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
    href: "/courses"
  },
];

const topCourses = [
  { title: "Advanced Mathematics", price: "19,99zł", img: "/thumb.png" },
  { title: "Physics Fundamentals", price: "29,99zł", img: "/thumb.png" },
  { title: "Chemistry Basics", price: "14,99zł", img: "/thumb.png" },
  { title: "Biology Essentials", price: "24,99zł", img: "/thumb.png" },
];

const bestSellers = [
  { title: "Top Course - Mathematics", img: "/thumb.png" },
  { title: "Top Course - Physics", img: "/thumb.png" },
  { title: "Top Course - Chemistry", img: "/thumb.png" },
];

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
      // Przekieruj na podstawie roli użytkownika
      if (user.role === 'teacher') {
        router.replace('/homelogin/teacher');
      } else if (user.role === 'admin') {
        router.replace('/homelogin/superadmin');
      } else {
        // Student - zostaje na tej stronie
        console.log('User is student, staying on dashboard');
      }
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
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [userData, setUserData] = useState({
    username: 'Student',
    role: 'Student',
    profileImage: '/puzzleicon.png'
  });
  // Add state for courses
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update user data when auth context changes
  useEffect(() => {
    if (user) {
      setUserData({
        username: user.email,
        role: user.role === 'teacher' ? 'Teacher' : user.role === 'admin' ? 'Admin' : 'Student',
        profileImage: '/puzzleicon.png'
      });
    }
  }, [user]);

  // Add useEffect to fetch courses
  useEffect(() => {
    console.log('Dashboard useEffect, user:', user);
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const response = await fetch('/api/courses/', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          console.warn('Backend API not available or token invalid. Using mock data.');
          // Użyj danych zastępczych jeśli backend nie działa
          const mockCourses: Course[] = [
            { 
              id: 1, 
              title: 'Matematyka Rozszerzona', 
              slug: 'matematyka-rozszerzona',
              description: 'Kurs matematyki na poziomie rozszerzonym',
              thumbnail: '/puzzleicon.png',
              level: 'Rozszerzony',
              category: 1,
              category_name: 'Matematyka',
              instructor: 1,
              instructor_name: 'Dr Jan Kowalski',
              is_featured: true
            },
            { 
              id: 2, 
              title: 'Fizyka Podstawowa', 
              slug: 'fizyka-podstawowa',
              description: 'Podstawy fizyki dla licealistów',
              thumbnail: '/puzzleicon.png',
              level: 'Podstawowy',
              category: 2,
              category_name: 'Fizyka',
              instructor: 2,
              instructor_name: 'Prof. Anna Nowak',
              is_featured: true
            },
            { 
              id: 3, 
              title: 'Chemia Organiczna', 
              slug: 'chemia-organiczna',
              description: 'Wprowadzenie do chemii organicznej',
              thumbnail: '/puzzleicon.png',
              level: 'Rozszerzony',
              category: 3,
              category_name: 'Chemia',
              instructor: 3,
              instructor_name: 'Dr Piotr Wiśniewski',
              is_featured: false
            },
            { 
              id: 4, 
              title: 'Biologia Molekularna', 
              slug: 'biologia-molekularna',
              description: 'Podstawy biologii molekularnej',
              thumbnail: '/puzzleicon.png',
              level: 'Rozszerzony',
              category: 4,
              category_name: 'Biologia',
              instructor: 4,
              instructor_name: 'Dr Maria Krawczyk',
              is_featured: true
            }
          ];
          setRecommendedCourses(mockCourses.slice(0, 3));
          return;
        }
        const data = await response.json();
        // Set recommended courses (can be filtered for featured or random selection)
        setRecommendedCourses(data.slice(0, 3)); // Take first 3 courses as recommended
      } catch (err) {
        console.warn('Error fetching courses, using mock data:', err);
        // Użyj danych zastępczych w przypadku błędu
        const mockCourses: Course[] = [
          { 
            id: 1, 
            title: 'Matematyka Rozszerzona', 
            slug: 'matematyka-rozszerzona',
            description: 'Kurs matematyki na poziomie rozszerzonym',
            thumbnail: '/puzzleicon.png',
            level: 'Rozszerzony',
            category: 1,
            category_name: 'Matematyka',
            instructor: 1,
            instructor_name: 'Dr Jan Kowalski',
            is_featured: true
          },
          { 
            id: 2, 
            title: 'Fizyka Podstawowa', 
            slug: 'fizyka-podstawowa',
            description: 'Podstawy fizyki dla licealistów',
            thumbnail: '/puzzleicon.png',
            level: 'Podstawowy',
            category: 2,
            category_name: 'Fizyka',
            instructor: 2,
            instructor_name: 'Prof. Anna Nowak',
            is_featured: true
          },
          { 
            id: 3, 
            title: 'Chemia Organiczna', 
            slug: 'chemia-organiczna',
            description: 'Wprowadzenie do chemii organicznej',
            thumbnail: '/puzzleicon.png',
            level: 'Rozszerzony',
            category: 3,
            category_name: 'Chemia',
            instructor: 3,
            instructor_name: 'Dr Piotr Wiśniewski',
            is_featured: false
          },
          { 
            id: 4, 
            title: 'Biologia Molekularna', 
            slug: 'biologia-molekularna',
            description: 'Podstawy biologii molekularnej',
            thumbnail: '/puzzleicon.png',
            level: 'Rozszerzony',
            category: 4,
            category_name: 'Biologia',
            instructor: 4,
            instructor_name: 'Dr Maria Krawczyk',
            is_featured: true
          }
        ];
        setRecommendedCourses(mockCourses.slice(0, 3));
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchAssignedCourses = async () => {
      setLoadingAssigned(true);
      try {
        // Pobierz wszystkie kursy z Firestore
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        
        // Filtruj kursy, do których użytkownik jest przypisany
        const assigned = coursesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(course => {
            const assignedUsers = course.assignedUsers || [];
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

  // Pobierz eventy jako powiadomienia
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      let eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Student widzi tylko swoje eventy
      if (user.role === 'student') {
        eventsList = eventsList.filter((ev: any) => ev.students && ev.students.includes(user.uid));
      }

      // Sortuj po dacie malejąco
      eventsList.sort((a: any, b: any) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
      
      // Dodaj informację o przekroczonym terminie
      const now = new Date();
      eventsList = eventsList.map((ev: any) => {
        const deadline = new Date(ev.deadline);
        const isOverdue = deadline < now;
        return {
          ...ev,
          isOverdue
        };
      });

      setNotifications(eventsList);
      
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

  // Pobierz nauczycieli z Firestore
  useEffect(() => {
    const fetchTeachers = async () => {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const teachersList = usersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName || '',
            email: data.email || '',
            subject: data.subject || '',
            role: data.role || '',
          };
        })
        .filter(user => user.role === 'teacher');
      setTeachers(teachersList);
    };
    fetchTeachers();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (value.length >= 3) {
      const filtered = wszystkieKursy.filter(k => k.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    logout();
  };

  // Function to handle menu click for course viewing
  const handleViewCourses = () => {
    router.push('/courses');
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

  // Handle clicks outside dropdown
  useEffect(() => {
    if (!showDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleDropdownToggle = () => {
    setShowDropdown(prev => !prev);
  };

  const handleCourseSelect = (courseName: string) => {
    setSearch(courseName);
    setShowDropdown(false);
    setSuggestions([]);
  };

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
        selectedFiles.forEach((file, idx) => {
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
    } catch (err: any) {
      setSendError(err.message || 'Błąd wysyłki.');
    } finally {
      setSending(false);
    }
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
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.external && (
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
              {item.sub && (
                <div className="ml-6 sm:ml-7 mt-1 space-y-1">
                  {item.sub.map((sub) => (
                    <Link 
                      key={sub.label} 
                      href={sub.href}
                      className="text-gray-500 text-xs sm:text-sm py-1 px-2 rounded hover:bg-[#F1F4FE] cursor-pointer block transition duration-200 hover:scale-105"
                    >
                      {sub.label}
                    </Link>
                  ))}
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
          <div className="relative w-full sm:w-1/2 lg:w-1/3" ref={dropdownRef}>
            <div className="flex">
              <input
                type="text"
                placeholder="Szukaj kursu..."
                className="w-full px-3 sm:px-4 py-2 rounded-l-lg border border-gray-200 border-r-0 focus:outline-none focus:ring-2 focus:ring-[#4067EC] text-[#222] font-semibold pr-10 text-sm sm:text-base"
                value={search}
                onChange={handleSearchChange}
              />
              <button
                type="button"
                onClick={handleDropdownToggle}
                className="px-2 sm:px-3 py-2 bg-[#4067EC] text-white rounded-r-lg border border-[#4067EC] hover:bg-[#3155d4] focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors"
                aria-label="Pokaż wszystkie kursy"
              >
                <svg 
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {search && (
              <button
                type="button"
                aria-label="Wyczyść wyszukiwanie"
                className="absolute right-12 sm:right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#4067EC] focus:outline-none"
                onClick={() => setSearch("")}
                tabIndex={0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Suggestions from typing */}
            {suggestions.length > 0 && !showDropdown && (
              <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 z-10 shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <li
                    key={s + idx}
                    className="px-3 sm:px-4 py-2 hover:bg-[#F1F4FE] cursor-pointer text-[#4067EC] font-semibold text-sm sm:text-base"
                    onClick={() => setSearch(s)}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
            
            {/* Dropdown with all courses */}
            {showDropdown && (
              <div className="dropdown-course absolute left-0 right-0 !bg-white opacity-100 border border-gray-200 rounded-lg mt-1 z-50 shadow-lg" style={{ opacity: 1, background: '#fff' }}>
                <div className="p-2 sm:p-3 border-b border-gray-100">
                  <h3 className="text-xs sm:text-sm font-bold text-[#4067EC] mb-2">Podstawowe</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 max-h-40 overflow-y-auto">
                    {podstawoweKursy.map((kurs, idx) => (
                      <button
                        key={`podstawowe-${idx}`}
                        className="text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded hover:bg-[#F1F4FE] hover:border-[#4067EC] text-gray-800 font-medium transition-colors"
                        onClick={() => handleCourseSelect(kurs)}
                      >
                        {kurs}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2 sm:p-3">
                  <h3 className="text-xs sm:text-sm font-bold text-[#4067EC] mb-2">Moduły dodatkowe</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 max-h-40 overflow-y-auto">
                    {dodatkoweKursy.map((kurs, idx) => (
                      <button
                        key={`dodatkowe-${idx}`}
                        className="text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded hover:bg-[#F1F4FE] hover:border-[#4067EC] text-[#4067EC] font-medium transition-colors"
                        onClick={() => handleCourseSelect(kurs)}
                      >
                        {kurs}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={handleViewCourses} 
              className="bg-[#4067EC] text-white px-3 sm:px-6 py-2 rounded-lg font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105 text-sm sm:text-base flex-1 sm:flex-none"
            >
              Wszystkie kursy
            </button>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <button
                  className="p-1.5 sm:p-2 rounded-full hover:bg-[#F1F4FE] cursor-pointer transition duration-200 hover:scale-110"
                  onClick={handleNotifClick}
                  aria-label="Powiadomienia"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {hasUnread && (
                    <span className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                {showNotifications && (
                  <div ref={notifRef} className="absolute right-0 mt-2 w-64 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fadeIn">
                    <div className="p-3 sm:p-4 border-b font-bold text-[#4067EC] text-sm sm:text-base">Powiadomienia</div>
                    {notifications.length === 0 ? (
                      <div className="p-3 sm:p-4 text-gray-500 text-sm">Brak powiadomień.</div>
                    ) : (
                      <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                        {notifications.map((notif) => (
                          <li key={notif.id} className="p-3 sm:p-4 hover:bg-[#F1F4FE] transition">
                            <div className="font-semibold text-[#1a237e] text-xs sm:text-sm">{notif.title}</div>
                            <div className="text-xs text-gray-500 mb-1">
                              Termin: {new Date(notif.deadline).toLocaleString('pl-PL', { 
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {notif.isOverdue && (
                                <span className="ml-2 text-red-600 font-bold">⚠️ Po terminie</span>
                              )}
                            </div>
                            {notif.description && (
                              <div className="text-xs text-gray-700 mt-1">{notif.description}</div>
                            )}
                          </li>
                        ))}
                      </ul>
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
              <div className="w-1/2">
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
              <div className="w-1/2">
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
                        {selectedFiles.map((file, idx) => (
                          <li key={file.name + idx} className="flex items-center gap-2 text-xs text-[#1a237e] font-semibold">
                            <span>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span>
                            <button type="button" className="text-red-500 hover:underline" onClick={() => handleRemoveFile(idx)}>Usuń</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {sendSuccess && <div className="text-green-600 text-xs sm:text-sm mt-1">{sendSuccess}</div>}
                    {sendError && <div className="text-red-600 text-xs sm:text-sm mt-1">{sendError}</div>}
                    <button
                      type="submit"
                      className="bg-[#4067EC] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105 mt-2 text-xs sm:text-sm"
                      disabled={!!fileError || selectedFiles.length > 3 || sending}
                    >{sending ? 'Wysyłanie...' : 'Wyślij'}</button>
                  </form>
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
                        <button className="bg-[#4067EC] text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105">Otwórz</button>
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
