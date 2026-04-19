import { useState, useEffect } from 'react';
import {
  Layers, BarChart2, DollarSign, Download,
  ArrowRight, Zap, TrendingUp, Shield, ChevronRight, Clock
} from 'lucide-react';

function ScoreRing({ score, size = 52 }) {
  const col = score >= 75 ? '#10B981' : score >= 55 ? '#F59E0B' : '#EF4444';
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${col}88)` }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: col }}>{score}</span>
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 999, transition: 'width 1s ease' }} />
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon, color, subtitle }) {
  return (
    <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${color}22, transparent)`, borderRadius: '0 16px 0 100%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ padding: 9, background: `${color}18`, borderRadius: 10, border: `1px solid ${color}28` }}>
          <Icon size={18} color={color} />
        </div>
        {change !== undefined && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            background: change >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)',
            color: change >= 0 ? '#34D399' : '#F87171',
            border: `1px solid ${change >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(220,38,38,0.25)'}`,
          }}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 5, fontWeight: 500 }}>{label}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

function scoreLabel(s) {
  return s >= 75 ? 'Strong' : s >= 60 ? 'Promising' : s >= 45 ? 'Needs Work' : 'High Risk';
}

export default function MainDashboard({ history, onNewEval, onLoadReport, userName }) {
  const [hovered, setHovered] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const fn = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const total    = history.length;
  const avg      = total ? Math.round(history.reduce((s, e) => s + e.score, 0) / total) : 0;
  const strong   = history.filter(e => e.score >= 75).length;
  const promising = history.filter(e => e.score >= 55 && e.score < 75).length;
  const needsWork = history.filter(e => e.score < 55).length;
  const highInv  = history.filter(e => e.score >= 75).length;
  const recent   = history.slice(0, 4);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userName ? userName.split(/[@\s]/)[0] : 'there';

  const px = isMobile ? '16px' : '40px';

  return (
    <div style={{ padding: isMobile ? '24px 16px' : '40px', maxWidth: 1100, margin: '0 auto' }} className="animate-fade-in">

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            {greeting}, {displayName} 👋
          </h1>
          <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: 13 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={onNewEval} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 16px', flexShrink: 0 }}>
          <Zap size={14} /> New Evaluation
        </button>
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 28 }}>
        <StatCard label="Total Evaluations"    value={total || '0'}                  change={total ? 12 : undefined}  icon={Layers}    color="#2563EB" subtitle="All time" />
        <StatCard label="Avg. Viability Score" value={avg   || '—'}                  change={total ? 4  : undefined}  icon={BarChart2} color="#3B82F6" subtitle="Last 30 days" />
        <StatCard label="Investors Flagged"    value={highInv || '0'}                                                  icon={DollarSign} color="#0EA5E9" subtitle="High potential" />
        <StatCard label="Reports Exported"     value={Math.min(total, 8) || '0'}    change={total ? -2 : undefined}  icon={Download}  color="#10B981" subtitle="This month" />
      </div>

      {/* ── Main grid ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 300px', gap: 20 }}>

        {/* Recent evaluations */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)' }}>Recent Evaluations</h2>
            {history.length > 4 && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font)' }}>
                View all <ChevronRight size={12} />
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <div style={{ padding: '40px 24px', background: 'var(--surface)', border: '1px dashed var(--border-strong)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color="#2563EB" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No evaluations yet</p>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>Run your first validation to see results here.</p>
              </div>
              <button onClick={onNewEval} className="btn-primary" style={{ fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                Start Evaluating <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.map((ev, i) => (
                <div key={ev.id}
                  onMouseEnter={() => setHovered(ev.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onLoadReport(ev)}
                  style={{
                    padding: isMobile ? '14px' : '16px 20px', borderRadius: 14, cursor: 'pointer',
                    background: hovered === ev.id ? 'var(--surface-hover)' : 'var(--surface)',
                    border: `1px solid ${hovered === ev.id ? 'var(--border-strong)' : 'var(--border)'}`,
                    transition: 'all 0.18s', transform: hovered === ev.id && !isMobile ? 'translateX(3px)' : 'none',
                    display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16,
                  }}>
                  <ScoreRing score={ev.score} size={isMobile ? 44 : 52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{ev.idea}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {ev.date}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: ev.risk === 'Low' ? 'rgba(16,185,129,0.12)' : ev.risk === 'Medium' ? 'rgba(245,158,11,0.12)' : 'rgba(220,38,38,0.12)',
                        color: ev.risk === 'Low' ? '#34D399' : ev.risk === 'Medium' ? '#FBBF24' : '#F87171',
                        border: `1px solid ${ev.risk === 'Low' ? 'rgba(16,185,129,0.25)' : ev.risk === 'Medium' ? 'rgba(245,158,11,0.25)' : 'rgba(220,38,38,0.25)'}`,
                      }}>{ev.risk} Risk</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: ev.score >= 75 ? 'rgba(16,185,129,0.12)' : ev.score >= 55 ? 'rgba(245,158,11,0.12)' : 'rgba(220,38,38,0.12)',
                      color: ev.score >= 75 ? '#34D399' : ev.score >= 55 ? '#FBBF24' : '#F87171',
                      border: `1px solid ${ev.score >= 75 ? 'rgba(16,185,129,0.25)' : ev.score >= 55 ? 'rgba(245,158,11,0.25)' : 'rgba(220,38,38,0.25)'}`,
                    }}>{scoreLabel(ev.score)}</span>
                    {!isMobile && <ChevronRight size={13} color="var(--text3)" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: isTablet && !isMobile ? 'row' : 'column', gap: 16 }}>

          {/* Quick start */}
          <div onClick={onNewEval} style={{
            padding: 20, borderRadius: 16, cursor: 'pointer', flex: isTablet && !isMobile ? 1 : undefined,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(8,145,178,0.1))',
            border: '1px solid rgba(37,99,235,0.2)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ padding: 9, background: 'rgba(37,99,235,0.2)', borderRadius: 10, display: 'inline-flex', marginBottom: 12 }}>
              <Zap size={18} color="#60A5FA" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>Start New Evaluation</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 14 }}>
              Submit your idea and get a full AI analysis in under 60 seconds.
            </p>
            <button onClick={onNewEval} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
              Begin Now <ArrowRight size={13} />
            </button>
          </div>

          {/* Score distribution */}
          <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, flex: isTablet && !isMobile ? 1 : undefined }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>Score Distribution</h3>
            {[
              ['Strong (75–100)',   strong,     '#10B981'],
              ['Promising (55–74)', promising,  '#F59E0B'],
              ['Needs Work (<55)',  needsWork,  '#EF4444'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
                </div>
                <ProgressBar value={total ? (v / total) * 100 : 0} color={c} />
              </div>
            ))}
          </div>

          {/* Top risk flags */}
          <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, flex: isTablet && !isMobile ? 1 : undefined }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Top Risk Flags</h3>
            {[
              { label: 'Market saturation',   count: 7, icon: TrendingUp,  color: '#EF4444' },
              { label: 'Regulatory barriers', count: 5, icon: Shield,      color: '#F59E0B' },
              { label: 'Unit economics',       count: 4, icon: DollarSign, color: '#3B82F6' },
            ].map(r => {
              const Icon = r.icon;
              return (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ padding: 6, background: `${r.color}18`, borderRadius: 7, flexShrink: 0 }}>
                    <Icon size={12} color={r.color} />
                  </div>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{r.label}</span>
                  <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(220,38,38,0.12)', color: '#F87171', border: '1px solid rgba(220,38,38,0.25)' }}>{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
