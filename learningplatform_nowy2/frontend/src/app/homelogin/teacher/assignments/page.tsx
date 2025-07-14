"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Providers from '@/components/Providers';

interface Course {
  id: number;
  title: string;
}

interface Student {
  id: number;
  username: string;
  email: string;
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses
        const coursesResponse = await fetch('/api/courses/', {
          headers: {
            'Authorization': token ? `Token ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        if (!coursesResponse.ok) throw new Error('Failed to fetch courses');
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);

        // Fetch students
        const studentsResponse = await fetch('/api/users/', {
          headers: {
            'Authorization': token ? `Token ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        if (!studentsResponse.ok) throw new Error('Failed to fetch students');
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.filter((u: any) => u.userprofile?.user_type === "student"));
      } catch (err) {
        console.error('Error fetching data:', err);
        setAssignError('Failed to load data');
      }
    };

    fetchData();
  }, [token]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSuccess("");
    setAssignError("");
    setLoading(true);

    try {
      const response = await fetch("/api/assignments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: selectedCourse,
          student: selectedStudent,
        }),
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok) {
        setAssignSuccess("Student successfully assigned to course!");
        setSelectedCourse("");
        setSelectedStudent("");
      } else {
        setAssignError(data.error || "Error assigning student to course.");
      }
    } catch (err) {
      setAssignError("Network or server error.");
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
                  {student.username} ({student.email})
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