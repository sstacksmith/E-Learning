'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/config/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import MathView from '@/components/MathView';
import QuizAnswerInput from '@/components/QuizAnswerInput';
import { Quiz, Question } from '@/types';

interface QuizAnswer {
  content: string;
  type: 'text' | 'math';
}

interface QuizSubmission {
  quiz_id: string;
  user_id: string;
  user_email: string;
  score: number;
  answers: {
    selected: Record<string, string>;
    open: QuizAnswer;
  };
  completed_at: Date;
  timestamp: Date;
  course_id: string;
}

export default function QuizTaking() {
  const router = useRouter();
  const slug = window.location.pathname.split('/')[2]; // Wyciągamy slug z URL
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [openAnswer, setOpenAnswer] = useState<{ content: string; type: 'text' | 'math' }>({ content: '', type: 'text' });
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


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
      if (error instanceof Error) {
        console.error('Error fetching quiz attempts:', error.message);
      } else {
        console.error('Error fetching quiz attempts:', error);
      }
      return 0;
    }
  }, [user]);

  const fetchQuiz = useCallback(async () => {
    try {
      const quizId = window.location.pathname.split('/').pop();
      if (!quizId) throw new Error('Quiz ID not found');

      const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
      if (!quizDoc.exists()) throw new Error('Quiz not found');

      const data = quizDoc.data() as DocumentData;
      const questions = data.questions?.map((q: DocumentData) => ({
        ...q,
        id: q.id || crypto.randomUUID(),
        answers: q.answers?.map((a: DocumentData) => ({
          ...a,
          id: a.id || crypto.randomUUID()
        })) || []
      })) || [];

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
      
      setQuiz(quizData);
      
      // Sprawdź liczbę prób
      const attempts = await fetchAttempts(quizId);
      if (attempts >= quizData.max_attempts) {
        setError('Wykorzystano maksymalną liczbę prób dla tego quizu.');
        router.push('/courses/' + slug);
        return;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Nie udało się załadować quizu');
      }
      console.error('Error fetching quiz:', err);
    } finally {
      setLoading(false);
    }
  }, [router, slug, fetchAttempts, setQuiz, setError, setLoading]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleSubmit = useCallback(async () => {
    if (!quiz || !user) return;

    let correctAnswers = 0;

    quiz.questions.forEach((question) => {
      if (question.type === 'open') {
        const userAnswer = openAnswer.content.trim().toLowerCase();
        const correctAnswer = question.answers[0]?.content.trim().toLowerCase() || '';
        
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      } else {
        const selectedAnswerId = selectedAnswers[question.id];
        const correctAnswer = question.answers.find(a => a.is_correct);
        if (selectedAnswerId && correctAnswer && selectedAnswerId === correctAnswer.id) {
          correctAnswers++;
        }
      }
    });

    const finalScore = (correctAnswers / quiz.questions.length) * 100;
    setScore(finalScore);

    try {
      // Zapisz próbę w bazie danych
      const quizAttemptsCollection = collection(db, 'quiz_attempts');
      await addDoc(quizAttemptsCollection, {
        quiz_id: quiz.id,
        user_id: user.uid,
        timestamp: serverTimestamp()
      });

      // Zapisz wynik do bazy danych
      const quizResultsCollection = collection(db, 'quiz_results');
      const submission: QuizSubmission = {
        quiz_id: quiz.id,
        user_id: user.uid,
        user_email: user.email || '',
        score: finalScore,
        answers: {
          selected: selectedAnswers,
          open: openAnswer
        },
        completed_at: new Date(),
        timestamp: new Date(),
        course_id: quiz.course_id
      };

      await addDoc(quizResultsCollection, {
        ...submission,
        completed_at: serverTimestamp(),
        timestamp: serverTimestamp()
      });

      setQuizSubmitted(true);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error saving quiz results:', error.message);
        setError('Nie udało się zapisać wyników quizu. Spróbuj ponownie.');
      } else {
        console.error('Error saving quiz results:', error);
        setError('Wystąpił nieznany błąd podczas zapisywania wyników.');
      }
    }
  }, [quiz, user, openAnswer, selectedAnswers, setScore, setQuizSubmitted, setError]);

  if (loading) return <div className="p-4">Ładowanie quizu...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!quiz) return <div className="p-4">Nie znaleziono quizu</div>;
  if (!quiz.questions || quiz.questions.length === 0) return <div className="p-4 text-red-500">Quiz nie ma pytań</div>;

  // Sprawdź czy currentQuestionIndex jest w prawidłowym zakresie
  if (currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
    setCurrentQuestionIndex(0); // Reset do pierwszego pytania
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Sprawdź czy currentQuestion istnieje
  if (!currentQuestion) {
    return <div className="p-4 text-red-500">Błąd: Nie znaleziono pytania</div>;
  }

  const renderQuestion = (question: Question) => {
    // Sprawdź czy question istnieje
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
                  {openAnswer.type === 'math' ? (
                    <MathView content={openAnswer.content} />
                  ) : (
                    <p>{openAnswer.content}</p>
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
        <div className="font-medium">
          {question.content || 'Brak treści pytania'}

        </div>
        {(question.type === 'open' || !question.answers?.length) ? (
          <div className="space-y-4">
            <QuizAnswerInput
              onSubmit={(answer) => {
                setOpenAnswer(answer);
                if (currentQuestionIndex < quiz.questions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1);
                }
              }}
              disabled={quizSubmitted}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {(question.answers || []).map((answer, index) => (
              <div
                key={answer.id}
                className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedAnswers[question.id] === answer.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
                onClick={() => {
                  setSelectedAnswers(prev => ({ ...prev, [question.id]: answer.id }));
                  if (currentQuestionIndex < quiz.questions.length - 1) {
                    setCurrentQuestionIndex(prev => prev + 1);
                  }
                }}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)})</span>{' '}
                {answer.content || 'Brak treści odpowiedzi'}

              </div>
            ))}
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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{quiz.title}</h1>
      <div className="mb-6">
        <div className="text-sm text-gray-600 mb-2">
          Pytanie {currentQuestionIndex + 1} z {quiz.questions.length}
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-500 rounded-full"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {renderQuestion(currentQuestion)}

      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={() => {
            setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
            setOpenAnswer({ content: '', type: 'text' });
          }}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-blue-600 disabled:text-gray-400"
        >
          ← Poprzednie
        </button>
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={
              (currentQuestion.type === 'open' || !currentQuestion.answers?.length)
                ? !openAnswer.content.trim()
                : !selectedAnswers[currentQuestion.id]
            }
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Zakończ quiz
          </button>
        ) : (
          <button
            onClick={() => {
              setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1));
                          setOpenAnswer({ content: '', type: 'text' });
            }}
            disabled={
              (currentQuestion.type === 'open' || !currentQuestion.answers?.length)
                ? !openAnswer.content.trim()
                : !selectedAnswers[currentQuestion.id]
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Następne →
          </button>
        )}
      </div>
    </div>
  );
} 