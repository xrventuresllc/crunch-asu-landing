import { useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const FORMSPREE_ENDPOINT: string =
  (import.meta.env.VITE_FORMSPREE_ENDPOINT as string) ?? 'https://formspree.io/f/xgvlpgvd';

// Assets & profiles
const LOGO_SRC = '/crunch-logo.png';
const LINKEDIN_URL = 'https://www.linkedin.com/in/xuru-ren-crunchfounder';
const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL as string | undefined;

// --- Supabase client (safe no-op if envs missing) ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

// ------- Campus config (ASU default; override with ?campus=gcu or ?campus=maricopa) -------
type CampusKey = 'ASU' | 'GCU' | 'MARICOPA';
type CampusCfg = {
  label: string;                               // used in hero / CTA
  color: string;                               // highlight color (hex)
  emailCheck: (email: string) => boolean;      // student email validator
  placeholder: string;                         // email placeholder for Students
  disclaimer: string;                          // footer line
};

const CAMPUS_MAP: Record<CampusKey, CampusCfg> = {
  ASU: {
    label: 'ASU',
    color: '#FFC627',                               // ASU gold
    emailCheck: (e) => /@asu\.edu$/i.test(e),       // strict ASU
    placeholder: 'you@asu.edu',
    disclaimer:
      'Independent pilot with the ASU community; not affiliated with or endorsed by ASU.'
  },
  GCU: {
    label: 'GCU',
    color: '#522398',                               // GCU purple (approx)
    // allow @gcu.edu and @my.gcu.edu
    emailCheck: (e) => /@(my\.)?gcu\.edu$/i.test(e),
    placeholder: 'you@gcu.edu',
    disclaimer:
      'Independent pilot with the GCU community; not affiliated with or endorsed by GCU.'
  },
  MARICOPA: {
    label: 'Maricopa CC',
    color: '#1E88E5',                               // blue accent
    // strict maricopa.edu per your note
    emailCheck: (e) => /@maricopa\.edu$/i.test(e),
    placeholder: 'you@maricopa.edu',
    disclaimer:
      'Independent pilot with Maricopa community colleges; not affiliated with or endorsed by any institution.'
  }
};

export default function App() {
  // ----- Campus selection from URL (defaults to ASU) -----
  const campus = useMemo<CampusKey>(() => {
    const v = new URLSearchParams(window.location.search).get('campus')?.toUpperCase();
    if (v === 'GCU') return 'GCU';
    if (v === 'MARICOPA' || v === 'MCC' || v === 'MARICOPA_CC' || v === 'MARICOPACC') return 'MARICOPA';
    return 'ASU';
  }, []);
  const campusCfg = CAMPUS_MAP[campus];

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'Student' | 'Coach' | 'Other'>('Student');
  const [coachProgram, setCoachProgram] = useState('');
  const [logoOk, setLogoOk] = useState(true);

  // Capture UTM params for basic attribution
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'campus'];
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    // honeypot - leave empty
    if ((data.get('company') as string)?.length) return;

    // role-based validation (campus-aware)
    const email = (data.get('email') as string) || '';
    if (role === 'Student' && !campusCfg.emailCheck(email)) {
      const msg =
        campus === 'ASU'
          ? 'Students: please use your @asu.edu email for priority access.'
          : campus === 'GCU'
            ? 'Students: please use your @gcu.edu (or @my.gcu.edu) email for priority access.'
            : 'Students: please use your @maricopa.edu email for priority access.';
      setError(msg + ' Coaches can use any email.');
      return;
    }

    // Pull values for Supabase
    const name = (data.get('name') as string) || '';
    const roleVal = (data.get('role') as string) || role;
    const team = (data.get('team') as string) || coachProgram;
    const interests = (data.getAll('interests') as string[]) || [];

    // Append extras for Formspree
    data.append('source', `pilot-${campus.toLowerCase()}`);
    data.append('campus', campusCfg.label);
    data.append('site_version', '2025-09-08');
    if (role === 'Coach' && coachProgram.trim()) {
      data.append('coach_program', coachProgram.trim());
    }
    Object.entries(utm).forEach(([k, v]) => data.append(k, v));

    setLoading(true);

    let supaOk = false;
    let fsOk = false;

    try {
      // 1) Supabase upsert (dedup via unique index on email_norm)
      if (supabase) {
        const { error: supaErr } = await supabase
          .from('leads_asu')
          .upsert(
            [{
              name,
              email,
              role: roleVal,
              team,
              interests,
              utm,
              site_version: '2025-09-08',
              source: `pilot-${campus.toLowerCase()}`,
              user_agent: navigator.userAgent,
              referer: document.referrer
            }],
            { onConflict: 'email_norm', ignoreDuplicates: true }
          );
        if (!supaErr) supaOk = true;
      }

      // 2) Formspree (notifications / backup)
      try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
        });
        if (res.ok) fsOk = true;
        else {
          const text = await res.text();
          try {
            const j = JSON.parse(text);
            setError(j?.errors?.[0]?.message || 'Submission failed. Try again.');
          } catch {
            setError(text || 'Submission failed. Try again.');
          }
        }
      } catch {
        // ignore — Supabase may still have succeeded
      }

      if (supaOk || fsOk) {
        (window as any).plausible?.('Lead', { props: { campus: campusCfg.label, role: roleVal } });
        setSubmitted(true);
        form.reset();
      } else if (!error) {
        setError('Submission failed. Try again.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function scrollToJoin() {
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
                onError={() => setLogoOk(false)}
              />
            ) : (
              <div className="h-7 w-7 rounded-md bg-emerald-500" />
            )}
            <span className="font-semibold tracking-tight">Crunch</span>
            <span className="ml-2 hidden sm:inline-block text-xs text-neutral-400">
              {campusCfg.label} Pilot
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <a href="#how" className="hover:text-neutral-100">How it works</a>
            <a href="#faq" className="hover:text-neutral-100">FAQ</a>
            <button
              onClick={scrollToJoin}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-neutral-900 hover:bg-emerald-400"
            >
              Join the pilot
            </button>
          </nav>
          <button
            onClick={scrollToJoin}
            className="md:hidden rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-neutral-900 hover:bg-emerald-400"
          >
            Join
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-900/60">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
            style={{ background: `${campusCfg.color}33` }}
          />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              AI meal prep & training planner for{' '}
              <span style={{ color: campusCfg.color }}>{campusCfg.label}</span>
            </h1>
            <p className="mt-4 text-neutral-300 max-w-xl">
              Crunch helps students, athletes, and coaches plan fast, healthy meals and simple training schedules.
              Join the {campusCfg.label} pilot to shape the product.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-neutral-300">
              <li>• AI Meal Chat</li>
              <li>• Planner with macro bars</li>
              <li>• Trainer dashboard (v1 during the pilot)</li>
            </ul>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={scrollToJoin}
                className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-900 hover:bg-emerald-400"
              >
                Request access
              </button>
              <a href="#how" className="text-sm text-neutral-300 underline-offset-4 hover:underline">
                See how it works
              </a>
            </div>

            {/* Campus switcher */}
            <div className="mt-6">
              <CampusSwitcher />
            </div>

            <p className="mt-3 text-xs text-neutral-500">Fall pilot • Limited seats • Weekly feedback loops</p>
            <p className="mt-1 text-xs text-neutral-500">Founded by <span className="font-medium">Xuru Ren</span>.</p>
          </div>

          {/* Right: simple product mock */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
            <div className="text-sm text-neutral-400">Today • Planner</div>
            <div className="mt-3 space-y-3">
              <Bar label="Calories" value={0.72} suffix="1,780 / 2,450" />
              <Bar label="Protein" value={0.88} suffix="155 / 176g" />
              <Bar label="Carbs" value={0.51} suffix="120 / 235g" />
              <Bar label="Fat" value={0.63} suffix="42 / 67g" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Card title="Breakfast" note="Egg tacos • 42g protein" />
              <Card title="Lunch" note="Chicken bowl • 53g protein" />
              <Card title="Dinner" note="Salmon & rice • 48g protein" />
              <Card title="Snacks" note="Greek yogurt • 24g protein" />
            </div>
            <div className="mt-6 text-right">
              <span className="inline-block rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                AI tuned for macros
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {[
            { t: 'Tell Crunch your week', d: 'Classes, training, budget, preferences. We auto-calc your macros.' },
            { t: 'Get a prep plan', d: 'Batch-friendly recipes, smart leftovers, grocery list, and simple timings.' },
            { t: 'Track & adapt', d: 'Macro bars update as you log. Coaches see adherence and can nudge.' },
          ].map((i) => (
            <div key={i.t} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">{i.t}</h4>
              <p className="mt-1 text-sm text-neutral-300">{i.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Join form */}
      <section id="join" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite">
                <h3 className="text-xl font-semibold">Join the {campusCfg.label} pilot</h3>

                {/* honeypot input (hidden) */}
                <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

                <div>
                  <label className="block text-sm text-neutral-300">Your name</label>
                  <input
                    required
                    className="mt-1 w-full rounded-xl bg-neutral-800/70 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                    name="name"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300">Email</label>
                  <input
                    required
                    type="email"
                    className="mt-1 w-full rounded-xl bg-neutral-800/70 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                    name="email"
                    placeholder={role === 'Student' ? campusCfg.placeholder : 'you@school.edu'}
                    aria-describedby="email-help"
                    aria-invalid={!!error}
                  />
                  <p id="email-help" className="mt-1 text-xs text-neutral-500">
                    {role === 'Student'
                      ? (campus === 'ASU'
                          ? 'Students: please use your @asu.edu email for priority access.'
                          : campus === 'GCU'
                            ? 'Students: please use your @gcu.edu (or @my.gcu.edu) email for priority access.'
                            : 'Students: please use your @maricopa.edu email for priority access.')
                      : 'Coaches: any email is fine.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-neutral-300">Are you a coach or student?</label>
                  <select
                    name="role"
                    className="mt-1 w-full rounded-xl bg-neutral-800/70 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'Student' | 'Coach' | 'Other')}
                  >
                    <option>Student</option>
                    <option>Coach</option>
                    <option>Other</option>
                  </select>
                </div>

                {role === 'Coach' && (
                  <div>
                    <label className="block text-sm text-neutral-300">Team / Program (optional)</label>
                    <input
                      className="mt-1 w-full rounded-xl bg-neutral-800/70 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
                      name="team"
                      placeholder="e.g., Track & Field"
                      value={coachProgram}
                      onChange={(e) => setCoachProgram(e.target.value)}
                    />
                    {CALENDLY_URL && (
                      <div className="mt-3">
                        <a
                          href={`${CALENDLY_URL}?utm_source=site&utm_medium=join_form&utm_campaign=coach_intro`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                        >
                          Book a 15-min coach intro <span aria-hidden>↗</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-neutral-300">What are you most interested in?</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {['Meal Prep', 'Macro Coaching', 'Team Plans', 'Budget Meals'].map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2"
                      >
                        <input type="checkbox" name="interests" value={tag} className="accent-emerald-500" />
                        <span>{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-900 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Request access'}
                </button>
                <p className="text-xs text-neutral-500">
                  By submitting you agree to be contacted about the pilot. We’ll never sell your data.
                </p>
              </form>
            ) : (
              <div className="text-center py-8" aria-live="polite">
                <div className="mx-auto h-10 w-10 rounded-full" style={{ background: `${campusCfg.color}33` }} />
                <h4 className="mt-3 text-xl font-semibold">Request received</h4>
                <p className="mt-1 text-neutral-300">
                  Thanks! We’ll email you next steps (from <span className="font-medium">xrventuresllc@gmail.com</span>).
                </p>

                {/* LinkedIn nudge after submit */}
                <div className="mt-4 text-sm text-neutral-400">Follow product updates on LinkedIn</div>
                <div className="mt-2 flex items-center justify-center"><LinkedInLink placement="success" /></div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <a href="#faq" className="rounded-lg border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900">
                    Read FAQ
                  </a>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="rounded-lg"
                    style={{ background: campusCfg.color, color: '#0a0a0a', padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 8 }}
                  >
                    Back to top
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">Why a pilot?</h4>
              <p className="mt-1 text-sm text-neutral-300">
                We’re building Crunch with the {campusCfg.label} community. Small cohorts let us ship weekly,
                test meal-prep flows, and tune macro targets for real schedules.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <h4 className="font-semibold">Coach benefits</h4>
              <p className="mt-1 text-sm text-neutral-300">
                Assign plans, monitor adherence, schedule check-ins, and get simple reports—without spreadsheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold">FAQ</h2>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {[
            { q: 'Is this live?', a: 'Core features are working (AI Meal Chat, Planner, macro bars). Trainer dashboard v1 ships during the pilot.' },
            { q: 'Who is Crunch for?', a: 'Students, athletes, and coaches who want simple, fast nutrition and training planning.' },
            { q: 'How do I join the pilot?', a: `Use the form above; we onboard in small cohorts and prioritize ${campusCfg.label} emails for students.` },
            { q: 'How is feedback used?', a: 'We run weekly sprints; your feedback directly shapes features and pricing.' },
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
        <div className="md:hidden fixed bottom-4 left-0 right-0 z-40 flex justify-center">
          <button
            onClick={scrollToJoin}
            className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-neutral-900 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
          >
            Join the {campusCfg.label} pilot
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
            {campusCfg.disclaimer}
          </div>
        </div>
      </footer>
    </div>
  );
}

function CampusSwitcher() {
  const options = [
    { key: 'ASU', label: 'ASU' },
    { key: 'GCU', label: 'GCU' },
    { key: 'MARICOPA', label: 'Maricopa CC' },
  ] as const;

  const current = new URLSearchParams(window.location.search).get('campus')?.toUpperCase() || 'ASU';
  const setCampus = (c: string) => {
    const u = new URL(window.location.href);
    u.searchParams.set('campus', c);
    window.location.href = u.toString();
  };

  return (
    <div className="flex items-center gap-2" aria-label="Choose campus">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => setCampus(o.key)}
          className={`rounded-full px-3 py-1 text-sm border transition ${
            current === o.key ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-800 hover:bg-neutral-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
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

function LinkedInLink({ placement = 'footer' }: { placement?: 'footer' | 'success' }) {
  const url = `${LINKEDIN_URL}?utm_source=site&utm_medium=${placement}&utm_campaign=social_follow`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900"
    >
      {/* LinkedIn icon */}
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7.5 0h4.8v2.2h.07c.67-1.2 2.32-2.47 4.78-2.47C21.9 7.73 24 9.7 24 13.4V24h-5v-9c0-2.15-.77-3.6-2.7-3.6-1.47 0-2.35.99-2.73 1.95-.14.34-.18.8-.18 1.27V24H7.5V8z"/>
      </svg>
    </a>
  );
}
