"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Types
interface Section {
  id: number;
  name: string;
  type: string;
  deadline?: string;
  contents: Content[];
  submissions?: any[];
}

interface Content {
  id: number;
  name: string;
  fileUrl?: string;
  link?: string;
  text?: string;
  type?: string;
  duration_minutes?: number;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  level: string;
  category: number;
  category_name: string;
  instructor: number;
  instructor_name: string;
  sections: Section[];
}

export default function CourseDetailPage() {
  return (
    <ProtectedRoute>
      <CourseDetail />
    </ProtectedRoute>
  );
}

function CourseDetail() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<number | null>(null);

  // Fetch course details
  useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        console.log('[DEBUG] Slug:', slug);
        console.log('[DEBUG] Fetching from Firestore...');
        
        // Pobierz kurs z Firestore po slug
        const coursesCollection = collection(db, "courses");
        const q = query(coursesCollection, where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('[DEBUG] No course found with slug:', slug);
          setError('Nie znaleziono kursu.');
          setLoading(false);
          return;
        }
        
        const courseDoc = querySnapshot.docs[0];
        const courseData = courseDoc.data();
        console.log('[DEBUG] Course data from Firestore:', courseData);
        console.log('[DEBUG] Sections from Firestore:', courseData.sections);
        console.log('[DEBUG] Sections type:', typeof courseData.sections);
        console.log('[DEBUG] Sections length:', courseData.sections?.length);
        
        // Mapuj dane z Firestore na format oczekiwany przez komponent
        const mappedCourse: Course = {
          id: parseInt(courseDoc.id),
          title: courseData.title || '',
          slug: courseData.slug || slug,
          description: courseData.description || '',
          thumbnail: courseData.thumbnail || '/puzzleicon.png',
          level: courseData.level || 'Podstawowy',
          category: courseData.category || 1,
          category_name: courseData.category_name || 'Ogólny',
          instructor: courseData.instructor || 1,
          instructor_name: courseData.instructor_name || 'Instructor',
          sections: courseData.sections || []
        };
        
        console.log('[DEBUG] Mapped course:', mappedCourse);
        console.log('[DEBUG] Mapped sections:', mappedCourse.sections);
        
        setCourse(mappedCourse);
        
        // Set the first section as active by default
        if (mappedCourse.sections && mappedCourse.sections.length > 0) {
          setActiveModule(mappedCourse.sections[0].id);
          console.log('[DEBUG] Set active section to:', mappedCourse.sections[0].id);
        } else {
          console.log('[DEBUG] No sections found, activeModule remains null');
        }
      } catch (err) {
        console.error('[DEBUG] Error fetching course from Firestore:', err);
        setError('Błąd ładowania kursu. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCourseDetail();
    }
  }, [slug]);

  const enrollInCourse = async () => {
    // Add enrollment logic here
    alert('Enrollment feature coming soon!');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative overflow-hidden rounded-full h-8 w-8">
                <Image
                  src="/puzzleicon.png"
                  alt="Cogito Logo"
                  width={32}
                  height={32}
                />
              </div>
              <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
            </Link>
          </div>
        </header>
        
        <main className="flex-grow bg-gray-100 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center items-center h-64">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
              <span className="ml-3 text-gray-600">Loading course...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render error state
  if (error || !course) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative overflow-hidden rounded-full h-8 w-8">
                <Image
                  src="/puzzleicon.png"
                  alt="Cogito Logo"
                  width={32}
                  height={32}
                />
              </div>
              <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
            </Link>
          </div>
        </header>
        
        <main className="flex-grow bg-gray-100 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
              <p>{error || 'Course not found'}</p>
              <div className="mt-4 flex space-x-4">
                <button 
                  className="text-sm text-[#4067EC] hover:underline"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </button>
                <Link href="/courses" className="text-sm text-[#4067EC] hover:underline">
                  Back to Courses
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Course Banner - bez białego headera */}
      <div className="bg-gradient-to-br from-[#4067EC] to-[#3155d4] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Navigation bar */}
        <div className="relative z-10 bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="relative overflow-hidden rounded-full h-8 w-8 bg-white/20 backdrop-blur-sm">
                  <Image
                    src="/puzzleicon.png"
                    alt="Cogito Logo"
                    width={32}
                    height={32}
                    className="p-1"
                  />
                </div>
                <span className="text-xl font-semibold text-white">Cogito</span>
              </Link>
              
              <nav className="hidden md:flex space-x-8">
                <Link href="/homelogin" className="text-white/80 hover:text-white transition-colors">Dashboard</Link>
                <Link href="/courses" className="text-white/80 hover:text-white transition-colors">Courses</Link>
                <Link href="/about" className="text-white/80 hover:text-white transition-colors">About</Link>
              </nav>
              
              <Link href="/homelogin" className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-white/30 transition-colors border border-white/30">
                My Dashboard
              </Link>
            </div>
          </div>
        </div>
        
        {/* Course content */}
        <div className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:flex-1">
              <p className="text-white text-sm font-medium mb-2">
                <Link href="/courses" className="hover:underline">Courses</Link> / {course.category_name}
              </p>
              <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
              <p className="text-white/80 mb-4">{course.description}</p>
              
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                </span>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {course.category_name}
                </span>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {course.sections?.reduce((total, section) => 
                    total + section.contents.length, 0) || 0} lessons
                </span>
              </div>
              
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <span className="text-white text-sm">Instructor:</span>
                  <span className="text-white font-medium ml-1">{course.instructor_name}</span>
                </div>
                
                <button 
                  className="px-6 py-2 bg-white text-[#4067EC] rounded-md font-medium hover:bg-gray-100 transition-colors"
                  onClick={enrollInCourse}
                >
                  Enroll Now
                </button>
              </div>
            </div>
            
            {course.thumbnail && (
              <div className="mt-6 md:mt-0 md:ml-6 flex-shrink-0">
                <div className="w-full md:w-64 h-36 md:h-48 relative rounded-lg overflow-hidden shadow-lg">
                  <Image 
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <main className="flex-grow bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Module Navigation Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto py-2 px-4">
                {course.sections?.map((section) => (
                  <button
                    key={section.id}
                    className={`whitespace-nowrap px-4 py-2 font-medium text-sm rounded-md mr-2 ${
                      activeModule === section.id
                        ? 'bg-[#F1F4FE] text-[#4067EC]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveModule(section.id)}
                  >
                    {section.name}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Module Content */}
            <div className="p-6">
              {course.sections?.map((section) => (
                <div 
                  key={section.id} 
                  className={activeModule === section.id ? 'block' : 'hidden'}
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{section.name}</h2>
                    <p className="text-gray-600">{section.type}</p>
                  </div>
                  
                  {/* Lessons List */}
                  <div className="space-y-4">
                    {section.contents.map((content) => (
                      <div 
                        key={content.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-[#4067EC] transition-colors"
                      >
                        <div className="sm:flex sm:items-center sm:justify-between">
                          <div className="flex items-start">
                            <div className="mr-3 flex-shrink-0">
                              {content.fileUrl && (
                                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              {content.text && (
                                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              {content.link && (
                                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{content.name}</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {content.fileUrl ? 'File' : content.text ? 'Text' : content.link ? 'Link' : 'Content'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 sm:mt-0 sm:ml-4">
                            <button className="inline-flex items-center px-4 py-2 border border-[#4067EC] rounded-md shadow-sm text-sm font-medium text-[#4067EC] bg-white hover:bg-[#F1F4FE] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4067EC]">
                              View Content
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* If no modules */}
              {(!course.sections || course.sections.length === 0) && (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No content available</h3>
                  <p className="mt-1 text-sm text-gray-500">This course doesn&apos;t have any modules or lessons yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:justify-between">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="relative overflow-hidden rounded-full h-8 w-8">
                  <Image
                    src="/puzzleicon.png"
                    alt="Cogito Logo"
                    width={32}
                    height={32}
                  />
                </div>
                <span className="text-xl font-semibold text-[#4067EC]">Cogito</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Learning that transforms lives
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase mb-3">Platform</h3>
                <ul className="space-y-2">
                  <li><Link href="/" className="text-gray-600 hover:text-gray-800">Home</Link></li>
                  <li><Link href="/courses" className="text-gray-600 hover:text-gray-800">Courses</Link></li>
                  <li><Link href="/about" className="text-gray-600 hover:text-gray-800">About</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase mb-3">Support</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Help Center</Link></li>
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Contact</Link></li>
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">FAQ</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase mb-3">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Privacy Policy</Link></li>
                  <li><Link href="#" className="text-gray-600 hover:text-gray-800">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Cogito Learning. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 