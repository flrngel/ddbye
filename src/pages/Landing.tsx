import { ArrowRight, CheckCircle2, SearchCheck, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(155,139,232,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(100,181,246,0.18),_transparent_28%),linear-gradient(180deg,_#f8f8ff_0%,_#eef3ff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-lavender-500 to-brand-blue-500 text-white shadow-lg">
              <SearchCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-rounded text-sm font-bold text-neutral-900">Outreach OS</div>
              <div className="text-xs text-neutral-500">Due diligence first. Outreach second.</div>
            </div>
          </div>
          <Button asChild>
            <Link to="/console" className="gap-2">
              Open console
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </header>

        <main className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-18">
          <section>
            <Badge variant="lavender" className="mb-4 w-fit">Founder / sales workflow</Badge>
            <h1 className="max-w-3xl font-rounded text-5xl font-extrabold leading-[1.02] tracking-tight text-neutral-900 md:text-6xl">
              Messy target brief in. <br />
              <span className="bg-gradient-to-r from-brand-lavender-600 to-brand-blue-600 bg-clip-text text-transparent">
                Defendable outreach out.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              This is not an \"email writer\". It starts from a fuzzy founder-style brief, resolves the real target and surface,
              researches what matters, then gives you a title, subject lines, and channel-specific outreach you can actually send.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Badge variant="blue" className="px-3 py-1.5 text-xs">Person resolution</Badge>
              <Badge variant="blue" className="px-3 py-1.5 text-xs">Surface mapping</Badge>
              <Badge variant="blue" className="px-3 py-1.5 text-xs">Evidence-backed wedge</Badge>
              <Badge variant="blue" className="px-3 py-1.5 text-xs">Email + DM output</Badge>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: 'Describe the target like a human',
                  body: 'Type things like “pg / Hacker News / business angle” instead of a polished prompt.',
                },
                {
                  icon: SearchCheck,
                  title: 'Run the diligence before the copy',
                  body: 'The agent should resolve the person, the surface, the context, and the wedge first.',
                },
                {
                  icon: Sparkles,
                  title: 'Get sendable output',
                  body: 'Subject lines, final email, DM variants, and a crisp reason for why this draft exists.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[28px] border border-white/75 bg-white/80 p-5 shadow-[0_20px_60px_-30px_rgba(75,85,150,0.35)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-lavender-50 text-brand-lavender-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="font-rounded text-base font-bold text-neutral-900">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[34px] border border-white/75 bg-white/78 p-5 shadow-[0_28px_80px_-34px_rgba(75,85,150,0.4)] backdrop-blur">
            <div className="rounded-[28px] border border-neutral-200/80 bg-neutral-50/80 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-rounded text-lg font-bold text-neutral-900">Console preview</div>
                  <div className="text-sm text-neutral-500">One brief in, one clear recommendation out.</div>
                </div>
                <Badge variant="running">researching</Badge>
              </div>

              <div className="mt-5 rounded-[24px] border border-white bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Intake</div>
                <div className="mt-3 rounded-3xl border border-brand-lavender-100 bg-gradient-to-br from-brand-lavender-50 to-white p-4 text-sm leading-7 text-neutral-700">
                  “PG, famous for YC — want to explore doing business with Hacker News. Wondering if there's a wedge around search / archive browsing.”
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Research board
                  </div>
                  <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                    <li>Resolve the real surface: HN search and archive retrieval.</li>
                    <li>Respect the product; do not pitch by insulting current UX.</li>
                    <li>Offer a one-page mock before asking for a meeting.</li>
                  </ul>
                </div>
                <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-neutral-900">Outreach</div>
                  <div className="mt-3 rounded-2xl bg-brand-blue-100/60 p-3 text-xs font-semibold text-brand-blue-700">
                    Subject: A lightweight search mock for Hacker News
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    Hi Paul, I have been looking at Hacker News as a product surface... I would be happy to send over a one-page
                    mock instead of forcing a meeting.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-[24px] border border-brand-blue-100 bg-brand-blue-100/50 px-4 py-3 text-sm text-brand-blue-700">
              <span>Only two pages: landing and console. API/worker are documented, not overbuilt.</span>
              <Button variant="secondary" asChild>
                <Link to="/console">See the console</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
