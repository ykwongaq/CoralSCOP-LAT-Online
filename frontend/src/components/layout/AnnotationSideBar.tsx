import { useProject } from "../../features/ProjectAnnotation/context";
import AnnotationSiderBlock from "../common/AnnotationSettings/AnnotationSiderBlock";

interface AnnotationSideBarProps {
  children?: React.ReactNode;
}
export default function AnnotationSideBar({
  children,
}: AnnotationSideBarProps) {
  return <div className="side-bar__sub">{children}</div>;
}
