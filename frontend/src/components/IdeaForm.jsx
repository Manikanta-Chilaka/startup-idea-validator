import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-zinc-100">Validate Your Startup Idea</h1>
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
          AI agents simulate real-world stakeholders — customers, investors, competitors — and deliver a 360° evaluation.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div>
            <label className="label-dark">Problem Statement</label>
            <textarea name="problem_statement" required rows={2} className="input-dark resize-none"
              placeholder="What exact problem are you solving? Who suffers from it?"
              value={form.problem_statement} onChange={set} />
          </div>

          <div>
            <label className="label-dark">Startup Idea</label>
            <textarea name="idea" required rows={3} className="input-dark resize-none"
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

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 mt-1">
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing...</>
              : <><span>Run Analysis</span><ArrowRight className="w-4 h-4 ml-auto" /></>
            }
          </button>
        </form>
      </div>

      <div className="mt-4">
        <p className="text-xs text-zinc-600 mb-2 uppercase tracking-wider font-medium">Examples</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_IDEAS.map((ex) => (
            <button key={ex.idea} type="button" onClick={() => setForm(ex)}
              className="text-xs text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
              {ex.idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
