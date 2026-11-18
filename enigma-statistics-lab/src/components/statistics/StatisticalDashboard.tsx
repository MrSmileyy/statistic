import React, { useState } from 'react';
import type { Language, StatisticalReport, TargetLanguage } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';
import { FrequencyChartSVG } from './FrequencyChartSVG';

interface StatisticalDashboardProps {
  sampleText: string;
  onSampleTextChange: (text: string) => void;
  targetLanguage: TargetLanguage;
  onTargetLanguageChange: (lang: TargetLanguage) => void;
  report: StatisticalReport;
  language: Language;
  onUseEnigmaOutput: () => void;
  onUseEnigmaInput: () => void;
  hideInputSection?: boolean;
  advancedExtra?: React.ReactNode;
}

export const StatisticalDashboard: React.FC<StatisticalDashboardProps> = ({
  sampleText,
  onSampleTextChange,
  targetLanguage,
  onTargetLanguageChange,
  report,
  language,
  onUseEnigmaOutput,
  onUseEnigmaInput,
  hideInputSection = false,
  advancedExtra,
}) => {
  const [showBanburismus, setShowBanburismus] = useState<boolean>(true);

  const formatPValue = (p: number) => {
    if (p < 0.0001) return '< 0.0001';
    return p.toFixed(4);
  };

  const iocPct = Math.min(
    100,
    Math.max(4, ((report.ioc - 0.03) / (0.085 - 0.03)) * 100)
  );
  const expectedIocMarkerPct = Math.min(
    98,
    Math.max(5, ((report.expectedIocLanguage - 0.03) / (0.085 - 0.03)) * 100)
  );
  const randomIocMarkerPct = ((report.expectedIocRandom - 0.03) / (0.085 - 0.03)) * 100;
  const entropyPct = Math.min(
    100,
    Math.max(0, (report.shannonEntropy / Math.max(1e-6, report.maxEntropy)) * 100)
  );

  const iocVerdict =
    report.length < 15
      ? { label: 'Short N', cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' }
      : report.ioc >= 0.058
        ? { label: 'Natural H₁', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
        : report.ioc >= 0.046
          ? { label: 'Borderline', cls: 'text-amber-300 border-amber-500/40 bg-amber-950/35' }
          : { label: 'Random H₀', cls: 'text-sky-300 border-sky-500/40 bg-sky-950/35' };

  const zVerdict =
    report.zScore >= 3.29
      ? { label: 'p < 0.001', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
      : report.zScore >= 1.96
        ? { label: 'p < 0.05', cls: 'text-amber-300 border-amber-500/40 bg-amber-950/35' }
        : { label: 'Null H₀', cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' };

  const chiVerdict =
    report.length < 15
      ? { label: 'Short N', cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' }
      : report.chiSquaredPValue >= 0.05
        ? { label: `Fits ${targetLanguage}`, cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
        : { label: `Diverges`, cls: 'text-rose-300 border-rose-500/40 bg-rose-950/35' };

  const dbVerdict =
    report.totalDecibans >= 20
      ? { label: 'Strong H₁', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
      : report.totalDecibans > 0
        ? { label: 'Weak H₁', cls: 'text-amber-300 border-amber-500/40 bg-amber-950/35' }
        : { label: 'Favors H₀', cls: 'text-rose-300 border-rose-500/40 bg-rose-950/35' };

  return (
    <div className="space-y-4">
      {!hideInputSection && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <h2 className="font-mono text-sm font-bold text-zinc-100">
              Sample Text
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onUseEnigmaOutput}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-200 hover:border-zinc-500"
              >
                Use Enigma output
              </button>
              <button
                type="button"
                onClick={onUseEnigmaInput}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-200 hover:border-zinc-500"
              >
                Use Enigma input
              </button>

              <div className="inline-flex rounded border border-zinc-700 bg-[#08090c] p-0.5">
                {(['DE', 'EN'] as TargetLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onTargetLanguageChange(lang)}
                    className={`rounded px-2.5 py-0.5 font-mono text-xs font-bold transition ${
                      targetLanguage === lang
                        ? 'bg-zinc-800 text-amber-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            value={sampleText}
            onChange={(e) => onSampleTextChange(e.target.value)}
            rows={3}
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs uppercase tracking-wider text-zinc-100 focus:border-amber-500 focus:outline-none"
          />
        </section>
      )}

      {/* 6 Enriched Statistical Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Sample Size */}
        <div className="hw-metric-card justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="hw-metric-label mb-0 inline-flex items-center">
                Sample Size (N)
                <InfoTooltip
                  title="Sample Size (N)"
                  text="Total count of A–Z letters analyzed. Longer messages reduce random fluctuation: 40+ letters are recommended so IoC and Chi-Square tests cleanly separate real language from noise."
                  align="left"
                />
              </span>
              <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300">
                {report.length >= 40 ? 'Reliable' : report.length >= 15 ? 'Moderate' : 'Short'}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-bold text-zinc-100">{report.length}</span>
              <span className="text-[11px] text-zinc-400">Corpus: {targetLanguage}</span>
            </div>
          </div>
          <div className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
            Normalized A&ndash;Z letters counted; &ge; 40 chars recommended for reliable &chi;&sup2; and IoC tests.
          </div>
        </div>

        {/* Card 2: Index of Coincidence */}
        <div className="hw-metric-card justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="hw-metric-label mb-0 inline-flex items-center">
                Index of Coincidence
                <InfoTooltip
                  title="Index of Coincidence (IoC)"
                  text="The probability that two randomly picked letters in the text are identical. Uniform random ciphertext scores ~0.0385 (1/26), while real prose scores ~0.0762 in German or ~0.0667 in English."
                />
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${iocVerdict.cls}`}>
                {iocVerdict.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-bold text-sky-300">{report.ioc.toFixed(4)}</span>
              <span className="text-[11px] text-zinc-400">
                H₀: 0.0385 | {targetLanguage}: {report.expectedIocLanguage.toFixed(4)}
              </span>
            </div>
            {/* Threshold gauge */}
            <div className="relative mt-2 h-2 w-full rounded bg-[#08090c]">
              <div
                className="h-full rounded bg-sky-400 transition-all duration-300"
                style={{ width: `${iocPct}%` }}
              />
              <div
                title="Uniform random H0 (0.0385)"
                className="absolute -top-0.5 h-3 w-0.5 bg-rose-400"
                style={{ left: `${randomIocMarkerPct}%` }}
              />
              <div
                title={`Expected ${targetLanguage} (${report.expectedIocLanguage.toFixed(4)})`}
                className="absolute -top-0.5 h-3 w-0.5 bg-emerald-400"
                style={{ left: `${expectedIocMarkerPct}%` }}
              />
            </div>
          </div>
          <div className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
            &Sigma; nᵢ(nᵢ&minus;1) / [N(N&minus;1)] &bull; Probability two random letters match.
          </div>
        </div>

        {/* Card 3: Z-Score */}
        <div className="hw-metric-card justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="hw-metric-label mb-0 inline-flex items-center">
                IoC Z-Score (vs H₀)
                <InfoTooltip
                  title="Z-Score under Uniform H₀"
                  text="Measures how many standard deviations the observed IoC sits above pure 1/26 random noise. Values above +3σ have less than 0.1% chance of occurring randomly—strong evidence of real language."
                  align="right"
                />
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${zVerdict.cls}`}>
                {zVerdict.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                className={`text-xl font-bold ${
                  report.zScore >= 3.29
                    ? 'text-emerald-400'
                    : report.zScore >= 1.96
                      ? 'text-amber-300'
                      : 'text-zinc-100'
                }`}
              >
                {report.zScore >= 0 ? '+' : ''}
                {report.zScore.toFixed(2)}&sigma;
              </span>
              <span className="text-[11px] text-zinc-400">
                SE(H₀) = {report.iocStandardErrorH0.toFixed(5)}
              </span>
            </div>
          </div>
          <div className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
            (IoC &minus; 1/26) / SE(H₀) &bull; Standard deviations above uniform noise.
          </div>
        </div>

        {/* Card 4: Chi-Square */}
        <div className="hw-metric-card justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="hw-metric-label mb-0 inline-flex items-center">
                Pearson Chi-Square (25 df)
                <InfoTooltip
                  title="Pearson Chi-Square Goodness-of-Fit"
                  text="Compares your 26 letter counts against standard German/English letter frequencies. A lower Chi-Square (and p >= 0.05) means the text matches the natural language distribution."
                  align="left"
                />
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${chiVerdict.cls}`}>
                {chiVerdict.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-bold text-zinc-100">
                {report.chiSquared.toFixed(1)}
              </span>
              <span className="text-[11px] text-zinc-400">
                p = {formatPValue(report.chiSquaredPValue)}
              </span>
            </div>
          </div>
          <div className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
            &Sigma; (Oᵢ &minus; Eᵢ)&sup2; / Eᵢ &bull; Lower values indicate closer fit to {targetLanguage}.
          </div>
        </div>

        {/* Card 5: Shannon Entropy */}
        <div className="hw-metric-card justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="hw-metric-label mb-0 inline-flex items-center">
                Shannon Entropy (H)
                <InfoTooltip
                  title="Shannon Entropy (bits per letter)"
                  text="Measures unpredictability. If every letter appears equally often (flat Enigma ciphertext), entropy nears the theoretical maximum of 4.700 bits. Real language is more predictable (~4.0–4.2 bits)."
                />
              </span>
              <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300">
                {entropyPct.toFixed(1)}% of max
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-bold text-zinc-100">
                {report.shannonEntropy.toFixed(3)}
              </span>
              <span className="text-[11px] text-zinc-400">
                Max: {report.maxEntropy.toFixed(3)} bits/ch
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[#08090c]">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${entropyPct}%` }}
              />
            </div>
          </div>
          <div className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
            &minus;&Sigma; pᵢ log₂(pᵢ) &bull; Flat ciphertext &approx; 4.5&ndash;4.7; prose &approx; 4.0&ndash;4.2 bits.
          </div>
        </div>

        {/* Card 6: Deciban Weight */}
        <div className="hw-metric-card justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="hw-metric-label mb-0 inline-flex items-center">
                Turing Decibans (W)
                <InfoTooltip
                  title="Alan Turing's Deciban Score"
                  text="A logarithmic score comparing how likely the text is under real language (H₁) versus random noise (H₀). Every +10 dB multiplies the odds by 10 (+20 dB means 100:1 in favor of plaintext)."
                  align="right"
                />
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${dbVerdict.cls}`}>
                {dbVerdict.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                className={`text-xl font-bold ${
                  report.totalDecibans >= 20
                    ? 'text-emerald-400'
                    : report.totalDecibans > 0
                      ? 'text-amber-300'
                      : 'text-rose-400'
                }`}
              >
                {report.totalDecibans >= 0 ? '+' : ''}
                {report.totalDecibans.toFixed(1)} dB
              </span>
              <span className="text-[11px] text-zinc-400">
                {report.decibansPerChar >= 0 ? '+' : ''}
                {report.decibansPerChar.toFixed(2)} dB/ch
              </span>
            </div>
          </div>
          <div className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
            10 &Sigma; nᵢ log₁₀(26&middot;pᵢ) &bull; +10 dB = 10:1 odds; +20 dB = 100:1 for H₁.
          </div>
        </div>
      </div>

      <FrequencyChartSVG frequencies={report.frequencies} language={language} />

      {advancedExtra && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBanburismus((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs text-zinc-200 hover:bg-zinc-900/60"
          >
            <span className="inline-flex items-center font-bold">
              Banburismus, Sequential Deciban Trajectory (SPRT) &amp; Bayesian Odds
              <InfoTooltip
                title="Banburismus & Sequential Evidence"
                text="Turing's method at Bletchley Park: adds up Deciban scores letter-by-letter to test hypotheses sequentially, updates prior odds via Bayes' rule, and slides two ciphertexts to spot matching rotor depths."
                align="left"
              />
            </span>
            <span className="text-zinc-400">
              {showBanburismus ? 'Hide' : 'Show'}
            </span>
          </button>

          {showBanburismus && (
            <div className="border-t border-zinc-800 p-4">{advancedExtra}</div>
          )}
        </section>
      )}
    </div>
  );
};
