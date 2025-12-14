// src/App.tsx
import React, { useEffect, useState } from 'react';
import WeekOneGlance from './WeekOneGlance';
import DMSimulator from './DMSimulator';
import { supabase } from './supabaseClient';

type ScrollStepId = 'week-one' | 'train' | 'dm' | 'report';
type CoachSize = 'solo' | 'micro' | 'team';

const SITE_VERSION = 'coach-landing-v2-ink-paper';

function useScrollSteps(stepIds: ScrollStepId[]): ScrollStepId {
  const [activeId, setActiveId] = useState<ScrollStepId>(stepIds[0] ?? 'week-one');

  useEffect(() => {
    if (!stepIds.length) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const id = el.dataset.stepId as ScrollStepId | undefined;
            if (id) setActiveId(id);
          }
        }
      },
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0.3,
      }
    );

    stepIds.forEach((id) => {
      const el = document.querySelector<HTMLElement>(`[data-step-id="${id}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [stepIds.join('|')]);

  return activeId;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

const deviceShellClass =
  'relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-neutral-900/80 to-black/95 shadow-device ring-1 ring-white/10';

const App: React.FC = () => {
  const [coachSize, setCoachSize] = useState<CoachSize>('solo');

  useEffect(() => {
    document.title = 'Lungeable — Adaptive programming + check-in OS for remote strength coaches';
  }, []);

  const scrollToJoin = () => {
    const el = document.getElementById('join');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Header onJoin={scrollToJoin} />

      <main className="flex-1" id="main">
        <Hero
          onJoin={scrollToJoin}
          coachSize={coachSize}
          onCoachSizeChange={setCoachSize}
        />

        <WhySwitchSection />

        <ScrollStory onJoin={scrollToJoin} />

        <ProductOverview onJoin={scrollToJoin} />

        <SurfacesSection />

        <DefaultStackSection />

        <CompareSection />

        <PricingSection onJoin={scrollToJoin} />

        <CoachProof />

        <SafeTrialSection onJoin={scrollToJoin} />

        <ResultsStrip />

        <JoinSection />

        <FaqSection />
      </main>

      <Footer />
      <MobileBottomCta onJoin={scrollToJoin} />
    </div>
  );
};

export default App;

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function Header({ onJoin }: { onJoin: () => void }) {
  return (
    <header className="safe-pt sticky top-0 z-50 border-b border-border bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#coach" className="flex items-center gap-2">
          <img
            src="/Lungeable%20Logo.png"
            alt="Lungeable logo"
            className="h-7 w-7 rounded-xl"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-ink">Lungeable</span>
            <span className="text-[11px] text-neutral-500">Adaptive programming OS</span>
          </div>
        </a>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
            <a href="#product" className="hover:text-ink">
              Product
            </a>
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#compare" className="hover:text-ink">
              Compare
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
            <a href="/login" className="hover:text-ink">
              Log in
            </a>
          </nav>

          <button
            type="button"
            onClick={onJoin}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
          >
            Apply for early access
          </button>
        </div>
      </div>
    </header>
  );
}


/* -------------------------------------------------------------------------- */
/* Hero (Ink & Paper: black/white first, one clear conversion path)           */
/* -------------------------------------------------------------------------- */

function Hero({
  onJoin,
  coachSize,
  onCoachSizeChange,
}: {
  onJoin: () => void;
  coachSize: CoachSize;
  onCoachSizeChange: (size: CoachSize) => void;
}) {
  const sizeCopy: Record<CoachSize, string> = {
    solo: 'Solo coaches: keep quality high while cutting weekly programming time.',
    micro: '2–5 coach teams: standardize templates without losing each coach’s voice.',
    team: 'Teams/brands: delegate safely while guardrails enforce your rules.',
  };

  return (
    <section
      id="coach"
      className="relative overflow-hidden border-b border-border bg-paper pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24"
    >
      {/* subtle grayscale glow (no brand gradients) */}
      <div className="absolute inset-x-0 -top-56 -z-10 h-72 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.10),transparent_55%)]" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Text column */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Adaptive training OS for remote strength coaches
          </p>

          <h1
            className="mt-4 font-semibold tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)' }}
          >
            Weekly Reports write next week.
            <span className="block">
              You review and{' '}
              <span className="underline decoration-black/20 underline-offset-8">
                Accept‑Week
              </span>
              .
            </span>
          </h1>

          <p className="mt-4 text-sm text-neutral-600 measure">
            Draft safe weeks from your constraints, handle mid‑week chaos from client DMs,
            and keep your progression rules intact — so you spend your time coaching,
            not rewriting spreadsheets.
          </p>

          <p className="mt-3 text-xs text-neutral-500">
            Guardrails built in: SRA spacing, set ceilings, exposure budgets, auto‑deload.
          </p>

          {/* Coach size segmented control (Apple-like) */}
          <div className="mt-6 space-y-2">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-soft p-1 text-xs">
              {(['solo', 'micro', 'team'] as CoachSize[]).map((size) => {
                const selected = coachSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onCoachSizeChange(size)}
                    className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-medium transition shadow-sm ${
                      selected
                        ? 'bg-paper text-ink'
                        : 'bg-transparent text-neutral-600 hover:text-ink'
                    }`}
                  >
                    {size === 'solo'
                      ? 'Solo coach'
                      : size === 'micro'
                      ? '2–5 coach team'
                      : 'Team / brand'}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500">{sizeCopy[coachSize]}</p>
          </div>

          {/* CTA hierarchy: one primary, one soft secondary */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onJoin}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
            >
              Apply for early access
            </button>

            <a
              href="#how"
              className="text-sm text-neutral-600 hover:text-ink"
            >
              See how it works →
            </a>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            Limited seats while we iterate with coaches. No credit card, no lock‑in.
          </p>
        </div>

        {/* Visual: signature moment (Weekly Report → Accept‑Week) */}
        <div aria-hidden className="relative h-[340px] sm:h-[380px] lg:h-[440px]">
          <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_40%_15%,rgba(0,0,0,0.12),transparent_60%)] blur-2xl" />

          <div className={`${deviceShellClass} relative flex h-full flex-col p-5`}>
            <div className="flex items-center justify-between text-[11px] text-neutral-300">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neutral-500/80" />
                <span className="h-2 w-2 rounded-full bg-neutral-400/80" />
                <span className="h-2 w-2 rounded-full bg-neutral-300/80" />
              </span>
              <span className="text-neutral-400">Weekly Report → Accept‑Week</span>
              <span className="text-neutral-500">Coach web</span>
            </div>

            <div className="mt-4 flex-1">
              <WeeklyReportPreview />
            </div>

            <p className="mt-3 text-[11px] text-neutral-500">
              Accept just commits the drafted week. You can tweak anything first.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Why coaches switch (pain-first)                                            */
/* -------------------------------------------------------------------------- */

function WhySwitchSection() {
  const cards = [
    {
      title: 'Kill Sunday programming hell',
      body:
        'Weekly Reports draft next week. You review and Accept‑Week — instead of rewriting 30 programs from scratch.',
    },
    {
      title: 'Guardrails enforce your rules',
      body:
        'Set ceilings, SRA spacing, exposure budgets and time limits. Lungeable proposes changes that stay inside your constraints.',
    },
    {
      title: 'Handle chaos without breaking the block',
      body:
        'Pocket Coach responds to “hotel gym”, “knee sore”, and time crunches — while keeping anchors and intent intact.',
    },
    {
      title: 'One OS for plans, logs, and check-ins',
      body:
        'Stop stitching Sheets + chat + check-in docs. The coach workflow lives in one place, with your default stack still intact.',
    },
  ];

  return (
    <section id="why" className="cv-auto border-b border-border bg-soft py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Why coaches switch
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            The same coaching quality — with dramatically less weekly rework.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            Lungeable is not a “business platform.” It is the training OS that makes programming + check-ins faster, while keeping your decision-making and standards.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-paper p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Scrollytelling "How it works"                                              */
/* -------------------------------------------------------------------------- */

function ScrollStory({ onJoin }: { onJoin: () => void }) {
  const steps = [
    {
      id: 'week-one' as const,
      kicker: 'Step 1 · Generate Week 1',
      title: 'Start a block in minutes — not hours.',
      body:
        'Pick the goal, schedule and equipment. Lungeable drafts a safe week that already respects your templates and rules.',
    },
    {
      id: 'train' as const,
      kicker: 'Step 2 · Clients train & log',
      title: 'Logs flow into the system automatically.',
      body:
        'Clients get a simple Today card and fast logging. No spreadsheet back-and-forth — the data is there when you need it.',
    },
    {
      id: 'dm' as const,
      kicker: 'Step 3 · Pocket Coach handles chaos',
      title: '"Hotel gym" and "knee sore" don’t break the block.',
      body:
        'Pocket Coach turns real-life DMs into guardrail-safe session tweaks. You approve changes instead of rebuilding days.',
    },
    {
      id: 'report' as const,
      kicker: 'Step 4 · Weekly Report → Accept‑Week',
      title: 'Weekly Reports propose next week — you Accept‑Week.',
      body:
        'Run a weekly pass: see what happened, review the proposed draft, tweak if needed, then commit the week in one decision.',
    },
  ];

  const stepIds = steps.map((s) => s.id);
  const activeId = useScrollSteps(stepIds);

  return (
    <section id="how" className="cv-auto border-y border-border bg-soft py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              One weekly loop.
              <span className="block text-neutral-600">Less Sunday programming hell.</span>
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              Scroll the exact workflow: generate a week, let clients log, let Pocket Coach absorb chaos, then run Weekly Reports and Accept‑Week.
            </p>

            <StepProgress activeId={activeId} stepIds={stepIds} />

            <div className="mt-6 hidden lg:block">
              <button
                type="button"
                onClick={onJoin}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
              >
                Apply for early access
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-1">
            <div className="lg:order-2">
              <ScrollDevice activeId={activeId} onJoin={onJoin} />
            </div>

            <div className="lg:order-1">
              <div className="space-y-4">
                {steps.map((step) => {
                  const active = step.id === activeId;
                  return (
                    <article
                      key={step.id}
                      data-step-id={step.id}
                      className={
                        'scroll-mt-28 rounded-2xl border p-5 transition-colors ' +
                        (active
                          ? 'border-black/15 bg-paper'
                          : 'border-border bg-transparent')
                      }
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                        {step.kicker}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-neutral-600">{step.body}</p>
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 lg:hidden">
                <button
                  type="button"
                  onClick={onJoin}
                  className="inline-flex w-full min-h-[44px] items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
                >
                  Apply for early access
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepProgress({
  activeId,
  stepIds,
}: {
  activeId: ScrollStepId;
  stepIds: ScrollStepId[];
}) {
  const index = Math.max(0, stepIds.indexOf(activeId));

  return (
    <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
      <span>
        Step {index + 1} of {stepIds.length}
      </span>
      <div className="flex gap-1.5" aria-hidden>
        {stepIds.map((id) => (
          <span
            key={id}
            className={
              'h-1.5 w-7 rounded-full transition-colors ' +
              (id === activeId ? 'bg-black' : 'bg-black/15')
            }
          />
        ))}
      </div>
    </div>
  );
}

function ScrollDevice({
  activeId,
  onJoin,
}: {
  activeId: ScrollStepId;
  onJoin: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();

  const label =
    activeId === 'week-one'
      ? 'Week 1 draft'
      : activeId === 'train'
        ? 'Client log'
        : activeId === 'dm'
          ? 'Pocket Coach DM'
          : 'Weekly Report → Accept‑Week';

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.12),transparent_60%)] blur-3xl" />
      <div className={deviceShellClass}>
        <div className="flex items-center justify-between px-4 pt-4 text-[11px] text-neutral-300 sm:px-5 sm:pt-5">
          <span className="font-medium text-neutral-200">Coach preview</span>
          <span className="text-neutral-400">{label}</span>
        </div>

        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <div className="relative h-[340px] sm:h-[360px]">
            <DeviceScene visible={activeId === 'week-one'} reducedMotion={reducedMotion}>
              <WeekOneGlance />
            </DeviceScene>

            <DeviceScene visible={activeId === 'train'} reducedMotion={reducedMotion}>
              <TrainLogPreview />
            </DeviceScene>

            <DeviceScene visible={activeId === 'dm'} reducedMotion={reducedMotion}>
              <DMSimulator compact />
            </DeviceScene>

            <DeviceScene visible={activeId === 'report'} reducedMotion={reducedMotion}>
              <WeeklyReportPreview />
            </DeviceScene>
          </div>

          <div className="mt-4 flex justify-between gap-3 text-xs text-neutral-400">
            <span>Real product UI, simplified for demo.</span>
            <button
              type="button"
              onClick={onJoin}
              className="text-neutral-200 hover:text-white"
            >
              Apply →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceScene({
  visible,
  reducedMotion,
  children,
}: {
  visible: boolean;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const base = 'absolute inset-0 transition-opacity';
  const hidden = reducedMotion
    ? 'opacity-0 pointer-events-none'
    : 'opacity-0 pointer-events-none';

  return (
    <div className={base + ' ' + (visible ? 'opacity-100' : hidden)}>
      {children}
    </div>
  );
}

function TrainLogPreview() {
  return (
    <div className="h-full rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>Today · Upper</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5 text-[11px] text-neutral-300">
          Time‑fit 45 min
        </span>
      </div>

      <div className="mt-4 space-y-2 text-xs text-neutral-200">
        <LogRow name="Bench Press" detail="3×5 @ RPE 7" status="done" />
        <LogRow name="Row" detail="3×8" status="done" />
        <LogRow name="Incline DB Press" detail="2×10" status="todo" />
        <LogRow name="Curls" detail="2×12" status="todo" />
      </div>

      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-300">
        Fast logging → feeds Weekly Reports automatically.
      </div>
    </div>
  );
}

function LogRow({
  name,
  detail,
  status,
}: {
  name: string;
  detail: string;
  status: 'done' | 'todo';
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
      <div>
        <p className="font-medium text-neutral-100">{name}</p>
        <p className="mt-0.5 text-[11px] text-neutral-400">{detail}</p>
      </div>
      <span
        className={
          'rounded-full px-2 py-1 text-[11px] font-semibold ' +
          (status === 'done'
            ? 'bg-white text-black'
            : 'bg-black/30 text-neutral-300 ring-1 ring-white/10')
        }
      >
        {status === 'done' ? 'Logged' : 'Next'}
      </span>
    </div>
  );
}

function WeeklyReportPreview() {
  return (
    <div className="grid h-full grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-100">Weekly Report</p>
          <p className="text-[11px] text-neutral-500">Week 6</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ReportTile label="Sessions" value="5/6" sub="83%" />
          <ReportTile label="Avg RPE" value="7.1" sub="in range" />
          <ReportTile label="Flags" value="1" sub="review" />
        </div>

        <div className="mt-4 space-y-2">
          <ReportRow left="Lower volume" right="−2 sets" />
          <ReportRow left="Press exposure" right="maintained" />
          <ReportRow left="Knee note" right="ROM tweak" />
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
          <p className="text-[11px] text-neutral-300">
            “Proposed Week 7 respects your set ceilings and SRA spacing.”
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-100">Next Week Draft</p>
          <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5 text-[11px] text-neutral-300">
            Safe
          </span>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <span className="text-neutral-100">Mon</span>
            <span className="text-neutral-200">Lower</span>
            <span className="text-[11px] text-neutral-400">Time‑fit</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <span className="text-neutral-100">Wed</span>
            <span className="text-neutral-200">Upper</span>
            <span className="text-[11px] text-neutral-400">Anchors kept</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <span className="text-neutral-100">Fri</span>
            <span className="text-neutral-200">Lower</span>
            <span className="text-[11px] text-neutral-400">Knee‑aware</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <span className="text-neutral-100">Sat</span>
            <span className="text-neutral-200">Accessories</span>
            <span className="text-[11px] text-neutral-400">Trimmed</span>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[11px] text-neutral-400">
          Guardrails checked: SRA • RPE • Sets
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-100"
        >
          Accept‑Week
        </button>

        <p className="mt-2 text-[11px] text-neutral-500">
          Tweak anything before you accept. Accept just commits the week.
        </p>
      </div>
    </div>
  );
}

function ReportTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 text-center">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-100">{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
    </div>
  );
}

function ReportRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-neutral-300">
      <span>{left}</span>
      <span className="text-neutral-200">{right}</span>
    </div>
  );
}
/* -------------------------------------------------------------------------- */
/* Coach proof / benefits                                                     */
/* -------------------------------------------------------------------------- */

function CoachProof() {
  const quotes = [
    {
      quote:
        "“Weekly Reports → Accept‑Week is the first workflow that actually feels like a coach's tool, not a prettier spreadsheet.”",
      who: 'Alex R. (Strength Coach)',
      meta: '24 online clients',
    },
    {
      quote:
        '“Pocket Coach handles the stuff that usually derails a block — travel, time crunches, tweaks — without me rebuilding sessions.”',
      who: 'Maya L. (Physique Coach)',
      meta: '18 online clients',
    },
    {
      quote:
        "“The guardrails are the point. It keeps quality consistent when I'm moving fast.”",
      who: 'Jordan K. (Team Coach)',
      meta: '3 coaches',
    },
  ];

  return (
    <section className="cv-auto border-b border-border bg-paper py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Proof
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Early coach feedback
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-neutral-600">
          Replace these with real pilot quotes as soon as you have them. Specificity converts.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {quotes.map((q) => (
            <div
              key={q.who}
              className="rounded-2xl border border-border bg-paper p-5 shadow-sm"
            >
              <p className="text-sm text-neutral-700">{q.quote}</p>
              <div className="mt-4 text-xs">
                <p className="font-semibold text-ink">{q.who}</p>
                <p className="text-neutral-500">{q.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-soft p-5">
          <p className="text-sm font-semibold text-ink">Pilot story (template)</p>
          <p className="mt-2 text-sm text-neutral-600">
            “Before: 6–8 hours Sunday programming. After 4 weeks: ~3–4 hours using Weekly Reports +
            Accept‑Week, with fewer missed sessions.”
          </p>
        </div>
      </div>
    </section>
  );
}

function JoinSection() {
  return (
    <section id="join" className="cv-auto border-b border-border bg-soft py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Coach beta
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Join the coach waitlist.
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              We onboard coaches in small cohorts so we can iterate fast. Tell us a bit about your
              roster and workflow — we’ll reach out when a seat opens.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-neutral-600">
              <li className="flex gap-2">
                <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-black" />
                No credit card. No lock‑in.
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-black" />
                Low‑volume, high‑signal updates.
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-black" />
                Bring your templates + rules — Lungeable enforces them.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-paper p-6 shadow-sm">
            <CoachSignupForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function CoachSignupForm() {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [coachType, setCoachType] = useState<'strength' | 'hybrid' | 'physique' | 'other'>('strength');
  const [clients, setClients] = useState<'1-5' | '6-20' | '21-50' | '51+'>('6-20');
  const [stack, setStack] = useState<string[]>([]);
  const [mainPain, setMainPain] = useState<'programming-time' | 'changes' | 'adherence' | 'scaling' | 'other'>('programming-time');
  const [allowContact, setAllowContact] = useState(true);
  const [consent, setConsent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!consent) {
      setError('Please confirm you agree to be contacted about early access.');
      return;
    }

    setState('submitting');

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
    const ref = typeof document !== 'undefined' ? document.referrer || undefined : undefined;

    // Store extra context without requiring DB schema changes.
    const notesObj = {
      coach_type: coachType,
      main_pain: mainPain,
      stack,
      allow_contact: allowContact,
      consent,
    };

    try {
      const payload = {
        email: trimmedEmail,
        name: name.trim() || null,
        primary_focus: coachType,
        client_count: clients,
        coach_intents: [mainPain],
        presence: null,
        notes: JSON.stringify(notesObj),
        source: 'coach-landing',
        site_version: SITE_VERSION,
        user_agent: ua,
        referer: ref,
      };

      const { error: insertError } = await supabase
        .from('leads_coach_waitlist')
        .insert(payload);

      // 23505 = unique violation (email already exists). Treat as soft-success.
      if (insertError && (insertError as any).code !== '23505') throw insertError;

      setState('success');
      setEmail('');
      setName('');
    } catch (err: any) {
      setState('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  }

  function toggleStack(value: string) {
    setStack((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const stackOptions = ['Sheets', 'Notion', 'TrueCoach', 'Trainerize', 'Everfit', 'WhatsApp/DMs', 'Other'];
  const mainPainOptions = [
    { key: 'programming-time', label: 'Programming takes too long' },
    { key: 'changes', label: 'Too many client changes mid-week' },
    { key: 'adherence', label: 'Adherence + tracking is messy' },
    { key: 'scaling', label: 'Hard to scale quality across a roster' },
    { key: 'other', label: 'Other' },
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-700">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
            placeholder="you@company.com"
            inputMode="email"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
            placeholder="First + last"
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-neutral-700">Coach type</span>
          <select
            value={coachType}
            onChange={(e) => setCoachType(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          >
            <option value="strength">Strength</option>
            <option value="hybrid">Hybrid</option>
            <option value="physique">Physique</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-neutral-700">Clients</span>
          <select
            value={clients}
            onChange={(e) => setClients(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          >
            <option value="1-5">1–5</option>
            <option value="6-20">6–20</option>
            <option value="21-50">21–50</option>
            <option value="51+">51+</option>
          </select>
        </label>

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-neutral-700">Your current stack</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stackOptions.map((o) => {
              const active = stack.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggleStack(o)}
                  className={
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
                    (active
                      ? 'border-ink bg-ink text-paper'
                      : 'border-border bg-paper text-neutral-700 hover:border-black/30 hover:text-ink')
                  }
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-neutral-700">Biggest pain right now</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {mainPainOptions.map((o) => {
              const active = mainPain === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setMainPain(o.key as any)}
                  className={
                    'rounded-xl border px-3 py-2 text-left text-xs transition-colors ' +
                    (active
                      ? 'border-black/20 bg-soft text-ink'
                      : 'border-border bg-paper text-neutral-700 hover:border-black/20')
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={allowContact}
          onChange={(e) => setAllowContact(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border border-border accent-black"
        />
        It’s ok to email me product updates and beta access info.
      </label>

      <label className="flex items-start gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border border-border accent-black"
        />
        I agree to be contacted about early access.
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={state === 'submitting' || state === 'success'}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900 disabled:cursor-default disabled:bg-neutral-300 disabled:text-neutral-700"
        >
          {state === 'submitting'
            ? 'Submitting...'
            : state === 'success'
            ? 'You’re on the list'
            : 'Join the coach waitlist'}
        </button>
        <p className="text-xs text-neutral-500">
          We’ll email when spots open. Expect low‑volume, high‑signal updates only.
        </p>
      </div>

      {error && (
        <p className="toast-pop mt-2 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}

      {state === 'success' && (
        <div className="toast-pop mt-3 rounded-xl border border-emerald-600/20 bg-emerald-600/5 p-4 text-xs text-emerald-900">
          <p className="font-semibold">You’re in.</p>
          <p className="mt-1 text-emerald-900/80">
            We’ll reach out as we open new coach seats (small cohorts), and share previews you can
            react to. No spam, no marketing drip.
          </p>
        </div>
      )}

      {state === 'error' && !error && (
        <p className="toast-pop mt-2 text-xs text-rose-600">
          Something went wrong. Please refresh and try again.
        </p>
      )}
    </form>
  );
}
/* -------------------------------------------------------------------------- */
/* Founder footer                                                             */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/* New marketing sections: product, stack, surfaces, compare, pricing, trial, */
/* results, FAQ                                                               */
/* -------------------------------------------------------------------------- */

function ProductOverview({ onJoin }: { onJoin: () => void }) {
  const features = [
    {
      title: 'Weekly Reports → Accept‑Week',
      body:
        'Clients train. Weekly Reports draft next week from outcomes + your constraints. You review and Accept‑Week.',
    },
    {
      title: 'Pocket Coach (DM replans)',
      body:
        'When life happens, Pocket Coach proposes a safe tweak that keeps anchors, protects SRA, and respects set ceilings.',
    },
    {
      title: 'Coach Desk (triage)',
      body:
        'Know who needs action, batch approvals, and keep check-ins focused on coaching—not rewriting.',
    },
  ];

  return (
    <section id="product" className="cv-auto border-b border-border bg-paper py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Product
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Keep your stack. Become a faster coach.
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              Lungeable is narrow on purpose: it’s the training OS that makes weekly programming
              and check‑ins dramatically faster, while guardrails enforce your rules.
            </p>
          </div>

          <button
            type="button"
            onClick={onJoin}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
          >
            Apply for early access
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-paper p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{f.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-neutral-500">
          Lungeable doesn’t replace billing, scheduling, documents, or community. It plugs into
          what you already use.
        </p>
      </div>
    </section>
  );
}

function SurfacesSection() {
  return (
    <section className="cv-auto border-b border-border bg-soft py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Surfaces
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Built for how coaches actually work.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            Lungeable is a web‑first control panel for coaches, plus a simple mobile experience for
            clients. You keep billing, scheduling, documents, and community tools — we run the
            training loop.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-paper p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-ink">Coach Web</h3>
            <p className="mt-2 text-xs text-neutral-600">
              Weekly Reports, Accept‑Week, Coach Desk, planner, and templates — where you handle
              Sunday programming and Monday triage without spreadsheets.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-paper p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-ink">Coach companion</h3>
            <p className="mt-2 text-xs text-neutral-600">
              Fast approvals for Pocket Coach replans, quick roster checks, and DMs when you&apos;re away
              from the laptop. Light actions only — no heavy programming on a phone.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-paper p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-ink">Client app</h3>
            <p className="mt-2 text-xs text-neutral-600">
              A clean Today card, week rail, fast logging, and chat — so clients always know what to do
              next, without spreadsheets or complex controls.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DefaultStackSection() {
  return (
    <section id="default-stack" className="cv-auto border-b border-border bg-paper py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Default stack
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Keep Stripe, Calendly, Docs. Add a training OS.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            You&apos;re not switching from nothing — you&apos;re switching from a stack. Lungeable only makes sense
            if it beats that stack in clarity and time saved.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Today&apos;s default stack
            </p>
            <h3 className="mt-2 text-sm font-semibold text-ink">
              Sheets, DMs, Stripe, Loom, forms…
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-600">
              <li>• Free or already paid for.</li>
              <li>• You know all the hacks.</li>
              <li>• But Sunday still means 8–10 tabs and manual rewrites.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ink/15 bg-paper p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              With Lungeable
            </p>
            <h3 className="mt-2 text-sm font-semibold text-ink">Training OS that plugs into that stack</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-600">
              <li>• Keep payments, email, and community where they are.</li>
              <li>• Use Lungeable for plans, logging, Pocket Coach, Weekly Reports.</li>
              <li>• Weekly Report → Accept‑Week instead of manual edits.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareSection() {
  const rows = [
    {
      tool: 'TrueCoach',
      bestFor: '1:1 trainers who want simple program delivery and a familiar client app.',
      core: 'Solid builder and app used by many coaches. You still edit most weeks manually.',
      greatAt: ['Program delivery', 'Simple client experience', 'Familiar workflows'],
      tradeOffs: ['Weekly updates are still on you', 'No coach-first "Accept‑Week" loop'],
    },
    {
      tool: 'Everfit',
      bestFor: 'Gyms and coaches who want an all‑in‑one business platform.',
      core: 'Business OS with automations — great if you want one system for payments and content.',
      greatAt: ['Payments + business workflows', 'Automations + content libraries', 'Gym operations'],
      tradeOffs: ['If you mainly need faster weekly programming, it can be heavier than necessary'],
    },
    {
      tool: 'MyCoach AI',
      bestFor: 'Coaches who want workouts + nutrition automation inside one suite.',
      core: 'All‑in‑one AI platform across messaging, workouts and nutrition.',
      greatAt: ['Automation breadth (training + nutrition)', 'One suite for many workflows'],
      tradeOffs: ['Not optimized for evidence‑based block guardrails and week-level approval'],
    },
    {
      tool: 'Lungeable',
      bestFor: 'Remote strength/physique coaches with 10–50 clients drowning in programming.',
      core: 'Weekly Reports → Accept‑Week, Pocket Coach DM replans, and evidence‑based guardrails.',
      greatAt: ['Weekly programming speed', 'Handling chaos without breaking the block', 'Coach rules enforced by guardrails'],
      tradeOffs: ['Not a business OS (payments, marketing pages, media libraries stay in your stack)'],
      highlight: True,
    },
  ] as const;

  return (
    <section id="compare" className="cv-auto border-b border-border bg-paper py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Compare</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Respectful trade-offs, clear positioning.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            TrueCoach and Everfit are excellent all‑in‑one platforms. Lungeable is narrower on purpose:
            it&apos;s the training OS that makes weekly programming and check-ins dramatically faster.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-paper">
          <table className="min-w-full text-left text-xs text-neutral-700">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                <th className="py-3 px-4">Tool</th>
                <th className="py-3 px-4">Best for</th>
                <th className="py-3 px-4">Core story</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.tool} className={r.highlight ? 'bg-soft' : undefined}>
                  <td className="py-4 px-4 align-top font-semibold text-ink">{r.tool}</td>
                  <td className="py-4 px-4 align-top">{r.bestFor}</td>
                  <td className="py-4 px-4 align-top">
                    <p>{r.core}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 hover:text-ink">
                        More detail
                      </summary>
                      <div className="mt-3 space-y-2 text-xs text-neutral-600">
                        <div>
                          <span className="font-semibold text-neutral-700">Great at:</span>{' '}
                          {r.greatAt.join(' · ')}
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-700">Trade-offs:</span>{' '}
                          {r.tradeOffs.join(' · ')}
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Honest note: if you want payments, habits, media libraries, marketing pages and full business workflows in one
          place, an all‑in‑one platform may fit better.
        </p>
      </div>
    </section>
  );
}

function PricingSection({ onJoin }: { onJoin: () => void }) {
  return (
    <section id="pricing" className="cv-auto border-b border-border bg-soft py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Pricing</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Simple while we&apos;re in coach beta.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            Early on, the goal is to work closely with a small group of remote strength coaches. Founding
            coaches get one straightforward plan and keep that price as we grow.
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            <span className="font-semibold text-ink">If it doesn&apos;t save you at least one check-in&apos;s worth of time each month, you shouldn&apos;t keep it.</span>
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-border bg-paper p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Founding coach plan</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-ink">$39</span>
              <span className="text-sm text-neutral-500">/month</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Up to 30 active online clients · price locked for life for early coaches.</p>

            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              <li>• Weekly generator with evidence-based guardrails</li>
              <li>• Pocket Coach chat for you and clients</li>
              <li>• Weekly Reports → 1‑tap Accept‑Week per client</li>
              <li>• Coach Desk roster triage and client messaging</li>
              <li>• Snap‑to‑Macro included when released</li>
            </ul>

            <button
              type="button"
              onClick={onJoin}
              className="mt-6 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
            >
              Apply as a founding coach
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-paper p-6 text-xs text-neutral-600 shadow-sm">
            <p className="font-semibold text-ink">Later, public tiers look like:</p>
            <ul className="mt-3 space-y-1.5">
              <li>
                • <span className="font-medium text-neutral-800">Coach Start</span> — up to 10 clients, around $29/mo
              </li>
              <li>
                • <span className="font-medium text-neutral-800">Coach Grow</span> — up to 25 clients, around $59/mo
              </li>
              <li>
                • <span className="font-medium text-neutral-800">Coach Scale</span> — up to 50 clients, around $99/mo
              </li>
            </ul>
            <p className="mt-3 text-neutral-500">
              Exact tiers may shift as we learn from early coaches, but the philosophy stays: priced like a serious
              tool, anchored to how many clients you&apos;re actually running through Lungeable.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SafeTrialSection({ onJoin }: { onJoin: () => void }) {
  return (
    <section id="safe-trial" className="cv-auto border-b border-border bg-paper py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Safe trial</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Try it in shadow mode before you move anything.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            You don&apos;t have to rip out Sheets, TrueCoach, Trainerize or Everfit on day one. Most early
            coaches run Lungeable in shadow for 3–10 clients over 4 weeks, using it for plans and Weekly
            Reports while still delivering through their existing stack.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-soft p-5">
            <h3 className="text-sm font-semibold text-ink">1. Pick 3–10 clients</h3>
            <p className="mt-2 text-xs text-neutral-600">
              Mirror their current split, schedule and constraints inside Lungeable so week one feels familiar,
              not random.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-soft p-5">
            <h3 className="text-sm font-semibold text-ink">2. Run a 4‑week pilot</h3>
            <p className="mt-2 text-xs text-neutral-600">
              Generate weeks, review Weekly Reports, Accept‑Week, and use Pocket Coach for mid‑week chaos.
              Deliver plans where you normally do.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-soft p-5">
            <h3 className="text-sm font-semibold text-ink">3. Decide with real data</h3>
            <p className="mt-2 text-xs text-neutral-600">
              At the end of the pilot, compare hours spent and client outcomes. If it hasn&apos;t materially cut
              your time, you shouldn&apos;t keep it.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onJoin}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-neutral-900"
          >
            Apply for early access
          </button>
          <p className="text-xs text-neutral-500">No credit card. No lock‑in. We iterate with you.</p>
        </div>
      </div>
    </section>
  );
}
function ResultsStrip() {
  const stats = [
    {
      label: 'Weekly programming time',
      value: 'Down',
      note: 'Weekly Reports draft next week; you Accept‑Week.',
    },
    {
      label: 'Mid‑week chaos',
      value: 'Handled',
      note: 'Pocket Coach proposes safe replans without breaking the block.',
    },
    {
      label: 'Quality control',
      value: 'Protected',
      note: 'Guardrails enforce your rules: spacing, ceilings, exposures, deloads.',
    },
  ] as const;

  return (
    <section className="cv-auto border-b border-white/10 bg-ink py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">Outcome</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            More coaching. Less rewriting.
          </h2>
          <p className="mt-3 text-sm text-neutral-300">
            The point isn’t AI hype—it’s a workflow that reliably saves hours without lowering quality.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="text-xs font-semibold text-neutral-300">{s.label}</div>
              <div className="mt-2 text-lg font-semibold text-paper">{s.value}</div>
              <div className="mt-2 text-sm text-neutral-300">{s.note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: 'Do I need to move my payments, forms, or client contracts?',
      a: 'No. Lungeable is designed to drop into your existing stack. Keep Stripe, Calendly, Notion, docs, and your agreements—use Lungeable for weekly programming, mid‑week changes, and check‑ins.',
    },
    {
      q: 'Is Lungeable meant to replace TrueCoach/Everfit?',
      a: 'Not necessarily. If you want an all‑in‑one business platform (payments, habits, content libraries, marketing pages), an all‑in‑one may fit better. Lungeable is deliberately narrower: a training OS that makes weekly programming and check‑ins dramatically faster.',
    },
    {
      q: 'What does “Accept‑Week” do?',
      a: 'Weekly Reports draft a safe next week. Accept‑Week just commits that week. You can tweak anything before you accept—it’s a fast approval step, not a lock‑in.',
    },
    {
      q: 'What kind of coaches is this for?',
      a: 'Remote strength/physique coaches running 10–50 clients who are drowning in weekly updates. If you’re doing high‑touch coaching and spending hours rewriting weeks, you’re the target.',
    },
  ] as const;

  return (
    <section id="faq" className="cv-auto border-t border-border bg-paper py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">FAQ</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Quick answers.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          If something is unclear, that’s a marketing problem—email us and we’ll tighten the copy.
        </p>

        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border bg-soft px-5 py-4"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                <div className="flex items-center justify-between gap-4">
                  <span>{f.q}</span>
                  <span className="text-neutral-500 group-open:rotate-45 transition-transform">+</span>
                </div>
              </summary>
              <div className="mt-3 text-sm text-neutral-600">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built by <span className="font-medium text-ink">Xuru Ren</span> — founder &amp;
          solo developer of Lungeable.
        </p>
        <a
          href="https://www.linkedin.com/in/xuru-ren-lungeablefounder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-ink"
        >
          <span>Connect on LinkedIn</span>
          <span aria-hidden>↗</span>
        </a>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile sticky CTA                                                          */
/* -------------------------------------------------------------------------- */

function MobileBottomCta({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-4 sm:hidden">
      <button
        type="button"
        onClick={onJoin}
        className="pointer-events-auto inline-flex w-full max-w-md items-center justify-between rounded-full border border-black/10 bg-ink/95 px-4 py-2 text-sm font-semibold text-paper shadow-apple"
      >
        <span>Apply for early access</span>
        <span className="text-xs text-neutral-300">2–3 min form →</span>
      </button>
    </div>
  );
}
