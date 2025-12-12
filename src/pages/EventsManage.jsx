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
        prev.map((x) =>
          String(x.id) === String(memoModal.id) ? updated : x
        )
      );

      setMemoModal(null);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.message || "저장 실패");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 18px 60px" }}>
      <h2 style={{ margin: "0 0 6px", textAlign: "center" }}>내 일정 관리</h2>
      <p style={{ margin: "0 0 18px", textAlign: "center", opacity: 0.75 }}>
        로그인한 사용자 기준으로, 나만의 개인 일정을 등록·수정·삭제할 수 있습니다.
      </p>

      {loading && <p>불러오는 중…</p>}
      {errMsg && <p style={{ color: "crimson" }}>{errMsg}</p>}

      <div
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 14,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 800, margin: "0 0 8px" }}>내 일정 캘린더</div>

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

      <div
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 12 }}>새 일정 추가</div>

        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr 140px",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, opacity: 0.8 }}>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 팀플 발표, 과제 마감"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, opacity: 0.8 }}>시작</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, opacity: 0.8 }}>끝(선택)</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={false}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                종일
              </label>

              <button
                type="submit"
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid #d9d9d9",
                  cursor: "pointer",
                }}
              >
                {editId ? "저장" : "추가"}
              </button>
            </div>
          </div>

          {editId && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                  cursor: "pointer",
                }}
              >
                수정 취소
              </button>
            </div>
          )}
        </form>
      </div>

      <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e6e6e6" }}>
              <th style={{ padding: "10px 8px" }}>제목</th>
              <th style={{ padding: "10px 8px", width: 140 }}>시작</th>
              <th style={{ padding: "10px 8px", width: 140 }}>끝</th>
              <th style={{ padding: "10px 8px", width: 160 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {myEvents.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 8px" }}>{row.title}</td>
                <td style={{ padding: "10px 8px" }}>{toDateInputValue(row.start)}</td>
                <td style={{ padding: "10px 8px" }}>{toDateInputValue(row.end)}</td>
                <td style={{ padding: "10px 8px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #d9d9d9",
                        cursor: "pointer",
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #d9d9d9",
                        cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {myEvents.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "14px 8px", opacity: 0.7 }}>
                  등록된 개인 일정이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table> 
      </div>

      {memoModal && (
        <div
          onClick={() => setMemoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: "100%",
              background: "rgba(0,0,0,0.3)",
              borderRadius: 14,
              border: "1px solid #e6e6e6",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
              {memoModal.title}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {COLOR_OPTIONS.map((opt) => {
                const active = memoModal.color === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setMemoModal((prev) => ({ ...prev, color: opt.key }))
                    }
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: active ? `2px solid ${opt.border}` : "1px solid #d9d9d9",
                      background: active ? opt.bg : "#ffffff",
                      color: active ? opt.text : "#111827",
                      fontWeight: 800,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label style={{ fontSize: 13, opacity: 0.8 }}>메모</label>
            <textarea
              value={memoModal.memo}
              onChange={(e) =>
                setMemoModal((prev) => ({ ...prev, memo: e.target.value }))
              }
              placeholder="여기에 메모를 남기세요"
              rows={6}
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #d9d9d9",
                resize: "vertical",
                background: "#ffffff",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={() => setMemoModal(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={saveMemo}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                  cursor: "pointer",
                }}
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
