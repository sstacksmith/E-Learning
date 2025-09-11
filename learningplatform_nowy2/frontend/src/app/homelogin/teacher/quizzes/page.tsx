'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestionEditor } from '@/components/QuizQuestionEditor';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import QuizPreview from '@/components/QuizPreview';
import { ArrowLeft, Eye, Save, Plus, Trash2, Settings, Edit, Eye as ViewIcon } from 'lucide-react';
import { ErrorDisplay } from '@/components/ErrorDisplay';

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
  points?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  subject?: string;
  teacherEmail?: string;
  created_by?: string;
  assignedUsers?: string[];
  is_active?: boolean;
  year_of_study?: number;
  created_at?: string;
  updated_at?: string;
  is_public?: boolean;
  instructor_name?: string;
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
  time_limit?: number;
}

interface NewQuiz {
  title: string;
  description: string;
  subject: string;
  course_id: string | null;
  questions: Question[];
  max_attempts: number;
  time_limit: number;
}

export default function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newQuiz, setNewQuiz] = useState<NewQuiz>({
    title: '',
    description: '',
    subject: '',
    course_id: null,
    questions: [],
    max_attempts: 1,
    time_limit: 30,
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      console.log('No user, redirecting to login');
      router.push('/login');
      return;
    }

    if (!loading && user) {
      console.log('User authenticated, fetching data');
      fetchQuizzes();
      fetchCourses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching quizzes from Firestore...');
      
      const quizzesCollection = collection(db, 'quizzes');
      const quizzesQuery = query(
        quizzesCollection,
        where('created_by', '==', user?.email)
      );
      
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzesList = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Quiz[];
      
      console.log('Fetched quizzes:', quizzesList);
      setQuizzes(quizzesList);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError('Failed to load quizzes. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchCourses = useCallback(async () => {
    try {
      console.log('Fetching courses from Firestore...');
      console.log('Current user email:', user?.email);
      
      const coursesCollection = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesCollection);
      
      const coursesList = coursesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('Course data:', {
            id: doc.id,
            title: data.title,
            teacherEmail: data.teacherEmail,
            created_by: data.created_by
          });
          return {
            id: doc.id,
            ...data
          } as Course;
        })
        .filter(course => {
          const isTeacher = 
            course.created_by === user?.email ||
            course.teacherEmail === user?.email ||
            (Array.isArray(course.assignedUsers) && course.assignedUsers.includes(user?.email || ''));

          console.log(`Course ${course.title}:`, {
            created_by: course.created_by,
            teacherEmail: course.teacherEmail,
            assignedUsers: course.assignedUsers,
            isTeacher
          });

          return isTeacher;
        }) as Course[];
      
      console.log('Filtered courses:', coursesList);
      setCourses(coursesList);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses. Please try again later.');
    }
  }, [user]);

  const handleCreateQuiz = async () => {
    if (!newQuiz.title.trim()) {
      setError('Proszę wprowadzić tytuł quizu');
      return;
    }
    
    if (!newQuiz.course_id) {
      setError('Proszę wybrać kurs dla tego quizu');
      return;
    }

    try {
      console.log('Creating new quiz:', newQuiz);
      setError(null);
      
      const selectedCourse = courses.find(c => c.id === newQuiz.course_id);
      if (!selectedCourse) {
        throw new Error('Nie znaleziono wybranego kursu');
      }

      const quizzesCollection = collection(db, 'quizzes');
      const quizData = {
        ...newQuiz,
        created_by: user?.email,
        created_at: serverTimestamp(),
        course_title: selectedCourse.title,
        course_id: selectedCourse.id
      };

      console.log('Saving quiz data:', quizData);
      await addDoc(quizzesCollection, quizData);
      console.log('Quiz created successfully');
      
      setIsCreating(false);
      setNewQuiz({
        title: '',
        description: '',
        subject: '',
        course_id: null,
        questions: [],
        max_attempts: 1,
        time_limit: 30,
      });
      fetchQuizzes();
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError('Nie udało się utworzyć quizu. Spróbuj ponownie.');
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setNewQuiz({
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      course_id: quiz.course_id,
      questions: quiz.questions,
      max_attempts: quiz.max_attempts,
      time_limit: quiz.time_limit || 30,
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleUpdateQuiz = async () => {
    if (!newQuiz.title.trim()) {
      setError('Proszę wprowadzić tytuł quizu');
      return;
    }
    
    if (!editingQuiz || !newQuiz.course_id) {
      setError('Proszę wybrać kurs dla tego quizu');
      return;
    }

    try {
      console.log('Updating quiz:', editingQuiz.id, newQuiz);
      setError(null);
      
      const selectedCourse = courses.find(c => c.id === newQuiz.course_id);
      if (!selectedCourse) {
        throw new Error('Nie znaleziono wybranego kursu');
      }

      const quizRef = doc(db, 'quizzes', editingQuiz.id);
      const quizData = {
        ...newQuiz,
        updated_at: serverTimestamp(),
        course_title: selectedCourse.title,
        course_id: selectedCourse.id
      };

      console.log('Updating quiz data:', quizData);
      await updateDoc(quizRef, quizData);
      console.log('Quiz updated successfully');
      
      setIsEditing(false);
      setEditingQuiz(null);
      setNewQuiz({
        title: '',
        description: '',
        subject: '',
        course_id: null,
        questions: [],
        max_attempts: 1,
        time_limit: 30,
      });
      fetchQuizzes();
    } catch (error) {
      console.error('Error updating quiz:', error);
      setError('Nie udało się zaktualizować quizu. Spróbuj ponownie.');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten quiz? Tej operacji nie można cofnąć.')) {
      return;
    }

    try {
      console.log('Deleting quiz:', quizId);
      setError(null);
      
      await deleteDoc(doc(db, 'quizzes', quizId));
      console.log('Quiz deleted successfully');
      
      fetchQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError('Nie udało się usunąć quizu. Spróbuj ponownie.');
    }
  };

  const handleAddQuestion = (question: Question) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, question],
    }));
  };

  const handleEditQuestion = (questionIndex: number, updatedQuestion: Question) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, index) => 
        index === questionIndex ? updatedQuestion : q
      ),
    }));
  };

  const handleRemoveQuestion = (questionIndex: number) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== questionIndex),
    }));
  };

  const filteredCourses = courses.filter(course => 
    course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuizDeleted = () => {
    fetchQuizzes();
  };

  const resetForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingQuiz(null);
    setEditingQuestionIndex(null);
    setNewQuiz({
      title: '',
      description: '',
      subject: '',
      course_id: null,
      questions: [],
      max_attempts: 1,
      time_limit: 30,
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Ładowanie...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="w-full h-full p-6 flex flex-col">
        {/* Main Page Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Powrót</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isCreating ? 'Utwórz Nowy Quiz' : isEditing ? 'Edytuj Quiz' : 'Zarządzanie Quizami'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isCreating ? 'Stwórz nowy quiz dla swoich uczniów' : 
                 isEditing ? 'Edytuj istniejący quiz' : 
                 'Zarządzaj quizami w swoich kursach'}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isCreating && !isEditing && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Utwórz Quiz</span>
              </button>
            )}
            {isCreating && (
              <>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCreateQuiz}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Utwórz</span>
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleUpdateQuiz}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Zapisz Zmiany</span>
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <ErrorDisplay 
            error={error}
            variant="card"
            showHomeButton={false}
            showBackButton={false}
            className="mb-6 flex-shrink-0"
          />
        )}

        {/* Quiz Form */}
        {(isCreating || isEditing) && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 flex-shrink-0">
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Ustawienia Quizu</h2>
            </div>
            
            {/* Tytuł i opis quizu */}
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tytuł quizu *
                </label>
                <input
                  type="text"
                  value={newQuiz.title}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Wprowadź tytuł quizu..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opis quizu
                </label>
                <textarea
                  value={newQuiz.description}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Wprowadź opis quizu (opcjonalnie)..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kurs
                </label>
                <div className="relative" ref={searchRef}>
                  <input
                    type="text"
                    placeholder="Szukaj kursu..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {isSearchOpen && (
                    <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto border rounded-lg bg-white shadow-lg z-10">
                      {filteredCourses.length === 0 ? (
                        <div className="p-3 text-gray-500 text-center">
                          Nie znaleziono kursów
                        </div>
                      ) : (
                        filteredCourses.map((course) => (
                          <div
                            key={course.id}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              setNewQuiz((prev) => ({ ...prev, course_id: course.id }));
                              setSearchTerm(course.title);
                              setIsSearchOpen(false);
                            }}
                          >
                            <div className="font-medium text-gray-900">{course.title}</div>
                            <div className="text-sm text-gray-600">{course.subject}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Przedmiot
                </label>
                <input
                  type="text"
                  value={newQuiz.subject}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Wprowadź przedmiot"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Pytania ({newQuiz.questions.length})</h3>
              {newQuiz.questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nie ma jeszcze żadnych pytań</p>
                  <p className="text-sm mt-2">Użyj edytora pytań poniżej, aby dodać pierwsze pytanie</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newQuiz.questions.map((question, index) => (
                    <div key={`question-${index}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Pytanie {index + 1}</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              console.log('Edytuj pytanie kliknięte, index:', index);
                              console.log('Pytanie do edycji:', newQuiz.questions[index]);
                              // Set the question to edit mode
                              setEditingQuestionIndex(index);
                              console.log('editingQuestionIndex ustawiony na:', index);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edytuj pytanie"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(index)}
                            className="text-red-500 hover:text-red-700"
                            title="Usuń pytanie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{question.content}</p>
                      <div className="text-sm text-gray-500">
                        Typ: {question.type === 'open' ? 'Pytanie otwarte' : 'Wielokrotny wybór'} | 
                        Punkty: {question.points || 1} | 
                        Odpowiedzi: {question.answers.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4">
                {(() => {
                  console.log('Rendering QuizQuestionEditor, editingQuestionIndex:', editingQuestionIndex);
                  console.log('Initial question:', editingQuestionIndex !== null ? newQuiz.questions[editingQuestionIndex] : undefined);
                  return null;
                })()}
                <QuizQuestionEditor
                  initialQuestion={editingQuestionIndex !== null ? newQuiz.questions[editingQuestionIndex] : undefined}
                  onSave={(question) => {
                    console.log('QuizQuestionEditor onSave called with:', question);
                    if (editingQuestionIndex !== null) {
                      console.log('Editing question at index:', editingQuestionIndex);
                      handleEditQuestion(editingQuestionIndex, question);
                      setEditingQuestionIndex(null);
                    } else {
                      console.log('Adding new question');
                      handleAddQuestion(question);
                    }
                  }}
                />
                {editingQuestionIndex !== null && (
                  <div className="mt-2 text-center">
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-2">
                      <p className="text-blue-800 font-medium">
                        ✏️ Edytujesz pytanie {editingQuestionIndex + 1}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingQuestionIndex(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Anuluj edycję
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quizzes List */}
        {!isCreating && !isEditing && (
          <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col w-full">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Twoje Quizy</h2>
              <div className="text-sm text-gray-500">
                {quizzes.length} quiz{quizzes.length !== 1 ? 'y' : ''}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-8 flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent"></div>
                <div className="ml-3 text-gray-600">Ładowanie quizów...</div>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex-1 flex flex-col items-center justify-center">
                <p className="text-lg font-medium mb-2">Nie masz jeszcze żadnych quizów</p>
                <p className="mb-4">Utwórz swój pierwszy quiz, aby rozpocząć</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Utwórz Pierwszy Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto w-full">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                        <p className="text-gray-600 mb-3">{quiz.description || 'Brak opisu'}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                          <div>
                            <span className="font-medium">Kurs:</span> {quiz.course_title}
                          </div>
                          <div>
                            <span className="font-medium">Przedmiot:</span> {quiz.subject}
                          </div>
                          <div>
                            <span className="font-medium">Pytania:</span> {quiz.questions?.length || 0}
                          </div>
                          <div>
                            <span className="font-medium">Próby:</span> {quiz.max_attempts}
                          </div>
                        </div>
                        {quiz.time_limit && (
                          <div className="text-sm text-gray-500 mt-2">
                            <span className="font-medium">Limit czasu:</span> {quiz.time_limit} min
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedQuiz(quiz)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Podgląd"
                        >
                          <ViewIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuiz(quiz)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edytuj"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quiz Preview Modal */}
      {selectedQuiz && (
        <QuizPreview
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          onDelete={handleQuizDeleted}
        />
      )}
    </div>
  );
} 