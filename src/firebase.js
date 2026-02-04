import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8Gq5MU3O6b6jNRn7eulGrH2BEUam3Mxc",
  authDomain: "pedidos-2841c.firebaseapp.com",
  projectId: "pedidos-2841c",
  storageBucket: "pedidos-2841c.firebasestorage.app",
  messagingSenderId: "110203883424",
  appId: "1:110203883424:web:7a43d86af830a9d0fd9ec5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
