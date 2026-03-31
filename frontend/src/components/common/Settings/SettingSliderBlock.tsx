import { useState, useEffect } from "react";

interface SettingBlockProps {
  title: string;
  description: string;
  id: string;
  defaultValue?: number;
  minValue: number;
  maxValue: number;
  step: number;
  onChange?: (value: number) => void;
}

export default function SettingSliderBlock({
  title,
  description,
  id,
  defaultValue,
  minValue,
  maxValue,
  step,
  onChange,
}: SettingBlockProps) {
  const initialValue = Number(defaultValue) || minValue;
  const [value, setValue] = useState<number>(initialValue);
  const [inputText, setInputText] = useState<string>(String(initialValue));
  const [isValid, setIsValid] = useState<boolean>(true);

  // Sync with external defaultValue changes
  useEffect(() => {
    const newValue = Number(defaultValue) || minValue;
    setValue(newValue);
    setInputText(String(newValue));
    setIsValid(true);
  }, [defaultValue, minValue]);

  const validateAndSetValue = (newValue: number) => {
    // Check if it's a valid number and within range
    if (isNaN(newValue)) {
      setIsValid(false);
      return false;
    }
    if (newValue < minValue || newValue > maxValue) {
      setIsValid(false);
      return false;
    }
    setIsValid(true);
    setValue(newValue);
    setInputText(String(newValue));
    onChange?.(newValue);
    return true;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    const numValue = Number(text);
    if (text === "" || isNaN(numValue)) {
      setIsValid(false);
      return;
    }

    // Allow intermediate input, but only update value if valid
    if (numValue >= minValue && numValue <= maxValue) {
      setIsValid(true);
      setValue(numValue);
      onChange?.(numValue);
    } else {
      setIsValid(false);
    }
  };

  const handleTextBlur = () => {
    const numValue = Number(inputText);
    if (isNaN(numValue) || inputText === "") {
      // Reset to last valid value
      setInputText(String(value));
      setIsValid(true);
    } else if (numValue < minValue) {
      validateAndSetValue(minValue);
    } else if (numValue > maxValue) {
      validateAndSetValue(maxValue);
    } else {
      validateAndSetValue(numValue);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    validateAndSetValue(newValue);
  };

  return (
    <div className="setting-item" id={id}>
      <label className="setting-item__title" htmlFor={`${id}-input`}>
        {title}
      </label>
      <p className="setting-item__desc">{description}</p>
      <div className="slider-blk">
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          className={!isValid ? "input-error" : ""}
        />
        <div className="slider-blk__inner">
          <input
            type="range"
            id={`${id}-input`}
            min={minValue}
            max={maxValue}
            value={value}
            data-suffix="%"
            step={step}
            onChange={handleSliderChange}
          />
        </div>
      </div>
    </div>
  );
}
