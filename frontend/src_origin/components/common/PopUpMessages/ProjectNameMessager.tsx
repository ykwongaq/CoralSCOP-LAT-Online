import { useState } from "react";
import type { PopMessagerProps } from "./PopMessager";
import styles from "./PopMessager.module.css";

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
    <div className={styles.modalPop}>
      <div className={styles.modalPopInner}>
        <p className={styles.modalPopLgText}>{title}</p>
        <p className={styles.modalPopText}>{content}</p>
        <div className={styles.modalPopInputGroup}>
          <input
            type="text"
            className={`${styles.modalPopInput} ${styles.modalPopInputWithSuffix}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
          />
          <span className={styles.modalPopInputSuffix}>.coral</span>
        </div>
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
