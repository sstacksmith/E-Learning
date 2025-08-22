"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Search, Star, BookOpen, Plus, UserPlus, Users } from 'lucide-react';
import BackButton from '@/components/BackButton';

interface Student {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  assignedToTeacher?: string;
  Learningmode?: 'stationary' | 'home';
  primaryTutorId?: string;
}

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  assignedToTeacher?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<UserData[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [modeFilter, setModeFilter] = useState<'all' | 'stationary' | 'home'>('all');
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
              courseStudentMap.set(userData.uid, [...existing, courseTitle]);
            }
          }
        }
      }
      
      console.log('🔍 fetchStudents - Znalezieni uczniowie:', allStudentIds.size);
      
      // 3. Pobierz szczegóły uczniów
      const studentsList: Student[] = [];
      for (const studentId of allStudentIds) {
        const userDoc = usersSnapshot.docs.find(doc => doc.id === studentId);
        if (userDoc) {
          const userData = userDoc.data();
          studentsList.push({
            uid: studentId,
            displayName: userData.displayName || 'Brak imienia',
            email: userData.email || 'Brak email',
            role: userData.role || 'student',
            assignedToTeacher: userData.assignedToTeacher,
            Learningmode: userData.Learningmode,
            primaryTutorId: userData.primaryTutorId
          });
        }
      }
      
      console.log('🔍 fetchStudents - Lista uczniów:', studentsList);
      setStudents(studentsList);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Błąd podczas pobierania listy uczniów');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) return;
    
    setAssignLoading(true);
    setAssignError('');
    setAssignSuccess('');
    
    try {
      for (const studentId of selectedStudents) {
        const studentDocRef = doc(db, 'users', studentId);
        await updateDoc(studentDocRef, { assignedToTeacher: user?.uid });
      }
      
      setAssignSuccess(`Pomyślnie przypisano ${selectedStudents.length} uczniów!`);
      setSelectedStudents([]);
      setShowAssignModal(false);
      
      // Odśwież listę uczniów
      await fetchStudents();
      await fetchAllStudents();
      
      setTimeout(() => setAssignSuccess(''), 5000);
    } catch (error) {
      console.error('Error assigning students:', error);
      setAssignError('Błąd podczas przypisywania uczniów');
      setTimeout(() => setAssignError(''), 5000);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignTutor = async (studentId: string) => {
    try {
      const studentDocRef = doc(db, 'users', studentId);
      await updateDoc(studentDocRef, { primaryTutorId: user?.uid });
      setStudents(prev => prev.map(s => s.uid === studentId ? { ...s, primaryTutorId: user?.uid } : s));
    } catch (err) {
      alert('Failed to assign tutor.');
    }
  };

  // Filtering by search and learning mode
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesMode = modeFilter === 'all' || student.Learningmode === modeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <div className="mb-6">
        <BackButton href="/homelogin/teacher">
          Powrót do panelu nauczyciela
        </BackButton>
      </div>
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">Lista uczniów</h1>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-2">Wszyscy uczniowie</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <input
            type="text"
            placeholder="Wyszukaj ucznia po imieniu, nazwisku lub emailu..."
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded w-full sm:w-1/2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors duration-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded w-full sm:w-1/4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors duration-200"
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value as 'all' | 'stationary' | 'home')}
          >
            <option value="all">All</option>
            <option value="stationary">Stationary only</option>
            <option value="home">Home only</option>
          </select>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-gray-600 text-sm sm:text-base">Ładowanie uczniów...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-gray-600 text-sm sm:text-base">Brak uczniów do wyświetlenia.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Imię i nazwisko</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Email</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Learning Mode</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Homeroom Teacher</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.uid} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">{student.displayName}</td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">{student.email}</td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {student.Learningmode === 'stationary' ? (
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">Stationary</span>
                        ) : student.Learningmode === 'home' ? (
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">Home</span>
                        ) : (
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">Unknown</span>
                        )}
                        <select
                          className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors duration-200"
                          value={student.Learningmode || ''}
                          onChange={async (e) => {
                            const newMode = e.target.value as 'stationary' | 'home';
                            try {
                              await updateDoc(doc(db, 'users', student.uid), { Learningmode: newMode });
                              setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, Learningmode: newMode } : s));
                            } catch {
                              alert('Failed to update learning mode.');
                            }
                          }}
                        >
                          <option value="">Set mode…</option>
                          <option value="stationary">Stationary</option>
                          <option value="home">Home</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">
                      {student.primaryTutorId === user?.uid
                        ? <span className="text-green-600 font-semibold">You</span>
                        : student.primaryTutorId
                          ? <span className="text-yellow-600 font-semibold">Assigned</span>
                          : <span className="text-gray-500">Unassigned</span>
                      }
                    </td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">
                      <button
                        onClick={() => handleAssignTutor(student.uid)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors duration-200"
                      >
                        Assign as Tutor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Students Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Przypisz uczniów</h3>
            <p className="text-gray-600 mb-4">Wybierz uczniów, których chcesz przypisać do siebie:</p>
            
            <div className="max-h-60 overflow-y-auto mb-4">
              {allStudents.map(student => (
                <label key={student.uid} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.uid)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(prev => [...prev, student.uid]);
                      } else {
                        setSelectedStudents(prev => prev.filter(id => id !== student.uid));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {student.displayName} ({student.email})
                  </span>
                </label>
              ))}
            </div>
            
            {allStudents.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                Brak dostępnych uczniów do przypisania.
              </p>
            )}
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleAssignStudents}
                disabled={selectedStudents.length === 0 || assignLoading}
                className="px-4 py-2 bg-[#4067EC] text-white rounded hover:bg-[#5577FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignLoading ? 'Przypisywanie...' : `Przypisz (${selectedStudents.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {assignSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          {assignSuccess}
        </div>
      )}
      {assignError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {assignError}
        </div>
      )}
    </div>
  );
}