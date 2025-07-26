"use client";
import React from "react";
import Link from "next/link";
import TeacherRoute from '@/components/TeacherRoute';
import { useAuth } from '@/context/AuthContext';
import ChatAssistant from '@/components/ChatAssistant';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const [chatOpen, setChatOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Błąd podczas wylogowywania:', error);
    }
  };
  
  return (
    <TeacherRoute>
      <div className="flex min-h-screen bg-[#F8F9FB]">
        {/* Sidebar */}
        <aside className="w-64 bg-[#4067EC] text-white flex flex-col py-8 px-6">
          <h2 className="text-2xl font-bold mb-8">
            {isAdmin ? 'Panel administratora' : 'Panel nauczyciela'}
          </h2>
          <nav className="flex flex-col space-y-4 flex-grow">
            <Link href="/homelogin/teacher/courses" className="!text-white">
              {isAdmin ? 'Wszystkie kursy' : 'Moje kursy'}
            </Link>
            <Link href="/homelogin/group-chats" className="!text-white">Czat grupowy</Link>
            <Link href="/homelogin/teacher/grades" className="!text-white">Dziennik ocen</Link>
            <Link href="/homelogin/teacher/students" className="!text-white">Lista uczniów</Link>
            <Link href="/homelogin/teacher/calendar" className="!text-white">Kalendarz</Link>
            <Link href="/homelogin/teacher/profile" className="!text-white">Mój profil</Link>
            <div className="flex-grow" />
            <button
              className="bg-white text-[#4067EC] font-semibold rounded-xl px-4 py-2 shadow hover:bg-blue-50 transition-colors border border-[#4067EC] mb-4"
              onClick={() => setChatOpen(true)}
            >
              Pomocnik Mikołaja
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 text-white font-semibold rounded-xl px-4 py-2 hover:bg-red-600 transition-colors"
            >
              Wyloguj się
            </button>
          </nav>
        </aside>
        {/* Main content */}
        <main className="flex-1">{children}</main>
        <ChatAssistant open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </TeacherRoute>
  );
} 