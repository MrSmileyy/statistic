import React, { useState, useRef, useEffect } from 'react';
import {
  CiphertextAttackCandidate,
  EnigmaConfig,
  Language,
  TargetLanguage,
  WorkerResponse
} from '../../types';
import { getTranslations } from '../../i18n/translations';
import { sanitizeText } from '../../core/enigma';
import { runCiphertextOnlyScan } from '../../core/statistics';

interface CiphertextAttackPanelProps {
  ciphertext: string;
  enigmaConfig: EnigmaConfig;
  targetLanguage: TargetLanguage;
  language: Language;
  onLoadUnsteckeredDemo?: () => void;
  onApplyCandidate: (positions: [number, number, number]) => void;
}

export const CiphertextAttackPanel: React.FC<CiphertextAttackPanelProps> = ({
  ciphertext,
  enigmaConfig,
  targetLanguage,
  language,
  onLoadUnsteckeredDemo,
  onApplyCandidate
}) => {
  const t = getTranslations(language);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ tested: 0, total: 17576 });
  const [candidates, setCandidates] = useState<CiphertextAttackCandidate[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const cleanCipher = sanitizeText(ciphertext);

  const handleRunScan = () => {
    if (cleanCipher.length < 10) return;

    setIsScanning(true);
    setProgress({ tested: 0, total: 17576 });
    setCandidates([]);
    setElapsedMs(null);

    try {
      workerRef.current?.terminate();
      const worker = new Worker(
        new URL('../../workers/cryptoAnalysis.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'CIPHERTEXT_PROGRESS') {
          setProgress({ tested: msg.tested, total: msg.total });
          setCandidates(msg.topCandidates);
        } else if (msg.type === 'CIPHERTEXT_COMPLETE') {
          setProgress({ tested: 17576, total: 17576 });
          setCandidates(msg.topCandidates);
          setElapsedMs(msg.elapsedMs);
          setIsScanning(false);
          worker.terminate();
        }
      };

      worker.onerror = () => {
        const t0 = performance.now();
        const res = runCiphertextOnlyScan(
          cleanCipher,
          enigmaConfig.rotors,
          enigmaConfig.reflector,
          enigmaConfig.rings,
          enigmaConfig.plugboard,
          targetLanguage,
          25
        );
        setCandidates(res);
        setProgress({ tested: 17576, total: 17576 });
        setElapsedMs(performance.now() - t0);
        setIsScanning(false);
      };

      worker.postMessage({
        type: 'START_CIPHERTEXT_SCAN',
        payload: {
          ciphertext: cleanCipher,
          rotors: enigmaConfig.rotors,
          reflector: enigmaConfig.reflector,
          rings: enigmaConfig.rings,
          plugboard: enigmaConfig.plugboard,
          targetLanguage
        }
      });
    } catch {
      const t0 = performance.now();
      const res = runCiphertextOnlyScan(
        cleanCipher,
        enigmaConfig.rotors,
        enigmaConfig.reflector,
        enigmaConfig.rings,
        enigmaConfig.plugboard,
        targetLanguage,
        25
      );
      setCandidates(res);
      setProgress({ tested: 17576, total: 17576 });
      setElapsedMs(performance.now() - t0);
      setIsScanning(false);
    }
  };

  const progressPct = Math.min(100, Math.round((progress.tested / progress.total) * 100));
  const bestCandidate = candidates[0] ?? null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
            {t.statistics.ciphertextAttackTitle}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {t.statistics.ciphertextAttackDesc}
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning || cleanCipher.length < 10}
          className={`rounded border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
            isScanning || cleanCipher.length < 10
              ? 'cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600'
              : 'border-amber-500/50 bg-amber-500 text-zinc-950 hover:bg-amber-400'
          }`}
        >
          {isScanning ? t.statistics.scanningRotors : t.statistics.runRotorScan}
        </button>
      </div>

      {/* Warning if plugboard is active */}
      {enigmaConfig.plugboard.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-amber-500/30 bg-[#08090c] px-3.5 py-2.5 text-xs text-zinc-300">
          <span>
            {language === 'it'
              ? `Pannello a spine attivo (${enigmaConfig.plugboard.length} cavi). La scansione statistica diretta richiede cavi noti o assenti.`
              : `Plugboard active (${enigmaConfig.plugboard.length} cables). Direct statistical scanning requires known or zero cables.`}
          </span>
          {onLoadUnsteckeredDemo && (
            <button
              onClick={onLoadUnsteckeredDemo}
              className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              {language === 'it' ? 'Carica cifrato senza cavi' : 'Load unsteckered cipher'}
            </button>
          )}
        </div>
      )}

      {/* Progress readout */}
      {(isScanning || progress.tested > 0) && (
        <div className="mb-4 rounded border border-zinc-800 bg-[#08090c] p-3">
          <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
            <span className="text-zinc-400">
              {language === 'it' ? 'POSIZIONI ANALIZZATE:' : 'TESTED POSITIONS:'}{' '}
              <strong className="text-amber-300">{progress.tested.toLocaleString()}</strong> / 17,576 ({progressPct}%)
            </span>
            {elapsedMs !== null && (
              <span className="text-emerald-400">
                {(elapsedMs / 1000).toFixed(2)}s
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full bg-amber-500 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Top decrypted candidate paper tape */}
      {bestCandidate && !isScanning && (
        <div className="mb-4 rounded border border-zinc-800 bg-[#08090c] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  {language === 'it' ? 'PRIMO CANDIDATO' : 'PRIMARY CANDIDATE'}
                </span>
                <span className="font-mono text-lg font-bold tracking-widest text-amber-300">
                  {bestCandidate.positionStr}
                </span>
              </div>
              <div className="h-7 w-px bg-zinc-800" />
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  IoC
                </span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {bestCandidate.ioc.toFixed(4)}
                </span>
              </div>
              <div className="h-7 w-px bg-zinc-800" />
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Z-SCORE
                </span>
                <span className="font-mono text-sm font-bold text-zinc-200">
                  +{bestCandidate.zScore.toFixed(2)}σ
                </span>
              </div>
            </div>

            <button
              onClick={() => onApplyCandidate(bestCandidate.positions)}
              className="rounded border border-amber-500/50 bg-amber-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-400"
            >
              {t.statistics.applyKey}
            </button>
          </div>

          <div>
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              {language === 'it' ? 'ANTEPRIMA TESTO DECIFRATO' : 'DECRYPTED TEXT PREVIEW'}
            </span>
            <div className="paper-tape rounded px-3 py-2 font-mono text-xs font-bold tracking-widest">
              {bestCandidate.decryptedPreview}
            </div>
          </div>
        </div>
      )}

      {/* Scatter / spike chart + Candidate Table */}
      {candidates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded border border-zinc-800 bg-[#08090c] p-3 lg:col-span-5">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              <span>{language === 'it' ? 'CONFRONTO PRIMI 15 PICCHI (Z-SCORE)' : 'TOP 15 PEAKS COMPARISON (Z-SCORE)'}</span>
              <span className="text-zinc-500">Z &gt; 3.0</span>
            </div>
            <svg viewBox="0 0 320 185" className="w-full h-auto">
              <line x1={32} y1={145} x2={305} y2={145} stroke="#27272a" strokeWidth={1} />
              <line
                x1={32}
                y1={105}
                x2={305}
                y2={105}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text x={36} y={100} fill="#f59e0b" fontSize="8" className="font-mono">
                {language === 'it' ? 'Soglia 3.0σ' : '3.0σ threshold'}
              </text>

              {candidates.slice(0, 15).map((cand, idx) => {
                const x = 44 + idx * 17;
                const maxZ = Math.max(8, candidates[0]?.zScore ?? 8);
                const barH = Math.max(4, Math.min(125, (Math.max(0, cand.zScore) / maxZ) * 125));
                const y = 145 - barH;
                const isFirst = idx === 0;

                return (
                  <g key={cand.positionStr}>
                    <rect
                      x={x - 5}
                      y={y}
                      width={10}
                      height={barH}
                      rx={1}
                      fill={isFirst ? '#10b981' : '#f59e0b'}
                      fillOpacity={isFirst ? 0.9 : 0.45}
                    />
                    <text
                      x={x}
                      y={162}
                      textAnchor="middle"
                      fill={isFirst ? '#34d399' : '#71717a'}
                      fontSize="7.5"
                      className="font-mono"
                    >
                      {cand.positionStr}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="max-h-60 overflow-y-auto rounded border border-zinc-800 bg-[#08090c] lg:col-span-7">
            <table className="w-full text-left font-mono text-xs">
              <thead className="sticky top-0 border-b border-zinc-800 bg-[#0d0e12] text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2">{t.statistics.position}</th>
                  <th className="px-3 py-2">{t.statistics.iocScore}</th>
                  <th className="px-3 py-2">Z-Score</th>
                  <th className="px-3 py-2">{t.statistics.chiSquared}</th>
                  <th className="px-3 py-2">{t.statistics.preview}</th>
                  <th className="px-3 py-2 text-right">{t.bombe.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {candidates.map((cand, index) => (
                  <tr
                    key={cand.positionStr}
                    className={`transition hover:bg-zinc-900/70 ${
                      index === 0 ? 'bg-emerald-950/15' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-bold text-amber-300">
                      {cand.positionStr}
                    </td>
                    <td className="px-3 py-2 text-emerald-400">
                      {cand.ioc.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      +{cand.zScore.toFixed(2)}σ
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {cand.chiSquared.toFixed(1)}
                    </td>
                    <td className="max-w-[170px] truncate px-3 py-2 text-zinc-300" title={cand.decryptedPreview}>
                      {cand.decryptedPreview}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onApplyCandidate(cand.positions)}
                        className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-200 hover:border-amber-500/50 hover:text-amber-300"
                      >
                        {t.statistics.applyKey}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded border border-zinc-800/80 bg-[#08090c] py-8 text-center font-mono text-xs text-zinc-500">
          {cleanCipher.length < 10
            ? language === 'it'
              ? 'Inserisci almeno 10 lettere cifrate per avviare la scansione delle 17.576 posizioni.'
              : 'Enter at least 10 ciphertext letters to run the 17,576-position scan.'
            : language === 'it'
            ? 'Premi "Avvia Scansione 17.576 Posizioni" per calcolare IoC, Z-Score e Chi-Quadro su ogni chiave.'
            : 'Press "Scan All 17,576 Positions" to compute IoC, Z-Score, and Chi-Squared across all keys.'}
        </div>
      )}
    </div>
  );
};
