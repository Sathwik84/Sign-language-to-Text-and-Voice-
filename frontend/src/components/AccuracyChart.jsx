import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function AccuracyChart() {
  const data = {
    labels: ["Session 1", "Session 2", "Session 3", "Session 4", "Session 5"],
    datasets: [
      {
        label: "Recognition Confidence",
        data: [0.6, 0.7, 0.8, 0.85, 0.9],
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,0.15)",
        tension: 0.4,
        fill: true,
        pointRadius: 5
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      y: {
        min: 0,
        max: 1
      }
    }
  };

  return <Line data={data} options={options} />;
}
