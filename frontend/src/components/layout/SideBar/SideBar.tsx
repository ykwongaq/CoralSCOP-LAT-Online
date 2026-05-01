import type React from "react";
import styles from "./SideBar.module.css";

interface SideBarProps {
	children: React.ReactNode;
}

export default function SideBar({ children }: SideBarProps) {
	return (
		<nav id="navigation-bar" className={styles.sideBar}>
			<div className={styles.sideBarMain}>
				<ul className="nav-list top">{children}</ul>
			</div>
		</nav>
	);
}
