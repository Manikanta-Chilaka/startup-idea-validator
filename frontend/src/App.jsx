import { useState, useEffect } from 'react';
import {
  LayoutDashboard, PlusCircle, History, FileText,
  Settings, Bell, Search, ChevronDown,
  Trash2, Clock, AlertCircle,
  CheckCircle2, Loader2, Zap, Menu, X
} from 'lucide-react';
import IdeaForm from './components/IdeaForm';
import Dashboard from './components/Dashboard';
import ScoreTrend from './components/ScoreTrend';
import { evaluateIdeaStream, checkHealth } from './api';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',    id: 'dashboard' },
  { icon: PlusCircle,      label: 'New Analysis', id: 'new' },
  { icon: History,         label: 'History',      id: 'history' },
  { icon: FileText,        label: 'Reports',      id: 'reports' },
  { icon: Settings,        label: 'Settings',     id: 'settings' },
];

const HISTORY_KEY = 'startup_validator_history';
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(e) { localStorage.setItem(HISTORY_KEY, JSON.stringify(e)); }

export default function App() {
  const [report, setReport]           = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState(null);
  const [activeNav, setActiveNav]     = useState('dashboard');
  const [health, setHealth]           = useState({ backend: false, ollama: false, checked: false });
  const [ideaHistory, setIdeaHistory] = useState(loadHistory);
  const [progress, setProgress]       = useState({ status: '', agents: [], completedAgents: [], activeAgent: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkHealth().then(h => setHealth({ ...h, checked: true }));
  }, []);

  // Close sidebar on nav click (mobile)
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
        const entry = { id: Date.now(), idea: finalReport.startup_idea, score: finalReport.overall_score, risk: finalReport.market_risk, date: new Date().toLocaleDateString(), report: finalReport };
        const updated = [entry, ...ideaHistory].slice(0, 20);
        setIdeaHistory(updated);
        saveHistory(updated);
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
  const handleClearHistory = () => { setIdeaHistory([]); saveHistory([]); };

  const aiLabel = !health.checked ? 'Checking...' : health.ollama ? 'Connected' : health.backend ? 'Groq offline' : 'Backend offline';
  const aiOk    = health.ollama;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-7 px-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">SV</span>
        </div>
        <span className="text-sm font-semibold text-zinc-100">Startup Validator</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        <p className="section-title px-3 mb-2">Menu</p>
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => (
          <div key={id} onClick={() => handleNavClick(id)} className={activeNav === id ? 'sidebar-item-active' : 'sidebar-item'}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {id === 'history' && ideaHistory.length > 0 && (
              <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-md">{ideaHistory.length}</span>
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      {/* AI Status */}
      <div className="mx-2 mb-3 px-3 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-800">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${aiOk ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-zinc-400">Groq AI</span>
          <span className={`ml-auto text-xs font-medium ${aiOk ? 'text-emerald-400' : 'text-red-400'}`}>{aiLabel}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-zinc-800 bg-[#0f0f11] py-5 px-3">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          {/* Drawer */}
          <aside className="relative z-10 w-[240px] flex flex-col border-r border-zinc-800 bg-[#0f0f11] py-5 px-3 animate-slide-right">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 shrink-0 border-b border-zinc-800 bg-[#0f0f11] flex items-center px-4 gap-3">
          {/* Hamburger — mobile only */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0">
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex-1 max-w-sm relative">
            <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input readOnly placeholder="New analysis..." onClick={() => handleNavClick('new')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-zinc-400 placeholder-zinc-600 cursor-pointer hover:border-zinc-700 transition-colors focus:outline-none" />
          </div>

          <div className="flex-1" />

          <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${aiOk ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${aiOk ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            {aiLabel}
          </div>

          <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-semibold">F</div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-zinc-600" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-20 md:pb-5">

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-500/8 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span className="text-sm">{error}</span></div>
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 ml-4 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 animate-fade-in">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="text-center w-full max-w-sm px-4">
                <p className="text-base font-semibold text-zinc-100">Analysing your idea...</p>
                <p className="text-sm text-zinc-500 mt-1">{progress.status || 'Initializing...'}</p>
                {progress.agents.length > 0 && (
                  <div className="mt-4 space-y-1.5 text-left">
                    {progress.agents.map((agent) => {
                      const done   = progress.completedAgents.includes(agent);
                      const active = !done && progress.activeAgent === agent;
                      return (
                        <div key={agent} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors ${done ? 'border-zinc-800 text-zinc-500' : active ? 'border-blue-500/30 bg-blue-500/5 text-zinc-200' : 'border-zinc-800 text-zinc-600'}`}>
                          {done   ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          : active ? <Loader2     className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-spin" />
                                   : <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />}
                          <span className="flex-1 truncate text-xs">{agent}</span>
                          {active && <span className="text-xs text-blue-400">Running</span>}
                          {done   && <span className="text-xs text-emerald-400">Done</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dashboard */}
          {!isLoading && activeNav === 'dashboard' && report && <Dashboard report={report} onReset={handleReset} />}

          {/* New Analysis */}
          {!isLoading && (activeNav === 'new' || (activeNav === 'dashboard' && !report)) && <IdeaForm onSubmit={handleSubmit} isLoading={isLoading} />}

          {/* History */}
          {!isLoading && activeNav === 'history' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div><p className="section-title">History</p><h2 className="text-lg font-semibold text-zinc-100 mt-1">Past Analyses</h2></div>
                {ideaHistory.length > 0 && <button onClick={handleClearHistory} className="btn-ghost text-red-400 hover:text-red-300 text-xs"><Trash2 className="w-3.5 h-3.5" /> Clear all</button>}
              </div>
              <ScoreTrend history={ideaHistory} />
              {ideaHistory.length === 0 ? (
                <div className="card p-12 flex flex-col items-center gap-2 text-center">
                  <History className="w-8 h-8 text-zinc-700 mb-1" />
                  <p className="text-zinc-400 font-medium text-sm">No analyses yet</p>
                  <p className="text-zinc-600 text-xs">Run your first validation to see it here.</p>
                  <button onClick={() => handleNavClick('new')} className="btn-primary mt-3 text-xs px-4 py-2"><PlusCircle className="w-3.5 h-3.5" /> New Analysis</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {ideaHistory.map(entry => (
                    <div key={entry.id} onClick={() => handleLoadHistory(entry)} className="card-hover px-4 py-3.5 flex items-center gap-4 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{entry.idea}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-600 flex items-center gap-1"><Clock className="w-3 h-3" />{entry.date}</span>
                          <span className={`text-xs font-medium ${entry.risk === 'Low' ? 'text-emerald-400' : entry.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>{entry.risk} Risk</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-zinc-100">{entry.score}%</p>
                        <p className="text-xs text-zinc-600">Score</p>
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
              <div><p className="section-title">Reports</p><h2 className="text-lg font-semibold text-zinc-100 mt-1">Saved Reports</h2></div>
              {ideaHistory.length === 0 ? (
                <div className="card p-12 flex flex-col items-center gap-2 text-center">
                  <FileText className="w-8 h-8 text-zinc-700 mb-1" />
                  <p className="text-zinc-400 font-medium text-sm">No reports saved</p>
                  <p className="text-zinc-600 text-xs">Completed analyses are saved automatically.</p>
                  <button onClick={() => handleNavClick('new')} className="btn-primary mt-3 text-xs px-4 py-2"><PlusCircle className="w-3.5 h-3.5" /> Run Analysis</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {ideaHistory.map(entry => (
                    <div key={entry.id} onClick={() => handleLoadHistory(entry)} className="card-hover p-4 flex flex-col gap-3 cursor-pointer">
                      <p className="text-sm font-medium text-zinc-200 line-clamp-2">{entry.idea}</p>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
                        <span className={`text-xs font-medium ${entry.risk === 'Low' ? 'text-emerald-400' : entry.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>{entry.risk} Risk</span>
                        <div className="text-right"><p className="text-sm font-bold text-zinc-100">{entry.score}%</p><p className="text-xs text-zinc-600">{entry.date}</p></div>
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
              <div><p className="section-title">Settings</p><h2 className="text-lg font-semibold text-zinc-100 mt-1">Application Settings</h2></div>
              <div className="card divide-y divide-zinc-800">
                <div className="px-4 py-3"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connections</p></div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm text-zinc-300">Backend</p><p className="text-xs text-zinc-600 truncate">API server</p></div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md shrink-0 ${health.backend ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>{health.backend ? 'Online' : 'Offline'}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm text-zinc-300">Groq AI</p><p className="text-xs text-zinc-600 truncate">llama-3.3-70b-versatile</p></div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md shrink-0 ${health.ollama ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>{health.ollama ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              <div className="card divide-y divide-zinc-800">
                <div className="px-4 py-3"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data</p></div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div><p className="text-sm text-zinc-300">Saved reports</p><p className="text-xs text-zinc-600">{ideaHistory.length} stored locally</p></div>
                  <button onClick={handleClearHistory} disabled={ideaHistory.length === 0} className="btn-ghost text-red-400 hover:text-red-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed shrink-0"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f11] border-t border-zinc-800 flex items-center justify-around px-2 py-2 safe-area-pb">
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => (
          <button key={id} onClick={() => handleNavClick(id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${activeNav === id ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label === 'New Analysis' ? 'New' : label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
