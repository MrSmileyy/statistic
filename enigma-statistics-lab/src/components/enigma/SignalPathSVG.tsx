import React from 'react';
import { ALPHABET_SIZE, indexToChar, ROTORS } from '../../core/constants';
import { TRANSLATIONS } from '../../i18n/translations';
import type { EnigmaConfig, Language, SignalTrace } from '../../types';

interface SignalPathSVGProps {
  config: EnigmaConfig;
  trace: SignalTrace | null;
  language: Language;
  compact?: boolean;
}

const ROTOR_BAYS = [
  { slot: 0 as const, xLeft: 160, xRight: 278 },
  { slot: 1 as const, xLeft: 326, xRight: 444 },
  { slot: 2 as const, xLeft: 492, xRight: 610 },
];

function yPin(idx: number): number {
  return 24 + idx * 6.0;
}

function wireCurve(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.48;
  const dir = x2 >= x1 ? 1 : -1;
  return `M ${x1} ${y1} C ${x1 + dir * dx} ${y1}, ${x2 - dir * dx} ${y2}, ${x2} ${y2}`;
}

interface BusBadgeProps {
  x: number;
  y: number;
  char: string;
  variant: 'fwd' | 'bwd';
}

const BusBadge: React.FC<BusBadgeProps> = ({ x, y, char, variant }) => (
  <g>
    <rect
      x={x - 6.5}
      y={y - 5}
      width={13}
      height={10}
      rx={2.5}
      fill={variant === 'fwd' ? '#0284c7' : '#f59e0b'}
      stroke={variant === 'fwd' ? '#bae6fd' : '#fef3c7'}
      strokeWidth={0.9}
    />
    <text
      x={x}
      y={y + 2.8}
      textAnchor="middle"
      className={`font-mono text-[8px] font-extrabold ${
        variant === 'fwd' ? 'fill-white' : 'fill-zinc-950'
      }`}
    >
      {char}
    </text>
  </g>
);

export const SignalPathSVG: React.FC<SignalPathSVGProps> = ({
  config,
  trace,
  language,
  compact = false,
}) => {
  const t = TRANSLATIONS[language].enigma;
  const isIt = language === 'it';
  const activePositions = trace?.rotorPositionsAfter ?? config.rotorPositions;

  return (
    <section
      className={`rounded-lg border border-zinc-700/80 bg-[#080a0f] shadow-inner ${
        compact ? 'px-2.5 py-1.5' : 'p-2.5 sm:p-3'
      }`}
    >
      {/* Single-row header + live signal steps so vertical height stays minimal */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-bletchley-brass-bright">
            {isIt ? 'Vano Rotori Aperto' : 'Open Rotor Bay'}
          </span>
          <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
            {activePositions.map((p) => indexToChar(p)).join('-')}
          </span>
        </div>

        {trace ? (
          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-300">
              {isIt ? 'Tasto' : 'Key'} {trace.inputChar}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-sky-200">
              {isIt ? 'Cavi' : 'Plug'} {indexToChar(trace.steckerInIdx)}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-sky-200">
              DX {indexToChar(trace.rightOutIdx)}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-sky-200">
              CX {indexToChar(trace.middleOutIdx)}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-sky-200">
              SX {indexToChar(trace.leftOutIdx)}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-bletchley-brass-bright">
              UKW {indexToChar(trace.reflectorOutIdx)}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-amber-200">
              {indexToChar(trace.leftBackIdx)}-{indexToChar(trace.middleBackIdx)}-
              {indexToChar(trace.rightBackIdx)}
            </span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="rounded bg-amber-400/25 px-1.5 py-0.5 font-bold text-amber-300">
              {isIt ? 'Lampada' : 'Lamp'} {trace.lampChar}
            </span>
          </div>
        ) : (
          <span className="font-mono text-[10px] text-zinc-400">
            {t.signalPathEmpty}
          </span>
        )}

        <div className="hidden items-center gap-2.5 font-mono text-[10px] sm:flex">
          <span className="inline-flex items-center gap-1 text-sky-300">
            <span className="h-1.5 w-3 rounded-full bg-sky-400" />
            {isIt ? 'Andata' : 'Forward'}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300">
            <span className="h-1.5 w-3 rounded-full bg-amber-400" />
            {isIt ? 'Ritorno' : 'Return'}
          </span>
        </div>
      </div>

      {/* Cutaway SVG */}
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 920 186"
          preserveAspectRatio="xMidYMid meet"
          className={`mx-auto block w-full min-w-[600px] ${
            compact ? 'h-[30vh] min-h-[175px] max-h-[255px]' : 'h-auto max-h-[240px]'
          }`}
          role="img"
          aria-label={t.signalPathTitle}
        >
          {/* Steel Central Spindle Axle */}
          <rect
            x={70}
            y={95}
            width={710}
            height={8}
            rx={3}
            fill="#1e2430"
            stroke="#334155"
            strokeWidth={1}
          />

          {/* 1. LEFT STATION: UKW REFLECTOR */}
          <g>
            <rect
              x={22}
              y={16}
              width={92}
              height={164}
              rx={10}
              fill="#141821"
              stroke="#8c6d32"
              strokeWidth={1.5}
            />
            <text
              x={68}
              y={11}
              textAnchor="middle"
              className="fill-amber-300 font-mono text-[9.5px] font-bold"
            >
              {config.reflector}
            </text>

            {Array.from({ length: ALPHABET_SIZE }, (_, pin) => (
              <circle
                key={`ukw-${pin}`}
                cx={104}
                cy={yPin(pin)}
                r={1.5}
                fill={
                  trace &&
                  (pin === trace.reflectorInIdx || pin === trace.reflectorOutIdx)
                    ? '#fbbf24'
                    : '#334155'
                }
              />
            ))}

            {trace && (
              <path
                d={`M 104 ${yPin(trace.reflectorInIdx)} C 34 ${yPin(
                  trace.reflectorInIdx
                )}, 34 ${yPin(trace.reflectorOutIdx)}, 104 ${yPin(
                  trace.reflectorOutIdx
                )}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2.6}
                strokeDasharray="5 3"
                className="animate-signal-dash"
              />
            )}
          </g>

          {/* 2. THREE CYLINDRICAL ROTOR BARRELS */}
          {ROTOR_BAYS.map(({ slot, xLeft, xRight }) => {
            const rotorId = config.rotors[slot];
            const spec = ROTORS[rotorId];
            const pos = activePositions[slot];
            const ring = config.ringSettings[slot];
            const shift = (pos - ring + ALPHABET_SIZE) % ALPHABET_SIZE;

            const fwdIn =
              slot === 0
                ? trace?.leftInIdx
                : slot === 1
                  ? trace?.middleInIdx
                  : trace?.rightInIdx;
            const fwdOut =
              slot === 0
                ? trace?.leftOutIdx
                : slot === 1
                  ? trace?.middleOutIdx
                  : trace?.rightOutIdx;
            const bwdIn =
              slot === 0
                ? trace?.reflectorOutIdx
                : slot === 1
                  ? trace?.leftBackIdx
                  : trace?.middleBackIdx;
            const bwdOut =
              slot === 0
                ? trace?.leftBackIdx
                : slot === 1
                  ? trace?.middleBackIdx
                  : trace?.rightBackIdx;

            const slotLabel = slot === 0 ? 'SX' : slot === 1 ? 'CX' : 'DX';

            return (
              <g key={`rotor-${slot}`}>
                {/* Brass Notched Wheel Flange */}
                <rect
                  x={xRight - 10}
                  y={13}
                  width={14}
                  height={170}
                  rx={3}
                  fill="#292214"
                  stroke="#9a7836"
                  strokeWidth={1}
                />

                {/* Cylindrical Cutaway Drum Body */}
                <rect
                  x={xLeft}
                  y={16}
                  width={xRight - xLeft - 6}
                  height={164}
                  rx={6}
                  fill="rgba(17, 23, 34, 0.92)"
                  stroke="#475569"
                  strokeWidth={1.4}
                />

                <text
                  x={(xLeft + xRight) / 2 - 3}
                  y={11}
                  textAnchor="middle"
                  className="fill-zinc-200 font-mono text-[9.5px] font-bold"
                >
                  {slotLabel} {rotorId} [{indexToChar(pos)}]
                </text>

                {/* Subtle passive copper filaments */}
                {Array.from({ length: ALPHABET_SIZE }, (_, rightPin) => {
                  const leftPin =
                    (spec.forward[(rightPin + shift) % ALPHABET_SIZE] -
                      shift +
                      ALPHABET_SIZE) %
                    ALPHABET_SIZE;
                  const isFwd = trace && rightPin === fwdIn && leftPin === fwdOut;
                  const isBwd = trace && leftPin === bwdIn && rightPin === bwdOut;

                  if (isFwd || isBwd) return null;

                  return (
                    <path
                      key={`wire-${slot}-${rightPin}`}
                      d={wireCurve(xRight, yPin(rightPin), xLeft, yPin(leftPin))}
                      fill="none"
                      stroke="rgba(212, 168, 83, 0.08)"
                      strokeWidth={0.7}
                    />
                  );
                })}

                {/* Pin terminal dots */}
                {Array.from({ length: ALPHABET_SIZE }, (_, pin) => (
                  <g key={`pins-${slot}-${pin}`}>
                    <circle
                      cx={xLeft}
                      cy={yPin(pin)}
                      r={1.3}
                      fill={
                        trace && (pin === fwdOut || pin === bwdIn) ? '#f8fafc' : '#334155'
                      }
                    />
                    <circle
                      cx={xRight}
                      cy={yPin(pin)}
                      r={1.3}
                      fill={
                        trace && (pin === fwdIn || pin === bwdOut) ? '#f8fafc' : '#334155'
                      }
                    />
                  </g>
                ))}

                {/* Active Forward Cyan Beam */}
                {trace && fwdIn !== undefined && fwdOut !== undefined && (
                  <path
                    d={wireCurve(xRight, yPin(fwdIn), xLeft, yPin(fwdOut))}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={2.8}
                    strokeDasharray="6 3"
                    className="animate-signal-dash"
                  />
                )}

                {/* Active Return Amber Beam */}
                {trace && bwdIn !== undefined && bwdOut !== undefined && (
                  <path
                    d={wireCurve(xLeft, yPin(bwdIn), xRight, yPin(bwdOut))}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={2.8}
                    strokeDasharray="6 3"
                    className="animate-signal-dash"
                  />
                )}
              </g>
            );
          })}

          {/* Inter-Stage Signal Buses + Letter Badges */}
          {trace && (
            <g>
              <line
                x1={666}
                y1={yPin(trace.steckerInIdx)}
                x2={610}
                y2={yPin(trace.rightInIdx)}
                stroke="#38bdf8"
                strokeWidth={2.2}
              />
              <line
                x1={610}
                y1={yPin(trace.rightBackIdx)}
                x2={666}
                y2={yPin(trace.rightBackIdx)}
                stroke="#fbbf24"
                strokeWidth={2.2}
              />
              <BusBadge
                x={638}
                y={yPin(trace.steckerInIdx)}
                char={indexToChar(trace.steckerInIdx)}
                variant="fwd"
              />
              <BusBadge
                x={638}
                y={yPin(trace.rightBackIdx)}
                char={indexToChar(trace.rightBackIdx)}
                variant="bwd"
              />

              <line
                x1={492}
                y1={yPin(trace.rightOutIdx)}
                x2={444}
                y2={yPin(trace.middleInIdx)}
                stroke="#38bdf8"
                strokeWidth={2.2}
              />
              <line
                x1={444}
                y1={yPin(trace.middleBackIdx)}
                x2={492}
                y2={yPin(trace.middleBackIdx)}
                stroke="#fbbf24"
                strokeWidth={2.2}
              />
              <BusBadge
                x={468}
                y={yPin(trace.rightOutIdx)}
                char={indexToChar(trace.rightOutIdx)}
                variant="fwd"
              />
              <BusBadge
                x={468}
                y={yPin(trace.middleBackIdx)}
                char={indexToChar(trace.middleBackIdx)}
                variant="bwd"
              />

              <line
                x1={326}
                y1={yPin(trace.middleOutIdx)}
                x2={278}
                y2={yPin(trace.leftInIdx)}
                stroke="#38bdf8"
                strokeWidth={2.2}
              />
              <line
                x1={278}
                y1={yPin(trace.leftBackIdx)}
                x2={326}
                y2={yPin(trace.leftBackIdx)}
                stroke="#fbbf24"
                strokeWidth={2.2}
              />
              <BusBadge
                x={302}
                y={yPin(trace.middleOutIdx)}
                char={indexToChar(trace.middleOutIdx)}
                variant="fwd"
              />
              <BusBadge
                x={302}
                y={yPin(trace.leftBackIdx)}
                char={indexToChar(trace.leftBackIdx)}
                variant="bwd"
              />

              <line
                x1={160}
                y1={yPin(trace.leftOutIdx)}
                x2={104}
                y2={yPin(trace.reflectorInIdx)}
                stroke="#38bdf8"
                strokeWidth={2.2}
              />
              <line
                x1={104}
                y1={yPin(trace.reflectorOutIdx)}
                x2={160}
                y2={yPin(trace.reflectorOutIdx)}
                stroke="#fbbf24"
                strokeWidth={2.2}
              />
              <BusBadge
                x={132}
                y={yPin(trace.leftOutIdx)}
                char={indexToChar(trace.leftOutIdx)}
                variant="fwd"
              />
              <BusBadge
                x={132}
                y={yPin(trace.reflectorOutIdx)}
                char={indexToChar(trace.reflectorOutIdx)}
                variant="bwd"
              />
            </g>
          )}

          {/* 3. RIGHT STATION: PLUGBOARD CABLES */}
          <g>
            <rect
              x={666}
              y={16}
              width={100}
              height={164}
              rx={6}
              fill="#141821"
              stroke="#475569"
              strokeWidth={1.4}
            />
            <text
              x={716}
              y={11}
              textAnchor="middle"
              className="fill-zinc-300 font-mono text-[9.5px] font-bold"
            >
              {isIt ? 'Cavi' : 'Plugs'}
            </text>

            {Array.from({ length: ALPHABET_SIZE }, (_, pin) => {
              const isIn = trace && pin === trace.inputIdx;
              const isOut = trace && pin === trace.lampIdx;
              return (
                <g key={`io-${pin}`}>
                  <text
                    x={796}
                    y={yPin(pin) + 2.5}
                    className={`font-mono text-[7px] font-bold ${
                      isIn
                        ? 'fill-sky-300'
                        : isOut
                          ? 'fill-amber-300'
                          : 'fill-zinc-500'
                    }`}
                  >
                    {indexToChar(pin)}
                  </text>
                  <circle cx={766} cy={yPin(pin)} r={1.3} fill="#475569" />
                  <circle cx={666} cy={yPin(pin)} r={1.3} fill="#475569" />
                </g>
              );
            })}

            {trace && (
              <>
                <path
                  d={wireCurve(
                    766,
                    yPin(trace.inputIdx),
                    666,
                    yPin(trace.steckerInIdx)
                  )}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  className="animate-signal-dash"
                />
                <path
                  d={wireCurve(
                    666,
                    yPin(trace.rightBackIdx),
                    766,
                    yPin(trace.lampIdx)
                  )}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  className="animate-signal-dash"
                />
                <line
                  x1={766}
                  y1={yPin(trace.inputIdx)}
                  x2={791}
                  y2={yPin(trace.inputIdx)}
                  stroke="#38bdf8"
                  strokeWidth={2.2}
                />
                <line
                  x1={766}
                  y1={yPin(trace.lampIdx)}
                  x2={791}
                  y2={yPin(trace.lampIdx)}
                  stroke="#fbbf24"
                  strokeWidth={2.2}
                />
              </>
            )}
          </g>

          {/* 4. KEY & LAMP READOUT */}
          <g>
            <rect
              x={822}
              y={22}
              width={82}
              height={68}
              rx={8}
              fill="#0f172a"
              stroke={trace ? '#38bdf8' : '#334155'}
              strokeWidth={1.5}
            />
            <text
              x={863}
              y={40}
              textAnchor="middle"
              className="fill-zinc-400 font-sans text-[9.5px] font-semibold"
            >
              {t.stageInput}
            </text>
            <text
              x={863}
              y={74}
              textAnchor="middle"
              className="fill-sky-300 font-mono text-2xl font-extrabold"
            >
              {trace ? trace.inputChar : '-'}
            </text>

            <rect
              x={822}
              y={104}
              width={82}
              height={68}
              rx={8}
              fill={trace ? 'rgba(251, 191, 36, 0.14)' : '#0f172a'}
              stroke={trace ? '#fbbf24' : '#334155'}
              strokeWidth={1.6}
            />
            <text
              x={863}
              y={122}
              textAnchor="middle"
              className="fill-zinc-400 font-sans text-[9.5px] font-semibold"
            >
              {t.stageLamp}
            </text>
            <text
              x={863}
              y={156}
              textAnchor="middle"
              className="fill-amber-300 font-mono text-2xl font-extrabold"
            >
              {trace ? trace.lampChar : '-'}
            </text>
          </g>
        </svg>
      </div>
    </section>
  );
};
