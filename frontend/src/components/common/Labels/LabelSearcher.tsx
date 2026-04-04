interface LabelSearcherProps {
	value: string;
	onChange: (value: string) => void;
}

export function LabelSearcher({ value, onChange }: LabelSearcherProps) {
	return (
		<div className="input-blk">
			<p className="input-blk__label">Label Search</p>
			<div className="input-blk__wrap">
				<span className="input-blk__icon">
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
