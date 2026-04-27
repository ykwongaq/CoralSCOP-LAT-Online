import { useEffect, useRef, useState } from "react";

interface SideBarDropDownListProps {
  id: string;
  icon: string;
  label: string;
  children: React.ReactNode;
}

export default function SideBarDropDownList({
  id,
  icon,
  label,
  children,
}: SideBarDropDownListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLLIElement>(null);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <li className="nav-list__item" ref={containerRef}>
      <button id={id} className="nav-list__button" onClick={handleToggle}>
        <span className={icon}></span>
        <span className="arrow-tooltip">{label}</span>
      </button>
      {isOpen && (
        <div id={`file-dropdown-menu-${id}`} className="normal-dropdown">
          {children}
        </div>
      )}
    </li>
  );
}
