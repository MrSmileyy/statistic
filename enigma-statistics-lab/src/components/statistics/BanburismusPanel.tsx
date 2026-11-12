import React, { useState, useMemo } from 'react';
import { EnigmaConfig, Language, StatisticalReport, TargetLanguage } from '../../types';
import { getTranslations } from '../../i18n/translations';
import {
  ALPHABET,
  GERMAN_FREQUENCIES,
  ENGLISH_FREQUENCIES,
  UNIFORM_FREQUENCY
} from '../../core/constants';
import { computeBanburismusOverlapIoC } from '../../core/statistics';
import { encryptMessage, sanitizeText } from '../../core/enigma';

interface BanburismusPanelProps {
  report: StatisticalReport;
  targetLanguage: TargetLanguage;
  language: Language;
  enigmaConfig: EnigmaConfig;
}

export const BanburismusPanel: React.FC<BanburismusPanelProps> = ({
  report,
  targetLanguage,
  language,
  enigmaConfig
}) => {
  const t = getTranslations(language);
  const [priorDenominator, setPriorDenominator] = useState<number>(17576);
  const [shiftOffset, setShiftOffset] = useState<number>(0);

  const priorProb = 1 / Math.max(1, priorDenominator);
  const priorOdds = priorProb / Math.max(1e-12, 1 - priorProb);

  // Convert decibans back to likelihood ratio: LR = 10^(decibans / 10)
  const likelihoodRatio = Math.pow(10, report.decibans / 10);
  const posteriorOdds = priorOdds * likelihoodRatio;
  const posteriorProb = posteriorOdds / (1 + posteriorOdds);

  const refFreqs = targetLanguage === 'DE' ? GERMAN_FREQUENCIES : ENGLISH_FREQUENCIES;

  const letterContributions = useMemo(() => {
    return report.frequencies
      .map((item) => {
        const idx = ALPHABET.indexOf(item.letter);
        const pLang = Math.max(refFreqs[idx], 0.0005);
        const singleDeciban = 10 * Math.log10(pLang / UNIFORM_FREQUENCY);
        const totalDeciban = item.count * singleDeciban;
        return {
          letter: item.letter,
          count: item.count,
          singleDeciban,
          totalDeciban
        };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => Math.abs(b.totalDeciban) - Math.abs(a.totalDeciban));
  }, [report.frequencies, refFreqs]);

  // Banburismus twin-sheet comparison
  const banburismusComparison = useMemo(() => {
    const samplePlainA = sanitizeText(
      'OBERKOMMANDODERWEHRMACHTGIBTBEKANNTWETTERVORHERSAGEBISKAYAUNDKANALSTURM'
    );
    const samplePlainB = sanitizeText(
      'GEHEIMEKOMMANDOSACHEANALLESTELLENWETTERBERICHTFUERMORGENFRUEHKEINEAENDERUNG'
    );

    const cfgA: EnigmaConfig = {
      ...enigmaConfig,
      positions: [0, 0, 0]
    };
    const cfgB: EnigmaConfig = {
      ...enigmaConfig,
      positions: [0, 0, shiftOffset % 26]
    };

    const cipherA = encryptMessage(samplePlainA, cfgA).ciphertext;
    const cipherB = encryptMessage(samplePlainB, cfgB).ciphertext;

    const overlapIoC = computeBanburismusOverlapIoC(cipherA, cipherB, shiftOffset);
    const kappaLanguage = targetLanguage === 'DE' ? 0.0762 : 0.0667;
    const minLen = Math.min(cipherA.length, cipherB.length) - Math.abs(shiftOffset);
    const matches = Math.round(overlapIoC * Math.max(1, minLen));
    const nonMatches = Math.max(0, minLen - matches);

    const sheetDecibans =
      matches * 10 * Math.log10(kappaLanguage / UNIFORM_FREQUENCY) +
      nonMatches * 10 * Math.log10((1 - kappaLanguage) / (1 - UNIFORM_FREQUENCY));

    return {
      cipherA: cipherA.slice(0, 42),
      cipherB: cipherB.slice(0, 42),
      overlapIoC,
      matches,
      minLen,
      sheetDecibans
    };
  }, [enigmaConfig, shiftOffset, targetLanguage]);

  return (
    <div className="rounded border border-zinc-800 bg-[#08090c] p-4">
      <div className="mb-4 border-b border-zinc-800 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
          {t.statistics.banburismusTitle}
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          {t.statistics.banburismusDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Bayesian Prior to Posterior Calculator */}
        <div className="space-y-3 rounded border border-zinc-800 bg-[#0d0e12] p-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t.statistics.priorProbability}
            </span>
            <select
              value={priorDenominator}
              onChange={(e) => setPriorDenominator(Number(e.target.value))}
              className="rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1 font-mono text-xs text-amber-300 focus:border-amber-500 focus:outline-none"
            >
              <option value={26}>1 / 26 (1 Rotore)</option>
              <option value={676}>1 / 676 (2 Rotori)</option>
              <option value={17576}>1 / 17.576 (3 Rotori: 26³)</option>
              <option value={1054560}>1 / 1.054.560 (60 Ordini * 26³)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono">
            <div className="rounded border border-zinc-800 bg-[#08090c] p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                P(H₁) Prior
              </div>
              <div className="mt-1 text-sm font-bold text-zinc-200">
                {(priorProb * 100).toFixed(5)}%
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                {t.statistics.decibanScore}
              </div>
              <div
                className={`mt-1 text-sm font-bold ${
                  report.decibans >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {report.decibans > 0 ? '+' : ''}
                {report.decibans.toFixed(1)} dB
              </div>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-[#08090c] p-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className=" uppercase tracking-wider text-zinc-400">
                {t.statistics.posteriorProbability} P(H₁|E)
              </span>
              <span
                className={`text-base font-bold ${
                  posteriorProb > 0.5 ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {(posteriorProb * 100).toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className={`h-full transition-all duration-300 ${
                  posteriorProb > 0.5 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, posteriorProb * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Formula: O(H₁|E) = O(H₁) * 10^(Deciban / 10)
            </div>
          </div>
        </div>

        {/* Top Deciban Letter Weights + Banburismus Twin Sheet */}
        <div className="space-y-3 lg:col-span-7">
          <div className="rounded border border-zinc-800 bg-[#0d0e12] p-3.5">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              <span>
                {language === 'it'
                  ? 'CONTRIBUTO DECIBAN PER LETTERA: 10 * log10(P(L|Lingua) / (1/26))'
                  : 'DECIBAN WEIGHT PER LETTER: 10 * log10(P(L|Lang) / (1/26))'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 font-mono">
              {letterContributions.slice(0, 10).map((item) => (
                <div
                  key={item.letter}
                  className={`rounded border px-2 py-1 text-xs ${
                    item.totalDeciban >= 0
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                      : 'border-red-500/30 bg-red-950/20 text-red-300'
                  }`}
                >
                  <span className="font-bold">{item.letter}</span> ({item.count}x):{' '}
                  {item.totalDeciban > 0 ? '+' : ''}
                  {item.totalDeciban.toFixed(1)} dB
                </div>
              ))}
            </div>
          </div>

          {/* Banburismus Sliding Sheet Alignment */}
          <div className="rounded border border-zinc-800 bg-[#0d0e12] p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {language === 'it'
                  ? 'Sovrapposizione fogli perforati Banburismus'
                  : 'Banburismus punched-sheet overlap'}
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-500">Offset:</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={shiftOffset}
                  onChange={(e) => setShiftOffset(Number(e.target.value))}
                  className="h-1.5 w-24 cursor-pointer accent-amber-500"
                />
                <span className=" text-amber-300">+{shiftOffset}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c] p-2.5 font-mono text-xs tracking-widest">
              <div className="text-zinc-400">MSG A: {banburismusComparison.cipherA}</div>
              <div className="mt-1 text-amber-300">
                MSG B: {'\u00A0'.repeat(shiftOffset)}
                {banburismusComparison.cipherB}
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-zinc-400">
              <span>
                {language === 'it' ? 'Coincidenze verticali:' : 'Vertical matches:'}{' '}
                <strong className="text-zinc-200">
                  {banburismusComparison.matches} / {banburismusComparison.minLen}
                </strong>{' '}
                (IoC = {banburismusComparison.overlapIoC.toFixed(4)})
              </span>
              <span
                className={`font-bold ${
                  banburismusComparison.sheetDecibans > 0
                    ? 'text-emerald-400'
                    : 'text-zinc-400'
                }`}
              >
                {language === 'it' ? 'Evidenza foglio:' : 'Sheet evidence:'}{' '}
                {banburismusComparison.sheetDecibans > 0 ? '+' : ''}
                {banburismusComparison.sheetDecibans.toFixed(1)} dB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
