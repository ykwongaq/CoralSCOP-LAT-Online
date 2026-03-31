import type { PopMessagerProps } from "./PopMessager";
import LoadingSVG from "../../../assets/images/loading.svg";
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
    <div className="modal-pop">
      <div className="modal-pop__inner">
        <img
          className="loading-pop__loading modal-pop__loading"
          src={LoadingSVG}
          alt=""
        />
        {progress !== null ? (
          <p
            id="loading-percentage"
            className="loading-pop__number modal-pop__number"
          >
            {progress}%
          </p>
        ) : null}
        <p className="modal-pop__lg-text">{title}</p>
        <p className="modal-pop__text">{content}</p>
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
