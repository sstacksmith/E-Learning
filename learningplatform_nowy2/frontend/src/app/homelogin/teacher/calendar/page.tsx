import CreateEvent from '../../../../components/CreateEvent';
import Calendar from '../../../../components/Calendar';

export default function TeacherCalendarPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Kalendarz nauczyciela</h1>
      <div className="mb-8">
        <CreateEvent />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <Calendar />
      </div>
    </div>
  );
} 