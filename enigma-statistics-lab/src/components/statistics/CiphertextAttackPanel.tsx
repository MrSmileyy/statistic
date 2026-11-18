import React, { useState } from 'react';
import { normalizeAsciiLetters } from '../../core/constants';
import { useCryptoWorker } from '../../hooks/useCryptoWorker';
import type {
  EnigmaConfig,
  Language,
  StatisticalCandidate,
  StatisticalRankMetric,
  TargetLanguage,
  WorkerResponse,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface CiphertextAttackPanelProps {
  ciphertext: string;
  enigmaConfig: EnigmaConfig;
  targetLanguage: TargetLanguage;
  language?: Language;
  onLoadUnsteckeredDemo?: () => void;
  onApplyCandidate: (positions: [number, number, number]) => void;
}

export const CiphertextAttackPanel: React.FC<CiphertextAttackPanelProps> = ({
  ciphertext,
  enigmaConfig,
  targetLanguage,
  onLoadUnsteckeredDemo,
  onApplyCandidate,
}) => {
  const [rankBy, setRankBy] = useState<StatisticalRankMetric>('IOC');
  const [candidates, setCandidates] = useState<StatisticalCandidate[]>([]);

  const worker = useCryptoWorker((resp: WorkerResponse) => {
    if (resp.type === 'ATTACK_COMPLETE') {
      setCandidates(resp.candidates);
    }
  });

  const cleanCipher = normalizeAsciiLetters(ciphertext);

  const handleRunScan = () => {
    if (cleanCipher.length < 10) return;
    setCandidates([]);
    worker.startJob((requestId) => ({
      type: 'CIPHERTEXT_ATTACK',
      requestId,
      ciphertext: cleanCipher,
      rotors: enigmaConfig.rotors,
      reflector: enigmaConfig.reflector,
      ringSettings: enigmaConfig.ringSettings,
      plugboard: enigmaConfig.plugboard,
      targetLanguage,
      rankBy,
      topK: 25,
    }));
  };

  const progressPct = Math.min(100, Math.round((worker.tested / worker.total) * 100));
  const bestCandidate = candidates[0] ?? null;
  const maxPeakZ = Math.max(8, ...candidates.slice(0, 15).map((c) => c.zScore));

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2.5">
        <div>
          <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
            <span>Exhaustive Rotor Position Sweep (26&sup3; = 17,576 states)</span>
            <InfoTooltip
              title="Ciphertext-Only Rotor Sweep"
              text="Tests every possible 3-letter window setting (AAA through ZZZ) in a background Web Worker, decrypts your ciphertext, and scores each output statistically to surface the real rotor key."
              align="left"
            />
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Decrypts the text across every window AAA&ndash;ZZZ using active rotors{' '}
            <span className="font-mono text-zinc-300">{enigmaConfig.rotors.join('-')}</span> and reflector{' '}
            <span className="font-mono text-zinc-300">{enigmaConfig.reflector}</span>, ranking keys by natural-language statistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center font-mono text-xs text-zinc-400">
            Rank by
            <InfoTooltip
              title="Ranking Statistic"
              text="IoC is immune to fixed plugboard cables; Decibans and Chi-Square are sharpest when plugboard cables are known or absent."
            />
            :
          </label>
          <select
            value={rankBy}
            onChange={(e) => setRankBy(e.target.value as StatisticalRankMetric)}
            disabled={worker.running}
            className="rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1 font-mono text-xs font-semibold text-amber-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="IOC" className="bg-zinc-900">
              Index of Coincidence (IoC)
            </option>
            <option value="DECIBANS" className="bg-zinc-900">
              Deciban Weight
            </option>
            <option value="CHI_SQUARED" className="bg-zinc-900">
              Chi-Square (&chi;&sup2;)
            </option>
          </select>

          {worker.running ? (
            <button
              type="button"
              onClick={worker.cancelJob}
              className="rounded border border-rose-500/50 bg-rose-950/60 px-3.5 py-1.5 font-mono text-xs font-semibold text-rose-200 hover:bg-rose-950"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunScan}
              disabled={cleanCipher.length < 10}
              className="rounded border border-amber-500/50 bg-amber-500 px-3.5 py-1.5 font-mono text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run 17,576-Position Sweep
            </button>
          )}
        </div>
      </div>

      {enigmaConfig.plugboard.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-500/30 bg-[#08090c] px-3 py-2 font-mono text-xs text-zinc-300">
          <span>
            Plugboard has {enigmaConfig.plugboard.length} active pairs. Direct ciphertext-only sweeps assume zero or already recovered stecker cables.
          </span>
          {onLoadUnsteckeredDemo && (
            <button
              type="button"
              onClick={onLoadUnsteckeredDemo}
              className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[11px] text-amber-300 hover:border-amber-500/50"
            >
              Load unsteckered demo
            </button>
          )}
        </div>
      )}

      {worker.error && (
        <div className="mb-3 rounded border border-rose-500/50 bg-rose-950/30 px-3 py-2 font-mono text-xs text-rose-300">
          {worker.error}
        </div>
      )}

      {(worker.running || worker.tested > 0) && (
        <div className="mb-3 rounded border border-zinc-800 bg-[#08090c] p-2.5">
          <div className="mb-1 flex items-center justify-between font-mono text-xs text-zinc-400">
            <span>
              Tested: <strong className="text-zinc-200">{worker.tested.toLocaleString()}</strong> /{' '}
              {worker.total.toLocaleString()} ({progressPct}%)
            </span>
            {worker.elapsedMs > 0 && (
              <span>{(worker.elapsedMs / 1000).toFixed(2)} s</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-zinc-900">
            <div
              className="h-full bg-amber-500 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {bestCandidate && !worker.running && (
        <div className="mb-3 rounded border border-zinc-700 bg-[#08090c] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-zinc-300">
              <span>
                Top Candidate: <strong className="text-amber-300">{bestCandidate.positionLabel}</strong>
              </span>
              <span>
                IoC: <strong className="text-emerald-400">{bestCandidate.ioc.toFixed(4)}</strong>
              </span>
              <span>
                Z: <strong className="text-zinc-100">{bestCandidate.zScore >= 0 ? '+' : ''}{bestCandidate.zScore.toFixed(2)}&sigma;</strong>
              </span>
              <span>
                Decibans: <strong className="text-zinc-100">{bestCandidate.decibans >= 0 ? '+' : ''}{bestCandidate.decibans.toFixed(1)} dB</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onApplyCandidate(bestCandidate.positions)}
              className="rounded border border-amber-500/50 bg-amber-500/15 px-3 py-1 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
            >
              Apply Key to Enigma
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-800 bg-[#0d0e12] px-3 py-2 font-mono text-xs tracking-wider text-zinc-200">
            {bestCandidate.decryptedPreview}
          </div>
        </div>
      )}

      {candidates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Top-15 Peaks Comparison SVG */}
          <div className="rounded border border-zinc-800 bg-[#08090c] p-3 lg:col-span-5">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-zinc-400">
              <span className="inline-flex items-center">
                TOP 15 PEAKS (Z-SCORE)
                <InfoTooltip
                  title="Peak Separation Chart"
                  text="Shows the top 15 candidate keys side by side. The true key (green bar) typically spikes well above the 3.0σ threshold while wrong rotor positions stay near random noise."
                  align="left"
                />
              </span>
              <span className="text-zinc-500">3.0&sigma; threshold</span>
            </div>
            <svg viewBox="0 0 320 185" className="h-auto w-full">
              <line x1={30} y1={145} x2={308} y2={145} stroke="#27272a" strokeWidth={1} />
              {(() => {
                const threshY = 145 - Math.min(125, (3.0 / maxPeakZ) * 125);
                return (
                  <g>
                    <line
                      x1={30}
                      y1={threshY}
                      x2={308}
                      y2={threshY}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <text x={34} y={threshY - 4} fill="#f59e0b" fontSize="8" className="font-mono">
                      3.0&sigma;
                    </text>
                  </g>
                );
              })()}

              {candidates.slice(0, 15).map((cand, idx) => {
                const x = 42 + idx * 17.5;
                const barH = Math.max(3, Math.min(125, (Math.max(0, cand.zScore) / maxPeakZ) * 125));
                const y = 145 - barH;
                const isFirst = idx === 0;

                return (
                  <g key={cand.positionLabel}>
                    <rect
                      x={x - 5}
                      y={y}
                      width={10}
                      height={barH}
                      rx={1}
                      fill={isFirst ? '#10b981' : '#d4a853'}
                      fillOpacity={isFirst ? 0.9 : 0.45}
                    />
                    <text
                      x={x}
                      y={162}
                      textAnchor="middle"
                      fill={isFirst ? '#34d399' : '#71717a'}
                      fontSize="7"
                      className="font-mono"
                    >
                      {cand.positionLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Ranked Candidates Table */}
          <div className="max-h-64 overflow-y-auto rounded border border-zinc-800 bg-[#08090c] lg:col-span-7">
            <table className="hw-table">
              <thead className="sticky top-0">
                <tr>
                  <th>
                    <span className="inline-flex items-center">
                      Pos
                      <InfoTooltip title="Window Position" text="3-letter rotor window (Left-Middle-Right) tested." align="left" />
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center">
                      IoC
                      <InfoTooltip title="Index of Coincidence" text="Higher IoC (~0.067–0.076) indicates natural language." />
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center">
                      Z-Score
                      <InfoTooltip title="Z-Score" text="Standard deviations above uniform noise (> 3.0σ is significant)." />
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center">
                      &chi;&sup2;
                      <InfoTooltip title="Chi-Square" text="Distance from reference language frequencies (lower = better match)." />
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center">
                      Decibans
                      <InfoTooltip title="Deciban Score" text="Log-odds evidence for natural plaintext (+20 dB = 100:1 odds)." />
                    </span>
                  </th>
                  <th>Preview</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand, index) => (
                  <tr
                    key={cand.positionLabel}
                    className={index === 0 ? 'bg-zinc-900/50' : ''}
                  >
                    <td className="font-bold text-amber-300">
                      {cand.positionLabel}
                    </td>
                    <td className="font-bold text-emerald-400">
                      {cand.ioc.toFixed(4)}
                    </td>
                    <td>
                      {cand.zScore >= 0 ? '+' : ''}
                      {cand.zScore.toFixed(2)}
                    </td>
                    <td>{cand.chiSquared.toFixed(1)}</td>
                    <td>
                      {cand.decibans >= 0 ? '+' : ''}
                      {cand.decibans.toFixed(1)}
                    </td>
                    <td
                      className="max-w-[180px] truncate"
                      title={cand.decryptedPreview}
                    >
                      {cand.decryptedPreview}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => onApplyCandidate(cand.positions)}
                        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-amber-300 hover:border-amber-500/60"
                      >
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded border border-zinc-800 bg-[#08090c] py-5 text-center font-mono text-xs text-zinc-500">
          {cleanCipher.length < 10
            ? 'Enter at least 10 ciphertext characters to run the rotor sweep.'
            : 'Click "Run 17,576-Position Sweep" to evaluate all rotor start positions.'}
        </div>
      )}
    </div>
  );
};
