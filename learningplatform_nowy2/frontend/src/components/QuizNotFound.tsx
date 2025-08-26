'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, BookOpen, Users, Home, ArrowLeft, Clock, TrendingUp } from 'lucide-react';

export const QuizNotFound: React.FC = () => {
  const router = useRouter();

  const availableQuizzes = [
    { name: 'Matematyka - Algebra', difficulty: 'Średni', time: '30 min', href: '/courses/matematyka/quiz/algebra' },
    { name: 'Python - Podstawy', difficulty: 'Łatwy', time: '20 min', href: '/courses/python/quiz/podstawy' },
    { name: 'Fizyka - Mechanika', difficulty: 'Trudny', time: '45 min', href: '/courses/fizyka/quiz/mechanika' },
    { name: 'Angielski - Gramatyka', difficulty: 'Średni', time: '25 min', href: '/courses/angielski/quiz/gramatyka' }
  ];

  const handleGoBack = () => router.back();
  const handleGoHome = () => router.push('/homelogin');
  const handleBrowseQuizzes = () => router.push('/homelogin/student/quizzes');

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Łatwy': return 'bg-green-100 text-green-800';
      case 'Średni': return 'bg-yellow-100 text-yellow-800';
      case 'Trudny': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        
        {/* Główna ikona */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-100 to-blue-200 rounded-full flex items-center justify-center animate-pulse">
            <Brain className="w-16 h-16 text-purple-500" />
          </div>
          
          {/* Animowane elementy */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-pink-400 rounded-full animate-bounce"></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute top-1/2 -right-6 w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
        </div>

        {/* Tytuł i opis */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Quiz nie istnieje
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Quiz którego szukasz został usunięty, przeniesiony lub nigdy nie istniał. 
          Sprawdź inne dostępne quizy lub wróć do kursu.
        </p>

        {/* Dostępne quizy */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Dostępne quizy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {availableQuizzes.map((quiz, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-all duration-200 cursor-pointer hover:shadow-md transform hover:scale-105"
                onClick={() => router.push(quiz.href)}
              >
                <div className="text-left">
                  <div className="text-gray-900 font-semibold mb-2">{quiz.name}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {quiz.time}
                    </div>
                  </div>
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
              onClick={handleBrowseQuizzes}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <Brain className="w-5 h-5" />
              Przeglądaj quizy
            </button>
            
            <button
              onClick={() => router.push('/courses')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Wróć do kursów
            </button>
            
            <button
              onClick={() => router.push('/homelogin/instructors')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Znajdź instruktora
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
        <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200 max-w-2xl mx-auto">
          <p className="text-sm text-purple-700">
            💡 <strong>Wskazówka:</strong> Jeśli szukasz konkretnego quizu, 
            sprawdź czy jesteś zapisany na odpowiedni kurs. 
            Niektóre quizy mogą być dostępne tylko dla zapisanych studentów.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizNotFound;

