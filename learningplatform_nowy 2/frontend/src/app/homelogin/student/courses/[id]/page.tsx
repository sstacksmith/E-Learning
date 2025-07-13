"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import Image from "next/image";
import Providers from '@/components/Providers';

const TABS = ["Kurs", "Materiały", "Zadania", "Oceny", "Więcej"];

function StudentCourseDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const courseId = params?.id;

  const [course, setCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Kurs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSection, setShowSection] = useState<{[id:number]: boolean}>({});

  useEffect(() => {
    if (!courseId) return;
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const courseDoc = await getDoc(doc(db, "courses", String(courseId)));
        if (!courseDoc.exists()) {
          setError("Nie znaleziono kursu.");
          setLoading(false);
          return;
        }
        setCourse(courseDoc.data());
      } catch (err) {
        setError("Błąd ładowania kursu.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  if (authLoading || loading) return <div className="p-8">Ładowanie...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!course) return <div className="p-8">Nie znaleziono kursu.</div>;

  const sections = Array.isArray(course.sections) ? course.sections : [];

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
            <img src={course.bannerUrl} alt="Baner kursu" className="object-contain h-full w-auto opacity-80" />
          ) : (
            <Image src="/puzzleicon.png" alt="Baner kursu" width={180} height={180} className="object-contain h-full w-auto opacity-60" />
          )}
        </div>
      </div>
      {/* Dynamic Sections as Accordions */}
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
        {sections.length === 0 && <div className="text-gray-400 italic">Brak sekcji w tym kursie.</div>}
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-2xl shadow-lg">
            <button onClick={() => setShowSection(s => ({...s, [section.id]: !s[section.id]}))} className="w-full flex items-center justify-between px-6 py-4 text-xl font-bold text-[#4067EC] focus:outline-none">
              {section.name} <span className="text-base font-normal">({section.type})</span>
              {showSection[section.id] ? '▲' : '▼'}
            </button>
            {showSection[section.id] && (
              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Section contents */}
                {Array.isArray(section.contents) && section.contents.length > 0 ? (
                  section.contents.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-4 bg-[#f4f6fb] rounded-lg">
                      {item.fileUrl && <span className="text-2xl text-[#4067EC]">📄</span>}
                      {item.link && <span className="text-2xl text-[#4067EC]">🔗</span>}
                      <span className="font-semibold">{item.name || item.fileUrl || item.link}</span>
                      {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Pobierz</a>}
                      {item.link && <a href={item.link} target="_blank" rel="noopener" className="ml-auto text-[#4067EC] underline">Otwórz link</a>}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic">Brak materiałów w tej sekcji.</div>
                )}
              </div>
            )}
          </div>
        ))}
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