'use client';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import Providers from '@/components/Providers';
import { ArrowLeft, BookOpen, Award, TrendingUp, Calendar, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Grade {
  id: string;
  subject: string;
  grade: string;
  description: string;
  date: string;
  teacherId: string;
  gradeType?: string;
}

interface GroupedGrades {
  [subject: string]: Grade[];
}

function GradesPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>('');
  const [toast, setToast] = useState<{grade: string, description: string, date: string, gradeType?: string} | null>(null);

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

  useEffect(() => {
    if (!user) return;
    const fetchGrades = async () => {
      setLoading(true);
      const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', user.uid));
      const gradesSnapshot = await getDocs(gradesQuery);
      const gradesList = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
      setGrades(gradesList);
      setLoading(false);
    };
    fetchGrades();
  }, [user]);

  // Grupowanie ocen po przedmiocie i sortowanie po dacie rosnąco
  const groupedGrades: GroupedGrades = grades.reduce((acc, grade) => {
    if (!acc[grade.subject]) acc[grade.subject] = [];
    acc[grade.subject].push(grade);
    return acc;
  }, {} as GroupedGrades);
  
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
  function getGradeColor(grade: string) {
    if (grade === '5' || grade === '6') return 'bg-green-500 text-white shadow-green-200';
    if (grade === '4') return 'bg-emerald-500 text-white shadow-emerald-200';
    if (grade === '3') return 'bg-yellow-500 text-white shadow-yellow-200';
    if (grade === '2') return 'bg-orange-500 text-white shadow-orange-200';
    if (grade === '1') return 'bg-red-500 text-white shadow-red-200';
    if (grade === '+') return 'bg-blue-500 text-white shadow-blue-200';
    if (grade === '-') return 'bg-gray-500 text-white shadow-gray-200';
    // inne przypadki, np. opisowe
    return 'bg-gray-400 text-white shadow-gray-200';
  }

  // Funkcja do liczenia średniej ocen (tylko liczbowych)
  function calculateAverage(grades: Grade[]): string {
    const numericGrades = grades
      .map(g => parseFloat(g.grade.replace(',', '.')))
      .filter(n => !isNaN(n));
    if (numericGrades.length === 0) return '-';
    const avg = numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length;
    return avg.toFixed(2);
  }

  // Oblicz ogólną średnią
  const overallAverage = Object.values(groupedGrades).reduce((total, subjectGrades) => {
    const avg = calculateAverage(subjectGrades);
    return avg !== '-' ? total + parseFloat(avg) : total;
  }, 0) / Object.keys(groupedGrades).length || 0;

  // Oblicz statystyki
  const totalGrades = grades.length;
  const subjectsCount = Object.keys(groupedGrades).length;
  const recentGrades = grades.filter(grade => {
    const gradeDate = new Date(grade.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return gradeDate > thirtyDaysAgo;
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
            
            <div className="w-20"></div>
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
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Przedmioty</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{subjectsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Wszystkie oceny</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{totalGrades}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Średnia ogólna</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{overallAverage.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Ostatnie 30 dni</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{recentGrades}</p>
              </div>
        </div>
        </div>
      </div>

        {/* Grades Table - pełna szerokość */}
        <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-white/20">
          <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
            <h2 className="text-lg sm:text-xl font-bold text-white">Oceny z przedmiotów</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie ocen...</p>
            </div>
          ) : grades.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Brak ocen</h3>
              <p className="text-gray-600">Nie masz jeszcze żadnych ocen do wyświetlenia.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Przedmiot</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Oceny</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Średnia</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Liczba ocen</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(groupedGrades).map(([subject, subjectGrades], idx) => (
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
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {subjectGrades.map((grade, gradeIdx) => (
                        <button
                              key={grade.id}
                              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${getGradeColor(grade.grade)}`}
                          onClick={() => setToast({grade: grade.grade, description: grade.description, date: grade.date, gradeType: grade.gradeType})}
                        >
                          {grade.grade}
                        </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800">
                          {calculateAverage(subjectGrades)}
                      </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="text-xs sm:text-sm text-gray-600">{subjectGrades.length} ocen</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-gray-200 shadow-xl rounded-xl px-4 sm:px-6 py-4 min-w-[280px] sm:min-w-[300px] max-w-sm">
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
            onClick={() => setToast(null)}
            aria-label="Zamknij powiadomienie"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Ocena: {toast.grade}</div>
              {toast.gradeType && (
                <div className="text-xs sm:text-sm text-gray-600 mb-1">
                  <span className="font-medium">Typ:</span> {toast.gradeType}
                </div>
              )}
              <div className="text-xs sm:text-sm text-gray-600 mb-1">
                <span className="font-medium">Opis:</span> {toast.description || 'Brak opisu'}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium">Data:</span> {toast.date || 'Brak daty'}
              </div>
            </div>
          </div>
        </div>
      )}
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