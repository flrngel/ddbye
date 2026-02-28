import { getRequest, upsertRequest } from './db.js';
import { emit } from './sse.js';
import { stubResearch, stubOutreach } from './stubs.js';
import type { DiligenceRequest, RequestStatus, RunStage } from './types.js';

const STAGE_MAP: { status: RequestStatus; event: string; stageKey?: RunStage['key'] }[] = [
  { status: 'parsing', event: 'request.parsing', stageKey: 'parse' },
  { status: 'resolving', event: 'request.resolved', stageKey: 'resolve' },
  { status: 'researching', event: 'request.researching', stageKey: 'research' },
  { status: 'synthesizing', event: 'request.synthesized', stageKey: 'synthesize' },
  { status: 'drafting', event: 'request.drafted', stageKey: 'draft' },
  { status: 'ready', event: 'request.ready' },
];

const DELAYS = [1000, 1200, 1500, 2000, 1800, 1000]; // ms per stage transition

function makeDefaultRun(): RunStage[] {
  return [
    { key: 'parse', label: 'Parse brief', detail: 'Extracting entities and intent', status: 'queued' },
    { key: 'resolve', label: 'Resolve target', detail: 'Identifying the person/org', status: 'queued' },
    { key: 'research', label: 'Research', detail: 'Gathering public intelligence', status: 'queued' },
    { key: 'synthesize', label: 'Synthesize', detail: 'Building research packet', status: 'queued' },
    { key: 'draft', label: 'Draft outreach', detail: 'Writing channel-specific copy', status: 'queued' },
  ];
}

/**
 * Dispatch a full worker pipeline for a newly created request.
 * Advances the request through all lifecycle stages using setTimeout chains.
 *
 * @param id - The request ID (e.g., "req_k3m9x2")
 *
 * Track B should replace this stub with a real Claude Agent SDK call that:
 * 1. Parses the brief to extract entities and intent
 * 2. Resolves the target identity via web search
 * 3. Researches the target using WebSearch/WebFetch
 * 4. Synthesizes findings into a ResearchPacket
 * 5. Drafts channel-specific outreach copy
 * 6. Runs a quality gate before marking ready
 */
export function dispatchWorker(id: string): void {
  // TODO Track B: replace with real Claude Agent SDK call
  let step = 0;

  function advance() {
    if (step >= STAGE_MAP.length) return;

    const req = getRequest(id);
    if (!req) return;

    const stage = STAGE_MAP[step];
    req.status = stage.status;
    req.updatedAt = new Date().toISOString();

    // Update run stage statuses
    if (stage.stageKey) {
      for (const s of req.run) {
        if (s.key === stage.stageKey) {
          s.status = 'running';
        }
      }
      // Mark previous stages as done
      const keys: RunStage['key'][] = ['parse', 'resolve', 'research', 'synthesize', 'draft'];
      const idx = keys.indexOf(stage.stageKey);
      for (let i = 0; i < idx; i++) {
        const prev = req.run.find((s) => s.key === keys[i]);
        if (prev) prev.status = 'done';
      }
    }

    // Populate data at specific stages
    if (stage.status === 'parsing') {
      req.title = req.input.targetBrief.slice(0, 40);
      req.parsedHints = ['target', 'outreach'];
    }
    if (stage.status === 'resolving') {
      req.parsedHints = ['PG', 'Hacker News', 'search'];
      req.title = 'Paul Graham / Hacker News';
    }
    if (stage.status === 'synthesizing') {
      req.research = stubResearch;
    }
    if (stage.status === 'drafting') {
      req.outreach = stubOutreach;
    }
    if (stage.status === 'ready') {
      for (const s of req.run) {
        s.status = 'done';
      }
    }

    upsertRequest(req);

    // Build SSE event data
    const eventData: Record<string, unknown> = { id: req.id, status: req.status };
    if (stage.status === 'resolving') eventData.parsedHints = req.parsedHints;
    if (stage.status === 'synthesizing') eventData.research = req.research;
    if (stage.status === 'drafting') eventData.outreach = req.outreach;

    emit(id, stage.event, eventData);

    step++;
    if (step < STAGE_MAP.length) {
      setTimeout(advance, DELAYS[step]);
    }
  }

  setTimeout(advance, DELAYS[0]);
}

/**
 * Dispatch only the draft step for a redraft operation.
 * Called when the user changes tone or channel on a completed request.
 *
 * @param id - The request ID to redraft
 *
 * Track B should replace this with a targeted re-run of only the draft stage
 * using the updated tone/channel from the request input.
 */
export function dispatchDraftStep(id: string): void {
  // TODO Track B: replace with real Claude Agent SDK call
  setTimeout(() => {
    const req = getRequest(id);
    if (!req) return;

    req.status = 'ready';
    req.updatedAt = new Date().toISOString();
    req.outreach = stubOutreach;

    for (const s of req.run) {
      s.status = 'done';
    }

    upsertRequest(req);
    emit(id, 'request.ready', { id: req.id, status: 'ready' });
  }, 2000);
}

export { makeDefaultRun };
