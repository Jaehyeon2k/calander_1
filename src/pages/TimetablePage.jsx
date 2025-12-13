// TimetablePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";

/**
 * 요구사항 반영:
 * - 시간 선택: 1시간 단위 / 00분 고정 / 01~12 전체 표시 (오전/오후 + 12시간제)
 * - 그리드 줄 안맞는 문제: day column padding-top 제거 + block top 계산 보정
 * - 페이지 배경/헤더 배경 미묘한 차이 완화: 페이지 자체는 투명(부모 배경 사용), 카드가 기준
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
const MIN_00 = ["00"];

// 12시간(오전/오후 + 01~12 + 00분) -> 24시간 정수
function toHour24(ampm, hh12) {
  const h = Number(hh12); // 1..12
  if (ampm === "오전") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

// 24시간 -> "오전 09:00" 같은 라벨
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

  // (이전버전 UI) 폼
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

  // ===== localStorage (간단 저장) =====
  const LS_KEY = useMemo(() => `yju_tt_${user?.uid || "guest"}_${term}`, [user?.uid, term]);

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

    // 00분 고정이므로 분은 고려 안 함 (요구사항)
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

    // 폼 일부만 리셋(이전 UX 느낌)
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

  // (중요) 줄 안맞는 원인: day column이 padding-top:10px 이었음.
  // -> padding 제거했으니 블록 top 계산도 +10 제거.
  const calcBlockStyle = (s) => {
    const rowIndex = s.startHour24 - START_HOUR_24; // 0-based
    const top = rowIndex * ROW_H; // ✅ +10 제거
    const height = Math.max(1, (s.endHour24 - s.startHour24) * ROW_H);

    return {
      top,
      height,
    };
  };

  // ===== UI =====
  return (
    <div className={`tt-page ${isDark ? "tt-dark" : ""}`}>
      <style>{CSS}</style>

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
              <button className="tt-iconbtn" onClick={() => setShowAddModal(true)} title="과목 추가">
                +
              </button>
              <button className="tt-iconbtn" onClick={() => setShowManageModal(true)} title="설정/관리">
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
                        title={`${s.name} (${toLabelKoreanTime(s.startHour24)} ~ ${toLabelKoreanTime(
                          s.endHour24
                        )})`}
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
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="tt-input"
                placeholder="교수명 (옵션)"
                value={form.prof}
                onChange={(e) => setForm((p) => ({ ...p, prof: e.target.value }))}
              />
              <input
                className="tt-input"
                placeholder="강의실 (옵션)"
                value={form.room}
                onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
              />

              {/* ✅ 이전 버전 시간/요일 UI */}
              <div className="tt-row3">
                <select
                  className="tt-select"
                  value={form.day}
                  onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))}
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
                    onChange={(e) => setForm((p) => ({ ...p, startAmpm: e.target.value }))}
                  >
                    <option>오전</option>
                    <option>오후</option>
                  </select>

                  <select
                    className="tt-time-select tt-hour"
                    value={form.startHour}
                    onChange={(e) => setForm((p) => ({ ...p, startHour: e.target.value }))}
                  >
                    {HOUR_12.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  {/* 분은 00 고정 */}
                  <span className="tt-fixed">:00</span>
                </div>

                {/* 종료시간 */}
                <div className="tt-timebox">
                  <select
                    className="tt-time-select tt-ampm"
                    value={form.endAmpm}
                    onChange={(e) => setForm((p) => ({ ...p, endAmpm: e.target.value }))}
                  >
                    <option>오전</option>
                    <option>오후</option>
                  </select>

                  <select
                    className="tt-time-select tt-hour"
                    value={form.endHour}
                    onChange={(e) => setForm((p) => ({ ...p, endHour: e.target.value }))}
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
                        {s.day} · {pad2(s.startHour24)}:00 ~ {pad2(s.endHour24)}:00
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
                <button className="tt-btn tt-primary" onClick={() => setShowManageModal(false)}>
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

const CSS = `
/* page */
.tt-page{
  /* ✅ 페이지 배경은 부모(body/App)와 동일하게 가도록 투명 */
  background: transparent;
  min-height: 100%;
}

.tt-wrap{
  max-width: 1100px;
  margin: 18px auto 60px;
  padding: 0 12px;
}

.tt-kicker{
  font-size: 12px;
  opacity: .7;
  margin-top: 14px;
}

.tt-title{
  font-size: 48px;
  font-weight: 900;
  margin: 6px 0 14px;
}

.tt-card{
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.92);
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
}

.tt-dark .tt-card{
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(18,22,30,.55);
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}

.tt-card-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0,0,0,.08);
}

.tt-dark .tt-card-head{
  border-bottom: 1px solid rgba(255,255,255,.10);
}

.tt-card-left{
  display:flex;
  align-items:center;
  gap: 10px;
}

.tt-card-title{
  font-weight: 900;
  font-size: 18px;
}

.tt-pill{
  font-size: 12px;
  opacity: .75;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.10);
}

.tt-dark .tt-pill{
  border: 1px solid rgba(255,255,255,.12);
}

/* actions */
.tt-actions{
  display:flex;
  gap: 8px;
}

.tt-iconbtn{
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.12);
  background: transparent;
  color: inherit;
  cursor:pointer;
  font-weight: 900;
}

.tt-dark .tt-iconbtn{
  border: 1px solid rgba(255,255,255,.14);
}

.tt-grid{
  padding: 14px 16px 16px;
}

/* head */
.tt-grid-head{
  display:grid;
  grid-template-columns: 70px 1fr;
  gap: 10px;
}

.tt-spacer{ height: 1px; }

.tt-days-head{
  display:grid;
  grid-template-columns: repeat(5, 1fr);
  border-radius: 14px;
  overflow:hidden;
  border: 1px solid rgba(0,0,0,.08);
}

.tt-dark .tt-days-head{
  border: 1px solid rgba(255,255,255,.10);
}

.tt-dayhead{
  padding: 10px 8px;
  text-align:center;
  background: rgba(0,0,0,.03);
  border-right: 1px solid rgba(0,0,0,.06);
}

.tt-dark .tt-dayhead{
  background: rgba(255,255,255,.04);
  border-right: 1px solid rgba(255,255,255,.08);
}

.tt-dayhead:last-child{
  border-right:none;
}

.tt-day-key{ font-weight: 900; }
.tt-day-date{ font-size: 14px; opacity:.9; }
.tt-day-ko{ font-size: 12px; opacity:.7; margin-top: 2px; }

/* body */
.tt-grid-body{
  display:grid;
  grid-template-columns: 70px 1fr;
  margin-top: 10px;
  border-radius: 14px;
  overflow:hidden;
  border: 1px solid rgba(0,0,0,.08);
}

.tt-dark .tt-grid-body{
  border: 1px solid rgba(255,255,255,.10);
}

.tt-time-col{
  background: rgba(0,0,0,.03);
}

.tt-dark .tt-time-col{
  background: rgba(255,255,255,.04);
}

.tt-time{
  height: ${ROW_H}px;
  display:flex;
  align-items:flex-start;
  justify-content:center;
  padding-top: 10px;
  font-size: 12px;
  opacity: .75;
  border-bottom: 1px solid rgba(0,0,0,.06);
}

.tt-dark .tt-time{
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.tt-days{
  display:grid;
  grid-template-columns: repeat(5, 1fr);
}

.tt-day-col{
  position: relative;
  /* ✅ (중요) padding-top 때문에 그리드 줄이 10px 밀렸음 -> 제거 */
  padding-top: 0;
  background: rgba(255,255,255,.92);
}

.tt-dark .tt-day-col{
  background: rgba(18,22,30,.55);
}

.tt-cell{
  height: ${ROW_H}px;
  border-bottom: 1px solid rgba(0,0,0,.06);
  border-right: 1px solid rgba(0,0,0,.06);
}

.tt-dark .tt-cell{
  border-bottom: 1px solid rgba(255,255,255,.08);
  border-right: 1px solid rgba(255,255,255,.08);
}

.tt-day-col:last-child .tt-cell{
  border-right:none;
}

/* block */
.tt-block{
  position:absolute;
  left: 10px;
  right: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #2f6df6;
  color:#fff;
}

.tt-block-time{
  font-size: 12px;
  font-weight: 700;
  opacity: .95;
}

.tt-block-name{
  margin-top: 2px;
  font-size: 14px;
  font-weight: 800;
}

/* ===== modal ===== */
.tt-backdrop{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display:grid;
  place-items:center;
  padding: 24px;
  z-index: 9999;
}

.tt-modal{
  width: min(520px, 92vw);
  border-radius: 16px;
  background: #fff;
  color: #111;
  border: 1px solid rgba(0,0,0,.10);
  overflow:hidden;
}

.tt-dark .tt-modal{
  background: rgba(22,26,34,.96);
  color: #fff;
  border: 1px solid rgba(255,255,255,.10);
}

.tt-modal-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0,0,0,.08);
}

.tt-dark .tt-modal-head{
  border-bottom: 1px solid rgba(255,255,255,.10);
}

.tt-modal-title{
  font-weight: 900;
}

.tt-x{
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,.12);
  background: transparent;
  color: inherit;
  cursor:pointer;
  font-size: 18px;
}

.tt-dark .tt-x{
  border: 1px solid rgba(255,255,255,.14);
}

.tt-hint{
  margin: 12px 16px 8px;
  background: #fff3cf;
  border: 1px solid #ffe19a;
  color: #5a4600;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
}

.tt-dark .tt-hint{
  background: rgba(255,214,102,.15);
  border: 1px solid rgba(255,214,102,.30);
  color: rgba(255,255,255,.90);
}

.tt-form{
  padding: 0 16px 16px;
}

.tt-input{
  width: 100%;
  margin: 8px 0;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.12);
  outline: none;
  background: #fff;
  color: inherit;
}

.tt-dark .tt-input{
  background: rgba(69, 9, 9, 0.06);
  border: 1px solid rgba(255,255,255,.14);
}

/* ====== (요구) 버튼/시간 선택: 이전 버전 스타일 ====== */
.tt-row3{
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.tt-select{
  height: 40px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,.2);
  font-size: 14px;
}

.tt-dark .tt-select{
  border: 1px solid rgba(255,255,255,.25);
}

.tt-timebox{
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
}

.tt-time-select{
  height: 40px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,.2);
  font-size: 14px;
  font-weight: 600;
}

.tt-dark .tt-time-select{
  border: 1px solid rgba(255,255,255,.25);
}

.tt-ampm{
  min-width: 70px;
}

.tt-hour{
  min-width: 56px;
  text-align: center;
}

.tt-fixed{
  font-size: 14px;
  font-weight: 600;
  opacity: .7;
  padding: 0 2px;
}

.tt-actions2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.tt-btn{
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.12);
  background: transparent;
  color: inherit;
  cursor:pointer;
  font-weight: 800;
}

.tt-dark .tt-btn{
  border: 1px solid rgba(255,255,255,.14);
}

.tt-primary{
  background: #111;
  color:#fff;
  border: none;
}

.tt-dark .tt-primary{
  background: #0c0f14;
}


.tt-empty{
  padding: 16px;
  opacity: .75;
  font-size: 13px;
}

.tt-list{
  padding: 0 16px 16px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}

.tt-item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 12px;
  padding: 10px 12px;
}

.tt-dark .tt-item{
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
}

.tt-item-name{ font-weight: 900; }
.tt-item-sub{ font-size: 12px; opacity: .75; margin-top: 2px; }

.tt-del{
  border:none;
  background: rgba(0,0,0,.06);
  padding: 8px 10px;
  border-radius: 10px;
  cursor:pointer;
  font-weight: 800;
  color: inherit;
}

.tt-dark .tt-del{
  background: rgba(255,255,255,.08);
}

@media (max-width: 980px){
  .tt-title{ font-size: 36px; }
  .tt-row3{ grid-template-columns: 1fr; }
  .tt-timebox{ justify-content: space-between; }
}
`;
