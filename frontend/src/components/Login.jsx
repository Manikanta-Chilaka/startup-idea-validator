import { useState } from 'react';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, User, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

function getEmailRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();

  if (configuredUrl) return configuredUrl;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;

  return undefined;
}

export default function Login({ onBack }) {
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup' && !name) { setError('Please enter your name.'); return; }

    setLoading(true);
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } else {
      const emailRedirectTo = getEmailRedirectUrl();
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: name },
          emailRedirectTo,
        },
      });
      if (err) setError(err.message);
      else if (!data.session) {
        setMode('login');
        setPassword('');
        setInfo('Account created! Confirm your email then sign in below.');
      }
    }
    setLoading(false);
  };

  const switchMode = (next) => { setMode(next); setError(''); setInfo(''); };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'max(24px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.12) 0%, transparent 70%)',
    }}>
      {/* Back to landing */}
      {onBack && (
        <button onClick={onBack} style={{
          position: 'fixed', top: 24, left: 24, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)', transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
          <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
          Back
        </button>
      )}

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          }}>
            <Zap size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>Validate AI</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 6 }}>
            {mode === 'login' ? 'Welcome back — sign in to continue' : 'Create your free account'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          padding: 32, borderRadius: 20,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border-strong)',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        }}>
          {/* Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font)', fontSize: 13, fontWeight: mode === m ? 600 : 500,
                background: mode === m ? 'var(--surface-hover)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text2)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>{m === 'login' ? 'Sign In' : 'Sign Up'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                  <input className="input-dark" type="text" placeholder="Jordan Doe" value={name} onChange={e => setName(e.target.value)} style={{ paddingLeft: 40 }} autoComplete="name" />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input className="input-dark" type="email" placeholder="you@startup.com" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 40 }} autoComplete="email" />
              </div>
            </div>

            <div style={{ marginBottom: mode === 'login' ? 0 : 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input className="input-dark" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 40, paddingRight: 40 }} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#F87171', fontSize: 12, marginBottom: 16 }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />{error}
              </div>
            )}

            {info && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34D399', fontSize: 12, marginBottom: 16 }}>
                {info}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 4 }}>
              {loading
                ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : mode === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Google', '🔵'], ['GitHub', '⬛']].map(([p, emoji]) => (
              <button key={p} style={{
                padding: 10, background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: 'var(--text)', fontFamily: 'var(--font)', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                {emoji} {p}
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 20 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Terms</span> and{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
