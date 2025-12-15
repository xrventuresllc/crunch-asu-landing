// src/DMSimulator.tsx
import { useEffect, useRef, useState } from 'react';

export type DMKey = 'busy' | 'knee' | 'hotel';

type Line = { from: 'you' | 'coach'; text: string };

interface DMSimulatorProps {
  onSim?: (key: DMKey) => void;
  /** When set, auto‑plays that scenario once each time the value changes. */
  autoKey?: DMKey | null;
}

export default function DMSimulator({ onSim, autoKey }: DMSimulatorProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const timeouts = useRef<number[]>([]);

  const scenarios: Record<DMKey, Line[]> = {
    busy: [
      { from: 'you', text: 'Only 25 minutes today.' },
      {
        from: 'coach',
        text: 'Keeping anchors. Trimming accessories. Tightening rests and pairing supersets.',
      },
      {
        from: 'coach',
        text: 'Quality preserved. You’ll still hit exposure targets — ready to approve?',
      },
    ],
    knee: [
      { from: 'you', text: 'Right knee aches — avoid deep flexion.' },
      {
        from: 'coach',
        text: 'Swapping to ROM‑friendly patterns, tempo tweak, lower plyo volume.',
      },
      {
        from: 'coach',
        text: 'SRA spacing protected. Plan stays safe & effective — ready to approve?',
      },
    ],
    hotel: [
      { from: 'you', text: 'Hotel gym — no bench.' },
      {
        from: 'coach',
        text: 'Switching to DB/landmine variants. Weekly pressing exposure maintained.',
      },
      {
        from: 'coach',
        text: 'Variants swapped in. Weekly pressing exposure maintained — ready to approve?',
      },
    ],
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach((id) => clearTimeout(id));
      timeouts.current = [];
    };
  }, []);

  function play(key: DMKey) {
    if (running) return;

    // Clear any stray timeouts from previous run
    timeouts.current.forEach((id) => clearTimeout(id));
    timeouts.current = [];

    setRunning(true);
    setLines([]);
    onSim?.(key);

    const seq = scenarios[key];
    let i = 0;

    const tick = () => {
      setLines((prev) => [...prev, seq[i]]);
      i += 1;
      if (i < seq.length) {
        const id = window.setTimeout(tick, 600);
        timeouts.current.push(id);
      } else {
        const id = window.setTimeout(() => setRunning(false), 300);
        timeouts.current.push(id);
      }
    };

    tick();
  }

  // Auto‑play when parent passes a new autoKey
  useEffect(() => {
    if (!autoKey) return;
    play(autoKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoKey]);

  return (
    <div className="rounded-3xl border border-black/10 bg-black p-6 text-white shadow-device overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
        Pocket Coach
      </p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">
        Replan sessions via chat — without breaking the block.
      </h3>
      <p className="mt-2 text-sm text-white/70">
        Clients DM constraints. Pocket Coach proposes guardrail‑safe tweaks that preserve
        anchors and exposure budgets. You approve week‑level changes.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="min-h-[44px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"
          onClick={() => play('busy')}
        >
          “Only 25 minutes today.”
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"
          onClick={() => play('knee')}
        >
          “Right knee aches — avoid deep flexion.”
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"
          onClick={() => play('hotel')}
        >
          “Hotel gym — no bench.”
        </button>
      </div>

      <div
        className="mt-4 min-h-[104px] rounded-2xl border border-white/10 bg-white/5 p-4"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <p className="text-sm text-white/60">
            Tap a scenario to preview Pocket Coach. In the real app, each approval updates
            the client’s current week and rolls into their Weekly Report.
          </p>
        ) : (
          lines.map((L, idx) => (
            <div
              key={idx}
              className={`mt-2 flex ${L.from === 'you' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                  L.from === 'you'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                {L.text}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mt-3 text-xs text-white/60">
        Assistant, not replacement: proposals are constrained by your rules. You still approve.
      </p>
    </div>
  );
}
