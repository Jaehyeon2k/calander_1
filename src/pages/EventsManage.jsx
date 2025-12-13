import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

import { useAuth } from "../auth/AuthContext";
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../api/eventsApi";

function toDateInputValue(d) {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const COLOR_OPTIONS = [
  { key: "red", label: "빨강", bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  { key: "blue", label: "파랑", bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  { key: "green", label: "초록", bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
];

function getColorStyle(colorKey) {
  const found = COLOR_OPTIONS.find((x) => x.key === colorKey);
  if (!found) return COLOR_OPTIONS[1];
  return found;
}

export default function EventsManage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [events, setEvents] = useState([]);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(true);

  const [memoModal, setMemoModal] = useState(null);

  const myEvents = useMemo(() => {
    const email = user?.email || user?.user?.email || "";
    return events.filter((e) => {
      const scope = e.scope || e.SCOPE;
      const owner = e.ownerEmail || e.userEmail || e.email;
      return scope === "USER" && owner === email;
    });
  }, [events, user]);

  const fcEvents = useMemo(() => {
    return myEvents.map((e) => {
      const c = getColorStyle(e.color);
      return {
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end || undefined,
        allDay: e.allDay ?? true,

        memo: e.memo || "",
        color: e.color || "blue",

        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
      };
    });
  }, [myEvents]);

  const load = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const data = await fetchEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.message || "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setStart("");
    setEnd("");
    setAllDay(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrMsg("");

    const email = user?.email || user?.user?.email || "";
    if (!email) {
      setErrMsg("로그인이 필요합니다.");
      return;
    }

    if (!title.trim()) {
      setErrMsg("제목을 입력하세요.");
      return;
    }
    if (!start) {
      setErrMsg("시작 날짜를 선택하세요.");
      return;
    }
    if (end && end < start) {
      setErrMsg("끝 날짜는 시작 날짜보다 빠를 수 없습니다.");
      return;
    }

    try {
      if (editId) {
        const patch = {
          title: title.trim(),
          start,
          end: end || "",
          allDay,
        };
        const updated = await updateEvent(editId, patch);
        setEvents((prev) =>
          prev.map((x) => (String(x.id) === String(editId) ? updated : x))
        );
      } else {
        const newEvent = {
          title: title.trim(),
          start,
          end: end || "",
          allDay,
          scope: "USER",
          ownerEmail: email,
          memo: "",
          color: "blue",
        };
        const created = await createEvent(newEvent);
        setEvents((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (e2) {
      console.error(e2);
      setErrMsg(e2?.message || "저장 실패");
    }
  };

  const onEdit = (row) => {
    setEditId(row.id);
    setTitle(row.title || "");
    setStart(toDateInputValue(row.start));
    setEnd(toDateInputValue(row.end));
    setAllDay(row.allDay ?? true);
  };

  const onDelete = async (id) => {
    setErrMsg("");
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((x) => String(x.id) !== String(id)));
      if (editId && String(editId) === String(id)) resetForm();
      if (memoModal && String(memoModal.id) === String(id)) setMemoModal(null);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.message || "삭제 실패");
    }
  };

  const onCalendarClick = (info) => {
    const ev = info.event;
    setMemoModal({
      id: ev.id,
      title: ev.title,
      memo: ev.extendedProps?.memo || "",
      color: ev.extendedProps?.color || "blue",
    });
  };

  const saveMemo = async () => {
    if (!memoModal) return;
    setErrMsg("");
    try {
      const patch = {
        memo: memoModal.memo,
        color: memoModal.color,
      };
      const updated = await updateEvent(memoModal.id, patch);

      setEvents((prev) =>
        prev.map((x) => (String(x.id) === String(memoModal.id) ? updated : x))
      );

      setMemoModal(null);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.message || "저장 실패");
    }
  };

  return (
    <div className="manage">
      <h2 className="manage-title">내 일정 관리</h2>
      <p className="manage-subtitle">
        로그인한 사용자 기준으로, 나만의 개인 일정을 등록·수정·삭제할 수 있습니다.
      </p>

      {loading && <p>불러오는 중…</p>}
      {errMsg && <p className="manage-error">{errMsg}</p>}

      {/* 캘린더 */}
      <div className="manage-card">
        <div className="manage-card-title">내 일정 캘린더</div>

        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          height="auto"
          events={fcEvents}
          dayMaxEvents
          eventClick={onCalendarClick}
          displayEventTime={false}
          eventTimeFormat={false}
          headerToolbar={{
            left: "title",
            center: "",
            right: "today prev,next",
          }}
        />
      </div>

      {/* 새 일정 추가 */}
      <div className="manage-card pad-16">
        <div className="manage-card-title mb-12">새 일정 추가</div>

        <form onSubmit={onSubmit}>
          <div className="manage-form-grid">
            <div className="manage-field">
              <label className="manage-label">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 팀플 발표, 과제 마감"
                className="manage-input"
              />
            </div>

            <div className="manage-field">
              <label className="manage-label">시작</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="manage-input"
              />
            </div>

            <div className="manage-field">
              <label className="manage-label">끝(선택)</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="manage-input"
              />
            </div>

            <div className="manage-form-actions">
              <label className="manage-check">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                종일
              </label>

              <button type="submit" className="manage-btn">
                {editId ? "저장" : "추가"}
              </button>
            </div>
          </div>

          {editId && (
            <div className="manage-cancel-row">
              <button type="button" onClick={resetForm} className="manage-btn">
                수정 취소
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 테이블 */}
      <div className="manage-card pad-16">
        <table className="manage-table">
          <thead>
            <tr className="manage-thead-row">
              <th className="manage-th">제목</th>
              <th className="manage-th" style={{ width: 140 }}>시작</th>
              <th className="manage-th" style={{ width: 140 }}>끝</th>
              <th className="manage-th" style={{ width: 160 }}>관리</th>
            </tr>
          </thead>

          <tbody>
            {myEvents.map((row) => (
              <tr key={row.id} className="manage-row">
                <td className="manage-td">{row.title}</td>
                <td className="manage-td">{toDateInputValue(row.start)}</td>
                <td className="manage-td">{toDateInputValue(row.end)}</td>
                <td className="manage-td">
                  <div className="manage-actions">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="manage-btn-sm"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className="manage-btn-sm"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {myEvents.length === 0 && (
              <tr>
                <td colSpan={4} className="manage-empty">
                  등록된 개인 일정이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 메모 모달 */}
      {memoModal && (
        <div
          className="manage-modal-overlay"
          onClick={() => setMemoModal(null)}
        >
          <div className="manage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manage-modal-title">{memoModal.title}</div>

            <div className="manage-color-row">
              {COLOR_OPTIONS.map((opt) => {
                const active = memoModal.color === opt.key;

                // ✅ 색상은 동적이라 최소한의 스타일만 유지
                const style = {
                  border: active ? `2px solid ${opt.border}` : "1px solid #d9d9d9",
                  background: active ? opt.bg : "#ffffff",
                  color: active ? opt.text : "#111827",
                };

                return (
                  <button
                    key={opt.key}
                    type="button"
                    className="manage-color-btn"
                    style={style}
                    onClick={() =>
                      setMemoModal((prev) => ({ ...prev, color: opt.key }))
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label className="manage-label">메모</label>
            <textarea
              value={memoModal.memo}
              onChange={(e) =>
                setMemoModal((prev) => ({ ...prev, memo: e.target.value }))
              }
              placeholder="여기에 메모를 남기세요"
              rows={6}
              className="manage-textarea"
            />

            <div className="manage-modal-actions">
              <button
                type="button"
                className="manage-btn"
                onClick={() => setMemoModal(null)}
              >
                닫기
              </button>

              <button
                type="button"
                className="manage-btn"
                onClick={saveMemo}
              >
                메모 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
