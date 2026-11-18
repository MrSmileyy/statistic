import React, { useMemo, useState } from 'react';
import { buildBombeMenu, createBombeWorkspace, evaluatePositionOnBombe } from '../../core/bombe';
import {
  ALPHABET,
  formatPositionLabel,
  HISTORICAL_PRESETS,
  indexToChar,
  ROTORS,
} from '../../core/constants';
import { EnigmaM3, stepRotorPositions } from '../../core/enigma';
import type { EnigmaConfig, Language } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface ExamTheoryPanelProps {
  language?: Language;
}

interface SelfTestResult {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
}

interface DemoPresetOption {
  id: string;
  label: string;
  note: string;
  config: EnigmaConfig;
}

const WALKTHROUGH_CONFIGS: DemoPresetOption[] = [
  {
    id: 'bom-stecker',
    label: 'Preset BOM (With Steckerbrett)',
    note: 'Rotors I-II-III, UKW-B, Window BOM, Plugs AM FI NV PS TU WZ',
    config: HISTORICAL_PRESETS[0].config,
  },
  {
    id: 'aaa-clean',
    label: 'Vector AAA (No Plugboard)',
    note: 'Rotors I-II-III, UKW-B, Rings 01-01-01, Window AAA, 0 plugs',
    config: {
      rotors: ['I', 'II', 'III'],
      reflector: 'UKW-B',
      ringSettings: [0, 0, 0],
      rotorPositions: [0, 0, 0],
      plugboard: [],
    },
  },
  {
    id: 'aew-doublestep',
    label: 'Double-Step Trigger AEW -> BFX',
    note: 'Rotors I-II-III at AEW (middle rotor at notch E): pressing any key double-steps to BFX',
    config: {
      rotors: ['I', 'II', 'III'],
      reflector: 'UKW-B',
      ringSettings: [0, 0, 0],
      rotorPositions: [0, 4, 22], // AEW
      plugboard: [],
    },
  },
];

function runHistoricalSelfTests(): SelfTestResult[] {
  const m1 = new EnigmaM3({
    rotors: ['I', 'II', 'III'],
    reflector: 'UKW-B',
    ringSettings: [0, 0, 0],
    rotorPositions: [0, 0, 0],
    plugboard: [],
  });
  const vecOut = m1.encryptText('AAAAA').ciphertext;

  const s1 = stepRotorPositions(['I', 'II', 'III'], [0, 3, 20]);
  const s2 = stepRotorPositions(['I', 'II', 'III'], s1.next);
  const s3 = stepRotorPositions(['I', 'II', 'III'], s2.next);
  const seq = `${formatPositionLabel(s1.next)} -> ${formatPositionLabel(s2.next)} -> ${formatPositionLabel(s3.next)}`;

  const samplePlain = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG';
  const preset0 = HISTORICAL_PRESETS[0];
  const enc = new EnigmaM3(preset0.config).encryptText(samplePlain);
  const dec = new EnigmaM3(preset0.config).encryptText(enc.ciphertext);
  const noFixedPoints = enc.traces.every((tr) => tr.inputChar !== tr.lampChar);

  const cipher0 = new EnigmaM3(preset0.config).encryptText(preset0.plaintext).ciphertext;
  const menu = buildBombeMenu(cipher0, preset0.crib, preset0.expectedOffset);
  const ws = createBombeWorkspace(menu);
  const bombeRes = evaluatePositionOnBombe(
    ws,
    menu.testRegisterIdx,
    preset0.config.rotors,
    preset0.config.reflector,
    preset0.config.ringSettings,
    preset0.config.rotorPositions
  );

  return [
    {
      id: 'vector-bdzgo',
      label: 'Reference vector AAAAA -> BDZGO',
      detail: `I-II-III, UKW-B, AAA => ${vecOut}`,
      passed: vecOut === 'BDZGO',
    },
    {
      id: 'double-step',
      label: 'Middle rotor double-stepping (ADU -> BFX)',
      detail: seq,
      passed: seq === 'ADV -> AEW -> BFX' && s3.doubleStepped,
    },
    {
      id: 'involution',
      label: 'Reciprocity and E(x) != x',
      detail: `round-trip=${String(dec.ciphertext === samplePlain)}, noFixedPoints=${String(noFixedPoints)}`,
      passed: dec.ciphertext === samplePlain && noFixedPoints,
    },
    {
      id: 'bombe-stop',
      label: 'Bombe stop at preset key',
      detail: `key ${formatPositionLabel(preset0.config.rotorPositions)} => ${bombeRes.hypotheses.length} consistent hypothesis`,
      passed: menu.isValidAlignment && bombeRes.hypotheses.length > 0,
    },
  ];
}

function fmtContact(idx: number): string {
  return `${indexToChar(idx)} (${String(idx).padStart(2, '0')})`;
}

export const ExamTheoryPanel: React.FC<ExamTheoryPanelProps> = () => {
  const [selfTests, setSelfTests] = useState<SelfTestResult[] | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('bom-stecker');
  const [inputLetter, setInputLetter] = useState<string>('A');
  const [activeStage, setActiveStage] = useState<number>(0);

  const demoOption =
    WALKTHROUGH_CONFIGS.find((c) => c.id === selectedConfigId) ?? WALKTHROUGH_CONFIGS[0];

  const { trace, reverseChar } = useMemo(() => {
    const mFwd = new EnigmaM3(demoOption.config);
    const t = mFwd.encryptChar(inputLetter)!;
    const mRev = new EnigmaM3(demoOption.config);
    const rev = mRev.encryptChar(t.lampChar)!;
    return { trace: t, reverseChar: rev.lampChar };
  }, [demoOption, inputLetter]);

  const stages = [
    {
      id: 0,
      short: '0. Step Rotors',
      title: 'Step 0 — Mechanical Rotor Stepping (Before Current Flows)',
      tip: 'Before electricity moves, mechanical pawls rotate the right wheel by 1 step (and push middle/left wheels when notches align).',
      summary: `${formatPositionLabel(trace.rotorPositionsBefore)} → ${formatPositionLabel(trace.rotorPositionsAfter)}`,
      accent: 'text-amber-300',
    },
    {
      id: 1,
      short: '1. Plug In (S)',
      title: 'Step 1 — Keyboard & Plugboard Entry (Steckerbrett S)',
      tip: 'First pass through the front patch cables: swaps paired letters (or leaves unsteckered letters untouched).',
      summary: `${trace.inputChar} → ${indexToChar(trace.steckerInIdx)}`,
      accent: 'text-sky-300',
    },
    {
      id: 2,
      short: '2. Forward R→M→L',
      title: 'Step 2 — Forward Pass Through Rotors (Right → Middle → Left)',
      tip: 'Current scrambles right-to-left across three rotating discs whose entry/exit contacts shift with window & ring offsets.',
      summary: `${indexToChar(trace.rightInIdx)} → ${indexToChar(trace.rightOutIdx)} → ${indexToChar(trace.middleOutIdx)} → ${indexToChar(trace.leftOutIdx)}`,
      accent: 'text-sky-300',
    },
    {
      id: 3,
      short: '3. Reflector (U)',
      title: 'Step 3 — Reflector Turnaround (Umkehrwalze U)',
      tip: 'Fixed mirror disc swapping 13 pairs of pins—sends current back on a different wire so no letter can ever encrypt to itself.',
      summary: `${indexToChar(trace.reflectorInIdx)} ⇄ ${indexToChar(trace.reflectorOutIdx)}`,
      accent: 'text-amber-300',
    },
    {
      id: 4,
      short: '4. Return L⁻¹→R⁻¹',
      title: 'Step 4 — Return Pass Through Rotors (Left⁻¹ → Middle⁻¹ → Right⁻¹)',
      tip: 'Current returns left-to-right through the inverse internal wiring of the same three rotors.',
      summary: `${indexToChar(trace.reflectorOutIdx)} → ${indexToChar(trace.leftBackIdx)} → ${indexToChar(trace.middleBackIdx)} → ${indexToChar(trace.rightBackIdx)}`,
      accent: 'text-emerald-300',
    },
    {
      id: 5,
      short: '5. Plug Out & Lamp',
      title: 'Step 5 — Plugboard Exit (S⁻¹) & Lampboard Illumination',
      tip: 'Final pass back through the plugboard swaps the signal one last time and lights up the output bulb.',
      summary: `${indexToChar(trace.rightBackIdx)} → ${trace.lampChar}`,
      accent: 'text-emerald-300',
    },
  ];

  const [rL, rM, rR] = demoOption.config.rotors;
  const [ringL, ringM, ringR] = demoOption.config.ringSettings;
  const [posL, posM, posR] = trace.rotorPositionsAfter;

  return (
    <div className="space-y-4">
      {/* Interactive Step-by-Step Keypress Walkthrough */}
      <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2.5">
          <div>
            <h2 className="flex items-center font-mono text-sm font-bold text-zinc-100">
              <span>How Enigma Works — Step-by-Step Keypress Walkthrough</span>
              <InfoTooltip
                title="Interactive Signal Walkthrough"
                text="Trace exactly how a single key press turns into a ciphertext lamp step by step. Try switching between 'Preset BOM' (shows plugboard swaps) and 'Double-Step Trigger' (shows all 3 rotors advancing)."
                align="left"
              />
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Pick an input key and configuration, then step through the mechanical rotation and all 9 electrical transformations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-zinc-400">Input key:</span>
            <select
              value={inputLetter}
              onChange={(e) => setInputLetter(e.target.value)}
              aria-label="Walkthrough input letter"
              className="rounded border border-zinc-700 bg-[#08090c] px-2 py-1 font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
            >
              {ALPHABET.split('').map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Config selector */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {WALKTHROUGH_CONFIGS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedConfigId(opt.id)}
                className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
                  selectedConfigId === opt.id
                    ? 'border-amber-500/60 bg-zinc-800 font-semibold text-amber-300'
                    : 'border-zinc-700 bg-[#08090c] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] text-zinc-500">{demoOption.note}</span>
        </div>

        {/* 6-Stage Pipeline Selector */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((st) => {
            const active = activeStage === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`rounded border p-2.5 text-left font-mono transition ${
                  active
                    ? 'border-amber-500/70 bg-zinc-800/90'
                    : 'border-zinc-800 bg-[#08090c] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[11px] font-bold ${active ? 'text-amber-300' : 'text-zinc-300'}`}>
                    {st.short}
                  </span>
                  <InfoTooltip title={st.short} text={st.tip} />
                </div>
                <div className="mt-1 truncate text-[11px] text-zinc-400">{st.summary}</div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detail Box */}
        <div className="mt-3 rounded border border-zinc-800 bg-[#08090c] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <h3 className={`font-mono text-xs font-bold ${stages[activeStage].accent}`}>
              {stages[activeStage].title}
            </h3>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <button
                type="button"
                disabled={activeStage <= 0}
                onClick={() => setActiveStage((s) => Math.max(0, s - 1))}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
              >
                &larr; Prev
              </button>
              <button
                type="button"
                disabled={activeStage >= stages.length - 1}
                onClick={() => setActiveStage((s) => Math.min(stages.length - 1, s + 1))}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
              >
                Next &rarr;
              </button>
            </div>
          </div>

          {activeStage === 0 && (
            <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span className="rounded border border-zinc-700 bg-[#0d0e12] px-2.5 py-1">
                  Before: <strong className="text-zinc-100">{formatPositionLabel(trace.rotorPositionsBefore)}</strong>
                </span>
                <span className="text-zinc-500">&rarr;</span>
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1">
                  After: <strong className="text-amber-300">{formatPositionLabel(trace.rotorPositionsAfter)}</strong>
                </span>
                {trace.doubleStepped && (
                  <span className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-1 text-emerald-300">
                    Double-step triggered (Middle notch {ROTORS[rM].notchChar})
                  </span>
                )}
              </div>
              <p className="m-0 text-zinc-400">
                Before any electrical current flows, mechanical pawls advance the right rotor (<span className="font-mono text-zinc-200">{rR}</span>, notch at <span className="font-mono text-zinc-200">{ROTORS[rR].notchChar}</span>) by 1 step. If the right rotor sits on its notch, it pushes the middle rotor (<span className="font-mono text-zinc-200">{rM}</span>, notch at <span className="font-mono text-zinc-200">{ROTORS[rM].notchChar}</span>). When the middle rotor itself reaches its notch, its pawl engages both the left rotor and its own wheel, causing the classic double-stepping sequence (<span className="font-mono text-zinc-200">ADU &rarr; ADV &rarr; AEW &rarr; BFX</span>).
              </p>
            </div>
          )}

          {activeStage === 1 && (
            <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span className="rounded border border-zinc-700 bg-[#0d0e12] px-2.5 py-1">
                  Key pressed: <strong className="text-zinc-100">{fmtContact(trace.inputIdx)}</strong>
                </span>
                <span className="text-zinc-500">&rarr; Plugboard S &rarr;</span>
                <span className="rounded border border-sky-500/40 bg-sky-950/30 px-2.5 py-1">
                  Rotor Entry: <strong className="text-sky-300">{fmtContact(trace.steckerInIdx)}</strong>
                </span>
                <span className="text-zinc-400">
                  {trace.inputIdx === trace.steckerInIdx
                    ? '(No cable plugged on this letter — passed unchanged)'
                    : `(Swapped by plugboard cable ${trace.inputChar}↔${indexToChar(trace.steckerInIdx)})`}
                </span>
              </div>
              <p className="m-0 text-zinc-400">
                Current leaves the keyboard switch and passes through the front <strong className="text-zinc-200">Steckerbrett (Plugboard)</strong>. Each patch cable forms a symmetric transposition <span className="font-mono text-zinc-200">S(x) = y, S(y) = x</span>; unsteckered letters pass straight through unchanged into the fixed Entry Wheel (<em>ETW</em>).
              </p>
            </div>
          )}

          {activeStage === 2 && (
            <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
              <div className="grid grid-cols-1 gap-2 font-mono sm:grid-cols-3">
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Right Rotor ({rR}, pos {indexToChar(posR)}, ring {ringR + 1})</div>
                  <div className="mt-0.5 text-sky-300">
                    {fmtContact(trace.rightInIdx)} &rarr; {fmtContact(trace.rightOutIdx)}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Middle Rotor ({rM}, pos {indexToChar(posM)}, ring {ringM + 1})</div>
                  <div className="mt-0.5 text-sky-300">
                    {fmtContact(trace.middleInIdx)} &rarr; {fmtContact(trace.middleOutIdx)}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Left Rotor ({rL}, pos {indexToChar(posL)}, ring {ringL + 1})</div>
                  <div className="mt-0.5 text-sky-300">
                    {fmtContact(trace.leftInIdx)} &rarr; {fmtContact(trace.leftOutIdx)}
                  </div>
                </div>
              </div>
              <p className="m-0 text-zinc-400">
                Each rotor <span className="font-mono text-zinc-200">k</span> has 26 cross-wired pins (<span className="font-mono text-zinc-200">&pi;_k</span>) rotated by offset <span className="font-mono text-zinc-200">&Delta;_k = (pos_k &minus; ring_k) mod 26</span>. As the signal crosses from right to left, each wheel applies the conjugated permutation{' '}
                <span className="font-mono text-zinc-200">P_k(x) = (&pi;_k((x + &Delta;_k) mod 26) &minus; &Delta;_k) mod 26</span>.
              </p>
            </div>
          )}

          {activeStage === 3 && (
            <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span className="rounded border border-zinc-700 bg-[#0d0e12] px-2.5 py-1">
                  Enter {demoOption.config.reflector}: <strong className="text-sky-300">{fmtContact(trace.reflectorInIdx)}</strong>
                </span>
                <span className="text-zinc-500">&harr;</span>
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1">
                  Reflected Exit: <strong className="text-amber-300">{fmtContact(trace.reflectorOutIdx)}</strong>
                </span>
              </div>
              <p className="m-0 text-zinc-400">
                The stationary <strong className="text-zinc-200">Reflector (Umkehrwalze {demoOption.config.reflector})</strong> connects 13 disjoint contact pairs (<span className="font-mono text-zinc-200">U(x) &ne; x</span>, <span className="font-mono text-zinc-200">U&sup2; = I</span>). Because it loops the current back through the exact same rotors in reverse, the entire machine acts as a <strong className="text-zinc-200">self-inverse permutation without fixed points</strong>: no letter can ever encrypt to itself, and typing <span className="font-mono text-emerald-300">{trace.lampChar}</span> at the same start state returns <span className="font-mono text-emerald-300">{reverseChar}</span>.
              </p>
            </div>
          )}

          {activeStage === 4 && (
            <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
              <div className="grid grid-cols-1 gap-2 font-mono sm:grid-cols-3">
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Left Return ({rL}⁻¹)</div>
                  <div className="mt-0.5 text-emerald-300">
                    {fmtContact(trace.reflectorOutIdx)} &rarr; {fmtContact(trace.leftBackIdx)}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Middle Return ({rM}⁻¹)</div>
                  <div className="mt-0.5 text-emerald-300">
                    {fmtContact(trace.leftBackIdx)} &rarr; {fmtContact(trace.middleBackIdx)}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-[#0d0e12] p-2">
                  <div className="text-[10px] text-zinc-500">Right Return ({rR}⁻¹)</div>
                  <div className="mt-0.5 text-emerald-300">
                    {fmtContact(trace.middleBackIdx)} &rarr; {fmtContact(trace.rightBackIdx)}
                  </div>
                </div>
              </div>
              <p className="m-0 text-zinc-400">
                On the return trip from left to right, the current follows the inverse internal wiring <span className="font-mono text-zinc-200">&pi;_k⁻¹</span> of each rotor along a completely different wire than the forward pass, because the reflector shifted the contact index.
              </p>
            </div>
          )}

          {activeStage === 5 && (
            <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span className="rounded border border-zinc-700 bg-[#0d0e12] px-2.5 py-1">
                  From Right Rotor: <strong className="text-emerald-300">{fmtContact(trace.rightBackIdx)}</strong>
                </span>
                <span className="text-zinc-500">&rarr; Plugboard S⁻¹ &rarr;</span>
                <span className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1">
                  Lamp Lit: <strong className="text-emerald-300">{fmtContact(trace.lampIdx)}</strong>
                </span>
                <span className="rounded border border-zinc-700 bg-[#0d0e12] px-2.5 py-1 text-zinc-300">
                  Reciprocity check: <strong className="text-amber-300">{trace.inputChar} &harr; {trace.lampChar}</strong> (typing {trace.lampChar} gives {reverseChar})
                </span>
              </div>
              <p className="m-0 text-zinc-400">
                Exiting the entry wheel, current passes through the Steckerbrett a second time (<span className="font-mono text-zinc-200">S⁻¹ = S</span>) and completes the circuit to illuminate the ciphertext lamp on the upper display panel.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Keyspace Combinatorics Table */}
      <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
            <span>Keyspace Combinatorics &amp; Daily vs. Message Key</span>
            <InfoTooltip
              title="Why Brute Force Fails"
              text="Multiplying rotor order, window positions, ring settings, and 10 plugboard cables produces over 10²⁰ keys—impossible to check by trying every setting one by one."
              align="left"
            />
          </h3>
          <span className="rounded border border-zinc-800 bg-[#08090c] px-2.5 py-0.5 font-mono text-xs text-amber-300">
            Total effective keys &gt; 10&sup2;&sup0; (~1.07 &times; 10&sup2;&sup3; with full rings)
          </span>
        </div>

        <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c]">
          <table className="hw-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Key Type</th>
                <th>Formula</th>
                <th>Combinations</th>
                <th>Cryptanalytic Impact</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-zinc-100">Walzenlage (Rotor Order)</td>
                <td className="text-sky-300">Fixed Daily</td>
                <td>5 &times; 4 &times; 3</td>
                <td className="font-bold text-amber-300">60</td>
                <td className="font-sans text-zinc-400">Selects 3 ordered wheels from rotors I&ndash;V</td>
              </tr>
              <tr>
                <td className="font-bold text-zinc-100">Grundstellung (Window)</td>
                <td className="text-amber-300">Per-Message</td>
                <td>26&sup3;</td>
                <td className="font-bold text-amber-300">17,576</td>
                <td className="font-sans text-zinc-400">Swept exhaustively by the Turing Bombe &amp; IoC scanner</td>
              </tr>
              <tr>
                <td className="font-bold text-zinc-100">Ringstellung (Rings)</td>
                <td className="text-sky-300">Fixed Daily</td>
                <td>26&sup2; (turnover) / 26&sup3;</td>
                <td className="font-bold text-amber-300">676 / 17,576</td>
                <td className="font-sans text-zinc-400">Shifts notch position relative to internal wiring</td>
              </tr>
              <tr>
                <td className="font-bold text-zinc-100">Steckerbrett (10 cables)</td>
                <td className="text-sky-300">Fixed Daily</td>
                <td>26! / (6! &middot; 2&sup1;&sup0; &middot; 10!)</td>
                <td className="font-bold text-emerald-300">150,738,274,937,250</td>
                <td className="font-sans text-zinc-400">Bypassed by Bombe closed loops &amp; invariant under IoC</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Two Cryptanalysis Pipelines Side-by-Side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-800 border-l-4 border-l-amber-500/80 bg-[#0d0e12] p-4">
          <h3 className="mb-2 flex items-center border-b border-zinc-800 pb-2 font-mono text-sm font-bold text-zinc-100">
            <span>Cryptanalysis A — Known-Plaintext Crib &amp; Bombe Loops</span>
            <InfoTooltip
              title="Known-Plaintext Attack (Bombe)"
              text="Used when analysts could guess a word inside the message (like a weather report). Closed loops let the Bombe ignore the plugboard and check 17,576 rotor positions in minutes."
              align="left"
            />
          </h3>
          <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-zinc-300">
            <li>
              <strong className="text-zinc-100">Crib Collision Filter:</strong> Because the reflector forces <span className="font-mono text-amber-300">E_t(x) &ne; x</span>, slide the guessed plaintext word under the ciphertext and immediately discard every offset where <span className="font-mono text-rose-300">C_k = P_k</span>.
            </li>
            <li>
              <strong className="text-zinc-100">Menu Graph &amp; Closures:</strong> Every valid column <span className="font-mono text-zinc-200">(P_k, C_k)</span> creates an edge labeled by step <span className="font-mono text-zinc-200">k</span>. Closed loops (<span className="font-mono text-emerald-300">R &rarr; Y &rarr; S &rarr; R</span>) form closed stecker equations independent of the unknown plugboard.
            </li>
            <li>
              <strong className="text-zinc-100">Welchman Diagonal Board:</strong> Cross-wires <span className="font-mono text-zinc-200">S(u) = v &hArr; S(v) = u</span>. Injecting a stecker guess on the test register propagates through the loops; if multiple letters energize on the same row, that rotor position is eliminated. Surviving positions produce a <strong className="text-emerald-300">Bombe Stop</strong>.
            </li>
          </ol>
        </section>

        <section className="rounded-lg border border-zinc-800 border-l-4 border-l-sky-500/80 bg-[#0d0e12] p-4">
          <h3 className="mb-2 flex items-center border-b border-zinc-800 pb-2 font-mono text-sm font-bold text-zinc-100">
            <span>Cryptanalysis B — Statistical IoC, &chi;&sup2;, &amp; Banburismus</span>
            <InfoTooltip
              title="Statistical Attack (No Crib Needed)"
              text="Uses letter repetition (IoC) and Bayesian log-odds (Decibans) to score decrypted candidates purely by how much they resemble real German or English."
              align="right"
            />
          </h3>
          <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-zinc-300">
            <li>
              <strong className="text-zinc-100">Friedman&rsquo;s Index of Coincidence:</strong> <span className="font-mono text-sky-300">IoC = &Sigma; n_i(n_i&minus;1) / [N(N&minus;1)]</span>. Under uniform noise (<span className="font-mono">H_0: 1/26</span>), <span className="font-mono">E[IoC] = 0.03846</span> with exact variance <span className="font-mono">25 / [338 N(N&minus;1)]</span>. Natural prose spikes to <span className="font-mono">0.0762</span> (DE) or <span className="font-mono">0.0667</span> (EN).
            </li>
            <li>
              <strong className="text-zinc-100">Chi-Square &amp; Shannon Entropy:</strong> <span className="font-mono text-zinc-200">&chi;&sup2; = &Sigma; (O_i &minus; E_i)&sup2; / E_i</span> (25 df) tests goodness-of-fit to reference language frequencies, while entropy <span className="font-mono text-zinc-200">H = &minus;&Sigma; p_i log_2(p_i)</span> drops below the <span className="font-mono">4.700</span> bit uniform ceiling when plaintext structure emerges.
            </li>
            <li>
              <strong className="text-zinc-100">Turing Decibans &amp; Banburismus:</strong> Log-odds evidence <span className="font-mono text-emerald-300">W = 10 &Sigma; n_i log_10(26 p_i)</span> updates prior odds multiplicatively (<span className="font-mono">+10 dB = 10:1</span>) and aligns two ciphertexts at matching rotor depth.
            </li>
          </ol>
        </section>
      </div>

      {/* Reference Vector Verification */}
      <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 flex items-center font-mono text-sm font-bold text-zinc-100">
              <span>Reference Vector Verification</span>
              <InfoTooltip
                title="Engine Self-Tests"
                text="Runs 4 historical verification checks inside your browser against published WWII Enigma test vectors to prove the simulator math is exact."
                align="left"
              />
            </h3>
            <p className="m-0 mt-0.5 text-xs text-zinc-400">
              Run automated checks on canonical encryption (AAAAA &rarr; BDZGO), double-stepping (ADU &rarr; BFX), reciprocity, and Bombe key recovery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelfTests(runHistoricalSelfTests())}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
          >
            Run Verification
          </button>
        </div>

        {selfTests && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {selfTests.map((item) => (
              <div
                key={item.id}
                className="rounded border border-zinc-800 bg-[#08090c] px-3 py-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-200">{item.label}</span>
                  <span
                    className={
                      item.passed ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'
                    }
                  >
                    {item.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">{item.detail}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
