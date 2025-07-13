"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Image from "next/image";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import Link from "next/link";
import Providers from '@/components/Providers';

interface Course {
  id: number;
  title: string;
  description?: string;
  year_of_study?: number;
  subject?: string;
  is_active?: boolean;
  assignedUsers: string[];
}

function MyCoursesPageContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchCourses = async () => {
      const coursesCollection = collection(db, "courses");
      const snapshot = await getDocs(coursesCollection);
      const allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtruj kursy, gdzie assignedUsers istnieje i zawiera user.uid lub user.email
      const filtered = allCourses.filter((c: any) => Array.isArray(c.assignedUsers) && (c.assignedUsers.includes(user.uid) || c.assignedUsers.includes(user.email)));
      setCourses(filtered);
      setLoading(false);
    };
    fetchCourses();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-6 md:py-8 px-2 md:px-8">
      <div className="bg-white w-full max-w-5xl mx-auto p-4 md:p-6 mt-0 rounded-2xl shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Cześć Patryk! <span className="inline-block">👋</span></h1>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-6">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#4067EC] text-white rounded font-semibold text-xs md:text-base">Aktualne</button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-semibold text-xs md:text-base">Archiwalne</button>
          </div>
          <input type="text" placeholder="Wyszukaj" className="flex-1 px-4 py-2 border border-gray-200 rounded focus:outline-none text-xs md:text-base" />
          <select className="px-4 py-2 border border-gray-200 rounded bg-white text-xs md:text-base">
            <option>Sortuj wg nazwy kursu</option>
          </select>
          <select className="px-4 py-2 border border-gray-200 rounded bg-white text-xs md:text-base">
            <option>Lista</option>
          </select>
        </div>
        {loading ? (
          <div>Ładowanie kursów...</div>
        ) : courses.length === 0 ? (
          <div className="text-gray-600">Nie zostały jeszcze przypisane do Ciebie żadne kursy.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {courses.map((course) => (
              <Link key={course.id} href={`/homelogin/student/courses/${course.id}`} className="block">
                <div className="flex flex-col md:flex-row items-center bg-[#F8F9FB] w-full rounded-xl p-3 group cursor-pointer hover:bg-[#e6eaff] transition" style={{ boxShadow: 'none' }}>
                  <Image src="/thumb.png" alt={course.title || 'Course thumbnail'} width={120} height={60} className="rounded-lg object-cover" />
                  <div className="flex-1 md:ml-6 min-w-0 mt-2 md:mt-0">
                    <div className="font-semibold text-base md:text-lg text-gray-800 truncate">{course.title}</div>
                    <div className="text-xs md:text-sm text-gray-500 mb-1 truncate">{course.subject || '-'}</div>
                    {/* Pasek postępu */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-32 md:w-40 bg-gray-200 rounded-full h-2">
                        <div className="bg-[#4067EC] h-2 rounded-full" style={{ width: `0%` }}></div>
                      </div>
                      <span className="text-xs text-gray-600">0% ukończenia</span>
                    </div>
                  </div>
                  <button className="ml-0 md:ml-4 text-gray-400 hover:text-gray-700 p-2 rounded-full transition mt-2 md:mt-0"><HiOutlineDotsVertical size={22} /></button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyCoursesPage() {
  return (
    <Providers>
      <MyCoursesPageContent />
    </Providers>
  );
} 