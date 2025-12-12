
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBUQbgTKknGiUwGD4tRetQjecU_sJgGEvY",
  authDomain: "loginauth-517ab.firebaseapp.com",
  projectId: "loginauth-517ab",
  storageBucket: "loginauth-517ab.firebasestorage.app",
  messagingSenderId: "110742253182",
  appId: "1:110742253182:web:3cb173ff83a78df291f22f",
  measurementId: "G-2T1YCH51M6"

};

for (const [k, v] of Object.entries(firebaseConfig)) {
    if (!v) throw new Error(`[ENV MISSING] ${k} is empty. Check .env.local and restart.`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
