import json
import asyncio
import logging
import re
import os
from typing import List
from groq import AsyncGroq
from dotenv import load_dotenv
from models import IdeaInput, AgentResponse, EvaluationReport

load_dotenv()

MODEL = "mixtral-8x7b-32768"   # fast, free-tier Groq model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _client() -> AsyncGroq:
    return AsyncGroq(api_key=os.environ["GROQ_API_KEY"])


def strip_emojis(text: str) -> str:
    pattern = re.compile(
        "[\U00010000-\U0010ffff"
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\u2600-\u26FF\u2700-\u27BF]+",
        flags=re.UNICODE,
    )
    return pattern.sub("", text).strip()


# ── Core LLM call ────────────────────────────────────────────────────────────

async def call_agent(system_prompt: str, user_prompt: str, agent_name: str) -> AgentResponse:
    full_prompt = (
        f"{user_prompt}\n\n"
        "Respond strictly in valid JSON with these keys:\n"
        "- interest_score (int 1-10)\n"
        "- risk_score (int 1-10)\n"
        "- adoption_probability (int 0-100)\n"
        "- concerns (list of strings)\n"
        "- opportunities (list of strings)\n"
        "- feedback (string)"
    )
    logger.info(f"Calling Groq for agent: {agent_name}")
    try:
        response = await _client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": full_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1024,
        )
        parsed = json.loads(response.choices[0].message.content)
        return AgentResponse(
            agent_name=strip_emojis(agent_name),
            interest_score=int(parsed.get("interest_score", 5)),
            risk_score=int(parsed.get("risk_score", 5)),
            adoption_probability=int(parsed.get("adoption_probability", 50)),
            concerns=[strip_emojis(c) for c in parsed.get("concerns", [])],
            opportunities=[strip_emojis(o) for o in parsed.get("opportunities", [])],
            feedback=strip_emojis(parsed.get("feedback", "No feedback provided.")),
        )
    except Exception as e:
        logger.error(f"Error calling {agent_name}: {e}")
        return AgentResponse(
            agent_name=agent_name,
            interest_score=5, risk_score=5, adoption_probability=50,
            concerns=["Failed to generate response"],
            opportunities=["Failed to generate response"],
            feedback=f"Error: {e}",
        )


# ── Agent role generator ──────────────────────────────────────────────────────

async def generate_agent_roles(idea_input: IdeaInput) -> List[dict]:
    system = (
        "You are an expert startup advisor. Analyse the startup idea and identify "
        "the 4 to 6 most critical stakeholders who should evaluate it for a 360-degree review."
    )
    user = (
        f"Startup Idea: {idea_input.idea}\n"
        f"Target Audience: {idea_input.target_audience}\n"
        f"Revenue Model: {idea_input.revenue_model}\n"
        f"Problem Statement: {idea_input.problem_statement}\n\n"
        "Return valid JSON with a single key 'agents' — a list of objects each containing "
        "'role', 'context', and 'evaluation_criteria'."
    )
    try:
        logger.info("Generating agent roles via Groq...")
        response = await _client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=1024,
        )
        parsed = json.loads(response.choices[0].message.content)
        agents_list = parsed.get("agents", [])
        if not agents_list:
            raise ValueError("Empty agents list returned")
        for a in agents_list:
            a["role"] = strip_emojis(a.get("role", "Agent"))
        return agents_list[:6]
    except Exception as e:
        logger.error(f"Error generating agents: {e}")
        return [
            {"role": "Customer Agent",   "context": "You are a potential customer.",          "evaluation_criteria": "Would you use it? Concerns, desired features."},
            {"role": "Investor Agent",   "context": "You are a venture capitalist.",           "evaluation_criteria": "Market potential, risks, scalability."},
            {"role": "Competitor Agent", "context": "You are a competing startup founder.",    "evaluation_criteria": "Weaknesses, competitive threats."},
        ]


# ── Aggregation helpers (shared by both entry points) ─────────────────────────

def _build_report(idea_input: IdeaInput, agents_data: List[AgentResponse]) -> EvaluationReport:
    adoption_probs = [a.adoption_probability for a in agents_data]
    adoption_score = sum(adoption_probs) // len(adoption_probs) if adoption_probs else 50
    avg_risk       = sum(a.risk_score for a in agents_data) / len(agents_data) if agents_data else 5

    market_risk = "Low" if avg_risk < 4 else "Medium" if avg_risk < 7 else "High"

    investor = next((a for a in agents_data if "investor" in a.agent_name.lower() or "capital" in a.agent_name.lower()), None)
    investment_interest = investor.interest_score if investor else sum(a.interest_score for a in agents_data) // len(agents_data)

    all_concerns:      List[str] = []
    all_opportunities: List[str] = []
    for a in agents_data:
        all_concerns.extend(a.concerns)
        all_opportunities.extend(a.opportunities)

    top_concerns = list(dict.fromkeys(all_concerns))[:3]
    top_opps     = list(dict.fromkeys(all_opportunities))[:2]
    suggestions  = [f"Address: {c}" for c in top_concerns if c.strip()]
    if top_opps:
        suggestions.append(f"Leverage opportunity: {top_opps[0]}")
    if len(suggestions) < 3:
        suggestions.append("Validate your pricing model with early adopters before scaling.")

    return EvaluationReport(
        startup_idea=idea_input.idea,
        customer_adoption_probability=int(adoption_score),
        investment_interest=int(investment_interest),
        market_risk=market_risk,
        strengths=list(dict.fromkeys(all_opportunities))[:3],
        weaknesses=list(dict.fromkeys(all_concerns))[:3],
        opportunities=list(dict.fromkeys(all_opportunities))[3:6] if len(all_opportunities) > 3 else all_opportunities,
        threats=list(dict.fromkeys(all_concerns))[-3:] if len(all_concerns) > 3 else all_concerns,
        suggested_improvements=suggestions[:5],
        overall_score=int((adoption_score + (investment_interest * 10) + ((10 - avg_risk) * 10)) / 3),
        agent_responses=agents_data,
    )


# ── Public entry points ───────────────────────────────────────────────────────

async def evaluate_idea(idea_input: IdeaInput) -> EvaluationReport:
    context = (
        f"Startup Idea: {idea_input.idea}\n"
        f"Target Audience: {idea_input.target_audience}\n"
        f"Revenue Model: {idea_input.revenue_model}\n"
        f"Problem Statement: {idea_input.problem_statement}"
    )
    generated_agents = await generate_agent_roles(idea_input)
    agents_data = list(await asyncio.gather(*[
        call_agent(
            f"{s['context']} Evaluate focusing on: {s['evaluation_criteria']}",
            context,
            s.get("role", "Agent"),
        )
        for s in generated_agents
    ]))
    return _build_report(idea_input, agents_data)


async def stream_evaluate_idea(idea_input: IdeaInput, queue: asyncio.Queue) -> None:
    context = (
        f"Startup Idea: {idea_input.idea}\n"
        f"Target Audience: {idea_input.target_audience}\n"
        f"Revenue Model: {idea_input.revenue_model}\n"
        f"Problem Statement: {idea_input.problem_statement}"
    )
    try:
        await queue.put({"type": "status", "message": "Generating specialised agents for your idea..."})
        generated_agents = await generate_agent_roles(idea_input)
        await queue.put({"type": "agents_ready", "agents": [a.get("role", "Agent") for a in generated_agents]})

        async def run_with_progress(agent_spec):
            name = agent_spec.get("role", "Agent")
            await queue.put({"type": "agent_start", "name": name})
            result = await call_agent(
                f"{agent_spec['context']} Evaluate focusing on: {agent_spec['evaluation_criteria']}",
                context, name,
            )
            await queue.put({"type": "agent_done", "name": name})
            return result

        # Groq supports real parallel calls — no semaphore needed
        agents_data: List[AgentResponse] = list(
            await asyncio.gather(*[run_with_progress(s) for s in generated_agents])
        )

        await queue.put({"type": "status", "message": "Aggregating results and building report..."})
        report = _build_report(idea_input, agents_data)
        await queue.put({"type": "result", "report": report.model_dump()})
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        await queue.put({"type": "error", "message": str(e)})
    finally:
        await queue.put({"type": "done"})
