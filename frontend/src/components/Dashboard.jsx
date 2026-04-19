import { useState } from 'react';
import { fetchCompetitors } from '../api';
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
  Flag, ThumbsUp, ThumbsDown, Download, Zap, Info,
  Search, TrendingUp, Loader2
} from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement);

// ─── Helpers ──────────────────────────────────────────────
function scoreToColor(s) {
  if (s >= 65) return 'green';
  if (s >= 40) return 'amber';
  return 'red';
}

const COLOR_MAP = {
  green: { stroke: '#10B981', glow: 'rgba(16,185,129,0.4)', text: '#34D399' },
  amber: { stroke: '#F59E0B', glow: 'rgba(245,158,11,0.4)',  text: '#FBBF24' },
  red:   { stroke: '#EF4444', glow: 'rgba(239,68,68,0.4)',   text: '#F87171' },
};

function ScoreRing({ score, size = 72 }) {
  const c = COLOR_MAP[scoreToColor(score)];
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.stroke} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${c.glow})` }} />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color: c.text, fontSize: size < 48 ? 10 : 12 }}>{score}%</span>
    </div>
  );
}

function ProgressBar({ value, colorKey = 'green', className = '' }) {
  const fill = { green: '#10B981', amber: '#F59E0B', red: '#EF4444', accent: 'var(--accent)' }[colorKey] ?? 'var(--accent)';
  return (
    <div className={`progress-bar-bg ${className}`}>
      <div className="progress-bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: fill }} />
    </div>
  );
}

function TooltipHint({ text, children }) {
  return (
    <div className="relative group/tip inline-block">
      {children}
      <div style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        marginBottom: 8, padding: '8px 12px', background: 'var(--bg2)',
        border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)',
        fontSize: 11, color: 'var(--text2)', width: 220, textAlign: 'center',
        zIndex: 20, opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s',
        boxShadow: 'var(--shadow)',
      }} className="group-hover/tip:opacity-100">
        {text}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, sublabel, colorKey = 'accent', ring = false, tooltip }) {
  const accentMap = {
    green:  { icon: '#10B981', bg: 'rgba(16,185,129,0.1)'   },
    amber:  { icon: '#F59E0B', bg: 'rgba(245,158,11,0.1)'   },
    red:    { icon: '#EF4444', bg: 'rgba(239,68,68,0.1)'     },
    accent: { icon: 'var(--accent)', bg: 'rgba(99,102,241,0.12)' },
  };
  const col = accentMap[colorKey] ?? accentMap.accent;

  return (
    <div className="card p-4 h-full">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ padding: 6, borderRadius: 8, background: col.bg }}>
          <Icon style={{ width: 16, height: 16, color: col.icon }} />
        </div>
        {tooltip && (
          <TooltipHint text={tooltip}>
            <Info style={{ width: 14, height: 14, color: 'var(--text3)', cursor: 'help' }} />
          </TooltipHint>
        )}
      </div>
      {ring ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ScoreRing score={value} size={60} />
          <div>
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>{title}</p>
            {sublabel && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sublabel}</p>}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{title}</p>
          {sublabel && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sublabel}</p>}
        </>
      )}
    </div>
  );
}

function agentIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('invest') || n.includes('capital')) return { Icon: DollarSign, color: 'var(--accent)',  bg: 'rgba(99,102,241,0.12)'  };
  if (n.includes('customer') || n.includes('user'))  return { Icon: Users,      color: 'var(--cyan)',    bg: 'rgba(6,182,212,0.1)'    };
  if (n.includes('doctor') || n.includes('medic'))   return { Icon: Stethoscope,color: '#10B981',        bg: 'rgba(16,185,129,0.1)'   };
  if (n.includes('competi'))                          return { Icon: Zap,        color: '#F59E0B',        bg: 'rgba(245,158,11,0.1)'   };
  if (n.includes('market') || n.includes('growth'))  return { Icon: BarChart2,  color: 'var(--cyan)',    bg: 'rgba(6,182,212,0.1)'    };
  if (n.includes('legal') || n.includes('regulat'))  return { Icon: Shield,     color: '#F59E0B',        bg: 'rgba(245,158,11,0.1)'   };
  return { Icon: User, color: 'var(--text2)', bg: 'var(--surface-hover)' };
}

function AgentCard({ agent }) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, color, bg } = agentIcon(agent.agent_name);
  const conf = Math.round((agent.interest_score / 10) * 100);
  const isLong = agent.feedback.length > 120;
  const confKey = conf >= 65 ? 'green' : conf >= 40 ? 'amber' : 'red';

  return (
    <div className="card p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: 6, borderRadius: 8, background: bg, flexShrink: 0 }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.agent_name}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>{agent.interest_score}/10</p>
        </div>
        <ScoreRing score={agent.interest_score * 10} size={40} />
      </div>

      <div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic',
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: expanded ? 'unset' : 3, overflow: 'hidden' }}>
          "{agent.feedback}"
        </p>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)}
            style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {agent.concerns[0] && (
        <div style={{ borderRadius: 8, padding: '8px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#F87171', marginBottom: 2 }}>Key concern</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{agent.concerns[0]}</p>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Confidence</span>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{conf}%</span>
        </div>
        <ProgressBar value={conf} colorKey={confKey} />
      </div>
    </div>
  );
}

const POSITION_STYLES = {
  'Market Leader':      'badge-blue',
  'Established Player': 'badge-green',
  'Niche Player':       'badge-yellow',
  'Emerging':           'badge-blue',
};

// ─── Main ─────────────────────────────────────────────────
export default function Dashboard({ report, onReset }) {
  const [competitors, setCompetitors]           = useState(null);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError]   = useState(null);

  if (!report) return null;

  const { startup_idea, customer_adoption_probability, investment_interest, market_risk, overall_score, agent_responses, strengths, weaknesses, opportunities, threats, suggested_improvements } = report;
  const riskColorKey = market_risk === 'Low' ? 'green' : market_risk === 'Medium' ? 'amber' : 'red';

  const handleResearchCompetitors = async () => {
    setCompetitorLoading(true);
    setCompetitorError(null);
    try {
      const data = await fetchCompetitors(startup_idea);
      setCompetitors(data);
    } catch {
      setCompetitorError('Failed to research competitors. Please try again.');
    } finally {
      setCompetitorLoading(false);
    }
  };

  const avgRisk = agent_responses.reduce((s, a) => s + a.risk_score, 0) / agent_responses.length;

  const radarLabels = agent_responses.map(a => {
    const name = a.agent_name.replace(/ Agent$/i, '');
    return name.length > 12 ? name.slice(0, 12) + '…' : name;
  });
  const radarData = {
    labels: radarLabels,
    datasets: [
      { label: 'Interest (%)', data: agent_responses.map(a => a.interest_score * 10), backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.8)', borderWidth: 2, pointBackgroundColor: '#6366F1', pointRadius: 3 },
      { label: 'Adoption (%)', data: agent_responses.map(a => a.adoption_probability), backgroundColor: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.6)', borderWidth: 1.5, borderDash: [4,4], pointBackgroundColor: '#06B6D4', pointRadius: 3 },
    ],
  };
  const radarOpts = {
    layout: { padding: { top: 12, bottom: 12, left: 16, right: 16 } },
    scales: { r: { min: 0, max: 100, angleLines: { color: 'rgba(255,255,255,0.05)' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false }, pointLabels: { color: '#475569', font: { size: 10, family: 'Inter' }, padding: 8 } } },
    plugins: { legend: { labels: { color: '#475569', font: { size: 11 } } } },
  };

  const donutData = {
    labels: ['Safe', 'Moderate', 'High Risk'],
    datasets: [{ data: [Math.max(0, 10-avgRisk)*10, Math.min(avgRisk,5)*10, Math.max(0,avgRisk-5)*10], backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'], borderColor: ['#10B981','#F59E0B','#EF4444'], borderWidth: 1.5, hoverOffset: 4 }]
  };
  const donutOpts = { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#475569', padding: 14, font: { size: 11 } } } } };

  const riskRows = [
    { label: 'Technical Risk',  s: avgRisk > 6 ? 'High' : avgRisk > 3 ? 'Medium' : 'Low' },
    { label: 'Market Risk',     s: market_risk },
    { label: 'Financial Risk',  s: investment_interest < 4 ? 'High' : investment_interest < 7 ? 'Medium' : 'Low' },
    { label: 'Execution Risk',  s: overall_score < 40 ? 'High' : overall_score < 65 ? 'Medium' : 'Low' },
  ];

  function RiskIcon({ s }) {
    if (s === 'Low')    return <CheckCircle2 style={{ width: 16, height: 16, color: '#10B981' }} />;
    if (s === 'Medium') return <AlertTriangle style={{ width: 16, height: 16, color: '#F59E0B' }} />;
    return <XCircle style={{ width: 16, height: 16, color: '#EF4444' }} />;
  }
  function RiskBadge({ s }) {
    if (s === 'Low')    return <span className="badge-green">Low</span>;
    if (s === 'Medium') return <span className="badge-yellow">Medium</span>;
    return <span className="badge-red">High</span>;
  }

  const swotItems = [
    { label: 'Strengths',     Icon: ThumbsUp,    items: strengths,     borderColor: 'rgba(16,185,129,0.2)',  bg: 'rgba(16,185,129,0.05)', headColor: '#10B981', dot: '#10B981' },
    { label: 'Weaknesses',    Icon: ThumbsDown,  items: weaknesses,    borderColor: 'rgba(239,68,68,0.2)',   bg: 'rgba(239,68,68,0.05)',  headColor: '#EF4444', dot: '#EF4444' },
    { label: 'Opportunities', Icon: ArrowUpRight, items: opportunities, borderColor: 'rgba(99,102,241,0.2)',  bg: 'rgba(99,102,241,0.05)', headColor: 'var(--accent)', dot: 'var(--accent)' },
    { label: 'Threats',       Icon: Flag,        items: threats,       borderColor: 'rgba(245,158,11,0.2)',  bg: 'rgba(245,158,11,0.05)', headColor: '#F59E0B', dot: '#F59E0B' },
  ];

  return (
    <div style={{ paddingBottom: 40 }} className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="no-print-buttons" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="section-title">Analysis Result</p>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginTop: 4, lineHeight: 1.3 }}>{startup_idea}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => window.print()} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            <Download style={{ width: 14, height: 14 }} /><span className="hidden sm:inline">Export PDF</span>
          </button>
          <button onClick={onReset} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            <RefreshCw style={{ width: 14, height: 14 }} /><span className="hidden sm:inline">New Analysis</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <MetricCard icon={Activity}   title="Overall Score"        value={overall_score}                  sublabel="Combined rating"        ring colorKey={scoreToColor(overall_score)}
          tooltip="Average of customer adoption, investor interest ×10, and inverted risk score ×10." />
        <MetricCard icon={Users}      title="Adoption Probability" value={customer_adoption_probability}  sublabel="Customer likelihood"    ring colorKey={scoreToColor(customer_adoption_probability)}
          tooltip="Average adoption probability predicted across all AI stakeholder agents." />
        <MetricCard icon={DollarSign} title="Investment Potential" value={`${investment_interest}/10`}   sublabel="Investor attractiveness" colorKey={investment_interest >= 7 ? 'green' : investment_interest >= 4 ? 'amber' : 'red'}
          tooltip="Interest score from the investor-persona agent (1–10)." />
        <MetricCard icon={Shield}     title="Market Risk"          value={market_risk}                    sublabel="Overall risk level"      colorKey={riskColorKey}
          tooltip="Derived from average risk score: below 4 = Low, 4–7 = Medium, above 7 = High." />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4 md:col-span-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Agent Radar</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Interest and adoption per agent</p>
            </div>
            <span className="badge-blue">{agent_responses.length} agents</span>
          </div>
          <div style={{ height: 280 }}><Radar data={radarData} options={radarOpts} /></div>
        </div>
        <div className="card p-4">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Risk Distribution</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>Across all agents</p>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={donutData} options={donutOpts} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <RiskBadge s={market_risk} />
          </div>
        </div>
      </div>

      {/* Market Fit */}
      <div className="card p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Target style={{ width: 16, height: 16, color: 'var(--text3)' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Market Fit</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Market Readiness',  val: customer_adoption_probability },
            { label: 'Overall Viability', val: overall_score                  },
            { label: 'Investor Interest', val: investment_interest * 10       },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{val}%</span>
              </div>
              <ProgressBar value={val} colorKey={val >= 65 ? 'green' : val >= 40 ? 'amber' : 'red'} />
            </div>
          ))}
        </div>
      </div>

      {/* Agent Insights */}
      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>Agent Insights</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {agent_responses.map((agent, i) => (
            <AgentCard key={i} agent={agent} />
          ))}
        </div>
      </div>

      {/* Risk Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Risk Analysis</p>
        </div>
        <div>
          {riskRows.map(({ label, s }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
              className="hover:bg-[var(--surface-hover)] transition-colors">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RiskIcon s={s} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ProgressBar value={s === 'Low' ? 25 : s === 'Medium' ? 60 : 90} colorKey={s === 'Low' ? 'green' : s === 'Medium' ? 'amber' : 'red'} className="w-20" />
                <RiskBadge s={s} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Lightbulb style={{ width: 16, height: 16, color: 'var(--accent)' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Recommendations</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggested_improvements.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius)', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SWOT */}
      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>SWOT Analysis</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {swotItems.map(({ label, Icon, items, borderColor, bg, headColor, dot }) => (
            <div key={label} style={{ borderRadius: 'var(--radius-lg)', border: `1px solid ${borderColor}`, background: bg, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: headColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                <Icon style={{ width: 13, height: 13 }} />{label}
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(items?.length ? items : ['No data available']).map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, marginTop: 6, flexShrink: 0 }} />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Research */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div>
            <p className="section-title">Competitor Research</p>
            {competitors
              ? competitors.tavily_used
                ? <p style={{ fontSize: 11, color: '#10B981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Live web search via Tavily</p>
                : <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} /> Groq training knowledge — add TAVILY_API_KEY for live data</p>
              : <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Searches the web for real competitors via Tavily</p>
            }
          </div>
          {!competitors && (
            <button onClick={handleResearchCompetitors} disabled={competitorLoading} className="btn-primary" style={{ fontSize: 12, padding: '8px 16px', opacity: competitorLoading ? 0.6 : 1 }}>
              {competitorLoading
                ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Researching...</>
                : <><Search style={{ width: 14, height: 14 }} /> Research Competitors</>
              }
            </button>
          )}
        </div>

        {competitorError && (
          <div className="card p-4" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
            <p style={{ fontSize: 13, color: '#F87171' }}>{competitorError}</p>
          </div>
        )}

        {!competitors && !competitorLoading && !competitorError && (
          <div className="card p-8" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', borderStyle: 'dashed' }}>
            <Search style={{ width: 28, height: 28, color: 'var(--text3)', marginBottom: 4 }} />
            <p style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>No competitor data yet</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Click "Research Competitors" to find who you're up against</p>
          </div>
        )}

        {competitors && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {competitors.competitors.map((c, i) => (
                <div key={i} className="card p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, lineHeight: 1.4 }}>{c.description}</p>
                    </div>
                    <span className={POSITION_STYLES[c.market_position] ?? 'badge-blue'} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{c.market_position}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div style={{ borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', padding: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Strengths</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {c.strengths.map((s, j) => (
                          <li key={j} style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10B981', marginTop: 5, flexShrink: 0 }} />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', padding: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Weaknesses</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {c.weaknesses.map((w, j) => (
                          <li key={j} style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#EF4444', marginTop: 5, flexShrink: 0 }} />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="card p-4" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TrendingUp style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market Gap</p>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{competitors.market_gap}</p>
              </div>
              <div className="card p-4" style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Zap style={{ width: 14, height: 14, color: '#10B981' }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your Advantage</p>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{competitors.your_advantage}</p>
              </div>
            </div>

            <button onClick={() => { setCompetitors(null); setCompetitorError(null); }} className="btn-ghost" style={{ fontSize: 12, alignSelf: 'flex-start' }}>
              <RefreshCw style={{ width: 12, height: 12 }} /> Re-research
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
