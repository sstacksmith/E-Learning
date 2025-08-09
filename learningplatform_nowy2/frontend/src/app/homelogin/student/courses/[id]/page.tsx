"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/config/firebase";
import Image from "next/image";
import Providers from '@/components/Providers';
import useApi from '@/hooks/useApi';
import { QuizDisplay } from '@/components/QuizDisplay';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: {
    id: string;
    content: string;
    type: 'text' | 'math' | 'mixed' | 'open';
    answers: {
      id: string;
      content: string;
      type: 'text' | 'math' | 'mixed';
      isCorrect: boolean;
    }[];
  }[];
}

interface Section {
  id: number;
  name: string;
  type: 'materiał' | 'zadanie';
  deadline?: string;
  contents?: {
    id: string;
    name?: string;
    fileUrl?: string;
    link?: string;
    text?: string;
  }[];
  submissions?: {
    userId: string;
    userName: string;
    fileUrl: string;
    text: string;
    submittedAt: string;
    fileName: string;
  }[];
}

interface Course {
  id: number;
  title: string;
  description: string;
  bannerUrl?: string;
  sections: Section[];
  quizzes: Quiz[];
}

function StudentCourseDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const courseId = params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSection, setShowSection] = useState<{[id:number]: boolean}>({});
  const [submittingAssignment, setSubmittingAssignment] = useState<{[id:number]: boolean}>({});
  const [assignmentFile, setAssignmentFile] = useState<{[id:number]: File | null}>({});
  const [assignmentText, setAssignmentText] = useState<{[id:number]: string}>({});
  const api = useApi();

  // Funkcja do obliczania pozostałego czasu
  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { expired: true, text: 'Termin minął' };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { 
      expired: false, 
      text: `Pozostało: ${days}d ${hours}h ${minutes}m` 
    };
  };

  // Funkcja do przesyłania zadania
  const handleSubmitAssignment = async (sectionId: number) => {
    if (!user || !courseId) return;
    
    const file = assignmentFile[sectionId];
    const text = assignmentText[sectionId];
    
    if (!file && !text) {
      alert('Dodaj plik lub tekst przed przesłaniem zadania');
      return;
    }
    
    setSubmittingAssignment(prev => ({ ...prev, [sectionId]: true }));
    
    try {
      console.log('Rozpoczynam przesyłanie zadania...');
      console.log('User:', user.uid);
      console.log('Course ID:', courseId);
      console.log('Section ID:', sectionId);
      console.log('File:', file);
      console.log('Text:', text);
      
      let fileUrl = '';
      
      // Upload file if exists
      if (file) {
        console.log('Rozpoczynam upload pliku...');
        const storage = getStorage();
        const storageRef = ref(storage, `assignments/${courseId}/${sectionId}/${user.uid}/${Date.now()}_${file.name}`);
        console.log('Storage reference:', storageRef.fullPath);
        
        await uploadBytes(storageRef, file);
        console.log('Plik został uploadowany');
        
        fileUrl = await getDownloadURL(storageRef);
        console.log('URL pliku:', fileUrl);
      }
      
      // Create submission object
      const submission = {
        userId: user.uid,
        userName: (user as { displayName?: string }).displayName || user.email || '',
        fileUrl,
        text: text || '',
        submittedAt: new Date().toISOString(),
        fileName: file?.name || ''
      };
      
      console.log('Submission object:', submission);
      
      // Update course document with submission
      const courseRef = doc(db, "courses", String(courseId));
      const courseDoc = await getDoc(courseRef);
      
      if (courseDoc.exists()) {
        const courseData = courseDoc.data();
        const sections = courseData.sections || [];
        
        // Find and update the specific section
        const updatedSections = sections.map((section: Section) => {
          if (section.id === sectionId) {
            const submissions = section.submissions || [];
            // Check if user already submitted
            const existingSubmissionIndex = submissions.findIndex(s => s.userId === user.uid);
            
            if (existingSubmissionIndex >= 0) {
              // Update existing submission
              submissions[existingSubmissionIndex] = submission;
            } else {
              // Add new submission
              submissions.push(submission);
            }
            
            return { ...section, submissions };
          }
          return section;
        });
        
        console.log('Updating Firestore...');
        await updateDoc(courseRef, { sections: updatedSections });
        console.log('Firestore zaktualizowany');
        
        // Clear form
        setAssignmentFile(prev => ({ ...prev, [sectionId]: null }));
        setAssignmentText(prev => ({ ...prev, [sectionId]: '' }));
        
        // Refresh course data
        const updatedCourseDoc = await getDoc(courseRef);
        if (updatedCourseDoc.exists()) {
          setCourse(updatedCourseDoc.data() as Course);
        }
        
        alert('Zadanie zostało przesłane pomyślnie!');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error submitting assignment:', error);
        alert(`Błąd podczas przesyłania zadania: ${error.message}`);
      } else {
        console.error('Error submitting assignment:', error);
        alert('Błąd podczas przesyłania zadania');
      }
    } finally {
      setSubmittingAssignment(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  // Check if user has already submitted
  const hasSubmitted = (section: Section) => {
    if (!user || !section.submissions) return false;
    return section.submissions.some(s => s.userId === user.uid);
  };

  // Get user's submission
  const getUserSubmission = (section: Section) => {
    if (!user || !section.submissions) return null;
    return section.submissions.find(s => s.userId === user.uid);
  };

  useEffect(() => {
    if (!courseId) return;
    const fetchCourse = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<{ data: Course }>(`/api/courses/${courseId}/`);
        setCourse(response.data);

        // Fetch quizzes for this course
        const quizzesResponse = await api.get<{ data: Quiz[] }>(`/api/quizzes/?course_id=${courseId}`);
        const courseData = response.data;
        courseData.quizzes = quizzesResponse.data;
        setCourse(courseData);
      } catch (error) {
        console.error('Error fetching course:', error);
        setError('Failed to load course data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, api]);

  if (authLoading || isLoading) return <div className="p-8">Ładowanie...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!course) return <div className="p-8">Nie znaleziono kursu.</div>;

  const sections = course.sections || [];

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-8 px-[15px]">
      {/* Banner */}
      <div className="w-full max-w-5xl mx-auto mb-8 relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-[#4067EC] to-[#7aa2f7] flex items-center justify-between h-48 sm:h-56">
        <div className="p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg mb-2">{course.title || 'Tytuł kursu'}</h1>
          <p className="text-white text-lg font-medium drop-shadow">{course.description || ''}</p>
        </div>
        <div className="hidden sm:block h-full">
          {course.bannerUrl ? (
            <Image src={course.bannerUrl} alt="Baner kursu" width={180} height={180} className="object-contain h-full w-auto opacity-80" />
          ) : (
            <Image src="/puzzleicon.png" alt="Baner kursu" width={180} height={180} className="object-contain h-full w-auto opacity-60" />
          )}
        </div>
      </div>
      {/* Dynamic Sections as Accordions */}
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
        {sections.length === 0 && <div className="text-gray-400 italic">Brak sekcji w tym kursie.</div>}
        {sections.map((section: Section) => (
          <div key={section.id} className="bg-white rounded-2xl shadow-lg">
            <button onClick={() => setShowSection(s => ({...s, [section.id]: !s[section.id]}))} className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] focus:outline-none">
              <div className="flex-1 text-left">
                <div>{section.name} <span className="text-base font-normal">({section.type})</span></div>
                {section.type === 'zadanie' && section.deadline && (
                  <div className="text-sm font-normal text-gray-600 mt-1">
                    Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getTimeRemaining(section.deadline).expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {getTimeRemaining(section.deadline).text}
                    </span>
                  </div>
                )}
              </div>
              {showSection[section.id] ? '▲' : '▼'}
            </button>
            {showSection[section.id] && (
              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Section contents */}
                {section.contents && section.contents.length > 0 ? (
                  section.contents.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.fileUrl && <span className="text-2xl text-[#4067EC]">📄</span>}
                        {item.link && <span className="text-2xl text-[#4067EC]">🔗</span>}
                        {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                        <span className="font-semibold">{item.name || item.fileUrl || item.link || 'Materiał'}</span>
                        {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Pobierz</a>}
                        {item.link && <a href={item.link} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Otwórz link</a>}
                      </div>
                      {item.text && (
                        <div className="mt-2 p-3 bg-white rounded border-l-4 border-[#4067EC]">
                          <div className="text-sm text-gray-600 mb-1">Treść:</div>
                          <div 
                            className="whitespace-pre-wrap text-gray-800 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: item.text
                                .replace(/\n/g, '<br>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic">Brak materiałów w tej sekcji.</div>
                )}

                {/* Assignment submission form for zadanie sections */}
                {section.type === 'zadanie' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">Prześlij zadanie</h4>
                    
                    {hasSubmitted(section) ? (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="text-green-800 font-medium">✅ Zadanie zostało przesłane</div>
                        {(() => {
                          const submission = getUserSubmission(section);
                          return (
                            <div className="text-sm text-green-700 mt-1">
                              Przesłano: {new Date(submission?.submittedAt || '').toLocaleString('pl-PL')}
                              {submission?.fileName && <div>Plik: {submission.fileName}</div>}
                              {submission?.text && <div>Tekst: {submission.text.substring(0, 100)}...</div>}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Plik (opcjonalny):</label>
                          <input 
                            type="file" 
                            onChange={(e) => setAssignmentFile(prev => ({ ...prev, [section.id]: e.target.files ? e.target.files[0] : null }))}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tekst odpowiedzi (opcjonalny):</label>
                          <textarea 
                            value={assignmentText[section.id] || ''}
                            onChange={(e) => setAssignmentText(prev => ({ ...prev, [section.id]: e.target.value }))}
                            placeholder="Wpisz swoją odpowiedź..."
                            className="w-full border rounded px-3 py-2 min-h-[100px] resize-y"
                          />
                        </div>
                        <button 
                          onClick={() => handleSubmitAssignment(section.id)}
                          disabled={submittingAssignment[section.id] || getTimeRemaining(section.deadline || '').expired}
                          className={`px-4 py-2 rounded font-semibold ${
                            getTimeRemaining(section.deadline || '').expired 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {submittingAssignment[section.id] ? 'Przesyłanie...' : 'Prześlij zadanie'}
                        </button>
                        {getTimeRemaining(section.deadline || '').expired && (
                          <div className="text-red-600 text-sm">Termin oddania minął</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Quizzes section */}
        <div className="col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Quizzes</h2>
          {selectedQuiz ? (
            <div>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Back to Quiz List
              </button>
              <QuizDisplay quizId={selectedQuiz.id} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.quizzes && course.quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 mb-2">{quiz.description}</p>
                  <p className="text-sm text-gray-500">
                    Questions: {quiz.questions.length}
                  </p>
                </div>
              ))}
              {(!course.quizzes || course.quizzes.length === 0) && (
                <p className="col-span-full text-gray-500 text-center">
                  No quizzes available for this course yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentCourseDetail() {
  return (
    <Providers>
      <StudentCourseDetailContent />
    </Providers>
  );
} 