"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase";
import ProtectedRoute from '@/components/ProtectedRoute';
import { CourseViewShared } from "@/components/CourseViewShared";

function CourseDetail() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const slug = params?.slug as string;
  
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!slug || !user) return;

      setLoading(true);
      try {
        // Pobierz kurs po slug
        const coursesQuery = query(
          collection(db, "courses"),
          where("slug", "==", slug)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        
        if (coursesSnapshot.empty) {
          setError("Nie znaleziono kursu.");
        setLoading(false);
        return;
      }
      
        const courseDoc = coursesSnapshot.docs[0];
        const courseData = { id: courseDoc.id, ...courseDoc.data() } as any;
        
        // Sprawdź czy użytkownik ma dostęp do kursu
        const assignedUsers = (courseData.assignedUsers as string[]) || [];
        const hasAccess = user?.role === 'admin' || 
                         user?.role === 'teacher' ||
                         assignedUsers.includes(user?.email) || 
                         assignedUsers.includes(user?.uid);
        
        if (!hasAccess) {
          setError("Nie masz dostępu do tego kursu. Skontaktuj się z nauczycielem.");
      setLoading(false);
          return;
        }

        setCourse(courseData);
        setSections(courseData.sections || []);

        // Pobierz quizy przypisane do tego kursu
        const quizzesQuery = query(
          collection(db, "quizzes"),
          where("courseId", "==", courseDoc.id)
        );
        const quizzesSnapshot = await getDocs(quizzesQuery);
        const quizzesData = quizzesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuizzes(quizzesData);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching course:", err);
        setError("Błąd podczas ładowania kursu.");
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchCourseData();
    }
  }, [slug, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie kursu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Błąd</h2>
          <p className="text-gray-600 mb-6">{error}</p>
            <button 
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
            ← Powrót
            </button>
        </div>
      </div>
    );
  }

    return (
    <CourseViewShared
      course={course}
      sections={sections}
      quizzes={quizzes}
      isTeacherPreview={false}
    />
  );
}

export default function CourseDetailPage() {
  return (
    <ProtectedRoute>
      <CourseDetail />
    </ProtectedRoute>
  );
} 