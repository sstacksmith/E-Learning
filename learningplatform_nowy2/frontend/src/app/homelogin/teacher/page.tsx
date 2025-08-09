"use client";
import TeacherRoute from '@/components/TeacherRoute';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from '../../../components/Calendar';
import CreateEvent from '../../../components/CreateEvent';
import Link from 'next/link';
import PageTransition from '@/components/PageTransition';

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('courses');

  const handleTabClick = (tab: string) => {
    if (tab === 'courses') {
      router.push('/homelogin/teacher/courses');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <TeacherRoute>
      <PageTransition>
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-3 sm:p-4 lg:p-8">
          <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4 sm:mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8">
                  <button
                    onClick={() => handleTabClick('courses')}
                    className={`${
                      activeTab === 'courses'
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-500 text-white rounded-xl'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-indigo-500 text-white rounded-xl'
                    } whitespace-nowrap py-2 sm:py-3 lg:py-4 px-4 font-medium text-xs sm:text-sm transition-colors duration-200 min-w-[100px] w-[100px]`}
                  >
                    Kursy
                  </button>
                  <button
                    onClick={() => handleTabClick('calendar')}
                    className={`${
                      activeTab === 'calendar'
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-500 text-white rounded-xl'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-indigo-500 text-white rounded-xl'
                    } whitespace-nowrap py-2 sm:py-3 lg:py-4 px-4 font-medium text-xs sm:text-sm transition-colors duration-200 min-w-[100px] w-[100px]`}
                  >
                    Kalendarz
                  </button>
                  <button
                    onClick={() => handleTabClick('chat')}
                    className={`${
                      activeTab === 'chat'
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-500 text-white rounded-xl'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-indigo-500 text-white rounded-xl'
                    } whitespace-nowrap py-2 sm:py-3 lg:py-4 px-4 font-medium text-xs sm:text-sm transition-colors duration-200 min-w-[100px] w-[100px]`}
                  >
                    Czat grupowy
                  </button>
                </nav>
              </div>

            {/* Content */}
            {activeTab === 'courses' ? (
              <div className="text-center py-12">
                <div className="mb-6">
                  <svg className="mx-auto h-16 w-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Zarządzanie kursami</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Przejdź do dedykowanej strony kursów, aby zarządzać swoimi kursami, materiałami i uczniami.
                </p>
                <Link 
                  href="/homelogin/teacher/courses"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md !text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                  style={{ color: '#fff' }}
                >
                  Przejdź do kursów
                  <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            ) : activeTab === 'calendar' ? (
              <div className="space-y-4 sm:space-y-6">
                <CreateEvent />
                <div className="bg-white border rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm">
                  <Calendar />
                </div>
              </div>
            ) : activeTab === 'chat' ? (
              <div className="text-center py-12">
                <div className="mb-6">
                  <svg className="mx-auto h-16 w-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Czat grupowy</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Komunikuj się z uczniami i innymi nauczycielami poprzez czat grupowy. Twórz nowe grupy i zarządzaj istniejącymi.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link 
                    href="/homelogin/group-chats"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md !text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                    style={{ color: '#fff' }}
                  >
                    Przejdź do czatu
                    <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link 
                    href="/homelogin/group-chats/create"
                    className="inline-flex items-center px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition-colors duration-200"
                  >
                    Utwórz nowy czat
                    <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </PageTransition>
    </TeacherRoute>
  );
} 