import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getRequest, listRequests, upsertRequest } from '../db.js';
import { dispatchWorker, makeDefaultRun } from '../worker.js';
import type { RequestInput, DiligenceRequest, RequestSummary, Channel, Tone, GoalType, ResearchFocus } from '../types.js';

const CHANNELS: Channel[] = ['email', 'linkedin', 'x_dm'];
const TONES: Tone[] = ['respectful', 'direct', 'warm'];
const GOAL_TYPES: GoalType[] = ['sell', 'partnership', 'fundraise', 'hire', 'advice'];
const FOCUSES: ResearchFocus[] = ['person_background', 'service_surface', 'investment_thesis', 'recent_signals', 'objections'];

const app = new Hono();

// POST /requests
app.post('/', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid json' }, 400);
  }

  // Validate required string fields
  for (const field of ['targetBrief', 'objective', 'offer'] as const) {
    if (typeof body[field] !== 'string' || !body[field]) {
      return c.json({ error: `${field} is required` }, 400);
    }
  }

  // Validate enums
  if (!CHANNELS.includes(body.preferredChannel as Channel)) {
    return c.json({ error: `preferredChannel must be one of ${CHANNELS.join(', ')}` }, 400);
  }
  if (!TONES.includes(body.tone as Tone)) {
    return c.json({ error: `tone must be one of ${TONES.join(', ')}` }, 400);
  }
  if (!GOAL_TYPES.includes(body.goalType as GoalType)) {
    return c.json({ error: `goalType must be one of ${GOAL_TYPES.join(', ')}` }, 400);
  }

  // Validate focuses array
  if (!Array.isArray(body.focuses)) {
    return c.json({ error: 'focuses must be an array' }, 400);
  }
  const invalidFocuses = (body.focuses as string[]).filter((f) => !FOCUSES.includes(f as ResearchFocus));
  if (invalidFocuses.length > 0) {
    return c.json({ error: `invalid focuses: ${invalidFocuses.join(', ')}` }, 400);
  }

  const input: RequestInput = {
    targetBrief: body.targetBrief as string,
    objective: body.objective as string,
    offer: body.offer as string,
    preferredChannel: body.preferredChannel as Channel,
    tone: body.tone as Tone,
    goalType: body.goalType as GoalType,
    focuses: body.focuses as ResearchFocus[],
  };

  const now = new Date().toISOString();
  const id = `req_${crypto.randomBytes(4).toString('hex')}`;

  const req: DiligenceRequest = {
    id,
    title: '',
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    input,
    parsedHints: [],
    run: makeDefaultRun(),
  };

  upsertRequest(req);
  dispatchWorker(id);

  return c.json({ id, status: 'queued', createdAt: now }, 201);
});

// GET /requests
app.get('/', (c) => {
  const all = listRequests();
  const summaries: RequestSummary[] = all.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    parsedHints: r.parsedHints,
    preferredChannel: r.input.preferredChannel,
    updatedAt: r.updatedAt,
  }));
  return c.json(summaries);
});

// GET /requests/:id
app.get('/:id', (c) => {
  const req = getRequest(c.req.param('id'));
  if (!req) return c.json({ error: 'not found' }, 404);
  return c.json(req);
});

export default app;
