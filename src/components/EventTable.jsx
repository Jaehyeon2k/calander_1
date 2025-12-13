// src/components/EventTable.jsx
import React from "react";

/**
 * 재활용 테이블 컴포넌트
 * - 권한/로직/데이터 구조는 모름 (그냥 그려주기만 함)
 * - columns: [{ label, width?, thStyle?, thClassName? }]
 * - rows: 배열
 * - renderRow: (row) => <tr>...</tr>
 * - emptyText: 데이터 없을 때 문구
 *
 * ✅ 학과일정 admin/user 처럼 “보이는 컬럼이 달라지는 케이스”도
 *    columns를 페이지에서 분기하면 안전하게 처리 가능
 */
export default function EventTable({
  title,
  columns,
  rows,
  renderRow,
  emptyText = "데이터가 없습니다.",
  className = "",
  tableClassName = "table",
}) {
  const colSpan = columns?.length || 1;

  return (
    <div className={`card ${className}`}>
      {title ? <div className="card-title">{title}</div> : null}

      <table className={tableClassName}>
        {/* colgroup: width가 있을 때만 적용 */}
        {columns?.some((c) => c.width) ? (
          <colgroup>
            {columns.map((c, idx) => (
              <col key={idx} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
        ) : null}

        <thead>
          <tr>
            {columns.map((c, idx) => (
              <th
                key={idx}
                className={c.thClassName}
                style={c.thStyle}
                scope="col"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows?.length ? (
            rows.map((row) => renderRow(row))
          ) : (
            <tr>
              <td
                colSpan={colSpan}
                className="muted"
                style={{ padding: 14 }}
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
