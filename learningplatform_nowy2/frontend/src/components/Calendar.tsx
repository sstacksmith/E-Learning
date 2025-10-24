'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

// Funkcja obliczająca datę Wielkanocy (algorytm Gaussa)
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Funkcja zwracająca polskie święta dla danego roku
function getPolishHolidays(year: number): { date: string; name: string }[] {
  const easter = calculateEaster(year);
  const easterMonth = easter.getMonth();
  const easterDay = easter.getDate();
  
  // Poniedziałek Wielkanocny
  const easterMonday = new Date(year, easterMonth, easterDay + 1);
  
  // Zielone Świątki (49 dni po Wielkanocy)
  const pentecost = new Date(year, easterMonth, easterDay + 49);
  
  // Boże Ciało (60 dni po Wielkanocy)
  const corpusChristi = new Date(year, easterMonth, easterDay + 60);
  
  const holidays = [
    { date: `${year}-01-01`, name: 'Nowy Rok' },
    { date: `${year}-01-06`, name: 'Święto Trzech Króli' },
    { date: `${year}-${String(easter.getMonth() + 1).padStart(2, '0')}-${String(easter.getDate()).padStart(2, '0')}`, name: 'Wielkanoc' },
    { date: `${year}-${String(easterMonday.getMonth() + 1).padStart(2, '0')}-${String(easterMonday.getDate()).padStart(2, '0')}`, name: 'Poniedziałek Wielkanocny' },
    { date: `${year}-05-01`, name: 'Święto Pracy' },
    { date: `${year}-05-03`, name: 'Święto Konstytucji 3 Maja' },
    { date: `${year}-${String(pentecost.getMonth() + 1).padStart(2, '0')}-${String(pentecost.getDate()).padStart(2, '0')}`, name: 'Zielone Świątki' },
    { date: `${year}-${String(corpusChristi.getMonth() + 1).padStart(2, '0')}-${String(corpusChristi.getDate()).padStart(2, '0')}`, name: 'Boże Ciało' },
    { date: `${year}-08-15`, name: 'Wniebowzięcie Najświętszej Maryi Panny' },
    { date: `${year}-11-01`, name: 'Wszystkich Świętych' },
    { date: `${year}-11-11`, name: 'Narodowe Święto Niepodległości' },
    { date: `${year}-12-25`, name: 'Boże Narodzenie (pierwszy dzień)' },
    { date: `${year}-12-26`, name: 'Boże Narodzenie (drugi dzień)' },
  ];
  
  return holidays;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  deadline?: string; // For assignments/exams
  type?: 'assignment' | 'exam' | 'event';
  createdBy: string;
  assignedTo?: string[];
  students?: string[]; // For new assignment/exam events
  courseId?: string;
  sectionId?: string;
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const { user } = useAuth();
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [students, setStudents] = useState<{uid: string, displayName: string}[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showQuickEventModal, setShowQuickEventModal] = useState(false);
  const [quickEventDate, setQuickEventDate] = useState<string>('');
  const [tooltipEvent, setTooltipEvent] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const fetchEvents = async () => {
      console.log('Fetching events from Firestore...');
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      console.log('All events from Firestore:', eventsList);
      setEvents(eventsList);
    };
    fetchEvents();

    // Załaduj święta dla kilku lat (poprzedni, bieżący, następny)
    const currentYear = new Date().getFullYear();
    const holidaysMap = new Map<string, string>();
    
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      const yearHolidays = getPolishHolidays(year);
      console.log(`Święta dla roku ${year}:`, yearHolidays);
      yearHolidays.forEach(holiday => {
        holidaysMap.set(holiday.date, holiday.name);
      });
    }
    
    console.log('Wszystkie święta załadowane:', Array.from(holidaysMap.entries()));
    setHolidays(holidaysMap);
  }, []);

  useEffect(() => {
    // Pobierz uczniów do wyboru w edycji
    const fetchStudents = async () => {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as any))
        .filter(user => user && user.role === 'student');
      setStudents(studentsList);
    };
    if (user?.role === 'teacher') fetchStudents();
  }, [user]);

  // Filtrowanie wydarzeń dla użytkownika
  const filteredEvents = React.useMemo(() => {
    console.log('Filtering events for user:', user);
    console.log('All events:', events);
    
    if (!user) return [];
    
    if (user.role === 'student') {
      const filtered = events.filter(event => {
        // Sprawdź czy uczeń jest przypisany do eventu (stara struktura)
        if (event.assignedTo && event.assignedTo.includes(user.uid)) {
          console.log('Event matched by assignedTo:', event);
          return true;
        }
        // Sprawdź czy uczeń jest w liście students (nowa struktura dla zadań/egzaminów)
        if (event.students && event.students.includes(user.uid)) {
          console.log('Event matched by students:', event);
          return true;
        }
        return false;
      });
      console.log('Filtered events for student:', filtered);
      return filtered;
    }
    
    if (user.role === 'parent') {
      // Rodzic widzi wydarzenia swojego przypisanego ucznia
      // TODO: Implement parent-student relationship filtering
      // Na razie rodzic nie widzi żadnych wydarzeń
      console.log('Parent - showing no events (not implemented yet)');
      return [];
    }
    
    // nauczyciel/admin widzą wszystko
    if (user.role === 'teacher' || user.role === 'admin') {
      console.log('Teacher/admin - showing all events');
      return events;
    }
    
    // Dla innych ról - nie pokazuj nic
    console.log('Unknown role - showing no events');
    return [];
  }, [events, user]);

  const calendarEvents = filteredEvents.map(event => {
    // Dla nowych eventów z zadaniami/egzaminami (deadline)
    if (event.deadline) {
      return {
        id: event.id,
        title: event.title,
        start: event.deadline, // Użyj deadline jako start
        end: event.deadline,   // Użyj deadline jako end
        description: event.description,
        type: event.type,
        courseId: event.courseId,
        sectionId: event.sectionId
      };
    }
    // Dla starych eventów (date + startTime/endTime)
    return {
      id: event.id,
      title: event.title,
      start: `${event.date}T${event.startTime}`,
      end: `${event.date}T${event.endTime}`,
      description: event.description,
      type: event.type,
      courseId: event.courseId
    };
  });

  // Obsługa kliknięcia w wydarzenie (edycja dla nauczyciela, przekierowanie dla ucznia)
  const handleEventClick = (info: any) => {
    const event = events.find(e => e.id === info.event.id);
    
    // Ukryj tooltip przy kliknięciu
    setTooltipEvent(null);
    setTooltipPosition(null);
    
    if (user?.role === 'teacher') {
      if (event) {
        console.log('Edytowanie wydarzenia:', event);
        console.log('Przypisani uczniowie:', event.assignedTo);
        setEditEvent(event);
        setEditError('');
        setEditSuccess('');
      }
    } else {
      // Dla ucznia - przekieruj do kursu jeśli event ma courseId
      if (event?.courseId) {
        router.push(`/homelogin/student/courses/${event.courseId}`);
      } else {
        alert(`Wydarzenie: ${info.event.title}\nOpis: ${info.event.extendedProps.description}`);
      }
    }
  };

  // Obsługa najechania na wydarzenie - pokaż tooltip
  const handleEventMouseEnter = (info: any) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      const rect = info.el.getBoundingClientRect();
      setTooltipEvent(event);
      
      // Szerokość tooltip (max-w-sm = 384px)
      const tooltipWidth = 384;
      const tooltipHeight = 200; // Przybliżona wysokość
      const padding = 16;
      
      let x = rect.right + 10;
      let y = rect.top;
      
      // Sprawdź czy tooltip zmieści się po prawej stronie
      if (x + tooltipWidth + padding > window.innerWidth) {
        // Nie zmieści się po prawej - spróbuj po lewej
        x = rect.left - tooltipWidth - 10;
        
        // Jeśli też nie zmieści się po lewej, umieść poniżej
        if (x < padding) {
          x = Math.max(padding, Math.min(rect.left, window.innerWidth - tooltipWidth - padding));
          y = rect.bottom + 10;
        }
      }
      
      // Sprawdź czy tooltip nie wychodzi poza dół ekranu
      if (y + tooltipHeight + padding > window.innerHeight) {
        y = Math.max(padding, window.innerHeight - tooltipHeight - padding);
      }
      
      // Sprawdź czy tooltip nie wychodzi poza górę ekranu
      if (y < padding) {
        y = padding;
      }
      
      setTooltipPosition({ x, y });
    }
  };

  // Obsługa opuszczenia wydarzenia - ukryj tooltip
  const handleEventMouseLeave = () => {
    setTooltipEvent(null);
    setTooltipPosition(null);
  };

  // Obsługa edycji wydarzenia
  const handleEditChange = (field: keyof Event, value: any) => {
    if (!editEvent) return;
    setEditEvent({ ...editEvent, [field]: value });
  };

  const handleEditStudentChange = (uid: string) => {
    if (!editEvent) return;
    const currentAssignedTo = editEvent.assignedTo || [];
    const assignedTo = currentAssignedTo.includes(uid)
      ? currentAssignedTo.filter(id => id !== uid)
      : [...currentAssignedTo, uid];
    setEditEvent({ ...editEvent, assignedTo });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      // Pobierz oryginalne wydarzenie aby porównać uczniów
      const originalEvent = events.find(e => e.id === editEvent.id);
      const originalStudents = originalEvent?.assignedTo || [];
      const newStudents = editEvent.assignedTo || [];
      
      // Znajdź nowo dodanych uczniów
      const addedStudents = newStudents.filter(studentId => !originalStudents.includes(studentId));

      await updateDoc(doc(db, 'events', editEvent.id), {
        title: editEvent.title,
        description: editEvent.description,
        date: editEvent.date,
        startTime: editEvent.startTime,
        endTime: editEvent.endTime,
        assignedTo: editEvent.assignedTo,
      });

      // Utwórz powiadomienia dla nowo dodanych uczniów
      if (addedStudents.length > 0) {
        const notificationPromises = addedStudents.map(studentId => 
          addDoc(collection(db, 'notifications'), {
            user_id: studentId,
            type: 'event',
            title: `Dodano Cię do wydarzenia: ${editEvent.title}`,
            message: editEvent.description || 'Zostałeś przypisany do wydarzenia w kalendarzu',
            timestamp: new Date().toISOString(),
            read: false,
            event_id: editEvent.id,
            event_date: editEvent.date,
            event_time: `${editEvent.startTime} - ${editEvent.endTime}`,
            action_url: '/homelogin/student/calendar'
          })
        );
        await Promise.all(notificationPromises);
      }

      setEditSuccess('Wydarzenie zaktualizowane i powiadomienia wysłane!');
      // Odśwież listę wydarzeń natychmiast
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);
      setEditEvent(null);
    } catch (err) {
      console.error('Error updating event:', err);
      setEditError('Błąd podczas aktualizacji wydarzenia.');
    } finally {
      setEditLoading(false);
    }
  };

  // Usuwanie wydarzenia
  const handleDeleteEvent = async () => {
    if (!editEvent) return;
    setEditLoading(true);
    setEditError('');
    try {
      await deleteDoc(doc(db, 'events', editEvent.id));
      // Odśwież listę wydarzeń natychmiast
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);
      setEditEvent(null);
    } catch (err) {
      setEditError('Błąd podczas usuwania wydarzenia.');
    } finally {
      setEditLoading(false);
    }
  };

  // Dodaj funkcję renderującą treść eventu - uproszczona wersja (tylko tytuł, małe powiadomienie)
  function renderEventContent(eventInfo: any) {
    const { event } = eventInfo;
    const isAssignment = event.extendedProps.type === 'assignment' || event.extendedProps.type === 'exam';
    
    return (
      <div className="event-indicator">
        <div className={`event-dot ${isAssignment ? 'bg-red-500' : 'bg-blue-500'}`}></div>
        <span className="event-title">{event.title}</span>
      </div>
    );
  }

  // Zbiór dat z eventami (YYYY-MM-DD)
  const eventDates = React.useMemo(() => {
    const dates = new Set<string>();
    filteredEvents.forEach(ev => {
      if (ev.date) {
        dates.add(ev.date);
      }
      if (ev.deadline) {
        // Konwertuj deadline (ISO string) na YYYY-MM-DD
        const deadlineDate = new Date(ev.deadline).toISOString().slice(0, 10);
        dates.add(deadlineDate);
      }
    });
    return dates;
  }, [filteredEvents]);

  // Eventy z wybranego dnia
  const eventsForSelectedDate = selectedDate
    ? filteredEvents.filter(ev => ev.date === selectedDate)
    : [];

  // Podświetlanie dni z eventami, weekendów i świąt
  function dayCellClassNames(arg: any) {
    // Użyj lokalnej daty zamiast UTC!
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayOfWeek = arg.date.getDay(); // 0 = niedziela, 6 = sobota
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.has(dateStr);
    
    const classes: string[] = [];
    
    // Święta mają najwyższy priorytet
    if (isHoliday) {
      classes.push('holiday-cell');
    } 
    // Potem weekendy (jeśli to nie święto)
    else if (isWeekend) {
      classes.push('weekend-cell');
    }
    
    // Wydarzenia
    if (eventDates.has(dateStr)) {
      classes.push('!text-[#4067EC]', 'font-bold');
    }
    
    // Kursor dla ucznia
    if (user?.role !== 'teacher') {
      classes.push('cursor-pointer', 'hover:!bg-gray-50');
    }
    
    return classes;
  }

  // Obsługa kliknięcia w dzień - dla ucznia pokazuje aktywności
  function handleDateClick(arg: any) {
    const dateStr = arg.dateStr;
    // Dla ucznia - pokaż aktywności
    if (user?.role !== 'teacher') {
    if (eventDates.has(dateStr)) {
      setSelectedDate(dateStr);
    } else {
      setSelectedDate(null);
    }
  }
  }

  // Dodaj etykiety dni wolnych i świąt
  function dayCellDidMount(arg: any) {
    // Użyj lokalnej daty zamiast UTC!
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const holidayName = holidays.get(dateStr);
    
    if (holidayName) {
      // Dodaj nazwę święta wycentrowaną na kafelku
      const label = document.createElement('div');
      label.className = 'holiday-label';
      label.textContent = holidayName;
      label.title = holidayName;
      // Dodaj do frame zamiast day-top, żeby była na środku całego kafelka
      arg.el.querySelector('.fc-daygrid-day-frame')?.appendChild(label);
    }
  }

  // Oznacz nagłówki dni w widoku tygodniowym
  function dayHeaderClassNames(arg: any) {
    // Użyj lokalnej daty zamiast UTC!
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayOfWeek = arg.date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.has(dateStr);
    
    if (isHoliday) {
      return ['holiday-cell'];
    } else if (isWeekend) {
      return ['weekend-cell'];
    }
    return [];
  }

  // Oznacz kolumny w widoku tygodniowym (time grid)
  function slotLaneClassNames(arg: any) {
    // Użyj lokalnej daty zamiast UTC!
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayOfWeek = arg.date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.has(dateStr);
    
    if (isHoliday) {
      return ['holiday-cell'];
    } else if (isWeekend) {
      return ['weekend-cell'];
    }
    return [];
  }

  // Dodaj nazwę święta do nagłówka dnia w widoku tygodniowym
  function dayHeaderDidMount(arg: any) {
    // Użyj lokalnej daty zamiast UTC!
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const holidayName = holidays.get(dateStr);
    const dayOfWeek = arg.date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (holidayName) {
      // Dodaj nazwę święta do nagłówka
      const label = document.createElement('div');
      label.className = 'holiday-header-label';
      label.textContent = `🎉 ${holidayName}`;
      label.title = holidayName;
      arg.el.querySelector('.fc-col-header-cell-cushion')?.appendChild(label);
    } else if (isWeekend) {
      // Dodaj ikonę weekend do nagłówka
      const label = document.createElement('div');
      label.className = 'weekend-header-label';
      label.textContent = dayOfWeek === 0 ? '🌙 Weekend' : '⭐ Weekend';
      label.title = dayOfWeek === 0 ? 'Niedziela' : 'Sobota';
      arg.el.querySelector('.fc-col-header-cell-cushion')?.appendChild(label);
    }
  }


  // Przekierowanie do kursu
  function goToCourse(courseId: string | undefined) {
    if (courseId) {
      router.push(`/homelogin/student/courses/${courseId}`);
    }
  }

  // Stan dla szybkiego formularza
  const [quickTitle, setQuickTitle] = useState('');
  const [quickStartTime, setQuickStartTime] = useState('');
  const [quickEndTime, setQuickEndTime] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  // Obsługa szybkiego tworzenia wydarzenia
  const handleQuickEventSubmit = async () => {
    if (!quickTitle || !quickStartTime || !quickEndTime) {
      alert('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    setQuickLoading(true);
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'events'), {
        title: quickTitle,
        description: quickDescription,
        date: quickEventDate,
        startTime: quickStartTime,
        endTime: quickEndTime,
        createdBy: 'teacher',
        assignedTo: [],
      });
      
      // Odśwież listę wydarzeń
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);
      
      // Zamknij modal i wyczyść formularz
      setShowQuickEventModal(false);
      setQuickTitle('');
      setQuickDescription('');
      setQuickStartTime('');
      setQuickEndTime('');
      setQuickEventDate('');
    } catch (err) {
      alert('Błąd podczas tworzenia wydarzenia');
      console.error(err);
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <>
    <div className="w-full bg-white rounded-2xl">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={calendarEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
          dayCellClassNames={dayCellClassNames}
          dayCellDidMount={dayCellDidMount}
          dayHeaderClassNames={dayHeaderClassNames}
          dayHeaderDidMount={dayHeaderDidMount}
          slotLaneClassNames={slotLaneClassNames}
          height="auto"
        locale="pl"
          firstDay={1}
        eventContent={renderEventContent}
          dayMaxEvents={3}
          moreLinkText="więcej"
        eventDisplay="block"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          allDaySlot={false}
          nowIndicator={true}
          scrollTime="08:00:00"
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
        />
      </div>

      {/* Modal szybkiego tworzenia wydarzenia */}
      {showQuickEventModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQuickEventModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Szybkie dodanie wydarzenia</h3>
              <button
                onClick={() => setShowQuickEventModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Data: <span className="font-semibold text-[#4067EC]">{new Date(quickEventDate).toLocaleDateString('pl-PL')}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tytuł *</label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    placeholder="np. Sprawdzian z matematyki"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Opis (opcjonalnie)</label>
                  <textarea
                    value={quickDescription}
                    onChange={(e) => setQuickDescription(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] resize-none"
                    rows={2}
                    placeholder="Dodatkowe informacje..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Od *</label>
                    <input
                      type="time"
                      value={quickStartTime}
                      onChange={(e) => setQuickStartTime(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Do *</label>
                    <input
                      type="time"
                      value={quickEndTime}
                      onChange={(e) => setQuickEndTime(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowQuickEventModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleQuickEventSubmit}
                disabled={quickLoading}
                className="flex-1 px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3155d4] transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {quickLoading ? 'Tworzenie...' : 'Utwórz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip po najechaniu na wydarzenie */}
      {tooltipEvent && tooltipPosition && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm animate-fadeIn"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div className="mb-2">
            <h4 className="font-bold text-gray-900 text-lg">{tooltipEvent.title}</h4>
            {tooltipEvent.date && tooltipEvent.startTime && (
              <p className="text-sm text-gray-600 mt-1">
                📅 {new Date(tooltipEvent.date).toLocaleDateString('pl-PL')} • ⏰ {tooltipEvent.startTime} - {tooltipEvent.endTime}
              </p>
            )}
            {tooltipEvent.deadline && (
              <p className="text-sm text-gray-600 mt-1">
                📅 Termin: {new Date(tooltipEvent.deadline).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            )}
          </div>
          {tooltipEvent.description && (
            <p className="text-sm text-gray-700 mb-3">{tooltipEvent.description}</p>
          )}
          {user?.role === 'teacher' && (
            <button
              onClick={() => {
                console.log('Edytowanie z tooltip:', tooltipEvent);
                console.log('Przypisani uczniowie z tooltip:', tooltipEvent.assignedTo);
                setEditEvent(tooltipEvent);
                setTooltipEvent(null);
                setTooltipPosition(null);
                setEditError('');
                setEditSuccess('');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3155d4] transition-colors text-sm font-medium w-full justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edytuj wydarzenie
            </button>
          )}
        </div>
      )}

      {/* Modal edycji wydarzenia (dla nauczyciela) */}
      {editEvent && user?.role === 'teacher' && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditEvent(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edytuj wydarzenie</h3>
              <button
                onClick={() => setEditEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Komunikaty */}
              {editSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {editSuccess}
                </div>
              )}
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {editError}
                </div>
              )}

              {/* Tytuł */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tytuł wydarzenia *</label>
                <input
                  type="text"
                  value={editEvent.title}
                  onChange={(e) => handleEditChange('title', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                  required
                />
              </div>

              {/* Opis */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Opis</label>
                <textarea
                  value={editEvent.description || ''}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] resize-none"
                  rows={3}
                />
              </div>

              {/* Data i godziny */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data *</label>
                  <input
                    type="date"
                    value={editEvent.date || ''}
                    onChange={(e) => handleEditChange('date', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Od *</label>
                  <input
                    type="time"
                    value={editEvent.startTime || ''}
                    onChange={(e) => handleEditChange('startTime', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Do *</label>
                  <input
                    type="time"
                    value={editEvent.endTime || ''}
                    onChange={(e) => handleEditChange('endTime', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    required
      />
    </div>
              </div>

              {/* Wybór uczniów */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Przypisani uczniowie 
                  <span className="ml-2 text-xs text-gray-500">
                    ({editEvent.assignedTo?.length || 0} zaznaczonych)
                  </span>
                </label>
                <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                  {students.length > 0 ? (
                    <>
                      {/* Najpierw pokaż zaznaczonych uczniów */}
                      {students
                        .filter(student => editEvent.assignedTo?.includes(student.uid))
                        .map(student => (
                          <label key={student.uid} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => handleEditStudentChange(student.uid)}
                              className="w-5 h-5 text-[#4067EC] border-gray-300 rounded focus:ring-[#4067EC]"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-gray-900">{student.displayName}</span>
                              <span className="ml-2 text-xs text-blue-600">✓ Przypisany</span>
                            </div>
                          </label>
                        ))}
                      
                      {/* Potem pokaż pozostałych uczniów */}
                      {students
                        .filter(student => !editEvent.assignedTo?.includes(student.uid))
                        .map(student => (
                          <label key={student.uid} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => handleEditStudentChange(student.uid)}
                              className="w-5 h-5 text-[#4067EC] border-gray-300 rounded focus:ring-[#4067EC]"
                            />
                            <span className="text-sm text-gray-700">{student.displayName}</span>
                          </label>
                        ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Brak dostępnych uczniów</p>
                  )}
                </div>
              </div>

              {/* Przyciski akcji */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={editLoading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:bg-gray-400"
                >
                  Usuń wydarzenie
                </button>
                <div className="flex-1"></div>
                <button
                  type="button"
                  onClick={() => setEditEvent(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3155d4] transition-colors font-medium disabled:bg-gray-400"
                >
                  {editLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Komponent do wyświetlania aktywności
export const ActivityPanel: React.FC<{ selectedDate: string | null, events: Event[] }> = ({ selectedDate, events }) => {
  const router = useRouter();
  
  // Eventy z wybranego dnia
  const eventsForSelectedDate = selectedDate
    ? events.filter(ev => {
        if (ev.date === selectedDate) return true;
        if (ev.deadline) {
          const deadlineDate = new Date(ev.deadline).toISOString().slice(0, 10);
          return deadlineDate === selectedDate;
        }
        return false;
      })
    : [];

  // Przekierowanie do kursu
  function goToCourse(courseId: string | undefined) {
    if (courseId) {
      router.push(`/homelogin/student/courses/${courseId}`);
    }
  }

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-[#4067EC]">Aktywności</h3>
      {selectedDate && eventsForSelectedDate.length > 0 ? (
        <ul className="space-y-4">
          {eventsForSelectedDate.map(ev => (
            <li key={ev.id} className={`border-b pb-2 ${ev.deadline ? 'bg-red-50 p-2 rounded' : ''}`}>
              <div className={`font-bold ${ev.deadline ? 'text-red-700' : 'text-[#1a237e]'}`}>{ev.title}</div>
              {ev.deadline ? (
                <div className="text-xs text-[#4067EC]">
                  Termin: {new Date(ev.deadline).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/')}
                </div>
              ) : (
                <div className="text-xs text-[#4067EC]">{ev.startTime} - {ev.endTime}</div>
              )}
              {ev.description && <div className="text-xs text-gray-700 mt-1">{ev.description}</div>}
              {ev.courseId && (
                <button
                  className="mt-2 bg-[#4067EC] text-white px-4 py-1 rounded-lg text-sm font-semibold transition hover:bg-[#3050b3]"
                  onClick={() => goToCourse(ev.courseId)}
                >
                  {ev.deadline ? 'Przejdź do zadania' : 'Przejdź do kursu'}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-400 text-sm">Kliknij w podświetlony dzień, aby zobaczyć aktywności.</div>
      )}
    </div>
  );
};

// Nowy komponent łączący kalendarz z aktywnościami
export const CalendarWithActivity: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);
    };
    fetchEvents();
  }, []);

  // Filtrowanie wydarzeń dla użytkownika
  const filteredEvents = React.useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'student') {
      return events.filter(event => {
        if (event.assignedTo && event.assignedTo.includes(user.uid)) {
          return true;
        }
        if (event.students && event.students.includes(user.uid)) {
          return true;
        }
        return false;
      });
    }
    
    if (user.role === 'parent') {
      // Rodzic widzi wydarzenia swojego przypisanego ucznia
      // TODO: Implement parent-student relationship filtering
      // Na razie rodzic nie widzi żadnych wydarzeń
      return [];
    }
    
    // nauczyciel/admin widzą wszystko
    if (user.role === 'teacher' || user.role === 'admin') {
      return events;
    }
    
    // Dla innych ról - nie pokazuj nic
    return [];
  }, [events, user]);

  const calendarEvents = filteredEvents.map(event => {
    // Dla nowych eventów z zadaniami/egzaminami (deadline)
    if (event.deadline) {
      return {
        id: event.id,
        title: event.title,
        start: event.deadline, // Użyj deadline jako start
        end: event.deadline,   // Użyj deadline jako end
        description: event.description,
        type: event.type,
        courseId: event.courseId,
        sectionId: event.sectionId
      };
    }
    // Dla starych eventów (date + startTime/endTime)
    return {
      id: event.id,
      title: event.title,
      start: `${event.date}T${event.startTime}`,
      end: `${event.date}T${event.endTime}`,
      description: event.description,
      type: event.type,
      courseId: event.courseId
    };
  });

  // Obsługa kliknięcia w wydarzenie (edycja dla nauczyciela, przekierowanie dla ucznia)
  const handleEventClick = (info: any) => {
    const event = events.find(e => e.id === info.event.id);
    
    if (user?.role === 'teacher') {
      // Tutaj można dodać modal do edycji
      alert(`Edycja: ${info.event.title}`);
    } else {
      // Dla ucznia - przekieruj do kursu jeśli event ma courseId
      if (event?.courseId) {
        router.push(`/homelogin/student/courses/${event.courseId}`);
      } else {
        alert(`Wydarzenie: ${info.event.title}\nOpis: ${info.event.extendedProps.description}`);
      }
    }
  };

  // Dodaj funkcję renderującą treść eventu
  function renderEventContent(eventInfo: any) {
    const { event } = eventInfo;
    const start = event.start;
    const godzina = start ? `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}` : '';
    const isAssignment = event.extendedProps.type === 'assignment' || event.extendedProps.type === 'exam';
    
    return (
      <div className={`flex flex-col items-start text-left w-full ${isAssignment ? 'cursor-pointer hover:bg-blue-50 p-1 rounded' : ''}`}>
        <span className={`font-bold leading-tight break-words ${isAssignment ? 'text-red-700' : 'text-[#1a237e]'}`}>
          {event.title}
        </span>
        {godzina && <span className="text-xs text-[#4067EC] font-semibold mt-0.5">{godzina}</span>}
        {event.extendedProps.description && <span className="text-xs text-gray-700 mt-0.5 break-words">{event.extendedProps.description}</span>}
        {isAssignment && user?.role === 'student' && (
          <span className="text-xs text-blue-600 mt-1">Kliknij, aby przejść do kursu</span>
        )}
      </div>
    );
  }

  // Zbiór dat z eventami (YYYY-MM-DD)
  const eventDates = React.useMemo(() => {
    const dates = new Set<string>();
    filteredEvents.forEach(ev => {
      if (ev.date) {
        dates.add(ev.date);
      }
      if (ev.deadline) {
        // Konwertuj deadline (ISO string) na YYYY-MM-DD
        const deadlineDate = new Date(ev.deadline).toISOString().slice(0, 10);
        dates.add(deadlineDate);
      }
    });
    return dates;
  }, [filteredEvents]);

  // Podświetlanie dni z eventami
  function dayCellClassNames(arg: any) {
    const dateStr = arg.date.toISOString().slice(0, 10);
    if (eventDates.has(dateStr)) {
      return ['!bg-blue-100', '!text-[#4067EC]', 'font-bold', 'cursor-pointer', 'hover:!bg-blue-200'];
    }
    return [];
  }

  // Obsługa kliknięcia w dzień
  function handleDateClick(arg: any) {
    const dateStr = arg.dateStr;
    if (eventDates.has(dateStr)) {
      setSelectedDate(dateStr);
    } else {
      setSelectedDate(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Kalendarz - 2/3 szerokości */}
      <div className="lg:col-span-2">
        <div className="bg-white p-4 rounded-2xl shadow">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            dayCellClassNames={dayCellClassNames}
            height="auto"
            locale="pl"
            eventContent={renderEventContent}
            dayMaxEvents={false}
            moreLinkClick="popover"
            eventDisplay="block"
            eventDidMount={(info) => {
              // Sprawdź overflow po załadowaniu wydarzenia
              setTimeout(() => {
                const eventContainer = info.el.closest('.fc-daygrid-day-events') as HTMLElement;
                if (eventContainer) {
                  if (eventContainer.scrollHeight > eventContainer.clientHeight) {
                    eventContainer.classList.add('has-overflow');
                  } else {
                    eventContainer.classList.remove('has-overflow');
                  }
                }
              }, 10);
            }}
          />
        </div>
      </div>
      
      {/* Panel aktywności - 1/3 szerokości */}
      <div className="lg:col-span-1">
        <ActivityPanel selectedDate={selectedDate} events={filteredEvents} />
      </div>
    </div>
  );
};

export default Calendar; 