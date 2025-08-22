"use client";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Providers from '@/components/Providers';
import Link from 'next/link';
import { ArrowLeft, BarChart3, LogOut, Camera, User, Mail, GraduationCap, Shield, MapPin, Phone, BookOpen, Award } from 'lucide-react';

function ProfilePageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [userClass, setUserClass] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || '');
        setEmail(data.email || '');
        setUserClass(data.class || '');
        setPhotoURL(data.photoURL || '');
      }
      setLoading(false);
    };
    fetchUserData();
  }, [user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setUploadError('Proszę wybrać plik obrazu (JPG, PNG)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Plik jest za duży. Maksymalny rozmiar to 5MB.');
      return;
    }
    
    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      
          const storageRef = ref(storage, `profile_photos/${user.uid}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      
      setPhotoURL(url);
      setUploadSuccess(true);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error uploading photo:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
        setUploadError('Błąd podczas przesyłania zdjęcia. Spróbuj ponownie.');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).click();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('firebaseToken');
    router.push('/login');
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/homelogin')}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </button>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mój profil
          </h1>
          
          <div className="w-20"></div> {/* Spacer dla wycentrowania */}
        </div>
        </div>

      {/* Główna zawartość */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 h-full">
          
          {/* Lewa kolumna - Profil */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 lg:p-8 h-fit">
              {/* Zdjęcie profilowe */}
              <div className="flex flex-col items-center mb-6 lg:mb-8">
                <div className="relative group mb-4" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white shadow-xl">
              <Image
                src={photoURL || "/puzzleicon.png"}
                alt="Profile picture"
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              {hovered && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200" onClick={handlePhotoClick}>
                      <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
                
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-2">
                  {displayName || 'Brak imienia i nazwiska'}
                </h2>
                <p className="text-gray-600 text-center text-sm sm:text-base mb-4">
                  {email || 'Brak adresu email'}
                </p>
                
                {/* Status uploadu */}
            {uploading && (
                  <div className="mt-4 text-blue-600 font-semibold text-sm sm:text-base animate-pulse">
                    Przesyłanie zdjęcia...
                  </div>
            )}
            {uploadSuccess && (
                  <div className="mt-4 text-green-600 font-semibold text-sm sm:text-base">
                    Zdjęcie zostało zaktualizowane!
                  </div>
            )}
            {uploadError && (
                  <div className="mt-4 text-red-600 font-semibold text-sm sm:text-base">
                    {uploadError}
                  </div>
                )}

                
              </div>

              {/* Szybkie akcje */}
              <div className="space-y-3">
                <Link 
                  href="/profile/statistics" 
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <BarChart3 className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white">Statystyki nauki</span>
                </Link>
                
                <Link 
                  href="/homelogin/my-courses" 
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <BookOpen className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white">Moje kursy</span>
                </Link>
                
                <Link 
                  href="/profile/grades" 
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Award className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white">Dziennik ocen</span>
                </Link>
                
                <button 
                  onClick={handleChangePassword}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Zmień hasło</span>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Wyloguj się</span>
                </button>
              </div>
            </div>
          </div>

          {/* Prawa kolumna - Informacje */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 lg:p-8 h-fit">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8">
                Informacje osobiste
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {/* Karta - Imię i nazwisko */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 lg:p-6 border border-blue-100 hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">Imię i nazwisko</h4>
                  </div>
                                     <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">
                     {displayName || 'Brak imienia i nazwiska'}
                   </p>
                </div>

                {/* Karta - Email */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 lg:p-6 border border-green-100 hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">Email</h4>
                  </div>
                  <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">
                    {email || 'Brak adresu email'}
                  </p>
                </div>

                {/* Karta - Klasa/Grupa */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 lg:p-6 border border-purple-100 hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">Klasa/Grupa</h4>
                  </div>
                                     <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">
                     {userClass || '-'}
                   </p>
                </div>

                {/* Karta - Telefon */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 lg:p-6 border border-orange-100 hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">Telefon</h4>
                  </div>
                                     <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">
                     Nie podano
                   </p>
                </div>

                {/* Karta - Lokalizacja */}
                <div className="bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-xl p-4 lg:p-6 border border-indigo-100 hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">Lokalizacja</h4>
                  </div>
                                     <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">
                     Nie podano
                   </p>
                </div>

                {/* Karta - Status konta */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 lg:p-6 border border-emerald-100 hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">Status konta</h4>
                  </div>
                  <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">
                    Aktywne
                  </p>
                </div>
              </div>

              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Providers>
      <ProfilePageContent />
    </Providers>
  );
} 