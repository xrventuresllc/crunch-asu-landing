// src/App.tsx
import React, { useEffect, useState, type FormEvent } from 'react';
import WeekOneGlance from './WeekOneGlance';
import DMSimulator from './DMSimulator';
import { supabase } from './supabaseClient';

type ScrollStepId = 'onboard' | 'train' | 'dm' | 'report';
type CoachSize = 'solo' | 'micro' | 'team';

type BandTone = 'default' | 'soft' | 'dark';

const SITE_VERSION = 'coach-landing-v2-apple-bands';

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
  'relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-neutral-900/80 to-black/95 shadow-[0_30px_90px_rgba(0,0,0,0.45)]';

const App: React.FC = () => {
  const [coachSize, setCoachSize] = useState<CoachSize>('solo');

  useEffect(() => {
    document.title = 'Lungeable — Adaptive programming OS for remote strength coaches';
  }, []);

  const scrollToJoin = () => {
    const el = document.getElementById('join');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <Header onJoin={scrollToJoin} />

      <main className="flex-1" id="main">
        <Hero onJoin={scrollToJoin} />

        <WhySwitchSection coachSize={coachSize} onCoachSizeChange={setCoachSize} />

        <ScrollStory onJoin={scrollToJoin} />

        <WeeklyAcceptDeepDive onJoin={scrollToJoin} />

        <PocketCoachDeepDive onJoin={scrollToJoin} />

        <CoachDeskDeepDive onJoin={scrollToJoin} />

        <SwitchingSection />

        <CompareSection />

        <PricingSection onJoin={scrollToJoin} />

        <ResultsStrip />

        <SocialProofSection />

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
/* Small layout primitives                                                    */
/* -------------------------------------------------------------------------- */

function Band({
  id,
  tone = 'default',
  children,
  className = '',
  containerClassName = 'max-w-6xl',
  cv = true,
}: {
  id?: string;
  tone?: BandTone;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  cv?: boolean;
}) {
  const tones: Record<BandTone, string> = {
    default: 'bg-white text-neutral-900 border-b border-neutral-200/70',
    soft: 'bg-neutral-50 text-neutral-900 border-b border-neutral-200/70',
    dark: 'bg-black text-neutral-50 border-b border-white/10',
  };

  return (
    <section
      id={id}
      className={`${cv ? 'cv-auto' : ''} ${tones[tone]} py-16 sm:py-20 lg:py-24 ${className}`}
    >
      <div className={`mx-auto ${containerClassName} px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </section>
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
      className={`rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-violet-700 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryLink({
  children,
  href,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const base = `text-sm font-medium text-neutral-700 hover:text-neutral-900 ${className}`;
  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function Header({ onJoin }: { onJoin: () => void }) {
  return (
    <header className="safe-pt sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <img
            src="/Lungeable%20Logo.png"
            alt="Lungeable logo"
            className="h-7 w-7 rounded-xl"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-neutral-900">
              Lungeable
            </span>
            <span className="text-[11px] text-neutral-500">Adaptive training OS</span>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
            <a href="#product" className="hover:text-neutral-900">
              Product
            </a>
            <a href="#how" className="hover:text-neutral-900">
              How it works
            </a>
            <a href="#compare" className="hover:text-neutral-900">
              Compare
            </a>
            <a href="#pricing" className="hover:text-neutral-900">
              Pricing
            </a>
            <a href="/login" className="hover:text-neutral-900">
              Log in
            </a>
          </nav>

          <PrimaryButton onClick={onJoin} className="px-4 py-2 text-xs sm:text-sm">
            Apply for early access
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero({ onJoin }: { onJoin: () => void }) {
  return (
    <section className="relative overflow-hidden bg-black text-neutral-50 pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24 border-b border-white/10">
      <div className="absolute inset-x-0 -top-40 -z-10 h-72 bg-gradient-to-b from-violet-500/25 via-transparent to-transparent blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Text column */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">
            Adaptive programming OS for remote coaches
          </p>

          <h1
            className="mt-4 font-semibold tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.3rem, 5vw, 3.5rem)' }}
          >
            Weekly Reports write next week.
            <span className="text-violet-200"> You review and Accept‑Week.</span>
          </h1>

          <p className="mt-4 text-sm text-neutral-300 measure">
            Lungeable drafts safe, effective weeks from your constraints, proposes mid‑week
            replans from client DMs, and keeps your progression rules intact — so you spend
            your time coaching, not rewriting spreadsheets.
          </p>

          <p className="mt-3 text-xs text-neutral-400">
            Guardrails built in: SRA spacing, set ceilings, exposure budgets, auto‑deload.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={onJoin}>
              Apply for early access
            </PrimaryButton>

            <a href="#how" className="text-sm font-medium text-neutral-300 hover:text-white">
              See how it works →
            </a>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            Limited seats while we iterate with coaches. No credit card, no lock‑in.
          </p>
        </div>

        {/* Visual */}
        <div className="relative">
          <AcceptWeekHeroVisual />
        </div>
      </div>
    </section>
  );
}

function MacWindow({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-violet-500/20 via-transparent to-amber-400/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-neutral-900 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between px-5 py-3 text-[11px] text-neutral-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="font-medium text-neutral-200">{title}</span>
          <span className="text-neutral-500">Lungeable Coach Web</span>
        </div>
        <div className="h-px bg-white/10" />
        <div className="bg-neutral-950 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function AcceptWeekHeroVisual() {
  return (
    <MacWindow title="Weekly Report → Accept‑Week">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-neutral-100">Weekly Report</span>
            <span>Week 6</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="Sessions" value="5/6" hint="83%" />
            <MiniStat label="Avg RPE" value="7.1" hint="in range" />
            <MiniStat label="Flags" value="1" hint="review" />
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <MiniRow label="Lower volume" value="−2 sets" />
            <MiniRow label="Press exposure" value="maintained" />
            <MiniRow label="Knee note" value="ROM tweak" />
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-neutral-950/70 p-3 text-[11px] text-neutral-300">
            “Proposed Week 7 respects your set ceilings and SRA spacing.”
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-neutral-100">Next Week Draft</span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
              Safe
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <WeekDayRow day="Mon" title="Lower" badge="Time‑fit" />
            <WeekDayRow day="Wed" title="Upper" badge="Anchors kept" />
            <WeekDayRow day="Fri" title="Lower" badge="Knee‑aware" />
            <WeekDayRow day="Sat" title="Accessories" badge="Trimmed" />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-[11px] text-neutral-300">
            <span>Guardrails checked</span>
            <span className="text-neutral-500">SRA • RPE • Sets</span>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-violet-700"
          >
            Accept‑Week
          </button>

          <p className="mt-2 text-[11px] text-neutral-500">
            You can tweak anything before you accept. Accept just commits the week.
          </p>
        </div>
      </div>
    </MacWindow>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-100">{value}</p>
      <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2">
      <span className="text-neutral-300">{label}</span>
      <span className="text-neutral-400">{value}</span>
    </div>
  );
}

function WeekDayRow({
  day,
  title,
  badge,
}: {
  day: string;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2">
      <div className="flex items-center gap-2 text-neutral-200">
        <span className="w-8 text-[11px] text-neutral-400">{day}</span>
        <span className="text-[13px]">{title}</span>
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-neutral-300">
        {badge}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Why switch                                                                 */
/* -------------------------------------------------------------------------- */

function WhySwitchSection({
  coachSize,
  onCoachSizeChange,
}: {
  coachSize: CoachSize;
  onCoachSizeChange: (size: CoachSize) => void;
}) {
  const sizeCopy: Record<CoachSize, string> = {
    solo: 'Solo coach: weekly programming + check-ins stop eating your evenings.',
    micro: '2–5 coach team: standardize templates while keeping each coach’s voice.',
    team: 'Team/brand: juniors can run drafts while guardrails keep quality consistent.',
  };

  return (
    <Band id="product" tone="default">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Why coaches switch
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Sell the loop, not the features.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Lungeable is built around one weekly ritual: run Weekly Reports, review the
          proposed week, and Accept‑Week. Pocket Coach handles chaos in between — without
          breaking the block.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <BenefitCard
          title="End Sunday programming hell"
          body="Draft weeks in minutes with guardrails. Stop rewriting 20+ spreadsheets by hand."
        />
        <BenefitCard
          title="Guardrails enforce your rules"
          body="SRA spacing, set ceilings, exposure budgets, deload logic — applied consistently across your roster."
        />
        <BenefitCard
          title="Handle chaos without derailing progression"
          body="“Hotel gym.” “Knee sore.” “Only 25 minutes.” Pocket Coach proposes safe swaps; you approve."
        />
        <BenefitCard
          title="One coach view for plans + DMs + check-ins"
          body="Coach Desk + Weekly Reports tell you who needs action and whose next week is ready to accept."
        />
      </div>

      {/* Who it's for: keep the segmentation, but move it out of the hero */}
      <div className="mt-10 rounded-3xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Built for how you run your roster</p>
            <p className="mt-1 text-xs text-neutral-600">{sizeCopy[coachSize]}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {(['solo', 'micro', 'team'] as CoachSize[]).map((size) => {
              const selected = coachSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onCoachSizeChange(size)}
                  className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-violet-300 bg-violet-600/10 text-violet-800'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
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
        </div>
      </div>
    </Band>
  );
}

function BenefitCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-2 text-sm text-neutral-600">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scrollytelling "How it works"                                              */
/* -------------------------------------------------------------------------- */

function ScrollStory({ onJoin }: { onJoin: () => void }) {
  const steps: { id: ScrollStepId; kicker: string; title: string; body: string }[] =
    [
      {
        id: 'onboard',
        kicker: 'Step 1 · Onboard in minutes',
        title: 'Set goal, time and equipment. Lungeable drafts Week 1.',
        body: 'You set constraints; Lungeable drafts a safe week in your style and flags any rule conflicts. You review and Accept‑Week.',
      },
      {
        id: 'train',
        kicker: 'Step 2 · Client trains & logs',
        title: 'Logging stays lightweight — data feeds the Weekly Report.',
        body: 'Clients mark sets done (optional RPE/RIR). Lungeable tracks adherence and trends without making the client UX complicated.',
      },
      {
        id: 'dm',
        kicker: 'Step 3 · Chaos is normal',
        title: 'Clients DM constraints; Pocket Coach proposes safe session tweaks.',
        body: '“Hotel gym, no bench.” “Right knee sore.” “Only 25 minutes.” Pocket Coach preserves anchors and exposures. You approve week‑level changes.',
      },
      {
        id: 'report',
        kicker: 'Step 4 · Weekly Report → Accept‑Week',
        title: 'Weekly Reports propose next week. You review and Accept‑Week.',
        body: 'Completion, load drift, RPE drift and constraint violations roll up into a clear weekly summary — then next week is ready to accept.',
      },
    ];

  const stepIds = steps.map((s) => s.id);
  const activeId = useScrollSteps(stepIds);

  return (
    <Band id="how" tone="soft">
      <div className="grid max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        {/* Sticky device / visual */}
        <div className="relative lg:sticky lg:top-[96px]">
          <ScrollDevice activeId={activeId} onJoin={onJoin} />
        </div>

        {/* Text story */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              The loop your clients never feel —
              <span className="text-violet-700"> only the results.</span>
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              This is the coach view of Lungeable: onboarding → training/logging → DM replans
              → Weekly Report → Accept‑Week.
            </p>

            <StepProgress activeId={activeId} stepIds={stepIds} />
          </div>

          <div className="relative mt-4 space-y-6">
            {steps.map((step) => {
              const active = activeId === step.id;
              return (
                <article
                  key={step.id}
                  data-step-id={step.id}
                  className={`relative rounded-2xl border-l pl-6 pr-4 py-4 transition-colors ${
                    active
                      ? 'border-violet-400 bg-white'
                      : 'border-neutral-300 bg-transparent'
                  }`}
                >
                  <div
                    className={`absolute -left-[6px] top-7 h-3 w-3 rounded-full transition-all ${
                      active
                        ? 'bg-violet-500 shadow-[0_0_0_6px_rgba(124,58,237,0.18)]'
                        : 'bg-neutral-300'
                    }`}
                  />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {step.kicker}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-neutral-900 sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600">{step.body}</p>
                </article>
              );
            })}

            <div className="pt-4">
              <PrimaryButton onClick={onJoin} className="px-5">
                I want this for my roster →
              </PrimaryButton>
              <p className="mt-2 text-xs text-neutral-500">
                Founding coaches get direct input into roadmap and pricing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Band>
  );
}

function StepProgress({
  activeId,
  stepIds,
}: {
  activeId: ScrollStepId;
  stepIds: ScrollStepId[];
}) {
  const index = stepIds.indexOf(activeId) + 1;

  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
      <span>
        Step {index} of {stepIds.length}
      </span>
      <div className="flex gap-1">
        {stepIds.map((id) => (
          <span
            key={id}
            className={`h-1.5 w-3 rounded-full transition-all ${
              id === activeId ? 'bg-violet-500' : 'bg-neutral-300'
            }`}
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

  const header =
    activeId === 'onboard'
      ? 'Week 1 draft'
      : activeId === 'train'
      ? 'Train & log'
      : activeId === 'dm'
      ? 'Pocket Coach DM'
      : 'Weekly Report';

  return (
    <div className="relative h-full">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-violet-500/15 via-transparent to-amber-400/10 blur-3xl" />
      <div className={`${deviceShellClass} relative p-4 sm:p-5`}>
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>Coach preview</span>
          <span>{header}</span>
        </div>

        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative mt-4 h-[340px] sm:h-[360px]">
          <DeviceScene visible={activeId === 'onboard'} reducedMotion={reducedMotion}>
            <WeekOneGlance
              seedGoal="build"
              seedMinutes={45}
              seedEquipment={['db', 'barbell']}
              onJoin={onJoin}
            />
          </DeviceScene>

          <DeviceScene visible={activeId === 'train'} reducedMotion={reducedMotion}>
            <TrainLogPreview />
          </DeviceScene>

          <DeviceScene visible={activeId === 'dm'} reducedMotion={reducedMotion}>
            <DMSimulator
              onSim={() => {
                // Hook for analytics later if needed
              }}
            />
          </DeviceScene>

          <DeviceScene visible={activeId === 'report'} reducedMotion={reducedMotion}>
            <WeeklyReportPreview />
          </DeviceScene>
        </div>
      </div>
    </div>
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

function TrainLogPreview() {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-100">
      <div>
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Today</span>
          <span>Session 3 of 4</span>
        </div>

        <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
          <p className="text-xs font-semibold text-neutral-100">Upper — time‑fit</p>
          <p className="mt-1 text-[11px] text-neutral-400">
            Quick logging. Optional RPE. No busywork.
          </p>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          {[
            { name: 'DB incline press', sets: '3×8', done: true },
            { name: 'Row variation', sets: '3×10', done: true },
            { name: 'Lat pulldown', sets: '2×12', done: false },
            { name: 'Arms finisher', sets: '2×12', done: false },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2"
            >
              <div>
                <p className="text-[13px] text-neutral-100">{item.name}</p>
                <p className="text-[11px] text-neutral-400">{item.sets}</p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  item.done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-neutral-300'
                }`}
              >
                {item.done ? 'Done' : 'Next'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
        Completion + RPE drift roll into your Weekly Report automatically.
      </div>
    </div>
  );
}

function WeeklyReportPreview() {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-100">
      <div>
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Weekly Report — Ava</span>
          <span>Week 6 → 7</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <ReportTile label="Sessions" value="5/6" hint="83%" />
          <ReportTile label="Avg RPE" value="7.1" hint="In range" />
          <ReportTile label="Flags" value="1" hint="Review" />
        </div>

        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-200">
          <p className="font-semibold text-neutral-100">Proposed week changes</p>
          <ul className="mt-1 space-y-1 text-[11px] text-neutral-400">
            <li>• Trim lower accessories (time fit)</li>
            <li>• Keep pressing exposure (anchor preserved)</li>
            <li>• Knee ROM tweak on squat pattern</li>
          </ul>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="w-full rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-violet-700"
        >
          Accept‑Week
        </button>
        <p className="mt-2 text-[11px] text-neutral-400">
          Approve the drafted week, or edit first. Your rules stay enforced either way.
        </p>
      </div>
    </div>
  );
}

function ReportTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-100">{value}</p>
      <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Signature deep dives                                                       */
/* -------------------------------------------------------------------------- */

function WeeklyAcceptDeepDive({ onJoin }: { onJoin: () => void }) {
  return (
    <Band tone="default">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
            Weekly Reports → Accept‑Week
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            The signature moment: next week is ready.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            Lungeable turns logs + check‑ins into a Weekly Report, then drafts a tuned next
            week that respects your constraints. You review changes and Accept‑Week.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-neutral-700">
            <li>• Planned vs completed (per client, per exposure)</li>
            <li>• Flags: missed sessions, RPE drift, load spikes</li>
            <li>• Proposed adjustments that keep anchors and guardrails</li>
            <li>• One-tap Accept‑Week (or edit first)</li>
          </ul>

          <div className="mt-6">
            <PrimaryButton onClick={onJoin}>Apply to pilot this loop</PrimaryButton>
            <p className="mt-2 text-xs text-neutral-500">
              Start in shadow mode with 3–10 clients. Keep your stack.
            </p>
          </div>
        </div>

        <div className="relative">
          <MacWindow title="Weekly Report → Accept‑Week" className="max-w-xl lg:max-w-none">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-100">Roster rollup</span>
                  <span>Week 6</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniStat label="On track" value="5" hint="clients" />
                  <MiniStat label="Needs action" value="2" hint="flags" />
                  <MiniStat label="Ready" value="6" hint="Accept‑Week" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                <p className="text-xs font-semibold text-neutral-100">Ava — Proposed Week 7</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Time fit + knee ROM tweak. Press exposure preserved.
                </p>
                <button
                  type="button"
                  className="mt-3 w-full rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-violet-700"
                >
                  Accept‑Week
                </button>
              </div>

              <p className="text-[11px] text-neutral-500">
                This is a visual mock. Your real UI will show your templates, blocks and rules.
              </p>
            </div>
          </MacWindow>
        </div>
      </div>
    </Band>
  );
}

function PocketCoachDeepDive({ onJoin }: { onJoin: () => void }) {
  return (
    <Band tone="soft">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
            Pocket Coach
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Handle chaos without breaking the block.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            Clients send constraints the way they already communicate: DMs. Pocket Coach proposes
            guardrail‑safe swaps that preserve anchors and weekly exposures.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-neutral-700">
            <li>• Time crunch replans (25 minutes → still productive)</li>
            <li>• Travel / hotel gym swaps</li>
            <li>• Injury-aware patterns and ROM constraints</li>
            <li>• Coach approval required for week‑level changes</li>
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={onJoin}>Apply for early access</PrimaryButton>
            <SecondaryLink href="#faq">Assistant, not replacement →</SecondaryLink>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          <DMSimulator />
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-semibold text-neutral-900">Assistant, not replacement</p>
            <p className="mt-1 text-sm text-neutral-600">
              Pocket Coach never “runs your business.” It proposes session tweaks; you keep
              full control and approve week‑level updates.
            </p>
          </div>
        </div>
      </div>
    </Band>
  );
}

function CoachDeskDeepDive({ onJoin }: { onJoin: () => void }) {
  return (
    <Band tone="default">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
            Coach Desk
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Triage your roster in minutes.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            Instead of opening 10 tabs, Coach Desk tells you who needs action today: missed
            sessions, drift, new DMs, and ready-to-accept weeks.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-neutral-700">
            <li>• Clear status: On track / Needs action / At risk</li>
            <li>• One-tap actions: message, approve, nudge, accept</li>
            <li>• Weekly Reports land as “ready” items (not chores)</li>
          </ul>

          <div className="mt-6">
            <PrimaryButton onClick={onJoin}>Join the coach beta</PrimaryButton>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          <CoachDeskPreview />
        </div>
      </div>
    </Band>
  );
}

function CoachDeskPreview() {
  const rows = [
    {
      name: 'Ava · powerlifting',
      meta: 'Weekly report ready',
      chip: { label: 'Ready', tone: 'emerald' as const },
    },
    {
      name: 'Noah · gen strength',
      meta: 'Upper days trending high RPE',
      chip: { label: 'Needs action', tone: 'amber' as const },
    },
    {
      name: 'Mia · return to sport',
      meta: 'Missed 2 lower days',
      chip: { label: 'At risk', tone: 'rose' as const },
    },
    {
      name: 'Kai · physique',
      meta: 'New DM: “hotel gym”',
      chip: { label: 'DM', tone: 'violet' as const },
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
        <span className="font-semibold text-neutral-900">Coach Desk</span>
        <span>Today</span>
      </div>
      <div className="divide-y divide-neutral-200 bg-white">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{r.name}</p>
              <p className="text-xs text-neutral-600">{r.meta}</p>
            </div>
            <StatusChip label={r.chip.label} tone={r.chip.tone} />
          </div>
        ))}
      </div>
      <div className="bg-neutral-50 px-4 py-3 text-[11px] text-neutral-600">
        One view: who needs action and whose week is ready to accept.
      </div>
    </div>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'emerald' | 'amber' | 'rose' | 'violet' | 'neutral';
}) {
  const styles: Record<typeof tone, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    neutral: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Switching: default stack + safe trial                                       */
/* -------------------------------------------------------------------------- */

function SwitchingSection() {
  return (
    <Band tone="soft" id="switching">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Default stack
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Keep Stripe, Calendly, docs and community.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Lungeable is the training OS — not your full business OS. It only makes sense if it
          plugs into how you already run your business.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Today’s stack
          </p>
          <h3 className="mt-2 text-sm font-semibold text-neutral-900">
            Sheets, DMs, Stripe, Loom, forms…
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-neutral-700">
            <li>• You already pay for it (or it’s free).</li>
            <li>• You know all the hacks.</li>
            <li>• Sunday still means 8–10 tabs and manual rewrites.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            With Lungeable
          </p>
          <h3 className="mt-2 text-sm font-semibold text-neutral-900">
            Training OS that plugs into that stack
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-neutral-800">
            <li>• Keep billing, scheduling and community where they are.</li>
            <li>• Use Lungeable for plans, logging, Pocket Coach, Weekly Reports.</li>
            <li>• Weekly Report → Accept‑Week replaces manual rewrites.</li>
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-neutral-700 sm:grid-cols-3">
            {['Stripe', 'Calendly', 'Google Docs', 'Notion', 'Loom', 'Discord'].map((tool) => (
              <div
                key={tool}
                className="flex items-center justify-center rounded-full border border-violet-200 bg-white px-3 py-1.5"
              >
                {tool}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-neutral-900">Try it in shadow mode</p>
        <p className="mt-1 text-sm text-neutral-600">
          Most early coaches run Lungeable in parallel for 3–10 clients over 4 weeks, then decide
          with real data.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SwitchStep
            title="1. Pick 3–10 clients"
            body="Mirror their current split and constraints so week one feels familiar."
          />
          <SwitchStep
            title="2. Run a 4‑week pilot"
            body="Use Weekly Reports, Accept‑Week, and Pocket Coach for mid‑week chaos."
          />
          <SwitchStep
            title="3. Decide with real data"
            body="Compare hours spent and outcomes. If it doesn’t save time, don’t keep it."
          />
        </div>
      </div>
    </Band>
  );
}

function SwitchStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-2 text-sm text-neutral-600">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Compare                                                                    */
/* -------------------------------------------------------------------------- */

function CompareSection() {
  return (
    <Band id="compare" tone="default">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Compare
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Respectful trade‑offs, clear positioning.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          TrueCoach and Everfit are excellent all‑in‑one platforms. Lungeable is narrower on purpose:
          it’s the training OS that makes weekly programming and check‑ins dramatically faster.
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              <th className="py-3 px-4">Tool</th>
              <th className="py-3 px-4">Best for</th>
              <th className="py-3 px-4">Core story</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            <tr>
              <td className="py-4 px-4 font-semibold text-neutral-900">TrueCoach</td>
              <td className="py-4 px-4 text-neutral-700">
                1:1 trainers who want simple program delivery and a familiar client app.
              </td>
              <td className="py-4 px-4 text-neutral-700">
                Solid builder and app used by many coaches. You still edit most weeks manually.
              </td>
            </tr>
            <tr>
              <td className="py-4 px-4 font-semibold text-neutral-900">Everfit</td>
              <td className="py-4 px-4 text-neutral-700">
                Gyms and coaches who want an all‑in‑one business platform.
              </td>
              <td className="py-4 px-4 text-neutral-700">
                Business OS with automations — great if you want one system for payments and content.
              </td>
            </tr>
            <tr>
              <td className="py-4 px-4 font-semibold text-neutral-900">MyCoach AI</td>
              <td className="py-4 px-4 text-neutral-700">
                Coaches who want workouts + nutrition automation inside one suite.
              </td>
              <td className="py-4 px-4 text-neutral-700">
                All‑in‑one AI platform across messaging, workouts and nutrition.
              </td>
            </tr>
            <tr className="bg-violet-50">
              <td className="py-4 px-4 font-semibold text-neutral-900">Lungeable</td>
              <td className="py-4 px-4 text-neutral-700">
                Remote strength/physique coaches with 10–50 clients drowning in programming.
              </td>
              <td className="py-4 px-4 text-neutral-700">
                Weekly Reports → Accept‑Week, Pocket Coach DM replans, and evidence‑based guardrails.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Honest note: If you want payments, habits, media libraries, marketing pages and full business workflows in one place, an all‑in‑one platform may fit better.
      </p>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

function PricingSection({ onJoin }: { onJoin: () => void }) {
  return (
    <Band id="pricing" tone="soft" containerClassName="max-w-5xl">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Pricing
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Simple while we’re in coach beta.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          If Lungeable doesn’t save you at least one check‑in’s worth of time each month,
          you shouldn’t keep it.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Founding coach plan
          </p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-neutral-900">$39</span>
            <span className="text-sm text-neutral-500">/month</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Up to 30 active online clients · price locked for life for early coaches.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-neutral-800">
            <li>• Weekly generator with evidence-based guardrails</li>
            <li>• Pocket Coach chat for you and clients</li>
            <li>• Weekly Reports → 1-tap Accept‑Week per client</li>
            <li>• Coach Desk roster triage and client messaging</li>
            <li>• Snap-to-Macro included when released</li>
          </ul>

          <PrimaryButton onClick={onJoin} className="mt-6 w-full justify-center">
            Apply for early access
          </PrimaryButton>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-900">Later, public tiers look like:</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              • <span className="font-medium">Coach Start</span> — up to 10 clients, around
              $29/mo
            </li>
            <li>
              • <span className="font-medium">Coach Grow</span> — up to 25 clients, around
              $59/mo
            </li>
            <li>
              • <span className="font-medium">Coach Scale</span> — up to 50 clients, around
              $99/mo
            </li>
          </ul>
          <p className="mt-3 text-neutral-600">
            Exact tiers may shift as we learn from early coaches. Founding coaches keep their
            price.
          </p>
        </div>
      </div>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Results strip                                                              */
/* -------------------------------------------------------------------------- */

function ResultsStrip() {
  return (
    <Band tone="default" containerClassName="max-w-5xl">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
            Results
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            What “less Sunday hell” actually looks like.
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            The goal is simple: cut your programming + check‑in time roughly in half without
            lowering training quality.
          </p>
        </div>

        <div className="grid gap-4 text-sm text-neutral-900 sm:grid-cols-2">
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-2xl font-semibold">~50%</p>
            <p className="mt-1 text-xs text-neutral-600">
              Target reduction in weekly programming + check‑in time after a 4‑week pilot.
            </p>
          </div>
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-2xl font-semibold">10–50</p>
            <p className="mt-1 text-xs text-neutral-600">
              Ideal online client range per coach where Weekly Report → Accept‑Week shines.
            </p>
          </div>
        </div>
      </div>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Social proof                                                               */
/* -------------------------------------------------------------------------- */

function SocialProofSection() {
  const quotes = [
    {
      quote:
        '“Weekly Reports → Accept‑Week is the first workflow that actually feels like a coach’s tool, not a prettier spreadsheet.”',
      by: 'Strength coach · 24 online clients',
    },
    {
      quote:
        '“Pocket Coach handles the stuff that usually derails a block — travel, time crunches, tweaks — without me rebuilding sessions.”',
      by: 'Physique coach · 18 online clients',
    },
    {
      quote:
        '“The guardrails are the point. It keeps quality consistent when I’m moving fast.”',
      by: 'Team coach · 3 coaches',
    },
  ];

  return (
    <Band tone="soft" containerClassName="max-w-6xl">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Proof
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Early coach feedback
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Replace these with real pilot quotes as soon as you have them. Specificity converts.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {quotes.map((q) => (
          <div key={q.by} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-800">{q.quote}</p>
            <p className="mt-3 text-xs font-semibold text-neutral-900">{q.by}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-neutral-900">Pilot story (template)</p>
        <p className="mt-1 text-sm text-neutral-600">
          “Before: 6–8 hours Sunday programming. After 4 weeks: ~3–4 hours using Weekly Reports +
          Accept‑Week, with fewer missed sessions.”
        </p>
      </div>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Join section (Supabase-backed coach sign-up form)                          */
/* -------------------------------------------------------------------------- */

function JoinSection() {
  return (
    <Band id="join" tone="default" containerClassName="max-w-4xl" className="safe-pb">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Coach beta
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Join the founding coach waitlist.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Tell us a little about your coaching practice. We’ll onboard in small batches so we
          can support you properly and tune around real workflows.
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
        <CoachSignupForm />
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        We’ll never sell your data. You can ask to be removed at any time.
      </p>
    </Band>
  );
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const inputBase =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-0 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20';

function CoachSignupForm() {
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
      site_version: SITE_VERSION,
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
        setError('Something went wrong. Please refresh and try again, or email us directly.');
        return;
      }

      setState('success');
      setEmail('');
      form.reset();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Supabase form submit error', err);
      setState('error');
      setError('Something went wrong. Please refresh and try again, or email us directly.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite" noValidate>
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Basics (required)
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-semibold text-neutral-700">
              Name <span className="text-neutral-500">(or brand)</span>
            </span>
            <input
              name="name"
              required
              autoComplete="name"
              className={inputBase}
              placeholder="Alex, Ava Strength, ..."
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-neutral-700">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputBase}
              placeholder="you@coaching.com"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-semibold text-neutral-700">Primary focus</span>
            <select name="focus" className={inputBase} defaultValue="strength">
              <option value="strength">Gen strength / hypertrophy</option>
              <option value="powerlifting">Powerlifting</option>
              <option value="olympic">Olympic weightlifting</option>
              <option value="sport">Sport‑specific</option>
              <option value="rehab">Return‑to‑sport / rehab</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-neutral-700">Approx. online clients</span>
            <select name="client_count" className={inputBase} defaultValue="10-25">
              <option value="0-10">0–10</option>
              <option value="10-25">10–25</option>
              <option value="25-50">25–50</option>
              <option value="50+">50+</option>
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Context (optional)
        </p>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-neutral-700">What do you want most?</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {['Save time', 'Safer progression', 'Scale my roster', 'Better client experience', 'Other'].map(
              (label) => (
                <label
                  key={label}
                  className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800"
                >
                  <input type="checkbox" name="intent" value={label} className="accent-violet-600" />
                  <span>{label}</span>
                </label>
              )
            )}
          </div>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-neutral-700">
            Where do you coach now? <span className="text-neutral-500">(links or handle)</span>
          </span>
          <input
            name="presence"
            className={inputBase}
            placeholder="@yourhandle, site, TrueCoach, Sheets, ..."
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-neutral-700">
            Anything else we should know? <span className="text-neutral-500">(optional)</span>
          </span>
          <textarea
            name="notes"
            rows={3}
            className={inputBase}
            placeholder="What’s hardest about programming or managing your roster right now?"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <PrimaryButton
          type="submit"
          className="disabled:cursor-default disabled:opacity-60"
        >
          {state === 'submitting'
            ? 'Submitting...'
            : state === 'success'
            ? 'You’re on the list'
            : 'Join the coach waitlist'}
        </PrimaryButton>
        <p className="text-xs text-neutral-600">
          We’ll email when spots open. Expect low‑volume, high‑signal updates only.
        </p>
      </div>

      {error && (
        <p className="toast-pop mt-2 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}

      {state === 'success' && (
        <div className="toast-pop mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">You’re in — what happens next?</p>
          <p className="mt-1 text-sm text-emerald-800">
            We onboard coaches in small cohorts, send a short intake before your slot, and share early
            previews you can react to. No spam.
          </p>
        </div>
      )}

      {state === 'error' && !error && (
        <p className="toast-pop mt-2 text-xs text-rose-600">
          Something went wrong. Please refresh and try again, or email us directly.
        </p>
      )}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function FaqSection() {
  const faqs: { q: string; a: string }[] = [
    {
      q: 'Do I have to move my payments into Lungeable?',
      a: 'No. Keep Stripe, PayPal, Trainerize or whatever you use today. Lungeable runs your programming, logging and check-ins; it is not trying to replace your billing stack right now.',
    },
    {
      q: 'Is this trying to replace me as a coach?',
      a: 'No. Lungeable enforces your rules — volume ceilings, SRA spacing, injuries — and proposes weeks and session tweaks. You still decide what to run and when to override.',
    },
    {
      q: 'What if a generated plan looks off?',
      a: 'Every plan flows through the same guardrails for time fit, exposures and injury rules, and you always review it. If something looks wrong, you can tweak or reject it before clients ever see it.',
    },
    {
      q: 'Can I test this with just a few clients?',
      a: 'Yes. Most early coaches start with 3–10 clients, often in “shadow mode” alongside their existing stack, then roll in more once they trust the loop.',
    },
    {
      q: 'Who is Lungeable for, exactly?',
      a: 'Remote strength and physique coaches with roughly 10–50 online clients who are currently stuck in Sheets, TrueCoach, Trainerize or Everfit and tired of Sunday programming hell.',
    },
  ];

  return (
    <Band id="faq" tone="default" containerClassName="max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          FAQ
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Questions coaches actually ask.
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          If you’re already on TrueCoach, Everfit or Sheets, you’re not crazy to be skeptical.
          Here’s how Lungeable fits alongside what you use now.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-4"
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
    </Band>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built by <span className="font-semibold text-neutral-900">Xuru Ren</span> — founder &amp;
          solo developer of Lungeable.
        </p>
        <a
          href="https://www.linkedin.com/in/xuru-ren-lungeablefounder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900"
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
        className="pointer-events-auto inline-flex w-full max-w-md items-center justify-between rounded-full border border-neutral-200 bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-lg"
      >
        <span>Join coach beta</span>
        <span className="text-xs text-neutral-600">2–3 min form →</span>
      </button>
    </div>
  );
}
