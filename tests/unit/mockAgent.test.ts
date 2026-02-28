import { describe, expect, it } from 'vitest';
import { createSimulatedRequest, advanceRun } from '@/logic/mockAgent';
import type { RequestInput, RunStage } from '@/types';

function makeInput(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    targetBrief: 'random unknown person',
    objective: 'open a conversation',
    offer: 'our product',
    preferredChannel: 'email',
    tone: 'respectful',
    goalType: 'sell',
    focuses: [],
    ...overrides,
  };
}

describe('createSimulatedRequest', () => {
  describe('routing', () => {
    it('returns PG case for "paul graham" in brief', () => {
      const req = createSimulatedRequest(makeInput({ targetBrief: 'paul graham and hacker news' }));
      expect(req.research?.person).toBe('Paul Graham');
      expect(req.research?.organization).toContain('Hacker News');
    });

    it('returns PG case for "hacker news" in brief', () => {
      const req = createSimulatedRequest(makeInput({ targetBrief: 'hacker news search improvement' }));
      expect(req.research?.person).toBe('Paul Graham');
    });

    it('returns PG case for "pg" in brief', () => {
      const req = createSimulatedRequest(makeInput({ targetBrief: 'pg is someone I want to reach' }));
      expect(req.research?.organization).toContain('Hacker News');
    });

    it('returns a16z case for "a16z" in brief', () => {
      const req = createSimulatedRequest(makeInput({ targetBrief: 'a16z investment fit' }));
      expect(req.research?.person).not.toBe('Paul Graham');
      expect(req.research?.organization).toContain('Andreessen');
    });

    it('returns a16z case for "andreessen" in brief', () => {
      const req = createSimulatedRequest(makeInput({ targetBrief: 'andreessen horowitz fund' }));
      expect(req.research?.person).not.toBe('Paul Graham');
    });

    it('returns generic case for unrecognized brief — extracts person name', () => {
      const req = createSimulatedRequest(makeInput({ targetBrief: 'random unknown person' }));
      // Should NOT be "Target to be resolved" anymore
      expect(req.research?.person).not.toContain('to be resolved');
      expect(req.research?.person).toBeTruthy();
    });

    it('extracts "Derrick Cho" from a real brief', () => {
      const req = createSimulatedRequest(makeInput({
        targetBrief: 'Derrick Cho(flrngel). He writes many code.',
        objective: 'Research the target, figure out the right angle of approach',
        offer: 'We build hosted search(algolia)',
      }));
      expect(req.research?.person).toBe('Derrick Cho');
      expect(req.parsedHints).not.toContain('Unresolved target');
      expect(req.parsedHints.some(h => h.includes('Derrick Cho'))).toBe(true);
    });

    it('extracts "Jane Smith" from brief with extra context', () => {
      const req = createSimulatedRequest(makeInput({
        targetBrief: 'Jane Smith at Stripe. She runs developer experience.',
      }));
      expect(req.research?.person).toBe('Jane Smith');
      expect(req.outreach?.email.body).toContain('Jane');
      expect(req.parsedHints).not.toContain('Unresolved target');
    });

    it('never shows "Unresolved target" for any brief', () => {
      const briefs = [
        'someone I met at a conference',
        'CEO of a startup in SF',
        'John Lee, works at Google',
        'my friend who does ML research',
      ];
      for (const brief of briefs) {
        const req = createSimulatedRequest(makeInput({ targetBrief: brief }));
        expect(req.parsedHints).not.toContain('Unresolved target');
        expect(req.research?.person).not.toContain('to be resolved');
        expect(req.research?.organization).not.toContain('to be resolved');
      }
    });
  });

  describe('shape invariants', () => {
    const cases = [
      { name: 'PG case', input: makeInput({ targetBrief: 'paul graham hacker news' }) },
      { name: 'a16z case', input: makeInput({ targetBrief: 'a16z andreessen investment' }) },
      { name: 'generic case', input: makeInput({ targetBrief: 'random unknown target' }) },
    ];

    cases.forEach(({ name, input }) => {
      describe(name, () => {
        it('has a non-empty id', () => {
          const req = createSimulatedRequest(input);
          expect(req.id).toBeTruthy();
          expect(typeof req.id).toBe('string');
        });

        it('has status "running"', () => {
          const req = createSimulatedRequest(input);
          expect(req.status).toBe('running');
        });

        it('has valid ISO date strings', () => {
          const req = createSimulatedRequest(input);
          expect(new Date(req.createdAt).toISOString()).toBe(req.createdAt);
          expect(new Date(req.updatedAt).toISOString()).toBe(req.updatedAt);
        });

        it('has exactly 5 run stages with correct initial statuses', () => {
          const req = createSimulatedRequest(input);
          expect(req.run).toHaveLength(5);
          req.run.forEach((stage) => {
            expect(stage).toHaveProperty('key');
            expect(stage).toHaveProperty('label');
            expect(stage).toHaveProperty('detail');
            expect(stage).toHaveProperty('status');
          });
          expect(req.run[0].status).toBe('running');
          expect(req.run[1].status).toBe('queued');
          expect(req.run[2].status).toBe('queued');
          expect(req.run[3].status).toBe('queued');
          expect(req.run[4].status).toBe('queued');
        });

        it('has research with non-empty required fields', () => {
          const req = createSimulatedRequest(input);
          expect(req.research).toBeDefined();
          expect(req.research!.person).toBeTruthy();
          expect(req.research!.organization).toBeTruthy();
          expect(req.research!.surface).toBeTruthy();
          expect(req.research!.summary).toBeTruthy();
        });

        it('has outreach with all three channels', () => {
          const req = createSimulatedRequest(input);
          expect(req.outreach).toBeDefined();
          expect(req.outreach!.email.body).toBeTruthy();
          expect(req.outreach!.linkedin.body).toBeTruthy();
          expect(req.outreach!.x_dm.body).toBeTruthy();
        });
      });
    });
  });
});

describe('advanceRun', () => {
  function makeRun(statuses: RunStage['status'][]): RunStage[] {
    const keys: RunStage['key'][] = ['parse', 'resolve', 'research', 'synthesize', 'draft'];
    return keys.map((key, i) => ({
      key,
      label: key,
      detail: key,
      status: statuses[i],
    }));
  }

  it('advances first running stage to done and starts next', () => {
    const run = makeRun(['running', 'queued', 'queued', 'queued', 'queued']);
    const result = advanceRun(run);
    expect(result[0].status).toBe('done');
    expect(result[1].status).toBe('running');
    expect(result[2].status).toBe('queued');
  });

  it('advances synthesize to done and starts draft', () => {
    const run = makeRun(['done', 'done', 'done', 'running', 'queued']);
    const result = advanceRun(run);
    expect(result[3].status).toBe('done');
    expect(result[4].status).toBe('running');
  });

  it('returns same run when all stages are done', () => {
    const run = makeRun(['done', 'done', 'done', 'done', 'done']);
    const result = advanceRun(run);
    result.forEach((stage) => {
      expect(stage.status).toBe('done');
    });
  });

  it('does not mutate the input array', () => {
    const run = makeRun(['running', 'queued', 'queued', 'queued', 'queued']);
    const originalStatuses = run.map((s) => s.status);
    advanceRun(run);
    run.forEach((stage, i) => {
      expect(stage.status).toBe(originalStatuses[i]);
    });
  });
});
