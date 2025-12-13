// src/components/calendar/MonthCalendar.jsx
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

/**
 * 월간(dayGridMonth) 공통 캘린더 래퍼
 * - 공통 옵션은 여기 고정
 * - events / eventClick 만 페이지에서 주입
 */
export default function MonthCalendar({
  events,
  onEventClick,
  className = "fc-clean",
}) {
  return (
    <div className={className}>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        height="auto"
        events={events}
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
        eventClick={onEventClick}
      />
    </div>
  );
}
