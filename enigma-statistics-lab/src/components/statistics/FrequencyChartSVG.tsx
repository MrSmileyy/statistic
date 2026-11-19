import React, { useState } from 'react';
import type { Language, LetterFrequencyItem } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface FrequencyChartSVGProps {
  frequencies: LetterFrequencyItem[];
  language?: Language;
}

export const FrequencyChartSVG: React.FC<FrequencyChartSVGProps> = ({
  frequencies,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxFreq = Math.max(
    0.18,
    ...frequencies.map((f) => Math.max(f.observedFreq, f.expectedFreq))
  );

  const width = 780;
  const height = 220;
  const padLeft = 44;
  const padBottom = 26;
  const padTop = 16;
  const plotW = width - padLeft - 14;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / 26;

  const hovered = hoveredIdx !== null ? frequencies[hoveredIdx] : null;
  const yUniform = padTop + plotH - ((1 / 26) / maxFreq) * plotH;

  const topObserved = [...frequencies]
    .filter((f) => f.count > 0)
    .sort((a, b) => b.observedFreq - a.observedFreq)
    .slice(0, 3);

  const topExpected = [...frequencies]
    .sort((a, b) => b.expectedFreq - a.expectedFreq)
    .slice(0, 3);

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div>
          <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
            <span>Letter Frequency Fingerprint (Your Text vs. Normal Language)</span>
            <InfoTooltip
              title="How to Read This Bar Chart"
              text={`• Blue bars = how often each letter appears in YOUR text.\n• Amber bars = how often each letter appears in normal German/English.\n• Red dashed line = 3.85% (flat random noise).\n\nEncrypted text looks flat near the red line; real plaintext rises to match the tall amber bars (like E, N, R, T).`}
              align="left"
            />
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            <strong className="text-sky-300">Blue</strong> = your text &middot;{' '}
            <strong className="text-amber-300">Amber</strong> = normal language &middot;{' '}
            <strong className="text-rose-400">Red line</strong> = pure random (3.85%). When text is decrypted, blue bars rise to match the tall amber peaks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5 text-sky-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#38bdf8]" />
            Your Text
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#d4a853]" />
            Normal Language
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-400">
            <span className="h-0.5 w-3.5 bg-[#ef4444]" />
            Random 3.85%
          </span>
        </div>
      </div>

      <div className="mb-2 flex min-h-[28px] flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 bg-[#08090c] px-3 py-1 font-mono text-xs text-zinc-300">
        {hovered ? (
          <div className="flex flex-wrap gap-5">
            <span>
              Letter: <strong className="text-amber-300">{hovered.char}</strong>
            </span>
            <span>Count: {hovered.count}</span>
            <span className="text-sky-300">
              Your text: {(hovered.observedFreq * 100).toFixed(2)}%
            </span>
            <span className="text-amber-300">
              Normal: {(hovered.expectedFreq * 100).toFixed(2)}%
            </span>
            <span className="text-zinc-400">
              Gap (&chi;&sup2;): {hovered.chiSquaredComponent.toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-zinc-400">
              Top in your text:{' '}
              {topObserved.length > 0 ? (
                <strong className="text-sky-300">
                  {topObserved
                    .map((f) => `${f.char} (${(f.observedFreq * 100).toFixed(1)}%)`)
                    .join(', ')}
                </strong>
              ) : (
                '—'
              )}
              <span className="mx-2 text-zinc-600">|</span>
              Normal top:{' '}
              <strong className="text-amber-300">
                {topExpected
                  .map((f) => `${f.char} (${(f.expectedFreq * 100).toFixed(1)}%)`)
                  .join(', ')}
              </strong>
            </span>
            <span className="text-zinc-500">Hover any letter bar for details</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c] p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[580px]">
          {[0, 0.05, 0.1, 0.15].map((tick) => {
            const y = padTop + plotH - (tick / maxFreq) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - 14}
                  y2={y}
                  stroke="rgba(63, 63, 70, 0.55)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-500 font-mono text-[10px]"
                >
                  {(tick * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          <line
            x1={padLeft}
            y1={yUniform}
            x2={width - 14}
            y2={yUniform}
            stroke="rgba(239, 68, 68, 0.7)"
            strokeWidth={1.2}
            strokeDasharray="5 4"
          />
          <text
            x={width - 18}
            y={yUniform - 4}
            textAnchor="end"
            className="fill-rose-400 font-mono text-[9px] font-bold"
          >
            1/26 (3.85%)
          </text>

          {frequencies.map((item, idx) => {
            const gx = padLeft + idx * groupW;
            const obsH = (item.observedFreq / maxFreq) * plotH;
            const expH = (item.expectedFreq / maxFreq) * plotH;
            const barW = Math.max(6, groupW * 0.36);
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.char}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <rect
                    x={gx + 1}
                    y={padTop}
                    width={groupW - 2}
                    height={plotH}
                    fill="rgba(212, 168, 83, 0.08)"
                    rx={2}
                  />
                )}
                <rect
                  x={gx + groupW * 0.12}
                  y={padTop + plotH - obsH}
                  width={barW}
                  height={Math.max(1, obsH)}
                  rx={1.5}
                  fill="#38bdf8"
                />
                <rect
                  x={gx + groupW * 0.12 + barW + 2}
                  y={padTop + plotH - expH}
                  width={barW}
                  height={Math.max(1, expH)}
                  rx={1.5}
                  fill="rgba(212, 168, 83, 0.8)"
                />
                <text
                  x={gx + groupW / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className={`font-mono text-[10px] font-bold ${
                    isHovered ? 'fill-amber-300' : 'fill-zinc-400'
                  }`}
                >
                  {item.char}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
};
