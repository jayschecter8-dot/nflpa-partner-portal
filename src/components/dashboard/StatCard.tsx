interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

export default function StatCard({ label, value, valueColor = 'text-slate-900' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${valueColor}`}>{value}</div>
    </div>
  );
}
