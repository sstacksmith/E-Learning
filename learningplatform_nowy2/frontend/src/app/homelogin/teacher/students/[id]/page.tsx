'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  User,
  BookOpen,
  Edit,
  Save,
  X,
  Plus
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
  const router = useRouter();
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<StudentProfile>>({});
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const studentId = params?.id as string;

  useEffect(() => {
    if (studentId && user) {
      fetchStudentProfile();
      fetchTeacherNotes();
    }
  }, [studentId, user]);

  const fetchStudentProfile = async () => {
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
  };

  const fetchTeacherNotes = async () => {
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
  };

  const handleSaveProfile = async () => {
    if (!student || !user) return;

    try {
      const userRef = doc(db, 'users', studentId);
      await updateDoc(userRef, {
        phone: editData.phone || '',
        address: editData.address || '',
        dateOfBirth: editData.dateOfBirth || ''
      });

      setStudent({ ...student, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Nie udało się zaktualizować profilu');
    }
  };

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

  const getGradeColor = (grade: number) => {
    if (grade >= 4.5) return 'bg-green-600 text-white';
    if (grade >= 3.5) return 'bg-yellow-600 text-white';
    return 'bg-red-600 text-white';
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
            Profil ucznia
          </h1>

          <div className="w-20"></div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                  <p className="text-gray-600">{student.class}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <p className="text-gray-600">{student.class}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg">
                <span className="font-semibold">Średnia: {student.averageGrade.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Row 1 */}
          
          {/* Informacje podstawowe */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Informacje podstawowe</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="p-2 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditData(student);
                    }}
                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{student.email}</span>
              </div>
              
              {isEditing ? (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Numer telefonu"
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={editData.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      placeholder="Adres"
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={editData.dateOfBirth || ''}
                      onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {student.phone || 'Nie podano'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {student.address || 'Nie podano'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {student.dateOfBirth || 'Nie podano'}
                    </span>
                  </div>
                </>
              )}
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Ostatnia aktywność: {student.lastActivity}</span>
              </div>
            </div>
          </div>

          {/* Kontakt z rodzicem */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kontakt z rodzicem</h2>
            {student.parentName ? (
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{student.parentName}</span>
                </div>
                <div className="text-xs text-gray-500">{student.parentRole}</div>
                {student.parentPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{student.parentPhone}</span>
                  </div>
                )}
                {student.parentEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{student.parentEmail}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Brak przypisanego rodzica</p>
              </div>
            )}
          </div>

          {/* Osiągnięcia */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Osiągnięcia</h2>
            <div className="text-center py-8 text-gray-500">
              <p>Funkcjonalność osiągnięć zostanie dodana wkrótce</p>
            </div>
          </div>

          {/* Row 2 */}
          
          {/* Ostatnie oceny */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ostatnie oceny</h2>
            <div className="space-y-3">
              {grades.map((grade, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="font-medium text-gray-900">{grade.subject}</span>
                    <span className="text-sm text-gray-500 ml-2">{grade.date}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold ${getGradeColor(grade.grade)}`}>
                    {grade.grade}
                  </div>
                </div>
              ))}
              {grades.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Brak ocen</p>
                </div>
              )}
            </div>
          </div>

          {/* Przypisane kursy */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Przypisane kursy</h2>
            <div className="flex flex-wrap gap-2">
              {student.courses.map((course, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                  <BookOpen className="h-3 w-3 mr-2" />
                  {course}
                </span>
              ))}
              {student.courses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Brak przypisanych kursów</p>
                </div>
              )}
            </div>
          </div>

          {/* Notatki nauczycieli */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notatki nauczycieli</h2>
            
            {/* Dodawanie nowej notatki */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex gap-3">
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                          note.createdAt.toDate().toLocaleDateString('pl-PL') : 
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
  );
}
