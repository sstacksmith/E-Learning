'use client';

import Calendar from '@/components/Calendar';

export default function StudentCalendarPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Kalendarz wydarzeń</h1>
      <Calendar />
    </div>
  );
}

