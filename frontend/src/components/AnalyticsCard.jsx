export default function AnalyticsCard({ title, value, accent }) {
  return (
    <div className="analytics-card">
      <h4>{title}</h4>
      <h2 style={{ color: accent || "var(--primary)" }}>{value}</h2>
    </div>
  );
}
