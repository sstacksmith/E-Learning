'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Star, BookOpen, Plus, UserPlus, Users, ArrowLeft, Grid3X3, List, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

interface Student {
  id: string;
  name: string;
  class: string;
  averageGrade: number;
  frequency: number;
  courses: string[];
  lastActivity: string;
}

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  assignedToTeacher?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<UserData[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
 
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');
  
  // View mode state
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  
  // Filters state
  const [filters, setFilters] = useState({
    class: '',
    gradeRange: '',
    sortBy: 'name', // name, grade, activity
    sortOrder: 'asc' // asc, desc
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    console.log('🔍 useEffect - user changed:', user);
    if (user && user.uid) {
      console.log('🔍 useEffect - user ma UID, wywołuję fetchStudents i fetchAllStudents');
      fetchStudents();
      fetchAllStudents();
    } else {
      console.log('🔍 useEffect - brak użytkownika lub UID');
    }
  }, [user]);

  const fetchAllStudents = async () => {
    if (!user || !user.uid) {
      console.error('❌ Brak użytkownika lub UID w fetchAllStudents');
      return;
    }
    
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      console.log('🔍 fetchAllStudents - Wszyscy użytkownicy:', usersSnapshot.docs.length);
      console.log('🔍 fetchAllStudents - Nauczyciel UID:', user.uid);
      
      // Loguj wszystkich użytkowników
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`👤 Użytkownik: ${data.email || data.displayName || doc.id}, rola: ${data.role}, assignedToTeacher: ${data.assignedToTeacher}, uid: ${doc.id}`);
      });
      
      const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
      const studentsOnly = allUsers.filter(userData => userData.role === 'student');
      const unassignedStudents = studentsOnly.filter(userData => userData.assignedToTeacher !== user.uid);
      
      console.log('🔍 fetchAllStudents - Wszyscy użytkownicy:', allUsers.length);
      console.log('🔍 fetchAllStudents - Tylko uczniowie (role=student):', studentsOnly.length);
      console.log('🔍 fetchAllStudents - Uczniowie nieprzypisani do tego nauczyciela:', unassignedStudents.length);
      console.log('🔍 fetchAllStudents - Uczniowie już przypisani do tego nauczyciela:', studentsOnly.filter(userData => userData.assignedToTeacher === user.uid).length);
      
      // Loguj szczegóły uczniów
      studentsOnly.forEach(student => {
        console.log(`🎓 Uczeń: ${student.email || student.displayName}, assignedToTeacher: ${student.assignedToTeacher}, nauczyciel: ${user.uid}`);
      });
      
      setAllStudents(unassignedStudents);
    } catch (error) {
      console.error('Error fetching all students:', error);
    }
  };

  const fetchStudents = async () => {
    if (!user || !user.uid) {
      console.error('❌ Brak użytkownika lub UID');
      setError('Brak danych użytkownika');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching students for teacher:', user.email, 'UID:', user.uid);
      
      // 1. Pobierz kursy nauczyciela
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      console.log('🔍 fetchStudents - Wszystkie kursy w bazie:', coursesSnapshot.docs.length);
      coursesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📚 Kurs: ${data.title}, created_by: ${data.created_by}, teacherEmail: ${data.teacherEmail}, assignedUsers: ${data.assignedUsers}`);
      });
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        const isCreatedBy = data.created_by === user.email;
        const isTeacherEmail = data.teacherEmail === user.email;
        const isAssignedUser = Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email);
        
        console.log(`🔍 Sprawdzam kurs "${data.title}": created_by=${isCreatedBy}, teacherEmail=${isTeacherEmail}, assignedUser=${isAssignedUser}`);
        
        return isCreatedBy || isTeacherEmail || isAssignedUser;
      });
      
      console.log('🔍 fetchStudents - Kursy nauczyciela:', teacherCourses.length);
      
      // Debug: pokaż szczegóły kursów nauczyciela
      teacherCourses.forEach(courseDoc => {
        const courseData = courseDoc.data();
        console.log(`📚 Kurs nauczyciela: "${courseData.title}", assignedUsers:`, courseData.assignedUsers);
      });
      
      if (teacherCourses.length === 0) {
        console.log('⚠️ Brak kursów dla nauczyciela');
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // 2. Zbierz wszystkich uczniów z kursów nauczyciela
      const allStudentIds = new Set<string>();
      const courseStudentMap = new Map<string, string[]>(); // studentId -> course titles
      
      // Pobierz wszystkich użytkowników raz (zamiast w pętli)
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const courseDoc of teacherCourses) {
        const courseData = courseDoc.data();
        const courseTitle = courseData.title;
        const assignedUsers = courseData.assignedUsers || [];
        
        // Dla każdego przypisanego użytkownika w kursie
        console.log(`🔍 Przetwarzam kurs "${courseTitle}" z assignedUsers:`, assignedUsers);
        for (const userId of assignedUsers) {
          // Sprawdź czy to email czy uid
          const isEmail = userId.includes('@');
          console.log(`🔍 Sprawdzam userId: "${userId}", isEmail: ${isEmail}`);
          
          const userDoc = usersSnapshot.docs.find(doc => {
            const userData = doc.data();
            return isEmail ? userData.email === userId : doc.id === userId;
          });
          
          if (userDoc) {
            const userData = userDoc.data();
            console.log(`✅ Znaleziono użytkownika: ${userData.email || userData.displayName}, rola: ${userData.role}`);
            if (userData.role === 'student') {
              allStudentIds.add(userDoc.id);
              // Dodaj tylko ten konkretny kurs do mapy ucznia
              const existing = courseStudentMap.get(userDoc.id) || [];
              if (!existing.includes(courseTitle)) {
                courseStudentMap.set(userDoc.id, [...existing, courseTitle]);
              }
              console.log(`🎓 Dodano ucznia ${userData.email || userData.displayName} do kursu ${courseTitle}`);
            }
          } else {
            console.log(`❌ Nie znaleziono użytkownika dla userId: ${userId}`);
          }
        }
      }
      
      // 3. Dodaj uczniów bezpośrednio przypisanych do nauczyciela (assignedToTeacher)
      console.log(`🔍 Sprawdzam uczniów bezpośrednio przypisanych do nauczyciela ${user.uid}`);
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.role === 'student' && userData.assignedToTeacher === user.uid) {
          console.log(`🎓 Znaleziono bezpośrednio przypisanego ucznia: ${userData.email || userData.displayName}`);
          allStudentIds.add(doc.id);
          // Sprawdź czy uczeń już ma jakieś kursy
          const existing = courseStudentMap.get(doc.id) || [];
          if (!existing.includes('Przypisany bezpośrednio')) {
            courseStudentMap.set(doc.id, [...existing, 'Przypisany bezpośrednio']);
          }
        }
      });
      
      console.log('🔍 Found students:', allStudentIds.size);
      console.log('🔍 All student IDs:', Array.from(allStudentIds));
      console.log('🔍 Course-Student mapping:', Object.fromEntries(courseStudentMap));
      
      // Debug: sprawdź wszystkich użytkowników z rolą student
      const allStudents = usersSnapshot.docs.filter(doc => doc.data().role === 'student');
      console.log('🔍 All students in database:', allStudents.length);
      allStudents.forEach(doc => {
        const data = doc.data();
        console.log(`🎓 Student: ${data.email || data.displayName}, ID: ${doc.id}, assignedToTeacher: ${data.assignedToTeacher}`);
      });
      
      // 3. Pobierz dane uczniów i oblicz statystyki
      const studentsData: Student[] = [];
      
      for (const studentId of allStudentIds) {
        // Sprawdź czy studentId nie jest undefined
        if (!studentId) {
          console.warn('⚠️ Pomijam studentId undefined');
          continue;
        }
        
        // Znajdź dokument ucznia w już pobranych danych
        const studentDoc = usersSnapshot.docs.find(doc => doc.id === studentId);
        
        if (studentDoc) {
          const studentData = studentDoc.data();
          const studentCourses = courseStudentMap.get(studentId) || [];
          
          // Oblicz średnią ocen
          const gradesRef = collection(db, 'grades');
          const gradesSnapshot = await getDocs(gradesRef);
          const studentGrades = gradesSnapshot.docs.filter(doc => {
            const gradeData = doc.data();
            return gradeData.studentId === studentId || gradeData.user_id === studentId;
          });
          
          let averageGrade = 0;
          if (studentGrades.length > 0) {
            const sum = studentGrades.reduce((acc, doc) => {
              const gradeData = doc.data();
              return acc + (parseFloat(gradeData.value || gradeData.grade || '0'));
            }, 0);
            averageGrade = sum / studentGrades.length;
          }
          
                              const studentInfo = {
                      id: studentId,
                      name: studentData.displayName || studentData.email || 'Nieznany uczeń',
                      class: `Klasa ${studentCourses[0] || 'Nieznana'}`,
                      averageGrade: Math.round(averageGrade * 10) / 10,
                      frequency: 0, // Usunięte
                      courses: studentCourses,
                      lastActivity: `${Math.floor(Math.random() * 24) + 1} godz. temu`
                    };
          
          console.log(`Student ${studentInfo.name} courses:`, studentCourses);
          studentsData.push(studentInfo);
        }
      }
      
      console.log('Processed students data:', studentsData);
      setStudents(studentsData);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Wystąpił błąd podczas pobierania danych uczniów.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0 || !user) return;
    
    setAssignLoading(true);
    setAssignError('');
    setAssignSuccess('');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Przetwórz każdego wybranego ucznia
      for (const studentId of selectedStudents) {
        try {
          // Znajdź ucznia
          const student = allStudents.find(s => s.uid === studentId);
          if (!student) {
            errorCount++;
            continue;
          }
          
          // Zaktualizuj pole assignedToTeacher w dokumencie ucznia
          const studentRef = doc(db, 'users', student.uid);
          await updateDoc(studentRef, {
            assignedToTeacher: user.uid
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error assigning student ${studentId}:`, error);
          errorCount++;
        }
      }
      
      // Ustaw komunikat o wyniku
      if (successCount > 0 && errorCount === 0) {
        setAssignSuccess(`Pomyślnie przypisano ${successCount} ucznia/uczniów!`);
      } else if (successCount > 0 && errorCount > 0) {
        setAssignSuccess(`Przypisano ${successCount} uczniów, błędy: ${errorCount}`);
      } else {
        setAssignError(`Nie udało się przypisać żadnego ucznia. Błędy: ${errorCount}`);
      }
      
      // Wyczyść wybór
      setSelectedStudents([]);
      
      // Odśwież listę uczniów natychmiast
      console.log('🔄 handleAssignStudents - Odświeżam listę uczniów...');
      await fetchStudents();
      await fetchAllStudents();
      console.log('✅ handleAssignStudents - Lista uczniów odświeżona');
      
      // Zamknij modal po krótkim opóźnieniu
      setTimeout(() => {
        setShowAssignModal(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error assigning students:', error);
      setAssignError('Wystąpił błąd podczas przypisywania uczniów.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    if (!user) return;
    
    try {
      // 1. Usuń pole assignedToTeacher z dokumentu ucznia
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        assignedToTeacher: null
      });
      
      // 2. Usuń ucznia ze wszystkich kursów nauczyciela
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.created_by === user.email || 
               data.teacherEmail === user.email ||
               (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
      });
      
      // Usuń ucznia z każdego kursu nauczyciela
      for (const courseDoc of teacherCourses) {
        const courseData = courseDoc.data();
        const assignedUsers = courseData.assignedUsers || [];
        
        // Znajdź email ucznia
        if (!studentId) {
          console.warn('⚠️ Pomijam studentId undefined w handleUnassignStudent');
          continue;
        }
        
        const studentDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', studentId)));
        if (!studentDoc.empty) {
          const studentData = studentDoc.docs[0].data();
          const studentEmail = studentData.email;
          
          // Usuń email ucznia z assignedUsers
          const updatedAssignedUsers = assignedUsers.filter((userId: string) => 
            userId !== studentEmail && userId !== studentId
          );
          
          const courseRef = doc(db, 'courses', courseDoc.id);
          await updateDoc(courseRef, {
            assignedUsers: updatedAssignedUsers
          });
        }
      }
      
      // 3. Odśwież listę uczniów
      await fetchStudents();
      await fetchAllStudents();
      
    } catch (error) {
      console.error('Error unassigning student:', error);
      setError('Wystąpił błąd podczas odłączania ucznia.');
    }
  };

  // Enhanced filtering and sorting logic
  const filteredStudents = students
    .filter(student => {
      // Search filter
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.class.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Class filter
      const matchesClass = !filters.class || student.class.toLowerCase().includes(filters.class.toLowerCase());
      
      // Grade range filter
      const matchesGrade = !filters.gradeRange || (() => {
        switch (filters.gradeRange) {
          case 'excellent': return student.averageGrade >= 4.5;
          case 'good': return student.averageGrade >= 3.5 && student.averageGrade < 4.5;
          case 'satisfactory': return student.averageGrade >= 2.5 && student.averageGrade < 3.5;
          case 'poor': return student.averageGrade < 2.5;
          default: return true;
        }
      })();
      
      return matchesSearch && matchesClass && matchesGrade;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'grade':
          comparison = a.averageGrade - b.averageGrade;
          break;
        case 'activity':
          comparison = a.lastActivity.localeCompare(b.lastActivity);
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

  // Get unique classes for filter dropdown
  const uniqueClasses = [...new Set(students.map(student => student.class))].sort();

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      class: '',
      gradeRange: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSearchTerm('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || filters.class || filters.gradeRange || filters.sortBy !== 'name' || filters.sortOrder !== 'asc';

  const getGradeColor = (grade: number) => {
    if (grade >= 4.5) return 'text-green-600';
    if (grade >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 w-full">
      {/* Enhanced Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-white/30 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.location.href = '/homelogin'}
              className="flex items-center gap-3 px-5 py-3 bg-white/70 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 ease-in-out border border-white/30 hover:border-blue-200 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Powrót do dashboard</span>
            </button>

            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600">
                Lista Uczniów
              </h1>
              <p className="text-gray-600 mt-1 font-medium">Zarządzaj swoimi uczniami</p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/70 backdrop-blur-sm rounded-xl border border-white/30 p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Karty</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <List className="h-4 w-4" />
                  <span className="text-sm font-medium">Lista</span>
                </button>
              </div>

              <button 
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
              >
                <UserPlus className="h-5 w-5" />
                <span>Przypisz Ucznia</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                  <p className="text-sm text-gray-600 font-medium">Przypisanych uczniów</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.length > 0 ? (students.reduce((acc, s) => acc + s.averageGrade, 0) / students.length).toFixed(1) : '0.0'}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Średnia ocen</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(students.flatMap(s => s.courses)).size}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Aktywnych kursów</p>
                </div>
              </div>
            </div>
          </div>

            {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-lg w-full transform transition-all duration-300 ease-out scale-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Przypisz Ucznia</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudents([]);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Wyszukaj i wybierz uczniów do przypisania:
                </label>
                
                {/* Wyszukiwarka */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Wyszukaj po email lub nazwie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 bg-white hover:border-gray-300"
                  />
                </div>
                
                {/* Lista uczniów z checkboxami */}
                <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
                  {allStudents
                    .filter(student => 
                      // Filtruj przez wyszukiwanie
                      (student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (student.displayName && student.displayName.toLowerCase().includes(searchTerm.toLowerCase()))) &&
                      // I usuń uczniów już przypisanych do tego nauczyciela
                      student.assignedToTeacher !== user?.uid
                    )
                    .map(student => (
                      <label key={student.uid} className="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.uid)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.uid]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.uid));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {student.displayName || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : 'Brak nazwy')}
                          </div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </div>
                        <div className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full border">
                          {selectedStudents.includes(student.uid) ? 'Wybrany' : 'Kliknij aby wybrać'}
                        </div>
                      </label>
                    ))}
                  
                  {allStudents.filter(student => 
                    // Filtruj przez wyszukiwanie
                    (student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (student.displayName && student.displayName.toLowerCase().includes(searchTerm.toLowerCase()))) &&
                    // I usuń uczniów już przypisanych do tego nauczyciela
                    student.assignedToTeacher !== user?.uid
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Nie znaleziono uczniów</p>
                      <p className="text-xs">Spróbuj innego wyszukiwania</p>
                    </div>
                  )}
                </div>
                
                {/* Licznik wybranych */}
                {selectedStudents.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs">✓</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-800">
                        Wybrano {selectedStudents.length} ucznia/uczniów
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedStudents([])}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Wyczyść wybór
                    </button>
                  </div>
                )}
              </div>
              
              {assignSuccess && (
                <div className="text-green-700 text-sm bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  {assignSuccess}
                </div>
              )}
              
              {assignError && (
                <div className="text-red-700 text-sm bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-2">
                  <div className="w-5 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xs">!</span>
                  </div>
                  {assignError}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAssignStudents}
                  disabled={selectedStudents.length === 0 || assignLoading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {assignLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Przypisywanie...
                    </span>
                  ) : (
                    `Przypisz ${selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''} Ucznia/uczniów`
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedStudents([]);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Enhanced Search and Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Wyszukaj ucznia po imieniu, nazwisku lub klasie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-gray-700 bg-white hover:border-gray-300 font-medium"
              />
            </div>

            {/* Filters Toggle and Active Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filtry</span>
                  {hasActiveFilters && (
                    <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                      {[searchTerm, filters.class, filters.gradeRange].filter(Boolean).length}
                    </span>
                  )}
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Wyczyść filtry
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-500">
                Znaleziono: <span className="font-semibold text-gray-700">{filteredStudents.length}</span> z {students.length} uczniów
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Klasa</label>
                  <select
                    value={filters.class}
                    onChange={(e) => setFilters(prev => ({ ...prev, class: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Wszystkie klasy</option>
                    {uniqueClasses.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Średnia ocen</label>
                  <select
                    value={filters.gradeRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, gradeRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Wszystkie oceny</option>
                    <option value="excellent">Bardzo dobre (4.5+)</option>
                    <option value="good">Dobre (3.5-4.4)</option>
                    <option value="satisfactory">Dostateczne (2.5-3.4)</option>
                    <option value="poor">Niedostateczne (&lt;2.5)</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sortuj według</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'name' | 'grade' | 'activity' }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="name">Nazwa</option>
                      <option value="grade">Średnia ocen</option>
                      <option value="activity">Ostatnia aktywność</option>
                    </select>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title={filters.sortOrder === 'asc' ? 'Sortuj rosnąco' : 'Sortuj malejąco'}
                    >
                      {filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Students Display - Cards or List */}
          {viewMode === 'cards' ? (
            /* Enhanced Students Grid - Clean Design */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStudents.map((student) => (
                <div key={student.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                  {/* Header with Avatar and Grade */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-white font-semibold text-lg">
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                            {student.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{student.class}</p>
                        </div>
                      </div>
                      
                      {/* Grade Badge */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
                        student.averageGrade >= 4.5 ? 'bg-green-100 text-green-700' :
                        student.averageGrade >= 3.5 ? 'bg-yellow-100 text-yellow-700' :
                        student.averageGrade >= 2.5 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <Star className="h-3 w-3 fill-current" />
                        <span>{student.averageGrade.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="px-6 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className={`text-2xl font-bold ${getGradeColor(student.averageGrade)}`}>
                          {student.averageGrade.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Średnia</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700">
                          {student.lastActivity}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Ostatnia aktywność</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-6 pb-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => router.push(`/homelogin/teacher/students/${student.id}`)}
                        className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Zobacz Profil
                      </button>
                      <button 
                        onClick={() => handleUnassignStudent(student.id)}
                        className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300 font-medium text-sm"
                      >
                        Odłącz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Simple List View */
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Uczeń</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Klasa</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Średnia ocen</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ostatnia aktywność</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{student.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{student.class}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className={`text-sm font-bold ${getGradeColor(student.averageGrade)}`}>
                              {student.averageGrade.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500">{student.lastActivity}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => router.push(`/homelogin/teacher/students/${student.id}`)}
                              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Profil
                            </button>
                            <button 
                              onClick={() => handleUnassignStudent(student.id)}
                              className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors border border-red-200 font-medium"
                            >
                              Odłącz
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'Nie znaleziono uczniów' : 'Brak przypisanych uczniów'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? 'Spróbuj zmienić kryteria wyszukiwania lub wyczyść filtr.'
                  : 'Nie masz jeszcze przypisanych uczniów do swoich kursów. Zacznij od przypisania pierwszego ucznia.'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Przypisz pierwszego ucznia
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}