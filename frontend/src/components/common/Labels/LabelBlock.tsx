import { useState, useRef, useEffect } from "react";
import { useVisualizationSetting } from "../../../features/VisualizationSetting/context";
import type { Label } from "../../../types/Annotation";
import { getLabelColor, getTextColor } from "../LabelColorMap";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { usePopMessage } from "../PopUpMessages/PopMessageContext";

interface LabelBlockProps {
	label: Label;
}

interface DropDownMenuProps {
	children: React.ReactNode;
	isOpen: boolean;
	position: { x: number; y: number };
}

interface DropDownMenuItemProps {
	name: string;
	onClick: () => void;
}

function DropDownMenuItem({ name, onClick }: DropDownMenuItemProps) {
	return (
		<button className="normal-dropdown__link" onClick={onClick}>
			{name}
		</button>
	);
}

function DropDownMenu({ children, isOpen, position }: DropDownMenuProps) {
	if (!isOpen) return null;

	return (
		<div
			className="normal-dropdown label-dropdown-menu"
			style={{
				position: "fixed",
				left: `${position.x}px`,
				top: `${position.y}px`,
				display: "block",
			}}
		>
			{children}
		</div>
	);
}

export default function LabelBlock({ label }: LabelBlockProps) {
	const labelID = label.id;
	const labelName = label.name;
	const subCategories = label.status;

	const labelColor = getLabelColor(labelID);
	const textColor = getTextColor(labelID);

	const { state, dispatch } = useProject();
	const { showMessage, closeMessage } = usePopMessage();

	const { visualizationSetting, updateVisualizationSetting } =
		useVisualizationSetting();

	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
	const [isEditing, setIsEditing] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const labelTextRef = useRef<HTMLParagraphElement>(null);

	const isHidding = visualizationSetting.hiddingLabels.some(
		(hiddingLabel: Label) => hiddingLabel.id === label.id,
	);

	const onToggleShowLabel = () => {
		if (isHidding) {
			updateVisualizationSetting({
				hiddingLabels: visualizationSetting.hiddingLabels.filter(
					(hiddingLabel: Label) => hiddingLabel.id !== label.id,
				),
			});
		} else {
			updateVisualizationSetting({
				hiddingLabels: [...visualizationSetting.hiddingLabels, label],
			});
		}
	};

	const handleMenuClick = (event: React.MouseEvent) => {
		event.preventDefault();
		if (menuButtonRef.current) {
			const rect = menuButtonRef.current.getBoundingClientRect();
			setMenuPosition({ x: rect.left, y: rect.bottom });
		}
		setIsMenuOpen(true);
	};

	const handleCloseMenu = () => {
		setIsMenuOpen(false);
	};

	// Handle click outside to close the menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				menuButtonRef.current &&
				!menuButtonRef.current.contains(event.target as Node)
			) {
				setIsMenuOpen(false);
			}
		};

		if (isMenuOpen) {
			document.addEventListener("click", handleClickOutside);
		}

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, [isMenuOpen]);

	useEffect(() => {
		if (isEditing && labelTextRef.current) {
			labelTextRef.current.focus();
			const range = document.createRange();
			range.selectNodeContents(labelTextRef.current);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}, [isEditing]);

	const commitRename = () => {
		if (labelTextRef.current) {
			const newName = labelTextRef.current.innerText.trim();
			if (newName && newName !== labelName) {
				dispatch({
					type: "UPDATE_LABEL_NAME",
					payload: { labelId: label.id, newName },
				});
			}
		}
		setIsEditing(false);
	};

	// Example menu items - you can customize these based on your needs
	const menuItems = [
		{
			name: "Rename",
			onClick: () => {
				setIsEditing(true);
				handleCloseMenu();
			},
		},
		{
			name: "Delete",
			onClick: () => {
				handleCloseMenu();
				const isLabelInUse = state.dataList.some((data) =>
					data.annotations.some((annotation) => annotation.labelId === label.id),
				);
				if (isLabelInUse) {
					showMessage({
						title: "Confirm Deletion",
						content:
							"This label is used in some annotations. Deleting it will remove all those annotations. Are you sure?",
						buttons: [
							{
								label: "Cancel",
								onClick: closeMessage,
							},
							{
								label: "Delete",
								onClick: () => {
									dispatch({ type: "DELETE_LABEL", payload: { labelId: label.id } });
									closeMessage();
								},
							},
						],
					});
				} else {
					dispatch({ type: "DELETE_LABEL", payload: { labelId: label.id } });
				}
			},
		},
	];

	return (
		<>
			<div className="label-blk labelButton color-plate-list__item">
				<div
					className="label-blk__color color-plate-list__color-plate colorBox"
					style={{
						backgroundColor: labelColor,
						color: textColor,
						borderColor: labelColor,
					}}
				>
					{labelID}
				</div>
				<p
					ref={labelTextRef}
					className="label-blk__label labelText"
					contentEditable={isEditing}
					suppressContentEditableWarning={true}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							labelTextRef.current?.blur();
						} else if (e.key === "Escape") {
							e.preventDefault();
							if (labelTextRef.current) {
								labelTextRef.current.innerText = labelName;
							}
							setIsEditing(false);
						}
					}}
					onBlur={commitRename}
				>
					{labelName}
				</p>
				<div className="label-blk__side">
					<button
						className={`label-blk__btn label-hide-fn${isHidding ? " active" : ""}`}
						value="1"
						onClick={() => {
							onToggleShowLabel();
						}}
					>
						<span className="ico-eye"></span>
						<span className="ico-hide"></span>
					</button>
					<button
						ref={menuButtonRef}
						className="label-blk__btn label-menu-fn"
						onClick={handleMenuClick}
					>
						<span className="ico-dots-horizontal-triple"></span>
					</button>
				</div>
			</div>
			<div ref={menuRef}>
				<DropDownMenu isOpen={isMenuOpen} position={menuPosition}>
					{menuItems.map((item) => (
						<DropDownMenuItem
							key={item.name}
							name={item.name}
							onClick={item.onClick}
						/>
					))}
				</DropDownMenu>
			</div>
		</>
	);
}
