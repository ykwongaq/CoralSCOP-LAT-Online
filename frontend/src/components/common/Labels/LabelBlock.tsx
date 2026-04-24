import { useState, useRef, useEffect } from "react";
import { useVisualizationSetting } from "../../../features/VisualizationSetting/context";
import type { Label } from "../../../types/Annotation";
import { getLabelColor, getTextColor } from "../LabelColorMap";
import { useProject } from "../../../features/ProjectAnnotation/context";
import { usePopMessage } from "../PopUpMessages/PopMessageContext";
import { useAnnotationSession } from "../../../features/AnnotationSession/context";
import styles from "./Labels.module.css";

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
    const { dispatchAnnotationSession } = useAnnotationSession();
    const { showMessage, closeMessage } = usePopMessage();

    const { visualizationSetting, updateVisualizationSetting } =
        useVisualizationSetting();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(
        () => subCategories.length > 0,
    );
    const [isAddingStatus, setIsAddingStatus] = useState(false);
    const [newStatus, setNewStatus] = useState("");
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

    const handleAddStatus = () => {
        const trimmed = newStatus.trim();
        if (trimmed) {
            dispatch({
                type: "ADD_LABEL_STATUS",
                payload: { labelId: label.id, status: trimmed },
            });
        }
        setNewStatus("");
        setIsAddingStatus(false);
    };

    const handleDeleteStatus = (index: number) => {
        dispatch({
            type: "DELETE_LABEL_STATUS",
            payload: { labelId: label.id, statusIndex: index },
        });
    };

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
                    data.annotations.some(
                        (annotation) => annotation.labelId === label.id,
                    ),
                );
                if (isLabelInUse) {
                    showMessage({
                        title: "Confirm Deletion",
                        content:
                            "This label is used in some annotations. Deleting it will remove all those annotations. Are you sure?",
                        buttons: [
                            { label: "Cancel", onClick: closeMessage },
                            {
                                label: "Delete",
                                onClick: () => {
                                    dispatch({
                                        type: "DELETE_LABEL",
                                        payload: { labelId: label.id },
                                    });
                                    dispatchAnnotationSession({
                                        type: "CLEAR_ACTIVE_LABEL",
                                    });
                                    closeMessage();
                                },
                            },
                        ],
                    });
                } else {
                    dispatch({
                        type: "DELETE_LABEL",
                        payload: { labelId: label.id },
                    });
                    dispatchAnnotationSession({ type: "CLEAR_ACTIVE_LABEL" });
                }
            },
        },
    ];

    return (
        <div className={styles.colorPlateListItem}>
            <div className={`${styles.labelBlk} labelButton`}>
                <div
                    className={`${styles.colorPlate} colorBox`}
                    style={{
                        backgroundColor: labelColor,
                        color: textColor,
                        borderColor: labelColor,
                    }}
                >
                    {labelID + 1}
                </div>
                <p
                    ref={labelTextRef}
                    className={`${styles.labelBlkLabel} labelText`}
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
                <div className={styles.labelBlkSide}>
                    <button
                        className={`${styles.labelBlkBtn} ${styles.labelBlkBtnChevron}${isExpanded ? ` ${styles.labelBlkBtnChevronActive}` : ""}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                        title="Toggle sub-categories"
                    >
                        <span className={styles.labelBlkChevron}>&#9662;</span>
                    </button>
                    <button
                        className={`${styles.labelBlkBtn}${isHidding ? ` ${styles.labelBlkBtnActive}` : ""}`}
                        value="1"
                        onClick={onToggleShowLabel}
                    >
                        <span className="ico-eye"></span>
                        <span className="ico-hide"></span>
                    </button>
                    <button
                        ref={menuButtonRef}
                        className={styles.labelBlkBtn}
                        onClick={handleMenuClick}
                    >
                        <span className="ico-dots-horizontal-triple"></span>
                    </button>
                </div>
            </div>
            {isExpanded && (
                <div className={styles.labelSubcategory}>
                    {subCategories.map((status, index) => (
                        <span key={index} className={styles.labelSubcategoryTag}>
                            {status}
                            <button
                                className={styles.labelSubcategoryTagRemove}
                                onClick={() => handleDeleteStatus(index)}
                            >
                                &#215;
                            </button>
                        </span>
                    ))}
                    {isAddingStatus ? (
                        <input
                            autoFocus
                            type="text"
                            className={styles.labelSubcategoryInput}
                            placeholder="Sub-category..."
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddStatus();
                                } else if (e.key === "Escape") {
                                    setNewStatus("");
                                    setIsAddingStatus(false);
                                }
                            }}
                            onBlur={() => {
                                setNewStatus("");
                                setIsAddingStatus(false);
                            }}
                        />
                    ) : (
                        <button
                            className={styles.labelSubcategoryAddBtn}
                            onClick={() => setIsAddingStatus(true)}
                            title="Add sub-category"
                        >
                            +
                        </button>
                    )}
                </div>
            )}
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
        </div>
    );
}
