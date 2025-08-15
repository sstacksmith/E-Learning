'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  Bell, 
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface NotificationSettings {
  grades: boolean;
  assignments: boolean;
  progress: boolean;
  attendance: boolean;
  messages: boolean;
}



interface ParentProfile {
  displayName: string;
  email: string;
  phone: string;
  relationship: string; // np. "matka", "ojciec", "opiekun"
}

export default function ParentSettings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Stan profilu
  const [profile, setProfile] = useState<ParentProfile>({
    displayName: '',
    email: '',
    phone: '',
    relationship: 'rodzic'
  });

  // Stan powiadomień
  const [notifications, setNotifications] = useState<NotificationSettings>({
    grades: true,
    assignments: true,
    progress: true,
    attendance: true,
    messages: true
  });



  // Stan bezpieczeństwa
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showReauth, setShowReauth] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        displayName: (user as any).displayName || '',
        email: user.email || ''
      }));
      
      // Pobierz istniejące ustawienia powiadomień
      const fetchNotificationSettings = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          
          const notificationSettingsRef = doc(db, 'notification_settings', user.uid);
          const settingsSnapshot = await getDoc(notificationSettingsRef);
          
          if (settingsSnapshot.exists()) {
            const settings = settingsSnapshot.data();
            console.log('Loaded notification settings:', settings);
            setNotifications({
              grades: settings.grades ?? true,
              assignments: settings.assignments ?? true,
              progress: settings.progress ?? true,
              attendance: settings.attendance ?? true,
              messages: settings.messages ?? true
            });
          }
        } catch (error) {
          console.error('Error loading notification settings:', error);
        }
      };
      
      fetchNotificationSettings();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (!user) {
        setSaveMessage('Błąd: Użytkownik nie jest zalogowany.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      // Importuj funkcje Firebase
      const { updateProfile } = await import('firebase/auth');
      const { doc, updateDoc } = await import('firebase/firestore');
      const { auth, db } = await import('@/config/firebase');
      
      // Zaktualizuj profil w Firebase Auth
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.displayName
        });
      }
      
      // Zaktualizuj dodatkowe dane profilu w Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: profile.displayName,
        phone: profile.phone,
        relationship: profile.relationship,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Profile saved to Firebase:', profile);
      setSaveMessage('Profil został zaktualizowany pomyślnie!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      setSaveMessage(`Błąd podczas zapisywania profilu: ${errorMessage}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      if (!user) {
        setSaveMessage('Błąd: Użytkownik nie jest zalogowany.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      // Importuj funkcje Firebase Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      // Zapisz ustawienia powiadomień do kolekcji notification_settings
      const notificationSettingsRef = doc(db, 'notification_settings', user.uid);
      await setDoc(notificationSettingsRef, {
        userId: user.uid,
        ...notifications,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('Notification settings saved to Firebase:', notifications);
      setSaveMessage('Ustawienia powiadomień zostały zaktualizowane!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: unknown) {
      console.error('Error saving notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      setSaveMessage(`Błąd podczas zapisywania ustawień: ${errorMessage}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };



  const handleReauthentication = async () => {
    if (!currentPassword) {
      setSaveMessage('Proszę wprowadzić aktualne hasło.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setSaveMessage('Błąd: Użytkownik nie jest zalogowany.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      // Utwórz kredencjały dla ponownego uwierzytelnienia
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      
      // Ponownie uwierzytelnij użytkownika
      await reauthenticateWithCredential(currentUser, credential);
      
      setShowReauth(false);
      setCurrentPassword('');
      setSaveMessage('Uwierzytelnienie zakończone pomyślnie. Możesz teraz zmienić hasło.');
      setTimeout(() => setSaveMessage(''), 3000);
      
      // Spróbuj ponownie zmienić hasło
      await performPasswordChange();
      
    } catch (error: unknown) {
      console.error('Error during reauthentication:', error);
      let errorMessage = 'Błąd podczas ponownego uwierzytelnienia.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'auth/wrong-password') {
          errorMessage = 'Nieprawidłowe aktualne hasło.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Zbyt wiele prób. Spróbuj ponownie później.';
        }
      }
      
      if (error instanceof Error) {
        errorMessage = `Błąd: ${error.message}`;
      }
      
      setSaveMessage(errorMessage);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const performPasswordChange = async () => {
    try {
      const { updatePassword } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSaveMessage('Błąd: Użytkownik nie jest zalogowany.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      // Zaktualizuj hasło w Firebase Auth
      await updatePassword(currentUser, newPassword);
      
      setSaveMessage('Hasło zostało zmienione pomyślnie!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'auth/requires-recent-logout') {
          setShowReauth(true);
          setSaveMessage('Wymagane jest ponowne uwierzytelnienie. Proszę wprowadzić aktualne hasło.');
          setTimeout(() => setSaveMessage(''), 5000);
          return;
        }
      }
      
      let errorMessage = 'Błąd podczas zmiany hasła.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'auth/weak-password') {
          errorMessage = 'Hasło jest zbyt słabe. Proszę wybrać silniejsze hasło.';
        } else if (error.code === 'auth/operation-not-allowed') {
          errorMessage = 'Operacja zmiany hasła nie jest dozwolona.';
        }
      }
      
      if (error instanceof Error) {
        errorMessage = `Błąd: ${error.message}`;
      }
      
      setSaveMessage(errorMessage);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSaveMessage('Hasła nie są identyczne!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setSaveMessage('Hasło musi mieć co najmniej 6 znaków!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await performPasswordChange();
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profil', icon: User },
    { id: 'notifications', name: 'Powiadomienia', icon: Bell },
    { id: 'security', name: 'Bezpieczeństwo', icon: SettingsIcon }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ustawienia</h1>
            <p className="text-gray-600 mt-1">Zarządzaj swoim kontem i preferencjami</p>
          </div>
          <SettingsIcon className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm">
          <nav className="p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'profile' | 'notifications' | 'security')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {saveMessage && (
            <div className={`mb-4 p-4 rounded-lg ${
              saveMessage.includes('Błąd') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {saveMessage}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Informacje o profilu</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imię i nazwisko
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Wprowadź imię i nazwisko"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Wprowadź email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Wprowadź numer telefonu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stopień pokrewieństwa
                  </label>
                  <select
                    value={profile.relationship}
                    onChange={(e) => setProfile(prev => ({ ...prev, relationship: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="matka">Matka</option>
                    <option value="ojciec">Ojciec</option>
                    <option value="opiekun">Opiekun prawny</option>
                    <option value="babcia">Babcia</option>
                    <option value="dziadek">Dziadek</option>
                    <option value="rodzic">Rodzic</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Ustawienia powiadomień</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Powiadomienia o aktywności ucznia</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'grades', label: 'Nowe oceny', icon: '📊' },
                      { key: 'assignments', label: 'Nowe zadania', icon: '📝' },
                      { key: 'progress', label: 'Postęp w nauce', icon: '📈' },
                      { key: 'attendance', label: 'Frekwencja', icon: '✅' },
                      { key: 'messages', label: 'Wiadomości od nauczycieli', icon: '💬' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{item.icon}</span>
                          <span className="text-gray-700">{item.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof NotificationSettings] as boolean}
                          onChange={(e) => setNotifications(prev => ({ 
                            ...prev, 
                            [item.key]: e.target.checked 
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>



                <button
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                </button>
              </div>
            </div>
          )}



          {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Bezpieczeństwo</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Zmiana hasła</h3>
                  
                  {/* Ponowne uwierzytelnienie */}
                  {showReauth && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-3">
                        Wymagane ponowne uwierzytelnienie
                      </h4>
                      <p className="text-sm text-yellow-700 mb-4">
                        Ze względów bezpieczeństwa, wprowadź aktualne hasło aby kontynuować.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Aktualne hasło
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Wprowadź aktualne hasło"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleReauthentication}
                            disabled={loading || !currentPassword}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Uwierzytelnianie...' : 'Potwierdź'}
                          </button>
                          <button
                            onClick={() => {
                              setShowReauth(false);
                              setCurrentPassword('');
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nowe hasło
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Wprowadź nowe hasło"
                          disabled={showReauth}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Eye className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Potwierdź nowe hasło
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Potwierdź nowe hasło"
                        disabled={showReauth}
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={loading || !newPassword || !confirmPassword || showReauth}
                      className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Zmienianie...' : 'Zmień hasło'}
                    </button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Sesje logowania</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-700">Bieżąca sesja</div>
                        <div className="text-sm text-gray-500">Windows • Chrome • Aktywna teraz</div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        Aktywna
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={logout}
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Wyloguj się
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
