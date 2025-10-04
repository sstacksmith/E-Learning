'use client';

import React, { useState } from 'react';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import firebaseApp from '@/config/firebase';
import { Sparkles, BookOpen, Clock, Users, Target, Zap, CheckCircle, X, Edit3, Save, Settings, Eye, Info, AlertTriangle } from 'lucide-react';

// Inicjalizacja AI
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

interface Question {
  id: string;
  content: string;
  type: 'text' | 'math' | 'mixed' | 'open';
  answers: Array<{
    id: string;
    content: string;
    is_correct: boolean;
    type: 'text' | 'math' | 'mixed';
  }>;
  explanation?: string;
  points?: number;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  subject: string;
  questions: Question[];
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface AIQuizGeneratorProps {
  onQuizGenerated: (quiz: GeneratedQuiz) => void;
  onClose: () => void;
}

export const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({
  onQuizGenerated,
  onClose,
}) => {
  const [step, setStep] = useState<'input' | 'generating' | 'preview' | 'editing'>('input');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizSettings, setQuizSettings] = useState({
    subject: '',
    grade: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    questionCount: 5,
    customQuestionCount: false,
    timeLimit: 30,
  });
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [questionEditPrompt, setQuestionEditPrompt] = useState('');

  const generateQuiz = async () => {
    if (!quizDescription.trim()) {
      setError('Proszę opisać czego ma dotyczyć quiz');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep('generating');

    try {
      const prompt = `
Jesteś ekspertem w tworzeniu quizów edukacyjnych. Stwórz quiz na podstawie opisu nauczyciela.

OPIS QUIZU: ${quizDescription}
PRZEDMIOT: ${quizSettings.subject || 'Ogólny'}
KLASA: ${quizSettings.grade || 'Nieokreślona'}
POZIOM TRUDNOŚCI: ${quizSettings.difficulty}
LICZBA PYTAŃ: ${quizSettings.questionCount}
CZAS: ${quizSettings.timeLimit} minut

Odpowiedz TYLKO w formacie JSON bez dodatkowych komentarzy:

{
  "title": "Tytuł quizu",
  "description": "Krótki opis quizu",
  "subject": "Przedmiot",
  "questions": [
    {
      "id": "q1",
      "content": "Treść pytania",
      "type": "text",
      "answers": [
        {
          "id": "a1",
          "content": "Odpowiedź A",
          "is_correct": true,
          "type": "text"
        },
        {
          "id": "a2", 
          "content": "Odpowiedź B",
          "is_correct": false,
          "type": "text"
        }
      ],
      "explanation": "Wyjaśnienie odpowiedzi",
      "points": 1
    }
  ],
  "estimatedTime": ${quizSettings.timeLimit},
  "difficulty": "${quizSettings.difficulty}"
}

WAŻNE:
- Stwórz ${quizSettings.questionCount} pytań
- Każde pytanie ma 4 odpowiedzi (A, B, C, D)
- Tylko jedna odpowiedź jest poprawna
- Uwzględnij poziom trudności: ${quizSettings.difficulty}
- Dodaj wyjaśnienia do odpowiedzi
- Pytania mają być różnorodne i angażujące
- Użyj polskiego języka
`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Wyciągnij JSON z odpowiedzi
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Nie udało się wygenerować quizu w odpowiednim formacie');
      }

      const quizData = JSON.parse(jsonMatch[0]);
      
      // Generuj unikalne ID dla pytań i odpowiedzi
      const processedQuiz: GeneratedQuiz = {
        ...quizData,
        questions: quizData.questions.map((q: any, qIndex: number) => ({
          ...q,
          id: `q${qIndex + 1}`,
          answers: q.answers.map((a: any, aIndex: number) => ({
            ...a,
            id: `q${qIndex + 1}_a${aIndex + 1}`,
          })),
        })),
      };

      setGeneratedQuiz(processedQuiz);
      setStep('preview');
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError('Wystąpił błąd podczas generowania quizu. Spróbuj ponownie.');
      setStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptQuiz = () => {
    if (generatedQuiz) {
      onQuizGenerated(generatedQuiz);
      onClose();
    }
  };

  const handleEditQuiz = () => {
    setStep('editing');
  };

  const handleQuestionEdit = (questionIndex: number, updatedQuestion: Question) => {
    if (generatedQuiz) {
      const updatedQuiz = {
        ...generatedQuiz,
        questions: generatedQuiz.questions.map((q, index) => 
          index === questionIndex ? updatedQuestion : q
        ),
      };
      setGeneratedQuiz(updatedQuiz);
    }
  };

  const editQuestionWithAI = async (questionIndex: number) => {
    if (!generatedQuiz || !questionEditPrompt.trim()) {
      setError('Proszę opisać jak chcesz zmienić pytanie');
      return;
    }

    setIsEditingQuestion(true);
    setError(null);

    try {
      const currentQuestion = generatedQuiz.questions[questionIndex];
      
      const prompt = `
Jesteś ekspertem w tworzeniu pytań do quizów edukacyjnych. Na podstawie istniejącego pytania i instrukcji nauczyciela, stwórz nowe pytanie.

ISTNIEJĄCE PYTANIE:
Treść: ${currentQuestion.content}
Typ: ${currentQuestion.type}
Odpowiedzi: ${currentQuestion.answers.map(a => `${a.content} (${a.is_correct ? 'poprawna' : 'niepoprawna'})`).join(', ')}
Wyjaśnienie: ${currentQuestion.explanation || 'Brak'}

INSTRUKCJA NAUCZYCIELA: ${questionEditPrompt}

KONTEKST QUIZU:
Tytuł: ${generatedQuiz.title}
Przedmiot: ${generatedQuiz.subject}
Poziom trudności: ${generatedQuiz.difficulty}

Odpowiedz TYLKO w formacie JSON bez dodatkowych komentarzy:

{
  "content": "Nowa treść pytania",
  "type": "text",
  "answers": [
    {
      "id": "a1",
      "content": "Odpowiedź A",
      "is_correct": true,
      "type": "text"
    },
    {
      "id": "a2", 
      "content": "Odpowiedź B",
      "is_correct": false,
      "type": "text"
    },
    {
      "id": "a3",
      "content": "Odpowiedź C",
      "is_correct": false,
      "type": "text"
    },
    {
      "id": "a4",
      "content": "Odpowiedź D",
      "is_correct": false,
      "type": "text"
    }
  ],
  "explanation": "Wyjaśnienie odpowiedzi",
  "points": ${currentQuestion.points || 1}
}

WAŻNE:
- Stwórz 4 odpowiedzi (A, B, C, D)
- Tylko jedna odpowiedź jest poprawna
- Zachowaj poziom trudności quizu
- Użyj polskiego języka
- Uwzględnij instrukcję nauczyciela
`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Wyciągnij JSON z odpowiedzi
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Nie udało się wygenerować pytania w odpowiednim formacie');
      }

      const questionData = JSON.parse(jsonMatch[0]);
      
      // Generuj unikalne ID dla odpowiedzi
      const updatedQuestion: Question = {
        ...currentQuestion,
        content: questionData.content,
        type: questionData.type,
        answers: questionData.answers.map((a: any, aIndex: number) => ({
          ...a,
          id: `${currentQuestion.id}_a${aIndex + 1}`,
        })),
        explanation: questionData.explanation,
        points: questionData.points,
      };

      handleQuestionEdit(questionIndex, updatedQuestion);
      setEditingQuestionIndex(null);
      setQuestionEditPrompt('');
      
    } catch (err) {
      console.error('Error editing question:', err);
      setError('Wystąpił błąd podczas edycji pytania. Spróbuj ponownie.');
    } finally {
      setIsEditingQuestion(false);
    }
  };

  if (step === 'generating') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generuję quiz...</h3>
            <p className="text-gray-600 mb-4">AI analizuje Twoje wymagania i tworzy pytania</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header z gradientem */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 opacity-50"></div>
          <div className="relative p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Generator Quizu AI</h2>
                  <p className="text-gray-600">Stwórz quiz w kilka minut z pomocą sztucznej inteligencji</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-105"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">

          {step === 'input' && (
            <div className="space-y-8">
              {/* Główny opis */}
              <div className="group">
                <label className="block text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Opisz czego ma dotyczyć quiz *
                </label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 text-lg"
                  rows={4}
                  placeholder="Np.: Quiz z dodawania ułamków dla klasy 5, pytania o II wojnę światową dla liceum, test z gramatyki angielskiej..."
                />
              </div>

              {/* Ustawienia quizu */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ustawienia Quizu</h3>
                    <p className="text-sm text-gray-600">Dostosuj parametry quizu</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Przedmiot
                    </label>
                    <input
                      type="text"
                      value={quizSettings.subject}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300"
                      placeholder="Np.: Matematyka, Historia, Język polski"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Klasa/poziom
                    </label>
                    <input
                      type="text"
                      value={quizSettings.grade}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300"
                      placeholder="Np.: Klasa 5, Liceum, Studia"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Poziom trudności
                    </label>
                    <select
                      value={quizSettings.difficulty}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-300"
                    >
                      <option value="easy">Łatwy</option>
                      <option value="medium">Średni</option>
                      <option value="hard">Trudny</option>
                    </select>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-pink-700 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Liczba pytań
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="customQuestionCount"
                          checked={quizSettings.customQuestionCount}
                          onChange={(e) => setQuizSettings(prev => ({ 
                            ...prev, 
                            customQuestionCount: e.target.checked,
                            questionCount: e.target.checked ? prev.questionCount : 5
                          }))}
                          className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                        />
                        <label htmlFor="customQuestionCount" className="text-sm text-gray-700">
                          Wpisz własną liczbę pytań
                        </label>
                      </div>
                      
                      {quizSettings.customQuestionCount ? (
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={quizSettings.questionCount}
                          onChange={(e) => setQuizSettings(prev => ({ 
                            ...prev, 
                            questionCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                          }))}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-500 transition-all duration-300"
                          placeholder="Wpisz liczbę pytań (1-50)"
                        />
                      ) : (
                        <select
                          value={quizSettings.questionCount}
                          onChange={(e) => setQuizSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-500 transition-all duration-300"
                        >
                          <option value={3}>3 pytania</option>
                          <option value={5}>5 pytań</option>
                          <option value={10}>10 pytań</option>
                          <option value={15}>15 pytań</option>
                          <option value={20}>20 pytań</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Anuluj
                </button>
                <button
                  onClick={generateQuiz}
                  disabled={!quizDescription.trim() || isGenerating}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {isGenerating ? 'Generuję...' : 'Generuj Quiz'}
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && generatedQuiz && (
            <div className="space-y-8">
              {/* Sukces header */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-800">Quiz wygenerowany pomyślnie!</h3>
                    <p className="text-green-700">Sprawdź poniżej czy quiz spełnia Twoje oczekiwania</p>
                  </div>
                </div>
              </div>

              {/* Statystyki quizu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Tytuł</span>
                  </div>
                  <p className="text-gray-700 font-medium">{generatedQuiz.title}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border-2 border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Pytania</span>
                  </div>
                  <p className="text-gray-700 font-medium">{generatedQuiz.questions.length} pytań</p>
                </div>
                <div className="bg-white p-6 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Czas</span>
                  </div>
                  <p className="text-gray-700 font-medium">{generatedQuiz.estimatedTime} min</p>
                </div>
              </div>

              {/* Podgląd pytań */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Podgląd pytań</h4>
                </div>
                
                {generatedQuiz.questions.map((question, index) => (
                  <div key={question.id} className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h5 className="font-semibold text-gray-900 text-lg">
                        Pytanie {index + 1}: {question.content}
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-1 rounded-full font-medium">
                          {question.points || 1} pkt
                        </span>
                        <button
                          onClick={() => setEditingQuestionIndex(index)}
                          className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 hover:scale-105"
                          title="Edytuj pytanie za pomocą AI"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {question.answers.map((answer, answerIndex) => (
                        <div
                          key={answer.id}
                          className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            answer.is_correct 
                              ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-2 border-green-200 shadow-sm' 
                              : 'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {String.fromCharCode(65 + answerIndex)}
                            </span>
                            {answer.content}
                            {answer.is_correct && (
                              <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center ml-auto">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <strong className="text-blue-800">Wyjaśnienie:</strong>
                        </div>
                        <p className="text-blue-700">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setStep('input')}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Wróć do edycji
                </button>
                <button
                  onClick={handleEditQuiz}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edytuj Quiz
                </button>
                <button
                  onClick={handleAcceptQuiz}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Zaakceptuj i Zapisz
                </button>
              </div>
            </div>
          )}

          {/* Modal edycji pytania */}
          {editingQuestionIndex !== null && generatedQuiz && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Edytuj pytanie za pomocą AI</h3>
                        <p className="text-gray-600">Pytanie {editingQuestionIndex + 1} z {generatedQuiz.questions.length}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingQuestionIndex(null);
                        setQuestionEditPrompt('');
                        setError(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>

                  {/* Aktualne pytanie */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Aktualne pytanie:</h4>
                    <p className="text-gray-700 mb-3">{generatedQuiz.questions[editingQuestionIndex].content}</p>
                    <div className="text-sm text-gray-600">
                      <strong>Odpowiedzi:</strong>
                      <ul className="mt-1 space-y-1">
                        {generatedQuiz.questions[editingQuestionIndex].answers.map((answer, idx) => (
                          <li key={answer.id} className={`${answer.is_correct ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                            {String.fromCharCode(65 + idx)}. {answer.content} {answer.is_correct && '(poprawna)'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Instrukcja edycji */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Opisz jak chcesz zmienić to pytanie:
                    </label>
                    <textarea
                      value={questionEditPrompt}
                      onChange={(e) => setQuestionEditPrompt(e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 transition-all duration-300"
                      rows={4}
                      placeholder="Np.: Zmień to pytanie na bardziej praktyczne, Dodaj więcej szczegółów, Uprość język, Zmień na pytanie otwarte, Dodaj przykład z życia..."
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-2 mb-6">
                      <AlertTriangle className="w-5 h-5" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => {
                        setEditingQuestionIndex(null);
                        setQuestionEditPrompt('');
                        setError(null);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={() => editQuestionWithAI(editingQuestionIndex)}
                      disabled={!questionEditPrompt.trim() || isEditingQuestion}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isEditingQuestion ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Edytuję...
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4" />
                          Edytuj za pomocą AI
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
