"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTimeTracking } from '@/context/TimeTrackingContext';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Providers from '@/components/Providers';

interface AssignedCourse {
  id: string;
  title: string;
  timeSpent?: number; // w godzinach
}

function StatisticsPageContent() {
  const { user } = useAuth();
  const { timeData, getTodayTime, getWeekTime, getMonthTime } = useTimeTracking();
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Pobieranie kursów
  useEffect(() => {
    if (!user) return;
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const assignedQuery = query(collection(db, 'assignedCourses'), where('studentId', '==', user.uid));
        const assignedSnapshot = await getDocs(assignedQuery);
        const assignedCourses = assignedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignedCourse));
        setCourses(assignedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
      setLoading(false);
    };
    fetchCourses();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('firebaseToken');
    router.push('/login');
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} godz.` : `${h} godz. ${m} min`;
  };

  const formatTimeShort = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  // Pobieranie statystyk czasu
  const todayTime = getTodayTime();
  const weekTime = getWeekTime();
  const monthTime = getMonthTime();

  // Debug info - sprawdźmy aktualną datę
  const todayDate = new Date();
  const todayDateStr = todayDate.toISOString().split('T')[0];
  console.log('Debug - aktualna data:', {
    todayDate: todayDate.toLocaleDateString('pl-PL'),
    todayDateStr,
    dayOfWeek: todayDate.getDay(),
    dayNames: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][todayDate.getDay()]
  });

  // Stan dla kalendarza
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Funkcja do generowania dni miesiąca
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Znajdź pierwszą niedzielę przed lub w pierwszym dniu miesiąca
    const dayOfWeek = firstDay.getDay(); // 0 = niedziela, 1 = poniedziałek, etc.
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const days = [];
    const currentDate = new Date(startDate);
    const todayStr = new Date().toISOString().split('T')[0]; // Aktualna data w formacie YYYY-MM-DD
    
    // Generuj 35 dni (5 tygodni x 7 dni)
    for (let i = 0; i < 35; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const timeEntry = timeData.dailyTime.find(entry => entry.date === dateStr);
      const timeSpent = timeEntry ? timeEntry.timeSpent : 0;
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = dateStr === todayStr;
      
      // Debug dla kilku pierwszych dni
      if (i < 7) {
        console.log(`Debug dzień ${i}:`, {
          date: currentDate.toLocaleDateString('pl-PL'),
          dateStr,
          isToday,
          dayOfWeek: currentDate.getDay(),
          isCurrentMonth
        });
      }
      
      days.push({
        date: new Date(currentDate),
        dateStr,
        timeSpent,
        isCurrentMonth,
        isToday
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const maxTimeInMonth = Math.max(...calendarDays.map(day => day.timeSpent), 1);

  // Funkcje nawigacji kalendarza
  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Funkcja do kolorowania dni na podstawie czasu nauki
  const getColorIntensity = (timeSpent: number) => {
    if (timeSpent === 0) return 'bg-gray-100';
    const intensity = Math.min(timeSpent / maxTimeInMonth, 1);
    if (intensity < 0.2) return 'bg-blue-200';
    if (intensity < 0.4) return 'bg-blue-300';
    if (intensity < 0.6) return 'bg-blue-400';
    if (intensity < 0.8) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  const getSelectedDayData = () => {
    if (!selectedDate) return null;
    const dayData = calendarDays.find(day => day.dateStr === selectedDate);
    return dayData;
  };

  const selectedDayData = getSelectedDayData();

  // Funkcja testowa do dodawania przykładowych danych
  const addTestData = () => {
    const testData = [];
    const today = new Date();
    
    // Dodaj dane dla ostatnich 10 dni
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const timeSpent = Math.floor(Math.random() * 180) + 30; // 30-210 minut
      
      testData.push({ date: dateStr, timeSpent });
    }
    
    // Zapisz do localStorage
    if (user) {
      const currentData = JSON.parse(localStorage.getItem(`timeTracking_${user.uid}`) || '{"totalTime": 0, "dailyTime": []}');
      const mergedData = {
        ...currentData,
        dailyTime: [...testData, ...currentData.dailyTime],
        totalTime: currentData.totalTime + testData.reduce((sum, entry) => sum + entry.timeSpent, 0)
      };
      localStorage.setItem(`timeTracking_${user.uid}`, JSON.stringify(mergedData));
      
      // Odśwież stronę
      window.location.reload();
    }
  };

  // Funkcja do czyszczenia wszystkich danych
  const clearAllData = async () => {
    if (user && confirm('Czy na pewno chcesz usunąć wszystkie dane o czasie nauki?')) {
      try {
        // Wyczyść localStorage
        localStorage.removeItem(`timeTracking_${user.uid}`);
        
        // Wyczyść Firestore
        const userDocRef = doc(db, 'userTimeTracking', user.uid);
        await deleteDoc(userDocRef);
        
        console.log('Dane zostały usunięte z localStorage i Firestore');
        
        // Odśwież stronę
        window.location.reload();
      } catch (error) {
        console.error('Błąd podczas usuwania danych:', error);
        alert('Wystąpił błąd podczas usuwania danych');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e3eafe] to-[#f5f7ff] flex flex-col items-center py-0">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between bg-white px-12 py-6 border-b border-[#bcd2fa] shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/profile')} className="text-[#4067EC] font-bold text-lg hover:underline flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Go back to profile
          </button>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/courses')} className="text-[#4067EC] font-medium hover:underline">Courses</button>
          <button onClick={() => router.push('/homelogin')} className="text-[#4067EC] font-medium hover:underline">Home</button>
          <button onClick={addTestData} className="bg-green-500 text-white font-semibold px-4 py-2 rounded shadow hover:bg-green-600 transition">Dodaj dane testowe</button>
          <button onClick={clearAllData} className="bg-red-500 text-white font-semibold px-4 py-2 rounded shadow hover:bg-red-600 transition">Wyczyść dane</button>
          <button onClick={handleLogout} className="bg-[#4067EC] text-white font-semibold px-4 py-2 rounded shadow hover:bg-blue-100 transition">Wyloguj się</button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 w-full flex flex-col gap-10 px-0 py-10 items-center justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Achievements & Levels */}
          <div className="bg-[#f3f6ff] rounded-2xl p-8 shadow-lg flex flex-col gap-6">
            <h2 className="font-extrabold text-2xl text-[#4067EC] mb-2">Achievements & Levels</h2>
            <div className="flex gap-6">
              <div className="flex-1 bg-white rounded-xl p-6 flex flex-col items-center shadow border border-[#e3eafe]">
                <svg className="w-10 h-10 text-[#4067EC] mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4m-4-4a4 4 0 018 0" /></svg>
                <span className="font-bold text-lg text-[#222]">Level 5</span>
                <div className="w-full h-2 bg-[#e3eafe] rounded mt-3">
                  <div className="h-2 bg-[#4067EC] rounded" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-6 flex flex-col items-center shadow border border-[#e3eafe]">
                <svg className="w-10 h-10 text-[#4067EC] mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2h5" /></svg>
                <span className="font-bold text-lg text-[#222]">30 Badges</span>
              </div>
              <div className="flex-1 bg-white rounded-xl p-6 flex flex-col items-center shadow border border-[#e3eafe]">
                <svg className="w-10 h-10 text-[#4067EC] mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
                <span className="font-bold text-lg text-[#222]">Experience Points</span>
                <span className="text-base text-[#4067EC] font-semibold">1500 XP</span>
              </div>
            </div>
          </div>
          {/* Certificates */}
          <div className="bg-[#f3f6ff] rounded-2xl p-8 shadow-lg flex flex-col gap-6">
            <h2 className="font-extrabold text-2xl text-[#4067EC] mb-2">Certificates</h2>
            <div className="flex gap-6">
              <div className="flex-1 bg-white rounded-xl p-6 flex flex-col items-center shadow border border-[#e3eafe]">
                <span className="font-bold text-lg text-[#222] mb-3">Course Completion</span>
                <button className="bg-[#4067EC] text-white px-6 py-2 rounded font-bold text-base shadow hover:bg-[#3050b3] transition">View</button>
              </div>
              <div className="flex-1 bg-white rounded-xl p-6 flex flex-col items-center shadow border border-[#e3eafe]">
                <span className="font-bold text-lg text-[#222] mb-3">Advanced Programming</span>
                <button className="bg-[#4067EC] text-white px-6 py-2 rounded font-bold text-base shadow hover:bg-[#3050b3] transition">Download</button>
              </div>
            </div>
          </div>
        </div>
        {/* Learning History usunięty */}
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Learning Time Summary */}
          <div className="bg-[#f3f6ff] rounded-2xl p-8 shadow-lg flex flex-col gap-6">
            <h2 className="font-extrabold text-2xl text-[#4067EC] mb-2">Learning Time Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dzisiaj */}
              <div className="bg-white rounded-xl p-4 flex flex-col items-center shadow border border-[#e3eafe]">
                <svg className="w-8 h-8 text-[#4067EC] mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="font-bold text-lg text-[#222]">Dzisiaj</span>
                <span className="text-base text-[#4067EC] font-semibold">{formatTimeShort(todayTime)}</span>
              </div>
              
              {/* Tydzień */}
              <div className="bg-white rounded-xl p-4 flex flex-col items-center shadow border border-[#e3eafe]">
                <svg className="w-8 h-8 text-[#4067EC] mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
                <span className="font-bold text-lg text-[#222]">Tydzień</span>
                <span className="text-base text-[#4067EC] font-semibold">{formatTimeShort(weekTime)}</span>
              </div>
              
              {/* Miesiąc */}
              <div className="bg-white rounded-xl p-4 flex flex-col items-center shadow border border-[#e3eafe]">
                <svg className="w-8 h-8 text-[#4067EC] mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM3 9h18" />
                </svg>
                <span className="font-bold text-lg text-[#222]">Miesiąc</span>
                <span className="text-base text-[#4067EC] font-semibold">{formatTimeShort(monthTime)}</span>
              </div>
            </div>
            
            {/* Ogólny czas */}
            <div className="bg-white rounded-xl p-6 flex flex-col shadow border border-[#e3eafe]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-[#222]">Kalendarz nauki</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={previousMonth}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-5 h-5 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="font-semibold text-[#4067EC] min-w-[140px] text-center">
                    {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={nextMonth}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-5 h-5 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Dni tygodnia */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'].map(day => (
                  <div key={day} className="text-xs font-semibold text-gray-600 text-center p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Kalendarz */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`
                      aspect-square p-1 rounded text-xs font-medium transition-all hover:scale-110 border-2
                      ${day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                      ${day.isToday ? 'border-[#4067EC] border-2' : 'border-transparent'}
                      ${selectedDate === day.dateStr ? 'ring-2 ring-[#4067EC] ring-offset-1' : ''}
                      ${getColorIntensity(day.timeSpent)}
                    `}
                    title={`${day.date.toLocaleDateString('pl-PL')}: ${formatTime(day.timeSpent)}`}
                  >
                    {day.date.getDate()}
                  </button>
                ))}
              </div>
              
              {/* Legenda */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-600">Mniej</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded"></div>
                  <div className="w-3 h-3 bg-blue-200 rounded"></div>
                  <div className="w-3 h-3 bg-blue-300 rounded"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                </div>
                <span className="text-xs text-gray-600">Więcej</span>
              </div>
              
              {/* Szczegóły wybranego dnia */}
              {selectedDayData ? (
                <div className="bg-[#f3f6ff] rounded-lg p-4 border border-[#e3eafe]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#4067EC]">
                        {selectedDayData.date.toLocaleDateString('pl-PL', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Czas nauki: <span className="font-semibold text-[#4067EC]">{formatTime(selectedDayData.timeSpent)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#4067EC]">
                        {formatTimeShort(selectedDayData.timeSpent)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  Kliknij na dzień, aby zobaczyć szczegóły
                </div>
              )}
              
              {/* Podsumowanie miesiąca */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Całkowity czas w tym miesiącu:</span>
                  <span className="text-xl font-bold text-[#4067EC]">
                    {formatTime(calendarDays
                      .filter(day => day.isCurrentMonth)
                      .reduce((total, day) => total + day.timeSpent, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <Providers>
      <StatisticsPageContent />
    </Providers>
  );
} 