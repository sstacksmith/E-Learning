import CreateEvent from '../../../../components/CreateEvent';
import Calendar from '../../../../components/Calendar';

export default function TeacherCalendarPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col">
      {/* Header */}
      <header className="w-full bg-white shadow-sm border-b flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4067EC]">Kalendarz i Aktywności</h1>
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
  );
} 