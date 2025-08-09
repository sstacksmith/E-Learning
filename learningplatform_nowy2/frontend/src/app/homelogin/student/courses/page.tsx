'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/config/firebase';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Course {
  id: number;
  title: string;
  description: string;
  year_of_study: number;
  subject: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  pdfUrls: string[];
  links: string[];
  slug: string;
  assignedUsers: string[];
  sections: {
    id: string;
    title: string;
    description?: string;
    contents: {
      id: string;
      title: string;
      type: string;
      url?: string;
      content?: string;
    }[];
  }[];
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    console.log('[DEBUG] Fetching student courses...');
    console.log('[DEBUG] Student email:', user?.email);

    setLoading(true);
    setError(null);

    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const coursesCollection = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesCollection);

      const studentEmail = user?.email;
      if (!studentEmail) {
        throw new Error('Nie można zidentyfikować studenta');
      }

      const studentCourses = coursesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            title: data.title || '',
            description: data.description || '',
            year_of_study: data.year_of_study || 1,
            subject: data.subject || '',
            is_active: data.is_active !== undefined ? data.is_active : true,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
            pdfUrls: data.pdfUrls || [],
            links: data.links || [],
            slug: data.slug || '',
            assignedUsers: data.assignedUsers || [],
            sections: data.sections || []
          };
        })
        .filter(course => 
          course.is_active && 
          course.assignedUsers.includes(studentEmail)
        );

      console.log('[DEBUG] Found courses:', studentCourses.length);
      
      // Sortuj po dacie utworzenia (najnowsze pierwsze)
      const sortedCourses = studentCourses.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCourses(sortedCourses);
    } catch (err) {
      if (err instanceof Error) {
        console.error('[DEBUG] Error fetching courses:', err);
        setError(`Błąd podczas ładowania kursów: ${err.message}`);
      } else {
        console.error('[DEBUG] Error fetching courses:', err);
        setError('Nieznany błąd podczas ładowania kursów');
      }
    } finally {
      setLoading(false);
    }
  }, [user, setLoading, setError, setCourses]);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user, fetchCourses]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FB] p-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-gray-600">Ładowanie kursów...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-2xl bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchCourses}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#F8F9FB] p-4 md:p-8">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-[#4067EC] mb-2">Moje kursy</h1>
          <p className="text-gray-600">Lista kursów, do których masz dostęp.</p>
        </div>

        {/* Courses grid */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-600">Nie masz jeszcze przypisanych żadnych kursów.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {course.subject}
                    </span>
                    <span className="text-xs text-gray-500">Rok {course.year_of_study}</span>
                  </div>

                  <Link href={`/courses/${course.slug}`}>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-[#4067EC] transition-colors">
                      {course.title}
                    </h3>
                  </Link>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span className="mr-4">{course.pdfUrls.length} materiałów</span>
                    <span>{course.sections.length} sekcji</span>
                  </div>

                  <div className="flex space-x-2">
                    <Link 
                      href={`/courses/${course.slug}`}
                      className="flex-1 bg-[#4067EC] text-white text-center py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#3155d4] transition-colors"
                    >
                      Przejdź do kursu
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 