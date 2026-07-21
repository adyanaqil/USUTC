import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase credentials loaded from Vite environment variables (VITE_*)
// If you are deploying, set these environment variables in your Vercel/Netlify dashboard.
// For local testing, you can place them in a `.env` file at the root of the project.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Auto-detect if valid credentials have been configured
export const isFirebaseConfigured = 
  !!firebaseConfig.projectId && 
  firebaseConfig.projectId !== "YOUR_PROJECT_ID" && 
  !firebaseConfig.projectId.startsWith("<");

// Initialize app only if configuration is present
const app = isFirebaseConfigured && getApps().length === 0 ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
