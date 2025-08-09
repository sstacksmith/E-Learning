'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface Grade {
  id: string;
  value: number;
  date: string;
  course: {
    id: string;
    title: string;
  };
  description?: string;
}

interface AssignedStudent {
  id: string;
  name: string;
  email: string;
  grades: Grade[];
}

export default function ParentGrades() {
  const { user } = useAuth();
  const [assignedStudent, setAssignedStudent] = useState<AssignedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignedStudentData();
  }, [user]);

  const fetchAssignedStudentData = async () => {
    if (!user) return;

    try {
      // 1. Znajdź przypisanego ucznia
      const parentStudentsRef = collection(db, 'parent_students');
      const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
      const parentStudentsSnapshot = await getDocs(parentStudentsQuery);

      if (parentStudentsSnapshot.empty) {
        setError('Nie masz przypisanego żadnego ucznia.');
        setLoading(false);
        return;
      }

      const studentId = parentStudentsSnapshot.docs[0].data().student;

      // 2. Pobierz dane ucznia
      const studentDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', studentId)));
      if (studentDoc.empty) {
        setError('Nie znaleziono danych ucznia.');
        setLoading(false);
        return;
      }

      const studentData = studentDoc.docs[0].data();

      // 3. Pobierz oceny ucznia
      const gradesRef = collection(db, 'grades');
      const gradesQuery = query(
        gradesRef,
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
      );
      const gradesSnapshot = await getDocs(gradesQuery);

      const grades = await Promise.all(
        gradesSnapshot.docs.map(async (doc) => {
          const gradeData = doc.data();
          
          // Pobierz dane kursu
          const courseDoc = await getDocs(query(collection(db, 'courses'), where('id', '==', gradeData.courseId)));
          const courseData = courseDoc.docs[0]?.data() || {};

          return {
            id: doc.id,
            value: gradeData.value,
            date: gradeData.date.toDate().toISOString(),
            course: {
              id: gradeData.courseId,
              title: courseData.title || 'Nieznany kurs'
            },
            description: gradeData.description
          };
        })
      );

      setAssignedStudent({
        id: studentId,
        name: studentData.displayName || studentData.email,
        email: studentData.email,
        grades: grades
      });
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Wystąpił błąd podczas pobierania danych.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4067EC]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!assignedStudent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Nie masz jeszcze przypisanego ucznia.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Dziennik ocen</h1>
        <p className="text-gray-600">
          {assignedStudent.name} ({assignedStudent.email})
        </p>
      </div>

      {assignedStudent.grades.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Brak ocen do wyświetlenia.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ocena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opis
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignedStudent.grades.map((grade) => (
                <tr key={grade.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(grade.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {grade.course.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {grade.value}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {grade.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 