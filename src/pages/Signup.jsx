// src/pages/Signup.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useAuth } from "../auth/AuthContext";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const nav = useNavigate();
  const { refreshUser } = useAuth();

  const onSignup = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const displayName = name.trim() || email.split("@")[0];

      // firebase 표시명
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      await refreshUser();
      nav("/calendar", { replace: true });
    } catch (e2) {
      setMsg(e2?.message || "회원가입 실패");
    }
  };

  return (
    <div className="page-root">
      <div className="form-card">
        <h2 className="form-title">회원가입</h2>

        <form onSubmit={onSignup}>
          <div className="form-row">
            <label className="form-label">이름(표시명)</label>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="form-row">
            <label className="form-label">이메일</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="form-row">
            <label className="form-label">비밀번호</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {msg && <p className="form-msg error">{msg}</p>}

          <div className="btn-row">
            <button className="btn btn-primary btn-block" type="submit">
              가입
            </button>
          </div>
        </form>

        <div className="form-helper">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
