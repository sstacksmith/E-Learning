'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

interface ParentStudent {
  id: string;
  parent: string;
  student: string;
  student_name: string;
  student_email: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

export default function ParentStudentManagement() {
  const { user } = useAuth();
  const [parentStudents, setParentStudents] = useState<ParentStudent[]>([]);
  const [parents, setParents] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all users from Firestore
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      // Filter parents and students
      setParents(usersData.filter(u => u.role === 'parent'));
      setStudents(usersData.filter(u => u.role === 'student'));

      // Fetch parent-student relationships
      const relationshipsCollection = collection(db, 'parent_students');
      const relationshipsSnapshot = await getDocs(relationshipsCollection);
      const relationshipsData = relationshipsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString()
      })) as ParentStudent[];

      setParentStudents(relationshipsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Błąd podczas pobierania danych');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAssign = async () => {
    if (!selectedParent || !selectedStudent) {
      setError('Wybierz rodzica i ucznia');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      // Check if relationship already exists
      const relationshipsCollection = collection(db, 'parent_students');
      const q = query(
        relationshipsCollection,
        where('parent', '==', selectedParent),
        where('student', '==', selectedStudent)
      );
      const existingSnapshot = await getDocs(q);

      if (!existingSnapshot.empty) {
        setError('Ta relacja już istnieje');
        setTimeout(() => setError(''), 3000);
        return;
      }

      // Create new relationship
      const { addDoc } = await import('firebase/firestore');
      await addDoc(relationshipsCollection, {
        parent: selectedParent,
        student: selectedStudent,
        created_at: new Date()
      });

      setSuccess('Pomyślnie przypisano ucznia do rodzica');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
      setSelectedParent(null);
      setSelectedStudent(null);
    } catch (err) {
      console.error('Error assigning student to parent:', err);
      setError('Błąd podczas przypisywania ucznia do rodzica');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'parent_students', id));

      setSuccess('Pomyślnie usunięto przypisanie');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      console.error('Error removing parent-student relationship:', err);
      setError('Błąd podczas usuwania przypisania');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Zarządzanie Przypisaniami Rodzic-Uczeń</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Assignment Form */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Wybierz Rodzica
          </label>
          <select
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            value={selectedParent || ''}
            onChange={(e) => setSelectedParent(e.target.value || null)}
          >
            <option value="">Wybierz rodzica...</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.username} ({parent.email})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Wybierz Ucznia
          </label>
          <select
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            value={selectedStudent || ''}
            onChange={(e) => setSelectedStudent(e.target.value || null)}
          >
            <option value="">Wybierz ucznia...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.username} ({student.email})
              </option>
            ))}
          </select>
        </div>

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleAssign}
        >
          Przypisz Ucznia do Rodzica
        </button>
      </div>

      {/* Existing Assignments Table */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl font-bold mb-4">Istniejące Przypisania</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Uczeń
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email Ucznia
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Data Utworzenia
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {parentStudents.map((ps) => {
                const student = students.find(s => s.id === ps.student);
                return (
                  <tr key={ps.id}>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {student?.username}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {student?.email}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {new Date(ps.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <button
                        onClick={() => handleRemove(ps.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Usuń Przypisanie
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 