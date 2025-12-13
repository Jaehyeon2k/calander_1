// src/pages/DeptSchedule.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { isAdmin } from "../auth/admin";

import CalendarFrame from "../components/CalendarFrame";
import MonthCalendar from "../components/MonthCalendar";
import EventTable from "../components/EventTable";
import FormGrid from "../components/FormGrid";

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

  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const load = useCallback(async () => {
    setMsg("");
    try {
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
    }));
  }, [deptEvents]);

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setStart("");
    setEnd("");
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
          deptId,
        });
      } else {
        await api.post("/events", {
          title: title.trim(),
          start,
          end: end || "",
          scope: "DEPT",
          deptId,
          memo: "",
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

  const columns = useMemo(() => {
    const base = [
      { label: "제목" },
      { label: "시작", width: 140 },
      { label: "끝", width: 140 },
    ];
    return admin ? [...base, { label: "관리", width: 170 }] : base;
  }, [admin]);

  return (
    <CalendarFrame
      className={`dept-page ${admin ? "is-admin" : "is-user"}`}
      title="학과 일정"
      subtitle={`학과를 선택하면 해당 학과 일정만 표시됩니다.${admin ? " (관리자: CRUD 가능)" : ""}`}
      calendarTitle="학과 일정 캘린더"
      topRight={
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
      }
      bottom={
        <>
          {admin && (
            <div className="card">
              <div className="card-title">{editId ? "일정 수정" : "새 일정 추가"}</div>

              <FormGrid
                titleValue={title}
                onTitleChange={setTitle}
                startValue={start}
                onStartChange={setStart}
                endValue={end}
                onEndChange={setEnd}
                endOptionalLabel="(선택)"
                primaryText={editId ? "저장" : "추가"}
                showCancel={!!editId}
                onCancel={resetForm}
                onSubmit={onSubmit}
              />
            </div>
          )}

          <EventTable
            title={admin ? "학과 일정 목록 (관리자)" : "학과 일정 목록"}
            columns={columns}
            rows={deptEvents}
            emptyText="등록된 학과 일정이 없습니다."
            renderRow={(row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{toYmd(row.start)}</td>
                <td>{toYmd(row.end)}</td>

                {admin ? (
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
                ) : null}
              </tr>
            )}
          />
        </>
      }
    >
      {msg && <p className="form-msg error">{msg}</p>}
      <MonthCalendar events={fcEvents} />
    </CalendarFrame>
  );
}
