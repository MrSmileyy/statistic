import React, { useState } from 'react';
import type {
  EnigmaConfig,
  Language,
  StatisticalReport,
  TargetLanguage,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';
import { BanburismusPanel } from './BanburismusPanel';
import { CiphertextAttackPanel } from './CiphertextAttackPanel';
import { StatisticalDashboard } from './StatisticalDashboard';

type StatsSubTab = 'diagnosis' | 'attack' | 'advanced';

interface StatisticsWizardPanelProps {
  sampleText: string;
  onSampleTextChange: (text: string) => void;
  targetLanguage: TargetLanguage;
  onTargetLanguageChange: (lang: TargetLanguage) => void;
  report: StatisticalReport;
  enigmaConfig: EnigmaConfig;
  language: Language;
  onUseEnigmaOutput: () => void;
  onUseEnigmaInput: () => void;
  onLoadUnsteckeredDemo: () => void;
  onApplyCandidate: (positions: [number, number, number]) => void;
}

export const StatisticsWizardPanel: React.FC<StatisticsWizardPanelProps> = ({
  sampleText,
  onSampleTextChange,
  targetLanguage,
  onTargetLanguageChange,
  report,
  enigmaConfig,
  language,
  onUseEnigmaOutput,
  onUseEnigmaInput,
  onLoadUnsteckeredDemo,
  onApplyCandidate,
}) => {
  const [subTab, setSubTab] = useState<StatsSubTab>('diagnosis');
  const [showAllTools, setShowAllTools] = useState<boolean>(false);

  const langName = targetLanguage === 'DE' ? 'German' : 'English';
  const isShort = report.length < 15;
  const isNatural = !isShort && report.zScore >= 3.0 && report.totalDecibans >= 12;
  const isBorderline = !isShort && !isNatural && (report.zScore >= 1.8 || report.ioc >= 0.048);

  // Visual needle position between random floor (0.0385) and natural language target
  const minScale = 0.032;
  const maxScale = Math.max(0.082, report.expectedIocLanguage + 0.008);
  const needlePct = Math.min(
    98,
    Math.max(2, ((report.ioc - minScale) / (maxScale - minScale)) * 100)
  );
  const randomPct = ((report.expectedIocRandom - minScale) / (maxScale - minScale)) * 100;
  const targetPct = ((report.expectedIocLanguage - minScale) / (maxScale - minScale)) * 100;

  const verdict = isShort
    ? {
        headline: 'NEED MORE TEXT TO DECIDE',
        badge: 'Too Short (N < 15)',
        borderCls: 'border-zinc-700',
        badgeCls: 'border-zinc-700 bg-zinc-900 text-zinc-300',
        plainText:
          'Type or load at least 15–40 letters so statistical patterns can emerge clearly above random chance.',
      }
    : isNatural
      ? {
          headline: `LOOKS LIKE REAL ${langName.toUpperCase()} TEXT`,
          badge: `Natural Language (${targetLanguage})`,
          borderCls: 'border-emerald-500/50',
          badgeCls: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300',
          plainText: `Common letters repeat ${(report.ioc * 100).toFixed(2)}% of the time (well above the 3.85% random floor). This text has the unmistakable statistical fingerprint of readable ${langName} prose.`,
        }
      : isBorderline
        ? {
            headline: 'PARTIAL LANGUAGE PATTERN DETECTED',
            badge: 'Borderline / Mixed Signal',
            borderCls: 'border-amber-500/50',
            badgeCls: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
            plainText: `Letters repeat ${(report.ioc * 100).toFixed(2)}% of the time—slightly above uniform noise (3.85%). This often appears in short samples or partially decrypted text (right rotors, missing plugboard cables).`,
          }
        : {
            headline: 'LOOKS LIKE RANDOM ENCRYPTED CIPHERTEXT',
            badge: 'Uniform Noise (Encrypted)',
            borderCls: 'border-sky-500/40',
            badgeCls: 'border-sky-500/40 bg-sky-950/40 text-sky-300',
            plainText: `All 26 letters occur roughly evenly (repetition rate ${(report.ioc * 100).toFixed(2)}% ≈ 3.85% random chance). Enigma's rotating wheels hid the natural ${langName} letter peaks.`,
          };

  const showSection = (id: StatsSubTab) => showAllTools || subTab === id;

  return (
    <div className="space-y-4">
      {/* Plain-English Orientation Banner */}
      <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-sky-500/40 bg-sky-950/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                Statistical Cryptanalysis Lab
              </span>
              <InfoTooltip
                title="Why Statistics Can Break Enigma"
                text="Even when you have zero guessed words (no crib), real language has uneven letter frequencies (lots of E, N, T) while encrypted text looks flat and random. Statistics lets a computer recognize the exact rotor setting where real language suddenly reappears."
                align="left"
              />
            </div>
            <h2 className="mt-1.5 font-mono text-base font-bold text-zinc-100">
              How Statistics Tells Encrypted Noise Apart from Real Language
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">
              Every natural language has a recognizable fingerprint—letters like{' '}
              <strong className="font-mono text-zinc-200">E, N, R, T</strong> repeat constantly. Enigma flattens those peaks into random-looking noise. Use the controls below to compare{' '}
              <strong className="text-sky-300">Encrypted Text</strong> vs.{' '}
              <strong className="text-emerald-300">Real Plaintext</strong>, then run the automatic key finder.
            </p>
          </div>
        </div>

        {/* Sample Input + Clear One-Click Comparison Buttons */}
        <div className="mt-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-zinc-400">
                Quick compare:
              </span>
              <button
                type="button"
                onClick={onUseEnigmaOutput}
                className="rounded border border-sky-500/40 bg-sky-950/25 px-2.5 py-1 font-mono text-xs font-semibold text-sky-300 transition hover:bg-sky-950/45"
              >
                Test Encrypted Ciphertext
              </button>
              <button
                type="button"
                onClick={onUseEnigmaInput}
                className="rounded border border-emerald-500/40 bg-emerald-950/25 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/45"
              >
                Test Real Plaintext
              </button>
              <button
                type="button"
                onClick={() => {
                  onLoadUnsteckeredDemo();
                  setSubTab('attack');
                }}
                className="rounded border border-amber-500/40 bg-amber-950/25 px-2.5 py-1 font-mono text-xs font-semibold text-amber-300 transition hover:bg-amber-950/45"
              >
                Load Key-Finder Demo (0 Plugs)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-zinc-400">Expected language:</span>
              <div className="flex items-center rounded border border-zinc-800 bg-[#08090c] p-0.5 font-mono text-xs">
                {(['DE', 'EN'] as TargetLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onTargetLanguageChange(lang)}
                    className={`rounded px-2.5 py-0.5 font-semibold transition ${
                      targetLanguage === lang
                        ? 'bg-zinc-800 text-amber-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang === 'DE' ? 'DE (German)' : 'EN (English)'}
                  </button>
                ))}
              </div>
              <InfoTooltip
                title="Reference Language (DE / EN)"
                text="Choose which language the hidden plaintext is written in. German (DE) repeats letters ~7.62% of the time (heavy E, N, I, R); English (EN) repeats ~6.67% of the time (heavy E, T, A, O)."
                align="right"
              />
            </div>
          </div>

          <textarea
            rows={2}
            value={sampleText}
            onChange={(e) => onSampleTextChange(e.target.value.toUpperCase())}
            placeholder="Paste ciphertext or plaintext (A–Z letters)..."
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs tracking-wider text-zinc-100 focus:border-amber-500 focus:outline-none"
          />

          {/* Plain-English Verdict & Visual Random-to-Language Scale */}
          <div className={`rounded-md border ${verdict.borderCls} bg-[#08090c] p-3.5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${verdict.badgeCls}`}>
                  {verdict.badge}
                </span>
                <span className="font-mono text-xs font-bold tracking-wide text-zinc-100">
                  {verdict.headline}
                </span>
              </div>
              <span className="font-mono text-[11px] text-zinc-400">
                Sample: <strong className="text-zinc-200">{report.length}</strong> letters
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              {verdict.plainText}
            </p>

            {/* Visual Thermometer: Random Noise <-> Real Language */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>Random Noise ({(report.expectedIocRandom * 100).toFixed(2)}%)</span>
                <span className="text-zinc-300">
                  Your text: <strong className="text-amber-300">{(report.ioc * 100).toFixed(2)}%</strong>
                </span>
                <span>Real {langName} ({(report.expectedIocLanguage * 100).toFixed(2)}%)</span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-sky-950 via-zinc-800 to-emerald-950 border border-zinc-800">
                {/* Random floor marker */}
                <div
                  title="Pure random noise (3.85%)"
                  className="absolute -top-0.5 h-3.5 w-0.5 bg-rose-400"
                  style={{ left: `${randomPct}%` }}
                />
                {/* Language target marker */}
                <div
                  title={`Normal ${langName} (${(report.expectedIocLanguage * 100).toFixed(2)}%)`}
                  className="absolute -top-0.5 h-3.5 w-0.5 bg-emerald-400"
                  style={{ left: `${targetPct}%` }}
                />
                {/* Current sample pointer */}
                <div
                  className="absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-zinc-950 bg-amber-300 shadow"
                  style={{ left: `${needlePct}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-zinc-500">
                Tip: Click <strong className="text-emerald-300">Test Real Plaintext</strong> and then{' '}
                <strong className="text-sky-300">Test Encrypted Ciphertext</strong> above to see the yellow needle jump between real {langName} and uniform noise.
              </div>
            </div>
          </div>
        </div>

        {/* Clean 3-Tool Navigation Bar (Prevents Visual Overload) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 bg-[#08090c] p-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                {
                  id: 'diagnosis',
                  label: '1. Text Fingerprint & Chart',
                  tip: 'See the 6 core metrics in plain English plus the A–Z letter frequency bar chart.',
                },
                {
                  id: 'attack',
                  label: '2. Rotor Key Finder (17,576 Keys)',
                  tip: 'Try every 3-letter rotor window (AAA–ZZZ) automatically to recover the key without needing a crib.',
                },
                {
                  id: 'advanced',
                  label: '3. Advanced: Decibans & Banburismus',
                  tip: 'Explore Turing’s sequential letter-by-letter evidence curve, Bayes probability calculator, and two-message sliding overlap.',
                },
              ] as const
            ).map((tab) => {
              const active = !showAllTools && subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setShowAllTools(false);
                    setSubTab(tab.id);
                  }}
                  className={`inline-flex items-center rounded px-3 py-1.5 font-mono text-xs transition ${
                    active
                      ? 'border border-amber-500/60 bg-amber-950/30 font-semibold text-amber-300'
                      : 'border border-zinc-800 bg-[#0d0e12] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <InfoTooltip title={tab.label} text={tab.tip} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAllTools((v) => !v)}
            className={`rounded border px-2.5 py-1 font-mono text-[11px] transition ${
              showAllTools
                ? 'border-sky-500/60 bg-sky-950/30 text-sky-300'
                : 'border-zinc-700 bg-[#0d0e12] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {showAllTools ? 'Showing All 3 Tools' : 'Show All 3 Tools'}
          </button>
        </div>
      </section>

      {/* Section 1: Core Metrics & Letter Frequency Chart */}
      {showSection('diagnosis') && (
        <StatisticalDashboard
          sampleText={sampleText}
          onSampleTextChange={onSampleTextChange}
          targetLanguage={targetLanguage}
          onTargetLanguageChange={onTargetLanguageChange}
          report={report}
          language={language}
          onUseEnigmaOutput={onUseEnigmaOutput}
          onUseEnigmaInput={onUseEnigmaInput}
          hideInputSection
        />
      )}

      {/* Section 2: Ciphertext-Only 17,576-Key Sweep */}
      {showSection('attack') && (
        <CiphertextAttackPanel
          ciphertext={sampleText}
          enigmaConfig={enigmaConfig}
          targetLanguage={targetLanguage}
          language={language}
          onLoadUnsteckeredDemo={onLoadUnsteckeredDemo}
          onApplyCandidate={onApplyCandidate}
        />
      )}

      {/* Section 3: Advanced Turing Decibans & Banburismus */}
      {showSection('advanced') && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
          <div className="mb-3 border-b border-zinc-800 pb-2.5">
            <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
              <span>Advanced Tools: Turing Sequential Evidence, Bayes Odds &amp; Banburismus</span>
              <InfoTooltip
                title="Bletchley Park Bayesian Methods"
                text="These three panels show the exact statistical machinery Alan Turing invented at Bletchley Park: adding letter-by-letter evidence (SPRT), converting scores into true probability % (Bayes' rule), and aligning two encrypted messages by sliding them over each other (Banburismus)."
                align="left"
              />
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Go deeper into how Bletchley Park converted raw letter counts into mathematical certainty—and how analysts aligned pairs of Enigma messages without knowing a single plaintext word.
            </p>
          </div>
          <BanburismusPanel
            report={report}
            targetLanguage={targetLanguage}
            language={language}
            enigmaConfig={enigmaConfig}
          />
        </section>
      )}
    </div>
  );
};
