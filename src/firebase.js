// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config (aapka project ka)
const firebaseConfig = {
  apiKey: "AIzaSyDka1qOel3sNq_Zb6_k9lIKx3fXwxtq9Ik",
  authDomain: "octa-task-7c2f2.firebaseapp.com",
  projectId: "octa-task-7c2f2",
  storageBucket: "octa-task-7c2f2.appspot.com",
  messagingSenderId: "856754740041",
  appId: "1:856754740041:web:7770f2aba371bd99981898",
  measurementId: "G-EC7KW4NRNK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Auth and Firestore init
export const auth = getAuth(app);
export const db = getFirestore(app);
