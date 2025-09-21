"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import Providers from '@/components/Providers';
import { FaChevronDown, FaChevronUp, FaFilePdf, FaFileAlt, FaLink, FaImage, FaClipboardList, FaGraduationCap, FaUsers, FaQuestionCircle, FaInfoCircle, FaFolder, FaFolderOpen, FaFileCode, FaExternalLinkAlt, FaFile, FaYoutube, FaUpload, FaPaperPlane } from "react-icons/fa";
import VideoPlayer from '@/components/VideoPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import { MathEditor } from '@/components/MathEditor';
import MathView from '@/components/MathView';

// Function to render appropriate icon for content type
function renderContentIcon(item: any, isExpanded?: boolean) {
  if (item.type === 'subsection') {
    return isExpanded ? <FaFolderOpen className="text-xl text-blue-600" /> : <FaFolder className="text-xl text-blue-600" />;
  }
  if (item.type === 'video') {
    return <span className="text-xl">🎥</span>;
  }
  if (item.type === 'file') {
    return <FaFilePdf className="text-xl text-red-600" />;
  }
  if (item.type === 'task' || item.type === 'assignment') {
    return <span className="text-xl">📝</span>;
  }
  if (item.type === 'exam') {
    return <span className="text-xl">🎓</span>;
  }
  if (item.type === 'activity') {
    return <span className="text-xl">🎯</span>;
  }
  if (item.type === 'quiz') {
    return <span className="text-xl">❓</span>;
  }
  if (item.fileUrl || item.file) {
    return <FaFilePdf className="text-xl text-red-600" />;
  }
  if (item.link) {
    return <FaExternalLinkAlt className="text-xl text-green-600" />;
  }
  if (item.text) {
    return <FaFileCode className="text-xl text-purple-600" />;
  }
  return <FaFile className="text-xl text-gray-600" />;
}

function StudentCourseDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const courseId = params?.id;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSection, setShowSection] = useState<{[id:number]: boolean}>({});
  const [showSubsection, setShowSubsection] = useState<{[sectionId:number]: {[contentId:number]: boolean}}>({});
  
  // State for task responses
  const [showTaskResponse, setShowTaskResponse] = useState<{[materialId: string]: boolean}>({});
  const [taskResponse, setTaskResponse] = useState<{
    text: string;
    mathContent: string;
    file: File | null;
    fileName: string;
  }>({
    text: '',
    mathContent: '',
    file: null,
    fileName: ''
  });
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Functions for task responses
  const handleShowTaskResponse = (materialId: string) => {
    setShowTaskResponse(prev => ({
      ...prev,
      [materialId]: !prev[materialId]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setTaskResponse(prev => ({
      ...prev,
      file,
      fileName: file ? file.name : ''
    }));
  };

  const handleSubmitTaskResponse = async (materialId: string) => {
    if (!user || !course) return;
    
    setSubmittingResponse(true);
    try {
      // Here you would save the response to Firebase
      // For now, just show success message
      console.log('Submitting task response:', {
        materialId,
        userId: user.uid,
        response: taskResponse
      });
      
      // Reset form
      setTaskResponse({
        text: '',
        mathContent: '',
        file: null,
        fileName: ''
      });
      setShowTaskResponse(prev => ({
        ...prev,
        [materialId]: false
      }));
      
      alert('Odpowiedź została wysłana!');
    } catch (error) {
      console.error('Error submitting task response:', error);
      alert('Wystąpił błąd podczas wysyłania odpowiedzi.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
        if (!courseDoc.exists()) {
          setError("Nie znaleziono kursu.");
          setLoading(false);
          return;
        }
        const courseData = courseDoc.data();
        console.log('Course data loaded for student:', courseData);
        console.log('Sections:', courseData.sections);
        console.log('Assigned users:', courseData.assignedUsers);
        console.log('Current user:', user?.email);
        console.log('Current user UID:', user?.uid);
        
        // Sprawdź czy uczeń ma dostęp do kursu
        const assignedUsers = courseData.assignedUsers || [];
        console.log('Assigned users array:', assignedUsers);
        console.log('Current user role:', user?.role);
        
        // Superadmin ma dostęp do wszystkich kursów
        const hasAccess = user?.role === 'admin' || 
                         assignedUsers.includes(user?.email) || 
                         assignedUsers.includes(user?.uid);
        console.log('Has access to course:', hasAccess);
        
        if (!hasAccess) {
          console.log('User does not have access to course');
          setError("Nie masz dostępu do tego kursu. Skontaktuj się z nauczycielem.");
          setLoading(false);
          return;
        }
        
        console.log('User has access to course, loading data...');
        console.log('Course data sections:', courseData.sections);
        console.log('Course data sections length:', courseData.sections?.length);
        
        // Użyj rzeczywistych danych sekcji i podsekcji z bazy danych
        console.log('=== DEBUGGING COURSE DATA ===');
        console.log('Full course data:', JSON.stringify(courseData, null, 2));
        console.log('Course sections:', courseData.sections);
        console.log('Course sections type:', typeof courseData.sections);
        console.log('Course sections length:', courseData.sections?.length);
        
        if (courseData.sections && courseData.sections.length > 0) {
          console.log('Using real sections data from database:', courseData.sections);
          
          // Obsłuż obie struktury: starą (contents) i nową (subsections)
          const processedSections = courseData.sections.map((section: any, index: number) => {
            console.log(`=== SECTION ${index} ===`);
            console.log(`Section ${index} full data:`, JSON.stringify(section, null, 2));
            console.log(`Section ${index} subsections:`, section.subsections);
            console.log(`Section ${index} contents:`, section.contents);
            
            // Jeśli sekcja ma subsections (nowa struktura), użyj ich
            if (section.subsections && section.subsections.length > 0) {
              console.log(`Section ${index} using NEW structure (subsections)`);
              return section;
            }
            
            // Jeśli sekcja ma contents (stara struktura), stwórz subsections
            if (section.contents && section.contents.length > 0) {
              console.log(`Section ${index} using OLD structure (contents), converting to subsections`);
              return {
                ...section,
                subsections: [
                  {
                    id: Date.now() + index,
                    name: section.name + " - Materiały",
                    description: "Materiały z tej sekcji",
                    sectionId: section.id,
                    materials: section.contents.map((content: any, contentIndex: number) => ({
                      id: Date.now() + index * 100 + contentIndex,
                      title: content.name || content.title || "Materiał",
                      description: content.description || "",
                      type: content.type || "text",
                      content: content.text || content.content || "",
                      fileUrl: content.fileUrl || content.file,
                      youtubeUrl: content.url || content.link,
                      videoUrl: content.videoUrl,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    })),
                    order: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: section.createdBy || ""
                  }
                ]
              };
            }
            
            // Jeśli sekcja nie ma ani subsections ani contents, stwórz pustą podsekcję
            console.log(`Section ${index} has no subsections or contents, creating empty subsection`);
            return {
              ...section,
              subsections: [
                {
                  id: Date.now() + index,
                  name: section.name + " - Materiały",
                  description: "Brak materiałów w tej sekcji",
                  sectionId: section.id,
                  materials: [],
                  order: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  createdBy: section.createdBy || ""
                }
              ]
            };
          });
          
          courseData.sections = processedSections;
          console.log('Processed sections:', processedSections);
        } else {
          console.log('NO SECTIONS FOUND OR SECTIONS IS EMPTY');
          console.log('Available course properties:', Object.keys(courseData));
        }
        
        setCourse(courseData);
      } catch (error) {
        console.error("Error fetching course:", error);
        setError("Błąd podczas ładowania kursu.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  if (authLoading || loading) return <div className="p-8">Ładowanie...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!course) return <div className="p-8">Nie znaleziono kursu.</div>;

  const sections = Array.isArray((course as any).sections) ? (course as any).sections : [];
  console.log('Student sections data:', sections);
  console.log('Student sections length:', sections.length);
  console.log('Course object:', course);
  console.log('Course sections property:', (course as any).sections);
  if (sections.length > 0) {
    console.log('First section:', sections[0]);
    console.log('First section subsections:', sections[0].subsections);
    console.log('First section contents:', sections[0].contents);
  } else {
    console.log('NO SECTIONS FOUND - sections array is empty!');
    console.log('Course data:', course);
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-8 px-[15px]">
      {/* Banner */}
      <div className="w-full max-w-5xl mx-auto mb-8 relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-[#4067EC] to-[#7aa2f7] flex items-center justify-between h-48 sm:h-56">
        <div className="p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg mb-2">{(course as any).title || 'Tytuł kursu'}</h1>
          <p className="text-white text-lg font-medium drop-shadow">{(course as any).description || ''}</p>
        </div>
        <div className="hidden sm:block h-full">
          {(course as any).bannerUrl ? (
            <img src={(course as any).bannerUrl} alt="Baner kursu" className="object-contain h-full w-auto opacity-80" />
          ) : (
            <div className="h-full w-32 bg-white/20 rounded-l-2xl flex items-center justify-center">
              <span className="text-6xl">🧩</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-2xl font-bold text-[#4067EC]">1</div>
          <div className="text-gray-600">Quizy</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl mb-2">📚</div>
          <div className="text-2xl font-bold text-[#4067EC]">2</div>
          <div className="text-gray-600">Materiały</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl mb-2">📅</div>
          <div className="text-2xl font-bold text-[#4067EC]">0</div>
          <div className="text-gray-600">Zadania</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl mb-2">🎓</div>
          <div className="text-2xl font-bold text-[#4067EC]">0</div>
          <div className="text-gray-600">Egzaminy</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ostatnie aktywności */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-[#4067EC] mb-4">Ostatnie aktywności</h2>
          <div className="text-gray-500">Brak aktywności do wyświetlenia</div>
        </div>

        {/* Nadchodzące terminy */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-[#4067EC] mb-4">Nadchodzące terminy</h2>
          <div className="text-gray-500">Brak nadchodzących terminów</div>
        </div>
      </div>

      {/* SEKCJE Z PODSEKCJAMI I MATERIAŁAMI */}
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📚</span>
            <h2 className="text-2xl font-semibold text-[#4067EC]">Materiały kursu</h2>
          </div>
          
          <div className="space-y-4">
            {/* DEBUG INFO */}
            <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300 mb-4">
              <h3 className="font-bold text-yellow-800">DEBUG INFO:</h3>
              <p className="text-sm text-yellow-700">Sections length: {sections.length}</p>
              <p className="text-sm text-yellow-700">Sections data: {JSON.stringify(sections, null, 2)}</p>
              <p className="text-sm text-yellow-700">Course data: {JSON.stringify(course, null, 2)}</p>
            </div>
            
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">Brak sekcji w kursie</p>
                <p className="text-sm">Skontaktuj się z nauczycielem</p>
                <p className="text-xs text-red-500">DEBUG: sections.length = {sections.length}</p>
                <p className="text-xs text-red-500">DEBUG: sections = {JSON.stringify(sections)}</p>
              </div>
            ) : (
              sections.map((section: any) => {
                console.log('Rendering section:', section);
                console.log('Section subsections:', section.subsections);
                console.log('Section ID:', section.id);
                console.log('Section name:', section.name);
                return (
                <div key={`section-${section.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div 
                    className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] hover:bg-gray-50 rounded-t-lg cursor-pointer"
                    onClick={() => {
                      console.log('Student clicking section:', section.id);
                      console.log('Current showSection state:', showSection);
                      setShowSection(prev => {
                        const newState = {...prev, [Number(section.id)]: !prev[Number(section.id)]};
                        console.log('New showSection state:', newState);
                        return newState;
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span>{showSection[Number(section.id)] ? <FaChevronUp /> : <FaChevronDown />}</span>
                      <div>
                        <span>{section.name}</span>
                        <span className="text-base font-normal ml-2">({section.type || 'material'})</span>
                        {section.type === 'assignment' && section.deadline && (
                          <span className="block text-sm font-normal text-gray-600">
                            Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                          </span>
                        )}
                        <p className="text-sm text-gray-600 font-normal">
                          {section.subsections?.length || 0} podsekcji
                        </p>
                      </div>
                    </div>
                  </div>

                  {showSection[Number(section.id)] && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      {/* Lista podsekcji */}
                      <div className="space-y-4">
                        {(!section.subsections || section.subsections.length === 0) ? (
                          <div className="text-gray-400 italic">Brak podsekcji.</div>
                        ) : (
                          section.subsections.map((subsection: any) => (
                            <div key={subsection.id} className="bg-gray-50 rounded-lg border border-gray-200">
                              {/* Nagłówek podsekcji */}
                              <div 
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => {
                                  console.log('Student clicking subsection:', subsection.id, 'in section:', section.id);
                                  console.log('Current showSubsection state:', showSubsection);
                                  setShowSubsection(prev => {
                                    const newState = {
                                      ...prev, 
                                      [Number(section.id)]: {
                                        ...prev[Number(section.id)],
                                        [Number(subsection.id)]: !prev[Number(section.id)]?.[Number(subsection.id)]
                                      }
                                    };
                                    console.log('New showSubsection state:', newState);
                                    return newState;
                                  });
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span>{showSubsection[Number(section.id)]?.[Number(subsection.id)] ? <FaChevronUp /> : <FaChevronDown />}</span>
                                  <div>
                                    <h4 className="font-semibold text-gray-800">{subsection.name}</h4>
                                    {subsection.description && (
                                      <p className="text-sm text-gray-600">{subsection.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {subsection.materials?.length || 0} materiałów
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Zawartość podsekcji */}
                              {showSubsection[Number(section.id)]?.[Number(subsection.id)] && (
                                <div className="px-4 pb-4">
                                  {/* Lista materiałów */}
                                  <div className="space-y-2">
                                    {(!subsection.materials || subsection.materials.length === 0) ? (
                                      <div className="text-gray-400 italic text-sm">Brak materiałów w tej podsekcji.</div>
                                    ) : (
                                      subsection.materials.map((material: any) => {
                                        console.log('=== MATERIAL DEBUG ===');
                                        console.log('Full material object:', material);
                                        console.log('Material type:', material.type);
                                        console.log('Material title:', material.title);
                                        console.log('Material deadline:', material.deadline);
                                        console.log('Is task?', material.type === 'task');
                                        console.log('Is assignment?', material.type === 'assignment');
                                        console.log('Has deadline?', !!material.deadline);
                                        console.log('Should show response form?', (material.type === 'task' || material.type === 'assignment' || material.deadline));
                                        console.log('======================');
                                        return (
                                        <div key={material.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                          {/* Header */}
                                          <div className="flex items-center gap-3 p-4">
                                            <div className="text-lg">
                                              {renderContentIcon(material)}
                                            </div>
                                            <div className="flex-1">
                                              <h5 className="font-medium text-gray-800">{material.title}</h5>
                                              {material.description && (
                                                <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                                              )}
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                {material.deadline && (
                                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                    Termin: {new Date(material.deadline).toLocaleString('pl-PL')}
                                                  </span>
                                                )}
                                                {material.videoUrl && (
                                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    🎥 Film wideo dostępny
                                                  </span>
                                                )}
                                                {material.youtubeUrl && (
                                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                    📺 Film YouTube dostępny
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Video Player */}
                                          {material.type === 'video' && material.videoUrl && (
                                            <div className="px-3 pb-3">
                                              <VideoPlayer 
                                                videoUrl={material.videoUrl} 
                                                title={material.title}
                                                className="w-full h-64"
                                              />
                                            </div>
                                          )}

                                          {/* YouTube Player */}
                                          {material.type === 'video' && material.youtubeUrl && (
                                            <div className="px-3 pb-3">
                                              <YouTubePlayer 
                                                youtubeUrl={material.youtubeUrl} 
                                                title={material.title}
                                                className="w-full h-64"
                                              />
                                            </div>
                                          )}

                                          {/* File Download */}
                                          {material.fileUrl && (
                                            <div className="px-3 pb-3">
                                              <a 
                                                href={material.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                              >
                                                <FaFilePdf className="text-sm" />
                                                Pobierz plik
                                              </a>
                                            </div>
                                          )}

                                          {/* Quiz Display */}
                                          {material.type === 'quiz' && material.quizId && (
                                            <div className="px-3 pb-3">
                                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <span className="text-blue-600">❓</span>
                                                  <h6 className="font-medium text-blue-900">Quiz dostępny</h6>
                                                </div>
                                                <p className="text-sm text-blue-700 mb-3">
                                                  Kliknij poniżej, aby rozpocząć quiz.
                                                </p>
                                                <button
                                                  onClick={() => window.open(`/courses/${course?.slug}/quiz/${material.quizId}`, '_blank')}
                                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                  Rozpocznij quiz
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Task Response Form - TEMPORARY: Show for all materials to test */}
                                          {true && (
                                            <div className="px-3 pb-3">
                                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <span className="text-orange-600">📝</span>
                                                  <h6 className="font-medium text-orange-900">Zadanie do wykonania</h6>
                                                </div>
                                                <p className="text-sm text-orange-700 mb-4">
                                                  Wykonaj zadanie używając jednej z opcji poniżej.
                                                </p>
                                                
                                                {!showTaskResponse[material.id] ? (
                                                  <button
                                                    onClick={() => handleShowTaskResponse(material.id)}
                                                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                                                  >
                                                    <FaPaperPlane className="text-sm" />
                                                    Odpowiedz na zadanie
                                                  </button>
                                                ) : (
                                                  <div className="space-y-4">
                                                    <div className="bg-white border border-orange-200 rounded-lg p-4">
                                                      <h6 className="font-medium text-gray-900 mb-3">Wybierz sposób odpowiedzi:</h6>
                                                      
                                                      {/* Text Response */}
                                                      <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Odpowiedź tekstowa
                                                        </label>
                                                        <textarea
                                                          value={taskResponse.text}
                                                          onChange={(e) => setTaskResponse(prev => ({...prev, text: e.target.value}))}
                                                          placeholder="Wpisz swoją odpowiedź..."
                                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                          rows={4}
                                                        />
                                                      </div>

                                                      {/* Math Response */}
                                                      <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Odpowiedź matematyczna
                                                        </label>
                                                        <div className="border border-gray-300 rounded-lg p-3 bg-white">
                                                          <MathEditor
                                                            initialValue={taskResponse.mathContent}
                                                            onChange={(value) => setTaskResponse(prev => ({...prev, mathContent: value}))}
                                                          />
                                                          <p className="text-xs text-gray-500 mt-2">
                                                            Użyj edytora matematycznego do tworzenia wyrażeń
                                                          </p>
                                                          {taskResponse.mathContent && (
                                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                                              <label className="block text-sm font-medium text-gray-700 mb-2">Podgląd:</label>
                                                              <MathView content={taskResponse.mathContent} />
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* File Upload */}
                                                      <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Załącz plik
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                          <input
                                                            type="file"
                                                            onChange={handleFileChange}
                                                            className="hidden"
                                                            id={`file-upload-${material.id}`}
                                                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                                          />
                                                          <label
                                                            htmlFor={`file-upload-${material.id}`}
                                                            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                                          >
                                                            <FaUpload className="text-sm" />
                                                            Wybierz plik
                                                          </label>
                                                          {taskResponse.fileName && (
                                                            <span className="text-sm text-gray-600">
                                                              {taskResponse.fileName}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                          Dozwolone: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (max 10MB)
                                                        </p>
                                                      </div>

                                                      {/* Action Buttons */}
                                                      <div className="flex gap-3">
                                                        <button
                                                          onClick={() => handleSubmitTaskResponse(material.id)}
                                                          disabled={submittingResponse || (!taskResponse.text && !taskResponse.mathContent && !taskResponse.file)}
                                                          className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                          {submittingResponse ? (
                                                            <>
                                                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                              Wysyłanie...
                                                            </>
                                                          ) : (
                                                            <>
                                                              <FaPaperPlane className="text-sm" />
                                                              Wyślij odpowiedź
                                                            </>
                                                          )}
                                                        </button>
                                                        <button
                                                          onClick={() => handleShowTaskResponse(material.id)}
                                                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                                                        >
                                                          Anuluj
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Text Content */}
                                          {material.content && (
                                            <div className="px-3 pb-3">
                                              <div className="bg-white p-3 rounded border">
                                                <div className="text-sm text-gray-600 mb-2">Treść:</div>
                                                <div 
                                                  className="whitespace-pre-wrap text-gray-800 prose prose-sm max-w-none"
                                                  dangerouslySetInnerHTML={{ 
                                                    __html: material.content
                                                      .replace(/\n/g, '<br>')
                                                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
                                                  }} 
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
                })
              )}
          </div>
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