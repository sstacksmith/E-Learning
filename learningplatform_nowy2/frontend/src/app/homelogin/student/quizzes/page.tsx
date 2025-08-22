'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { QuizDisplay } from '@/components/QuizDisplay';
import Providers from '@/components/Providers';

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  course_id: string;
  course_title: string;
  created_at: string;
  max_attempts: number;
}

function StudentQuizzesPageContent() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        // Pobierz quizy przypisane do kursów, w których uczestniczy uczeń
        const quizzesCollection = collection(db, 'quizzes');
        const quizzesSnapshot = await getDocs(quizzesCollection);
        
        // Pobierz kursy ucznia
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        const userCourses = coursesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((course: any) => 
            course.assignedUsers && 
            (course.assignedUsers.includes(user.uid) || course.assignedUsers.includes(user.email))
          );

        // Filtruj quizy tylko do kursów ucznia
        const availableQuizzes = quizzesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Quiz))
          .filter((quiz: Quiz) => 
            userCourses.some(course => course.id === quiz.course_id)
          );

        setQuizzes(availableQuizzes);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie quizów...</p>
        </div>
      </div>
    );
  }

  if (selectedQuiz) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedQuiz(null)}
            className="mb-4 px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3050b3] transition flex items-center gap-2"
          >
            ← Powrót do listy quizów
          </button>
          <QuizDisplay quizId={selectedQuiz.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-6 md:py-8 px-2 md:px-8">
      <div className="bg-white w-full max-w-5xl mx-auto p-4 md:p-6 mt-0 rounded-2xl shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Dostępne quizy <span className="inline-block">📝</span></h1>
        <p className="text-gray-600 mb-6">Wybierz quiz, który chcesz rozwiązać</p>
        
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Brak dostępnych quizów</h3>
            <p className="text-gray-500">Nie masz jeszcze przypisanych quizów do swoich kursów.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-[#F8F9FB] rounded-xl p-4 md:p-6 border border-gray-200 hover:border-[#4067EC] transition-colors">
                <div className="mb-4">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[#4067EC] text-white text-xs rounded-full">{quiz.subject}</span>
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">{quiz.course_title}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedQuiz(quiz)}
                  className="w-full bg-[#4067EC] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#3050b3] transition-colors"
                >
                  Rozpocznij quiz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentQuizzesPage() {
  return (
    <Providers>
      <StudentQuizzesPageContent />
    </Providers>
  );
}
