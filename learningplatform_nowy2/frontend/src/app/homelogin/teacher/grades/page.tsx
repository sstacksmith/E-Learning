"use client";

import GradeForm from '../../../../components/GradeForm';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../context/AuthContext';
import Providers from '@/components/Providers';

interface Grade {
  id: string;
  studentName: string;
  subject: string;
  grade: string;
  gradeType?: string;
  description: string;
  date: string;
}

function TeacherGradesContent() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchGrades = async () => {
      setLoading(true);
      const gradesQuery = query(collection(db, 'grades'), where('teacherId', '==', user.uid));
      const gradesSnapshot = await getDocs(gradesQuery);
      const gradesList = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
      setGrades(gradesList);
      setLoading(false);
    };
    fetchGrades();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">Dziennik ocen</h1>
      <GradeForm />
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-6 sm:mt-8">
        <h2 className="text-base sm:text-lg font-semibold mb-2">Oceny wystawione przez Ciebie</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-gray-600 text-sm sm:text-base">Ładowanie ocen...</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="text-black font-bold text-sm sm:text-base">Brak ocen do wyświetlenia.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-2 border-b font-semibold">Uczeń</th>
                  <th className="py-2 px-2 border-b font-semibold">Przedmiot</th>
                  <th className="py-2 px-2 border-b font-semibold">Ocena</th>
                  <th className="py-2 px-2 border-b font-semibold">Typ</th>
                  <th className="py-2 px-2 border-b font-semibold">Opis</th>
                  <th className="py-2 px-2 border-b font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {grades.map(grade => (
                  <tr key={grade.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-2 px-2 border-b whitespace-normal">{grade.studentName}</td>
                    <td className="py-2 px-2 border-b whitespace-normal">{grade.subject}</td>
                    <td className="py-2 px-2 border-b font-bold">{grade.grade}</td>
                    <td className="py-2 px-2 border-b">{grade.gradeType || '-'}</td>
                    <td className="py-2 px-2 border-b">{grade.description}</td>
                    <td className="py-2 px-2 border-b">{grade.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeacherGrades() {
  return (
    <Providers>
      <TeacherGradesContent />
    </Providers>
  );
} 