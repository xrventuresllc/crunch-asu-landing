// src/WeekOneGlance.tsx
import { useEffect, useMemo, useState } from 'react';

type Goal = 'build' | 'lean' | 'recomp' | 'sport';

export default function WeekOneGlance({
  seedGoal,
  seedMinutes,
  seedEquipment,
  onJoin,
}: {
  seedGoal?: Goal | '';
  seedMinutes?: number;
  seedEquipment?: string[];
  onJoin: () => void;
}) {
  const [goal, setGoal] = useState<Goal>((seedGoal as Goal) || 'build');
  const [minutes, setMinutes] = useState<number>(
    Math.min(Math.max(seedMinutes || 45, 20), 120)
  );
  const [equipment, setEquipment] = useState<string[]>(
    (seedEquipment && seedEquipment.length ? seedEquipment : ['bodyweight', 'db']).slice(0, 4)
  );

  useEffect(() => {
    if (seedGoal) setGoal(seedGoal as Goal);
  }, [seedGoal]);

  useEffect(() => {
    if (seedMinutes) setMinutes(Math.min(Math.max(seedMinutes, 20), 120));
  }, [seedMinutes]);

  useEffect(() => {
    if (seedEquipment && seedEquipment.length) setEquipment(seedEquipment.slice(0, 4));
  }, [seedEquipment]);

  function toggleEq(k: string) {
    setEquipment((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  const summary = useMemo(
    () =>
      `≈${minutes}m • ` +
      equipment
        .map((k) => (k === 'db' ? 'DB' : k[0].toUpperCase() + k.slice(1)))
        .join(' + '),
    [minutes, equipment]
  );

  const title = useMemo(() => {
    if (goal === 'lean') return 'Full‑Body Circuit';
    if (goal === 'recomp') return 'Upper Focus + Easy Conditioning';
    if (goal === 'sport') return 'Athlete — Speed & Power';
    return 'Push (Strength)';
  }, [goal]);

  const estSessions = minutes >= 60 ? 4 : minutes >= 45 ? 3 : minutes >= 30 ? 3 : 2;

  const tiles: { label: string; note: string }[] = useMemo(() => {
    const mins = `${minutes} min • RPE 6–8`;
    if (goal === 'lean')
      return [
        { label: 'Full‑Body A', note: mins },
        { label: 'Full‑Body B', note: mins },
        { label: 'Conditioning', note: '20–30 min tempo' },
      ];
    if (goal === 'sport')
      return [
        { label: 'Speed/Power', note: mins },
        { label: 'Strength', note: mins },
        { label: 'Conditioning', note: '25 min tempo' },
      ];
    return [
      { label: 'Push', note: mins },
      { label: 'Lower', note: mins },
      { label: 'Upper', note: mins },
    ];
  }, [goal, minutes]);

  return (
    <div className="rounded-3xl border border-black/10 bg-black p-6 text-white shadow-device overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
        Week 1 draft
      </p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">What your client sees</h3>
      <p className="mt-2 text-sm text-white/70">
        Pick goal, time &amp; equipment. Lungeable drafts a safe, effective week with
        evidence‑based guardrails (SRA spacing, RPE caps, weekly set ceilings, exposure
        budgets). Coaches review and Accept‑Week.
      </p>

      {/* Quick setup controls */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="block text-xs font-semibold text-white/60">Goal</span>
          <select
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25"
            value={goal}
            onChange={(e) => setGoal(e.currentTarget.value as Goal)}
          >
            <option value="build">Build muscle</option>
            <option value="lean">Get lean</option>
            <option value="recomp">Recomposition</option>
            <option value="sport">Sport‑specific</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-white/60">Minutes</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {[20, 30, 45, 60].map((m) => {
              const selected = minutes === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  aria-pressed={selected}
                  className={`min-h-[44px] rounded-full border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {m} min
                </button>
              );
            })}
          </div>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-white/60">Equipment</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {['bodyweight', 'db', 'barbell', 'machines', 'bands'].map((k) => {
              const selected = equipment.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleEq(k)}
                  aria-pressed={selected}
                  className={`min-h-[44px] rounded-full border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {selected && <span className="mr-1">✓</span>}
                  {k === 'db' ? 'Dumbbells' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              );
            })}
          </div>
        </label>
      </div>

      {/* Weekly preview */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{title}</span>
          <span>{summary}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl border border-white/10 bg-black/40 p-3"
            >
              <div className="text-sm text-white">{t.label}</div>
              <div className="mt-0.5 text-xs text-white/60">{t.note}</div>
            </div>
          ))}
        </div>

        <ul className="mt-3 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
          <li>• Accept‑Week plan (~{estSessions} sessions)</li>
          <li>• Pocket Coach ready — client texts, you approve</li>
          <li>• Safe progression (SRA/RPE/sets)</li>
          <li>• Hotel‑gym friendly swaps</li>
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onJoin}
            className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-neutral-100"
          >
            Apply for early access
          </button>
          <span className="text-xs text-white/60">
            Illustrative — your real plan adapts weekly with Pocket Coach &amp; Weekly Report.
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/60">
        Switch goal/minutes/equipment to see how Lungeable adapts. Your Weekly Report will
        tune next week automatically.
      </p>
    </div>
  );
}
