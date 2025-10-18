import * as firebase from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4s4c0SITIPAitWJrUaCl9JhAHpqzOkSU",
  authDomain: "ai-studio-chat-9068c.firebaseapp.com",
  projectId: "ai-studio-chat-9068c",
  storageBucket: "ai-studio-chat-9068c.firebasestorage.app",
  messagingSenderId: "920017576337",
  appId: "1:920017576337:web:1e54116fa99b4a464e7a30"
};

// Fix: Changed import to handle module resolution issues with `initializeApp`.
const app = firebase.initializeApp(firebaseConfig);
export const db = getFirestore(app);