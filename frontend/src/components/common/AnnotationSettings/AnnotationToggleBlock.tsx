import { useState, useEffect } from "react";

interface AnnotationToggleBlockProps {
  name: string;
  id: string;
  defaultValue?: boolean;
  onChange?: (value: boolean) => void;
}

export function AnnotationToggleBlock({
  name,
  id,
  defaultValue = false,
  onChange,
}: AnnotationToggleBlockProps) {
  const [isChecked, setIsChecked] = useState<boolean>(defaultValue);

  useEffect(() => {
    setIsChecked(defaultValue);
  }, [defaultValue]);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsChecked(checked);
    onChange?.(checked);
  };

  return (
    <div className="side-bar__blk">
      <div className="toggle-blk">
        <p className="toggle-blk__title">{name}</p>
        <label className="switch">
          <input
            type="checkbox"
            id={id}
            checked={isChecked}
            onChange={handleToggle}
          />
          <span className="switch__slider"></span>
        </label>
      </div>
    </div>
  );
}
