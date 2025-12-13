import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

import { normalizeSchoolEvents } from "../utils/normalizeSchoolEvent";

const SCHOOL_API = "http://localhost:4100/api/school-events";

const FILTERS = [
  { key: "all", label: "전체", test: () => true },
  { key: "exam", label: "시험", test: (t) => /시험|중간|기말|평가/i.test(t) },
  { key: "reg", label: "등록/수강", test: (t) => /등록|수강|정정|신청|복학|휴학/i.test(t) },
  { key: "vac", label: "방학/계절", test: (t) => /방학|계절|하계|동계/i.test(t) },
  { key: "holiday", label: "휴일", test: (t) => /공휴|휴일|연휴|신정|설날|추석|성탄/i.test(t) },
  { key: "event", label: "행사", test: (t) => /행사|세미나|특강|설명회|대회|작품전/i.test(t) },
];

export default function CalendarPage() {
  const cacheRef = useRef(new Map());
  const pendingRef = useRef(new Map());

  const [filterKey, setFilterKey] = useState("all");

  const ensureYear = useCallback(async (year) => {
    if (cacheRef.current.has(year)) return;

    if (pendingRef.current.has(year)) {
      await pendingRef.current.get(year);
      return;
    }

    const p = (async () => {
      const res = await fetch(`${SCHOOL_API}?year=${year}`);
      if (!res.ok) throw new Error(`school-events ${year} 실패: ${res.status}`);

      const json = await res.json();
      const rawEvents = Array.isArray(json.events) ? json.events : [];

      const normalized = normalizeSchoolEvents(rawEvents, year);
      cacheRef.current.set(year, normalized);
    })();

    pendingRef.current.set(year, p);
    try {
      await p;
    } finally {
      pendingRef.current.delete(year);
    }
  }, []);

  const eventSource = useCallback(
    async (info, successCallback, failureCallback) => {
      const y1 = info.start.getFullYear();
      const y2 = info.end.getFullYear();

      try {
        await ensureYear(y1);
        if (y2 !== y1) await ensureYear(y2);

        const merged = [];
        for (const arr of cacheRef.current.values()) merged.push(...arr);

        const active = FILTERS.find((f) => f.key === filterKey) || FILTERS[0];
        const filtered = merged.filter((e) => active.test(String(e?.title ?? "")));

        successCallback(filtered);
      } catch (e) {
        console.error(e);
        failureCallback(e);
      }
    },
    [ensureYear, filterKey]
  );

  return (
    <div className="page-root" style={{ padding: 16 }}>
      <h2>YJU 학사일정</h2>

      <div className="school-filterbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`school-filterbtn ${filterKey === f.key ? "is-active" : ""}`}
            onClick={() => setFilterKey(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        height="auto"
        events={eventSource}
      />
    </div>
  );
}
