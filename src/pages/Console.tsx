import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  FileText,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  SearchCheck,
  Sparkles,
  Target,
  Trash2,
  UserRoundSearch,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '@/components/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/time';
import { channelOptions, focusOptions, goalOptions, toneOptions, useApp } from '@/store/AppContext';
import type { Channel, Deliverable, RunStage, Tone } from '@/types';

function FieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="font-rounded text-sm font-bold text-neutral-900">{title}</div>
      {hint ? <div className="mt-0.5 text-xs leading-5 text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="gap-2"
    >
      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function StagePill({ stage }: { stage: RunStage }) {
  const variant = stage.status === 'done' ? 'ready' : stage.status === 'running' ? 'running' : 'neutral';

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white/85 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-rounded text-sm font-bold text-neutral-900">{stage.label}</div>
        <Badge variant={variant as 'ready' | 'running' | 'neutral'}>{stage.status}</Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-neutral-500">{stage.detail}</p>
    </div>
  );
}

function renderDeliverable(channel: Channel, deliverable: Deliverable) {
  const channelName = channel === 'email' ? 'Email' : channel === 'linkedin' ? 'LinkedIn DM' : 'X DM';

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-rounded text-base font-bold text-neutral-900">{deliverable.title}</div>
            <p className="mt-1 text-sm text-neutral-500">{deliverable.summary}</p>
          </div>
          <Badge variant="lavender">{channelName}</Badge>
        </div>
      </div>

      {channel === 'email' && deliverable.subjects ? (
        <SectionCard title="Subject lines" subtitle="Title / subject is first-class. The system should never bury it.">
          <div className="space-y-3">
            {deliverable.subjects.map((subject) => (
              <div key={subject} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3">
                <div className="text-sm font-medium text-neutral-800">{subject}</div>
                <CopyButton text={subject} />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Final draft" subtitle="This should read like the last step of the workflow, not the first.">
        <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-neutral-800">{deliverable.body}</pre>
        </div>
        <div className="mt-4 flex justify-end">
          <CopyButton text={deliverable.body} label="Copy draft" />
        </div>
      </SectionCard>

      <SectionCard title="Follow-up" subtitle="A low-friction second message if the first one lands but does not get a reply.">
        <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-7 text-neutral-800">{deliverable.followUp}</div>
        <div className="mt-4 flex justify-end">
          <CopyButton text={deliverable.followUp} label="Copy follow-up" />
        </div>
      </SectionCard>
    </div>
  );
}

export default function ConsolePage() {
  const { requests, selectedId, selectedRequest, draft, updateDraftField, toggleFocus, selectRequest, submitDraft, loadExample, deleteRequest, retryRequest, redraft, isSubmitting, isLoading } = useApp();
  const [outputChannel, setOutputChannel] = useState<Channel>('email');
  const [showRedraft, setShowRedraft] = useState(false);
  const [redraftTone, setRedraftTone] = useState<Tone>('respectful');
  const [redraftChannel, setRedraftChannel] = useState<Channel>('email');

  const deliverable = useMemo(() => {
    if (!selectedRequest?.outreach) return undefined;
    return outputChannel === 'email'
      ? selectedRequest.outreach.email
      : outputChannel === 'linkedin'
        ? selectedRequest.outreach.linkedin
        : selectedRequest.outreach.x_dm;
  }, [outputChannel, selectedRequest]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(155,139,232,0.24),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(100,181,246,0.2),_transparent_24%),linear-gradient(180deg,_#f7f8ff_0%,_#eef3ff_100%)]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-white/70 bg-white/60 p-4 backdrop-blur lg:w-[320px] lg:border-b-0 lg:border-r lg:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-lavender-500 to-brand-blue-500 text-white shadow-lg">
                <SearchCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-rounded text-base font-bold text-neutral-900">Outreach OS</div>
                <div className="text-xs text-neutral-500">Due diligence console</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <div className="mt-5 rounded-[28px] border border-white/75 bg-gradient-to-br from-brand-lavender-50 to-white p-4 shadow-sm">
            <div className="font-rounded text-sm font-bold text-neutral-900">What changed</div>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              The console no longer asks the user to manage campaigns or prospects before anything useful happens. It starts from one human-style brief.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="font-rounded text-sm font-bold text-neutral-900">Saved requests</div>
            <Badge variant="blue">{requests.length}</Badge>
          </div>

          <div className="mt-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-neutral-300 bg-neutral-50/70 p-5 text-center">
                <p className="text-sm leading-6 text-neutral-500">No requests yet. Write a brief and run your first due diligence.</p>
              </div>
            ) : (
              requests.map((request) => {
                const active = request.id === selectedId;
                const channelLabel = request.input.preferredChannel === 'linkedin' ? 'LinkedIn' : request.input.preferredChannel === 'x_dm' ? 'X DM' : 'Email';
                return (
                  <div key={request.id} className="group relative">
                    <button
                      onClick={() => selectRequest(request.id)}
                      className={cn(
                        'w-full rounded-[26px] border p-4 text-left transition-all',
                        active
                          ? 'border-brand-lavender-300 bg-brand-lavender-50/85 shadow-[0_18px_45px_-28px_rgba(75,85,150,0.5)]'
                          : 'border-white/70 bg-white/75 hover:border-brand-blue-200 hover:bg-white/95',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 font-rounded text-sm font-bold leading-6 text-neutral-900">{request.title}</div>
                        <Badge variant={request.status === 'ready' ? 'ready' : request.status === 'failed' ? 'failed' : 'running'}>
                          {request.status === 'running'
                            ? (request.run.find((s) => s.status === 'running')?.label ?? 'queued')
                            : request.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-neutral-500">{request.parsedHints.join(' • ')}</div>
                      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                        <span>{channelLabel}</span>
                        <span title={request.updatedAt}>{formatRelativeTime(request.updatedAt)}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
                      className="absolute right-3 top-3 rounded-xl p-1.5 text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label="Delete request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex-1 px-4 py-5 lg:px-7 lg:py-6">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <SectionCard
              title="What are you trying to make happen?"
              subtitle="Write this the way you would explain it to a teammate. The system should translate a messy brief into structured diligence and outreach."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => loadExample('pg')}>
                    Load PG example
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => loadExample('a16z')}>
                    Load a16z example
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                <div>
                  <FieldLabel
                    title="1. Who or what do you want to investigate?"
                    hint="Messy is fine. Example: ‘yc로 유명한 pg인데 그가 만든 서비스 중 하나인 hacker news와 비즈니스를 하고싶음.’"
                  />
                  <Textarea
                    value={draft.targetBrief}
                    onChange={(event) => updateDraftField('targetBrief', event.target.value)}
                    placeholder="Describe the target the way you would naturally say it."
                    className="min-h-[146px]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <FieldLabel
                      title="2. What do you want from them?"
                      hint="The ask should shape the research. Sales, partnership, fundraising, advice, etc."
                    />
                    <Textarea
                      value={draft.objective}
                      onChange={(event) => updateDraftField('objective', event.target.value)}
                      placeholder="What outcome are you trying to create?"
                      className="min-h-[88px]"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      title="3. What are you offering?"
                      hint="Give the system the product, memo, deck, service, or angle you actually want to bring into the outreach."
                    />
                    <Textarea
                      value={draft.offer}
                      onChange={(event) => updateDraftField('offer', event.target.value)}
                      placeholder="Describe your offer, product, or thesis in one or two crisp sentences."
                      className="min-h-[88px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
                <div>
                  <FieldLabel title="Deliverable" hint="Choose the output you want first. You can still preview the other channels later." />
                  <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/80 bg-brand-blue-100/35 p-2">
                    {channelOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateDraftField('preferredChannel', option.value)}
                        className={cn(
                          'rounded-2xl px-4 py-2 text-sm font-semibold transition-all',
                          draft.preferredChannel === option.value
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel title="Goal type" hint="This helps decide what the agent should optimize for." />
                  <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/80 bg-brand-blue-100/35 p-2">
                    {goalOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateDraftField('goalType', option.value)}
                        className={cn(
                          'rounded-2xl px-3 py-2 text-left text-sm font-medium transition-all',
                          draft.goalType === option.value
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel title="Tone" hint="Tone should be explicit because respectful founder notes and direct sales notes are not the same." />
                  <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/80 bg-brand-blue-100/35 p-2">
                    {toneOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateDraftField('tone', option.value)}
                        className={cn(
                          'rounded-2xl px-4 py-2 text-sm font-semibold transition-all',
                          draft.tone === option.value
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <FieldLabel title="Research focus" hint="Optional. Tell the agent what context to look extra hard at before it writes anything." />
                <div className="flex flex-wrap gap-2">
                  {focusOptions.map((option) => {
                    const selected = draft.focuses.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleFocus(option.value)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                          selected
                            ? 'border-brand-lavender-300 bg-brand-lavender-50 text-brand-lavender-700'
                            : 'border-white/80 bg-white/80 text-neutral-600 hover:border-brand-blue-200 hover:text-neutral-900',
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-brand-lavender-100 bg-gradient-to-r from-brand-lavender-50 to-white p-4">
                <div>
                  <div className="font-rounded text-sm font-bold text-neutral-900">What happens next</div>
                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    The agent should resolve the target, research the context, choose a wedge, then write title + outreach. Copy comes last.
                  </p>
                </div>
                <Button onClick={submitDraft} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Running...
                    </>
                  ) : (
                    <>
                      Run due diligence
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-6">
                <SectionCard
                  title="Research board"
                  subtitle="This is the layer the previous version got wrong. The job is to justify the outreach, not to dump noisy controls."
                  action={selectedRequest ? <Badge variant={selectedRequest.status === 'ready' ? 'ready' : 'running'}>{selectedRequest.status}</Badge> : undefined}
                >
                  {selectedRequest ? (
                    <div className="space-y-5">
                      {selectedRequest.status === 'failed' && (
                        <div role="alert" className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                            <AlertTriangle className="h-4 w-4" /> Run failed
                          </div>
                          <p className="mt-2 text-sm leading-6 text-red-700/80">
                            {selectedRequest.errorMessage ?? 'The run failed. You can retry with the same brief.'}
                          </p>
                          <Button variant="secondary" size="sm" className="mt-3 gap-2" onClick={() => retryRequest(selectedRequest.id)}>
                            <RefreshCw className="h-4 w-4" /> Retry
                          </Button>
                        </div>
                      )}
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[24px] border border-brand-blue-100 bg-brand-blue-100/45 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-blue-700">
                            <UserRoundSearch className="h-4 w-4" /> Person
                          </div>
                          <div className="font-rounded text-base font-bold text-neutral-900">{selectedRequest.research?.person ?? 'Resolving...'}</div>
                        </div>
                        <div className="rounded-[24px] border border-brand-blue-100 bg-brand-blue-100/45 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-blue-700">
                            <Target className="h-4 w-4" /> Organization
                          </div>
                          <div className="font-rounded text-base font-bold text-neutral-900">{selectedRequest.research?.organization ?? 'Resolving...'}</div>
                        </div>
                        <div className="rounded-[24px] border border-brand-blue-100 bg-brand-blue-100/45 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-blue-700">
                            <Link2 className="h-4 w-4" /> Surface
                          </div>
                          <div className="font-rounded text-base font-bold text-neutral-900">{selectedRequest.research?.surface ?? 'Resolving...'}</div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-neutral-200 bg-neutral-50/70 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Parsed from the brief</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedRequest.parsedHints.map((hint) => (
                            <Badge key={hint} variant="neutral" className="px-3 py-1.5 text-xs">
                              {hint}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <SectionCard title="Why this target" subtitle="The diligence should explain why this person / org / surface is actually the right place to attack.">
                          <ul className="space-y-3 text-sm leading-6 text-neutral-700">
                            {(selectedRequest.research?.whyThisTarget ?? ['The agent is still running...']).map((item) => (
                              <li key={item} className="rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </SectionCard>
                        <SectionCard title="Agent run" subtitle="Kept visible, but compact. The UI should prove that diligence happens before copy.">
                          <div className="space-y-3">
                            {selectedRequest.run.map((stage) => (
                              <StagePill key={stage.key} stage={stage} />
                            ))}
                          </div>
                        </SectionCard>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {(selectedRequest.research?.contextCards ?? []).map((card) => (
                          <SectionCard key={card.title} title={card.title} subtitle={card.body}>
                            <ul className="space-y-3 text-sm leading-6 text-neutral-700">
                              {card.bullets.map((item) => (
                                <li key={item} className="rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </SectionCard>
                        ))}
                      </div>

                      <SectionCard title="Recommended wedge" subtitle="One clear angle beats a pile of strategy toggles.">
                        <div className="rounded-[24px] border border-brand-lavender-100 bg-gradient-to-br from-brand-lavender-50 to-white p-4">
                          <div className="font-rounded text-lg font-bold text-neutral-900">
                            {selectedRequest.research?.recommendedAngle.headline ?? 'Finding the angle...'}
                          </div>
                          <p className="mt-3 text-sm leading-7 text-neutral-700">
                            {selectedRequest.research?.recommendedAngle.rationale ?? 'The system is still synthesizing the research into one defendable angle.'}
                          </p>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
                            <div className="mb-3 font-rounded text-sm font-bold text-emerald-700">Mention</div>
                            <ul className="space-y-2 text-sm leading-6 text-neutral-700">
                              {(selectedRequest.research?.recommendedAngle.mention ?? []).map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-4">
                            <div className="mb-3 font-rounded text-sm font-bold text-amber-700">Avoid</div>
                            <ul className="space-y-2 text-sm leading-6 text-neutral-700">
                              {(selectedRequest.research?.recommendedAngle.avoid ?? []).map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Evidence used" subtitle="Every important claim should tie back to user input, public research, or a clearly marked inference.">
                        <div className="space-y-3">
                          {(selectedRequest.research?.evidence ?? []).map((item) => (
                            <div key={item.id} className="rounded-[24px] border border-neutral-200 bg-neutral-50/70 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={item.sourceType === 'Public web' ? 'blue' : item.sourceType === 'User brief' ? 'lavender' : 'neutral'}>
                                  {item.sourceType}
                                </Badge>
                                <Badge variant="neutral">{item.confidence}</Badge>
                                <span className="text-xs text-neutral-500">{item.sourceLabel}</span>
                              </div>
                              <div className="mt-3 text-sm leading-6 text-neutral-800">{item.claim}</div>
                              <div className="mt-2 text-xs leading-5 text-neutral-500">Used for: {item.usedFor}</div>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-neutral-300 bg-neutral-50/70 p-8 text-center text-sm text-neutral-500">
                      Submit a brief above to start your first due diligence run.
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Outreach studio"
                  subtitle="Subject, draft, and follow-up live together because the deliverable should feel complete, not scattered."
                  action={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOutputChannel('email')}
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm font-semibold transition-all',
                          outputChannel === 'email' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900',
                        )}
                      >
                        <Mail className="mr-1 inline h-4 w-4" /> Email
                      </button>
                      <button
                        onClick={() => setOutputChannel('linkedin')}
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm font-semibold transition-all',
                          outputChannel === 'linkedin' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900',
                        )}
                      >
                        <MessageSquare className="mr-1 inline h-4 w-4" /> LinkedIn
                      </button>
                      <button
                        onClick={() => setOutputChannel('x_dm')}
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm font-semibold transition-all',
                          outputChannel === 'x_dm' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900',
                        )}
                      >
                        <Sparkles className="mr-1 inline h-4 w-4" /> X DM
                      </button>
                    </div>
                  }
                >
                  {selectedRequest?.status === 'running' ? (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-brand-blue-100 bg-brand-blue-100/55 p-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-blue-700">
                          <Sparkles className="h-4 w-4 animate-pulse" /> Outreach is waiting for the diligence to finish.
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          This is intentional. The copy should be downstream from person resolution, context research, and wedge synthesis.
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {selectedRequest.run.map((stage) => (
                          <StagePill key={stage.key} stage={stage} />
                        ))}
                      </div>
                    </div>
                  ) : deliverable ? (
                    <div className="space-y-4">
                      {selectedRequest?.status === 'ready' && !showRedraft && (
                        <div className="flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setRedraftTone(selectedRequest.input.tone);
                              setRedraftChannel(selectedRequest.input.preferredChannel);
                              setShowRedraft(true);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" /> Redraft
                          </Button>
                        </div>
                      )}
                      {showRedraft && selectedRequest && (
                        <div className="rounded-[24px] border border-brand-lavender-100 bg-gradient-to-br from-brand-lavender-50 to-white p-4">
                          <div className="font-rounded text-sm font-bold text-neutral-900">Redraft with different settings</div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <div className="mb-1.5 text-xs font-semibold text-neutral-500">Tone</div>
                              <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/80 bg-brand-blue-100/35 p-2">
                                {toneOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => setRedraftTone(option.value)}
                                    className={cn(
                                      'rounded-2xl px-3 py-1.5 text-sm font-semibold transition-all',
                                      redraftTone === option.value
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="mb-1.5 text-xs font-semibold text-neutral-500">Channel</div>
                              <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/80 bg-brand-blue-100/35 p-2">
                                {channelOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => setRedraftChannel(option.value)}
                                    className={cn(
                                      'rounded-2xl px-3 py-1.5 text-sm font-semibold transition-all',
                                      redraftChannel === option.value
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                redraft(selectedRequest.id, redraftTone, redraftChannel);
                                setShowRedraft(false);
                              }}
                            >
                              Generate
                            </Button>
                            <button
                              onClick={() => setShowRedraft(false)}
                              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                            >
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {renderDeliverable(outputChannel, deliverable)}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-neutral-300 bg-neutral-50/70 p-8 text-center text-sm text-neutral-500">
                      Outreach copy will appear here once the research is done.
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Why this layout" subtitle="The old version made the user manage objects and inspect noisy strategy controls. This version keeps the workflow tight.">
                  <div className="grid gap-3 text-sm leading-6 text-neutral-700">
                    {[
                      {
                        icon: FileText,
                        title: 'Input first, model second',
                        body: 'The user starts with one brief. Internal entities can exist later, but they should not be the first UX they see.',
                      },
                      {
                        icon: SearchCheck,
                        title: 'Research board before copy',
                        body: 'The system has to justify who the target is, what surface matters, and what wedge exists before it writes the message.',
                      },
                      {
                        icon: Mail,
                        title: 'Subject and final draft are first-class',
                        body: 'A cold outreach tool that buries the title or subject line is missing one of the most important parts of the deliverable.',
                      },
                    ].map((item) => (
                      <div key={item.title} className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-lavender-50 text-brand-lavender-700">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-rounded text-sm font-bold text-neutral-900">{item.title}</div>
                            <p className="mt-1 text-sm leading-6 text-neutral-600">{item.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
