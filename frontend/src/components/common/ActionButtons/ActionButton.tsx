interface ActionButtonProps {
	name: string;
	icon: string;
	onClick: () => void;
}

export default function ActionButton({
	name,
	icon,
	onClick,
}: ActionButtonProps) {
	return (
		<button id="remove-button" className="float-bar__button" onClick={onClick}>
			<span className={icon}></span>
			{name}
		</button>
	);
}
