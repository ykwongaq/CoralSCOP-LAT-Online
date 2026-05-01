import styles from "./Button.module.css";

interface ButtonProps {
	onClick?: () => void;
	label?: string;
	isBorder?: boolean;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	children?: React.ReactNode;
}

export default function Button({
	onClick,
	label,
	isBorder = false,
	type = "button",
	disabled = false,
	children,
}: ButtonProps) {
	return (
		<button
			type={type}
			className={[styles.button, isBorder ? styles["button--border"] : ""]
				.filter(Boolean)
				.join(" ")}
			onClick={onClick}
			disabled={disabled}
		>
			{children ?? label}
		</button>
	);
}
