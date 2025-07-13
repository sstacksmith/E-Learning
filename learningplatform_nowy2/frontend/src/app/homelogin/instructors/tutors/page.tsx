"use client";

import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Tutor {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

const TutorViewPage: React.FC = () => {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        setLoading(true);
        setError(null);
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setError('User not logged in.');
          setLoading(false);
          return;
        }
        // Fetch student document
        const studentDocRef = doc(db, 'users', user.uid);
        const studentSnap = await getDoc(studentDocRef);
        if (!studentSnap.exists()) {
          setError('Student document not found.');
          setLoading(false);
          return;
        }
        const studentData = studentSnap.data();
        const primaryTutorId = studentData.primaryTutorId;
        if (!primaryTutorId) {
          setTutor(null);
          setLoading(false);
          return;
        }
        // Fetch tutor document
        const tutorDocRef = doc(db, 'users', primaryTutorId);
        const tutorSnap = await getDoc(tutorDocRef);
        if (!tutorSnap.exists()) {
          setError('Tutor document not found.');
          setLoading(false);
          return;
        }
        const tutorData = tutorSnap.data();
        setTutor({
          id: primaryTutorId,
          fullName: tutorData.fullName,
          email: tutorData.email,
          avatarUrl: tutorData.avatarUrl || '',
        });
        setLoading(false);
      } catch (err: any) {
        setError('Failed to fetch tutor information.');
        setLoading(false);
      }
    };
    fetchTutor();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">General Teacher</h2>
      {tutor ? (
        <div className="flex items-center gap-4 mb-4">
          {tutor.avatarUrl ? (
            <img src={tutor.avatarUrl} alt={tutor.fullName || 'Avatar'} className="w-16 h-16 rounded-full object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold">
              {tutor.fullName && tutor.fullName.length > 0 ? tutor.fullName[0] : '?'}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold">{tutor.fullName || 'No name'}</div>
            <div className="text-gray-600">{tutor.email}</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-600">No general teacher assigned yet.</div>
      )}
    </div>
  );
};

export default TutorViewPage; 