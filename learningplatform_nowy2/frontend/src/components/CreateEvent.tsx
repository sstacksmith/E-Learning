'use client';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Student {
  uid: string;
  displayName: string;
}

function to24HourFormat(value: string): string {
  // Jeśli już jest w formacie HH:mm, zwróć bez zmian
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  // Spróbuj sparsować format 12-godzinny
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '';
  let [_, h, m, ap] = match;
  let hour = parseInt(h, 10);
  if (ap) {
    ap = ap.toUpperCase();
    if (ap === 'PM' && hour < 12) hour += 12;
    if (ap === 'AM' && hour === 12) hour = 0;
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [timeError, setTimeError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as Student))
        .filter(user => user && (user as any).role === 'student');
      setStudents(studentsList);
    };
    fetchStudents();
  }, []);

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
    } catch (err) {
      setError('Błąd podczas tworzenia wydarzenia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8 max-w-xl mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-bold mb-2">Utwórz wydarzenie</h2>
      {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {timeError && <div className="text-red-600 text-sm mb-2">{timeError}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Godzina rozpoczęcia</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={startTime}
            onChange={e => handleTimeChange(setStartTime, e.target.value)}
            placeholder="np. 14:30"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Godzina zakończenia</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={endTime}
            onChange={e => handleTimeChange(setEndTime, e.target.value)}
            placeholder="np. 15:30"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Wybierz uczniów:</label>
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
          {students.map(student => (
            <label key={student.uid} className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={selectedStudents.includes(student.uid)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedStudents([...selectedStudents, student.uid]);
                  } else {
                    setSelectedStudents(selectedStudents.filter(id => id !== student.uid));
                  }
                }}
                className="accent-blue-600"
              />
              {student.displayName}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        className="mt-2 bg-[#4067EC] text-white px-4 py-2 rounded hover:bg-[#3155d4] transition font-semibold disabled:bg-gray-400"
        disabled={loading}
      >
        {loading ? 'Tworzenie...' : 'Utwórz wydarzenie'}
      </button>
    </form>
  );
};

export default CreateEvent; 