import type { PopMessagerProps } from "./PopMessager";
import styles from "./PopMessager.module.css";

export interface ErrorMessagerProps extends PopMessagerProps {
  errorMessage: string;
}

export default function ErrorMessager({
  title,
  content,
  errorMessage,
  buttons = [],
}: ErrorMessagerProps) {
  return (
    <div className={styles.modalPop}>
      <div className={styles.modalPopInner}>
        <p className={styles.modalPopLgText}>{title}</p>
        <p className={styles.modalPopText}>{content}</p>
        <textarea
          className={styles.modalPopTextarea}
          readOnly
          value={errorMessage}
        />
        {buttons.length > 0 && (
          <div className={styles.modalPopRow}>
            {buttons.map((btn, i) => (
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
