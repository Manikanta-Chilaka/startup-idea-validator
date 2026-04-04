import { useRef, useState } from 'react';
import { Radar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement
} from 'chart.js';
import {
  Users, DollarSign, Shield,
  CheckCircle2, AlertTriangle, XCircle,
  Target, BarChart2, User, Stethoscope,
  Activity, Lightbulb, ArrowUpRight, RefreshCw,
  Flag, ThumbsUp, ThumbsDown, Download, Zap, Info
} from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement);

// ─── Helpers ──────────────────────────────────────────────
function scoreToColor(s) {
  if (s >= 65) return 'emerald';
  if (s >= 40) return 'amber';
  return 'red';
}

function ScoreRing({ score, size = 72 }) {
  const color = scoreToColor(score);
  const map = {
    emerald: { stroke: '#10b981', text: 'text-emerald-400' },
    amber:   { stroke: '#f59e0b', text: 'text-amber-400'   },
    red:     { stroke: '#ef4444', text: 'text-red-400'      },
  };
  const c = map[color];
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.stroke} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <span className={`absolute text-sm font-bold ${c.text}`}>{score}%</span>
    </div>
  );
}

function Bar({ value, color = 'blue', className = '' }) {
  const colors = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className={`progress-bar-bg ${className}`}>
      <div className={`progress-bar-fill ${colors[color] ?? colors.blue}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function Tooltip2({ text, children }) {
  return (
    <div className="relative group/tip inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
                      bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300
                      w-56 text-center shadow-xl z-20
                      opacity-0 pointer-events-none transition-opacity
                      group-hover/tip:opacity-100">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, sublabel, color = 'blue', ring = false, tooltip }) {
  const iconColor = { blue: 'text-blue-400 bg-blue-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', amber: 'text-amber-400 bg-amber-500/10', red: 'text-red-400 bg-red-500/10' }[color] ?? 'text-blue-400 bg-blue-500/10';
  const [ic, ibg] = iconColor.split(' ');

  const inner = (
    <div className="card p-4 h-full">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-1.5 rounded-lg ${ibg}`}><Icon className={`w-4 h-4 ${ic}`} /></div>
        {tooltip && <Tooltip2 text={tooltip}><Info className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 cursor-help transition-colors" /></Tooltip2>}
      </div>
      {ring ? (
        <div className="flex items-center gap-3">
          <ScoreRing score={value} size={60} />
          <div><p className="text-xs text-zinc-400">{title}</p>{sublabel && <p className="text-xs text-zinc-600 mt-0.5">{sublabel}</p>}</div>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-zinc-100">{value}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{title}</p>
          {sublabel && <p className="text-xs text-zinc-600 mt-0.5">{sublabel}</p>}
        </>
      )}
    </div>
  );
  return inner;
}

function agentIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('invest') || n.includes('capital')) return { Icon: DollarSign,  color: 'text-blue-400',    bg: 'bg-blue-500/10'    };
  if (n.includes('customer') || n.includes('user'))  return { Icon: Users,       color: 'text-sky-400',     bg: 'bg-sky-500/10'     };
  if (n.includes('doctor') || n.includes('medic'))   return { Icon: Stethoscope, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (n.includes('competi'))                         return { Icon: Zap,         color: 'text-orange-400',  bg: 'bg-orange-500/10'  };
  if (n.includes('market') || n.includes('growth'))  return { Icon: BarChart2,   color: 'text-cyan-400',    bg: 'bg-cyan-500/10'    };
  if (n.includes('legal') || n.includes('regulat'))  return { Icon: Shield,      color: 'text-amber-400',   bg: 'bg-amber-500/10'   };
  return { Icon: User, color: 'text-zinc-400', bg: 'bg-zinc-800' };
}

function AgentCard({ agent }) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, color, bg } = agentIcon(agent.agent_name);
  const conf = Math.round((agent.interest_score / 10) * 100);
  const isLong = agent.feedback.length > 120;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{agent.agent_name}</p>
          <p className="text-xs text-zinc-600">{agent.interest_score}/10</p>
        </div>
        <ScoreRing score={agent.interest_score * 10} size={40} />
      </div>

      <div>
        <p className={`text-xs text-zinc-500 leading-relaxed italic ${!expanded ? 'line-clamp-3' : ''}`}>
          "{agent.feedback}"
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {agent.concerns[0] && (
        <div className="border border-red-500/15 rounded-lg p-2.5 bg-red-500/5">
          <p className="text-xs text-red-400 font-medium mb-0.5">Key concern</p>
          <p className="text-xs text-zinc-500 leading-snug line-clamp-2">{agent.concerns[0]}</p>
        </div>
      )}

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs text-zinc-600">Confidence</span>
          <span className="text-xs text-zinc-400">{conf}%</span>
        </div>
        <Bar value={conf} color={conf >= 65 ? 'emerald' : conf >= 40 ? 'amber' : 'red'} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function Dashboard({ report, onReset }) {
  const printRef = useRef(null);
  if (!report) return null;

  const { startup_idea, customer_adoption_probability, investment_interest, market_risk, overall_score, agent_responses, strengths, weaknesses, opportunities, threats, suggested_improvements } = report;
  const riskColor = market_risk === 'Low' ? 'emerald' : market_risk === 'Medium' ? 'amber' : 'red';

  const handleExportPDF = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF }       = await import('jspdf');
    const canvas  = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#09090b' });
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w       = pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
    pdf.save(`report-${startup_idea.slice(0, 25).replace(/\s+/g, '-')}.pdf`);
  };

  const avgRisk = agent_responses.reduce((s, a) => s + a.risk_score, 0) / agent_responses.length;

  const radarData = {
    labels: agent_responses.map(a => a.agent_name.replace(/ Agent$/i, '')),
    datasets: [
      { label: 'Interest (%)', data: agent_responses.map(a => a.interest_score * 10), backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.8)', borderWidth: 2, pointBackgroundColor: '#3b82f6', pointRadius: 3 },
      { label: 'Adoption (%)', data: agent_responses.map(a => a.adoption_probability), backgroundColor: 'rgba(148,163,184,0.05)', borderColor: 'rgba(148,163,184,0.5)', borderWidth: 1.5, borderDash: [4,4], pointBackgroundColor: '#94a3b8', pointRadius: 3 },
    ],
  };
  const radarOpts = {
    scales: { r: { min: 0, max: 100, angleLines: { color: 'rgba(255,255,255,0.05)' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false }, pointLabels: { color: '#71717a', font: { size: 11, family: 'Inter' } } } },
    plugins: { legend: { labels: { color: '#52525b', font: { size: 11 } } } },
  };

  const donutData = {
    labels: ['Safe', 'Moderate', 'High Risk'],
    datasets: [{ data: [Math.max(0, 10-avgRisk)*10, Math.min(avgRisk,5)*10, Math.max(0,avgRisk-5)*10], backgroundColor: ['rgba(16,185,129,0.75)', 'rgba(245,158,11,0.75)', 'rgba(239,68,68,0.75)'], borderColor: ['#10b981','#f59e0b','#ef4444'], borderWidth: 1.5, hoverOffset: 4 }]
  };
  const donutOpts = { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#52525b', padding: 14, font: { size: 11 } } } } };

  const riskRows = [
    { label: 'Technical Risk',  s: avgRisk > 6 ? 'High' : avgRisk > 3 ? 'Medium' : 'Low' },
    { label: 'Market Risk',     s: market_risk },
    { label: 'Financial Risk',  s: investment_interest < 4 ? 'High' : investment_interest < 7 ? 'Medium' : 'Low' },
    { label: 'Execution Risk',  s: overall_score < 40 ? 'High' : overall_score < 65 ? 'Medium' : 'Low' },
  ];

  function SIcon({ s }) {
    if (s === 'Low')    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (s === 'Medium') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  }
  function SBadge({ s }) {
    if (s === 'Low')    return <span className="badge-green">Low</span>;
    if (s === 'Medium') return <span className="badge-yellow">Medium</span>;
    return <span className="badge-red">High</span>;
  }

  return (
    <div ref={printRef} className="space-y-5 pb-10 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap no-print-buttons">
        <div className="min-w-0 flex-1">
          <p className="section-title">Analysis Result</p>
          <h1 className="text-base sm:text-lg font-semibold text-zinc-100 mt-1 leading-snug">{startup_idea}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleExportPDF} className="btn-ghost text-xs px-2 py-1.5"><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export PDF</span></button>
          <button onClick={onReset} className="btn-ghost text-xs px-2 py-1.5"><RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Analysis</span></button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <MetricCard icon={Activity} title="Overall Score" value={overall_score} sublabel="Combined rating" ring color={scoreToColor(overall_score)}
          tooltip="Average of customer adoption, investor interest ×10, and inverted risk score ×10." />
        <MetricCard icon={Users} title="Adoption Probability" value={customer_adoption_probability} sublabel="Customer likelihood" ring color={scoreToColor(customer_adoption_probability)}
          tooltip="Average adoption probability predicted across all AI stakeholder agents." />
        <MetricCard icon={DollarSign} title="Investment Potential" value={`${investment_interest}/10`} sublabel="Investor attractiveness" color={investment_interest >= 7 ? 'emerald' : investment_interest >= 4 ? 'amber' : 'red'}
          tooltip="Interest score from the investor-persona agent (1–10). Falls back to average if no investor agent is generated." />
        <MetricCard icon={Shield} title="Market Risk" value={market_risk} sublabel="Overall risk level" color={riskColor}
          tooltip="Derived from average risk score across agents: below 4 = Low, 4–7 = Medium, above 7 = High." />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-zinc-200">Agent Radar</p>
              <p className="text-xs text-zinc-500 mt-0.5">Interest and adoption per agent</p>
            </div>
            <span className="badge-blue">{agent_responses.length} agents</span>
          </div>
          <div className="h-[240px]"><Radar data={radarData} options={radarOpts} /></div>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-zinc-200 mb-1">Risk Distribution</p>
          <p className="text-xs text-zinc-500 mb-3">Across all agents</p>
          <div className="h-[200px] flex items-center justify-center"><Doughnut data={donutData} options={donutOpts} /></div>
          <div className="mt-3 flex justify-center">
            {market_risk === 'Low' ? <span className="badge-green">Low Risk</span> : market_risk === 'Medium' ? <span className="badge-yellow">Medium Risk</span> : <span className="badge-red">High Risk</span>}
          </div>
        </div>
      </div>

      {/* Market Fit */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-200">Market Fit</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Market Readiness',  val: customer_adoption_probability },
            { label: 'Overall Viability', val: overall_score                  },
            { label: 'Investor Interest', val: investment_interest * 10       },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-zinc-500">{label}</span>
                <span className="text-xs font-semibold text-zinc-300">{val}%</span>
              </div>
              <Bar value={val} color={val >= 65 ? 'emerald' : val >= 40 ? 'amber' : 'red'} />
            </div>
          ))}
        </div>
      </div>

      {/* Agent Insights */}
      <div>
        <p className="section-title mb-3">Agent Insights</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {agent_responses.map((agent, i) => (
            <AgentCard key={i} agent={agent} />
          ))}
        </div>
      </div>

      {/* Risk Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-sm font-semibold text-zinc-200">Risk Analysis</p>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {riskRows.map(({ label, s }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-center gap-3"><SIcon s={s} /><span className="text-sm text-zinc-300">{label}</span></div>
              <div className="flex items-center gap-3">
                <Bar value={s === 'Low' ? 25 : s === 'Medium' ? 60 : 90} color={s === 'Low' ? 'emerald' : s === 'Medium' ? 'amber' : 'red'} className="w-20" />
                <SBadge s={s} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-200">Recommendations</p>
        </div>
        <div className="space-y-2">
          {suggested_improvements.map((s, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/70 transition-colors">
              <span className="w-5 h-5 rounded-md bg-blue-500/15 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-sm text-zinc-300 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SWOT */}
      <div>
        <p className="section-title mb-3">SWOT Analysis</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Strengths',     icon: ThumbsUp,    items: strengths,     cls: 'border-emerald-500/20 bg-emerald-500/5', hcls: 'text-emerald-400', dot: 'bg-emerald-500' },
            { label: 'Weaknesses',    icon: ThumbsDown,  items: weaknesses,    cls: 'border-red-500/20 bg-red-500/5',         hcls: 'text-red-400',     dot: 'bg-red-500'     },
            { label: 'Opportunities', icon: ArrowUpRight, items: opportunities, cls: 'border-blue-500/20 bg-blue-500/5',       hcls: 'text-blue-400',    dot: 'bg-blue-500'    },
            { label: 'Threats',       icon: Flag,        items: threats,       cls: 'border-amber-500/20 bg-amber-500/5',     hcls: 'text-amber-400',   dot: 'bg-amber-500'   },
          ].map(({ label, icon: Icon, items, cls, hcls, dot }) => (
            <div key={label} className={`card border ${cls} p-4`}>
              <div className={`flex items-center gap-2 ${hcls} text-xs font-semibold uppercase tracking-wider mb-3`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </div>
              <ul className="space-y-2">
                {(items?.length ? items : ['No data available']).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className={`w-1 h-1 rounded-full ${dot} mt-2 shrink-0`} />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
