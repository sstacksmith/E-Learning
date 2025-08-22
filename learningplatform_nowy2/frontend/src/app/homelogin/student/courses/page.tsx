'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Providers from '@/components/Providers';
import Link from 'next/link';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  yearOfStudy: number;
  isActive: boolean;
  teacherName: string;
  progress: number;
  lastAccessed: string;
  totalLessons: number;
  completedLessons: number;
}

function StudentCoursesContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Pobierz kursy przypisane do ucznia
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        
        const userCourses = coursesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((course: any) => 
            course.assignedUsers && 
            (course.assignedUsers.includes(user.uid) || course.assignedUsers.includes(user.email))
          )
          .map((course: any) => ({
            id: course.id,
            title: course.title || 'Brak tytułu',
            description: course.description || 'Brak opisu',
            subject: course.subject || 'Brak przedmiotu',
            yearOfStudy: course.year_of_study || 1,
            isActive: course.is_active !== false,
            teacherName: course.teacherName || course.created_by || 'Nieznany nauczyciel',
            progress: course.progress || 0,
            lastAccessed: course.lastAccessed || course.updated_at || new Date().toISOString(),
            totalLessons: course.totalLessons || 0,
            completedLessons: course.completedLessons || 0
          }));

        setCourses(userCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  // Filtruj kursy
  const filteredCourses = courses.filter(course => {
    const matchesSubject = selectedSubject === 'all' || course.subject === selectedSubject;
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Pobierz unikalne przedmioty
  const subjects = ['all', ...Array.from(new Set(courses.map(c => c.subject)))];

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pl-PL');
    } catch {
      return 'Nieznana data';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie kursów...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-6 md:py-8 px-2 md:px-8">
      <div className="bg-white w-full max-w-6xl mx-auto p-4 md:p-6 mt-0 rounded-2xl shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Moje kursy <span className="inline-block">📚</span></h1>
        <p className="text-gray-600 mb-6">Kursy przypisane do Twojego konta</p>
        
        {/* Filtry i wyszukiwanie */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Wyszukaj kursy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
          >
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject === 'all' ? 'Wszystkie przedmioty' : subject}
              </option>
            ))}
          </select>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Brak kursów</h3>
            <p className="text-gray-500">
              {courses.length === 0 
                ? 'Nie masz jeszcze przypisanych kursów.'
                : 'Nie znaleziono kursów spełniających kryteria wyszukiwania.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredCourses.map((course) => (
              <div key={course.id} className="bg-[#F8F9FB] rounded-xl p-4 md:p-6 border border-gray-200 hover:border-[#4067EC] transition-colors">
                {/* Course Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-16 h-16 bg-[#4067EC] rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                    {course.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                </div>
                
                {/* Course Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Przedmiot:</span>
                    <span className="px-2 py-1 bg-[#4067EC] text-white rounded-full text-xs">
                      {course.subject}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Rok:</span>
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                      {course.yearOfStudy}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Nauczyciel:</span>
                    <span className="text-gray-700">{course.teacherName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      course.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {course.isActive ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Ostatni dostęp:</span>
                    <span className="text-gray-700">{formatDate(course.lastAccessed)}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Postęp</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(course.progress)}`}
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {course.completedLessons} z {course.totalLessons} lekcji ukończonych
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex-1 bg-[#4067EC] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#3050b3] transition-colors text-center"
                  >
                    Przejdź do kursu
                  </Link>
                  
                  <button className="px-3 py-2 text-[#4067EC] hover:bg-[#4067EC] hover:text-white rounded-lg transition-colors">
                    ⭐
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentCoursesPage() {
  return (
    <Providers>
      <StudentCoursesContent />
    </Providers>
  );
} 