import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, } from "firebase/firestore";
import { getStorage, } from "firebase/storage";

/**
 * Firebase Configuration
 *
 * This object holds the configuration details required to initialize the Firebase app.
 * It reads the API keys and credentials from environment variables for security.
 *
 * @typedef {Object} FirebaseConfig
 * @property {string} apiKey - The API key for your Firebase project.
 * @property {string} authDomain - The authentication domain for your Firebase project.
 */
const firebaseConfig = {
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

/**
 * Initialize Firebase App
 *
 * Initializes the Firebase app with the provided configuration.
 * This is the entry point for interacting with Firebase services.
 */
const app = initializeApp(firebaseConfig);

/**
 * Initialize Firebase Authentication
 *
 * Initializes the Firebase Authentication service for user management.
 */
export const auth = getAuth(app);

/**
 * Initialize Firebase Analytics
 *
 * Initializes Firebase Analytics for tracking user behavior and app usage.
 */
export const analytics = getAnalytics(app);

/**
 * Initialize Firestore Database
 *
 * Initializes the Firestore database for storing and retrieving structured data.
 */
export const db = getFirestore(app);

/**
 * Initialize Firebase Storage
 * Initializes Firebase Storage for storing and retrieving files.
 */
export const storage = getStorage(app, process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);

export default app;
