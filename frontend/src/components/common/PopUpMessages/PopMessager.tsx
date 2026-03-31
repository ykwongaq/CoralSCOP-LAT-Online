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
    <div className="modal-pop">
      <div className="modal-pop__inner">
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
