import type { PopMessagerProps } from "./PopMessager";

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
    <div className="modal-pop">
      <div className="modal-pop__inner">
        <p className="modal-pop__lg-text">{title}</p>
        <p className="modal-pop__text">{content}</p>
        <textarea
          className="modal-pop__textarea"
          readOnly
          value={errorMessage}
        />
        {buttons.length > 0 && (
          <div className="modal-pop__row">
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
