"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";
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
  const [newContent, setNewContent] = useState<{[id:number]: {name: string, file: File | null, link: string}}>({});

  // Dodaj nową deklarację sections
  const [sections, setSections] = useState<any[]>([]);
  const [newSection, setNewSection] = useState<{name: string, type: string}>({name: '', type: 'material'});

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
          setCourse(data);
          setSections(data.sections || []);
          setBannerUrl(data.bannerUrl || "");
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
      const token = localStorage.getItem("firebaseToken");
      const student = students.find(s => s.uid === selectedStudent);
      const res = await fetch("http://localhost:8000/api/assign-course/", {
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
        setCourse(data);
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

  // Add new section
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.name) return;
    const id = Date.now();
    setSections([...sections, { id, name: newSection.name, type: newSection.type }]);
    setShowSection(s => ({...s, [id]: true}));
    setNewSection({name: '', type: 'material'});
    setAddingSection(false);
  };

  // Add content to section
  const handleAddContent = (sectionId: number, e: React.FormEvent) => {
    e.preventDefault();
    const content = newContent[sectionId];
    if (!content || (!content.file && !content.link)) return;
    setSectionContents(sc => ({
      ...sc,
      [sectionId]: [...(sc[sectionId] || []), { ...content, id: Date.now() }]
    }));
    setNewContent(nc => ({...nc, [sectionId]: {name: '', file: null, link: ''}}));
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

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [assignMsg, setAssignMsg] = useState<string>("");

  // Add delete handlers:
  const handleDeleteSection = async (sectionId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę sekcję?')) return;
    const newSections = sections.filter(s => s.id !== sectionId);
    setSections(newSections);
    updateFirestoreCourse({ sections: newSections });
  };

  const handleDeleteContent = async (sectionId: number, contentId: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten materiał?')) return;
    const newSections = sections.map(s =>
      s.id === sectionId
        ? { ...s, contents: (s.contents || []).filter((item: any) => item.id !== contentId) }
        : s
    );
    setSections(newSections);
    updateFirestoreCourse({ sections: newSections });
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
          <form onSubmit={handleAddSection} className="flex flex-col sm:flex-row gap-2 items-center bg-white p-4 rounded-lg shadow">
            <input type="text" placeholder="Nazwa sekcji" className="border rounded px-3 py-2" value={newSection.name} onChange={e => setNewSection(s => ({...s, name: e.target.value}))} required />
            <select className="border rounded px-3 py-2" value={newSection.type} onChange={e => setNewSection(s => ({...s, type: e.target.value}))}>
              <option value="material">Materiał</option>
              <option value="zadanie">Zadanie</option>
              <option value="aktywnosc">Aktywność</option>
            </select>
            <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Dodaj</button>
            <button type="button" className="bg-gray-200 px-4 py-2 rounded font-semibold" onClick={() => setAddingSection(false)}>Anuluj</button>
          </form>
        )}
      </div>

      {/* SEKCJE (Accordion) */}
      <div className="w-full max-w-5xl flex flex-col gap-4">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-2xl shadow-lg">
            <div className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] focus:outline-none">
              <button onClick={() => setShowSection(s => ({...s, [section.id]: !s[section.id]}))} className="mr-3 text-[#4067EC] text-2xl focus:outline-none">{showSection[section.id] ? <FaChevronUp /> : <FaChevronDown />}</button>
              <span className="flex-1">{section.name} <span className="text-base font-normal">({section.type})</span></span>
              <button onClick={() => handleDeleteSection(section.id)} className="ml-3 text-red-500 hover:text-red-700 text-2xl focus:outline-none">🗑️</button>
            </div>
            {showSection[section.id] && (
              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Dodawanie materiału/zadania/aktywności */}
                <form onSubmit={e => handleAddContent(section.id, e)} className="flex flex-col sm:flex-row gap-2 items-center mb-4">
                  <input type="text" placeholder="Nazwa" className="border rounded px-3 py-2" value={newContent[section.id]?.name || ''} onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), name: e.target.value}}))} />
                  <input type="file" className="" onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), file: e.target.files ? e.target.files[0] : null}}))} />
                  <input type="url" placeholder="Link (np. YouTube, Google Docs)" className="border rounded px-3 py-2" value={newContent[section.id]?.link || ''} onChange={e => setNewContent(nc => ({...nc, [section.id]: {...(nc[section.id]||{}), link: e.target.value}}))} />
                  <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold">Dodaj</button>
                </form>
                {/* Lista materiałów/zadań/aktywności */}
                {(sectionContents[section.id]?.length === 0 || !sectionContents[section.id]) && <div className="text-gray-400 italic">Brak materiałów.</div>}
                {sectionContents[section.id]?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                    {item.file && <FaFilePdf className="text-2xl text-[#4067EC]" />}
                    {item.link && <FaLink className="text-2xl text-[#4067EC]" />}
                    <span className="font-semibold">{item.name || (item.file?.name || item.link)}</span>
                    {item.file && <a href={URL.createObjectURL(item.file)} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Pobierz</a>}
                    {item.link && <a href={item.link} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Otwórz link</a>}
                    <button onClick={() => handleDeleteContent(section.id, item.id)} className="ml-2 text-red-500 hover:text-red-700">🗑️</button>
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

// On any change to sections or banner, update Firestore
function updateFirestoreCourse(updates: any) {
  if (!courseId) return;
  const courseRef = doc(db, "courses", String(courseId));
  updateDoc(courseRef, updates);
} 