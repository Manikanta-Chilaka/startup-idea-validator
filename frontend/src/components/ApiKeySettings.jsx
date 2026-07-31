import { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Save, Trash2, ExternalLink } from 'lucide-react';
import { loadLlmConfig, saveLlmConfig, clearLlmConfig, validateKey } from '../api';

const PROVIDERS = [
  {
    id: 'groq',
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    keyOptional: true,
    keysUrl: 'https://console.groq.com/keys',
    note: 'Leave the key blank to use the app’s free shared Groq key.',
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    defaultModel: 'gpt-4o-mini',
    keyOptional: false,
    keysUrl: 'https://platform.openai.com/api-keys',
    note: 'Your key is stored only in this browser and sent per request — never saved on our server.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-opus-5',
    keyOptional: false,
    keysUrl: 'https://console.anthropic.com/settings/keys',
    note: 'Your key is stored only in this browser and sent per request — never saved on our server.',
  },
];

const inputStyle = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none',
};

export default function ApiKeySettings() {
  const saved = loadLlmConfig();
  const [provider, setProvider] = useState(saved.provider || 'groq');
  const [apiKey, setApiKey]     = useState(saved.apiKey || '');
  const [model, setModel]       = useState(saved.model || '');
  const [showKey, setShowKey]   = useState(false);
  const [testing, setTesting]   = useState(false);
  const [result, setResult]     = useState(null);   // { ok, error?, model? }
  const [savedMsg, setSavedMsg] = useState('');

  const meta = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
  const activeProvider = saved.provider && saved.apiKey ? saved.provider : 'groq';

  const onProviderChange = (id) => {
    setProvider(id);
    setResult(null);
    setSavedMsg('');
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    const res = await validateKey({ provider, apiKey, model });
    setResult(res);
    setTesting(false);
  };

  const handleSave = () => {
    saveLlmConfig({ provider, apiKey: apiKey.trim(), model: model.trim() });
    setSavedMsg('Saved. New evaluations will use this provider.');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  const handleClear = () => {
    clearLlmConfig();
    setProvider('groq'); setApiKey(''); setModel(''); setResult(null);
    setSavedMsg('Cleared — back to the free Groq default.');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <KeyRound size={14} style={{ color: 'var(--accent)' }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Provider (bring your own key)</p>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
          Use your own model. Currently active:{' '}
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{(PROVIDERS.find(p => p.id === activeProvider) || PROVIDERS[0]).label}</span>.
        </p>

        {/* Provider picker */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PROVIDERS.map(p => {
            const active = provider === p.id;
            return (
              <button key={p.id} onClick={() => onProviderChange(p.id)}
                style={{
                  flex: '1 1 30%', minWidth: 100, padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)', transition: 'all 0.15s',
                  border: `1px solid ${active ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`,
                  background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg3)',
                  color: active ? '#60A5FA' : 'var(--text2)',
                }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* API key */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
            API Key {meta.keyOptional && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setResult(null); }}
              placeholder={meta.keyOptional ? 'Leave blank for the free default' : `Paste your ${meta.label} key`}
              autoComplete="off"
              style={{ ...inputStyle, paddingRight: 38 }}
            />
            <button onClick={() => setShowKey(s => !s)} tabIndex={-1}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <a href={meta.keysUrl} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', marginTop: 6, textDecoration: 'none' }}>
            Get a {meta.label} key <ExternalLink size={11} />
          </a>
        </div>

        {/* Model override */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
            Model <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            value={model}
            onChange={(e) => { setModel(e.target.value); setResult(null); }}
            placeholder={meta.defaultModel}
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>{meta.note}</p>

        {/* Test result */}
        {result && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, fontSize: 12,
            background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: result.ok ? '#10B981' : '#F87171',
          }}>
            {result.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span style={{ flex: 1 }}>
              {result.ok ? `Key works — responded with ${result.model}.` : `Failed: ${result.error}`}
            </span>
          </div>
        )}

        {savedMsg && (
          <div style={{ fontSize: 12, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={13} /> {savedMsg}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleTest} disabled={testing || (!meta.keyOptional && !apiKey.trim())}
            className="btn-ghost" style={{ fontSize: 12.5, opacity: (testing || (!meta.keyOptional && !apiKey.trim())) ? 0.5 : 1 }}>
            {testing ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={14} />}
            {testing ? 'Testing…' : 'Test key'}
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ fontSize: 12.5, padding: '8px 16px' }}>
            <Save size={14} /> Save
          </button>
          <button onClick={handleClear} className="btn-ghost" style={{ fontSize: 12.5, color: '#F87171', marginLeft: 'auto' }}>
            <Trash2 size={13} /> Clear key
          </button>
        </div>
      </div>
    </div>
  );
}
