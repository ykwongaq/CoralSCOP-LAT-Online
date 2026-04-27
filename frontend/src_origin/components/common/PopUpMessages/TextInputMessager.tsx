import { useState } from "react";
import type { PopMessagerProps } from "./PopMessager";
import styles from "./PopMessager.module.css";

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
    <div className={styles.modalPop}>
      <div className={styles.modalPopInner}>
        <p className={styles.modalPopLgText}>{title}</p>
        <p className={styles.modalPopText}>{content}</p>
        <input
          type="text"
          className={styles.modalPopInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
        {effectiveButtons.length > 0 && (
          <div className={styles.modalPopRow}>
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
