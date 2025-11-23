"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

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
  const dayOfWeek = (monday.getDay() + 6) % 7;
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
            {monthsPl[current.getMonth()]} {current.getFullYear()}
          </div>
          <div className="text-sm text-slate-600 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200">
            {formatDateRange(current)}
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
          <div className="font-bold p-6 h-20 text-center border-b border-r bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
            <span className="text-xl">Poniedziałek</span>
          </div>
          <div className="font-bold p-6 h-20 text-center border-b border-r bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
            <span className="text-xl">Wtorek</span>
          </div>
          <div className="font-bold p-6 h-20 text-center border-b border-r bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
            <span className="text-xl">Środa</span>
          </div>
          <div className="font-bold p-6 h-20 text-center border-b border-r bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
            <span className="text-xl">Czwartek</span>
          </div>
          <div className="font-bold p-6 h-20 text-center border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
            <span className="text-xl">Piątek</span>
          </div>

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
                {[1, 2, 3, 4, 5].map((dayNum) => (
                  <div 
                    key={`${index}-${dayNum}`} 
                    className="border-r border-b border-slate-200 p-6 bg-white hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 transition-all duration-200 cursor-pointer group relative"
                  >
                    <div className="text-sm text-slate-400 mb-3 font-medium">{slot.startTime}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-300 group-hover:text-slate-400 transition-colors duration-200">
                        Kliknij aby dodać lekcję
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 hover:bg-slate-100 rounded-lg">
                        <Plus className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="mt-8 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200 shadow-lg">
        <h3 className="font-bold text-slate-900 text-xl mb-6 flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg"></div>
          Legenda przedmiotów
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Matematyka</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Język polski</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Historia</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Biologia</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Chemia</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Fizyka</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonSchedule; 