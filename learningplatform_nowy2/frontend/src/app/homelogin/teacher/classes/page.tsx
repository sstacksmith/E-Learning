'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  School, 
  Plus, 
  Users, 
  BookOpen, 
  Calendar, 
  Edit, 
  Trash2, 
  Search,
  ArrowLeft,
  UserPlus,
  Settings,
  BarChart3,
  Clock,
  Award
} from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';

interface Class {
  id: string;
  name: string;
  description: string;
  grade_level: number;
  subject: string;
  students: string[];
  max_students: number;
  academic_year: string;
  is_active: boolean;
  created_at: any;
  updated_at: any;
  assignedCourses?: string[];
}

interface Student {
  id: string;
  name: string;
  email: string;
  classId?: string;
  role?: string;
}

interface Course {
  id: string;
  title: string;
  subject: string;
  created_by: string;
  assignedUsers: string[];
}

export default function ClassesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grade_level: 1,
    subject: '',
    max_students: 30,
    academic_year: '2024/2025',
    schedule: [] as any[]
  });

  const [studentFormData, setStudentFormData] = useState({
    studentEmail: ''
  });

  const [courseFormData, setCourseFormData] = useState({
    courseId: ''
  });

  useEffect(() => {
    console.log('🔍 useEffect - user changed:', user);
    if (user) {
      console.log('🔍 useEffect - user ma UID, wywołuję fetchClasses, fetchStudents i fetchCourses');
      fetchClasses();
      fetchStudents();
      fetchCourses();
    } else {
      console.log('🔍 useEffect - brak użytkownika');
    }
  }, [user]);

  const fetchClasses = async () => {
    if (!user) {
      console.log('❌ fetchClasses - brak użytkownika');
      return;
    }
    
    console.log('🔍 fetchClasses - rozpoczynam pobieranie klas dla nauczyciela:', user.uid);
    
    try {
      const classesRef = collection(db, 'classes');
      const classesSnapshot = await getDocs(classesRef);
      
      console.log('🔍 fetchClasses - pobrano dokumenty klas:', classesSnapshot.docs.length);
      
      // Loguj wszystkie klasy w bazie
      classesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📚 Klasa: ${data.name || 'Brak nazwy'}, teacherId: ${data.teacherId}, nauczyciel: ${user.uid}`);
      });
      
      const classesData = classesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Class))
        .filter(cls => cls.is_active); // Pokaż tylko aktywne klasy
      
      console.log('🔍 fetchClasses - znalezione klasy dla nauczyciela:', classesData.length);
      console.log('🔍 fetchClasses - klasy:', classesData);
      
      setClasses(classesData);
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
      setError('Wystąpił błąd podczas pobierania klas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const studentsData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Student))
        .filter(user => user.role === 'student');
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const coursesData = coursesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Course))
        .filter(course => course.created_by === user?.email);
      
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateClass = async () => {
    if (!formData.name || !formData.grade_level) {
      setError('Wypełnij wszystkie wymagane pola.');
      return;
    }

    console.log('🔍 handleCreateClass - tworzę klasę:', formData);

    try {
      const classData = {
        ...formData,
        students: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        assignedCourses: []
      };

      console.log('🔍 handleCreateClass - dane do zapisania:', classData);

      const docRef = await addDoc(collection(db, 'classes'), classData);
      console.log('✅ handleCreateClass - klasa utworzona z ID:', docRef.id);
      
      setSuccess('Klasa została utworzona pomyślnie!');
      setShowCreateModal(false);
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error('❌ Error creating class:', error);
      setError('Wystąpił błąd podczas tworzenia klasy.');
    }
  };

  const handleEditClass = async () => {
    if (!selectedClass || !formData.name || !formData.grade_level) {
      setError('Wypełnij wszystkie wymagane pola.');
      return;
    }

    try {
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        name: formData.name,
        description: formData.description,
        grade_level: formData.grade_level,
        subject: formData.subject,
        max_students: formData.max_students,
        academic_year: formData.academic_year,
        updated_at: new Date()
      });

      setSuccess('Klasa została zaktualizowana pomyślnie!');
      setShowEditModal(false);
      setSelectedClass(null);
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      setError('Wystąpił błąd podczas aktualizacji klasy.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę klasę?')) return;

    try {
      await deleteDoc(doc(db, 'classes', classId));
      setSuccess('Klasa została usunięta pomyślnie!');
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      setError('Wystąpił błąd podczas usuwania klasy.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      grade_level: 1,
      subject: '',
      max_students: 30,
      academic_year: '2024/2025',
      schedule: [] as any[]
    });
  };

  const updateScheduleSlot = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.map((slot: any, i: number) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const removeScheduleSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_: any, i: number) => i !== index)
    }));
  };

  const resetStudentForm = () => {
    setStudentFormData({
      studentEmail: ''
    });
  };

  const resetCourseForm = () => {
    setCourseFormData({
      courseId: ''
    });
  };

  const handleAddStudentToClass = async () => {
    if (!selectedClass || !studentFormData.studentEmail) {
      setError('Wprowadź email ucznia.');
      return;
    }

    try {
      // Znajdź ucznia po email
      const student = students.find(s => s.email === studentFormData.studentEmail);
      if (!student) {
        setError('Nie znaleziono ucznia o podanym emailu.');
        return;
      }

      // Sprawdź czy uczeń nie jest już w klasie
      if (selectedClass.students?.includes(student.id)) {
        setError('Uczeń jest już w tej klasie.');
        return;
      }

      // Dodaj ucznia do klasy
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        students: arrayUnion(student.id)
      });

      setSuccess('Uczeń został dodany do klasy!');
      resetStudentForm();
      fetchClasses();
    } catch (error) {
      console.error('Error adding student to class:', error);
      setError('Wystąpił błąd podczas dodawania ucznia.');
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string) => {
    if (!selectedClass) return;

    try {
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        students: arrayRemove(studentId)
      });

      setSuccess('Uczeń został usunięty z klasy!');
      fetchClasses();
    } catch (error) {
      console.error('Error removing student from class:', error);
      setError('Wystąpił błąd podczas usuwania ucznia.');
    }
  };

  const handleAssignCourseToClass = async () => {
    if (!selectedClass || !courseFormData.courseId) {
      setError('Wybierz kurs.');
      return;
    }

    try {
      // Sprawdź czy kurs nie jest już przypisany
      if (selectedClass.assignedCourses?.includes(courseFormData.courseId)) {
        setError('Kurs jest już przypisany do tej klasy.');
        return;
      }

      // Dodaj kurs do klasy
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        assignedCourses: arrayUnion(courseFormData.courseId)
      });

      // Dodaj wszystkich uczniów z klasy do kursu
      if (selectedClass.students && selectedClass.students.length > 0) {
        const courseRef = doc(db, 'courses', courseFormData.courseId);
        await updateDoc(courseRef, {
          assignedUsers: arrayUnion(...selectedClass.students)
        });
      }

      setSuccess('Kurs został przypisany do klasy i uczniowie zostali automatycznie dodani!');
      resetCourseForm();
      fetchClasses();
    } catch (error) {
      console.error('Error assigning course to class:', error);
      setError('Wystąpił błąd podczas przypisywania kursu.');
    }
  };

  const handleRemoveCourseFromClass = async (courseId: string) => {
    if (!selectedClass) return;

    try {
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        assignedCourses: arrayRemove(courseId)
      });

      setSuccess('Kurs został usunięty z klasy!');
      fetchClasses();
    } catch (error) {
      console.error('Error removing course from class:', error);
      setError('Wystąpił błąd podczas usuwania kursu.');
    }
  };

  const openEditModal = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description,
      grade_level: cls.grade_level,
      subject: cls.subject,
      max_students: cls.max_students,
      academic_year: cls.academic_year,
      schedule: []
    });
    setShowEditModal(true);
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.grade_level.toString().includes(searchTerm.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('🔍 Render - classes state:', classes);
  console.log('🔍 Render - filteredClasses:', filteredClasses);
  console.log('🔍 Render - searchTerm:', searchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 w-full">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-white/30 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.location.href = '/homelogin/teacher'}
              className="flex items-center gap-3 px-5 py-3 bg-white/70 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 ease-in-out border border-white/30 hover:border-blue-200 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Powrót do dashboard</span>
            </button>

            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600">
                Zarządzanie Klasami
              </h1>
              <p className="text-gray-600 mt-1 font-medium">Organizuj swoje klasy i uczniów</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
              >
                <Plus className="h-5 w-5" />
                <span>Utwórz Klasę</span>
              </button>
              <button 
                onClick={async () => {
                  console.log('🔍 Tworzę przykładową klasę...');
                  const exampleClass = {
                    name: '3A',
                    description: 'Przykładowa klasa matematyki',
                    grade_level: 3,
                    subject: 'Matematyka',
                    max_students: 30,
                    academic_year: '2024/2025',
                    students: [],
                    is_active: true,
                    created_at: new Date(),
                    updated_at: new Date(),
                    assignedCourses: []
                  };
                  
                  try {
                    const docRef = await addDoc(collection(db, 'classes'), exampleClass);
                    console.log('✅ Przykładowa klasa utworzona z ID:', docRef.id);
                    setSuccess('Przykładowa klasa została utworzona!');
                    fetchClasses();
                  } catch (error) {
                    console.error('❌ Błąd tworzenia przykładowej klasy:', error);
                    setError('Błąd tworzenia przykładowej klasy');
                  }
                }}
                className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
              >
                <Plus className="h-5 w-5" />
                <span>Przykładowa Klasa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <School className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
                  <p className="text-sm text-gray-600 font-medium">Utworzonych klas</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {classes.reduce((acc, cls) => acc + cls.students.length, 0)}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Przypisanych uczniów</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(classes.map(cls => cls.subject)).size}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Przedmiotów</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {classes.reduce((acc, cls) => acc + (cls.assignedCourses?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Przypisanych kursów</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Wyszukaj klasę po nazwie, poziomie lub przedmiocie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-gray-700 bg-white hover:border-gray-300 font-medium"
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((cls) => (
              <div key={cls.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1 group h-96 flex flex-col">
                {/* Class Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <School className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(cls)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Class Info */}
                <div className="mb-4 flex-1 min-h-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium mb-2">Klasa {cls.grade_level} • {cls.subject}</p>
                  <div className="h-12 overflow-hidden">
                    {cls.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{cls.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6 flex-shrink-0">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-600 font-medium">Uczniowie</span>
                    <span className="text-lg font-bold text-blue-600">{cls.students?.length || 0}/{cls.max_students}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-600 font-medium">Rok akademicki</span>
                    <span className="text-lg font-bold text-green-600">{cls.academic_year}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto flex-shrink-0 h-12">
                  <button 
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowManageStudentsModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Zarządzaj Uczniami
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowAssignCourseModal(true);
                    }}
                    className="w-12 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all duration-300 border border-green-200 hover:border-green-300 font-medium flex items-center justify-center"
                  >
                    <BookOpen className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredClasses.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <School className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'Nie znaleziono klas' : 'Brak utworzonych klas'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? 'Spróbuj zmienić kryteria wyszukiwania lub wyczyść filtr.'
                  : 'Nie masz jeszcze utworzonych klas. Zacznij od utworzenia pierwszej klasy.'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Utwórz pierwszą klasę
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Utwórz Nową Klasę</h3>
              </div>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nazwa klasy *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="np. 3A, 1B, 2C"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Poziom *
                  </label>
                  <select
                    value={formData.grade_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade_level: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Wybierz poziom</option>
                    <option value="1">Klasa 1</option>
                    <option value="2">Klasa 2</option>
                    <option value="3">Klasa 3</option>
                    <option value="4">Klasa 4</option>
                    <option value="5">Klasa 5</option>
                    <option value="6">Klasa 6</option>
                    <option value="7">Klasa 7</option>
                    <option value="8">Klasa 8</option>
                    <option value="Liceum 1">Liceum 1</option>
                    <option value="Liceum 2">Liceum 2</option>
                    <option value="Liceum 3">Liceum 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Przedmiot *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Wybierz przedmiot</option>
                  <option value="Matematyka">Matematyka</option>
                  <option value="Język polski">Język polski</option>
                  <option value="Historia">Historia</option>
                  <option value="Geografia">Geografia</option>
                  <option value="Biologia">Biologia</option>
                  <option value="Chemia">Chemia</option>
                  <option value="Fizyka">Fizyka</option>
                  <option value="Język angielski">Język angielski</option>
                  <option value="Informatyka">Informatyka</option>
                  <option value="Wychowanie fizyczne">Wychowanie fizyczne</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opis klasy
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  rows={3}
                  placeholder="Krótki opis klasy..."
                />
              </div>

              {/* Schedule Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Plan zajęć
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Funkcja w trakcie rozwoju')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj zajęcia
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.schedule.map((slot, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                      <select
                        value={slot.day}
                        onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Dzień</option>
                        <option value="Poniedziałek">Poniedziałek</option>
                        <option value="Wtorek">Wtorek</option>
                        <option value="Środa">Środa</option>
                        <option value="Czwartek">Czwartek</option>
                        <option value="Piątek">Piątek</option>
                      </select>
                      
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateScheduleSlot(index, 'time', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <input
                        type="text"
                        value={slot.room}
                        onChange={(e) => updateScheduleSlot(index, 'room', e.target.value)}
                        placeholder="Sala"
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <button
                        type="button"
                        onClick={() => removeScheduleSlot(index)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateClass}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Utwórz Klasę
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Edytuj Klasę</h3>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClass(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nazwa klasy *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="np. 3A, 1B, 2C"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Poziom *
                  </label>
                  <select
                    value={formData.grade_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade_level: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Wybierz poziom</option>
                    <option value="1">Klasa 1</option>
                    <option value="2">Klasa 2</option>
                    <option value="3">Klasa 3</option>
                    <option value="4">Klasa 4</option>
                    <option value="5">Klasa 5</option>
                    <option value="6">Klasa 6</option>
                    <option value="7">Klasa 7</option>
                    <option value="8">Klasa 8</option>
                    <option value="Liceum 1">Liceum 1</option>
                    <option value="Liceum 2">Liceum 2</option>
                    <option value="Liceum 3">Liceum 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Przedmiot *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Wybierz przedmiot</option>
                  <option value="Matematyka">Matematyka</option>
                  <option value="Język polski">Język polski</option>
                  <option value="Historia">Historia</option>
                  <option value="Geografia">Geografia</option>
                  <option value="Biologia">Biologia</option>
                  <option value="Chemia">Chemia</option>
                  <option value="Fizyka">Fizyka</option>
                  <option value="Język angielski">Język angielski</option>
                  <option value="Informatyka">Informatyka</option>
                  <option value="Wychowanie fizyczne">Wychowanie fizyczne</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opis klasy
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  rows={3}
                  placeholder="Krótki opis klasy..."
                />
              </div>

              {/* Schedule Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Plan zajęć
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Funkcja w trakcie rozwoju')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj zajęcia
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.schedule.map((slot, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                      <select
                        value={slot.day}
                        onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Dzień</option>
                        <option value="Poniedziałek">Poniedziałek</option>
                        <option value="Wtorek">Wtorek</option>
                        <option value="Środa">Środa</option>
                        <option value="Czwartek">Czwartek</option>
                        <option value="Piątek">Piątek</option>
                      </select>
                      
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateScheduleSlot(index, 'time', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <input
                        type="text"
                        value={slot.room}
                        onChange={(e) => updateScheduleSlot(index, 'room', e.target.value)}
                        placeholder="Sala"
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <button
                        type="button"
                        onClick={() => removeScheduleSlot(index)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleEditClass}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Zaktualizuj Klasę
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClass(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Zarządzaj Uczniami - {selectedClass.name}</h3>
              </div>
              <button 
                onClick={() => {
                  setShowManageStudentsModal(false);
                  setSelectedClass(null);
                  resetStudentForm();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Add Student Form */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="text-lg font-semibold mb-4">Dodaj ucznia do klasy</h4>
                <div className="flex gap-3">
                  <select
                    value={studentFormData.studentEmail}
                    onChange={(e) => setStudentFormData({ studentEmail: e.target.value })}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Wybierz ucznia</option>
                    {students
                      .filter(student => !selectedClass.students?.includes(student.id))
                      .map(student => (
                        <option key={student.id} value={student.email}>
                          {student.name || student.email}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddStudentToClass}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold"
                  >
                    Dodaj
                  </button>
                </div>
              </div>

              {/* Students List */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Uczniowie w klasie ({selectedClass.students?.length || 0})</h4>
                {selectedClass.students && selectedClass.students.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClass.students.map(studentId => {
                      const student = students.find(s => s.id === studentId);
                      return student ? (
                        <div key={studentId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">{student.name || student.email}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveStudentFromClass(studentId)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Brak uczniów w klasie</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignCourseModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Przypisz Kurs - {selectedClass.name}</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAssignCourseModal(false);
                  setSelectedClass(null);
                  resetCourseForm();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Assign Course Form */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="text-lg font-semibold mb-4">Przypisz kurs do klasy</h4>
                <div className="flex gap-3">
                  <select
                    value={courseFormData.courseId}
                    onChange={(e) => setCourseFormData({ courseId: e.target.value })}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  >
                    <option value="">Wybierz kurs</option>
                    {courses
                      .filter(course => !selectedClass.assignedCourses?.includes(course.id))
                      .map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title} - {course.subject}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAssignCourseToClass}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold"
                  >
                    Przypisz
                  </button>
                </div>
              </div>

              {/* Assigned Courses List */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Przypisane kursy ({selectedClass.assignedCourses?.length || 0})</h4>
                {selectedClass.assignedCourses && selectedClass.assignedCourses.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClass.assignedCourses.map(courseId => {
                      const course = courses.find(c => c.id === courseId);
                      return course ? (
                        <div key={courseId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">{course.title}</p>
                            <p className="text-sm text-gray-500">{course.subject}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveCourseFromClass(courseId)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Brak przypisanych kursów</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
