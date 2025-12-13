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

// ✅ 중요도(색상) 옵션: 저장값은 key(red/blue/green)
const COLOR_OPTIONS = [
  { key: "red", label: "높음", bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  { key: "blue", label: "보통", bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  { key: "green", label: "낮음", bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
];

function getColorStyle(colorKey) {
  return COLOR_OPTIONS.find((x) => x.key === colorKey) || COLOR_OPTIONS[1]; // 기본 blue
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

  // ✅ 메모 모달 상태: { id, title, memo, color }
  const [memoModal, setMemoModal] = useState(null);

  // 내 개인 일정만
  const myEvents = useMemo(() => {
    const email = user?.email || user?.user?.email || "";
    return events.filter((e) => {
      const scope = e.scope || e.SCOPE;
      const owner = e.ownerEmail || e.userEmail || e.email;
      return scope === "USER" && owner === email;
    });
  }, [events, user]);

  // FullCalendar용 변환 (+ 색상 반영 + extendedProps로 memo/color 유지)
  const fcEvents = useMemo(() => {
    return myEvents.map((e) => {
      const c = getColorStyle(e.color);
      return {
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end || undefined,
        allDay: e.allDay ?? true,

        // ✅ 클릭 시 모달에 쓸 데이터
        extendedProps: {
          memo: e.memo || "",
          color: e.color || "blue",
        },

        // ✅ 캘린더 표시 색상
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
      setErrMsg(e?.message || "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!email) return setErrMsg("로그인이 필요합니다.");

    if (!title.trim()) return setErrMsg("제목을 입력하세요.");
    if (!start) return setErrMsg("시작 날짜를 선택하세요.");
    if (end && end < start) return setErrMsg("끝 날짜는 시작 날짜보다 빠를 수 없습니다.");

    try {
      if (editId) {
        // ✅ 기존 일정 수정(제목/기간만)
        const updated = await updateEvent(editId, {
          title: title.trim(),
          start,
          end: end || "",
          allDay,
        });
        setEvents((prev) => prev.map((x) => (String(x.id) === String(editId) ? updated : x)));
      } else {
        // ✅ 새 일정 생성 시 memo/color 기본값 포함
        const created = await createEvent({
          title: title.trim(),
          start,
          end: end || "",
          allDay,
          scope: "USER",
          ownerEmail: email,

          memo: "",
          color: "blue",
        });
        setEvents((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (e2) {
      setErrMsg(e2?.message || (editId ? "수정 실패" : "등록 실패"));
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

    setErrMsg("");
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((x) => String(x.id) !== String(id)));
      if (String(editId) === String(id)) resetForm();
      if (memoModal && String(memoModal.id) === String(id)) setMemoModal(null);
    } catch (e) {
      setErrMsg(e?.message || "삭제 실패");
    }
  };

  // ✅ 캘린더 일정 클릭 → 메모 모달 오픈
  const onCalendarClick = (info) => {
    const ev = info.event;
    setMemoModal({
      id: ev.id,
      title: ev.title,
      memo: ev.extendedProps?.memo || "",
      color: ev.extendedProps?.color || "blue",
    });
  };

  // ✅ 메모 + 중요도(색상)만 저장
  const saveMemo = async () => {
    if (!memoModal) return;
    setErrMsg("");

    try {
      const patch = { memo: memoModal.memo, color: memoModal.color };
      const updated = await updateEvent(memoModal.id, patch);

      setEvents((prev) =>
        prev.map((x) => (String(x.id) === String(memoModal.id) ? updated : x))
      );
      setMemoModal(null);
    } catch (e) {
      setErrMsg(e?.message || "메모 저장 실패");
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
            eventClick={onCalendarClick}
            headerToolbar={{
              left: "title",
              center: "",
              right: "today prev,next",
            }}
          />
        </div>

        <div className="manage-hint">
          💡 일정 바를 클릭하면 <b>메모</b>와 <b>중요도</b>(색상)을 설정할 수 있어요.
        </div>
      </div>

      <div className="section-divider" />

      {/* 메시지 */}
      {(loading || errMsg) && (
        <p className={`form-msg ${errMsg ? "error" : ""}`}>
          {loading ? "불러오는 중..." : errMsg}
        </p>
      )}

      {/* 폼 */}
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
              <th style={{ width: 130 }}>중요도</th>
              <th style={{ width: 140 }}>시작</th>
              <th style={{ width: 140 }}>끝</th>
              <th style={{ width: 190 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {myEvents.map((row) => {
              const c = getColorStyle(row.color || "blue");
              return (
                <tr key={row.id}>
                  <td className="title-cell">
                    <div className="title-line">{row.title}</div>
                    {row.memo ? <div className="memo-preview">{row.memo}</div> : null}
                  </td>

                  <td>
                    <span
                      className="importance-badge"
                      style={{ background: c.bg, borderColor: c.border, color: c.text }}
                      title={row.color}
                    >
                      {COLOR_OPTIONS.find((x) => x.key === (row.color || "blue"))?.label || "보통"}
                    </span>
                  </td>

                  <td>{toDateInputValue(row.start)}</td>
                  <td>{toDateInputValue(row.end)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" type="button" onClick={() => onEdit(row)}>
                        수정
                      </button>

                      {/* ✅ 테이블에서도 메모 편집 가능하게 */}
                      <button
                        className="btn"
                        type="button"
                        onClick={() =>
                          setMemoModal({
                            id: row.id,
                            title: row.title,
                            memo: row.memo || "",
                            color: row.color || "blue",
                          })
                        }
                      >
                        메모
                      </button>

                      <button className="btn danger" type="button" onClick={() => onDelete(row.id)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {myEvents.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="muted" style={{ padding: 14 }}>
                  등록된 개인 일정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ 메모 모달 */}
      {memoModal && (
        <div className="memo-overlay" onClick={() => setMemoModal(null)}>
          <div className="memo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="memo-title">{memoModal.title}</div>

            <div className="memo-colors">
              {COLOR_OPTIONS.map((opt) => {
                const active = memoModal.color === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`color-pill ${active ? "active" : ""}`}
                    onClick={() => setMemoModal((prev) => ({ ...prev, color: opt.key }))}
                    style={{
                      borderColor: active ? opt.border : "var(--border)",
                      background: active ? opt.bg : "transparent",
                      color: active ? opt.text : "var(--text)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label className="memo-label">메모</label>
            <textarea
              className="memo-textarea"
              value={memoModal.memo}
              onChange={(e) => setMemoModal((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="예) 준비물, 링크, 체크할 내용 등을 적어두세요"
              rows={7}
            />

            <div className="memo-actions">
              <button className="btn" type="button" onClick={() => setMemoModal(null)}>
                닫기
              </button>
              <button className="btn btn-primary" type="button" onClick={saveMemo}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
