import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Returns true if Firebase credentials are properly set (not placeholder values).
 */
export function isFirebaseConfigured() {
  const key = firebaseConfig.apiKey;
  return key && key !== 'your_api_key_here' && key.length > 10;
}

let app = null;
let db = null;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('🔥 Firebase Firestore connected');
} else {
  console.log('📦 Running in demo mode (localStorage). Add Firebase credentials to .env for production.');
}

export { db };
export default app;
