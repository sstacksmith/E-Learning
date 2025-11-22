
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';
// import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyCdWWRYX8IaP5gnZyChY0RZsYXpbJrta58",
  authDomain: "cogito-8443e.firebaseapp.com",
  databaseURL: "https://cogito-8443e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cogito-8443e",
  // Firebase JS SDK expects the bucket in appspot.com domain
  storageBucket: "cogito-8443e.appspot.com",
  messagingSenderId: "521032313093",
  appId: "1:521032313093:web:1a41027325856c453bef6c",
  measurementId: "G-ZM1TL5JYZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ustaw persistence na sessionStorage (sesja wygasa po zamknięciu przeglądarki)
// To zapobiega automatycznemu logowaniu po zamknięciu i ponownym otwarciu przeglądarki
// Aby używać localStorage (sesja utrzymuje się po zamknięciu), zakomentuj poniższy blok:
// import { browserLocalPersistence } from 'firebase/auth';
// i zmień browserSessionPersistence na browserLocalPersistence
if (typeof window !== 'undefined') {
  setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize providers with domain restriction
export const googleProvider = new GoogleAuthProvider();
// Ogranicz do domeny cogitowroclaw.pl
googleProvider.setCustomParameters({
  hd: 'cogitowroclaw.pl', // Hosted domain - ogranicza do tej domeny
  prompt: 'select_account' // Zawsze pokazuj wybór konta
});

export const microsoftProvider = new OAuthProvider('microsoft.com');
// Microsoft nie wspiera hd parameter, więc walidacja jest po stronie aplikacji
microsoftProvider.setCustomParameters({
  prompt: 'select_account',
  tenant: 'common' // Możesz zmienić na konkretny tenant ID jeśli masz
});

// Initialize Analytics only on client side
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}
export { analytics };

export default app; 