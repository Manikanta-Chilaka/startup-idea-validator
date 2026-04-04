from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import asyncio
import json
import os
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

# Ensure relative imports work if we run from the backend directory
from models import IdeaInput, EvaluationReport, CompetitorReport
from agents import evaluate_idea, stream_evaluate_idea, research_competitors

app = FastAPI(title="AI Startup Idea Validator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "API is running", "message": "Submit an idea to /api/evaluate"}

@app.get("/api/health")
async def health_check():
    """Check whether the backend is up and API keys are configured."""
    from agents import MODEL
    groq_ok   = bool(os.environ.get("GROQ_API_KEY"))
    tavily_ok = bool(os.environ.get("TAVILY_API_KEY"))
    return {"backend": True, "ollama": groq_ok, "tavily": tavily_ok, "model": MODEL}

@app.post("/api/evaluate", response_model=EvaluationReport)
async def generate_evaluation(idea: IdeaInput):
    """Returns a full evaluation report (single response)."""
    report = await evaluate_idea(idea)
    return report

@app.post("/api/evaluate-stream")
async def generate_evaluation_stream(idea: IdeaInput):
    """Streams progress events via SSE while agents evaluate the idea."""
    queue: asyncio.Queue = asyncio.Queue()

    async def event_generator():
        task = asyncio.create_task(stream_evaluate_idea(idea, queue))
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
async def get_competitors(query: IdeaQuery):
    """Research competitors for a given startup idea using Groq's training knowledge."""
    return await research_competitors(query.idea)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
