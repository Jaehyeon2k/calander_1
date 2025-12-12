import dayjs from "dayjs";

function fixInvalidEnd(event) {
  if (!event?.end) return event;
  const s = dayjs(event.start);
  const e = dayjs(event.end);
  if (e.isBefore(s, "day")) return { ...event, end: null };
  return event;
}

function normalizeSeasonStartsOnly(event) {
  if (!event) return event;

  const title = String(event.title ?? "").trim();
  const targets = new Set([
    "동계방학",
    "하계방학",
    "동계 계절수업 기간",
    "하계 계절수업 기간",
  ]);

  if (!targets.has(title)) return event;

  const start = event.start;

  return {
    ...event,
    start,
    end: dayjs(start).add(1, "day").format("YYYY-MM-DD"),
    allDay: true,
    title: `${title} (시작)`,
  };
}
export function normalizeSchoolEvents(events, year) {
  const list = Array.isArray(events) ? events : [];

  const out = [];
  let newYearCount = 0;

  for (const raw of list) {
    const title = String(raw?.title ?? "").trim();
    const start = String(raw?.start ?? "");

    const isNewYear = title === "신정" && start.startsWith(`${year}-01-01`);
    if (isNewYear) {
      newYearCount += 1;
      if (newYearCount >= 2) break;
    }

    let e = fixInvalidEnd(raw);
    e = normalizeSeasonStartsOnly(e);

    out.push(e);
  }

  return out;
}
