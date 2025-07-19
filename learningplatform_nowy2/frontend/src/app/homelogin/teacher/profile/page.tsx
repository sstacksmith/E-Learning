"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

export default function TeacherProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Profile data
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    description: '',
    profileImageUrl: '',
    subjects: '',
    experience: '',
    education: ''
  });
  
  // Form data
  const [formData, setFormData] = useState({
    description: '',
    subjects: '',
    experience: '',
    education: ''
  });
  
  // Image upload
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      if (!user?.email) return;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid || user.email));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          description: data.description || '',
          profileImageUrl: data.profileImageUrl || '',
          subjects: data.subjects || '',
          experience: data.experience || '',
          education: data.education || ''
        });
        
        setFormData({
          description: data.description || '',
          subjects: data.subjects || '',
          experience: data.experience || '',
          education: data.education || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Błąd ładowania profilu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const storage = getStorage();
    const imageRef = ref(storage, `profile-images/${user?.uid || user?.email}/${Date.now()}-${file.name}`);
    await uploadBytes(imageRef, file);
    return await getDownloadURL(imageRef);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      if (!user?.uid && !user?.email) {
        throw new Error('Brak identyfikatora użytkownika');
      }
      
      let profileImageUrl = profileData.profileImageUrl;
      
      // Upload new image if selected
      if (selectedImage) {
        profileImageUrl = await uploadImage(selectedImage);
      }
      
      // Update user document
      const userRef = doc(db, 'users', user.uid || user.email);
      await updateDoc(userRef, {
        description: formData.description,
        subjects: formData.subjects,
        experience: formData.experience,
        education: formData.education,
        profileImageUrl: profileImageUrl,
        updated_at: new Date().toISOString()
      });
      
      // Update local state
      setProfileData(prev => ({
        ...prev,
        description: formData.description,
        subjects: formData.subjects,
        experience: formData.experience,
        education: formData.education,
        profileImageUrl: profileImageUrl
      }));
      
      setSuccess('Profil został pomyślnie zaktualizowany!');
      setSelectedImage(null);
      setImagePreview('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Błąd podczas zapisywania profilu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent"></div>
          <span className="ml-3 text-gray-600">Ładowanie profilu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6">Mój profil</h1>
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded relative">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Zdjęcie profilowe</h2>
            
            <div className="flex flex-col items-center space-y-4">
              {/* Current/Preview Image */}
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                {(imagePreview || profileData.profileImageUrl) ? (
                  <Image
                    src={imagePreview || profileData.profileImageUrl}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Upload Button */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zmień zdjęcie
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4067EC] file:text-white hover:file:bg-[#3155d4]"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Information Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Informacje o profilu</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwisko
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis o sobie *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                placeholder="Opisz siebie, swoje doświadczenie, podejście do nauczania..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Przedmioty nauczane
              </label>
              <input
                type="text"
                value={formData.subjects}
                onChange={(e) => setFormData(prev => ({ ...prev, subjects: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                placeholder="np. Matematyka, Fizyka, Informatyka"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doświadczenie
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                placeholder="Opisz swoje doświadczenie w nauczaniu..."
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wykształcenie
              </label>
              <textarea
                value={formData.education}
                onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                placeholder="Opisz swoje wykształcenie, certyfikaty..."
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="bg-[#4067EC] text-white py-2 px-6 rounded-lg hover:bg-[#3155d4] transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz profil'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 