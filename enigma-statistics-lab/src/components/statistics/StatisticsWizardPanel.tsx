import React from 'react';
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
  const isShort = report.length < 15;
  const isNatural = !isShort && report.zScore >= 3.5 && report.totalDecibans >= 15;
  const isBorderline = !isShort && !isNatural && report.zScore >= 2.0;

  const statusBadge = isShort
    ? {
        label: 'Sample Too Short (N < 15)',
        cls: 'border-zinc-700 bg-zinc-900 text-zinc-400',
        summary:
          'Enter or paste at least 15–40 letters to distinguish natural language structure from uniform noise.',
      }
    : isNatural
      ? {
          label: `Natural Language Profile (${targetLanguage} H₁)`,
          cls: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300',
          summary: `IoC = ${report.ioc.toFixed(4)} (Z = +${report.zScore.toFixed(2)}σ, ${report.totalDecibans >= 0 ? '+' : ''}${report.totalDecibans.toFixed(1)} dB): strong deviation from 1/26 noise consistent with ${targetLanguage === 'DE' ? 'German' : 'English'} plaintext.`,
        }
      : isBorderline
        ? {
            label: 'Partial / Borderline Structure',
            cls: 'border-amber-500/50 bg-amber-950/35 text-amber-300',
            summary: `IoC = ${report.ioc.toFixed(4)} (Z = ${report.zScore >= 0 ? '+' : ''}${report.zScore.toFixed(2)}σ, ${report.totalDecibans >= 0 ? '+' : ''}${report.totalDecibans.toFixed(1)} dB): moderate departure from uniform frequencies; a longer sample sharpens separation.`,
          }
        : {
            label: 'Uniform Ciphertext Noise (H₀)',
            cls: 'border-sky-500/40 bg-sky-950/30 text-sky-300',
            summary: `IoC = ${report.ioc.toFixed(4)} (Z = ${report.zScore >= 0 ? '+' : ''}${report.zScore.toFixed(2)}σ, ${report.totalDecibans >= 0 ? '+' : ''}${report.totalDecibans.toFixed(1)} dB): letter distribution is flattened near 1/26 (0.0385), typical of polyalphabetic Enigma ciphertext.`,
          };

  return (
    <div className="space-y-4">
      {/* 3-Step Pipeline Overview */}
      <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="mb-3 border-b border-zinc-800 pb-2">
          <h2 className="font-mono text-sm font-bold text-zinc-100">
            How Statistical Cryptanalysis Recovers Enigma Keys
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded border border-zinc-800 bg-[#08090c] p-3">
            <div className="flex items-center font-mono text-xs font-bold text-sky-300">
              <span>1. Flat Ciphertext (H₀)</span>
              <InfoTooltip
                title="Null Hypothesis H₀ (Random Noise)"
                text="In real language, letters like E or T appear much more often than Q or Z. Enigma's rotating wheels scramble every letter differently, flattening the histogram toward an even 3.85% per letter."
                align="left"
              />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Because Enigma advances its rotors on every key, a natural text&rsquo;s uneven frequencies are spread evenly toward uniform random noise (<span className="font-mono text-zinc-200">1/26 &approx; 3.85%</span>, <span className="font-mono text-zinc-200">IoC &approx; 0.0385</span>).
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-[#08090c] p-3">
            <div className="flex items-center font-mono text-xs font-bold text-amber-300">
              <span>2. Plugboard Invariance of IoC</span>
              <InfoTooltip
                title="Why Plugs Don't Hide Rotor Peaks"
                text="Swapping letters on the front plugboard is just relabeling symbols (like calling every E an X). Since IoC only counts how often letters repeat—not which letters they are—the true rotor setting still spikes."
              />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              A fixed Steckerbrett only renames letters without changing how often letters repeat. At the true rotor key, <span className="font-mono text-zinc-200">IoC</span> jumps back to natural language (<span className="font-mono text-zinc-200">0.0762</span> DE / <span className="font-mono text-zinc-200">0.0667</span> EN).
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-[#08090c] p-3">
            <div className="flex items-center font-mono text-xs font-bold text-emerald-300">
              <span>3. 17,576-Window Rotor Sweep</span>
              <InfoTooltip
                title="Ciphertext-Only Key Search"
                text="With 3 rotors of 26 letters each, there are 26³ = 17,576 starting positions. Testing all of them in a background Web Worker finds the exact window where plaintext language statistics return."
                align="right"
              />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Without needing a crib, a Web Worker decrypts the sample at every rotor position from <span className="font-mono text-zinc-200">AAA</span> to <span className="font-mono text-zinc-200">ZZZ</span> and isolates the peak <span className="font-mono text-zinc-200">IoC</span>, <span className="font-mono text-zinc-200">Deciban</span>, or <span className="font-mono text-zinc-200">&chi;&sup2;</span> candidate.
            </p>
          </div>
        </div>
      </div>

      {/* Sample Text & Corpus Selector */}
      <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2.5">
          <div>
            <h2 className="flex items-center font-mono text-sm font-bold text-zinc-100">
              <span>Sample Text &amp; Reference Corpus</span>
              <InfoTooltip
                title="Sample & Reference Language"
                text="Paste any ciphertext or plaintext here (only A–Z letters are analyzed) and pick whether you expect German (DE) or English (EN) plaintext."
                align="left"
              />
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Compare ciphertext vs. plaintext directly: click &ldquo;Use Enigma input&rdquo; to see natural-language peaks or &ldquo;Use Enigma output&rdquo; to inspect encrypted noise.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onUseEnigmaOutput}
              className="rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Use Enigma output
            </button>
            <button
              type="button"
              onClick={onUseEnigmaInput}
              className="rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Use Enigma input
            </button>
            <button
              type="button"
              onClick={onLoadUnsteckeredDemo}
              className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              Unsteckered demo
            </button>

            <div className="ml-1 flex items-center gap-1">
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
                    {lang}
                  </button>
                ))}
              </div>
              <InfoTooltip
                title="Reference Language (DE / EN)"
                text="Switches the expected letter distribution used by Chi-Square and Decibans between historical German telegraph prose (DE, expected IoC 0.0762) and standard English prose (EN, expected IoC 0.0667)."
                align="right"
              />
            </div>
          </div>
        </div>

        <textarea
          rows={3}
          value={sampleText}
          onChange={(e) => onSampleTextChange(e.target.value.toUpperCase())}
          className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs tracking-wider text-zinc-100 focus:border-amber-500 focus:outline-none"
        />

        {/* Instant Classification Banner */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 bg-[#08090c] px-3 py-2">
          <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
          <span className="font-mono text-xs text-zinc-300">{statusBadge.summary}</span>
        </div>
      </div>

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
        advancedExtra={
          <BanburismusPanel
            report={report}
            targetLanguage={targetLanguage}
            language={language}
            enigmaConfig={enigmaConfig}
          />
        }
      />

      <CiphertextAttackPanel
        ciphertext={sampleText}
        enigmaConfig={enigmaConfig}
        targetLanguage={targetLanguage}
        language={language}
        onLoadUnsteckeredDemo={onLoadUnsteckeredDemo}
        onApplyCandidate={onApplyCandidate}
      />
    </div>
  );
};
