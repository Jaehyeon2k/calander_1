import React from "react";

export default function MemoModal({ modal, colorOptions, onClose, onChange, onSave }) {
  if (!modal) return null;

  return (
    <div className="memo-overlay" onClick={onClose}>
      <div className="memo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="memo-title">{modal.title}</div>

        <div className="memo-colors">
          {colorOptions.map((opt) => {
            const active = modal.color === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`color-pill ${active ? "active" : ""}`}
                onClick={() => onChange({ ...modal, color: opt.key })}
                style={{
                  borderColor: active ? opt.border : "var(--border)",
                  background: active ? opt.bg : "transparent",
                  color: active ? opt.text : "var(--text)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <label className="memo-label">메모</label>
        <textarea
          className="memo-textarea"
          value={modal.memo}
          onChange={(e) => onChange({ ...modal, memo: e.target.value })}
          placeholder="예) 준비물, 링크, 체크할 내용 등을 적어두세요"
          rows={7}
        />

        <div className="memo-actions">
          <button className="btn" type="button" onClick={onClose}>
            닫기
          </button>
          <button className="btn btn-primary" type="button" onClick={onSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
