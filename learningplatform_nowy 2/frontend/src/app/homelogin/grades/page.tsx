'use client';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import Providers from '@/components/Providers';

interface Grade {
  id: string;
  subject: string;
  grade: string;
  description: string;
  date: string;
  teacherId: string;
  gradeType?: string;
}

interface GroupedGrades {
  [subject: string]: Grade[];
}

function GradesPageContent() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>('');
  const [toast, setToast] = useState<{grade: string, description: string, date: string, gradeType?: string} | null>(null);

  useEffect(() => {
    if (!user) return;
    // Pobierz displayName z Firestore
    const fetchDisplayName = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || '');
      }
    };
    fetchDisplayName();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchGrades = async () => {
      setLoading(true);
      const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', user.uid));
      const gradesSnapshot = await getDocs(gradesQuery);
      const gradesList = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
      setGrades(gradesList);
      setLoading(false);
    };
    fetchGrades();
  }, [user]);

  // Grupowanie ocen po przedmiocie i sortowanie po dacie rosnąco
  const groupedGrades: GroupedGrades = grades.reduce((acc, grade) => {
    if (!acc[grade.subject]) acc[grade.subject] = [];
    acc[grade.subject].push(grade);
    return acc;
  }, {} as GroupedGrades);
  // Sortuj oceny w każdym przedmiocie po dacie rosnąco
  Object.keys(groupedGrades).forEach(subject => {
    groupedGrades[subject].sort((a, b) => {
      // Jeśli data nie istnieje, traktuj jako najstarszą
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  });

  // Funkcja do określania koloru badge na podstawie oceny
  function getGradeColor(grade: string) {
    if (grade === '5' || grade === '6') return 'bg-green-400 text-white';
    if (grade === '4') return 'bg-lime-400 text-white';
    if (grade === '3') return 'bg-yellow-300 text-gray-800';
    if (grade === '2') return 'bg-orange-400 text-white';
    if (grade === '1') return 'bg-red-500 text-white';
    if (grade === '+') return 'bg-blue-200 text-gray-800';
    if (grade === '-') return 'bg-gray-300 text-gray-800';
    // inne przypadki, np. opisowe
    return 'bg-gray-200 text-gray-800';
  }

  // Funkcja do liczenia średniej ocen (tylko liczbowych)
  function calculateAverage(grades: Grade[]): string {
    const numericGrades = grades
      .map(g => parseFloat(g.grade.replace(',', '.')))
      .filter(n => !isNaN(n));
    if (numericGrades.length === 0) return '-';
    const avg = numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length;
    return avg.toFixed(2);
  }

  return (
    <div className="w-full min-h-screen bg-[#f7f9fb] py-8 px-4">
      <div className="flex items-center gap-4 mb-8 max-w-5xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
          {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-800">{displayName}</div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-extrabold mb-6 text-[#1a237e]">Kursy, w których uczestniczę</h2>
        <a href="/homelogin" className="inline-block mb-6 px-4 py-2 bg-white text-[#4067EC] font-bold rounded shadow border-2 border-[#4067EC] hover:bg-[#4067EC] hover:text-white transition">
          Powrót do panelu głównego
        </a>
        <div className="bg-white rounded-2xl shadow-lg p-8 overflow-x-auto border border-[#e3eafe]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f3f6ff]">
                <th className="py-3 px-4 border-b font-extrabold text-[#4067EC] text-lg rounded-tl-xl">Nazwa kursu</th>
                <th className="py-3 px-4 border-b font-extrabold text-[#4067EC] text-lg">Oceny</th>
                <th className="py-3 px-4 border-b font-extrabold text-[#4067EC] text-lg rounded-tr-xl">Średnia ocen</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedGrades).map(([subject, subjectGrades], idx, arr) => (
                <tr key={subject} className={`hover:bg-blue-50 transition ${idx === arr.length - 1 ? 'rounded-b-xl' : ''}`} style={{borderBottom: '1.5px solid #e3eafe'}}>
                  <td className="py-3 px-4 font-semibold text-[#222] align-middle">{subject}</td>
                  <td className="py-3 px-4 font-bold align-middle">
                    {subjectGrades.map((grade, idx) => (
                      <span key={grade.id}>
                        <button
                          className={`px-2 py-1 rounded font-bold mr-2 cursor-pointer border border-gray-200 shadow-sm transition hover:scale-110 ${getGradeColor(grade.grade)}`}
                          onClick={() => setToast({grade: grade.grade, description: grade.description, date: grade.date, gradeType: grade.gradeType})}
                        >
                          {grade.grade}
                        </button>
                        {idx < subjectGrades.length - 1 && <span>, </span>}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#4067EC] text-lg align-middle">{calculateAverage(subjectGrades)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!loading && grades.length === 0) && (
            <div className="text-black font-bold mt-4">Brak ocen do wyświetlenia.</div>
          )}
        </div>
      </div>
      {/* Push notification (toast) */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-gray-300 shadow-lg rounded-lg px-6 py-4 min-w-[260px] max-w-xs animate-fadeIn">
          <button
            className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold"
            onClick={() => setToast(null)}
            aria-label="Zamknij powiadomienie"
          >
            &times;
          </button>
          <div className="font-semibold text-[#4067EC] mb-1">Ocena: {toast.grade}</div>
          {toast.gradeType && <div className="text-gray-700 text-sm mb-1"><span className="font-semibold">Typ:</span> {toast.gradeType}</div>}
          <div className="text-gray-700 text-sm mb-1"><span className="font-semibold">Opis:</span> {toast.description || 'Brak opisu'}</div>
          <div className="text-gray-500 text-xs"><span className="font-semibold">Data:</span> {toast.date || 'Brak daty'}</div>
        </div>
      )}
    </div>
  );
}

export default function GradesPage() {
  return (
    <Providers>
      <GradesPageContent />
    </Providers>
  );
} 