import React, { useState } from 'react';
import { Cable, Shuffle, Trash2 } from 'lucide-react';
import { ALPHABET } from '../../core/constants';
import { TRANSLATIONS } from '../../i18n/translations';
import type { Language, PlugPair } from '../../types';

interface PlugboardPanelProps {
  plugboard: PlugPair[];
  language: Language;
  onChange: (nextPairs: PlugPair[]) => void;
}

const CABLE_COLORS = [
  'border-amber-400 bg-amber-400/20 text-amber-200',
  'border-sky-400 bg-sky-400/20 text-sky-200',
  'border-emerald-400 bg-emerald-400/20 text-emerald-200',
  'border-rose-400 bg-rose-400/20 text-rose-200',
  'border-violet-400 bg-violet-400/20 text-violet-200',
  'border-teal-400 bg-teal-400/20 text-teal-200',
  'border-orange-400 bg-orange-400/20 text-orange-200',
  'border-cyan-400 bg-cyan-400/20 text-cyan-200',
  'border-lime-400 bg-lime-400/20 text-lime-200',
  'border-fuchsia-400 bg-fuchsia-400/20 text-fuchsia-200',
  'border-indigo-400 bg-indigo-400/20 text-indigo-200',
  'border-yellow-400 bg-yellow-400/20 text-yellow-200',
  'border-pink-400 bg-pink-400/20 text-pink-200',
];

export const PlugboardPanel: React.FC<PlugboardPanelProps> = ({
  plugboard,
  language,
  onChange,
}) => {
  const [pendingLetter, setPendingLetter] = useState<string | null>(null);
  const t = TRANSLATIONS[language].enigma;

  const pairIndexByChar = new Map<string, number>();
  plugboard.forEach(([a, b], idx) => {
    pairIndexByChar.set(a, idx);
    pairIndexByChar.set(b, idx);
  });

  const handleSocketClick = (letter: string) => {
    const existingPairIdx = pairIndexByChar.get(letter);
    if (existingPairIdx !== undefined) {
      // Unplug existing cable on single click.
      const next = plugboard.filter((_, i) => i !== existingPairIdx);
      setPendingLetter(null);
      onChange(next);
      return;
    }

    if (pendingLetter === null) {
      setPendingLetter(letter);
      return;
    }

    if (pendingLetter === letter) {
      setPendingLetter(null);
      return;
    }

    if (plugboard.length >= 13) {
      setPendingLetter(null);
      return;
    }

    const pair: PlugPair =
      pendingLetter < letter ? [pendingLetter, letter] : [letter, pendingLetter];
    setPendingLetter(null);
    onChange([...plugboard, pair]);
  };

  const handleRandomPairs = () => {
    const letters = ALPHABET.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const next: PlugPair[] = [];
    for (let i = 0; i < 12; i += 2) {
      const a = letters[i];
      const b = letters[i + 1];
      next.push(a < b ? [a, b] : [b, a]);
    }
    setPendingLetter(null);
    onChange(next);
  };

  return (
    <section className="bletchley-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-bletchley-brass">
            <Cable className="h-4 w-4" />
            <span>{t.plugboardTitle}</span>
            <span className="rounded-full bg-bletchley-card px-2 py-0.5 font-mono text-[11px] text-slate-300">
              {plugboard.length}/13 {t.plugboardPairsCount}
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">{t.plugboardHelp}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomPairs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-bletchley-signal/60 hover:text-bletchley-signal"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>{t.plugboardRandom}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingLetter(null);
              onChange([]);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-rose-500/60 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.plugboardClear}</span>
          </button>
        </div>
      </div>

      {/* 26 Stecker Sockets */}
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9 md:grid-cols-[repeat(13,minmax(0,1fr))]">
        {ALPHABET.split('').map((ch) => {
          const pairIdx = pairIndexByChar.get(ch);
          const isPending = pendingLetter === ch;
          const colorStyle =
            pairIdx !== undefined
              ? CABLE_COLORS[pairIdx % CABLE_COLORS.length]
              : isPending
                ? 'border-bletchley-brass-bright bg-bletchley-brass/25 text-bletchley-brass-bright ring-2 ring-bletchley-brass/40'
                : 'border-bletchley-border bg-bletchley-ink/80 text-slate-300 hover:border-slate-500';

          const partner =
            pairIdx !== undefined
              ? plugboard[pairIdx][0] === ch
                ? plugboard[pairIdx][1]
                : plugboard[pairIdx][0]
              : null;

          return (
            <button
              key={ch}
              type="button"
              onClick={() => handleSocketClick(ch)}
              className={`flex flex-col items-center justify-center rounded-lg border py-1.5 font-mono transition ${colorStyle}`}
            >
              <span className="text-xs font-bold">{ch}</span>
              <span className="text-[9px] opacity-80">{partner ? `↔${partner}` : '·'}</span>
            </button>
          );
        })}
      </div>

      {/* Active Plugboard Cables Summary */}
      {plugboard.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plugboard.map(([a, b], idx) => (
            <button
              key={`${a}${b}`}
              type="button"
              onClick={() => onChange(plugboard.filter((_, i) => i !== idx))}
              title="Click to unplug"
              className={`rounded-md border px-2 py-0.5 font-mono text-xs font-semibold transition hover:opacity-75 ${
                CABLE_COLORS[idx % CABLE_COLORS.length]
              }`}
            >
              {a} ↔ {b} ×
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
