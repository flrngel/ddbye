type SSEWriter = (event: string, data: string, id: number) => void;

const listeners = new Map<string, Set<SSEWriter>>();

export function addListener(requestId: string, writer: SSEWriter): () => void {
  if (!listeners.has(requestId)) {
    listeners.set(requestId, new Set());
  }
  listeners.get(requestId)!.add(writer);

  return () => {
    const set = listeners.get(requestId);
    if (set) {
      set.delete(writer);
      if (set.size === 0) listeners.delete(requestId);
    }
  };
}

let eventCounter = 0;

export function emit(requestId: string, event: string, data: Record<string, unknown>): void {
  const set = listeners.get(requestId);
  if (!set) return;
  eventCounter++;
  const json = JSON.stringify(data);
  for (const writer of set) {
    try {
      writer(event, json, eventCounter);
    } catch {
      // Client disconnected, ignore
    }
  }
}
