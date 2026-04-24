import type { PopMessagerProps } from "./PopMessager";
import LoadingSVG from "../../../assets/images/loading.svg";
import styles from "./PopMessager.module.css";

export interface LoadingMessagerProps extends PopMessagerProps {
  progress: number | null;
}

export default function LoadingMessager({
  title,
  content,
  progress,
  buttons = [],
}: LoadingMessagerProps) {
  return (
    <div className={styles.modalPop}>
      <div className={styles.modalPopInner}>
        <img
          className={styles.modalPopLoading}
          src={LoadingSVG}
          alt=""
        />
        {progress !== null ? (
          <p id="loading-percentage" className={styles.modalPopNumber}>
            {progress}%
          </p>
        ) : null}
        <p className={styles.modalPopLgText}>{title}</p>
        <p className={styles.modalPopText}>{content}</p>
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
