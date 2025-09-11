'use client';

import { useState, useEffect } from 'react';
import { MathEditor } from './MathEditor';
import MathView from './MathView';
import useApi from '../hooks/useApi';

interface Answer {
  id: string;
  content: string;
  mathContent?: string;
  type: 'text' | 'math' | 'mixed';
}

interface Question {
  id: string;
  content: string;
  mathContent?: string;
  type: 'text' | 'math' | 'mixed' | 'open';
  answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface QuizDisplayProps {
  quizId: string;
}

export const QuizDisplay: React.FC<QuizDisplayProps> = ({ quizId }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const api = useApi();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await api.get<{ data: Quiz }>(`/api/quizzes/${quizId}/`);
        setQuiz(response.data);
      } catch (error) {
        console.error('Error fetching quiz:', error);
      }
    };

    fetchQuiz();
  }, [quizId, api]);

  const startQuiz = async () => {
    try {
      const response = await api.post<{ data: { id: string } }>(`/api/quizzes/${quizId}/start_attempt/`);
      setAttemptId(response.data.id);
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const submitAnswer = async (questionId: string, answerId: string) => {
    if (!attemptId) return;

    try {
      setIsSubmitting(true);
      const response = await api.post<{ data: { score: number } }>(`/api/quizzes/${quizId}/submit_answer/`, {
        question: questionId,
        answer: answerId,
        attempt: attemptId,
      });

      if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Quiz completed
        setScore(response.data.score);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funkcja verifyMathExpression została przeniesiona do osobnego hooka

  if (!quiz) {
    return <div>Loading...</div>;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{quiz.title}</h2>
      <p className="mb-6">{quiz.description}</p>

      {!attemptId && (
        <button
          onClick={startQuiz}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start Quiz
        </button>
      )}

      {attemptId && !score && (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-2">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </h3>
            
            <div className="mb-4">
              {currentQuestion.content && (
                <p className="mb-2">{currentQuestion.content}</p>
              )}
              {currentQuestion.mathContent && (
                <div className="p-3 border rounded bg-gray-50">
                  <MathView content={currentQuestion.mathContent} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {currentQuestion.answers.map((answer) => (
                <div key={answer.id} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={selectedAnswers[currentQuestion.id] === answer.id}
                    onChange={() => handleAnswerSelect(currentQuestion.id, answer.id)}
                    className="form-radio"
                  />
                  <div className="flex-1">
                    {answer.content && (
                      <span className="block mb-1">{answer.content}</span>
                    )}
                    {answer.mathContent && (
                      <div className="p-2 border rounded bg-gray-50">
                        <MathView content={answer.mathContent} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                submitAnswer(
                  currentQuestion.id,
                  selectedAnswers[currentQuestion.id]
                )
              }
              disabled={!selectedAnswers[currentQuestion.id] || isSubmitting}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      )}

      {score !== null && (
        <div className="text-center p-4 bg-blue-100 rounded">
          <h3 className="text-xl font-bold">Quiz Completed!</h3>
          <p className="text-lg">Your score: {score}%</p>
        </div>
      )}
    </div>
  );
}; 