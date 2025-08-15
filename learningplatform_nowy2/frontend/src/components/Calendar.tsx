"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

// Typy aktywności
const ACTIVITY_COLORS: Record<string, string> = {
  assignment: '#d1f5e0', // pastelowy zielony
  quiz: '#fff9c4',       // pastelowy żółty
  exam: '#FFE4E4',       // pastelowy czerwony dla egzaminów
};

interface Activity {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'assignment' | 'quiz' | 'exam';
  hour?: string;
  typeLabel?: string;
  subject?: string;
  onClick?: () => void;
}

interface FirestoreEvent {
  id: string;
  title?: string;
  date?: string; // YYYY-MM-DD
  type?: 'assignment' | 'quiz' | 'exam';
  deadline?: string;
  startTime?: string;
  subject?: string;
  courseId?: string;
  assignedTo?: string[];
  students?: string[];
}

const daysShort = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'];
const monthsPl = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
];

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [localHighlight, setLocalHighlight] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList: FirestoreEvent[] = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
      setEvents(eventsList);
    };
    fetchEvents();
  }, []);

  // Filtrowanie wydarzeń dla ucznia
  const filteredEvents = useMemo(() => {
    if (!user) return [];
    if (user.role === 'student') {
      return events.filter((event: FirestoreEvent) => {
        if (event.assignedTo && event.assignedTo.includes(user.uid)) {
          return true;
        }
        if (event.students && event.students.includes(user.uid)) {
          return true;
        }
        return false;
      });
    }
    return events;
  }, [events, user]);

  // Mapowanie eventów na aktywności kalendarza
  const activities: Activity[] = useMemo(() => {
    return filteredEvents.map((event: FirestoreEvent) => {
      let date = '';
      let hour = '';
      if (event.deadline) {
        date = event.deadline.slice(0, 10);
        hour = event.deadline.slice(11, 16);
      } else if (event.date) {
        date = event.date;
        hour = event.startTime || '';
      }
      return {
        id: event.id,
        title: event.title || 'Wydarzenie',
        date,
        type: (event.type as Activity['type']) || 'assignment',
        hour,
        typeLabel: event.type,
        subject: event.subject,
        onClick: event.courseId ? () => window.location.href = `/homelogin/my-courses/${event.courseId}` : undefined,
      };
    });
  }, [filteredEvents]);

  // Resetuj podświetlenie po kilku sekundach
  useEffect(() => {
    if (localHighlight) {
      const timeout = setTimeout(() => setLocalHighlight(null), 3500);
      return () => clearTimeout(timeout);
    }
  }, [localHighlight]);

  // Ustal dzisiejszą datę (lokalnie)
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  // Tworzymy siatkę dni (od poniedziałku)
  const days = useMemo(() => {
    // Oblicz dni miesiąca
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const result = [];
    const start = new Date(firstDay);
    // Ustaw na pierwszy poniedziałek przed lub w pierwszym dniu miesiąca
    const dayOfWeek = (firstDay.getDay() + 6) % 7; // 0=pon, 6=niedz
    start.setDate(start.getDate() - dayOfWeek);
    // Oblicz ostatni dzień miesiąca
    const end = new Date(lastDay);
    // Ustaw na ostatnią niedzielę miesiąca
    const endDayOfWeek = (lastDay.getDay() + 6) % 7;
    end.setDate(end.getDate() + (6 - endDayOfWeek));
    // Ile dni do wygenerowania?
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = 0; i < totalDays; i++) {
      const dateStr = getLocalDateString(start);
      const isCurrentMonth = start.getMonth() === current.getMonth();
      const isToday = start.getFullYear() === todayY && start.getMonth() === todayM && start.getDate() === todayD;
      const isWeekend = start.getDay() === 0 || start.getDay() === 6;
      // Aktywności na ten dzień
      const dayActivities = activities.filter(a => a.date === dateStr);
      result.push({
        date: new Date(start),
        dateStr,
        isCurrentMonth,
        isToday,
        isWeekend,
        activities: dayActivities,
      });
      start.setDate(start.getDate() + 1);
    }
    return result;
  }, [current, activities, todayY, todayM, todayD]);

  // Nawigacja
  const prevMonth = () => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className="w-full h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-4 flex-shrink-0">
        <button 
          onClick={prevMonth} 
          className="p-2 lg:p-3 rounded-xl hover:bg-[#F1F4FE] text-[#4067EC] font-bold text-lg lg:text-xl transition-all hover:scale-105"
        >
          <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-bold text-[#4067EC] text-lg lg:text-2xl text-center flex-1">
          {monthsPl[current.getMonth()]} {current.getFullYear()}
        </h2>
        <button 
          onClick={nextMonth} 
          className="p-2 lg:p-3 rounded-xl hover:bg-[#F1F4FE] text-[#4067EC] font-bold text-lg lg:text-xl transition-all hover:scale-105"
        >
          <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2 lg:mb-3 flex-shrink-0">
        {daysShort.map(day => (
          <div key={day} className="text-xs lg:text-sm font-bold text-[#4067EC] text-center p-2 lg:p-3 bg-[#F1F4FE] rounded-lg lg:rounded-xl">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - FULL HEIGHT */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2 flex-1 min-h-0">
        {days.map((day, idx) => {
          let bg = '';
          if (day.isToday) bg = 'bg-[#4067EC] text-white';
          else if (day.isWeekend) bg = 'bg-gray-50';
          
          let activityBg = '';
          if (day.activities.length > 0) {
            const typeOrder = ['exam', 'quiz', 'assignment'];
            const found = typeOrder.find(type => day.activities.some(a => a.type === type));
            if (found) activityBg = ACTIVITY_COLORS[found];
          }
          
          const isHighlighted = localHighlight && day.dateStr === localHighlight;
          
          return (
                         <div
               key={idx}
               className={`h-full min-h-[100px] lg:min-h-[120px] xl:min-h-[140px] rounded-lg lg:rounded-xl p-1 lg:p-2 text-xs lg:text-sm font-medium text-center cursor-pointer transition-all border-2 hover:border-[#4067EC] hover:shadow-lg relative group flex flex-col ${
                 day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
               } ${bg} ${
                 isHighlighted ? 'ring-4 ring-[#4067EC] ring-offset-2 animate-pulse' : ''
               }`}
               style={{ 
                 background: activityBg || undefined, 
                 borderColor: day.isToday ? '#4067EC' : day.isWeekend ? '#E5E7EB' : '#F3F4F6'
               }}
             >
               {/* Date Number */}
               <div className={`font-bold mb-1 lg:mb-2 text-sm lg:text-lg ${day.isToday ? 'text-white' : ''}`}>
                 {day.date.getDate()}
               </div>

              {/* Activities */}
              {day.activities.map(act => {
                const isOverdue = act.date < getLocalDateString(today);
                return (
                                     <div
                     key={act.id}
                     className="mb-1 px-1 lg:px-2 py-0.5 lg:py-1 rounded-md lg:rounded-lg text-xs font-semibold hover:underline flex flex-col items-center transition-all hover:scale-105 w-full"
                     style={{ 
                       color: '#222', 
                       background: ACTIVITY_COLORS[act.type], 
                       cursor: act.onClick ? 'pointer' : 'default' 
                     }}
                     onClick={act.onClick}
                   >
                     <span className="truncate w-full text-center text-xs">
                       {act.title}
                       {isOverdue && (
                         <span className="ml-1 text-red-600 font-bold text-xs align-middle">⚠️</span>
                       )}
                     </span>
                   </div>
                );
              })}
              
              {/* Enhanced Tooltip */}
              {day.activities.length > 0 && (
                <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-max min-w-[280px] bg-white border-2 border-[#4067EC] rounded-xl shadow-2xl p-4 text-sm text-left opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 whitespace-pre-line">
                  <div className="bg-[#F1F4FE] -m-4 mb-3 p-3 rounded-t-xl border-b-2 border-[#4067EC]">
                    <div className="font-bold text-[#4067EC] text-center">
                      {day.date.toLocaleDateString('pl-PL', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                  {day.activities.map((act) => {
                    const isOverdue = act.date < getLocalDateString(today);
                    return (
                      <div key={act.id} className="mb-3 last:mb-0 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="font-bold text-gray-900 mb-2">{act.title}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="font-semibold text-[#4067EC]">Rodzaj:</span> {act.type === 'exam' ? 'Egzamin' : act.typeLabel || act.type}</div>
                          <div><span className="font-semibold text-[#4067EC]">Godzina:</span> {act.hour ? act.hour : 'brak'}</div>
                          <div><span className="font-semibold text-[#4067EC]">Przedmiot:</span> {act.subject ? act.subject : 'brak'}</div>
                          {isOverdue && (
                            <div className="col-span-2 text-red-600 font-bold text-center bg-red-50 p-1 rounded">
                              ⚠️ Po terminie
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend - Compact */}
      <div className="mt-3 lg:mt-4 p-2 lg:p-3 bg-gray-50 rounded-lg lg:rounded-xl flex-shrink-0">
        <h3 className="font-semibold text-gray-800 mb-2 text-sm">Legenda:</h3>
        <div className="flex flex-wrap gap-2 lg:gap-3">
          <div className="flex items-center gap-1 lg:gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.exam }}></div>
            <span className="text-xs text-gray-700">Egzamin</span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.quiz }}></div>
            <span className="text-xs text-gray-700">Quiz</span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.assignment }}></div>
            <span className="text-xs text-gray-700">Zadanie</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar; 