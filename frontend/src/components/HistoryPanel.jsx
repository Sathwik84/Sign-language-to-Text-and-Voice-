export default function HistoryPanel({ history }) {
  return (
    <div className="card">
      <h3>Sentence History</h3>
      {history.length === 0 && <p>No sentences yet</p>}
      {history.map((s, i) => (
        <p key={i}>• {s}</p>
      ))}
    </div>
  );
}
