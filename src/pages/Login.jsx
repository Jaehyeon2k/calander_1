// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const goAfter = () => {
    const to = loc.state?.from?.pathname || "/calendar";
    nav(to, { replace: true });
  };

  useEffect(() => {
    if (user) goAfter();
  }, [user]);

  const onLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      goAfter();
    } catch (e2) {
      setMsg(e2?.message || "로그인 실패");
    }
  };

  const onGoogle = async () => {
    setMsg("");
    try {
      await signInWithPopup(auth, googleProvider);
      goAfter();
    } catch (e2) {
      setMsg(e2?.message || "Google 로그인 실패");
    }
  };

  return (
    <div className="page-root">
      <div className="form-card">
        <h2 className="form-title">로그인</h2>

        <form onSubmit={onLogin}>
          <div className="form-row">
            <label className="form-label">이메일</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@naver.com"
            />
          </div>

          <div className="form-row">
            <label className="form-label">비밀번호</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {msg && <p className="form-msg error">{msg}</p>}

          <div className="btn-row">
            <button className="btn btn-primary btn-block" type="submit">
              이메일 로그인
            </button>
            <button className="btn btn-ghost btn-block" type="button" onClick={onGoogle}>
              Google로 로그인
            </button>
          </div>
        </form>

        <div className="form-helper">
          계정이 없나요? <Link to="/signup">회원가입</Link>
        </div>
      </div>
    </div>
  );
}
