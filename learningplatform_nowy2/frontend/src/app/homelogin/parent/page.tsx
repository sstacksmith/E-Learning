'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface StudentProgress {
  student_id: number;
  student_name: string;
  student_email: string;
  courses: {
    course_id: number;
    course_title: string;
    progress_percentage: number;
    completed_lessons: number;
    total_lessons: number;
  }[];
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [studentsProgress, setStudentsProgress] = useState<StudentProgress[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentsProgress();
  }, []);

  const fetchStudentsProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/parent-student/my_students_progress/', {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student progress');
      }

      const data = await response.json();
      setStudentsProgress(data);
    } catch (err) {
      setError('Błąd podczas pobierania postępów uczniów');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Panel Rodzica - Postępy Uczniów</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {studentsProgress.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Nie masz jeszcze przypisanych uczniów.
        </div>
      ) : (
        studentsProgress.map((studentProgress) => (
          <div key={studentProgress.student_id} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {studentProgress.student_name}
              <span className="text-gray-500 text-sm ml-2">({studentProgress.student_email})</span>
            </h2>

            {studentProgress.courses.length === 0 ? (
              <p className="text-gray-600">Ten uczeń nie jest zapisany na żadne kursy.</p>
            ) : (
              <div className="space-y-4">
                {studentProgress.courses.map((course) => (
                  <div key={course.course_id} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">{course.course_title}</h3>
                    
                    {/* Progress Bar */}
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                            Postęp
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-blue-600">
                            {course.progress_percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                        <div
                          style={{ width: `${course.progress_percentage}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                        />
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      Ukończone lekcje: {course.completed_lessons} z {course.total_lessons}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
} 