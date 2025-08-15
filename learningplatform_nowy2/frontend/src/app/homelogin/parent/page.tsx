'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Lesson {
  time: string;
  subject: string;
  teacher: string;
  type: 'online' | 'offline';
}

interface DaySchedule {
  day: string;
  date: string;
  lessons: Lesson[];
}

export default function ParentDashboard() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [error] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Symulacja danych - w rzeczywistości zostanie pobrane z API
    const mockSchedule: DaySchedule[] = [
      {
        day: "Poniedziałek",
        date: "15.01",
        lessons: [
          { time: "09:00-09:45", subject: "Matematyka", teacher: "Mgr Anna Nowak", type: "online" },
          { time: "10:00-10:45", subject: "Język Polski", teacher: "Mgr Piotr Wiśniewski", type: "online" },
          { time: "14:00-14:45", subject: "Język Angielski", teacher: "Mgr Sarah Johnson", type: "online" },
        ],
      },
      {
        day: "Wtorek",
        date: "16.01",
        lessons: [
          { time: "09:00-09:45", subject: "Historia", teacher: "Mgr Katarzyna Zielińska", type: "online" },
          { time: "11:00-11:45", subject: "Biologia", teacher: "Dr Marek Kowalczyk", type: "online" },
        ],
      },
      {
        day: "Środa",
        date: "17.01",
        lessons: [
          { time: "09:00-09:45", subject: "Matematyka", teacher: "Mgr Anna Nowak", type: "online" },
          { time: "10:00-10:45", subject: "Fizyka", teacher: "Dr Jan Lewandowski", type: "online" },
          { time: "15:00-15:45", subject: "Chemia", teacher: "Mgr Ewa Dąbrowska", type: "online" },
        ],
      },
      {
        day: "Czwartek",
        date: "18.01",
        lessons: [
          { time: "08:00-08:45", subject: "Język Polski", teacher: "Mgr Piotr Wiśniewski", type: "online" },
          { time: "09:00-09:45", subject: "Geografia", teacher: "Mgr Tomasz Nowicki", type: "online" },
          { time: "13:00-13:45", subject: "Informatyka", teacher: "Mgr Paweł Kowalski", type: "online" },
        ],
      },
      {
        day: "Piątek",
        date: "19.01",
        lessons: [
          { time: "09:00-09:45", subject: "Język Angielski", teacher: "Mgr Sarah Johnson", type: "online" },
          { time: "10:00-10:45", subject: "Matematyka", teacher: "Mgr Anna Nowak", type: "online" },
          { time: "12:00-12:45", subject: "WF", teacher: "Mgr Krzysztof Sporty", type: "offline" },
        ],
      },
    ];

    setTimeout(() => {
      setSchedule(mockSchedule);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Plan Zajęć - Anna Kowalska</h2>
        <p className="text-gray-600 mb-6">Harmonogram zajęć na bieżący tydzień</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {schedule.map((day) => (
          <div key={day.day} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {day.day} - {day.date}
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {day.lessons.map((lesson, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{lesson.subject}</p>
                        <p className="text-sm text-gray-600">{lesson.teacher}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{lesson.time}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lesson.type === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {lesson.type}
                      </span>
                    </div>
                  </div>
                ))}
                {day.lessons.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Brak zajęć w tym dniu
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 