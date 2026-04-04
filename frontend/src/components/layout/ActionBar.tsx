import { Children } from "react";

interface ActionBarProps {
	children: React.ReactNode;
	hidden?: boolean;
}

export default function ActionBar({ children, hidden }: ActionBarProps) {
	return (
		<div className={`float-bar${hidden ? " float-bar--hidden" : ""}`}>
			<div className="float-bar__inner">
				{Children.map(children, (child) => (
					<div className="float-bar__item">{child}</div>
				))}
			</div>
		</div>
	);
}
