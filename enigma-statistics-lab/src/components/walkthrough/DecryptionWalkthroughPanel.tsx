import React, { useEffect, useMemo, useState } from 'react';
import {
  ALPHABET,
  formatPositionLabel,
  HISTORICAL_PRESETS,
  indexToChar,
  normalizeAsciiLetters,
} from '../../core/constants';
import {
  buildBombeMenu,
  findValidCribAlignments,
  inspectBombeHypotheses,
} from '../../core/bombe';
import { EnigmaM3 } from '../../core/enigma';
import { computeStatisticalReport } from '../../core/statistics';
import type { EnigmaConfig, PlugPair } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface CaseStudyMeta {
  badge: string;
  origin: string;
  difficulty: string;
  cribRationale: string;
  spacedPlaintext: string;
  englishGloss: string;
  takeaway: string;
}

const CASE_STUDY_META: Record<string, CaseStudyMeta> = {
  'wetterbericht-1941': {
    badge: 'Case 01 · Preamble Crib',
    origin: '1941 · Wehrmacht Weather Broadcast',
    difficulty: 'Introductory · Offset +0 · Rings 01-01-01',
    cribRationale:
      'German weather stations opened daily transmissions with the fixed header WETTERBERICHT ("weather report"). Because the word appears at index 1, analysts gain an immediate offset-0 menu with 6 active plugboard pairs.',
    spacedPlaintext:
      'WETTERBERICHT VOM DIENSTAG X WINDSTAERKE SECHS X SIEDLUNG SEKTOR NORDOST KLAR UND KALT',
    englishGloss:
      'Weather report from Tuesday. Wind force six. Settlement sector northeast clear and cold.',
    takeaway:
      'Even with 6 Steckerbrett cables scrambling 12 letters, the Bombe ring short-circuits false rotor windows like AAA in microseconds and halts cleanly on BOM.',
  },
  'keinebesonderen-1942': {
    badge: 'Case 02 · Mid-Message Crib & Non-Zero Rings',
    origin: '1942 · Army Group Sector Situation Report',
    difficulty: 'Intermediate · Offset +26 · Rings 03-09-15 (C-I-O)',
    cribRationale:
      'Routine quiet-sector dispatches consistently embedded the stereotyped phrase KEINE BESONDEREN EREIGNISSE ("no special events"). The 21-letter crib BESONDERENEREIGNISSE sits at offset +26 and includes non-default Ringstellung settings.',
    spacedPlaintext:
      'ANGRIFF BEFEHL VERTAGT X KEINE BESONDEREN EREIGNISSE IM ABSCHNITT SUED X VERSORGUNGSLAGE UNVERAENDERT GUT',
    englishGloss:
      'Attack order postponed. No special events in south sector. Supply situation unchanged good.',
    takeaway:
      'Long cribs crush false offsets via reflector collisions and build dense multi-loop menus. Note how partial un-steckered decryption at GRK already lifts IoC dramatically before cables are finished.',
  },
  'bletchley-en-demo': {
    badge: 'Case 03 · Unsteckered Channel Dispatch',
    origin: 'Training Intercept · Commercial / Unplugged Network',
    difficulty: 'Focused · Offset +42 · 0 Plugs',
    cribRationale:
      'Certain administrative or test links operated without Steckerbrett patch cables. Here WEATHERFORECAST sits deep at offset +42, illustrating how Bombe self-pairings (E↔E, T↔T) emerge directly when no plugboard swaps exist.',
    spacedPlaintext:
      'PRIORITY DISPATCH TO THE BLETCHLEY PARK STATION X WEATHERFORECAST INDICATES CLEAR SKIES OVER CHANNEL SECTOR',
    englishGloss:
      'Natively English dispatch (no translation needed). Unplugged rotor decryption immediately restores crisp English bigram statistics.',
    takeaway:
      'Without plugboard confusion, the true rotor window TUR leaves only self-consistent diagonal pairs and boosts Shannon/Deciban scores from noise straight into native English.',
  },
};

const STEPS = [
  { num: 1, short: '1. Intercept & Stats', title: 'Intercept & Statistical Triage (H₀ vs H₁)' },
  { num: 2, short: '2. Crib Collisions', title: 'Crib Sliding & Reflector Exclusion' },
  { num: 3, short: '3. Turing Menu', title: 'Menu Construction & Closed Loops' },
  { num: 4, short: '4. Bombe Test', title: 'Bombe Drum Contradiction vs. Stop' },
  { num: 5, short: '5. Stat Check', title: 'Statistical Verification & Plug Recovery' },
  { num: 6, short: '6. Full Decrypt', title: 'Recovered Daily Key & Plaintext Output' },
] as const;

interface DecryptionWalkthroughPanelProps {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  onOpenInEnigma: (presetId: string, config: EnigmaConfig, ciphertext: string) => void;
  onOpenInBombe: (presetId: string) => void;
  onOpenInStats: (presetId: string) => void;
}

function groupInFives(text: string): string {
  const clean = normalizeAsciiLetters(text);
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 5) {
    chunks.push(clean.slice(i, i + 5));
  }
  return chunks.join(' ');
}

function formatPlugPairs(plugs: PlugPair[]): string {
  if (plugs.length === 0) return 'NONE (0 cables)';
  return plugs.map(([a, b]) => `${a}${b}`).join(' ');
}

function formatRingNums(rings: [number, number, number]): string {
  return rings.map((r) => String(r + 1).padStart(2, '0')).join('-');
}

export const DecryptionWalkthroughPanel: React.FC<DecryptionWalkthroughPanelProps> = ({
  selectedPresetId,
  onSelectPreset,
  onOpenInEnigma,
  onOpenInBombe,
  onOpenInStats,
}) => {
  const activePreset = useMemo(
    () => HISTORICAL_PRESETS.find((p) => p.id === selectedPresetId) ?? HISTORICAL_PRESETS[0],
    [selectedPresetId],
  );

  const meta = CASE_STUDY_META[activePreset.id] ?? CASE_STUDY_META['wetterbericht-1941'];

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showAllSteps, setShowAllSteps] = useState<boolean>(false);
  const [cribOffset, setCribOffset] = useState<number>(activePreset.expectedOffset);
  const [testRegisterIdx, setTestRegisterIdx] = useState<number | undefined>(undefined);
  const [falseWindow, setFalseWindow] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    setCribOffset(activePreset.expectedOffset);
    setTestRegisterIdx(undefined);
    setFalseWindow(
      activePreset.config.rotorPositions[0] === 0 &&
        activePreset.config.rotorPositions[1] === 0 &&
        activePreset.config.rotorPositions[2] === 0
        ? [1, 1, 1]
        : [0, 0, 0],
    );
  }, [activePreset]);

  // Step 1: Deterministic live ciphertext generation & statistical baselines
  const ciphertext = useMemo(() => {
    const machine = new EnigmaM3(activePreset.config);
    return machine.encryptText(activePreset.plaintext).ciphertext;
  }, [activePreset]);

  const cipherStats = useMemo(
    () => computeStatisticalReport(ciphertext, activePreset.targetLanguage),
    [ciphertext, activePreset.targetLanguage],
  );

  const plainStats = useMemo(
    () => computeStatisticalReport(activePreset.plaintext, activePreset.targetLanguage),
    [activePreset.plaintext, activePreset.targetLanguage],
  );

  // Step 2: Crib scanning across all possible offsets
  const alignments = useMemo(
    () => findValidCribAlignments(ciphertext, activePreset.crib),
    [ciphertext, activePreset.crib],
  );

  const validAlignments = useMemo(
    () => alignments.filter((a) => a.isValid),
    [alignments],
  );

  const firstCollisionAlignment = useMemo(
    () => alignments.find((a) => !a.isValid) ?? alignments[0],
    [alignments],
  );

  const clampedOffset = Math.max(0, Math.min(cribOffset, Math.max(0, alignments.length - 1)));
  const activeAlignment = alignments[clampedOffset];

  // Step 3: Build Turing Menu at valid offset (fall back to true offset if user parked on invalid)
  const menuOffset = activeAlignment?.isValid ? clampedOffset : activePreset.expectedOffset;
  const menu = useMemo(
    () => buildBombeMenu(ciphertext, activePreset.crib, menuOffset),
    [ciphertext, activePreset.crib, menuOffset],
  );

  const selectedRegister = useMemo(() => {
    if (testRegisterIdx !== undefined) return testRegisterIdx;
    return menu.testRegisterIdx;
  }, [testRegisterIdx, menu.testRegisterIdx]);

  // Step 4: Live Bombe Drum hypotheses for wrong window vs true window
  const falseTraces = useMemo(
    () =>
      inspectBombeHypotheses(
        menu,
        activePreset.config.rotors,
        activePreset.config.reflector,
        activePreset.config.ringSettings,
        falseWindow,
        selectedRegister,
      ),
    [menu, activePreset.config, falseWindow, selectedRegister],
  );

  const trueTraces = useMemo(
    () =>
      inspectBombeHypotheses(
        menu,
        activePreset.config.rotors,
        activePreset.config.reflector,
        activePreset.config.ringSettings,
        activePreset.config.rotorPositions,
        selectedRegister,
      ),
    [menu, activePreset.config, selectedRegister],
  );

  const consistentFalse = useMemo(
    () => falseTraces.filter((t) => t.consistent),
    [falseTraces],
  );
  const consistentTrue = useMemo(
    () => trueTraces.filter((t) => t.consistent),
    [trueTraces],
  );

  // Step 5: 3-stage decryption comparison (wrong rotor, right rotor w/ 0 plugs, full key)
  const wrongRotorDecrypt = useMemo(() => {
    const m = new EnigmaM3({
      ...activePreset.config,
      rotorPositions: falseWindow,
      plugboard: [],
    });
    return m.encryptText(ciphertext).ciphertext;
  }, [activePreset.config, falseWindow, ciphertext]);

  const unsteckeredDecrypt = useMemo(() => {
    const m = new EnigmaM3({
      ...activePreset.config,
      plugboard: [],
    });
    return m.encryptText(ciphertext).ciphertext;
  }, [activePreset.config, ciphertext]);

  const fullDecrypt = useMemo(() => {
    const m = new EnigmaM3(activePreset.config);
    return m.encryptText(ciphertext).ciphertext;
  }, [activePreset.config, ciphertext]);

  const wrongRotorStats = useMemo(
    () => computeStatisticalReport(wrongRotorDecrypt, activePreset.targetLanguage),
    [wrongRotorDecrypt, activePreset.targetLanguage],
  );
  const unsteckeredStats = useMemo(
    () => computeStatisticalReport(unsteckeredDecrypt, activePreset.targetLanguage),
    [unsteckeredDecrypt, activePreset.targetLanguage],
  );
  const fullStats = useMemo(
    () => computeStatisticalReport(fullDecrypt, activePreset.targetLanguage),
    [fullDecrypt, activePreset.targetLanguage],
  );

  const isVisible = (stepNum: number) => showAllSteps || currentStep === stepNum;

  return (
    <div className="space-y-6">
      {/* Header & Case Study Selector */}
      <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Guided Cryptanalysis Pipeline
              </span>
              <InfoTooltip
                title="How Enigma Was Broken"
                text="Bletchley Park did not brute-force all 10^20 Enigma keys. Instead, analysts chained statistical triage, reflector-excluded cribs, Turing loop menus, and electrical Bombe contradiction tests to collapse 150 trillion plugboard swaps in milliseconds."
              />
            </div>
            <h2 className="mt-2 font-mono text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
              Step-by-Step Enigma Decryption Walkthrough
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">
              Select a worked historical intercept below and walk sequentially through all six phases from raw Morse radio groups to recovered key and readable plaintext. Every metric, collision cell, loop, and Bombe lamp below is computed live by the simulation engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllSteps((v) => !v)}
              className={`rounded border px-3 py-1.5 font-mono text-xs transition ${
                showAllSteps
                  ? 'border-sky-500/60 bg-sky-950/30 text-sky-300'
                  : 'border-zinc-700 bg-[#08090c] text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {showAllSteps ? 'View: All 6 Steps' : 'View: Guided Step-by-Step'}
            </button>
          </div>
        </div>

        {/* 3 Case Study Cards */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {HISTORICAL_PRESETS.map((preset) => {
            const pMeta = CASE_STUDY_META[preset.id];
            const active = preset.id === activePreset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`rounded-md border p-3.5 text-left transition ${
                  active
                    ? 'border-amber-500/60 bg-amber-950/15'
                    : 'border-zinc-800 bg-[#08090c] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${
                      active ? 'text-amber-300' : 'text-zinc-500'
                    }`}
                  >
                    {pMeta?.badge ?? preset.targetLanguage}
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {preset.targetLanguage}
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-xs font-bold text-zinc-100">
                  {preset.titleEn}
                </div>
                <div className="mt-1 font-mono text-[11px] text-zinc-400">
                  Crib: <span className="text-sky-300">{preset.crib}</span> · Offset{' '}
                  <span className="text-emerald-300">+{preset.expectedOffset}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-zinc-500">
                  {pMeta?.difficulty}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Navigation Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 bg-[#08090c] p-2.5">
          <div className="flex flex-wrap gap-1.5">
            {STEPS.map((s) => {
              const active = !showAllSteps && currentStep === s.num;
              const visited = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    setShowAllSteps(false);
                    setCurrentStep(s.num);
                  }}
                  className={`rounded px-2.5 py-1.5 font-mono text-[11px] transition ${
                    active
                      ? 'border border-amber-500/50 bg-amber-950/30 font-semibold text-amber-300'
                      : visited
                        ? 'border border-emerald-900/50 bg-emerald-950/15 text-emerald-300/90 hover:border-emerald-700'
                        : 'border border-zinc-800 bg-[#0d0e12] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {s.short}
                </button>
              );
            })}
          </div>

          {!showAllSteps && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentStep <= 1}
                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                className="rounded border border-zinc-700 bg-[#0d0e12] px-2.5 py-1 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="font-mono text-[11px] text-zinc-500">
                Step {currentStep} / 6
              </span>
              <button
                type="button"
                disabled={currentStep >= 6}
                onClick={() => setCurrentStep((s) => Math.min(6, s + 1))}
                className="rounded border border-amber-500/40 bg-amber-950/20 px-2.5 py-1 font-mono text-xs font-semibold text-amber-300 transition hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* STEP 1: Intercept & Statistical Triage */}
      {isVisible(1) && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                STEP 1
              </span>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                {STEPS[0].title}
              </h3>
              <InfoTooltip
                title="Why Start with Statistics?"
                text="Before spending Bombe time, intercept operators check whether a message is genuinely polyalphabetic (uniform randomness, Null Hypothesis H0) rather than a simple monoalphabetic substitution or unencrypted transmission (Alternative Hypothesis H1)."
              />
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              {meta.origin} · {ciphertext.length} chars
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-zinc-300">
            British Y-Service listening posts copied encrypted Morse transmissions in 5-letter groups. Below is the intercepted radio tape for{' '}
            <span className="font-mono font-semibold text-amber-300">{activePreset.titleEn}</span>.
          </p>

          {/* Intercept Paper Tape */}
          <div className="mt-3 rounded border border-zinc-800 bg-[#08090c] p-3">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              <span>Intercepted Radio Tape (5-Letter Morse Groups)</span>
              <span>Target Language: {activePreset.targetLanguage}</span>
            </div>
            <div className="paper-tape rounded px-3 py-2.5 font-mono text-xs leading-relaxed tracking-widest text-zinc-900">
              {groupInFives(ciphertext)}
            </div>
          </div>

          {/* H0 vs H1 Comparison */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-rose-300">
                  Observed Ciphertext Profile (H₀: Uniform Noise)
                </span>
                <InfoTooltip
                  title="Ciphertext Flatness"
                  text="Because Enigma steps a rotor on every single keystroke, single-letter frequencies flatten toward 1/26 (3.85%), giving an Index of Coincidence near 0.0385 and negative Deciban log-odds."
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Index of Coincidence</div>
                  <div className="mt-0.5 font-bold text-rose-300">{cipherStats.ioc.toFixed(4)}</div>
                  <div className="text-[10px] text-zinc-500">Random floor ≈ 0.0385</div>
                </div>
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Shannon Entropy</div>
                  <div className="mt-0.5 font-bold text-zinc-200">{cipherStats.shannonEntropy.toFixed(3)} bits</div>
                  <div className="text-[10px] text-zinc-500">Max 26-letter = 4.700</div>
                </div>
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Deciban Weight</div>
                  <div className="mt-0.5 font-bold text-rose-300">
                    {cipherStats.totalDecibans >= 0 ? '+' : ''}
                    {cipherStats.totalDecibans.toFixed(1)} db
                  </div>
                  <div className="text-[10px] text-zinc-500">&lt; 0 favors H₀ random</div>
                </div>
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Pearson χ²</div>
                  <div className="mt-0.5 font-bold text-zinc-200">{cipherStats.chiSquared.toFixed(1)}</div>
                  <div className="text-[10px] text-zinc-500">Expect high if structured</div>
                </div>
              </div>
            </div>

            <div className="rounded border border-emerald-900/50 bg-[#08090c] p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-emerald-300">
                  Target Plaintext Benchmark (H₁: {activePreset.targetLanguage} Structure)
                </span>
                <InfoTooltip
                  title="Plaintext Target Signal"
                  text="When we eventually recover the exact Enigma rotors and plugs, deciban evidence and IoC will jump from the random floor (~0.0385) up to these target natural-language values."
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Expected IoC</div>
                  <div className="mt-0.5 font-bold text-emerald-300">{plainStats.ioc.toFixed(4)}</div>
                  <div className="text-[10px] text-zinc-500">
                    Target {activePreset.targetLanguage} ≈{' '}
                    {activePreset.targetLanguage === 'DE' ? '0.0762' : '0.0667'}
                  </div>
                </div>
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Shannon Entropy</div>
                  <div className="mt-0.5 font-bold text-zinc-200">{plainStats.shannonEntropy.toFixed(3)} bits</div>
                  <div className="text-[10px] text-zinc-500">Structured redundancy</div>
                </div>
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Deciban Weight</div>
                  <div className="mt-0.5 font-bold text-emerald-300">
                    {plainStats.totalDecibans >= 0 ? '+' : ''}
                    {plainStats.totalDecibans.toFixed(1)} db
                  </div>
                  <div className="text-[10px] text-zinc-500">Strong H₁ confirmation</div>
                </div>
                <div className="rounded bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Pearson χ²</div>
                  <div className="mt-0.5 font-bold text-emerald-300">{plainStats.chiSquared.toFixed(1)}</div>
                  <div className="text-[10px] text-zinc-500">Sharp letter peaks</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded border border-zinc-800 bg-[#08090c] p-3 text-xs text-zinc-400">
            <span className="font-mono font-semibold text-amber-300">Diagnosis:</span> Because IoC ={' '}
            <span className="font-mono text-zinc-200">{cipherStats.ioc.toFixed(4)}</span> sits squarely inside uniform polyalphabetic noise, simple frequency counting is blind. To attack Enigma, we need a probable plaintext snippet—a{' '}
            <span className="font-mono text-sky-300">Crib</span>.
          </div>
        </section>
      )}

      {/* STEP 2: Crib Selection & Reflector Collision Elimination */}
      {isVisible(2) && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                STEP 2
              </span>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                {STEPS[1].title}
              </h3>
              <InfoTooltip
                title="Reflector Theorem: E(x) ≠ x"
                text="Current goes forward through 3 rotors, bounces off the Umkehrwalze (Reflector) onto a DIFFERENT wire, and returns along the inverse path. Therefore Enigma can NEVER encrypt a letter into itself—giving us a free algebraic sieve."
              />
            </div>
            <div className="font-mono text-xs">
              <span className="text-zinc-400">Eliminated offsets: </span>
              <span className="font-bold text-rose-300">
                {alignments.length - validAlignments.length} / {alignments.length}
              </span>
              <span className="ml-2 text-zinc-400">Remaining: </span>
              <span className="font-bold text-emerald-300">{validAlignments.length}</span>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-zinc-300">
            {meta.cribRationale}
          </p>

          {/* Interactive Offset Controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 bg-[#08090c] p-3">
            <div className="flex flex-wrap items-center gap-2">
              {firstCollisionAlignment && (
                <button
                  type="button"
                  onClick={() => setCribOffset(firstCollisionAlignment.offset)}
                  className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
                    clampedOffset === firstCollisionAlignment.offset
                      ? 'border-rose-500 bg-rose-950/40 font-semibold text-rose-300'
                      : 'border-rose-800/60 bg-rose-950/15 text-rose-300 hover:border-rose-500'
                  }`}
                >
                  Inspect Invalid Collision (+{firstCollisionAlignment.offset})
                </button>
              )}
              <button
                type="button"
                onClick={() => setCribOffset(activePreset.expectedOffset)}
                className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
                  clampedOffset === activePreset.expectedOffset
                    ? 'border-emerald-500 bg-emerald-950/40 font-semibold text-emerald-300'
                    : 'border-emerald-800/60 bg-emerald-950/15 text-emerald-300 hover:border-emerald-500'
                }`}
              >
                Inspect True Valid Alignment (+{activePreset.expectedOffset})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCribOffset((o) => Math.max(0, o - 1))}
                className="rounded border border-zinc-700 bg-[#0d0e12] px-2 py-1 font-mono text-xs text-zinc-300 hover:border-zinc-500"
              >
                ← Slide
              </button>
              <span className="font-mono text-xs font-bold text-zinc-200">
                Offset +{clampedOffset} (Pos {clampedOffset + 1}..{clampedOffset + activePreset.crib.length})
              </span>
              <button
                type="button"
                onClick={() => setCribOffset((o) => Math.min(alignments.length - 1, o + 1))}
                className="rounded border border-zinc-700 bg-[#0d0e12] px-2 py-1 font-mono text-xs text-zinc-300 hover:border-zinc-500"
              >
                Slide →
              </button>
            </div>
          </div>

          {/* Status Banner */}
          {activeAlignment && (
            <div
              className={`mt-3 rounded border px-3 py-2 font-mono text-xs ${
                activeAlignment.isValid
                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                  : 'border-rose-500/50 bg-rose-950/25 text-rose-300'
              }`}
            >
              {activeAlignment.isValid
                ? `✓ VALID ALIGNMENT at offset +${clampedOffset} (0 reflector self-encryptions). Menu & loops unlocked!`
                : `✕ IMPOSSIBLE ALIGNMENT at offset +${clampedOffset}: ${activeAlignment.collisionIndices.length} reflector collision(s) at position(s) ${activeAlignment.collisionIndices
                    .map((idx) => idx + 1)
                    .join(', ')}. Ruled out immediately!`}
            </div>
          )}

          {/* 4-Row Alignment Window */}
          <div className="mt-3 overflow-x-auto rounded border border-zinc-800 bg-[#08090c] p-3">
            <div className="inline-flex min-w-full gap-1">
              <div className="mr-2 flex flex-col justify-between py-1 font-mono text-[10px] text-zinc-500">
                <span>Pos</span>
                <span>Cipher</span>
                <span>Crib</span>
                <span>Rule</span>
              </div>
              {Array.from({ length: activePreset.crib.length }).map((_, idx) => {
                const msgPos = clampedOffset + idx;
                const cChar = ciphertext[msgPos] ?? '-';
                const pChar = activePreset.crib[idx];
                const crash = cChar === pChar;
                return (
                  <div
                    key={idx}
                    className={`flex w-8 shrink-0 flex-col items-center rounded border py-1 font-mono text-xs ${
                      crash
                        ? 'border-rose-500/70 bg-rose-950/40 text-rose-200'
                        : 'border-emerald-700/40 bg-emerald-950/15 text-zinc-100'
                    }`}
                  >
                    <span className="text-[9px] text-zinc-500">{msgPos + 1}</span>
                    <span className="font-bold text-sky-300">{cChar}</span>
                    <span className="font-bold text-amber-300">{pChar}</span>
                    <span className={`text-[10px] font-bold ${crash ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {crash ? '✕' : '✓'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offset Map */}
          <div className="mt-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              All Candidate Offsets (click any pill to inspect — red = eliminated by E(x)≠x)
            </div>
            <div className="flex flex-wrap gap-1">
              {alignments.map((a) => {
                const isSelected = a.offset === clampedOffset;
                const isTrue = a.offset === activePreset.expectedOffset;
                return (
                  <button
                    key={a.offset}
                    type="button"
                    onClick={() => setCribOffset(a.offset)}
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition ${
                      isSelected
                        ? a.isValid
                          ? 'border-emerald-400 bg-emerald-500/25 font-bold text-emerald-200'
                          : 'border-rose-400 bg-rose-500/25 font-bold text-rose-200'
                        : a.isValid
                          ? isTrue
                            ? 'border-amber-500/50 bg-emerald-950/20 text-amber-300'
                            : 'border-emerald-900/50 bg-[#08090c] text-emerald-400/80 hover:border-emerald-600'
                          : 'border-rose-900/50 bg-rose-950/20 text-rose-400/80 hover:border-rose-700'
                    }`}
                  >
                    +{a.offset}
                    {!a.isValid ? `(${a.collisionIndices.length})` : isTrue ? '★' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: Turing Menu & Closed Loops */}
      {isVisible(3) && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                STEP 3
              </span>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                {STEPS[2].title}
              </h3>
              <InfoTooltip
                title="Why Closed Loops Defeat the Plugboard"
                text="Each crib letter pair (Plain ↔ Cipher at rotor step k) defines a constraint S(Plain) = E_k(S(Cipher)). Along a closed cycle of letters, plugboard outputs chain directly back into the starting node—so Alan Turing's Bombe only needs to guess 1 plug pair on the starting node to test the entire rotor position!"
              />
            </div>
            <div className="font-mono text-xs text-zinc-400">
              Menu at Offset <span className="text-emerald-300">+{menuOffset}</span> ·{' '}
              Nodes: <span className="text-zinc-100">{menu.nodes.length}</span> ·{' '}
              Edges: <span className="text-zinc-100">{menu.edges.length}</span> ·{' '}
              Closed Loops:{' '}
              <span className={menu.cycles.length > 0 ? 'font-bold text-amber-300' : 'text-zinc-300'}>
                {menu.cycles.length}
              </span>
            </div>
          </div>

          {!activeAlignment?.isValid && (
            <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/20 px-3 py-2 font-mono text-xs text-amber-300">
              Note: Offset +{clampedOffset} had a collision, so the Turing Menu below automatically displays valid offset +{menuOffset}.
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Bidirectional Edges Table */}
            <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-zinc-200">
                  Extracted Crib-Cipher Pairings ({menu.edges.length} links)
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  Key: Rotor Pos → Letter ↔ Letter
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {menu.edges.map((edge, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-zinc-800 bg-[#0d0e12] px-2 py-1 font-mono text-xs"
                  >
                    <span className="text-[10px] text-zinc-500">p{edge.messageIndex + 1}: </span>
                    <span className="font-bold text-amber-300">{edge.from}</span>
                    <span className="text-zinc-500"> ↔ </span>
                    <span className="font-bold text-sky-300">{edge.to}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Closed Loops & Algebraic Intuition */}
            <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-amber-300">
                  Detected Closed Loops &amp; Test Register
                </span>
                <InfoTooltip
                  title="Strongest Test Register"
                  text="Analysts picked the letter node with the highest degree / cycle participation (here highlighted as the test register) to maximize electrical feedback on the Bombe's 26-wire bank."
                />
              </div>

              {menu.cycles.length > 0 ? (
                <div className="space-y-2">
                  {menu.cycles.slice(0, 4).map((cycle, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-amber-500/30 bg-[#0d0e12] px-2.5 py-2 font-mono text-xs"
                    >
                      <span className="text-[10px] font-semibold uppercase text-amber-400">
                        Loop #{idx + 1} (len {cycle.length}):{' '}
                      </span>
                      <span className="text-zinc-200">
                        {cycle.nodes.join(' → ')}
                      </span>
                    </div>
                  ))}
                  {menu.cycles.length > 4 && (
                    <div className="font-mono text-[11px] text-zinc-500">
                      + {menu.cycles.length - 4} additional cycle(s) available for cross-checking
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2.5 font-mono text-xs text-zinc-400">
                  This particular alignment forms a tree ({menu.nodes.length} nodes, {menu.edges.length} edges) without a closed cycle—still solvable via connected branching chains, though closed loops create the sharpest contradictions.
                </div>
              )}

              <div className="mt-3 rounded border border-zinc-800 bg-[#0d0e12] p-2.5 text-xs text-zinc-400">
                <div className="font-mono text-[11px] text-emerald-300">
                  Selected Test Register:{' '}
                  <span className="font-bold">{indexToChar(selectedRegister)}</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  Suppose <span className="font-mono text-zinc-200">{indexToChar(selectedRegister)}</span> is plugged to some unknown letter <span className="font-mono text-sky-300">X</span>. Around every loop edge, each Enigma scrambler transforms <span className="font-mono text-zinc-200">X</span> forward—and only a matching rotor core maps it cleanly back without lighting contradictory cables!
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 4: Bombe Drum Test & Diagonal Board Contradiction vs. Stop */}
      {isVisible(4) && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                STEP 4
              </span>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                {STEPS[3].title}
              </h3>
              <InfoTooltip
                title="Why 25/26 vs 26/26 Matters (Diagonal Board)"
                text="Gordon Welchman's Diagonal Board enforces reciprocal cables: if A connects to M, then M MUST connect to A. For a wrong rotor window, voltage floods back and lights ALL 26 lamps (contradiction -> ignore position). For the true rotor window, ONLY the genuine Stecker partner avoids flooding—causing a BOMBE STOP!"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-400">Test Node:</span>
              <select
                value={selectedRegister}
                onChange={(e) => setTestRegisterIdx(Number(e.target.value))}
                className="rounded border border-zinc-700 bg-[#08090c] px-2 py-1 font-mono text-xs text-amber-300 focus:border-amber-500 focus:outline-none"
              >
                {menu.nodes.map((node) => (
                  <option key={node.index} value={node.index} className="bg-zinc-900">
                    Node {node.char} (Deg {node.degree})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-zinc-300">
            Watch the Bombe evaluate all 26 possible Stecker hypotheses for node{' '}
            <span className="font-mono font-bold text-amber-300">{indexToChar(selectedRegister)}</span>{' '}
            across two concrete rotor settings under{' '}
            <span className="font-mono text-zinc-200">
              {activePreset.config.rotors.join('-')} / {activePreset.config.reflector} / Rings{' '}
              {formatRingNums(activePreset.config.ringSettings)}
            </span>
            :
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* False Rotor Setting -> Short Circuit */}
            <div className="rounded border border-rose-900/60 bg-[#08090c] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400">
                    False Rotor Candidate
                  </span>
                  <div className="font-mono text-sm font-bold text-zinc-100">
                    Window: {formatPositionLabel(falseWindow)}
                  </div>
                </div>
                <span className="rounded border border-rose-500/50 bg-rose-950/40 px-2.5 py-1 font-mono text-xs font-bold text-rose-300">
                  {consistentFalse.length === 0
                    ? '✕ 0/26 Consistent — REJECTED'
                    : `${consistentFalse.length}/26 Branches`}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {falseTraces.map((tr) => (
                  <div
                    key={tr.assumedPartnerIdx}
                    title={`${indexToChar(selectedRegister)}-${tr.assumedPartner}: ${
                      tr.consistent
                        ? 'Consistent'
                        : `Contradiction (${tr.contradictedNodes.length} node(s), ${tr.propagatedSteps} steps)`
                    }`}
                    className={`flex h-7 items-center justify-center rounded border font-mono text-[11px] font-bold ${
                      tr.consistent
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-rose-900/60 bg-rose-950/30 text-rose-400/80'
                    }`}
                  >
                    {ALPHABET[tr.assumedPartnerIdx]}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                Every single assumed cable for <span className="font-mono text-zinc-200">{indexToChar(selectedRegister)}</span> floods the diagonal board with self-contradicting feedback. The Bombe motor does not stop and moves immediately to the next rotor step.
              </p>
            </div>

            {/* True Rotor Setting -> BOMBE STOP */}
            <div className="rounded border border-emerald-700/60 bg-[#08090c] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                    True Target Window
                  </span>
                  <div className="font-mono text-sm font-bold text-amber-300">
                    Window: {formatPositionLabel(activePreset.config.rotorPositions)}
                  </div>
                </div>
                <span className="rounded border border-emerald-500/60 bg-emerald-950/40 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                  ★ BOMBE STOP ({consistentTrue.length}/26 Survive)
                </span>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {trueTraces.map((tr) => (
                  <div
                    key={tr.assumedPartnerIdx}
                    title={`${indexToChar(selectedRegister)}-${tr.assumedPartner}: ${
                      tr.consistent ? 'CONSISTENT STOP' : 'Contradiction'
                    }`}
                    className={`flex h-7 items-center justify-center rounded border font-mono text-[11px] font-bold transition ${
                      tr.consistent
                        ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                        : 'border-zinc-800 bg-[#0d0e12] text-zinc-600'
                    }`}
                  >
                    {ALPHABET[tr.assumedPartnerIdx]}
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-zinc-300">
                <div>
                  Surviving pairing(s) on{' '}
                  <span className="font-mono font-bold text-amber-300">
                    {indexToChar(selectedRegister)}
                  </span>
                  :{' '}
                  <span className="font-mono font-bold text-emerald-300">
                    {consistentTrue
                      .map((tr) => `${indexToChar(selectedRegister)}↔${tr.assumedPartner}`)
                      .join(', ')}
                  </span>
                </div>
                {consistentTrue[0]?.deducedPairs.length > 0 && (
                  <div>
                    Chain-deduced Stecker cables from stop:{' '}
                    <span className="font-mono text-sky-300">
                      {consistentTrue[0].deducedPairs
                        .slice(0, 10)
                        .map(([a, b]) => `${a}${b}`)
                        .join(' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 5: Statistical Verification & Plugboard Completion */}
      {isVisible(5) && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                STEP 5
              </span>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                {STEPS[4].title}
              </h3>
              <InfoTooltip
                title="From Bombe Stop to Full Plugboard"
                text="Even when a Bombe Stop recovers only the rotor core plus a few direct cables, plugging those in leaves the remaining unplugged letters passing straight through—producing readable word fragments and an immediate statistical jump in IoC and Decibans so cryptanalysts can spot the last cables by inspection."
              />
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-zinc-300">
            Compare the three stages of decryption for this intercept—watch how statistical signals confirm the true rotor setting even before every plug is patched, and lock in once the full Steckerbrett is wired:
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {/* Stage A: Wrong Rotors */}
            <div className="rounded border border-rose-900/50 bg-[#08090c] p-3.5">
              <div className="font-mono text-xs font-bold text-rose-300">
                1. Wrong Rotors ({formatPositionLabel(falseWindow)})
              </div>
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-zinc-400">
                <span>
                  IoC: <strong className="text-rose-300">{wrongRotorStats.ioc.toFixed(4)}</strong>
                </span>
                <span>
                  Decibans:{' '}
                  <strong className="text-rose-300">
                    {wrongRotorStats.totalDecibans >= 0 ? '+' : ''}
                    {wrongRotorStats.totalDecibans.toFixed(1)}
                  </strong>
                </span>
              </div>
              <div className="mt-2.5 rounded border border-zinc-800 bg-[#0d0e12] p-2 font-mono text-[11px] leading-relaxed tracking-wider text-zinc-400 break-all">
                {wrongRotorDecrypt.slice(0, 65)}...
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">
                Pure gibberish. Zero linguistic signal.
              </div>
            </div>

            {/* Stage B: True Rotors, 0 Plugs */}
            <div className="rounded border border-amber-700/50 bg-[#08090c] p-3.5">
              <div className="font-mono text-xs font-bold text-amber-300">
                2. True Rotors ({formatPositionLabel(activePreset.config.rotorPositions)}) · 0 Plugs
              </div>
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-zinc-400">
                <span>
                  IoC: <strong className="text-amber-300">{unsteckeredStats.ioc.toFixed(4)}</strong>
                </span>
                <span>
                  Decibans:{' '}
                  <strong className="text-amber-300">
                    {unsteckeredStats.totalDecibans >= 0 ? '+' : ''}
                    {unsteckeredStats.totalDecibans.toFixed(1)}
                  </strong>
                </span>
              </div>
              <div className="mt-2.5 rounded border border-zinc-800 bg-[#0d0e12] p-2 font-mono text-[11px] leading-relaxed tracking-wider text-zinc-200 break-all">
                {unsteckeredDecrypt.slice(0, 65)}...
              </div>
              <div className="mt-2 text-[11px] text-zinc-400">
                {activePreset.config.plugboard.length === 0
                  ? 'Unsteckered network: already 100% decoded!'
                  : 'True rotor alignment: partial plain characters bleed through, raising IoC above random noise and pointing directly to missing cables.'}
              </div>
            </div>

            {/* Stage C: Full Key + Recovered Plugs */}
            <div className="rounded border border-emerald-700/60 bg-[#08090c] p-3.5">
              <div className="font-mono text-xs font-bold text-emerald-300">
                3. Full Key + Steckerbrett ({activePreset.config.plugboard.length} Plugs)
              </div>
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-zinc-400">
                <span>
                  IoC: <strong className="text-emerald-300">{fullStats.ioc.toFixed(4)}</strong>
                </span>
                <span>
                  Decibans:{' '}
                  <strong className="text-emerald-300">
                    {fullStats.totalDecibans >= 0 ? '+' : ''}
                    {fullStats.totalDecibans.toFixed(1)}
                  </strong>
                </span>
              </div>
              <div className="mt-2.5 rounded border border-emerald-900/50 bg-[#0d0e12] p-2 font-mono text-[11px] leading-relaxed tracking-wider text-emerald-200 break-all">
                {fullDecrypt.slice(0, 65)}...
              </div>
              <div className="mt-2 text-[11px] text-emerald-300/90">
                Exact crib &amp; full plaintext verified. Statistical hypothesis H₁ confirmed!
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 6: Complete Decrypted Message & Hand-Off */}
      {isVisible(6) && (
        <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                STEP 6
              </span>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                {STEPS[5].title}
              </h3>
              <InfoTooltip
                title="Reciprocity Verification"
                text="Because Enigma is reciprocal, typing the ciphertext back into an Enigma M3 configured with the exact recovered daily and message keys automatically reproduces the original plaintext letter-for-letter."
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Recovered Key Card */}
            <div className="rounded border border-zinc-800 bg-[#08090c] p-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                Recovered Fixed Daily Key (Tagesschlüssel)
              </div>
              <dl className="mt-2.5 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between gap-2 border-b border-zinc-800/70 pb-1">
                  <dt className="text-zinc-500">Walzenlage (Rotor Order)</dt>
                  <dd className="font-bold text-zinc-100">
                    {activePreset.config.rotors.join(' - ')}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-800/70 pb-1">
                  <dt className="text-zinc-500">Umkehrwalze (Reflector)</dt>
                  <dd className="font-bold text-zinc-100">{activePreset.config.reflector}</dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-800/70 pb-1">
                  <dt className="text-zinc-500">Ringstellung (Ring Setting)</dt>
                  <dd className="font-bold text-zinc-100">
                    {formatRingNums(activePreset.config.ringSettings)} (
                    {formatPositionLabel(activePreset.config.ringSettings)})
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-800/70 pb-1">
                  <dt className="text-zinc-500">Steckerbrett (Plugboard)</dt>
                  <dd className="font-bold text-amber-300">
                    {formatPlugPairs(activePreset.config.plugboard)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between rounded border border-rose-900/40 bg-rose-950/15 px-3 py-2 font-mono text-xs">
                <span className="text-rose-300">Message Key (Grundstellung)</span>
                <span className="text-sm font-bold tracking-widest text-amber-300">
                  {formatPositionLabel(activePreset.config.rotorPositions)}
                </span>
              </div>
            </div>

            {/* Decrypted Output & English Translation */}
            <div className="rounded border border-emerald-800/50 bg-[#08090c] p-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Complete Decrypted Plaintext
              </div>
              <div className="mt-2 rounded border border-zinc-800 bg-[#0d0e12] p-3 font-mono text-xs leading-relaxed tracking-wider text-emerald-200 break-all">
                {fullDecrypt}
              </div>
              <div className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Readable Word Spacing
              </div>
              <div className="mt-1 font-mono text-xs leading-relaxed text-zinc-200">
                {meta.spacedPlaintext}
              </div>
              <div className="mt-2 rounded bg-[#0d0e12] px-2.5 py-2 text-xs italic text-zinc-400">
                “{meta.englishGloss}”
              </div>
            </div>
          </div>

          <div className="mt-3 rounded border border-zinc-800 bg-[#08090c] p-3 text-xs text-zinc-400">
            <span className="font-mono font-semibold text-amber-300">Key Takeaway:</span>{' '}
            {meta.takeaway}
          </div>

          {/* Action Hand-Off Buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenInEnigma(activePreset.id, activePreset.config, ciphertext)}
              className="rounded border border-amber-500/60 bg-amber-950/30 px-3.5 py-2 font-mono text-xs font-semibold text-amber-300 transition hover:bg-amber-950/50"
            >
              Verify Decryption on Enigma M3 →
            </button>
            <button
              type="button"
              onClick={() => onOpenInBombe(activePreset.id)}
              className="rounded border border-sky-500/50 bg-sky-950/25 px-3.5 py-2 font-mono text-xs font-semibold text-sky-300 transition hover:bg-sky-950/45"
            >
              Inspect in Turing Bombe Tab →
            </button>
            <button
              type="button"
              onClick={() => onOpenInStats(activePreset.id)}
              className="rounded border border-emerald-500/50 bg-emerald-950/25 px-3.5 py-2 font-mono text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/45"
            >
              Inspect in Statistics Tab →
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
