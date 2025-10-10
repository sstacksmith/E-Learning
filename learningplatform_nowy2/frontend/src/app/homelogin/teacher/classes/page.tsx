'use client';

import { useState, useEffect, useRef } from 'react';
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';

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
  schedule?: Array<{
    day: string;
    time: string;
    room: string;
  }>;
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

  // Multi-selection states
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      
      // Pobierz wszystkie kursy, nie tylko te utworzone przez nauczyciela
      const coursesData = coursesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      console.log('🔍 fetchCourses - pobrano kursów:', coursesData.length);
      console.log('🔍 fetchCourses - kursy:', coursesData.map(c => c.title));
      
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
      
      // Synchronizuj plan zajęć z kalendarzem
      try {
        await syncClassScheduleToCalendar(classData, []);
        console.log('✅ Plan zajęć zsynchronizowany z kalendarzem');
      } catch (syncError) {
        console.error('❌ Błąd synchronizacji planu zajęć:', syncError);
        // Nie przerywamy procesu tworzenia klasy, tylko logujemy błąd
      }
      
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
        schedule: formData.schedule, // ✅ Dodano zapisywanie planu zajęć
        updated_at: new Date()
      });

      // Synchronizuj plan zajęć z kalendarzem po edycji
      try {
        const updatedClassData = {
          ...selectedClass,
          ...formData,
          id: selectedClass.id
        };
        await syncClassScheduleToCalendar(updatedClassData, selectedClass.students || []);
        console.log('✅ Plan zajęć zsynchronizowany z kalendarzem po edycji');
      } catch (syncError) {
        console.error('❌ Błąd synchronizacji planu zajęć po edycji:', syncError);
        // Nie przerywamy procesu edycji klasy, tylko logujemy błąd
      }

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

  const addScheduleSlot = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, {
        day: '',
        time: '',
        room: ''
      }]
    }));
  };

  // Funkcja synchronizacji planu zajęć z kalendarzem
  const syncClassScheduleToCalendar = async (classData: any, students: string[]) => {
    if (!classData.schedule || classData.schedule.length === 0) {
      console.log('No schedule to sync for class:', classData.name);
      return;
    }

    try {
      console.log('Syncing schedule to calendar for class:', classData.name);
      
      // Dla każdego slotu planu zajęć
      for (const scheduleSlot of classData.schedule) {
        if (!scheduleSlot.day || !scheduleSlot.time || !scheduleSlot.room) {
          console.log('Skipping incomplete schedule slot:', scheduleSlot);
          continue;
        }

        // Konwertuj dzień tygodnia na datę (następny występ tego dnia)
        const dayMapping = {
          'Poniedziałek': 1,
          'Wtorek': 2,
          'Środa': 3,
          'Czwartek': 4,
          'Piątek': 5
        };

        const targetDay = dayMapping[scheduleSlot.day as keyof typeof dayMapping];
        if (!targetDay) continue;

        // Znajdź następny występ tego dnia tygodnia
        const today = new Date();
        const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
        const nextOccurrence = new Date(today);
        nextOccurrence.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));

        // Utwórz wydarzenie kalendarza
        const eventData = {
          title: `${scheduleSlot.room} - ${classData.name}`,
          description: `Lekcja dla klasy ${classData.name}`,
          type: 'class_lesson',
          classId: classData.id,
          className: classData.name,
          subject: classData.subject || 'Lekcja',
          room: scheduleSlot.room,
          day: scheduleSlot.day,
          time: scheduleSlot.time,
          students: students, // Lista studentów przypisanych do klasy
          assignedTo: students, // Kompatybilność ze starszą strukturą
          date: nextOccurrence.toISOString().split('T')[0], // YYYY-MM-DD
          startTime: scheduleSlot.time,
          endTime: calculateEndTime(scheduleSlot.time, 45), // 45 minut lekcji
          createdBy: user?.email,
          createdAt: serverTimestamp(),
          isRecurring: true, // Oznaczenie że to powtarzające się zajęcia
          recurrenceType: 'weekly'
        };

        console.log('Creating calendar event:', eventData);
        
        // Dodaj wydarzenie do kolekcji events
        await addDoc(collection(db, 'events'), eventData);
      }

      console.log('Schedule synced successfully for class:', classData.name);
    } catch (error) {
      console.error('Error syncing schedule to calendar:', error);
      throw error;
    }
  };

  // Funkcja pomocnicza do obliczania czasu zakończenia lekcji
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const resetStudentForm = () => {
    setStudentFormData({
      studentEmail: ''
    });
    setSelectedStudents([]);
    setStudentSearchTerm('');
    setShowStudentDropdown(false);
  };

  // Multi-selection functions
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    const availableStudents = students
      .filter(student => !selectedClass?.students?.includes(student.id))
      .filter(student => 
        student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
      )
      .map(student => student.id);
    
    setSelectedStudents(availableStudents);
  };

  const clearAllSelections = () => {
    setSelectedStudents([]);
  };

  const handleAddMultipleStudentsToClass = async () => {
    if (!selectedClass || selectedStudents.length === 0) {
      setError('Wybierz przynajmniej jednego ucznia.');
      return;
    }

    try {
      const classRef = doc(db, 'classes', selectedClass.id);
      
      // Dodaj wszystkich wybranych uczniów do klasy
      await updateDoc(classRef, {
        students: arrayUnion(...selectedStudents)
      });

      // Synchronizuj plan zajęć klasy z kalendarzem dla nowych studentów
      try {
        const updatedStudents = [...(selectedClass.students || []), ...selectedStudents];
        await syncClassScheduleToCalendar(selectedClass, updatedStudents);
        console.log('✅ Plan zajęć zsynchronizowany dla nowych studentów');
      } catch (syncError) {
        console.error('❌ Błąd synchronizacji planu zajęć dla studentów:', syncError);
      }

      setSuccess(`${selectedStudents.length} uczniów zostało dodanych do klasy!`);
      resetStudentForm();
      fetchClasses();
    } catch (error) {
      console.error('Error adding students to class:', error);
      setError('Wystąpił błąd podczas dodawania uczniów.');
    }
  };

  const resetCourseForm = () => {
    setCourseFormData({
      courseId: ''
    });
  };

  // Funkcja do synchronizacji wszystkich klas z kalendarzem
  const syncAllClassesToCalendar = async () => {
    try {
      console.log('🔄 Rozpoczynam synchronizację wszystkich klas z kalendarzem...');
      
      for (const classItem of classes) {
        if (classItem.schedule && classItem.schedule.length > 0 && classItem.students && classItem.students.length > 0) {
          console.log(`Synchronizuję klasę: ${classItem.name}`);
          await syncClassScheduleToCalendar(classItem, classItem.students);
        }
      }
      
      setSuccess('Wszystkie klasy zostały zsynchronizowane z kalendarzem!');
      console.log('✅ Synchronizacja wszystkich klas zakończona');
    } catch (error) {
      console.error('❌ Błąd synchronizacji wszystkich klas:', error);
      setError('Wystąpił błąd podczas synchronizacji klas z kalendarzem.');
    }
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

      // Synchronizuj plan zajęć klasy z kalendarzem dla tego studenta
      try {
        const updatedStudents = [...(selectedClass.students || []), student.id];
        await syncClassScheduleToCalendar(selectedClass, updatedStudents);
        console.log('✅ Plan zajęć zsynchronizowany dla nowego studenta');
      } catch (syncError) {
        console.error('❌ Błąd synchronizacji planu zajęć dla studenta:', syncError);
        // Nie przerywamy procesu, tylko logujemy błąd
      }

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
      schedule: cls.schedule || [] // ✅ Ładuj istniejący plan zajęć
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

          {/* Synchronization Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={syncAllClassesToCalendar}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
              title="Synchronizuj plan zajęć wszystkich klas z kalendarzem"
            >
              <Calendar className="h-4 w-4" />
              Synchronizuj z kalendarzem
            </button>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredClasses.map((cls) => (
              <div key={cls.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 p-4 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1 group h-80 flex flex-col">
                {/* Class Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <School className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEditModal(cls)}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Class Info */}
                <div className="mb-4 flex-1 min-h-0">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {cls.name}
                  </h3>
                  <p className="text-xs text-gray-600 font-medium mb-4">Klasa {cls.grade_level} • {cls.subject}</p>
                </div>

                {/* Stats */}
                <div className="mb-6 flex-shrink-0">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-600 font-medium">Uczniowie</span>
                    <span className="text-sm font-bold text-blue-600">{cls.students?.length || 0}/{cls.max_students}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto flex-shrink-0 h-10">
                  <button 
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowManageStudentsModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-2 rounded-lg hover:bg-blue-700 transition-all duration-300 font-medium text-xs shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Zarządzaj
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowAssignCourseModal(true);
                    }}
                    className="w-10 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all duration-300 border border-green-200 hover:border-green-300 font-medium flex items-center justify-center"
                  >
                    <BookOpen className="h-3 w-3" />
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
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Przedmiot/Kurs *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Wybierz przedmiot/kurs</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.title}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Brak dostępnych kursów. Utwórz najpierw kurs w sekcji &quot;Moje Kursy&quot;.
                  </p>
                )}
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
                    onClick={addScheduleSlot}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj zajęcia
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.schedule.map((slot, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Dzień tygodnia</label>
                        <select
                          value={slot.day || ''}
                          onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Wybierz dzień</option>
                          <option value="Poniedziałek">Poniedziałek</option>
                          <option value="Wtorek">Wtorek</option>
                          <option value="Środa">Środa</option>
                          <option value="Czwartek">Czwartek</option>
                          <option value="Piątek">Piątek</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Godzina</label>
                        <input
                          type="time"
                          value={slot.time || ''}
                          onChange={(e) => updateScheduleSlot(index, 'time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sala/Przedmiot</label>
                        <input
                          type="text"
                          value={slot.room || ''}
                          onChange={(e) => updateScheduleSlot(index, 'room', e.target.value)}
                          placeholder="np. Sala 101, Matematyka"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeScheduleSlot(index)}
                          className="w-full flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Usuń zajęcia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {formData.schedule.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Brak zaplanowanych zajęć</p>
                      <p className="text-sm mt-2">Dodaj zajęcia, aby stworzyć plan dla tej klasy</p>
                    </div>
                  )}
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
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Przedmiot/Kurs *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Wybierz przedmiot/kurs</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.title}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Brak dostępnych kursów. Utwórz najpierw kurs w sekcji &quot;Moje Kursy&quot;.
                  </p>
                )}
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
                    onClick={addScheduleSlot}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj zajęcia
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.schedule.map((slot, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Dzień tygodnia</label>
                        <select
                          value={slot.day || ''}
                          onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Wybierz dzień</option>
                          <option value="Poniedziałek">Poniedziałek</option>
                          <option value="Wtorek">Wtorek</option>
                          <option value="Środa">Środa</option>
                          <option value="Czwartek">Czwartek</option>
                          <option value="Piątek">Piątek</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Godzina</label>
                        <input
                          type="time"
                          value={slot.time || ''}
                          onChange={(e) => updateScheduleSlot(index, 'time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sala/Przedmiot</label>
                        <input
                          type="text"
                          value={slot.room || ''}
                          onChange={(e) => updateScheduleSlot(index, 'room', e.target.value)}
                          placeholder="np. Sala 101, Matematyka"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeScheduleSlot(index)}
                          className="w-full flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Usuń zajęcia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {formData.schedule.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Brak zaplanowanych zajęć</p>
                      <p className="text-sm mt-2">Dodaj zajęcia, aby stworzyć plan dla tej klasy</p>
                    </div>
                  )}
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
              {/* Add Students Form with Multi-selection */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="text-lg font-semibold mb-4">Dodaj uczniów do klasy</h4>
                
                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Wyszukaj uczniów po nazwie lub emailu..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Selection Controls */}
                {selectedStudents.length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">
                      Wybrano: {selectedStudents.length} uczniów
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllStudents}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Zaznacz wszystkich
                      </button>
                      <button
                        onClick={clearAllSelections}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Wyczyść
                      </button>
                    </div>
                  </div>
                )}

                {/* Students Dropdown */}
                {showStudentDropdown && (
                  <div ref={dropdownRef} className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg mb-4">
                    {students
                      .filter(student => !selectedClass.students?.includes(student.id))
                      .filter(student => 
                        student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
                      )
                      .map(student => (
                        <div
                          key={student.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => toggleStudentSelection(student.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {student.name || 'Brak nazwy'}
                            </p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                        </div>
                      ))}
                    
                    {students
                      .filter(student => !selectedClass.students?.includes(student.id))
                      .filter(student => 
                        student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
                      ).length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        <p>Brak dostępnych uczniów</p>
                        <p className="text-sm">Wszyscy uczniowie są już w tej klasie</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Button */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddMultipleStudentsToClass}
                    disabled={selectedStudents.length === 0}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    Dodaj wybranych ({selectedStudents.length})
                  </button>
                  <button
                    onClick={() => setShowStudentDropdown(!showStudentDropdown)}
                    className="px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 transition-all duration-200"
                  >
                    {showStudentDropdown ? 'Ukryj listę' : 'Pokaż listę'}
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
