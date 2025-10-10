'use client';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import Providers from '@/components/Providers';
import { ArrowLeft, BookOpen, Award, TrendingUp, Calendar, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Grade {
  id: string;
  subject: string;
  grade?: string;
  value?: string | number;
  value_grade?: string | number;
  description?: string;
  comment?: string;
  date?: string;
  graded_at?: string;
  teacherId?: string;
  gradeType?: string;
  grade_type?: string;
  quiz_title?: string;
  percentage?: number;
  quiz_id?: string;
  course_id?: string;
}

interface GroupedGrades {
  [subject: string]: Grade[];
}

interface Course {
  id: string;
  title?: string;
  name?: string;
  [key: string]: any;
}

function GradesPageContent() {
  console.log('🚀 GradesPageContent function called!');
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>('');
  const [userCourses, setUserCourses] = useState<any[]>([]);

  console.log('🔄 GradesPageContent rendered, user:', user?.uid, 'authLoading:', authLoading);
  console.log('🔄 User object:', user);
  console.log('🔄 AuthLoading object:', authLoading);

  useEffect(() => {
    if (!user) return;
    // Pobierz displayName z Firestore
    const fetchDisplayName = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || '');
      }
    };
    fetchDisplayName();
  }, [user]);

  // Pobierz kursy użytkownika
  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!user) return;
      console.log('🔄 Fetching user courses for:', user.uid, 'email:', user.email);
      
      try {
        // Pobierz kursy gdzie assignedUsers zawiera user.uid
        const coursesByUidQuery = query(
          collection(db, 'courses'),
          where('assignedUsers', 'array-contains', user.uid)
        );
        const coursesByUidSnapshot = await getDocs(coursesByUidQuery);
        const coursesByUidList = coursesByUidSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📚 Courses by UID:', coursesByUidList);

        // Pobierz kursy gdzie assignedUsers zawiera user.email
        const coursesByEmailQuery = query(
          collection(db, 'courses'),
          where('assignedUsers', 'array-contains', user.email)
        );
        const coursesByEmailSnapshot = await getDocs(coursesByEmailQuery);
        const coursesByEmailList = coursesByEmailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📚 Courses by Email:', coursesByEmailList);

        // 🆕 DODATKOWO: Pobierz wszystkie kursy i sprawdź które mają oceny dla tego użytkownika
        const allCoursesSnapshot = await getDocs(collection(db, 'courses'));
        const allCoursesList: Course[] = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📚 All courses in database:', allCoursesList.length);

        // Sprawdź które kursy mają oceny dla tego użytkownika
        const gradesQuery = query(
          collection(db, 'grades'),
          where('user_id', '==', user.uid)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const userGrades = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
        console.log('📊 User grades:', userGrades);

        // Znajdź kursy z ocenami
        const coursesWithGrades: Course[] = [];
        for (const grade of userGrades) {
          if (grade.course_id) {
            const courseWithGrade = allCoursesList.find(course => course.id === grade.course_id);
            if (courseWithGrade && !coursesWithGrades.find(c => c.id === courseWithGrade.id)) {
              coursesWithGrades.push(courseWithGrade);
              console.log('📚 Found course with grade:', courseWithGrade.title || courseWithGrade.name, 'for grade:', grade.value);
            }
          }
        }
        console.log('📚 Courses with grades:', coursesWithGrades);

        // Połącz wszystkie kursy: assigned + z ocenami
        const allCourses = [...coursesByUidList, ...coursesByEmailList, ...coursesWithGrades];
        const uniqueCourses = allCourses.filter((course, index, self) =>
          index === self.findIndex(c => c.id === course.id)
        );
        
        console.log('📚 Final unique courses (assigned + with grades):', uniqueCourses);
        setUserCourses(uniqueCourses);
      } catch (error) {
        console.error('❌ Error fetching user courses:', error);
        setUserCourses([]);
      }
    };
    fetchUserCourses();
  }, [user]);

  const fetchGrades = async () => {
    if (!user) return;
    setLoading(true);
    console.log('🔄 Fetching grades for user:', user.uid);

    // Pobierz wszystkie oceny użytkownika
    const gradesQuery = query(collection(db, 'grades'), where('user_id', '==', user.uid));
    const gradesSnapshot = await getDocs(gradesQuery);
    const gradesList = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
    console.log('📊 Fetched grades:', gradesList);

    // Pobierz również oceny gdzie studentEmail jest równy email użytkownika
    const gradesByEmailQuery = query(collection(db, 'grades'), where('studentEmail', '==', user.email));
    const gradesByEmailSnapshot = await getDocs(gradesByEmailQuery);
    const gradesByEmailList = gradesByEmailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
    console.log('📊 Fetched grades by email:', gradesByEmailList);

    // Połącz obie listy i usuń duplikaty
    const allGrades = [...gradesList, ...gradesByEmailList];
    const uniqueGrades = allGrades.filter((grade, index, self) =>
      index === self.findIndex(g => g.id === grade.id)
    );

    console.log('📊 All unique grades:', uniqueGrades);
    console.log('📊 Grades count:', uniqueGrades.length);
    console.log('📊 Grades details:', uniqueGrades.map(g => ({
      id: g.id,
      subject: g.subject,
      value: g.value,
      quiz_title: g.quiz_title,
      percentage: g.percentage,
      graded_at: g.graded_at
    })));
    setGrades(uniqueGrades);
    setLoading(false);
  };

  // 🆕 Funkcja do ręcznego przypisania kursu (dla debugowania)
  const handleManualCourseAssignment = async (courseId: string) => {
    if (!user || !courseId) return;
    
    try {
      console.log('🔧 Manually assigning user to course:', courseId);
      
      // Pobierz kurs
      const courseDocRef = doc(db, 'courses', courseId);
      const courseDocSnap = await getDoc(courseDocRef);
      
      if (courseDocSnap.exists()) {
        const courseData = courseDocSnap.data();
        const assignedUsers = courseData.assignedUsers || [];
        
        // Dodaj użytkownika jeśli nie jest już przypisany
        if (!assignedUsers.includes(user.uid) && !assignedUsers.includes(user.email)) {
          await updateDoc(courseDocRef, {
            assignedUsers: [...assignedUsers, user.uid, user.email]
          });
          console.log('✅ User manually assigned to course:', courseId);
          alert('Kurs został ręcznie przypisany! Odśwież stronę.');
        } else {
          console.log('ℹ️ User already assigned to course:', courseId);
          alert('Użytkownik jest już przypisany do tego kursu.');
        }
      } else {
        console.error('❌ Course not found:', courseId);
        alert('Kurs nie został znaleziony.');
      }
    } catch (error) {
      console.error('❌ Error manually assigning course:', error);
      alert('Błąd podczas przypisywania kursu.');
    }
  };

  useEffect(() => {
    console.log('🔄 Grades useEffect triggered, user:', user?.uid, 'authLoading:', authLoading);
    console.log('🔄 useEffect dependencies changed - user:', user?.uid, 'authLoading:', authLoading);
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    console.log('✅ User found, fetching grades...');
    fetchGrades();
  }, [user, authLoading]);

  // Grupowanie ocen po przedmiocie i sortowanie po dacie rosnąco
  const groupedGrades: GroupedGrades = grades.reduce((acc, grade) => {
    const subject = grade.subject || 'Inne';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(grade);
    return acc;
  }, {} as GroupedGrades);

  // Funkcja do określania typu kursu (obowiązkowy/fakultatywny)
  const getCourseType = (subject: string): 'obowiązkowy' | 'fakultatywny' => {
    const course = userCourses.find(c => c.title === subject);
    return course?.courseType || 'obowiązkowy'; // domyślnie obowiązkowy
  };

  // Rozdzielenie kursów na obowiązkowe i fakultatywne (włączając kursy bez ocen)
  const allCourses = [...Object.entries(groupedGrades)];
  
  // Dodaj kursy bez ocen do listy
  userCourses.forEach(course => {
    const courseTitle = course.title || course.name || 'Nieznany kurs';
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
      // Jeśli data nie istnieje, traktuj jako najstarszą
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
    // inne przypadki, np. opisowe
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
  const mandatoryCoursesWithGrades = mandatoryCourses.filter(([subject, subjectGrades]) => 
    subjectGrades.length > 0
  );
  const overallAverage = mandatoryCoursesWithGrades.reduce((total, [subject, subjectGrades]) => {
    const avg = calculateAverage(subjectGrades);
    return avg !== '-' ? total + parseFloat(avg) : total;
  }, 0) / (mandatoryCoursesWithGrades.length || 1);

  // Oblicz statystyki
  const totalGrades = grades.length;
  const subjectsCount = Object.keys(groupedGrades).length;
  const mandatorySubjectsCount = mandatoryCourses.length;
  const electiveSubjectsCount = electiveCourses.length;
  const recentGrades = grades.filter(grade => {
    const gradeDate = grade.date || grade.graded_at;
    if (!gradeDate) return false;
    const date = new Date(gradeDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header - pełna szerokość */}
      <div className="w-full bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/homelogin')}
              className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do strony głównej
            </button>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dziennik ocen
            </h1>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleManualCourseAssignment('uJOSNq2Yn6IxkLmSvsgN')}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                title="Przypisz do kursu 'czekolada'"
              >
                🔧 Czekolada
              </button>
              <button
                onClick={fetchGrades}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Ładowanie...' : 'Odśwież'}
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
              {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase() : <User className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{displayName || 'Uczeń'}</h2>
              <p className="text-gray-600">Dziennik ocen i postępów</p>
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
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Przedmiot</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Oceny</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Średnia</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-gray-100">
                  {mandatoryCourses.map(([subject, subjectGrades], idx) => (
                    <tr key={subject} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                          </div>
                          <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">{subject}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {subjectGrades.length > 0 ? (
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {subjectGrades.map((grade, gradeIdx) => {
                              const gradeValue = grade.grade || grade.value || grade.value_grade;
                              const gradeDescription = grade.description || grade.comment || '';
                              const gradeDate = grade.date || grade.graded_at || '';
                              const gradeType = grade.gradeType || grade.grade_type || '';
                              
                              return (
                                <div key={grade.id} className="relative group">
                                  <button
                                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${getGradeColor(gradeValue)}`}
                                  >
                                    {gradeValue}
                                  </button>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[250px] max-w-[350px]">
                                    <div className="space-y-1">
                                      <div className="font-semibold">Ocena: {gradeValue}</div>
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
                          <span className="text-xs sm:text-sm text-gray-500">Brak ocen w tym przedmiocie</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800">
                          {subjectGrades.length > 0 ? calculateAverage(subjectGrades) : 'Brak ocen'}
                      </span>
                      </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
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
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Przedmiot</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Oceny</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Średnia</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-gray-100">
                  {electiveCourses.map(([subject, subjectGrades], idx) => (
                    <tr key={subject} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          </div>
                          <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">{subject}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {subjectGrades.length > 0 ? (
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {subjectGrades.map((grade, gradeIdx) => {
                              const gradeValue = grade.grade || grade.value || grade.value_grade;
                              const gradeDescription = grade.description || grade.comment || '';
                              const gradeDate = grade.date || grade.graded_at || '';
                              const gradeType = grade.gradeType || grade.grade_type || '';
                              
                              return (
                                <div key={grade.id} className="relative group">
                                  <button
                                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${getGradeColor(gradeValue)}`}
                                  >
                                    {gradeValue}
                                  </button>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[250px] max-w-[350px]">
                                    <div className="space-y-1">
                                      <div className="font-semibold">Ocena: {gradeValue}</div>
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
                          <span className="text-xs sm:text-sm text-gray-500">Brak ocen w tym przedmiocie</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-green-100 text-green-800">
                          {subjectGrades.length > 0 ? calculateAverage(subjectGrades) : 'Brak ocen'}
                      </span>
                      </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function GradesPage() {
  return (
    <Providers>
      <GradesPageContent />
    </Providers>
  );
} 