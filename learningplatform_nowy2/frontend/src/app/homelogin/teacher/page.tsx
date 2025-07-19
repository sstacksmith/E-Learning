"use client";
import TeacherRoute from '@/components/TeacherRoute';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from '../../../components/Calendar';
import CreateEvent from '../../../components/CreateEvent';

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' lub 'calendar'

  useEffect(() => {
    router.replace("/homelogin/teacher/courses");
  }, [router]);

  return (
    <TeacherRoute>
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-3 sm:p-4 lg:p-8">
        {/* Loading state while redirecting */}
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-gray-600 text-xs sm:text-sm lg:text-base">Redirecting to courses...</p>
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4 sm:mb-6">
              <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8">
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`${
                    activeTab === 'courses'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 sm:py-3 lg:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200`}
                >
                  Kursy
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`${
                    activeTab === 'calendar'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 sm:py-3 lg:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200`}
                >
                  Kalendarz
                </button>
              </nav>
            </div>
            {/* Content */}
            {activeTab === 'courses' ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  {/* Course Cards */}
                  <div className="bg-white border rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2">Matematyka</h3>
                    <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm lg:text-base">Podstawy algebry i geometrii</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-500">15 uczniów</span>
                      <button className="text-indigo-600 hover:text-indigo-800 text-xs sm:text-sm transition-colors duration-200">
                        Zarządzaj
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2">Fizyka</h3>
                    <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm lg:text-base">Mechanika klasyczna</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-500">12 uczniów</span>
                      <button className="text-indigo-600 hover:text-indigo-800 text-xs sm:text-sm transition-colors duration-200">
                        Zarządzaj
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2">Informatyka</h3>
                    <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm lg:text-base">Programowanie w Python</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-500">18 uczniów</span>
                      <button className="text-indigo-600 hover:text-indigo-800 text-xs sm:text-sm transition-colors duration-200">
                        Zarządzaj
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-6 sm:mt-8">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4">Dodaj nowy kurs</h2>
                  <div className="bg-white border rounded-lg p-3 sm:p-4 lg:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Nazwa kursu
                        </label>
                        <input
                          type="text"
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                          placeholder="Wprowadź nazwę kursu"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Opis
                        </label>
                        <input
                          type="text"
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                          placeholder="Wprowadź opis kursu"
                        />
                      </div>
                    </div>
                    <button className="mt-3 sm:mt-4 bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 text-xs sm:text-sm lg:text-base transition-colors duration-200">
                      Utwórz kurs
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <CreateEvent />
                <div className="bg-white border rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm">
                  <Calendar />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TeacherRoute>
  );
} 