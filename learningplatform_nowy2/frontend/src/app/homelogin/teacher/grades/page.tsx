'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Search, Filter, Plus, Edit, Trash2, UserPlus, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Calendar, User, Award, BookOpen } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';

interface Grade {
  id: string;
  studentName: string;
  date: string;
  type: string;
  grade: string;
  comments: string;
  course?: string;
}

interface UserData {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  [key: string]: any;
}

interface Student {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
  assignedToTeacher?: string;
}

export default function TeacherGradesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('Wszystkie kursy');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [gradeData, setGradeData] = useState({
    subject: '',
    courseId: '', // Dodajemy ID kursu
    grade: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    gradeType: ''
  });
  const [addGradeLoading, setAddGradeLoading] = useState(false);
  const [addGradeSuccess, setAddGradeSuccess] = useState('');
  const [addGradeError, setAddGradeError] = useState('');

  const [showEditGradeModal, setShowEditGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editGradeData, setEditGradeData] = useState({
    grade: '',
    type: '',
    date: '',
    comments: ''
  });
  const [editGradeLoading, setEditGradeLoading] = useState(false);
  const [editGradeSuccess, setEditGradeSuccess] = useState('');
  const [editGradeError, setEditGradeError] = useState('');

  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [teacherCoursesMap, setTeacherCoursesMap] = useState<Map<string, string>>(new Map()); // Map: courseName -> courseId
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'student' | 'grade' | 'course'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filtering state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: '',
    student: '',
    grade: '',
    course: ''
  });
  const [selectedFilterStudents, setSelectedFilterStudents] = useState<string[]>([]);
  const [filterStudentSearchTerm, setFilterStudentSearchTerm] = useState('');
  const [showFilterStudentDropdown, setShowFilterStudentDropdown] = useState(false);
  
  // Statyczna lista wszystkich przedmiotów (będzie filtrowana)
  const ALL_SUBJECTS = [
    'Matematyka',
    'Język polski',
    'Język angielski',
    'Fizyka',
    'Chemia',
    'Biologia',
    'Historia',
    'Geografia',
    'Informatyka',
    'Wychowanie fizyczne',
  ];

  const GRADE_TYPES = [
    { value: 'kartkówka', label: 'Kartkówka' },
    { value: 'sprawdzian', label: 'Sprawdzian' },
    { value: 'inne', label: 'Inne' },
  ];

  const fetchCourses = async () => {
    if (!user) return;
    
    try {
      console.log('📚 fetchCourses - Fetching courses for teacher:', user.email);
      
      // Pobierz kursy nauczyciela
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      console.log('📚 fetchCourses - All courses in database:', coursesSnapshot.docs.length);
      
      // Loguj wszystkie kursy
      coursesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📖 Kurs: ${data.title}, created_by: ${data.created_by}, teacherEmail: ${data.teacherEmail}, assignedUsers: ${data.assignedUsers}`);
      });
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.created_by === user.email || 
               data.teacherEmail === user.email ||
               (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
      });
      
      console.log('📚 fetchCourses - Teacher courses found:', teacherCourses.length);
      
      // Wyciągnij nazwy kursów nauczyciela i utwórz mapę nazwa -> ID
      const courseNames = new Set<string>();
      const coursesMap = new Map<string, string>();
      
      teacherCourses.forEach(courseDoc => {
        const courseData = courseDoc.data();
        if (courseData.title) {
          courseNames.add(courseData.title);
          coursesMap.set(courseData.title, courseDoc.id);
        }
      });
      
      const courseNamesList = Array.from(courseNames);
      setTeacherCoursesMap(coursesMap);
      
      // Jeśli nauczyciel nie ma kursów, pokaż wszystkie przedmioty jako fallback
      if (courseNamesList.length === 0) {
        setTeacherSubjects(ALL_SUBJECTS);
      } else {
        setTeacherSubjects(courseNamesList);
      }
      
      // Ustaw pierwszy kurs jako domyślny
      if (courseNamesList.length > 0) {
        const firstCourseName = courseNamesList[0];
        const firstCourseId = coursesMap.get(firstCourseName);
        setGradeData(prev => ({ 
          ...prev, 
          subject: firstCourseName,
          courseId: firstCourseId || ''
        }));
      }
      
    } catch (error) {
      console.error('Error fetching courses:', error);
      // W przypadku błędu, pokaż wszystkie przedmioty
      setTeacherSubjects(ALL_SUBJECTS);
    }
  };

  const fetchGrades = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // console.log('Fetching grades for teacher:', user.email);
      
              // Pobierz wszystkich użytkowników i ich role
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const allUsers: UserData[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const studentsCount = allUsers.filter(u => u.role === 'student').length;
      const teachersCount = allUsers.filter(u => u.role === 'teacher').length;
      const adminsCount = allUsers.filter(u => u.role === 'admin').length;
      
      // setDebugInfo({
      //   totalUsers: allUsers.length,
      //   students: studentsCount,
      //   teachers: teachersCount,
      //   admins: adminsCount,
      //   allStudents: allUsers.filter(u => u.role === 'student').map(u => ({
      //     id: u.id,
      //     email: u.email,
      //     displayName: u.displayName,
      //     role: u.role
      //   }))
      // });
      
      // 1. Pobierz kursy nauczyciela
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.created_by === user.email || 
               data.teacherEmail === user.email ||
               (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
      });
      
      const courseNames = teacherCourses.map(doc => doc.data().title);
      setCourses(['Wszystkie kursy', ...courseNames]);
      
      // 2. Pobierz wszystkie oceny 
      const gradesRef = collection(db, 'grades');
      const gradesSnapshot = await getDocs(gradesRef);
      
      // 3. Pobierz użytkowników aby uzyskać nazwy
      const usersMap = new Map();
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        usersMap.set(userData.uid, userData);
        if (userData.email) {
          usersMap.set(userData.email, userData);
        }
      });
      
      // 4. Filtruj oceny wystawione przez tego nauczyciela lub z jego kursów
      const teacherGrades: Grade[] = [];
      
      for (const gradeDoc of gradesSnapshot.docs) {
        const gradeData = gradeDoc.data();
        
        // Sprawdź czy ocena jest powiązana z kursami nauczyciela
        let isTeacherGrade = false;
        
        // Sprawdź po course_id
        if (gradeData.course_id) {
          isTeacherGrade = teacherCourses.some(courseDoc => courseDoc.id === gradeData.course_id);
        }
        
        // Lub sprawdź po teacherId/created_by
        if (!isTeacherGrade) {
          isTeacherGrade = gradeData.teacherId === user.uid || 
                          gradeData.created_by === user.email ||
                          gradeData.teacherEmail === user.email;
        }
        
        if (isTeacherGrade) {
          // Znajdź ucznia
          const studentId = gradeData.studentId || gradeData.user_id || gradeData.student;
          const studentData = usersMap.get(studentId);
          
          let courseName = 'Nieznany kurs';
          if (gradeData.course_id) {
            const courseDoc = teacherCourses.find(doc => doc.id === gradeData.course_id);
            if (courseDoc) {
              courseName = courseDoc.data().title;
            }
          }
          
          teacherGrades.push({
            id: gradeDoc.id,
            studentName: studentData?.displayName || studentData?.email || 'Nieznany uczeń',
            date: gradeData.date || gradeData.graded_at || new Date().toISOString().split('T')[0],
            type: gradeData.type || gradeData.gradeType || 'Sprawdzian',
            grade: String(gradeData.value || gradeData.grade || '0'),
            comments: gradeData.description || gradeData.feedback || gradeData.comments || 'Brak uwag',
            course: courseName
          });
        }
      }
      
      // Sortuj po dacie (najnowsze pierwsze)
      teacherGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // console.log('Fetched grades:', teacherGrades);
      setGrades(teacherGrades);
      
    } catch (error) {
      console.error('Error fetching grades:', error);
      setError('Wystąpił błąd podczas pobierania ocen.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 fetchStudents - Fetching students for teacher:', user.email);
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      console.log('🔍 fetchStudents - All users from database:', usersSnapshot.docs.length);
      
      // Loguj wszystkich użytkowników
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`👤 Użytkownik: ${data.email || data.displayName || doc.id}, rola: ${data.role}, uid: ${doc.id}`);
      });
      
      const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
      const studentsList = allUsers.filter(userData => userData.role === 'student');
      
      console.log('🔍 fetchStudents - Wszyscy użytkownicy:', allUsers.length);
      console.log('🔍 fetchStudents - Tylko uczniowie (role=student):', studentsList.length);
      console.log('🔍 fetchStudents - Lista uczniów:', studentsList.map(s => ({ uid: s.uid, email: s.email, displayName: s.displayName, role: s.role })));
      
      setStudents(studentsList);
    } catch (error) {
      console.error('❌ Error fetching students:', error);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sprawdź czy wybrano uczniów
    if (selectedStudents.length === 0) {
      setAddGradeError('Wybierz przynajmniej jednego ucznia');
      return;
    }
    
    console.log('📝 handleAddGrade - Form submitted with data:', {
      selectedStudents,
      gradeData,
      user: user?.email,
      studentsCount: students.length,
      filteredStudentsCount: filteredStudents.length
    });
    
    if (!user) {
      console.log('Missing user data');
      return;
    }
    
    // Sprawdź czy wszystkie wymagane pola są wypełnione
    if (!gradeData.subject || !gradeData.grade || !gradeData.gradeType || !gradeData.date) {
      console.log('Missing grade data:', {
        subject: gradeData.subject,
        grade: gradeData.grade,
        gradeType: gradeData.gradeType,
        date: gradeData.date
      });
      setAddGradeError('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    // Sprawdź czy courseId jest ustawiony
    if (!gradeData.courseId) {
      console.log('Missing courseId:', gradeData.courseId);
      setAddGradeError('Nie wybrano kursu');
      return;
    }
    
    setAddGradeLoading(true);
    setAddGradeError('');
    setAddGradeSuccess('');

    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Dodaj oceny dla wszystkich wybranych uczniów
      for (const studentId of selectedStudents) {
        try {
          const student = students.find(s => s.uid === studentId);
          if (!student) {
            errorCount++;
            continue;
          }
          
          // Sprawdź czy student ma displayName, jeśli nie, użyj email
          const studentName = student.displayName || student.email || 'Nieznany uczeń';
          
          console.log('📝 Adding grade for student:', {
            studentId,
            studentName,
            studentData: student
          });
          
          const gradeDataToSave = {
            studentId: studentId,
            studentName: studentName,
            subject: gradeData.subject,
            course_id: gradeData.courseId,
            course: gradeData.subject,
            grade: gradeData.grade,
            description: gradeData.description || '',
            date: gradeData.date,
            type: gradeData.gradeType,
            comments: gradeData.description || '',
            teacherId: user.uid,
            teacherEmail: user.email,
            createdAt: Timestamp.now(),
          };
          
          console.log('💾 Saving grade data to Firestore:', gradeDataToSave);
          
          try {
            const docRef = await addDoc(collection(db, 'grades'), gradeDataToSave);
            console.log('✅ Grade saved successfully with ID:', docRef.id);
            successCount++;
          } catch (saveError) {
            console.error('❌ Error saving grade to Firestore:', saveError);
            throw saveError;
          }
          
        } catch (error) {
          console.error(`Error adding grade for student ${studentId}:`, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setAddGradeSuccess(`Dodano ${successCount} ocen${successCount > 1 ? 'y' : 'ę'} pomyślnie!${errorCount > 0 ? ` (${errorCount} błędów)` : ''}`);
      } else {
        setAddGradeError('Nie udało się dodać żadnej oceny');
      }
      
      // Reset form
      setSelectedStudents([]);
      setStudentSearchTerm('');
      setGradeData({
        subject: 'Matematyka',
        courseId: '',
        grade: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        gradeType: ''
      });
      
      // Refresh grades
      setTimeout(() => {
        fetchGrades();
        setShowAddGradeModal(false);
      }, 2000);

    } catch (error) {
      console.error('Error adding grades:', error);
      setAddGradeError('Wystąpił błąd podczas dodawania ocen.');
    } finally {
      setAddGradeLoading(false);
    }
  };

  const handleEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
    setEditGradeData({
      grade: grade.grade,
      type: grade.type,
      date: grade.date,
      comments: grade.comments
    });
    setShowEditGradeModal(true);
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
    // Zamknij dropdown po wyborze pojedynczego ucznia
    setTimeout(() => setShowStudentDropdown(false), 100);
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.uid));
    }
    // Zamknij dropdown po wyborze
    setTimeout(() => setShowStudentDropdown(false), 100);
  };

  const handleSort = (column: 'date' | 'type' | 'student' | 'grade' | 'course') => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      type: '',
      student: '',
      grade: '',
      course: ''
    });
    setSelectedFilterStudents([]);
    setFilterStudentSearchTerm('');
  };

  const handleFilterStudentToggle = (studentId: string) => {
    setSelectedFilterStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
    setTimeout(() => setShowFilterStudentDropdown(false), 100);
  };

  const handleSelectAllFilterStudents = () => {
    if (selectedFilterStudents.length === filteredStudents.length) {
      setSelectedFilterStudents([]);
    } else {
      setSelectedFilterStudents(filteredStudents.map(s => s.uid));
    }
    setTimeout(() => setShowFilterStudentDropdown(false), 100);
  };

  const getActiveFiltersCount = () => {
    const filterCount = Object.values(filters).filter(value => value !== '').length;
    const studentFilterCount = selectedFilterStudents.length > 0 ? 1 : 0;
    return filterCount + studentFilterCount;
  };

  // Function to get grade color based on value
  const getGradeColor = (grade: string) => {
    const numericGrade = parseFloat(grade);
    
    if (isNaN(numericGrade)) {
      // Handle text grades
      const gradeLower = grade.toLowerCase();
      if (gradeLower.includes('bdb') || gradeLower.includes('bardzo dobry')) {
        return 'bg-green-100 text-green-800 border-green-200';
      } else if (gradeLower.includes('db') || gradeLower.includes('dobry')) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      } else if (gradeLower.includes('dst') || gradeLower.includes('dostateczny')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      } else if (gradeLower.includes('dop') || gradeLower.includes('dopuszczający')) {
        return 'bg-orange-100 text-orange-800 border-orange-200';
      } else if (gradeLower.includes('ndst') || gradeLower.includes('niedostateczny')) {
        return 'bg-red-100 text-red-800 border-red-200';
      } else {
        return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      // Handle numeric grades
      if (numericGrade >= 5) {
        return 'bg-green-100 text-green-800 border-green-200';
      } else if (numericGrade >= 4) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      } else if (numericGrade >= 3) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      } else if (numericGrade >= 2) {
        return 'bg-orange-100 text-orange-800 border-orange-200';
      } else {
        return 'bg-red-100 text-red-800 border-red-200';
      }
    }
  };

  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingGrade) return;

    setEditGradeLoading(true);
    setEditGradeError('');
    setEditGradeSuccess('');

    try {
      // Aktualizuj ocenę w Firestore
      const gradeRef = doc(db, 'grades', editingGrade.id);
      await updateDoc(gradeRef, {
        grade: editGradeData.grade,
        type: editGradeData.type,
        date: editGradeData.date,
        comments: editGradeData.comments,
        updatedAt: Timestamp.now()
      });

      setEditGradeSuccess('Ocena została pomyślnie zaktualizowana!');
      
      // Odśwież listę ocen
      fetchGrades();
      
      // Zamknij modal po 2 sekundach
      setTimeout(() => {
        setShowEditGradeModal(false);
        setEditGradeSuccess('');
        setEditingGrade(null);
        setEditGradeData({
          grade: '',
          type: '',
          date: '',
          comments: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Error updating grade:', error);
      setEditGradeError('Wystąpił błąd podczas aktualizacji oceny');
    } finally {
      setEditGradeLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('TeacherGradesPage mounted, user:', user);
      fetchCourses(); // Pobierz kursy i przedmioty nauczyciela
      fetchGrades();
      fetchStudents(); // Fetch students when the component mounts
    }
  }, [user]);

  // Zamykanie dropdownu po kliknięciu poza nim lub naciśnięciu Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.student-dropdown-container')) {
        setShowStudentDropdown(false);
        setShowFilterStudentDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowStudentDropdown(false);
        setShowFilterStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sort grades function
  const sortGrades = (grades: Grade[]) => {
    return [...grades].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'student':
          comparison = a.studentName.localeCompare(b.studentName);
          break;
        case 'grade':
          // Convert grades to numbers for proper sorting (handle both numeric and text grades)
          const gradeA = parseFloat(a.grade) || 0;
          const gradeB = parseFloat(b.grade) || 0;
          comparison = gradeA - gradeB;
          break;
        case 'course':
          comparison = (a.course || '').localeCompare(b.course || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const filteredGrades = sortGrades(grades.filter(grade => {
    const matchesSearch = grade.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'Wszystkie kursy' || grade.course === selectedCourse;
    
    // Advanced filters
    const matchesDateFrom = !filters.dateFrom || new Date(grade.date) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(grade.date) <= new Date(filters.dateTo);
    const matchesType = !filters.type || grade.type.toLowerCase().includes(filters.type.toLowerCase());
    const matchesStudent = selectedFilterStudents.length === 0 || selectedFilterStudents.some(studentId => {
      const student = students.find(s => s.uid === studentId);
      return student && grade.studentName.toLowerCase().includes((student.displayName || student.email || '').toLowerCase());
    });
    const matchesGrade = !filters.grade || grade.grade.toLowerCase().includes(filters.grade.toLowerCase());
    const matchesCourseFilter = !filters.course || (grade.course && grade.course.toLowerCase().includes(filters.course.toLowerCase()));
    
    return matchesSearch && matchesCourse && matchesDateFrom && matchesDateTo && 
           matchesType && matchesStudent && matchesGrade && matchesCourseFilter;
  }));

  // Filtruj uczniów na podstawie wyszukiwania
  const filteredStudents = students.filter(student => {
    const searchLower = studentSearchTerm.toLowerCase();
    return (
      student.displayName?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.uid.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            Dziennik Ocen
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dziennik Ocen</h2>
              <p className="text-gray-600">Zarządzaj ocenami swoich uczniów</p>
              {teacherSubjects.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Kursy: {teacherSubjects.join(', ')}
                </p>
              )}
            </div>
        <button 
          onClick={() => setShowAddGradeModal(true)}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Dodaj Ocenę
        </button>
      </div>

      {/* DEBUG INFO - UKRYTE DLA UŻYTKOWNIKÓW */}
      {/* {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Debug Info - Użytkownicy w systemie:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Wszyscy użytkownicy:</span> {debugInfo.totalUsers}
            </div>
            <div>
              <span className="font-medium">Uczniowie:</span> {debugInfo.students}
            </div>
            <div>
              <span className="font-medium">Nauczyciele:</span> {debugInfo.teachers}
            </div>
            <div>
              <span className="font-medium">Admini:</span> {debugInfo.admins}
            </div>
            <div>
              <span className="font-medium">Kursy nauczyciela:</span> {teacherSubjects.length}
            </div>
            <div>
              <span className="font-medium">Lista kursów:</span> {teacherSubjects.join(', ') || 'Brak'}
            </div>
          </div>
          {debugInfo.allStudents.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-blue-900">Lista uczniów:</span>
              <div className="mt-2 space-y-1">
                {debugInfo.allStudents.map((student: any) => (
                  <div key={student.id} className="text-xs bg-white p-2 rounded border">
                    <strong>{student.displayName || student.email}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )} */}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Szukaj ucznia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button 
          onClick={() => setShowFilterModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative"
        >
          <Filter className="h-4 w-4" />
          Filtruj
          {getActiveFiltersCount() > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getActiveFiltersCount()}
            </span>
          )}
        </button>
      </div>

      {/* Sorting Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sortowanie</h3>
          <div className="text-sm text-gray-500">
            Sortuj według: <span className="font-medium text-blue-600">
              {sortBy === 'date' && 'Data'}
              {sortBy === 'type' && 'Typ'}
              {sortBy === 'student' && 'Uczeń'}
              {sortBy === 'grade' && 'Ocena'}
              {sortBy === 'course' && 'Kurs'}
            </span>
            <span className="ml-2">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            onClick={() => handleSort('date')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              sortBy === 'date' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Data</span>
            {sortBy === 'date' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
          </button>
          
          <button
            onClick={() => handleSort('type')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              sortBy === 'type' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">Typ</span>
            {sortBy === 'type' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
          </button>
          
          <button
            onClick={() => handleSort('student')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              sortBy === 'student' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Uczeń</span>
            {sortBy === 'student' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
          </button>
          
          <button
            onClick={() => handleSort('grade')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              sortBy === 'grade' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">Ocena</span>
            {sortBy === 'grade' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
          </button>
          
          <button
            onClick={() => handleSort('course')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              sortBy === 'course' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">Kurs</span>
            {sortBy === 'course' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Grade Color Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Legenda kolorów ocen</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-green-100 text-green-800 border-green-200">
              5
            </span>
            <span className="text-sm text-gray-600">Bardzo dobry</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-blue-100 text-blue-800 border-blue-200">
              4
            </span>
            <span className="text-sm text-gray-600">Dobry</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-yellow-100 text-yellow-800 border-yellow-200">
              3
            </span>
            <span className="text-sm text-gray-600">Dostateczny</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-orange-100 text-orange-800 border-orange-200">
              2
            </span>
            <span className="text-sm text-gray-600">Dopuszczający</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-red-100 text-red-800 border-red-200">
              1
            </span>
            <span className="text-sm text-gray-600">Niedostateczny</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-gray-100 text-gray-800 border-gray-200">
              BDB
            </span>
            <span className="text-sm text-gray-600">Tekstowe</span>
          </div>
        </div>
      </div>

      {/* Course Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Oceny</h3>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Grades Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="w-1/5 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('student')}
                >
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Uczeń
                    {sortBy === 'student' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data
                    {sortBy === 'date' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Typ
                    {sortBy === 'type' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('grade')}
                >
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Ocena
                    {sortBy === 'grade' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="w-2/5 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uwagi
                </th>
                <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{grade.studentName}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{grade.date}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{grade.type}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor(grade.grade)}`}>
                      {grade.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="text-xs text-gray-900 truncate" title={grade.comments}>{grade.comments}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditGrade(grade)}
                        className="text-blue-600 hover:text-blue-900 transition-colors p-1"
                        title="Edytuj ocenę"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 transition-colors p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGrades.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Brak ocen do wyświetlenia</p>
            {searchTerm && (
              <p className="text-xs">Nie znaleziono uczniów dla &quot;{searchTerm}&quot;</p>
            )}
          </div>
        )}
      </div>

      {/* Add Grade Modal */}
      {showAddGradeModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl font-bold">+</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Dodaj Nową Ocenę</h3>
              </div>
              <button 
                onClick={() => setShowAddGradeModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <form onSubmit={handleAddGrade} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uczniowie * <span className="text-xs text-gray-500">(wybierz jednego lub więcej)</span>
                  </label>
                  <div className="relative student-dropdown-container">
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Wyszukaj uczniów po nazwie, emailu..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {showStudentDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              onChange={handleSelectAllStudents}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Zaznacz wszystkich ({filteredStudents.length})
                          </label>
                        </div>
                        
                        {filteredStudents.length === 0 ? (
                          <div className="p-3 text-center text-gray-500">
                            Brak uczniów spełniających kryteria wyszukiwania
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto">
                            {filteredStudents.map(student => (
                              <label
                                key={student.uid}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(student.uid)}
                                  onChange={() => handleStudentToggle(student.uid)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {student.displayName || 'Brak nazwy'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {student.email}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedStudents.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 mb-1">
                          Wybrani uczniowie ({selectedStudents.length}):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedStudents.map(studentId => {
                            const student = students.find(s => s.uid === studentId);
                            return student ? (
                              <span
                                key={studentId}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                              >
                                {student.displayName || student.email}
                                <button
                                  type="button"
                                  onClick={() => handleStudentToggle(studentId)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs * <span className="text-xs text-gray-500">(tylko Twoje kursy)</span>
                  </label>
                  <select
                    value={gradeData.subject}
                    onChange={(e) => {
                      const selectedCourseName = e.target.value;
                      const selectedCourseId = teacherCoursesMap.get(selectedCourseName) || '';
                      console.log('Course selected:', { selectedCourseName, selectedCourseId });
                      setGradeData(prev => ({ 
                        ...prev, 
                        subject: selectedCourseName,
                        courseId: selectedCourseId
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- wybierz kurs --</option>
                    {teacherSubjects.map(courseName => (
                      <option key={courseName} value={courseName}>{courseName}</option>
                    ))}
                  </select>
                  {teacherSubjects.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Brak kursów. Kursy będą dostępne po ich utworzeniu.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ocena *
                  </label>
                  <input
                    type="text"
                    value={gradeData.grade}
                    onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="np. 5, 4+, bdb, dst"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typ oceny *
                  </label>
                  <select
                    value={gradeData.gradeType}
                    onChange={(e) => setGradeData(prev => ({ ...prev, gradeType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- wybierz typ --</option>
                    {GRADE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={gradeData.date}
                    onChange={(e) => setGradeData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uwagi (opcjonalnie)
                </label>
                <textarea
                  value={gradeData.description}
                  onChange={(e) => setGradeData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Dodatkowe uwagi o ocenie..."
                />
              </div>

              {addGradeSuccess && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  {addGradeSuccess}
                </div>
              )}
              
              {addGradeError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {addGradeError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={selectedStudents.length === 0 || addGradeLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addGradeLoading 
                    ? 'Dodawanie...' 
                    : `Dodaj Ocenę${selectedStudents.length > 0 ? ` (${selectedStudents.length})` : ''}`
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGradeModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Grade Modal */}
      {showEditGradeModal && editingGrade && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Edytuj Ocenę</h3>
              </div>
              <button 
                onClick={() => {
                  setShowEditGradeModal(false);
                  setEditingGrade(null);
                  setEditGradeData({
                    grade: '',
                    type: '',
                    date: '',
                    comments: ''
                  });
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uczeń
                  </label>
                  <input
                    type="text"
                    value={editingGrade.studentName}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    disabled
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs
                  </label>
                  <input
                    type="text"
                    value={editingGrade.course || 'Brak kursu'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ocena *
                  </label>
                  <input
                    type="text"
                    value={editGradeData.grade}
                    onChange={(e) => setEditGradeData(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="np. 5, 4+, bdb, dst"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typ oceny *
                  </label>
                  <select
                    value={editGradeData.type}
                    onChange={(e) => setEditGradeData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {GRADE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={editGradeData.date}
                    onChange={(e) => setEditGradeData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uwagi (opcjonalnie)
                </label>
                <textarea
                  value={editGradeData.comments}
                  onChange={(e) => setEditGradeData(prev => ({ ...prev, comments: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Dodatkowe uwagi o ocenie..."
                />
              </div>

              {editGradeSuccess && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  {editGradeSuccess}
                </div>
              )}
              
              {editGradeError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {editGradeError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={editGradeLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editGradeLoading ? 'Aktualizowanie...' : 'Zapisz Zmiany'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditGradeModal(false);
                    setEditingGrade(null);
                    setEditGradeData({
                      grade: '',
                      type: '',
                      date: '',
                      comments: ''
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Filter className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Filtry Ocen</h3>
              </div>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Zakres dat
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Od daty
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Do daty
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Typ oceny
                </h4>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wszystkie typy</option>
                  {GRADE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Student Filter */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Uczniowie <span className="text-xs text-gray-500">(wybierz jednego lub więcej)</span>
                </h4>
                <div className="relative student-dropdown-container">
                  <input
                    type="text"
                    value={filterStudentSearchTerm}
                    onChange={(e) => setFilterStudentSearchTerm(e.target.value)}
                    onFocus={() => setShowFilterStudentDropdown(true)}
                    placeholder="Wyszukaj uczniów po nazwie, emailu..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {showFilterStudentDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedFilterStudents.length === filteredStudents.length && filteredStudents.length > 0}
                            onChange={handleSelectAllFilterStudents}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Zaznacz wszystkich ({filteredStudents.length})
                        </label>
                      </div>
                      
                      {filteredStudents.length === 0 ? (
                        <div className="p-3 text-center text-gray-500">
                          Brak uczniów spełniających kryteria wyszukiwania
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {filteredStudents.map(student => (
                            <label
                              key={student.uid}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFilterStudents.includes(student.uid)}
                                onChange={() => handleFilterStudentToggle(student.uid)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {student.displayName || 'Brak nazwy'}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {student.email}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedFilterStudents.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">
                        Wybrani uczniowie ({selectedFilterStudents.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedFilterStudents.map(studentId => {
                          const student = students.find(s => s.uid === studentId);
                          return student ? (
                            <span
                              key={studentId}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {student.displayName || student.email}
                              <button
                                type="button"
                                onClick={() => handleFilterStudentToggle(studentId)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grade Filter */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Ocena
                </h4>
                <input
                  type="text"
                  value={filters.grade}
                  onChange={(e) => handleFilterChange('grade', e.target.value)}
                  placeholder="Wpisz ocenę (np. 5, 4+, bdb)..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Course Filter */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Kurs
                </h4>
                <input
                  type="text"
                  value={filters.course}
                  onChange={(e) => handleFilterChange('course', e.target.value)}
                  placeholder="Wpisz nazwę kursu..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active Filters Summary */}
              {getActiveFiltersCount() > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Aktywne filtry:</h5>
                  <div className="flex flex-wrap gap-2">
                    {filters.dateFrom && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Od: {filters.dateFrom}
                        <button onClick={() => handleFilterChange('dateFrom', '')} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    )}
                    {filters.dateTo && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Do: {filters.dateTo}
                        <button onClick={() => handleFilterChange('dateTo', '')} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    )}
                    {filters.type && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Typ: {filters.type}
                        <button onClick={() => handleFilterChange('type', '')} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    )}
                    {selectedFilterStudents.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Uczniowie: {selectedFilterStudents.length}
                        <button onClick={() => setSelectedFilterStudents([])} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    )}
                    {filters.grade && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Ocena: {filters.grade}
                        <button onClick={() => handleFilterChange('grade', '')} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    )}
                    {filters.course && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Kurs: {filters.course}
                        <button onClick={() => handleFilterChange('course', '')} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Zastosuj Filtry
                </button>
                <button
                  onClick={clearFilters}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Wyczyść Wszystkie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
} 