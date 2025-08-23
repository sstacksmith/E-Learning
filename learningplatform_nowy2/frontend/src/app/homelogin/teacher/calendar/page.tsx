'use client';
import CreateEvent from '../../../../components/CreateEvent';
import Calendar from '../../../../components/Calendar';
import { ArrowLeft } from 'lucide-react';

export default function TeacherCalendarPage() {
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
            Kalendarz i Aktywności
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="flex flex-col">
        {/* Header */}
        <header className="w-full bg-white/90 backdrop-blur-xl shadow-sm border-b border-white/20 flex items-center justify-between px-8 py-4">
          <div>
            <h2 className="text-2xl font-bold text-[#4067EC]">Kalendarz i Aktywności</h2>
            <p className="text-gray-600">Zarządzaj wydarzeniami i harmonogramem zajęć</p>
          </div>
        </header>

      {/* Main Content */}
      <main className="flex-1 p-2 lg:p-4">
        <div className="h-full flex flex-col">
          {/* Create Event Section - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 mb-4 lg:mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Utwórz nowe wydarzenie</h2>
            <CreateEvent />
          </div>

          {/* Calendar Section - FULL WIDTH & HEIGHT */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 lg:p-4 flex-1 min-h-0">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 lg:mb-4">Kalendarz wydarzeń</h2>
            <div className="h-full w-full flex-1">
              <Calendar />
            </div>
          </div>
        </div>
      </main>
        </div>
    </div>
  );
} 