"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, addDoc, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/config/firebase";
import Image from "next/image";
import Providers from '@/components/Providers';
import { FaFilePdf, FaFileAlt, FaLink, FaChevronDown, FaChevronUp, FaPlus, FaImage, FaClipboardList, FaGraduationCap, FaUsers, FaQuestionCircle } from "react-icons/fa";
import VideoPlayer from '@/components/VideoPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { QuizAssignmentModal } from '@/components/QuizAssignmentModal';
// Dynamiczny import MDXEditor
const MDXEditor = dynamic(() => import('@mdxeditor/editor').then(mod => mod.MDXEditor), { ssr: false });
import {
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  linkPlugin,
  linkDialogPlugin,
  CreateLink,
  UndoRedo,
  CodeToggle,
  Separator,
  listsPlugin,
} from "@mdxeditor/editor";
import '@mdxeditor/editor/style.css';

interface User {
  id: number;
  email: string;
  username: string;
  is_active?: boolean;
}

interface Course {
  id: number;
  title: string;
  description: string;
  year_of_study: number;
  subject: string;
  is_active: boolean;
  assigned_users: User[];
}

interface SectionContent {
  id: string | number;
  type: string;
  content?: string;
  title?: string;
  name?: string;
  fileUrl?: string | null;
  fileName?: string;
  url?: string;
  link?: string | null;
  text?: string | null;
  file?: string;
  description?: string;
}

interface Section {
  [key: string]: unknown;
  id: string | number;
  title: string;
  name?: string;
  type?: "material" | "assignment" | "form";
  description?: string;
  order?: number;
  deadline?: string;
  contents?: SectionContent[];
  subsections?: Subsection[];
  fileUrl?: string;
  formUrl?: string;
  submissions?: { userId: string; fileUrl?: string; submittedAt?: string }[];
}

interface Subsection {
  id: string | number;
  name: string;
  description?: string;
  sectionId: string | number;
  materials: Material[];
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Material {
  id: string | number;
  title: string;
  description?: string;
  type: "text" | "file" | "task" | "exam" | "activity" | "video" | "quiz";
  subsectionId: string | number;
  order: number;
  deadline?: string;
  fileUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  content?: string;
  questions?: Question[];
  submissions?: Submission[];
  quizId?: string; // ID quizu przypisanego do lekcji
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Question {
  id: string;
  type: "multiple_choice" | "open_ended" | "true_false";
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
}

interface Submission {
  id: string;
  userId: string;
  materialId: string | number;
  content?: string;
  fileUrl?: string;
  answers?: Record<string, string>;
  score?: number;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
  feedback?: string;
}

interface Student {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
  classes?: string[]; // 🆕 NOWE - ID klas do których należy uczeń
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  course_id: string;
  questions: {
    id: string;
    content: string;
    type: string;
    answers?: {
      id: string;
      content: string;
      isCorrect: boolean;
    }[];
  }[];
  created_at: string;
  created_by: string;
  max_attempts: number;
}


function TeacherCourseDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const courseId = params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [showQuizAssignmentModal, setShowQuizAssignmentModal] = useState(false);

  // Nowe zmienne dla zarządzania uczniami
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState<string[]>([]);
  const [showAssignedStudents, setShowAssignedStudents] = useState<boolean>(false);


  // Banner state
  const [bannerUrl, setBannerUrl] = useState<string>("");
  // Section state
  const [showSection, setShowSection] = useState<{[id:number]: boolean}>({});
  const [addingSection, setAddingSection] = useState(false);
  const [sectionContents, setSectionContents] = useState<{[id:number]: SectionContent[]}>({});
  const [newContent, setNewContent] = useState<{[id:number]: {name: string, file: File | null, link: string, text: string}}>({});

  // Dodaj nową deklarację sections
  const [sections, setSections] = useState<Section[]>([]);
  const [newSection, setNewSection] = useState<{name: string, type: string, deadline?: string}>({name: '', type: 'material'});
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editSection, setEditSection] = useState<Section | null>(null);

  // Nowe stany dla podsekcji i materiałów
  const [showSubsection, setShowSubsection] = useState<{[id:number]: boolean}>({});
  const [addingSubsection, setAddingSubsection] = useState<number | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<number | null>(null);
  const [newSubsection, setNewSubsection] = useState<{name: string, description: string}>({name: '', description: ''});
  const [editSubsection, setEditSubsection] = useState<{name: string, description: string}>({name: '', description: ''});
  const [addingMaterial, setAddingMaterial] = useState<number | null>(null);
  const [newMaterial, setNewMaterial] = useState<{
    title: string;
    description: string;
    type: "text" | "file" | "task" | "exam" | "activity" | "video" | "quiz";
    deadline?: string;
    content?: string;
    file?: File | null;
    video?: File | null;
    youtubeUrl?: string;
    videoSource?: "upload" | "youtube";
    quizId?: string;
  }>({
    title: '',
    description: '',
    type: 'text',
    deadline: '',
    content: '',
    file: null,
    video: null,
    youtubeUrl: '',
    videoSource: 'upload',
    quizId: ''
  });
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<SectionContent | null>(null);
  
  // Stan do zarządzania quizami
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [showQuizSelector, setShowQuizSelector] = useState(false);

  // Funkcja do pobierania dostępnych quizów
  const fetchAvailableQuizzes = async () => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const quizzesCollection = collection(db, 'quizzes');
      const quizzesSnapshot = await getDocs(quizzesCollection);
      
      const quizzes = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  // Funkcja do przypisywania quizu do lekcji
  const handleAssignQuizToLesson = (quizId: string, quizTitle: string) => {
    setNewMaterial(prev => ({
      ...prev,
      quizId: quizId,
      title: quizTitle,
      type: 'quiz'
    }));
    setShowQuizSelector(false);
  };

  // Fetch students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        
        // Pobierz wszystkie klasy, żeby sprawdzić do których należy uczeń
        const classesCollection = collection(db, "classes");
        const classesSnapshot = await getDocs(classesCollection);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Mapuj uczniów i dodaj informacje o klasach
        const studentsList = usersSnapshot.docs
          .map(doc => {
            const userData = doc.data();
            if (userData.role === "student") {
              // Znajdź klasy do których należy uczeń
              const userClasses = classesData
                .filter((cls: any) => cls.students && cls.students.includes(doc.id))
                .map((cls: any) => cls.id);
              
              return {
                uid: doc.id,
                ...userData,
                classes: userClasses
              } as Student;
            }
            return null;
          })
          .filter(Boolean) as Student[];
        
        setStudents(studentsList);
        console.log('Fetched students with classes:', studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      }
    };
    fetchStudents();
  }, [setStudents]);

  // Fetch assigned users from Firestore (by courseId)
  useEffect(() => {
    const fetchAssigned = async () => {
      if (!courseId) return;
      
      console.log('Fetching assigned users from Firestore for courseId:', courseId);
      
      try {
        // Pobierz kurs z Firestore
        const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
        
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          console.log('Course data from Firestore:', courseData);
          
          // Pobierz przypisanych użytkowników z Firestore
          const assignedUsersFromFirestore = courseData.assignedUsers || [];
          console.log('Raw assignedUsers from Firestore:', assignedUsersFromFirestore);
          
          // Pobierz pełne dane użytkowników z kolekcji "users"
          const assignedUsersList = await Promise.all(
            assignedUsersFromFirestore.map(async (userIdentifier: string) => {
              try {
                // Sprawdź czy to email czy UID
                let userDoc;
                if (userIdentifier.includes('@')) {
                  // To email - znajdź użytkownika po email
                  const usersQuery = query(collection(db, "users"), where("email", "==", userIdentifier));
                  const userSnapshot = await getDocs(usersQuery);
                  if (!userSnapshot.empty) {
                    userDoc = userSnapshot.docs[0];
                  }
                } else {
                  // To UID - pobierz bezpośrednio
                  userDoc = await getDoc(doc(db, "users", userIdentifier));
                }
                
                if (userDoc && userDoc.exists()) {
                  const userData = userDoc.data() as { firstName?: string; lastName?: string; email?: string; };
                  return {
                    uid: userDoc.id,
                    displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || userIdentifier,
                    email: userData.email || userIdentifier,
                    role: 'student',
                    is_active: true
                  };
                } else {
                  // Fallback jeśli nie znaleziono użytkownika
                  return {
                    uid: userIdentifier,
                    displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
                    email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@example.com`,
                    role: 'student',
                    is_active: true
                  };
                }
              } catch (error) {
                console.error('Error fetching user data for:', userIdentifier, error);
                // Fallback
                return {
                  uid: userIdentifier,
                  displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
                  email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@example.com`,
                  role: 'student',
                  is_active: true
                };
              }
            })
          );
          
          console.log('Assigned users mapped from Firestore:', assignedUsersList);
          setAssignedUsers(assignedUsersList);
        } else {
          console.log('Course document does not exist in Firestore');
          setAssignedUsers([]);
        }
      } catch (error) {
        console.error('Error fetching assigned users from Firestore:', error);
        setAssignedUsers([]);
      }
    };
    fetchAssigned();
  }, [courseId, setAssignedUsers]);

  // 🆕 NOWE - Automatyczna synchronizacja uczniów z klas przypisanych do kursu
  useEffect(() => {
    const syncClassStudents = async () => {
      if (!courseId || !(course as any)?.assignedClasses?.length) return;
      
      try {
        console.log('Synchronizacja uczniów z klas dla kursu:', courseId);
        console.log('Przypisane klasy:', (course as any).assignedClasses);
        
        // Pobierz wszystkich uczniów z przypisanych klas
        const studentsFromClasses = new Set<string>();
        
        for (const classId of (course as any).assignedClasses) {
          const classRef = doc(db, 'classes', classId);
          const classDoc = await getDoc(classRef);
          
          if (classDoc.exists()) {
            const classData = classDoc.data();
            const classStudents = classData.students || [];
            classStudents.forEach((studentId: string) => {
              studentsFromClasses.add(studentId);
            });
            console.log(`Klasa ${classId} ma ${classStudents.length} uczniów`);
          }
        }
        
        // Pobierz aktualnych przypisanych uczniów
        const courseRef = doc(db, 'courses', String(courseId));
        const courseDoc = await getDoc(courseRef);
        
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          const currentAssignedUsers = new Set(courseData.assignedUsers || []);
          
          // Dodaj uczniów z klas do kursu jeśli nie są już przypisani
          let newStudentsAdded = 0;
          studentsFromClasses.forEach(studentId => {
            if (!currentAssignedUsers.has(studentId)) {
              currentAssignedUsers.add(studentId);
              newStudentsAdded++;
            }
          });
          
          // Zaktualizuj kurs jeśli dodano nowych uczniów
          if (newStudentsAdded > 0) {
            await updateDoc(courseRef, {
              assignedUsers: Array.from(currentAssignedUsers),
              updated_at: new Date().toISOString()
            });
            
            console.log(`Dodano ${newStudentsAdded} uczniów z klas do kursu`);
            
            // Odśwież listę przypisanych uczniów
            window.location.reload(); // Proste odświeżenie - może być optymalizowane
          }
        }
      } catch (error) {
        console.error('Błąd synchronizacji uczniów z klas:', error);
      }
    };
    
    // Uruchom synchronizację po załadowaniu kursu
    if (course && !loading) {
      syncClassStudents();
    }
  }, [course, courseId, loading]);

  // Fetch quizzes for this course
  const fetchQuizzes = useCallback(async () => {
    if (!courseId) return;
    
    try {
      setLoadingQuizzes(true);
      setQuizError(null);
      
      console.log('Fetching quizzes for course:', courseId);
      const quizzesCollection = collection(db, 'quizzes');
      const quizzesQuery = query(
        quizzesCollection,
        where('course_id', '==', courseId)
      );
      
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzesList = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];
      
      console.log('Found quizzes for course:', quizzesList);
      setQuizzes(quizzesList);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setQuizError('Nie udało się załadować quizów');
    } finally {
      setLoadingQuizzes(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Filtrowanie dostępnych uczniów (nie przypisanych do kursu + wyszukiwanie)
  const filteredAvailableStudents = students.filter(student => {
    // Sprawdź czy uczeń nie jest już przypisany
    const isNotAssigned = !assignedUsers.some(assigned => 
      assigned.uid === student.uid || assigned.email === student.email
    );
    
    // 🆕 NOWE - Sprawdź czy uczeń nie jest w klasie przypisanej do kursu
    const isNotInAssignedClass = !(course as any)?.assignedClasses?.some((classId: any) => {
      // Sprawdź czy uczeń jest w tej klasie
      return classId && student.classes && student.classes.includes(classId);
    });
    
    // Sprawdź czy pasuje do wyszukiwania
    const matchesSearch = !studentSearchTerm || 
      student.displayName?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase());
    
    return isNotAssigned && isNotInAssignedClass && matchesSearch;
  });

  // Funkcje do zarządzania wyborem uczniów
  const selectAllAvailableStudents = () => {
    setSelectedStudentsToAdd(filteredAvailableStudents.map(student => student.uid));
  };

  const deselectAllStudents = () => {
    setSelectedStudentsToAdd([]);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentsToAdd(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Usuwanie ucznia z kursu
  const handleRemoveStudent = async (studentId: string) => {
    if (!courseId) return;
    
    try {
      const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
      if (!courseDoc.exists()) return;
      
      const courseData = courseDoc.data();
      const currentAssignedUsers = courseData.assignedUsers || [];
      
      // Usuń ucznia z listy
      const updatedAssignedUsers = currentAssignedUsers.filter((user: string) => {
        // Sprawdź czy to UID czy email
        if (user.includes('@')) {
          // To email - znajdź ucznia i porównaj UID
          const student = assignedUsers.find(s => s.uid === studentId);
          return student && student.email !== user;
        } else {
          // To UID - porównaj bezpośrednio
          return user !== studentId;
        }
      });
      
      // Zaktualizuj kurs
      await updateDoc(doc(db, "courses", String(courseId)), {
        assignedUsers: updatedAssignedUsers
      });
      
      // Odśwież listę przypisanych uczniów
      setAssignedUsers(prev => prev.filter(u => u.uid !== studentId));
      setSuccess('Uczeń został usunięty z kursu!');
      
      // Wyczyść komunikat po 3 sekundach
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error removing student:', error);
      setError('Błąd podczas usuwania ucznia z kursu');
    }
  };

  // Dodawanie wielu uczniów na raz
  const handleAddSelectedStudents = async () => {
    if (!courseId || selectedStudentsToAdd.length === 0) return;
    
    try {
      const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
      if (!courseDoc.exists()) {
        setError('Kurs nie został znaleziony');
        return;
      }
      
      const courseData = courseDoc.data();
      const currentAssignedUsers = courseData.assignedUsers || [];
      
      // Pobierz dane wybranych uczniów
      const studentsToAdd = students.filter(s => selectedStudentsToAdd.includes(s.uid));
      
      // Dodaj uczniów do kursu (używając emaili)
      const newAssignedUsers = [...currentAssignedUsers];
      studentsToAdd.forEach(student => {
        if (!currentAssignedUsers.includes(student.email)) {
          newAssignedUsers.push(student.email);
        }
      });
      
      // Zaktualizuj kurs
      await updateDoc(doc(db, "courses", String(courseId)), {
        assignedUsers: newAssignedUsers
      });
      
      // Odśwież listę przypisanych uczniów
      const updatedAssignedUsersList = await Promise.all(
        newAssignedUsers.map(async (userIdentifier: string) => {
          try {
            let userDoc;
            if (userIdentifier.includes('@')) {
              const usersQuery = query(collection(db, "users"), where("email", "==", userIdentifier));
              const userSnapshot = await getDocs(usersQuery);
              if (!userSnapshot.empty) {
                userDoc = userSnapshot.docs[0];
              }
            } else {
              userDoc = await getDoc(doc(db, "users", userIdentifier));
            }
            
            if (userDoc && userDoc.exists()) {
              const userData = userDoc.data() as { firstName?: string; lastName?: string; email?: string; };
              return {
                uid: userDoc.id,
                displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || userIdentifier,
                email: userData.email || userIdentifier,
                role: 'student',
                is_active: true
              };
            } else {
              return {
                uid: userIdentifier,
                displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
                email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@example.com`,
                role: 'student',
                is_active: true
              };
            }
          } catch (error) {
            console.error('Error fetching user data for:', userIdentifier, error);
            return {
              uid: userIdentifier,
              displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
              email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@example.com`,
              role: 'student',
              is_active: true
            };
          }
        })
      );
      
      setAssignedUsers(updatedAssignedUsersList);
      setSelectedStudentsToAdd([]);
      setStudentSearchTerm('');
      setSuccess(`Dodano ${studentsToAdd.length} uczniów do kursu!`);
      
      // Wyczyść komunikat po 3 sekundach
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding students:', error);
      setError('Błąd podczas dodawania uczniów do kursu');
    }
  };

  // Assign student to course using Firestore
  const handleAssignStudent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !courseId) return;
    
    try {
      console.log('Assigning student to course:', selectedStudent, courseId);
      
      // Pobierz kurs z Firestore
      const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
      
      if (!courseDoc.exists()) {
        setError('Kurs nie został znaleziony');
        return;
      }
      
      const courseData = courseDoc.data();
      const assignedUsers = courseData.assignedUsers || [];
      
      // Sprawdź czy student już jest przypisany
      if (assignedUsers.includes(selectedStudent)) {
        setError('Student jest już przypisany do tego kursu');
        return;
      }
      
      // Dodaj studenta do listy przypisanych użytkowników
      assignedUsers.push(selectedStudent);
      
      // Zaktualizuj kurs w Firestore
      await updateDoc(doc(db, "courses", String(courseId)), {
        assignedUsers: assignedUsers
      });
      
      console.log('Student assigned successfully to Firestore');
      setSuccess('Uczeń został przypisany do kursu!');
      setSelectedStudent("");
      
      // Refresh assigned users from Firestore
      console.log('Refreshing assigned users from Firestore after assignment...');
      
      // Pobierz zaktualizowane dane z Firestore
      const updatedCourseDoc = await getDoc(doc(db, "courses", String(courseId)));
        
      if (updatedCourseDoc.exists()) {
        const updatedCourseData = updatedCourseDoc.data();
        console.log('Updated course data from Firestore:', updatedCourseData);
          
        // Pobierz zaktualizowanych przypisanych użytkowników
        const assignedUsersFromFirestore = updatedCourseData.assignedUsers || [];
        console.log('Updated assignedUsers from Firestore:', assignedUsersFromFirestore);
          
        // Pobierz pełne dane użytkowników z kolekcji "users"
        const assignedUsersList = await Promise.all(
          assignedUsersFromFirestore.map(async (userIdentifier: string) => {
            try {
              // Sprawdź czy to email czy UID
              let userDoc;
              if (userIdentifier.includes('@')) {
                // To email - znajdź użytkownika po email
                const usersQuery = query(collection(db, "users"), where("email", "==", userIdentifier));
                const userSnapshot = await getDocs(usersQuery);
                if (!userSnapshot.empty) {
                  userDoc = userSnapshot.docs[0];
                }
              } else {
                // To UID - pobierz bezpośrednio
                userDoc = await getDoc(doc(db, "users", userIdentifier));
              }
                
                              if (userDoc && userDoc.exists()) {
                  const userData = userDoc.data() as { firstName?: string; lastName?: string; email?: string; };
                  return {
                  uid: userDoc.id,
                  displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || userIdentifier,
                  email: userData.email || userIdentifier,
                  role: 'student',
                  is_active: true
                };
              } else {
                // Fallback jeśli nie znaleziono użytkownika
                return {
                  uid: userIdentifier,
                  displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
                  email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@example.com`,
                  role: 'student',
                  is_active: true
                };
              }
            } catch (error) {
              console.error('Error fetching user data for:', userIdentifier, error);
              // Fallback
              return {
                uid: userIdentifier,
                displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
                email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@example.com`,
                role: 'student',
                is_active: true
              };
            }
          })
        );
          
        console.log('Updated assigned users list:', assignedUsersList);
        setAssignedUsers(assignedUsersList);
          
        // Dodaj timeout aby komunikat sukcesu był widoczny
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        console.error('Course document not found in Firestore after assignment');
      }
    } catch (error) {
      console.error('Error assigning student:', error);
      setError('Błąd podczas przypisywania ucznia do kursu');
      setTimeout(() => setError(null), 3000);
    }
  }, [selectedStudent, courseId, setError, setSuccess, setAssignedUsers]);

  useEffect(() => {
    if (!courseId) return;
    const fetchFirestoreCourse = async () => {
      setLoading(true);
      try {
        console.log('Fetching course from Firestore for courseId:', courseId);
        const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
        if (courseDoc.exists()) {
          const data = courseDoc.data();
          console.log('Course data loaded from Firestore:', data);
          setCourse(data as Course);
          setSections(data.sections || []);
          setBannerUrl(data.bannerUrl || "");
          
          // Inicjalizuj sectionContents z danymi z sekcji
          const sectionsData = data.sections || [];
          const initialSectionContents: {[id:number]: SectionContent[]} = {};
          sectionsData.forEach((section: Section) => {
            if (section.contents && Array.isArray(section.contents)) {
              initialSectionContents[Number(section.id)] = section.contents;
              console.log(`Section ${section.id} contents loaded:`, section.contents);
            }
          });
          setSectionContents(initialSectionContents);
          console.log('Initial sectionContents set:', initialSectionContents);
        } else {
          console.log('Course document does not exist in Firestore');
        }
      } catch (err) {
        console.error('Error fetching course from Firestore:', err);
        setError("Failed to load course details from Firestore");
      } finally {
        setLoading(false);
      }
    };
    fetchFirestoreCourse();
  }, [courseId, setLoading, setError, setCourse, setSections, setBannerUrl, setSectionContents]);



  // Live update for countdowns
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(x => x + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Debug useEffect
  useEffect(() => {
    console.log('Sections state changed:', sections);
    console.log('SectionContents state changed:', sectionContents);
  }, [sections, sectionContents]);

  // Dodaj helper do zapisu sekcji do Firestore
  const saveSectionsToFirestore = useCallback(async (courseId: string | string[], sections: Section[]) => {
    if (!courseId) return;
    
    // Filtruj undefined wartości z sekcji
    const cleanSections = sections.map(section => {
      const cleanSection: Partial<Section> = {};
      Object.keys(section).forEach(key => {
        const value = (section as Record<string, unknown>)[key];
        if (value !== undefined) {
          cleanSection[key] = value;
        }
      });
      return cleanSection;
    });
    
    console.log('Saving sections to Firestore:', cleanSections);
    const courseRef = doc(db, "courses", String(courseId));
    
    // Sprawdź czy dokument istnieje
    const courseDoc = await getDoc(courseRef);
    if (courseDoc.exists()) {
      await updateDoc(courseRef, { sections: cleanSections });
      console.log('Sections updated successfully in Firestore');
    } else {
      // Jeśli dokument nie istnieje, utwórz go z sekcjami
      await setDoc(courseRef, { sections: cleanSections }, { merge: true });
      console.log('Course document created with sections in Firestore');
    }
  }, []);

  // Helper function to refresh data from Firestore
  const refreshCourseData = useCallback(async () => {
    if (!courseId) return;
    console.log('Refreshing course data for courseId:', courseId);
    const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
    if (courseDoc.exists()) {
      const data = courseDoc.data();
      console.log('Course data from Firestore:', data);
      console.log('Sections from Firestore:', data.sections);
      if (data.sections) {
        data.sections.forEach((section: any, index: number) => {
          console.log(`Section ${index}:`, section);
          if (section.subsections) {
            section.subsections.forEach((subsection: any, subIndex: number) => {
              console.log(`  Subsection ${subIndex}:`, subsection);
              if (subsection.materials) {
                console.log(`    Materials:`, subsection.materials);
              }
            });
          }
        });
      }
      setSections(data.sections || []);
      
      // Update banner URL
      if (data.bannerUrl) {
        setBannerUrl(data.bannerUrl);
        console.log('Banner URL refreshed:', data.bannerUrl);
      }
      
      // Aktualizuj sectionContents
      const sectionsData = data.sections || [];
      const updatedSectionContents: {[id:number]: SectionContent[]} = {};
      sectionsData.forEach((section: Section) => {
        if (section.contents && Array.isArray(section.contents)) {
          updatedSectionContents[Number(section.id)] = section.contents;
          console.log(`Section ${section.id} contents:`, section.contents);
        }
      });
      setSectionContents(updatedSectionContents);
      console.log('Updated sectionContents:', updatedSectionContents);
    } else {
      console.log('Course document does not exist in Firestore');
    }
  }, [courseId]);

  // Add new section
  const handleAddSection = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.name) return;
    const id = Date.now();
    const baseSection = {
      id,
      name: newSection.name,
      title: newSection.name, // Dodajemy title jako kopię name
      type: newSection.type as "material" | "assignment" | "form",
      deadline: newSection.deadline || undefined,
      contents: []
    };
    // Dodaj submissions: [] tylko dla zadania
    const sectionWithSubmissions = newSection.type === 'assignment'
      ? { ...baseSection, submissions: [] }
      : baseSection;
    const newSections = [...sections, sectionWithSubmissions];
    setSections(newSections);
    setShowSection(s => ({...s, [id]: true}));
    setNewSection({name: '', type: 'material'});
    setAddingSection(false);
    
    // Zapisz do Firestore
    if (courseId) {
      console.log('Saving new section to Firestore:', sectionWithSubmissions);
      await saveSectionsToFirestore(courseId, newSections);
      console.log('New section saved, refreshing data...');
      await refreshCourseData();
      
      // Automatycznie utwórz event w kalendarzu dla zadań i egzaminów
      if ((newSection.type === 'assignment' || newSection.type === 'form') && newSection.deadline && user?.uid) {
        await createCalendarEvent(sectionWithSubmissions, courseId, user.uid);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, courseId, newSection, user, saveSectionsToFirestore, refreshCourseData]);

  // Add content to section
  const handleAddContent = useCallback(async (sectionId: number, e: React.FormEvent) => {
    e.preventDefault();
    const content = newContent[Number(sectionId)];
    const text = content.text || '';
    if (!content || (!content.file && !content.link && !text)) return;
    
    let fileUrl = '';
    
    // Upload file to Firebase Storage if file exists
    if (content.file) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `courses/${courseId}/sections/${sectionId}/${Date.now()}_${content.file.name}`);
        await uploadBytes(storageRef, content.file);
        fileUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Błąd podczas uploadu pliku');
        return;
      }
    }
    
    const newContentItem = { 
      id: Date.now(),
      type: 'material', // Dodaj wymagane type
      name: content.name || '',
      fileUrl: fileUrl || null, // Save the Firebase Storage URL
      link: content.link || null,
      text: text || null
    };
    
    const updatedSectionContents = {
      ...sectionContents,
      [Number(sectionId)]: [...(sectionContents[Number(sectionId)] || []), newContentItem]
    };
    
    setSectionContents(updatedSectionContents);
    setNewContent(nc => ({...nc, [Number(sectionId)]: {name: '', file: null, link: '', text: ''}}));
    
    // Aktualizuj sekcje w Firestore z nowymi materiałami
    if (courseId) {
      console.log('Saving content to Firestore for sectionId:', sectionId);
      console.log('Updated sectionContents:', updatedSectionContents);
      console.log('Current sections:', sections);
      
      const updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { ...section, contents: updatedSectionContents[sectionId] }
          : section
      );
      console.log('Updated sections to save:', updatedSections);
      
      await saveSectionsToFirestore(courseId, updatedSections);
      console.log('Sections saved to Firestore, refreshing data...');
      await refreshCourseData();
    }
  }, [sectionContents, newContent, courseId, sections, saveSectionsToFirestore, refreshCourseData]);

  // Banner upload handler
  const handleBannerChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        console.log('Uploading banner file:', file.name);
        
        // Upload file to Firebase Storage
        const storage = getStorage();
        const storageRef = ref(storage, `courses/${courseId}/banner/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);
        
        console.log('Banner uploaded successfully:', fileUrl);
        setBannerUrl(fileUrl);
        
        // Save banner URL to Firestore
        if (courseId) {
          const courseRef = doc(db, "courses", String(courseId));
          await updateDoc(courseRef, { bannerUrl: fileUrl });
          console.log('Banner URL saved to Firestore');
          
          // Refresh course data to ensure banner is loaded correctly
          await refreshCourseData();
          
          // Also update local course state
          setCourse(prev => prev ? { ...prev, bannerUrl: fileUrl } : null);
        }
      } catch (error) {
        console.error('Error uploading banner:', error);
        alert('Błąd podczas uploadu banera');
      }
    }
  }, [courseId, refreshCourseData]);

  // Edit course description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const handleEditDescription = useCallback(() => {
    setEditedDescription(course?.description || '');
    setIsEditingDescription(true);
  }, [course]);

  const handleSaveDescription = useCallback(async () => {
    if (!courseId || !editedDescription.trim()) return;
    
    try {
      const courseRef = doc(db, "courses", String(courseId));
      await updateDoc(courseRef, { description: editedDescription.trim() });
      
      // Update local state
      setCourse(prev => prev ? { ...prev, description: editedDescription.trim() } : null);
      setIsEditingDescription(false);
      
      console.log('Course description updated successfully');
    } catch (error) {
      console.error('Error updating course description:', error);
      alert('Błąd podczas aktualizacji opisu kursu');
    }
  }, [courseId, editedDescription]);

  const handleCancelDescription = useCallback(() => {
    setIsEditingDescription(false);
    setEditedDescription('');
  }, []);


  // Rozpocznij edycję sekcji
  const handleEditSection = useCallback((section: Section) => {
          setEditingSectionId(Number(section.id));
    setEditSection({ ...section });
  }, []);

  // Zapisz edycję sekcji
  const handleSaveEditSection = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const updatedSections = sections.map(s => s.id === editingSectionId ? { ...s, ...editSection } : s);
          setSections(updatedSections as Section[]);
    setEditingSectionId(null);
    setEditSection(null);
    if (courseId) saveSectionsToFirestore(courseId, updatedSections);
  }, [sections, editingSectionId, editSection, courseId, saveSectionsToFirestore]);

  // Anuluj edycję
  const handleCancelEdit = useCallback(() => {
    setEditingSectionId(null);
    setEditSection(null);
    // Jeśli chcesz obsłużyć usuwanie, dodaj tu logikę i zapis do Firestore
  }, []);

  // Rozpocznij edycję materiału
  const handleEditContent = useCallback((content: SectionContent) => {
    setEditingContentId(Number(content.id));
    setEditContent({ ...content });
  }, []);

  // Zapisz edycję materiału
  const handleSaveEditContent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContentId || !editContent) return;
    
    // Znajdź sekcję zawierającą edytowany materiał
    const sectionId = Object.keys(sectionContents).find(key => 
      sectionContents[parseInt(key)].some((item: SectionContent) => String(item.id) === String(editingContentId))
    );
    
    if (!sectionId) return;
    
    const updatedSectionContents = {
      ...sectionContents,
      [parseInt(sectionId)]: sectionContents[parseInt(sectionId)].map((item: SectionContent) => 
        String(item.id) === String(editingContentId) ? { ...item, ...editContent } : item
      )
    };
    
    setSectionContents(updatedSectionContents);
    setEditingContentId(null);
    setEditContent(null);
    
    // Zapisz do Firestore
    if (courseId) {
      const updatedSections = sections.map(section => 
        section.id === parseInt(sectionId)
          ? { ...section, contents: updatedSectionContents[parseInt(sectionId)] }
          : section
      );
      await saveSectionsToFirestore(courseId, updatedSections);
      await refreshCourseData();
    }
  }, [editingContentId, editContent, sectionContents, courseId, sections, saveSectionsToFirestore, refreshCourseData]);

  // Anuluj edycję materiału
  const handleCancelEditContent = useCallback(() => {
    setEditingContentId(null);
    setEditContent(null);
  }, []);



  // Function to create calendar event for assignments/exams
  const createCalendarEvent = useCallback(async (section: { name: string; type: string; id: number; deadline?: string; }, courseId: string | string[], teacherUid: string) => {
    try {
      console.log('Creating calendar event for section:', section);
      console.log('Course ID:', courseId);
      console.log('Teacher UID:', teacherUid);
      
      // Get assigned students for this course
      const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
      if (!courseDoc.exists()) {
        console.log('Course document does not exist');
        return;
      }
      
      const courseData = courseDoc.data();
      const assignedUids = Array.isArray(courseData.assignedUsers) ? courseData.assignedUsers : [];
      
      console.log('Assigned students:', assignedUids);
      console.log('Course data:', courseData);
      
      // Create event in calendar collection
      const eventData = {
        title: section.name,
        type: section.type === 'assignment' ? 'assignment' : section.type === 'exam' ? 'exam' : 'activity',
        courseId: String(courseId),
        sectionId: section.id,
        deadline: section.deadline,
        createdBy: teacherUid,
        students: assignedUids, // All students assigned to this course
        description: `${section.type === 'exam' ? 'Egzamin' : 'Zadanie'} z kursu: ${courseData.title || 'Kurs'}`,
        createdAt: new Date().toISOString()
      };
      
      console.log('Event data to be created:', eventData);
      
      const docRef = await addDoc(collection(db, "events"), eventData);
      
      console.log('Calendar event created successfully with ID:', docRef.id);
      console.log('Calendar event created for section:', section.name);
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }
  }, []);

  // Add delete handlers:
  const handleDeleteSection = async (sectionId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę sekcję?')) return;
    
    console.log('Deleting section with ID:', sectionId);
    console.log('Current sections:', sections);
    console.log('Section IDs:', sections.map(s => ({ id: s.id, type: typeof s.id })));
    
    const newSections = sections.filter(s => {
      const sectionIdNum = Number(s.id);
      const shouldKeep = sectionIdNum !== sectionId;
      console.log(`Section ${s.id} (${typeof s.id}) -> ${sectionIdNum} !== ${sectionId} = ${shouldKeep}`);
      return shouldKeep;
    });
    
    console.log('New sections after deletion:', newSections);
    setSections(newSections);
    
    // On any change to sections or banner, update Firestore
    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      await updateDoc(courseRef, { sections: newSections });
      await refreshCourseData();
    }
  };

  const handleDeleteContent = async (sectionId: number, contentId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten materiał?')) return;
    
    // Aktualizuj sectionContents
    const updatedSectionContents = {
      ...sectionContents,
      [sectionId]: (sectionContents[sectionId] || []).filter((item: SectionContent) => item.id !== contentId)
    };
    setSectionContents(updatedSectionContents);
    
    // Aktualizuj sekcje w Firestore
    const newSections = sections.map(s =>
      s.id === sectionId
        ? { ...s, contents: updatedSectionContents[sectionId] }
        : s
    );
    setSections(newSections);
    
    // Zapisz do Firestore
    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      updateDoc(courseRef, { sections: newSections });
      await refreshCourseData();
    }
  };

  // Nowe funkcje dla podsekcji
  const handleAddSubsection = async (sectionId: number) => {
    if (!newSubsection.name.trim()) return;
    
    const subsectionId = Date.now();
    const newSubsectionData: Subsection = {
      id: subsectionId,
      name: newSubsection.name.trim(),
      description: newSubsection.description.trim() || undefined,
      sectionId: sectionId,
      materials: [],
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || ''
    };

    const newSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            subsections: [...(section.subsections || []), newSubsectionData]
          }
        : section
    );

    setSections(newSections);
    setNewSubsection({name: '', description: ''});
    setAddingSubsection(null);

    // Funkcja do usuwania undefined wartości
    const cleanData = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map(cleanData).filter(item => item !== null && item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanData(value);
          }
        }
        return cleaned;
      }
      return obj;
    };

    // Zapisz do Firestore
    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      const cleanedSections = cleanData(newSections);
      await updateDoc(courseRef, { sections: cleanedSections });
      await refreshCourseData();
    }
  };

  const handleDeleteSubsection = async (sectionId: number, subsectionId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę podsekcję?')) return;
    
    const newSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            subsections: (section.subsections || []).filter(sub => sub.id !== subsectionId)
          }
        : section
    );

    setSections(newSections);

    // Funkcja do usuwania undefined wartości
    const cleanData = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map(cleanData).filter(item => item !== null && item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanData(value);
          }
        }
        return cleaned;
      }
      return obj;
    };

    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      const cleanedSections = cleanData(newSections);
      await updateDoc(courseRef, { sections: cleanedSections });
      await refreshCourseData();
    }
  };

  // Funkcja do otwierania edycji podsekcji
  const openEditSubsection = (subsection: Subsection) => {
    setEditSubsection({
      name: subsection.name,
      description: subsection.description || ''
    });
    setEditingSubsection(subsection.id as number);
  };

  // Funkcja do anulowania edycji podsekcji
  const cancelEditSubsection = () => {
    setEditingSubsection(null);
    setEditSubsection({name: '', description: ''});
  };

  // Nowa funkcja do edycji podsekcji
  const handleEditSubsection = async (sectionId: number, subsectionId: number, newName: string, newDescription: string) => {
    if (!newName.trim()) return;
    
    const newSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            subsections: (section.subsections || []).map(sub => 
              sub.id === subsectionId
                ? {
                    ...sub,
                    name: newName.trim(),
                    description: newDescription.trim() || undefined,
                    updatedAt: new Date().toISOString()
                  }
                : sub
            )
          }
        : section
    );

    setSections(newSections);
    setEditingSubsection(null);
    setEditSubsection({name: '', description: ''});

    // Funkcja do usuwania undefined wartości
    const cleanData = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map(cleanData).filter(item => item !== null && item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanData(value);
          }
        }
        return cleaned;
      }
      return obj;
    };

    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      const cleanedSections = cleanData(newSections);
      await updateDoc(courseRef, { sections: cleanedSections });
      await refreshCourseData();
    }
  };

  // Nowe funkcje dla materiałów
  const handleAddMaterial = async (subsectionId: number) => {
    // Walidacja formularza
    if (!newMaterial.title.trim()) {
      alert('Podaj tytuł materiału');
      return;
    }

    if (newMaterial.type === 'video') {
      if (newMaterial.videoSource === 'upload' && !newMaterial.video) {
        alert('Wybierz plik wideo lub zmień źródło na YouTube');
        return;
      }
      if (newMaterial.videoSource === 'youtube' && !newMaterial.youtubeUrl?.trim()) {
        alert('Podaj link do filmu YouTube');
        return;
      }
    }

    if (newMaterial.type === 'file' && !newMaterial.file) {
      alert('Wybierz plik do wgrania');
      return;
    }
    
    const materialId = Date.now();
    let fileUrl = '';
    let videoUrl = '';
    
    // Upload file if provided
    if (newMaterial.file) {
      const storage = getStorage();
      const fileRef = ref(storage, `courses/${courseId}/materials/${materialId}_${newMaterial.file.name}`);
      const snapshot = await uploadBytes(fileRef, newMaterial.file);
      fileUrl = await getDownloadURL(snapshot.ref);
    }

    // Upload video if provided
    if (newMaterial.video) {
      const storage = getStorage();
      const videoRef = ref(storage, `courses/${courseId}/videos/${materialId}_${newMaterial.video.name}`);
      const snapshot = await uploadBytes(videoRef, newMaterial.video);
      videoUrl = await getDownloadURL(snapshot.ref);
    }

    const newMaterialData: Material = {
      id: materialId,
      title: newMaterial.title.trim(),
      description: newMaterial.description.trim() || undefined,
      type: newMaterial.type,
      subsectionId: subsectionId,
      order: 0,
      deadline: newMaterial.deadline || undefined,
      fileUrl: fileUrl || undefined,
      videoUrl: videoUrl || undefined,
      youtubeUrl: newMaterial.youtubeUrl?.trim() || undefined,
      content: newMaterial.content || undefined,
      questions: newMaterial.type === 'exam' ? [] : undefined,
      quizId: newMaterial.type === 'quiz' ? newMaterial.quizId : undefined,
      submissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || ''
    };

    // Find section and subsection to update
    const newSections = sections.map(section => {
      if (section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(subsection =>
            subsection.id === subsectionId
              ? {
                  ...subsection,
                  materials: [...(subsection.materials || []), newMaterialData]
                }
              : subsection
          )
        };
      }
      return section;
    });

    setSections(newSections);
            setNewMaterial({
          title: '',
          description: '',
          type: 'text',
          deadline: '',
          content: '',
          file: null,
          video: null,
          youtubeUrl: '',
          videoSource: 'upload',
          quizId: ''
        });
    setAddingMaterial(null);

    // Funkcja do usuwania undefined wartości
    const cleanData = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map(cleanData).filter(item => item !== null && item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanData(value);
          }
        }
        return cleaned;
      }
      return obj;
    };

    // Zapisz do Firestore
    if (courseId) {
      console.log('CourseId:', courseId, 'Type:', typeof courseId);
      const courseRef = doc(db, "courses", String(courseId));
      console.log('Saving to Firestore - courseRef:', courseRef);
      console.log('Saving to Firestore - newSections (before cleaning):', newSections);
      
      // Oczyść dane z undefined wartości
      const cleanedSections = cleanData(newSections);
      console.log('Saving to Firestore - cleanedSections:', cleanedSections);
      try {
        // Sprawdź czy dokument istnieje
        const docSnapshot = await getDoc(courseRef);
        console.log('Document exists:', docSnapshot.exists());
        console.log('Document data:', docSnapshot.data());
        
        if (docSnapshot.exists()) {
          await updateDoc(courseRef, { sections: cleanedSections });
          console.log('✅ Material saved to Firestore successfully with updateDoc');
        } else {
          // Jeśli dokument nie istnieje, utwórz go
          await setDoc(courseRef, { sections: cleanedSections }, { merge: true });
          console.log('✅ Material saved to Firestore successfully with setDoc');
        }
        
        console.log('Material saved to Firestore:', newMaterialData);
        console.log('Updated sections:', newSections);
      } catch (error) {
        console.error('❌ Error saving to Firestore:', error);
        console.error('Error details:', error);
        alert(`Błąd podczas zapisywania materiału: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      await refreshCourseData();
    }
  };

  const handleDeleteMaterial = async (sectionId: number, subsectionId: number, materialId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten materiał?')) return;
    
    const newSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            subsections: (section.subsections || []).map(subsection =>
              subsection.id === subsectionId
                ? {
                    ...subsection,
                    materials: subsection.materials.filter(mat => mat.id !== materialId)
                  }
                : subsection
            )
          }
        : section
    );

    setSections(newSections);

    // Funkcja do usuwania undefined wartości
    const cleanData = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map(cleanData).filter(item => item !== null && item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanData(value);
          }
        }
        return cleaned;
      }
      return obj;
    };

    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      const cleanedSections = cleanData(newSections);
      await updateDoc(courseRef, { sections: cleanedSections });
      await refreshCourseData();
    }
  };

  // Add loading and auth checks at the top
  if (authLoading || !user) {
    return <div className="p-8 text-center text-lg text-gray-500">Ładowanie danych użytkownika...</div>;
  }

  if (loading) return <div className="p-8">Ładowanie...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!course) return <div className="p-8">Nie znaleziono kursu.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/homelogin'}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </button>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {course?.title || 'Szczegóły kursu'}
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full py-2 px-2 sm:px-4">
        {/* BANNER - FULL WIDTH */}
      <div className="w-full mb-4 relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-[#4067EC] to-[#7aa2f7] flex items-center justify-between h-48 sm:h-56">
        <div className="p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg mb-2">{course?.title || 'Tytuł kursu'}</h1>
          
          {/* Editable description */}
          {isEditingDescription ? (
            <div className="mb-4">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full p-2 rounded border-2 border-white/30 bg-white/20 text-white placeholder-white/70 resize-none"
                placeholder="Opis kursu"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveDescription}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                >
                  Zapisz
                </button>
                <button
                  onClick={handleCancelDescription}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-white text-lg font-medium drop-shadow mb-2">
                {course?.description || 'Opis kursu'}
              </p>
              <button
                onClick={handleEditDescription}
                className="text-white/80 hover:text-white text-sm underline"
              >
                Edytuj opis
              </button>
            </div>
          )}
          
          <label className="mt-4 inline-flex items-center gap-2 cursor-pointer bg-white/20 px-3 py-2 rounded-lg text-white font-semibold hover:bg-white/40 transition">
            <FaImage />
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            Zmień baner kursu
          </label>
        </div>
        <div className="hidden sm:block h-full">
          {bannerUrl ? (
            <Image src={bannerUrl} alt="Baner kursu" width={500} height={300} className="object-contain h-full w-auto opacity-80" />
          ) : (
            <Image src="/puzzleicon.png" alt="Baner kursu" width={180} height={180} className="object-contain h-full w-auto opacity-60" />
          )}
        </div>
      </div>

      {/* Dodaj sekcję przypisywania uczniów pod banerem: */}
      <div className="w-full mb-4 bg-white rounded-2xl shadow-lg p-4 lg:p-6">
        <h3 className="text-lg font-bold mb-2 text-[#4067EC]">Zarządzanie uczniami kursu</h3>
        
        {/* Aktualnie przypisani uczniowie - SCHOWANA LISTA */}
        <div className="mb-6">
          <button
            onClick={() => setShowAssignedStudents(!showAssignedStudents)}
            className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <h4 className="text-md font-semibold text-gray-700">
              Przypisani uczniowie ({assignedUsers?.length || 0})
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {showAssignedStudents ? 'Ukryj' : 'Pokaż'}
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${showAssignedStudents ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {/* Schowana lista uczniów */}
          {showAssignedStudents && (
            <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200">
              {Array.isArray(assignedUsers) && assignedUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignedUsers.map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{u.displayName || u.email}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(u.uid)}
                        className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Usuń z kursu"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Brak przypisanych uczniów
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dodawanie nowych uczniów */}
        <div className="border-t pt-6">
          <h4 className="text-md font-semibold mb-4 text-gray-700">Dodaj nowych uczniów</h4>
          
          {/* Wyszukiwarka uczniów */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Wyszukaj uczniów po imieniu, nazwisku lub emailu..."
                value={studentSearchTerm}
                onChange={e => setStudentSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-all"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Przyciski zarządzania */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={selectAllAvailableStudents}
              className="px-4 py-2 bg-[#4067EC] text-white text-sm font-medium rounded-lg hover:bg-[#3155d4] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Zaznacz wszystkich dostępnych
            </button>
            <button
              type="button"
              onClick={deselectAllStudents}
              className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Odznacz wszystkich
            </button>
          </div>

          {/* Lista dostępnych uczniów z checkboxami */}
          <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
            {filteredAvailableStudents.length > 0 ? (
              <div className="space-y-3">
                {filteredAvailableStudents.map(student => (
                  <label key={student.uid} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#4067EC] hover:bg-[#F1F4FE] transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudentsToAdd.includes(student.uid)}
                      onChange={() => toggleStudentSelection(student.uid)}
                      className="w-4 h-4 text-[#4067EC] border-gray-300 rounded focus:ring-[#4067EC] focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{student.displayName || 'Brak nazwy'}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {selectedStudentsToAdd.includes(student.uid) ? '✓ Zaznaczony' : '○ Niezaznaczony'}
                    </div>
                  </label>
                ))}
              </div>
            ) : studentSearchTerm ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Brak wyników dla: &quot;{studentSearchTerm}&quot;
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Brak dostępnych uczniów do dodania
              </div>
            )}
          </div>

          {/* Licznik i przycisk dodawania */}
          {filteredAvailableStudents.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Zaznaczono: <span className="font-semibold text-[#4067EC]">{selectedStudentsToAdd.length}</span> z <span className="font-semibold">{filteredAvailableStudents.length}</span> dostępnych uczniów
              </div>
              <button
                onClick={handleAddSelectedStudents}
                disabled={selectedStudentsToAdd.length === 0}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Dodaj zaznaczonych ({selectedStudentsToAdd.length})
              </button>
            </div>
          )}

          {/* Komunikaty */}
          {success && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* DODAJ SEKCJĘ */}
      <div className="w-full mb-4 flex justify-end">
        {!addingSection ? (
          <button onClick={() => setAddingSection(true)} className="flex items-center gap-2 bg-[#4067EC] text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-[#3155d4] transition">
            <FaPlus /> Dodaj sekcję
          </button>
        ) : (
          <form onSubmit={handleAddSection} className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <input type="text" placeholder="Nazwa sekcji" className="border rounded px-3 py-2" value={newSection.name} onChange={e => setNewSection(s => ({...s, name: e.target.value}))} required />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex flex-col items-center px-2 py-1 rounded border transition focus:outline-none ${newSection.type === 'material' ? 'text-[#4067EC] border-[#4067EC] font-bold' : 'text-gray-700 border-gray-300'} bg-transparent hover:bg-transparent`}
                  onClick={() => setNewSection(s => ({...s, type: 'material'}))}
                  title="Materiał"
                  style={{minWidth: 48}}
                >
                  <FaFileAlt className="text-lg mb-0.5" />
                  <span className="text-[10px] font-medium leading-tight">Materiał</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center px-2 py-1 rounded border transition focus:outline-none ${newSection.type === 'assignment' ? 'text-[#4067EC] border-[#4067EC] font-bold' : 'text-gray-700 border-gray-300'} bg-transparent hover:bg-transparent`}
                  onClick={() => setNewSection(s => ({...s, type: 'assignment'}))}
                  title="Zadanie"
                  style={{minWidth: 48}}
                >
                  <FaClipboardList className="text-lg mb-0.5" />
                  <span className="text-[10px] font-medium leading-tight">Zadanie</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center px-2 py-1 rounded border transition focus:outline-none ${newSection.type === 'exam' ? 'text-[#4067EC] border-[#4067EC] font-bold' : 'text-gray-700 border-gray-300'} bg-transparent hover:bg-transparent`}
                  onClick={() => setNewSection(s => ({...s, type: 'exam'}))}
                  title="Egzamin"
                  style={{minWidth: 48}}
                >
                  <FaGraduationCap className="text-lg mb-0.5" />
                  <span className="text-[10px] font-medium leading-tight">Egzamin</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center px-2 py-1 rounded border transition focus:outline-none ${newSection.type === 'aktywnosc' ? 'text-[#4067EC] border-[#4067EC] font-bold' : 'text-gray-700 border-gray-300'} bg-transparent hover:bg-transparent`}
                  onClick={() => setNewSection(s => ({...s, type: 'aktywnosc'}))}
                  title="Aktywność"
                  style={{minWidth: 48}}
                >
                  <FaUsers className="text-lg mb-0.5" />
                  <span className="text-[10px] font-medium leading-tight">Aktywność</span>
                </button>
              </div>
              <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Dodaj</button>
              <button type="button" className="bg-gray-200 px-4 py-2 rounded font-semibold" onClick={() => setAddingSection(false)}>Anuluj</button>
            </div>
            {(newSection.type === 'assignment' || newSection.type === 'exam') && (
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <label className="text-sm font-medium text-gray-700">Termin {newSection.type === 'exam' ? 'egzaminu' : 'oddania'}:</label>
                <input 
                  type="datetime-local" 
                  className="border rounded px-3 py-2" 
                  value={newSection.deadline || ''} 
                  onChange={e => setNewSection(s => ({...s, deadline: e.target.value}))}
                  required
                />
              </div>
            )}
          </form>
        )}
      </div>

      {/* SEKCJE (Accordion) */}
      <div className="w-full space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200">
            <div 
              className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] hover:bg-gray-50 rounded-t-lg cursor-pointer"
              onClick={() => setShowSection(prev => ({...prev, [Number(section.id)]: !prev[Number(section.id)]}))}
            >
              <div className="flex items-center gap-3">
                <span>{showSection[Number(section.id)] ? <FaChevronUp /> : <FaChevronDown />}</span>
                <div>
                  <span>{section.name}</span>
                  <span className="text-base font-normal ml-2">({section.type})</span>
                  {section.type === 'assignment' && section.deadline && (
                    <span className="block text-sm font-normal text-gray-600">
                      Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    handleEditSection(section);
                  }} 
                  className="text-blue-500 hover:text-blue-700 text-xl bg-transparent border-none"
                >
                  ✏️
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSection(Number(section.id));
                  }} 
                  className="text-red-500 hover:text-red-700 text-2xl bg-transparent border-none"
                >
                  🗑️
                </button>
              </div>
            </div>

            {showSection[Number(section.id)] && (
              <div className="px-6 pb-6 border-t border-gray-200">
                {editingSectionId === section.id && (
                  <form onSubmit={handleSaveEditSection} className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-semibold text-blue-800 mb-3">Edytuj sekcję</h4>
                    <div className="flex flex-col sm:flex-row gap-2 items-center mb-3">
                      <input 
                        type="text" 
                        placeholder="Nazwa sekcji" 
                        className="border rounded px-3 py-2" 
                        value={editSection?.name || ''} 
                        onChange={e => setEditSection(prev => prev ? {...prev, name: e.target.value} : null)} 
                        required 
                      />
                      <select 
                        className="border rounded px-3 py-2" 
                        value={editSection?.type || ''} 
                        onChange={e => setEditSection(prev => prev ? {...prev, type: e.target.value as "material" | "assignment" | "form"} : null)}
                      >
                        <option value="material">Materiał</option>
                        <option value="assignment">Zadanie</option>
                        <option value="aktywnosc">Aktywność</option>
                      </select>
                      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-semibold">
                        Zapisz
                      </button>
                      <button type="button" onClick={handleCancelEdit} className="bg-gray-200 px-4 py-2 rounded font-semibold">
                        Anuluj
                      </button>
                    </div>
                    {editSection?.type === 'assignment' && (
                      <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <label className="text-sm font-medium text-gray-700">Termin oddania:</label>
                        <input 
                          type="datetime-local" 
                          className="border rounded px-3 py-2" 
                          value={editSection?.deadline || ''} 
                          onChange={e => setEditSection({...editSection, deadline: e.target.value})}
                          required
                        />
                      </div>
                    )}
                  </form>
                )}

                {/* Przycisk dodawania podsekcji */}
                <div className="mb-4">
                  <button
                    onClick={() => setAddingSubsection(Number(section.id))}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <FaPlus className="text-sm" />
                    Dodaj podsekcję
                  </button>
                </div>

                {/* Formularz dodawania podsekcji */}
                {addingSubsection === Number(section.id) && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                    <h4 className="font-semibold text-green-800 mb-3">Dodaj podsekcję</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nazwa podsekcji"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={newSubsection.name}
                        onChange={e => setNewSubsection(prev => ({...prev, name: e.target.value}))}
                      />
                      <textarea
                        placeholder="Opis podsekcji (opcjonalny)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={3}
                        value={newSubsection.description}
                        onChange={e => setNewSubsection(prev => ({...prev, description: e.target.value}))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddSubsection(Number(section.id))}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                          Dodaj
                        </button>
                        <button
                          onClick={() => {
                            setAddingSubsection(null);
                            setNewSubsection({name: '', description: ''});
                          }}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formularz edycji podsekcji */}
                {editingSubsection && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                    <h4 className="font-semibold text-yellow-800 mb-3">Edytuj podsekcję</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nazwa podsekcji"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={editSubsection.name}
                        onChange={e => setEditSubsection(prev => ({...prev, name: e.target.value}))}
                      />
                      <textarea
                        placeholder="Opis podsekcji (opcjonalny)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={3}
                        value={editSubsection.description}
                        onChange={e => setEditSubsection(prev => ({...prev, description: e.target.value}))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const section = sections.find(s => s.subsections?.some(sub => sub.id === editingSubsection));
                            if (section) {
                              handleEditSubsection(Number(section.id), editingSubsection, editSubsection.name, editSubsection.description);
                            }
                          }}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                        >
                          Zapisz
                        </button>
                        <button
                          onClick={cancelEditSubsection}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista podsekcji */}
                <div className="space-y-4 mb-4">
                  {(!section.subsections || section.subsections.length === 0) ? (
                    <div className="text-gray-400 italic">Brak podsekcji.</div>
                  ) : (
                    section.subsections.map((subsection) => (
                      <div key={subsection.id} className="bg-gray-50 rounded-lg border border-gray-200">
                        {/* Nagłówek podsekcji */}
                        <div 
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100"
                          onClick={() => setShowSubsection(prev => ({...prev, [Number(subsection.id)]: !prev[Number(subsection.id)]}))}
                        >
                          <div className="flex items-center gap-3">
                            <span>{showSubsection[Number(subsection.id)] ? <FaChevronUp /> : <FaChevronDown />}</span>
                            <div>
                              <h4 className="font-semibold text-gray-800">{subsection.name}</h4>
                              {subsection.description && (
                                <p className="text-sm text-gray-600">{subsection.description}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {subsection.materials.length} materiałów
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingMaterial(Number(subsection.id));
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Dodaj materiał"
                            >
                              <FaPlus />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSubsection(subsection);
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Edytuj podsekcję"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubsection(Number(section.id), Number(subsection.id));
                              }}
                              className="text-red-500 hover:text-red-700"
                              title="Usuń podsekcję"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Zawartość podsekcji */}
                        {showSubsection[Number(subsection.id)] && (
                          <div className="px-4 pb-4">
                            {/* Formularz dodawania materiału */}
                            {addingMaterial === Number(subsection.id) && (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                                <h5 className="font-semibold text-blue-800 mb-3">Dodaj materiał</h5>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                                    {[
                                      { type: 'text', label: 'Tekst', icon: '📄' },
                                      { type: 'file', label: 'Plik', icon: '📎' },
                                      { type: 'video', label: 'Video', icon: '🎥' },
                                      { type: 'task', label: 'Zadanie', icon: '📝' },
                                      { type: 'exam', label: 'Egzamin', icon: '🎓' },
                                      { type: 'activity', label: 'Aktywność', icon: '🎯' },
                                      { type: 'quiz', label: 'Quiz', icon: '❓' }
                                    ].map(({ type, label, icon }) => (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => setNewMaterial(prev => ({...prev, type: type as any}))}
                                        className={`p-2 rounded-lg border-2 transition-all ${
                                          newMaterial.type === type
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                      >
                                        <div className="text-lg mb-1">{icon}</div>
                                        <div className="text-xs font-medium">{label}</div>
                                      </button>
                                    ))}
                                  </div>
                                  
                                  <input
                                    type="text"
                                    placeholder="Tytuł materiału"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    value={newMaterial.title}
                                    onChange={e => setNewMaterial(prev => ({...prev, title: e.target.value}))}
                                  />
                                  
                                  <textarea
                                    placeholder="Opis materiału"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    rows={3}
                                    value={newMaterial.description}
                                    onChange={e => setNewMaterial(prev => ({...prev, description: e.target.value}))}
                                  />

                                  {(newMaterial.type === 'task' || newMaterial.type === 'exam') && (
                                    <input
                                      type="datetime-local"
                                      placeholder="Termin"
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                      value={newMaterial.deadline}
                                      onChange={e => setNewMaterial(prev => ({...prev, deadline: e.target.value}))}
                                    />
                                  )}

                                  {(newMaterial.type === 'file' || newMaterial.type === 'task') && (
                                    <div>
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.zip,.rar"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            // Walidacja typów plików
                                            const allowedTypes = [
                                              "application/pdf",
                                              "application/msword",
                                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                              "application/vnd.ms-excel",
                                              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                              "application/vnd.ms-powerpoint",
                                              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                              "text/plain",
                                              "image/jpeg",
                                              "image/jpg",
                                              "image/png",
                                              "image/gif",
                                              "video/mp4",
                                              "video/avi",
                                              "video/quicktime",
                                              "application/zip",
                                              "application/x-rar-compressed"
                                            ];
                                            
                                            if (!allowedTypes.includes(file.type)) {
                                              alert("Dozwolone typy plików: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, GIF, MP4, AVI, MOV, ZIP, RAR");
                                              e.target.value = '';
                                              return;
                                            }
                                            
                                            // Sprawdź rozmiar pliku (max 50MB)
                                            if (file.size > 50 * 1024 * 1024) {
                                              alert("Plik jest za duży. Maksymalny rozmiar to 50MB.");
                                              e.target.value = '';
                                              return;
                                            }
                                          }
                                          setNewMaterial(prev => ({...prev, file: file || null}));
                                        }}
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Dozwolone: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, GIF, MP4, AVI, MOV, ZIP, RAR (max 50MB)
                                      </p>
                                    </div>
                                  )}

                                  {newMaterial.type === 'video' && (
                                    <div className="space-y-4">
                                      {/* Wybór źródła wideo */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Źródło wideo
                                        </label>
                                        <div className="flex gap-4">
                                          <label className="flex items-center">
                                            <input
                                              type="radio"
                                              name="videoSource"
                                              value="upload"
                                              checked={newMaterial.videoSource === 'upload'}
                                              onChange={e => setNewMaterial(prev => ({...prev, videoSource: e.target.value as "upload" | "youtube"}))}
                                              className="mr-2"
                                            />
                                            Wgraj plik wideo
                                          </label>
                                          <label className="flex items-center">
                                            <input
                                              type="radio"
                                              name="videoSource"
                                              value="youtube"
                                              checked={newMaterial.videoSource === 'youtube'}
                                              onChange={e => setNewMaterial(prev => ({...prev, videoSource: e.target.value as "upload" | "youtube"}))}
                                              className="mr-2"
                                            />
                                            Link YouTube
                                          </label>
                                        </div>
                                      </div>

                                      {/* Wgrywanie pliku */}
                                      {newMaterial.videoSource === 'upload' && (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-medium text-gray-700">
                                            Wybierz plik wideo (MP4, WebM, AVI)
                                          </label>
                                          <input
                                            type="file"
                                            accept="video/*"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            onChange={e => setNewMaterial(prev => ({...prev, video: e.target.files?.[0] || null}))}
                                          />
                                          {newMaterial.video && (
                                            <div className="text-sm text-green-600">
                                              ✅ Wybrano: {newMaterial.video.name} ({(newMaterial.video.size / 1024 / 1024).toFixed(2)} MB)
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Link YouTube */}
                                      {newMaterial.videoSource === 'youtube' && (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-medium text-gray-700">
                                            Link do filmu YouTube
                                          </label>
                                          <input
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            value={newMaterial.youtubeUrl}
                                            onChange={e => setNewMaterial(prev => ({...prev, youtubeUrl: e.target.value}))}
                                          />
                                          <div className="text-xs text-gray-500">
                                            Wklej pełny link do filmu YouTube. Film będzie odtwarzany bezpośrednio na platformie.
                                          </div>
                                          {newMaterial.youtubeUrl && (
                                            <div className="text-sm text-green-600">
                                              ✅ Link YouTube: {newMaterial.youtubeUrl}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {newMaterial.type === 'text' && (
                                    <textarea
                                      placeholder="Treść materiału"
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                      rows={6}
                                      value={newMaterial.content}
                                      onChange={e => setNewMaterial(prev => ({...prev, content: e.target.value}))}
                                    />
                                  )}

                                  {newMaterial.type === 'quiz' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">
                                          Wybierz quiz
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            fetchAvailableQuizzes();
                                            setShowQuizSelector(true);
                                          }}
                                          className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                          Odśwież listę quizów
                                        </button>
                                      </div>
                                      
                                      {newMaterial.quizId ? (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <p className="text-sm text-green-800">
                                            ✅ Quiz wybrany: {newMaterial.title}
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => setNewMaterial(prev => ({...prev, quizId: '', title: ''}))}
                                            className="text-red-600 hover:text-red-800 text-sm mt-1"
                                          >
                                            Usuń wybór
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            fetchAvailableQuizzes();
                                            setShowQuizSelector(true);
                                          }}
                                          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800"
                                        >
                                          Kliknij, aby wybrać quiz
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleAddMaterial(Number(subsection.id))}
                                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                    >
                                      Dodaj
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAddingMaterial(null);
                                                setNewMaterial({
          title: '',
          description: '',
          type: 'text',
          deadline: '',
          content: '',
          file: null,
          video: null,
          youtubeUrl: '',
          videoSource: 'upload'
        });
                                      }}
                                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                    >
                                      Anuluj
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Lista materiałów */}
                            <div className="space-y-2">
                              {subsection.materials.length === 0 ? (
                                <div className="text-gray-400 italic text-sm">Brak materiałów w tej podsekcji.</div>
                              ) : (
                                subsection.materials.map((material) => (
                                  <div key={material.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 p-3">
                                      <div className="text-lg">
                                        {material.type === 'text' && '📄'}
                                        {material.type === 'file' && '📎'}
                                        {material.type === 'video' && '🎥'}
                                        {material.type === 'task' && '📝'}
                                        {material.type === 'exam' && '🎓'}
                                        {material.type === 'activity' && '🎯'}
                                        {material.type === 'quiz' && '❓'}
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-800">{material.title}</h5>
                                        {material.description && (
                                          <p className="text-sm text-gray-600">{material.description}</p>
                                        )}
                                        {material.deadline && (
                                          <p className="text-xs text-red-600">
                                            Termin: {new Date(material.deadline).toLocaleString('pl-PL')}
                                          </p>
                                        )}
                                                                              {material.videoUrl && (
                                        <p className="text-xs text-blue-600">
                                          🎥 Film wideo dostępny
                                        </p>
                                      )}
                                      {material.youtubeUrl && (
                                        <p className="text-xs text-red-600">
                                          📺 Film YouTube dostępny
                                        </p>
                                      )}
                                      </div>
                                      <button
                                        onClick={() => handleDeleteMaterial(Number(section.id), Number(subsection.id), Number(material.id))}
                                        className="text-red-500 hover:text-red-700"
                                        title="Usuń materiał"
                                      >
                                        🗑️
                                      </button>
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

                                    {/* Quiz Display */}
                                    {material.type === 'quiz' && material.quizId && (
                                      <div className="px-3 pb-3">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-blue-600">❓</span>
                                            <h6 className="font-medium text-blue-900">Quiz przypisany</h6>
                                          </div>
                                          <p className="text-sm text-blue-700 mb-3">
                                            Ten materiał zawiera quiz. Studenci będą mogli go rozwiązać po kliknięciu.
                                          </p>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => window.open(`/courses/${(course as any)?.slug}/quiz/${material.quizId}`, '_blank')}
                                              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                                            >
                                              Podgląd quizu
                                            </button>
                                            <button
                                              onClick={() => window.open(`/homelogin/teacher/quizzes`, '_blank')}
                                              className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
                                            >
                                              Edytuj quiz
                                            </button>
                                          </div>
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
                    ))
                  )}
                </div>

                <div className="space-y-4">
                  {(!sectionContents[Number(section.id)] || sectionContents[Number(section.id)].length === 0) ? (
                    <div className="text-gray-400 italic">Brak materiałów.</div>
                  ) : (
                    sectionContents[Number(section.id)].map((item: SectionContent) => (
                      <div key={item.id} className="flex flex-col gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                        {String(editingContentId) === String(item.id) ? (
                          <form onSubmit={handleSaveEditContent} className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              {(item.fileUrl || item.file) && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                              {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                              {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                              <input 
                                type="text" 
                                value={editContent?.name || ''} 
                                onChange={e => setEditContent(prev => prev ? {...prev, name: e.target.value} : null)}
                                className="font-semibold border rounded px-2 py-1"
                              />
                              <div className="ml-auto flex items-center gap-2">
                                <button type="submit" className="text-green-600 hover:text-green-800">💾</button>
                                <button type="button" onClick={handleCancelEditContent} className="text-gray-600 hover:text-gray-800">❌</button>
                              </div>
                            </div>
                            {item.text && (
                              <div className="mt-2">
                                {MDXEditor && (
                                  <MDXEditor
                                    markdown={editContent?.text || ''}
                                    onChange={(val: string) => setEditContent(prev => prev ? {...prev, text: val} : null)}
                                    className="border rounded min-h-[120px] prose"
                                    plugins={[
                                      listsPlugin(),
                                      toolbarPlugin({
                                        toolbarContents: () => (
                                          <>
                                            <UndoRedo />
                                            <Separator />
                                            <BoldItalicUnderlineToggles />
                                            <CodeToggle />
                                            <Separator />
                                            <ListsToggle />
                                            <Separator />
                                            <CreateLink />
                                          </>
                                        ),
                                      }),
                                      linkPlugin(),
                                      linkDialogPlugin(),
                                    ]}
                                  />
                                )}
                              </div>
                            )}
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              {(item.fileUrl || item.file) && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                              {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                              {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                              <span className="font-semibold">{item.name || item.link || 'Materiał'}</span>
                              <div className="ml-auto flex items-center gap-2">
                                {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noopener" className="text-[#4067EC] underline">Pobierz</a>}
                                {item.file && !item.fileUrl && typeof item.file === 'object' && <a href={URL.createObjectURL(item.file)} target="_blank" rel="noopener" className="text-[#4067EC] underline">Pobierz</a>}
                                {item.link && <a href={item.link} target="_blank" rel="noopener" className="text-[#4067EC] underline">Otwórz link</a>}
                                {item.text && <button onClick={() => handleEditContent(item)} className="text-blue-600 hover:text-blue-800">✏️</button>}
                                <button onClick={() => handleDeleteContent(Number(section.id), Number(item.id))} className="text-red-500 hover:text-red-700">🗑️</button>
                              </div>
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
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>



      {/* QUIZZES SECTION */}
      <div className="w-full mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaQuestionCircle className="text-2xl text-[#4067EC]" />
            <h2 className="text-2xl font-semibold text-[#4067EC]">Quizy w tym kursie</h2>
          </div>
          
          {loadingQuizzes ? (
            <div className="text-center py-8 text-gray-500">Ładowanie quizów...</div>
          ) : quizError ? (
            <div className="text-center py-8 text-red-500">
              {quizError}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Brak quizów w tym kursie. Utwórz quiz w sekcji &quot;Zarządzanie quizami&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
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
                      onClick={() => window.open(`/homelogin/teacher/quizzes`, '_blank')}
                      className="text-sm bg-[#4067EC] text-white px-3 py-1 rounded hover:bg-[#3155d4] transition"
                    >
                      Zarządzaj
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setShowQuizAssignmentModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              <FaPlus /> Przypisz quizy
            </button>
            <button
              onClick={() => window.open(`/homelogin/teacher/quizzes`, '_blank')}
              className="inline-flex items-center gap-2 bg-[#4067EC] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#3155d4] transition"
            >
              <FaPlus /> Utwórz nowy quiz
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Quiz Selector Modal */}
      {showQuizSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Wybierz quiz do przypisania</h3>
              <button
                onClick={() => setShowQuizSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {availableQuizzes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Brak dostępnych quizów</p>
                  <button
                    onClick={() => window.open(`/homelogin/teacher/quizzes`, '_blank')}
                    className="mt-4 text-blue-600 hover:text-blue-800"
                  >
                    Utwórz nowy quiz
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                      onClick={() => handleAssignQuizToLesson(quiz.id, quiz.title)}
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{quiz.title}</h4>
                      <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                      <div className="space-y-1 text-sm text-gray-500">
                        <div>Pytania: {quiz.questions?.length || 0}</div>
                        <div>Maksymalne próby: {quiz.max_attempts || 1}</div>
                        <div>Utworzono: {new Date(quiz.created_at).toLocaleDateString('pl-PL')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowQuizSelector(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Assignment Modal */}
      <QuizAssignmentModal
        isOpen={showQuizAssignmentModal}
        onClose={() => setShowQuizAssignmentModal(false)}
        courseId={Array.isArray(courseId) ? courseId[0] : courseId || ''}
        courseTitle={course?.title || ''}
        onQuizAssigned={fetchQuizzes}
      />
    </div>
  );
}

export default function TeacherCourseDetail() {
  return (
    <Providers>
      <TeacherCourseDetailContent />
    </Providers>
  );
} 