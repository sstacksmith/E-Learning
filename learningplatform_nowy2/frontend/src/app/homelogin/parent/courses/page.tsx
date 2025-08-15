'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface StudentCourse {
  id: string;
  title: string;
  description: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface AssignedStudent {
  id: string;
  name: string;
  email: string;
  courses: StudentCourse[];
}

export default function ParentCourses() {
  const { user } = useAuth();
  const router = useRouter();
  const [assignedStudent, setAssignedStudent] = useState<AssignedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAssignedStudentData = async () => {
    if (!user) return;

    try {
      console.log('Fetching data for parent:', user.uid, user.email);
      
      // 1. Znajdź przypisanego ucznia
      const parentStudentsRef = collection(db, 'parent_students');
      const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
      const parentStudentsSnapshot = await getDocs(parentStudentsQuery);

      console.log('Parent-student relationships found:', parentStudentsSnapshot.docs.length);

      if (parentStudentsSnapshot.empty) {
        setError('Nie masz przypisanego żadnego ucznia.');
        setLoading(false);
        return;
      }

      const studentId = parentStudentsSnapshot.docs[0].data().student;
      console.log('Found assigned student ID:', studentId);

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
      console.log('Student data:', studentData);

      // 3. Pobierz wszystkie kursy i znajdź te, które są przypisane do ucznia
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      console.log('Total courses in database:', coursesSnapshot.docs.length);
      
      const studentCourses = [];
      
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        console.log('Checking course:', courseData.title, 'assignedUsers:', courseData.assignedUsers);
        console.log('Looking for student ID:', studentId);
        console.log('Looking for student email:', studentData.email);
        
        // Sprawdź czy uczeń jest przypisany do kursu (po UID lub email)
        const isAssignedByUID = courseData.assignedUsers && courseData.assignedUsers.includes(studentId);
        const isAssignedByEmail = courseData.assignedUsers && courseData.assignedUsers.includes(studentData.email);
        
        if (isAssignedByUID || isAssignedByEmail) {
          console.log('✅ Found course for student:', courseData.title, 
                     'by UID:', isAssignedByUID, 'by email:', isAssignedByEmail);
          
          // Pobierz dane nauczyciela
          let teacherData = {};
          if (courseData.teacher) {
            const teacherQuery = query(usersRef, where('uid', '==', courseData.teacher));
            const teacherSnapshot = await getDocs(teacherQuery);
            if (!teacherSnapshot.empty) {
              teacherData = teacherSnapshot.docs[0].data();
            }
          }

          // Symulujemy postęp (w przyszłości można dodać prawdziwe dane)
          const mockProgress = Math.floor(Math.random() * 100);
          const mockCompleted = Math.floor(Math.random() * 20);
          const mockTotal = mockCompleted + Math.floor(Math.random() * 10);

          studentCourses.push({
            id: courseDoc.id,
            title: courseData.title || 'Bez nazwy',
            description: courseData.description || 'Brak opisu',
            teacher: {
              id: (teacherData as any).uid || '',
              name: (teacherData as any).displayName || (teacherData as any).email || 'Nieznany nauczyciel',
              email: (teacherData as any).email || ''
            },
            progress: {
              completed: mockCompleted,
              total: mockTotal,
              percentage: mockProgress
            }
          });
        }
      }

      console.log('Student courses found:', studentCourses.length);

      setAssignedStudent({
        id: studentId,
        name: studentData.displayName || studentData.email || 'Nieznany uczeń',
        email: studentData.email || '',
        courses: studentCourses
      });

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Wystąpił błąd podczas pobierania danych: ' + (err as any).message);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Kursy Dziecka</h2>
        <p className="text-gray-600 mb-6">
          Przegląd wszystkich kursów w których uczestniczy {assignedStudent?.name || 'uczeń'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedStudent?.courses.map((course, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                <p className="text-sm text-gray-500">{course.teacher.name}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Postęp kursu</span>
                    <span className="font-medium text-gray-900">{Math.round(course.progress.percentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Lekcje</p>
                    <p className="font-medium text-gray-900">
                      {course.progress.completed}/{course.progress.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nauczyciel</p>
                    <p className="font-medium text-gray-900 text-xs">
                      {course.teacher.email}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => router.push(`/homelogin/parent/courses/${course.id}`)}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Zobacz szczegóły
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 