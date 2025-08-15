'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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

  const fetchAssignedStudentData = async () => {
    if (!user) return;

    try {
      console.log('Fetching grades for parent:', user.uid, user.email);
      
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
      console.log('Found assigned student ID for grades:', studentId);

      // 2. Pobierz dane ucznia
      const usersRef = collection(db, 'users');
      const studentQuery = query(usersRef, where('uid', '==', studentId));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        setError('Nie znaleziono danych ucznia.');
        setLoading(false);
        return;
      }

      const studentData = studentSnapshot.docs[0].data();

      // 3. Pobierz oceny ucznia z Firebase
      console.log('Fetching grades for student:', studentId);
      const gradesRef = collection(db, 'grades');
      const gradesQuery = query(gradesRef, where('studentId', '==', studentId));
      const gradesSnapshot = await getDocs(gradesQuery);
      
      console.log('Total grades found in Firebase:', gradesSnapshot.docs.length);
      
      const firebaseGrades = [];
      for (const gradeDoc of gradesSnapshot.docs) {
        const gradeData = gradeDoc.data();
        console.log('Grade data:', gradeData);
        
        // Pobierz dane kursu jeśli course_id istnieje
        let courseData = { title: 'Nieznany kurs' };
        if (gradeData.course_id) {
          try {
            const coursesRef = collection(db, 'courses');
            const courseQuery = query(coursesRef, where('__name__', '==', gradeData.course_id));
            const courseSnapshot = await getDocs(courseQuery);
            if (!courseSnapshot.empty) {
              courseData = courseSnapshot.docs[0].data() as any;
            }
          } catch (err) {
            console.log('Could not fetch course for grade:', err);
          }
        }
        
        firebaseGrades.push({
          id: gradeDoc.id,
          value: gradeData.value || gradeData.grade || 0,
          date: gradeData.date || gradeData.graded_at || new Date().toISOString(),
          course: {
            id: gradeData.course_id || '',
            title: courseData.title || gradeData.subject || 'Nieznany kurs'
          },
          description: gradeData.description || gradeData.comment || ''
        });
      }
      
      // Jeśli nie ma ocen w Firebase, użyj mock data dla demonstracji
      const finalGrades = firebaseGrades.length > 0 ? firebaseGrades : [
        {
          id: 'mock1',
          value: 5,
          date: '2024-01-15',
          course: { id: '1', title: 'Matematyka' },
          description: 'Sprawdzian z algebry (demo)'
        },
        {
          id: 'mock2', 
          value: 4,
          date: '2024-01-12',
          course: { id: '2', title: 'Język Polski' },
          description: 'Kartkówka z gramatyki (demo)'
        },
        {
          id: 'mock3',
          value: 5,
          date: '2024-01-10', 
          course: { id: '3', title: 'Historia' },
          description: 'Odpowiedź ustna (demo)'
        }
      ];
      
      console.log('Final grades to display:', finalGrades.length);

      setAssignedStudent({
        id: studentId,
        name: studentData.displayName || studentData.email || 'Nieznany uczeń',
        email: studentData.email || '',
        grades: finalGrades
      });

    } catch (err) {
      console.error('Error fetching student grades:', err);
      setError('Wystąpił błąd podczas pobierania ocen: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedStudentData();
  }, [user]);

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

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return "bg-green-100 text-green-800 border-green-200";
    if (grade >= 4) return "bg-blue-100 text-blue-800 border-blue-200";
    if (grade >= 3) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (grade >= 2) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Dziennik Ocen</h2>
        <p className="text-gray-600 mb-6">
          Wszystkie oceny i osiągnięcia {assignedStudent?.name || 'ucznia'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ostatnie Oceny</h3>
          <p className="text-sm text-gray-600">Najnowsze oceny z wszystkich przedmiotów</p>
        </div>
        
        {assignedStudent?.grades.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">Brak ocen do wyświetlenia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Przedmiot
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
                {assignedStudent?.grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(grade.date).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {grade.course.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getGradeColor(grade.value)}`}>
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
    </div>
  );
} 