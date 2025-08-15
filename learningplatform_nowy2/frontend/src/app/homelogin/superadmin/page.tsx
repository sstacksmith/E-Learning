"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Image from "next/image";
import Link from "next/link";
import Providers from '@/components/Providers';
import { db } from "@/config/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Typ użytkownika Firestore
interface FirestoreUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  approved?: boolean;
  banned?: boolean;
  role?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  year?: number;
  teacherEmail?: string;
  assignedUsers?: string[];
  slug?: string;
}

interface Group {
  id: string;
  name?: string;
  description?: string;
  members?: string[];
  member_count?: number;
}

// Usuwamy statyczne dane - będziemy pobierać z Firestore



function SuperAdminDashboardContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedUser] = useState<FirestoreUser | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState("");
  const [groupError, setGroupError] = useState("");
  const [groupSuccess, setGroupSuccess] = useState("");
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState("");
  const [selectedCourseForAssignment, setSelectedCourseForAssignment] = useState("");
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseYear, setNewCourseYear] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseSubject, setNewCourseSubject] = useState("");
  const [selectedTeacherForCourse, setSelectedTeacherForCourse] = useState("");
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseYear, setEditCourseYear] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseSubject, setEditCourseSubject] = useState("");
  const [editCourseTeacher, setEditCourseTeacher] = useState("");
  const [editCourseStudents, setEditCourseStudents] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      console.log('Users loaded from Firestore:', usersData.length);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [setUsers, setLoading, setError]);

  const fetchCourses = useCallback(async () => {
    try {
      const coursesCollection = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesCollection);
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData as Course[]);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, [setCourses]);

  const fetchGroups = useCallback(async () => {
    try {
      const groupsCollection = collection(db, 'groups');
      const groupsSnapshot = await getDocs(groupsCollection);
      const groupsData = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }, [setGroups]);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchGroups();
  }, [fetchUsers, fetchCourses, fetchGroups]);

  const setTeacherRole = async (email: string) => {
    try {
      // Znajdź użytkownika po email w Firestore
      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('User not found');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'teacher'
      });
      
      setSuccess(`Successfully set ${email} as teacher`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error setting teacher role:', err);
      setError('Failed to set teacher role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const setAdminRole = async (uid: string) => {
    try {
      // Znajdź użytkownika po ID w Firestore
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', uid), {
        role: 'admin'
      });
      
      setSuccess(`Successfully set user as admin`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error setting admin role:', err);
      setError('Failed to set admin role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const setStudentRole = async (uid: string) => {
    try {
      // Znajdź użytkownika po ID w Firestore
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', uid), {
        role: 'student'
      });
      
      setSuccess(`Successfully set user as student`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error setting student role:', err);
      setError('Failed to set student role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const setParentRole = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: 'parent'
      });
      
      setSuccess(`Pomyślnie ustawiono użytkownika jako Rodzic`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error setting parent role:', err);
      setError('Nie udało się ustawić roli Rodzic');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
              const response = await fetch(`/api/users/${userId}/reset_password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetPasswordSuccess("Password has been reset successfully");
        setResetPasswordError("");
        setShowResetPasswordModal(false);
        setNewPassword("");
      } else {
        setResetPasswordError(data.error || "Failed to reset password");
        setResetPasswordSuccess("");
      }
    } catch {
      setResetPasswordError("An error occurred while resetting the password");
      setResetPasswordSuccess("");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCreateGroup = async () => {
    try {
      const token = localStorage.getItem("token");
              const response = await fetch("/api/groups/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGroupSuccess("Group created successfully");
        setGroupError("");
        setShowCreateGroupModal(false);
        setNewGroupName("");
        setNewGroupDescription("");
      } else {
        setGroupError(data.error || "Failed to create group");
        setGroupSuccess("");
      }
    } catch {
      setGroupError("An error occurred while creating the group");
      setGroupSuccess("");
    }
  };

  const handleAddMember = async (groupId: string, userId: string) => {
    try {
      const token = localStorage.getItem("token");
              const response = await fetch(`/api/groups/${groupId}/add_member/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setGroupSuccess("Member added successfully");
        setGroupError("");
        setShowAddMemberModal(false);
      } else {
        setGroupError(data.error || "Failed to add member");
        setGroupSuccess("");
      }
    } catch {
      setGroupError("An error occurred while adding the member");
      setGroupSuccess("");
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten kurs? Ta operacja jest nieodwracalna.')) {
      return;
    }
    
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'courses', courseId));
      setSuccess('Kurs został pomyślnie usunięty');
      fetchCourses(); // Refresh the list
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Błąd podczas usuwania kursu');
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę grupę? Ta operacja jest nieodwracalna.')) {
      return;
    }
    
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'groups', groupId));
      setGroupSuccess('Grupa została pomyślnie usunięta');
      fetchGroups(); // Refresh the list
    } catch (error) {
      console.error('Error deleting group:', error);
      setGroupError('Błąd podczas usuwania grupy');
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      setGroupError('Nazwa grupy jest wymagana');
      return;
    }
    
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        description: newGroupDescription,
        members: [],
        created_at: new Date().toISOString(),
        created_by: user?.email || 'admin'
      });
      
      setGroupSuccess('Grupa została pomyślnie utworzona');
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateGroupModal(false);
      fetchGroups(); // Refresh the list
    } catch (error) {
      console.error('Error creating group:', error);
      setGroupError('Błąd podczas tworzenia grupy');
    }
  };

  const assignCourseToStudent = async () => {
    if (!selectedStudentForAssignment || !selectedCourseForAssignment) {
      setError('Wybierz studenta i kurs');
      return;
    }
    
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      
      // Pobierz kurs
      const courseDoc = await getDoc(doc(db, 'courses', selectedCourseForAssignment));
      if (!courseDoc.exists()) {
        setError('Kurs nie został znaleziony');
        return;
      }
      
      const courseData = courseDoc.data();
      const assignedUsers = courseData.assignedUsers || [];
      
      // Sprawdź czy student już jest przypisany
      if (assignedUsers.includes(selectedStudentForAssignment)) {
        setError('Student jest już przypisany do tego kursu');
        return;
      }
      
      // Dodaj studenta do listy przypisanych użytkowników
      assignedUsers.push(selectedStudentForAssignment);
      
      // Zaktualizuj kurs
      await updateDoc(doc(db, 'courses', selectedCourseForAssignment), {
        assignedUsers: assignedUsers
      });
      
      setSuccess('Kurs został pomyślnie przypisany do studenta');
      setSelectedStudentForAssignment('');
      setSelectedCourseForAssignment('');
      fetchCourses(); // Refresh courses to update assignment count
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error assigning course:', error);
      setError('Błąd podczas przypisywania kursu');
      // Clear error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const createCourse = async () => {
    if (!newCourseTitle.trim() || !newCourseYear.trim() || !newCourseSubject.trim() || !selectedTeacherForCourse) {
      setError('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      
      // Generuj slug z tytułu kursu
      const generateSlug = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Usuń znaki specjalne
          .replace(/\s+/g, '-') // Zamień spacje na myślniki
          .replace(/-+/g, '-') // Usuń podwójne myślniki
          .trim();
      };
      
      const slug = generateSlug(newCourseTitle);
      
      const courseData = {
        title: newCourseTitle,
        year: parseInt(newCourseYear),
        description: newCourseDescription,
        subject: newCourseSubject,
        teacherEmail: selectedTeacherForCourse,
        assignedUsers: [],
        lessons: [],
        materials: [],
        assignments: [],
        slug: slug,
        created_at: new Date().toISOString(),
        created_by: user?.email || 'admin',
        status: 'active'
      };
      
      await addDoc(collection(db, 'courses'), courseData);
      
      setSuccess('Kurs został pomyślnie utworzony');
      setNewCourseTitle('');
      setNewCourseYear('');
      setNewCourseDescription('');
      setNewCourseSubject('');
      setSelectedTeacherForCourse('');
      setShowCreateCourseModal(false);
      fetchCourses(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating course:', error);
      setError('Błąd podczas tworzenia kursu');
      // Clear error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const createUser = async () => {
    if (!newUserEmail.trim() || !newUserFirstName.trim() || !newUserLastName.trim()) {
      setError('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      const userData = {
        email: newUserEmail,
        firstName: newUserFirstName,
        lastName: newUserLastName,
        role: newUserRole,
        approved: true,
        banned: false,
        created_at: new Date().toISOString(),
        created_by: user?.email || 'admin'
      };
      
      await addDoc(collection(db, 'users'), userData);
      
      setSuccess('Użytkownik został pomyślnie utworzony');
      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserRole('student');
      setShowCreateUserModal(false);
      fetchUsers(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Błąd podczas tworzenia użytkownika');
      // Clear error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const openEditCourseModal = (course: Course) => {
    setEditingCourse(course);
    setEditCourseTitle(course.title || '');
    setEditCourseYear(course.year?.toString() || '');
    setEditCourseDescription(course.description || '');
    setEditCourseSubject(course.subject || '');
    setEditCourseTeacher(course.teacherEmail || '');
    setEditCourseStudents(course.assignedUsers || []);
    setShowEditCourseModal(true);
  };

  const updateCourse = async () => {
    if (!editingCourse || !editCourseTitle.trim() || !editCourseYear.trim() || !editCourseSubject.trim()) {
      setError('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      
      // Generuj slug z tytułu kursu
      const generateSlug = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Usuń znaki specjalne
          .replace(/\s+/g, '-') // Zamień spacje na myślniki
          .replace(/-+/g, '-') // Usuń podwójne myślniki
          .trim();
      };
      
      const slug = generateSlug(editCourseTitle);
      
      const courseData = {
        title: editCourseTitle,
        year: parseInt(editCourseYear),
        description: editCourseDescription,
        subject: editCourseSubject,
        teacherEmail: editCourseTeacher,
        assignedUsers: editCourseStudents,
        slug: slug,
        updated_at: new Date().toISOString(),
        updated_by: user?.email || 'admin'
      };
      
      await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
      
      setSuccess('Kurs został pomyślnie zaktualizowany');
      setShowEditCourseModal(false);
      setEditingCourse(null);
      fetchCourses(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating course:', error);
      setError('Błąd podczas aktualizacji kursu');
      // Clear error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const removeStudentFromCourse = (studentEmail: string) => {
    setEditCourseStudents(prev => prev.filter(email => email !== studentEmail));
  };

  const addStudentToCourse = (studentEmail: string) => {
    if (!editCourseStudents.includes(studentEmail)) {
      setEditCourseStudents(prev => [...prev, studentEmail]);
    }
  };

  // Funkcja do aktualizacji istniejących kursów bez slug
  const updateExistingCoursesWithSlug = async () => {
    try {
      const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const coursesCollection = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesCollection);
      
      const generateSlug = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      };
      
      let updatedCount = 0;
      
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        if (!courseData.slug && courseData.title) {
          const slug = generateSlug(courseData.title);
          await updateDoc(doc(db, 'courses', courseDoc.id), {
            slug: slug
          });
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        setSuccess(`Zaktualizowano ${updatedCount} kursów z slug`);
        fetchCourses(); // Refresh the list
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating courses with slug:', error);
      setError('Błąd podczas aktualizacji kursów');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image src="/puzzleicon.png" alt="Logo" width={32} height={32} />
            <span className="ml-2 text-xl font-bold text-[#4067EC]">COGITO</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Super Administrator</span>
            <Link href="/login" className="text-[#4067EC] hover:underline">Logout</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Usuwam sekcję Aktywni użytkownicy z góry */}
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("users")}
                className={`${
                  activeTab === "users"
                    ? "border-[#4067EC] text-[#4067EC]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={`${
                  activeTab === "groups"
                    ? "border-[#4067EC] text-[#4067EC]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Group Management
              </button>
              <button
                onClick={() => setActiveTab("courses")}
                className={`${
                  activeTab === "courses"
                    ? "border-[#4067EC] text-[#4067EC]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Course Management
              </button>
              <button
                onClick={() => setActiveTab("assignments")}
                className={`${
                  activeTab === "assignments"
                    ? "border-[#4067EC] text-[#4067EC]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Course Assignments
              </button>
              <Link
                href="/homelogin/superadmin/parent-student"
                className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Rodzic-Uczeń
              </Link>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <button 
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition"
                >
                  Add New User
                </button>
              </div>
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded relative">
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              {resetPasswordSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded relative">
                  {resetPasswordSuccess}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.role === 'admin' ? 'Admin' : 
                             user.role === 'teacher' ? 'Teacher' : 
                             user.role === 'parent' ? 'Rodzic' : 'Student'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {user.role !== 'teacher' && (
                              <button 
                                onClick={() => setTeacherRole(user.email || '')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Set as Teacher
                              </button>
                            )}
                            {user.role !== 'admin' && (
                              <button 
                                onClick={() => setAdminRole(user.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Set as Admin
                              </button>
                            )}
                            {user.role !== 'parent' && (
                              <button 
                                onClick={() => setParentRole(user.id)}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                Ustaw jako Rodzic
                              </button>
                            )}
                            {user.role === 'admin' && (
                              <button 
                                onClick={() => setTeacherRole(user.email || '')}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Downgrade to Teacher
                              </button>
                            )}
                            {user.role === 'teacher' && (
                              <button 
                                onClick={() => setStudentRole(user.id)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Set as Student
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Group Management</h2>
                <button 
                  onClick={() => setShowCreateGroupModal(true)}
                  className="bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition"
                >
                  Create New Group
                </button>
              </div>
              {groupSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded relative">
                  {groupSuccess}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groups.map((group) => (
                      <tr key={group.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{group.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{group.member_count} members</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => {
                              setSelectedGroup(group);
                              setShowAddMemberModal(true);
                            }}
                            className="text-[#4067EC] hover:text-[#3155d4] mr-3"
                          >
                            Add Member
                          </button>
                          <button className="text-[#4067EC] hover:text-[#3155d4] mr-3">Edit</button>
                          <button 
                            onClick={() => deleteGroup(group.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Course Management</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={updateExistingCoursesWithSlug}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Update Slugs
                  </button>
                  <button 
                    onClick={() => setShowCreateCourseModal(true)}
                    className="bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition"
                  >
                    Add New Course
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {course.slug ? (
                              <Link 
                                href={`/courses/${course.slug}`}
                                className="text-[#4067EC] hover:text-[#3155d4] hover:underline"
                              >
                                {course.title}
                              </Link>
                            ) : (
                              course.title
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">Year {course.year}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {course.teacherEmail ? (
                              users.find(u => u.email === course.teacherEmail)?.firstName + ' ' + 
                              users.find(u => u.email === course.teacherEmail)?.lastName
                            ) : 'Not assigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {course.assignedUsers ? course.assignedUsers.length : 0} students
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => openEditCourseModal(course)}
                            className="text-[#4067EC] hover:text-[#3155d4] mr-3"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteCourse(course.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Course Assignments</h2>
                <button className="bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition">
                  New Assignment
                </button>
              </div>
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded relative">
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Assign Course to Student</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select Student</label>
                      <select 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                        value={selectedStudentForAssignment}
                        onChange={(e) => setSelectedStudentForAssignment(e.target.value)}
                      >
                        <option value="">Select a student...</option>
                        {users.filter(u => u.role === 'student').map((user: FirestoreUser) => (
                          <option key={user.id} value={user.email}>{user.firstName || ''} {user.lastName || ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select Course</label>
                      <select 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                        value={selectedCourseForAssignment}
                        onChange={(e) => setSelectedCourseForAssignment(e.target.value)}
                      >
                        <option value="">Select a course...</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={assignCourseToStudent}
                      className="w-full bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition"
                    >
                      Assign Course
                    </button>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Current Assignments</h3>
                  <div className="space-y-4">
                    {courses.map(course => (
                      <div key={course.id} className="border-b pb-4">
                        <h4 className="font-medium text-gray-800">{course.title}</h4>
                        <p className="text-sm text-gray-500">{course.assignedUsers ? course.assignedUsers.length : 0} students assigned</p>
                        <button className="text-[#4067EC] hover:text-[#3155d4] text-sm mt-2">
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetPasswordModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Reset Password for {selectedUser?.firstName} {selectedUser?.lastName}
                </h3>
                {resetPasswordError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                    {resetPasswordError}
                  </div>
                )}
                <div className="mt-2 px-7 py-3">
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#4067EC] focus:border-[#4067EC]"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end mt-4 space-x-3">
                  <button
                    onClick={() => {
                      setShowResetPasswordModal(false);
                      setNewPassword("");
                      setResetPasswordError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedUser?.id || '')}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-md hover:bg-[#3155d4]"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Course Modal */}
        {showCreateCourseModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Create New Course
                </h3>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                    {error}
                  </div>
                )}
                <div className="mt-2 px-7 py-3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Course Title *</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      placeholder="e.g., Matematyka 7A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Year *</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newCourseYear}
                      onChange={(e) => setNewCourseYear(e.target.value)}
                      placeholder="e.g., 7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject *</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newCourseSubject}
                      onChange={(e) => setNewCourseSubject(e.target.value)}
                    >
                      <option value="">Select a subject...</option>
                      <option value="Matematyka">Matematyka</option>
                      <option value="Fizyka">Fizyka</option>
                      <option value="Chemia">Chemia</option>
                      <option value="Biologia">Biologia</option>
                      <option value="Historia">Historia</option>
                      <option value="Geografia">Geografia</option>
                      <option value="Język polski">Język polski</option>
                      <option value="Język angielski">Język angielski</option>
                      <option value="Język niemiecki">Język niemiecki</option>
                      <option value="Informatyka">Informatyka</option>
                      <option value="Wiedza o społeczeństwie">Wiedza o społeczeństwie</option>
                      <option value="Wychowanie fizyczne">Wychowanie fizyczne</option>
                      <option value="Plastyka">Plastyka</option>
                      <option value="Muzyka">Muzyka</option>
                      <option value="Technika">Technika</option>
                      <option value="Edukacja dla bezpieczeństwa">Edukacja dla bezpieczeństwa</option>
                      <option value="Inne">Inne</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      rows={3}
                      value={newCourseDescription}
                      onChange={(e) => setNewCourseDescription(e.target.value)}
                      placeholder="Opis kursu..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assign Teacher *</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={selectedTeacherForCourse}
                      onChange={(e) => setSelectedTeacherForCourse(e.target.value)}
                    >
                      <option value="">Select a teacher...</option>
                      {users.filter(u => u.role === 'teacher').map((user: FirestoreUser) => (
                        <option key={user.id} value={user.email}>
                          {user.firstName || ''} {user.lastName || ''} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateCourseModal(false);
                      setNewCourseTitle("");
                      setNewCourseYear("");
                      setNewCourseDescription("");
                      setNewCourseSubject("");
                      setSelectedTeacherForCourse("");
                      setError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCourse}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-md hover:bg-[#3155d4]"
                  >
                    Create Course
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Create New User
                </h3>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                    {error}
                  </div>
                )}
                <div className="mt-2 px-7 py-3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newUserFirstName}
                      onChange={(e) => setNewUserFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newUserLastName}
                      onChange={(e) => setNewUserLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role *</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setNewUserEmail("");
                      setNewUserFirstName("");
                      setNewUserLastName("");
                      setNewUserRole("student");
                      setError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createUser}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-md hover:bg-[#3155d4]"
                  >
                    Create User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Create New Group
                </h3>
                {groupError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                    {groupError}
                  </div>
                )}
                <div className="mt-2 px-7 py-3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Group Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      rows={3}
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setNewGroupName("");
                      setNewGroupDescription("");
                      setGroupError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGroup}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-md hover:bg-[#3155d4]"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Course Modal */}
        {showEditCourseModal && editingCourse && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Edit Course: {editingCourse.title}
                </h3>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                    {error}
                  </div>
                )}
                <div className="mt-2 px-7 py-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Course Title *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                        value={editCourseTitle}
                        onChange={(e) => setEditCourseTitle(e.target.value)}
                        placeholder="e.g., Matematyka 7A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year *</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                        value={editCourseYear}
                        onChange={(e) => setEditCourseYear(e.target.value)}
                        placeholder="e.g., 7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject *</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={editCourseSubject}
                      onChange={(e) => setEditCourseSubject(e.target.value)}
                    >
                      <option value="">Select a subject...</option>
                      <option value="Matematyka">Matematyka</option>
                      <option value="Fizyka">Fizyka</option>
                      <option value="Chemia">Chemia</option>
                      <option value="Biologia">Biologia</option>
                      <option value="Historia">Historia</option>
                      <option value="Geografia">Geografia</option>
                      <option value="Język polski">Język polski</option>
                      <option value="Język angielski">Język angielski</option>
                      <option value="Język niemiecki">Język niemiecki</option>
                      <option value="Informatyka">Informatyka</option>
                      <option value="Wiedza o społeczeństwie">Wiedza o społeczeństwie</option>
                      <option value="Wychowanie fizyczne">Wychowanie fizyczne</option>
                      <option value="Plastyka">Plastyka</option>
                      <option value="Muzyka">Muzyka</option>
                      <option value="Technika">Technika</option>
                      <option value="Edukacja dla bezpieczeństwa">Edukacja dla bezpieczeństwa</option>
                      <option value="Inne">Inne</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      rows={3}
                      value={editCourseDescription}
                      onChange={(e) => setEditCourseDescription(e.target.value)}
                      placeholder="Opis kursu..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assign Teacher</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                      value={editCourseTeacher}
                      onChange={(e) => setEditCourseTeacher(e.target.value)}
                    >
                      <option value="">Select a teacher...</option>
                      {users.filter(u => u.role === 'teacher').map((user: FirestoreUser) => (
                        <option key={user.id} value={user.email}>
                          {user.firstName || ''} {user.lastName || ''} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Assigned Students Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Assigned Students</h4>
                    
                    {/* Current Students */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Currently Assigned:</h5>
                      <div className="space-y-2">
                        {editCourseStudents.length > 0 ? (
                          editCourseStudents.map((studentEmail, index) => {
                            const student = users.find(u => u.email === studentEmail);
                            return (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <span className="text-sm">
                                  {student ? `${student.firstName || ''} ${student.lastName || ''}` : studentEmail}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeStudentFromCourse(studentEmail || '')}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500">No students assigned</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Add New Student */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Add Student:</h5>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                        onChange={(e) => {
                          if (e.target.value) {
                            addStudentToCourse(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">Select a student to add...</option>
                        {users
                          .filter(u => u.role === 'student' && u.email && !editCourseStudents.includes(u.email))
                          .map((user: FirestoreUser) => (
                            <option key={user.id} value={user.email || ''}>
                              {user.firstName || ''} {user.lastName || ''} ({user.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-3">
                  <button
                    onClick={() => {
                      setShowEditCourseModal(false);
                      setEditingCourse(null);
                      setEditCourseTitle("");
                      setEditCourseYear("");
                      setEditCourseDescription("");
                      setEditCourseSubject("");
                      setEditCourseTeacher("");
                      setEditCourseStudents([]);
                      setError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateCourse}
                    className="px-4 py-2 bg-[#4067EC] text-white rounded-md hover:bg-[#3155d4]"
                  >
                    Update Course
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Add Member to {selectedGroup?.name}
                </h3>
                {groupError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
                    {groupError}
                  </div>
                )}
                <div className="mt-2 px-7 py-3">
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4067EC] focus:ring-[#4067EC]"
                    onChange={(e) => handleAddMember(selectedGroup?.id || '', e.target.value)}
                  >
                    <option value="">Select a user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role === 'teacher' ? 'Teacher' : 'Student'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setGroupError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import AdminRoute from '@/components/AdminRoute';

export default function SuperAdminDashboard() {
  return (
    <Providers>
      <AdminRoute>
        <SuperAdminDashboardContent />
      </AdminRoute>
    </Providers>
  );
} 