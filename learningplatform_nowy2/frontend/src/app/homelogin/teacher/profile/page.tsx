"use client";

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Award, BookOpen, Users, Lock, Eye, EyeOff, RefreshCw, Star, TrendingUp, Activity, Target, Zap } from 'lucide-react';
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
    },
    {
      id: '3',
      title: 'Innowator',
      description: 'Za wprowadzenie nowych metod nauczania',
      date: '15.12.2023',
      icon: '💡'
    },
    {
      id: '4',
      title: 'Przyjaciel Uczniów',
      description: 'Za najlepsze oceny od studentów',
      date: '01.12.2023',
      icon: '❤️'
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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-50"></div>
        <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Mój Profil</h2>
              <p className="text-gray-600 text-lg">Zarządzaj swoimi danymi i ustawieniami</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{profileData.activeCourses}</div>
                <div className="text-sm text-gray-500">Aktywne kursy</div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg shadow-sm ${
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mr-4 hover:animate-pulse transition-all duration-300">
                    <User className="h-10 w-10 text-blue-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">{profileData.displayName}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600">Nauczyciel</p>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">Online</span>
                  </div>
                </div>
              </div>
              {!isEditing ? (
                <button 
                  onClick={handleEdit}
                  className="group text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <User className="h-4 w-4 group-hover:animate-bounce" />
                  Edytuj Profil
                </button>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={handleCancel}
                    className="text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Anuluj
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Imię i Nazwisko
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={isEditing ? editableProfile.displayName : profileData.displayName}
                    onChange={(e) => isEditing && setEditableProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className={`w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 ${
                      isEditing ? 'bg-white hover:border-blue-300' : 'bg-gray-50'
                    }`}
                    readOnly={!isEditing}
                  />
                  {isEditing && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-500" />
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={profileData.email}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 bg-gray-50"
                    readOnly
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Email nie może być zmieniony
                </span>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-purple-500" />
                  Telefon
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={isEditing ? editableProfile.phone : profileData.phone}
                    onChange={(e) => isEditing && setEditableProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-300 ${
                      isEditing ? 'bg-white hover:border-purple-300' : 'bg-gray-50'
                    }`}
                    readOnly={!isEditing}
                    placeholder="+48 XXX XXX XXX"
                  />
                  {isEditing && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Zapisz zmiany
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Recent Achievements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Ostatnie Osiągnięcia</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Award className="h-4 w-4" />
                <span>{achievements.length} osiągnięć</span>
              </div>
            </div>
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div key={achievement.id} className="group flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md hover:scale-[1.02] border border-gray-200 hover:border-blue-300">
                  <div className="text-3xl group-hover:animate-bounce">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{achievement.title}</h4>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <p className="text-xs text-gray-500">{achievement.date}</p>
                      <div className="ml-auto">
                        <div className="w-8 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 py-2 rounded-lg transition-colors">
                Zobacz wszystkie osiągnięcia →
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6 font-medium"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
              Odśwież
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{profileData.activeCourses}</div>
              <div className="text-sm text-blue-700 font-medium">Aktywne Kursy</div>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-xs text-green-600">+2 w tym miesiącu</span>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">{profileData.totalStudents}</div>
              <div className="text-sm text-green-700 font-medium">Uczniów</div>
              <div className="flex items-center justify-center mt-2">
                <Activity className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-xs text-green-600">Aktywni uczniowie</span>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">{profileData.totalLessons}</div>
              <div className="text-sm text-purple-700 font-medium">Przeprowadzonych Lekcji</div>
              <div className="flex items-center justify-center mt-2">
                <Target className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-xs text-purple-600">Cel: 150 lekcji</span>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-yellow-600 mb-2">{profileData.averageRating}</div>
              <div className="text-sm text-yellow-700 font-medium">Średnia Ocen Uczniów</div>
              <div className="flex items-center justify-center mt-2">
                <Zap className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-xs text-yellow-600">Wysoka ocena!</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}