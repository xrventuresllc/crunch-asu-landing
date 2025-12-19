// src/App.tsx
import React, { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import WeekOneGlance from './WeekOneGlance';
import DMSimulator from './DMSimulator';
import { supabase } from './supabaseClient';

type ScrollStepId = 'onboard' | 'pocket' | 'report' | 'accept';

type CtaMode = 'demo' | 'apply';

const SITE_VERSION = 'coach-landing-v2-mono';

const CALENDLY_WIDGET_SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_WIDGET_CSS_HREF = 'https://assets.calendly.com/assets/external/widget.css';

let calendlyLoader: Promise<void> | null = null;

function ensureCalendlyLoaded(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  // Load Calendly widget CSS once.
  if (!document.querySelector(`link[href="${CALENDLY_WIDGET_CSS_HREF}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CALENDLY_WIDGET_CSS_HREF;
    document.head.appendChild(link);
  }

  // If the Calendly global is already present, we are done.
  if ((window as any).Calendly) {
    return Promise.resolve();
  }

  // Reuse a single in-flight loader.
  if (calendlyLoader) return calendlyLoader;

  calendlyLoader = new Promise<void>((resolve, reject) => {
    // If a script tag exists (e.g., from a previous mount), attach listeners.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_WIDGET_SCRIPT_SRC}"]`
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Calendly widget script')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = CALENDLY_WIDGET_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Calendly widget script'));
    document.body.appendChild(script);
  });

  return calendlyLoader;
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

function useScrollSteps(stepIds: ScrollStepId[]): ScrollStepId {
  const [activeId, setActiveId] = useState<ScrollStepId>(stepIds[0] ?? 'onboard');

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
        threshold: 0.2,
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

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                           */
/* -------------------------------------------------------------------------- */

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
      {children}
    </p>
  );
}

function PrimaryButton({
  children,
  onClick,
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`min-h-[44px] rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-900 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-sm font-semibold text-neutral-700 hover:text-black"
    >
      {children}
    </a>
  );
}

function Band({
  id,
  tone = 'paper',
  className = '',
  children,
}: {
  id?: string;
  tone?: 'paper' | 'soft' | 'dark';
  className?: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'paper'
      ? 'bg-white text-neutral-900 border-b border-black/10'
      : tone === 'soft'
      ? 'bg-[#f5f5f7] text-neutral-900 border-b border-black/10'
      : 'bg-black text-white border-b border-white/10';

  return (
    <section
      id={id}
      className={`${toneClass} py-16 sm:py-20 lg:py-24 ${className}`}
    >
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* App                                                                         */
/* -------------------------------------------------------------------------- */

const App: React.FC = () => {
  // Default to Apply so we don't load Calendly (third-party) until a coach explicitly clicks “Book demo”.
  const [ctaMode, setCtaMode] = useState<CtaMode>('apply');

  const scrollToJoin = (mode: CtaMode) => {
    setCtaMode(mode);
    const el = document.getElementById('join');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openDemo = () => scrollToJoin('demo');
  const openApply = () => scrollToJoin('apply');

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <Header onDemo={openDemo} onApply={openApply} />

      <main className="flex-1" id="main">
        <Hero onDemo={openDemo} onApply={openApply} />

        <WhySwitch />

        <HowItWorks onJoin={openDemo} />

        <WeeklyReportsDeepDive onJoin={openDemo} />

        <PocketCoachDeepDive onJoin={openDemo} />

        <CoachDeskDeepDive onJoin={openDemo} />

        <DefaultStackSection />

        <CompareSection />

        <PricingSection onDemo={openDemo} onApply={openApply} />

        <ProofSection />

        <JoinSection mode={ctaMode} onModeChange={setCtaMode} />

        <FaqSection />
      </main>

      <Footer />
      <MobileBottomCta onJoin={openDemo} />
    </div>
  );
};

export default App;

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

function Header({ onDemo, onApply }: { onDemo: () => void; onApply: () => void }) {
  return (
    <header className="safe-pt sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/Lungeable%20Logo.png"
              alt="Lungeable logo"
              className="h-7 w-7 rounded-xl"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">Lungeable</span>
              <span className="text-[11px] text-neutral-500">Adaptive training OS</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 text-sm text-neutral-700 md:flex">
              <a href="#product" className="hover:text-black">
                Product
              </a>
              <a href="#how" className="hover:text-black">
                How it works
              </a>
              <a href="#compare" className="hover:text-black">
                Compare
              </a>
              <a href="#pricing" className="hover:text-black">
                Pricing
              </a>
              <a href="#faq" className="hover:text-black">
                FAQ
              </a>
              <a href="/login" className="text-neutral-600 hover:text-black">
                Log in
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onApply}
                className="hidden text-sm font-semibold text-neutral-700 hover:text-black md:inline-flex"
              >
                Apply
              </button>
              <PrimaryButton onClick={onDemo} className="px-4 py-2 text-sm">
                Book a demo
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */


function Hero({ onDemo, onApply }: { onDemo: () => void; onApply: () => void }) {
  return (
    <Band id="coach" tone="paper" className="pt-12 sm:pt-16 lg:pt-20">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-56 bg-gradient-to-b from-black/[0.06] via-transparent to-transparent blur-2xl" />
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Kicker>Adaptive training OS for remote strength coaches</Kicker>

              <h1
                className="mt-4 font-semibold tracking-tight text-balance"
                style={{ fontSize: 'clamp(2.3rem, 5vw, 3.4rem)', lineHeight: 1.06 }}
              >
                Program weeks in minutes.
                <br />
                Adjust in seconds.
              </h1>

              <p className="mt-4 text-base text-neutral-700 measure">
                Lungeable drafts weeks with evidence‑based guardrails, turns check‑ins into clear Weekly Reports, and
                helps you approve changes fast — without rewriting 20 plans every Sunday.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-neutral-800">
                <li>• Weekly Report → one‑tap Accept‑Week</li>
                <li>• Pocket Coach turns DMs into guardrail‑safe replans</li>
                <li>• Guardrails enforce SRA spacing, set ceilings, time‑fit, and deload logic</li>
              </ul>

              <p className="mt-4 text-xs text-neutral-600">
                You&apos;re still the head coach. Lungeable proposes changes, enforces rules, and waits for your approval.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <PrimaryButton onClick={onDemo}>Book a demo</PrimaryButton>

                <button
                  type="button"
                  onClick={onApply}
                  className="min-h-[44px] rounded-full border border-black/15 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-black/[0.03]"
                >
                  Apply for early access
                </button>
              </div>

              <p className="mt-3 text-xs text-neutral-600">
                Try it with 3 clients first. No migration required.
              </p>

              <a href="#how" className="mt-2 inline-flex text-sm font-semibold text-neutral-700 hover:text-black">
                See how it works →
              </a>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-700">
                <span className="h-2 w-2 rounded-full bg-black/40" aria-hidden />
                <span>Cohort pilots: we’ll measure programming time saved + adherence weekly.</span>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-br from-black/[0.08] via-transparent to-transparent blur-2xl" />
              <MacWindow title="Coach OS preview" rightLabel="Lungeable Coach Web">
                <WeeklyReportAcceptWeekMock />
              </MacWindow>
            </div>
          </div>
        </Container>
      </div>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Band 2: Why coaches switch                                                  */
/* -------------------------------------------------------------------------- */

function WhySwitch() {
  const cards = [
    {
      title: 'End Sunday programming hell',
      body: 'Weekly Reports draft next week automatically. You approve instead of rewriting 20 plans.',
    },
    {
      title: 'Guardrails enforce your rules',
      body: 'SRA spacing, set ceilings, exposure budgets, time‑fit and deload logic keep quality consistent when you move fast.',
    },
    {
      title: 'Handle chaos without breaking the block',
      body: '“Only 25 minutes.” “Knee sore.” “Hotel gym.” Pocket Coach proposes safe swaps that preserve anchors.',
    },
    {
      title: 'One loop for plans, chat, and check‑ins',
      body: 'Plans + logging + DM‑driven replans + Weekly Reports live in one training OS — without replacing your billing stack.',
    },
  ];

  return (
    <Band id="product" tone="soft">
      <Container>
        <div className="max-w-2xl">
          <Kicker>Why coaches switch</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Sell coaching — not spreadsheets.
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            Lungeable is purpose-built for remote strength/physique coaches with ~10–50 clients
            who are drowning in weekly edits.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, idx) => (
            <div
              key={c.title}
              className="rounded-3xl border border-black/10 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-semibold text-neutral-700">
                  {idx + 1}
                </span>
                <p className="text-sm font-semibold">{c.title}</p>
              </div>
              <p className="mt-3 text-sm text-neutral-700">{c.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Band 3: How it works (4-step loop)                                          */
/* -------------------------------------------------------------------------- */

function HowItWorks({ onJoin }: { onJoin: () => void }) {
  const steps = useMemo(
    () =>
      [
        {
          id: 'onboard' as const,
          kicker: 'Step 1 · Onboard',
          title: 'Set goal, minutes, equipment. Week 1 drafts in your style.',
          body: 'You define constraints and preferences. Lungeable drafts a safe first week and you Accept‑Week. No heavy setup.',
        },
        {
          id: 'pocket' as const,
          kicker: 'Step 2 · Chaos',
          title: 'Clients DM real life. Pocket Coach proposes a safe swap.',
          body: 'Time crunches, travel, aches — Pocket Coach adjusts the session while preserving anchors and exposure targets.',
        },
        {
          id: 'report' as const,
          kicker: 'Step 3 · Weekly Report',
          title: 'Planned vs completed, flags, and a tuned next‑week draft.',
          body: 'You see completion, RPE drift, missed exposures and constraint violations — then get a draft for next week.',
        },
        {
          id: 'accept' as const,
          kicker: 'Step 4 · Accept‑Week',
          title: 'One click commits next week. You can always tweak first.',
          body: 'Accept commits the week. You can edit anything before you accept, but you’re no longer starting from scratch.',
        },
      ] satisfies { id: ScrollStepId; kicker: string; title: string; body: string }[],
    []
  );

  const activeId = useScrollSteps(steps.map((s) => s.id));
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Band id="how" tone="paper">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
          {/* Sticky device / visual */}
          <div className="relative lg:sticky lg:top-[96px]">
            <MacWindow
              title="Coach preview"
              rightLabel={
                activeId === 'onboard'
                  ? 'Week 1'
                  : activeId === 'pocket'
                  ? 'Pocket Coach'
                  : activeId === 'report'
                  ? 'Weekly Report'
                  : 'Accept‑Week'
              }
            >
              <div className="relative">
                <DeviceScene visible={activeId === 'onboard'} reducedMotion={reducedMotion}>
                  <WeekOneGlance
                    seedGoal="build"
                    seedMinutes={45}
                    seedEquipment={['db', 'barbell']}
                    onJoin={onJoin}
                  />
                </DeviceScene>

                <DeviceScene visible={activeId === 'pocket'} reducedMotion={reducedMotion}>
                  <DMSimulator />
                </DeviceScene>

                <DeviceScene visible={activeId === 'report'} reducedMotion={reducedMotion}>
                  <WeeklyReportPreview />
                </DeviceScene>

                <DeviceScene visible={activeId === 'accept'} reducedMotion={reducedMotion}>
                  <div className="rounded-3xl border border-black/10 bg-white p-4">
                    <p className="text-sm font-semibold">Accept‑Week</p>
                    <p className="mt-1 text-sm text-neutral-700">
                      Commit next week in one click after a fast review.
                    </p>
                    <div className="mt-4">
                      <PrimaryButton onClick={onJoin} className="w-full justify-center">
                        Book a demo
                      </PrimaryButton>
                      <p className="mt-2 text-[11px] text-neutral-500">
                        Accept commits the week — you can tweak anything first.
                      </p>
                    </div>
                  </div>
                </DeviceScene>
              </div>
            </MacWindow>
          </div>

          {/* Text story */}
          <div className="space-y-6">
            <div className="max-w-xl">
              <Kicker>How it works</Kicker>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                The loop: draft, adapt, report, accept.
              </h2>
              <p className="mt-3 text-sm text-neutral-700">
                Your clients just train. You get a clean weekly workflow that keeps quality
                consistent without burning your evenings.
              </p>

              <StepProgress activeId={activeId} stepIds={steps.map((s) => s.id)} />
            </div>

            <div className="relative mt-4 space-y-6">
              {steps.map((step) => {
                const active = activeId === step.id;
                return (
                  <article
                    key={step.id}
                    data-step-id={step.id}
                    className={`relative border-l pl-6 transition-colors ${
                      active ? 'border-black/60 bg-black/[0.03]' : 'border-black/10'
                    }`}
                  >
                    <div
                      className={`absolute -left-[5px] top-7 h-2.5 w-2.5 rounded-full transition-all ${
                        active ? 'bg-black' : 'bg-black/25'
                      }`}
                    />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      {step.kicker}
                    </p>
                    <h3
                      className={`mt-1 text-base font-semibold sm:text-lg ${
                        active ? 'text-black' : 'text-neutral-800'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-700">{step.body}</p>
                  </article>
                );
              })}

              <div className="pt-4">
                <PrimaryButton onClick={onJoin} className="px-5">
                  Book a demo →
                </PrimaryButton>
                <p className="mt-2 text-xs text-neutral-500">
                  Founding coaches get direct input into roadmap and pricing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Band>
  );
}

function DeviceScene({
  visible,
  children,
  reducedMotion,
}: {
  visible: boolean;
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return visible ? <div>{children}</div> : <div aria-hidden="true" className="hidden" />;
  }

  return (
    <div
      className={`transition-all duration-500 ease-out will-change-transform ${
        visible
          ? 'relative z-10 opacity-100 translate-y-0 scale-100'
          : 'absolute inset-0 opacity-0 -translate-y-2 scale-[0.98] pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}

function StepProgress({
  activeId,
  stepIds,
}: {
  activeId: ScrollStepId;
  stepIds: ScrollStepId[];
}) {
  const idx = Math.max(0, stepIds.indexOf(activeId)) + 1;

  return (
    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-600">
      <span>
        Step {idx} of {stepIds.length}
      </span>
      <div className="flex gap-1">
        {stepIds.map((id) => (
          <span
            key={id}
            className={`h-1.5 w-3 rounded-full transition-all ${
              id === activeId ? 'bg-black' : 'bg-black/15'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Band 4: Weekly Reports deep dive                                            */
/* -------------------------------------------------------------------------- */

function WeeklyReportsDeepDive({ onJoin }: { onJoin: () => void }) {
  return (
    <Band id="weekly" tone="dark">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
              Weekly Report → Accept‑Week
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Review last week.
              <br />
              Approve the next.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              This is the signature moment. See what happened, what changes next week, and why — then commit it in one tap.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li>• Planned vs completed, RPE drift, and missed exposures in one view.</li>
              <li>• Draft respects SRA spacing, set ceilings, exposure budgets and time‑fit.</li>
              <li>• Accept‑Week commits the week. Edit anything before you accept.</li>
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onJoin}
                className="min-h-[44px] rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-neutral-100"
              >
                Book a demo
              </button>
              <a href="#compare" className="text-sm font-semibold text-white/70 hover:text-white">
                Compare it to your current stack →
              </a>
            </div>

            <p className="mt-3 text-xs text-white/55">
              Guardrails are the point: quality stays consistent even when your roster grows.
            </p>
          </div>

          <div>
            <MacWindow title="Weekly Report → Accept‑Week" rightLabel="Coach Web" darkOnly>
              <WeeklyReportAcceptWeekMock />
            </MacWindow>
          </div>
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Band 5: Pocket Coach deep dive                                              */
/* -------------------------------------------------------------------------- */

function PocketCoachDeepDive({ onJoin }: { onJoin: () => void }) {
  return (
    <Band id="pocket" tone="paper">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <Kicker>Pocket Coach</Kicker>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              DM‑driven replans — constrained by your rules.
            </h2>
            <p className="mt-3 text-sm text-neutral-700">
              Pocket Coach is not “black box AI.” It proposes session-level changes that
              preserve anchors and exposure targets, then waits for your approval.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-neutral-800">
              <li>• Handles time crunches, travel, aches, equipment limits.</li>
              <li>• Preserves the block: weekly exposures and progression rules stay intact.</li>
              <li>• You approve week‑level updates — always.</li>
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={onJoin}>Book a demo</PrimaryButton>
              <SecondaryLink href="#join">Or jump to the form →</SecondaryLink>
            </div>
          </div>

          <div>
            <DMSimulator />
          </div>
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Band 6: Coach Desk deep dive                                                */
/* -------------------------------------------------------------------------- */

function CoachDeskDeepDive({ onJoin }: { onJoin: () => void }) {
  return (
    <Band id="desk" tone="soft">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Kicker>Coach Desk</Kicker>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              A roster view that tells you who needs action.
            </h2>
            <p className="mt-3 text-sm text-neutral-700">
              Coach Desk is triage: missed sessions, rising RPE, unanswered DMs, and clients
              ready for Accept‑Week — in one place.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-neutral-800">
              <li>• Sort by “Needs action” vs “Ready” instead of scanning 30 chat threads.</li>
              <li>• One-tap actions: nudge, approve, review report, accept week.</li>
              <li>• Designed to keep you moving fast without losing quality.</li>
            </ul>

            <div className="mt-7">
              <PrimaryButton onClick={onJoin}>Join the founding coach beta</PrimaryButton>
            </div>
          </div>

          <div>
            <MacWindow title="Coach Desk" rightLabel="Roster triage">
              <CoachDeskPreview />
            </MacWindow>
          </div>
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Band 7: Default stack                                                       */
/* -------------------------------------------------------------------------- */

function DefaultStackSection() {
  const items = [
    { label: 'Payments', value: 'Stripe, PayPal, invoice tools' },
    { label: 'Scheduling', value: 'Calendly, Acuity, Google Calendar' },
    { label: 'Content', value: 'Notion, Google Docs, Loom' },
    { label: 'Community', value: 'Discord, Slack, WhatsApp, Telegram' },
    { label: 'Spreadsheets', value: 'Google Sheets (if you want)' },
    { label: 'Lungeable', value: 'Plans, logging, Pocket Coach, Weekly Reports, Accept‑Week' },
  ];

  return (
    <Band id="default-stack" tone="paper">
      <Container>
        <div className="max-w-2xl">
          <Kicker>Default stack</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Keep your stack. Upgrade the training brain.
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            Lungeable is deliberately narrow: it&apos;s the training OS (plans + reporting +
            DM-driven replans) — not your payments, marketing, or content platform.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.label}
              className="rounded-3xl border border-black/10 bg-white p-5"
            >
              <p className="text-xs font-semibold text-neutral-500">{it.label}</p>
              <p className="mt-2 text-sm font-semibold text-neutral-900">{it.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-neutral-500">
          Honest note: if you want payments, habits, media libraries and marketing pages in one place,
          an all‑in‑one platform may fit better. Lungeable wins when you care about the weekly training loop.
        </p>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Compare                                                                     */
/* -------------------------------------------------------------------------- */

type CompareRow = {
  tool: string;
  bestFor: string;
  shines: string[];
  tradeoffs: string[];
  highlight?: boolean;
};

function CompareSection() {
  const rows: CompareRow[] = [
    {
      tool: 'TrueCoach',
      bestFor: '1:1 trainers who want simple program delivery + a familiar client app.',
      shines: [
        'Reliable delivery + client UX',
        'Coach workflows feel straightforward',
        'Good general-purpose platform',
      ],
      tradeoffs: [
        'Still manual week-to-week edits',
        'Not built around a Weekly Report → Accept‑Week loop',
        'Guardrails are mostly “in your head”',
      ],
    },
    {
      tool: 'Everfit',
      bestFor: 'Gyms and coaches who want an all‑in‑one business platform.',
      shines: [
        'Payments, habits, content, automations',
        'Good for multi-offer businesses',
        'Broad workflow coverage',
      ],
      tradeoffs: [
        'Heavier “business OS” than a training OS',
        'Harder to keep tight programming rules across many clients',
        'Training loop can feel secondary',
      ],
    },
    {
      tool: 'MyCoach AI',
      bestFor: 'Coaches who want workouts + nutrition automation inside one suite.',
      shines: [
        'Automation across messaging/workouts/nutrition',
        'Good for high-volume standardized delivery',
        'Fast content generation',
      ],
      tradeoffs: [
        'Risk of black-box decisions',
        'Harder to enforce coach-specific guardrails',
        'Can feel like “replacement,” not “assistant”',
      ],
    },
    {
      tool: 'Lungeable',
      bestFor: 'Remote strength/physique coaches (10–50 clients) who drown in weekly programming.',
      shines: [
        'Weekly Reports draft next week',
        'One-tap Accept‑Week',
        'Pocket Coach DM replans with approvals',
        'Evidence-based guardrails',
      ],
      tradeoffs: [
        'Not a billing/marketing platform',
        'You keep your “default stack” for business ops',
      ],
      highlight: true,
    },
  ];

  return (
    <Band id="compare" tone="soft">
      <Container>
        <div className="max-w-2xl">
          <Kicker>Compare</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Respectful trade‑offs, clear positioning.
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            TrueCoach and Everfit are strong all‑in‑one platforms. Lungeable is narrower on purpose:
            the training OS that makes weekly programming and check‑ins dramatically faster.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-3xl border border-black/10 bg-white">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-[#f5f5f7] text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                <th className="py-3 px-4">Tool</th>
                <th className="py-3 px-4">Best for</th>
                <th className="py-3 px-4">Where it shines</th>
                <th className="py-3 px-4">Trade‑offs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {rows.map((r) => (
                <tr key={r.tool} className={r.highlight ? 'bg-black/[0.02]' : ''}>
                  <td className="py-4 px-4 font-semibold text-neutral-900">{r.tool}</td>
                  <td className="py-4 px-4 text-neutral-800">{r.bestFor}</td>
                  <td className="py-4 px-4">
                    <ul className="space-y-1 text-neutral-800">
                      {r.shines.map((x) => (
                        <li key={x}>• {x}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-4 px-4">
                    <ul className="space-y-1 text-neutral-800">
                      {r.tradeoffs.map((x) => (
                        <li key={x}>• {x}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Honest note: if your #1 priority is a single platform for payments, habits, media, and marketing pages,
          choose an all‑in‑one. If your pain is weekly programming time and mid‑week chaos, choose the training OS.
        </p>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

function PricingSection({ onDemo, onApply }: { onDemo: () => void; onApply: () => void }) {
  return (
    <Band id="pricing" tone="paper">
      <Container>
        <div className="max-w-2xl">
          <Kicker>Pricing</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Simple while we&apos;re in coach beta.
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            If Lungeable doesn&apos;t save you at least <span className="font-semibold">one check‑in&apos;s worth of time</span>{' '}
            each month, you shouldn&apos;t keep it.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-3xl border border-black/10 bg-[#f5f5f7] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-600">
              Founding coach plan
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-neutral-900">$39</span>
              <span className="text-sm text-neutral-600">/month</span>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              Up to 30 active online clients · price locked for life for early coaches.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-neutral-800">
              <li>• Weekly generator with guardrails</li>
              <li>• Pocket Coach chat for you and clients</li>
              <li>• Weekly Reports → 1‑tap Accept‑Week</li>
              <li>• Coach Desk roster triage</li>
              <li>• Exportable plans and data</li>
            </ul>

            <PrimaryButton onClick={onDemo} className="mt-6 w-full justify-center">
              Book a demo
            </PrimaryButton>

            <button
              type="button"
              onClick={onApply}
              className="mt-3 w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-black/[0.03]"
            >
              Apply for early access
            </button>

            <p className="mt-3 text-xs text-neutral-600">
              No hard sell. If it's a fit, we onboard coaches in small cohorts.
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-6">
            <p className="text-sm font-semibold text-neutral-900">Later, public tiers look like:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              <li>
                • <span className="font-semibold">Coach Start</span> — up to 10 clients, around $29/mo
              </li>
              <li>
                • <span className="font-semibold">Coach Grow</span> — up to 25 clients, around $59/mo
              </li>
              <li>
                • <span className="font-semibold">Coach Scale</span> — up to 50 clients, around $99/mo
              </li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700">
              Exact tiers may shift as we learn from early coaches, but the philosophy stays:
              priced like a serious tool, anchored to how many clients you actually run through Lungeable.
            </p>
          </div>
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Proof                                                                       */
/* -------------------------------------------------------------------------- */


function ProofSection() {
  const metrics: { title: string; detail: string }[] = [
    {
      title: 'Programming + check‑ins (hours/week)',
      detail: 'We’ll track baseline vs week 2 and week 4 so you can quantify time saved.',
    },
    {
      title: 'Adherence trend',
      detail: 'Planned vs completed sessions and missed exposures — week over week.',
    },
    {
      title: 'Accept‑Week usage',
      detail: 'How often you can approve next week without rewriting blocks.',
    },
    {
      title: 'Mid‑week chaos handled',
      detail: 'Pocket Coach replans that keep the block intact (time‑fit, injury‑safe, rule‑checked).',
    },
  ];

  return (
    <Band id="proof" tone="soft">
      <Container>
        <div className="max-w-2xl">
          <Kicker>Pilot metrics</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Proof you can measure — not hype.
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            Early access runs as cohort pilots. We’ll track time saved, adherence, and safety signals weekly so you can
            decide with data.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.title} className="rounded-3xl border border-black/10 bg-white p-6">
              <p className="text-sm font-semibold text-neutral-900">{m.title}</p>
              <p className="mt-2 text-sm text-neutral-700">{m.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
          <p className="text-sm font-semibold text-neutral-900">What you get in week 1</p>
          <ul className="mt-3 space-y-2 text-sm text-neutral-700">
            <li>• A quick walkthrough of the Weekly Report → Accept‑Week loop.</li>
            <li>• A baseline snapshot of your current programming + check‑in time.</li>
            <li>• A 3–10 client pilot plan so you can test without migrating your whole roster.</li>
          </ul>
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Calendly booking                                                            */
/* -------------------------------------------------------------------------- */

type CalendlyState = 'loading' | 'ready' | 'error';

function CalendlyInlineBooking({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<CalendlyState>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    ensureCalendlyLoaded()
      .then(() => {
        if (cancelled) return;
        const Calendly = (window as any).Calendly;
        if (!Calendly || typeof Calendly.initInlineWidget !== 'function' || !containerRef.current) {
          setState('error');
          return;
        }

        // Important when the user toggles Demo ↔ Apply: re-init inside the same container.
        containerRef.current.innerHTML = '';
        Calendly.initInlineWidget({ url, parentElement: containerRef.current });
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div ref={containerRef} style={{ minWidth: '320px', height: '700px' }} />

      {state !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center">
          {state === 'loading' ? (
            <p className="text-sm text-neutral-600">Loading scheduling…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-neutral-900">Couldn’t load the scheduler.</p>
              <p className="text-sm text-neutral-700">
                Open it in a new tab, or switch to Apply and we’ll reach out.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-black/[0.03]"
              >
                Open scheduler
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Join section (Supabase-backed coach waitlist)                               */
/* -------------------------------------------------------------------------- */


function JoinSection({
  mode,
  onModeChange,
}: {
  mode: CtaMode;
  onModeChange: (mode: CtaMode) => void;
}) {
  const isDemo = mode === 'demo';
  const calendlyUrl = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/xuru-lungeable/30min';
  const hasCalendly = Boolean(calendlyUrl);

  return (
    <Band id="join" tone="paper" className="safe-pb">
      <Container>
        <div className="max-w-2xl">
          <Kicker>Next step</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {isDemo ? 'Book a demo.' : 'Apply for early access.'}
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            {isDemo
              ? hasCalendly
                ? 'Pick a time below. We’ll walk you through Weekly Reports → Accept‑Week, Pocket Coach, and Coach Desk.'
                : 'Leave your email and we’ll send a booking link and a short walkthrough.'
              : 'We onboard in small batches so we can support you properly and tune the product around real workflows.'}
          </p>

          <div
            className="mt-6 inline-flex rounded-full border border-black/10 bg-[#f5f5f7] p-1"
            role="tablist"
            aria-label="Choose demo or early access"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isDemo}
              onClick={() => onModeChange('demo')}
              className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition-colors ${
                isDemo ? 'bg-white text-black shadow-sm' : 'text-neutral-700 hover:text-black'
              }`}
            >
              Book demo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isDemo}
              onClick={() => onModeChange('apply')}
              className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition-colors ${
                !isDemo ? 'bg-white text-black shadow-sm' : 'text-neutral-700 hover:text-black'
              }`}
            >
              Apply
            </button>
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            {isDemo
              ? 'Prefer to skip the call? You can apply instead.'
              : 'Prefer a quick walkthrough first? Book a demo.'}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-black/10 bg-[#f5f5f7] p-6">
          {isDemo && hasCalendly ? (
            <>
              <CalendlyInlineBooking url={calendlyUrl!} />
              <p className="mt-3 text-xs text-neutral-600">
                Prefer a separate tab?{' '}
                <a
                  href={calendlyUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Open Calendly
                </a>
                .
              </p>
            </>
          ) : (
            <CoachSignupForm mode={mode} />
          )}
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          We’ll never sell your data. You can ask to be removed at any time.
        </p>
      </Container>
    </Band>
  );
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

function CoachSignupForm({ mode }: { mode: CtaMode }) {
  const isDemo = mode === 'demo';
  const [state, setState] = useState<FormState>('idle');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === 'submitting' || state === 'success') return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email.');
      return;
    }

    setState('submitting');
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
    const ref = typeof document !== 'undefined' ? document.referrer || undefined : undefined;

    const intents = formData.getAll('intent').map(String);

    const payload = {
      email: trimmedEmail,
      name: (formData.get('name') || '')?.toString() || null,
      primary_focus: (formData.get('focus') || '')?.toString() || null,
      client_count: (formData.get('client_count') || '')?.toString() || null,
      coach_intents: intents,
      presence: (formData.get('presence') || '')?.toString() || null,
      notes: (formData.get('notes') || '')?.toString() || null,
      source: 'coach-landing',
      site_version: `${SITE_VERSION}:${mode}`,
      user_agent: ua,
      referer: ref,
    };

    try {
      const { error: supaError } = await supabase.from('leads_coach_waitlist').insert(payload);

      // 23505 = unique violation (email already exists). Treat as soft-success.
      if (supaError && supaError.code !== '23505') {
        // eslint-disable-next-line no-console
        console.error('Supabase insert error', supaError);
        setState('error');
        setError('Something went wrong. Please refresh and try again.');
        return;
      }

      setState('success');
      setEmail('');
      form.reset();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Supabase form submit error', err);
      setState('error');
      setError('Something went wrong. Please refresh and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-live="polite" noValidate>
      <input
        type="hidden"
        name="intent"
        value={isDemo ? 'Demo request' : 'Early access application'}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-neutral-700">Email (required)</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black/40"
            placeholder="you@coaching.com"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-700">Approx. online clients</span>
          <select
            name="client_count"
            className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black/40"
            defaultValue="10-25"
          >
            <option value="0-10">0–10</option>
            <option value="10-25">10–25</option>
            <option value="25-50">25–50</option>
            <option value="50+">50+</option>
          </select>
        </label>
      </div>

      <details className="rounded-2xl border border-black/10 bg-white px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-neutral-900">
          Optional details (helps us onboard you faster)
        </summary>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">
                Name <span className="text-neutral-500">(or brand)</span>
              </span>
              <input
                name="name"
                autoComplete="name"
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black/40"
                placeholder="Alex, Ava Strength, ..."
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Primary focus</span>
              <select
                name="focus"
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black/40"
                defaultValue="strength"
              >
                <option value="strength">Gen strength / hypertrophy</option>
                <option value="powerlifting">Powerlifting</option>
                <option value="olympic">Olympic weightlifting</option>
                <option value="sport">Sport‑specific</option>
                <option value="rehab">Return‑to‑sport / rehab</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">
              What do you want most from Lungeable?
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Save time', 'Safer progression', 'Scale my roster', 'Better client experience', 'Other'].map(
                (label) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 rounded-full border border-black/10 bg-[#f5f5f7] px-3 py-2 text-xs text-neutral-900"
                  >
                    <input type="checkbox" name="intent" value={label} className="accent-black" />
                    <span>{label}</span>
                  </label>
                )
              )}
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">
              Where do you coach now? <span className="text-neutral-500">(links or handle)</span>
            </span>
            <input
              name="presence"
              className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black/40"
              placeholder="@yourhandle, Sheets, TrueCoach, Trainerize, ..."
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">
              Anything else we should know? <span className="text-neutral-500">(optional)</span>
            </span>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black/40"
              placeholder="What’s hardest about programming or managing your roster right now?"
            />
          </label>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton
          type="submit"
          className="disabled:cursor-default disabled:bg-neutral-500"
        >
          {state === 'submitting'
            ? 'Submitting...'
            : state === 'success'
            ? isDemo
              ? 'Request received'
              : 'You’re on the list'
            : isDemo
            ? 'Request demo'
            : 'Submit application'}
        </PrimaryButton>

        <p className="text-xs text-neutral-600">
          Low-volume, high-signal updates only.
        </p>
      </div>

      {error && <p className="animate-toast-pop text-xs text-rose-600" role="alert">{error}</p>}

      {state === 'success' && (
        <div className="animate-toast-pop rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm font-semibold text-neutral-900">
            {isDemo ? 'Request received.' : 'You’re in.'}
          </p>
          <p className="mt-1 text-sm text-neutral-700">
            {isDemo
              ? 'We’ll email you a booking link for a 30‑minute walkthrough. No marketing drip.'
              : 'We’ll reach out as we open new founding coach seats. No marketing drip.'}
          </p>
        </div>
      )}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

function FaqSection() {
  const faqs: { q: string; a: string }[] = [
    {
      q: 'Do I have to move my payments into Lungeable?',
      a: 'No. Keep Stripe, PayPal or whatever you use today. Lungeable runs your programming, logging and weekly loop; it is not trying to replace your billing stack right now.',
    },
    {
      q: 'Is this trying to replace me as a coach?',
      a: 'No. Pocket Coach proposes changes constrained by your rules, and Weekly Reports propose next weeks. You still approve and can override any decision.',
    },
    {
      q: 'Can I test this with just a few clients?',
      a: 'Yes. Most early coaches start with 3–10 clients and expand after they trust the loop.',
    },
    {
      q: 'Who is Lungeable for, exactly?',
      a: 'Remote strength and physique coaches with roughly 10–50 online clients who are tired of Sunday programming hell and want a weekly ritual: Report → Accept‑Week.',
    },
    {
      q: 'Is the data exportable if I leave?',
      a: 'Yes. If you ever leave, you keep your plans and client data. Lock-in is the opposite of what we want.',
    },
  ];

  return (
    <Band id="faq" tone="paper">
      <Container>
        <div className="max-w-2xl">
          <Kicker>FAQ</Kicker>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Questions coaches actually ask.
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            If you&apos;re already on TrueCoach, Everfit or Sheets, skepticism is rational.
            Here&apos;s the short version of how Lungeable fits alongside what you use now.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-3xl border border-black/10 bg-[#f5f5f7] px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-neutral-900">
                <span>{item.q}</span>
                <span
                  aria-hidden
                  className="text-xs text-neutral-500 transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <p className="mt-2 text-sm text-neutral-700">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white">
      <Container>
        <div className="flex flex-col gap-2 py-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built by <span className="font-medium text-neutral-900">Xuru Ren</span>.{' '}
            <span className="text-neutral-400">Site version {SITE_VERSION}.</span>
          </p>
          <a
            href="https://www.linkedin.com/in/xuru-ren-lungeablefounder"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-black"
          >
            <span>Connect on LinkedIn</span>
            <span aria-hidden>↗</span>
          </a>
        </div>
      </Container>
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
        className="pointer-events-auto inline-flex w-full max-w-md items-center justify-between rounded-full border border-black/10 bg-white/95 px-4 py-2 text-sm font-semibold text-black shadow-lg"
      >
        <span>Book a demo</span>
        <span className="text-xs text-neutral-600">30 min walkthrough →</span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI Mocks                                                                    */
/* -------------------------------------------------------------------------- */

function MacWindow({
  title,
  rightLabel,
  children,
  className = '',
  darkOnly = false,
}: {
  title: string;
  rightLabel?: string;
  children: React.ReactNode;
  className?: string;
  /** When placed on a dark band, keep borders/shadows tuned for dark backgrounds. */
  darkOnly?: boolean;
}) {
  const frameBorder = darkOnly ? 'border-white/10' : 'border-black/10';
  const frameShadow = darkOnly ? 'shadow-[0_28px_80px_rgba(0,0,0,0.65)]' : 'shadow-device';

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border ${frameBorder} bg-black ${frameShadow} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-[11px] text-white/60">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
        </div>
        <span className="truncate">{title}</span>
        <span className="truncate text-white/40">{rightLabel ?? 'Lungeable'}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function WeeklyReportAcceptWeekMock() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Weekly report */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="font-semibold text-white/80">Weekly Report</span>
          <span>Week 6</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <MiniTile label="Sessions" value="5/6" hint="83%" />
          <MiniTile label="Avg RPE" value="7.1" hint="in range" />
          <MiniTile label="Flags" value="1" hint="review" />
        </div>

        <div className="mt-3 space-y-2 text-xs">
          <MiniRow left="Lower volume" right="−2 sets" />
          <MiniRow left="Press exposure" right="maintained" />
          <MiniRow left="Knee note" right="ROM tweak" />
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-white/60">
          “Proposed Week 7 respects your set ceilings and SRA spacing.”
        </div>
      </div>

      {/* Next week draft */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="font-semibold text-white/80">Next Week Draft</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
            Safe
          </span>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          <DraftDay day="Mon" focus="Lower" tag="Time‑fit" />
          <DraftDay day="Wed" focus="Upper" tag="Anchors kept" />
          <DraftDay day="Fri" focus="Lower" tag="Knee‑aware" />
          <DraftDay day="Sat" focus="Accessories" tag="Trimmed" />
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] text-white/60">Guardrails checked</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">SRA</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">RPE</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Sets</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Time</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-neutral-100"
        >
          Accept‑Week
        </button>
        <p className="mt-2 text-[11px] text-white/55">
          You can tweak anything before you accept. Accept commits the week.
        </p>
      </div>
    </div>
  );
}

function MiniTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-3">
      <p className="text-[10px] text-white/55">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] text-white/45">{hint}</p>
    </div>
  );
}

function MiniRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2">
      <span className="text-white/70">{left}</span>
      <span className="text-white/55">{right}</span>
    </div>
  );
}

function DraftDay({ day, focus, tag }: { day: string; focus: string; tag: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2">
      <span className="text-white/75">{day}</span>
      <span className="text-white">{focus}</span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
        {tag}
      </span>
    </div>
  );
}

function WeeklyReportPreview() {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 text-neutral-900">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
        Weekly Report
      </p>
      <p className="mt-2 text-sm font-semibold">Roster rollup (example)</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3">
          <p className="text-[10px] text-neutral-500">Sessions done</p>
          <p className="mt-1 text-sm font-semibold">91.8%</p>
          <p className="mt-1 text-[10px] text-neutral-500">Goal ≥ 85%</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3">
          <p className="text-[10px] text-neutral-500">Avg RPE</p>
          <p className="mt-1 text-sm font-semibold">7.1</p>
          <p className="mt-1 text-[10px] text-neutral-500">Range 6–8</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3">
          <p className="text-[10px] text-neutral-500">Flags</p>
          <p className="mt-1 text-sm font-semibold">2</p>
          <p className="mt-1 text-[10px] text-neutral-500">Needs review</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs">
        <RosterRow name="Ava · powerlifting" status="Ready" note="All exposures in range" />
        <RosterRow name="Noah · gen strength" status="Review" note="Upper days trending high RPE" />
        <RosterRow name="Mia · return to sport" status="Action" note="Missed 2 lower days" />
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-xs text-neutral-700">
        Draft next week, then Accept‑Week per client.
      </div>
    </div>
  );
}

function RosterRow({
  name,
  status,
  note,
}: {
  name: string;
  status: 'Ready' | 'Review' | 'Action' | string;
  note: string;
}) {
  const chip =
    status === 'Ready'
      ? 'bg-black text-white'
      : status === 'Review'
      ? 'bg-white text-black border border-black/15'
      : 'bg-white text-black border border-black/15';

  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-neutral-900">{name}</p>
        <p className="text-[11px] text-neutral-500">{note}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${chip}`}>
        {status}
      </span>
    </div>
  );
}

function CoachDeskPreview() {
  const people = [
    { name: 'Ava', note: 'Ready for Accept‑Week', tag: 'Ready' },
    { name: 'Noah', note: 'RPE trending up (Upper)', tag: 'Needs review' },
    { name: 'Mia', note: '2 missed sessions', tag: 'At risk' },
    { name: 'Eli', note: 'DM: “only 25 minutes”', tag: 'Pocket Coach' },
    { name: 'Zoe', note: 'New client — Week 1 draft', tag: 'Onboard' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] text-white/55">Needs action</p>
          <p className="mt-1 text-lg font-semibold text-white">3</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] text-white/55">Ready</p>
          <p className="mt-1 text-lg font-semibold text-white">7</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] text-white/55">DMs</p>
          <p className="mt-1 text-lg font-semibold text-white">4</p>
        </div>
      </div>

      <div className="space-y-2">
        {people.map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-white">{p.name}</p>
              <p className="text-[11px] text-white/60">{p.note}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/70">
              {p.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
