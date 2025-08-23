'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Providers from '@/components/Providers';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  courseId: string;
  courseTitle: string;
  fileUrl?: string;
  type: 'document' | 'video' | 'link' | 'other';
  createdAt: string;
  teacherName: string;
}

function StudentMaterialsContent() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        
        // Pobierz kursy ucznia
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        const userCourses = coursesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((course: any) => 
            course.assignedUsers && 
            (course.assignedUsers.includes(user.uid) || course.assignedUsers.includes(user.email))
          );

        // Pobierz materiały z kursów ucznia
        const materialsCollection = collection(db, 'materials');
        const materialsSnapshot = await getDocs(materialsCollection);
        
        const materialsList = materialsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Material))
          .filter((material: Material) => 
            userCourses.some(course => course.id === material.courseId)
          );

        setMaterials(materialsList);
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [user]);

  // Filtruj materiały
  const filteredMaterials = materials.filter(material => {
    const matchesSubject = selectedSubject === 'all' || material.subject === selectedSubject;
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Pobierz unikalne przedmioty
  const subjects = ['all', ...Array.from(new Set(materials.map(m => m.subject)))];

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'document': return '📄';
      case 'video': return '🎥';
      case 'link': return '🔗';
      default: return '📚';
    }
  };

  const getMaterialTypeLabel = (type: string) => {
    switch (type) {
      case 'document': return 'Dokument';
      case 'video': return 'Wideo';
      case 'link': return 'Link';
      default: return 'Inne';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie materiałów...</p>
        </div>
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
            Materiały edukacyjne
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="bg-white/90 backdrop-blur-xl w-full max-w-6xl mx-auto p-4 md:p-6 rounded-2xl shadow-lg border border-white/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Materiały edukacyjne <span className="inline-block">📚</span></h2>
          <p className="text-gray-600 mb-6">Dostępne materiały z Twoich kursów</p>
        
        {/* Filtry i wyszukiwanie */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Wyszukaj materiały..."
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

        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Brak materiałów</h3>
            <p className="text-gray-500">
              {materials.length === 0 
                ? 'Nie masz jeszcze przypisanych materiałów do swoich kursów.'
                : 'Nie znaleziono materiałów spełniających kryteria wyszukiwania.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredMaterials.map((material) => (
              <div key={material.id} className="bg-white/90 backdrop-blur-xl rounded-xl p-4 md:p-6 border border-white/20 hover:border-[#4067EC] transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-3xl">{getMaterialIcon(material.type)}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2">
                      {material.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                      {material.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Przedmiot:</span>
                    <span className="px-2 py-1 bg-[#4067EC] text-white rounded-full text-xs">
                      {material.subject}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Kurs:</span>
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                      {material.courseTitle}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Typ:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {getMaterialTypeLabel(material.type)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Nauczyciel:</span>
                    <span className="text-gray-700">{material.teacherName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Data:</span>
                    <span className="text-gray-700">
                      {new Date(material.createdAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </div>
                
                {material.fileUrl && (
                  <Link
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#4067EC] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#3050b3] transition-colors text-center block"
                  >
                    Otwórz materiał
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function StudentMaterialsPage() {
  return (
    <Providers>
      <StudentMaterialsContent />
    </Providers>
  );
} 