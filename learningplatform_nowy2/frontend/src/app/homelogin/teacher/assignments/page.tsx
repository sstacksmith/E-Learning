"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Providers from '@/components/Providers';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

interface Course {
  id: string;
  title: string;
  teacherEmail?: string;
}

interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
}

function StudentAssignmentsWrapper() {
  return (
    <ProtectedRoute>
      <StudentAssignmentsContent />
    </ProtectedRoute>
  );
}

export default function StudentAssignments() {
  return (
    <Providers>
      <StudentAssignmentsWrapper />
    </Providers>
  );
}

function StudentAssignmentsContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignError, setAssignError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses from Firestore
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        const coursesData = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Course)).filter((course: Course) => course.teacherEmail === user?.email);
        setCourses(coursesData);

        // Fetch students from Firestore
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const studentsData = usersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Student))
          .filter((u: Student) => u.role === "student");
        setStudents(studentsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setAssignError('Failed to load data');
      }
    };

    fetchData();
  }, [user?.email]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSuccess("");
    setAssignError("");
    setLoading(true);

    try {
      if (!selectedCourse || !selectedStudent) {
        throw new Error("Nie wybrano kursu lub studenta");
      }

      // Pobierz kurs z Firestore
      const courseDoc = await getDoc(doc(db, "courses", selectedCourse));
      
      if (!courseDoc.exists()) {
        throw new Error("Kurs nie został znaleziony");
      }
      
      const courseData = courseDoc.data();
      const assignedUsers = courseData.assignedUsers || [];
      
      // Znajdź studenta po ID
      const student = students.find(s => s.id === selectedStudent);
      if (!student) {
        throw new Error("Student nie został znaleziony");
      }
      
      // Sprawdź czy student już jest przypisany
      if (assignedUsers.includes(student.email)) {
        throw new Error("Student jest już przypisany do tego kursu");
      }
      
      // Dodaj studenta do listy przypisanych użytkowników
      assignedUsers.push(student.email);
      
      // Zaktualizuj kurs w Firestore
      await updateDoc(doc(db, "courses", selectedCourse), {
        assignedUsers: assignedUsers
      });
      
      setAssignSuccess("Student successfully assigned to course!");
      setSelectedCourse("");
      setSelectedStudent("");
    } catch (err: any) {
      setAssignError(err.message || "Network or server error.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#4067EC] mb-4">Przypisz kurs uczniowi</h1>
        <p className="mb-6 text-gray-700">Wybierz kurs i ucznia, aby przypisać ucznia do wybranego kursu.</p>
        <form onSubmit={handleAssign} className="bg-white rounded-lg shadow p-8 space-y-6">
          {assignSuccess && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
              {assignSuccess}
            </div>
          )}
          {assignError && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
              {assignError}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wybierz kurs
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4067EC]"
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              required
            >
              <option value="">-- wybierz kurs --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wybierz ucznia
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4067EC]"
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              required
            >
              <option value="">-- wybierz ucznia --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.email} ({student.email})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-[#4067EC] text-white py-2 rounded hover:bg-[#3155d4] transition focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? "Przypisywanie..." : "Przypisz ucznia"}
          </button>
        </form>
      </main>
    </div>
  );
} 