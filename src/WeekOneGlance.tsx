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
  onJoin?: () => void;
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
    if (seedEquipment && seedEquipment.length)
      setEquipment(seedEquipment.slice(0, 4));
  }, [seedEquipment]);

  function toggleEq(k: string) {
    setEquipment((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 overflow-hidden">
      <h3 className="text-lg font-semibold">Week 1 — what your client sees</h3>
      <p className="mt-1 text-sm text-neutral-300">
        Pick goal, time &amp; equipment. Lungeable drafts a safe, effective week with
        evidence‑based guardrails (SRA spacing, RPE caps, weekly set ceilings, exposure
        budgets) — no heavy setup. Coaches review and Accept‑Week.
      </p>

      {/* Quick setup controls */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="block text-xs font-semibold text-neutral-400">Goal</span>
          <select
            className="mt-1 w-full rounded-xl bg-neutral-800/70 px-3 py-2 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
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
          <span className="block text-xs font-semibold text-neutral-400">Minutes</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {[20, 30, 45, 60].map((m) => {
              const selected = minutes === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  aria-pressed={selected}
                  className={`min-h-[44px] rounded-full border px-3 py-2 text-sm ${
                    selected
                      ? 'border-white/25 bg-white/10 text-white'
                      : 'border-neutral-700 bg-neutral-800/70 text-neutral-300'
                  }`}
                >
                  {m} min
                </button>
              );
            })}
          </div>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-neutral-400">Equipment</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {['bodyweight', 'db', 'barbell', 'machines', 'bands'].map((k) => {
              const selected = equipment.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleEq(k)}
                  aria-pressed={selected}
                  className={`min-h-[44px] rounded-full border px-3 py-2 text-sm ${
                    selected
                      ? 'border-white/25 bg-white/10 text-white'
                      : 'border-neutral-700 bg-neutral-800/70 text-neutral-300'
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
      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900/70 p-5">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>{title}</span>
          <span>{summary}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
            >
              <div className="text-sm text-neutral-200">{t.label}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{t.note}</div>
            </div>
          ))}
        </div>

        <ul className="mt-3 grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
          <li>• Accept‑Week plan (~{estSessions} sessions)</li>
          <li>• Pocket Coach ready — client texts, you approve</li>
          <li>• Safe progression (SRA/RPE/sets)</li>
          <li>• Hotel‑gym friendly swaps</li>
        </ul>
        {onJoin ? (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onJoin}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-neutral-100"
            >
              Reserve my spot
            </button>
            <span className="text-xs text-neutral-500">
              Illustrative — your real plan adapts weekly with Pocket Coach &amp; Weekly Report.
            </span>
          </div>
        ) : (
          <p className="mt-4 text-xs text-neutral-500">
            Illustrative — coaches review the draft and Accept‑Week.
          </p>
        )}
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Switch goal/minutes/equipment to see how Lungeable adapts. Your Weekly Report will
        tune next week automatically.
      </p>
    </div>
  );
}
