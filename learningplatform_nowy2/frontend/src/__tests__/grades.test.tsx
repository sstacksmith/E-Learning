import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GradesPageContent } from '../app/homelogin/student/grades/page';
import { useAuth } from '../context/AuthContext';

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

describe('GradesPageContent', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<GradesPageContent />);
    
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
  });

  it('should render no user message when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<GradesPageContent />);
    
    expect(screen.getByText('Musisz być zalogowany, aby zobaczyć oceny.')).toBeInTheDocument();
  });

  it('should render grades when user is authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    // Mock Firestore responses
    const { getDocs, getDoc } = require('firebase/firestore');
    
    // Mock user document
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Test User' }),
    });

    // Mock grades collection
    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'grade-1',
          data: () => ({
            user_id: 'test-user-id',
            course_id: 'course-1',
            value: 5,
            comment: 'Test comment',
            graded_by: 'teacher-1',
            graded_at: '2024-01-01T00:00:00.000Z',
            quiz_id: 'quiz-1',
            quiz_title: 'Test Quiz',
            subject: 'Test Subject',
            grade_type: 'Quiz',
          }),
        },
      ],
    });

    render(<GradesPageContent />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test Subject')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should group grades by subject', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { getDocs, getDoc } = require('firebase/firestore');
    
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Test User' }),
    });

    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'grade-1',
          data: () => ({
            user_id: 'test-user-id',
            course_id: 'course-1',
            value: 5,
            subject: 'Matematyka',
            graded_at: '2024-01-01T00:00:00.000Z',
          }),
        },
        {
          id: 'grade-2',
          data: () => ({
            user_id: 'test-user-id',
            course_id: 'course-2',
            value: 4,
            subject: 'Matematyka',
            graded_at: '2024-01-02T00:00:00.000Z',
          }),
        },
        {
          id: 'grade-3',
          data: () => ({
            user_id: 'test-user-id',
            course_id: 'course-3',
            value: 3,
            subject: 'Fizyka',
            graded_at: '2024-01-03T00:00:00.000Z',
          }),
        },
      ],
    });

    render(<GradesPageContent />);

    await waitFor(() => {
      expect(screen.getByText('Matematyka')).toBeInTheDocument();
      expect(screen.getByText('Fizyka')).toBeInTheDocument();
      expect(screen.getByText('4.50')).toBeInTheDocument(); // Average for Matematyka
      expect(screen.getByText('3.00')).toBeInTheDocument(); // Average for Fizyka
    });
  });

  it('should show refresh button and handle refresh', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { getDocs, getDoc } = require('firebase/firestore');
    
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Test User' }),
    });

    getDocs.mockResolvedValue({
      docs: [],
    });

    render(<GradesPageContent />);

    await waitFor(() => {
      expect(screen.getByText('Odśwież')).toBeInTheDocument();
    });

    // Test refresh functionality
    const refreshButton = screen.getByText('Odśwież');
    refreshButton.click();

    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });
});
