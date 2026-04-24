import styles from "./Labels.module.css";

interface LabelSearcherProps {
	value: string;
	onChange: (value: string) => void;
}

export function LabelSearcher({ value, onChange }: LabelSearcherProps) {
	return (
		<div className={styles.inputBlk}>
			<p className={styles.inputBlkLabel}>Label Search</p>
			<div className={styles.inputBlkWrap}>
				<span className={styles.inputBlkIcon}>
					<span className="ico-search"></span>
				</span>
				<input
					type="text"
					id="search-input"
					placeholder="Search label"
					name="search"
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
				<button id="search-button" type="submit">
					<i className="fa fa-search"></i>
				</button>
			</div>
		</div>
	);
}
