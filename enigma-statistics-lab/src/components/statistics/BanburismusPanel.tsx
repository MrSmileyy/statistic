import React, { useMemo, useState } from 'react';
import {
  DECIBAN_WEIGHTS,
  EXPECTED_IOC,
  normalizeAsciiLetters,
} from '../../core/constants';
import { EnigmaM3 } from '../../core/enigma';
import { computeBanburismusOffsets } from '../../core/statistics';
import type {
  EnigmaConfig,
  Language,
  StatisticalReport,
  TargetLanguage,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface BanburismusPanelProps {
  report: StatisticalReport;
  targetLanguage: TargetLanguage;
  language?: Language;
  enigmaConfig: EnigmaConfig;
}

const SAMPLE_PLAIN_A = normalizeAsciiLetters(
  'OBERKOMMANDODERWEHRMACHTGIBTBEKANNTWETTERVORHERSAGEBISKAYAUNDKANALSTURM'
);
const SAMPLE_PLAIN_B = normalizeAsciiLetters(
  'GEHEIMEKOMMANDOSACHEANALLESTELLENWETTERBERICHTFUERMORGENFRUEHKEINEAENDERUNG'
);
const TRUE_SHIFT_DEPTH = 5;

function formatOddsFactor(lr: number, decibans: number): string {
  if (!Number.isFinite(lr) || decibans >= 200) return '> 10^20 : 1';
  if (decibans <= -200 || lr < 1e-6) return '< 10^-6 : 1';
  if (lr >= 1000) return `${lr.toExponential(1)} : 1`;
  if (lr >= 1) return `${lr.toFixed(1)} : 1`;
  return `1 : ${(1 / Math.max(1e-12, lr)).toFixed(1)}`;
}

export const BanburismusPanel: React.FC<BanburismusPanelProps> = ({
  report,
  targetLanguage,
  enigmaConfig,
}) => {
  const [priorDenominator, setPriorDenominator] = useState<number>(17576);
  const [shiftOffset, setShiftOffset] = useState<number>(TRUE_SHIFT_DEPTH);

  const priorProb = 1 / Math.max(1, priorDenominator);
  const priorOdds = priorProb / Math.max(1e-12, 1 - priorProb);

  const clampedLogOdds = Math.max(-50, Math.min(50, report.totalDecibans / 10));
  const likelihoodRatio = Math.pow(10, clampedLogOdds);
  const posteriorOdds = priorOdds * likelihoodRatio;
  const posteriorProb = Number.isFinite(posteriorOdds)
    ? posteriorOdds / (1 + posteriorOdds)
    : 1;

  const letterContributions = useMemo(() => {
    const weights = DECIBAN_WEIGHTS[targetLanguage];
    return report.frequencies
      .map((item) => {
        const singleDeciban = weights[item.index];
        const totalDeciban = item.count * singleDeciban;
        return {
          char: item.char,
          count: item.count,
          singleDeciban,
          totalDeciban,
        };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => Math.abs(b.totalDeciban) - Math.abs(a.totalDeciban));
  }, [report.frequencies, targetLanguage]);

  // Fixed depth offset of TRUE_SHIFT_DEPTH (5 steps) between A and B so dragging the slider
  // visibly reveals the coincidence spike at +5 vs random noise at all other offsets.
  const banburismusData = useMemo(() => {
    const machineA = new EnigmaM3({
      ...enigmaConfig,
      rotorPositions: [0, 0, 0],
    });
    const machineB = machineA.clone();
    for (let s = 0; s < TRUE_SHIFT_DEPTH; s++) {
      machineB.step();
    }

    const cipherA = machineA.encryptText(SAMPLE_PLAIN_A).ciphertext;
    const cipherB = machineB.encryptText(SAMPLE_PLAIN_B).ciphertext;

    const offsetResults = computeBanburismusOffsets(
      cipherA,
      cipherB,
      targetLanguage,
      10
    );
    const current = offsetResults.find((r) => r.offset === shiftOffset);

    return {
      cipherA: cipherA.slice(0, 46),
      cipherB: cipherB.slice(0, 46),
      overlapIoC: current?.coincidenceRate ?? EXPECTED_IOC.RANDOM,
      matches: current?.coincidences ?? 0,
      minLen: current?.overlapLength ?? 0,
      sheetDecibans: current?.decibans ?? 0,
      zScore: current?.zScore ?? 0,
    };
  }, [enigmaConfig, shiftOffset, targetLanguage]);

  // Cumulative Deciban Trajectory (SPRT) SVG coordinates
  const sprtPlot = useMemo(() => {
    const pts = report.cumulativeDecibans;
    const w = 640;
    const h = 155;
    const padL = 44;
    const padR = 16;
    const padT = 14;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (pts.length === 0) {
      return { w, h, padL, padR, padT, padB, plotW, plotH, minY: -30, maxY: 30, poly: '', yZero: padT + plotH / 2, yPlus20: padT + plotH / 6, lastX: padL, lastY: padT + plotH / 2 };
    }

    const rawMin = Math.min(0, -10, ...pts);
    const rawMax = Math.max(25, ...pts);
    const span = Math.max(10, rawMax - rawMin);
    const minY = rawMin - span * 0.08;
    const maxY = rawMax + span * 0.08;

    const toY = (val: number) =>
      padT + plotH - ((val - minY) / Math.max(1e-6, maxY - minY)) * plotH;

    const poly = pts
      .map((val, idx) => {
        const x =
          pts.length === 1
            ? padL + plotW / 2
            : padL + (idx / (pts.length - 1)) * plotW;
        return `${x.toFixed(1)},${toY(val).toFixed(1)}`;
      })
      .join(' ');

    const lastVal = pts[pts.length - 1];
    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      minY,
      maxY,
      poly,
      yZero: toY(0),
      yPlus20: toY(20),
      lastX: pts.length === 1 ? padL + plotW / 2 : padL + plotW,
      lastY: toY(lastVal),
    };
  }, [report.cumulativeDecibans]);

  const previewLen = Math.min(46, banburismusData.cipherA.length);

  return (
    <div className="space-y-4">
      {/* Sequential Probability Ratio Test (SPRT) Trajectory */}
      <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="flex items-center font-mono text-xs font-bold text-zinc-200">
              <span>Cumulative Deciban Trajectory (Turing Sequential Evidence)</span>
              <InfoTooltip
                title="Sequential Probability Ratio Test (SPRT)"
                text="Tracks total evidence letter by letter. Each common letter (like E or N) pushes the line up; rare letters (like Q or X) nudge it down. Crossing +20 dB confirms natural language at 100:1 odds."
                align="left"
              />
            </h4>
            <p className="mt-0.5 text-xs text-zinc-500">
              Each character adds <span className="font-mono text-zinc-300">10 log₁₀(26 &middot; pᵢ)</span> dB. Plaintext trends upward past +20 dB; ciphertext drifts flat or negative.
            </p>
          </div>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-xs font-bold ${
              report.totalDecibans >= 20
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : report.totalDecibans > 0
                  ? 'border-amber-500/40 bg-amber-950/35 text-amber-300'
                  : 'border-rose-500/40 bg-rose-950/35 text-rose-300'
            }`}
          >
            Total: {report.totalDecibans >= 0 ? '+' : ''}
            {report.totalDecibans.toFixed(1)} dB
          </span>
        </div>

        {report.cumulativeDecibans.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-zinc-500">
            Enter sample text above to plot cumulative evidence.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-zinc-800 bg-[#0d0e12] p-2">
            <svg viewBox={`0 0 ${sprtPlot.w} ${sprtPlot.h}`} className="h-auto w-full min-w-[460px]">
              {/* +20 dB Confirmation Threshold */}
              <line
                x1={sprtPlot.padL}
                y1={sprtPlot.yPlus20}
                x2={sprtPlot.w - sprtPlot.padR}
                y2={sprtPlot.yPlus20}
                stroke="rgba(16, 185, 129, 0.55)"
                strokeDasharray="4 4"
              />
              <text
                x={sprtPlot.padL - 4}
                y={sprtPlot.yPlus20 + 3}
                textAnchor="end"
                className="fill-emerald-400 font-mono text-[9px]"
              >
                +20 dB
              </text>

              {/* 0 dB Neutral Line */}
              <line
                x1={sprtPlot.padL}
                y1={sprtPlot.yZero}
                x2={sprtPlot.w - sprtPlot.padR}
                y2={sprtPlot.yZero}
                stroke="rgba(161, 161, 170, 0.4)"
                strokeDasharray="2 3"
              />
              <text
                x={sprtPlot.padL - 4}
                y={sprtPlot.yZero + 3}
                textAnchor="end"
                className="fill-zinc-400 font-mono text-[9px]"
              >
                0 dB
              </text>

              <polyline
                fill="none"
                stroke={report.totalDecibans >= 20 ? '#10b981' : report.totalDecibans > 0 ? '#f59e0b' : '#38bdf8'}
                strokeWidth={2}
                points={sprtPlot.poly}
              />
              <circle
                cx={sprtPlot.lastX}
                cy={sprtPlot.lastY}
                r={3.5}
                fill={report.totalDecibans >= 20 ? '#34d399' : '#fbbf24'}
              />
              <text
                x={sprtPlot.padL}
                y={sprtPlot.h - 5}
                className="fill-zinc-500 font-mono text-[9px]"
              >
                Char 1
              </text>
              <text
                x={sprtPlot.w - sprtPlot.padR}
                y={sprtPlot.h - 5}
                textAnchor="end"
                className="fill-zinc-500 font-mono text-[9px]"
              >
                Char {report.cumulativeDecibans.length}
              </text>
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Bayesian Odds Update */}
        <div className="space-y-3 rounded border border-zinc-800 bg-[#08090c] p-3.5 font-mono text-xs lg:col-span-5">
          <div className="border-b border-zinc-800 pb-2">
            <div className="flex items-center font-bold text-zinc-200">
              <span>Bayes&rsquo; Theorem in Odds Form</span>
              <InfoTooltip
                title="Bayesian Odds Update"
                text="Updates how likely a candidate rotor setting is before vs. after seeing the decrypted text. Start with a prior guess (e.g., 1 in 17,576) and multiply by the evidence ratio 10^(W/10)."
                align="left"
              />
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              O(H₁|E) = O(H₁) &times; 10^(W / 10)
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center text-zinc-400">
              Prior P(H₁):
              <InfoTooltip
                title="Prior Probability"
                text="Your starting probability before checking any letters—for example, 1 out of 17,576 equally likely rotor window positions."
                align="left"
              />
            </span>
            <select
              value={priorDenominator}
              onChange={(e) => setPriorDenominator(Number(e.target.value))}
              className="rounded border border-zinc-700 bg-[#0d0e12] px-2 py-1 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
            >
              <option value={26}>1 / 26 (1 rotor)</option>
              <option value={676}>1 / 676 (2 rotors)</option>
              <option value={17576}>1 / 17,576 (3 rotors)</option>
              <option value={1054560}>1 / 1,054,560 (60 orders &times; 26&sup3;)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
              <div className="inline-flex items-center text-[10px] text-zinc-500">
                Prior P(H₁)
                <InfoTooltip
                  title="Prior Percentage"
                  text="Baseline probability of picking the right key by pure luck before inspecting letter counts."
                  align="left"
                />
              </div>
              <div className="mt-0.5 font-bold text-zinc-200">
                {(priorProb * 100).toFixed(4)}%
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
              <div className="inline-flex items-center text-[10px] text-zinc-500">
                Likelihood Ratio
                <InfoTooltip
                  title="Likelihood Ratio 10^(W/10)"
                  text="How many times more probable this text is under real language than under uniform random letters."
                />
              </div>
              <div className="mt-0.5 font-bold text-sky-300">
                {formatOddsFactor(likelihoodRatio, report.totalDecibans)}
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
              <div className="inline-flex items-center text-[10px] text-zinc-500">
                Evidence W
                <InfoTooltip
                  title="Total Deciban Evidence"
                  text="Sum of log-likelihood scores across all letters in the sample. Positive dB supports real language; negative dB supports random noise."
                  align="left"
                />
              </div>
              <div className="mt-0.5 font-bold text-amber-300">
                {report.totalDecibans >= 0 ? '+' : ''}
                {report.totalDecibans.toFixed(1)} dB
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
              <div className="inline-flex items-center text-[10px] text-zinc-500">
                Posterior P(H₁|E)
                <InfoTooltip
                  title="Posterior Probability"
                  text="Updated probability that this text came from real plaintext after factoring in the Deciban score."
                />
              </div>
              <div
                className={`mt-0.5 font-bold ${
                  posteriorProb > 0.5 ? 'text-emerald-400' : 'text-zinc-200'
                }`}
              >
                {(posteriorProb * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 inline-flex items-center text-[11px] text-zinc-400">
              Top Letter Weights (dB)
              <InfoTooltip
                title="Per-Letter Deciban Contribution"
                text="Each letter adds or subtracts Decibans depending on whether it occurs more or less often than 1/26 (3.85%) in the reference language."
                align="left"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {letterContributions.slice(0, 8).map((item) => (
                <span
                  key={item.char}
                  className={`rounded border px-2 py-0.5 text-[11px] ${
                    item.totalDeciban >= 0
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                  }`}
                >
                  <strong>{item.char}</strong> ({item.count}):{' '}
                  {item.totalDeciban > 0 ? '+' : ''}
                  {item.totalDeciban.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Banburismus Two-Ciphertext Shift Alignment */}
        <div className="space-y-3 rounded border border-zinc-800 bg-[#08090c] p-3.5 font-mono text-xs lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div>
              <div className="inline-flex items-center font-bold text-zinc-200">
                Banburismus Two-Message Depth Alignment
                <InfoTooltip
                  title="Banburismus Depth Overlap"
                  text="When two Enigma messages share the same daily key and overlap in rotor steps, the exact same permutation hits the same column. Matching plain letters therefore produce identical ciphertext letters (~7% vs 3.85% random)."
                  align="right"
                />
              </div>
              <div className="mt-0.5 font-sans text-xs text-zinc-500">
                Message B was encrypted 5 rotor steps ahead of Message A. Slide B to offset <strong className="font-mono text-emerald-300">+5</strong> to see vertical coincidences jump above 1/26.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Shift B:</span>
              <input
                type="range"
                min={0}
                max={10}
                value={shiftOffset}
                onChange={(e) => setShiftOffset(Number(e.target.value))}
                aria-label="Banburismus shift offset"
                className="h-1.5 w-24 cursor-pointer accent-amber-500"
              />
              <span className="font-bold text-amber-300">+{shiftOffset}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-800 bg-[#0d0e12] p-2.5">
            <div className="inline-flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-0.5">
                <span className="w-7 shrink-0 text-zinc-500">A:</span>
                {banburismusData.cipherA.slice(0, previewLen).split('').map((ch, i) => {
                  const bIdx = i - shiftOffset;
                  const match = bIdx >= 0 && bIdx < banburismusData.cipherB.length && banburismusData.cipherB[bIdx] === ch;
                  return (
                    <span
                      key={i}
                      className={`inline-flex h-5 w-4 items-center justify-center rounded-sm ${
                        match
                          ? 'bg-emerald-500/25 font-bold text-emerald-300'
                          : 'text-zinc-400'
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-0.5">
                <span className="w-7 shrink-0 text-zinc-500">B:</span>
                {Array.from({ length: shiftOffset }).map((_, s) => (
                  <span key={`pad-${s}`} className="inline-flex h-5 w-4 items-center justify-center text-zinc-700">
                    &middot;
                  </span>
                ))}
                {banburismusData.cipherB.slice(0, Math.max(0, previewLen - shiftOffset)).split('').map((ch, j) => {
                  const aIdx = j + shiftOffset;
                  const match = aIdx < banburismusData.cipherA.length && banburismusData.cipherA[aIdx] === ch;
                  return (
                    <span
                      key={j}
                      className={`inline-flex h-5 w-4 items-center justify-center rounded-sm ${
                        match
                          ? 'bg-emerald-500/25 font-bold text-emerald-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
            <span>
              Vertical coincidences:{' '}
              <strong className="text-zinc-100">
                {banburismusData.matches}/{banburismusData.minLen}
              </strong>{' '}
              (rate {(banburismusData.overlapIoC * 100).toFixed(2)}% vs 3.85% random)
            </span>
            <span>
              Overlap evidence:{' '}
              <strong
                className={
                  banburismusData.sheetDecibans > 0 ? 'text-emerald-400' : 'text-zinc-300'
                }
              >
                {banburismusData.sheetDecibans >= 0 ? '+' : ''}
                {banburismusData.sheetDecibans.toFixed(1)} dB
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
