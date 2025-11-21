'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, TrendingUp, Award, Clock, Calendar, Star, Trophy, Target } from 'lucide-react';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
// Import Recharts bezpośrednio - lazy loading powodował problemy z typami
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ThemeToggle from '@/components/ThemeToggle';

interface DailyStats {
  [date: string]: number;
}

interface UserLearningData {
  userId: string;
  totalMinutes: number;
  dailyStats: DailyStats;
  createdAt: any;
  lastUpdated: any;
}

interface Grade {
  id: string;
  user_id?: string;
  studentId?: string;
  studentEmail?: string;
  course_id?: string;
  value?: number;
  value_grade?: number;
  grade?: string | number;
  comment?: string;
  graded_by?: string;
  graded_at?: string;
  date?: string;
  quiz_id?: string;
  quiz_title?: string;
  subject?: string;
  grade_type?: string;
  percentage?: number;
}

export default function StatisticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [learningData, setLearningData] = useState<UserLearningData | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchLearningData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userTimeDoc = doc(db, 'userLearningTime', user.uid);
        const docSnap = await getDoc(userTimeDoc);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserLearningData;
          setLearningData(data);
          console.log('📊 Loaded learning data:', data);
        } else {
          console.log('No learning data found for user');
          setLearningData(null);
        }
      } catch (error) {
        console.error('Error fetching learning data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningData();
  }, [user]);

  // Pobierz oceny użytkownika
  useEffect(() => {
    const fetchGrades = async () => {
      if (!user?.uid) {
        setGradesLoading(false);
        return;
      }

      try {
        // Pobierz wszystkie oceny równolegle zamiast sekwencyjnie
        const [gradesByUid, gradesByEmail, gradesByStudentId] = await Promise.all([
          getDocs(query(collection(db, 'grades'), where('user_id', '==', user.uid), limit(100))),
          user.email ? getDocs(query(collection(db, 'grades'), where('studentEmail', '==', user.email), limit(100))) : Promise.resolve({ docs: [] } as any),
          getDocs(query(collection(db, 'grades'), where('studentId', '==', user.uid), limit(100)))
        ]);

        // Połącz wszystkie listy i usuń duplikaty
        const allGrades = [
          ...gradesByUid.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Grade)),
          ...gradesByEmail.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Grade)),
          ...gradesByStudentId.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Grade))
        ];
        const uniqueGrades = allGrades.filter((grade, index, self) =>
          index === self.findIndex(g => g.id === grade.id)
        );

        setGrades(uniqueGrades);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setGradesLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  // Formatuj minuty na godziny i minuty
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Pobierz dzisiejsze minuty
  const getTodayMinutes = () => {
    if (!learningData?.dailyStats) return 0;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    return learningData.dailyStats[dateKey] || 0;
  };

  // Przygotuj dane dla wykresu tygodniowego (ostatnie 7 dni)
  const getWeeklyData = () => {
    if (!learningData?.dailyStats) return [];
    
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      const minutes = learningData.dailyStats[dateKey] || 0;
      
      let label;
      if (i === 0) label = 'Dzisiaj';
      else if (i === 1) label = 'Wczoraj';
      else {
        label = date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
      }
      
      data.push({
        day: label,
        minutes: minutes,
        formatted: formatMinutes(minutes)
      });
    }
    
    return data;
  };

  // Przygotuj dane dla wykresu miesięcznego (ostatnie 30 dni)
  const getMonthlyData = () => {
    if (!learningData?.dailyStats) return [];
    
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      const minutes = learningData.dailyStats[dateKey] || 0;
      
      // Pokaż tylko co 5 dni lub jeśli są dane
      const showLabel = i % 5 === 0 || minutes > 0;
      
      data.push({
        day: showLabel ? date.getDate().toString() : '',
        minutes: minutes,
        formatted: formatMinutes(minutes)
      });
    }
    
    return data;
  };

  // Przygotuj dane dla wykresu rocznego (ostatnie 12 miesięcy)
  const getYearlyData = () => {
    if (!learningData?.dailyStats) return [];
    
    const data = [];
    const today = new Date();
    
    // Grupuj dane po miesiącach
    const monthlyData: { [key: string]: number } = {};
    
    Object.entries(learningData.dailyStats).forEach(([dateKey, minutes]) => {
      const date = new Date(dateKey);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + minutes;
    });
    
    // Utwórz dane dla ostatnich 12 miesięcy
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      
      const minutes = monthlyData[monthKey] || 0;
      
      data.push({
        month: date.toLocaleDateString('pl-PL', { month: 'short' }),
        minutes: minutes,
        hours: minutes / 60,
        formatted: formatMinutes(minutes)
      });
    }
    
    return data;
  };

  // Funkcje do obliczania statystyk ocen
  const getGradeStatistics = () => {
    if (!grades || grades.length === 0) {
      return {
        totalGrades: 0,
        averageGrade: 0,
        bestGrade: 0,
        progress: 0,
        gradeDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    // Normalizuj dane ocen - obsłuż różne formaty
    const normalizedGrades = grades.map(grade => {
      let value = 0;
      
      // Spróbuj różne pola dla wartości oceny
      if (typeof grade.value === 'number') {
        value = grade.value;
      } else if (typeof grade.value_grade === 'number') {
        value = grade.value_grade;
      } else if (typeof grade.grade === 'number') {
        value = grade.grade;
      } else if (typeof grade.grade === 'string') {
        value = parseFloat(grade.grade);
      } else if (typeof grade.value === 'string') {
        value = parseFloat(grade.value);
      }

      // Jeśli mamy procent, skonwertuj na ocenę (1-5)
      if (grade.percentage && value === 0) {
        const percentage = typeof grade.percentage === 'number' ? grade.percentage : parseFloat(grade.percentage);
        if (percentage >= 90) value = 5;
        else if (percentage >= 75) value = 4;
        else if (percentage >= 60) value = 3;
        else if (percentage >= 45) value = 2;
        else value = 1;
      }

      // Upewnij się, że wartość jest w zakresie 1-5
      value = Math.max(1, Math.min(5, Math.round(value)));

      return {
        ...grade,
        normalizedValue: value,
        date: grade.graded_at || grade.date || new Date().toISOString()
      };
    });

    console.log('📊 Normalized grades:', normalizedGrades);

    const totalGrades = normalizedGrades.length;
    const sum = normalizedGrades.reduce((acc, grade) => acc + grade.normalizedValue, 0);
    const averageGrade = totalGrades > 0 ? sum / totalGrades : 0;
    const bestGrade = totalGrades > 0 ? Math.max(...normalizedGrades.map(g => g.normalizedValue)) : 0;
    
    // Oblicz rozkład ocen
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    normalizedGrades.forEach(grade => {
      if (grade.normalizedValue >= 1 && grade.normalizedValue <= 5) {
        distribution[grade.normalizedValue as keyof typeof distribution]++;
      }
    });

    // Oblicz postęp (różnica między ostatnimi a wcześniejszymi ocenami)
    const sortedGrades = [...normalizedGrades].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let progress = 0;
    if (sortedGrades.length >= 4) {
      const recentGrades = sortedGrades.slice(-3); // Ostatnie 3 oceny
      const olderGrades = sortedGrades.slice(0, -3); // Wcześniejsze oceny
      
      if (recentGrades.length > 0 && olderGrades.length > 0) {
        const recentAvg = recentGrades.reduce((acc, g) => acc + g.normalizedValue, 0) / recentGrades.length;
        const olderAvg = olderGrades.reduce((acc, g) => acc + g.normalizedValue, 0) / olderGrades.length;
        progress = recentAvg - olderAvg;
      }
    }

    console.log('📊 Grade statistics:', {
      totalGrades,
      averageGrade: averageGrade.toFixed(2),
      bestGrade,
      progress: progress.toFixed(2),
      distribution
    });

    return {
      totalGrades,
      averageGrade,
      bestGrade,
      progress,
      gradeDistribution: distribution
    };
  };

  const gradeStats = getGradeStatistics();

  // Przygotuj dane dla wykresu rozkładu ocen
  const getGradeDistributionData = () => {
    return [
      { grade: '5', count: gradeStats.gradeDistribution[5], color: '#10B981' },
      { grade: '4', count: gradeStats.gradeDistribution[4], color: '#3B82F6' },
      { grade: '3', count: gradeStats.gradeDistribution[3], color: '#F59E0B' },
      { grade: '2', count: gradeStats.gradeDistribution[2], color: '#EF4444' },
      { grade: '1', count: gradeStats.gradeDistribution[1], color: '#DC2626' }
    ];
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F6FB] via-white to-[#E8ECFF] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
      <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Statystyki nauki</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Przegląd Twojego postępu w nauce</p>
            </div>
              </div>
              </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4067EC]"></div>
            </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 - Całkowity czas nauki */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-white/20 dark:border-gray-700 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Łącznie</span>
        </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {learningData ? formatMinutes(learningData.totalMinutes) : '0m'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Całkowity czas nauki</p>
      </div>

              {/* Card 2 - Dzisiejszy czas */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-white/20 dark:border-gray-700 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600 dark:text-green-300" />
          </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Dzisiaj</span>
        </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatMinutes(getTodayMinutes())}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Czas nauki dzisiaj</p>
              </div>

              {/* Card 3 - Liczba dni */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-white/20 dark:border-gray-700 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-300" />
          </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Aktywność</span>
          </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {learningData ? Object.keys(learningData.dailyStats).length : 0}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Dni nauki</p>
        </div>

              {/* Card 4 - Średni czas dziennie */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-white/20 dark:border-gray-700 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-300" />
          </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Średnia</span>
                  </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {learningData && Object.keys(learningData.dailyStats).length > 0
                    ? formatMinutes(Math.round(learningData.totalMinutes / Object.keys(learningData.dailyStats).length))
                    : '0m'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Średnio dziennie</p>
                </div>
            </div>

            {/* Wykres tygodniowy */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-white/20 dark:border-gray-700 mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#4067EC] dark:text-blue-400" />
                Aktywność w ciągu tygodnia
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getWeeklyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#666' }}
                      tickFormatter={(value: number) => formatMinutes(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatMinutes(value), 'Czas nauki']}
                      labelFormatter={(label) => `Dzień: ${label}`}
                      contentStyle={{
                        backgroundColor: isDark ? '#1f2937' : 'white',
                        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: isDark ? '#f3f4f6' : '#111827'
                      }}
                    />
                    <Bar 
                      dataKey="minutes" 
                      fill="#4067EC"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
      </div>

            {/* Wykres miesięczny */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-white/20 dark:border-gray-700 mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#4067EC] dark:text-blue-400" />
                Aktywność w ciągu miesiąca
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#666' }}
                      tickFormatter={(value: number) => formatMinutes(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatMinutes(value), 'Czas nauki']}
                      labelFormatter={(label) => `Dzień: ${label}`}
                      contentStyle={{
                        backgroundColor: isDark ? '#1f2937' : 'white',
                        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: isDark ? '#f3f4f6' : '#111827'
                      }}
                    />
                    <Bar 
                      dataKey="minutes" 
                      fill="#4067EC"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
          </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">Ostatnie 30 dni</p>
        </div>

            {/* Wykres roczny */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-white/20 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#4067EC] dark:text-blue-400" />
                Aktywność w ciągu roku
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getYearlyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#666' }}
                      tickFormatter={(value: number) => `${Math.round(value)}h`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatMinutes(value), 'Czas nauki']}
                      labelFormatter={(label) => `Miesiąc: ${label}`}
                      contentStyle={{
                        backgroundColor: isDark ? '#1f2937' : 'white',
                        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: isDark ? '#f3f4f6' : '#111827'
                      }}
                    />
                    <Bar 
                      dataKey="hours" 
                      fill="#4067EC"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                  </div>
                </div>
                
            {/* All Daily Stats */}
            {learningData && Object.keys(learningData.dailyStats).length > 7 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-white/20 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Wszystkie dni nauki</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(learningData.dailyStats)
                    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                    .map(([date, minutes]) => (
                      <div key={date} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                          {new Date(date).toLocaleDateString('pl-PL', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                    </div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                          {formatMinutes(minutes)}
                    </div>
                  </div>
                    ))}
                </div>
              </div>
            )}

            {/* Sekcja ocen */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-white/20 dark:border-gray-700 mt-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Średnia Ocen</h2>
              
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Debug Info:</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Ładowanie ocen: {gradesLoading ? 'TAK' : 'NIE'}<br/>
                    Liczba ocen: {grades.length}<br/>
                    Użytkownik: {user?.uid}<br/>
                    Email: {user?.email}
                  </p>
                  {grades.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-yellow-700 dark:text-yellow-300 cursor-pointer">Pokaż szczegóły ocen</summary>
                      <pre className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(grades, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              {/* Główny wskaźnik średniej */}
              <div className="flex justify-center mb-8">
                <div className="relative w-48 h-48">
                  <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Tło okręgu */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Wypełnienie na podstawie średniej */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={gradeStats.averageGrade >= 3 ? "#10B981" : gradeStats.averageGrade >= 2 ? "#F59E0B" : "#EF4444"}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(gradeStats.averageGrade / 5) * 251.2} 251.2`}
                    />
                      </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {gradeStats.averageGrade > 0 ? gradeStats.averageGrade.toFixed(1) : '0.0'}
                      </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">średnia</span>
                    </div>
                    </div>
                  </div>

              {/* Karty statystyk ocen */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Liczba ocen */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                </div>
                  <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-300 mb-1">
                    {gradeStats.totalGrades}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Liczba ocen</p>
              </div>

                {/* Średnia ocen */}
                <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Award className="w-6 h-6 text-white" />
          </div>
          </div>
                  <h3 className="text-3xl font-bold text-green-600 dark:text-green-300 mb-1">
                    {gradeStats.averageGrade > 0 ? gradeStats.averageGrade.toFixed(1) : '0.0'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Średnia ocen</p>
      </div>

                {/* Najlepsza ocena */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-yellow-500 rounded-full">
                      <Trophy className="w-6 h-6 text-white" />
          </div>
        </div>
                  <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-300 mb-1">
                    {gradeStats.bestGrade > 0 ? gradeStats.bestGrade : '0'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Najlepsza ocena</p>
      </div>

                {/* Postęp */}
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500 rounded-full">
                      <Target className="w-6 h-6 text-white" />
          </div>
              </div>
                  <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-300 mb-1">
                    {gradeStats.progress > 0 ? '+' : ''}{gradeStats.progress.toFixed(1)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Postęp</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">vs poprzednie oceny</p>
          </div>
        </div>

              {/* Rozkład ocen */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Rozkład ocen</h3>
                <div className="space-y-4">
                  {getGradeDistributionData().map((item) => (
                    <div key={item.grade} className="flex items-center gap-4">
                      <div className="w-8 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.grade}
          </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ 
                            width: `${gradeStats.totalGrades > 0 ? (item.count / gradeStats.totalGrades) * 100 : 0}%`,
                            backgroundColor: item.color
                          }}
                        >
                          {item.count > 0 && (
                            <span className="text-white text-xs font-semibold">
                              {item.count}
                        </span>
                          )}
                      </div>
                    </div>
                      <div className="w-8 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                        {item.count}
                  </div>
                  </div>
                  ))}
                </div>
              </div>

              {/* Wiadomość motywacyjna */}
              {gradeStats.averageGrade > 0 && gradeStats.averageGrade < 3 && (
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-700 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Target className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Możesz lepiej - Pracuj nad poprawą ocen!
                    </h4>
          </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Twoja średnia wynosi {gradeStats.averageGrade.toFixed(1)}. 
                    Skup się na nauce i regularnym powtarzaniu materiału.
                  </p>
          </div>
        )}

              {gradeStats.averageGrade >= 3 && (
                <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6 border border-green-200 dark:border-green-700 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Trophy className="w-6 h-6 text-green-600 dark:text-green-300" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Świetna robota! Kontynuuj w tym samym tempie!
                    </h4>
          </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Twoja średnia wynosi {gradeStats.averageGrade.toFixed(1)}. 
                    To doskonały wynik!
                  </p>
        </div>
              )}

              {gradeStats.totalGrades === 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Star className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Brak ocen
                    </h4>
          </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Jeszcze nie masz żadnych ocen. Zacznij naukę, aby zobaczyć swoje statystyki!
                  </p>
                      </div>
                    )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 


