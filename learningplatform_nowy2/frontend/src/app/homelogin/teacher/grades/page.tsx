'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Search, Filter, Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';

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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [gradeData, setGradeData] = useState({
    subject: '',
    grade: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    gradeType: ''
  });
  const [addGradeLoading, setAddGradeLoading] = useState(false);
  const [addGradeSuccess, setAddGradeSuccess] = useState('');
  const [addGradeError, setAddGradeError] = useState('');

  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  
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
      console.log('Fetching courses for teacher:', user.email);
      
      // Pobierz kursy nauczyciela
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.created_by === user.email || 
               data.teacherEmail === user.email ||
               (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
      });
      
      console.log('Teacher courses found:', teacherCourses.length);
      
      // Wyciągnij nazwy kursów nauczyciela
      const courseNames = new Set<string>();
      teacherCourses.forEach(courseDoc => {
        const courseData = courseDoc.data();
        if (courseData.title) {
          courseNames.add(courseData.title);
        }
      });
      
      const courseNamesList = Array.from(courseNames);
      console.log('Teacher course names:', courseNamesList);
      
      // Jeśli nauczyciel nie ma kursów, pokaż wszystkie przedmioty jako fallback
      if (courseNamesList.length === 0) {
        console.log('No courses found, using fallback subjects');
        setTeacherSubjects(ALL_SUBJECTS);
      } else {
        console.log('Using course names instead of subjects');
        setTeacherSubjects(courseNamesList);
      }
      
      // Ustaw pierwszy kurs jako domyślny
      if (courseNamesList.length > 0) {
        setGradeData(prev => ({ ...prev, subject: courseNamesList[0] }));
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
      console.log('Fetching grades for teacher:', user.email);
      
      // DEBUG: Pobierz wszystkich użytkowników i ich role
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const allUsers: UserData[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const studentsCount = allUsers.filter(u => u.role === 'student').length;
      const teachersCount = allUsers.filter(u => u.role === 'teacher').length;
      const adminsCount = allUsers.filter(u => u.role === 'admin').length;
      
      setDebugInfo({
        totalUsers: allUsers.length,
        students: studentsCount,
        teachers: teachersCount,
        admins: adminsCount,
        allStudents: allUsers.filter(u => u.role === 'student').map(u => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          role: u.role
        }))
      });
      
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
      
      console.log('Fetched grades:', teacherGrades);
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
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as Student))
        .filter(userData => userData.role === 'student' && userData.assignedToTeacher === user.uid);
      
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !user) return;
    
    setAddGradeLoading(true);
    setAddGradeError('');
    setAddGradeSuccess('');
    
    try {
      const student = students.find(s => s.uid === selectedStudent);
      if (!student) throw new Error('Nie wybrano ucznia.');
      
      await addDoc(collection(db, 'grades'), {
        studentId: selectedStudent,
        studentName: student.displayName,
        subject: gradeData.subject,
        grade: gradeData.grade,
        description: gradeData.description,
        date: gradeData.date,
        gradeType: gradeData.gradeType,
        teacherId: user.uid,
        createdAt: Timestamp.now(),
      });
      
      setAddGradeSuccess('Ocena została dodana pomyślnie!');
      
      // Reset form
      setSelectedStudent('');
      setGradeData({
        subject: 'Matematyka',
        grade: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        gradeType: ''
      });
      
      // Refresh grades
      setTimeout(() => {
        fetchGrades();
        setShowAddGradeModal(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error adding grade:', error);
      setAddGradeError('Wystąpił błąd podczas dodawania oceny.');
    } finally {
      setAddGradeLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCourses(); // Pobierz kursy i przedmioty nauczyciela
      fetchGrades();
      fetchStudents(); // Fetch students when the component mounts
    }
  }, [user]);

  const filteredGrades = grades.filter(grade => {
    const matchesSearch = grade.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'Wszystkie kursy' || grade.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

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

      {/* DEBUG INFO */}
      {debugInfo && (
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
                    <strong>{student.displayName || student.email}</strong> (ID: {student.id})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" />
          Filtruj
        </button>
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uczeń
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ocena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uwagi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{grade.studentName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{grade.date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{grade.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {grade.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{grade.comments}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-900 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGrades.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Brak ocen do wyświetlenia</p>
            {searchTerm && (
              <p className="text-sm">Nie znaleziono uczniów dla &quot;{searchTerm}&quot;</p>
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
                    Uczeń *
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- wybierz ucznia --</option>
                    {students.map(student => (
                      <option key={student.uid} value={student.uid}>
                        {student.displayName || student.email} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs * <span className="text-xs text-gray-500">(tylko Twoje kursy)</span>
                  </label>
                  <select
                    value={gradeData.subject}
                    onChange={(e) => setGradeData(prev => ({ ...prev, subject: e.target.value }))}
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
                  disabled={!selectedStudent || addGradeLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addGradeLoading ? 'Dodawanie...' : 'Dodaj Ocenę'}
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
    </div>
  );
} 