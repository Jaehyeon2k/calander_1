import { useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

import { normalizeSchoolEvents } from "../utils/normalizeSchoolEvent";

const SCHOOL_API = "http://localhost:4100/api/school-events";

export default function CalendarPage() {
  const cacheRef = useRef(new Map());
  const pendingRef = useRef(new Map());

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

        successCallback(merged);
      } catch (e) {
        console.error(e);
        failureCallback(e);
      }
    },
    [ensureYear]
  );

  return (
    <div className="page-root" style={{ padding: 16 }}>
      <h2>YJU 학사일정</h2>

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
