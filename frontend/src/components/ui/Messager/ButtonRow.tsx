import type { ModalButton } from "./PopMessager";
import styles from "./Messager.module.css";

export interface ButtonRowProps {
  buttons: ModalButton[];
}

export default function ButtonRow({ buttons }: ButtonRowProps) {
  if (buttons.length === 0) return null;

  return (
    <div className={styles.modalPopRow}>
      {buttons.map((btn, i) => (
        <button key={i} className="button" onClick={btn.onClick}>
          {btn.label}
        </button>
      ))}
    </div>
  );
}
