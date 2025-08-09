'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface Course {
  id: string;
  title: string;
  description: string;
  teacher: {
    name: string;
    email: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentInfo, setStudentInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;

    try {
      let studentId = user.uid;
      let studentData = null;

      // Jeśli użytkownik jest rodzicem, znajdź przypisanego ucznia
      if (user.role === 'parent') {
        const parentStudentsRef = collection(db, 'parent_students');
        const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
        const parentStudentsSnapshot = await getDocs(parentStudentsQuery);

        if (parentStudentsSnapshot.empty) {
          setError('Nie masz przypisanego żadnego ucznia.');
          setLoading(false);
          return;
        }

        studentId = parentStudentsSnapshot.docs[0].data().student;

        // Pobierz dane ucznia
        const studentDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', studentId)));
        if (!studentDoc.empty) {
          const data = studentDoc.docs[0].data();
          studentData = {
            name: data.displayName || data.email,
            email: data.email
          };
          setStudentInfo(studentData);
        }
      }

      // Pobierz kursy ucznia
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      const studentCourses = await Promise.all(
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

      setCourses(studentCourses);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Wystąpił błąd podczas pobierania kursów.');
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8F9FB] p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 md:p-8 mb-8">
          <h1 className="text-xl md:text-2xl font-bold mb-4">
            {user?.role === 'parent' && studentInfo 
              ? `Kursy ucznia: ${studentInfo.name} (${studentInfo.email})`
              : 'Moje kursy'
            }
          </h1>

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              {user?.role === 'parent' 
                ? 'Uczeń nie jest zapisany na żadne kursy.'
                : 'Nie jesteś zapisany na żadne kursy.'
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden border">
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
      </div>
    </div>
  );
} 