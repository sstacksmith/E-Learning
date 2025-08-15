"use client";

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Award, BookOpen, Users, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/config/firebase';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: string;
}

interface ProfileData {
  displayName: string;
  email: string;
  phone: string;
  activeCourses: number;
  totalStudents: number;
  averageRating: number;
  totalLessons: number;
}

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'password'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile data state - start with empty values
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    email: '',
    phone: '',
    activeCourses: 0,
    totalStudents: 0,
    averageRating: 0,
    totalLessons: 0
  });

  // Editable profile data
  const [editableProfile, setEditableProfile] = useState<ProfileData>(profileData);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mock achievements data
  const [achievements] = useState<Achievement[]>([
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
    }
  ]);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (user) {
      try {
        // Get displayName and email from Firebase Auth
        const currentUser = auth.currentUser;
        if (currentUser) {
          const displayName = currentUser.displayName || '';
          const email = currentUser.email || '';
          
          // Get additional data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          setProfileData(prev => ({
            ...prev,
            displayName,
            email,
            phone: userData?.phone || '',
            activeCourses: userData?.activeCourses || 0,
            totalStudents: userData?.totalStudents || 0,
            averageRating: userData?.averageRating || 0,
            totalLessons: userData?.totalLessons || 0
          }));
          
          setEditableProfile(prev => ({
            ...prev,
            displayName,
            email,
            phone: userData?.phone || ''
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
    setTimeout(() => setLoading(false), 500);
  };

  const loadTeacherStats = async () => {
    if (!user?.uid) return;
    
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/users/${user.uid}/stats/`);
      if (response.ok) {
        const stats = await response.json();
        setProfileData(prev => ({
          ...prev,
          activeCourses: stats.activeCourses || 0,
          totalStudents: stats.totalStudents || 0,
          averageRating: stats.averageRating || 0,
          totalLessons: stats.totalLessons || 0
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditableProfile(profileData);
    setMessage(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditableProfile(profileData);
    setMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validate data
      if (!editableProfile.displayName.trim()) {
        throw new Error('Imię i nazwisko nie może być puste');
      }

      if (!editableProfile.phone.trim()) {
        throw new Error('Telefon nie może być pusty');
      }

      // Update displayName in Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: editableProfile.displayName
        });
      }

      // Update additional data in Firestore
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: editableProfile.displayName,
          phone: editableProfile.phone
        });
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        displayName: editableProfile.displayName,
        phone: editableProfile.phone
      }));
      
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profil został zaktualizowany pomyślnie!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Nowe hasła nie są identyczne' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Nowe hasło musi mieć co najmniej 6 znaków' });
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Użytkownik nie jest zalogowany lub brakuje emaila');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, passwordData.newPassword);
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setMessage({ type: 'success', text: 'Hasło zostało zmienione pomyślnie!' });
    } catch (error) {
      let errorMessage = 'Wystąpił błąd podczas zmiany hasła';
      
      if (error instanceof Error) {
        if (error.message.includes('wrong-password')) {
          errorMessage = 'Aktualne hasło jest nieprawidłowe';
        } else if (error.message.includes('weak-password')) {
          errorMessage = 'Nowe hasło jest zbyt słabe';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      loadTeacherStats();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mój Profil</h2>
        <p className="text-gray-600">Zarządzaj swoimi danymi i ustawieniami</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'profile', label: 'Informacje Podstawowe' },
            { key: 'password', label: 'Zmiana Hasła' },
            { key: 'stats', label: 'Statystyki' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'profile' | 'stats' | 'password')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Profile Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{profileData.displayName}</h3>
                  <p className="text-gray-600">Nauczyciel</p>
                </div>
              </div>
              {!isEditing ? (
                <button 
                  onClick={handleEdit}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edytuj Profil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleCancel}
                    className="text-sm bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i Nazwisko
                </label>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    type="text"
                    value={isEditing ? editableProfile.displayName : profileData.displayName}
                    onChange={(e) => isEditing && setEditableProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isEditing ? 'bg-white' : 'bg-gray-50'
                    }`}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    type="email"
                    value={profileData.email}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    readOnly
                  />
                  <span className="text-xs text-gray-500 ml-2">(Email nie może być zmieniony)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    type="tel"
                    value={isEditing ? editableProfile.phone : profileData.phone}
                    onChange={(e) => isEditing && setEditableProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isEditing ? 'bg-white' : 'bg-gray-50'
                    }`}
                    readOnly={!isEditing}
                    placeholder="+48 XXX XXX XXX"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            )}
          </div>

          {/* Recent Achievements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ostatnie Osiągnięcia</h3>
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{achievement.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="max-w-md">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Lock className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Zmiana Hasła</h3>
                <p className="text-gray-600">Zaktualizuj swoje hasło do konta</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aktualne hasło
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Wprowadź aktualne hasło"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nowe hasło
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Wprowadź nowe hasło"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 znaków</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Potwierdź nowe hasło
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Potwierdź nowe hasło"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isChangingPassword ? 'Zmienianie hasła...' : 'Zmień hasło'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Statystyki Nauczyciela</h3>
            <button
              onClick={loadTeacherStats}
              disabled={loadingStats}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
              Odśwież
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 mb-1">{profileData.activeCourses}</div>
              <div className="text-sm text-gray-600">Aktywne Kursy</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 mb-1">{profileData.totalStudents}</div>
              <div className="text-sm text-gray-600">Uczniów</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 mb-1">{profileData.totalLessons}</div>
              <div className="text-sm text-gray-600">Przeprowadzonych Lekcji</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <Award className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 mb-1">{profileData.averageRating}</div>
              <div className="text-sm text-gray-600">Średnia Ocen Uczniów</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}