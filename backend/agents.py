import json
import asyncio
import logging
import re
import os
from typing import List
from dotenv import load_dotenv
from tavily import TavilyClient
from models import IdeaInput, AgentResponse, EvaluationReport, Competitor, CompetitorReport
from llm import LLM

load_dotenv()

# Default model surfaced by the health endpoint (the free Groq default).
MODEL = "llama-3.3-70b-versatile"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cap concurrent LLM calls to stay within free-tier rate limits (429).
_llm_sem = asyncio.Semaphore(4)


def _clamp(val, lo: int, hi: int, default: int) -> int:
    """Coerce a model-returned value to an int within [lo, hi], falling back to default."""
    try:
        v = int(val)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, v))


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

async def call_agent(llm: LLM, agent_role: str, role_context: str, evaluation_criteria: str, idea_context: str) -> AgentResponse:
    system_prompt = (
        f"You are {agent_role}. {role_context} "
        "You have strong opinions and give honest, critical assessments. "
        "You do NOT give polite or average scores — you score based on your real-world experience and perspective."
    )
    full_prompt = (
        f"STARTUP IDEA TO EVALUATE:\n{idea_context}\n\n"
        f"YOUR IDENTITY: {agent_role}\n"
        f"YOUR BACKGROUND: {role_context}\n"
        f"EVALUATE SPECIFICALLY ON: {evaluation_criteria}\n\n"
        "Score strictly from YOUR role's viewpoint — a skeptical investor scores very differently from an "
        "excited early adopter. Do NOT give neutral scores. Be direct and honest.\n\n"
        "Respond in valid JSON with these keys:\n\n"
        "interest_score (int 1-10):\n"
        "  1-3 = you would never back/use/recommend this\n"
        "  4-6 = lukewarm, major concerns from YOUR perspective\n"
        "  7-8 = genuinely interested from YOUR role's standpoint\n"
        "  9-10 = exceptional, you would act on this immediately\n\n"
        "risk_score (int 1-10) — risk as YOU perceive it from your role:\n"
        "  1-3 = low risk, proven model, clear demand\n"
        "  4-6 = moderate risk, typical startup uncertainty\n"
        "  7-8 = high risk, major unknowns or structural problems\n"
        "  9-10 = extremely risky, likely to fail\n\n"
        "adoption_probability (int 0-100) — from YOUR perspective:\n"
        "  0-30 = your stakeholder group would ignore or reject this\n"
        "  31-55 = niche appeal, slow uptake\n"
        "  56-75 = solid potential with right execution\n"
        "  76-100 = strong demand, fast adoption\n\n"
        "concerns (list of 2-4 strings): specific issues from YOUR role's viewpoint\n"
        "opportunities (list of 2-3 strings): specific upsides YOU see\n"
        "feedback (string): 2-3 sentences, blunt and specific to this idea from YOUR perspective"
    )
    logger.info(f"Calling {llm.provider} for agent: {agent_role}")
    try:
        async with _llm_sem:
            for attempt in range(3):
                try:
                    parsed = await llm.complete_json(
                        system_prompt, full_prompt, temperature=0.85, max_tokens=1024,
                    )
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        wait = 2 ** attempt  # 1s, 2s
                        logger.warning(f"Rate limited, retrying in {wait}s ({agent_role})")
                        await asyncio.sleep(wait)
                    else:
                        raise
        return AgentResponse(
            agent_name=strip_emojis(agent_role),
            interest_score=int(parsed.get("interest_score", 5)),
            risk_score=int(parsed.get("risk_score", 5)),
            adoption_probability=int(parsed.get("adoption_probability", 50)),
            concerns=[strip_emojis(c) for c in parsed.get("concerns", [])],
            opportunities=[strip_emojis(o) for o in parsed.get("opportunities", [])],
            feedback=strip_emojis(parsed.get("feedback", "No feedback provided.")),
        )
    except Exception as e:
        logger.error(f"Error calling {agent_role}: {e}")
        return AgentResponse(
            agent_name=agent_role,
            interest_score=5, risk_score=5, adoption_probability=50,
            concerns=["Failed to generate response"],
            opportunities=["Failed to generate response"],
            feedback=f"Error: {e}",
        )


# ── Agent role generator ──────────────────────────────────────────────────────

async def generate_agent_roles(llm: LLM, idea_input: IdeaInput) -> List[dict]:
    system = (
        "You are an expert startup advisor. Analyse the startup idea and identify "
        "the 4 to 6 most critical stakeholders who should evaluate it for a 360-degree review. "
        "Each agent must have a distinct, opinionated perspective — some should be skeptical or critical, "
        "not all optimistic. Include at least one skeptic (e.g. a competitor, regulator, or burned customer)."
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
        logger.info(f"Generating agent roles via {llm.provider}...")
        parsed = await llm.complete_json(system, user, temperature=0.5, max_tokens=1024)
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

# Effective scores prefer the post-debate (revised) value when present, else round 1.
def _eff_interest(a: AgentResponse) -> int:
    return a.revised_interest_score if a.revised_interest_score is not None else a.interest_score

def _eff_risk(a: AgentResponse) -> int:
    return a.revised_risk_score if a.revised_risk_score is not None else a.risk_score

def _eff_adoption(a: AgentResponse) -> int:
    return a.revised_adoption_probability if a.revised_adoption_probability is not None else a.adoption_probability


def _build_report(idea_input: IdeaInput, agents_data: List[AgentResponse], debate_summary: str = "") -> EvaluationReport:
    adoption_probs = [_eff_adoption(a) for a in agents_data]
    adoption_score = sum(adoption_probs) // len(adoption_probs) if adoption_probs else 50
    avg_risk       = sum(_eff_risk(a) for a in agents_data) / len(agents_data) if agents_data else 5

    market_risk = "Low" if avg_risk < 4 else "Medium" if avg_risk < 7 else "High"

    investor = next((a for a in agents_data if "investor" in a.agent_name.lower() or "capital" in a.agent_name.lower()), None)
    investment_interest = _eff_interest(investor) if investor else sum(_eff_interest(a) for a in agents_data) // len(agents_data)

    _error_str = "failed to generate response"
    all_concerns:      List[str] = []
    all_opportunities: List[str] = []
    for a in agents_data:
        all_concerns.extend([c for c in a.concerns if c.lower() != _error_str])
        all_opportunities.extend([o for o in a.opportunities if o.lower() != _error_str])

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
        debate_summary=debate_summary or None,
    )


# ── Debate round (round 2) ────────────────────────────────────────────────────

async def run_debate(llm: LLM, idea_context: str, agents_data: List[AgentResponse]) -> tuple[List[AgentResponse], str]:
    """A single batched LLM call: every agent sees the others' first-round verdicts and may
    revise its scores. One request keeps us comfortably inside Groq's free-tier limits.
    Mutates and returns agents_data (revised_* fields filled in) plus a consensus summary."""
    panel_lines = []
    for a in agents_data:
        panel_lines.append(
            f"- {a.agent_name}: interest={a.interest_score}/10, risk={a.risk_score}/10, "
            f"adoption={a.adoption_probability}%. "
            f"Top concern: {a.concerns[0] if a.concerns else 'none'}. "
            f"Top opportunity: {a.opportunities[0] if a.opportunities else 'none'}."
        )
    panel_text = "\n".join(panel_lines)

    system = (
        "You are the moderator of a panel debate between startup-evaluation stakeholders. "
        "Each panelist gave an independent first-round verdict; now they can see each other's views. "
        "A credible panelist updates their scores when another raises a point they had not considered, "
        "but holds firm when they genuinely disagree. Do NOT force everyone to converge to the middle."
    )
    user = (
        f"STARTUP IDEA:\n{idea_context}\n\n"
        f"FIRST-ROUND VERDICTS:\n{panel_text}\n\n"
        "Simulate ONE round of debate. For EACH panelist, give their revised position after hearing the others.\n\n"
        "Return valid JSON with these keys:\n"
        "  revisions: a list with one object per panelist, each containing:\n"
        "    agent_name (string — must match one of the names above exactly)\n"
        "    revised_interest_score (int 1-10)\n"
        "    revised_risk_score (int 1-10)\n"
        "    revised_adoption_probability (int 0-100)\n"
        "    reasoning (string, 1-2 sentences: what changed their mind — name the panelist who influenced "
        "them — or why they held firm)\n"
        "  consensus_summary (string, 2-3 sentences: where the panel converged and where it stayed divided)"
    )
    logger.info("Running debate round (batched)...")
    async with _llm_sem:
        parsed = await llm.complete_json(system, user, temperature=0.6, max_tokens=1500)

    by_name = {a.agent_name.lower(): a for a in agents_data}
    for rev in parsed.get("revisions", []):
        name = strip_emojis(rev.get("agent_name", "")).lower().strip()
        agent = by_name.get(name)
        if agent is None and name:  # fall back to a fuzzy contains-match
            agent = next((a for a in agents_data
                          if name in a.agent_name.lower() or a.agent_name.lower() in name), None)
        if agent is not None:
            agent.revised_interest_score       = _clamp(rev.get("revised_interest_score"), 1, 10, agent.interest_score)
            agent.revised_risk_score           = _clamp(rev.get("revised_risk_score"), 1, 10, agent.risk_score)
            agent.revised_adoption_probability = _clamp(rev.get("revised_adoption_probability"), 0, 100, agent.adoption_probability)
            agent.debate_reasoning             = strip_emojis(rev.get("reasoning", "")) or None

    return agents_data, strip_emojis(parsed.get("consensus_summary", ""))


# ── Competitor research (Tavily → Groq) ──────────────────────────────────────

def _tavily_search(query: str, max_results: int = 5) -> str:
    """Run a Tavily search and return a condensed text block of results."""
    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    if not tavily_key:
        logger.warning("TAVILY_API_KEY not set — skipping web search, using Groq training knowledge")
        return ""
    try:
        logger.info(f"Tavily search: {query}")
        client = TavilyClient(api_key=tavily_key)
        results = client.search(query=query, max_results=max_results, search_depth="basic")
        snippets = []
        for r in results.get("results", []):
            title   = r.get("title", "")
            content = r.get("content", "")[:300]
            url     = r.get("url", "")
            snippets.append(f"- {title}: {content} ({url})")
        logger.info(f"Tavily returned {len(snippets)} results")
        return "\n".join(snippets)
    except Exception as e:
        logger.error(f"Tavily search failed: {e}")
        return ""


async def research_competitors(llm: LLM, idea: str) -> CompetitorReport:
    # Run two searches in parallel: competitors + market overview
    from datetime import datetime
    current_year = datetime.now().year
    loop = asyncio.get_event_loop()
    competitor_results, market_results = await asyncio.gather(
        loop.run_in_executor(None, _tavily_search, f"top competitors startups companies in {idea} market {current_year}", 6),
        loop.run_in_executor(None, _tavily_search, f"{idea} market size trends growth opportunities {current_year}", 4),
    )

    has_real_data = bool(competitor_results or market_results)
    source_note   = "real web search results from Tavily" if has_real_data else "your training knowledge (Tavily API key not set)"

    search_context = ""
    if competitor_results:
        search_context += f"\n\nWEB SEARCH RESULTS — Competitors:\n{competitor_results}"
    if market_results:
        search_context += f"\n\nWEB SEARCH RESULTS — Market:\n{market_results}"

    system = (
        "You are a competitive intelligence analyst. "
        "Analyse the provided web search results and extract structured competitor intelligence. "
        "Prioritise information from the search results. Fill gaps with your training knowledge "
        "but always prefer real data. Name real companies only."
    )
    user = (
        f"Startup Idea: {idea}\n"
        f"{search_context}\n\n"
        "Using the search results above, identify 3 to 5 real competitors. For each provide:\n"
        "- name: the real company name\n"
        "- description: one sentence about what they do\n"
        "- strengths: list of 2-3 key strengths\n"
        "- weaknesses: list of 2 key weaknesses or blind spots\n"
        "- market_position: exactly one of 'Market Leader', 'Established Player', 'Niche Player', 'Emerging'\n\n"
        "Also provide:\n"
        "- market_gap: one paragraph — what gap exists that none of these competitors fill well\n"
        "- your_advantage: one paragraph — what competitive edge this startup idea has over them\n\n"
        "Return valid JSON with keys: competitors (list), market_gap (string), your_advantage (string)"
    )
    try:
        logger.info(f"Researching competitors using {source_note}...")
        parsed = await llm.complete_json(system, user, temperature=0.3, max_tokens=2000)
        competitors = [
            Competitor(
                name=strip_emojis(c.get("name", "Unknown")),
                description=strip_emojis(c.get("description", "")),
                strengths=[strip_emojis(s) for s in c.get("strengths", [])],
                weaknesses=[strip_emojis(w) for w in c.get("weaknesses", [])],
                market_position=strip_emojis(c.get("market_position", "Unknown")),
            )
            for c in parsed.get("competitors", [])
        ]
        return CompetitorReport(
            competitors=competitors,
            market_gap=strip_emojis(parsed.get("market_gap", "")),
            your_advantage=strip_emojis(parsed.get("your_advantage", "")),
            tavily_used=has_real_data,
        )
    except Exception as e:
        logger.error(f"Error researching competitors: {e}")
        raise


# ── Public entry points ───────────────────────────────────────────────────────

async def evaluate_idea(llm: LLM, idea_input: IdeaInput) -> EvaluationReport:
    context = (
        f"Startup Idea: {idea_input.idea}\n"
        f"Target Audience: {idea_input.target_audience}\n"
        f"Revenue Model: {idea_input.revenue_model}\n"
        f"Problem Statement: {idea_input.problem_statement}"
    )
    generated_agents = await generate_agent_roles(llm, idea_input)
    agents_data = list(await asyncio.gather(*[
        call_agent(
            llm,
            agent_role=s.get("role", "Agent"),
            role_context=s.get("context", ""),
            evaluation_criteria=s.get("evaluation_criteria", ""),
            idea_context=context,
        )
        for s in generated_agents
    ]))

    debate_summary = ""
    if len(agents_data) > 1:
        try:
            agents_data, debate_summary = await run_debate(llm, context, agents_data)
        except Exception as e:
            logger.error(f"Debate round failed, using first-round scores: {e}")

    return _build_report(idea_input, agents_data, debate_summary)


async def stream_evaluate_idea(llm: LLM, idea_input: IdeaInput, queue: asyncio.Queue) -> None:
    context = (
        f"Startup Idea: {idea_input.idea}\n"
        f"Target Audience: {idea_input.target_audience}\n"
        f"Revenue Model: {idea_input.revenue_model}\n"
        f"Problem Statement: {idea_input.problem_statement}"
    )
    try:
        await queue.put({"type": "status", "message": "Generating specialised agents for your idea..."})
        generated_agents = await generate_agent_roles(llm, idea_input)
        await queue.put({"type": "agents_ready", "agents": [a.get("role", "Agent") for a in generated_agents]})

        async def run_with_progress(agent_spec):
            name = agent_spec.get("role", "Agent")
            await queue.put({"type": "agent_start", "name": name})
            result = await call_agent(
                llm,
                agent_role=name,
                role_context=agent_spec.get("context", ""),
                evaluation_criteria=agent_spec.get("evaluation_criteria", ""),
                idea_context=context,
            )
            await queue.put({"type": "agent_done", "name": name})
            return result

        # Groq supports real parallel calls — no semaphore needed
        agents_data: List[AgentResponse] = list(
            await asyncio.gather(*[run_with_progress(s) for s in generated_agents])
        )

        # ── Debate round: agents see each other and reconsider (single batched call) ──
        debate_summary = ""
        if len(agents_data) > 1:
            await queue.put({"type": "debate_start", "message": "Agents are debating and reconsidering..."})
            try:
                agents_data, debate_summary = await run_debate(llm, context, agents_data)
            except Exception as e:
                logger.error(f"Debate round failed, using first-round scores: {e}")
            await queue.put({"type": "debate_done"})

        await queue.put({"type": "status", "message": "Aggregating results and building report..."})
        report = _build_report(idea_input, agents_data, debate_summary)
        await queue.put({"type": "result", "report": report.model_dump()})
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        await queue.put({"type": "error", "message": str(e)})
    finally:
        await queue.put({"type": "done"})
