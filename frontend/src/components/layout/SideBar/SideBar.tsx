import type React from "react";

interface SideBarProps {
	children: React.ReactNode;
}

export default function SideBar({ children }: SideBarProps) {
	return (
		<nav id="navigation-bar" className="side-bar">
			<div className="side-bar__main">
				<ul className="nav-list top">{children}</ul>
			</div>
		</nav>
	);
}
