import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase credentials for USUTC project (usutc-eb76a)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAY161H0Wf3nlonOkn0UqQkP4AEM4A_ISU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "usutc-eb76a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "usutc-eb76a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "usutc-eb76a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "818781094823",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:818781094823:web:cd9f9206eb31828141ac82"
};

export const isFirebaseConfigured = true;

// Initialize app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
