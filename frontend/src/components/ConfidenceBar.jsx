export default function ConfidenceBar({ value }) {
  return (
    <div>
      <div style={{ background: "#ddd", height: 10, borderRadius: 5 }}>
        <div
          style={{
            width: `${value * 100}%`,
            background: "green",
            height: 10,
            borderRadius: 5
          }}
        />
      </div>
      <p>Confidence: {(value * 100).toFixed(1)}%</p>
    </div>
  );
}
