'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, User, Mail, Phone, Star, Save, X, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Student {
  uid: string;
  displayName: string;
  email: string;
  primaryTutorId?: string;
  assignedInstructors?: string[];
}

interface Instructor {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  instructorType?: string;
  subject?: string;
  phone?: string;
  availability?: string;
  specialization?: string[];
  experience?: string;
}

interface InstructorStudentManagementProps {
  onClose: () => void;
  currentInstructorId: string;
}

export default function InstructorStudentManagement({ onClose, currentInstructorId }: InstructorStudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentInstructor, setCurrentInstructor] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Pobierz dane aktualnego instruktora
      const instructorRef = doc(db, 'users', currentInstructorId);
      const instructorDoc = await getDoc(instructorRef);
      
      if (instructorDoc.exists()) {
        const instructorData = instructorDoc.data();
        setCurrentInstructor({
          uid: currentInstructorId,
          ...instructorData
        } as Instructor);
      }
      
      // Pobierz studentów
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Student[];
      
      setStudents(studentsList);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Błąd podczas pobierania danych' });
    } finally {
      setLoading(false);
    }
  }, [currentInstructorId]);

  useEffect(() => {
    fetchData();
  }, [currentInstructorId, fetchData]);

  const filteredStudents = students.filter(student =>
    student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignStudent = async () => {
    if (!selectedStudent || !currentInstructor) {
      setMessage({ type: 'error', text: 'Wybierz studenta' });
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/assign-student-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedStudent.uid,
          instructorId: currentInstructor.uid,
          instructorType: currentInstructor.role,
          isPrimary: isPrimary
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        await fetchData(); // Refresh data
        setSelectedStudent(null);
        setIsPrimary(false);
      } else {
        setMessage({ type: 'error', text: result.error });
      }
      
    } catch (error) {
      console.error('Error assigning student:', error);
      setMessage({ type: 'error', text: 'Błąd podczas przypisywania studenta' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    if (!currentInstructor) return;

    try {
      setSaving(true);
      
      const response = await fetch('/api/assign-student-api', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId,
          instructorId: currentInstructor.uid
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        await fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: result.error });
      }
      
    } catch (error) {
      console.error('Error unassigning student:', error);
      setMessage({ type: 'error', text: 'Błąd podczas odłączania studenta' });
    } finally {
      setSaving(false);
    }
  };

  const getInstructorTypeLabel = (type: string) => {
    switch (type) {
      case 'tutor': return 'Tutor';
      case 'wychowawca': return 'Wychowawca';
      case 'nauczyciel_wspomagajacy': return 'Nauczyciel wspomagający';
      case 'teacher': return 'Nauczyciel';
      default: return type;
    }
  };

  const getInstructorTypeColor = (type: string) => {
    switch (type) {
      case 'tutor': return 'bg-blue-100 text-blue-800';
      case 'wychowawca': return 'bg-green-100 text-green-800';
      case 'nauczyciel_wspomagajacy': return 'bg-purple-100 text-purple-800';
      case 'teacher': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Ładowanie danych...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4067EC] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Zarządzanie Studentami</h2>
              <p className="text-gray-600">
                {currentInstructor && (
                  <>
                    {currentInstructor.displayName} - {getInstructorTypeLabel(currentInstructor.role)}
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Students List */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-[#4067EC]" />
                <h3 className="text-lg font-semibold text-gray-900">Studenci</h3>
              </div>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Szukaj studentów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                />
              </div>

              {/* Students List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => {
                  const isAssigned = student.assignedInstructors?.includes(currentInstructorId) || student.primaryTutorId === currentInstructorId;
                  const isPrimary = student.primaryTutorId === currentInstructorId;
                  
                  return (
                    <div
                      key={student.uid}
                      className={`p-4 border rounded-lg transition-colors ${
                        isAssigned
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {student.displayName || 'Brak nazwiska'}
                          </h4>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <div className="text-right">
                          {isPrimary && (
                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                              <Star className="w-3 h-3" />
                              <span>Główny</span>
                            </div>
                          )}
                          {isAssigned && !isPrimary && (
                            <div className="text-xs text-green-600">
                              Przypisany
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isAssigned && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleUnassignStudent(student.uid)}
                            disabled={saving}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Odłącz studenta
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assignment Form */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <UserPlus className="w-5 h-5 text-[#4067EC]" />
                <h3 className="text-lg font-semibold text-gray-900">Przypisz Studenta</h3>
              </div>

              {selectedStudent ? (
                <div className="space-y-4">
                  {/* Selected Student Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900">Wybrany student:</h4>
                    <p className="text-blue-700">{selectedStudent.displayName || 'Brak nazwiska'}</p>
                    <p className="text-sm text-blue-600">{selectedStudent.email}</p>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="w-4 h-4 text-[#4067EC] focus:ring-[#4067EC] border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Główny instruktor</span>
                        <p className="text-xs text-gray-500">Ustaw jako głównego instruktora studenta</p>
                      </div>
                    </label>
                  </div>

                  {/* Current Instructor Info */}
                  {currentInstructor && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">{currentInstructor.displayName}</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <span>{currentInstructor.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInstructorTypeColor(currentInstructor.role)}`}>
                            {getInstructorTypeLabel(currentInstructor.role)}
                          </span>
                        </div>
                        {currentInstructor.subject && (
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span>{currentInstructor.subject}</span>
                          </div>
                        )}
                        {currentInstructor.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{currentInstructor.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleAssignStudent}
                    disabled={saving}
                    className="w-full bg-[#4067EC] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#3050b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Zapisywanie...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Przypisz Studenta
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Wybierz studenta z listy po lewej stronie</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
