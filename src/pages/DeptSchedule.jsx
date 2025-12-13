import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import dayjs from "dayjs";

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

export default function DeptSchedule() {
  const { user } = useAuth();
  const admin = isAdmin(user?.email);

  const [deptId, setDeptId] = useState(DEPTS[0].id);
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState("");

  // 관리자 추가 폼(간단 유지)
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const load = useCallback(async () => {
    setMsg("");
    try {
      const res = await api.get("/events", { params: { scope: "DEPT", deptId } });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setMsg("학과 일정 로드 실패");
    }
  }, [deptId]);

  useEffect(() => {
    load();
  }, [load]);

  const fcEvents = useMemo(() => {
    return events.map((e) => ({
      id: String(e.id),
      title: e.title,
      start: e.start,
      end: e.end || undefined,
      allDay: true,
      // 색상 있으면 반영(없으면 기본)
      backgroundColor: e.color ? undefined : undefined,
    }));
  }, [events]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!admin) return;

    setMsg("");
    if (!title.trim() || !start) {
      setMsg("제목/시작일은 필수입니다.");
      return;
    }

    try {
      await api.post("/events", {
        title: title.trim(),
        start,
        end: end || "",
        allDay: true,
        scope: "DEPT",
        deptId,
        memo: "",
        color: "blue",
        ownerEmail: user?.email || "",
      });

      setTitle("");
      setEnd("");
      await load();
    } catch (e2) {
      console.error(e2);
      setMsg("등록 실패");
    }
  };

  const deptName = useMemo(
    () => DEPTS.find((d) => d.id === deptId)?.name || deptId,
    [deptId]
  );

  return (
    <div className="page-root page-wide">
      <div className="page-head">
        <div>
          <h2 className="page-title-lg">학과 일정</h2>
          <p className="page-subtitle">
            학과를 선택하면 해당 학과 일정만 보여줍니다.
            {admin ? " (관리자: 등록 가능)" : ""}
          </p>
        </div>

        <div className="page-actions">
          <select
            className="dept-select"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            title="학과 선택"
          >
            {DEPTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className="dept-badge">{deptName}</div>
        </div>
      </div>

      {msg && <p className="form-msg error">{msg}</p>}

      {/* ✅ 학사일정처럼: 카드 없이 캘린더만 깔끔하게 */}
      <div className="calendar-clean">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          height="auto"
          events={fcEvents}
          dayMaxEvents
          displayEventTime={false}
          fixedWeekCount={false}
          showNonCurrentDates={true}
          
          headerToolbar={{
            left: "title",
            center: "",
            right: "today prev,next",
          }}
          buttonText={{ today: "today" }}
        />
      </div>

      {/* ✅ 관리자만 간단 등록폼(원하면 나중에 모달/클릭 등록으로 바꿀 수 있음) */}
      {admin && (
        <div className="dept-admin">
          <h3 className="dept-admin-title">학과 일정 등록(관리자)</h3>

          <form className="dept-admin-form" onSubmit={onCreate}>
            <input
              className="input"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="input"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <input
              className="input"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              추가
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
