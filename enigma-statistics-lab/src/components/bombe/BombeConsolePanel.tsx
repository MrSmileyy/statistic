import React, { useMemo, useState } from 'react';
import { inspectBombeHypotheses } from '../../core/bombe';
import {
  ALPHABET,
  formatPositionLabel,
  REFLECTOR_IDS,
  ROTOR_IDS,
} from '../../core/constants';
import { useCryptoWorker } from '../../hooks/useCryptoWorker';
import type {
  BombeMenu,
  BombeStop,
  EnigmaConfig,
  Language,
  PlugPair,
  ReflectorId,
  RotorId,
  TargetLanguage,
  WorkerResponse,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface BombeConsolePanelProps {
  ciphertext: string;
  menu: BombeMenu;
  enigmaConfig: EnigmaConfig;
  targetLanguage: TargetLanguage;
  language?: Language;
  onConfigChange: (next: EnigmaConfig) => void;
  onApplyStopToEnigma: (
    positions: [number, number, number],
    plugboard: PlugPair[]
  ) => void;
}

export const BombeConsolePanel: React.FC<BombeConsolePanelProps> = ({
  ciphertext,
  menu,
  enigmaConfig,
  targetLanguage,
  onConfigChange,
  onApplyStopToEnigma,
}) => {
  const [stops, setStops] = useState<BombeStop[]>([]);
  const [inspectedPos, setInspectedPos] = useState<[number, number, number]>(
    enigmaConfig.rotorPositions
  );
  const [selectedHypothesisIdx, setSelectedHypothesisIdx] = useState<number>(0);
  const [showDiagonalDrawer, setShowDiagonalDrawer] = useState<boolean>(false);

  const worker = useCryptoWorker((resp: WorkerResponse) => {
    if (resp.type === 'BOMBE_COMPLETE' && resp.stops) {
      setStops(resp.stops);
      if (resp.stops.length > 0) {
        setInspectedPos(resp.stops[0].positions);
        const firstHyp = resp.stops[0].consistentHypotheses[0];
        if (firstHyp) {
          setSelectedHypothesisIdx(firstHyp.charCodeAt(0) - 65);
        }
      }
    }
  });

  const handleRunBombe = () => {
    if (!menu.isValidAlignment || menu.edges.length === 0) return;
    worker.startJob((requestId) => ({
      type: 'BOMBE_SWEEP',
      requestId,
      ciphertext,
      crib: menu.crib,
      offset: menu.offset,
      rotors: enigmaConfig.rotors,
      reflector: enigmaConfig.reflector,
      ringSettings: enigmaConfig.ringSettings,
      targetLanguage,
      maxStops: 25,
    }));
  };

  const hypothesisTraces = useMemo(() => {
    if (!menu.isValidAlignment || menu.edges.length === 0) return [];
    return inspectBombeHypotheses(
      menu,
      enigmaConfig.rotors,
      enigmaConfig.reflector,
      enigmaConfig.ringSettings,
      inspectedPos
    );
  }, [menu, enigmaConfig.rotors, enigmaConfig.reflector, enigmaConfig.ringSettings, inspectedPos]);

  const activeHypothesis = hypothesisTraces[selectedHypothesisIdx] ?? null;
  const progressPct = Math.round((worker.tested / worker.total) * 100);
  const topStop = stops[0] ?? null;

  const handleWheelChange = (slot: 0 | 1 | 2, rotorId: RotorId) => {
    const next: [RotorId, RotorId, RotorId] = [...enigmaConfig.rotors] as [
      RotorId,
      RotorId,
      RotorId,
    ];
    next[slot] = rotorId;
    onConfigChange({ ...enigmaConfig, rotors: next });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2.5">
          <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
            <span>Bombe Rotor Sweep (17,576 positions)</span>
            <InfoTooltip
              title="Full Turing-Welchman Bombe Sweep"
              text="Scans all 17,576 rotor start positions (AAA–ZZZ) on the Diagonal Board in a background Web Worker. Any position where at least one stecker hypothesis avoids contradictions is recorded as a Stop."
              align="left"
            />
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1">
              <span className="font-mono text-xs text-zinc-400">Rotors:</span>
              {([0, 1, 2] as const).map((slot) => (
                <select
                  key={slot}
                  value={enigmaConfig.rotors[slot]}
                  aria-label={`Bombe rotor slot ${slot + 1}`}
                  onChange={(e) => handleWheelChange(slot, e.target.value as RotorId)}
                  className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300"
                >
                  {ROTOR_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              ))}

              <span className="ml-1 font-mono text-xs text-zinc-400">UKW:</span>
              <select
                value={enigmaConfig.reflector}
                aria-label="Bombe reflector"
                onChange={(e) =>
                  onConfigChange({
                    ...enigmaConfig,
                    reflector: e.target.value as ReflectorId,
                  })
                }
                className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs font-bold text-zinc-200"
              >
                {REFLECTOR_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {!worker.running ? (
              <button
                type="button"
                disabled={!menu.isValidAlignment || menu.edges.length === 0}
                onClick={handleRunBombe}
                className="rounded border border-amber-500/50 bg-amber-500 px-3.5 py-1.5 font-mono text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Run Bombe Sweep
              </button>
            ) : (
              <button
                type="button"
                onClick={worker.cancelJob}
                className="rounded border border-rose-500/60 bg-rose-950/60 px-3.5 py-1.5 font-mono text-xs font-semibold text-rose-200"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {(worker.running || worker.tested > 0) && (
          <div className="mb-3 rounded border border-zinc-800 bg-[#08090c] p-2.5">
            <div className="mb-1 flex justify-between font-mono text-xs text-zinc-400">
              <span>
                {worker.tested.toLocaleString()} / {worker.total.toLocaleString()} tested
              </span>
              <span>
                {progressPct}% ({worker.elapsedMs.toFixed(0)} ms)
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-zinc-900">
              <div
                style={{ width: `${progressPct}%` }}
                className="h-full bg-amber-500 transition-all duration-150"
              />
            </div>
          </div>
        )}

        {worker.error && (
          <div className="mb-3 rounded border border-rose-500/50 bg-rose-950/30 px-3 py-2 font-mono text-xs text-rose-300">
            {worker.error}
          </div>
        )}

        {topStop && (
          <div className="mb-3 rounded border border-zinc-700 bg-[#08090c] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-zinc-300">
                <span>
                  Top Stop: <strong className="text-amber-300">{topStop.positionLabel}</strong>
                </span>
                <span>
                  Plugboard:{' '}
                  <strong className="text-emerald-300">
                    {topStop.deducedPlugboard.length > 0
                      ? topStop.deducedPlugboard.map(([a, b]) => `${a}${b}`).join(' ')
                      : 'none'}
                  </strong>
                </span>
                <span>
                  Decibans:{' '}
                  <strong className="text-zinc-100">
                    {topStop.decibans >= 0 ? '+' : ''}
                    {topStop.decibans.toFixed(1)} dB
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onApplyStopToEnigma(topStop.positions, topStop.deducedPlugboard)
                }
                className="rounded border border-amber-500/50 bg-amber-500/15 px-3 py-1 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
              >
                Apply Key to Enigma
              </button>
            </div>

            <div className="mt-2 overflow-x-auto rounded border border-zinc-800 bg-[#0d0e12] px-3 py-2 font-mono text-xs tracking-wider text-zinc-200">
              {topStop.decryptedPreview}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 inline-flex items-center font-mono text-xs text-zinc-400">
            Candidate Stops ({stops.length})
            <InfoTooltip
              title="Bombe Stops"
              text="Surviving rotor positions sorted by Deciban likelihood. Click '26×26 Board' to inspect the Diagonal Board proof or 'Apply' to set that key on the Enigma machine."
              align="left"
            />
          </div>
          {stops.length === 0 ? (
            <div className="rounded border border-zinc-800 bg-[#08090c] p-4 text-center font-mono text-xs text-zinc-500">
              Click &ldquo;Run Bombe Sweep&rdquo; to test all 17,576 rotor positions.
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c]">
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Deduced Plugboard</th>
                    <th>IoC</th>
                    <th>Decibans</th>
                    <th>Decrypted Preview</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop, idx) => (
                    <tr
                      key={stop.positionLabel}
                      className={idx === 0 ? 'bg-zinc-900/50' : ''}
                    >
                      <td className="font-bold text-amber-300">
                        {stop.positionLabel}
                      </td>
                      <td className="max-w-[180px] truncate font-bold text-emerald-300">
                        {stop.deducedPlugboard.map(([a, b]) => `${a}${b}`).join(' ') || '-'}
                      </td>
                      <td>{stop.ioc.toFixed(4)}</td>
                      <td
                        className={
                          stop.decibans >= 15 ? 'font-bold text-emerald-400' : 'text-zinc-400'
                        }
                      >
                        {stop.decibans >= 0 ? '+' : ''}
                        {stop.decibans.toFixed(1)}
                      </td>
                      <td className="max-w-[240px] truncate">
                        {stop.decryptedPreview}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedPos(stop.positions);
                              const firstH = stop.consistentHypotheses[0];
                              if (firstH) {
                                setSelectedHypothesisIdx(firstH.charCodeAt(0) - 65);
                              }
                              setShowDiagonalDrawer(true);
                            }}
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-500"
                          >
                            26&times;26 Board
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onApplyStopToEnigma(stop.positions, stop.deducedPlugboard)
                            }
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-amber-300 hover:border-amber-500/60"
                          >
                            Apply
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {hypothesisTraces.length > 0 && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDiagonalDrawer((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs text-zinc-300 hover:bg-zinc-900/50"
          >
            <span className="inline-flex items-center font-bold">
              26&times;26 Welchman Diagonal Board [{formatPositionLabel(inspectedPos)}]
              <InfoTooltip
                title="Welchman's Diagonal Board"
                text="A 26×26 electrical symmetry grid enforcing S(u) = v ⇔ S(v) = u. If any row lights up 2+ green/red squares (multiple conflicting wires), that hypothesis is physically impossible."
                align="left"
              />
            </span>
            <span className="text-zinc-500">
              {showDiagonalDrawer ? 'Hide' : 'Show'}
            </span>
          </button>

          {showDiagonalDrawer && (
            <div className="border-t border-zinc-800 p-4">
              <div className="mb-3 grid grid-cols-7 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {hypothesisTraces.map((tr) => {
                  const selected = tr.assumedPartnerIdx === selectedHypothesisIdx;
                  return (
                    <button
                      key={tr.assumedPartner}
                      type="button"
                      onClick={() => setSelectedHypothesisIdx(tr.assumedPartnerIdx)}
                      className={`rounded border py-1 font-mono text-xs font-bold transition ${
                        selected ? 'ring-1 ring-amber-400 ' : ''
                      }${
                        tr.consistent
                          ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                          : 'border-zinc-800 bg-[#08090c] text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {menu.testRegister}-{tr.assumedPartner}
                    </button>
                  );
                })}
              </div>

              {activeHypothesis && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c] p-3 lg:col-span-8">
                    <div className="inline-block min-w-[440px]">
                      <div className="mb-1 flex pl-5 font-mono text-[9px] text-zinc-500">
                        {ALPHABET.split('').map((colChar) => (
                          <span key={colChar} className="w-4 text-center">
                            {colChar}
                          </span>
                        ))}
                      </div>
                      {ALPHABET.split('').map((rowChar, rowIdx) => {
                        const mask = activeHypothesis.boardMask[rowIdx] ?? 0;
                        const rowConflict = mask !== 0 && (mask & (mask - 1)) !== 0;
                        return (
                          <div key={rowChar} className="flex items-center">
                            <span
                              className={`w-5 font-mono text-[9px] font-bold ${
                                rowConflict ? 'text-rose-400' : 'text-zinc-500'
                              }`}
                            >
                              {rowChar}
                            </span>
                            {ALPHABET.split('').map((_, colIdx) => {
                              const active = (mask & (1 << colIdx)) !== 0;
                              return (
                                <div
                                  key={colIdx}
                                  className={`m-[1px] h-3.5 w-3.5 rounded-[1px] border ${
                                    active
                                      ? rowConflict
                                        ? 'border-rose-400 bg-rose-500/80'
                                        : 'border-emerald-300 bg-emerald-400'
                                      : 'border-zinc-800/80 bg-zinc-900/50'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 rounded border border-zinc-800 bg-[#08090c] p-3.5 font-mono text-xs lg:col-span-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-bold text-zinc-100">
                        Hypothesis {menu.testRegister}-{activeHypothesis.assumedPartner}
                      </span>
                      <span
                        className={
                          activeHypothesis.consistent
                            ? 'font-bold text-emerald-400'
                            : 'font-bold text-rose-400'
                        }
                      >
                        {activeHypothesis.consistent ? 'Consistent' : 'Contradiction'}
                      </span>
                    </div>

                    <div className="text-zinc-400">
                      Energized contacts: <strong className="text-zinc-200">{activeHypothesis.propagatedSteps}</strong>
                    </div>

                    {!activeHypothesis.consistent ? (
                      <div>
                        <span className="text-[11px] text-rose-400">
                          Conflicting registers ({activeHypothesis.contradictedNodes.length}):
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs text-rose-200">
                          {activeHypothesis.contradictedNodes.map((n) => (
                            <span
                              key={n}
                              className="rounded border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[11px] text-emerald-400">
                          Deduced stecker pairs:
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                          {activeHypothesis.deducedPairs.length > 0 ? (
                            activeHypothesis.deducedPairs.map(([a, b]) => (
                              <span
                                key={`${a}${b}`}
                                className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 font-bold text-emerald-200"
                              >
                                {a}{b}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500">None</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
