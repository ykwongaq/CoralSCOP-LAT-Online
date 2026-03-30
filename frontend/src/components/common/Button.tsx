export default function Button(
  onClick: () => void,
  label: string,
  additionalClassName?: string,
) {
  return (
    <button className={`button ${additionalClassName ?? ""}`} onClick={onClick}>
      {label}
    </button>
  );
}
