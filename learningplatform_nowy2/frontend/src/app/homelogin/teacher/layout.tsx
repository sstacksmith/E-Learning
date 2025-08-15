"use client";
import React from "react";
import TeacherRoute from '@/components/TeacherRoute';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  ClipboardList,
  MessageSquare,
  BarChart3,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Bot
} from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Błąd podczas wylogowywania:', error);
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false); // Zamknij sidebar na mobile po nawigacji
  };

  const navigationItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      href: '/homelogin/teacher',
      active: pathname === '/homelogin/teacher'
    },
    { 
      id: 'courses', 
      label: isAdmin ? 'Wszystkie kursy' : 'Moje kursy', 
      icon: BookOpen, 
      href: '/homelogin/teacher/courses',
      active: pathname?.startsWith('/homelogin/teacher/courses') || false
    },
    { 
      id: 'students', 
      label: 'Lista uczniów', 
      icon: Users, 
      href: '/homelogin/teacher/students',
      active: pathname === '/homelogin/teacher/students'
    },
    { 
      id: 'grades', 
      label: 'Dziennik ocen', 
      icon: ClipboardList, 
      href: '/homelogin/teacher/grades',
      active: pathname === '/homelogin/teacher/grades'
    },
    { 
      id: 'quizzes', 
      label: 'Zarządzanie quizami', 
      icon: ClipboardList, 
      href: '/homelogin/teacher/quizzes',
      active: pathname === '/homelogin/teacher/quizzes'
    },
    { 
      id: 'calendar', 
      label: 'Kalendarz', 
      icon: Calendar, 
      href: '/homelogin/teacher/calendar',
      active: pathname === '/homelogin/teacher/calendar'
    },
    { 
      id: 'chat', 
      label: 'Czat grupowy', 
      icon: MessageSquare, 
      href: '/homelogin/teacher/group-chats',
      active: pathname === '/homelogin/teacher/group-chats'
    },
    { 
      id: 'ai-help', 
      label: 'Pomoc AI', 
      icon: Bot, 
      href: '/homelogin/teacher/ai-help',
      active: pathname === '/homelogin/teacher/ai-help'
    },
    { 
      id: 'profile', 
      label: 'Mój profil', 
      icon: User, 
      href: '/homelogin/teacher/profile',
      active: pathname === '/homelogin/teacher/profile'
    },
  ];
  
  return (
    <TeacherRoute>
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 shadow-sm">
          <div className="flex flex-col flex-1">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">EduPanel</span>
            </div>

            {/* Teacher Info */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {(user as any)?.displayName?.split(' ').map((n: string) => n[0]).join('') || 
                     user?.email?.substring(0, 2).toUpperCase() || 'NT'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {(user as any)?.displayName || user?.email || 'Nauczyciel'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isAdmin ? 'Administrator' : 'Nauczyciel'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      item.active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-200 space-y-2">

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        <div className={`lg:hidden fixed inset-0 z-50 ${sidebarOpen ? '' : 'pointer-events-none'}`}>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-gray-600 transition-opacity ${
              sidebarOpen ? 'opacity-75' : 'opacity-0'
            }`}
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 w-64 bg-white transform transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                <div className="flex items-center">
                  <GraduationCap className="h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-lg font-semibold text-gray-900">EduPanel</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        item.active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Bottom Actions */}
              <div className="p-4 border-t border-gray-200 space-y-2">

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Wyloguj
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:pl-64 flex-1">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {isAdmin ? 'Panel Administratora' : 'Panel Nauczyciela'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="hidden md:inline text-gray-700 font-medium">
                  {(user as any)?.displayName || user?.email || 'Nauczyciel'}
                </span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>


    </TeacherRoute>
  );
} 