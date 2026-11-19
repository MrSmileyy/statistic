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
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showBanburismus, setShowBanburismus] = useState<boolean>(false);

  const langName = targetLanguage === 'DE' ? 'German' : 'English';

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
      ? { label: 'Short Text', cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' }
      : report.ioc >= 0.058
        ? { label: `Matches ${langName}`, cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
        : report.ioc >= 0.046
          ? { label: 'Partial Pattern', cls: 'text-amber-300 border-amber-500/40 bg-amber-950/35' }
          : { label: 'Looks Random', cls: 'text-sky-300 border-sky-500/40 bg-sky-950/35' };

  const zVerdict =
    report.zScore >= 3.29
      ? { label: 'Very High Signal', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
      : report.zScore >= 1.96
        ? { label: 'Noticeable Signal', cls: 'text-amber-300 border-amber-500/40 bg-amber-950/35' }
        : { label: 'Normal Noise', cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' };

  const chiVerdict =
    report.length < 15
      ? { label: 'Short Text', cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' }
      : report.chiSquaredPValue >= 0.05
        ? { label: `Fits ${langName}`, cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
        : { label: 'Does Not Match', cls: 'text-rose-300 border-rose-500/40 bg-rose-950/35' };

  const dbVerdict =
    report.totalDecibans >= 20
      ? { label: 'Strong Plaintext', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' }
      : report.totalDecibans > 0
        ? { label: 'Leans Plaintext', cls: 'text-amber-300 border-amber-500/40 bg-amber-950/35' }
        : { label: 'Looks Random', cls: 'text-rose-300 border-rose-500/40 bg-rose-950/35' };

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
                Test Encrypted Ciphertext
              </button>
              <button
                type="button"
                onClick={onUseEnigmaInput}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-200 hover:border-zinc-500"
              >
                Test Real Plaintext
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

      {/* Clear Section Header + Optional Math Formulas Toggle */}
      <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
          <div>
            <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
              <span>6 Statistical Clues (Plain-English Breakdown)</span>
              <InfoTooltip
                title="How to Read These 6 Cards"
                text="Each card tests the same question from a different angle: 'Is this text flat scrambled noise, or does it behave like real German/English?' Toggle 'Show Math Formulas' to inspect the exact equations."
                align="left"
              />
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Green badges indicate real {langName} language patterns; blue/red badges indicate flat encrypted noise.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulas((v) => !v)}
            className={`rounded border px-2.5 py-1 font-mono text-[11px] transition ${
              showFormulas
                ? 'border-amber-500/60 bg-amber-950/30 text-amber-300'
                : 'border-zinc-700 bg-[#08090c] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {showFormulas ? 'Math Formulas: Shown' : 'Show Math Formulas'}
          </button>
        </div>

        {/* 6 Plain-English Metric Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Letter Repetition Rate (IoC) — MOST IMPORTANT */}
          <div className="hw-metric-card justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hw-metric-label mb-0 inline-flex items-center text-sky-300">
                  Letter Repetition Rate (IoC)
                  <InfoTooltip
                    title="Index of Coincidence (IoC)"
                    text={`Pick any 2 letters from the text at random—how likely are they to be identical?\n• Pure random noise: 1/26 = 3.85% (0.0385)\n• Real German: ~7.62% (0.0762)\n• Real English: ~6.67% (0.0667)\n\nCrucial trick: Swapping letters with plugboard cables does NOT change IoC, so it reveals the true rotor setting!`}
                    align="left"
                  />
                </span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${iocVerdict.cls}`}>
                  {iocVerdict.label}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-sky-300">
                  {(report.ioc * 100).toFixed(2)}%
                </span>
                <span className="text-[11px] text-zinc-400">
                  IoC = {report.ioc.toFixed(4)}
                </span>
              </div>
              <div className="relative mt-2 h-2 w-full rounded bg-[#08090c]">
                <div
                  className="h-full rounded bg-sky-400 transition-all duration-300"
                  style={{ width: `${iocPct}%` }}
                />
                <div
                  title="Random noise 3.85% (0.0385)"
                  className="absolute -top-0.5 h-3 w-0.5 bg-rose-400"
                  style={{ left: `${randomIocMarkerPct}%` }}
                />
                <div
                  title={`Real ${langName} ${(report.expectedIocLanguage * 100).toFixed(2)}%`}
                  className="absolute -top-0.5 h-3 w-0.5 bg-emerald-400"
                  style={{ left: `${expectedIocMarkerPct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[9px] text-zinc-500">
                <span className="text-rose-400">Random 3.85%</span>
                <span className="text-emerald-400">
                  Real {targetLanguage} {(report.expectedIocLanguage * 100).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800/80 pt-1.5 font-sans text-[11px] leading-snug text-zinc-400">
              Chance two random letters in this text match. Higher = real language repeating common letters.
              {showFormulas && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/90">
                  IoC = &Sigma; nᵢ(nᵢ&minus;1) / [N(N&minus;1)]
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Turing Evidence Score (Decibans) */}
          <div className="hw-metric-card justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hw-metric-label mb-0 inline-flex items-center text-amber-300">
                  Evidence Score (Decibans)
                  <InfoTooltip
                    title="Alan Turing's Deciban Score"
                    text={`A running point system invented by Alan Turing:\n• Common letters (E, N, T) add positive points\n• Rare letters (Q, X, Z) subtract points\n• Negative total = looks like random noise\n• +10 dB = 10× more likely real text\n• +20 dB = 100× more likely real text!`}
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
                  {report.decibansPerChar.toFixed(2)} dB / letter
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800/80 pt-1.5 font-sans text-[11px] leading-snug text-zinc-400">
              Negative means noise; above <strong className="font-mono text-emerald-300">+20 dB</strong> confirms real {langName} at 100:1 odds.
              {showFormulas && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/90">
                  W = 10 &Sigma; nᵢ log₁₀(26 &middot; pᵢ)
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Surprise Above Random (Z-Score) */}
          <div className="hw-metric-card justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hw-metric-label mb-0 inline-flex items-center">
                  Distance Above Random (Z)
                  <InfoTooltip
                    title="Z-Score (Standard Deviations Above Noise)"
                    text={`Measures how unlikely this repetition rate would be if the letters were purely random.\n• Near 0σ: completely typical of encrypted ciphertext\n• Above +2.0σ: suspicious pattern (<5% luck)\n• Above +3.3σ: overwhelming proof it is NOT random (<0.1% luck).`}
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
                  Goal: &gt; +3.0&sigma;
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800/80 pt-1.5 font-sans text-[11px] leading-snug text-zinc-400">
              How far above pure luck the repetition sits. Above <strong className="font-mono text-emerald-300">+3.0&sigma;</strong> is a clear alarm for real text.
              {showFormulas && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/90">
                  Z = (IoC &minus; 1/26) / SE(H₀) [SE = {report.iocStandardErrorH0.toFixed(5)}]
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Language Frequency Match (Chi-Square) */}
          <div className="hw-metric-card justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hw-metric-label mb-0 inline-flex items-center">
                  Language Count Match (&chi;&sup2;)
                  <InfoTooltip
                    title="Pearson Chi-Square Distance"
                    text={`Checks whether the counts of A, B, C...Z match a normal ${langName} dictionary.\n• Lower score (and p ≥ 0.05) = close match to real ${langName}\n• Very high score (p < 0.001) = letters are scrambled or belong to another alphabet.`}
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
                  p-value = {formatPValue(report.chiSquaredPValue)}
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800/80 pt-1.5 font-sans text-[11px] leading-snug text-zinc-400">
              Measures error between your letter counts and normal {langName}. <strong className="text-zinc-200">Lower = better fit.</strong>
              {showFormulas && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/90">
                  &chi;&sup2; = &Sigma; (Oᵢ &minus; Eᵢ)&sup2; / Eᵢ (25 degrees of freedom)
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Letter Unpredictability (Shannon Entropy) */}
          <div className="hw-metric-card justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hw-metric-label mb-0 inline-flex items-center">
                  Unpredictability (Entropy)
                  <InfoTooltip
                    title="Shannon Entropy (bits per letter)"
                    text={`Measures how hard it is to guess the next letter:\n• 4.70 bits (100%): all 26 letters equally likely (total randomness)\n• ~4.0–4.2 bits (~87%): real ${langName} prose, because common letters appear predictably often.`}
                  />
                </span>
                <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  {entropyPct.toFixed(0)}% of max
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-zinc-100">
                  {report.shannonEntropy.toFixed(2)} bits
                </span>
                <span className="text-[11px] text-zinc-400">
                  Max random: {report.maxEntropy.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[#08090c]">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${entropyPct}%` }}
                />
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800/80 pt-1.5 font-sans text-[11px] leading-snug text-zinc-400">
              Close to 4.70 bits = flat encrypted noise; drops to ~4.0–4.2 bits in readable prose.
              {showFormulas && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/90">
                  H = &minus;&Sigma; pᵢ log₂(pᵢ) &le; log₂(26) = 4.700
                </div>
              )}
            </div>
          </div>

          {/* Card 6: Text Length (Sample Size N) */}
          <div className="hw-metric-card justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hw-metric-label mb-0 inline-flex items-center">
                  Letters Analyzed (N)
                  <InfoTooltip
                    title="Sample Size (N)"
                    text="Only A–Z letters are counted (spaces and numbers are stripped just like WWII Morse code). Short texts under 30 letters fluctuate wildly; 40+ letters give sharp, trustworthy curves."
                    align="right"
                  />
                </span>
                <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  {report.length >= 40 ? 'Reliable Size' : report.length >= 15 ? 'Moderate' : 'Too Short'}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-zinc-100">{report.length}</span>
                <span className="text-[11px] text-zinc-400">Target: {langName} ({targetLanguage})</span>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800/80 pt-1.5 font-sans text-[11px] leading-snug text-zinc-400">
              Total A&ndash;Z characters checked. Longer intercepts (40+ letters) separate real keys cleanly from noise.
              {showFormulas && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/90">
                  N = &Sigma; nᵢ (normalized ASCII A–Z)
                </div>
              )}
            </div>
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
              Advanced: Banburismus, Sequential Decibans &amp; Bayesian Odds
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
