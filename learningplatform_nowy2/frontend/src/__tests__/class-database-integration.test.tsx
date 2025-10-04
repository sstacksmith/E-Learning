import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassesPage from '@/app/homelogin/teacher/classes/page';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';

// Mock the auth context
jest.mock('@/context/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Firebase
jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  School: () => <div data-testid="school-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Users: () => <div data-testid="users-icon" />,
  BookOpen: () => <div data-testid="book-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Search: () => <div data-testid="search-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Award: () => <div data-testid="award-icon" />,
}));

describe('Class Database Integration Tests', () => {
  const mockTeacher = {
    uid: 'teacher-uid',
    email: 'teacher@example.com',
    role: 'teacher',
    displayName: 'Test Teacher',
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockTeacher,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Database Operations', () => {
    test('should save class with schedule to database', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: 'new-class-id' });

      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Fill class data
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '1A' } }); // Name
      fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '1' } }); // Grade level
      fireEvent.change(screen.getByPlaceholderText('Krótki opis klasy...'), { 
        target: { value: 'Test class description' } 
      });
      fireEvent.change(screen.getByPlaceholderText('np. Matematyka'), { 
        target: { value: 'Matematyka' } 
      });

      // Add schedule slot
      const addScheduleButton = screen.getByText('Dodaj zajęcia');
      fireEvent.click(addScheduleButton);

      await waitFor(() => {
        const daySelect = screen.getByDisplayValue('');
        fireEvent.change(daySelect, { target: { value: 'Poniedziałek' } });

        const timeInput = screen.getByDisplayValue('');
        fireEvent.change(timeInput, { target: { value: '08:00' } });

        const roomInput = screen.getByPlaceholderText('np. Sala 101, Matematyka');
        fireEvent.change(roomInput, { target: { value: 'Sala 101' } });
      });

      // Submit form
      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: '1A',
            grade_level: 1,
            description: 'Test class description',
            subject: 'Matematyka',
            schedule: expect.arrayContaining([
              expect.objectContaining({
                day: 'Poniedziałek',
                time: '08:00',
                room: 'Sala 101'
              })
            ]),
            students: [],
            is_active: true,
            assignedCourses: []
          })
        );
      });
    });

    test('should update class with new students', async () => {
      const mockUpdateDoc = updateDoc as jest.Mock;
      const mockArrayUnion = arrayUnion as jest.Mock;
      
      mockUpdateDoc.mockResolvedValue(undefined);
      mockArrayUnion.mockReturnValue(['student-1']);

      const mockClasses = [
        {
          id: 'class-1',
          name: '1A',
          students: [],
          grade_level: 1,
          subject: 'Matematyka',
          max_students: 30,
          academic_year: '2024/2025',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          assignedCourses: [],
          schedule: []
        }
      ];

      const mockStudents = [
        {
          id: 'student-1',
          name: 'Jan Kowalski',
          email: 'jan.kowalski@example.com',
          role: 'student'
        }
      ];

      (getDocs as jest.Mock).mockImplementation((collectionRef) => {
        if (collectionRef.id === 'classes') {
          return Promise.resolve({
            docs: mockClasses.map(cls => ({ id: cls.id, data: () => cls }))
          });
        }
        if (collectionRef.id === 'users') {
          return Promise.resolve({
            docs: mockStudents.map(student => ({ id: student.id, data: () => student }))
          });
        }
        return Promise.resolve({ docs: [] });
      });

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Find and click on class to open management modal
        const classCard = screen.getByText('1A').closest('.border');
        const manageButton = classCard?.querySelector('[title="Zarządzaj uczniami"]');
        if (manageButton) {
          fireEvent.click(manageButton);
        }
      });

      await waitFor(() => {
        // Add student to class
        const emailInput = screen.getByPlaceholderText('Wprowadź email ucznia');
        fireEvent.change(emailInput, { target: { value: 'jan.kowalski@example.com' } });
        
        const addButton = screen.getByText('Dodaj do klasy');
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            students: expect.anything()
          })
        );
        expect(mockArrayUnion).toHaveBeenCalledWith('student-1');
      });
    });

    test('should remove student from class', async () => {
      const mockUpdateDoc = updateDoc as jest.Mock;
      const mockArrayRemove = arrayRemove as jest.Mock;
      
      mockUpdateDoc.mockResolvedValue(undefined);
      mockArrayRemove.mockReturnValue([]);

      const mockClasses = [
        {
          id: 'class-1',
          name: '1A',
          students: ['student-1'],
          grade_level: 1,
          subject: 'Matematyka',
          max_students: 30,
          academic_year: '2024/2025',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          assignedCourses: [],
          schedule: []
        }
      ];

      const mockStudents = [
        {
          id: 'student-1',
          name: 'Jan Kowalski',
          email: 'jan.kowalski@example.com',
          classId: 'class-1',
          role: 'student'
        }
      ];

      (getDocs as jest.Mock).mockImplementation((collectionRef) => {
        if (collectionRef.id === 'classes') {
          return Promise.resolve({
            docs: mockClasses.map(cls => ({ id: cls.id, data: () => cls }))
          });
        }
        if (collectionRef.id === 'users') {
          return Promise.resolve({
            docs: mockStudents.map(student => ({ id: student.id, data: () => student }))
          });
        }
        return Promise.resolve({ docs: [] });
      });

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Find and click on class to open management modal
        const classCard = screen.getByText('1A').closest('.border');
        const manageButton = classCard?.querySelector('[title="Zarządzaj uczniami"]');
        if (manageButton) {
          fireEvent.click(manageButton);
        }
      });

      await waitFor(() => {
        // Remove student from class
        const removeButton = screen.getByTitle('Usuń z klasy');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            students: expect.anything()
          })
        );
        expect(mockArrayRemove).toHaveBeenCalledWith('student-1');
      });
    });

    test('should delete class from database', async () => {
      const mockDeleteDoc = deleteDoc as jest.Mock;
      mockDeleteDoc.mockResolvedValue(undefined);

      const mockClasses = [
        {
          id: 'class-1',
          name: '1A',
          students: [],
          grade_level: 1,
          subject: 'Matematyka',
          max_students: 30,
          academic_year: '2024/2025',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          assignedCourses: [],
          schedule: []
        }
      ];

      (getDocs as jest.Mock).mockImplementation((collectionRef) => {
        if (collectionRef.id === 'classes') {
          return Promise.resolve({
            docs: mockClasses.map(cls => ({ id: cls.id, data: () => cls }))
          });
        }
        return Promise.resolve({ docs: [] });
      });

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Find and click delete button
        const classCard = screen.getByText('1A').closest('.border');
        const deleteButton = classCard?.querySelector('[title="Usuń klasę"]');
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      });

      await waitFor(() => {
        expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
        expect(window.confirm).toHaveBeenCalledWith('Czy na pewno chcesz usunąć tę klasę?');
      });
    });
  });

  describe('Data Validation', () => {
    test('should validate class creation data structure', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: 'new-class-id' });

      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Fill minimal required data
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '1A' } });
      fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '1' } });

      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: expect.any(String),
            grade_level: expect.any(Number),
            students: expect.any(Array),
            is_active: expect.any(Boolean),
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
            assignedCourses: expect.any(Array),
            schedule: expect.any(Array)
          })
        );
      });
    });

    test('should handle empty schedule array', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: 'new-class-id' });

      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Fill required data without adding schedule
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '1A' } });
      fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '1' } });

      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            schedule: []
          })
        );
      });
    });
  });

  describe('Error Scenarios', () => {
    test('should handle database connection errors', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Wystąpił błąd podczas ładowania klas/)).toBeInTheDocument();
      });
    });

    test('should handle class creation database errors', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });
      (addDoc as jest.Mock).mockRejectedValue(new Error('Database write failed'));

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Fill required data
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '1A' } });
      fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '1' } });

      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Wystąpił błąd podczas tworzenia klasy.')).toBeInTheDocument();
      });
    });

    test('should handle student assignment errors', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const mockClasses = [
        {
          id: 'class-1',
          name: '1A',
          students: [],
          grade_level: 1,
          subject: 'Matematyka',
          max_students: 30,
          academic_year: '2024/2025',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          assignedCourses: [],
          schedule: []
        }
      ];

      const mockStudents = [
        {
          id: 'student-1',
          name: 'Jan Kowalski',
          email: 'jan.kowalski@example.com',
          role: 'student'
        }
      ];

      (getDocs as jest.Mock).mockImplementation((collectionRef) => {
        if (collectionRef.id === 'classes') {
          return Promise.resolve({
            docs: mockClasses.map(cls => ({ id: cls.id, data: () => cls }))
          });
        }
        if (collectionRef.id === 'users') {
          return Promise.resolve({
            docs: mockStudents.map(student => ({ id: student.id, data: () => student }))
          });
        }
        return Promise.resolve({ docs: [] });
      });

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const classCard = screen.getByText('1A').closest('.border');
        const manageButton = classCard?.querySelector('[title="Zarządzaj uczniami"]');
        if (manageButton) {
          fireEvent.click(manageButton);
        }
      });

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Wprowadź email ucznia');
        fireEvent.change(emailInput, { target: { value: 'jan.kowalski@example.com' } });
        
        const addButton = screen.getByText('Dodaj do klasy');
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Wystąpił błąd podczas przypisywania ucznia/)).toBeInTheDocument();
      });
    });
  });
});
