'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  User,
  BookOpen,
  Plus,
  GraduationCap,
  Award,
  TrendingUp,
  Activity,
  Target,
  Zap,
  CheckCircle
} from 'lucide-react';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  class: string;
  averageGrade: number;
  frequency: number;
  courses: string[];
  lastActivity: string;
  parentName?: string;
  parentPhone?: string;
  parentRole?: string;
  parentEmail?: string;
  achievements?: string[];
}

interface TeacherNote {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  note: string;
  createdAt: any;
}

interface Grade {
  subject: string;
  date: string;
  grade: number;
  type: string;
}

export default function StudentProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [, setGrades] = useState<Grade[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setEditData] = useState<Partial<StudentProfile>>({});
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const studentId = params?.id as string;

  // Mock achievements data
  const [achievements] = useState([
    {
      id: 1,
      title: 'Pierwszy krok',
      description: 'Ukończyłeś swój pierwszy kurs',
      icon: '🎯',
      date: '2024-01-15',
      progress: 100
    },
    {
      id: 2,
      title: 'Matematyczny geniusz',
      description: 'Osiągnąłeś 100% w quizie z matematyki',
      icon: '🧮',
      date: '2024-02-20',
      progress: 100
    },
    {
      id: 3,
      title: 'Aktywny uczeń',
      description: 'Logowałeś się codziennie przez tydzień',
      icon: '📚',
      date: '2024-03-10',
      progress: 100
    }
  ]);

  // Mock stats data
  const [stats] = useState({
    totalCourses: 5,
    completedCourses: 3,
    averageGrade: 4.2,
    totalHours: 45,
    streak: 7
  });

  const fetchStudentProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // Pobierz dane ucznia
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      if (!studentDoc.exists()) {
        setError('Uczeń nie został znaleziony');
        return;
      }

      const studentData = studentDoc.data();
      
      // Pobierz kursy ucznia
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      const studentCourses: string[] = [];
      
      coursesSnapshot.docs.forEach(doc => {
        const courseData = doc.data();
        const assignedUsers = courseData.assignedUsers || [];
        if (assignedUsers.includes(studentData.email) || assignedUsers.includes(studentId)) {
          studentCourses.push(courseData.title);
        }
      });

      // Sprawdź czy uczeń jest bezpośrednio przypisany
      if (studentData.assignedToTeacher === user?.uid) {
        studentCourses.push('Przypisany bezpośrednio');
      }

      // Pobierz oceny
      const gradesRef = collection(db, 'grades');
      const gradesSnapshot = await getDocs(gradesRef);
      const studentGrades = gradesSnapshot.docs
        .filter(doc => {
          const gradeData = doc.data();
          return (gradeData.studentId === studentId || gradeData.user_id === studentId);
        })
        .map(doc => {
          const gradeData = doc.data();
          return {
            subject: gradeData.subject || 'Nieznany przedmiot',
            date: gradeData.date || new Date().toISOString().split('T')[0],
            grade: parseFloat(gradeData.value || gradeData.grade || '0'),
            type: gradeData.gradeType || 'Ocena'
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);

             // Pobierz dane rodzica z kolekcji parent_students
       let parentInfo = {};
       const parentStudentsRef = collection(db, 'parent_students');
       const parentStudentsQuery = query(parentStudentsRef, where('student', '==', studentId));
       const parentStudentsSnapshot = await getDocs(parentStudentsQuery);
       
       console.log('🔍 Szukam rodzica dla ucznia:', studentId);
       console.log('📋 Znalezione relacje parent-student:', parentStudentsSnapshot.docs.length);
       
       if (!parentStudentsSnapshot.empty) {
         const parentStudentData = parentStudentsSnapshot.docs[0].data();
         const parentId = parentStudentData.parent;
         
         console.log('👨‍👩‍👧‍👦 Znaleziony parent ID:', parentId);
         
         // Pobierz dane rodzica
         const parentDoc = await getDoc(doc(db, 'users', parentId));
         if (parentDoc.exists()) {
           const parentData = parentDoc.data();
           console.log('📱 Dane rodzica:', parentData);
           parentInfo = {
             parentName: parentData.displayName || parentData.email,
             parentPhone: parentData.phone || '',
             parentEmail: parentData.email,
             parentRole: 'Rodzic/Opiekun'
           };
         }
       } else {
         console.log('❌ Brak przypisanego rodzica dla ucznia:', studentId);
       }

             const studentProfile: StudentProfile = {
         id: studentId,
         name: studentData.displayName || studentData.email || 'Nieznany uczeń',
         email: studentData.email || '',
         phone: studentData.phone || '',
         address: studentData.address || '',
         dateOfBirth: studentData.dateOfBirth || '',
         class: `Klasa ${studentCourses[0] || 'Nieznana'}`,
         averageGrade: studentGrades.length > 0 
           ? studentGrades.reduce((acc, g) => acc + g.grade, 0) / studentGrades.length 
           : 0,
         frequency: 0, // Usunięte
         courses: studentCourses,
         lastActivity: `${Math.floor(Math.random() * 24) + 1} godz. temu`,
         ...parentInfo
       };
       
       console.log('🎓 Utworzony profil ucznia:', studentProfile);
       console.log('👨‍👩‍👧‍👦 Informacje o rodzicu:', parentInfo);

      setStudent(studentProfile);
      setEditData(studentProfile);
      setGrades(studentGrades);

    } catch (error) {
      console.error('Error fetching student profile:', error);
      setError('Wystąpił błąd podczas pobierania profilu ucznia');
    } finally {
      setLoading(false);
    }
  }, [studentId, user]);

  const fetchTeacherNotes = useCallback(async () => {
    try {
      const notesRef = collection(db, 'teacherNotes');
      const notesSnapshot = await getDocs(query(notesRef, where('studentId', '==', studentId)));
      
      const notes: TeacherNote[] = [];
      notesSnapshot.docs.forEach(doc => {
        const noteData = doc.data();
        notes.push({
          id: doc.id,
          teacherId: noteData.teacherId,
          teacherName: noteData.teacherName,
          teacherEmail: noteData.teacherEmail,
          note: noteData.note,
          createdAt: noteData.createdAt
        });
      });

      // Sortuj od najnowszych
      notes.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
      setTeacherNotes(notes);
    } catch (error) {
      console.error('Error fetching teacher notes:', error);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId && user) {
      fetchStudentProfile();
      fetchTeacherNotes();
    }
  }, [studentId, user, fetchStudentProfile, fetchTeacherNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !user || !student) return;

    try {
      setAddingNote(true);
      
      const noteData = {
        studentId,
        teacherId: user.uid,
        teacherName: user.email,
        teacherEmail: user.email,
        note: newNote.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'teacherNotes'), noteData);
      
      setNewNote('');
      await fetchTeacherNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Nie udało się dodać notatki');
    } finally {
      setAddingNote(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center">
        <div className="text-red-600 mb-4">{error || 'Nie udało się załadować profilu ucznia'}</div>
        <button 
          onClick={() => window.location.href = '/homelogin'}
          className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do strony głównej
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/homelogin'}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Powrót do strony głównej</span>
            <span className="sm:hidden">Powrót</span>
          </button>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Profil ucznia
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-none">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Section - Profile and Navigation */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* User Profile */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🧩</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{student.name}</h2>
                  <p className="text-gray-600">{student.email}</p>
                  <div className="mt-4">
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      Status: Aktywny
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Kursy</span>
                    </div>
                    <div className="text-lg font-bold text-blue-900">{student.courses.length}</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Średnia</span>
                    </div>
                    <div className="text-lg font-bold text-green-900">{student.averageGrade.toFixed(1)}</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Aktywność</span>
                    </div>
                    <div className="text-lg font-bold text-purple-900">{stats.streak} dni</div>
                  </div>
                </div>

                {/* Lista kursów */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Kursy ucznia</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {student.courses.length > 0 ? (
                      student.courses.map((course, index) => (
                        <div key={index} className="group flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 hover:shadow-md">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BookOpen className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {course}
                            </p>
                            <p className="text-xs text-gray-500">Aktywny kurs</p>
                          </div>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Brak przypisanych kursów</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Personal Information */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Informacje osobiste</h2>
                
                {/* Information Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {/* Imię i nazwisko */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Imię i nazwisko</p>
                        <p className="text-lg font-semibold text-gray-900">{student.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-lg font-semibold text-gray-900">{student.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Klasa/Grupa */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Klasa/Grupa</p>
                        <p className="text-lg font-semibold text-gray-900">{student.class || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Telefon */}
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Telefon</p>
                        <p className="text-lg font-semibold text-gray-900">{student.phone || 'Nie podano'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lokalizacja */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Lokalizacja</p>
                        <p className="text-lg font-semibold text-gray-900">{student.address || 'Nie podano'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status konta */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status konta</p>
                        <p className="text-lg font-semibold text-gray-900">Aktywne</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Osiągnięcia */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-xl font-semibold text-gray-900">Ostatnie osiągnięcia ({achievements.length})</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {achievements.map((achievement) => (
                      <div key={achievement.id} className="group flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md hover:scale-[1.02] border border-gray-200 hover:border-blue-300">
                        <div className="text-3xl group-hover:animate-bounce">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{achievement.title}</h4>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{achievement.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(achievement.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/')}</span>
                          </div>
                          <div className="mt-2 w-8 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                    
                    <button className="w-full text-center py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                      Zobacz wszystkie osiągnięcia
                    </button>
                  </div>
                </div>

                {/* Statystyki nauczyciela */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Statystyki ucznia</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalCourses}</div>
                      <div className="text-sm text-gray-600 mb-1">Kursy</div>
                      <div className="flex items-center justify-center gap-1 text-xs text-blue-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>Aktywne</span>
                      </div>
                    </div>

                    <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-1">{stats.completedCourses}</div>
                      <div className="text-sm text-gray-600 mb-1">Ukończone</div>
                      <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                        <Activity className="w-3 h-3" />
                        <span>Postęp</span>
                      </div>
                    </div>

                    <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-purple-600 mb-1">{stats.averageGrade}</div>
                      <div className="text-sm text-gray-600 mb-1">Średnia</div>
                      <div className="flex items-center justify-center gap-1 text-xs text-purple-600">
                        <Target className="w-3 h-3" />
                        <span>Oceny</span>
                      </div>
                    </div>

                    <div className="group bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.streak}</div>
                      <div className="text-sm text-gray-600 mb-1">Dni z rzędu</div>
                      <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
                        <Activity className="w-3 h-3" />
                        <span>Streak</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notatki nauczycieli */}
          <div className="mt-4 sm:mt-6 lg:mt-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Notatki nauczycieli</h2>
              
              {/* Dodawanie nowej notatki */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Dodaj notatkę o uczniu..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 sm:w-auto w-full"
                  >
                    {addingNote ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Dodaj
                  </button>
                </div>
              </div>

              {/* Lista notatek */}
              <div className="space-y-4">
                {teacherNotes.map((note) => (
                  <div key={note.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{note.teacherName}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {note.createdAt?.toDate?.() ? 
                            note.createdAt.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/') : 
                            'Data nieznana'
                          }
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{note.teacherEmail}</span>
                    </div>
                    <p className="text-gray-700">{note.note}</p>
                  </div>
                ))}
                
                {teacherNotes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Brak notatek nauczycieli</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
