import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { seededCases } from '@/data/sampleCases';
import { advanceRun, createSimulatedRequest } from '@/logic/mockAgent';
import * as api from '@/lib/api';
import { MockModeError } from '@/lib/api';
import type { Channel, DiligenceRequest, GoalType, RequestInput, ResearchFocus, Tone } from '@/types';

type DraftInput = RequestInput;

type AppContextValue = {
  requests: DiligenceRequest[];
  selectedId: string;
  selectedRequest?: DiligenceRequest;
  draft: DraftInput;
  setDraft: (value: DraftInput) => void;
  updateDraftField: <K extends keyof DraftInput>(field: K, value: DraftInput[K]) => void;
  toggleFocus: (focus: ResearchFocus) => void;
  selectRequest: (id: string) => void;
  submitDraft: () => void;
  loadExample: (key: 'pg' | 'a16z') => void;
  deleteRequest: (id: string) => void;
  retryRequest: (id: string) => void;
  redraft: (id: string, tone: Tone, channel: Channel) => void;
  isSubmitting: boolean;
  isLoading: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

function createPGDraft(): DraftInput {
  return {
    targetBrief:
      'PG, famous for YC — want to explore doing business with Hacker News, one of the things he built. Wondering if there\'s a wedge around search or browsing old posts.',
    objective:
      'Research the target, figure out the right angle of approach, and ultimately craft outreach I can send via email/DM.',
    offer:
      'We build hosted search that can be embedded quickly, with ranking controls, analytics, and a lightweight implementation path.',
    preferredChannel: 'email',
    tone: 'respectful',
    goalType: 'sell',
    focuses: ['person_background', 'service_surface', 'recent_signals', 'objections'],
  };
}

function createA16zDraft(): DraftInput {
  return {
    targetBrief:
      'Want to look at Andreessen from a16z as an investment target. Need to first lay out why we\'re worth looking at from his/the fund\'s perspective.',
    objective:
      'Don\'t pitch our company generically — research what thesis-fit angle to take, then distill it into a message.',
    offer:
      'We are building workflow software for AI-native support teams, with strong retention and a wedge around quality review + automation.',
    preferredChannel: 'email',
    tone: 'direct',
    goalType: 'fundraise',
    focuses: ['person_background', 'investment_thesis', 'recent_signals', 'objections'],
  };
}

const STORAGE_KEY = 'ddbye-front';

function loadFromStorage(): DiligenceRequest[] {
  if (typeof window === 'undefined') return seededCases;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seededCases;
  try {
    const parsed = JSON.parse(raw) as DiligenceRequest[];
    return parsed.length ? parsed : seededCases;
  } catch {
    return seededCases;
  }
}

const isMockMode = !import.meta.env.VITE_API_BASE;

export function AppProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DiligenceRequest[]>(loadFromStorage);
  const [selectedId, setSelectedId] = useState<string>(requests[0]?.id ?? '');
  const [draft, setDraft] = useState<DraftInput>(createPGDraft());
  const [inFlightCount, setInFlightCount] = useState(0);
  const [isLoading, setIsLoading] = useState(!isMockMode);
  const isSubmitting = inFlightCount > 0;
  const timeoutsRef = useRef<Map<string, number[]>>(new Map());
  const sseCleanupRef = useRef<Map<string, () => void>>(new Map());

  // API mode: fetch requests on mount
  useEffect(() => {
    if (isMockMode) return;
    let cancelled = false;
    api.fetchRequests()
      .then((data) => {
        if (cancelled) return;
        setRequests(data.length ? data : seededCases);
        setSelectedId(data[0]?.id ?? '');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof MockModeError) {
          // shouldn't happen since we checked VITE_API_BASE, but fall back
          setRequests(loadFromStorage());
        } else {
          console.error('Failed to fetch requests from API:', err);
          // Keep whatever we loaded from storage
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const clearTimersForRequest = useCallback((id: string) => {
    const timers = timeoutsRef.current.get(id);
    if (timers) {
      timers.forEach((tid) => window.clearTimeout(tid));
      timeoutsRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    const sseCleanups = sseCleanupRef.current;
    return () => {
      timeouts.forEach((timers) => timers.forEach((tid) => window.clearTimeout(tid)));
      sseCleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0],
    [requests, selectedId],
  );

  const updateDraftField = <K extends keyof DraftInput>(field: K, value: DraftInput[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleFocus = (focus: ResearchFocus) => {
    setDraft((current) => {
      const exists = current.focuses.includes(focus);
      return {
        ...current,
        focuses: exists ? current.focuses.filter((item) => item !== focus) : [...current.focuses, focus],
      };
    });
  };

  const selectRequest = (id: string) => setSelectedId(id);

  const scheduleProgress = useCallback((id: string) => {
    clearTimersForRequest(id);
    setInFlightCount((c) => c + 1);
    const timerIds: number[] = [];
    const steps = [1100, 2300, 3600, 5000];
    steps.forEach((delay, index) => {
      const timeoutId = window.setTimeout(() => {
        setRequests((current) =>
          current.map((request) => {
            if (request.id !== id) return request;
            const nextRun = advanceRun(request.run);
            const finished = index === steps.length - 1;
            return {
              ...request,
              run: nextRun,
              status: finished ? 'ready' : 'running',
              updatedAt: new Date().toISOString(),
            };
          }),
        );
        if (index === steps.length - 1) {
          setInFlightCount((c) => c - 1);
          timeoutsRef.current.delete(id);
        }
      }, delay);
      timerIds.push(timeoutId);
    });
    timeoutsRef.current.set(id, timerIds);
  }, [clearTimersForRequest]);

  const subscribeAndHydrate = useCallback((id: string) => {
    const cleanup = api.subscribeToEvents(id, (event) => {
      if (event.type === 'request.ready' || event.type === 'request.failed') {
        api.fetchRequest(id).then((full) => {
          setRequests((current) => current.map((r) => (r.id === id ? full : r)));
          setInFlightCount((c) => c - 1);
        }).catch(() => {
          setInFlightCount((c) => c - 1);
        });
        sseCleanupRef.current.get(id)?.();
        sseCleanupRef.current.delete(id);
      } else {
        // Intermediate stage update — advance the run stages locally
        setRequests((current) =>
          current.map((r) => {
            if (r.id !== id) return r;
            return { ...r, run: advanceRun(r.run), updatedAt: new Date().toISOString() };
          }),
        );
      }
    });
    sseCleanupRef.current.set(id, cleanup);
  }, []);

  const submitDraft = () => {
    if (isMockMode) {
      const generated = createSimulatedRequest(draft);
      setRequests((current) => [generated, ...current]);
      setSelectedId(generated.id);
      scheduleProgress(generated.id);
    } else {
      setInFlightCount((c) => c + 1);
      api.createRequest(draft).then(({ id, status, createdAt }) => {
        const placeholder: DiligenceRequest = {
          id,
          title: draft.targetBrief.split(/[.!?\n]/)[0].trim().slice(0, 48),
          status: status as DiligenceRequest['status'],
          createdAt,
          updatedAt: createdAt,
          input: draft,
          parsedHints: [],
          run: [],
        };
        setRequests((current) => [placeholder, ...current]);
        setSelectedId(id);
        subscribeAndHydrate(id);
      }).catch(() => {
        setInFlightCount((c) => c - 1);
      });
    }
  };

  const deleteRequest = (id: string) => {
    clearTimersForRequest(id);
    sseCleanupRef.current.get(id)?.();
    sseCleanupRef.current.delete(id);
    setRequests((current) => {
      const updated = current.filter((r) => r.id !== id);
      if (id === selectedId) {
        const idx = current.findIndex((r) => r.id === id);
        const next = current[idx + 1] ?? current[idx - 1];
        setSelectedId(next?.id ?? '');
      }
      return updated;
    });
  };

  const retryRequest = (id: string) => {
    const existing = requests.find((r) => r.id === id);
    if (!existing) return;
    if (isMockMode) {
      const generated = createSimulatedRequest(existing.input);
      setRequests((current) => [generated, ...current.filter((r) => r.id !== id)]);
      setSelectedId(generated.id);
      scheduleProgress(generated.id);
    } else {
      setInFlightCount((c) => c + 1);
      api.createRequest(existing.input).then(({ id: newId, status, createdAt }) => {
        const placeholder: DiligenceRequest = {
          id: newId,
          title: existing.title,
          status: status as DiligenceRequest['status'],
          createdAt,
          updatedAt: createdAt,
          input: existing.input,
          parsedHints: existing.parsedHints,
          run: [],
        };
        setRequests((current) => [placeholder, ...current.filter((r) => r.id !== id)]);
        setSelectedId(newId);
        subscribeAndHydrate(newId);
      }).catch(() => {
        setInFlightCount((c) => c - 1);
      });
    }
  };

  const redraft = (id: string, tone: Tone, channel: Channel) => {
    const existing = requests.find((r) => r.id === id);
    if (!existing) return;
    if (isMockMode) {
      const updatedInput: RequestInput = { ...existing.input, tone, preferredChannel: channel };
      const generated = createSimulatedRequest(updatedInput);
      setRequests((current) =>
        current.map((r) => (r.id === id ? { ...generated, id, createdAt: r.createdAt } : r)),
      );
      scheduleProgress(id);
    } else {
      setInFlightCount((c) => c + 1);
      setRequests((current) =>
        current.map((r) => (r.id === id ? { ...r, status: 'running' as const, updatedAt: new Date().toISOString() } : r)),
      );
      api.redraftRequest(id, tone, channel).then(() => {
        subscribeAndHydrate(id);
      }).catch(() => {
        setInFlightCount((c) => c - 1);
      });
    }
  };

  const loadExample = (key: 'pg' | 'a16z') => {
    setDraft(key === 'pg' ? createPGDraft() : createA16zDraft());
  };

  const value: AppContextValue = {
    requests,
    selectedId,
    selectedRequest,
    draft,
    setDraft,
    updateDraftField,
    toggleFocus,
    selectRequest,
    submitDraft,
    loadExample,
    deleteRequest,
    retryRequest,
    redraft,
    isSubmitting,
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}

export const channelOptions: { value: Channel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn DM' },
  { value: 'x_dm', label: 'X DM' },
];

export const toneOptions: { value: Tone; label: string }[] = [
  { value: 'respectful', label: 'Respectful' },
  { value: 'direct', label: 'Direct' },
  { value: 'warm', label: 'Warm' },
];

export const goalOptions: { value: GoalType; label: string }[] = [
  { value: 'sell', label: 'Sell / business dev' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'fundraise', label: 'Fundraise' },
  { value: 'hire', label: 'Recruit' },
  { value: 'advice', label: 'Ask for advice / intro' },
];

export const focusOptions: { value: ResearchFocus; label: string }[] = [
  { value: 'person_background', label: 'Person background' },
  { value: 'service_surface', label: 'Product / service surface' },
  { value: 'investment_thesis', label: 'Investment thesis' },
  { value: 'recent_signals', label: 'Recent signals' },
  { value: 'objections', label: 'Likely objections' },
];
