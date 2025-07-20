"use client";
import React from "react";
import Link from "next/link";
import TeacherRoute from '@/components/TeacherRoute';
import { useAuth } from '@/context/AuthContext';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  return (
    <TeacherRoute>
      <div className="flex min-h-screen bg-[#F8F9FB]">
        {/* Sidebar */}
        <aside className="w-64 bg-[#4067EC] text-white flex flex-col py-8 px-6">
          <h2 className="text-2xl font-bold mb-8">
            {isAdmin ? 'Panel administratora' : 'Panel nauczyciela'}
          </h2>
          <nav className="flex flex-col space-y-4">
            <Link href="/homelogin/teacher/courses" className="!text-white">
              {isAdmin ? 'Wszystkie kursy' : 'Moje kursy'}
            </Link>
            <Link href="/homelogin/teacher/grades" className="!text-white">Dziennik ocen</Link>
            <Link href="/homelogin/teacher/students" className="!text-white">Lista uczniów</Link>
            <Link href="/homelogin/teacher/calendar" className="!text-white">Kalendarz</Link>
            <Link href="/homelogin/teacher/profile" className="!text-white">Mój profil</Link>
          </nav>
        </aside>
        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </TeacherRoute>
  );
} 