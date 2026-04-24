import styles from "./Settings.module.css";

export default function SettingGroups({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.settingsGroup}>{children}</div>;
}
