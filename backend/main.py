from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
import asyncio
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Ensure relative imports work if we run from the backend directory
from models import IdeaInput, EvaluationReport, CompetitorReport
from agents import evaluate_idea, stream_evaluate_idea, research_competitors
from llm import build_llm, validate_key, LLM, SUPPORTED_PROVIDERS, DEFAULT_MODELS, PROVIDER_LABELS

app = FastAPI(title="AI Startup Idea Validator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    # Explicitly allow the BYOK headers (some browsers require them listed).
    allow_headers=["*", "X-LLM-Provider", "X-LLM-Key", "X-LLM-Model"],
)


def resolve_llm(
    x_llm_provider: Optional[str] = Header(default=None),
    x_llm_key: Optional[str] = Header(default=None),
    x_llm_model: Optional[str] = Header(default=None),
) -> LLM:
    """Build the per-request LLM from the BYOK headers, falling back to the
    server's free Groq key when the client doesn't bring one."""
    try:
        return build_llm(x_llm_provider, x_llm_key, x_llm_model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
def read_root():
    return {"status": "API is running", "message": "Submit an idea to /api/evaluate"}


@app.get("/api/health")
async def health_check():
    """Check whether the backend is up and API keys are configured."""
    from agents import MODEL
    groq_ok   = bool(os.environ.get("GROQ_API_KEY"))
    tavily_ok = bool(os.environ.get("TAVILY_API_KEY"))
    return {
        "backend": True,
        "ollama": groq_ok,          # kept for frontend backwards-compatibility
        "tavily": tavily_ok,
        "model": MODEL,
        "providers": [{"id": p, "label": PROVIDER_LABELS[p], "default_model": DEFAULT_MODELS[p]} for p in SUPPORTED_PROVIDERS],
    }


class KeyCheck(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None


@app.post("/api/validate-key")
async def validate_llm_key(body: KeyCheck):
    """Fire a tiny test request so the UI can confirm a pasted key works."""
    try:
        llm = build_llm(body.provider, body.api_key, body.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        await validate_key(llm)
    except Exception as e:
        return {"ok": False, "provider": llm.provider, "model": llm.model, "error": str(e)[:300]}
    return {"ok": True, "provider": llm.provider, "model": llm.model}


@app.post("/api/evaluate", response_model=EvaluationReport)
async def generate_evaluation(idea: IdeaInput, llm: LLM = Depends(resolve_llm)):
    """Returns a full evaluation report (single response)."""
    return await evaluate_idea(llm, idea)


@app.post("/api/evaluate-stream")
async def generate_evaluation_stream(idea: IdeaInput, llm: LLM = Depends(resolve_llm)):
    """Streams progress events via SSE while agents evaluate the idea."""
    queue: asyncio.Queue = asyncio.Queue()

    async def event_generator():
        task = asyncio.create_task(stream_evaluate_idea(llm, idea, queue))
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                if event['type'] in ('done', 'error'):
                    break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class IdeaQuery(BaseModel):
    idea: str


@app.post("/api/competitors", response_model=CompetitorReport)
async def get_competitors(query: IdeaQuery, llm: LLM = Depends(resolve_llm)):
    """Research competitors for a given startup idea using the selected model."""
    return await research_competitors(llm, query.idea)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
