from pydantic import BaseModel, Field
from typing import List, Optional

class IdeaInput(BaseModel):
    idea: str
    target_audience: str
    revenue_model: str
    problem_statement: str

class AgentResponse(BaseModel):
    agent_name: str
    interest_score: int = Field(ge=1, le=10, description="Interest or Attractiveness score from 1-10")
    risk_score: int = Field(ge=1, le=10, description="Risk level score from 1-10, where 10 is highest risk")
    adoption_probability: int = Field(ge=0, le=100, description="Probability of success/adoption in percentage")
    concerns: List[str]
    opportunities: List[str]
    feedback: str
    # ── Debate round (round 2) — populated after agents see each other's verdicts ──
    revised_interest_score: Optional[int] = None
    revised_risk_score: Optional[int] = None
    revised_adoption_probability: Optional[int] = None
    debate_reasoning: Optional[str] = None  # why this agent changed (or held) their position

class EvaluationReport(BaseModel):
    startup_idea: str
    customer_adoption_probability: int
    investment_interest: int
    market_risk: str
    strengths: List[str]
    weaknesses: List[str]
    opportunities: List[str]
    threats: List[str]
    suggested_improvements: List[str]
    overall_score: int
    agent_responses: List[AgentResponse]
    debate_summary: Optional[str] = None  # consensus paragraph after the debate round


class Competitor(BaseModel):
    name: str
    description: str
    strengths: List[str]
    weaknesses: List[str]
    market_position: str  # "Market Leader", "Established Player", "Niche Player", "Emerging"

class CompetitorReport(BaseModel):
    competitors: List[Competitor]
    market_gap: str
    your_advantage: str
    tavily_used: bool = False  # True = real web search, False = Groq training knowledge only
