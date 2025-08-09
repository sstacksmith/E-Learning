"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, addDoc, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/config/firebase";
import Image from "next/image";
import Providers from '@/components/Providers';
import { FaFilePdf, FaFileAlt, FaLink, FaChevronDown, FaChevronUp, FaPlus, FaImage, FaClipboardList, FaGraduationCap, FaUsers } from "react-icons/fa";
import dynamic from 'next/dynamic';
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
  fileUrl?: string;
  formUrl?: string;
  submissions?: { userId: string; fileUrl?: string; submittedAt?: string }[];
}

interface Student {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
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
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<SectionContent | null>(null);

  // Fetch students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as Student))
        .filter(user => user && user.role === "student");
      setStudents(studentsList);
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
      setSections(data.sections || []);
      
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
  const handleBannerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // setBannerFile(e.target.files[0]); // Unused - handled via URL
      setBannerUrl(URL.createObjectURL(e.target.files[0]));
    }
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
    const newSections = sections.filter(s => s.id !== sectionId);
    setSections(newSections);
    // On any change to sections or banner, update Firestore
    if (courseId) {
      const courseRef = doc(db, "courses", String(courseId));
      updateDoc(courseRef, { sections: newSections });
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

  // Add loading and auth checks at the top
  if (authLoading || !user) {
    return <div className="p-8 text-center text-lg text-gray-500">Ładowanie danych użytkownika...</div>;
  }

  if (loading) return <div className="p-8">Ładowanie...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!course) return <div className="p-8">Nie znaleziono kursu.</div>;

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center py-6 px-2 sm:px-6">
      {/* BANNER */}
      <div className="w-full max-w-5xl mb-6 relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-[#4067EC] to-[#7aa2f7] flex items-center justify-between h-48 sm:h-56">
        <div className="p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg mb-2">{course?.title || 'Tytuł kursu'}</h1>
          <p className="text-white text-lg font-medium drop-shadow">{course?.description || 'Opis kursu'}</p>
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
      <div className="w-full max-w-5xl mb-6 bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-2 text-[#4067EC]">Przypisani uczniowie</h3>
        <div className="mb-4">
  
          <ul className="list-disc ml-6">
            {Array.isArray(assignedUsers) && assignedUsers.length === 0 ? (
              <li className="text-gray-500">Brak przypisanych uczniów.</li>
            ) : (
              Array.isArray(assignedUsers) && assignedUsers.map(u => (
                <li key={u.uid} className="text-sm">
                  {u.displayName || u.email} ({u.email}) - ID: {u.uid}
                </li>
              ))
            )}
          </ul>
        </div>
        <form className="flex gap-4 items-end" onSubmit={handleAssignStudent}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dodaj ucznia</label>
            <select
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">-- wybierz --</option>
              {Array.isArray(students) && Array.isArray(assignedUsers) && students.filter(s => !assignedUsers.some(u => u.email === s.email)).map(s => (
                <option key={s.uid} value={s.email}>{s.displayName || s.email} ({s.email})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Przypisz</button>
          {success && <span className="text-xs text-green-600 ml-2">{success}</span>}
        </form>
      </div>

      {/* DODAJ SEKCJĘ */}
      <div className="w-full max-w-5xl mb-4 flex justify-end">
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
      <div className="w-full max-w-5xl space-y-4">
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

                <form onSubmit={e => handleAddContent(Number(section.id), e)} className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Nazwa (opcjonalna)" 
                      className="border rounded px-3 py-2" 
                      value={newContent[Number(section.id)]?.name || ''} 
                      onChange={e => setNewContent(nc => ({...nc, [Number(section.id)]: {...(nc[Number(section.id)]||{}), name: e.target.value}}))} 
                    />
                    <input 
                      type="file" 
                      onChange={e => setNewContent(nc => ({...nc, [Number(section.id)]: {...(nc[Number(section.id)]||{}), file: e.target.files ? e.target.files[0] : null}}))} 
                    />
                    <input 
                      type="url" 
                      placeholder="Link (np. YouTube, Google Docs)" 
                      className="border rounded px-3 py-2" 
                      value={newContent[Number(section.id)]?.link || ''} 
                      onChange={e => setNewContent(nc => ({...nc, [Number(section.id)]: {...(nc[Number(section.id)]||{}), link: e.target.value}}))} 
                    />
                    <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">
                      Dodaj
                    </button>
                  </div>
                  {MDXEditor && (
                    <MDXEditor
                      markdown={newContent[Number(section.id)]?.text || ''}
                      onChange={(val: string) => setNewContent(nc => ({ ...nc, [Number(section.id)]: { ...(nc[Number(section.id)] || {}), text: val } }))}
                      className="border rounded prose mdxeditor"
                      contentEditableClassName="min-h-[120px]"
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
                        linkDialogPlugin()
                      ]}
                    />
                  )}
                </form>

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