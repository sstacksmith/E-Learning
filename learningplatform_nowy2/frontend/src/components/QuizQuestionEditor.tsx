'use client';

import { useState } from 'react';
import { MathEditor } from './MathEditor';

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
      id: crypto.randomUUID(),
      content: '',
      type: 'text',
      answers: [],
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMathMode, setIsMathMode] = useState(question.type === 'math');
  const [isOpenQuestion, setIsOpenQuestion] = useState(question.type === 'open');
  const [showMathEditor, setShowMathEditor] = useState(false);

  const handleAddAnswer = () => {
    if (isOpenQuestion) {
      setQuestion((prev) => ({
        ...prev,
        answers: [
          {
            id: crypto.randomUUID(),
            content: '',
            isCorrect: true,
            type: 'mixed',
          },
        ],
      }));
    } else {
      setQuestion((prev) => ({
        ...prev,
        answers: [
          ...prev.answers,
          {
            id: crypto.randomUUID(),
            content: '',
            isCorrect: false,
            type: 'mixed',
          },
        ],
      }));
    }
  };

  const handleAnswerChange = (answerId: string, content: string, isMath: boolean = false) => {
    setQuestion((prev) => ({
      ...prev,
      answers: prev.answers.map((ans) =>
        ans.id === answerId
          ? {
              ...ans,
              [isMath ? 'mathContent' : 'content']: content,
            }
          : ans
      ),
    }));
  };

  const handleQuestionChange = (content: string, isMath: boolean = false) => {
    setQuestion((prev) => ({
      ...prev,
      [isMath ? 'mathContent' : 'content']: content,
    }));
  };

  const handleToggleCorrect = (answerId: string) => {
    if (isOpenQuestion) return;
    
    setQuestion((prev) => ({
      ...prev,
      answers: prev.answers.map((ans) =>
        ans.id === answerId ? { ...ans, isCorrect: !ans.isCorrect } : ans
      ),
    }));
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
              setIsOpenQuestion(isOpen);
              if (isOpen) {
                // Jeśli zmieniamy na pytanie otwarte, zawsze tworzymy nową odpowiedź
                setQuestion((prev) => ({
                  ...prev,
                  type: 'open',
                  answers: [{
                    id: crypto.randomUUID(),
                    content: '',
                    isCorrect: true,
                    type: 'mixed'
                  }]
                }));
              } else {
                // Jeśli zmieniamy na ABCD, zachowujemy poprzednie odpowiedzi jeśli istnieją
                setQuestion((prev) => ({
                  ...prev,
                  type: 'mixed',
                  answers: prev.type === 'open' ? [] : prev.answers
                }));
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
              <MathEditor
                initialValue={question.mathContent || ''}
                onChange={(content) => handleQuestionChange(content, true)}
              />
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
                    <MathEditor
                      initialValue={answer.mathContent || ''}
                      onChange={(content) => handleAnswerChange(answer.id, content, true)}
                    />
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
        onClick={() => onSave(question)}
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Zapisz pytanie
      </button>
    </div>
  );
}; 