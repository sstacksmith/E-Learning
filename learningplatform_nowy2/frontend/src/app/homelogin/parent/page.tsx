'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

interface Event {
  id: string;
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  deadline?: string;
  description?: string;
  type?: string;
  assignedTo?: string[];
  students?: string[];
  subject?: string;
  room?: string;
  day?: string;
}

interface ScheduleLesson {
  id: string;
  title: string;
  subject: string;
  time: string;
  room?: string;
  teacher?: string;
}

const timeSlots = [
  { startTime: "8:00", endTime: "8:45", label: "1" },
  { startTime: "8:55", endTime: "9:40", label: "2" },
  { startTime: "9:50", endTime: "10:35", label: "3" },
  { startTime: "10:45", endTime: "11:30", label: "4" },
  { startTime: "11:40", endTime: "12:25", label: "5" },
  { startTime: "12:45", endTime: "13:30", label: "6" },
  { startTime: "13:40", endTime: "14:25", label: "7" },
  { startTime: "14:35", endTime: "15:20", label: "8" }
];

const monthsPl = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
];

const daysOfWeek = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const daysOfWeekShort = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];

export default function ParentDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [assignedStudent, setAssignedStudent] = useState<{ id: string; name: string } | null>(null);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today);
    monday.setDate(diff);
    return monday;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Znajdź przypisanego ucznia
        const parentStudentsRef = collection(db, 'parent_students');
        const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
        const parentStudentsSnapshot = await getDocs(parentStudentsQuery);

        if (parentStudentsSnapshot.empty) {
          setError('Nie masz przypisanego żadnego ucznia.');
          setLoading(false);
          return;
        }

        const studentId = parentStudentsSnapshot.docs[0].data().student;

        // 2. Pobierz dane ucznia
        const usersRef = collection(db, 'users');
        const studentQuery = query(usersRef, where('uid', '==', studentId));
        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
          const studentData = studentSnapshot.docs[0].data();
          setAssignedStudent({
            id: studentId,
            name: `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim() || studentData.username || 'Uczeń'
          });
        }

        // 3. Pobierz wydarzenia dla ucznia
        const eventsRef = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsRef);
        const allEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

        // Filtruj wydarzenia dla przypisanego ucznia
        const studentEvents = allEvents.filter(event => {
          if (event.assignedTo && event.assignedTo.includes(studentId)) {
            return true;
          }
          if (event.students && event.students.includes(studentId)) {
            return true;
          }
          return false;
        });

        setEvents(studentEvents);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Wystąpił błąd podczas pobierania danych.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Funkcje nawigacji tygodnia
  const prevWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const nextWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Funkcja formatująca zakres dat tygodnia
  const formatDateRange = (date: Date): string => {
    const monday = new Date(date);
    const dayOfWeek = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayOfWeek);
    
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    
    return `${monday.getDate()}-${friday.getDate()} ${monthsPl[monday.getMonth()]}${monday.getMonth() !== friday.getMonth() ? ' - ' + friday.getDate() + ' ' + monthsPl[friday.getMonth()] : ''}`;
  };

  // Funkcja pobierająca zajęcia dla danego dnia i slotu czasowego
  const getLessonsForSlot = (dayIndex: number, slot: typeof timeSlots[0]): ScheduleLesson[] => {
    // Oblicz datę dla danego dnia tygodnia (0 = poniedziałek, 4 = piątek)
    const monday = new Date(currentWeek);
    const dayOfWeek = (monday.getDay() + 6) % 7; // Konwertuj na poniedziałek = 0
    monday.setDate(monday.getDate() - dayOfWeek); // Upewnij się, że zaczynamy od poniedziałku
    
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + dayIndex);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayName = daysOfWeek[dayIndex];

    // Pobierz wydarzenia dla tego dnia
    const dayEvents = events.filter(event => {
      // Sprawdź czy wydarzenie jest w tym dniu
      let eventDate: string | null = null;
      if (event.date) {
        eventDate = event.date;
      } else if (event.deadline) {
        eventDate = new Date(event.deadline).toISOString().split('T')[0];
      }

      if (!eventDate || eventDate !== dateStr) return false;

      // Sprawdź czy wydarzenie pasuje do slotu czasowego
      if (event.startTime) {
        const parseTime = (timeStr: string) => {
          const parts = timeStr.split(':');
          if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
          }
          return 0;
        };

        const eventStartMinutes = parseTime(event.startTime);
        const slotStartMinutes = parseTime(slot.startTime);
        const slotEndMinutes = parseTime(slot.endTime);

        return eventStartMinutes >= slotStartMinutes && eventStartMinutes < slotEndMinutes;
      }

      // Jeśli wydarzenie ma dzień tygodnia, sprawdź czy pasuje
      if (event.day && event.day === dayName) {
        return true;
      }

      return false;
    });

    return dayEvents.map(event => ({
      id: event.id,
      title: event.title,
      subject: event.subject || event.title,
      time: event.startTime && event.endTime ? `${event.startTime}-${event.endTime}` : event.startTime || '',
      room: event.room,
      teacher: event.description
    }));
  };

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
            Panel Rodzica
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="w-full">
            {/* Enhanced Navigation Header */}
            <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200/50">
              <button 
                onClick={prevWeek} 
                className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 shadow-md"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <div className="font-bold text-slate-900 text-2xl mb-2">
                  {monthsPl[currentWeek.getMonth()]} {currentWeek.getFullYear()}
                </div>
                <div className="text-sm text-slate-600 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200">
                  {formatDateRange(currentWeek)}
                </div>
              </div>
              
              <button 
                onClick={nextWeek} 
                className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 shadow-md"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Full Width Schedule Grid */}
            <div className="w-full border border-slate-200 rounded-3xl overflow-hidden shadow-xl bg-white">
              <div className="grid grid-cols-6 min-h-[600px]">
                {/* Enhanced Headers */}
                <div className="font-bold p-6 h-20 text-center border-b border-r bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                  <span className="text-xl">Godzina</span>
                </div>
                {daysOfWeek.map((day, index) => (
                  <div key={index} className="font-bold p-6 h-20 text-center border-b border-r bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                    <span className="text-xl">{day}</span>
                  </div>
                ))}

                {/* Enhanced Time Grid */}
                <div className="contents">
                  {timeSlots.map((slot, index) => (
                    <React.Fragment key={index}>
                      {/* Enhanced Time Column */}
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-r border-b border-slate-200 p-6 flex flex-col justify-center hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                        <div className="text-lg font-bold text-blue-600 mb-2">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-sm text-slate-500 font-medium">
                          Lekcja {slot.label}
                        </div>
                      </div>

                      {/* Enhanced Day Cells */}
                      {[0, 1, 2, 3, 4].map((dayIndex) => {
                        const lessons = getLessonsForSlot(dayIndex, slot);
                        return (
                          <div 
                            key={`${index}-${dayIndex}`} 
                            className="border-r border-b border-slate-200 p-6 bg-white hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group relative"
                          >
                            {lessons.length > 0 ? (
                              <div className="space-y-2">
                                {lessons.map((lesson) => (
                                  <div 
                                    key={lesson.id}
                                    className="bg-blue-100 text-blue-800 p-3 rounded-lg border border-blue-200 hover:bg-blue-200 transition-colors"
                                  >
                                    <div className="font-semibold text-sm mb-1">{lesson.subject}</div>
                                    {lesson.time && (
                                      <div className="text-xs text-blue-600 mb-1">{lesson.time}</div>
                                    )}
                                    {lesson.room && (
                                      <div className="text-xs text-blue-500">Sala: {lesson.room}</div>
                                    )}
                                    {lesson.teacher && (
                                      <div className="text-xs text-blue-500 mt-1">{lesson.teacher}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className="text-sm text-slate-400 mb-3 font-medium">{slot.startTime}</div>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-slate-300 group-hover:text-slate-400 transition-colors duration-200">
                                    Brak zajęć
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Legend */}
            <div className="mt-8 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200 shadow-lg">
              <h3 className="font-bold text-slate-900 text-xl mb-6 flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg"></div>
                Plan zajęć - {assignedStudent?.name || 'Uczeń'}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 