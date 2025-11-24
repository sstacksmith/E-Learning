'use client';

import { useState, useEffect } from 'react';
import { MathEditor } from './MathEditor';
import MathView from './MathView';
import { CheckCircle } from 'lucide-react';
import { Question, Answer } from '@/types/models';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MixedContent {
  type: 'text' | 'math';
  content: string;
}

// Lokalne typy rozszerzające globalne
interface LocalAnswer extends Omit<Answer, 'created_at' | 'updated_at' | 'created_by' | 'id'> {
  id?: string; // Optional for new answers
  mathContent?: string;
}

interface QuestionData extends Omit<Question, 'created_at' | 'updated_at' | 'created_by' | 'answers' | 'id'> {
  id?: string; // Optional for new questions
  mathContent?: string;
  answers: LocalAnswer[];
}

interface QuizQuestionEditorProps {
  initialQuestion?: QuestionData;
  onSave: (question: QuestionData) => void;
  isEditing?: boolean;
}

export const QuizQuestionEditor: React.FC<QuizQuestionEditorProps> = ({
  initialQuestion,
  onSave,
  isEditing = false,
}) => {
  const [question, setQuestion] = useState<QuestionData>(
    initialQuestion || {
      id: generateUUID(),
      content: '',
      type: 'text',
      answers: [],
      points: 1,
      order: 0,
    }
  );

  console.log('QuizQuestionEditor initialized with question:', question);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMathMode, setIsMathMode] = useState(question.type === 'math');
  const [isOpenQuestion, setIsOpenQuestion] = useState(question.type === 'open');
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Update question when initialQuestion changes
  useEffect(() => {
    if (initialQuestion) {
      console.log('QuizQuestionEditor: initialQuestion changed, updating question state:', initialQuestion);
      setQuestion(initialQuestion);
      setIsMathMode(initialQuestion.type === 'math');
      setIsOpenQuestion(initialQuestion.type === 'open');
    }
  }, [initialQuestion]);

  const handleAddAnswer = () => {
    console.log('Adding answer, current question type:', question.type);
    if (isOpenQuestion) {
      setQuestion((prev) => {
        const updated = {
          ...prev,
          answers: [
            {
              id: generateUUID(),
              content: '',
              is_correct: true,
              type: 'mixed' as const,
            },
          ],
        };
        console.log('Updated question after adding open answer:', updated);
        return updated;
      });
    } else {
      setQuestion((prev) => {
        const updated = {
          ...prev,
          answers: [
            ...prev.answers,
            {
              id: generateUUID(),
              content: '',
              is_correct: false,
              type: 'mixed' as const,
            },
          ],
        };
        console.log('Updated question after adding ABCD answer:', updated);
        return updated;
      });
    }
  };

  const handleAnswerChange = (answerId: string, content: string, isMath: boolean = false) => {
    console.log('Answer changing:', { answerId, content, isMath });
    setQuestion((prev) => {
      const updated = {
        ...prev,
        answers: prev.answers.map((ans) =>
          ans.id === answerId
            ? {
                ...ans,
                [isMath ? 'mathContent' : 'content']: content,
              }
            : ans
        ),
      };
      console.log('Updated question state after answer change:', updated);
      return updated;
    });
  };

  const handleQuestionChange = (content: string, isMath: boolean = false) => {
    console.log('Question content changing:', { content, isMath });
    setQuestion((prev) => {
      const updated = {
        ...prev,
        [isMath ? 'mathContent' : 'content']: content,
      };
      console.log('Updated question state:', updated);
      return updated;
    });
  };

  const handleToggleCorrect = (answerId: string) => {
    if (isOpenQuestion) return;
    
    console.log('Toggling correct answer:', answerId);
    setQuestion((prev) => {
      const updated = {
        ...prev,
        answers: prev.answers.map((ans) =>
          ans.id === answerId ? { ...ans, is_correct: !ans.is_correct } : ans
        ),
      };
      console.log('Updated question after toggling correct answer:', updated);
      return updated;
    });
  };

  const handleRemoveAnswer = (answerId: string) => {
    console.log('Removing answer:', answerId);
    setQuestion((prev) => {
      const updated = {
        ...prev,
        answers: prev.answers.filter((ans) => ans.id !== answerId),
      };
      console.log('Updated question after removing answer:', updated);
      return updated;
    });
  };

  const validateQuestion = (): string | null => {
    if (!question.content.trim()) {
      return 'Treść pytania nie może być pusta';
    }
    
    if (question.answers.length < 2) {
      return 'Pytanie musi mieć minimum 2 odpowiedzi';
    }
    
    const hasCorrectAnswer = question.answers.some(answer => answer.is_correct);
    if (!hasCorrectAnswer) {
      return 'Musi być zaznaczona minimum 1 poprawna odpowiedź';
    }
    
    return null;
  };

  const resetForm = () => {
    const newQuestion = {
      id: generateUUID(),
      content: '',
      type: 'text' as const,
      answers: [],
      points: 1,
      order: 0,
    };
    setQuestion(newQuestion);
    setIsOpenQuestion(false);
    setShowMathEditor(false);
  };

  const handleSaveQuestion = () => {
    const validationError = validateQuestion();
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log('Saving question:', question);
    console.log('Question type:', question.type);
    console.log('Question content:', question.content);
    console.log('Question answers:', question.answers);
    
    onSave(question);
    
    // Pokaż lokalny pop-up sukcesu
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
    
    // Wyczyść formularz po zapisaniu tylko jeśli nie edytujemy
    if (!isEditing) {
      setTimeout(() => {
        resetForm();
      }, 1000); // Opóźnienie 1 sekunda, żeby użytkownik zobaczył pop-up
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Edytor pytania</h3>
        <div className="flex items-center space-x-4">
          <select
            value={isOpenQuestion ? 'open' : 'abcd'}
            onChange={(e) => {
              const isOpen = e.target.value === 'open';
              console.log('Question type changing to:', isOpen ? 'open' : 'abcd');
              setIsOpenQuestion(isOpen);
              if (isOpen) {
                // Jeśli zmieniamy na pytanie otwarte, zawsze tworzymy nową odpowiedź
                setQuestion((prev) => {
                  const updated = {
                    ...prev,
                    type: 'open' as const,
                    answers: [{
                      id: generateUUID(),
                      content: '',
                      is_correct: true,
                      type: 'mixed' as const
                    }]
                  };
                  console.log('Updated question after changing to open type:', updated);
                  return updated;
                });
              } else {
                // Jeśli zmieniamy na ABCD, zachowujemy poprzednie odpowiedzi jeśli istnieją
                setQuestion((prev) => {
                  const updated = {
                    ...prev,
                    type: 'mixed' as const,
                    answers: prev.type === 'open' ? [] : prev.answers
                  };
                  console.log('Updated question after changing to ABCD type:', updated);
                  return updated;
                });
              }
            }}
            className="p-2 border rounded"
          >
            <option value="abcd">Pytanie ABCD</option>
            <option value="open">Pytanie otwarte</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Treść pytania</label>
        <div className="space-y-2">
          <textarea
            value={question.content}
            onChange={(e) => handleQuestionChange(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Wpisz treść pytania..."
          />
          {question.content && (
            <div className="p-3 border rounded bg-gray-50">
              <label className="block text-sm font-medium mb-2">Podgląd treści pytania:</label>
              <div className="p-2 bg-white border rounded">
                <p className="whitespace-pre-wrap">{question.content}</p>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMathEditor(!showMathEditor)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {showMathEditor ? 'Ukryj edytor matematyczny' : 'Dodaj wyrażenie matematyczne'}
            </button>
            {question.mathContent && (
              <span className="text-sm text-gray-500">
                (Wyrażenie matematyczne dodane)
              </span>
            )}
          </div>
          {showMathEditor && (
            <div className="p-3 border rounded bg-gray-50">
              <label className="block text-sm font-medium mb-2">
                Wyrażenie matematyczne
              </label>
              <div className="border rounded p-2 bg-white">
                <MathEditor
                  initialValue={question.mathContent || ''}
                  onChange={(value) => handleQuestionChange(value, true)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Użyj edytora matematycznego powyżej do tworzenia wyrażeń
                </p>
                {question.mathContent && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <label className="block text-sm font-medium mb-1">Podgląd wyrażenia:</label>
                    <MathView content={question.mathContent} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            {isOpenQuestion ? 'Poprawna odpowiedź' : 'Odpowiedzi'}
          </label>
          {!isOpenQuestion && (
            <div className="text-sm text-gray-500">
              Zielone tło oznacza odpowiedź uznawaną za poprawną
            </div>
          )}
        </div>
        
        {question.answers.map((answer, index) => (
          <div key={`answer-${index}`} className="space-y-2">
            <div className="flex items-center space-x-2">
              {!isOpenQuestion && (
                <div className="w-8 text-center font-medium">
                  {String.fromCharCode(65 + index)})
                </div>
              )}
              <div 
                className={`flex-1 p-2 rounded transition-colors ${
                  answer.is_correct ? 'bg-green-50 border-green-200' : ''
                }`}
              >
                <div className="space-y-2">
                  <textarea
                    value={answer.content}
                    onChange={(e) => handleAnswerChange(answer.id || generateUUID(), e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder={isOpenQuestion ? "Wpisz poprawną odpowiedź" : `Odpowiedź ${String.fromCharCode(65 + index)}`}
                  />
                  {answer.content && (
                    <div className="p-2 border rounded bg-gray-50">
                      <label className="block text-sm font-medium mb-1">Podgląd odpowiedzi:</label>
                      <div className="p-2 bg-white border rounded">
                        <p className="whitespace-pre-wrap">{answer.content}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const answerMathEditor = document.getElementById(`math-editor-${answer.id}`);
                        if (answerMathEditor) {
                          answerMathEditor.style.display = 
                            answerMathEditor.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      {answer.mathContent ? 'Edytuj wyrażenie matematyczne' : 'Dodaj wyrażenie matematyczne'}
                    </button>
                    {answer.mathContent && (
                      <span className="text-sm text-gray-500">
                        (Wyrażenie matematyczne dodane)
                      </span>
                    )}
                  </div>
                  <div id={`math-editor-${answer.id}`} style={{ display: 'none' }} className="p-3 border rounded bg-gray-50">
                    <label className="block text-sm font-medium mb-2">
                      Wyrażenie matematyczne dla odpowiedzi {String.fromCharCode(65 + index)}
                    </label>
                    <div className="border rounded p-2 bg-white">
                      <MathEditor
                        initialValue={answer.mathContent || ''}
                        onChange={(value) => handleAnswerChange(answer.id || generateUUID(), value, true)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Użyj edytora matematycznego powyżej do tworzenia wyrażeń
                      </p>
                      {answer.mathContent && (
                        <div className="mt-2 p-2 bg-gray-100 rounded">
                          <label className="block text-sm font-medium mb-1">Podgląd wyrażenia:</label>
                          <MathView content={answer.mathContent} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {!isOpenQuestion && (
                <button
                  onClick={() => handleToggleCorrect(answer.id || generateUUID())}
                  className={`px-3 py-2 rounded transition-colors ${
                    answer.is_correct 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title={answer.is_correct ? 'Kliknij aby odznaczyć jako niepoprawną' : 'Kliknij aby oznaczyć jako poprawną'}
                >
                  ✓
                </button>
              )}
              {/* Przycisk usuwania odpowiedzi */}
              <button
                onClick={() => handleRemoveAnswer(answer.id || generateUUID())}
                disabled={!isOpenQuestion && question.answers.length <= 2}
                className={`px-3 py-2 rounded transition-colors ${
                  !isOpenQuestion && question.answers.length <= 2
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={
                  !isOpenQuestion && question.answers.length <= 2
                    ? 'Nie można usunąć ostatniej odpowiedzi (minimum 2)'
                    : 'Usuń odpowiedź'
                }
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {(!isOpenQuestion || question.answers.length === 0) && (
          <button
            onClick={handleAddAnswer}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isOpenQuestion ? 'Dodaj odpowiedź' : 'Dodaj kolejną odpowiedź'}
          </button>
        )}
      </div>

      <div className="relative">
        <button
          onClick={handleSaveQuestion}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Zapisz pytanie
        </button>
        
        {/* Lokalny pop-up sukcesu */}
        {showSuccessMessage && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Pytanie zostało dodane poprawnie!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 