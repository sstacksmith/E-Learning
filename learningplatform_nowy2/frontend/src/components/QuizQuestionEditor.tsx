'use client';

import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MixedContent {
  type: 'text' | 'math';
  content: string;
}

interface Answer {
  id: string;
  content: string;
  mathContent?: string;
  isCorrect: boolean;
  type: 'text' | 'math' | 'mixed';
}

interface QuestionData {
  id: string;
  content: string;
  mathContent?: string;
  type: 'text' | 'math' | 'mixed' | 'open';
  answers: Answer[];
  explanation?: string;
}

interface QuizQuestionEditorProps {
  initialQuestion?: QuestionData;
  onSave: (question: QuestionData) => void;
}

export const QuizQuestionEditor: React.FC<QuizQuestionEditorProps> = ({
  initialQuestion,
  onSave,
}) => {
  const [question, setQuestion] = useState<QuestionData>(
    initialQuestion || {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: '',
      type: 'text',
      answers: [],
    }
  );

  console.log('QuizQuestionEditor initialized with question:', question);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMathMode, setIsMathMode] = useState(question.type === 'math');
  const [isOpenQuestion, setIsOpenQuestion] = useState(question.type === 'open');
  const [showMathEditor, setShowMathEditor] = useState(false);

  const handleAddAnswer = () => {
    console.log('Adding answer, current question type:', question.type);
    if (isOpenQuestion) {
      setQuestion((prev) => {
        const updated = {
          ...prev,
          answers: [
            {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              content: '',
              isCorrect: true,
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
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              content: '',
              isCorrect: false,
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
          ans.id === answerId ? { ...ans, isCorrect: !ans.isCorrect } : ans
        ),
      };
      console.log('Updated question after toggling correct answer:', updated);
      return updated;
    });
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
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                      content: '',
                      isCorrect: true,
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
                <textarea
                  value={question.mathContent || ''}
                  onChange={(e) => handleQuestionChange(e.target.value, true)}
                  placeholder="Wpisz wyrażenie matematyczne w formacie LaTeX..."
                  className="w-full p-2 border rounded"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Możesz używać składni LaTeX dla wyrażeń matematycznych
                </p>
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
          <div key={answer.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              {!isOpenQuestion && (
                <div className="w-8 text-center font-medium">
                  {String.fromCharCode(65 + index)})
                </div>
              )}
              <div 
                className={`flex-1 p-2 rounded transition-colors ${
                  answer.isCorrect ? 'bg-green-50 border-green-200' : ''
                }`}
              >
                <div className="space-y-2">
                  <textarea
                    value={answer.content}
                    onChange={(e) => handleAnswerChange(answer.id, e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder={isOpenQuestion ? "Wpisz poprawną odpowiedź" : `Odpowiedź ${String.fromCharCode(65 + index)}`}
                  />
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
                    <textarea
                      value={answer.mathContent || ''}
                      onChange={(e) => handleAnswerChange(answer.id, e.target.value, true)}
                      placeholder="Wpisz wyrażenie matematyczne w formacie LaTeX..."
                      className="w-full p-2 border rounded"
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Możesz używać składni LaTeX dla wyrażeń matematycznych
                    </p>
                  </div>
                </div>
              </div>
              {!isOpenQuestion && (
                <button
                  onClick={() => handleToggleCorrect(answer.id)}
                  className={`px-3 py-2 rounded transition-colors ${
                    answer.isCorrect 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title={answer.isCorrect ? 'Kliknij aby odznaczyć jako niepoprawną' : 'Kliknij aby oznaczyć jako poprawną'}
                >
                  ✓
                </button>
              )}
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

      <button
        onClick={() => {
          console.log('Saving question:', question);
          console.log('Question type:', question.type);
          console.log('Question content:', question.content);
          console.log('Question answers:', question.answers);
          onSave(question);
        }}
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Zapisz pytanie
      </button>
    </div>
  );
}; 