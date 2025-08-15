'use client';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Student {
  uid: string;
  displayName: string;
  role?: string;
}

function to24HourFormat(value: string): string {
  // Jeśli już jest w formacie HH:mm, zwróć bez zmian
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  // Spróbuj sparsować format 12-godzinny
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, h, m, ap] = match;
  let hour = parseInt(h, 10);
  if (ap) {
    const apUpper = ap.toUpperCase();
    if (apUpper === 'PM' && hour < 12) hour += 12;
    if (apUpper === 'AM' && hour === 12) hour = 0;
  }
  return `${hour.toString().padStart(2, '0')}:${m}`;
}

const CreateEvent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [timeError, setTimeError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...(doc.data() as Record<string, unknown>) } as Student))
        .filter(user => user?.role === 'student');
      setStudents(studentsList);
    };
    fetchStudents();
  }, []);

  // Filtrowanie uczniów na podstawie wyszukiwania
  const filteredStudents = students.filter(student =>
    student.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funkcje do zarządzania wyborem uczniów
  const selectAllStudents = () => {
    setSelectedStudents(filteredStudents.map(student => student.uid));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleTimeChange = (setter: (v: string) => void, value: string) => {
    const formatted = to24HourFormat(value);
    if (formatted) {
      setter(formatted);
      setTimeError('');
    } else {
      setter(value);
      setTimeError('Nieprawidłowy format godziny. Użyj HH:mm, np. 14:30');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    setTimeError('');
    // Walidacja godzin
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      setTimeError('Godziny muszą być w formacie HH:mm, np. 14:30');
      setLoading(false);
      return;
    }
    try {
      await addDoc(collection(db, 'events'), {
        title,
        description,
        date,
        startTime,
        endTime,
        createdBy: 'teacher',
        assignedTo: selectedStudents,
      });
      setSuccess('Wydarzenie zostało utworzone!');
      setTitle('');
      setDescription('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setSelectedStudents([]);
    } catch {
      setError('Błąd podczas tworzenia wydarzenia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
        </div>
      )}
      {timeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {timeError}
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tytuł */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tytuł wydarzenia *</label>
          <input
            type="text"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="np. Sprawdzian z matematyki"
            required
          />
        </div>

        {/* Opis */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Opis (opcjonalnie)</label>
          <textarea
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Dodatkowe informacje o wydarzeniu..."
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Data *</label>
          <input
            type="date"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Godzina rozpoczęcia */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Godzina rozpoczęcia *</label>
          <input
            type="text"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all"
            value={startTime}
            onChange={e => handleTimeChange(setStartTime, e.target.value)}
            placeholder="14:30"
            required
          />
        </div>

        {/* Godzina zakończenia */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Godzina zakończenia *</label>
          <input
            type="text"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all"
            value={endTime}
            onChange={e => handleTimeChange(setEndTime, e.target.value)}
            placeholder="15:30"
            required
          />
        </div>

        {/* Wybór uczniów */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Wybierz uczniów *</label>
          
          {/* Wyszukiwarka uczniów */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Wyszukaj uczniów..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Przyciski zarządzania */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={selectAllStudents}
              className="px-4 py-2 bg-[#4067EC] text-white text-sm font-medium rounded-lg hover:bg-[#3155d4] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Zaznacz wszystkich
            </button>
            <button
              type="button"
              onClick={deselectAllStudents}
              className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Odznacz wszystkich
            </button>
          </div>

          {/* Lista uczniów z checkboxami */}
          <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
            {filteredStudents.length > 0 ? (
              <div className="space-y-3">
                {filteredStudents.map(student => (
                  <label key={student.uid} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#4067EC] hover:bg-[#F1F4FE] transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.uid)}
                      onChange={() => toggleStudent(student.uid)}
                      className="w-4 h-4 text-[#4067EC] border-gray-300 rounded focus:ring-[#4067EC] focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{student.displayName || 'Brak nazwy'}</div>
                      <div className="text-sm text-gray-500">Student</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {selectedStudents.includes(student.uid) ? '✓ Zaznaczony' : '○ Niezaznaczony'}
                    </div>
                  </label>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Brak wyników dla: "{searchTerm}"
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Brak dostępnych uczniów
              </div>
            )}
          </div>

          {/* Licznik wybranych uczniów */}
          {filteredStudents.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              Zaznaczono: <span className="font-semibold text-[#4067EC]">{selectedStudents.length}</span> z <span className="font-semibold">{filteredStudents.length}</span> uczniów
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="bg-[#4067EC] text-white px-8 py-3 rounded-xl hover:bg-[#3155d4] transition-all duration-200 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Tworzenie...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Utwórz wydarzenie
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CreateEvent; 