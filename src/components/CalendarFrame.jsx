// src/components/calendar/CalendarFrame.jsx
import React from "react";

/**
 * 공통 캘린더 "프레임(껍데기)" 컴포넌트
 * - title/subtitle
 * - 상단 controls 영역(학과 선택 같은거)
 * - 캘린더 카드 영역
 * - 아래 bottom 영역(테이블/CRUD 폼)
 *
 * ✅ 로직은 각 페이지에서 유지하고, UI 틀만 공유
 */
export default function CalendarFrame({
  title,
  subtitle,
  topRight,
  calendarTitle,
  children, // FullCalendar 자리
  bottom,   // 아래 CRUD/테이블 영역
  className = "",
}) {
  return (
    <div className={`page-wide ${className}`}>
      {/* 헤더 */}
      <div className="page-head">
        <div>
          <h2 className="page-title-lg">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>

        {topRight ? <div className="page-actions">{topRight}</div> : null}
      </div>

      {/* 캘린더 패널 */}
      <div className="manage-panel">
        {calendarTitle ? (
          <div className="manage-panel-title">{calendarTitle}</div>
        ) : null}
        {children}
      </div>

      {/* 아래 섹션 */}
      {bottom ? (
        <>
          <div className="section-divider" />
          {bottom}
        </>
      ) : null}
    </div>
  );
}
