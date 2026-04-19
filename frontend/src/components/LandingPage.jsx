import { useState, useEffect } from 'react';
import { Zap, Cpu, Activity, Globe, Target, DollarSign, Users, TrendingUp, Shield, ArrowRight, Star } from 'lucide-react';

const FEATURES = [
  { icon: Cpu,      label: 'Multi-Agent AI',       desc: 'Four specialized agents analyze your idea simultaneously from investor, customer, competitor, and regulatory perspectives.', color: '#2563EB' },
  { icon: Activity, label: 'Real-Time Streaming',  desc: "Watch AI agents think live. No waiting — see insights appear as they're generated via streaming inference.", color: '#0EA5E9' },
  { icon: Globe,    label: 'Market Intelligence',  desc: 'Retrieval-augmented analysis pulls live market data, competitor intel, and regulatory signals in real time.', color: '#0EA5E9' },
  { icon: Target,   label: 'Actionable Reports',   desc: 'Get a scored, structured report with SWOT analysis, investment probability, and prioritized next steps.', color: '#10B981' },
];

const TESTIMONIALS = [
  { name: 'Sonali',    role: 'Founder @ Sonali Labs',    score: 82, text: 'Validated our SaaS idea in minutes. The investor agent caught a monetization flaw we had completely missed.' },
  { name: 'Manikanta', role: 'Partner @ Loading Ventures', score: 91, text: 'We now run every pitch through Validate AI before taking a meeting. It surfaces blind spots instantly.' },
      
];

const AGENTS = [
  { label: 'Investor',   icon: DollarSign, color: '#2563EB', angle: 0   },
  { label: 'Customer',   icon: Users,      color: '#0EA5E9', angle: 90  },
  { label: 'Competitor', icon: TrendingUp, color: '#0EA5E9', angle: 180 },
  { label: 'Regulator',  icon: Shield,     color: '#10B981', angle: 270 },
];

function AgentViz({ activeIdx }) {
  const R = 110;
  return (
    <div style={{ position: 'relative', width: 280, height: 280 }}>
      {[1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: i * R * 1.0, height: i * R * 1.0,
          borderRadius: '50%', border: '1px solid var(--border)',
          animation: `orbitRing ${i * 8 + 6}s linear infinite`,
          pointerEvents: 'none',
        }} />
      ))}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', width: 60, height: 60,
        borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px rgba(37,99,235,0.5), 0 0 80px rgba(37,99,235,0.2)', zIndex: 10,
      }}>
        <Zap size={24} color="#fff" strokeWidth={2} />
      </div>
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={280} height={280}>
        {AGENTS.map((a, i) => {
          const rad = (a.angle - 90) * Math.PI / 180;
          const x2 = 140 + Math.cos(rad) * R;
          const y2 = 140 + Math.sin(rad) * R;
          return (
            <line key={i} x1="140" y1="140" x2={x2} y2={y2}
              stroke={activeIdx === i ? a.color : 'var(--border)'}
              strokeWidth={activeIdx === i ? 1.5 : 0.5}
              strokeDasharray={activeIdx === i ? '4 4' : undefined}
              style={{ transition: 'all 0.4s ease' }} />
          );
        })}
      </svg>
      {AGENTS.map((a, i) => {
        const rad = (a.angle - 90) * Math.PI / 180;
        const x = Math.cos(rad) * R;
        const y = Math.sin(rad) * R;
        const isActive = activeIdx === i;
        const Icon = a.icon;
        return (
          <div key={a.label} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            transition: 'all 0.4s ease', zIndex: 5,
          }}>
            <div style={{
              width: isActive ? 50 : 42, height: isActive ? 50 : 42, borderRadius: '50%',
              background: isActive ? a.color : 'var(--bg3)',
              border: `2px solid ${isActive ? a.color : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s ease',
              boxShadow: isActive ? `0 0 24px ${a.color}66` : 'none',
            }}>
              <Icon size={isActive ? 18 : 15} color={isActive ? '#fff' : 'var(--text3)'} />
            </div>
            {isActive && (
              <div style={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                marginTop: 5, fontSize: 9, fontWeight: 600, color: a.color,
                whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>{a.label}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled]           = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768);

  useEffect(() => {
    const el = document.getElementById('landing-scroll');
    if (!el) return;
    const fn = () => setScrolled(el.scrollTop > 40);
    el.addEventListener('scroll', fn);
    return () => el.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 4), 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const px = isMobile ? '20px' : '48px';

  return (
    <div id="landing-scroll" style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: `0 ${px}`, height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(6,12,24,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>Validate AI</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isMobile && (
            <button onClick={onGetStarted} style={{ padding: '7px 14px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'var(--text2)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)' }}>
              Sign in
            </button>
          )}
          <button onClick={onGetStarted} className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }}>
            {isMobile ? 'Sign In' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '48px 20px 60px' : '80px 48px 100px', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: '80%', height: 400, pointerEvents: 'none', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 80, alignItems: 'center' }}>
          {/* Copy */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.28)', marginBottom: 20 }}>
              <Zap size={10} color="#60A5FA" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#60A5FA', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Powered by LLaMA 70B + RAG</span>
            </div>
            <h1 style={{ fontSize: isMobile ? 36 : 'clamp(36px,4.5vw,56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 20 }}>
              Validate Your<br />
              <span style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Startup Idea
              </span><br />
              with AI Agents
            </h1>
            <p style={{ fontSize: isMobile ? 15 : 17, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 32, maxWidth: isMobile ? '100%' : 480 }}>
              Four specialized AI agents evaluate your idea from every angle — investor viability, market fit, competitive landscape, and regulatory risk. In under 60 seconds.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <button onClick={onGetStarted} className="btn-primary" style={{ fontSize: 15, padding: '13px 24px' }}>
                Start Free Evaluation <ArrowRight size={16} />
              </button>
              <button onClick={onGetStarted} style={{ padding: '13px 24px', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font)' }}>
                View Demo
              </button>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 24 : 32, marginTop: 32, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {[['500+', 'Ideas validated'], ['94%', 'Accuracy rate'], ['< 60s', 'Analysis time']].map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent viz */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ animation: 'float 3s ease-in-out infinite' }}>
              <AgentViz activeIdx={activeFeature} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '60px 20px' : '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.28)', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#38BDF8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Features</span>
          </div>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>Everything you need to validate faster</h2>
          <p style={{ color: 'var(--text2)', fontSize: isMobile ? 14 : 16 }}>Built for founders who move fast and investors who need signal.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isActive = activeFeature === i;
            return (
              <div key={f.label} onClick={() => setActiveFeature(i)} style={{
                padding: isMobile ? '20px' : '28px', borderRadius: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                background: 'var(--surface)', border: `1px solid ${isActive ? `${f.color}44` : 'var(--border)'}`,
                transition: 'all 0.2s ease',
                transform: isActive ? 'translateY(-2px)' : 'none',
                boxShadow: isActive ? `0 8px 32px ${f.color}22` : 'none',
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle at top right, ${f.color}18, transparent)`, borderRadius: '0 16px 0 100%' }} />
                <div style={{ padding: 10, background: `${f.color}18`, borderRadius: 10, display: 'inline-flex', marginBottom: 14 }}>
                  <Icon size={20} color={f.color} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.01em' }}>{f.label}</h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section style={{ padding: isMobile ? '60px 20px' : '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Trusted by founders & VCs</span>
          </div>
          <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: '-0.03em' }}>What builders are saying</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={13} color="#F59E0B" fill="#F59E0B" />)}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{t.role}</div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: t.score >= 80 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  color: t.score >= 80 ? '#34D399' : '#FBBF24',
                  border: `1px solid ${t.score >= 80 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                }}>{t.score}/100</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '60px 20px 80px' : '80px 48px 120px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 600, margin: '0 auto', padding: isMobile ? '40px 24px' : '60px 40px',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(8,145,178,0.08))',
          border: '1px solid rgba(37,99,235,0.2)', borderRadius: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Zap size={22} color="#60A5FA" />
          </div>
          <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14 }}>Ready to validate your idea?</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 28, fontSize: isMobile ? 14 : 15, lineHeight: 1.65 }}>
            Join 500+ founders who've used AI to stress-test their ideas before raising.
          </p>
          <button onClick={onGetStarted} className="btn-primary" style={{ fontSize: isMobile ? 14 : 16, padding: isMobile ? '12px 24px' : '16px 36px' }}>
            Start Free — No Credit Card <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ padding: `20px ${px}`, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={13} color="#2563EB" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Validate AI</span>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 6 }}>© 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Privacy', 'Terms', 'API Docs', 'Blog'].map(l => (
            <span key={l} style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
