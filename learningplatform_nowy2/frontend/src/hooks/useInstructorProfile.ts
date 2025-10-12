import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
  profileImageUrl: string;
  subjects: string;
  experience: string;
  education: string;
  role: string;
  rating?: number;
  coursesCount?: number;
  studentsCount?: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  description: string;
  subjects: string;
  experience: string;
  education: string;
  profileImageUrl: string;
}

interface UseInstructorProfileReturn {
  instructor: Instructor | null;
  loading: boolean;
  error: string;
  editMode: boolean;
  form: FormData;
  setEditMode: (editMode: boolean) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSave: () => Promise<void>;
  toggleEditMode: () => void;
  resetForm: () => void;
  canEdit: boolean;
  fullName: string;
  hasProfileImage: boolean;
}

export const useInstructorProfile = (instructorId: string): UseInstructorProfileReturn => {
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    description: '',
    subjects: '',
    experience: '',
    education: '',
    profileImageUrl: ''
  });

  // Memoized values
  const memoizedInstructor = useMemo(() => instructor, [instructor]);
  const memoizedForm = useMemo(() => form, [form]);

  // Computed values
  const fullName = useMemo(() => {
    if (!memoizedInstructor) return '';
    return `${memoizedInstructor.firstName} ${memoizedInstructor.lastName}`;
  }, [memoizedInstructor]);

  const hasProfileImage = useMemo(() => {
    return Boolean(memoizedInstructor?.profileImageUrl && memoizedInstructor.profileImageUrl.trim() !== '');
  }, [memoizedInstructor?.profileImageUrl]);

  const canEdit = useMemo(() => {
    // Tutaj możesz dodać logikę sprawdzania uprawnień
    return true;
  }, []);

  // Load instructor data
  const loadInstructor = useCallback(async () => {
    if (!instructorId) return;

    try {
      setLoading(true);
      setError('');
      
      const instructorDoc = await getDoc(doc(db, 'users', instructorId));
      
      if (!instructorDoc.exists()) {
        setError('Instruktor nie został znaleziony');
        return;
      }

      const data = instructorDoc.data();
      const instructorData = {
        id: instructorDoc.id,
        ...data
      } as Instructor;

      setInstructor(instructorData);
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        description: data.description || '',
        subjects: data.subjects || '',
        experience: data.experience || '',
        education: data.education || '',
        profileImageUrl: data.profileImageUrl || ''
      });
    } catch (err) {
      console.error('Error loading instructor:', err);
      setError('Błąd ładowania profilu instruktora');
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  // Event handlers
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!memoizedInstructor) return;

    try {
      setLoading(true);
      
      const instructorRef = doc(db, 'users', memoizedInstructor.id);
      await updateDoc(instructorRef, {
        firstName: memoizedForm.firstName,
        lastName: memoizedForm.lastName,
        description: memoizedForm.description,
        subjects: memoizedForm.subjects,
        experience: memoizedForm.experience,
        education: memoizedForm.education,
        profileImageUrl: memoizedForm.profileImageUrl
      });

      setInstructor(prev => prev ? { ...prev, ...memoizedForm } : null);
      setEditMode(false);
    } catch (err) {
      console.error('Error updating instructor:', err);
      setError('Błąd aktualizacji profilu');
    } finally {
      setLoading(false);
    }
  }, [memoizedInstructor, memoizedForm]);

  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  const resetForm = useCallback(() => {
    if (memoizedInstructor) {
      setForm({
        firstName: memoizedInstructor.firstName || '',
        lastName: memoizedInstructor.lastName || '',
        description: memoizedInstructor.description || '',
        subjects: memoizedInstructor.subjects || '',
        experience: memoizedInstructor.experience || '',
        education: memoizedInstructor.education || '',
        profileImageUrl: memoizedInstructor.profileImageUrl || ''
      });
    }
    setEditMode(false);
  }, [memoizedInstructor]);

  // Load data on mount
  useEffect(() => {
    if (instructorId) {
      loadInstructor();
    }
  }, [instructorId, loadInstructor]);

  return {
    instructor,
    loading,
    error,
    editMode,
    form,
    setEditMode,
    handleChange,
    handleSave,
    toggleEditMode,
    resetForm,
    canEdit,
    fullName,
    hasProfileImage
  };
};

export default useInstructorProfile;
