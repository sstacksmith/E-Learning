"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc, setDoc, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/config/firebase";
import Image from "next/image";
import Providers from '@/components/Providers';
import { FaFilePdf, FaFileAlt, FaLink, FaChevronDown, FaChevronUp, FaPlus, FaImage } from "react-icons/fa";

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

interface Student {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string; // ISO string
  submissions: { userId: string; fileUrl?: string; submittedAt?: string }[];
}

interface Section {
  id: number;
  type: 'material' | 'assignment' | 'form';
  title: string;
  description?: string;
  fileUrl?: string;
  deadline?: string;
  formUrl?: string;
  submissions?: { userId: string; fileUrl?: string; submittedAt?: string }[];
}

const TABS = ["Kurs", "Uczestnicy", "Oceny", "Zadania"];

function TeacherCourseDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Kurs");
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: 1,
      title: "Zadanie 1",
      description: "Prześlij projekt aplikacji.",
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h from now
      submissions: [],
    },
  ]);
  const [adding, setAdding] = useState(false);

  // Nowe stany do accordionów i uploadu
  const [showMaterials, setShowMaterials] = useState(true);
  const [showAssignments, setShowAssignments] = useState(true);
  const [activityFile, setActivityFile] = useState<File | null>(null);
  const [activityFileUrl, setActivityFileUrl] = useState<string>("");
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState<{name: string, file: File | null, link: string}>({name: '', file: null, link: ''});
  const [newAssignment, setNewAssignment] = useState<{name: string, file: File | null, link: string}>({name: '', file: null, link: ''});

  // Banner state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  // Section state
  const [showSection, setShowSection] = useState<{[id:number]: boolean}>({});
  const [addingSection, setAddingSection] = useState(false);
  const [sectionContents, setSectionContents] = useState<{[id:number]: any[]}>({});
  const [newContent, setNewContent] = useState<{[id:number]: {name: string, file: File | null, link: string, text: string}}>({});

  // Dodaj nową deklarację sections
  const [sections, setSections] = useState<any[]>([]);
  const [newSection, setNewSection] = useState<{name: string, type: string, deadline?: string}>({name: '', type: 'material'});
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editSection, setEditSection] = useState<any>(null);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<any>(null);

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
  }, []);

  // Fetch assigned users from Firestore (by courseId)
  useEffect(() => {
    const fetchAssigned = async () => {
      if (!courseId) return;
      const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        const assignedUids = Array.isArray(data.assignedUsers) ? data.assignedUsers : [];
        setAssignedUsers(Array.isArray(students)
          ? students.filter(s => assignedUids.includes(s.uid) || assignedUids.includes(s.email))
          : []);
      }
    };
    fetchAssigned();
  }, [courseId, students]);

  // Assign student to course in Firestore
  async function handleAssignStudent(e: any) {
    e.preventDefault();
    if (!selectedStudentId || !courseId) return;
    const courseRef = doc(db, "courses", String(courseId));
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) {
      // Create the document if it doesn't exist, copy fields from loaded course
      await setDoc(courseRef, {
        assignedUsers: [selectedStudentId],
        title: course?.title || '',
        subject: course?.subject || '',
        description: course?.description || '',
        year_of_study: course?.year_of_study || '',
        is_active: course?.is_active ?? true
      }, { merge: true });
    } else {
      // Update the document if it exists
      await updateDoc(courseRef, {
        assignedUsers: arrayUnion(selectedStudentId)
      });
    }
    setAssignMsg("Przypisano ucznia!");
    setSelectedStudentId("");
    // Refresh assigned users
    const courseDoc = await getDoc(courseRef);
    if (courseDoc.exists()) {
      const data = courseDoc.data();
      const assignedUids = Array.isArray(data.assignedUsers) ? data.assignedUsers : [];
      setAssignedUsers(Array.isArray(students)
        ? students.filter(s => assignedUids.includes(s.uid) || assignedUids.includes(s.email))
        : []);
    }
  }

  useEffect(() => {
    if (!courseId) return;
    const fetchFirestoreCourse = async () => {
      setLoading(true);
      try {
        const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
        if (courseDoc.exists()) {
          const data = courseDoc.data();
          setCourse(data as any);
          setSections(data.sections || []);
          setBannerUrl(data.bannerUrl || "");
          
          // Inicjalizuj sectionContents z danymi z sekcji
          const sectionsData = data.sections || [];
          const initialSectionContents: {[id:number]: any[]} = {};
          sectionsData.forEach((section: any) => {
            if (section.contents && Array.isArray(section.contents)) {
              initialSectionContents[section.id] = section.contents;
            }
          });
          setSectionContents(initialSectionContents);
        }
      } catch (err) {
        setError("Failed to load course details from Firestore");
      } finally {
        setLoading(false);
      }
    };
    fetchFirestoreCourse();
  }, [courseId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigning(true);
    setError(null);
    setSuccess(null);
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('firebaseToken') || localStorage.getItem('accessToken') || localStorage.getItem('token'))
        : null;
      const student = students.find(s => s.uid === selectedStudent);
      const res = await fetch("/api/assign-course/", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: courseId,
          firebase_uid: student?.uid,
          email: student?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to assign course");
      setSuccess("Kurs przypisany do użytkownika!");
      setSelectedStudent("");
      // Refresh course details
      const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        setCourse(data as any);
        setSections(data.sections || []);
        setBannerUrl(data.bannerUrl || "");
      }
    } catch (err: any) {
      setError(err.message || "Błąd przypisywania kursu");
    } finally {
      setAssigning(false);
    }
  };

  // Live countdown helper
  function getCountdown(deadline: string) {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    if (diff > 0) {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      return `Pozostało: ${d}d ${h}h ${m}m`;
    } else {
      const late = -diff;
      const d = Math.floor(late / (1000 * 60 * 60 * 24));
      const h = Math.floor((late / (1000 * 60 * 60)) % 24);
      const m = Math.floor((late / (1000 * 60)) % 60);
      return `Opóźnienie: ${d}d ${h}h ${m}m`;
    }
  }

  // Mock student submission
  function handleStudentSubmit(assignmentId: number) {
    setAssignments(assignments.map(a =>
      a.id === assignmentId
        ? { ...a, submissions: [...a.submissions, { userId: user?.uid || "student-mock", fileUrl: "https://praca.pdf", submittedAt: new Date().toISOString() }] }
        : a
    ));
  }

  // Live update for countdowns
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(x => x + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Dodaj helper do zapisu sekcji do Firestore
  async function saveSectionsToFirestore(courseId: string | string[], sections: Section[]) {
    if (!courseId) return;
    const courseRef = doc(db, "courses", String(courseId));
    await updateDoc(courseRef, { sections });
  }

  // Helper function to refresh data from Firestore
  async function refreshCourseData() {
    if (!courseId) return;
    const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
    if (courseDoc.exists()) {
      const data = courseDoc.data();
      setSections(data.sections || []);
      
      // Aktualizuj sectionContents
      const sectionsData = data.sections || [];
      const updatedSectionContents: {[id:number]: any[]} = {};
      sectionsData.forEach((section: any) => {
        if (section.contents && Array.isArray(section.contents)) {
          updatedSectionContents[section.id] = section.contents;
        }
      });
      setSectionContents(updatedSectionContents);
    }
  }

  // Add new section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.name) return;
    const id = Date.now();
    const baseSection = {
      id,
      name: newSection.name,
      type: newSection.type,
      deadline: newSection.deadline,
      contents: []
    };
    // Dodaj submissions: [] tylko dla zadania
    const sectionWithSubmissions = newSection.type === 'zadanie'
      ? { ...baseSection, submissions: [] }
      : baseSection;
    const newSections = [...sections, sectionWithSubmissions];
    setSections(newSections);
    setShowSection(s => ({...s, [id]: true}));
    setNewSection({name: '', type: 'material'});
    setAddingSection(false);
    
    // Zapisz do Firestore
    if (courseId) {
      await saveSectionsToFirestore(courseId, newSections);
      await refreshCourseData();
      
      // Automatycznie utwórz event w kalendarzu dla zadań i egzaminów
      if ((newSection.type === 'zadanie' || newSection.type === 'egzamin') && newSection.deadline && user?.uid) {
        await createCalendarEvent(sectionWithSubmissions, courseId, user.uid);
      }
    }
  };

  // Add content to section
  const handleAddContent = async (sectionId: number, e: React.FormEvent) => {
    e.preventDefault();
    const content = newContent[sectionId];
    if (!content || (!content.file && !content.link && !content.text)) return;
    
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
      ...content, 
      id: Date.now(),
      fileUrl: fileUrl, // Save the Firebase Storage URL
      file: null // Remove the File object as it can't be serialized
    };
    
    const updatedSectionContents = {
      ...sectionContents,
      [sectionId]: [...(sectionContents[sectionId] || []), newContentItem]
    };
    
    setSectionContents(updatedSectionContents);
    setNewContent(nc => ({...nc, [sectionId]: {name: '', file: null, link: '', text: ''}}));
    
    // Aktualizuj sekcje w Firestore z nowymi materiałami
    if (courseId) {
      const updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { ...section, contents: updatedSectionContents[sectionId] }
          : section
      );
      await saveSectionsToFirestore(courseId, updatedSections);
      await refreshCourseData();
    }
  };

  // Banner upload handler
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
      setBannerUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Obsługa uploadu pliku do Aktywności
  const handleActivityFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActivityFile(e.target.files[0]);
      setActivityFileUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Dodawanie materiału
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMaterial.file || newMaterial.link) {
      setMaterials([...materials, { ...newMaterial, id: Date.now() }]);
      setNewMaterial({ name: '', file: null, link: '' });
    }
  };

  // Dodawanie zadania
  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssignment.file || newAssignment.link) {
      setAssignmentsList([...assignmentsList, { ...newAssignment, id: Date.now() }]);
      setNewAssignment({ name: '', file: null, link: '' });
    }
  };

  // Rozpocznij edycję sekcji
  function handleEditSection(section: Section) {
    setEditingSectionId(section.id);
    setEditSection({ ...section });
  }

  // Zapisz edycję sekcji
  function handleSaveEditSection(e: any) {
    e.preventDefault();
    const updatedSections = sections.map(s => s.id === editingSectionId ? { ...s, ...editSection } : s);
    setSections(updatedSections);
    setEditingSectionId(null);
    setEditSection(null);
    if (courseId) saveSectionsToFirestore(courseId, updatedSections);
  }

  // Anuluj edycję
  function handleCancelEdit() {
    setEditingSectionId(null);
    setEditSection(null);
    // Jeśli chcesz obsłużyć usuwanie, dodaj tu logikę i zapis do Firestore
  }

  // Rozpocznij edycję materiału
  function handleEditContent(content: any) {
    setEditingContentId(content.id);
    setEditContent({ ...content });
  }

  // Zapisz edycję materiału
  async function handleSaveEditContent(e: any) {
    e.preventDefault();
    if (!editingContentId || !editContent) return;
    
    // Znajdź sekcję zawierającą edytowany materiał
    const sectionId = Object.keys(sectionContents).find(key => 
      sectionContents[parseInt(key)].some((item: any) => item.id === editingContentId)
    );
    
    if (!sectionId) return;
    
    const updatedSectionContents = {
      ...sectionContents,
      [parseInt(sectionId)]: sectionContents[parseInt(sectionId)].map((item: any) => 
        item.id === editingContentId ? { ...item, ...editContent } : item
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
  }

  // Anuluj edycję materiału
  function handleCancelEditContent() {
    setEditingContentId(null);
    setEditContent(null);
  }

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [assignMsg, setAssignMsg] = useState<string>("");

  // Function to create calendar event for assignments/exams
  async function createCalendarEvent(section: any, courseId: string | string[], teacherUid: string) {
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
        type: section.type === 'zadanie' ? 'assignment' : 'exam',
        courseId: String(courseId),
        sectionId: section.id,
        deadline: section.deadline,
        createdBy: teacherUid,
        students: assignedUids, // All students assigned to this course
        description: `Zadanie z kursu: ${courseData.title || 'Kurs'}`,
        createdAt: new Date().toISOString()
      };
      
      console.log('Event data to be created:', eventData);
      
      const docRef = await addDoc(collection(db, "events"), eventData);
      
      console.log('Calendar event created successfully with ID:', docRef.id);
      console.log('Calendar event created for section:', section.name);
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }
  }

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
      [sectionId]: (sectionContents[sectionId] || []).filter((item: any) => item.id !== contentId)
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
            <img src={bannerUrl} alt="Baner kursu" className="object-contain h-full w-auto opacity-80" />
          ) : (
            <Image src="/puzzleicon.png" alt="Baner kursu" width={180} height={180} className="object-contain h-full w-auto opacity-60" />
          )}
        </div>
      </div>

      {/* Dodaj sekcję przypisywania uczniów pod banerem: */}
      <div className="w-full max-w-5xl mb-6 bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-2 text-[#4067EC]">Przypisani uczniowie</h3>
        <ul className="mb-4 list-disc ml-6">
          {Array.isArray(assignedUsers) && assignedUsers.length === 0 ? (
            <li className="text-gray-500">Brak przypisanych uczniów.</li>
          ) : (
            Array.isArray(assignedUsers) && assignedUsers.map(u => (
              <li key={u.uid}>{u.displayName || u.email} ({u.email})</li>
            ))
          )}
        </ul>
        <form className="flex gap-4 items-end" onSubmit={handleAssignStudent}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dodaj ucznia</label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">-- wybierz --</option>
              {Array.isArray(students) && Array.isArray(assignedUsers) && students.filter(s => !assignedUsers.some(u => u.uid === s.uid)).map(s => (
                <option key={s.uid} value={s.uid}>{s.displayName || s.email} ({s.email})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Przypisz</button>
          {assignMsg && <span className="text-xs text-green-600 ml-2">{assignMsg}</span>}
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
              <select className="border rounded px-3 py-2" value={newSection.type} onChange={e => setNewSection(s => ({...s, type: e.target.value}))}>
                <option value="material">Materiał</option>
                <option value="zadanie">Zadanie</option>
                <option value="aktywnosc">Aktywność</option>
              </select>
              <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Dodaj</button>
              <button type="button" className="bg-gray-200 px-4 py-2 rounded font-semibold" onClick={() => setAddingSection(false)}>Anuluj</button>
            </div>
            {newSection.type === 'zadanie' && (
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <label className="text-sm font-medium text-gray-700">Termin oddania:</label>
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
      <div className="w-full max-w-5xl flex flex-col gap-4">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-2xl shadow-lg">
            <div className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] focus:outline-none">
              <button onClick={() => setShowSection(s => ({...s, [section.id]: !s[section.id]}))} className="mr-3 text-[#4067EC] text-2xl focus:outline-none">{showSection[section.id] ? <FaChevronUp /> : <FaChevronDown />}</button>
              <span className="flex-1">
                {section.name} <span className="text-base font-normal">({section.type})</span>
                {section.type === 'zadanie' && section.deadline && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    Termin: {new Date(section.deadline).toLocaleString('pl-PL')}
                  </span>
                )}
              </span>
              <button onClick={() => handleEditSection(section)} className="ml-3 text-blue-500 hover:text-blue-700 text-xl focus:outline-none">✏️</button>
              <button onClick={() => handleDeleteSection(section.id)} className="ml-3 text-red-500 hover:text-red-700 text-2xl focus:outline-none">🗑️</button>
            </div>
            {showSection[section.id] && (
              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Edit section form */}
                {editingSectionId === section.id && (
                  <form onSubmit={handleSaveEditSection} className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-semibold text-blue-800 mb-3">Edytuj sekcję</h4>
                    <div className="flex flex-col sm:flex-row gap-2 items-center mb-3">
                      <input 
                        type="text" 
                        placeholder="Nazwa sekcji" 
                        className="border rounded px-3 py-2" 
                        value={editSection?.name || ''} 
                        onChange={e => setEditSection({...editSection, name: e.target.value})} 
                        required 
                      />
                      <select 
                        className="border rounded px-3 py-2" 
                        value={editSection?.type || ''} 
                        onChange={e => setEditSection({...editSection, type: e.target.value})}
                      >
                        <option value="material">Materiał</option>
                        <option value="zadanie">Zadanie</option>
                        <option value="aktywnosc">Aktywność</option>
                      </select>
                      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-semibold">Zapisz</button>
                      <button type="button" onClick={handleCancelEdit} className="bg-gray-200 px-4 py-2 rounded font-semibold">Anuluj</button>
                    </div>
                    {editSection?.type === 'zadanie' && (
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

                {/* Dodawanie materiału/zadania/aktywności */}
                <form onSubmit={e => handleAddContent(section.id, e)} className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input type="text" placeholder="Nazwa (opcjonalna)" className="border rounded px-3 py-2" value={newContent[section.id]?.name || ''} onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), name: e.target.value}}))} />
                    <input type="file" className="" onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), file: e.target.files ? e.target.files[0] : null}}))} />
                    <input type="url" placeholder="Link (np. YouTube, Google Docs)" className="border rounded px-3 py-2" value={newContent[section.id]?.link || ''} onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), link: e.target.value}}))} />
                    <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Dodaj</button>
                  </div>
                  <div className="w-full">
                    <textarea 
                      placeholder="Dodaj tekst (instrukcje, opis, notatki...) - możesz dodać sam tekst bez nazwy

Formatowanie:
**pogrubiony** - *kursywa* - `kod` - nowe linie są automatycznie zachowane" 
                      className="w-full border rounded px-3 py-2 min-h-[100px] resize-y" 
                      value={newContent[section.id]?.text || ''} 
                      onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), text: e.target.value}}))} 
                    />
                  </div>
                </form>
                {/* Lista materiałów/zadań/aktywności */}
                {(sectionContents[section.id]?.length === 0 || !sectionContents[section.id]) && <div className="text-gray-400 italic">Brak materiałów.</div>}
                {sectionContents[section.id]?.map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                    {editingContentId === item.id ? (
                      // Tryb edycji
                      <form onSubmit={handleSaveEditContent} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          {(item.fileUrl || item.file) && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                          {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                          {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                          <input 
                            type="text" 
                            value={editContent?.name || ''} 
                            onChange={e => setEditContent({...editContent, name: e.target.value})}
                            className="font-semibold border rounded px-2 py-1"
                          />
                          <button type="submit" className="ml-auto text-green-600 hover:text-green-800">💾</button>
                          <button type="button" onClick={handleCancelEditContent} className="text-gray-600 hover:text-gray-800">❌</button>
                        </div>
                        {item.text && (
                          <div className="mt-2">
                            <textarea 
                              value={editContent?.text || ''} 
                              onChange={e => setEditContent({...editContent, text: e.target.value})}
                              className="w-full border rounded px-3 py-2 min-h-[100px] resize-y"
                              placeholder="Formatowanie: **pogrubiony** - *kursywa* - `kod`"
                            />
                          </div>
                        )}
                      </form>
                    ) : (
                      // Tryb wyświetlania
                      <>
                        <div className="flex items-center gap-3">
                          {(item.fileUrl || item.file) && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                          {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                          {item.text && <span className="text-2xl text-[#4067EC]">📝</span>}
                          <span className="font-semibold">{item.name || (item.file?.name || item.link || 'Materiał')}</span>
                          {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Pobierz</a>}
                          {item.file && !item.fileUrl && <a href={URL.createObjectURL(item.file)} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Pobierz</a>}
                          {item.link && <a href={item.link} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Otwórz link</a>}
                          {item.text && <button onClick={() => handleEditContent(item)} className="ml-auto text-blue-600 hover:text-blue-800">✏️</button>}
                          <button onClick={() => handleDeleteContent(section.id, item.id)} className="ml-2 text-red-500 hover:text-red-700">🗑️</button>
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

                        {/* Show submissions for zadanie sections */}
                        {section.type === 'zadanie' && section.submissions && section.submissions.length > 0 && (
                          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <h5 className="font-semibold text-yellow-800 mb-3">Przesłane zadania ({section.submissions.length})</h5>
                            <div className="space-y-3">
                              {section.submissions.map((submission: any, index: number) => (
                                <div key={index} className="bg-white rounded p-3 border">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-gray-800">
                                      {submission.userName || submission.userId}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {new Date(submission.submittedAt).toLocaleString('pl-PL')}
                                    </div>
                                  </div>
                                  {submission.fileName && (
                                    <div className="mb-2">
                                      <span className="text-sm text-gray-600">Plik: </span>
                                      <a href={submission.fileUrl} target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800 underline">
                                        {submission.fileName}
                                      </a>
                                    </div>
                                  )}
                                  {submission.text && (
                                    <div className="mb-2">
                                      <div className="text-sm text-gray-600 mb-1">Odpowiedź:</div>
                                      <div className="bg-gray-50 p-2 rounded text-sm whitespace-pre-wrap">
                                        {submission.text}
                                      </div>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {new Date(submission.submittedAt) <= new Date(section.deadline) 
                                      ? '✅ Przesłane w terminie' 
                                      : '⚠️ Przesłane po terminie'
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
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