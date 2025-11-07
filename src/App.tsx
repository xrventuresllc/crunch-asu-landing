import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* =======================================================================================
   Crunch — Pre‑launch App (App.tsx)
   - Adds Rep Meter (rage‑clicker) with daily cap & milestones
   - Plan Peek gate (+5 reps)
   - Micro‑DM Simulator (+3 reps per run)
   - Email → (optional) Coach/Trainer flag → success + referral link
   - Post‑submit 3‑question micro‑quiz (goal, schedule, equipment) updates Supabase
   - Safe fallbacks for Supabase & Formspree
   - Tailwind CSS classes retained (dark theme)
   ======================================================================================= */

/* -------------------------------------------------
   Types & Globals
--------------------------------------------------*/
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, any> }) => void;
  }
}

type QuizState = {
  goal: 'build' | 'lean' | 'recomp' | 'sport' | '';
  daysPerWeek: number | '';
  avgMinutes: number | '';
  equipment: string[]; // ['bodyweight','db','barbell','machines','bands']
};

type DMKey = 'busy' | 'knee' | 'hotel';

/* -------------------------------------------------
   Config
--------------------------------------------------*/
// Formspree endpoint (fallback if env not set)
const FORMSPREE_ENDPOINT: string =
  (import.meta.env.VITE_FORMSPREE_ENDPOINT as string) ?? 'https://formspree.io/f/xgvlpgvd';

// Assets & profiles
const LOGO_SRC = '/crunch-logo.png';
const LINKEDIN_URL = 'https://www.linkedin.com/in/xuru-ren-crunchfounder';

// Site/version tag for analytics/debug
const SITE_VERSION = '2025-11-07-prelaunch';
const FREE_DAYS = parseInt((import.meta.env.VITE_FREE_DAYS as string) || '30', 10);

// Reps / Gamification
const REP_CAP = parseInt((import.meta.env.VITE_REP_CAP as string) || '50', 10);
const REP_MILESTONES = [10, 25, 50];

// Supabase (safe no-op if envs missing)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_TABLE = (import.meta.env.VITE_SUPABASE_TABLE as string) || 'leads_prelaunch';
const SUPABASE_EVENTS_TABLE =
  (import.meta.env.VITE_SUPABASE_EVENTS_TABLE as string) || 'leads_prelaunch_events';
const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

/* -------------------------------------------------
   Helpers
--------------------------------------------------*/
function track(event: string, props?: Record<string, any>) {
  window.plausible?.(event, { props });
}

function getOrMakeSession(): string {
  try {
    const k = 'cr_sess';
    let s = localStorage.getItem(k);
    if (!s) {
      s = crypto.randomUUID();
      localStorage.setItem(k, s);
    }
    return s;
  } catch {
    return 'anon';
  }
}
function todayString() {
  return new Date().toDateString();
}
function getReferralFromURL(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    return ref && ref.trim().length ? ref.trim() : null;
  } catch {
    return null;
  }
}
function getOrMakeMyReferralCode(): string {
  try {
    const k = 'cr_my_ref_code';
    let c = localStorage.getItem(k);
    if (!c) {
      c = crypto.randomUUID().slice(0, 8).replace(/-/g, '').toUpperCase();
      localStorage.setItem(k, c);
    }
    return c;
  } catch {
    return 'REF-CODE';
  }
}
function parseIntSafe(v: string | null): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/* -------------------------------------------------
   App
--------------------------------------------------*/
export default function App() {
  // Title
  useEffect(() => {
    document.title = 'Crunch — Train first. A pocket personal coach you can text.';
  }, []);

  // UI state
  const [submitted, setSubmitted] = useState(false);
  const [emailJustSubmitted, setEmailJustSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [infoMsg, setInfoMsg] = useState<string>('');
  const [myRefCode, setMyRefCode] = useState<string>('');
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // Reps (rage‑clicker)
  const [reps, setReps] = useState<number>(0);
  const [capHit, setCapHit] = useState<boolean>(false);
  const [milestoneText, setMilestoneText] = useState<string>('');
  const [cooldown, setCooldown] = useState<boolean>(false);

  // Session
  const sess = useMemo(() => getOrMakeSession(), []);
  const lastRepDayRef = useRef<string>('');

  // UTM capture
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'];
      const collected: Record<string, string> = {};
      keys.forEach((k) => {
        const v = params.get(k);
        if (v) collected[k] = v;
      });
      setUtm(collected);
    } catch {
      /* noop */
    }
  }, []);

  // Referral (inbound + mint mine)
  useEffect(() => {
    setReferredBy(getReferralFromURL());
    setMyRefCode(getOrMakeMyReferralCode());
  }, []);

  // Reps: init & daily reset
  useEffect(() => {
    try {
      const DAY_K = 'cr_rep_day';
      const REP_K = 'cr_reps';
      const today = todayString();
      const last = localStorage.getItem(DAY_K);
      if (last !== today) {
        localStorage.setItem(DAY_K, today);
        localStorage.setItem(REP_K, '0');
      }
      lastRepDayRef.current = today;
      const v = parseInt(localStorage.getItem(REP_K) || '0', 10);
      setReps(Number.isFinite(v) ? v : 0);
      setCapHit(v >= REP_CAP);
    } catch {
      setReps(0);
    }
  }, []);

  // Reps: persist
  useEffect(() => {
    try {
      localStorage.setItem('cr_reps', String(reps));
      if (reps >= REP_CAP) setCapHit(true);
    } catch {
      /* noop */
    }
  }, [reps]);

  // Email micro-quiz
  const [quiz, setQuiz] = useState<QuizState>({
    goal: '',
    daysPerWeek: '',
    avgMinutes: '',
    equipment: [],
  });
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizSaving, setQuizSaving] = useState<boolean>(false);

  /* -------------------------------------------------
     Supabase logging helpers (best-effort)
  --------------------------------------------------*/
  async function logEventToSupabase(evt: string, repsDelta = 0, meta?: Record<string, any>) {
    if (!supabase) return;
    try {
      await supabase.from(SUPABASE_EVENTS_TABLE).insert([
        {
          session_id: sess,
          evt,
          reps_delta: repsDelta,
          email: emailJustSubmitted ?? null,
          ip: null,
          ua: navigator.userAgent,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          meta: meta ?? null,
          site_version: SITE_VERSION,
        },
      ]);
    } catch {
      /* ignore */
    }
  }

  /* -------------------------------------------------
     Rep mechanics
  --------------------------------------------------*/
  function milestoneLine(n: number): string {
    if (n === 10) return 'Badge unlocked: Rep Rookie. Keep going → Early Wave at 25.';
    if (n === 25) return 'Early Wave secured. Verify your email to hold your spot.';
    if (n === 50) return 'Skip‑the‑Line unlocked (pending email). Nice.';
    return '';
    }
  async function awardReps(delta: number, reason: string) {
    if (delta <= 0) return;
    // throttle for button spamming (only for clicker — callers can manage otherwise)
    if (reason === 'rep_click') {
      if (cooldown || capHit) return;
      setCooldown(true);
      setTimeout(() => setCooldown(false), 400 + Math.floor(Math.random() * 200));
    }
    // daily reset guard
    const today = todayString();
    if (lastRepDayRef.current !== today) {
      lastRepDayRef.current = today;
      setReps(0);
      setCapHit(false);
    }

    setReps((prev) => {
      const next = Math.min(REP_CAP, prev + delta);
      if (REP_MILESTONES.includes(next)) {
        const m = milestoneLine(next);
        setMilestoneText(m);
        setTimeout(() => setMilestoneText(''), 5000);
      }
      return next;
    });

    // Log best-effort
    logEventToSupabase(reason, delta);
    track('Rep', { delta, reason });
  }

  /* -------------------------------------------------
     Form submit
  --------------------------------------------------*/
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — leave empty
    if ((data.get('company') as string)?.length) return;

    const email = (data.get('email') as string)?.trim().toLowerCase() || '';
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    // Extra fields for Formspree
    data.append('source', 'prelaunch');
    data.append('site_version', SITE_VERSION);
    data.append('free_days', String(FREE_DAYS));
    data.append('reps', String(reps));
    data.append('session_id', sess);
    if (isCoach) data.append('is_coach', 'true');
    if (myRefCode) data.append('referral_code', myRefCode);
    if (referredBy) data.append('referred_by', referredBy);
    Object.entries(utm).forEach(([k, v]) => data.append(k, v));

    setLoading(true);

    let supaOk = false;
    let fsOk = false;
    let localErr: string | null = null;

    try {
      // 1) Supabase logging (optional)
      if (supabase) {
        try {
          const payload: Record<string, any> = {
            email,
            is_coach: isCoach,
            utm,
            reps,
            referral_code: myRefCode,
            referred_by: referredBy,
            session_id: sess,
            site_version: SITE_VERSION,
            source: 'prelaunch',
            free_days: FREE_DAYS,
            user_agent: navigator.userAgent,
            referer: document.referrer,
          };
          // upsert if your table has a unique index on email or email_norm
          const { error: supaErr } = await supabase
            .from(SUPABASE_TABLE)
            .upsert([payload], { ignoreDuplicates: true });
          if (!supaErr) supaOk = true;
        } catch {
          /* ignore Supabase errors so the form still works */
        }
      }

      // 2) Formspree (notifications / backup)
      try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
        });
        fsOk = res.ok;
        if (!res.ok) {
          const text = await res.text();
          try {
            const j = JSON.parse(text);
            localErr = j?.errors?.[0]?.message || 'Submission failed. Try again.';
            setError(localErr);
          } catch {
            localErr = text || 'Submission failed. Try again.';
            setError(localErr);
          }
        }
      } catch {
        // Ignore — Supabase may still have succeeded
      }

      if (supaOk || fsOk) {
        track('Lead', { source: 'prelaunch', is_coach: isCoach ? 1 : 0 });
        setSubmitted(true);
        setEmailJustSubmitted(email);
        setInfoMsg('You’re on the list. Check your inbox for a plan preview soon.');
        form.reset();
        setIsCoach(false);
        // Award a tiny bonus for completing step 1 (optional)
        await awardReps(0, 'email_submit');
      } else if (!localErr) {
        setError('Submission failed. Try again.');
        track('FormError', { step: 'submit', reason: 'unknown' });
      } else {
        track('FormError', { step: 'submit', reason: localErr });
      }
    } catch {
      setError('Network error. Try again.');
      track('FormError', { step: 'submit', reason: 'network' });
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------
     Micro‑Quiz submit (best-effort)
  --------------------------------------------------*/
  async function handleQuizSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (quizSubmitted) return;
    setQuizSaving(true);

    try {
      // basic client validation
      if (!emailJustSubmitted) {
        setQuizSaving(false);
        setQuizSubmitted(true);
        return;
      }
      if (supabase) {
        const schedule = {
          days_per_week: quiz.daysPerWeek || null,
          avg_minutes: quiz.avgMinutes || null,
        };
        const payload: Record<string, any> = {
          email: emailJustSubmitted,
          goal: quiz.goal || null,
          schedule,
          equipment: quiz.equipment,
        };
        await supabase.from(SUPABASE_TABLE).upsert([payload], { ignoreDuplicates: false });
        await logEventToSupabase('quiz_submit', 0, { goal: quiz.goal, schedule, equipment: quiz.equipment });
      }
      setQuizSubmitted(true);
      setInfoMsg('Thanks — we’ll use this to seed your Plan Peek.');
      track('Quiz', { step: 'complete' });
    } catch {
      setQuizSubmitted(true); // Don’t block their flow if it fails
    } finally {
      setQuizSaving(false);
    }
  }

  function toggleEquipment(key: string) {
    setQuiz((q) => {
      const has = q.equipment.includes(key);
      return { ...q, equipment: has ? q.equipment.filter((k) => k !== key) : [...q.equipment, key] };
    });
  }

  function scrollToJoin() {
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* -------------------------------------------------
     UI
  --------------------------------------------------*/
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur border-b border-neutral-800/60 bg-neutral-950/70">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoOk ? (
              <img
                src={LOGO_SRC}
                alt="Crunch logo"
                className="h-7 w-7 rounded-md object-contain"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <div className="h-7 w-7 rounded-md bg-emerald-500" />
            )}
            <span className="font-semibold tracking-tight">Crunch</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <a href="#how" className="hover:text-neutral-100">How it works</a>
            <a href="#why" className="hover:text-neutral-100">Why Crunch</a>
            <a href="#coach" className="hover:text-neutral-100">Coach/Trainer</a>
            <a href="#faq" className="hover:text-neutral-100">FAQ</a>
            <RepButton
              reps={reps}
              cap={REP_CAP}
              disabled={capHit}
              onClick={() => {
                awardReps(1, 'rep_click');
                track('CTA', { where: 'header' });
                scrollToJoin();
              }}
            />
          </nav>

          <button
            onClick={() => { scrollToJoin(); track('CTA', { where: 'header_mobile' }); }}
            className="md:hidden rounded-lg bg-indigo-500 px-3 py-1.5 font-semibold text-neutral-900 hover:bg-indigo-400"
          >
            Join
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-900/60">
        {/* Subtle brand gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `radial-gradient(700px 700px at 10% -10%, #6D28D933 0, transparent 60%),
                         radial-gradient(700px 700px at 90% 110%, #F9731633 0, transparent 60%)`,
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            {/* Early chip */}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300"
              title={`Early sign-ups get ${FREE_DAYS} days free after launch`}
            >
              <span className="text-emerald-400">●</span>
              Early Access cohort — <b className="mx-1 text-white">bank reps</b> to move up your invite wave
            </div>

            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
              Train first. A pocket personal coach you can text.
            </h1>

            <p className="mt-4 text-neutral-300 max-w-xl">
              AI workouts that adapt to your goal, schedule, equipment, and injuries.
              Text the <b>Pocket Coach</b> to fix a day without losing quality.
              <br />
              <span className="text-neutral-400">
                Weekly Reports tune your next week. Snap‑to‑Macro is in development.
              </span>
            </p>

            <div className="mt-8 flex items-center gap-3">
              <RepButton
                reps={reps}
                cap={REP_CAP}
                disabled={capHit}
                onClick={() => {
                  awardReps(1, 'rep_click');
                  track('CTA', { where: 'hero' });
                  scrollToJoin();
                }}
                large
              />
              <span className="text-xs text-neutral-500">Daily cap {REP_CAP}. Milestones at 10 / 25 / 50.</span>
            </div>

            {milestoneText && (
              <p className="mt-3 text-xs text-emerald-300" aria-live="polite">
                {milestoneText}
              </p>
            )}
          </div>

          {/* Right: product mock (planner + chat) */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
            <div className="text-sm text-neutral-400">Today • Planner</div>
            <div className="mt-3 space-y-3">
              <Bar label="Plan readiness" value={0.85} suffix="Accept‑Week ready" />
              <Bar label="Strength exposure" value={0.72} suffix="On target" />
              <Bar label="Conditioning" value={0.55} suffix="+1 session suggested" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Card title="Next Up" note="Lower • 45 min • RPE 7" />
              <Card title="After" note="Tempo Run • 25 min" />
            </div>
            {/* Chat preview */}
            <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
              <div className="text-xs text-neutral-400 mb-2">Pocket Coach</div>
              <ChatBubble who="you" text="Only 25 minutes today." />
              <ChatBubble who="crunch" text="Kept anchors, trimmed accessory, tightened rests. Ready?" />
              <div className="mt-2 text-right">
                <span className="inline-block rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  One‑tap Accept‑Week
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {[
            {
              t: 'Generate → Accept',
              d: 'One tap creates your week from goal, time, equipment, and injuries. Start today.',
            },
            {
              t: 'Train & log fast',
              d: 'One‑thumb set done with optional RIR/RPE; clear “Next Up” keeps you moving.',
            },
            {
              t: 'Text your coach',
              d: '“Busy.” “Knee tweak.” “Hotel gym.” One message; Crunch adjusts and preserves quality.',
            },
          ].map((i) => (
            <div key={i.t} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">{i.t}</h4>
              <p className="mt-1 text-sm text-neutral-300">{i.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plan Peek Gate & DM Simulator */}
      <section className="mx-auto max-w-6xl px-4 pb-2 grid lg:grid-cols-2 gap-8 items-start">
        <PlanPeek
          onReveal={() => {
            awardReps(5, 'plan_peek_reveal');
            track('PlanPeek', { action: 'reveal' });
          }}
        />

        <DMSimulator
          onSim={(key) => {
            awardReps(3, `dm_sim_${key}`);
            track('DMSim', { key });
          }}
        />
      </section>

      {/* Why Crunch */}
      <section id="why" className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h3 className="text-2xl font-bold">Why Crunch</h3>
          <ul className="mt-4 grid md:grid-cols-2 gap-3 text-sm text-neutral-300">
            <li>• <b>Less planning, more training</b>: Accept‑Week, instant Pocket Coach edits, fast logging.</li>
            <li>• <b>Scientifically sound</b>: SRA spacing, RPE caps, weekly set ceilings, injury filters, auto‑deload.</li>
            <li>• <b>Actually helpful</b>: Text constraints; session adjusts without losing quality.</li>
            <li>• <b>Weekly Report → Accept‑Week</b>: progress rolled straight into next week.</li>
            <li>• <b>Athlete Mode</b>: sport/position presets; in/off‑season; practice‑aware caps.</li>
            <li>• <b>Snap‑to‑Macro</b> (WIP): quick, approximate daily macros — optional and lightweight.</li>
          </ul>
        </div>
      </section>

      {/* Who it's for + Coach/Trainer */}
      <section id="coach" className="mx-auto max-w-6xl px-4 pb-8 grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-sm text-neutral-300">
          <h4 className="font-semibold text-white">For everyone</h4>
          Plans tailored to your goal, time, equipment, and injuries. No guesswork.
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-sm text-neutral-300">
          <h4 className="font-semibold text-white">Athlete Mode</h4>
          Sport & position presets, in/off‑season toggles, practice‑aware scheduling.
          <ul className="mt-2 list-disc list-inside text-xs text-neutral-400">
            <li>Soccer—Winger: repeat sprints, COD plyos, ham pre‑hab; taper.</li>
            <li>Basketball—Guard: accel/decel control, tendon care; taper.</li>
            <li>Volleyball—Setter/OH: jump‑contact budgets; landing mechanics.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-sm text-neutral-300">
          <h4 className="font-semibold text-white">Coach/Trainer Pro</h4>
          DM proposals, individualized assignments, schedule/workout builder, adherence & nudges.
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-indigo-500"
              checked={isCoach}
              onChange={(e) => setIsCoach(e.currentTarget.checked)}
            />
            I’m a coach / trainer (prioritize invite waves)
          </label>
        </div>
      </section>

      {/* Join form */}
      <section id="join" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite" noValidate>
                <h3 className="text-xl font-semibold">Get Early Access</h3>

                {/* Honeypot (hidden) */}
                <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

                <div>
                  <label className="block text-sm text-neutral-300">Email</label>
                  <input
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-xl bg-neutral-800/70 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                    name="email"
                    placeholder="you@email.com"
                    aria-invalid={!!error}
                    onInput={(e) => {
                      const el = e.currentTarget as HTMLInputElement;
                      const pos = el.selectionStart;
                      el.value = el.value.toLowerCase();
                      if (pos !== null) el.setSelectionRange(pos, pos);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') track('CTA', { where: 'form_enter' });
                    }}
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    No spam. We’ll notify you at launch and include your {FREE_DAYS}-day free period.
                  </p>
                </div>

                {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-neutral-900 hover:bg-indigo-400 disabled:opacity-60"
                    aria-busy={loading}
                    onClick={() => track('CTA', { where: 'form_submit' })}
                  >
                    {loading ? 'Sending…' : 'Reserve my spot'}
                  </button>
                  <RepButton
                    reps={reps}
                    cap={REP_CAP}
                    disabled={capHit}
                    onClick={() => awardReps(1, 'rep_click')}
                  />
                </div>
              </form>
            ) : (
              <div className="text-left" aria-live="polite">
                <h4 className="text-xl font-semibold">You’re on the list</h4>
                <p className="mt-1 text-neutral-300">{infoMsg}</p>

                {/* Referral */}
                <div className="mt-6">
                  <h5 className="font-semibold text-white">Share your link (+25 reps per friend)</h5>
                  <ReferralPanel myRefCode={myRefCode} />
                </div>

                {/* Micro‑quiz */}
                {!quizSubmitted ? (
                  <form onSubmit={handleQuizSubmit} className="mt-8 grid md:grid-cols-2 gap-4">
                    <Field label="Your main goal">
                      <select
                        required
                        className="w-full rounded-xl bg-neutral-800/70 px-3 py-2 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                        value={quiz.goal}
                        onChange={(e) => setQuiz((q) => ({ ...q, goal: e.currentTarget.value as QuizState['goal'] }))}
                      >
                        <option value="">Select…</option>
                        <option value="build">Build muscle</option>
                        <option value="lean">Get lean</option>
                        <option value="recomp">Recomposition</option>
                        <option value="sport">Sport‑specific</option>
                      </select>
                    </Field>

                    <Field label="How many days per week can you train?">
                      <input
                        required
                        type="number"
                        min={1}
                        max={7}
                        className="w-full rounded-xl bg-neutral-800/70 px-3 py-2 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                        value={quiz.daysPerWeek}
                        onChange={(e) =>
                          setQuiz((q) => ({ ...q, daysPerWeek: parseIntSafe(e.currentTarget.value) || '' }))
                        }
                      />
                    </Field>

                    <Field label="Typical session length (minutes)">
                      <input
                        required
                        type="number"
                        min={10}
                        max={180}
                        className="w-full rounded-xl bg-neutral-800/70 px-3 py-2 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                        value={quiz.avgMinutes}
                        onChange={(e) =>
                          setQuiz((q) => ({ ...q, avgMinutes: parseIntSafe(e.currentTarget.value) || '' }))
                        }
                      />
                    </Field>

                    <Field label="Equipment you have (select all that apply)">
                      <div className="flex flex-wrap gap-2">
                        {['bodyweight', 'db', 'barbell', 'machines', 'bands'].map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => toggleEquipment(k)}
                            className={`px-3 py-1.5 rounded-lg text-sm border ${
                              quiz.equipment.includes(k)
                                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-neutral-700 bg-neutral-800/70 text-neutral-300'
                            }`}
                          >
                            {k === 'db' ? 'Dumbbells' : k.charAt(0).toUpperCase() + k.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <div className="md:col-span-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={quizSaving}
                        className="rounded-xl bg-emerald-500 px-5 py-2 font-semibold text-neutral-900 hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {quizSaving ? 'Saving…' : 'Send my preferences'}
                      </button>
                      <p className="text-xs text-neutral-500">We’ll use this to seed your Plan Peek & Weekly Report.</p>
                    </div>
                  </form>
                ) : (
                  <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <p className="text-sm text-neutral-300">
                      Thanks! Your preferences are saved. Keep banking reps to move up your invite wave.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex items-center gap-3">
                  <a
                    href="#faq"
                    className="rounded-lg border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
                    onClick={() => track('Nav', { to: 'faq', from: 'success' })}
                  >
                    Read FAQ
                  </a>
                  <button
                    onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); track('CTA', { where: 'back_to_top' }); }}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-indigo-400"
                  >
                    Back to top
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column: Benefits */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">Why sign up now?</h4>
              <p className="mt-1 text-sm text-neutral-300">
                Be first to try Crunch and lock in <b>{FREE_DAYS} days free</b> after launch. We’ll ship updates often and listen closely.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">Easier to follow</h4>
              <p className="mt-1 text-sm text-neutral-300">
                Clear “Next Up,” one‑tap Accept‑Week, and fast logging keep you on plan without mental overhead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-3xl md:text-4xl font-bold">FAQ</h2>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {[
            {
              q: 'Is Crunch beginner‑friendly?',
              a: 'Yes — progression is safe and scalable. Start with bodyweight or dumbbells; Crunch adapts.',
            },
            {
              q: 'Do I need a gym?',
              a: 'No. Plans adapt to what you have: bodyweight, DBs, bands, or a full gym; hotel‑friendly swaps included.',
            },
            {
              q: 'Busy or dealing with pain?',
              a: 'Text Pocket Coach. It replans without losing training quality — trims, substitutes, and protects spacing.',
            },
            {
              q: 'What about nutrition?',
              a: 'Snap‑to‑‑Macro (in development) provides quick, approximate daily macros without heavy tracking.',
            },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">{item.q}</h4>
              <p className="mt-1 text-sm text-neutral-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile sticky CTA */}
      {!submitted && (
        <div
          className="md:hidden fixed left-0 right-0 z-40 flex justify-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }} // iOS safe-area
        >
          <button
            onClick={() => { scrollToJoin(); track('CTA', { where: 'mobile_sticky' }); }}
            className="rounded-full bg-indigo-500 px-6 py-3 font-semibold text-neutral-900 shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
          >
            Get {FREE_DAYS} days free
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/60">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-300">
            {logoOk ? (
              <img src={LOGO_SRC} alt="Crunch logo" className="h-6 w-6 rounded-md object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-md bg-emerald-500" />
            )}
            <span className="font-semibold">Crunch</span>
            <span className="text-neutral-500">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm text-neutral-400 text-center md:text-left">
            <span>
              Contact{' '}
              <a className="underline hover:text-neutral-200" href="mailto:xrventuresllc@gmail.com">
                xrventuresllc@gmail.com
              </a>{' '}
              • <span className="text-neutral-500">Xuru Ren — Founder</span>
            </span>
            <LinkedInLink placement="footer" />
            <a className="underline hover:text-neutral-200" href="/privacy.html">Privacy</a>
          </div>

          <div className="text-xs text-neutral-500 text-center md:text-right">
            We’ll email you when Crunch is ready and include your {FREE_DAYS}-day free period.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------
   Reusable components
--------------------------------------------------*/
function RepButton({
  reps,
  cap,
  onClick,
  disabled,
  large,
}: {
  reps: number;
  cap: number;
  onClick: () => void;
  disabled?: boolean;
  large?: boolean;
}) {
  const pct = Math.min(100, (reps / cap) * 100);
  return (
    <button
      onClick={onClick}
      aria-label="Get Early Access and add reps to jump the line"
      disabled={disabled}
      className={`relative flex items-center gap-2 rounded-2xl ${large ? 'px-6 py-3' : 'px-4 py-2'}
                  text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]
                  transition transform shadow-md disabled:opacity-60`}
    >
      <span className="font-semibold">{large ? 'Get Early Access' : 'Add reps'}</span>
      <span className="text-xs bg-white/15 rounded-full px-2 py-1">
        Reps: {reps}{reps >= cap ? ' (cap)' : ''}
      </span>
      {/* tiny progress bar */}
      <span aria-hidden className="absolute -bottom-1 left-1 right-1 h-1 bg-white/10 rounded-full">
        <span className="block h-1 bg-white/80 rounded-full" style={{ width: `${pct}%` }} />
      </span>
    </button>
  );
}

function Bar({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        {suffix && <span>{suffix}</span>}
      </div>
      <div className="mt-1 h-2.5 w-full rounded-full bg-neutral-800">
        <div
          className="h-2.5 rounded-full bg-emerald-500"
          style={{ width: `${pct * 100}%` }}
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}

function Card({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
      <div className="text-sm text-neutral-300">{title}</div>
      <div className="mt-1 text-xs text-neutral-500">{note}</div>
      <div className="mt-3 h-8 rounded-md border border-neutral-800 bg-neutral-900/60" />
    </div>
  );
}

function ChatBubble({ who, text }: { who: 'you' | 'crunch'; text: string }) {
  const isYou = who === 'you';
  return (
    <div className={`mt-2 flex ${isYou ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isYou ? 'bg-indigo-500 text-neutral-900' : 'bg-neutral-800 text-neutral-200'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function LinkedInLink({ placement = 'footer' }: { placement?: 'footer' | 'success' }) {
  const url = `${LINKEDIN_URL}?utm_source=site&utm_medium=${placement}&utm_campaign=social_follow`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900"
      onClick={() => track('Social', { network: 'LinkedIn', placement })}
    >
      {/* LinkedIn icon */}
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7.5 0h4.8v2.2h.07c.67-1.2 2.32-2.47 4.78-2.47C21.9 7.73 24 9.7 24 13.4V24h-5v-9c0-2.15-.77-3.6-2.7-3.6-1.47 0-2.35.99-2.73 1.95-.14.34-.18.8-.18 1.27V24H7.5V8z" />
      </svg>
    </a>
  );
}

/* ---------- Structured UI helpers ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-300">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ---------- Referral ---------- */
function ReferralPanel({ myRefCode }: { myRefCode: string }) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${base}?ref=${encodeURIComponent(myRefCode)}`;
  return (
    <div className="mt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
      <input readOnly value={link} className="flex-1 rounded-xl bg-neutral-800/70 px-3 py-2 text-sm ring-1 ring-neutral-800" />
      <button
        className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            track('Referral', { action: 'copy' });
          } catch { /* ignore */ }
        }}
      >
        Copy link
      </button>
    </div>
  );
}

/* ---------- Plan Peek ---------- */
function PlanPeek({ onReveal }: { onReveal: () => void }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h3 className="text-xl font-semibold">See your first day</h3>
      <p className="mt-1 text-sm text-neutral-300">
        Built from your goal, time, equipment, and injuries — with science guardrails (SRA spacing, RPE caps, weekly set ceilings).
      </p>
      <div className="mt-4 relative rounded-xl overflow-hidden border border-neutral-800">
        <div className={`h-48 bg-neutral-900 grid place-items-center ${revealed ? '' : 'blur-sm'}`}>
          <span className="text-neutral-400 text-sm">
            {revealed
              ? 'Mon — Push (45m): Bench alt (DB), Row, Split Squat, Core — Ready to start'
              : 'Weekly plan preview (blurred)'}
          </span>
        </div>
        {!revealed && (
          <button
            className="absolute inset-0 grid place-items-center text-white font-semibold"
            onClick={() => {
              setRevealed(true);
              onReveal();
            }}
          >
            <span className="rounded-full bg-black/55 px-4 py-2">Tap to reveal one day (+5 reps)</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- DM Simulator ---------- */
function DMSimulator({ onSim }: { onSim: (key: DMKey) => void }) {
  const [lines, setLines] = useState<{ from: 'you' | 'coach'; text: string }[]>([]);
  const [running, setRunning] = useState(false);

  const scenarios: Record<DMKey, { from: 'you' | 'coach'; text: string }[]> = {
    busy: [
      { from: 'you', text: 'Only 25 minutes today.' },
      { from: 'coach', text: 'Keeping anchors. Trimming accessories. Tightening rests and pairing supersets.' },
      { from: 'coach', text: 'Quality preserved. You’ll still hit exposure targets.' },
    ],
    knee: [
      { from: 'you', text: 'Right knee aches—avoid deep flexion.' },
      { from: 'coach', text: 'Swapping to ROM‑friendly patterns, tempo tweak, lower plyo volume.' },
      { from: 'coach', text: 'SRA spacing protected. We keep the plan safe & effective.' },
    ],
    hotel: [
      { from: 'you', text: 'Hotel gym — no bench.' },
      { from: 'coach', text: 'Switching to DB/landmine variants. Weekly pressing exposure maintained.' },
      { from: 'coach', text: 'You’re set. Let’s train.' },
    ],
  };

  function play(key: DMKey) {
    if (running) return;
    setRunning(true);
    setLines([]);
    onSim(key);
    const seq = scenarios[key];
    let i = 0;
    const tick = () => {
      setLines((prev) => [...prev, seq[i]]);
      i += 1;
      if (i < seq.length) setTimeout(tick, 600);
      else setTimeout(() => setRunning(false), 300);
    };
    tick();
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h3 className="text-xl font-semibold">Text the coach — Crunch fixes it fast</h3>
      <p className="mt-1 text-sm text-neutral-300">Natural‑language replans while preserving training quality.</p>

      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        <button className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-left hover:bg-neutral-900"
          onClick={() => play('busy')}>“Only 25 minutes today.”</button>
        <button className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-left hover:bg-neutral-900"
          onClick={() => play('knee')}>“Right knee aches—avoid deep flexion.”</button>
        <button className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-left hover:bg-neutral-900"
          onClick={() => play('hotel')}>“Hotel gym — no bench.”</button>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 min-h-[96px]" aria-live="polite">
        {lines.length === 0 ? (
          <p className="text-neutral-500 text-sm">Tap a scenario to preview the Pocket Coach (+3 reps).</p>
        ) : (
          lines.map((L, idx) => (
            <div key={idx} className={`mt-2 flex ${L.from === 'you' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  L.from === 'you' ? 'bg-indigo-500 text-neutral-900' : 'bg-neutral-800 text-neutral-200'
                }`}
              >
                {L.text}
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-500">Each simulator run adds +3 reps.</p>
    </div>
  );
}
