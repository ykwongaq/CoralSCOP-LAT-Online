interface AnnotationSideBarProps {
	children?: React.ReactNode;
}
export default function AnnotationSideBar({
	children,
}: AnnotationSideBarProps) {
	return <div className="side-bar__sub">{children}</div>;
}
