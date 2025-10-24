"use client";
import Image from "next/image";
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const digitalMarketingCourses = [
  { title: "SEO Mastery", level: "Advanced", img: "/thumb.png" },
  { title: "Content Marketing", level: "Intermediate", img: "/thumb.png" },
  { title: "PPC Advertising", level: "Beginner", img: "/thumb.png" },
];

export default function DigitalMarketingCoursesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

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
            Kursy marketingu cyfrowego
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {digitalMarketingCourses.map((course) => (
            <div key={course.title} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 flex flex-col gap-4 border border-white/20 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4">
                <Image src={course.img} alt={course.title} width={48} height={48} className="rounded-lg" />
                <div>
                  <div className="font-semibold text-lg text-gray-800">{course.title}</div>
                  <div className="text-sm text-gray-500">{course.level}</div>
                </div>
              </div>
              <button className="mt-4 bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white px-4 py-2 rounded-lg font-semibold hover:from-[#3155d4] hover:to-[#4067EC] transition-all duration-200 shadow-sm hover:shadow-lg">Zapisz się</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 

