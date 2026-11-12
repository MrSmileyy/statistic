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

interface BombeConsolePanelProps {
  ciphertext: string;
  menu: BombeMenu;
  enigmaConfig: EnigmaConfig;
  targetLanguage: TargetLanguage;
  language: Language;
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
  language,
  onConfigChange,
  onApplyStopToEnigma,
}) => {
  const isIt = language === 'it';
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
      <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4 shadow-panel sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100">
              {isIt
                ? 'Fase 3 - Scansione delle 17.576 posizioni dei rotori'
                : 'Phase 3 - 17,576 Rotor Position Scan'}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isIt
                ? 'Verifica tutte le combinazioni da AAA a ZZZ e conserva solo quelle prive di contraddizioni.'
                : 'Tests every combination from AAA to ZZZ and keeps only contradiction-free rotor positions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1.5">
              <span className="font-mono text-[11px] uppercase text-zinc-400">
                {isIt ? 'Rotori:' : 'Rotors:'}
              </span>
              {([0, 1, 2] as const).map((slot) => (
                <select
                  key={slot}
                  value={enigmaConfig.rotors[slot]}
                  aria-label={`Bombe rotor slot ${slot + 1}`}
                  onChange={(e) => handleWheelChange(slot, e.target.value as RotorId)}
                  className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs font-bold text-bletchley-brass-bright"
                >
                  {ROTOR_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              ))}

              <span className="ml-1 font-mono text-[11px] uppercase text-zinc-400">
                UKW:
              </span>
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
                className="rounded border border-bletchley-brass bg-bletchley-brass px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-bletchley-brass-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isIt ? 'Avvia scansione' : 'Start scan'}
              </button>
            ) : (
              <button
                type="button"
                onClick={worker.cancelJob}
                className="rounded border border-rose-500/60 bg-rose-950/60 px-4 py-1.5 font-mono text-xs font-bold uppercase text-rose-200"
              >
                {isIt ? 'Interrompi' : 'Stop'}
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {(worker.running || worker.tested > 0) && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between font-mono text-xs text-zinc-400">
              <span>
                {worker.tested.toLocaleString()} / {worker.total.toLocaleString()}{' '}
                {isIt ? 'posizioni verificate' : 'positions tested'}
              </span>
              <span>
                {progressPct}% ({worker.elapsedMs.toFixed(0)} ms)
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-[#08090c]">
              <div
                style={{ width: `${progressPct}%` }}
                className="h-full bg-bletchley-brass transition-all duration-150"
              />
            </div>
          </div>
        )}

        {worker.error && (
          <div className="mb-3 rounded border border-rose-500/50 bg-rose-950/30 px-3 py-2 font-mono text-xs text-rose-300">
            {worker.error}
          </div>
        )}

        {/* Primary Candidate Readout on Telegraph Paper Strip */}
        {topStop && (
          <div className="mb-4 rounded border border-zinc-700 bg-[#08090c] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
                <div>
                  <span className="text-zinc-500">
                    {isIt ? 'POSIZIONE ROTORI: ' : 'ROTOR POSITION: '}
                  </span>
                  <strong className="text-base text-bletchley-brass-bright">
                    {topStop.positionLabel.split('').join(' - ')}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">
                    {isIt ? 'CAVI INDIVIDUATI: ' : 'PLUGBOARD: '}
                  </span>
                  <strong className="text-emerald-300">
                    {topStop.deducedPlugboard.length > 0
                      ? topStop.deducedPlugboard.map(([a, b]) => `${a}${b}`).join('  ')
                      : isIt
                        ? 'nessuno'
                        : 'none'}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">DECIBAN: </span>
                  <strong className="text-zinc-200">
                    {topStop.decibans >= 0 ? '+' : ''}
                    {topStop.decibans.toFixed(1)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onApplyStopToEnigma(topStop.positions, topStop.deducedPlugboard)
                }
                className="rounded border border-bletchley-brass bg-bletchley-brass px-3.5 py-1.5 font-mono text-xs font-bold uppercase text-zinc-950 transition hover:bg-bletchley-brass-bright"
              >
                {isIt ? 'Imposta chiave su Enigma' : 'Apply key to Enigma'}
              </button>
            </div>

            <div className="mt-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {isIt ? 'Uscita decifrata su nastro' : 'Decrypted tape output'}
              </div>
              <div className="paper-tape overflow-x-auto rounded border border-[#c7b998] px-3 py-2 font-mono text-xs font-bold tracking-widest text-zinc-900">
                {topStop.decryptedPreview}
              </div>
            </div>
          </div>
        )}

        {/* Candidate Stops Table */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {isIt
              ? `Posizioni compatibili trovate (${stops.length})`
              : `Compatible positions found (${stops.length})`}
          </div>
          {stops.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 bg-[#08090c] p-4 text-center font-mono text-xs text-zinc-500">
              {isIt
                ? 'Premi "Avvia scansione" per eseguire il controllo sulle 17.576 posizioni.'
                : 'Press "Start scan" to test all 17,576 rotor positions.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c]">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/70 text-[11px] uppercase text-zinc-400">
                    <th className="px-3 py-2">{isIt ? 'Posizione' : 'Position'}</th>
                    <th className="px-3 py-2">{isIt ? 'Cavi dedotti' : 'Cables'}</th>
                    <th className="px-3 py-2">IoC</th>
                    <th className="px-3 py-2">Deciban</th>
                    <th className="px-3 py-2">{isIt ? 'Testo decifrato' : 'Decrypted text'}</th>
                    <th className="px-3 py-2 text-right">{isIt ? 'Azioni' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop) => (
                    <tr
                      key={stop.positionLabel}
                      className="border-b border-zinc-800/60 hover:bg-zinc-900/50"
                    >
                      <td className="px-3 py-2 font-bold text-bletchley-brass-bright">
                        {stop.positionLabel}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-emerald-300">
                        {stop.deducedPlugboard.map(([a, b]) => `${a}${b}`).join(' ') || '-'}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{stop.ioc.toFixed(4)}</td>
                      <td
                        className={`px-3 py-2 font-semibold ${
                          stop.decibans >= 15 ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      >
                        {stop.decibans >= 0 ? '+' : ''}
                        {stop.decibans.toFixed(1)}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-2 text-zinc-300">
                        {stop.decryptedPreview}
                      </td>
                      <td className="px-3 py-2 text-right">
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
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500"
                          >
                            {isIt ? 'Matrice 26x26' : '26x26 Matrix'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onApplyStopToEnigma(stop.positions, stop.deducedPlugboard)
                            }
                            className="rounded border border-bletchley-brass/60 bg-bletchley-brass/15 px-2.5 py-1 text-[11px] font-bold text-bletchley-brass-bright hover:bg-bletchley-brass/25"
                          >
                            {isIt ? 'Imposta' : 'Apply'}
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

      {/* Collapsible 26x26 Welchman Diagonal Board */}
      {hypothesisTraces.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDiagonalDrawer((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-zinc-900/60"
          >
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
                {isIt
                  ? `Scheda Diagonale 26x26 - Posizione [${formatPositionLabel(inspectedPos)}]`
                  : `26x26 Diagonal Board - Position [${formatPositionLabel(inspectedPos)}]`}
              </span>
              <p className="mt-0.5 text-xs text-zinc-500">
                {isIt
                  ? 'Mostra la propagazione elettrica per le 26 ipotesi sulla lettera centrale.'
                  : 'Shows electrical propagation across all 26 hypotheses on the central letter.'}
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              {showDiagonalDrawer
                ? isIt
                  ? 'Chiudi'
                  : 'Hide'
                : isIt
                  ? 'Apri'
                  : 'Open'}
            </span>
          </button>

          {showDiagonalDrawer && (
            <div className="border-t border-zinc-800 p-4 sm:p-5">
              <div className="mb-4 grid grid-cols-7 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {hypothesisTraces.map((tr) => {
                  const selected = tr.assumedPartnerIdx === selectedHypothesisIdx;
                  return (
                    <button
                      key={tr.assumedPartner}
                      type="button"
                      onClick={() => setSelectedHypothesisIdx(tr.assumedPartnerIdx)}
                      className={`rounded border py-1 font-mono text-xs font-bold transition ${
                        selected ? 'ring-1 ring-bletchley-brass-bright ' : ''
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

                  <div className="space-y-3 rounded border border-zinc-800 bg-[#08090c] p-4 font-mono text-xs lg:col-span-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-bold text-zinc-100">
                        {isIt ? 'Ipotesi' : 'Hypothesis'}: {menu.testRegister}-
                        {activeHypothesis.assumedPartner}
                      </span>
                      <span
                        className={
                          activeHypothesis.consistent
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {activeHypothesis.consistent
                          ? isIt
                            ? 'Coerente'
                            : 'Consistent'
                          : isIt
                            ? 'Contraddizione'
                            : 'Contradiction'}
                      </span>
                    </div>

                    <div className="text-zinc-400">
                      {isIt ? 'Contatti attivati:' : 'Activated contacts:'}{' '}
                      {activeHypothesis.propagatedSteps}
                    </div>

                    {!activeHypothesis.consistent ? (
                      <div>
                        <span className="text-[11px] uppercase text-rose-400">
                          {isIt ? 'Registri in conflitto:' : 'Conflicting registers:'}
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
                        <span className="text-[11px] uppercase text-emerald-400">
                          {isIt ? 'Cavi individuati:' : 'Identified cables:'}
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                          {activeHypothesis.deducedPairs.length > 0 ? (
                            activeHypothesis.deducedPairs.map(([a, b]) => (
                              <span
                                key={`${a}${b}`}
                                className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-emerald-200"
                              >
                                {a}{b}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500">
                              {isIt ? 'Nessun cavo esterno' : 'No external cables'}
                            </span>
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
