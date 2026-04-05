interface SummaryCardProps {
    statistic: string;
    name: string;
}

export default function SummaryCard({ statistic, name }: SummaryCardProps) {
    return (
        <div className="stat-summary-card">
            <span className="stat-summary-card__value">{statistic}</span>
            <span className="stat-summary-card__label">{name}</span>
        </div>
    );
}
