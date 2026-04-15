import { useState } from "react";
import type { PopMessagerProps } from "./PopMessager";

export interface ProjectNameMessagerProps extends PopMessagerProps {
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
}

export default function ProjectNameMessager({
  title,
  content,
  defaultValue = "",
  placeholder = "Enter project name",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  buttons = [],
}: ProjectNameMessagerProps) {
  // Strip .coral extension from default value so user edits the base name
  const initialValue = defaultValue.replace(/\.coral$/i, "");
  const [value, setValue] = useState(initialValue);

  const effectiveButtons =
    buttons.length > 0
      ? buttons
      : [
          ...(onCancel ? [{ label: cancelLabel ?? "Cancel", onClick: onCancel }] : []),
          ...(onConfirm
            ? [
                {
                  label: confirmLabel ?? "Confirm",
                  onClick: () => {
                    onConfirm(value.trim());
                  },
                },
              ]
            : []),
        ];

  return (
    <div className="modal-pop">
      <div className="modal-pop__inner">
        <p className="modal-pop__lg-text">{title}</p>
        <p className="modal-pop__text">{content}</p>
        <div className="modal-pop__input-group">
          <input
            type="text"
            className="modal-pop__input modal-pop__input--with-suffix"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
          />
          <span className="modal-pop__input-suffix">.coral</span>
        </div>
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
