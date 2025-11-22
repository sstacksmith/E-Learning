'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Providers from '@/components/Providers';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  yearOfStudy: number;
  isActive: boolean;
  teacherName: string;
  progress: number;
  lastAccessed: string;
  totalLessons: number;
  completedLessons: number;
}

function ParentCoursesContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [showAllCourses, setShowAllCourses] = useState(false);

  // Pobierz przypisanego ucznia
  useEffect(() => {
    if (!user) return;

    const fetchAssignedStudent = async () => {
      try {
        // 1. Znajdź przypisanego ucznia
        const parentStudentsRef = collection(db, 'parent_students');
        const parentStudentsQuery = query(parentStudentsRef, where('parent', '==', user.uid));
        const parentStudentsSnapshot = await getDocs(parentStudentsQuery);

        if (parentStudentsSnapshot.empty) {
          setLoading(false);
          return;
        }

        const foundStudentId = parentStudentsSnapshot.docs[0].data().student;
        setStudentId(foundStudentId);

        // 2. Pobierz dane ucznia
        const studentDoc = await getDoc(doc(db, 'users', foundStudentId));
        if (studentDoc.exists()) {
          const student = studentDoc.data();
          setStudentData(student);
          setDisplayName(
            student.displayName || 
            `${student.firstName || ''} ${student.lastName || ''}`.trim() || 
            student.email || 
            'Uczeń'
          );
        }
      } catch (error) {
        console.error('Error fetching assigned student:', error);
        setLoading(false);
      }
    };

    fetchAssignedStudent();
  }, [user]);

  // Pobierz kursy dla przypisanego ucznia
  useEffect(() => {
    if (!studentId || !studentData) return;
    
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Pobierz wszystkie kursy
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        
        // Pobierz wszystkie moduły
        const modulesCollection = collection(db, 'modules');
        const modulesSnapshot = await getDocs(modulesCollection);
        
        // Pobierz wszystkie lekcje
        const lessonsCollection = collection(db, 'lessons');
        const lessonsSnapshot = await getDocs(lessonsCollection);
        
        // Pobierz postęp ucznia
        const progressCollection = collection(db, 'progress');
        let progressQuery = query(progressCollection, where('studentId', '==', studentId));
        let progressSnapshot = await getDocs(progressQuery);
        
        // Jeśli nie ma wyników, spróbuj inne warianty
        if (progressSnapshot.empty) {
          progressQuery = query(progressCollection, where('user_id', '==', studentId));
          progressSnapshot = await getDocs(progressQuery);
        }
        
        // Utwórz mapę postępu: lessonId -> progress data
        const progressMap = new Map();
        progressSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const lessonId = data.lessonId || data.lesson_id || data.lesson;
          if (lessonId) {
            progressMap.set(lessonId, data);
          }
        });

        // Filtruj kursy przypisane do ucznia
        const userCourses = await Promise.all(
          coursesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((course: any) => {
              // Sprawdź czy kurs jest przypisany bezpośrednio do ucznia
              const isDirectlyAssigned = course.assignedUsers && 
                (course.assignedUsers.includes(studentId) || course.assignedUsers.includes(studentData.email));
              
              // Sprawdź czy uczeń jest w klasie, która ma przypisane kursy
              const isInAssignedClass = course.assignedClasses && course.assignedClasses.length > 0 &&
                studentData.classes && Array.isArray(studentData.classes) && 
                studentData.classes.some((classId: string) => 
                  course.assignedClasses.includes(classId)
                );
              
              return isDirectlyAssigned || isInAssignedClass;
            })
            .map(async (course: any) => {
              // Znajdź moduły dla tego kursu
              const courseModules = modulesSnapshot.docs.filter(moduleDoc => {
                const moduleData = moduleDoc.data();
                return moduleData.courseId === course.id || 
                       moduleData.course_id === course.id ||
                       moduleData.course === course.id;
              });

              // Znajdź wszystkie lekcje dla modułów tego kursu
              const courseLessons = lessonsSnapshot.docs.filter(lessonDoc => {
                const lessonData = lessonDoc.data();
                return courseModules.some(moduleDoc => 
                  lessonData.moduleId === moduleDoc.id || 
                  lessonData.module_id === moduleDoc.id ||
                  lessonData.module === moduleDoc.id
                );
              });

              // Oblicz postęp
              let totalLessons = courseLessons.length;
              let completedLessons = 0;
              let lastAccessed: string | null = null;

              courseLessons.forEach(lessonDoc => {
                const progressData = progressMap.get(lessonDoc.id);
                if (progressData) {
                  if (progressData.completed) {
                    completedLessons++;
                  }
                  // Znajdź ostatni dostęp
                  const lessonLastAccessed = progressData.lastViewed || progressData.last_viewed;
                  if (lessonLastAccessed) {
                    if (!lastAccessed || new Date(lessonLastAccessed) > new Date(lastAccessed)) {
                      lastAccessed = lessonLastAccessed;
                    }
                  }
                }
              });

              const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

              // Pobierz dane nauczyciela
              let teacherName = 'Nieznany nauczyciel';
              if (course.teacher) {
                try {
                  const teacherDoc = await getDoc(doc(db, 'users', course.teacher));
                  if (teacherDoc.exists()) {
                    const teacher = teacherDoc.data();
                    teacherName = teacher.displayName || teacher.email || 'Nieznany nauczyciel';
                  }
                } catch (err) {
                  console.error('Error fetching teacher:', err);
                }
              } else if (course.teacherName) {
                teacherName = course.teacherName;
              } else if (course.created_by) {
                teacherName = course.created_by;
              }

              return {
                id: course.id,
                title: course.title || 'Brak tytułu',
                description: course.description || 'Brak opisu',
                subject: course.subject || 'Brak przedmiotu',
                yearOfStudy: course.year_of_study || 1,
                isActive: course.is_active !== false,
                teacherName: teacherName,
                progress: progress,
                lastAccessed: lastAccessed || course.updated_at || course.created_at || new Date().toISOString(),
                totalLessons: totalLessons,
                completedLessons: completedLessons
              };
            })
        );

        setCourses(userCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [studentId, studentData]);

  // Filtruj kursy
  const filteredCourses = courses.filter(course => {
    const matchesSubject = selectedSubject === 'all' || course.subject === selectedSubject;
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Pobierz unikalne przedmioty
  const subjects = ['all', ...Array.from(new Set(courses.map(c => c.subject)))];

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
    } catch {
      return 'Nieznana data';
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie kursów...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 sm:px-6 lg:px-8 py-4">
        {/* Mobile Layout - Vertical Stack */}
        <div className="flex flex-col gap-3 sm:hidden">
          <button
            onClick={() => window.location.href = '/homelogin'}
            className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Powrót</span>
          </button>
          
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Kursy Dziecka
          </h1>
        </div>

        {/* Desktop Layout - Horizontal */}
        <div className="hidden sm:flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/homelogin'}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </button>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Kursy Dziecka
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="bg-white/90 backdrop-blur-xl w-full p-4 md:p-6 rounded-2xl shadow-lg border border-white/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Kursy Dziecka <span className="inline-block">📚</span></h2>
          <p className="text-gray-600 mb-6">
            {displayName ? `Kursy przypisane do ${displayName}` : 'Kursy przypisane do Twojego podopiecznego'}
          </p>
        
        {/* Filtry i wyszukiwanie */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Wyszukaj kursy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
          >
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject === 'all' ? 'Wszystkie przedmioty' : subject}
              </option>
            ))}
          </select>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Brak kursów</h3>
            <p className="text-gray-500">
              {courses.length === 0 
                ? 'Twój podopieczny nie ma jeszcze przypisanych kursów.'
                : 'Nie znaleziono kursów spełniających kryteria wyszukiwania.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:space-y-4">
              {filteredCourses.slice(0, 4).map((course) => {
                const isExpanded = expandedCourses.has(course.id);
                return (
                  <div key={course.id} className="bg-white/90 backdrop-blur-xl rounded-xl border border-white/20 hover:border-[#4067EC] transition-all duration-300 hover:shadow-lg overflow-hidden">
                    {/* Course Header - Always Visible */}
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className="w-full p-3 sm:p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#4067EC] rounded-lg flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
                        {course.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-800 mb-1 truncate">
                          {course.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#4067EC] text-white rounded-full text-[10px] sm:text-xs">
                            {course.subject}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-600">
                            {course.progress}% ukończone
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        )}
                      </div>
                    </button>
                    
                    {/* Course Details - Collapsible */}
                    {isExpanded && (
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 mt-3 sm:mt-4">
                          {course.description}
                        </p>
                        
                        {/* Course Info */}
                        <div className="space-y-2 mb-3 sm:mb-4">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="font-medium">Rok:</span>
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                              {course.yearOfStudy}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="font-medium">Nauczyciel:</span>
                            <span className="text-gray-700 truncate">{course.teacherName}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="font-medium">Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              course.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {course.isActive ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="font-medium">Ostatni dostęp:</span>
                            <span className="text-gray-700">{formatDate(course.lastAccessed)}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3 sm:mb-4">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
                            <span>Postęp</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(course.progress)}`}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                            {course.completedLessons} z {course.totalLessons} lekcji ukończonych
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Link
                            href={`/homelogin/parent/courses/${course.id}`}
                            className="flex-1 bg-[#4067EC] text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium hover:bg-[#3050b3] transition-colors text-center"
                          >
                            Zobacz szczegóły
                          </Link>
                          
                          <button className="px-3 py-2 text-[#4067EC] hover:bg-[#4067EC] hover:text-white rounded-lg transition-colors text-sm sm:text-base">
                            ⭐
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pozostałe kursy - zwinięte */}
            {filteredCourses.length > 4 && (
              <>
                {showAllCourses && (
                  <div className="space-y-3 md:space-y-4 mt-4">
                    {filteredCourses.slice(4).map((course) => {
                      const isExpanded = expandedCourses.has(course.id);
                      return (
                        <div key={course.id} className="bg-white/90 backdrop-blur-xl rounded-xl border border-white/20 hover:border-[#4067EC] transition-all duration-300 hover:shadow-lg overflow-hidden">
                          {/* Course Header - Always Visible */}
                          <button
                            onClick={() => toggleCourse(course.id)}
                            className="w-full p-3 sm:p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#4067EC] rounded-lg flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
                              {course.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-800 mb-1 truncate">
                                {course.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 bg-[#4067EC] text-white rounded-full text-[10px] sm:text-xs">
                                  {course.subject}
                                </span>
                                <span className="text-xs sm:text-sm text-gray-600">
                                  {course.progress}% ukończone
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                              )}
                            </div>
                          </button>
                          
                          {/* Course Details - Collapsible */}
                          {isExpanded && (
                            <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
                              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 mt-3 sm:mt-4">
                                {course.description}
                              </p>
                              
                              {/* Course Info */}
                              <div className="space-y-2 mb-3 sm:mb-4">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                  <span className="font-medium">Rok:</span>
                                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                                    {course.yearOfStudy}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                  <span className="font-medium">Nauczyciel:</span>
                                  <span className="text-gray-700 truncate">{course.teacherName}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                  <span className="font-medium">Status:</span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    course.isActive 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {course.isActive ? 'Aktywny' : 'Nieaktywny'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                  <span className="font-medium">Ostatni dostęp:</span>
                                  <span className="text-gray-700">{formatDate(course.lastAccessed)}</span>
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="mb-3 sm:mb-4">
                                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
                                  <span>Postęp</span>
                                  <span>{course.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(course.progress)}`}
                                    style={{ width: `${course.progress}%` }}
                                  ></div>
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                  {course.completedLessons} z {course.totalLessons} lekcji ukończonych
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <Link
                                  href={`/homelogin/parent/courses/${course.id}`}
                                  className="flex-1 bg-[#4067EC] text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium hover:bg-[#3050b3] transition-colors text-center"
                                >
                                  Zobacz szczegóły
                                </Link>
                                
                                <button className="px-3 py-2 text-[#4067EC] hover:bg-[#4067EC] hover:text-white rounded-lg transition-colors text-sm sm:text-base">
                                  ⭐
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Przycisk rozwijania/zwijania */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAllCourses(!showAllCourses)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4067EC] text-white rounded-lg hover:bg-[#3050b3] transition-colors font-medium"
                  >
                    {showAllCourses ? (
                      <>
                        <ChevronUp className="w-5 h-5" />
                        Zwiń pozostałe kursy ({filteredCourses.length - 4})
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-5 h-5" />
                        Pokaż pozostałe kursy ({filteredCourses.length - 4})
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

export default function ParentCoursesPage() {
  return (
    <Providers>
      <ParentCoursesContent />
    </Providers>
  );
}
