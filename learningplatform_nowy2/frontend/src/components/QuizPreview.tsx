"use client";
import React, { useState, useEffect, useCallback } from 'react';
import MathView from './MathView';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Answer {
  id: string;
  content: string;
  isCorrect: boolean;
  type: 'text' | 'math' | 'mixed';
}

interface Question {
  id: string;
  content: string;
  type: 'text' | 'math' | 'mixed' | 'open';
  answers: Answer[];
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  course_id: string;
  course_title: string;
  questions: Question[];
  created_at: string;
  created_by: string;
  max_attempts: number;
}

interface StudentAnswer {
  questionId: string;
  selectedAnswerId?: string;
  openAnswer?: {
    content: string;
    type: 'text' | 'math';
  };
  isCorrect: boolean;
}

interface QuizResult {
  id: string;
  student_email: string;
  student_name: string;
  score: number;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  answers: {
    selected: { [key: string]: string };
    open: { content: string; type: 'text' | 'math' };
  };
}

interface QuizPreviewProps {
  quiz: Quiz;
  onClose: () => void;
  onDelete?: () => void; // Optional callback for parent component
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, onClose, onDelete }) => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<QuizResult | null>(null);
  const { user } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createTestQuiz = async () => {
    try {
      const token = await user?.getIdToken();
      console.log('Got token:', token ? 'yes' : 'no');

      const response = await fetch('/api/quizzes/create_test_quiz/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`Failed to create test quiz: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Created quiz:', data);
      
      // Refresh results
      fetchResults();
    } catch (err) {
      console.error('Error creating test quiz:', err);
      setError(err instanceof Error ? err.message : 'Nie udało się utworzyć quizu testowego');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten quiz? Ta operacja jest nieodwracalna.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      // Usuń quiz z Firestore
      await deleteDoc(doc(db, 'quizzes', quiz.id));

      // Usuń wszystkie wyniki tego quizu
      const resultsQuery = query(
        collection(db, 'quiz_results'),
        where('quiz_id', '==', quiz.id)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const deletePromises = resultsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Powiadom rodzica o usunięciu
      onDelete?.();
      onClose();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Nie udało się usunąć quizu. Spróbuj ponownie.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStudentAnswers = (result: QuizResult): StudentAnswer[] => {
    return quiz.questions.map(question => {
      if (question.type === 'open' || !question.answers?.length) {
        // Pytanie otwarte
        return {
          questionId: question.id,
          openAnswer: result.answers.open,
          isCorrect: result.answers.open?.content.toLowerCase().trim() === 
            question.answers[0]?.content.toLowerCase().trim()
        };
      } else {
        // Pytanie zamknięte
        const selectedAnswerId = result.answers.selected[question.id];
        const correctAnswer = question.answers.find(a => a.isCorrect);
        return {
          questionId: question.id,
          selectedAnswerId,
          isCorrect: selectedAnswerId === correctAnswer?.id
        };
      }
    });
  };

  const renderStudentAnswers = () => {
    if (!selectedStudent) return null;

    const studentAnswers = getStudentAnswers(selectedStudent);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="mb-4 flex items-center text-[#4067EC] hover:text-[#3155d4] transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Powrót do listy
              </button>
              <h3 className="text-xl font-bold text-[#4067EC]">
                Odpowiedzi ucznia: {selectedStudent.student_email}
              </h3>
              <p className="text-gray-600">
                Wynik: {selectedStudent.score.toFixed(1)}%
              </p>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => {
              const studentAnswer = studentAnswers[qIndex];
              const selectedAnswer = question.answers.find(
                a => a.id === studentAnswer.selectedAnswerId
              );

              return (
                <div
                  key={`${quiz.id}-${selectedStudent.id}-question-${qIndex}-${question.id}`}
                  className={`p-4 rounded-lg border ${
                    studentAnswer.isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900">
                      Pytanie {qIndex + 1}:
                    </h4>
                    {question.type === 'math' ? (
                      <MathView content={question.content} />
                    ) : (
                      <p className="text-gray-800">{question.content}</p>
                    )}
                  </div>

                  <div className="ml-4">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Odpowiedź ucznia:
                    </h5>
                    {question.type === 'open' || !question.answers?.length ? (
                      studentAnswer.openAnswer?.type === 'math' ? (
                        <MathView content={studentAnswer.openAnswer.content} />
                      ) : (
                        <p className="text-gray-800">{studentAnswer.openAnswer?.content || 'Brak odpowiedzi'}</p>
                      )
                    ) : (
                      <div>
                        {selectedAnswer ? (
                          selectedAnswer.type === 'math' ? (
                            <MathView content={selectedAnswer.content} />
                          ) : (
                            <p className="text-gray-800">{selectedAnswer.content}</p>
                          )
                        ) : (
                          <p className="text-gray-500 italic">Nie wybrano odpowiedzi</p>
                        )}
                      </div>
                    )}

                    {!studentAnswer.isCorrect && (
                      <div className="mt-2">
                        <h5 className="font-medium text-gray-700 mb-1">
                          Poprawna odpowiedź:
                        </h5>
                        {question.type === 'open' || !question.answers?.length ? (
                          question.answers[0]?.type === 'math' ? (
                            <MathView content={question.answers[0].content} />
                          ) : (
                            <p className="text-gray-800">{question.answers[0]?.content}</p>
                          )
                        ) : (
                          <div>
                            {question.answers.find(a => a.isCorrect)?.type === 'math' ? (
                              <MathView content={question.answers.find(a => a.isCorrect)?.content || ''} />
                            ) : (
                              <p className="text-gray-800">
                                {question.answers.find(a => a.isCorrect)?.content}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Zaktualizuj fetchResults, aby pobierać również odpowiedzi
  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const resultsQuery = query(
        collection(db, 'quiz_results'),
        where('quiz_id', '==', quiz.id)
      );

      const resultsSnapshot = await getDocs(resultsQuery);
      const quizResults = resultsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          student_email: data.user_email || '',
          student_name: data.user_email?.split('@')[0] || '',
          score: data.score || 0,
          started_at: data.completed_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          completed_at: data.completed_at?.toDate?.()?.toISOString() || null,
          is_completed: true,
          answers: data.answers || { selected: {}, open: { content: '', type: 'text' } }
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.completed_at || a.started_at);
        const dateB = new Date(b.completed_at || b.started_at);
        return dateB.getTime() - dateA.getTime();
      });

      setResults(quizResults);
    } catch (err) {
      console.error('Error fetching quiz results:', err);
      setError('Nie udało się pobrać wyników quizu');
    } finally {
      setIsLoading(false);
    }
  }, [quiz?.id]);

  // Zaktualizuj renderowanie tabeli wyników, aby obsługiwać kliknięcia
  const renderResultsTable = () => {
    if (isLoading) {
      return <div className="text-center py-4">Ładowanie wyników...</div>;
    }

    if (error) {
      return <div className="text-red-500 py-4">{error}</div>;
    }

    if (results.length === 0) {
      return <div className="text-center py-4">Brak wyników</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wynik
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data rozpoczęcia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result) => (
              <tr
                key={`${quiz.id}-result-${result.id}`}
                onClick={() => setSelectedStudent(result)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {result.student_email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {result.score.toFixed(1)}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(result.started_at).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Ukończony
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  useEffect(() => {
    if (quiz?.id && user) {
      fetchResults();
    }
  }, [quiz?.id, user, fetchResults]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#4067EC]">{quiz.title}</h2>
            <p className="text-gray-600">{quiz.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 px-4 py-2 rounded-lg border border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Usuwanie...
                </span>
              ) : (
                'Usuń quiz'
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'questions'
                  ? 'border-b-2 border-[#4067EC] text-[#4067EC]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pytania
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-b-2 border-[#4067EC] text-[#4067EC]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Wyniki uczniów
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'questions' ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><strong>Kurs:</strong> {quiz.course_title}</p>
                  <p><strong>Przedmiot:</strong> {quiz.subject}</p>
                </div>
                <div>
                  <p><strong>Data utworzenia:</strong> {new Date(quiz.created_at).toLocaleDateString()}</p>
                  <p><strong>Liczba pytań:</strong> {quiz.questions.length}</p>
                  <p><strong>Maksymalna liczba prób:</strong> {quiz.max_attempts || 1}</p>
                </div>
              </div>

              <div className="space-y-8">
                {quiz.questions.map((question, qIndex) => (
                  <div key={`question-${qIndex}-${question.id}`} className="border rounded-lg p-6 bg-gray-50">
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">
                        Pytanie {qIndex + 1}:
                      </h3>
                      {question.type === 'math' ? (
                        <MathView content={question.content} />
                      ) : (
                        <p className="text-gray-800">{question.content}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Odpowiedzi:</h4>
                      {question.answers.map((answer, aIndex) => (
                        <div
                          key={`answer-${qIndex}-${aIndex}-${answer.id}`}
                          className={`p-3 rounded-lg border ${
                            answer.isCorrect
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {answer.type === 'math' ? (
                            <MathView content={answer.content} />
                          ) : (
                            <p className="text-gray-800">{answer.content}</p>
                          )}
                          {answer.isCorrect && (
                            <span className="text-green-600 text-sm mt-1 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Poprawna odpowiedź
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-700 mb-1">Wyjaśnienie:</h4>
                        <p className="text-blue-600">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            renderResultsTable()
          )}
        </div>
      </div>
      {selectedStudent && renderStudentAnswers()}
    </div>
  );
};

export default QuizPreview; 