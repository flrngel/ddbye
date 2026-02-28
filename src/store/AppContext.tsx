import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { seededCases } from '@/data/sampleCases';
import { advanceRun, createSimulatedRequest } from '@/logic/mockAgent';
import type { Channel, DiligenceRequest, GoalType, RequestInput, ResearchFocus, Tone } from '@/types';

type DraftInput = RequestInput;

const defaultDraft: DraftInput = {
  targetBrief: '',
  objective: '',
  offer: '',
  preferredChannel: 'email',
  tone: 'respectful',
  goalType: 'sell',
  focuses: ['person_background', 'service_surface', 'objections'],
};

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
};

const AppContext = createContext<AppContextValue | null>(null);

function createPGDraft(): DraftInput {
  return {
    targetBrief:
      'yc로 유명한 pg인데 그가 만든 서비스 중 하나인 hacker news와 비즈니스를 하고싶음. 검색이나 오래된 글 탐색 쪽에 wedge가 있는지 보고 싶다.',
    objective:
      '대상을 조사해서 어떤 명분으로 접근해야 할지 정리하고, 결국 email/DM으로 보낼 수 있는 outreach를 만들고 싶다.',
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
      'a16z의 andreessen을 투자 타겟으로 보고 싶음. 이 사람/이 펀드 관점에서 왜 worth looking at 인지부터 정리하고 싶다.',
    objective:
      '우리 회사를 generic하게 pitch하지 말고, 어떤 thesis-fit으로 접근해야 하는지 조사 후 메시지로 정리하고 싶다.',
    offer:
      'We are building workflow software for AI-native support teams, with strong retention and a wedge around quality review + automation.',
    preferredChannel: 'email',
    tone: 'direct',
    goalType: 'fundraise',
    focuses: ['person_background', 'investment_thesis', 'recent_signals', 'objections'],
  };
}

const STORAGE_KEY = 'outreachos-reset-front';

export function AppProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DiligenceRequest[]>(() => {
    if (typeof window === 'undefined') return seededCases;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seededCases;
    try {
      const parsed = JSON.parse(raw) as DiligenceRequest[];
      return parsed.length ? parsed : seededCases;
    } catch {
      return seededCases;
    }
  });
  const [selectedId, setSelectedId] = useState<string>(requests[0]?.id ?? '');
  const [draft, setDraft] = useState<DraftInput>(createPGDraft());
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
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

  const scheduleProgress = (id: string) => {
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
      }, delay);
      timeoutsRef.current.push(timeoutId);
    });
  };

  const submitDraft = () => {
    const generated = createSimulatedRequest(draft);
    setRequests((current) => [generated, ...current]);
    setSelectedId(generated.id);
    scheduleProgress(generated.id);
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
