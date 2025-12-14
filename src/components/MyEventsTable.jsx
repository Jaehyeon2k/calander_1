import React from "react";
import EventTable from "./EventTable";

export default function MyEventsTable({
  rows,
  columns,
  colorOptions,
  getColorStyle,
  toDateInputValue,
  onEdit,
  onDelete,
  onOpenMemo,
}) {
  return (
    <EventTable
      title="일정 목록"
      columns={columns}
      rows={rows}
      emptyText="등록된 개인 일정이 없습니다."
      className="manage-table-wide"
      renderRow={(row) => {
        const c = getColorStyle(row.color || "blue");
        const label =
          colorOptions.find((x) => x.key === (row.color || "blue"))?.label || "보통";

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
                {label}
              </span>
            </td>

            <td>{toDateInputValue(row.start)}</td>
            <td>{toDateInputValue(row.end)}</td>

            <td>
              <div className="row-actions">
                <button className="btn" type="button" onClick={() => onEdit(row)}>
                  수정
                </button>

                <button className="btn" type="button" onClick={() => onOpenMemo(row)}>
                  메모
                </button>

                <button className="btn danger" type="button" onClick={() => onDelete(row.id)}>
                  삭제
                </button>
              </div>
            </td>
          </tr>
        );
      }}
    />
  );
}
