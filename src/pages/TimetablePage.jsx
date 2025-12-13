// src/pages/TimetablePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";

/**
 * 요구사항 반영:
 * - 시간 선택: 1시간 단위 / 00분 고정 / 01~12 전체 표시 (오전/오후 + 12시간제)
 * - 그리드 줄 안맞는 문제: day column padding-top 제거 + block top 계산 보정
 * - 페이지 배경/헤더 배경 미묘한 차이 완화: 페이지 자체는 투명(부모 배경 사용), 카드가 기준
 *
 * ✅ 리팩토링:
 * - inline CSS 제거 → src/styles/timetable.css 로 분리 (index.css에서 로드)
 */

const DAYS = [
  { ko: "월", key: "Mon", date: "12/8" },
  { ko: "화", key: "Tue", date: "12/9" },
  { ko: "수", key: "Wed", date: "12/10" },
  { ko: "목", key: "Thu", date: "12/11" },
  { ko: "금", key: "Fri", date: "12/12" },
];

// 표시는 8~19로 유지(네 스샷 기준)
const START_HOUR_24 = 8;
const END_HOUR_24 = 19; // inclusive
const ROW_H = 56;

const pad2 = (n) => String(n).padStart(2, "0");

// 12시간 표시(01~12)
const HOUR_12 = Array.from({ length: 12 }, (_, i) => pad2(i + 1));
// 분은 00 고정만
const MIN_00 = ["00"]; // (요구사항상 00 고정, 유지용)

function toHour24(ampm, hh12) {
  const h = Number(hh12); // 1..12
  if (ampm === "오전") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function toLabelKoreanTime(hour24) {
  const ampm = hour24 < 12 ? "오전" : "오후";
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${ampm} ${pad2(h12)}:00`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function TimetablePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // === state ===
  const [term, setTerm] = useState("2025");
  const [timetableName, setTimetableName] = useState("시간표 없음");
  const [subjects, setSubjects] = useState([]); // {id, name, prof, room, day, startHour24, endHour24}
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    prof: "",
    room: "",
    day: "월",
    startAmpm: "오전",
    startHour: "09",
    startMin: "00",
    endAmpm: "오전",
    endHour: "10",
    endMin: "00",
  });

  // ===== localStorage =====
  const LS_KEY = useMemo(
    () => `yju_tt_${user?.uid || "guest"}_${term}`,
    [user?.uid, term]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.timetableName) setTimetableName(parsed.timetableName);
      if (Array.isArray(parsed?.subjects)) setSubjects(parsed.subjects);
    } catch {
      // ignore
    }
  }, [LS_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ timetableName, subjects }, null, 2)
      );
    } catch {
      // ignore
    }
  }, [LS_KEY, timetableName, subjects]);

  // ===== derived =====
  const hourRows = useMemo(() => {
    const arr = [];
    for (let h = START_HOUR_24; h <= END_HOUR_24; h++) arr.push(h);
    return arr;
  }, []);

  const dayToIndex = useMemo(() => {
    const m = new Map();
    DAYS.forEach((d, i) => m.set(d.ko, i));
    return m;
  }, []);

  const gridRef = useRef(null);

  // ===== actions =====
  const closeAll = () => {
    setShowAddModal(false);
    setShowManageModal(false);
  };

  const addSubject = () => {
    const name = form.name.trim();
    if (!name) return;

    const sh = toHour24(form.startAmpm, form.startHour);
    const eh = toHour24(form.endAmpm, form.endHour);

    let startHour24 = sh;
    let endHour24 = eh;

    // 같은 시각/역전 방지
    if (endHour24 <= startHour24) endHour24 = startHour24 + 1;

    // 표시 그리드 범위로 클램프
    startHour24 = clamp(startHour24, START_HOUR_24, END_HOUR_24);
    endHour24 = clamp(endHour24, START_HOUR_24 + 1, END_HOUR_24 + 1);

    const id = Date.now();

    setSubjects((prev) => [
      ...prev,
      {
        id,
        name,
        prof: form.prof.trim(),
        room: form.room.trim(),
        day: form.day,
        startHour24,
        endHour24,
      },
    ]);

    setForm((p) => ({
      ...p,
      name: "",
      prof: "",
      room: "",
    }));

    setShowAddModal(false);
  };

  const removeSubject = (id) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const resetAll = () => {
    setSubjects([]);
    setTimetableName("시간표 없음");
    setShowManageModal(false);
  };

  // ===== render helpers =====
  const blocksByDay = useMemo(() => {
    const map = Array.from({ length: DAYS.length }, () => []);
    for (const s of subjects) {
      const idx = dayToIndex.get(s.day);
      if (idx == null) continue;
      map[idx].push(s);
    }
    return map;
  }, [subjects, dayToIndex]);

  const calcBlockStyle = (s) => {
    const rowIndex = s.startHour24 - START_HOUR_24; // 0-based
    const top = rowIndex * ROW_H; // ✅ +10 제거(이미 padding-top 제거됨)
    const height = Math.max(1, (s.endHour24 - s.startHour24) * ROW_H);

    return { top, height };
  };

  return (
    <div className={`tt-page ${isDark ? "tt-dark" : ""}`}>
      <div className="tt-wrap">
        <div className="tt-title">시간표</div>

        <div className="tt-card">
          <div className="tt-card-head">
            <div className="tt-card-left">
              <div className="tt-card-title">주간 시간표</div>
              <div className="tt-pill">
                {timetableName} · {term}
              </div>
            </div>

            <div className="tt-actions">
              <button
                className="tt-iconbtn"
                onClick={() => setShowAddModal(true)}
                title="과목 추가"
              >
                +
              </button>
              <button
                className="tt-iconbtn"
                onClick={() => setShowManageModal(true)}
                title="설정/관리"
              >
                ⚙
              </button>
            </div>
          </div>

          <div className="tt-grid">
            {/* head */}
            <div className="tt-grid-head">
              <div className="tt-spacer" />
              <div className="tt-days-head">
                {DAYS.map((d) => (
                  <div key={d.key} className="tt-dayhead">
                    <div className="tt-day-key">{d.key}</div>
                    <div className="tt-day-date">{d.date}</div>
                    <div className="tt-day-ko">{d.ko}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* body */}
            <div className="tt-grid-body" ref={gridRef}>
              <div className="tt-time-col">
                {hourRows.map((h) => (
                  <div key={h} className="tt-time">
                    {h}
                  </div>
                ))}
              </div>

              <div className="tt-days">
                {DAYS.map((d, di) => (
                  <div key={d.key} className="tt-day-col">
                    {/* cells */}
                    {hourRows.map((h) => (
                      <div key={`${d.key}-${h}`} className="tt-cell" />
                    ))}

                    {/* blocks */}
                    {blocksByDay[di].map((s) => (
                      <div
                        key={s.id}
                        className="tt-block"
                        style={calcBlockStyle(s)}
                        title={`${s.name} (${toLabelKoreanTime(
                          s.startHour24
                        )} ~ ${toLabelKoreanTime(s.endHour24)})`}
                      >
                        <div className="tt-block-time">
                          {pad2(s.startHour24)}:00 - {pad2(s.endHour24)}:00
                        </div>
                        <div className="tt-block-name">{s.name}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 과목 추가 모달 ===== */}
      {showAddModal && (
        <div className="tt-backdrop" onMouseDown={closeAll}>
          <div className="tt-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="tt-modal-head">
              <div className="tt-modal-title">과목 추가</div>
              <button className="tt-x" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>

            <div className="tt-form">
              <input
                className="tt-input"
                placeholder="과목명"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <input
                className="tt-input"
                placeholder="교수명 (옵션)"
                value={form.prof}
                onChange={(e) =>
                  setForm((p) => ({ ...p, prof: e.target.value }))
                }
              />
              <input
                className="tt-input"
                placeholder="강의실 (옵션)"
                value={form.room}
                onChange={(e) =>
                  setForm((p) => ({ ...p, room: e.target.value }))
                }
              />

              <div className="tt-row3">
                <select
                  className="tt-select"
                  value={form.day}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, day: e.target.value }))
                  }
                >
                  <option>월</option>
                  <option>화</option>
                  <option>수</option>
                  <option>목</option>
                  <option>금</option>
                </select>

                {/* 시작시간 */}
                <div className="tt-timebox">
                  <select
                    className="tt-time-select tt-ampm"
                    value={form.startAmpm}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, startAmpm: e.target.value }))
                    }
                  >
                    <option>오전</option>
                    <option>오후</option>
                  </select>

                  <select
                    className="tt-time-select tt-hour"
                    value={form.startHour}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, startHour: e.target.value }))
                    }
                  >
                    {HOUR_12.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <span className="tt-fixed">:00</span>
                </div>

                {/* 종료시간 */}
                <div className="tt-timebox">
                  <select
                    className="tt-time-select tt-ampm"
                    value={form.endAmpm}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, endAmpm: e.target.value }))
                    }
                  >
                    <option>오전</option>
                    <option>오후</option>
                  </select>

                  <select
                    className="tt-time-select tt-hour"
                    value={form.endHour}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, endHour: e.target.value }))
                    }
                  >
                    {HOUR_12.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <span className="tt-fixed">:00</span>
                </div>
              </div>

              <div className="tt-actions2">
                <button className="tt-btn tt-primary" onClick={addSubject}>
                  과목 추가
                </button>
                <button
                  className="tt-btn"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      name: "",
                      prof: "",
                      room: "",
                      day: "월",
                      startAmpm: "오전",
                      startHour: "09",
                      endAmpm: "오전",
                      endHour: "10",
                    }))
                  }
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 과목 관리 모달 ===== */}
      {showManageModal && (
        <div className="tt-backdrop" onMouseDown={closeAll}>
          <div className="tt-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="tt-modal-head">
              <div className="tt-modal-title">과목 관리</div>
              <button className="tt-x" onClick={() => setShowManageModal(false)}>
                ×
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="tt-empty">등록된 과목이 없습니다.</div>
            ) : (
              <div className="tt-list">
                {subjects.map((s) => (
                  <div className="tt-item" key={s.id}>
                    <div>
                      <div className="tt-item-name">{s.name}</div>
                      <div className="tt-item-sub">
                        {s.day} · {pad2(s.startHour24)}:00 ~{" "}
                        {pad2(s.endHour24)}:00
                        {s.room ? ` · ${s.room}` : ""}
                      </div>
                    </div>
                    <button className="tt-del" onClick={() => removeSubject(s.id)}>
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="tt-form">
              <div className="tt-actions2">
                <button
                  className="tt-btn tt-primary"
                  onClick={() => setShowManageModal(false)}
                >
                  닫기
                </button>
                <button className="tt-btn" onClick={resetAll}>
                  전체 초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
