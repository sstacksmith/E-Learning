import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParentMessagesPage from '../app/homelogin/parent/messages/page';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where, getDoc, addDoc } from 'firebase/firestore';

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
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('ParentMessagesPage - Wiadomości', () => {
  const mockUser = {
    uid: 'test-parent-uid',
    email: 'rodzic@test.pl',
    role: 'parent' as const,
    displayName: 'Test Parent',
  };

  const mockStudentId = 'test-student-id';

  const mockMessages = [
    {
      id: 'msg-1',
      from: mockUser.uid,
      to: 'contact-1',
      content: 'Witam, chciałbym zapytać o postępy mojego dziecka.',
      timestamp: { toDate: () => new Date('2024-01-15') },
      read: false,
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
      if (collectionName === 'classes') return 'classes_collection';
      if (collectionName === 'messages') return 'messages_collection';
      return collectionName;
    });

    (query as jest.Mock).mockImplementation((ref) => {
      // Sprawdź czy to query dla messages
      if (ref === 'messages_collection') {
        return 'messages_query';
      }
      return ref;
    });

    (where as jest.Mock).mockReturnValue({});

    (getDoc as jest.Mock).mockImplementation((docRef) => {
      if (docRef.toString().includes('test-student-id')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            uid: mockStudentId,
            displayName: 'Jan Kowalski',
            email: 'jan@test.pl',
            classes: ['class-1'],
          }),
        });
      }
      if (docRef.toString().includes('class-1')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            id: 'class-1',
            teacher_id: 'contact-1',
          }),
        });
      }
      if (docRef.toString().includes('contact-1')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            uid: 'contact-1',
            displayName: 'Jan Wychowawca',
            email: 'wychowawca@test.pl',
            role: 'teacher',
          }),
        });
      }
      return Promise.resolve({ exists: () => false });
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
          docs: [
            {
              id: 'contact-1',
              data: () => ({
                uid: 'contact-1',
                displayName: 'Jan Wychowawca',
                email: 'wychowawca@test.pl',
                role: 'teacher',
              }),
            },
            {
              id: 'contact-2',
              data: () => ({
                uid: 'contact-2',
                displayName: 'Sekretariat',
                email: 'sekretariat@test.pl',
                role: 'admin',
              }),
            },
          ],
        });
      }
      if (queryRef === 'classes_collection') {
        return Promise.resolve({
          docs: [{
            id: 'class-1',
            data: () => ({
              id: 'class-1',
              teacher_id: 'contact-1',
            }),
          }],
        });
      }
      if (queryRef === 'messages_query') {
        return Promise.resolve({
          docs: mockMessages.map(msg => ({
            id: msg.id,
            data: () => msg,
          })),
        });
      }
      return Promise.resolve({ empty: true, docs: [] });
    });

    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-msg-id' });
  });

  it('should render Wiadomości page', async () => {
    render(<ParentMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Wiadomości')).toBeInTheDocument();
    });
  });

  it('should display contacts list', async () => {
    render(<ParentMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Kontakty')).toBeInTheDocument();
    });

    // Sprawdź, że kontakty są wyświetlane
    await waitFor(() => {
      expect(screen.getByText(/Wychowawca|Sekretariat/i)).toBeInTheDocument();
    });
  });

  it('should allow selecting a contact', async () => {
    render(<ParentMessagesPage />);
    
    await waitFor(() => {
      const contactButton = screen.getByText(/Wychowawca|Jan Wychowawca/i);
      expect(contactButton).toBeInTheDocument();
    });

    const contactButton = screen.getByText(/Jan Wychowawca|Wychowawca/i);
    fireEvent.click(contactButton);

    await waitFor(() => {
      expect(screen.getByText('Jan Wychowawca')).toBeInTheDocument();
    });
  });

  it('should display chat interface when contact is selected', async () => {
    render(<ParentMessagesPage />);
    
    await waitFor(() => {
      const contactButton = screen.getByText(/Jan Wychowawca|Wychowawca/i);
      fireEvent.click(contactButton);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Napisz wiadomość...')).toBeInTheDocument();
    });
  });

  it('should allow sending messages', async () => {
    render(<ParentMessagesPage />);
    
    await waitFor(() => {
      const contactButton = screen.getByText(/Jan Wychowawca|Wychowawca/i);
      fireEvent.click(contactButton);
    });

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText('Napisz wiadomość...');
      expect(messageInput).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText('Napisz wiadomość...');
    const sendButton = screen.getByRole('button', { name: /send/i }) || screen.getByText('Send');

    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    if (sendButton) {
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
    });
  });

  it('should display role labels correctly', async () => {
    render(<ParentMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Wychowawca|Sekretariat/i)).toBeInTheDocument();
    });
  });
});

