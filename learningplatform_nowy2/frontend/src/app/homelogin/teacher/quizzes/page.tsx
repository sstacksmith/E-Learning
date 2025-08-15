'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QuizQuestionEditor } from '@/components/QuizQuestionEditor';
import { useAuth } from '@/context/AuthContext';
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
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
      // Pobierz wszystkie quizy utworzone przez nauczyciela
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
    // Check if user is authenticated
    if (!user?.email) {
      setError('Nie jesteś zalogowany. Zaloguj się ponownie.');
      return;
    }

    // Validate required fields
    if (!newQuiz.course_id) {
      setError('Proszę wybrać kurs dla tego quizu');
      return;
    }

    if (!newQuiz.title.trim()) {
      setError('Proszę podać tytuł quizu');
      return;
    }

    if (!newQuiz.description.trim()) {
      setError('Proszę podać opis quizu');
      return;
    }

    if (!newQuiz.subject.trim()) {
      setError('Proszę podać przedmiot quizu');
      return;
    }

    // Temporarily disable question requirement for testing
    // if (newQuiz.questions.length === 0) {
    //   setError('Proszę dodać przynajmniej jedno pytanie do quizu');
    //   return;
    // }

    // Temporarily disable question validation for testing
    // // Validate that each question has content and answers
    // for (let i = 0; i < newQuiz.questions.length; i++) {
    //   const question = newQuiz.questions[i];
    //   if (!question.content.trim()) {
    //     setError(`Pytanie ${i + 1} nie ma treści`);
    //     return;
    //   }
    //   if (question.answers.length === 0) {
    //     setError(`Pytanie ${i + 1} nie ma odpowiedzi`);
    //     return;
    //   }
    //   // Check if at least one answer is marked as correct (for non-open questions)
    //   if (question.type !== 'open' && !question.answers.some(ans => ans.isCorrect)) {
    //     setError(`Pytanie ${i + 1} nie ma oznaczonej poprawnej odpowiedzi`);
    //     return;
    //   }
    // }

    try {
      console.log('Creating new quiz:', newQuiz);
      setError(null);
      setIsSavingQuiz(true);
      
      const selectedCourse = courses.find(c => c.id === newQuiz.course_id);
      if (!selectedCourse) {
        throw new Error('Nie znaleziono wybranego kursu');
      }

      // Verify the user has access to this course
      const hasAccess = selectedCourse.created_by === user.email || 
                       selectedCourse.teacherEmail === user.email ||
                       (Array.isArray(selectedCourse.assignedUsers) && selectedCourse.assignedUsers.includes(user.email));
      
      if (!hasAccess) {
        throw new Error('Nie masz uprawnień do tworzenia quizów w tym kursie');
      }

      const quizzesCollection = collection(db, 'quizzes');
      // Clean and validate quiz data
      const cleanQuestions = newQuiz.questions.map(q => ({
        id: q.id,
        content: q.content.trim(),
        type: q.type,
        answers: q.answers.map(a => ({
          id: a.id,
          content: a.content.trim(),
          isCorrect: a.isCorrect,
          type: a.type
        }))
      }));

      const quizData = {
        title: newQuiz.title.trim(),
        description: newQuiz.description.trim(),
        subject: newQuiz.subject.trim(),
        course_id: selectedCourse.id,
        course_title: selectedCourse.title,
        questions: cleanQuestions,
        max_attempts: newQuiz.max_attempts,
        created_by: user?.email,
        created_at: serverTimestamp()
      };

      console.log('Saving quiz data:', quizData);
      console.log('Quiz data type:', typeof quizData);
      console.log('Quiz data stringified:', JSON.stringify(quizData, null, 2));
      
      try {
        console.log('Attempting to add document to Firestore...');
        console.log('Collection path:', quizzesCollection.path);
        console.log('Quiz data keys:', Object.keys(quizData));
        
        const docRef = await addDoc(quizzesCollection, quizData);
        console.log('Quiz created successfully with ID:', docRef.id);
      } catch (addDocError) {
        console.error('Error in addDoc:', addDocError);
        console.error('Error type:', typeof addDocError);
        console.error('Error constructor:', addDocError?.constructor?.name);
        console.error('Error stack:', addDocError instanceof Error ? addDocError.stack : 'No stack');
        
        if (addDocError instanceof Error) {
          throw new Error(`Błąd Firebase: ${addDocError.message}`);
        } else {
          throw new Error('Nieznany błąd podczas zapisywania do bazy danych');
        }
      }
      
      setSuccessMessage('Quiz został pomyślnie utworzony!');
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
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError('Nie udało się utworzyć quizu. Spróbuj ponownie.');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleAddQuestion = (question: Question) => {
    console.log('Adding question to quiz:', question);
    setNewQuiz((prev) => {
      const updated = {
        ...prev,
        questions: [...prev.questions, question],
      };
      console.log('Updated newQuiz state:', updated);
      return updated;
    });
  };

  const filteredCourses = courses.filter(course => 
    course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuizDeleted = () => {
    fetchQuizzes();
  };

  // Group quizzes by course
  const quizzesByCourse = useMemo(() => {
    const grouped: { [courseId: string]: Quiz[] } = {};
    
    quizzes.forEach(quiz => {
      if (quiz.course_id) {
        if (!grouped[quiz.course_id]) {
          grouped[quiz.course_id] = [];
        }
        grouped[quiz.course_id].push(quiz);
      }
    });
    
    return grouped;
  }, [quizzes]);

  // Get course title by ID
  const getCourseTitle = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || 'Nieznany kurs';
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
    return null;
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
              onClick={() => {
                setIsCreating(true);
                setError(null);
                setSuccessMessage(null);
              }}
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

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
              {successMessage}
            </div>
          )}

          {isCreating && (
            <div className="mb-8 p-6 border rounded-xl bg-gray-50">
              <h2 className="text-xl font-semibold mb-4">Nowy quiz</h2>
              <p className="text-sm text-gray-600 mb-4">
                <span className="text-red-500">*</span> - Pola wymagane
              </p>
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
                  <label className="block text-sm font-medium mb-1">
                    Tytuł <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newQuiz.title}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className={`w-full p-2 border rounded-lg ${
                      newQuiz.title.trim() === '' ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Wpisz tytuł quizu..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Opis <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newQuiz.description}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className={`w-full p-2 border rounded-lg ${
                      newQuiz.description.trim() === '' ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={3}
                    placeholder="Wpisz opis quizu..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Przedmiot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newQuiz.subject}
                    onChange={(e) =>
                      setNewQuiz((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className={`w-full p-2 border rounded-lg ${
                      newQuiz.subject.trim() === '' ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Wpisz przedmiot quizu..."
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
                  <h3 className="text-lg font-medium mb-2">
                    Pytania <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Musisz dodać przynajmniej jedno pytanie do quizu
                  </p>
                  {newQuiz.questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-lg font-medium mb-2">Brak pytań</p>
                      <p className="text-sm">Dodaj pierwsze pytanie używając edytora poniżej</p>
                    </div>
                  ) : (
                    newQuiz.questions.map((question, index) => (
                      <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
                        <p>
                          <strong>Pytanie {index + 1}:</strong> {question.content}
                        </p>
                        <p>Typ: {question.type === 'math' ? 'Matematyczne' : 'Tekstowe'}</p>
                        <p>Liczba odpowiedzi: {question.answers.length}</p>
                      </div>
                    ))
                  )}

                  <QuizQuestionEditor
                    onSave={(question) => handleAddQuestion(question)}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Create quiz button clicked');
                      console.log('Current newQuiz state:', newQuiz);
                      console.log('User:', user);
                      console.log('Courses:', courses);
                      handleCreateQuiz();
                    }}
                    disabled={isSavingQuiz}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3155d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSavingQuiz ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Zapisywanie...</span>
                      </>
                    ) : (
                      <span>Zapisz quiz</span>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Test button clicked');
                      console.log('Testing basic quiz creation...');
                      // Test with minimal data
                      const testQuiz = {
                        title: 'Test Quiz',
                        description: 'Test Description',
                        subject: 'Test Subject',
                        course_id: newQuiz.course_id,
                        questions: [],
                        max_attempts: 1
                      };
                      console.log('Test quiz data:', testQuiz);
                      setNewQuiz(testQuiz);
                    }}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Test
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      console.log('Direct test button clicked');
                      if (!newQuiz.course_id) {
                        alert('Please select a course first');
                        return;
                      }
                      
                      try {
                        console.log('Attempting direct quiz creation...');
                        const testQuizData = {
                          title: 'Direct Test Quiz',
                          description: 'Direct Test Description',
                          subject: 'Direct Test Subject',
                          course_id: newQuiz.course_id,
                          questions: [],
                          max_attempts: 1,
                          created_by: user?.email,
                          created_at: serverTimestamp()
                        };
                        
                        console.log('Test quiz data:', testQuizData);
                        const quizzesCollection = collection(db, 'quizzes');
                        const docRef = await addDoc(quizzesCollection, testQuizData);
                        console.log('Direct test successful, doc ID:', docRef.id);
                        alert('Direct test successful! Quiz created with ID: ' + docRef.id);
                      } catch (error) {
                        console.error('Direct test failed:', error);
                        alert('Direct test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                      }
                    }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Test bezpośredni
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Test with question button clicked');
                      // Test with one question
                      const testQuizWithQuestion = {
                        title: 'Test Quiz with Question',
                        description: 'Test Description with Question',
                        subject: 'Test Subject with Question',
                        course_id: newQuiz.course_id,
                        questions: [{
                          id: 'test-question-1',
                          content: 'What is 2+2?',
                          type: 'text' as const,
                          answers: [{
                            id: 'test-answer-1',
                            content: '4',
                            isCorrect: true,
                            type: 'text' as const
                          }]
                        }],
                        max_attempts: 1
                      };
                      console.log('Test quiz with question data:', testQuizWithQuestion);
                      setNewQuiz(testQuizWithQuestion);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Test z pytaniem
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      console.log('Testing Firebase connection...');
                      try {
                        const testCollection = collection(db, 'test');
                        const testDoc = await addDoc(testCollection, {
                          test: 'data',
                          timestamp: serverTimestamp()
                        });
                        console.log('Firebase connection test successful, doc ID:', testDoc.id);
                        // Clean up test document
                        // Note: We can't delete it here as we don't have deleteDoc imported
                      } catch (error) {
                        console.error('Firebase connection test failed:', error);
                      }
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Test Firebase
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    disabled={isSavingQuiz}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="space-y-6">
              {quizzes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nie utworzono jeszcze żadnych quizów.
                </div>
              ) : (
                <>
                  {/* Quizy pogrupowane według kursów */}
                  {Object.entries(quizzesByCourse).map(([courseId, courseQuizzes]) => (
                    <div key={courseId} className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-[#4067EC]">📚</span>
                        {getCourseTitle(courseId)}
                        <span className="text-sm font-normal text-gray-500">
                          ({courseQuizzes.length} quiz{courseQuizzes.length === 1 ? '' : 'ów'})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courseQuizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">{quiz.title}</h4>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {quiz.subject}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                            <div className="space-y-2 text-sm text-gray-500">
                              <div>Pytania: {quiz.questions?.length || 0}</div>
                              <div>Maksymalne próby: {quiz.max_attempts || 1}</div>
                              <div>Utworzono: {new Date(quiz.created_at).toLocaleDateString('pl-PL')}</div>
                            </div>
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => setSelectedQuiz(quiz)}
                                className="text-sm bg-[#4067EC] text-white px-3 py-1 rounded hover:bg-[#3155d4] transition"
                              >
                                Podgląd
                              </button>
                              <button
                                onClick={() => {
                                  // Można dodać edycję quizu
                                  console.log('Edit quiz:', quiz.id);
                                }}
                                className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition"
                              >
                                Edytuj
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Quizy bez przypisanego kursu */}
                  {quizzes.filter(quiz => !quiz.course_id).length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span>
                        Quizy bez przypisanego kursu
                        <span className="text-sm font-normal text-gray-500">
                          ({quizzes.filter(quiz => !quiz.course_id).length} quiz{quizzes.filter(quiz => !quiz.course_id).length === 1 ? '' : 'ów'})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quizzes.filter(quiz => !quiz.course_id).map((quiz) => (
                          <div
                            key={quiz.id}
                            className="p-4 border border-yellow-200 rounded-lg bg-yellow-50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">{quiz.title}</h4>
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                {quiz.subject}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                            <div className="text-yellow-700 text-sm mb-3">
                              ⚠️ Ten quiz nie jest przypisany do żadnego kursu
                            </div>
                            <div className="space-y-2 text-sm text-gray-500">
                              <div>Pytania: {quiz.questions?.length || 0}</div>
                              <div>Maksymalne próby: {quiz.max_attempts || 1}</div>
                              <div>Utworzono: {new Date(quiz.created_at).toLocaleDateString('pl-PL')}</div>
                            </div>
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => setSelectedQuiz(quiz)}
                                className="text-sm bg-[#4067EC] text-white px-3 py-1 rounded hover:bg-[#3155d4] transition"
                              >
                                Podgląd
                              </button>
                              <button
                                onClick={() => {
                                  // Można dodać edycję quizu
                                  console.log('Edit quiz:', quiz.id);
                                }}
                                className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition"
                              >
                                Edytuj
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
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