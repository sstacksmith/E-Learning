'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

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

  // Filtrowanie wydarzeń dla ucznia
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
    // nauczyciel/admin widzą wszystko
    console.log('Teacher/admin - showing all events');
    return events;
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
      if (event) setEditEvent(event);
    } else {
      // Dla ucznia - przekieruj do kursu jeśli event ma courseId
      if (event?.courseId) {
        router.push(`/homelogin/student/courses/${event.courseId}`);
      } else {
        alert(`Wydarzenie: ${info.event.title}\nOpis: ${info.event.extendedProps.description}`);
      }
    }
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
      await updateDoc(doc(db, 'events', editEvent.id), {
        title: editEvent.title,
        description: editEvent.description,
        date: editEvent.date,
        startTime: editEvent.startTime,
        endTime: editEvent.endTime,
        assignedTo: editEvent.assignedTo,
      });
      setEditSuccess('Wydarzenie zaktualizowane!');
      // Odśwież listę wydarzeń natychmiast
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);
      setEditEvent(null);
    } catch (err) {
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

  // Eventy z wybranego dnia
  const eventsForSelectedDate = selectedDate
    ? filteredEvents.filter(ev => ev.date === selectedDate)
    : [];

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

  // Przekierowanie do kursu
  function goToCourse(courseId: string | undefined) {
    if (courseId) {
      router.push(`/homelogin/student/courses/${courseId}`);
    }
  }

  return (
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
        height="auto"
        locale="pl"
        eventContent={renderEventContent}
      />
    </div>
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
                  Termin: {new Date(ev.deadline).toLocaleString('pl-PL')}
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

  // Filtrowanie wydarzeń dla ucznia
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
    return events;
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