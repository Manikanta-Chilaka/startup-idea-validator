import { useState } from 'react';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';

const EXAMPLE_IDEAS = [
  {
    idea: "AI nutrition platform for women's hormonal health",
    target_audience: 'Women aged 25–45 managing hormonal conditions like PCOS or menopause',
    revenue_model: 'SaaS subscription with freemium and paid pro tier',
    problem_statement: 'Women with hormonal imbalances lack personalised nutrition guidance that accounts for their cycle and symptoms.',
  },
  {
    idea: 'Blockchain-based carbon credit marketplace for SMEs',
    target_audience: 'Small and medium enterprises seeking affordable carbon offsetting',
    revenue_model: 'Transaction fee on each credit traded',
    problem_statement: 'Existing carbon credit markets are inaccessible and opaque for SMEs due to high entry costs and complex verification.',
  },
  {
    idea: 'AR-powered interior design tool for homeowners',
    target_audience: 'Homeowners and renters aged 25–40 planning renovations',
    revenue_model: 'Freemium app with affiliate commissions on furniture purchases',
    problem_statement: 'People struggle to visualise how furniture will look in their space before buying, leading to costly returns.',
  },
];

const EMPTY = { idea: '', target_audience: '', revenue_model: '', problem_statement: '' };

export default function IdeaForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState(EMPTY);
  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }} className="animate-slide-up">
      {/* Hero heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 14 }}>
          <Sparkles style={{ width: 12, height: 12, color: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.05em' }}>AI-POWERED VALIDATION</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Validate Your{' '}
          <span className="grad-text">Startup Idea</span>
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
          AI agents simulate real-world stakeholders — customers, investors, competitors — and deliver a 360° evaluation.
        </p>
      </div>

      {/* Form card */}
      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label-dark">Problem Statement</label>
            <textarea name="problem_statement" required rows={2} className="input-dark" style={{ resize: 'none' }}
              placeholder="What exact problem are you solving? Who suffers from it?"
              value={form.problem_statement} onChange={set} />
          </div>

          <div>
            <label className="label-dark">Startup Idea</label>
            <textarea name="idea" required rows={3} className="input-dark" style={{ resize: 'none' }}
              placeholder="Describe your solution. What does it do and how does it work?"
              value={form.idea} onChange={set} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Target Audience</label>
              <input type="text" name="target_audience" required className="input-dark"
                placeholder="e.g. Small business owners, Gen Z"
                value={form.target_audience} onChange={set} />
            </div>
            <div>
              <label className="label-dark">Revenue Model</label>
              <input type="text" name="revenue_model" required className="input-dark"
                placeholder="e.g. SaaS, Marketplace, Freemium"
                value={form.revenue_model} onChange={set} />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', paddingTop: 12, paddingBottom: 12, marginTop: 4 }}>
            {isLoading
              ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Analysing your idea...</>
              : <><span>Run Analysis</span><ArrowRight style={{ width: 16, height: 16, marginLeft: 'auto' }} /></>
            }
          </button>
        </form>
      </div>

      {/* Examples */}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Try an example</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXAMPLE_IDEAS.map((ex) => (
            <button key={ex.idea} type="button" onClick={() => setForm(ex)}
              style={{ fontSize: 11, color: 'var(--text2)', border: '1px solid var(--border)', background: 'transparent', padding: '6px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent'; }}>
              {ex.idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
