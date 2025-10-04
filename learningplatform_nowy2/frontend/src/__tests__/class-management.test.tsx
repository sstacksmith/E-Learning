import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassesPage from '@/app/homelogin/teacher/classes/page';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
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

describe('Class Management Tests', () => {
  const mockTeacher = {
    uid: 'teacher-uid',
    email: 'teacher@example.com',
    role: 'teacher',
    displayName: 'Test Teacher',
  };

  const mockClasses = [
    {
      id: 'class-1',
      name: '3A',
      description: 'Klasa matematyczna',
      grade_level: 3,
      subject: 'Matematyka',
      students: ['student-1', 'student-2'],
      max_students: 30,
      academic_year: '2024/2025',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      assignedCourses: ['course-1'],
      schedule: [
        {
          day: 'Poniedziałek',
          time: '08:00',
          room: 'Sala 101'
        }
      ]
    },
    {
      id: 'class-2',
      name: '2B',
      description: 'Klasa językowa',
      grade_level: 2,
      subject: 'Język polski',
      students: ['student-3'],
      max_students: 25,
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
    },
    {
      id: 'student-2',
      name: 'Anna Nowak',
      email: 'anna.nowak@example.com',
      classId: 'class-1',
      role: 'student'
    },
    {
      id: 'student-3',
      name: 'Piotr Wiśniewski',
      email: 'piotr.wisniewski@example.com',
      classId: 'class-2',
      role: 'student'
    },
    {
      id: 'student-4',
      name: 'Maria Dąbrowska',
      email: 'maria.dabrowska@example.com',
      role: 'student'
    }
  ];

  const mockCourses = [
    {
      id: 'course-1',
      title: 'Matematyka podstawowa',
      subject: 'Matematyka',
      description: 'Podstawy matematyki',
      created_by: 'teacher@example.com',
      assignedUsers: ['student-1', 'student-2']
    },
    {
      id: 'course-2',
      title: 'Język polski',
      subject: 'Język polski',
      description: 'Gramatyka i literatura',
      created_by: 'teacher@example.com',
      assignedUsers: ['student-3']
    }
  ];

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockTeacher,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    });

    // Mock successful API responses
    (getDocs as jest.Mock).mockImplementation((collectionRef) => {
      const collectionName = collectionRef.id || 'classes';
      
      if (collectionName === 'classes') {
        return Promise.resolve({
          docs: mockClasses.map(cls => ({
            id: cls.id,
            data: () => cls
          }))
        });
      }
      
      if (collectionName === 'users') {
        return Promise.resolve({
          docs: mockStudents.map(student => ({
            id: student.id,
            data: () => student
          }))
        });
      }
      
      if (collectionName === 'courses') {
        return Promise.resolve({
          docs: mockCourses.map(course => ({
            id: course.id,
            data: () => course
          }))
        });
      }
      
      return Promise.resolve({ docs: [] });
    });

    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-class-id' });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    (collection as jest.Mock).mockReturnValue({ id: 'classes' });
    (doc as jest.Mock).mockReturnValue({ id: 'class-1' });
    (query as jest.Mock).mockReturnValue({});
    (where as jest.Mock).mockReturnValue({});
    (arrayUnion as jest.Mock).mockReturnValue([]);
    (arrayRemove as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Class Display and Loading', () => {
    test('should display classes list correctly', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('3A')).toBeInTheDocument();
        expect(screen.getByText('2B')).toBeInTheDocument();
        expect(screen.getByText('Klasa matematyczna')).toBeInTheDocument();
        expect(screen.getByText('Klasa językowa')).toBeInTheDocument();
      });
    });

    test('should display class statistics', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 classes
        expect(screen.getByText('Obecnych klas')).toBeInTheDocument();
        expect(screen.getByText('Przypisanych uczniów')).toBeInTheDocument();
        expect(screen.getByText('Przedmiotów')).toBeInTheDocument();
      });
    });

    test('should display class details correctly', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Check if class details are displayed
        expect(screen.getByText('Matematyka')).toBeInTheDocument();
        expect(screen.getByText('Język polski')).toBeInTheDocument();
        expect(screen.getByText('2024/2025')).toBeInTheDocument();
      });
    });
  });

  describe('Class Creation', () => {
    test('should open create class modal', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      expect(screen.getByText('Utwórz Nową Klasę')).toBeInTheDocument();
    });

    test('should validate required fields', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Try to create class without filling required fields
      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Wypełnij wszystkie wymagane pola.')).toBeInTheDocument();
      });
    });

    test('should create class with valid data', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Fill required fields
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '1A' } }); // Name
      fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '2' } }); // Grade level

      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(addDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: '1A',
            grade_level: 2,
            students: [],
            is_active: true,
            assignedCourses: []
          })
        );
      });
    });

    test('should limit grade levels to 1-4', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      const gradeSelect = screen.getByDisplayValue('1');
      const options = Array.from(gradeSelect.querySelectorAll('option')).map(option => option.textContent);
      
      expect(options).toEqual(['Wybierz poziom', 'Klasa 1', 'Klasa 2', 'Klasa 3', 'Klasa 4']);
      expect(options).not.toContain('Klasa 5');
      expect(options).not.toContain('Liceum 1');
    });
  });

  describe('Schedule Management', () => {
    test('should add schedule slot', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Add schedule slot
      const addScheduleButton = screen.getByText('Dodaj zajęcia');
      fireEvent.click(addScheduleButton);

      await waitFor(() => {
        expect(screen.getByText('Dzień tygodnia')).toBeInTheDocument();
        expect(screen.getByText('Godzina')).toBeInTheDocument();
        expect(screen.getByText('Sala/Przedmiot')).toBeInTheDocument();
      });
    });

    test('should remove schedule slot', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Add schedule slot
      const addScheduleButton = screen.getByText('Dodaj zajęcia');
      fireEvent.click(addScheduleButton);

      await waitFor(() => {
        const trashButton = screen.getByTitle('Usuń zajęcia');
        fireEvent.click(trashButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Dzień tygodnia')).not.toBeInTheDocument();
      });
    });

    test('should display empty schedule placeholder', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Brak zaplanowanych zajęć')).toBeInTheDocument();
        expect(screen.getByText('Dodaj zajęcia, aby stworzyć plan dla tej klasy')).toBeInTheDocument();
      });
    });
  });

  describe('Student Assignment', () => {
    test('should assign student to class', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Find and click on first class to open management modal
        const classCard = screen.getByText('3A').closest('.border');
        const manageButton = classCard?.querySelector('[title="Zarządzaj uczniami"]');
        if (manageButton) {
          fireEvent.click(manageButton);
        }
      });

      await waitFor(() => {
        // Add student to class
        const emailInput = screen.getByPlaceholderText('Wprowadź email ucznia');
        fireEvent.change(emailInput, { target: { value: 'maria.dabrowska@example.com' } });
        
        const addButton = screen.getByText('Dodaj do klasy');
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            students: expect.anything()
          })
        );
      });
    });

    test('should remove student from class', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Find and click on first class to open management modal
        const classCard = screen.getByText('3A').closest('.border');
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
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            students: expect.anything()
          })
        );
      });
    });
  });

  describe('Course Assignment', () => {
    test('should assign course to class', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        // Find and click on first class to open course assignment modal
        const classCard = screen.getByText('3A').closest('.border');
        const assignButton = classCard?.querySelector('[title="Przypisz kurs"]');
        if (assignButton) {
          fireEvent.click(assignButton);
        }
      });

      await waitFor(() => {
        // Select course and assign
        const courseSelect = screen.getByDisplayValue('');
        fireEvent.change(courseSelect, { target: { value: 'course-2' } });
        
        const assignButton = screen.getByText('Przypisz kurs');
        fireEvent.click(assignButton);
      });

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            assignedCourses: expect.anything()
          })
        );
      });
    });
  });

  describe('Search and Filtering', () => {
    test('should filter classes by search term', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Szukaj klas...');
        fireEvent.change(searchInput, { target: { value: '3A' } });
      });

      await waitFor(() => {
        expect(screen.getByText('3A')).toBeInTheDocument();
        expect(screen.queryByText('2B')).not.toBeInTheDocument();
      });
    });

    test('should display no results message when no classes match', async () => {
      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Szukaj klas...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Nie znaleziono klas')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      (getDocs as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Wystąpił błąd podczas ładowania klas.')).toBeInTheDocument();
      });
    });

    test('should handle class creation errors', async () => {
      (addDoc as jest.Mock).mockRejectedValueOnce(new Error('Creation failed'));

      await act(async () => {
        render(<ClassesPage />);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Utwórz Klasę');
        fireEvent.click(createButton);
      });

      // Fill required fields
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '1A' } });
      fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '2' } });

      const submitButton = screen.getByText('Utwórz Klasę');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Wystąpił błąd podczas tworzenia klasy.')).toBeInTheDocument();
      });
    });
  });
});
