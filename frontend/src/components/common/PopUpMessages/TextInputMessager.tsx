import { useState } from "react";
import type { PopMessagerProps } from "./PopMessager";

export interface TextInputMessagerProps extends PopMessagerProps {
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
}

export default function TextInputMessager({
  title,
  content,
  defaultValue = "",
  placeholder = "",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  buttons = [],
}: TextInputMessagerProps) {
  const [value, setValue] = useState(defaultValue);

  const effectiveButtons =
    buttons.length > 0
      ? buttons
      : [
          ...(onCancel ? [{ label: cancelLabel ?? "Cancel", onClick: onCancel }] : []),
          ...(onConfirm ? [{ label: confirmLabel ?? "Confirm", onClick: () => onConfirm(value) }] : []),
        ];

  return (
    <div className="modal-pop">
      <div className="modal-pop__inner">
        <p className="modal-pop__lg-text">{title}</p>
        <p className="modal-pop__text">{content}</p>
        <input
          type="text"
          className="modal-pop__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
        {effectiveButtons.length > 0 && (
          <div className="modal-pop__row">
            {effectiveButtons.map((btn, i) => (
              <button key={i} className="button" onClick={btn.onClick}>
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
