'use client';

import React, { useState, useEffect } from 'react';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import firebaseApp, { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, BookOpen, Clock, Target, Zap, CheckCircle, X, Edit3, Save, Settings, Eye, Info, AlertTriangle, Upload, File, Image as ImageIcon, FileText, Trash } from 'lucide-react';

// Dynamiczne importy dla bibliotek, które wymagają window
let pdfjsLib: any = null;
let mammoth: any = null;

// Inicjalizuj biblioteki po stronie klienta
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module;
    // Konfiguracja PDF.js worker dla wersji 4.x
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
    }
  });
  
  import('mammoth').then((module) => {
    mammoth = module.default || module;
  });
}

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
  courseId: string;
  questions: Question[];
  estimatedTime: number;
  difficulty: number; // 1-5 scale
}

interface Course {
  id: string;
  title: string;
  description?: string;
}

interface AIQuizGeneratorProps {
  onQuizGenerated: (quiz: GeneratedQuiz) => void;
  onClose: () => void;
}

export const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({
  onQuizGenerated,
  onClose,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'input' | 'generating' | 'preview' | 'editing'>('input');
  const [quizDescription, setQuizDescription] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizSettings, setQuizSettings] = useState({
    subject: '',
    courseId: '',
    customTitle: '',
    difficulty: 3, // 1-5 scale
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<Array<{name: string, content: string, type: string}>>([]);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  
  // Auto-resize textarea
  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  };

  // Auto-resize wszystkich textarea po otwarciu edycji
  useEffect(() => {
    if (editedQuestion) {
      setTimeout(() => {
        const textareas = document.querySelectorAll('textarea[style*="minHeight"]');
        textareas.forEach((textarea) => {
          autoResizeTextarea(textarea as HTMLTextAreaElement);
        });
        console.log('🔄 [RESIZE] Auto-resized', textareas.length, 'textareas');
      }, 0);
    }
  }, [editedQuestion]);

  // Pobierz kursy nauczyciela
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.email) return;
      
      try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const teacherCourses = coursesSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.created_by === user.email || 
                   data.teacherEmail === user.email ||
                   (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user.email));
          })
          .map(doc => ({
            id: doc.id,
            title: doc.data().title || 'Bez nazwy',
            description: doc.data().description || ''
          }));
        
        setCourses(teacherCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [user]);

  // Funkcja do ekstrakcji tekstu z PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // Sprawdź czy pdfjs-dist został załadowany
      if (!pdfjsLib) {
        console.log('PDF.js not loaded yet, loading...');
        const pdfModule = await import('pdfjs-dist');
        pdfjsLib = pdfModule;
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
        }
      }
      
      console.log('Starting PDF text extraction for:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      // Inicjalizuj PDF.js z wersją 4.x
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .filter((str: string) => str.trim().length > 0)
            .join(' ');
          fullText += pageText + '\n\n';
          console.log(`✓ Page ${i}/${pdf.numPages} extracted, length: ${pageText.length} chars`);
        } catch (pageError) {
          console.error(`Error extracting page ${i}:`, pageError);
          // Kontynuuj z następnymi stronami
        }
      }
      
      if (fullText.trim().length === 0) {
        throw new Error('PDF nie zawiera tekstu lub jest skanowany (obraz)');
      }
      
      console.log(`✓ PDF text extraction complete: ${fullText.length} total chars`);
      return fullText.trim();
    } catch (error) {
      console.error('❌ Error extracting PDF text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      throw new Error(`Nie udało się wyekstraktować tekstu z PDF: ${errorMessage}`);
    }
  };

  // Funkcja do ekstrakcji tekstu z DOCX
  const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
      // Sprawdź czy mammoth został załadowany
      if (!mammoth) {
        console.log('Mammoth not loaded yet, loading...');
        const mammothModule = await import('mammoth');
        mammoth = mammothModule.default || mammothModule;
      }
      
      console.log('Starting DOCX text extraction for:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      console.log(`✓ DOCX text extraction complete: ${result.value.length} chars`);
      return result.value;
    } catch (error) {
      console.error('❌ Error extracting DOCX text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      throw new Error(`Nie udało się wyekstraktować tekstu z DOCX: ${errorMessage}`);
    }
  };

  // Obsługa przesyłania plików
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('📁 [FILE] File upload started, files count:', files.length);
    console.log('📄 [FILE] Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (files.length === 0) return;

    // Sprawdź typy plików
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      console.error('❌ [FILE] Invalid file types:', invalidFiles.map(f => f.name));
      setError(`Nieprawidłowe typy plików: ${invalidFiles.map(f => f.name).join(', ')}. Dozwolone: PDF, DOC, DOCX, JPG, PNG`);
      return;
    }
    
    console.log('✅ [FILE] File types validated');

    // Sprawdź rozmiar (max 10MB na plik)
    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Pliki za duże (max 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploadedFiles(prev => [...prev, ...files]);
    setError('Przetwarzam pliki...');
    
    // Przetwórz pliki
    const newFileContents: Array<{name: string, content: string, type: string}> = [];
    
    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          // Dla obrazów - konwertuj do base64
          const base64 = await fileToBase64(file);
          newFileContents.push({
            name: file.name,
            content: base64,
            type: 'image'
          });
        } else if (file.type === 'application/pdf') {
          // Dla PDF - ekstraktuj tekst
          console.log(`Ekstraktuję tekst z PDF: ${file.name}`);
          const text = await extractTextFromPDF(file);
          console.log(`Wyekstraktowano ${text.length} znaków z PDF`);
          newFileContents.push({
            name: file.name,
            content: text,
            type: 'pdf'
          });
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // Dla DOCX - ekstraktuj tekst
          console.log(`Ekstraktuję tekst z DOCX: ${file.name}`);
          const text = await extractTextFromDOCX(file);
          console.log(`Wyekstraktowano ${text.length} znaków z DOCX`);
          newFileContents.push({
            name: file.name,
            content: text,
            type: 'document'
          });
        } else {
          // Dla starszych formatów DOC
          newFileContents.push({
            name: file.name,
            content: '[DOC] - Proszę przekonwertować do DOCX lub PDF dla lepszej analizy',
            type: 'document'
          });
        }
      } catch (err) {
        console.error('Error processing file:', err);
        setError(`Błąd przetwarzania pliku: ${file.name} - ${err instanceof Error ? err.message : 'Nieznany błąd'}`);
        return;
      }
    }
    
    setFileContents(prev => [...prev, ...newFileContents]);
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
  };

  const generateQuiz = async () => {
    console.log('🚀 [GENERATE] Starting quiz generation...');
    console.log('📋 Quiz settings:', quizSettings);
    console.log('📝 Description:', quizDescription);
    console.log('📁 Files attached:', fileContents.length);
    
    // Opis jest opcjonalny jeśli są załączone pliki
    if (!quizDescription.trim() && fileContents.length === 0) {
      console.error('❌ [GENERATE] No description or files provided');
      setError('Proszę opisać czego ma dotyczyć quiz lub załączyć plik');
      return;
    }

    if (!quizSettings.courseId.trim()) {
      console.error('❌ [GENERATE] No course selected');
      setError('Proszę wybrać kurs dla quizu');
      return;
    }

    console.log('⏳ [GENERATE] Validation passed, generating...');
    setIsGenerating(true);
    setError(null);
    setStep('generating');

    try {
      // Przygotuj informacje o plikach dla promptu
      let filesInfo = '';
      
      if (fileContents.length > 0) {
        filesInfo = '\n\n=== ZAŁĄCZONE MATERIAŁY ===\n';
        fileContents.forEach(file => {
          if (file.type === 'image') {
            filesInfo += `\n[OBRAZ: ${file.name}]\nPrzeanalizuj zawartość tego obrazu i stwórz pytania na jego podstawie.\n`;
          } else if (file.type === 'pdf' || file.type === 'document') {
            // Dodaj faktyczną treść dokumentu (ograniczoną do 15000 znaków aby nie przekroczyć limitu API)
            const truncatedContent = file.content.length > 15000 
              ? file.content.substring(0, 15000) + '\n\n[...treść została skrócona...]'
              : file.content;
            filesInfo += `\n[DOKUMENT: ${file.name}]\nZAWARTOŚĆ DOKUMENTU:\n${truncatedContent}\n`;
          }
        });
        filesInfo += '\n=== KONIEC MATERIAŁÓW ===\n';
        filesInfo += '\nINSTRUKCJA: Stwórz pytania WYŁĄCZNIE na podstawie powyższych materiałów. Pytania muszą dotyczyć konkretnej zawartości załączonych plików.\n';
      }

      // Mapowanie poziomu trudności na szczegółowe instrukcje
      const difficultyDescriptions = {
        1: 'BARDZO ŁATWY - pytania podstawowe, oczywiste odpowiedzi, dla początkujących, proste fakty',
        2: 'ŁATWY - pytania wymagające podstawowej wiedzy, łatwe do zrozumienia',
        3: 'ŚREDNI - pytania wymagające solidnej wiedzy, niektóre wymagają analizy',
        4: 'TRUDNY - pytania wymagające głębokiej wiedzy, analizy i rozumowania',
        5: 'BARDZO TRUDNY - pytania eksperckie, wymagające krytycznego myślenia, złożone problemy, zaawansowana analiza'
      };
      
      const difficultyInstruction = difficultyDescriptions[quizSettings.difficulty as keyof typeof difficultyDescriptions];

      const prompt = `
Jesteś ekspertem w tworzeniu quizów edukacyjnych. Stwórz quiz na podstawie${fileContents.length > 0 ? ' załączonych materiałów' : ' opisu nauczyciela'}.

${quizDescription ? `OPIS/UWAGI NAUCZYCIELA: ${quizDescription}` : ''}
PRZEDMIOT: ${quizSettings.subject || 'Ogólny'}
POZIOM TRUDNOŚCI (1-5): ${quizSettings.difficulty}/5 - ${difficultyInstruction}
LICZBA PYTAŃ: ${quizSettings.questionCount}
CZAS: ${quizSettings.timeLimit} minut${filesInfo}

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
  "difficulty": ${quizSettings.difficulty}
}

WAŻNE - DOSTOSOWANIE POZIOMU TRUDNOŚCI:
- Stwórz DOKŁADNIE ${quizSettings.questionCount} pytań
- Każde pytanie ma 4 odpowiedzi (A, B, C, D)
- Tylko jedna odpowiedź jest poprawna
- KRYTYCZNE: Poziom trudności ${quizSettings.difficulty}/5 MUSI być przestrzegany:
  * ${quizSettings.difficulty === 1 ? 'Pytania BARDZO PROSTE - pojedyncze fakty, oczywiste odpowiedzi' : ''}
  * ${quizSettings.difficulty === 2 ? 'Pytania ŁATWE - podstawowa wiedza, proste rozumienie' : ''}
  * ${quizSettings.difficulty === 3 ? 'Pytania ŚREDNIE - solidna wiedza, wymagają myślenia' : ''}
  * ${quizSettings.difficulty === 4 ? 'Pytania TRUDNE - głęboka wiedza, analiza, rozumowanie' : ''}
  * ${quizSettings.difficulty === 5 ? 'Pytania BARDZO TRUDNE - pytania eksperckie, złożone problemy, krytyczne myślenie, zaawansowana analiza' : ''}
- Dodaj szczegółowe wyjaśnienia do odpowiedzi
- Pytania mają być różnorodne i angażujące
- Użyj polskiego języka${fileContents.length > 0 ? '\n- WAŻNE: Bazuj pytania na załączonych plikach/obrazach' : ''}
- Jeśli nauczyciel podał własny tytuł, użyj go: ${quizSettings.customTitle ? quizSettings.customTitle : 'stwórz odpowiedni tytuł'}
`;

      // Przygotuj dane dla API - z obrazami jeśli są
      let result;
      const images = fileContents.filter(f => f.type === 'image');
      
      if (images.length > 0) {
        // Jeśli są obrazy, wyślij je wraz z promptem
        const parts = [{ text: prompt }];
        
        for (const img of images) {
          // Konwertuj base64 do formatu akceptowanego przez Gemini
          const base64Data = img.content.split(',')[1]; // Usuń prefix "data:image/...;base64,"
          const mimeType = img.content.split(';')[0].split(':')[1]; // Wyciągnij typ MIME
          
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          } as any);
        }
        
        result = await model.generateContent(parts as any);
      } else {
        result = await model.generateContent(prompt);
      }
      
      const response = result.response;
      const text = response.text();
      console.log('📥 [AI] Received response from AI, length:', text.length);
      
      // Wyciągnij JSON z odpowiedzi
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ [AI] Invalid AI response format:', text);
        throw new Error('Nie udało się wygenerować quizu w odpowiednim formacie');
      }

      console.log('🔍 [AI] Parsing JSON response...');
      const quizData = JSON.parse(jsonMatch[0]);
      console.log('✅ [AI] Quiz data parsed:', { 
        title: quizData.title, 
        questionCount: quizData.questions?.length,
        difficulty: quizData.difficulty  
      });
      
      // Generuj unikalne ID dla pytań i odpowiedzi
      const processedQuiz: GeneratedQuiz = {
        ...quizData,
        title: quizSettings.customTitle || quizData.title, // Użyj customowego tytułu jeśli podany
        courseId: quizSettings.courseId,
        difficulty: quizSettings.difficulty, // Upewnij się że trudność jest poprawna
        questions: quizData.questions.map((q: any, qIndex: number) => ({
          ...q,
          id: `q${qIndex + 1}`,
          answers: q.answers.map((a: any, aIndex: number) => ({
            ...a,
            id: `q${qIndex + 1}_a${aIndex + 1}`,
          })),
        })),
      };

      console.log('✅ [GENERATE] Quiz generated successfully:', processedQuiz);
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
      console.log('✅ [ACCEPT] Accepting quiz and passing to parent component');
      console.log('📊 [ACCEPT] Quiz data:', {
        title: generatedQuiz.title,
        courseId: generatedQuiz.courseId,
        questionCount: generatedQuiz.questions.length,
        difficulty: generatedQuiz.difficulty,
        estimatedTime: generatedQuiz.estimatedTime
      });
      onQuizGenerated(generatedQuiz);
      // Reset plików
      setUploadedFiles([]);
      setFileContents([]);
      console.log('🧹 [ACCEPT] Cleanup completed, closing modal');
      onClose();
    } else {
      console.error('❌ [ACCEPT] Cannot accept quiz - generatedQuiz is null');
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

  const openEditModal = (index: number) => {
    if (generatedQuiz) {
      console.log('🖊️ [EDIT] Opening edit modal for question:', index);
      console.log('📝 Question data:', generatedQuiz.questions[index]);
      setEditingQuestionIndex(index);
      setEditedQuestion(JSON.parse(JSON.stringify(generatedQuiz.questions[index]))); // Deep copy
      setManualEditMode(true);
      setQuestionEditPrompt('');
      console.log('✅ [EDIT] Modal opened, manualEditMode:', true);
    }
  };

  const saveManualEdit = () => {
    if (editedQuestion && editingQuestionIndex !== null) {
      console.log('💾 [SAVE] Saving manual edit for question:', editingQuestionIndex);
      console.log('📝 Updated question data:', editedQuestion);
      handleQuestionEdit(editingQuestionIndex, editedQuestion);
      setEditingQuestionIndex(null);
      setEditedQuestion(null);
      setManualEditMode(false);
      console.log('✅ [SAVE] Manual edit saved successfully');
    } else {
      console.error('❌ [SAVE] Cannot save - missing data:', { editedQuestion, editingQuestionIndex });
    }
  };

  const updateEditedQuestionField = (field: string, value: any) => {
    if (editedQuestion) {
      console.log(`📝 [UPDATE] Updating question field "${field}" to:`, value);
      setEditedQuestion({ ...editedQuestion, [field]: value });
    }
  };

  const updateEditedAnswer = (answerIndex: number, field: string, value: any) => {
    if (editedQuestion) {
      console.log(`📝 [UPDATE] Updating answer ${answerIndex}, field "${field}" to:`, value);
      const updatedAnswers = editedQuestion.answers.map((answer, idx) => 
        idx === answerIndex ? { ...answer, [field]: value } : answer
      );
      setEditedQuestion({ ...editedQuestion, answers: updatedAnswers });
      console.log('✅ [UPDATE] Answer updated, new answers:', updatedAnswers);
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
      background: 'rgba(0, 0, 0, 0.6)',
    }}>
      {/* Glassmorphism background - tylko w light mode */}
      <div 
        className="absolute inset-0 dark:hidden pointer-events-none" 
        style={{
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(236, 72, 153, 0.3) 25%, rgba(59, 130, 246, 0.3) 50%, rgba(168, 85, 247, 0.3) 75%, rgba(244, 114, 182, 0.3) 100%)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          animation: 'gradient 15s ease infinite',
          backgroundSize: '400% 400%',
        }} 
      />
      
      {/* Dodatkowe animowane kolorowe kule dla głębi */}
      <div className="absolute inset-0 dark:hidden pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-10 left-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="bg-white/80 dark:bg-gray-900 backdrop-blur-2xl rounded-2xl shadow-2xl border-2 border-white/40 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10">
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
              {/* Customowy tytuł */}
              <div className="group">
                <label className="block text-sm font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Tytuł quizu (opcjonalny)
                </label>
                <input
                  type="text"
                  value={quizSettings.customTitle}
                  onChange={(e) => setQuizSettings(prev => ({ ...prev, customTitle: e.target.value }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 text-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm dark:text-white"
                  placeholder="Jeśli pozostawisz puste, AI wygeneruje tytuł automatycznie..."
                />
              </div>

              {/* Główny opis - teraz opcjonalny */}
              <div className="group">
                <label className="block text-sm font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Opis / Uwagi {fileContents.length > 0 ? '(opcjonalne)' : '*'}
                </label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 text-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm dark:text-white"
                  rows={4}
                  placeholder={fileContents.length > 0 
                    ? "Opcjonalnie: Dodaj uwagi na co AI ma zwrócić szczególną uwagę w załączonych materiałach..."
                    : "Np.: Quiz z dodawania ułamków, pytania o II wojnę światową, test z gramatyki angielskiej..."}
                />
                {fileContents.length > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    💡 Masz załączone pliki - opis jest opcjonalny. Możesz dodać uwagi, jeśli chcesz zaznaczyć konkretne punkty.
                  </p>
                )}
              </div>

              {/* Przesyłanie plików */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Załącz pliki (opcjonalnie)</h3>
                    <p className="text-sm text-gray-600">AI przeanalizuje zawartość i utworzy pytania na ich podstawie</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-indigo-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 bg-white">
                        <Upload className="w-5 h-5 text-indigo-600" />
                        <span className="text-indigo-700 font-medium">Wybierz pliki (PDF, DOC, DOCX, JPG, PNG)</span>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Lista przesłanych plików */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-indigo-700">Załączone pliki ({uploadedFiles.length}):</p>
                      {uploadedFiles.map((file, index) => {
                        const fileType = file.type;
                        const isImage = fileType.startsWith('image/');
                        const isPDF = fileType === 'application/pdf';
                        const isDOCX = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        const fileContent = fileContents[index];
                        const textLength = fileContent && fileContent.type !== 'image' ? fileContent.content.length : 0;
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-400 transition-all duration-200">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isImage ? 'bg-green-100' : isPDF ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                {isImage ? (
                                  <ImageIcon className={`w-5 h-5 text-green-600`} />
                                ) : isPDF ? (
                                  <FileText className="w-5 h-5 text-red-600" />
                                ) : (
                                  <File className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB • {
                                    isImage ? 'Obraz' : isPDF ? 'PDF' : isDOCX ? 'DOCX' : 'Dokument'
                                  }
                                  {textLength > 0 && (
                                    <span className="ml-2 text-green-600 font-medium">
                                      ✓ Tekst wyekstraktowany ({textLength} znaków)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Usuń plik"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Wsparcie plików:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>PDF:</strong> System automatycznie wyekstraktuje tekst i stworzy pytania na jego podstawie</li>
                        <li><strong>DOCX:</strong> System automatycznie wyekstraktuje tekst i stworzy pytania na jego podstawie</li>
                        <li><strong>Obrazy (JPG, PNG):</strong> AI przeanalizuje zawartość i stworzy pytania o obrazy</li>
                        <li><strong>DOC:</strong> Przekonwertuj do DOCX lub PDF dla lepszej analizy</li>
                        <li>Maksymalny rozmiar pliku: 10MB</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                      Przedmiot (Kurs)
                    </label>
                    <select
                      value={quizSettings.courseId}
                      onChange={(e) => {
                        const selectedCourse = courses.find(c => c.id === e.target.value);
                        setQuizSettings(prev => ({ 
                          ...prev, 
                          courseId: e.target.value,
                          subject: selectedCourse?.title || ''
                        }));
                      }}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 bg-white"
                    >
                      <option value="">Wybierz kurs...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    {courses.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Brak dostępnych kursów. Utwórz kurs w sekcji &quot;Kursy&quot; aby móc tworzyć quizy.
                      </p>
                    )}
                  </div>

                  {/* Suwak poziomu trudności 1-5 */}
                  <div className="group md:col-span-2">
                    <label className="block text-sm font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Poziom trudności: {quizSettings.difficulty}/5
                    </label>
                    
                    <div className="space-y-4">
                      {/* Suwak */}
                      <div className="relative pt-2">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                      value={quizSettings.difficulty}
                          onChange={(e) => setQuizSettings(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                          className="w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 via-orange-200 to-red-200 rounded-lg appearance-none cursor-pointer
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-orange-500 
                                   [&::-webkit-slider-thumb]:to-red-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                                   [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full 
                                   [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-orange-500 [&::-moz-range-thumb]:to-red-500 
                                   [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                          style={{
                            background: `linear-gradient(to right, 
                              #86efac ${((quizSettings.difficulty - 1) / 4) * 100}%, 
                              #fde68a ${((quizSettings.difficulty - 1) / 4) * 100}%)`
                          }}
                        />
                      </div>
                      
                      {/* Etykiety pod suwakiem */}
                      <div className="flex justify-between text-xs font-medium px-1">
                        <span className={`${quizSettings.difficulty === 1 ? 'text-green-600 dark:text-green-400 font-bold scale-110' : 'text-gray-500 dark:text-gray-400'} transition-all`}>
                          1: Bardzo łatwy
                        </span>
                        <span className={`${quizSettings.difficulty === 2 ? 'text-green-600 dark:text-green-400 font-bold scale-110' : 'text-gray-500 dark:text-gray-400'} transition-all`}>
                          2: Łatwy
                        </span>
                        <span className={`${quizSettings.difficulty === 3 ? 'text-yellow-600 dark:text-yellow-400 font-bold scale-110' : 'text-gray-500 dark:text-gray-400'} transition-all`}>
                          3: Średni
                        </span>
                        <span className={`${quizSettings.difficulty === 4 ? 'text-orange-600 dark:text-orange-400 font-bold scale-110' : 'text-gray-500 dark:text-gray-400'} transition-all`}>
                          4: Trudny
                        </span>
                        <span className={`${quizSettings.difficulty === 5 ? 'text-red-600 dark:text-red-400 font-bold scale-110' : 'text-gray-500 dark:text-gray-400'} transition-all`}>
                          5: Bardzo trudny
                        </span>
                      </div>
                      
                      {/* Opis wybranego poziomu */}
                      <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                          {quizSettings.difficulty === 1 && '🟢 Bardzo łatwy - pytania podstawowe, oczywiste odpowiedzi, dla początkujących'}
                          {quizSettings.difficulty === 2 && '🟢 Łatwy - pytania wymagające podstawowej wiedzy, łatwe do zrozumienia'}
                          {quizSettings.difficulty === 3 && '🟡 Średni - pytania wymagające solidnej wiedzy, niektóre wymagają analizy'}
                          {quizSettings.difficulty === 4 && '🟠 Trudny - pytania wymagające głębokiej wiedzy, analizy i rozumowania'}
                          {quizSettings.difficulty === 5 && '🔴 Bardzo trudny - pytania eksperckie, krytyczne myślenie, złożone problemy'}
                        </p>
                      </div>
                    </div>
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
                  disabled={(!quizDescription.trim() && fileContents.length === 0) || isGenerating}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Tytuł</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{generatedQuiz.title}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-green-200 dark:border-green-700 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Pytania</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{generatedQuiz.questions.length} pytań</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-orange-200 dark:border-orange-700 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Czas</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{generatedQuiz.estimatedTime} min</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Trudność</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    {generatedQuiz.difficulty}/5
                    {generatedQuiz.difficulty === 1 && ' - Bardzo łatwy'}
                    {generatedQuiz.difficulty === 2 && ' - Łatwy'}
                    {generatedQuiz.difficulty === 3 && ' - Średni'}
                    {generatedQuiz.difficulty === 4 && ' - Trudny'}
                    {generatedQuiz.difficulty === 5 && ' - Bardzo trudny'}
                  </p>
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
                  <div key={question.id} className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                    {editingQuestionIndex === index && editedQuestion ? (
                      /* Formularz edycji inline - rozwija się w miejscu pytania */
                      <div className="p-6 space-y-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-l-4 border-yellow-500">
                        {/* Header formularza */}
                        <div className="flex items-center justify-between pb-3 border-b border-blue-200 dark:border-gray-600">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center animate-pulse">
                              <Edit3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                Edycja pytania {index + 1}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Wybierz tryb edycji</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingQuestionIndex(null);
                              setEditedQuestion(null);
                              setQuestionEditPrompt('');
                              setManualEditMode(false);
                              setError(null);
                            }}
                            className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all duration-300"
                            title="Zamknij"
                          >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>

                        {/* Przełącznik trybów */}
                        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-inner">
                          <button
                            onClick={() => setManualEditMode(true)}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                              manualEditMode
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            ✏️ Edycja ręczna
                          </button>
                          <button
                            onClick={() => setManualEditMode(false)}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                              !manualEditMode
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            ✨ Edycja z AI
                          </button>
                        </div>

                        {manualEditMode ? (
                          /* Tryb ręcznej edycji */
                          <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            {/* Treść pytania */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Treść pytania:
                              </label>
                              <textarea
                                value={editedQuestion.content}
                                onChange={(e) => {
                                  updateEditedQuestionField('content', e.target.value);
                                  autoResizeTextarea(e.target);
                                }}
                                onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none overflow-hidden"
                                style={{ minHeight: '60px' }}
                              />
                            </div>

                            {/* Punkty */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Punkty: {editedQuestion.points || 1}
                              </label>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={editedQuestion.points || 1}
                                onChange={(e) => updateEditedQuestionField('points', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>1 pkt</span>
                                <span>10 pkt</span>
                              </div>
                            </div>

                            {/* Odpowiedzi */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Odpowiedzi:
                              </label>
                              <div className="space-y-2">
                                {editedQuestion.answers.map((answer, idx) => (
                                  <div key={answer.id} className="flex gap-2 items-center">
                                    <span className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <input
                                      type="text"
                                      value={answer.content}
                                      onChange={(e) => updateEditedAnswer(idx, 'content', e.target.value)}
                                      className="flex-1 p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                    />
                                    <label className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
                                      <input
                                        type="radio"
                                        name={`correct_answer_${index}`}
                                        checked={answer.is_correct}
                                        onChange={() => {
                                          const updatedAnswers = editedQuestion.answers.map((a, i) => ({
                                            ...a,
                                            is_correct: i === idx
                                          }));
                                          setEditedQuestion({ ...editedQuestion, answers: updatedAnswers });
                                        }}
                                        className="w-4 h-4 text-green-600"
                                      />
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {answer.is_correct ? '✓' : ''}
                                      </span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Wyjaśnienie */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Wyjaśnienie (opcjonalne):
                              </label>
                              <textarea
                                value={editedQuestion.explanation || ''}
                                onChange={(e) => {
                                  updateEditedQuestionField('explanation', e.target.value);
                                  autoResizeTextarea(e.target);
                                }}
                                onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none overflow-hidden"
                                placeholder="Dodaj wyjaśnienie..."
                                style={{ minHeight: '60px' }}
                              />
                            </div>
                          </div>
                        ) : (
                          /* Tryb edycji z AI */
                          <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            {/* Aktualne pytanie */}
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                              <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Aktualne pytanie:</h5>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">{question.content}</p>
                            </div>

                            {/* Instrukcja edycji */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Opisz jak chcesz zmienić pytanie:
                              </label>
                              <textarea
                                value={questionEditPrompt}
                                onChange={(e) => {
                                  setQuestionEditPrompt(e.target.value);
                                  autoResizeTextarea(e.target);
                                }}
                                onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none overflow-hidden"
                                placeholder="Np.: Zmień na bardziej praktyczne, uprość język..."
                                style={{ minHeight: '80px' }}
                              />
                            </div>
                          </div>
                        )}

                        {error && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                          </div>
                        )}

                        {/* Przyciski akcji */}
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => {
                              setEditingQuestionIndex(null);
                              setEditedQuestion(null);
                              setQuestionEditPrompt('');
                              setManualEditMode(false);
                              setError(null);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all font-medium text-sm"
                          >
                            Anuluj
                          </button>
                          {manualEditMode ? (
                            <button
                              onClick={saveManualEdit}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center gap-2 text-sm shadow-lg"
                            >
                              <Save className="w-4 h-4" />
                              Zapisz zmiany
                            </button>
                          ) : (
                            <button
                              onClick={() => editQuestionWithAI(index)}
                              disabled={!questionEditPrompt.trim() || isEditingQuestion}
                              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-lg"
                            >
                              {isEditingQuestion ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Edytuję...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  Edytuj z AI
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Normalny widok pytania */
                      <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                          <h5 className="font-semibold text-gray-900 dark:text-white text-lg">
                        Pytanie {index + 1}: {question.content}
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-1 rounded-full font-medium">
                          {question.points || 1} pkt
                        </span>
                        <button
                              onClick={() => openEditModal(index)}
                          className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 hover:scale-105"
                              title="Edytuj pytanie"
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
                                  ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-800 dark:text-green-300 border-2 border-green-200 dark:border-green-700 shadow-sm' 
                                  : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-bold">
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
                          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <strong className="text-blue-800 dark:text-blue-300">Wyjaśnienie:</strong>
                        </div>
                            <p className="text-blue-700 dark:text-blue-300 text-sm">{question.explanation}</p>
                          </div>
                        )}
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
        </div>
      </div>
    </div>
  );
};
