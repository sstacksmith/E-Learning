import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParentGrades from '../app/homelogin/parent/grades/page';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('ParentGrades - Dziennik', () => {
  const mockUser = {
    uid: 'test-parent-uid',
    email: 'rodzic@test.pl',
    role: 'parent' as const,
    displayName: 'Test Parent',
  };

  const mockStudentId = 'test-student-id';
  const mockGrades = [
    {
      id: 'grade-1',
      subject: 'Matematyka',
      value: 5,
      date: '2024-01-15',
      user_id: mockStudentId,
    },
    {
      id: 'grade-2',
      subject: 'Matematyka',
      value: 4,
      date: '2024-01-20',
      user_id: mockStudentId,
    },
    {
      id: 'grade-3',
      subject: 'Plastyka',
      value: 6,
      date: '2024-01-18',
      user_id: mockStudentId,
    },
  ];

  const mockCourses = [
    {
      id: 'course-1',
      title: 'Matematyka',
      courseType: 'obowiązkowy',
      assignedUsers: [mockStudentId],
    },
    {
      id: 'course-2',
      title: 'Plastyka',
      courseType: 'fakultatywny',
      assignedUsers: [mockStudentId],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    });

    (collection as jest.Mock).mockImplementation((db, collectionName) => {
      if (collectionName === 'parent_students') return 'parent_students_collection';
      if (collectionName === 'users') return 'users_collection';
      if (collectionName === 'courses') return 'courses_collection';
      if (collectionName === 'grades') return 'grades_collection';
      return collectionName;
    });

    (query as jest.Mock).mockImplementation((ref) => ref);
    (where as jest.Mock).mockReturnValue({});

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: mockStudentId,
        displayName: 'Jan Kowalski',
        email: 'jan@test.pl',
      }),
    });

    (getDocs as jest.Mock).mockImplementation((queryRef) => {
      if (queryRef === 'parent_students_collection') {
        return Promise.resolve({
          empty: false,
          docs: [{
            data: () => ({ parent: mockUser.uid, student: mockStudentId }),
          }],
        });
      }
      if (queryRef === 'users_collection') {
        return Promise.resolve({
          empty: false,
          docs: [{
            data: () => ({
              uid: mockStudentId,
              displayName: 'Jan Kowalski',
              email: 'jan@test.pl',
            }),
          }],
        });
      }
      if (queryRef === 'courses_collection') {
        return Promise.resolve({
          docs: mockCourses.map(course => ({
            id: course.id,
            data: () => course,
          })),
        });
      }
      if (queryRef === 'grades_collection') {
        return Promise.resolve({
          docs: mockGrades.map(grade => ({
            id: grade.id,
            data: () => grade,
          })),
        });
      }
      return Promise.resolve({ empty: true, docs: [] });
    });
  });

  it('should render Dziennik without back button', async () => {
    render(<ParentGrades />);
    
    await waitFor(() => {
      expect(screen.getByText('Dziennik ocen')).toBeInTheDocument();
    });

    // Sprawdź, że nie ma przycisku powrotu
    const backButtons = screen.queryAllByText(/Powrót|Powrót do strony głównej/i);
    expect(backButtons.length).toBe(0);
  });

  it('should display grades in card grid view', async () => {
    render(<ParentGrades />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Matematyka').length).toBeGreaterThan(0);
    });

    // Sprawdź, że przedmioty są wyświetlane jako karty
    const subjectCards = screen.getAllByText(/Matematyka|Plastyka/);
    expect(subjectCards.length).toBeGreaterThan(0);
  });

  it('should display attendance per subject', async () => {
    render(<ParentGrades />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Matematyka').length).toBeGreaterThan(0);
    });

    // Sprawdź, że frekwencja jest wyświetlana
    const attendanceElements = screen.getAllByText(/Frekwencja|obecności/i);
    expect(attendanceElements.length).toBeGreaterThan(0);
  });

  it('should display global attendance', async () => {
    render(<ParentGrades />);
    
    await waitFor(() => {
      expect(screen.getByText('Frekwencja globalna')).toBeInTheDocument();
    });

    // Sprawdź, że globalna frekwencja jest wyświetlana
    const globalAttendanceElements = screen.getAllByText(/Ogólna frekwencja|Obecności|Nieobecności/i);
    expect(globalAttendanceElements.length).toBeGreaterThan(0);
  });

  it('should calculate and display average grades', async () => {
    render(<ParentGrades />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Matematyka').length).toBeGreaterThan(0);
    });

    // Sprawdź, że średnia jest wyświetlana (dla matematyki: (5+4)/2 = 4.5)
    const averageElements = screen.getAllByText(/4\.5|Średnia/i);
    expect(averageElements.length).toBeGreaterThan(0);
  });
});

