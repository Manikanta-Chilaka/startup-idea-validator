import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function ScoreTrend({ history }) {
  if (!history || history.length < 2) return null;

  // Oldest → newest, cap at 10
  const recent = [...history].reverse().slice(-10);

  const data = {
    labels: recent.map((e, i) => `#${i + 1}`),
    datasets: [{
      label: 'Score',
      data: recent.map(e => e.score),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.06)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: recent.map(e =>
        e.score >= 65 ? '#10b981' : e.score >= 40 ? '#f59e0b' : '#ef4444'
      ),
      pointBorderColor: 'transparent',
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#52525b', font: { size: 11 } },
        border: { color: 'transparent' },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#52525b', font: { size: 11 }, callback: v => `${v}%` },
        border: { color: 'transparent' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: '#3f3f46',
        borderWidth: 1,
        titleColor: '#a1a1aa',
        bodyColor: '#e4e4e7',
        callbacks: {
          title: (ctx) => recent[ctx[0].dataIndex].idea.slice(0, 40) + '...',
          label: ctx => ` Score: ${ctx.raw}%`,
          afterLabel: ctx => ` Risk: ${recent[ctx.dataIndex].risk}`,
        },
      },
    },
  };

  const best  = Math.max(...recent.map(e => e.score));
  const worst = Math.min(...recent.map(e => e.score));
  const trend = recent[recent.length - 1].score - recent[0].score;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Score Trend</p>
          <p className="text-xs text-zinc-500 mt-0.5">How your ideas have scored over time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-600">Best</p>
            <p className="text-sm font-bold text-emerald-400">{best}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-600">Trend</p>
            <p className={`text-sm font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </p>
          </div>
        </div>
      </div>
      <div className="h-[180px]">
        <Line data={data} options={options} />
      </div>
      <p className="text-xs text-zinc-700 mt-2 text-center">
        Hover points to see idea name · Dots coloured by score
      </p>
    </div>
  );
}
