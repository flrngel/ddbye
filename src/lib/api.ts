import type { Channel, DiligenceRequest, RequestInput, Tone } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

export class MockModeError extends Error {
  constructor() {
    super('No API base URL configured — running in mock mode');
    this.name = 'MockModeError';
  }
}

function getBase(): string {
  if (!API_BASE) throw new MockModeError();
  return API_BASE.replace(/\/$/, '');
}

export async function createRequest(
  input: RequestInput,
): Promise<{ id: string; status: string; createdAt: string }> {
  const base = getBase();
  const res = await fetch(`${base}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createRequest failed: ${res.status}`);
  return res.json();
}

export async function fetchRequests(): Promise<DiligenceRequest[]> {
  const base = getBase();
  const res = await fetch(`${base}/requests`);
  if (!res.ok) throw new Error(`fetchRequests failed: ${res.status}`);
  return res.json();
}

export async function fetchRequest(id: string): Promise<DiligenceRequest> {
  const base = getBase();
  const res = await fetch(`${base}/requests/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`fetchRequest failed: ${res.status}`);
  return res.json();
}

export function subscribeToEvents(
  id: string,
  onEvent: (event: { type: string; payload: unknown }) => void,
): () => void {
  const base = getBase();
  const source = new EventSource(`${base}/requests/${encodeURIComponent(id)}/events`);
  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as { type: string; payload: unknown };
      onEvent(data);
    } catch {
      // ignore malformed events
    }
  };
  return () => source.close();
}

export async function redraftRequest(
  id: string,
  tone: Tone,
  channel: Channel,
): Promise<void> {
  const base = getBase();
  const res = await fetch(`${base}/requests/${encodeURIComponent(id)}/redraft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone, channel }),
  });
  if (!res.ok) throw new Error(`redraftRequest failed: ${res.status}`);
}
