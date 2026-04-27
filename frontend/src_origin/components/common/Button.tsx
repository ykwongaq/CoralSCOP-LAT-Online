interface ButtonProps {
  onClick?: () => void;
  label?: string;
  additionalClassName?: string;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function Button({
  onClick,
  label,
  additionalClassName,
  children,
  type = "button",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button ${additionalClassName ?? ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children ?? label}
    </button>
  );
}
