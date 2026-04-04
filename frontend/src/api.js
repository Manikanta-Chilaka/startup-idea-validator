import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BASE}/api`,
});

export const evaluateIdea = async (data) => {
  const response = await api.post('/evaluate', data);
  return response.data;
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch {
    return { backend: false, ollama: false };
  }
};

export const fetchCompetitors = async (idea) => {
  const response = await api.post('/competitors', { idea });
  return response.data;
};

export const evaluateIdeaStream = async (data, onEvent) => {
  const response = await fetch(`${BASE}/api/evaluate-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
