import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useAuth } from "../auth/AuthContext";
import { isAdmin } from "../auth/admin";

const api = axios.create({ baseURL: "http://localhost:4000" });

const DEPTS = [
  { id: "CS", name: "컴퓨터정보계열" },
  { id: "AR", name: "드론항공과" },
  { id: "AN", name: "동물보건과" },
  { id: "DESIGN", name: "디자인계열" },
  { id: "ETC", name: "기타" },
];

function toYmd(v) {
  if (!v) return "";
  // db.json이 "YYYY-MM-DD"면 그대로
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function DeptSchedule() {
  const { user } = useAuth();
  const admin = isAdmin(user?.email);

  const [deptId, setDeptId] = useState(DEPTS[0].id);
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState("");

  // 폼(내 일정관리처럼: 아래에서 추가/수정)
  const [editId, setEditId] = useState(null); // null이면 create, 있으면 edit
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(true);

  const load = useCallback(async () => {
    setMsg("");
    try {
      // ✅ 학과별로만 로드
      const res = await api.get("/events", {
        params: { scope: "DEPT", deptId },
      });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setMsg("학과 일정 로드 실패");
    }
  }, [deptId]);

  useEffect(() => {
    load();
  }, [load]);

  // ✅ 현재 선택한 학과 일정만 (표/캘린더 둘 다 이걸 씀)
  const deptEvents = useMemo(() => {
    return events
      .filter((e) => e.scope === "DEPT" && String(e.deptId) === String(deptId))
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  }, [events, deptId]);

  const fcEvents = useMemo(() => {
    return deptEvents.map((e) => ({
      id: String(e.id),
      title: e.title,
      start: e.start,
      end: e.end || undefined,
      allDay: e.allDay ?? true,
    }));
  }, [deptEvents]);

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setStart("");
    setEnd("");
    setAllDay(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!admin) return;

    setMsg("");

    if (!title.trim() || !start) {
      setMsg("제목/시작일은 필수입니다.");
      return;
    }
    if (end && end < start) {
      setMsg("끝 날짜는 시작 날짜보다 빠를 수 없습니다.");
      return;
    }

    try {
      if (editId) {
        await api.patch(`/events/${editId}`, {
          title: title.trim(),
          start,
          end: end || "",
          allDay,
          deptId, // ✅ 학과 유지
        });
      } else {
        await api.post("/events", {
          title: title.trim(),
          start,
          end: end || "",
          allDay,
          scope: "DEPT",
          deptId,
          memo: "", // 기존 구조 맞추기(사용 안 함)
          color: "blue",
          ownerEmail: user?.email || "",
        });
      }

      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      setMsg(editId ? "수정 실패" : "등록 실패");
    }
  };

  const onEdit = (row) => {
    if (!admin) return;
    setEditId(row.id);
    setTitle(row.title || "");
    setStart(toYmd(row.start));
    setEnd(toYmd(row.end));
    setAllDay(row.allDay ?? true);
  };

  const onDelete = async (id) => {
    if (!admin) return;
    const ok = window.confirm("이 학과 일정을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await api.delete(`/events/${id}`);
      if (String(editId) === String(id)) resetForm();
      await load();
    } catch (err) {
      console.error(err);
      setMsg("삭제 실패");
    }
  };

  return (
    <div className="page-root page-wide">
      <div className="page-head">
        <div>
          <h2 className="page-title-lg">학과 일정</h2>
          <p className="page-subtitle">
            학과를 선택하면 해당 학과 일정만 표시됩니다.
            {admin ? " (관리자: CRUD 가능)" : ""}
          </p>
        </div>

        <div className="page-actions">
          <select
            className="dept-select"
            value={deptId}
            onChange={(e) => {
              setDeptId(e.target.value);
              resetForm();
            }}
          >
            {DEPTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {msg && <p className="form-msg error">{msg}</p>}
    <div className="manage-panel">
      <div className="manage-panel-title">학과 일정 캘린더</div>


        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          events={fcEvents}
          height="auto"
          dayMaxEvents
          displayEventTime={false}
          fixedWeekCount={false}
          showNonCurrentDates
          headerToolbar={{
            left: "title",
            center: "",
            right: "today prev,next",
          }}
          buttonText={{ today: "today" }}
          className="fc-clean"
          // ✅ eventClick 없음 = 클릭해도 삭제 안됨
        />
      </div>
      <div className="section-divider" />

      {/* ✅ 관리자만: 등록/수정 폼 (스샷처럼) */}
      {admin && (
        <div className="card">
          <div className="card-title">
            {editId ? "일정 수정" : "새 일정 추가"}
          </div>

          <form className="dept-form" onSubmit={onSubmit}>
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
                  className="input"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              <div className="field">
                <label>끝(선택)</label>
                <input
                  className="input"
                  type="date"
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
      )}
      <div className="section-divider" />

      {/* ✅ 리스트(표): 선택한 학과 일정들이 밑에 쭉 뜸 */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>제목</th>
              <th style={{ width: 140 }}>시작</th>
              <th style={{ width: 140 }}>끝</th>
              <th style={{ width: 170 }}>관리</th>
            </tr>
          </thead>

          <tbody>
            {deptEvents.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{toYmd(row.start)}</td>
                <td>{toYmd(row.end)}</td>
                <td>
                  {admin ? (
                    <div className="row-actions">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => onEdit(row)}
                      >
                        수정
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => onDelete(row.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
              </tr>
            ))}

            {deptEvents.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 14 }}>
                  등록된 학과 일정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
