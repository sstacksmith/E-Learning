"use client";
import React, { useState } from 'react';

interface TimeSlot {
  startTime: string;
  endTime: string;
  label: string;
}

const timeSlots: TimeSlot[] = [
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

function formatDateRange(date: Date): string {
  const monday = new Date(date);
  const dayOfWeek = (monday.getDay() + 6) % 7; // Konwertuj na poniedziałek (0 = poniedziałek)
  monday.setDate(monday.getDate() - dayOfWeek);
  
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  
  return `${monday.getDate()}-${friday.getDate()} ${monthsPl[monday.getMonth()]}${monday.getMonth() !== friday.getMonth() ? ' - ' + friday.getDate() + ' ' + monthsPl[friday.getMonth()] : ''}`;
}

const LessonSchedule: React.FC = () => {
  const [current, setCurrent] = useState(() => new Date());

  const prevWeek = () => {
    setCurrent(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const nextWeek = () => {
    setCurrent(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevWeek} className="p-1 rounded hover:bg-gray-200 text-[#4067EC] font-bold text-lg">&#8592;</button>
        <div className="text-center">
          <div className="font-semibold text-[#4067EC] text-lg">
            {monthsPl[current.getMonth()]} {current.getFullYear()}
          </div>
          <div className="text-sm text-gray-600">
            {formatDateRange(current)}
          </div>
        </div>
        <button onClick={nextWeek} className="p-1 rounded hover:bg-gray-200 text-[#4067EC] font-bold text-lg">&#8594;</button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 h-[800px]">
          {/* Nagłówki */}
          <div className="font-bold p-2 h-[50px] text-center border-b border-r bg-[#4067EC] text-white">
            Godzina
          </div>
          <div className="font-bold p-2 h-[50px] text-center border-b border-r bg-[#4067EC] text-white">
            Poniedziałek
          </div>
          <div className="font-bold p-2 h-[50px] text-center border-b border-r bg-[#4067EC] text-white">
            Wtorek
          </div>
          <div className="font-bold p-2 h-[50px] text-center border-b border-r bg-[#4067EC] text-white">
            Środa
          </div>
          <div className="font-bold p-2 h-[50px] text-center border-b border-r bg-[#4067EC] text-white">
            Czwartek
          </div>
          <div className="font-bold p-2 h-[50px] text-center border-b bg-[#4067EC] text-white">
            Piątek
          </div>

          {/* Siatka godzin */}
          <div className="contents">
            {timeSlots.map((slot, index) => (
              <React.Fragment key={index}>
                {/* Kolumna godzin */}
                <div className="bg-[#F8F9FB] border-r border-b p-2">
                  <div className="text-sm font-medium text-[#4067EC]">
                    {slot.startTime} - {slot.endTime}
                  </div>
                  <div className="text-xs text-gray-500">
                    Lekcja {slot.label}
                  </div>
                </div>

                {/* Komórki dni */}
                {[1, 2, 3, 4, 5].map((dayNum) => (
                  <div key={`${index}-${dayNum}`} className="border-r border-b p-2">
                    <div className="text-xs text-gray-500">{slot.startTime}</div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonSchedule; 