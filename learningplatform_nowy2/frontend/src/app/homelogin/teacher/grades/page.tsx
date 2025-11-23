'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Calendar, User, Award, BookOpen } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

interface Grade {
  id: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  date: string;
  type: string;
  grade: string;
  comments: string;
  course?: string;
  subject?: string;
  courseId?: string;
  gradeType?: string;
  description?: string;
  graded_at?: string;
  value?: string | number;
  value_grade?: string | number;
  quiz_title?: string;
  percentage?: number;
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

interface Course {
  id: string;
  title: string;
  courseType: 'obowiązkowy' | 'fakultatywny';
  created_by?: string;
  teacherEmail?: string;
  assignedUsers?: string[];
}

interface GroupedGrades {
  [subject: string]: Grade[];
}

export default function TeacherGradesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [gradeData, setGradeData] = useState({
    subject: '',
    courseId: '',
    grade: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    gradeType: ''
  });
  const [addGradeLoading, setAddGradeLoading] = useState(false);
  const [addGradeSuccess, setAddGradeSuccess] = useState('');
  const [addGradeError, setAddGradeError] = useState('');


  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [teacherCoursesMap, setTeacherCoursesMap] = useState<Map<string, string>>(new Map());
  

  const GRADE_TYPES = [
    { value: 'kartkówka', label: 'Kartkówka' },
    { value: 'sprawdzian', label: 'Sprawdzian' },
    { value: 'inne', label: 'Inne' },
  ];

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('📚 fetchCourses - Fetching courses for teacher:', user.email);
      
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const teacherCourses = coursesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.created_by === user.email || 
               data.teacherEmail === user.email ||
               (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
      });
      
      const coursesList = teacherCourses.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Course));
      
      setCourses(coursesList);
      
      // Utwórz mapę nazwa -> ID
      const coursesMap = new Map<string, string>();
      coursesList.forEach(course => {
        coursesMap.set(course.title, course.id);
      });
      setTeacherCoursesMap(coursesMap);
      
      // Wyciągnij unikalne przedmioty
      const subjects = [...new Set(coursesList.map(course => course.title))];
      setTeacherSubjects(subjects);
      
      console.log('📚 fetchCourses - Teacher courses:', coursesList.length);
      console.log('📚 fetchCourses - Teacher subjects:', subjects);
      
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
    }
  }, [user]);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('👥 fetchStudents - Fetching students for teacher:', user.email);
      
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
      
      // Filtruj tylko studentów przypisanych do tego nauczyciela
      const teacherStudents = allUsers.filter(userData => 
        userData.role === 'student' && 
        userData.uid && // Upewnij się, że uid istnieje
        (userData.assignedToTeacher === user.uid || 
         userData.assignedToTeacher === user.email)
      ).map(userData => ({
        uid: userData.uid!,
        displayName: userData.displayName || '',
        email: userData.email || '',
        role: userData.role,
        assignedToTeacher: userData.assignedToTeacher
      } as Student));
      
      console.log('👥 fetchStudents - All users:', allUsers.length);
      console.log('👥 fetchStudents - Teacher students:', teacherStudents.length);
      
      setStudents(teacherStudents);
      
    } catch (error) {
      console.error('❌ Error fetching students:', error);
    }
  }, [user]);

  const fetchGrades = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('📊 fetchGrades - Fetching grades for teacher:', user.email);
      
      const gradesRef = collection(db, 'grades');
      const gradesSnapshot = await getDocs(gradesRef);
      
      const allGrades = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
      
      // Filtruj oceny tylko dla uczniów przypisanych do tego nauczyciela
      const teacherStudentIds = students.map(student => student.uid);
      const teacherGrades = allGrades.filter(grade => 
        teacherStudentIds.includes(grade.studentId) ||
        students.some(student => student.email === grade.studentEmail)
      );
      
      console.log('📊 fetchGrades - All grades:', allGrades.length);
      console.log('📊 fetchGrades - Teacher grades:', teacherGrades.length);
      
      setGrades(teacherGrades);
      
    } catch (error) {
      console.error('❌ Error fetching grades:', error);
    }
  }, [user, students]);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchCourses();
        await fetchStudents();
    } catch (error) {
        console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

    loadData();
  }, [user, fetchCourses, fetchStudents]);

  useEffect(() => {
    if (students.length > 0) {
      fetchGrades();
    }
  }, [students, user, fetchGrades]);

  // Grupowanie ocen po przedmiocie
  const groupedGrades: GroupedGrades = grades.reduce((acc, grade) => {
    const subject = grade.subject || grade.course || 'Inne';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(grade);
    return acc;
  }, {} as GroupedGrades);

  // Funkcja do określania typu kursu (obowiązkowy/fakultatywny)
  const getCourseType = (subject: string): 'obowiązkowy' | 'fakultatywny' => {
    const course = courses.find(c => c.title === subject);
    return course?.courseType || 'obowiązkowy'; // domyślnie obowiązkowy
  };

  // Rozdzielenie kursów na obowiązkowe i fakultatywne (włączając kursy bez ocen)
  const allCourses = [...Object.entries(groupedGrades)];
  
  // Dodaj kursy bez ocen do listy
  courses.forEach(course => {
    const courseTitle = course.title;
    if (!groupedGrades[courseTitle]) {
      allCourses.push([courseTitle, []]);
    }
  });

  const mandatoryCourses = allCourses.filter(([subject]) => 
    getCourseType(subject) === 'obowiązkowy'
  );
  const electiveCourses = allCourses.filter(([subject]) => 
    getCourseType(subject) === 'fakultatywny'
  );

  // Sortuj oceny w każdym przedmiocie po dacie rosnąco
  Object.keys(groupedGrades).forEach(subject => {
    groupedGrades[subject].sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  });

  // Funkcja do określania koloru badge na podstawie oceny
  function getGradeColor(grade: string | number | undefined) {
    const gradeStr = String(grade || '');
    if (gradeStr === '5' || gradeStr === '6') return 'bg-green-500 text-white shadow-green-200';
    if (gradeStr === '4') return 'bg-emerald-500 text-white shadow-emerald-200';
    if (gradeStr === '3') return 'bg-yellow-500 text-white shadow-yellow-200';
    if (gradeStr === '2') return 'bg-orange-500 text-white shadow-orange-200';
    if (gradeStr === '1') return 'bg-red-500 text-white shadow-red-200';
    if (gradeStr === '+') return 'bg-blue-500 text-white shadow-blue-200';
    if (gradeStr === '-') return 'bg-gray-500 text-white shadow-gray-200';
    return 'bg-gray-400 text-white shadow-gray-200';
  }

  // Funkcja do liczenia średniej ocen (tylko liczbowych)
  function calculateAverage(grades: Grade[]): string {
    const numericGrades = grades
      .map(g => {
        const gradeValue = g.grade || g.value || g.value_grade;
        if (!gradeValue) return NaN;
        return parseFloat(String(gradeValue).replace(',', '.'));
      })
      .filter(n => !isNaN(n));
    if (numericGrades.length === 0) return '-';
    const avg = numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length;
    return avg.toFixed(2);
  }

  // Oblicz ogólną średnią tylko z przedmiotów obowiązkowych, które mają oceny
  const mandatoryCoursesWithGrades = mandatoryCourses.filter(([, subjectGrades]) => 
    subjectGrades.length > 0
  );
  const overallAverage = mandatoryCoursesWithGrades.reduce((total, [, subjectGrades]) => {
    const avg = calculateAverage(subjectGrades);
    return avg !== '-' ? total + parseFloat(avg) : total;
  }, 0) / (mandatoryCoursesWithGrades.length || 1);

  // Oblicz statystyki
  const mandatorySubjectsCount = mandatoryCourses.length;
  const electiveSubjectsCount = electiveCourses.length;

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent) return;
    
    setAddGradeLoading(true);
    setAddGradeError('');
    setAddGradeSuccess('');

    try {
      const student = students.find(s => s.uid === selectedStudent);
          if (!student) {
        throw new Error('Nie znaleziono ucznia');
      }

      const gradeDoc = {
        studentId: selectedStudent,
        studentName: student.displayName,
        studentEmail: student.email,
        teacherId: user.uid,
        teacherEmail: user.email,
            subject: gradeData.subject,
        courseId: gradeData.courseId,
            grade: gradeData.grade,
        description: gradeData.description,
            date: gradeData.date,
        gradeType: gradeData.gradeType,
        graded_at: new Date().toISOString(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await addDoc(collection(db, 'grades'), gradeDoc);
      
      setAddGradeSuccess('Ocena została dodana pomyślnie!');
      setGradeData({
        subject: '',
        courseId: '',
        grade: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        gradeType: ''
      });
      setSelectedStudent('');
        setShowAddGradeModal(false);
      
      // Odśwież listę ocen
      await fetchGrades();

    } catch (error) {
      console.error('Error adding grade:', error);
      setAddGradeError('Błąd podczas dodawania oceny');
    } finally {
      setAddGradeLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie dziennika ocen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header - pełna szerokość */}
      <div className="w-full bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
              onClick={() => router.push('/homelogin/teacher')}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
              Powrót do panelu nauczyciela
          </button>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dziennik ocen - Nauczyciel
          </h1>

            <div className="flex gap-2">
        <button 
          onClick={() => setShowAddGradeModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
                <Plus className="w-4 h-4" />
                Dodaj ocenę
        </button>
            </div>
          </div>
        </div>
      </div>

      {/* Główny kontener - pełna szerokość */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Section - pełna szerokość */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-6 mb-8 border border-white/20">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {user?.email ? user.email.split('@')[0].split('.').map(n => n[0]).join('').toUpperCase() : <User className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{user?.email?.split('@')[0] || 'Nauczyciel'}</h2>
              <p className="text-gray-600">Dziennik ocen i zarządzanie ocenami uczniów</p>
            </div>
            </div>
            </div>

        {/* Statistics Cards - skalowalne */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Przedmioty obowiązkowe</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{mandatorySubjectsCount}</p>
            </div>
          </div>
                  </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Przedmioty fakultatywne</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{electiveSubjectsCount}</p>
            </div>
        </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
        </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Średnia ogólna</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{overallAverage.toFixed(2)}</p>
              </div>
            </div>
          </div>
      </div>

        {/* Grades Table - dwie kolumny */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Przedmioty obowiązkowe */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-white/20">
            <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-lg sm:text-xl font-bold text-white">Przedmioty obowiązkowe</h2>
          </div>
          
          {/* Dodatkowy odstęp aby tooltip nie był przykrywany */}
          <div className="h-8"></div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie ocen...</p>
        </div>
          ) : mandatoryCourses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Brak przedmiotów obowiązkowych</h3>
              <p className="text-gray-600">Nie masz jeszcze żadnych przedmiotów obowiązkowych.</p>
            </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Przedmiot</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Oceny</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Średnia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mandatoryCourses.map(([subject, subjectGrades], idx) => (
                      <tr key={`mandatory-${subject}-${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-semibold text-gray-800 text-base">{subject}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {subjectGrades.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {subjectGrades.map((grade) => {
                                const gradeValue = grade.grade || grade.value || grade.value_grade;
                                const gradeDate = grade.date || grade.graded_at || '';
                                const gradeType = grade.gradeType || grade.type || '';
                                const gradeDescription = grade.description || grade.comments || '';
                                
                                return (
                                  <div key={grade.id} className="relative group">
                                    <button
                                      className={`px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${getGradeColor(gradeValue)}`}
                                    >
                                      {gradeValue}
                                    </button>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[250px] max-w-[350px]">
                                      <div className="space-y-1">
                                        <div className="font-semibold">Ocena: {gradeValue}</div>
                                        <div className="font-semibold">Uczeń: {grade.studentName}</div>
                                        {gradeType && (
                                          <div><span className="font-medium">Typ:</span> {gradeType}</div>
                                        )}
                                        {grade.quiz_title && (
                                          <div><span className="font-medium">Quiz:</span> {grade.quiz_title}</div>
                                        )}
                                        {grade.percentage !== undefined && (
                                          <div><span className="font-medium">Wynik:</span> {grade.percentage}%</div>
                                        )}
                                        {gradeDescription && (
                                          <div><span className="font-medium">Opis:</span> {gradeDescription}</div>
                                        )}
                                        {gradeDate && (
                                          <div><span className="font-medium">Data:</span> {new Date(gradeDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/')}</div>
                                        )}
                                      </div>
                                      {/* Arrow */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Brak ocen w tym przedmiocie</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                            {subjectGrades.length > 0 ? calculateAverage(subjectGrades) : 'Brak ocen'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden space-y-4 p-4">
                {mandatoryCourses.map(([subject, subjectGrades], idx) => (
                  <div key={`mandatory-mobile-${subject}-${idx}`} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-base truncate">{subject}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Średnia: <span className="font-semibold text-blue-600">
                            {subjectGrades.length > 0 ? calculateAverage(subjectGrades) : 'Brak ocen'}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    {subjectGrades.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 mb-2">Oceny:</p>
                        <div className="flex flex-wrap gap-2">
                          {subjectGrades.map((grade) => {
                            const gradeValue = grade.grade || grade.value || grade.value_grade;
                            const gradeDate = grade.date || grade.graded_at || '';
                            const gradeType = grade.gradeType || grade.type || '';
                            
                            return (
                              <div key={grade.id} className="flex flex-col">
                                <button
                                  className={`min-w-[48px] min-h-[48px] px-4 py-2 rounded-lg font-bold text-base shadow-sm ${getGradeColor(gradeValue)}`}
                                >
                                  {gradeValue}
                                </button>
                                {(gradeType || gradeDate) && (
                                  <div className="mt-1 text-[10px] text-gray-600 text-center">
                                    {gradeType && <div className="truncate">{gradeType}</div>}
                                    {gradeDate && <div>{new Date(gradeDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Brak ocen w tym przedmiocie</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          </div>

          {/* Przedmioty fakultatywne */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-white/20">
            <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-green-600 to-green-700">
              <h2 className="text-lg sm:text-xl font-bold text-white">Przedmioty fakultatywne</h2>
      </div>

          {/* Dodatkowy odstęp aby tooltip nie był przykrywany */}
          <div className="h-8"></div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie ocen...</p>
        </div>
          ) : electiveCourses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-gray-400" />
      </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Brak przedmiotów fakultatywnych</h3>
              <p className="text-gray-600">Nie masz jeszcze żadnych przedmiotów fakultatywnych.</p>
        </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Przedmiot</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Oceny</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Średnia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {electiveCourses.map(([subject, subjectGrades], idx) => (
                      <tr key={`elective-${subject}-${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="font-semibold text-gray-800 text-base">{subject}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {subjectGrades.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {subjectGrades.map((grade) => {
                                const gradeValue = grade.grade || grade.value || grade.value_grade;
                                const gradeDate = grade.date || grade.graded_at || '';
                                const gradeType = grade.gradeType || grade.type || '';
                                const gradeDescription = grade.description || grade.comments || '';
                                
                                return (
                                  <div key={grade.id} className="relative group">
                                    <button
                                      className={`px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${getGradeColor(gradeValue)}`}
                                    >
                                      {gradeValue}
                                    </button>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[250px] max-w-[350px]">
                                      <div className="space-y-1">
                                        <div className="font-semibold">Ocena: {gradeValue}</div>
                                        <div className="font-semibold">Uczeń: {grade.studentName}</div>
                                        {gradeType && (
                                          <div><span className="font-medium">Typ:</span> {gradeType}</div>
                                        )}
                                        {grade.quiz_title && (
                                          <div><span className="font-medium">Quiz:</span> {grade.quiz_title}</div>
                                        )}
                                        {grade.percentage !== undefined && (
                                          <div><span className="font-medium">Wynik:</span> {grade.percentage}%</div>
                                        )}
                                        {gradeDescription && (
                                          <div><span className="font-medium">Opis:</span> {gradeDescription}</div>
                                        )}
                                        {gradeDate && (
                                          <div><span className="font-medium">Data:</span> {new Date(gradeDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/')}</div>
                                        )}
                                      </div>
                                      {/* Arrow */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Brak ocen w tym przedmiocie</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            {subjectGrades.length > 0 ? calculateAverage(subjectGrades) : 'Brak ocen'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden space-y-4 p-4">
                {electiveCourses.map(([subject, subjectGrades], idx) => (
                  <div key={`elective-mobile-${subject}-${idx}`} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-base truncate">{subject}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Średnia: <span className="font-semibold text-green-600">
                            {subjectGrades.length > 0 ? calculateAverage(subjectGrades) : 'Brak ocen'}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    {subjectGrades.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 mb-2">Oceny:</p>
                        <div className="flex flex-wrap gap-2">
                          {subjectGrades.map((grade) => {
                            const gradeValue = grade.grade || grade.value || grade.value_grade;
                            const gradeDate = grade.date || grade.graded_at || '';
                            const gradeType = grade.gradeType || grade.type || '';
                            
                            return (
                              <div key={grade.id} className="flex flex-col">
                                <button
                                  className={`min-w-[48px] min-h-[48px] px-4 py-2 rounded-lg font-bold text-base shadow-sm ${getGradeColor(gradeValue)}`}
                                >
                                  {gradeValue}
                                </button>
                                {(gradeType || gradeDate) && (
                                  <div className="mt-1 text-[10px] text-gray-600 text-center">
                                    {gradeType && <div className="truncate">{gradeType}</div>}
                                    {gradeDate && <div>{new Date(gradeDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Brak ocen w tym przedmiocie</p>
                    )}
                  </div>
                ))}
              </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* Modal dodawania oceny */}
      {showAddGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto my-auto">
            <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Dodaj nową ocenę</h2>
              <button 
                onClick={() => setShowAddGradeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddGrade} className="space-y-4">
                {/* Wybór ucznia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uczeń *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Wyszukaj ucznia..."
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showStudentDropdown && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {students
                          .filter(student => 
                            student.displayName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                            student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
                          )
                          .map(student => (
                                <button
                              key={student.uid}
                                  type="button"
                              onClick={() => {
                                setSelectedStudent(student.uid);
                                setStudentSearchTerm(student.displayName);
                                setShowStudentDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors"
                            >
                              <div className="font-medium">{student.displayName}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                                </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Wybór przedmiotu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Przedmiot *
                  </label>
                  <select
                    value={gradeData.subject}
                    onChange={(e) => {
                      setGradeData(prev => ({ ...prev, subject: e.target.value }));
                      const courseId = teacherCoursesMap.get(e.target.value);
                      setGradeData(prev => ({ ...prev, courseId: courseId || '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Wybierz przedmiot</option>
                    {teacherSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
              </div>

                {/* Ocena */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ocena *
                  </label>
                  <input
                    type="text"
                    value={gradeData.grade}
                    onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                    placeholder="np. 4, 5, 3+"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                {/* Typ oceny */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typ oceny
                  </label>
                  <select
                    value={gradeData.gradeType}
                    onChange={(e) => setGradeData(prev => ({ ...prev, gradeType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Wybierz typ</option>
                    {GRADE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={gradeData.date}
                    onChange={(e) => setGradeData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
              </div>

                {/* Opis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opis
                </label>
                <textarea
                  value={gradeData.description}
                  onChange={(e) => setGradeData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Dodatkowe informacje o ocenie..."
                  rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

                {/* Komunikaty */}
                {addGradeError && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {addGradeError}
                  </div>
                )}
              {addGradeSuccess && (
                  <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  {addGradeSuccess}
                </div>
              )}
              
                {/* Przyciski */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddGradeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                    disabled={addGradeLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {addGradeLoading ? 'Dodawanie...' : 'Dodaj ocenę'}
                </button>
              </div>
            </form>
          </div>
        </div>
                        </div>
                      )}
    </div>
  );
} 