'use client';
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Providers from '@/components/Providers';
import Image from 'next/image';

function StudentProfileContent() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [userClass, setUserClass] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      if (error.message.includes('timeout')) {
        setUploadError('Upload się zatrzymał. Sprawdź reguły Firebase Storage.');
      } else {
        setUploadError('Błąd podczas uploadu: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        class: userClass
      });
      
      // Pokaż komunikat o sukcesie
      alert('Profil został zaktualizowany!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Błąd podczas aktualizacji profilu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-[#4067EC] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Profile Photo */}
            <div 
              className="relative w-32 h-32"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              {photoURL ? (
                <Image
                  src={photoURL}
                  alt="Profile"
                  width={128}
                  height={128}
                  className="w-32 h-32 h-32 rounded-full object-cover border-4 border-[#4067EC]"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-4xl font-bold text-gray-600 border-4 border-[#4067EC]">
                  {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                </div>
              )}
              
              {/* Upload Overlay */}
              {hovered && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer">
                  <div className="text-white text-center">
                    <div className="text-2xl mb-2">📷</div>
                    <div className="text-sm">Kliknij aby zmienić</div>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#4067EC] text-white p-2 rounded-full hover:bg-[#3050b3] transition-colors"
                disabled={uploading}
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  '📷'
                )}
              </button>
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{displayName || 'Brak nazwy'}</h1>
              <p className="text-gray-600 mb-1">{email}</p>
              {userClass && <p className="text-gray-600">Klasa: {userClass}</p>}
              
              {/* Upload Status */}
              {uploading && (
                <div className="mt-4 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent inline-block mr-2"></div>
                  Uploadowanie zdjęcia...
                </div>
              )}
              
              {uploadSuccess && (
                <div className="mt-4 text-green-600">
                  ✅ Zdjęcie zostało zaktualizowane!
                </div>
              )}
              
              {uploadError && (
                <div className="mt-4 text-red-600">
                  ❌ {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Edycja profilu</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imię i nazwisko
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                placeholder="Wprowadź imię i nazwisko"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                placeholder="Email (nie można zmienić)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Klasa
              </label>
              <input
                type="text"
                value={userClass}
                onChange={(e) => setUserClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
                placeholder="Wprowadź klasę"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleSaveProfile}
              className="bg-[#4067EC] text-white px-6 py-2 rounded-lg hover:bg-[#3050b3] transition-colors font-medium"
            >
              Zapisz zmiany
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <Providers>
      <StudentProfileContent />
    </Providers>
  );
} 