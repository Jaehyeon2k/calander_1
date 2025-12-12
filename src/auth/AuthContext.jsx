import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function toUserView(u) {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(toUserView(u));
      setInit(false);
    });
    return () => unsub();
  }, []);

  const logout = () => signOut(auth);

  // ✅ 핵심: 프로필 갱신 후, Context user 상태를 강제로 업데이트
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser(toUserView(auth.currentUser));
  };

  return (
    <AuthCtx.Provider value={{ user, logout, refreshUser, loading: init }}>
      {children}
    </AuthCtx.Provider>
  );
}
