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
  date: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  assignedTo: string[];
  courseId?: string;
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
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
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
    if (!user) return [];
    if (user.role === 'student') {
      return events.filter(event => event.assignedTo && event.assignedTo.includes(user.uid));
    }
    // nauczyciel/admin widzą wszystko
    return events;
  }, [events, user]);

  const calendarEvents = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: `${event.date}T${event.startTime}`,
    end: `${event.date}T${event.endTime}`,
    description: event.description,
  }));

  // Obsługa kliknięcia w wydarzenie (edycja dla nauczyciela)
  const handleEventClick = (info: any) => {
    if (user?.role === 'teacher') {
      const event = events.find(e => e.id === info.event.id);
      if (event) setEditEvent(event);
    } else {
      alert(`Wydarzenie: ${info.event.title}\nOpis: ${info.event.extendedProps.description}`);
    }
  };

  // Obsługa edycji wydarzenia
  const handleEditChange = (field: keyof Event, value: any) => {
    if (!editEvent) return;
    setEditEvent({ ...editEvent, [field]: value });
  };

  const handleEditStudentChange = (uid: string) => {
    if (!editEvent) return;
    const assignedTo = editEvent.assignedTo.includes(uid)
      ? editEvent.assignedTo.filter(id => id !== uid)
      : [...editEvent.assignedTo, uid];
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
    return (
      <div className="flex flex-col items-start text-left w-full">
        <span className="font-bold text-[#1a237e] leading-tight break-words">{event.title}</span>
        {godzina && <span className="text-xs text-[#4067EC] font-semibold mt-0.5">{godzina}</span>}
        {event.extendedProps.description && <span className="text-xs text-gray-700 mt-0.5 break-words">{event.extendedProps.description}</span>}
      </div>
    );
  }

  // Zbiór dat z eventami (YYYY-MM-DD)
  const eventDates = React.useMemo(() => new Set(filteredEvents.map(ev => ev.date)), [filteredEvents]);

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
      router.push(`/courses/${courseId}`);
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
    ? events.filter(ev => ev.date === selectedDate)
    : [];

  // Przekierowanie do kursu
  function goToCourse(courseId: string | undefined) {
    if (courseId) {
      router.push(`/courses/${courseId}`);
    }
  }

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-[#4067EC]">Aktywności</h3>
      {selectedDate && eventsForSelectedDate.length > 0 ? (
        <ul className="space-y-4">
          {eventsForSelectedDate.map(ev => (
            <li key={ev.id} className="border-b pb-2">
              <div className="font-bold text-[#1a237e]">{ev.title}</div>
              <div className="text-xs text-[#4067EC]">{ev.startTime} - {ev.endTime}</div>
              {ev.description && <div className="text-xs text-gray-700 mt-1">{ev.description}</div>}
              {ev.courseId && (
                <button
                  className="mt-2 bg-[#4067EC] text-white px-4 py-1 rounded-lg text-sm font-semibold transition hover:bg-[#3050b3]"
                  onClick={() => goToCourse(ev.courseId)}
                >Przejdź do kursu</button>
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
      return events.filter(event => event.assignedTo && event.assignedTo.includes(user.uid));
    }
    // nauczyciel/admin widzą wszystko
    return events;
  }, [events, user]);

  const calendarEvents = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: `${event.date}T${event.startTime}`,
    end: `${event.date}T${event.endTime}`,
    description: event.description,
  }));

  // Obsługa kliknięcia w wydarzenie (edycja dla nauczyciela)
  const handleEventClick = (info: any) => {
    if (user?.role === 'teacher') {
      const event = events.find(e => e.id === info.event.id);
      // Tutaj można dodać modal do edycji
      alert(`Edycja: ${info.event.title}`);
    } else {
      alert(`Wydarzenie: ${info.event.title}\nOpis: ${info.event.extendedProps.description}`);
    }
  };

  // Dodaj funkcję renderującą treść eventu
  function renderEventContent(eventInfo: any) {
    const { event } = eventInfo;
    const start = event.start;
    const godzina = start ? `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}` : '';
    return (
      <div className="flex flex-col items-start text-left w-full">
        <span className="font-bold text-[#1a237e] leading-tight break-words">{event.title}</span>
        {godzina && <span className="text-xs text-[#4067EC] font-semibold mt-0.5">{godzina}</span>}
        {event.extendedProps.description && <span className="text-xs text-gray-700 mt-0.5 break-words">{event.extendedProps.description}</span>}
      </div>
    );
  }

  // Zbiór dat z eventami (YYYY-MM-DD)
  const eventDates = React.useMemo(() => new Set(filteredEvents.map(ev => ev.date)), [filteredEvents]);

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