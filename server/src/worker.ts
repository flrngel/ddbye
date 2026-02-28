import { getRequest, upsertRequest } from './db.js';
import { emit } from './sse.js';
import type { DiligenceRequest, RunStage } from './types.js';

// Import real worker pipeline
import { runDiligence } from '@ddbye/worker';
import type { ProgressEvent } from '@ddbye/worker';

const STAGE_TO_EVENT: Record<string, string> = {
  parse: 'request.parsing',
  resolve: 'request.resolved',
  research: 'request.researching',
  synthesize: 'request.synthesized',
  draft: 'request.drafted',
};

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
 * Dispatch the REAL Claude Agent SDK worker pipeline.
 * Calls runDiligence() which uses WebSearch/WebFetch to research the target.
 */
export function dispatchWorker(id: string): void {
  const req = getRequest(id);
  if (!req) return;

  // Start async pipeline (fire-and-forget, progress via SSE)
  runRealPipeline(id, req).catch((err) => {
    console.error(`[worker] Pipeline failed for ${id}:`, err);
    const failReq = getRequest(id);
    if (failReq) {
      failReq.status = 'failed';
      failReq.updatedAt = new Date().toISOString();
      upsertRequest(failReq);
      emit(id, 'request.failed', { id, status: 'failed', error: String(err) });
    }
  });
}

async function runRealPipeline(id: string, req: DiligenceRequest): Promise<void> {
  const result = await runDiligence(req.input, (event: ProgressEvent) => {
    const current = getRequest(id);
    if (!current) return;

    // Map worker progress to server status + SSE events
    const stageKey = event.stage;
    const eventName = STAGE_TO_EVENT[stageKey];

    if (event.status === 'running') {
      // Update run stages
      for (const s of current.run) {
        if (s.key === stageKey) {
          s.status = 'running';
          if (event.detail) s.detail = event.detail;
        }
      }
      // Mark previous stages as done
      const keys: RunStage['key'][] = ['parse', 'resolve', 'research', 'synthesize', 'draft'];
      const idx = keys.indexOf(stageKey as RunStage['key']);
      for (let i = 0; i < idx; i++) {
        const prev = current.run.find((s) => s.key === keys[i]);
        if (prev) prev.status = 'done';
      }

      // Map to server status
      const statusMap: Record<string, DiligenceRequest['status']> = {
        parse: 'parsing',
        resolve: 'resolving',
        research: 'researching',
        synthesize: 'synthesizing',
        draft: 'drafting',
      };
      current.status = statusMap[stageKey] || current.status;
      current.updatedAt = new Date().toISOString();

      // Extract title from brief on parse stage
      if (stageKey === 'parse') {
        current.title = current.input.targetBrief.slice(0, 40);
        current.parsedHints = ['target', 'outreach'];
      }

      upsertRequest(current);
      if (eventName) {
        emit(id, eventName, { id, status: current.status });
      }
    }

    if (event.status === 'done') {
      const done = getRequest(id);
      if (!done) return;
      const stage = done.run.find((s) => s.key === stageKey);
      if (stage) {
        stage.status = 'done';
        if (event.detail) stage.detail = event.detail;
      }
      upsertRequest(done);
    }
  });

  // Pipeline complete — populate final data
  const final = getRequest(id);
  if (!final) return;

  final.status = 'ready';
  final.updatedAt = new Date().toISOString();
  final.research = result.research;
  final.outreach = result.outreach;
  final.parsedHints = [
    result.research.person,
    result.research.organization,
    final.input.preferredChannel === 'x_dm' ? 'X DM' : final.input.preferredChannel === 'linkedin' ? 'LinkedIn DM' : 'Email',
  ];
  final.title = `${result.research.person} / ${result.research.organization}`;

  for (const s of final.run) {
    s.status = 'done';
  }

  upsertRequest(final);

  // Send synthesized + drafted + ready events with data
  emit(id, 'request.synthesized', { id, status: 'synthesizing', research: final.research });
  emit(id, 'request.drafted', { id, status: 'drafting', outreach: final.outreach });
  emit(id, 'request.ready', { id, status: 'ready' });
}

/**
 * Dispatch only the draft step for a redraft operation.
 * For now, re-runs the full pipeline (hackathon shortcut).
 */
export function dispatchDraftStep(id: string): void {
  dispatchWorker(id);
}

export { makeDefaultRun };
