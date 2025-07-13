"use client";

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

interface Student {
  uid: string;
  displayName: string;
  email: string;
  primaryTutorId?: string;
  Learningmode?: 'stationary' | 'home';
}

export default function TeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'stationary' | 'home'>('all');
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const studentsList = usersSnapshot.docs
        .map(docSnap => ({
          uid: docSnap.id,
          ...docSnap.data(),
        } as Student & { role?: string }))
        .filter(user => user && user.role === 'student');
      // Default sort: home learners first
      studentsList.sort((a, b) => (a.Learningmode === 'home' ? -1 : 1));
      setStudents(studentsList);
      setLoading(false);
    };
    fetchStudents();
  }, []);

  const handleAssign = async (studentId: string) => {
    if (!currentUser) return;
    setAssigning(studentId);
    try {
      const studentDocRef = doc(db, 'users', studentId);
      await updateDoc(studentDocRef, { primaryTutorId: currentUser.uid });
      setStudents(prev => prev.map(s => s.uid === studentId ? { ...s, primaryTutorId: currentUser.uid } : s));
    } catch (err) {
      alert('Failed to assign tutor.');
    } finally {
      setAssigning(null);
    }
  };

  // Filtering by search and learning mode
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesMode = modeFilter === 'all' || student.Learningmode === modeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">Lista uczniów</h1>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-2">Wszyscy uczniowie</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <input
            type="text"
            placeholder="Wyszukaj ucznia po imieniu, nazwisku lub emailu..."
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded w-full sm:w-1/2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors duration-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded w-full sm:w-1/4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors duration-200"
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value as 'all' | 'stationary' | 'home')}
          >
            <option value="all">All</option>
            <option value="stationary">Stationary only</option>
            <option value="home">Home only</option>
          </select>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-gray-600 text-sm sm:text-base">Ładowanie uczniów...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-gray-600 text-sm sm:text-base">Brak uczniów do wyświetlenia.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Imię i nazwisko</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Email</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Learning Mode</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm">Homeroom Teacher</th>
                  <th className="py-2 px-2 sm:px-4 border-b font-semibold text-xs sm:text-sm"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.uid} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">{student.displayName}</td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">{student.email}</td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {student.Learningmode === 'stationary' ? (
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">Stationary</span>
                        ) : student.Learningmode === 'home' ? (
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">Home</span>
                        ) : (
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">Unknown</span>
                        )}
                        <select
                          className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#4067EC] transition-colors duration-200"
                          value={student.Learningmode || ''}
                          onChange={async (e) => {
                            const newMode = e.target.value as 'stationary' | 'home';
                            try {
                              await updateDoc(doc(db, 'users', student.uid), { Learningmode: newMode });
                              setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, Learningmode: newMode } : s));
                            } catch {
                              alert('Failed to update learning mode.');
                            }
                          }}
                        >
                          <option value="">Set mode…</option>
                          <option value="stationary">Stationary</option>
                          <option value="home">Home</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal text-xs sm:text-sm">
                      {student.primaryTutorId === currentUser?.uid
                        ? <span className="text-green-600 font-semibold">You</span>
                        : student.primaryTutorId
                          ? <span className="text-yellow-600 font-semibold">Assigned</span>
                          : <span className="text-gray-500">Unassigned</span>
                      }
                    </td>
                    <td className="py-2 px-2 sm:px-4 border-b whitespace-normal">
                      {!student.primaryTutorId && (
                        <button
                          className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                          onClick={() => handleAssign(student.uid)}
                          disabled={assigning === student.uid}
                        >
                          {assigning === student.uid ? 'Assigning...' : 'Assign me'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 