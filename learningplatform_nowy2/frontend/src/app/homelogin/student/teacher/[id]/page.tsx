'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  BookOpen, 
  Award, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  thumbnail?: string;
}

interface TeacherProfile {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  photoURL?: string;
  subject?: string;
  description?: string;
  experience?: string;
  specialization?: string[];
  availability?: string;
  activeCourses?: number;
  totalStudents?: number;
  averageRating?: number;
  achievements?: Achievement[];
}

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params?.id as string;
  
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeacherProfile = useCallback(async () => {
    if (!teacherId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Pobierz dane nauczyciela
      const teacherDocRef = doc(db, 'users', teacherId);
      const teacherSnap = await getDoc(teacherDocRef);
      
      if (!teacherSnap.exists()) {
        setError('Nauczyciel nie został znaleziony.');
        return;
      }

      const teacherData = teacherSnap.data();
      
      // Oblicz statystyki z Firebase
      let activeCourses = teacherData.activeCourses || 0;
      let totalStudents = teacherData.totalStudents || 0;
      let averageRating = teacherData.averageRating || 0;
      
      // Pobierz kursy nauczyciela
      const coursesCollection = collection(db, 'courses');
      const [coursesByEmail, coursesByUid, coursesByTeacherEmail] = await Promise.all([
        getDocs(query(coursesCollection, where('created_by', '==', teacherData.email))),
        getDocs(query(coursesCollection, where('created_by', '==', teacherId))),
        getDocs(query(coursesCollection, where('teacherEmail', '==', teacherData.email)))
      ]);
      
      const coursesMap = new Map();
      [coursesByEmail, coursesByUid, coursesByTeacherEmail].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          coursesMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      });
      
      const teacherCourses: Course[] = Array.from(coursesMap.values()).map((course: any) => ({
        id: course.id,
        title: course.title || 'Brak tytułu',
        description: course.description || '',
        subject: course.subject || course.category_name || '',
        thumbnail: course.thumbnail || ''
      }));
      
      activeCourses = coursesMap.size;
      setCourses(teacherCourses);
      
      // Pobierz uczniów przypisanych do kursów
      const allAssignedUsers = new Set<string>();
      coursesMap.forEach((course: any) => {
        if (course.assignedUsers && Array.isArray(course.assignedUsers)) {
          course.assignedUsers.forEach((userId: string) => allAssignedUsers.add(userId));
        }
      });
      
      const uniqueStudents = new Set<string>();
      for (const userId of allAssignedUsers) {
        try {
          let studentDoc;
          if (userId.includes('@')) {
            const studentsCollection = collection(db, 'users');
            const emailQuery = query(studentsCollection, where("email", "==", userId), where("role", "==", "student"));
            const emailSnapshot = await getDocs(emailQuery);
            if (!emailSnapshot.empty) {
              studentDoc = emailSnapshot.docs[0];
            }
          } else {
            const userDocRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role === 'student') {
              studentDoc = userDocSnap;
            }
          }
          
          if (studentDoc) {
            uniqueStudents.add(studentDoc.id);
          }
        } catch (error) {
          console.error(`Błąd podczas pobierania ucznia ${userId}:`, error);
        }
      }
      
      totalStudents = uniqueStudents.size;
      
      // Pobierz średnią ocenę z ankiet
      try {
        const surveysCollection = collection(db, 'teacherSurveys');
        const surveysQuery = query(surveysCollection, where('teacherId', '==', teacherId));
        const surveysSnapshot = await getDocs(surveysQuery);
        
        if (!surveysSnapshot.empty) {
          let totalScore = 0;
          let count = 0;
          
          surveysSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.averageScore && typeof data.averageScore === 'number') {
              totalScore += data.averageScore;
              count++;
            } else if (data.responses) {
              const scores = Object.values(data.responses).filter((score: any) => typeof score === 'number');
              if (scores.length > 0) {
                const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
                totalScore += avg;
                count++;
              }
            }
          });
          
          if (count > 0) {
            averageRating = totalScore / count;
          }
        }
      } catch (error) {
        console.error('Błąd podczas pobierania ankiet:', error);
      }
      
      // Mock achievements
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          title: 'Mistrz Edukacji',
          description: 'Za przeprowadzenie 100+ lekcji',
          date: '10.01.2024',
          icon: '🏆'
        },
        {
          id: '2',
          title: 'Mentor Roku',
          description: 'Za wysokie oceny od uczniów',
          date: '05.01.2024',
          icon: '⭐'
        },
        {
          id: '3',
          title: 'Innowator',
          description: 'Za wprowadzenie nowych metod nauczania',
          date: '15.12.2023',
          icon: '💡'
        }
      ];
      
      setTeacher({
        id: teacherId,
        fullName: teacherData.fullName || teacherData.displayName || 'Brak nazwiska',
        displayName: teacherData.displayName || teacherData.fullName || 'Brak nazwiska',
        email: teacherData.email || '',
        phone: teacherData.phone || '',
        avatarUrl: teacherData.avatarUrl || teacherData.photoURL || '',
        photoURL: teacherData.photoURL || teacherData.avatarUrl || '',
        subject: teacherData.subject || 'Ogólne',
        description: teacherData.description || 'Doświadczony nauczyciel z pasją do nauczania.',
        experience: teacherData.experience || '5+ lat',
        specialization: teacherData.specialization || ['Edukacja domowa', 'Indywidualne podejście'],
        availability: teacherData.availability || 'Pon-Pt 8:00-16:00',
        activeCourses,
        totalStudents,
        averageRating,
        achievements: teacherData.achievements || mockAchievements
      });
      
    } catch (err) {
      console.error('Błąd podczas pobierania profilu nauczyciela:', err);
      setError('Nie udało się pobrać profilu nauczyciela.');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTeacherProfile();
  }, [fetchTeacherProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Ładowanie profilu nauczyciela...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Błąd</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Nauczyciel nie został znaleziony'}</p>
            <button
              onClick={() => router.push('/homelogin')}
              className="px-6 py-3 bg-[#4067EC] text-white rounded-lg hover:bg-[#3050b3] transition"
            >
              Powrót do panelu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-gray-900 w-full">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-white/20 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/homelogin')}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20 dark:border-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót
          </button>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Profil Nauczyciela
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-white/20 dark:border-gray-700">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-[#4067EC] to-[#5577FF] text-white rounded-t-xl">
              <div className="flex items-center gap-4">
                {teacher.photoURL || teacher.avatarUrl ? (
                  <img 
                    src={teacher.photoURL || teacher.avatarUrl} 
                    alt={teacher.displayName} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {teacher.displayName[0] || 'N'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold">{teacher.displayName}</h3>
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                      Nauczyciel
                    </span>
                  </div>
                  <p className="text-sm opacity-90">{teacher.subject}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">O nauczycielu</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{teacher.description}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teacher.activeCourses || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Kursy</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{teacher.totalStudents || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Uczniów</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(teacher.averageRating || 0).toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Ocena</div>
                </div>
              </div>

              {/* Experience & Availability */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Doświadczenie</h5>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{teacher.experience}</p>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Dostępność</h5>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{teacher.availability}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{teacher.email}</span>
                </div>
                {teacher.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{teacher.phone}</span>
                  </div>
                )}
              </div>

              {/* Achievements */}
              {teacher.achievements && teacher.achievements.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                      Osiągnięcia
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{teacher.achievements.length} odznak</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teacher.achievements.map((achievement) => (
                      <div 
                        key={achievement.id} 
                        className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 via-blue-50 to-purple-50 dark:from-gray-700 dark:via-blue-900/20 dark:to-purple-900/20 rounded-xl hover:from-blue-100 hover:via-purple-100 hover:to-pink-100 dark:hover:from-blue-900/30 dark:hover:via-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-300 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                      >
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">{achievement.title}</h5>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{achievement.description}</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{achievement.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Courses */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Prowadzone kursy
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{courses.length} kursów</span>
                </div>
                
                {courses.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Ten nauczyciel nie prowadzi jeszcze żadnych kursów.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 cursor-pointer transition-all duration-300 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#4067EC] to-[#5577FF] rounded-xl flex items-center justify-center shadow-lg">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{course.title}</div>
                          {course.subject && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{course.subject}</div>
                          )}
                        </div>
                      </div>
                    ))}
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

