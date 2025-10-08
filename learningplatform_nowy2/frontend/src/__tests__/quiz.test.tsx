import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuizPage from '../app/courses/[slug]/quiz/[id]/page';
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
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => '2024-01-01T00:00:00.000Z'),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({
    slug: 'test-course',
    id: 'test-quiz',
  }),
}));

describe('QuizPage', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockQuiz = {
    id: 'test-quiz',
    title: 'Test Quiz',
    description: 'Test Description',
    course_id: 'test-course-id',
    subject: 'Test Subject',
    questions: [
      {
        id: 'q1',
        question: 'What is 2+2?',
        type: 'multiple_choice',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
      },
      {
        id: 'q2',
        question: 'What is the capital of Poland?',
        type: 'open',
        correctAnswer: 'Warsaw',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<QuizPage />);
    
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
  });

  it('should render no user message when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<QuizPage />);
    
    expect(screen.getByText('Musisz być zalogowany, aby wziąć udział w quizie.')).toBeInTheDocument();
  });

  it('should render quiz when user is authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { getDoc, getDocs } = require('firebase/firestore');
    
    // Mock quiz document
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockQuiz,
    });

    // Mock course document
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            id: 'test-course-id',
            title: 'Test Course',
            created_by: 'teacher-id',
            teacherEmail: 'teacher@example.com',
          }),
        },
      ],
    });

    render(<QuizPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Quiz')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('should handle quiz submission and grade calculation', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { getDoc, getDocs, addDoc } = require('firebase/firestore');
    
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockQuiz,
    });

    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            id: 'test-course-id',
            title: 'Test Course',
            created_by: 'teacher-id',
            teacherEmail: 'teacher@example.com',
          }),
        },
      ],
    });

    addDoc.mockResolvedValue({ id: 'test-attempt-id' });

    render(<QuizPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Quiz')).toBeInTheDocument();
    });

    // Answer the first question
    const correctOption = screen.getByText('4');
    fireEvent.click(correctOption);

    // Answer the second question
    const openAnswerInput = screen.getByPlaceholderText('Wpisz swoją odpowiedź...');
    fireEvent.change(openAnswerInput, { target: { value: 'Warsaw' } });

    // Submit the quiz
    const submitButton = screen.getByText('Zakończ quiz');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
    });
  });

  it('should show quiz results after submission', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { getDoc, getDocs, addDoc } = require('firebase/firestore');
    
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockQuiz,
    });

    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            id: 'test-course-id',
            title: 'Test Course',
            created_by: 'teacher-id',
            teacherEmail: 'teacher@example.com',
          }),
        },
      ],
    });

    addDoc.mockResolvedValue({ id: 'test-attempt-id' });

    render(<QuizPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Quiz')).toBeInTheDocument();
    });

    // Answer questions correctly
    const correctOption = screen.getByText('4');
    fireEvent.click(correctOption);

    const openAnswerInput = screen.getByPlaceholderText('Wpisz swoją odpowiedź...');
    fireEvent.change(openAnswerInput, { target: { value: 'Warsaw' } });

    // Submit the quiz
    const submitButton = screen.getByText('Zakończ quiz');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Quiz zakończony!')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // Perfect score
    });
  });

  it('should handle navigation between questions', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { getDoc, getDocs } = require('firebase/firestore');
    
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockQuiz,
    });

    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            id: 'test-course-id',
            title: 'Test Course',
            created_by: 'teacher-id',
            teacherEmail: 'teacher@example.com',
          }),
        },
      ],
    });

    render(<QuizPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Quiz')).toBeInTheDocument();
    });

    // Check if first question is displayed
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();

    // Navigate to next question
    const nextButton = screen.getByText('Następne pytanie');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('What is the capital of Poland?')).toBeInTheDocument();
    });

    // Navigate back
    const prevButton = screen.getByText('Poprzednie pytanie');
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });
  });
});
