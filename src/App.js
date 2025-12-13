// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import CalendarPage from "./pages/CalendarPage";
import EventsManage from "./pages/EventsManage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthProvider, { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import DeptSchedule from "./pages/DeptSchedule";
import TimetablePage from "./pages/TimetablePage";

// 상단 네비게이션 바
function NavBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const linkStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: "var(--text-color)",
    background: "var(--nav-button-bg)",
    marginRight: 8,
  };

  return (
    <nav
      style={{
        maxWidth: 1100,
        margin: "18px auto 0",
        display: "flex",
        gap: 8,
        alignItems: "center",
        color: "var(--text-color)",
      }}
    >
      {/* 상단 링크 */}
      <Link to="/calendar" style={linkStyle}>
        학사일정
      </Link>
      <Link to="/manage" style={linkStyle}>
        내 일정 관리
      </Link>
      <Link to="/dept" style={linkStyle}>
        학과 일정
      </Link>
      <Link to="/timetable" style={linkStyle}>
        시간표
      </Link>

      {/* 오른쪽 영역 */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* 다크/라이트 모드 스위치 */}
        <button
          onClick={toggleTheme}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "none",
            background: "var(--toggle-bg)",
            color: "var(--text-color)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {theme === "dark" ? "라이트 모드" : "다크 모드"}
        </button>

        {/* 로그인 영역 */}
        {user ? (
          <>
            <span style={{ marginRight: 4 }}>{user.displayName}</span>
            <button
              onClick={logout}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                background: "var(--nav-button-bg)",
                color: "var(--text-color)",
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                ...linkStyle,
                background: "var(--nav-button-secondary-bg)",
              }}
            >
              로그인
            </Link>
            <Link
              to="/signup"
              style={{
                ...linkStyle,
                background: "var(--nav-button-secondary-bg)",
              }}
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            {/* 보호 구간: 로그인 필요 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/manage" element={<EventsManage />} />
              <Route path="/dept" element={<DeptSchedule />} />
              <Route path="/timetable" element={<TimetablePage />} />
            </Route>
            {/* 공개 구간 */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="*"
              element={
                <div
                  style={{
                    maxWidth: 1100,
                    margin: "40px auto",
                    color: "var(--text-color)",
                  }}
                >
                  404 Not Found
                </div>
              }
            />
            <Route element={<ProtectedRoute />}>
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/manage" element={<EventsManage />} />
              <Route path="/dept" element={<DeptSchedule />} />
              <Route path="/timetable" element={<TimetablePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
