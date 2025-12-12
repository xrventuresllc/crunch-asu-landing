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
      { from: 'you', text: 'Right knee aches—avoid deep flexion.' },
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 overflow-hidden">
      <h3 className="text-lg font-semibold">Pocket Coach — replan via chat</h3>
      <p className="mt-1 text-sm text-neutral-300">
        Natural‑language replans that preserve anchors &amp; exposure budgets. Clients and
        coaches can both trigger changes; coaches approve week‑level updates.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="min-h-[44px] rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 text-left text-sm text-neutral-100 hover:bg-neutral-900"
          onClick={() => play('busy')}
        >
          “Only 25 minutes today.”
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 text-left text-sm text-neutral-100 hover:bg-neutral-900"
          onClick={() => play('knee')}
        >
          “Right knee aches—avoid deep flexion.”
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 text-left text-sm text-neutral-100 hover:bg-neutral-900"
          onClick={() => play('hotel')}
        >
          “Hotel gym — no bench.”
        </button>
      </div>

      <div
        className="mt-4 min-h-[96px] rounded-xl border border-neutral-800 bg-neutral-900/70 p-4"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <p className="text-sm text-neutral-500">
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
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  L.from === 'you'
                    ? 'bg-violet-600 text-white'
                    : 'bg-neutral-800 text-neutral-200'
                }`}
              >
                {L.text}
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Clients just text constraints. You keep full control and approve week‑level changes.
      </p>
    </div>
  );
}
