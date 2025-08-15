import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({ id: 'test-course-id' }),
  usePathname: () => '/test-path',
}))

// Mock Firebase functions globally
global.__firebaseMocks = {
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
}

jest.mock('firebase/firestore', () => global.__firebaseMocks)

// Mock auth context
const mockUser = {
  uid: 'test-parent-uid',
  email: 'rodzic@rodzic.pl',
  role: 'parent',
  displayName: 'Test Parent',
}

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}