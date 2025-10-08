'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestionEditor } from '@/components/QuizQuestionEditor';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import QuizPreview from '@/components/QuizPreview';
import { ArrowLeft, Eye, Save, Plus, Trash2, Settings, Edit, Eye as ViewIcon, AlertTriangle, CheckCircle, Info, BookOpen, Zap, Sparkles, Search, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { AIQuizGenerator } from '@/components/AIQuizGenerator';
import { Quiz, Question, Answer } from '@/types/models';

// Lokalne typy rozszerzające globalne
interface LocalAnswer extends Omit<Answer, 'created_at' | 'updated_at' | 'created_by'> {
  mathContent?: string;
  isCorrect: boolean; // Alias dla is_correct
}

interface LocalQuestion extends Omit<Question, 'created_at' | 'updated_at' | 'created_by' | 'answers'> {
  mathContent?: string;
  explanation?: string;
  answers: LocalAnswer[];
}

interface LocalQuiz extends Omit<Quiz, 'updated_at' | 'created_by' | 'questions'> {
  questions: LocalQuestion[];
}

// Funkcje konwersji typów
const convertAnswerToLocal = (answer: Answer): LocalAnswer => ({
  ...answer,
  isCorrect: answer.is_correct,
  mathContent: (answer as any).mathContent
});

const convertQuestionToLocal = (question: Question): LocalQuestion => ({
  ...question,
  answers: question.answers.map(convertAnswerToLocal),
  mathContent: (question as any).mathContent,
  explanation: (question as any).explanation
});

const convertQuizToLocal = (quiz: Quiz): LocalQuiz => ({
  ...quiz,
  questions: quiz.questions.map(convertQuestionToLocal)
});

// Używamy typów z @/types/models

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

// Quiz interface jest importowany z @/types/models

interface NewQuiz {
  title: string;
  description: string;
  subject: string;
  course_id: string | null;
  questions: LocalQuestion[];
  max_attempts: number;
  time_limit: number;
}

export default function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<LocalQuiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<LocalQuiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quizSearchTerm, setQuizSearchTerm] = useState('');
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
  const [selectedQuiz, setSelectedQuiz] = useState<LocalQuiz | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'created_at' | 'course_title' | 'subject' | 'questions_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
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
      setQuizzes(quizzesList.map(convertQuizToLocal));
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

    let quizData: any = null;
    
    try {
      console.log('Creating new quiz:', newQuiz);
      setError(null);
      
      const selectedCourse = courses.find(c => c.id === newQuiz.course_id);
      if (!selectedCourse) {
        throw new Error('Nie znaleziono wybranego kursu');
      }

      const quizzesCollection = collection(db, 'quizzes');
      // Konwertuj LocalQuestion[] na Question[] dla bazy danych
      const convertedQuestions = newQuiz.questions.map(q => ({
        id: q.id || '',
        content: q.content || '',
        type: q.type || 'text',
        points: q.points || 1,
        order: q.order || 0,
        mathContent: q.mathContent || '',
        explanation: q.explanation || '',
        answers: q.answers.map(a => ({
          id: a.id || '',
          content: a.content || '',
          is_correct: a.isCorrect || false,
          type: a.type || 'text',
          mathContent: a.mathContent || '',
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.email || '',
      }));

      quizData = {
        title: newQuiz.title,
        description: newQuiz.description,
        subject: newQuiz.subject,
        max_attempts: newQuiz.max_attempts,
        time_limit: newQuiz.time_limit,
        questions: convertedQuestions,
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
      console.error('Quiz data that failed:', quizData);
      setError(`Nie udało się utworzyć quizu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleAIGeneratedQuiz = (generatedQuiz: any) => {
    // Konwertuj wygenerowany quiz na format używany w aplikacji
    const convertedQuiz = {
      title: generatedQuiz.title,
      description: generatedQuiz.description,
      subject: generatedQuiz.subject,
      course_id: generatedQuiz.courseId, // Używamy courseId z wygenerowanego quizu
      questions: generatedQuiz.questions.map((q: any, qIndex: number) => ({
        id: q.id || `q${qIndex + 1}`,
        content: q.content || '',
        type: q.type || 'text',
        points: q.points || 1,
        order: q.order || qIndex,
        mathContent: q.mathContent || '',
        explanation: q.explanation || '',
        answers: q.answers.map((a: any, aIndex: number) => ({
          id: a.id || `q${qIndex + 1}_a${aIndex + 1}`,
          content: a.content || '',
          is_correct: a.is_correct !== undefined ? a.is_correct : (a.isCorrect !== undefined ? a.isCorrect : false),
          type: a.type || 'text',
          mathContent: a.mathContent || '',
          isCorrect: a.is_correct !== undefined ? a.is_correct : (a.isCorrect !== undefined ? a.isCorrect : false), // Alias dla kompatybilności
        }))
      })),
      max_attempts: newQuiz.max_attempts,
      time_limit: generatedQuiz.estimatedTime || newQuiz.time_limit,
    };

    console.log('Converted AI quiz:', convertedQuiz);
    setNewQuiz(convertedQuiz);
    setIsCreating(true);
    setShowAIGenerator(false);
  };

  const handleEditQuiz = (quiz: LocalQuiz) => {
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

    let quizData: any = null;
    
    try {
      console.log('Updating quiz:', editingQuiz.id, newQuiz);
      setError(null);
      
      const selectedCourse = courses.find(c => c.id === newQuiz.course_id);
      if (!selectedCourse) {
        throw new Error('Nie znaleziono wybranego kursu');
      }

      const quizRef = doc(db, 'quizzes', editingQuiz.id);
      
      // Konwertuj LocalQuestion[] na Question[] dla bazy danych
      const convertedQuestions = newQuiz.questions.map(q => ({
        id: q.id || '',
        content: q.content || '',
        type: q.type || 'text',
        points: q.points || 1,
        order: q.order || 0,
        mathContent: q.mathContent || '',
        explanation: q.explanation || '',
        answers: q.answers.map(a => ({
          id: a.id || '',
          content: a.content || '',
          is_correct: a.isCorrect || false,
          type: a.type || 'text',
          mathContent: a.mathContent || '',
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.email || '',
      }));

      quizData = {
        title: newQuiz.title,
        description: newQuiz.description,
        subject: newQuiz.subject,
        max_attempts: newQuiz.max_attempts,
        time_limit: newQuiz.time_limit,
        questions: convertedQuestions,
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
      console.error('Quiz data that failed:', quizData);
      console.error('Editing quiz ID:', editingQuiz.id);
      setError(`Nie udało się zaktualizować quizu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
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

  const validateQuestion = (question: Question): string | null => {
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

  const handleAddQuestion = (question: any) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, question],
    }));
  };

  const handleEditQuestion = (questionIndex: number, updatedQuestion: any) => {
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

  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title?.toLowerCase().includes(quizSearchTerm.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(quizSearchTerm.toLowerCase()) ||
    quiz.subject?.toLowerCase().includes(quizSearchTerm.toLowerCase()) ||
    quiz.course_title?.toLowerCase().includes(quizSearchTerm.toLowerCase())
  );

  // Funkcja sortowania quizów
  const sortQuizzes = (quizzes: LocalQuiz[]) => {
    return [...quizzes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = a.created_at ? (typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : a.created_at.toDate().getTime()) : 0;
          bValue = b.created_at ? (typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : b.created_at.toDate().getTime()) : 0;
          break;
        case 'course_title':
          aValue = a.course_title?.toLowerCase() || '';
          bValue = b.course_title?.toLowerCase() || '';
          break;
        case 'subject':
          aValue = a.subject?.toLowerCase() || '';
          bValue = b.subject?.toLowerCase() || '';
          break;
        case 'questions_count':
          aValue = a.questions?.length || 0;
          bValue = b.questions?.length || 0;
          break;
        default:
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedAndFilteredQuizzes = sortQuizzes(filteredQuizzes);

  const handleQuizDeleted = () => {
    fetchQuizzes();
  };

  const resetForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingQuiz(null);
    setEditingQuestionIndex(null);
    setShowExitConfirm(false);
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

  const handleBackClick = () => {
    if (isCreating || isEditing) {
      setShowExitConfirm(true);
    } else {
      router.push('/homelogin/teacher');
    }
  };

  const confirmExit = () => {
    resetForm();
    setShowExitConfirm(false);
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
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
        <div className="relative overflow-hidden mb-8 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-50"></div>
          <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackClick}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Powrót do strony głównej</span>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {isCreating ? 'Utwórz Nowy Quiz' : isEditing ? 'Edytuj Quiz' : 'Zarządzanie Quizami'}
                  </h1>
                  <p className="text-gray-600 text-lg">
                    {isCreating ? 'Stwórz nowy quiz dla swoich uczniów' : 
                     isEditing ? 'Edytuj istniejący quiz' : 
                     'Zarządzaj quizami w swoich kursach'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{quizzes.length}</div>
                  <div className="text-sm text-gray-500">Quizy</div>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {!isCreating && !isEditing && (
            <>
              <button
                onClick={() => setIsCreating(true)}
                className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5 group-hover:animate-bounce" />
                <span>Utwórz Quiz</span>
              </button>
              <button
                onClick={() => setShowAIGenerator(true)}
                className="group px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                <span>Generator AI</span>
              </button>
            </>
          )}
          {isCreating && (
            <>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateQuiz}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
              >
                <Zap className="w-5 h-5" />
                <span>Utwórz</span>
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
              >
                Anuluj
              </button>
              <button
                onClick={handleUpdateQuiz}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>Zapisz Zmiany</span>
              </button>
            </>
          )}
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Ustawienia Quizu</h2>
                <p className="text-sm text-gray-600">Podstawowe informacje o quizie</p>
              </div>
            </div>
            
            {/* Tytuł i opis quizu */}
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div className="group">
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Tytuł quizu *
                </label>
                <input
                  type="text"
                  value={newQuiz.title}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 text-lg font-medium"
                  placeholder="Wprowadź tytuł quizu..."
                  required
                />
              </div>
              <div className="group">
                <label className="block text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Opis quizu
                </label>
                <textarea
                  value={newQuiz.description}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300"
                  placeholder="Wprowadź opis quizu (opcjonalnie)..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Kurs *
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
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300"
                  />
                  {isSearchOpen && (
                    <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto border-2 border-purple-200 rounded-xl bg-white shadow-xl z-10">
                      {filteredCourses.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">
                          Nie znaleziono kursów
                        </div>
                      ) : (
                        filteredCourses.map((course) => (
                          <div
                            key={course.id}
                            className="p-4 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => {
                              setNewQuiz((prev) => ({ 
                                ...prev, 
                                course_id: course.id,
                                subject: course.title  // Automatycznie uzupełnij przedmiot
                              }));
                              setSearchTerm(course.title);
                              setIsSearchOpen(false);
                            }}
                          >
                            <div className="font-semibold text-gray-900">{course.title}</div>
                            <div className="text-sm text-gray-600">{course.subject}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="group">
                <label className="block text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Przedmiot
                </label>
                <input
                  type="text"
                  value={newQuiz.subject}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-300"
                  placeholder="Wprowadź przedmiot"
                />
              </div>
            </div>

            {/* Ustawienia quizu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="group">
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Maksymalna liczba prób *
                </label>
                <select
                  value={newQuiz.max_attempts}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, max_attempts: parseInt(e.target.value) }))
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300"
                >
                  <option value={1}>1 próba</option>
                  <option value={2}>2 próby</option>
                  <option value={3}>3 próby</option>
                  <option value={5}>5 prób</option>
                  <option value={10}>10 prób</option>
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Liczba prób, które uczeń może wykonać dla tego quizu
                </p>
              </div>
              
              <div className="group">
                <label className="block text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Limit czasu (minuty)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={newQuiz.time_limit}
                  onChange={(e) =>
                    setNewQuiz((prev) => ({ ...prev, time_limit: parseInt(e.target.value) || 30 }))
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300"
                  placeholder="30"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Maksymalny czas na rozwiązanie quizu (5-180 minut)
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Pytania ({newQuiz.questions.length})</h3>
              </div>
              
              {/* Informacja o zielonym tle */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 text-lg">Zielone tło oznacza odpowiedź uznawaną za poprawną</p>
                    <p className="text-green-700 text-sm mt-1">Pamiętaj: minimum 2 odpowiedzi i 1 poprawna odpowiedź</p>
                  </div>
                </div>
              </div>

              {newQuiz.questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nie ma jeszcze żadnych pytań</p>
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
                  isEditing={editingQuestionIndex !== null}
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
                {sortedAndFilteredQuizzes.length} quiz{sortedAndFilteredQuizzes.length !== 1 ? 'y' : ''}
              </div>
            </div>

            {/* Wyszukiwarka quizów */}
            <div className="relative mb-6 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Wyszukaj quiz po tytule, opisie, przedmiocie lub kursie..."
                value={quizSearchTerm}
                onChange={(e) => setQuizSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 bg-white hover:border-gray-300"
              />
            </div>

            {/* Kontrolki sortowania */}
            <div className="flex flex-wrap items-center gap-4 mb-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Sortuj według:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="created_at">Data utworzenia</option>
                <option value="title">Tytuł</option>
                <option value="course_title">Kurs</option>
                <option value="subject">Przedmiot</option>
                <option value="questions_count">Liczba pytań</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                title={`Sortuj ${sortOrder === 'asc' ? 'malejąco' : 'rosnąco'}`}
              >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    <span>Rosnąco</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4" />
                    <span>Malejąco</span>
                  </>
                )}
              </button>
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
            ) : sortedAndFilteredQuizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex-1 flex flex-col items-center justify-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Nie znaleziono quizów</p>
                <p className="mb-4">
                  {quizSearchTerm ? 
                    `Brak wyników dla "${quizSearchTerm}"` : 
                    'Nie masz jeszcze żadnych quizów'
                  }
                </p>
                {!quizSearchTerm && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Utwórz Pierwszy Quiz
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto w-full">
                {sortedAndFilteredQuizzes.map((quiz) => (
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
                          onClick={() => setSelectedQuiz(quiz as any)}
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

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Czy na pewno chcesz wyjść?</h3>
                <p className="text-gray-600">Dane zostaną utracone</p>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-orange-800 font-medium">
                ⚠️ Zapisz swoją pracę przed wyjściem!
              </p>
              <p className="text-orange-700 text-sm mt-1">
                Wszystkie niezapisane zmiany zostaną utracone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelExit}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
              >
                Tak, wyjdź
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Quiz Generator Modal */}
      {showAIGenerator && (
        <AIQuizGenerator
          onQuizGenerated={handleAIGeneratedQuiz}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
} 