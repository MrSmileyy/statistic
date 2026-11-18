import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  EyeOff,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  createBombeWorkspace,
  evaluatePositionOnBombe,
  inspectBombeHypotheses,
} from '../../core/bombe';
import {
  ALPHABET,
  ALPHABET_SIZE,
  formatPositionLabel,
  indexToChar,
  normalizeAsciiLetters,
  REFLECTOR_IDS,
  ROTOR_IDS,
  TOTAL_ROTOR_POSITIONS,
} from '../../core/constants';
import { EnigmaM3, stepRotorPositions } from '../../core/enigma';
import { enigmaAudio } from '../../utils/enigmaAudio';
import type {
  BombeMenu,
  EnigmaConfig,
  PlugPair,
  ReflectorId,
  RotorId,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

const QWERTZ_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
  ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L'],
];

const BrassScrew: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 20 20" className={`h-3 w-3 opacity-85 ${className}`} aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" fill="#7c5f28" stroke="#302109" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="6" fill="#c99c47" />
    <line x1="5.5" y1="6.5" x2="14.5" y2="13.5" stroke="#261a05" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function posToLinear(pos: readonly [number, number, number]): number {
  return pos[0] * 676 + pos[1] * 26 + pos[2];
}

function linearToPos(n: number): [number, number, number] {
  const norm = ((n % TOTAL_ROTOR_POSITIONS) + TOTAL_ROTOR_POSITIONS) % TOTAL_ROTOR_POSITIONS;
  const l = Math.floor(norm / 676);
  const rem = norm % 676;
  const m = Math.floor(rem / 26);
  const r = rem % 26;
  return [l, m, r];
}

function formatFiveGroups(text: string): string {
  if (!text) return '—';
  return text.match(/.{1,5}/g)?.join(' ') ?? text;
}

interface BombeCabinetProps {
  ciphertext: string;
  menu: BombeMenu;
  enigmaConfig: EnigmaConfig;
  onConfigChange: (next: EnigmaConfig) => void;
  onApplyStopToEnigma: (
    positions: [number, number, number],
    plugboard: PlugPair[]
  ) => void;
}

export const BombeCabinet: React.FC<BombeCabinetProps> = ({
  ciphertext,
  menu,
  enigmaConfig,
  onConfigChange,
  onApplyStopToEnigma,
}) => {
  const [drumPos, setDrumPos] = useState<[number, number, number]>(
    enigmaConfig.rotorPositions
  );
  const [xrayOpen, setXrayOpen] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [selectedRegisterIdx, setSelectedRegisterIdx] = useState<number>(menu.testRegisterIdx);
  const [selectedPartnerIdx, setSelectedPartnerIdx] = useState<number>(0);

  const spinRef = useRef<number | null>(null);
  const linearRef = useRef<number>(posToLinear(enigmaConfig.rotorPositions));

  useEffect(() => {
    setDrumPos(enigmaConfig.rotorPositions);
    linearRef.current = posToLinear(enigmaConfig.rotorPositions);
  }, [
    enigmaConfig.rotorPositions[0],
    enigmaConfig.rotorPositions[1],
    enigmaConfig.rotorPositions[2],
  ]);

  const activeRegisterIdx = useMemo(() => {
    if (menu.nodes.some((n) => n.index === selectedRegisterIdx)) {
      return selectedRegisterIdx;
    }
    return menu.testRegisterIdx;
  }, [menu.nodes, menu.testRegisterIdx, selectedRegisterIdx]);

  const activeRegisterChar = ALPHABET[activeRegisterIdx] ?? menu.testRegister;
  const canOperate = menu.isValidAlignment && menu.edges.length > 0;

  // Compute all 26 hypothesis traces on the current Bombe drum state
  const hypothesisTraces = useMemo(() => {
    if (!canOperate) return [];
    return inspectBombeHypotheses(
      menu,
      enigmaConfig.rotors,
      enigmaConfig.reflector,
      enigmaConfig.ringSettings,
      drumPos,
      activeRegisterIdx
    );
  }, [
    canOperate,
    menu,
    enigmaConfig.rotors,
    enigmaConfig.reflector,
    enigmaConfig.ringSettings,
    drumPos,
    activeRegisterIdx,
  ]);

  const consistentHypotheses = useMemo(
    () => hypothesisTraces.filter((t) => t.consistent),
    [hypothesisTraces]
  );

  const isStop = consistentHypotheses.length > 0;

  // Auto-select first consistent partner whenever landing on a Stop if current partner isn't consistent
  const activeTrace = useMemo(() => {
    if (hypothesisTraces.length === 0) return null;
    const current = hypothesisTraces[selectedPartnerIdx] ?? hypothesisTraces[0];
    if (isStop && !current.consistent) {
      return consistentHypotheses[0];
    }
    return current;
  }, [hypothesisTraces, selectedPartnerIdx, isStop, consistentHypotheses]);

  const activePartnerIdx = activeTrace?.assumedPartnerIdx ?? selectedPartnerIdx;

  // Compute exact 3-letter drum states for each visible scrambler stack (up to 6 menu edges)
  const scramblerStacks = useMemo(() => {
    if (!canOperate) return [];
    const stepBuf: [number, number, number] = [...drumPos];
    for (let s = 0; s < menu.offset; s++) {
      const { next } = stepRotorPositions(enigmaConfig.rotors, stepBuf);
      stepBuf[0] = next[0];
      stepBuf[1] = next[1];
      stepBuf[2] = next[2];
    }

    const perCribPos: [number, number, number][] = [];
    for (let k = 0; k < menu.crib.length; k++) {
      const { next } = stepRotorPositions(enigmaConfig.rotors, stepBuf);
      stepBuf[0] = next[0];
      stepBuf[1] = next[1];
      stepBuf[2] = next[2];
      perCribPos.push([stepBuf[0], stepBuf[1], stepBuf[2]]);
    }

    return menu.edges.slice(0, 6).map((edge) => ({
      edge,
      pos: perCribPos[edge.cribIndex] ?? drumPos,
    }));
  }, [canOperate, drumPos, menu.offset, menu.crib.length, menu.edges, enigmaConfig.rotors]);

  // Energized lamps on the Sensing Relay Board for the active hypothesis & node
  const sensingMask = activeTrace?.boardMask[activeRegisterIdx] ?? 0;
  const litLetters = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < ALPHABET_SIZE; i++) {
      if ((sensingMask & (1 << i)) !== 0) {
        out.push(ALPHABET[i]);
      }
    }
    return out;
  }, [sensingMask]);

  // Live decrypted preview for the Stop Printer Tape
  const tapePreview = useMemo(() => {
    const clean = normalizeAsciiLetters(ciphertext).slice(0, 40);
    if (!clean) return '';
    const plugs = activeTrace?.consistent ? activeTrace.deducedPairs : [];
    return new EnigmaM3({
      ...enigmaConfig,
      rotorPositions: drumPos,
      plugboard: plugs,
    }).encryptText(clean).ciphertext;
  }, [ciphertext, activeTrace, enigmaConfig, drumPos]);

  const stopSpinning = useCallback(() => {
    if (spinRef.current !== null) {
      window.clearInterval(spinRef.current);
      spinRef.current = null;
    }
    setIsSpinning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (spinRef.current !== null) {
        window.clearInterval(spinRef.current);
      }
    };
  }, []);

  useEffect(() => {
    stopSpinning();
  }, [
    menu,
    enigmaConfig.rotors,
    enigmaConfig.reflector,
    enigmaConfig.ringSettings,
    stopSpinning,
  ]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    enigmaAudio.enabled = next;
  };

  const handleStepDrum = (slot: 0 | 1 | 2, delta: number) => {
    stopSpinning();
    enigmaAudio.playRotorTick();
    const next: [number, number, number] = [...drumPos];
    next[slot] = (next[slot] + delta + ALPHABET_SIZE) % ALPHABET_SIZE;
    setDrumPos(next);
    linearRef.current = posToLinear(next);
  };

  const handleStepAllPlusOne = () => {
    stopSpinning();
    enigmaAudio.playRotorTick();
    const nextLinear = (posToLinear(drumPos) + 1) % TOTAL_ROTOR_POSITIONS;
    linearRef.current = nextLinear;
    setDrumPos(linearToPos(nextLinear));
  };

  const handleRotorSelect = (slot: 0 | 1 | 2, rotorId: RotorId) => {
    stopSpinning();
    enigmaAudio.playRotorTick();
    const nextRotors: [RotorId, RotorId, RotorId] = [...enigmaConfig.rotors] as [
      RotorId,
      RotorId,
      RotorId,
    ];
    nextRotors[slot] = rotorId;
    onConfigChange({ ...enigmaConfig, rotors: nextRotors });
  };

  const handleJumpToNextStop = () => {
    if (!canOperate) return;
    stopSpinning();
    const ws = createBombeWorkspace(menu);
    const startIdx = (posToLinear(drumPos) + 1) % TOTAL_ROTOR_POSITIONS;

    for (let offset = 0; offset < TOTAL_ROTOR_POSITIONS; offset++) {
      const idx = (startIdx + offset) % TOTAL_ROTOR_POSITIONS;
      const cand = linearToPos(idx);
      const res = evaluatePositionOnBombe(
        ws,
        menu.testRegisterIdx,
        enigmaConfig.rotors,
        enigmaConfig.reflector,
        enigmaConfig.ringSettings,
        cand
      );
      if (res.hypotheses.length > 0) {
        enigmaAudio.playMissionSuccess();
        linearRef.current = idx;
        setDrumPos(cand);
        setSelectedRegisterIdx(menu.testRegisterIdx);
        setSelectedPartnerIdx(res.hypotheses[0]);
        return;
      }
    }
  };

  const handleAnimateRun = () => {
    if (!canOperate) return;
    if (isSpinning) {
      stopSpinning();
      return;
    }

    linearRef.current = posToLinear(drumPos);
    const ws = createBombeWorkspace(menu);
    let stepsDone = 0;
    const batchPerTick = 17;

    setIsSpinning(true);
    spinRef.current = window.setInterval(() => {
      for (let b = 0; b < batchPerTick; b++) {
        const nextIdx = (linearRef.current + 1) % TOTAL_ROTOR_POSITIONS;
        linearRef.current = nextIdx;
        stepsDone++;
        const cand = linearToPos(nextIdx);

        const res = evaluatePositionOnBombe(
          ws,
          menu.testRegisterIdx,
          enigmaConfig.rotors,
          enigmaConfig.reflector,
          enigmaConfig.ringSettings,
          cand
        );

        if (res.hypotheses.length > 0) {
          setDrumPos(cand);
          setSelectedRegisterIdx(menu.testRegisterIdx);
          setSelectedPartnerIdx(res.hypotheses[0]);
          enigmaAudio.playMissionSuccess();
          stopSpinning();
          return;
        }

        if (stepsDone >= TOTAL_ROTOR_POSITIONS) {
          setDrumPos(cand);
          stopSpinning();
          return;
        }
      }

      enigmaAudio.playRotorTick();
      setDrumPos(linearToPos(linearRef.current));
    }, 45);
  };

  const relayStatus = !canOperate
    ? {
        label: 'AWAITING VALID CRIB',
        cls: 'border-zinc-700 bg-zinc-900 text-zinc-400',
      }
    : isSpinning
      ? {
          label: `SPINNING DRUMS · ${formatPositionLabel(drumPos)}`,
          cls: 'border-amber-400 bg-amber-500/20 text-amber-200 animate-pulse',
        }
      : isStop
        ? {
            label: `BOMBE STOP · ${consistentHypotheses.length} COHERENT BRANCH`,
            cls: 'border-emerald-400 bg-emerald-500/20 text-emerald-300',
          }
        : {
            label: 'CONTRADICTION · SHORT CIRCUIT',
            cls: 'border-rose-500/70 bg-rose-950/60 text-rose-300',
          };

  return (
    <div className="wood-cabinet rounded-2xl border-4 border-[#5a3b20] p-3 sm:p-4">
      <div className="enigma-chassis relative space-y-3 rounded-xl border border-zinc-800 p-3.5 sm:p-5">
        <BrassScrew className="absolute left-2 top-2" />
        <BrassScrew className="absolute right-2 top-2" />
        <BrassScrew className="absolute bottom-2 left-2" />
        <BrassScrew className="absolute bottom-2 right-2" />

        {/* Top Nameplate & Hardware Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/90 px-4 pb-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded border border-zinc-600/70 bg-gradient-to-b from-zinc-900 to-black px-3 py-0.5 shadow-inner">
              <span className="font-mono text-xs font-extrabold italic tracking-[0.24em] text-zinc-100 sm:text-sm">
                BOMBE
              </span>
              <span className="ml-2 font-mono text-[10px] text-bletchley-brass">
                HUT 6·BTM-210
              </span>
              <InfoTooltip
                title="Turing-Welchman Bombe Machine"
                text="Electromechanical machine built at Bletchley Park. It wires multiple Enigma rotor stacks in parallel along your crib menu, spinning through all 17,576 positions until a setting causes zero electrical contradictions (a Stop)."
                align="left"
              />
            </div>

            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${relayStatus.cls}`}>
              <Zap className="h-3 w-3" />
              <span>{relayStatus.label}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!canOperate}
              onClick={handleAnimateRun}
              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 font-mono text-[11px] font-bold transition disabled:opacity-40 ${
                isSpinning
                  ? 'border-amber-400 bg-amber-500/25 text-amber-200'
                  : 'border-bletchley-brass bg-bletchley-brass/20 text-bletchley-brass-bright hover:bg-bletchley-brass hover:text-zinc-950'
              }`}
            >
              {isSpinning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{isSpinning ? 'Pause Drums' : 'Animate Drum Run'}</span>
            </button>

            <button
              type="button"
              disabled={!canOperate}
              onClick={handleStepAllPlusOne}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-200 hover:border-bletchley-brass disabled:opacity-40"
              title="Advance fast drum by +1"
            >
              <StepForward className="h-3 w-3 text-bletchley-brass" />
              <span>Step +1</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopSpinning();
                enigmaAudio.playRotorTick();
                linearRef.current = 0;
                setDrumPos([0, 0, 0]);
              }}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-rose-300 hover:border-rose-400"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Test AAA</span>
            </button>

            <button
              type="button"
              disabled={!canOperate}
              onClick={handleJumpToNextStop}
              className="inline-flex items-center gap-1 rounded border border-emerald-500/50 bg-emerald-950/40 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-40"
            >
              <FastForward className="h-3 w-3" />
              <span>Jump to Stop</span>
            </button>

            <button
              type="button"
              onClick={() => setXrayOpen((x) => !x)}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px] font-semibold transition ${
                xrayOpen
                  ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-bletchley-brass'
              }`}
            >
              {xrayOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{xrayOpen ? 'Front Drums' : 'Rear Wiring (X-Ray)'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px] transition ${
                soundOn
                  ? 'border-bletchley-brass/50 bg-bletchley-brass/15 text-bletchley-brass-bright'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-500'
              }`}
            >
              {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              <span>{soundOn ? 'SFX' : 'MUTE'}</span>
            </button>
          </div>
        </div>

        {/* 1. UPPER DRUM BANK / REAR WIRING SCHEMATIC */}
        <div className="relative rounded-lg border border-zinc-800 bg-[#0b0c0f] px-3 py-2.5 shadow-inner">
          {!xrayOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-3 xl:flex-nowrap">
              {/* Left: Master Indicator Drums (L-M-R) */}
              <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-700/80 bg-[#14161b] px-3 py-2 shadow-inner">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-zinc-400">
                  <span className="inline-flex items-center">
                    Master Indicator
                    <InfoTooltip
                      title="Master Indicator Drums"
                      text="Displays the candidate 3-letter message key (Grundstellung) currently being tested across all scrambler banks."
                      align="left"
                    />
                  </span>
                  <div className="flex items-center gap-1">
                    {REFLECTOR_IDS.map((reflId) => {
                      const active = enigmaConfig.reflector === reflId;
                      return (
                        <button
                          key={reflId}
                          type="button"
                          onClick={() => {
                            enigmaAudio.playRotorTick();
                            onConfigChange({ ...enigmaConfig, reflector: reflId as ReflectorId });
                          }}
                          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold transition ${
                            active
                              ? 'border-bletchley-brass bg-bletchley-brass/20 text-bletchley-brass-bright'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {reflId.replace('UKW-', '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {([0, 1, 2] as const).map((slot) => {
                    const rotorId = enigmaConfig.rotors[slot];
                    const pos = drumPos[slot];

                    return (
                      <div key={slot} className="flex items-center gap-1">
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={rotorId}
                            aria-label={`Bombe master rotor ${slot + 1}`}
                            onChange={(e) => handleRotorSelect(slot, e.target.value as RotorId)}
                            className="rounded border border-zinc-700 bg-black px-1 py-0.5 font-mono text-[10px] font-bold text-bletchley-brass-bright focus:outline-none"
                          >
                            {ROTOR_IDS.map((id) => (
                              <option key={id} value={id}>
                                {id}
                              </option>
                            ))}
                          </select>

                          <div
                            className={`relative flex items-center justify-center rounded border-2 px-1.5 py-0.5 shadow-inner ${
                              isStop
                                ? 'border-emerald-500/80 bg-[#0b1f16]'
                                : 'border-zinc-500/70 bg-gradient-to-b from-zinc-950 via-zinc-800 to-zinc-950'
                            }`}
                          >
                            <div
                              key={`${slot}-${pos}`}
                              className="flex h-8 w-7 items-center justify-center rounded-sm border border-zinc-400/50 bg-[#ece4cf] font-mono text-base font-extrabold text-zinc-950 shadow-inner"
                            >
                              {indexToChar(pos)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => handleStepDrum(slot, -1)}
                            aria-label={`Step drum ${slot + 1} back`}
                            className="flex h-4 w-4 items-center justify-center rounded-t border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-bletchley-brass"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <div
                            onClick={() => handleStepDrum(slot, 1)}
                            className="knurled-wheel h-8 w-4 cursor-pointer border-x border-zinc-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepDrum(slot, 1)}
                            aria-label={`Step drum ${slot + 1} forward`}
                            className="flex h-4 w-4 items-center justify-center rounded-b border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-bletchley-brass"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center: Parallel Letchworth Scrambler Drum Triplets */}
              <div className="flex min-w-[260px] flex-1 flex-col gap-1.5 rounded-lg border border-zinc-800 bg-[#0d0f14] px-3 py-2">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-zinc-400">
                  <span className="inline-flex items-center">
                    Parallel Letchworth Scrambler Drums ({scramblerStacks.length} of {menu.edges.length} menu links)
                    <InfoTooltip
                      title="Parallel Scrambler Drum Banks"
                      text="Each vertical column of 3 colored drums acts like a mini Enigma wired for one crib link (offset +1, +2, ...). All columns spin together in lockstep so every menu loop is tested simultaneously."
                    />
                  </span>
                  <span className="text-zinc-500">Top: {enigmaConfig.rotors[0]} · Mid: {enigmaConfig.rotors[1]} · Bot: {enigmaConfig.rotors[2]}</span>
                </div>

                {!canOperate ? (
                  <div className="flex h-20 items-center justify-center rounded border border-dashed border-zinc-800 font-mono text-xs text-rose-400">
                    Align a collision-free crib below to engage scrambler banks
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {scramblerStacks.map(({ edge, pos }) => {
                      const edgeEnergized =
                        activeTrace !== null &&
                        (activeTrace.boardMask[edge.fromIdx] ?? 0) !== 0 &&
                        (activeTrace.boardMask[edge.toIdx] ?? 0) !== 0;

                      return (
                        <div
                          key={edge.id}
                          className={`flex flex-col items-center rounded border px-1.5 py-1.5 font-mono transition ${
                            edgeEnergized
                              ? isStop
                                ? 'border-emerald-500/60 bg-emerald-950/25'
                                : 'border-rose-500/50 bg-rose-950/20'
                              : 'border-zinc-800 bg-[#090a0d]'
                          }`}
                        >
                          <span className="text-[9px] font-bold text-zinc-500">
                            pos {edge.messageIndex + 1}
                          </span>
                          {/* 3 Stacked Colored Bombe Drums */}
                          <div className="my-1 flex flex-col items-center gap-0.5">
                            <div
                              className="flex h-5 w-10 items-center justify-center rounded-sm border border-rose-400/50 bg-gradient-to-b from-rose-950 to-zinc-900 text-[10px] font-bold text-rose-200 shadow-inner"
                              title={`Left drum (${enigmaConfig.rotors[0]})`}
                            >
                              {indexToChar(pos[0])}
                            </div>
                            <div
                              className="flex h-5 w-10 items-center justify-center rounded-sm border border-amber-400/60 bg-gradient-to-b from-amber-950 to-zinc-900 text-[10px] font-bold text-amber-200 shadow-inner"
                              title={`Middle drum (${enigmaConfig.rotors[1]})`}
                            >
                              {indexToChar(pos[1])}
                            </div>
                            <div
                              className="flex h-5 w-10 items-center justify-center rounded-sm border border-sky-400/60 bg-gradient-to-b from-sky-950 to-zinc-900 text-[10px] font-bold text-sky-200 shadow-inner"
                              title={`Right fast drum (${enigmaConfig.rotors[2]})`}
                            >
                              {indexToChar(pos[2])}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              edgeEnergized
                                ? isStop
                                  ? 'text-emerald-300'
                                  : 'text-rose-300'
                                : 'text-zinc-400'
                            }`}
                          >
                            {edge.from}&harr;{edge.to}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Stop Printer Perforated Paper Tape */}
              <div className="flex min-w-[220px] flex-col gap-1 xl:w-64">
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                  <span className="inline-flex items-center">
                    STOP PRINTER TAPE
                    <InfoTooltip
                      title="Stop Printer Readout"
                      text="When the Bombe stops without contradiction, this paper tape prints the rotor position, deduced Steckerbrett cables, and decrypted preview."
                      align="right"
                    />
                  </span>
                  <button
                    type="button"
                    disabled={!isStop || !activeTrace}
                    onClick={() => {
                      if (activeTrace) {
                        onApplyStopToEnigma(drumPos, activeTrace.deducedPairs);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded border border-bletchley-brass/50 bg-bletchley-brass/15 px-2 py-0.5 text-[10px] font-bold text-bletchley-brass-bright hover:bg-bletchley-brass/25 disabled:opacity-40"
                  >
                    <Cpu className="h-2.5 w-2.5" />
                    <span>Apply to Enigma</span>
                  </button>
                </div>

                <div className="paper-tape overflow-x-auto rounded border border-[#c7b998] px-2.5 py-1.5 font-mono text-[11px] leading-snug text-zinc-900">
                  <div className="flex gap-2 whitespace-nowrap">
                    <span className="w-10 shrink-0 font-bold text-zinc-600">DRUM:</span>
                    <span className="font-extrabold tracking-widest">
                      {formatPositionLabel(drumPos)} ({isStop ? 'STOP' : 'REJECT'})
                    </span>
                  </div>
                  <div className="flex gap-2 whitespace-nowrap">
                    <span className="w-10 shrink-0 font-bold text-zinc-600">PLUG:</span>
                    <span className="font-bold text-[#0f5132]">
                      {isStop && activeTrace && activeTrace.deducedPairs.length > 0
                        ? activeTrace.deducedPairs.map(([a, b]) => `${a}${b}`).join(' ')
                        : isStop
                          ? 'none'
                          : 'SHORT-CIRCUIT'}
                    </span>
                  </div>
                  <div className="flex gap-2 whitespace-nowrap">
                    <span className="w-10 shrink-0 font-bold text-[#8a3a18]">TEXT:</span>
                    <span className="font-extrabold tracking-wider">
                      {isStop ? formatFiveGroups(tapePreview.slice(0, 20)) : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Rear Wiring X-Ray Schematic SVG */
            <div className="overflow-x-auto rounded border border-zinc-800 bg-[#08090c] p-2">
              <svg viewBox="0 0 780 175" className="mx-auto h-auto w-full min-w-[620px]">
                <text x="16" y="20" className="fill-zinc-400 font-mono text-[10px] font-bold">
                  REAR WIRING SCHEMATIC · 26-WAY DIAGONAL BOARD BUS &amp; CLOSED LOOP SENSING RELAY
                </text>

                {/* 26-way Diagonal Board Bus Bar */}
                <line
                  x1="30"
                  y1="145"
                  x2="750"
                  y2="145"
                  stroke={isStop ? '#10b981' : '#ef4444'}
                  strokeWidth="2.5"
                />
                <text x="390" y="162" textAnchor="middle" className="fill-zinc-400 font-mono text-[9px]">
                  WELCHMAN DIAGONAL BOARD 26×26 SYMMETRY BUS: S(u) = v ⇔ S(v) = u
                </text>

                {/* Test Register Injector Box */}
                <rect
                  x="30"
                  y="42"
                  width="125"
                  height="74"
                  rx="6"
                  fill="#11141c"
                  stroke="#d4a853"
                  strokeWidth="1.8"
                />
                <text x="92" y="64" textAnchor="middle" className="fill-amber-300 font-mono text-[10px] font-bold">
                  TEST REGISTER
                </text>
                <text x="92" y="83" textAnchor="middle" className="fill-zinc-100 font-mono text-sm font-bold">
                  {activeRegisterChar} ↔ {ALPHABET[activePartnerIdx]}
                </text>
                <text x="92" y="102" textAnchor="middle" className="fill-zinc-400 font-mono text-[9px]">
                  {litLetters.length}/26 wires live
                </text>
                <line x1="92" y1="116" x2="92" y2="145" stroke="#d4a853" strokeWidth="1.6" />

                {/* Scrambler Loop Chain */}
                {scramblerStacks.slice(0, 4).map(({ edge, pos }, idx) => {
                  const bx = 195 + idx * 108;
                  const pulseColor = isStop ? '#34d399' : '#f43f5e';
                  return (
                    <g key={edge.id}>
                      <line
                        x1={bx - 40}
                        y1="79"
                        x2={bx}
                        y2="79"
                        stroke={pulseColor}
                        strokeWidth="2"
                        strokeDasharray="5 4"
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from="18"
                          to="0"
                          dur={isStop ? '1.1s' : '0.7s'}
                          repeatCount="indefinite"
                        />
                      </line>
                      <rect
                        x={bx}
                        y="42"
                        width="72"
                        height="74"
                        rx="5"
                        fill="#141720"
                        stroke={isStop ? '#10b981' : '#ef4444'}
                        strokeWidth="1.5"
                      />
                      <text x={bx + 36} y="60" textAnchor="middle" className="fill-zinc-400 font-mono text-[9px]">
                        pos {edge.messageIndex + 1}
                      </text>
                      <text x={bx + 36} y="78" textAnchor="middle" className="fill-amber-200 font-mono text-xs font-bold">
                        {formatPositionLabel(pos)}
                      </text>
                      <text x={bx + 36} y="98" textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                        {edge.from}↔{edge.to}
                      </text>
                      <line x1={bx + 36} y1="116" x2={bx + 36} y2="145" stroke={pulseColor} strokeWidth="1.4" />
                    </g>
                  );
                })}

                {/* Sensing Relay Output */}
                <line
                  x1={
                    scramblerStacks.length > 0
                      ? 195 + (Math.min(4, scramblerStacks.length) - 1) * 108 + 72
                      : 155
                  }
                  y1="79"
                  x2="625"
                  y2="79"
                  stroke={isStop ? '#34d399' : '#f43f5e'}
                  strokeWidth="2"
                />
                <rect
                  x="625"
                  y="42"
                  width="125"
                  height="74"
                  rx="6"
                  fill={isStop ? '#082c1f' : '#350f16'}
                  stroke={isStop ? '#10b981' : '#ef4444'}
                  strokeWidth="2"
                />
                <text x="687" y="66" textAnchor="middle" className="fill-zinc-300 font-mono text-[10px] font-bold">
                  SENSING RELAY
                </text>
                <text
                  x="687"
                  y="88"
                  textAnchor="middle"
                  className={`font-mono text-xs font-extrabold ${
                    isStop ? 'fill-emerald-300' : 'fill-rose-300'
                  }`}
                >
                  {isStop ? 'STOP (1 WIRE)' : 'REJECT (SHORT)'}
                </text>
                <text x="687" y="105" textAnchor="middle" className="fill-zinc-400 font-mono text-[9px]">
                  {isStop ? 'Brakes drums' : 'Keep spinning'}
                </text>
                <line x1="687" y1="116" x2="687" y2="145" stroke={isStop ? '#10b981' : '#ef4444'} strokeWidth="1.6" />
              </svg>
            </div>
          )}
        </div>

        {/* 2. TEST REGISTER 26-LAMP SENSING RELAY BOARD */}
        <div className="rounded-lg border border-zinc-800/90 bg-[#08090b] px-3 py-3 shadow-inner">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 font-mono text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center font-bold uppercase tracking-wider text-zinc-300">
                26-Lamp Sensing Relay Board (Register {activeRegisterChar})
                <InfoTooltip
                  title="Test Register Sensing Bulbs"
                  text="Displays which partner wires A–Z become energized on the selected menu letter. On a wrong rotor position, electricity floods almost all 26 bulbs (short-circuit contradiction). On a true Bombe Stop, only ONE bulb glows cleanly!"
                  align="left"
                />
              </span>
              {menu.nodes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {menu.nodes.slice(0, 8).map((node) => (
                    <button
                      key={node.char}
                      type="button"
                      onClick={() => setSelectedRegisterIdx(node.index)}
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${
                        node.index === activeRegisterIdx
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {node.char}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span
              className={`font-bold ${
                !activeTrace
                  ? 'text-zinc-500'
                  : activeTrace.consistent
                    ? 'text-emerald-400'
                    : 'text-rose-400'
              }`}
            >
              {!activeTrace
                ? 'No active trace'
                : activeTrace.consistent
                  ? `COHERENT: ${activeRegisterChar} ↔ ${litLetters[0] ?? ALPHABET[activePartnerIdx]} (1/26 lit)`
                  : `SHORT-CIRCUIT: ${litLetters.length}/26 lit on ${activeRegisterChar}${
                      activeTrace.contradictedNodes.length > 0
                        ? ` · Conflicts: ${activeTrace.contradictedNodes.slice(0, 5).join(',')}`
                        : ''
                    }`}
            </span>
          </div>

          <div className="space-y-2">
            {QWERTZ_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-2 sm:gap-3.5">
                {row.map((ch) => {
                  const charIdx = ch.charCodeAt(0) - 65;
                  const isLit = (sensingMask & (1 << charIdx)) !== 0;
                  const isCoherent = isLit && Boolean(activeTrace?.consistent);
                  const isShorted = isLit && !activeTrace?.consistent;

                  return (
                    <div
                      key={ch}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm font-extrabold transition-all duration-100 sm:h-10 sm:w-10 ${
                        isCoherent
                          ? 'scale-110 border-emerald-200 bg-gradient-to-b from-emerald-100 via-emerald-400 to-emerald-500 text-zinc-950 shadow-lamp'
                          : isShorted
                            ? 'border-rose-300/80 bg-gradient-to-b from-rose-200/85 via-rose-500/80 to-rose-700/80 text-zinc-950'
                            : 'border-zinc-800 bg-[#0d0e12] text-zinc-700'
                      }`}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 3. TEST REGISTER HYPOTHESIS LEAD SELECTOR (26 PINS) */}
        <div className="rounded-lg border border-zinc-800/90 bg-[#111216] px-3 py-2.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-zinc-400">
            <span className="inline-flex items-center uppercase tracking-wider">
              Stecker Hypothesis Probe ({activeRegisterChar} ↔ A–Z)
              <InfoTooltip
                title="26-Pin Test Hypothesis Lead"
                text="Click any letter A–Z to inject electrical current assuming that letter is plugged to the test register. Green pins survive with zero contradictions; red pins short-circuit."
                align="left"
              />
            </span>
            <span>
              Click any pin to test {activeRegisterChar}↔X at {formatPositionLabel(drumPos)}
            </span>
          </div>

          <div className="space-y-1.5">
            {QWERTZ_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2.5">
                {row.map((ch) => {
                  const charIdx = ch.charCodeAt(0) - 65;
                  const traceForPin = hypothesisTraces[charIdx];
                  const selected = activePartnerIdx === charIdx;
                  const coherent = Boolean(traceForPin?.consistent);

                  return (
                    <button
                      key={ch}
                      type="button"
                      disabled={!canOperate}
                      onClick={() => {
                        enigmaAudio.playPlugJack(true);
                        setSelectedPartnerIdx(charIdx);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition sm:h-9 sm:w-9 ${
                        selected ? 'ring-2 ring-amber-400 ' : ''
                      }${
                        coherent
                          ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200'
                          : 'border-zinc-400/60 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black text-zinc-300 hover:border-bletchley-brass hover:text-bletchley-brass-bright'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
