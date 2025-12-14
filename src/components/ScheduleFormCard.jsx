import React from "react";
import FormGrid from "./FormGrid";

export default function ScheduleFormCard({
  editId,
  title,
  setTitle,
  start,
  setStart,
  end,
  setEnd,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="card">
      <div className="card-title">{editId ? "일정 수정" : "새 일정 추가"}</div>

      <FormGrid
        titleValue={title}
        onTitleChange={setTitle}
        startValue={start}
        onStartChange={setStart}
        endValue={end}
        onEndChange={setEnd}
        primaryText={editId ? "저장" : "추가"}
        showCancel={!!editId}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </div>
  );
}
