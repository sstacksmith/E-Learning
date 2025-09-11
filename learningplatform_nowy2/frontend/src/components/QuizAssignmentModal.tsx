'use client';

import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { X, Search, Plus, Check } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  course_id: string | null;
  questions: any[];
  created_at: string;
  created_by: string;
  max_attempts: number;
  time_limit?: number;
}

interface QuizAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onQuizAssigned: () => void;
}

export const QuizAssignmentModal: React.FC<QuizAssignmentModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onQuizAssigned,
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableQuizzes();
    }
  }, [isOpen, courseId]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredQuizzes(filtered);
    } else {
      setFilteredQuizzes(quizzes);
    }
  }, [searchTerm, quizzes]);

  const fetchAvailableQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching available quizzes for course:', courseId);

      const quizzesCollection = collection(db, 'quizzes');
      const quizzesSnapshot = await getDocs(quizzesCollection);
      
      console.log('📊 Total quizzes found:', quizzesSnapshot.docs.length);
      
      const allQuizzes = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Quiz[];

      console.log('📋 All quizzes:', allQuizzes.map(q => ({ id: q.id, title: q.title, course_id: q.course_id })));

      // Filter out quizzes that are already assigned to this course
      const availableQuizzes = allQuizzes.filter(quiz => 
        quiz.course_id !== courseId
      );

      console.log('✅ Available quizzes after filtering:', availableQuizzes.length);
      console.log('📋 Available quizzes:', availableQuizzes.map(q => ({ id: q.id, title: q.title })));

      setQuizzes(availableQuizzes);
    } catch (error) {
      console.error('❌ Error fetching quizzes:', error);
      setError('Nie udało się załadować quizów');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignQuiz = async (quizId: string) => {
    try {
      setAssigning(quizId);
      setError(null);

      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        course_id: courseId,
        updated_at: new Date().toISOString()
      });

      // Remove the quiz from available list
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
      setFilteredQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));

      onQuizAssigned();
    } catch (error) {
      console.error('Error assigning quiz:', error);
      setError('Nie udało się przypisać quizu do kursu');
    } finally {
      setAssigning(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Przypisz quizy do kursu
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {courseTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Wyszukaj quizy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Quizzes List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-600">
                Ładowanie quizów...
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {searchTerm ? 'Nie znaleziono quizów pasujących do wyszukiwania' : 'Brak dostępnych quizów do przypisania'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {quiz.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {quiz.description || 'Brak opisu'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {quiz.subject}
                          </span>
                          <span>Pytania: {quiz.questions?.length || 0}</span>
                          <span>Próby: {quiz.max_attempts}</span>
                          {quiz.time_limit && (
                            <span>Limit: {quiz.time_limit} min</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignQuiz(quiz.id)}
                        disabled={assigning === quiz.id}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {assigning === quiz.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Przypisz</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

