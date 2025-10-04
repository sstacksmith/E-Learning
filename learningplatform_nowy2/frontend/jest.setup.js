import '@testing-library/jest-dom'

// Polyfill for fetch
global.fetch = jest.fn()

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

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  getAuth: jest.fn(),
}))

// Mock Firebase config
jest.mock('@/config/firebase', () => ({
  auth: {},
  db: {},
  analytics: {},
}))

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