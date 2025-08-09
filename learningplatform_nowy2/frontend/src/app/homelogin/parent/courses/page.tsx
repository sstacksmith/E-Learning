'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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

      // 3. Pobierz kursy ucznia
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      const courses = await Promise.all(
        coursesSnapshot.docs
          .filter(doc => doc.data().students?.includes(studentId))
          .map(async (doc) => {
            const courseData = doc.data();
            
            // Pobierz dane nauczyciela
            const teacherDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', courseData.teacher)));
            const teacherData = teacherDoc.docs[0]?.data() || {};

            // Oblicz postęp
            const lessonsRef = collection(db, 'lessons');
            const lessonsQuery = query(lessonsRef, where('courseId', '==', doc.id));
            const lessonsSnapshot = await getDocs(lessonsQuery);
            const totalLessons = lessonsSnapshot.docs.length;

            const progressRef = collection(db, 'progress');
            const progressQuery = query(progressRef, 
              where('studentId', '==', studentId),
              where('courseId', '==', doc.id),
              where('completed', '==', true)
            );
            const progressSnapshot = await getDocs(progressQuery);
            const completedLessons = progressSnapshot.docs.length;

            return {
              id: doc.id,
              title: courseData.title,
              description: courseData.description,
              teacher: {
                id: teacherData.uid,
                name: teacherData.displayName || teacherData.email,
                email: teacherData.email
              },
              progress: {
                completed: completedLessons,
                total: totalLessons,
                percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
              }
            };
          })
      );

      setAssignedStudent({
        id: studentId,
        name: studentData.displayName || studentData.email,
        email: studentData.email,
        courses: courses
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
        <h1 className="text-2xl font-bold mb-2">Kursy ucznia</h1>
        <p className="text-gray-600">
          {assignedStudent.name} ({assignedStudent.email})
        </p>
      </div>

      {assignedStudent.courses.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Uczeń nie jest zapisany na żadne kursy.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedStudent.courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4">{course.description}</p>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Nauczyciel:</p>
                  <p className="font-medium">{course.teacher.name}</p>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Postęp</span>
                    <span>{Math.round(course.progress.percentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#4067EC] h-2 rounded-full"
                      style={{ width: `${course.progress.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {course.progress.completed} z {course.progress.total} lekcji ukończonych
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 