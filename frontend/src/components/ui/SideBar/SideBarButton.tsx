interface SideBarButtonProps {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export default function SideBarButton({
  id,
  icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
}: SideBarButtonProps) {
  return (
    <li className="nav-list__item">
      <button
        id={id}
        className={`nav-list__button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
      >
        <span className={icon}></span>
        <span className="arrow-tooltip">{label}</span>
      </button>
    </li>
  );
}
