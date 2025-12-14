// src/DMSimulator.tsx
import { useEffect, useRef, useState } from 'react';

export type DMKey = 'busy' | 'knee' | 'hotel';

type Line = { from: 'you' | 'coach'; text: string };

interface DMSimulatorProps {
  onSim?: (key: DMKey) => void;
  /** When set, auto‑plays that scenario once each time the value changes. */
  autoKey?: DMKey | null;
  /** Compact mode for tight device previews (keeps the core interaction, trims chrome). */
  compact?: boolean;
}

export default function DMSimulator({ onSim, autoKey, compact = false }: DMSimulatorProps) {
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

  const containerClass =
    'rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden ' +
    (compact ? 'p-4' : 'p-5');

  const titleClass = compact
    ? 'text-sm font-semibold text-neutral-100'
    : 'text-lg font-semibold text-neutral-100';

  const descClass = compact ? 'mt-1 text-[12px] text-neutral-300' : 'mt-1 text-sm text-neutral-300';

  const buttonClass =
    'rounded-2xl border border-neutral-800 bg-neutral-900/70 text-left text-neutral-100 hover:bg-neutral-900';

  return (
    <div className={containerClass}>
      {!compact && (
        <>
          <h3 className={titleClass}>Pocket Coach — replan via chat</h3>
          <p className={descClass}>
            Natural‑language replans that preserve anchors &amp; exposure budgets. Clients and coaches
            can both trigger changes; coaches approve week‑level updates.
          </p>
        </>
      )}

      {compact && (
        <div className="flex items-center justify-between">
          <h3 className={titleClass}>Pocket Coach DM</h3>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-neutral-300">
            Propose → approve
          </span>
        </div>
      )}

      <div className={compact ? 'mt-3 grid gap-2' : 'mt-4 grid gap-3 sm:grid-cols-3'}>
        <button
          type="button"
          className={buttonClass + (compact ? ' p-2 text-xs' : ' min-h-[44px] p-3 text-sm')}
          onClick={() => play('busy')}
        >
          “Only 25 minutes today.”
        </button>
        <button
          type="button"
          className={buttonClass + (compact ? ' p-2 text-xs' : ' min-h-[44px] p-3 text-sm')}
          onClick={() => play('knee')}
        >
          “Right knee aches—avoid deep flexion.”
        </button>
        <button
          type="button"
          className={buttonClass + (compact ? ' p-2 text-xs' : ' min-h-[44px] p-3 text-sm')}
          onClick={() => play('hotel')}
        >
          “Hotel gym — no bench.”
        </button>
      </div>

      <div
        className={
          'mt-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 ' +
          (compact ? 'min-h-[130px]' : 'min-h-[96px]')
        }
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <p className={compact ? 'text-xs text-neutral-500' : 'text-sm text-neutral-500'}>
            Tap a scenario to preview Pocket Coach. In the real app, approvals update the client’s
            current week and roll into Weekly Reports.
          </p>
        ) : (
          lines.map((L, idx) => (
            <div
              key={idx}
              className={`mt-2 flex ${L.from === 'you' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  compact ? 'text-xs' : 'text-sm'
                } ${
                  L.from === 'you' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-200'
                }`}
              >
                {L.text}
              </div>
            </div>
          ))
        )}
      </div>

      {!compact && (
        <p className="mt-2 text-xs text-neutral-500">
          Clients just text constraints. You keep full control and approve week‑level changes.
        </p>
      )}

      {compact && (
        <p className="mt-2 text-[11px] text-neutral-500">
          You keep control: approve week‑level changes.
        </p>
      )}
    </div>
  );
}
