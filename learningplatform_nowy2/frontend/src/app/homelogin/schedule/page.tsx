"use client";

import LessonSchedule from '@/components/LessonSchedule';
import Providers from '@/components/Providers';
import { ArrowLeft } from 'lucide-react';

function SchedulePageContent() {


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
            Plan lekcji
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        <div className="bg-white/90 backdrop-blur-xl w-full p-4 md:p-6 rounded-2xl shadow-lg border border-white/20">
          <LessonSchedule />
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Providers>
      <SchedulePageContent />
    </Providers>
  );
} 