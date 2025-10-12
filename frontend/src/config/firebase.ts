import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyBPR5Pc66pmuWcgR7rtXAx0EEMG74wQb40",
  authDomain: "triguard-6141b.firebaseapp.com",
  databaseURL: "https://triguard-6141b-default-rtdb.firebaseio.com/",
  projectId: "triguard-6141b",
  storageBucket: "triguard-6141b.firebasestorage.app",
  messagingSenderId: "239370858429",
  appId: "1:239370858429:web:30004d4c9ab2012a8e6cd4",
  measurementId: "G-TYG2PK20CW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;