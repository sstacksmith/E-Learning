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
  const [events, setEvents] = useState<any[]>([]);
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [localHighlight, setLocalHighlight] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsList);
    };
    fetchEvents();
  }, []);

  // Filtrowanie wydarzeń dla ucznia
  const filteredEvents = useMemo(() => {
    if (!user) return [];
    if (user.role === 'student') {
      return events.filter((event: any) => {
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
    return filteredEvents.map((event: any) => {
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
        title: event.title,
        date,
        type: event.type || 'assignment',
        hour,
        typeLabel: event.type,
        subject: event.subject,
        onClick: event.courseId ? () => window.location.href = `/homelogin/student/courses/${event.courseId}` : undefined,
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

  // Oblicz dni miesiąca
  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
  const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);

  // Tworzymy siatkę dni (od poniedziałku)
  const days = useMemo(() => {
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
  }, [current, activities, todayY, todayM, todayD, firstDay, lastDay]);

  // Nawigacja
  const prevMonth = () => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-200 text-[#4067EC] font-bold text-lg">&#8592;</button>
        <span className="font-semibold text-[#4067EC] text-lg">
          {monthsPl[current.getMonth()]} {current.getFullYear()}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-200 text-[#4067EC] font-bold text-lg">&#8594;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysShort.map(day => (
          <div key={day} className="text-sm font-semibold text-blue-700 text-center p-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          // Kolorowanie tła
          let bg = '';
          if (day.isToday) bg = 'bg-blue-100';
          else if (day.isWeekend) bg = 'bg-gray-100';
          // Aktywność z najwyższym priorytetem (egzamin > quiz > zadanie)
          let activityBg = '';
          if (day.activities.length > 0) {
            const typeOrder = ['exam', 'quiz', 'assignment'];
            const found = typeOrder.find(type => day.activities.some(a => a.type === type));
            if (found) activityBg = ACTIVITY_COLORS[found];
          }
          // Podświetlenie wybranego dnia
          const isHighlighted = localHighlight && day.dateStr === localHighlight;
          return (
            <div
              key={idx}
              className={`aspect-square rounded-lg p-1 text-base font-medium text-center cursor-pointer transition-all border ${day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'} ${bg} relative group ${isHighlighted ? 'ring-4 ring-[#4067EC] ring-offset-2 animate-pulse' : ''}`}
              style={{ background: activityBg || undefined, borderColor: day.isToday ? '#4067EC' : 'transparent' }}
            >
              <div className="font-bold mb-1 text-lg">{day.date.getDate()}</div>
              {day.activities.map(act => {
                // Sprawdź, czy aktywność jest przeterminowana
                const isOverdue = act.date < getLocalDateString(today);
                return (
                  <div
                    key={act.id}
                    className="mt-0.5 px-1 py-0.5 rounded text-base font-semibold hover:underline flex flex-col items-center"
                    style={{ color: '#222', background: ACTIVITY_COLORS[act.type], cursor: act.onClick ? 'pointer' : 'default' }}
                    onClick={act.onClick}
                  >
                    <span>
                      {act.title}
                      {isOverdue && (
<<<<<<< HEAD
                        <span className="ml-1 text-red-600 font-bold text-xs align-middle">Po terminie</span>
=======
                        <span className="ml-1 text-red-600 font-bold text-xs align-middle">⚠️ Po terminie</span>
>>>>>>> c78c990a524da0ea8e1e486de433590987a322d6
                      )}
                    </span>
                  </div>
                );
              })}
              {/* Tooltip na hover na CAŁY DZIEŃ */}
              {day.activities.length > 0 && (
                <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-max min-w-[240px] bg-white border border-gray-300 rounded shadow-lg p-3 text-base text-left opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-pre-line">
                  {day.activities.map((act, i) => (
                    <div key={act.id} className="mb-3 last:mb-0">
<<<<<<< HEAD
                      <div><b>{act.title}</b></div>
                      <div><b>Rodzaj:</b> {act.typeLabel || act.type}</div>
=======
                      <div><b>{act.title}</b> {act.type === 'exam' && <span className="text-red-600 font-bold">(Egzamin)</span>}</div>
                      <div><b>Rodzaj:</b> {act.type === 'exam' ? 'Egzamin' : act.typeLabel || act.type}</div>
>>>>>>> c78c990a524da0ea8e1e486de433590987a322d6
                      <div><b>Godzina:</b> {act.hour ? act.hour : 'brak'}</div>
                      <div><b>Przedmiot:</b> {act.subject ? act.subject : 'brak'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar; 