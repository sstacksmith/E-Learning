'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Award, TrendingUp, Users, Star, BarChart3, Clock, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { SurveyEditor } from '../../../../components/SurveyEditor';

interface SurveyResponse {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  studentId: string;
  studentEmail: string;
  responses: {
    [key: string]: number;
  };
  submittedAt: any;
  totalScore: number;
  averageScore: number;
}

interface QuestionStats {
  questionId: string;
  question: string;
  category: string;
  averageScore: number;
  totalResponses: number;
  scoreDistribution: { [key: number]: number };
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: {
    id: string;
    question: string;
    category: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
  }[];
  isActive: boolean;
  created_at: string;
  updated_at?: string;
  created_by: string;
}

const surveyQuestions = [
  {
    id: 'q1',
    question: 'Jak oceniasz jakość materiałów dydaktycznych udostępnianych przez nauczyciela?',
    category: 'Materiały'
  },
  {
    id: 'q2',
    question: 'Jak oceniasz sposób tłumaczenia i wyjaśniania zagadnień?',
    category: 'Komunikacja'
  },
  {
    id: 'q3',
    question: 'Jak oceniasz umiejętność przekazywania wiedzy w prosty i zrozumiały sposób?',
    category: 'Przekazywanie wiedzy'
  },
  {
    id: 'q4',
    question: 'Jak oceniasz zaangażowanie nauczyciela w prowadzenie zajęć online?',
    category: 'Zaangażowanie'
  },
  {
    id: 'q5',
    question: 'Jak oceniasz dostosowanie tempa zajęć do możliwości uczniów?',
    category: 'Dostosowanie'
  },
  {
    id: 'q6',
    question: 'Jak oceniasz komunikację i dostępność nauczyciela (np. odpowiadanie na pytania, pomoc poza zajęciami)?',
    category: 'Dostępność'
  },
  {
    id: 'q7',
    question: 'Jak oceniasz różnorodność metod i narzędzi wykorzystywanych podczas zajęć?',
    category: 'Metody'
  },
  {
    id: 'q8',
    question: 'Jak oceniasz umiejętność motywowania uczniów do nauki?',
    category: 'Motywacja'
  },
  {
    id: 'q9',
    question: 'Jak oceniasz przydatność wiedzy i umiejętności zdobywanych na zajęciach?',
    category: 'Przydatność'
  },
  {
    id: 'q10',
    question: 'Jak oceniasz ogólne wrażenie ze współpracy z tym nauczycielem?',
    category: 'Ogólne wrażenie'
  }
];

export default function TeacherSurveysPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalResponses: 0,
    averageScore: 0,
    totalStudents: 0
  });
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showSurveyEditor, setShowSurveyEditor] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [activeTab, setActiveTab] = useState<'responses' | 'manage'>('responses');

  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!user?.uid) return;

      try {
        console.log('Pobieranie ankiet dla nauczyciela:', user.uid);
        
        // Pobierz wszystkie ankiety dla tego nauczyciela
        const surveysQuery = query(
          collection(db, 'teacherSurveys'),
          where('teacherId', '==', user.uid)
        );
        const surveysSnapshot = await getDocs(surveysQuery);
        
        const responses: SurveyResponse[] = surveysSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SurveyResponse));

        console.log(`Znaleziono ${responses.length} ankiet dla nauczyciela`);
        setSurveyResponses(responses);

        // Pobierz szablony ankiet utworzone przez nauczyciela
        const surveyTemplatesQuery = query(
          collection(db, 'surveyTemplates'),
          where('created_by', '==', user.uid)
        );
        const surveyTemplatesSnapshot = await getDocs(surveyTemplatesQuery);
        
        const surveyTemplates: Survey[] = surveyTemplatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Survey));

        console.log(`Znaleziono ${surveyTemplates.length} szablonów ankiet`);
        setSurveys(surveyTemplates);

        // Oblicz ogólne statystyki
        const totalResponses = responses.length;
        const totalScore = responses.reduce((sum, response) => sum + response.averageScore, 0);
        const averageScore = totalResponses > 0 ? totalScore / totalResponses : 0;
        const uniqueStudents = new Set(responses.map(r => r.studentId)).size;

        setOverallStats({
          totalResponses,
          averageScore,
          totalStudents: uniqueStudents
        });

        // Oblicz statystyki dla każdego pytania
        const stats: QuestionStats[] = surveyQuestions.map(question => {
          const questionResponses = responses
            .filter(r => r.responses && r.responses[question.id] !== undefined)
            .map(r => r.responses[question.id]);

          const totalResponses = questionResponses.length;
          const averageScore = totalResponses > 0 
            ? questionResponses.reduce((sum, score) => sum + score, 0) / totalResponses 
            : 0;

          // Rozkład ocen (1-10)
          const scoreDistribution: { [key: number]: number } = {};
          for (let i = 1; i <= 10; i++) {
            scoreDistribution[i] = questionResponses.filter(score => score === i).length;
          }

          return {
            questionId: question.id,
            question: question.question,
            category: question.category,
            averageScore,
            totalResponses,
            scoreDistribution
          };
        });

        setQuestionStats(stats);
        console.log('Obliczone statystyki pytań:', stats);

      } catch (error) {
        console.error('Błąd podczas pobierania ankiet:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [user]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setShowSurveyEditor(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setShowSurveyEditor(true);
  };

  const handleSaveSurvey = async (surveyData: Omit<Survey, 'id' | 'created_at'>) => {
    try {
      if (editingSurvey) {
        // Edytuj istniejącą ankietę
        await updateDoc(doc(db, 'surveyTemplates', editingSurvey.id), {
          ...surveyData,
          updated_at: serverTimestamp()
        });
        console.log('Ankieta zaktualizowana');
      } else {
        // Utwórz nową ankietę
        await addDoc(collection(db, 'surveyTemplates'), {
          ...surveyData,
          created_by: user?.uid,
          created_at: serverTimestamp()
        });
        console.log('Nowa ankieta utworzona');
      }
      
      setShowSurveyEditor(false);
      setEditingSurvey(null);
      // Odśwież dane
      window.location.reload();
    } catch (error) {
      console.error('Błąd podczas zapisywania ankiety:', error);
      alert('Wystąpił błąd podczas zapisywania ankiety');
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę ankietę?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'surveyTemplates', surveyId));
      console.log('Ankieta usunięta');
      // Odśwież dane
      window.location.reload();
    } catch (error) {
      console.error('Błąd podczas usuwania ankiety:', error);
      alert('Wystąpił błąd podczas usuwania ankiety');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showSurveyEditor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <SurveyEditor
          survey={editingSurvey || undefined}
          onSave={handleSaveSurvey}
          onCancel={() => {
            setShowSurveyEditor(false);
            setEditingSurvey(null);
          }}
          mode={editingSurvey ? 'edit' : 'create'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.location.href = '/homelogin'}
              className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do strony głównej
            </button>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Ankiety uczniów
            </h1>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-white/20">
          <button
            onClick={() => setActiveTab('responses')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'responses'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Wyniki ankiet
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Zarządzaj ankietami
          </button>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'responses' ? (
          <>
            {/* Ogólne statystyki */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Średnia ocena</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{overallStats.averageScore.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Uczniowie</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{overallStats.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Wszystkie ankiety</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{overallStats.totalResponses}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Szczegółowe statystyki pytań */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Szczegółowe oceny pytań</h2>
              <p className="text-sm text-gray-600">Zobacz jak uczniowie oceniają poszczególne aspekty</p>
            </div>
          </div>

          {questionStats.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Brak ankiet</h3>
              <p className="text-gray-600">Uczniowie jeszcze nie wypełnili ankiet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questionStats.map((stat, index) => (
                <div key={stat.questionId} className="border border-gray-200 rounded-lg p-4 sm:p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                        Pytanie {index + 1}: {stat.category}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBackground(stat.averageScore)} ${getScoreColor(stat.averageScore)}`}>
                          {stat.averageScore.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">({stat.totalResponses} ocen)</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-4">{stat.question}</p>
                  </div>

                  {/* Pasek średniej oceny */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Średnia ocena</span>
                      <span>{stat.averageScore.toFixed(1)}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getScoreBarColor(stat.averageScore)}`}
                        style={{ width: `${(stat.averageScore / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Rozkład ocen */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">Rozkład ocen:</h4>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(score => (
                        <div key={score} className="text-center">
                          <div className="text-xs text-gray-600 mb-1">{score}</div>
                          <div className="bg-gray-100 rounded h-16 flex items-end justify-center">
                            {stat.scoreDistribution[score] > 0 && (
                              <div 
                                className="bg-blue-500 rounded-t w-full"
                                style={{ 
                                  height: `${(stat.scoreDistribution[score] / Math.max(...Object.values(stat.scoreDistribution))) * 100}%`,
                                  minHeight: '4px'
                                }}
                              ></div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {stat.scoreDistribution[score] || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rekomendacje */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Rekomendacje:</h4>
                    {stat.averageScore >= 8 ? (
                      <p className="text-xs sm:text-sm text-green-700">
                        🎉 Doskonałe wyniki! Utrzymuj obecny poziom.
                      </p>
                    ) : stat.averageScore >= 6 ? (
                      <p className="text-xs sm:text-sm text-yellow-700">
                        📈 Dobry wynik, ale jest miejsce na poprawę. Skup się na obszarach z niższymi ocenami.
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-red-700">
                        ⚠️ Wymaga uwagi. Rozważ wprowadzenie zmian w sposobie prowadzenia zajęć.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista ostatnich ankiet */}
        {surveyResponses.length > 0 && (
          <div className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-white/20 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Ostatnie ankiety</h2>
                <p className="text-sm text-gray-600">Lista ostatnio wypełnionych ankiet</p>
              </div>
            </div>

            <div className="space-y-3">
              {surveyResponses
                .sort((a, b) => new Date(b.submittedAt?.toDate?.() || b.submittedAt).getTime() - new Date(a.submittedAt?.toDate?.() || a.submittedAt).getTime())
                .slice(0, 5)
                .map((response) => (
                  <div key={response.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Star className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Ankieta od ucznia
                        </p>
                        <p className="text-xs text-gray-500">
                          {response.submittedAt?.toDate?.() ? 
                            response.submittedAt.toDate().toLocaleString('pl-PL') : 
                            new Date(response.submittedAt).toLocaleString('pl-PL')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBackground(response.averageScore)} ${getScoreColor(response.averageScore)}`}>
                        {response.averageScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
          </>
        ) : (
          /* Zakładka zarządzania ankietami */
          <div className="space-y-6">
            {/* Header z przyciskiem utworzenia */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Zarządzaj ankietami</h2>
                <p className="text-gray-600 mt-1">Twórz i edytuj szablony ankiet dla uczniów</p>
              </div>
              <button
                onClick={handleCreateSurvey}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Utwórz ankietę
              </button>
            </div>

            {/* Lista ankiet */}
            {surveys.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Brak ankiet</h3>
                <p className="text-gray-600 mb-4">Nie masz jeszcze żadnych szablonów ankiet.</p>
                <button
                  onClick={handleCreateSurvey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Utwórz pierwszą ankietę
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {surveys.map((survey) => (
                  <div key={survey.id} className="bg-white rounded-xl shadow-lg p-6 border border-white/20">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{survey.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{survey.description}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            survey.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {survey.isActive ? 'Aktywna' : 'Nieaktywna'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {survey.questions.length} pytań
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-4">
                      Utworzono: {new Date(survey.created_at).toLocaleDateString('pl-PL')}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSurvey(survey)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edytuj
                      </button>
                      <button
                        onClick={() => handleDeleteSurvey(survey.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
