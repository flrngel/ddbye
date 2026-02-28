import { Hono } from 'hono';
import { getRequest, upsertRequest } from '../db.js';
import { dispatchDraftStep } from '../worker.js';
import type { Channel, Tone } from '../types.js';

const CHANNELS: Channel[] = ['email', 'linkedin', 'x_dm'];
const TONES: Tone[] = ['respectful', 'direct', 'warm'];

const app = new Hono();

// POST /requests/:id/redraft
app.post('/:id/redraft', async (c) => {
  const id = c.req.param('id');
  const req = getRequest(id);

  if (!req) return c.json({ error: 'not found' }, 404);
  if (req.status !== 'ready') return c.json({ error: 'request not ready' }, 400);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid json' }, 400);
  }

  const { tone, preferredChannel } = body as { tone?: string; preferredChannel?: string };

  if (!tone && !preferredChannel) {
    return c.json({ error: 'tone or preferredChannel required' }, 400);
  }

  if (tone) {
    if (!TONES.includes(tone as Tone)) {
      return c.json({ error: `tone must be one of ${TONES.join(', ')}` }, 400);
    }
    req.input.tone = tone as Tone;
  }

  if (preferredChannel) {
    if (!CHANNELS.includes(preferredChannel as Channel)) {
      return c.json({ error: `preferredChannel must be one of ${CHANNELS.join(', ')}` }, 400);
    }
    req.input.preferredChannel = preferredChannel as Channel;
  }

  req.status = 'drafting';
  req.updatedAt = new Date().toISOString();

  upsertRequest(req);
  dispatchDraftStep(id);

  return c.json({ id: req.id, status: 'drafting', updatedAt: req.updatedAt }, 202);
});

export default app;
