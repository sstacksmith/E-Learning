'use client';

import { useState, useEffect, useCallback } from 'react';

// Funkcja pomocnicza do generowania UUID
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback dla starszych przeglądarek
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/config/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import MathView from '@/components/MathView';
import QuizAnswerInput from '@/components/QuizAnswerInput';
import { Quiz, Question } from '@/types';
import { QuizNotFound } from '@/components/QuizNotFound';

interface QuizAnswer {
  content: string;
  type: 'text' | 'math';
}

export default function QuizTaking() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const quizId = params?.id as string;
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, { content: string; type: 'text' | 'math' }>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [quizStarted, setQuizStarted] = useState(false);

  // Check if params are available
  useEffect(() => {
    if (!slug || !quizId) {
      setError('Nieprawidłowy URL quizu');
      setLoading(false);
    }
    
    // Check if user is authenticated
    if (!user) {
      setError('Musisz być zalogowany, aby wziąć udział w quizie');
      setLoading(false);
    }
    
    console.log('Component initialized with:', { slug, quizId, user: !!user, userId: user?.uid });
  }, [slug, quizId, user]);

  // Handle quiz submission
  const handleSubmit = useCallback(async () => {
    if (!quiz || !user) {
      console.error('Missing quiz or user:', { quiz: !!quiz, user: !!user });
      return;
    }
    
    try {
      console.log('Starting quiz submission...', { quizId: quiz.id, userId: user.uid });
      setLoading(true);
      setError(null);
      
      // Calculate score
      let correctAnswers = 0;
      let totalQuestions = quiz.questions.length;
      
      console.log('Calculating score for', totalQuestions, 'questions');
      console.log('Selected answers:', selectedAnswers);
      console.log('Open answers:', openAnswers);
      console.log('All question IDs:', quiz.questions.map(q => q.id));
      
      quiz.questions.forEach((question, index) => {
        console.log(`Processing question ${index + 1} with ID: ${question.id}:`, question);
        
        if (question.type === 'open' || !question.answers?.length) {
          // For open questions, check if answer matches
          const userAnswer = openAnswers[question.id]?.content?.trim().toLowerCase() || '';
          const correctAnswer = question.answers[0]?.content?.trim().toLowerCase();
          console.log(`Question ${index + 1} (open):`, { 
            userAnswer, 
            correctAnswer, 
            isCorrect: userAnswer === correctAnswer,
            questionType: question.type,
            answersLength: question.answers?.length
          });
          if (userAnswer === correctAnswer) {
            correctAnswers++;
          }
        } else {
          // For multiple choice questions
          const selectedAnswerId = selectedAnswers[question.id];
          const correctAnswer = question.answers.find(answer => answer.is_correct === true);
          console.log(`Question ${index + 1} (multiple choice):`, { 
            questionId: question.id,
            selectedAnswerId, 
            correctAnswerId: correctAnswer?.id,
            correctAnswerData: correctAnswer,
            allAnswers: question.answers,
            isCorrect: selectedAnswerId === correctAnswer?.id 
          });
          if (selectedAnswerId === correctAnswer?.id) {
            correctAnswers++;
          }
        }
      });
      
      const finalScore = Math.round((correctAnswers / totalQuestions) * 100);
      console.log('Final score calculated:', { correctAnswers, totalQuestions, finalScore });
      setScore(finalScore);
      
      // Save quiz results to Firestore
      const quizResult = {
        quiz_id: quiz.id,
        user_id: user.uid,
        user_email: user.email,
        score: finalScore,
        answers: {
          selected: selectedAnswers,
          open: openAnswers
        },
        completed_at: new Date(),
        timestamp: serverTimestamp(),
        course_id: quiz.course_id || slug
      };
      
      console.log('Saving quiz result to Firestore:', quizResult);
      
      // Save to quiz_results collection
      const resultDoc = await addDoc(collection(db, 'quiz_results'), quizResult);
      console.log('Quiz result saved with ID:', resultDoc.id);
      
      // Update quiz attempts
      const attemptData = {
        quiz_id: quiz.id,
        user_id: user.uid,
        user_email: user.email,
        attempt_date: serverTimestamp(),
        score: finalScore
      };
      
      console.log('Saving quiz attempt to Firestore:', attemptData);
      
      const attemptDoc = await addDoc(collection(db, 'quiz_attempts'), attemptData);
      console.log('Quiz attempt saved with ID:', attemptDoc.id);
      
      // Mark quiz as submitted
      setQuizSubmitted(true);
      console.log('Quiz submission completed successfully!');
      
    } catch (error) {
      console.error('Detailed error during quiz submission:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      setError(`Nie udało się zapisać wyników quizu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setLoading(false);
    }
  }, [quiz, user, selectedAnswers, openAnswers, slug]);

  const fetchAttempts = useCallback(async (quizId: string) => {
    if (!user) return 0;
    
    try {
      const attemptsCollection = collection(db, 'quiz_attempts');
      const attemptsQuery = query(
        attemptsCollection,
        where('user_id', '==', user.uid),
        where('quiz_id', '==', quizId)
      );
      
      const attemptsSnapshot = await getDocs(attemptsQuery);
      return attemptsSnapshot.size;
    } catch (error) {
        console.error('Error fetching quiz attempts:', error);
      return 0;
    }
  }, [user]);

  const fetchQuiz = useCallback(async () => {
    try {
      console.log('Fetching quiz with ID:', quizId);
      console.log('Firebase db object:', db);

      const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
      if (!quizDoc.exists()) throw new Error('Quiz not found');

      const data = quizDoc.data() as DocumentData;
      console.log('Quiz data from Firestore:', data);
      
      const questions = data.questions?.map((q: DocumentData, index: number) => ({
        ...q,
        id: q.id || `question_${index}_${generateUUID()}`,
        answers: q.answers?.map((a: DocumentData, answerIndex: number) => ({
          ...a,
          id: a.id || `answer_${index}_${answerIndex}_${generateUUID()}`
        })) || []
      })) || [];

      console.log('Processed questions with IDs:', questions.map((q: any) => ({ id: q.id, title: q.content?.substring(0, 50) })));

      const quizData: Quiz = {
        id: quizDoc.id,
        title: data.title,
        description: data.description,
        subject: data.subject,
        course_id: data.course_id,
        questions,
        max_attempts: data.max_attempts || 1,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        created_by: data.created_by || null
      };
      
      console.log('Final quiz data:', quizData);
      setQuiz(quizData);
      
      // Check attempts
      const attempts = await fetchAttempts(quizId);
      setAttemptsCount(attempts);
      if (attempts >= quizData.max_attempts) {
        setMaxAttemptsReached(true);
        setError('Wykorzystano maksymalną liczbę prób dla tego quizu.');
        router.push('/courses/' + slug);
        return;
      }
    } catch (err) {
      console.error('Detailed error fetching quiz:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        setError(`Błąd ładowania quizu: ${err.message}`);
      } else {
        console.error('Unknown error:', err);
        setError('Nie udało się załadować quizu - nieznany błąd');
      }
    } finally {
      setLoading(false);
    }
  }, [router, slug, fetchAttempts, quizId]);

  useEffect(() => {
    if (slug && quizId) {
    fetchQuiz();
    }
  }, [fetchQuiz, slug, quizId]);

  // Timer functionality
  useEffect(() => {
    if (!quizStarted || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto-submit quiz
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizStarted, timeLeft]);
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Start quiz when first question is loaded
  useEffect(() => {
    if (quiz && !quizStarted) {
      setQuizStarted(true);
    }
  }, [quiz, quizStarted]);

  // Count answered questions
  const getAnsweredCount = useCallback(() => {
    if (!quiz) return 0;
    
    return quiz.questions.filter(question => {
      if (question.type === 'open' || !question.answers?.length) {
        return openAnswers[question.id]?.content?.trim();
      } else {
        return selectedAnswers[question.id];
      }
    }).length;
  }, [quiz, openAnswers, selectedAnswers]);
  
  // Calculate completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (!quiz) return 0;
    return Math.round((getAnsweredCount() / quiz.questions.length) * 100);
  }, [quiz, getAnsweredCount]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useCallback(() => {
    if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) return false;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return false;
    
    if (currentQuestion.type === 'open' || !currentQuestion.answers?.length) {
      return openAnswers[currentQuestion.id]?.content?.trim() || false;
    } else {
      return selectedAnswers[currentQuestion.id] || false;
    }
  }, [quiz, currentQuestionIndex, openAnswers, selectedAnswers]);

  // Check if all questions are answered
  const areAllQuestionsAnswered = useCallback(() => {
    return quiz?.questions.every(question => {
      if (question.type === 'open' || !question.answers?.length) {
        return openAnswers[question.id]?.content?.trim();
      } else {
        return selectedAnswers[question.id];
      }
    }) || false;
  }, [quiz?.questions, openAnswers, selectedAnswers]);

  if (loading) return <div className="p-4">Ładowanie quizu...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!quiz) return <QuizNotFound />;
  if (!quiz.questions || quiz.questions.length === 0) return <div className="p-4 text-red-500">Quiz nie ma pytań</div>;
  if (maxAttemptsReached) return <div className="p-4 text-red-500">Wykorzystano maksymalną liczbę prób dla tego quizu.</div>;

  // Reset question index if out of range
  if (currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
    setCurrentQuestionIndex(0);
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return <div className="p-4 text-red-500">Błąd: Nie znaleziono pytania</div>;
  }

  const renderQuestion = (question: Question) => {
    if (!question) {
      return <div className="p-4 text-red-500">Błąd: Nieprawidłowe pytanie</div>;
    }

    if (quizSubmitted) {
      return (
        <div className="space-y-4">
          <div className="font-medium">
            {question.content || 'Brak treści pytania'}
          </div>
          <div className="pl-4">
            {(question.type === 'open' || !question.answers?.length) ? (
              <div className="space-y-2">
                <div>Twoja odpowiedź:</div>
                <div className="pl-4">
                  {openAnswers[question.id]?.type === 'math' ? (
                    <MathView content={openAnswers[question.id]?.content || ''} />
                  ) : (
                    <p>{openAnswers[question.id]?.content || ''}</p>
                  )}
                </div>
                <div className="mt-2">Poprawna odpowiedź:</div>
                <div className="pl-4 text-green-600">
                  {question.answers[0]?.type === 'math' ? (
                    <MathView content={question.answers[0].content} />
                  ) : (
                    <p>{question.answers[0]?.content}</p>
                  )}
                </div>
              </div>
            ) : (
              (question.answers || []).map((answer, index) => (
                <div
                  key={answer.id}
                  className={`p-3 mb-2 rounded ${
                    answer.is_correct ? 'bg-green-100' : 
                    selectedAnswers[question.id] === answer.id ? 'bg-red-100' : ''
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + index)})</span>{' '}
                  {answer.content || 'Brak treści odpowiedzi'}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {(question.type === 'open' || !question.answers?.length) ? (
          <div className="space-y-4">
            <QuizAnswerInput
              onSubmit={(answer) => {
                setOpenAnswers(prev => ({ ...prev, [question.id]: answer }));
                // Don't auto-advance - let user control navigation
              }}
              disabled={quizSubmitted}
            />
            <div className="text-sm text-blue-600 italic">
              Odpowiedź została zapisana. Użyj przycisku "Następne" aby przejść dalej.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(question.answers || []).map((answer, index) => (
              <label
                key={answer.id}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                  selectedAnswers[question.id] === answer.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={answer.id}
                  checked={selectedAnswers[question.id] === answer.id}
                  onChange={() => {
                  setSelectedAnswers(prev => ({ ...prev, [question.id]: answer.id }));
                }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-900">
                <span className="font-medium">{String.fromCharCode(65 + index)})</span>{' '}
                {answer.content || 'Brak treści odpowiedzi'}
                </span>
              </label>
            ))}
            {selectedAnswers[question.id] && (
              <div className="text-sm text-blue-600 italic mt-2">
                Odpowiedź została wybrana. Użyj przycisku "Następne" aby przejść dalej.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (quizSubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">{quiz.title} - Wyniki</h1>
        <div className="mb-6">
          <div className="text-xl mb-2">
            Twój wynik: {score.toFixed(1)}%
          </div>
          <div className="h-4 bg-gray-200 rounded-full">
            <div
              className="h-4 bg-green-500 rounded-full"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        <div className="space-y-8">
          {quiz.questions.map((question, index) => (
            <div key={`question-${index}`} className="border-b pb-6">
              <div className="font-semibold mb-2">Pytanie {index + 1}</div>
              {renderQuestion(question)}
            </div>
          ))}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Wróć do kursu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-xl font-bold text-blue-600">EP EduPanel</div>
            </div>
            <div className="flex space-x-4">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
                Panel Nauczyciela
              </button>
              <button className="px-4 py-2 bg-black text-white rounded-lg">
                Widok Ucznia
              </button>
            </div>
          </div>
        </div>
      </div>

    <div className="max-w-4xl mx-auto p-6">
        {/* Quiz Header Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
          
          {/* Attempts and Error Info */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
            <div className="text-sm">
              Próba: {attemptsCount + 1} z {quiz.max_attempts}
              {attemptsCount >= quiz.max_attempts - 1 && (
                <span className="ml-2 text-orange-600 font-medium">
                  To jest Twoja ostatnia próba!
                </span>
              )}
            </div>
          </div>
          
          {/* Quiz Info Bar */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-600">
          Pytanie {currentQuestionIndex + 1} z {quiz.questions.length}
        </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono">{formatTime(timeLeft)}</span>
              </div>
              <div className="text-sm text-gray-600">
                {getAnsweredCount()}/{quiz.questions.length} odpowiedzi
              </div>
            </div>
          </div>
        </div>

        {/* Main Question Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-900">
              Pytanie {currentQuestionIndex + 1}
            </div>
            <div className="text-sm text-gray-500 bg-blue-100 px-3 py-1 rounded-full">
              {currentQuestion.points || 1} pkt
        </div>
      </div>

          {/* Question Content */}
          <div className="mb-6">
            <p className="text-gray-900 text-lg leading-relaxed">
              {currentQuestion.content || 'Brak treści pytania'}
            </p>
          </div>

          {/* Answer Options */}
      {renderQuestion(currentQuestion)}
        </div>

        {/* Progress and Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Progress Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getAnsweredCount()}</div>
              <div className="text-sm text-gray-600">Odpowiedzi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{quiz.questions.length - getAnsweredCount()}</div>
              <div className="text-sm text-gray-600">Pozostało</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getCompletionPercentage()}%</div>
              <div className="text-sm text-gray-600">Ukończono</div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
        <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
              className="px-6 py-3 text-blue-600 disabled:text-gray-400 font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Poprzednie</span>
            </button>

            {/* Question Paginator */}
            <div className="flex space-x-2">
              {quiz.questions.map((_, index) => {
                const isAnswered = quiz.questions[index].type === 'open' || !quiz.questions[index].answers?.length
                  ? openAnswers[quiz.questions[index].id]?.content?.trim()
                  : selectedAnswers[quiz.questions[index].id];
                
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      index === currentQuestionIndex
                        ? 'bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
        </button>
                );
              })}
            </div>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
                disabled={!isCurrentQuestionAnswered()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Zakończ quiz
          </button>
        ) : (
          <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                disabled={!isCurrentQuestionAnswered()}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
              >
                <span>Następne</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
          </button>
        )}
          </div>
        </div>
      </div>
    </div>
  );
} 