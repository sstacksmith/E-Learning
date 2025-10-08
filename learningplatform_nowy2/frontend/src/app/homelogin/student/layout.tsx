'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from 'react';
import StudentRoute from '@/components/StudentRoute';
import ParentAccess from '@/components/ParentAccess';
import { useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Notification {
  id: string;
  type: 'grade' | 'event' | 'message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  courseTitle?: string;
  action_url?: string;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Pobierz powiadomienia dla ucznia
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user || user.role !== 'student') return;

      try {
        const allNotifications: Notification[] = [];

        // 1. Pobierz powiadomienia z kolekcji notifications
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
          notificationsRef, 
          where('user_id', '==', user.uid), 
          limit(10)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        
        for (const notificationDoc of notificationsSnapshot.docs) {
          const notificationData = notificationDoc.data();
          
          allNotifications.push({
            id: notificationDoc.id,
            type: notificationData.type || 'message',
            title: notificationData.title || 'Powiadomienie',
            message: notificationData.message || 'Masz nowe powiadomienie',
            timestamp: notificationData.timestamp || new Date().toISOString(),
            read: notificationData.read || false,
            courseTitle: notificationData.course_title,
            action_url: notificationData.action_url
          });
        }

        // 2. Pobierz eventy jako powiadomienia
        const eventsRef = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsRef);
        
        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data();
          
          // Sprawdź czy uczeń jest przypisany do tego eventu
          if (eventData.students && eventData.students.includes(user.uid)) {
            const isOverdue = new Date(eventData.deadline) < new Date();
            
            allNotifications.push({
              id: `event-${eventDoc.id}`,
              type: 'event',
              title: eventData.title || 'Nowe zadanie',
              message: eventData.description || 'Masz nowe zadanie do wykonania',
              timestamp: eventData.deadline || new Date().toISOString(),
              read: false,
              action_url: eventData.action_url
            });
          }
        }

        // Sortuj po dacie malejąco i ogranicz do 10 najnowszych
        const sortedNotifications = allNotifications
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        setNotifications(sortedNotifications);
        setUnreadCount(sortedNotifications.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user]);

  // Obsługa kliknięć poza powiadomieniami
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <StudentRoute>
      <ParentAccess>
        <div className="min-h-screen bg-[#F4F6FB] flex flex-col">
          {/* Minimalist Topbar */}
          <header className="w-full bg-white shadow-sm border-b flex items-center justify-between px-8 py-1 sticky top-0 z-50 h-14">
            {/* Dashboard/Home link on the left */}
            <Link href="/homelogin" className="text-[#4067EC] font-bold text-lg hover:underline mr-8">Dashboard</Link>
            <nav className="flex-1 flex items-center justify-center gap-8">
              {!isParent && (
                <>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Moje terminy</Link>
                  <Link href="/homelogin/group-chats" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Czat grupowy</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Repozytorium/Manuale</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Warunki</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Digiteka - Cyfrowe Materiały Dydaktyczne</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Wsparcie</Link>
                </>
              )}
                              <Link href="/homelogin/my-courses" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Moje kursy</Link>
              <Link href="/homelogin/student/quizzes" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Quizy</Link>
              <Link href="/homelogin/ankiety" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Ankiety</Link>
              <Link href="/homelogin/student/grades" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Dziennik</Link>
              <Link href="/homelogin/student/tutors" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Tutors</Link>
            </nav>
            <div className="flex items-center gap-4 ml-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-full hover:bg-[#F1F4FE] transition" 
                  aria-label="Powiadomienia"
                >
                  <svg className="w-6 h-6 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {/* Header */}
                    <div className="bg-green-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Powiadomienia</h3>
                      {unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          {unreadCount} nowych
                        </span>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                notification.type === 'grade' ? 'bg-red-100' : 
                                notification.type === 'event' ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                {notification.type === 'grade' ? (
                                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-gray-500">
                                    {new Date(notification.timestamp).toLocaleDateString('pl-PL', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                {notification.action_url && (
                                  <div className="mt-2">
                                    <a 
                                      href={notification.action_url}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Kliknij aby przejść →
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          Brak powiadomień
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-200">
                        <button 
                          onClick={markAllAsRead}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Zaznacz wszystkie jako przeczytane
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* User avatar with initials */}
              <div className="w-9 h-9 rounded-full bg-[#4067EC] flex items-center justify-center text-white font-bold text-base">
                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            </div>
          </header>
          <main className="flex-1 w-full max-w-full mx-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </ParentAccess>
    </StudentRoute>
  );
} 