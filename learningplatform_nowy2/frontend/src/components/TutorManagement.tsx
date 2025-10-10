'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, User, Mail, Phone, Star, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Student {
  uid: string;
  displayName: string;
  email: string;
  primaryTutorId?: string;
  assignedTutors?: string[];
}

interface Teacher {
  uid: string;
  displayName: string;
  email: string;
  subject?: string;
  phone?: string;
  availability?: string;
  instructorType?: string;
  specialization?: string[];
  experience?: string;
}

interface TutorManagementProps {
  onClose: () => void;
}

export default function TutorManagement({ onClose }: TutorManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Pobierz studentów
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Student[];
      
      // Pobierz tylko nowych instruktorów (tutorów, wychowawców, nauczycieli wspomagających)
      const instructorRoles = ['tutor', 'wychowawca', 'nauczyciel_wspomagajacy'];
      const teachersList: Teacher[] = [];
      
      for (const role of instructorRoles) {
        const teachersQuery = query(collection(db, 'users'), where('role', '==', role));
        const teachersSnapshot = await getDocs(teachersQuery);
        const roleTeachers = teachersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          instructorType: role
        })) as Teacher[];
        teachersList.push(...roleTeachers);
      }
      
      setStudents(studentsList);
      setTeachers(teachersList);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Błąd podczas pobierania danych' });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignTutor = async () => {
    if (!selectedStudent || !selectedTutor) {
      setMessage({ type: 'error', text: 'Wybierz studenta i tutora' });
      return;
    }

    try {
      setSaving(true);
      
      const studentRef = doc(db, 'users', selectedStudent.uid);
      const studentDoc = await getDoc(studentRef);
      
      if (!studentDoc.exists()) {
        setMessage({ type: 'error', text: 'Student nie został znaleziony' });
        return;
      }

      const studentData = studentDoc.data();
      const currentAssignedTutors = studentData.assignedTutors || [];
      const currentPrimaryTutor = studentData.primaryTutorId;

      let updateData: any = {};

      if (isPrimary) {
        // Ustaw jako głównego tutora
        updateData.primaryTutorId = selectedTutor;
        
        // Jeśli był już w assignedTutors, usuń go
        if (currentAssignedTutors.includes(selectedTutor)) {
          updateData.assignedTutors = currentAssignedTutors.filter((id: string) => id !== selectedTutor);
        }
      } else {
        // Dodaj do listy przypisanych tutorów
        if (!currentAssignedTutors.includes(selectedTutor)) {
          updateData.assignedTutors = [...currentAssignedTutors, selectedTutor];
        }
        
        // Jeśli był głównym tutorem, usuń go z tej roli
        if (currentPrimaryTutor === selectedTutor) {
          updateData.primaryTutorId = null;
        }
      }

      await updateDoc(studentRef, updateData);
      
      setMessage({ type: 'success', text: 'Tutor został przypisany pomyślnie!' });
      
      // Odśwież dane
      await fetchData();
      
      // Wyczyść formularz
      setSelectedStudent(null);
      setSelectedTutor('');
      setIsPrimary(false);
      
    } catch (error) {
      console.error('Error assigning tutor:', error);
      setMessage({ type: 'error', text: 'Błąd podczas przypisywania tutora' });
    } finally {
      setSaving(false);
    }
  };

  const getTutorInfo = (tutorId: string) => {
    return teachers.find(teacher => teacher.uid === tutorId);
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
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Zarządzanie Tutorami</h2>
              <p className="text-gray-600">Przypisz tutorów do studentów</p>
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
                {filteredStudents.map((student) => (
                  <div
                    key={student.uid}
                    onClick={() => setSelectedStudent(student)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedStudent?.uid === student.uid
                        ? 'border-[#4067EC] bg-blue-50'
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
                        {student.primaryTutorId && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Star className="w-3 h-3" />
                            <span>Główny tutor</span>
                          </div>
                        )}
                        {student.assignedTutors && student.assignedTutors.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {student.assignedTutors.length} tutorów
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Current Tutors */}
                    {(student.primaryTutorId || (student.assignedTutors && student.assignedTutors.length > 0)) && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Przypisani tutorzy:</div>
                        <div className="space-y-1">
                          {student.primaryTutorId && (
                            <div className="flex items-center gap-2">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs">
                                {getTutorInfo(student.primaryTutorId)?.displayName || 'Nieznany tutor'}
                              </span>
                            </div>
                          )}
                          {student.assignedTutors?.map((tutorId) => (
                            <div key={tutorId} className="flex items-center gap-2">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-xs">
                                {getTutorInfo(tutorId)?.displayName || 'Nieznany tutor'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Form */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <UserPlus className="w-5 h-5 text-[#4067EC]" />
                <h3 className="text-lg font-semibold text-gray-900">Przypisz Tutora</h3>
              </div>

              {selectedStudent ? (
                <div className="space-y-4">
                  {/* Selected Student Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900">Wybrany student:</h4>
                    <p className="text-blue-700">{selectedStudent.displayName || 'Brak nazwiska'}</p>
                    <p className="text-sm text-blue-600">{selectedStudent.email}</p>
                  </div>

                  {/* Tutor Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wybierz tutora
                    </label>
                    <select
                      value={selectedTutor}
                      onChange={(e) => setSelectedTutor(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC]"
                    >
                      <option value="">-- Wybierz tutora --</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.uid} value={teacher.uid}>
                          {teacher.displayName || 'Brak nazwiska'} - {
                            teacher.instructorType === 'tutor' ? 'Tutor' :
                            teacher.instructorType === 'wychowawca' ? 'Wychowawca' :
                            teacher.instructorType === 'nauczyciel_wspomagajacy' ? 'Nauczyciel wspomagający' :
                            teacher.instructorType === 'teacher' ? 'Nauczyciel' : teacher.instructorType || 'Instruktor'
                          } - {teacher.subject || 'Ogólne'}
                        </option>
                      ))}
                    </select>
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
                        <span className="text-sm font-medium text-gray-700">Główny tutor</span>
                        <p className="text-xs text-gray-500">Ustaw jako głównego tutora studenta</p>
                      </div>
                    </label>
                  </div>

                  {/* Selected Tutor Info */}
                  {selectedTutor && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      {(() => {
                        const tutor = getTutorInfo(selectedTutor);
                        return tutor ? (
                          <div>
                            <h4 className="font-medium text-gray-900">{tutor.displayName}</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                <span>{tutor.email}</span>
                              </div>
                              {tutor.instructorType && (
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    tutor.instructorType === 'tutor' ? 'bg-blue-100 text-blue-800' :
                                    tutor.instructorType === 'wychowawca' ? 'bg-green-100 text-green-800' :
                                    tutor.instructorType === 'nauczyciel_wspomagajacy' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {tutor.instructorType === 'tutor' ? 'Tutor' :
                                     tutor.instructorType === 'wychowawca' ? 'Wychowawca' :
                                     tutor.instructorType === 'nauczyciel_wspomagajacy' ? 'Nauczyciel wspomagający' :
                                     tutor.instructorType === 'teacher' ? 'Nauczyciel' : tutor.instructorType}
                                  </span>
                                </div>
                              )}
                              {tutor.subject && (
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  <span>{tutor.subject}</span>
                                </div>
                              )}
                              {tutor.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3 h-3" />
                                  <span>{tutor.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">Nieznany tutor</p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleAssignTutor}
                    disabled={saving || !selectedTutor}
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
                        Przypisz Tutora
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






