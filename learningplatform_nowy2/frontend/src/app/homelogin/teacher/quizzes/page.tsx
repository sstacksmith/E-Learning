'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestionEditor } from '@/components/QuizQuestionEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import QuizPreview from '@/components/QuizPreview';

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
  // Dodatkowe pola z Firebase
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
}

interface NewQuiz {
  title: string;
  description: string;
  subject: string;
  course_id: string | null;
  questions: Question[];
  max_attempts: number;
}

export default function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newQuiz, setNewQuiz] = useState<NewQuiz>({
    title: '',
    description: '',
    subject: '',
    course_id: null,
    questions: [],
    max_attempts: 1,
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  
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
          // Nauczyciel może widzieć kurs jeśli:
          // 1. Jest twórcą (created_by)
          // 2. Jest przypisany jako teacherEmail
          // 3. Jest w assignedUsers
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
    if (!newQuiz.course_id) {
      setError('Proszę wybrać kurs dla tego quizu');
      return;
    }

    try {
      console.log('Creating new quiz:', newQuiz);
      setError(null);
      
      // Get course details
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
        course_id: selectedCourse.id // Upewnij się, że course_id jest zapisane
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
      });
      fetchQuizzes();
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError('Nie udało się utworzyć quizu. Spróbuj ponownie.');
    }
  };

  const handleAddQuestion = (question: Question) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, question],
    }));
  };

  const filteredCourses = courses.filter(course => 
    course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuizDeleted = () => {
    // Odśwież listę quizów po usunięciu
    fetchQuizzes();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#4067EC]">Quizy</h1>
              <p className="text-gray-600">Zarządzaj quizami w swoich kursach</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition-colors"
            >
              Utwórz quiz
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
              {error}
            </div>
          )}

          {isCreating && (
            <div className="mb-8 p-6 border rounded-xl bg-gray-50">
              <h2 className="text-xl font-semibold mb-4">Nowy quiz</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Kurs {newQuiz.course_id && <span className="text-green-600">✓</span>}
                  </label>
                  <div className="mb-4 relative" ref={searchRef}>
                    <input
                      type="text"
                      placeholder="Szukaj kursu..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      className="w-full p-2 border rounded-lg"
                    />
                    {isSearchOpen && (
                      <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto border rounded-lg bg-white shadow-lg z-10">
                        {courses.length === 0 ? (
                          <div className="p-3 text-gray-500 text-center">
                            Nie znaleziono żadnych kursów
                          </div>
                        ) : filteredCourses.length === 0 ? (
                          <div className="p-3 text-gray-500 text-center">
                            Nie znaleziono kursów dla &quot;{searchTerm}&quot;
                          </div>
                        ) : (
                          filteredCourses.map((course) => (
                            <div
                              key={course.id}
                              className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                                newQuiz.course_id === course.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                              }`}
                              onClick={() => {
                                console.log('Selecting course:', course);
                                setNewQuiz(prev => ({
                                  ...prev,
                                  course_id: course.id,
                                  subject: course.subject || ''
                                }));
                                setSearchTerm(course.title);
                                setIsSearchOpen(false);
                              }}
                            >
                              <div className="font-medium flex items-center justify-between">
                                {course.title}
                                {newQuiz.course_id === course.id && (
                                  <span className="text-blue-500">✓</span>
                                )}
                              </div>
                              {course.description && (
                                <div className="text-sm text-gray-500 truncate mt-1">
                                  {course.description}
                                </div>
                              )}
                              {course.subject && (
                                <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded mt-1">
                                  {course.subject}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {newQuiz.course_id && (
                      <div className="mt-2 text-sm text-gray-500">
                        Wybrany kurs: {courses.find(c => c.id === newQuiz.course_id)?.title}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tytuł</label>
                  <input
                    type="text"
                    value={newQuiz.title}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Opis</label>
                  <textarea
                    value={newQuiz.description}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Przedmiot</label>
                  <input
                    type="text"
                    value={newQuiz.subject}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Maksymalna liczba prób</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuiz.max_attempts}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, max_attempts: Math.max(1, parseInt(e.target.value) || 1) }))
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                  <p className="text-sm text-gray-500 mt-1">Minimalna wartość: 1</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Pytania</h3>
                  {newQuiz.questions.map((question, index) => (
                    <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
                      <p>
                        <strong>Pytanie {index + 1}:</strong> {question.content}
                      </p>
                      <p>Typ: {question.type === 'math' ? 'Matematyczne' : 'Tekstowe'}</p>
                      <p>Liczba odpowiedzi: {question.answers.length}</p>
                    </div>
                  ))}

                  <QuizQuestionEditor
                    onSave={(question) => handleAddQuestion(question)}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={handleCreateQuiz}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3155d4] transition-colors"
                  >
                    Zapisz quiz
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4067EC] border-r-transparent"></div>
              <div className="ml-3 text-gray-600">Ładowanie quizów...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Nie znaleziono żadnych quizów. Utwórz swój pierwszy quiz!
                </div>
              ) : (
                quizzes.map((quiz) => (
                  <div key={quiz.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                    <p className="text-gray-600 mb-4">{quiz.description}</p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>Kurs: {quiz.course_title}</p>
                      <p>Przedmiot: {quiz.subject}</p>
                      <p>Liczba pytań: {quiz.questions?.length || 0}</p>
                      <p>Maksymalna liczba prób: {quiz.max_attempts || 1}</p>
                      <p>Utworzono: {new Date(quiz.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setSelectedQuiz(quiz)}
                        className="text-[#4067EC] hover:text-[#3155d4] font-medium text-sm flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Podgląd
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
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