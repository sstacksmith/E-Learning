"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Image from "next/image";
import Link from "next/link";
import Providers from '@/components/Providers';
import { db } from "@/config/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth } from "@/config/firebase";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  BookOpen,
  Users,
  ClipboardList,
  BarChart3,
  Calendar,
  MessageSquare,
  Award,
  TrendingUp,
  Clock,
  Shield,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  UserPlus,
  Group,
  GraduationCap,
  ArrowLeft,
  Bug,
  Filter,
  AlertCircle,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';

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

interface StatCard {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'course' | 'group' | 'approval' | 'creation';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
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
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [bugReportsLoading, setBugReportsLoading] = useState(false);
  const [bugReportsError, setBugReportsError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Pobierz ostatnie aktywności
  const fetchRecentActivities = useCallback(async () => {
    if (!user?.email) return;

    try {
      const activities: RecentActivity[] = [];
      
      // Pobierz ostatnie zatwierdzenia użytkowników
      const recentUsers = users.slice(0, 3);
      recentUsers.forEach(user => {
        if (user.approved) {
          activities.push({
            id: `user-approved-${user.id}`,
            type: 'approval',
            title: 'Użytkownik zatwierdzony',
            description: `${user.firstName || ''} ${user.lastName || ''} został zatwierdzony`,
            timestamp: new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/'),
            icon: CheckCircle
          });
        }
      });

      // Pobierz ostatnie utworzone kursy
      const recentCourses = courses.slice(0, 2);
      recentCourses.forEach(course => {
        activities.push({
          id: `course-created-${course.id}`,
          type: 'course',
          title: 'Nowy kurs utworzony',
          description: `Kurs "${course.title}" został utworzony`,
          timestamp: new Date().toLocaleString('pl-PL'),
          icon: BookOpen
        });
      });

      // Pobierz ostatnie utworzone grupy
      const recentGroups = groups.slice(0, 2);
      recentGroups.forEach(group => {
        activities.push({
          id: `group-created-${group.id}`,
          type: 'group',
          title: 'Nowa grupa utworzona',
          description: `Grupa "${group.name}" została utworzona`,
          timestamp: new Date().toLocaleString('pl-PL'),
          icon: Group
        });
      });

      // Sortuj aktywności po czasie (najnowsze pierwsze)
      activities.sort((a, b) => {
        try {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Error sorting activities:', error);
          return 0;
        }
      });

      // Usuń duplikaty i weź pierwsze 4
      const uniqueActivities = activities.filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      );

      setRecentActivities(uniqueActivities.slice(0, 4));
      
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  }, [user, users, courses, groups]);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchGroups();
  }, [fetchUsers, fetchCourses, fetchGroups]);

  // Funkcja do pobierania zgłoszeń błędów
  const fetchBugReports = useCallback(async () => {
    try {
      setBugReportsLoading(true);
      setBugReportsError('');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Brak użytkownika zalogowanego');
      }

      const token = await currentUser.getIdToken();
      if (!token) {
        throw new Error('Brak tokenu autoryzacyjnego');
      }

      let url = '/api/bug-reports?';
      if (statusFilter !== 'all') {
        url += `status=${statusFilter}&`;
      }
      if (categoryFilter !== 'all') {
        url += `category=${encodeURIComponent(categoryFilter)}&`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error('Brak uprawnień. Wymagana rola: Administrator');
        }
        const errorMessage = errorData.error || errorData.detail || 'Błąd podczas pobierania zgłoszeń';
        console.error('Error response:', errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setBugReports(data.reports || []);
    } catch (err: any) {
      setBugReportsError(err.message || 'Wystąpił błąd podczas pobierania zgłoszeń');
      console.error('Error fetching bug reports:', err);
    } finally {
      setBugReportsLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  // Pobierz zgłoszenia gdy zakładka jest aktywna
  useEffect(() => {
    if (activeTab === 'bug-reports' && user) {
      fetchBugReports();
    }
  }, [activeTab, user, fetchBugReports]);

  // Funkcja do aktualizacji statusu zgłoszenia
  const updateBugReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Brak użytkownika zalogowanego');
      }

      const token = await currentUser.getIdToken();
      if (!token) {
        throw new Error('Brak tokenu autoryzacyjnego');
      }

      const response = await fetch(`/api/bug-reports/${reportId}/status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Błąd podczas aktualizacji statusu');
      }

      // Odśwież listę zgłoszeń
      await fetchBugReports();
      setSuccess('Status zgłoszenia został zaktualizowany');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setBugReportsError(err.message || 'Wystąpił błąd podczas aktualizacji statusu');
      console.error('Error updating status:', err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    if (users.length > 0 && courses.length > 0 && groups.length > 0) {
      fetchRecentActivities();
    }
  }, [users, courses, groups, fetchRecentActivities]);

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
      const userData = userDoc.data();
      
      // Aktualizuj rolę w Firestore
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'teacher',
        approved: true
      });
      
      // Ustaw custom claims w Firebase Auth (ważne dla uprawnień)
      try {
        console.log('Setting custom claims for user:', userData.uid);
        const response = await fetch('/api/set-teacher-role-api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: userData.uid })
        });
        
        if (response.ok) {
          console.log('✅ Custom claims set successfully for teacher');
          
          // Poinformuj użytkownika, że powinien się wylogować i zalogować ponownie
          setSuccess(`Nauczyciel ${email} został ustawiony! Użytkownik powinien się wylogować i zalogować ponownie, aby uzyskać pełne uprawnienia.`);
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to set Firebase Auth custom claims:', errorData);
          setError('Nie udało się ustawić uprawnień Firebase Auth: ' + (errorData.error || 'Unknown error'));
        }
      } catch (authError) {
        console.error('❌ Error setting Firebase Auth custom claims:', authError);
        setError('Błąd podczas ustawiania uprawnień Firebase Auth: ' + (authError instanceof Error ? authError.message : 'Unknown error'));
      }
      
      setTimeout(() => setSuccess(''), 5000);
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
      const { updateDoc, doc, getDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', uid), {
        role: 'admin',
        approved: true
      });
      
      // Ustaw custom claims w Firebase Auth (ważne dla uprawnień)
      try {
        const response = await fetch('/api/set-admin-role-api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: uid })
        });
        
        if (!response.ok) {
          console.error('Failed to set Firebase Auth custom claims');
        }
      } catch (authError) {
        console.error('Error setting Firebase Auth custom claims:', authError);
      }
      
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

  const approveUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approved: true
      });
      
      setSuccess(`Użytkownik został zatwierdzony`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Nie udało się zatwierdzić użytkownika');
      setTimeout(() => setError(''), 3000);
    }
  };

  const rejectUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approved: false
      });
      
      setSuccess(`Użytkownik został odrzucony`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError('Nie udało się odrzucić użytkownika');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Ta operacja jest nieodwracalna.')) {
      return;
    }
    
    try {
      // Najpierw upewnij się, że administrator ma custom claims
      if (user?.role === 'admin') {
        try {
          const response = await fetch('/api/set-admin-role-api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid: user.uid })
          });
          
          if (response.ok) {
            console.log('✅ Admin custom claims updated');
            // Refresh token to get new custom claims
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            if (auth.currentUser) {
              const token = await auth.currentUser.getIdToken(true);
              localStorage.setItem('token', token);
            }
          }
        } catch (authError) {
          console.error('Error updating admin custom claims:', authError);
        }
      }
      
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', uid));
      
      setSuccess(`Użytkownik został usunięty`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Nie udało się usunąć użytkownika: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setTimeout(() => setError(''), 5000);
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
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4067EC]"></div>
      </div>
    );
  }

  // Karty statystyk
  const statCards: StatCard[] = [
    {
      title: "Wszyscy Użytkownicy",
      value: users.length.toString(),
      description: "zarejestrowanych użytkowników",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Oczekujący na zatwierdzenie", 
      value: users.filter(u => !u.approved).length.toString(),
      description: "użytkowników czeka",
      icon: Clock,
      color: "bg-yellow-500"
    },
    {
      title: "Kursy",
      value: courses.length.toString(),
      description: "aktywnych kursów",
      icon: BookOpen,
      color: "bg-green-500"
    },
    {
      title: "Grupy",
      value: groups.length.toString(),
      description: "utworzonych grup",
      icon: Group,
      color: "bg-purple-500"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full overflow-x-hidden">
      {/* Header z przyciskiem powrotu - Responsywny */}
      <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Lewa strona - Logo i przycisk powrotu */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => window.location.href = '/homelogin'}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 border border-gray-200 flex-shrink-0"
                aria-label="Powrót do strony głównej"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Powrót</span>
              </button>
              
              <div className="flex items-center gap-2 min-w-0">
                <Image src="/puzzleicon.png" alt="Logo" width={28} height={28} className="flex-shrink-0" />
                <span className="text-lg sm:text-xl font-bold text-[#4067EC] truncate">COGITO</span>
              </div>
            </div>

            {/* Prawa strona - User info i akcje */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="hidden sm:inline text-sm text-gray-600">Super Administrator</span>
              <div className="relative">
                <ThemeToggle />
              </div>
              <Link 
                href="/login" 
                className="px-3 py-2 text-sm text-[#4067EC] hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                <span className="hidden sm:inline">Wyloguj</span>
                <span className="sm:hidden">Exit</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsywny padding z max-width i jednakową szerokością */}
      <main className="w-full max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 box-border">
        {/* Header z powitaniem - Responsywny */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4 text-gray-900">
            Witaj z powrotem, <span className="text-[#4067EC]">{(user as any)?.displayName || user?.email?.split('@')[0] || 'Administratorze'}</span>!
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Przegląd systemu edukacyjnego i zarządzanie użytkownikami
          </p>
        </div>

        {/* Karty statystyk - Responsywne */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate pr-2">{stat.title}</h3>
                  <div className={`p-2 sm:p-2.5 rounded-lg ${stat.color} flex-shrink-0`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <p className="text-xs text-gray-600 flex items-center">
                  {stat.trend === "up" && <TrendingUp className="inline h-3 w-3 mr-1 text-green-500 flex-shrink-0" />}
                  <span className="truncate">{stat.description}</span>
                </p>
              </div>
            );
          })}
        </div>



        {/* Główny layout z zakładkami po lewej i akcjami po prawej - jednakowa szerokość */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-full">
          {/* Lewa strona - zakładki i zawartość */}
          <div className="lg:col-span-3 w-full max-w-full overflow-hidden">
            {/* Tabs - Responsywne z mobile menu */}
            <div className="mb-6 sm:mb-8">
              {/* Mobile Menu Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors w-full justify-between"
                >
                  <span className="font-medium">
                    {activeTab === "users" && "User Management"}
                    {activeTab === "pending" && `Pending Users (${users.filter(u => !u.approved).length})`}
                    {activeTab === "groups" && "Group Management"}
                    {activeTab === "courses" && "Course Management"}
                    {activeTab === "assignments" && "Course Assignments"}
                    {activeTab === "bug-reports" && "Zgłoszenia błędów"}
                  </span>
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                
                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                  <div className="mt-2 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                    {[
                      { id: "users", label: "User Management", icon: Users },
                      { id: "pending", label: `Pending Users (${users.filter(u => !u.approved).length})`, icon: Clock },
                      { id: "groups", label: "Group Management", icon: Group },
                      { id: "courses", label: "Course Management", icon: BookOpen },
                      { id: "assignments", label: "Course Assignments", icon: ClipboardList },
                      { id: "bug-reports", label: "Zgłoszenia błędów", icon: Bug },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            activeTab === tab.id ? "bg-blue-50 text-[#4067EC] border-l-4 border-[#4067EC]" : "text-gray-700"
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{tab.label}</span>
                        </button>
                      );
                    })}
                    <Link
                      href="/homelogin/superadmin/parent-student"
                      className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors text-gray-700 border-t border-gray-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <UserPlus className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">Rodzic-Uczeń</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Desktop Tabs */}
              <div className="hidden lg:block border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("users")}
                    className={`${
                      activeTab === "users"
                        ? "border-[#4067EC] text-[#4067EC]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    User Management
                  </button>
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`${
                      activeTab === "pending"
                        ? "border-[#4067EC] text-[#4067EC]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Pending Users ({users.filter(u => !u.approved).length})
                  </button>
                  <button
                    onClick={() => setActiveTab("groups")}
                    className={`${
                      activeTab === "groups"
                        ? "border-[#4067EC] text-[#4067EC]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Group Management
                  </button>
                  <button
                    onClick={() => setActiveTab("courses")}
                    className={`${
                      activeTab === "courses"
                        ? "border-[#4067EC] text-[#4067EC]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Course Management
                  </button>
                  <button
                    onClick={() => setActiveTab("assignments")}
                    className={`${
                      activeTab === "assignments"
                        ? "border-[#4067EC] text-[#4067EC]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Course Assignments
                  </button>
                  <button
                    onClick={() => setActiveTab("bug-reports")}
                    className={`${
                      activeTab === "bug-reports"
                        ? "border-[#4067EC] text-[#4067EC]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                  >
                    <Bug className="w-4 h-4" />
                    Zgłoszenia błędów
                  </button>
                  <Link
                    href="/homelogin/superadmin/parent-student"
                    className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Rodzic-Uczeń
                  </Link>
                </nav>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === "users" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">User Management</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                        <span className="font-medium text-green-600">{users.filter(u => u.approved).length}</span> zatwierdzonych, 
                        <span className="font-medium text-yellow-600"> {users.filter(u => !u.approved).length}</span> oczekuje
                      </div>
                      <button 
                        onClick={() => setShowCreateUserModal(true)}
                        className="bg-[#4067EC] text-white px-4 py-2 rounded-lg hover:bg-[#3155d4] transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New User</span>
                      </button>
                    </div>
                  </div>
                  {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {success}
                    </div>
                  )}
                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  {resetPasswordSuccess && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {resetPasswordSuccess}
                    </div>
                  )}
                  {/* Responsywna tabela - mobile: cards, desktop: table */}
                  <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-1/12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="w-1/2 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                          <div className="text-sm font-medium">
                            {user.approved ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Zatwierdzony
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⏳ Oczekuje na zatwierdzenie
                              </span>
                            )}
                          </div>
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
                            {!user.approved ? (
                              <button 
                                onClick={() => approveUser(user.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Zatwierdź
                              </button>
                            ) : (
                              <button 
                                onClick={() => rejectUser(user.id)}
                                className="text-red-600 hover:text-red-900 font-medium text-xs px-2 py-1 rounded border hover:bg-red-50"
                              >
                                <XCircle className="h-3 w-3" />
                                Odrzuć
                              </button>
                            )}
                            {user.role !== 'teacher' && (
                              <button 
                                onClick={() => setTeacherRole(user.email || '')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
                              >
                                <GraduationCap className="h-3 w-3" />
                                Nauczyciel
                              </button>
                            )}
                            {user.role !== 'admin' && (
                              <button 
                                onClick={() => setAdminRole(user.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                              >
                                <Shield className="h-3 w-3" />
                                Admin
                              </button>
                            )}
                            {user.role !== 'parent' && (
                              <button 
                                onClick={() => setParentRole(user.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded-md hover:bg-purple-200 transition-colors"
                              >
                                <Users className="h-3 w-3" />
                                Rodzic
                              </button>
                            )}
                            {user.role === 'admin' && (
                              <button 
                                onClick={() => setTeacherRole(user.email || '')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
                              >
                                <GraduationCap className="h-3 w-3" />
                                Nauczyciel
                              </button>
                            )}
                            {user.role === 'teacher' && (
                              <button 
                                onClick={() => setStudentRole(user.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                <Users className="h-3 w-3" />
                                Uczeń
                              </button>
                            )}
                            <button 
                              onClick={() => deleteUser(user.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                              title="Usuń użytkownika"
                            >
                              <Trash2 className="h-3 w-3" />
                              Usuń
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>
              
              {/* Mobile View - Cards */}
              <div className="md:hidden space-y-4 mt-4">
                {users.map((user) => (
                  <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-xs text-gray-600 truncate mt-1">{user.email}</p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {user.approved ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Zatwierdzony
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Oczekuje
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">Rola:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {user.role === 'admin' ? 'Admin' : 
                         user.role === 'teacher' ? 'Teacher' : 
                         user.role === 'parent' ? 'Rodzic' : 'Student'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!user.approved ? (
                        <button 
                          onClick={() => approveUser(user.id)}
                          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Zatwierdź
                        </button>
                      ) : (
                        <button 
                          onClick={() => rejectUser(user.id)}
                          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                          Odrzuć
                        </button>
                      )}
                      {user.role !== 'teacher' && (
                        <button 
                          onClick={() => setTeacherRole(user.email || '')}
                          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          <GraduationCap className="h-3 w-3" />
                          Nauczyciel
                        </button>
                      )}
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Usuń
                      </button>
                    </div>
                  </div>
                ))}
              </div>
                </div>
              </div>
            )}

            {activeTab === "pending" && (
              <div className="bg-white rounded-lg shadow w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Pending Users - Oczekujący na zatwierdzenie</h2>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-yellow-600">{users.filter(u => !u.approved).length}</span> użytkowników oczekuje na zatwierdzenie
                </div>
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
                        Status
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
                    {users.filter(u => !u.approved).map((user) => (
                      <tr key={user.id} className="bg-yellow-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Oczekuje na zatwierdzenie
                            </span>
                          </div>
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
                            <button 
                              onClick={() => approveUser(user.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Zatwierdź
                            </button>
                            <button 
                              onClick={() => rejectUser(user.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                            >
                              <XCircle className="h-3 w-3" />
                              Odrzuć
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id)}
                              className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
                              title="Usuń użytkownika"
                            >
                              <Trash2 className="h-3 w-3" />
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.filter(u => !u.approved).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Wszyscy użytkownicy zostali zatwierdzeni! 🎉
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

            {activeTab === "groups" && (
              <div className="bg-white rounded-lg shadow w-full">
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors mr-3"
                          >
                            <UserPlus className="h-3 w-3" />
                            Add Member
                          </button>
                          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors mr-3">
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteGroup(group.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
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
              <div className="bg-white rounded-lg shadow w-full">
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors mr-3"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteCourse(course.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
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
              <div className="bg-white rounded-lg shadow w-full">
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

            {activeTab === "bug-reports" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                      <Bug className="w-5 h-5 sm:w-6 sm:h-6" />
                      Zgłoszenia błędów
                    </h2>
                    <button
                      onClick={() => fetchBugReports()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#3155d4] transition-colors text-sm font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Odśwież
                    </button>
                  </div>

                  {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {success}
                    </div>
                  )}
                  {bugReportsError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {bugReportsError}
                    </div>
                  )}

                  {/* Filtry */}
                  <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Filter className="w-4 h-4 inline mr-1" />
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Wszystkie</option>
                        <option value="new">Nowe</option>
                        <option value="in_progress">W trakcie</option>
                        <option value="resolved">Rozwiązane</option>
                        <option value="closed">Zamknięte</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategoria
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Wszystkie</option>
                        {Array.from(new Set(bugReports.map(r => r.category))).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Statystyki */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {['new', 'in_progress', 'resolved', 'closed'].map((status) => {
                  const count = bugReports.filter(r => r.status === status).length;
                  const statusLabels = {
                    new: 'Nowe',
                    in_progress: 'W trakcie',
                    resolved: 'Rozwiązane',
                    closed: 'Zamknięte'
                  };
                  const statusColors = {
                    new: 'bg-blue-100 text-blue-800',
                    in_progress: 'bg-yellow-100 text-yellow-800',
                    resolved: 'bg-green-100 text-green-800',
                    closed: 'bg-gray-100 text-gray-800'
                  };
                  return (
                    <div key={status} className={`${statusColors[status as keyof typeof statusColors]} rounded-lg p-4`}>
                      <p className="text-sm font-medium opacity-75">{statusLabels[status as keyof typeof statusLabels]}</p>
                      <p className="text-2xl font-bold mt-1">{count}</p>
                    </div>
                  );
                })}
              </div>

                  {/* Lista zgłoszeń */}
                  {bugReportsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4067EC] mx-auto"></div>
                      <p className="mt-4 text-gray-600">Ładowanie zgłoszeń...</p>
                    </div>
                  ) : bugReports.length === 0 ? (
                    <div className="text-center py-12">
                      <Bug className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">Brak zgłoszeń do wyświetlenia</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bugReports.map((report) => {
                    const statusColors = {
                      new: 'bg-blue-100 text-blue-800 border-blue-200',
                      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      resolved: 'bg-green-100 text-green-800 border-green-200',
                      closed: 'bg-gray-100 text-gray-800 border-gray-200',
                    };
                    const statusLabels = {
                      new: 'Nowe',
                      in_progress: 'W trakcie',
                      resolved: 'Rozwiązane',
                      closed: 'Zamknięte'
                    };
                    return (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full border text-sm font-medium ${statusColors[report.status as keyof typeof statusColors]}`}>
                                {statusLabels[report.status as keyof typeof statusLabels]}
                              </span>
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                {report.category}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(report.created_at)}
                              </span>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                              {report.description}
                            </h3>

                            {report.steps && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Kroki do odtworzenia:</p>
                                <p className="text-sm text-gray-600 whitespace-pre-line">{report.steps}</p>
                              </div>
                            )}

                            {(report.expected || report.actual) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                {report.expected && (
                                  <div>
                                    <p className="text-sm font-medium text-green-700 mb-1">Oczekiwane:</p>
                                    <p className="text-sm text-gray-600">{report.expected}</p>
                                  </div>
                                )}
                                {report.actual && (
                                  <div>
                                    <p className="text-sm font-medium text-red-700 mb-1">Rzeczywiste:</p>
                                    <p className="text-sm text-gray-600">{report.actual}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              {report.browser && (
                                <span>🌐 {report.browser}</span>
                              )}
                              {report.url && (
                                <a
                                  href={report.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  🔗 Link
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="lg:ml-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Zmień status:
                            </label>
                            <select
                              value={report.status}
                              onChange={(e) => updateBugReportStatus(report.id, e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="new">Nowe</option>
                              <option value="in_progress">W trakcie</option>
                              <option value="resolved">Rozwiązane</option>
                              <option value="closed">Zamknięte</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        {/* Prawa kolumna - Szybkie akcje i aktywności - jednakowa szerokość */}
        <div className="lg:col-span-1 w-full max-w-full space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Szybkie akcje</h3>
              <p className="text-sm text-gray-600">Najczęściej używane funkcje</p>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Dodaj użytkownika</div>
                  <div className="text-sm text-gray-600">Utwórz nowe konto</div>
                </div>
              </button>

              <button
                onClick={() => setShowCreateCourseModal(true)}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Utwórz kurs</div>
                  <div className="text-sm text-gray-600">Dodaj nowy kurs</div>
                </div>
              </button>

              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Group className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium text-gray-900">Utwórz grupę</div>
                  <div className="text-sm text-gray-600">Dodaj nową grupę</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("pending")}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-gray-900">Zatwierdź użytkowników</div>
                  <div className="text-sm text-gray-600">Przeglądaj oczekujących</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ostatnie aktywności</h3>
              <p className="text-sm text-gray-600">Najnowsze wydarzenia w systemie</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={index} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                          <Icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Brak ostatnich aktywności
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Zobacz wszystkie aktywności
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

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
import ThemeToggle from '@/components/ThemeToggle';

export default function SuperAdminDashboard() {
  return (
    <Providers>
      <AdminRoute>
        <SuperAdminDashboardContent />
      </AdminRoute>
    </Providers>
  );
} 

