import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BASE}/api`,
});

// ── BYOK: the user's own provider/key lives only in this browser ──────────────
export const LLM_STORAGE_KEY = 'validateai.llm';

export const loadLlmConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(LLM_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

export const saveLlmConfig = (cfg) => {
  localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(cfg));
};

export const clearLlmConfig = () => {
  localStorage.removeItem(LLM_STORAGE_KEY);
};

// Build the request headers that carry the user's key. Empty when none is set,
// so the backend falls back to its free Groq default.
const llmHeaders = () => {
  const { provider, apiKey, model } = loadLlmConfig();
  if (!provider || !apiKey) return {};
  const h = { 'X-LLM-Provider': provider, 'X-LLM-Key': apiKey };
  if (model) h['X-LLM-Model'] = model;
  return h;
};

export const evaluateIdea = async (data) => {
  const response = await api.post('/evaluate', data, { headers: llmHeaders() });
  return response.data;
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch {
    return { backend: false, ollama: false, tavily: false };
  }
};

// Ask the backend to fire a tiny request to confirm the key + model work.
export const validateKey = async ({ provider, apiKey, model }) => {
  try {
    const response = await api.post('/validate-key', { provider, api_key: apiKey, model: model || null });
    return response.data;
  } catch (err) {
    const detail = err?.response?.data?.detail || err.message;
    return { ok: false, error: detail };
  }
};

export const fetchCompetitors = async (idea) => {
  const response = await api.post('/competitors', { idea }, { headers: llmHeaders() });
  return response.data;
};

export const evaluateIdeaStream = async (data, onEvent) => {
  const response = await fetch(`${BASE}/api/evaluate-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...llmHeaders() },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error(`Server error: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch { /* skip malformed lines */ }
      }
    }
  }
};
