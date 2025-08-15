'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Download, Star, BookOpen, Plus, UserPlus, Users } from 'lucide-react';
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
  displayName: string;
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

  useEffect(() => {
    if (user) {
      fetchStudents();
      fetchAllStudents();
    }
  }, [user]);

  const fetchAllStudents = async () => {
    if (!user) return;
    
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserData))
        .filter(userData => userData.role === 'student')
        .filter(userData => userData.assignedToTeacher !== user.uid); // Usuń uczniów już przypisanych do tego nauczyciela
      
      console.log('🔍 fetchAllStudents - Wszyscy uczniowie:', usersSnapshot.docs.filter(doc => doc.data().role === 'student').length);
      console.log('🔍 fetchAllStudents - Po filtrowaniu assignedToTeacher:', studentsList.length);
      console.log('🔍 fetchAllStudents - Uczniowie już przypisani do nauczyciela:', usersSnapshot.docs.filter(doc => doc.data().role === 'student' && doc.data().assignedToTeacher === user.uid).length);
      
      setAllStudents(studentsList);
    } catch (error) {
      console.error('Error fetching all students:', error);
    }
  };

  const fetchStudents = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching students for teacher:', user.email);
      
      // 1. Pobierz kursy nauczyciela
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.created_by === user.email || 
               data.teacherEmail === user.email ||
               (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
      });
      
      console.log('Teacher courses:', teacherCourses.length);
      
      if (teacherCourses.length === 0) {
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
        for (const userId of assignedUsers) {
          // Sprawdź czy to email czy uid
          const isEmail = userId.includes('@');
          const userDoc = usersSnapshot.docs.find(doc => {
            const userData = doc.data();
            return isEmail ? userData.email === userId : userData.uid === userId;
          });
          
          if (userDoc) {
            const userData = userDoc.data();
            if (userData.role === 'student') {
              allStudentIds.add(userData.uid);
              // Dodaj tylko ten konkretny kurs do mapy ucznia
              const existing = courseStudentMap.get(userData.uid) || [];
              if (!existing.includes(courseTitle)) {
                courseStudentMap.set(userData.uid, [...existing, courseTitle]);
              }
            }
          }
        }
      }
      
      // 3. Dodaj uczniów bezpośrednio przypisanych do nauczyciela (assignedToTeacher)
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.role === 'student' && userData.assignedToTeacher === user.uid) {
          allStudentIds.add(userData.uid);
          // Sprawdź czy uczeń już ma jakieś kursy
          const existing = courseStudentMap.get(userData.uid) || [];
          if (!existing.includes('Przypisany bezpośrednio')) {
            courseStudentMap.set(userData.uid, [...existing, 'Przypisany bezpośrednio']);
          }
        }
      });
      
      console.log('Found students:', allStudentIds.size);
      console.log('Course-Student mapping:', Object.fromEntries(courseStudentMap));
      
      // 3. Pobierz dane uczniów i oblicz statystyki
      const studentsData: Student[] = [];
      
      for (const studentId of allStudentIds) {
        const usersRef = collection(db, 'users');
        const studentQuery = query(usersRef, where('uid', '==', studentId));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const studentData = studentSnapshot.docs[0].data();
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

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lista Uczniów</h2>
          <p className="text-gray-600">Przegląd wszystkich uczniów w Twoich kursach</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Przypisz Ucznia
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Eksport
          </button>
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
                            {student.displayName || 'Brak nazwy'}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Szukaj ucznia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Students Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-lg">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex items-center text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span className={`ml-1 text-sm font-medium ${getGradeColor(student.averageGrade)}`}>
                  {student.averageGrade.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{student.name}</h3>
              <p className="text-sm text-gray-600">{student.class}</p>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Średnia ocen</span>
                <span className={`text-sm font-medium ${getGradeColor(student.averageGrade)}`}>
                  {student.averageGrade.toFixed(1)}
                </span>
              </div>

            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Kursy</div>
              <div className="flex flex-wrap gap-1">
                {student.courses.map((course, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {course}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-4">
              Ostatnia aktywność: {student.lastActivity}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => router.push(`/homelogin/teacher/students/${student.id}`)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Zobacz Profil
              </button>
              <button 
                onClick={() => handleUnassignStudent(student.id)}
                className="flex-1 bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                Odłącz
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Brak przypisanych uczniów</p>
          <p className="text-sm mb-4">Nie masz jeszcze przypisanych uczniów do swoich kursów.</p>
          <button 
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Przypisz pierwszego ucznia
          </button>
        </div>
      )}
    </div>
  );
}