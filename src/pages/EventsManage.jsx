// src/pages/EventsManage.jsx
import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

import { useAuth } from "../auth/AuthContext";
import { fetchEvents, createEvent, updateEvent, deleteEvent } from "../api/eventsApi";

function toDateInputValue(d) {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EventsManage() {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [editId, setEditId] = useState(null);

  const myEvents = useMemo(() => {
    const email = user?.email || "";
    return events.filter((e) => e.scope === "USER" && e.ownerEmail === email);
  }, [events, user]);

  const fcEvents = useMemo(
    () =>
      myEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end || undefined,
        allDay: e.allDay ?? true,
      })),
    [myEvents]
  );

  const load = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const data = await fetchEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setErrMsg("불러오기 실패");
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
    if (!title.trim() || !start) return;

    try {
      if (editId) {
        const updated = await updateEvent(editId, {
          title: title.trim(),
          start,
          end,
          allDay,
        });
        setEvents((prev) => prev.map((x) => (x.id === editId ? updated : x)));
      } else {
        const created = await createEvent({
          title: title.trim(),
          start,
          end,
          allDay,
          scope: "USER",
          ownerEmail: user.email,
        });
        setEvents((prev) => [created, ...prev]);
      }
      resetForm();
    } catch {
      setErrMsg(editId ? "수정 실패" : "등록 실패");
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
    const ok = window.confirm("이 일정을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((x) => x.id !== id));
      if (String(editId) === String(id)) resetForm();
    } catch {
      setErrMsg("삭제 실패");
    }
  };

  return (
    <div className="page-wide">
      {/* 헤더 */}
      <div className="page-head">
        <h2 className="page-title">내 일정 관리</h2>
        <p className="page-subtitle">로그인한 사용자 기준으로 개인 일정을 관리합니다.</p>
      </div>

      {/* 캘린더 */}
      <div className="manage-panel">
        <div className="manage-panel-title">내 일정 캘린더</div>
        <div className="fc-clean">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="auto"
            events={fcEvents}
            dayMaxEvents
            displayEventTime={false}
            headerToolbar={{
              left: "title",
              center: "",
              right: "today prev,next",
            }}
          />
        </div>
      </div>

      <div className="section-divider" />

      {/* 메시지 */}
      {(loading || errMsg) && (
        <p className={`form-msg ${errMsg ? "error" : ""}`}>
          {loading ? "불러오는 중..." : errMsg}
        </p>
      )}

      {/* ✅ 새 일정 추가(DeptSchedule 같은 구조) */}
      <div className="card">
        <div className="card-title">{editId ? "일정 수정" : "새 일정 추가"}</div>

        <form onSubmit={onSubmit}>
          <div className="dept-form-grid">
            <div className="field">
              <label>제목</label>
              <input
                className="input"
                placeholder="예) 팀플 발표, 과제 마감"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label>시작</label>
              <input
                type="date"
                className="input"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>

            <div className="field">
              <label>끝</label>
              <input
                type="date"
                className="input"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>

            <div className="dept-form-actions">
              <label className="check">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                <span>종일</span>
              </label>

              <button className="btn btn-primary" type="submit">
                {editId ? "저장" : "추가"}
              </button>

              {editId && (
                <button className="btn" type="button" onClick={resetForm}>
                  취소
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="section-divider" />

      {/* 목록 */}
      <div className="manage-panel">
        <div className="manage-panel-title">일정 목록</div>

        <table className="table manage-table-wide">
          <thead>
            <tr>
              <th>제목</th>
              <th style={{ width: 140 }}>시작</th>
              <th style={{ width: 140 }}>끝</th>
              <th style={{ width: 180 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {myEvents.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{toDateInputValue(row.start)}</td>
                <td>{toDateInputValue(row.end)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn" type="button" onClick={() => onEdit(row)}>
                      수정
                    </button>
                    <button className="btn danger" type="button" onClick={() => onDelete(row.id)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {myEvents.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 14 }}>
                  등록된 개인 일정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
