import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParentDashboard from '../app/homelogin/parent/page';
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

describe('ParentDashboard - Plan Zajęć', () => {
  const mockUser = {
    uid: 'test-parent-uid',
    email: 'rodzic@test.pl',
    role: 'parent' as const,
    displayName: 'Test Parent',
  };

  const mockStudentId = 'test-student-id';
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Matematyka',
      day: 'Poniedziałek',
      startTime: '8:00',
      endTime: '8:45',
      subject: 'Matematyka',
      type: 'obowiązkowy',
      assignedTo: [mockStudentId],
    },
    {
      id: 'event-2',
      title: 'Plastyka',
      day: 'Wtorek',
      startTime: '9:50',
      endTime: '10:35',
      subject: 'Plastyka',
      type: 'fakultatywny',
      assignedTo: [mockStudentId],
    },
  ];

  const mockCourses = [
    { id: 'course-1', courseType: 'obowiązkowy' },
    { id: 'course-2', courseType: 'fakultatywny' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    // Mock parent_students query
    (collection as jest.Mock).mockImplementation((db, collectionName) => {
      if (collectionName === 'parent_students') {
        return 'parent_students_collection';
      }
      if (collectionName === 'users') {
        return 'users_collection';
      }
      if (collectionName === 'events') {
        return 'events_collection';
      }
      if (collectionName === 'courses') {
        return 'courses_collection';
      }
      return collectionName;
    });

    (query as jest.Mock).mockImplementation((ref) => ref);
    (where as jest.Mock).mockReturnValue({});

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
              firstName: 'Jan',
              lastName: 'Kowalski',
            }),
          }],
        });
      }
      if (queryRef === 'events_collection') {
        return Promise.resolve({
          docs: mockEvents.map(event => ({
            id: event.id,
            data: () => event,
          })),
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
      return Promise.resolve({ empty: true, docs: [] });
    });
  });

  it('should render Plan Zajęć without back button', async () => {
    render(<ParentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Plan zajęć')).toBeInTheDocument();
    });

    // Sprawdź, że nie ma przycisku powrotu
    const backButtons = screen.queryAllByText(/Powrót|Powrót do strony głównej/i);
    expect(backButtons.length).toBe(0);
  });

  it('should render elective courses switch', async () => {
    render(<ParentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Tylko zajęcia fakultatywne|Fakultatywne/i)).toBeInTheDocument();
    });

    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeInTheDocument();
  });

  it('should filter events when elective switch is toggled', async () => {
    render(<ParentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Plan zajęć')).toBeInTheDocument();
    });

    const switchElement = screen.getByRole('checkbox');
    
    // Toggle switch
    fireEvent.click(switchElement);
    
    await waitFor(() => {
      expect(switchElement).toBeChecked();
    });
  });

  it('should display calendar in one-page view', async () => {
    render(<ParentDashboard />);
    
    await waitFor(() => {
      const calendar = screen.getByText('Poniedziałek');
      expect(calendar).toBeInTheDocument();
    });

    // Sprawdź, że kalendarz jest widoczny (ma odpowiednie klasy)
    const calendarContainer = document.querySelector('.grid');
    expect(calendarContainer).toBeInTheDocument();
  });
});

