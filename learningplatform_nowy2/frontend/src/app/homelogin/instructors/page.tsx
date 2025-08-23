"use client";
import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
  profileImageUrl: string;
  subjects: string;
  experience: string;
  education: string;
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('role', '==', 'teacher'));
      const querySnapshot = await getDocs(q);
      
      const instructorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Instructor));
      
      setInstructors(instructorsData);
    } catch (err) {
      console.error('Error loading instructors:', err);
      setError('Błąd ładowania instruktorów');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
              Instruktorzy i Tutorzy
            </h1>
            
            <div className="w-20"></div>
          </div>
        </div>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex justify-center items-center h-64">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
            <span className="ml-3 text-gray-600">Ładowanie instruktorów...</span>
          </div>
        </main>
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
            Instruktorzy i Tutorzy
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        
        {instructors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Brak dostępnych instruktorów</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-white/20">
                {/* Profile Image */}
                <div className="flex flex-col items-center mb-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#4067EC] mb-4">
                    {instructor.profileImageUrl ? (
                      <Image 
                        src={instructor.profileImageUrl} 
                        alt={`${instructor.firstName} ${instructor.lastName}`} 
                        width={96} 
                        height={96} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-xl text-gray-800 text-center">
                    {instructor.firstName} {instructor.lastName}
                  </h3>
                  
                  {instructor.subjects && (
                    <p className="text-sm text-[#4067EC] font-medium text-center mt-1">
                      {instructor.subjects}
                    </p>
                  )}
                </div>
                
                {/* Description */}
                {instructor.description && (
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {instructor.description.length > 150 
                        ? `${instructor.description.substring(0, 150)}...` 
                        : instructor.description
                      }
                    </p>
                  </div>
                )}
                
                {/* Experience & Education */}
                <div className="space-y-3 mb-6">
                  {instructor.experience && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">Doświadczenie:</h4>
                      <p className="text-xs text-gray-600">
                        {instructor.experience.length > 100 
                          ? `${instructor.experience.substring(0, 100)}...` 
                          : instructor.experience
                        }
                      </p>
                    </div>
                  )}
                  
                  {instructor.education && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">Wykształcenie:</h4>
                      <p className="text-xs text-gray-600">
                        {instructor.education.length > 100 
                          ? `${instructor.education.substring(0, 100)}...` 
                          : instructor.education
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Contact Button */}
                <div className="flex justify-center">
                  <Link 
                    href={`/homelogin/instructors/profile/${instructor.id}`}
                    className="bg-[#4067EC] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#3155d4] transition-colors duration-200"
                  >
                    Zobacz pełny profil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 