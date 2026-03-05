import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRz8cK_FP_wQuEAMmouF7SAJW6HX9QUcw",
  authDomain: "vidacontrol-d10c3.firebaseapp.com",
  projectId: "vidacontrol-d10c3",
  storageBucket: "vidacontrol-d10c3.firebasestorage.app",
  messagingSenderId: "655205541155",
  appId: "1:655205541155:web:6a0c238bae87f2fb5e1896"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
