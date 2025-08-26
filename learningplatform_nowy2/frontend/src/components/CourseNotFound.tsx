'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, Users, Home, ArrowLeft, TrendingUp } from 'lucide-react';

export const CourseNotFound: React.FC = () => {
  const router = useRouter();

  const popularCourses = [
    { name: 'Matematyka podstawowa', href: '/courses/matematyka-podstawowa', category: 'Matematyka' },
    { name: 'Programowanie w Python', href: '/courses/python-programming', category: 'Informatyka' },
    { name: 'Język angielski B2', href: '/courses/angielski-b2', category: 'Języki' },
    { name: 'Fizyka dla studentów', href: '/courses/fizyka-students', category: 'Fizyka' }
  ];

  const handleGoBack = () => router.back();
  const handleGoHome = () => router.push('/homelogin');
  const handleBrowseCourses = () => router.push('/courses');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        
        {/* Główna ikona */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-orange-100 to-red-200 rounded-full flex items-center justify-center animate-pulse">
            <BookOpen className="w-16 h-16 text-orange-500" />
          </div>
          
          {/* Animowane elementy */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Tytuł i opis */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Kurs nie istnieje
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Kurs którego szukasz został usunięty, przeniesiony lub nigdy nie istniał. 
          Sprawdź nasze inne kursy lub skontaktuj się z administratorem.
        </p>

        {/* Popularne kursy */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Popularne kursy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {popularCourses.map((course, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer hover:shadow-md transform hover:scale-105"
                onClick={() => router.push(course.href)}
              >
                <div className="text-left">
                  <div className="text-sm text-blue-600 font-medium mb-1">{course.category}</div>
                  <div className="text-gray-900 font-semibold">{course.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Szybkie akcje */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Co chcesz zrobić?</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={handleBrowseCourses}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Przeglądaj kursy
            </button>
            
            <button
              onClick={() => router.push('/homelogin/instructors')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Znajdź instruktora
            </button>
            
            <button
              onClick={() => router.push('/search')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Wyszukaj
            </button>
          </div>
        </div>

        {/* Przyciski nawigacji */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć
          </button>
          
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 font-medium"
          >
            <Home className="w-4 h-4" />
            Strona główna
          </button>
        </div>

        {/* Dodatkowe informacje */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-2xl mx-auto">
          <p className="text-sm text-blue-700">
            💡 <strong>Wskazówka:</strong> Jeśli szukasz konkretnego kursu, 
            spróbuj użyć wyszukiwarki lub przejrzyj kategorie kursów. 
            Możesz też skontaktować się z naszym zespołem wsparcia.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseNotFound;

