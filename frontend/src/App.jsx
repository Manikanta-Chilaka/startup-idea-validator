import { useState, useEffect } from 'react';
import {
  LayoutDashboard, PlusCircle, History, FileText,
  Settings, Bell, Search, ChevronRight,
  Trash2, Clock, AlertCircle,
  CheckCircle2, Loader2, Zap, Menu, X,
  ChevronLeft, LogOut
} from 'lucide-react';
import IdeaForm from './components/IdeaForm';
import Dashboard from './components/Dashboard';
import ScoreTrend from './components/ScoreTrend';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import MainDashboard from './components/MainDashboard';
import { evaluateIdeaStream, checkHealth } from './api';
import { supabase } from './supabaseClient';
import { loadEvaluations, saveEvaluation, clearEvaluations } from './supabaseDB';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',    id: 'dashboard' },
  { icon: PlusCircle,      label: 'New Evaluation', id: 'new' },
  { icon: History,         label: 'History',      id: 'history' },
  { icon: FileText,        label: 'Reports',      id: 'reports' },
  { icon: Settings,        label: 'Settings',     id: 'settings' },
];


export default function App() {
  const [session, setSession]             = useState(null);
  const [authReady, setAuthReady]         = useState(false);
  const [showAuth, setShowAuth]           = useState(false);
  const [report, setReport]               = useState(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [activeNav, setActiveNav]         = useState('dashboard');
  const [health, setHealth]               = useState({ backend: false, ollama: false, tavily: false, model: '', checked: false });
  const [ideaHistory, setIdeaHistory]     = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [progress, setProgress]           = useState({ status: '', agents: [], completedAgents: [], activeAgent: null });
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    checkHealth().then(h => setHealth({ ...h, checked: true }));
  }, []);

  useEffect(() => {
    if (!session) { setIdeaHistory([]); return; }

    setHistoryLoading(true);
    loadEvaluations(session.user.id)
      .then(setIdeaHistory)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));

    const channel = supabase
      .channel('evaluations-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evaluations', filter: `user_id=eq.${session.user.id}` },
        () => {
          loadEvaluations(session.user.id).then(setIdeaHistory).catch(console.error);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  if (!authReady) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(37,99,235,0.2)', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!session && !showAuth) return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  if (!session) return <Login onBack={() => setShowAuth(false)} />;

  const handleLogout = () => supabase.auth.signOut();

  const handleNavClick = (id) => {
    setActiveNav(id);
    setSidebarOpen(false);
    if (id === 'new') { setReport(null); setError(null); }
  };

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    setProgress({ status: '', agents: [], completedAgents: [], activeAgent: null });
    try {
      let finalReport = null;
      await evaluateIdeaStream(formData, (event) => {
        if (event.type === 'status')            setProgress(p => ({ ...p, status: event.message }));
        else if (event.type === 'agents_ready') setProgress(p => ({ ...p, agents: event.agents, status: 'Consulting agents in parallel...' }));
        else if (event.type === 'agent_start')  setProgress(p => ({ ...p, activeAgent: event.name }));
        else if (event.type === 'agent_done')   setProgress(p => ({ ...p, completedAgents: [...p.completedAgents, event.name], activeAgent: null }));
        else if (event.type === 'result')       finalReport = event.report;
      });
      if (finalReport) {
        setReport(finalReport);
        const entry = {
          idea: finalReport.startup_idea,
          score: finalReport.overall_score,
          risk: finalReport.market_risk,
          date: new Date().toLocaleDateString(),
          report: finalReport,
        };
        try {
          const dbId = await saveEvaluation(session.user.id, entry);
          entry.id = dbId;
        } catch (dbErr) {
          console.error('Failed to save to cloud:', dbErr);
          entry.id = Date.now();
        }
        setIdeaHistory(prev => [entry, ...prev].slice(0, 50));
        setActiveNav('dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Make sure the backend is running and Groq API key is set.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset        = () => { setReport(null); setError(null); setActiveNav('new'); };
  const handleLoadHistory  = (entry) => { setReport(entry.report); setActiveNav('dashboard'); };
  const handleClearHistory = async () => {
    setIdeaHistory([]);
    try { await clearEvaluations(session.user.id); }
    catch (err) { console.error('Failed to clear cloud history:', err); }
  };

  const aiOk    = health.ollama;
  const aiLabel = !health.checked ? 'Checking...' : aiOk ? 'Connected' : health.backend ? 'Groq offline' : 'Backend offline';

  const SidebarNav = ({ collapsed }) => (
    <>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 16px' : '24px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', flexShrink: 0 }}>
              <Zap size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>Validate AI</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Startup Intelligence</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setSidebarCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, borderRadius: 6 }}>
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* New Evaluation CTA */}
      <div style={{ padding: collapsed ? '12px 8px' : '12px 12px 4px' }}>
        {!collapsed && (
          <button onClick={() => handleNavClick('new')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer', background: activeNav === 'new' ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : 'rgba(37,99,235,0.1)', color: activeNav === 'new' ? '#fff' : '#60A5FA', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', transition: 'all 0.15s', border: '1px solid rgba(37,99,235,0.2)' }}>
            <PlusCircle size={15} />
            New Evaluation
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.filter(n => n.id !== 'new').map(({ icon: Icon, label, id }) => {
          const active = activeNav === id;
          return (
            <button key={id} onClick={() => handleNavClick(id)} title={collapsed ? label : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? 10 : '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', background: active ? 'var(--surface-hover)' : 'transparent', color: active ? 'var(--text)' : 'var(--text2)', fontSize: 13, fontWeight: active ? 600 : 500, transition: 'all 0.15s', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', position: 'relative' }}>
              {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />}
              <Icon size={16} color={active ? 'var(--accent)' : 'currentColor'} />
              {!collapsed && label}
              {!collapsed && id === 'history' && ideaHistory.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--surface-hover)', color: 'var(--text2)', padding: '2px 7px', borderRadius: 6 }}>{ideaHistory.length}</span>
              )}
            </button>
          );
        })}
        {collapsed && (
          <button onClick={() => handleNavClick('new')} title="New Evaluation"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', background: activeNav === 'new' ? 'rgba(37,99,235,0.2)' : 'transparent', color: '#60A5FA', transition: 'all 0.15s', width: '100%' }}>
            <PlusCircle size={16} />
          </button>
        )}
      </nav>

      {/* AI Status + Expand */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        {collapsed ? (
          <button onClick={() => setSidebarCollapsed(false)} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <ChevronRight size={15} />
          </button>
        ) : (
          <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: aiOk ? '#10B981' : '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>Groq AI</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: aiOk ? '#10B981' : '#EF4444' }}>{aiLabel}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex flex-col shrink-0" style={{ width: sidebarCollapsed ? 64 : 240, minWidth: sidebarCollapsed ? 64 : 240, background: 'var(--bg2)', borderRight: '1px solid var(--border)', transition: 'width 0.25s ease', overflow: 'hidden', position: 'sticky', top: 0, height: '100vh' }}>
        <SidebarNav collapsed={sidebarCollapsed} />
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col animate-slide-right" style={{ width: 240, background: 'var(--bg2)', borderRight: '1px solid var(--border)' }}>
            <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 16, right: 12, padding: 6, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
              <X size={16} />
            </button>
            <SidebarNav collapsed={false} />
          </aside>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 shrink-0 flex items-center px-4 gap-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg transition-colors shrink-0" style={{ color: 'var(--text3)', border: 'none', background: 'none', cursor: 'pointer' }}>
            <Menu size={18} />
          </button>

          <div className="flex-1 max-w-sm relative">
            <Search size={14} style={{ color: 'var(--text3)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input readOnly placeholder="New evaluation..." onClick={() => handleNavClick('new')}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, paddingLeft: 36, paddingRight: 16, paddingTop: 7, paddingBottom: 7, fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }} />
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500, color: aiOk ? '#10B981' : 'var(--text3)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: aiOk ? '#10B981' : 'var(--text3)' }} />
            {aiLabel}
          </div>

          <button style={{ padding: 6, borderRadius: 8, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Bell size={16} />
          </button>

          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }} title={session?.user?.user_metadata?.full_name || session?.user?.email}>
            {(session?.user?.user_metadata?.full_name || session?.user?.email || 'U').charAt(0).toUpperCase()}
          </div>

          <button onClick={handleLogout} title="Sign out" style={{ padding: 6, borderRadius: 8, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={16} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">

          {error && (
            <div className="mb-5 flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              <div className="flex items-center gap-2"><AlertCircle size={16} className="shrink-0" /><span style={{ fontSize: 13 }}>{error}</span></div>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', opacity: 0.5, fontSize: 18, lineHeight: 1 }}>&times;</button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 animate-fade-in">
              <div className="relative">
                <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap size={20} style={{ color: 'var(--accent)' }} />
                </div>
              </div>
              <div className="text-center w-full max-w-sm px-4">
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>Analysing your idea...</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{progress.status || 'Initializing...'}</p>
                {progress.agents.length > 0 && (
                  <div className="mt-4 space-y-2 text-left">
                    {progress.agents.map((agent) => {
                      const done   = progress.completedAgents.includes(agent);
                      const active = !done && progress.activeAgent === agent;
                      return (
                        <div key={agent} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`, background: active ? 'rgba(99,102,241,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                          {done
                            ? <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                            : active
                            ? <Loader2 size={14} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
                            : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }} />
                          }
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: done ? 'var(--text3)' : active ? 'var(--text)' : 'var(--text3)' }}>{agent}</span>
                          {active && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Running</span>}
                          {done   && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Done</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && activeNav === 'dashboard' && !report && (
            <MainDashboard
              history={ideaHistory}
              onNewEval={() => handleNavClick('new')}
              onLoadReport={handleLoadHistory}
              userName={session?.user?.user_metadata?.full_name || session?.user?.email}
            />
          )}
          {!isLoading && activeNav === 'dashboard' && report && <Dashboard report={report} onReset={handleReset} />}
          {!isLoading && activeNav === 'new' && <IdeaForm onSubmit={handleSubmit} isLoading={isLoading} />}

          {/* History */}
          {!isLoading && activeNav === 'history' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div><p className="section-title">History</p><h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4, letterSpacing: '-0.02em' }}>Past Analyses</h2></div>
                {ideaHistory.length > 0 && <button onClick={handleClearHistory} className="btn-ghost" style={{ color: '#F87171', fontSize: 12 }}><Trash2 size={13} /> Clear all</button>}
              </div>
              <ScoreTrend history={ideaHistory} />
              {ideaHistory.length === 0 ? (
                <div className="card p-12 flex flex-col items-center gap-2 text-center">
                  <History size={32} style={{ color: 'var(--text3)', marginBottom: 4 }} />
                  <p style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 14 }}>No analyses yet</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12 }}>Run your first validation to see it here.</p>
                  <button onClick={() => handleNavClick('new')} className="btn-primary mt-3" style={{ fontSize: 12, padding: '8px 16px' }}><PlusCircle size={13} /> New Analysis</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {ideaHistory.map(entry => (
                    <div key={entry.id} onClick={() => handleLoadHistory(entry)} className="card-hover px-4 py-3.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.idea}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{entry.date}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: entry.risk === 'Low' ? '#10B981' : entry.risk === 'Medium' ? '#F59E0B' : '#EF4444' }}>{entry.risk} Risk</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{entry.score}%</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)' }}>Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {!isLoading && activeNav === 'reports' && (
            <div className="space-y-4 animate-fade-in">
              <div><p className="section-title">Reports</p><h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4, letterSpacing: '-0.02em' }}>Saved Reports</h2></div>
              {ideaHistory.length === 0 ? (
                <div className="card p-12 flex flex-col items-center gap-2 text-center">
                  <FileText size={32} style={{ color: 'var(--text3)', marginBottom: 4 }} />
                  <p style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 14 }}>No reports saved</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12 }}>Completed analyses are saved automatically.</p>
                  <button onClick={() => handleNavClick('new')} className="btn-primary mt-3" style={{ fontSize: 12, padding: '8px 16px' }}><PlusCircle size={13} /> Run Analysis</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {ideaHistory.map(entry => (
                    <div key={entry.id} onClick={() => handleLoadHistory(entry)} className="card-hover p-4 flex flex-col gap-3">
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.idea}</p>
                      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: entry.risk === 'Low' ? '#10B981' : entry.risk === 'Medium' ? '#F59E0B' : '#EF4444' }}>{entry.risk} Risk</span>
                        <div className="text-right"><p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{entry.score}%</p><p style={{ fontSize: 11, color: 'var(--text3)' }}>{entry.date}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {!isLoading && activeNav === 'settings' && (
            <div className="space-y-4 animate-fade-in max-w-md">
              <div><p className="section-title">Settings</p><h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4, letterSpacing: '-0.02em' }}>Application Settings</h2></div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Connections</p>
                </div>
                {[
                  { label: 'Backend', sub: 'API server', ok: health.backend },
                  { label: 'Groq AI', sub: health.model || 'llama-3.3-70b-versatile', ok: health.ollama },
                  { label: 'Tavily Search', sub: 'Real-time competitor research', ok: health.tavily, warn: true },
                ].map(({ label, sub, ok, warn }) => (
                  <div key={label} className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="min-w-0"><p style={{ fontSize: 13, color: 'var(--text)' }}>{label}</p><p style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p></div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, flexShrink: 0, background: ok ? 'rgba(16,185,129,0.12)' : warn ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: ok ? '#10B981' : warn ? '#F59E0B' : '#EF4444', border: `1px solid ${ok ? 'rgba(16,185,129,0.25)' : warn ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                      {ok ? (label === 'Tavily Search' ? 'Connected' : 'Online') : (warn ? 'Key not set' : 'Offline')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Data</p>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div><p style={{ fontSize: 13, color: 'var(--text)' }}>Saved reports</p><p style={{ fontSize: 11, color: 'var(--text3)' }}>{historyLoading ? 'Loading…' : `${ideaHistory.length} stored in cloud`}</p></div>
                  <button onClick={handleClearHistory} disabled={ideaHistory.length === 0} className="btn-ghost shrink-0" style={{ color: '#F87171', fontSize: 12 }}><Trash2 size={13} /> Clear</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 safe-area-pb" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => (
          <button key={id} onClick={() => handleNavClick(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none', color: activeNav === id ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.15s', fontFamily: 'var(--font)' }}>
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label === 'New Evaluation' ? 'New' : label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
