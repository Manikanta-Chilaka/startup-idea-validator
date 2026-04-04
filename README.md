# Startup Idea Validator

A multi-agent AI system that evaluates startup ideas through the lens of real-world stakeholders — investors, customers, competitors, regulators, and more — delivering a 360° analysis report.

Built as a college project using FastAPI, React, and Groq AI.

---

## Features

- **Dynamic AI Agents** — Groq AI generates 4–6 unique stakeholder personas tailored to each idea (investor, customer, competitor, regulator, etc.)
- **Parallel Evaluation** — All agents run simultaneously for fast results
- **Real-time Progress** — SSE streaming shows each agent's status as it evaluates
- **Detailed Report** — Overall score, adoption probability, investment interest, market risk, SWOT analysis, and agent-specific feedback
- **Read More / Show Less** — Long agent feedback is collapsed by default
- **PDF Export** — Download the full report as a PDF
- **History** — Past analyses saved locally in the browser
- **Responsive Design** — Works on mobile (bottom nav + drawer) and desktop (sidebar)

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API + SSE streaming |
| Groq SDK | LLM calls (llama-3.3-70b-versatile) |
| Pydantic v2 | Request/response validation |
| Python 3.11 | Runtime |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework |
| Tailwind CSS | Styling |
| Chart.js | Radar + Doughnut charts |
| html2canvas + jsPDF | PDF export |
| Lucide React | Icons |

---

## Project Structure

```
startup-idea-validator/
├── backend/
│   ├── agents.py          # Agent generation + LLM calls + report aggregation
│   ├── main.py            # FastAPI routes (/evaluate, /evaluate-stream, /health)
│   ├── models.py          # Pydantic models
│   ├── requirements.txt
│   └── runtime.txt        # Python 3.11 pin for Render
└── frontend/
    ├── src/
    │   ├── App.jsx         # Main layout, routing, SSE handling
    │   ├── api.js          # API calls + SSE stream reader
    │   ├── index.css       # Tailwind + custom components
    │   └── components/
    │       ├── Dashboard.jsx   # Report display, charts, PDF export
    │       └── IdeaForm.jsx    # Idea submission form
    └── package.json
```

---

## How It Works

1. User submits a startup idea with target audience, revenue model, and problem statement
2. Backend calls Groq to **generate 4–6 stakeholder agents** specific to that idea
3. All agents are called **in parallel** via `asyncio.gather()`, each with:
   - A unique role identity and background
   - Scoring rubrics to prevent generic middle-range scores
   - A directive to evaluate critically from their perspective
4. Scores are aggregated into an `EvaluationReport` with overall score, SWOT, risk levels, and improvement suggestions
5. Results stream back to the frontend via **Server-Sent Events** in real time

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_key_here" > .env

python main.py
# Runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

npm run dev
# Runs on http://localhost:5173
```

---

## Deployment

### Backend — Render

1. Connect your GitHub repo in [Render](https://render.com)
2. New Web Service → set **Root Directory** to `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `GROQ_API_KEY = your_key_here`
6. `runtime.txt` pins Python 3.11 automatically

### Frontend — Vercel

1. Connect your GitHub repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable: `VITE_API_URL = https://your-render-backend.onrender.com`
4. Deploy — Vercel auto-detects Vite

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Check backend + Groq connectivity |
| `POST` | `/api/evaluate` | Full evaluation (returns JSON) |
| `POST` | `/api/evaluate-stream` | Streaming evaluation via SSE |

### Request body (`/api/evaluate`)
```json
{
  "idea": "AI nutrition platform for women's hormonal health",
  "target_audience": "Women aged 25–45 with PCOS or menopause",
  "revenue_model": "SaaS — Freemium + $12/month Pro",
  "problem_statement": "No personalised nutrition guidance accounts for hormonal cycles"
}
```

---

## Scoring System

Each agent scores the idea from its own stakeholder perspective:

| Metric | Source |
|---|---|
| **Overall Score** | `(adoption + interest×10 + (10−risk)×10) / 3` |
| **Adoption Probability** | Average across all agents (0–100) |
| **Investment Interest** | Investor agent's interest score (1–10) |
| **Market Risk** | Low if avg risk < 4, High if > 7 |

Agents use explicit rubrics — a skeptical regulator will score very differently from an enthusiastic customer.

---

## Built By

Manikanta Chilaka — College Project, 2025
