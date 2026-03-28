interface SideBarButtonProps {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export default function SideBarButton({
  id,
  icon,
  label,
  onClick,
  isActive = false,
}: SideBarButtonProps) {
  return (
    <li className="nav-list__item">
      <button
        id={id}
        className={`nav-list__button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        aria-label={label}
        aria-pressed={isActive}
      >
        <span className={icon}></span>
        <span className="arrow-tooltip">{label}</span>
      </button>
    </li>
  );
}
