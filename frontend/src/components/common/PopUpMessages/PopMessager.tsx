import styles from "./PopMessager.module.css";

export interface ModalButton {
  label: string;
  onClick: () => void;
}

export interface PopMessagerProps {
  title: string;
  content: string;
  buttons?: ModalButton[];
}

export default function PopMessager({
  title,
  content,
  buttons = [],
}: PopMessagerProps) {
  return (
    <div className={styles.modalPop}>
      <div className={styles.modalPopInner}>
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
