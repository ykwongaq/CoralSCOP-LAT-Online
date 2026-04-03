interface SideBarDropDownButtonProps {
  id: string;
  label: string;
  onClick: () => void;
}

export default function SideBarDropDownButton({
  id,
  label,
  onClick,
}: SideBarDropDownButtonProps) {
  return (
    <button id={id} className="normal-dropdown__link" onClick={onClick}>
      {label}
    </button>
  );
}
