import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAjGdV7fKh8JV4vmfWZ2d6BBKj33OJP1sI",
  authDomain: "vihastory-ai.firebaseapp.com",
  projectId: "vihastory-ai",
  storageBucket: "vihastory-ai.firebasestorage.app",
  messagingSenderId: "948855791531",
  appId: "1:948855791531:web:bd57c149975b33623bfcee"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);