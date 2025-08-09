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
    
    // Sprawdź rozmiar pliku (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Plik jest za duży. Maksymalny rozmiar to 5MB.');
      return;
    }
    
    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      
      console.log('Starting upload for user:', user.uid);
      
      // Dodaj timeout dla uploadu (30 sekund)
      const uploadPromise = new Promise(async (resolve, reject) => {
        try {
          const storageRef = ref(storage, `profile_photos/${user.uid}`);
          console.log('Storage ref created:', storageRef);
          
          await uploadBytes(storageRef, file);
          console.log('File uploaded successfully');
          
          const url = await getDownloadURL(storageRef);
          console.log('Download URL obtained:', url);
          
          await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
          console.log('Firestore updated');
          
          resolve(url);
        } catch (error) {
          reject(error);
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout - sprawdź reguły Firebase Storage')), 30000);
      });
      
      const url = await Promise.race([uploadPromise, timeoutPromise]) as string;
      
      setPhotoURL(url);
      setUploadSuccess(true);
      
      // Odśwież stronę po 2 sekundach
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error uploading photo:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : '';
      
      if (errorMessage.includes('timeout')) {
        setUploadError('Upload się zatrzymał. Sprawdź reguły Firebase Storage.');
      } else if (errorCode === 'storage/unauthorized') {
        setUploadError('Brak uprawnień do uploadu. Sprawdź reguły Firebase Storage.');
      } else {
        setUploadError('Błąd podczas przesyłania zdjęcia. Spróbuj ponownie.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).click();
    }
  };

  // Funkcja wylogowania (możesz podpiąć swoją logikę)
  const handleLogout = () => {
    // Przykład: usuń token i przekieruj na stronę logowania
    localStorage.removeItem('firebaseToken');
    router.push('/login');
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil użytkownika</h1>
          
          {/* Quick Actions */}
          <div className="mb-8 flex flex-wrap gap-4">
            <Link 
              href="/profile/statistics" 
              className="px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#5577FF] transition-colors"
            >
              Statystyki nauki
            </Link>
            <Link 
              href="/profile/courses" 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Moje kursy
            </Link>
            <button 
              onClick={handleChangePassword}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Zmień hasło
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Wyloguj się
            </button>
          </div>

          {/* Profile Content */}
          <div className="flex-1 w-full flex flex-col items-center justify-center px-2 md:px-0">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-4 md:p-12 my-6 md:my-12 border border-[#e3eafe]">
              <div className="flex flex-col items-center mb-8">
                <div className="relative group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
                  <Image
                    src={photoURL || "/puzzleicon.png"}
                    alt="Profile picture"
                    width={110}
                    height={110}
                    className="rounded-full border-4 border-[#4067EC] shadow-lg object-cover bg-gray-200"
                  />
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                  {hovered && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full cursor-pointer" onClick={handlePhotoClick}>
                      <span className="text-white font-semibold">Zmień zdjęcie</span>
                    </div>
                  )}
                </div>
                <h2 className="mt-4 text-2xl md:text-3xl font-bold text-[#4067EC] text-center">{displayName || 'Brak imienia i nazwiska'}</h2>
                <p className="text-gray-500 text-center">{email || 'Brak adresu email'}</p>
                {uploading && (
                  <div className="mt-2 text-[#4067EC] font-semibold">Przesyłanie zdjęcia...</div>
                )}
                {uploadSuccess && (
                  <div className="mt-2 text-green-600 font-semibold">Zdjęcie zostało zaktualizowane! Odświeżanie strony...</div>
                )}
                {uploadError && (
                  <div className="mt-2 text-red-600 font-semibold">{uploadError}</div>
                )}
              </div>
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-[#4067EC]">Account Settings</h3>
                <button className="w-full bg-[#e3eafe] py-3 rounded shadow text-[#4067EC] font-semibold hover:bg-[#d0dbfa] transition" onClick={handleChangePassword}>
                  Change Password
                </button>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-[#4067EC]">Informacje osobiste</h3>
                <div className="space-y-4 w-full max-w-lg mx-auto">
                  <div className="flex flex-col md:flex-row border-b border-[#e3eafe] py-2">
                    <div className="w-full md:w-1/3 font-semibold text-[#4067EC]">Imię i nazwisko</div>
                    <div className="w-full md:w-2/3 text-[#222]">{displayName || 'Brak imienia i nazwiska'}</div>
                  </div>
                  <div className="flex flex-col md:flex-row border-b border-[#e3eafe] py-2">
                    <div className="w-full md:w-1/3 font-semibold text-[#4067EC]">Email</div>
                    <div className="w-full md:w-2/3 text-[#222]">{email || 'Brak adresu email'}</div>
                  </div>
                  <div className="flex flex-col md:flex-row border-b border-[#e3eafe] py-2">
                    <div className="w-full md:w-1/3 font-semibold text-[#4067EC]">Klasa/Grupa</div>
                    <div className="w-full md:w-2/3 text-[#222]">{userClass || '-'}</div>
                  </div>
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