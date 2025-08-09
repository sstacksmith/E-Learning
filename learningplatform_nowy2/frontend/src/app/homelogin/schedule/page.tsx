"use client";

import LessonSchedule from '@/components/LessonSchedule';
import Providers from '@/components/Providers';
import Link from 'next/link';

function SchedulePageContent() {


  return (
    <div className="min-h-screen bg-[#F4F6FB] py-6 md:py-8 px-2 md:px-8">
      <div className="max-w-[1400px] mx-auto">
        <Link 
          href="/homelogin" 
          className="inline-flex items-center gap-2 text-[#4067EC] hover:text-[#3050b3] transition-colors mb-4"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 19l-7-7m0 0l7-7m-7 7h18" 
            />
          </svg>
          <span className="font-medium">Powrót</span>
        </Link>

        <div className="bg-white w-full p-4 md:p-6 rounded-2xl shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Plan lekcji</h1>
          </div>

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