import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCdWWRYX8IaP5gnZyChY0RZsYXpbJrta58",
  authDomain: "cogito-8443e.firebaseapp.com",
  databaseURL: "https://cogito-8443e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cogito-8443e",
  storageBucket: "cogito-8443e.firebasestorage.app",
  messagingSenderId: "521032313093",
  appId: "1:521032313093:web:1a41027325856c453bef6c",
  measurementId: "G-ZM1TL5JYZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize providers
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Initialize Analytics only on client side
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}
export { analytics };

export default app; 