import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParentCoursesContent from '../app/homelogin/parent/courses/page';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';

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

// Mock Providers
jest.mock('../components/Providers', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('ParentCoursesContent - Kursy Dziecka', () => {
  const mockUser = {
    uid: 'test-parent-uid',
    email: 'rodzic@test.pl',
    role: 'parent' as const,
    displayName: 'Test Parent',
  };

  const mockStudentId = 'test-student-id';
  const mockCourses = [
    {
      id: 'course-1',
      title: 'Matematyka',
      description: 'Kurs z matematyki',
      subject: 'Matematyka',
      year_of_study: 1,
      is_active: true,
      teacherEmail: 'nauczyciel@test.pl',
      assignedUsers: [mockStudentId],
      sections: [],
    },
    {
      id: 'course-2',
      title: 'Plastyka',
      description: 'Kurs z plastyki',
      subject: 'Plastyka',
      year_of_study: 1,
      is_active: true,
      teacherEmail: 'nauczyciel2@test.pl',
      assignedUsers: [mockStudentId],
      sections: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (collection as jest.Mock).mockImplementation((db, collectionName) => {
      if (collectionName === 'parent_students') return 'parent_students_collection';
      if (collectionName === 'users') return 'users_collection';
      if (collectionName === 'courses') return 'courses_collection';
      if (collectionName === 'modules') return 'modules_collection';
      if (collectionName === 'lessons') return 'lessons_collection';
      if (collectionName === 'progress') return 'progress_collection';
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
        classes: [],
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
      if (queryRef === 'modules_collection' || queryRef === 'lessons_collection' || queryRef === 'progress_collection') {
        return Promise.resolve({ empty: true, docs: [] });
      }
      return Promise.resolve({ empty: true, docs: [] });
    });
  });

  it('should render Kursy Dziecka without back button', async () => {
    render(<ParentCoursesContent />);
    
    await waitFor(() => {
      expect(screen.getByText('Kursy Dziecka')).toBeInTheDocument();
    });

    // Sprawdź, że nie ma przycisku powrotu
    const backButtons = screen.queryAllByText(/Powrót|Powrót do strony głównej/i);
    expect(backButtons.length).toBe(0);
  });

  it('should display courses in grid view', async () => {
    render(<ParentCoursesContent />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Matematyka').length).toBeGreaterThan(0);
    });

    // Sprawdź, że kursy są wyświetlane w gridzie
    const courseCards = screen.getAllByText(/Matematyka|Plastyka/);
    expect(courseCards.length).toBeGreaterThan(0);
  });

  it('should display course details in cards', async () => {
    render(<ParentCoursesContent />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Matematyka').length).toBeGreaterThan(0);
    });

    // Sprawdź, że karty zawierają podstawowe informacje
    expect(screen.getByText('Kurs z matematyki')).toBeInTheDocument();
  });

  it('should have search and filter functionality', async () => {
    render(<ParentCoursesContent />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Wyszukaj kursy...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Wyszukaj kursy...');
    expect(searchInput).toBeInTheDocument();
  });
});

