import React, { useState } from 'react';
import { Cable, Shuffle, Trash2 } from 'lucide-react';
import { ALPHABET } from '../../core/constants';
import { TRANSLATIONS } from '../../i18n/translations';
import { enigmaAudio } from '../../utils/enigmaAudio';
import type { Language, PlugPair } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface PlugboardCablesSVGProps {
  plugboard: PlugPair[];
  language: Language;
  fullscreen?: boolean;
  onChange: (nextPairs: PlugPair[]) => void;
}

const CORD_PALETTE = [
  '#d97706',
  '#38bdf8',
  '#10b981',
  '#f43f5e',
  '#a78bfa',
  '#14b8a6',
  '#fb923c',
  '#22d3ee',
  '#84cc16',
  '#e879f9',
  '#818cf8',
  '#eab308',
  '#f472b6',
];

const STECKER_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
  ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L'],
];

const SOCKET_COORDS = new Map<string, { x: number; y: number }>();
STECKER_ROWS.forEach((row, rIdx) => {
  const y = rIdx === 0 ? 38 : rIdx === 1 ? 94 : 150;
  const startX = row.length === 9 ? 90 : 138;
  row.forEach((ch, cIdx) => {
    SOCKET_COORDS.set(ch, { x: startX + cIdx * 92, y });
  });
});

export const PlugboardCablesSVG: React.FC<PlugboardCablesSVGProps> = ({
  plugboard,
  language,
  fullscreen = false,
  onChange,
}) => {
  const [pendingLetter, setPendingLetter] = useState<string | null>(null);
  const t = TRANSLATIONS[language].enigma;

  const pairIndexByChar = new Map<string, number>();
  plugboard.forEach(([a, b], idx) => {
    pairIndexByChar.set(a, idx);
    pairIndexByChar.set(b, idx);
  });

  const handleJackClick = (letter: string) => {
    const existingIdx = pairIndexByChar.get(letter);
    if (existingIdx !== undefined) {
      enigmaAudio.playPlugJack(false);
      setPendingLetter(null);
      onChange(plugboard.filter((_, i) => i !== existingIdx));
      return;
    }

    if (pendingLetter === null) {
      enigmaAudio.playRotorTick();
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

    enigmaAudio.playPlugJack(true);
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
    enigmaAudio.playPlugJack(true);
    setPendingLetter(null);
    onChange(next);
  };

  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-[#0b0c0f] shadow-inner ${
        fullscreen ? 'px-2.5 py-1.5' : 'p-3 sm:p-3.5'
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Cable className="h-3.5 w-3.5 text-bletchley-brass" />
          <span className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
            {language === 'it' ? 'Pannello Cavi' : 'Plugboard'} ({plugboard.length}/13)
            <InfoTooltip
              title="Steckerbrett (Plugboard)"
              text="Click any two sockets to connect or disconnect a patch cable (up to 13 pairs). Each cable swaps those two letters both before entering and after exiting the rotors."
              align="left"
            />
          </span>
          {pendingLetter && (
            <span className="animate-pulse rounded border border-amber-400/60 bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
              {pendingLetter} → {language === 'it' ? 'scegli 2ª lettera' : 'pick 2nd letter'}
            </span>
          )}
          {plugboard.length > 0 && (
            <div className="hidden flex-wrap gap-1 lg:flex">
              {plugboard.map(([a, b], idx) => (
                <button
                  key={`${a}${b}`}
                  type="button"
                  onClick={() => handleJackClick(a)}
                  style={{ borderColor: CORD_PALETTE[idx % CORD_PALETTE.length] }}
                  className="rounded border bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-200 hover:opacity-75"
                >
                  {a}{b}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRandomPairs}
            className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-200 transition hover:border-bletchley-brass"
          >
            <Shuffle className="h-3 w-3" />
            <span>{t.plugboardRandom}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              enigmaAudio.playPlugJack(false);
              setPendingLetter(null);
              onChange([]);
            }}
            className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-300 transition hover:border-rose-500/60 hover:text-rose-300"
          >
            <Trash2 className="h-3 w-3" />
            <span>{t.plugboardClear}</span>
          </button>
        </div>
      </div>

      {/* Physical 3-Row QWERTZ Twin-Pin Steckerbrett Faceplate */}
      <svg
        viewBox="0 0 920 198"
        preserveAspectRatio="xMidYMid meet"
        className={`mx-auto block w-full select-none ${
          fullscreen ? 'h-[16vh] min-h-[88px] max-h-[140px]' : 'h-auto max-h-[200px]'
        }`}
        role="group"
        aria-label={t.plugboardTitle}
      >
        <rect
          x={6}
          y={4}
          width={908}
          height={190}
          rx={10}
          fill="#0c0d10"
          stroke="#27272a"
          strokeWidth={2}
        />

        {/* 26 Authentic Dual-Hole Sockets */}
        {ALPHABET.split('').map((ch) => {
          const coord = SOCKET_COORDS.get(ch);
          if (!coord) return null;
          const { x, y } = coord;
          const pairIdx = pairIndexByChar.get(ch);
          const isPending = pendingLetter === ch;
          const cordColor =
            pairIdx !== undefined
              ? CORD_PALETTE[pairIdx % CORD_PALETTE.length]
              : isPending
                ? '#fbbf24'
                : undefined;

          return (
            <g
              key={ch}
              onClick={() => handleJackClick(ch)}
              className="cursor-pointer group"
              role="button"
              tabIndex={0}
              aria-label={`Stecker jack ${ch}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleJackClick(ch);
                }
              }}
            >
              {/* White Enamel Stencil Letter */}
              <text
                x={x}
                y={y - 16}
                textAnchor="middle"
                className={`font-mono text-[13px] font-bold ${
                  cordColor
                    ? 'fill-amber-200'
                    : 'fill-zinc-300 group-hover:fill-amber-300'
                }`}
              >
                {ch}
              </text>

              {/* Recessed Socket Collar */}
              <rect
                x={x - 13}
                y={y - 10}
                width={26}
                height={30}
                rx={5}
                fill="#16181d"
                stroke={cordColor ?? '#3f3f46'}
                strokeWidth={isPending ? 2.4 : cordColor ? 1.8 : 1.1}
              />

              {/* Authentic Asymmetric Upper (large) & Lower (small) Pin Holes */}
              <circle cx={x} cy={y - 2} r={4.2} fill="#050507" stroke="#a1a1aa" strokeWidth={1.1} />
              <circle cx={x} cy={y + 10} r={3.1} fill="#050507" stroke="#a1a1aa" strokeWidth={1} />

              {/* Molded Bakelite Double-Plug Cap when Inserted */}
              {cordColor && (
                <g>
                  <rect
                    x={x - 10}
                    y={y - 7}
                    width={20}
                    height={24}
                    rx={4}
                    fill="#1f2026"
                    stroke={cordColor}
                    strokeWidth={1.8}
                  />
                  <circle cx={x} cy={y + 5} r={4} fill={cordColor} />
                </g>
              )}
            </g>
          );
        })}

        {/* Draped Braided Cloth Cables Between Paired Jacks */}
        {plugboard.map(([a, b], idx) => {
          const p1 = SOCKET_COORDS.get(a);
          const p2 = SOCKET_COORDS.get(b);
          if (!p1 || !p2) return null;
          const color = CORD_PALETTE[idx % CORD_PALETTE.length];
          const midX = (p1.x + p2.x) / 2 + ((idx % 3) - 1) * 20;
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const sag = Math.min(44, 18 + dist * 0.06);
          const ctrlY = Math.min(190, Math.max(p1.y, p2.y) + sag);
          const d = `M ${p1.x} ${p1.y + 6} Q ${midX} ${ctrlY} ${p2.x} ${p2.y + 6}`;

          return (
            <g key={`${a}-${b}`} onClick={() => handleJackClick(a)} className="cursor-pointer">
              <title>{`${a} ↔ ${b}`}</title>
              <path
                d={d}
                fill="none"
                stroke="rgba(0,0,0,0.72)"
                strokeWidth={7}
                strokeLinecap="round"
                transform="translate(0, 3)"
              />
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={4.2}
                strokeLinecap="round"
                opacity={0.94}
              />
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={1.4}
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
