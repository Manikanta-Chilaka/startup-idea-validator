"""Provider-agnostic LLM client for BYOK ("bring your own key").

Supports three providers, all reached through a single ``complete_json`` call:

  * groq       — the free default (server-side key), OpenAI-compatible API
  * openai     — ChatGPT models, OpenAI SDK
  * anthropic  — Claude models, Anthropic SDK

Keys are supplied per-request by the caller and are never stored server-side.
When no key is supplied we fall back to the server's Groq key so the app keeps
working out of the box.
"""
import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# Default model per provider (used when the caller doesn't name one).
DEFAULT_MODELS = {
    "groq":      "llama-3.3-70b-versatile",
    "openai":    "gpt-4o-mini",
    "anthropic": "claude-opus-5",
}

SUPPORTED_PROVIDERS = tuple(DEFAULT_MODELS.keys())

# Human-friendly labels for the UI / errors.
PROVIDER_LABELS = {
    "groq":      "Groq",
    "openai":    "OpenAI (ChatGPT)",
    "anthropic": "Anthropic (Claude)",
}


def _extract_json(text: str) -> dict:
    """Parse a JSON object out of an LLM response.

    Groq and OpenAI honour ``response_format={"type": "json_object"}`` and return
    clean JSON. Anthropic has no such mode, so its output may be wrapped in prose
    or a ```json fence — tolerate both by falling back to the first ``{...}`` span.
    """
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise


@dataclass
class LLM:
    provider: str
    api_key: str
    model: str

    async def complete_json(self, system: str, user: str, *, temperature: float, max_tokens: int) -> dict:
        """Run one chat completion and return the parsed JSON object."""
        if self.provider in ("groq", "openai"):
            return await self._openai_style(system, user, temperature, max_tokens)
        if self.provider == "anthropic":
            return await self._anthropic(system, user, max_tokens)
        raise ValueError(f"Unsupported provider: {self.provider}")

    async def _openai_style(self, system: str, user: str, temperature: float, max_tokens: int) -> dict:
        # Groq's SDK mirrors OpenAI's, so the two paths differ only by client.
        if self.provider == "groq":
            from groq import AsyncGroq
            client = AsyncGroq(api_key=self.api_key)
        else:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)
        resp = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return _extract_json(resp.choices[0].message.content)

    async def _anthropic(self, system: str, user: str, max_tokens: int) -> dict:
        # Modern Claude models reject `temperature` and have no JSON-object mode,
        # so we instruct JSON in the system prompt and parse defensively. Thinking
        # is disabled for these lightweight extraction calls (cheaper + faster);
        # if the chosen model rejects that parameter we retry with it on.
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=self.api_key)
        sys_prompt = (
            f"{system}\n\n"
            "Respond with ONLY one valid JSON object — no prose, no markdown, no code fences."
        )
        messages = [{"role": "user", "content": user}]
        mt = max(max_tokens, 1500)
        try:
            resp = await client.messages.create(
                model=self.model, max_tokens=mt, system=sys_prompt,
                thinking={"type": "disabled"}, messages=messages,
            )
        except Exception as e:
            logger.info(f"Anthropic thinking-disabled rejected ({e}); retrying with thinking on")
            resp = await client.messages.create(
                model=self.model, max_tokens=max(mt, 4096), system=sys_prompt,
                messages=messages,
            )
        text = "".join(getattr(b, "text", "") for b in resp.content if getattr(b, "type", None) == "text")
        return _extract_json(text)


def build_llm(provider: Optional[str], api_key: Optional[str], model: Optional[str]) -> LLM:
    """Resolve the LLM for a request.

    A blank provider/key falls back to the server's Groq key — the free default —
    so visitors who don't bring a key can still use the app.
    """
    provider = (provider or "").strip().lower()
    api_key = (api_key or "").strip()

    if not provider or not api_key:
        server_key = os.environ.get("GROQ_API_KEY", "")
        if not server_key:
            raise ValueError("No API key provided and no server GROQ_API_KEY is configured.")
        return LLM(provider="groq", api_key=server_key, model=DEFAULT_MODELS["groq"])

    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError(
            f"Unsupported provider '{provider}'. Choose one of: {', '.join(SUPPORTED_PROVIDERS)}"
        )

    model = (model or "").strip() or DEFAULT_MODELS[provider]
    return LLM(provider=provider, api_key=api_key, model=model)


async def validate_key(llm: LLM) -> None:
    """Fire a tiny request to confirm the key + model actually work.

    Raises on failure; the caller surfaces the message to the user.
    """
    await llm.complete_json(
        system="You are a health check. Reply with JSON only.",
        user='Return exactly {"ok": true}.',
        temperature=0.0,
        max_tokens=64,
    )
