import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eraser,
  Eye,
  EyeOff,
  FileText,
  Gamepad2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Save,
  Scissors,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ALPHABET_SIZE,
  formatPositionLabel,
  indexToChar,
  REFLECTOR_IDS,
  ROTOR_IDS,
  ROTORS,
} from '../../core/constants';
import { EnigmaM3 } from '../../core/enigma';
import { TRANSLATIONS } from '../../i18n/translations';
import { enigmaAudio } from '../../utils/enigmaAudio';
import type {
  EnigmaConfig,
  Language,
  PlugPair,
  ReflectorId,
  RotorId,
  SignalTrace,
} from '../../types';
import { PlugboardCablesSVG } from './PlugboardCablesSVG';
import { SignalPathSVG } from './SignalPathSVG';

const QWERTZ_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
  ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L'],
];

const MISSION3_CONFIG: EnigmaConfig = {
  rotors: ['I', 'III', 'II'],
  reflector: 'UKW-B',
  ringSettings: [0, 0, 0],
  rotorPositions: [12, 0, 23], // MAX
  plugboard: [
    ['B', 'E'],
    ['K', 'T'],
  ],
};

const MISSION3_TARGET_PLAIN = 'ENIGMA';
const MISSION3_CIPHER = new EnigmaM3(MISSION3_CONFIG).encryptText(
  MISSION3_TARGET_PLAIN
).ciphertext;

function formatFiveGroups(text: string): string {
  if (!text) return '—';
  return text.match(/.{1,5}/g)?.join(' ') ?? text;
}

const BrassScrew: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 20 20" className={`h-3 w-3 opacity-85 ${className}`} aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" fill="#7c5f28" stroke="#302109" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="6" fill="#c99c47" />
    <line x1="5.5" y1="6.5" x2="14.5" y2="13.5" stroke="#261a05" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface EnigmaCabinetProps {
  config: EnigmaConfig;
  savedGround: [number, number, number];
  lastTrace: SignalTrace | null;
  batchInput: string;
  batchOutput: string;
  language: Language;
  keyboardActive: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onConfigChange: (next: EnigmaConfig) => void;
  onBookmarkGround: () => void;
  onRestoreGround: () => void;
  onPressKey: (char: string) => void;
  onBatchInputChange: (val: string) => void;
  onRunBatch: () => void;
  onSwapBatch: () => void;
  onClearBatch: () => void;
  onSendToStats: (text: string) => void;
  onSendToBombe: (cipher: string) => void;
}

export const EnigmaCabinet: React.FC<EnigmaCabinetProps> = ({
  config,
  savedGround,
  lastTrace,
  batchInput,
  batchOutput,
  language,
  keyboardActive,
  fullscreen,
  onToggleFullscreen,
  onConfigChange,
  onBookmarkGround,
  onRestoreGround,
  onPressKey,
  onBatchInputChange,
  onRunBatch,
  onSwapBatch,
  onClearBatch,
  onSendToStats,
  onSendToBombe,
}) => {
  const t = TRANSLATIONS[language].enigma;
  const isIt = language === 'it';

  const [hoodOpen, setHoodOpen] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [showBatchPad, setShowBatchPad] = useState<boolean>(false);
  const [showMissions, setShowMissions] = useState<boolean>(true);
  const [activeMissionIdx, setActiveMissionIdx] = useState<number>(0);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);

  const [plainTape, setPlainTape] = useState<string>('');
  const [cipherTape, setCipherTape] = useState<string>('');
  const [heldKey, setHeldKey] = useState<string | null>(null);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    enigmaAudio.enabled = next;
  };

  const strikeKey = useCallback(
    (rawChar: string) => {
      const ch = rawChar.toUpperCase();
      const previewMachine = new EnigmaM3(config);
      const previewTrace = previewMachine.encryptChar(ch);
      if (previewTrace) {
        enigmaAudio.playKeyPress(previewTrace.doubleStepped);
        setPlainTape((p) => (p + ch).slice(-80));
        setCipherTape((c) => (c + previewTrace.lampChar).slice(-80));
      }
      onPressKey(ch);
    },
    [config, onPressKey]
  );

  useEffect(() => {
    if (!keyboardActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        const upper = e.key.toUpperCase();
        setHeldKey(upper);
        strikeKey(upper);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (/^[a-zA-Z]$/.test(e.key)) {
        setHeldKey((curr) => (curr === e.key.toUpperCase() ? null : curr));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardActive, strikeKey]);

  const markMissionWon = useCallback((missionIdx: number) => {
    setCompletedMissions((prev) => {
      if (prev.includes(missionIdx)) return prev;
      enigmaAudio.playMissionSuccess();
      return [...prev, missionIdx];
    });
  }, []);

  useEffect(() => {
    if (plainTape.endsWith('AAAAA') && cipherTape.endsWith('BDZGO')) {
      markMissionWon(0);
    }
    if (
      lastTrace?.doubleStepped &&
      config.rotors.join('-') === 'I-II-III' &&
      formatPositionLabel(config.rotorPositions) === 'BFX'
    ) {
      markMissionWon(1);
    }
    if (plainTape.endsWith(MISSION3_CIPHER) && cipherTape.endsWith(MISSION3_TARGET_PLAIN)) {
      markMissionWon(2);
    }
  }, [
    plainTape,
    cipherTape,
    lastTrace,
    config.rotors,
    config.rotorPositions,
    markMissionWon,
  ]);

  const missions = useMemo(
    () => [
      {
        id: 0,
        title: isIt
          ? 'Sfida 1 - Vettore Storico (BDZGO)'
          : 'Mission 1 - First Transmission (BDZGO)',
        goal: isIt
          ? 'Imposta I-II-III, UKW-B, anelli 01-01-01, finestra AAA e zero spine. Poi digita cinque volte A.'
          : 'Dial I-II-III, UKW-B, rings 01-01-01, window AAA with 0 cables. Strike key A five times.',
        setupLabel: isIt ? 'Prepara AAA' : 'Setup AAA',
        onSetup: () => {
          setPlainTape('');
          setCipherTape('');
          onConfigChange({
            rotors: ['I', 'II', 'III'],
            reflector: 'UKW-B',
            ringSettings: [0, 0, 0],
            rotorPositions: [0, 0, 0],
            plugboard: [],
          });
        },
      },
      {
        id: 1,
        title: isIt
          ? 'Sfida 2 - Il Doppio Scatto'
          : 'Mission 2 - Double-Stepping Anomaly',
        goal: isIt
          ? 'Con rotori I-II-III, porta la finestra su ADU. Premi 3 tasti e osserva lo scatto simultaneo verso BFX.'
          : 'With I-II-III, set window to ADU. Strike 3 keys to trigger double-stepping into BFX.',
        setupLabel: isIt ? 'Imposta ADU' : 'Dial ADU',
        onSetup: () => {
          setPlainTape('');
          setCipherTape('');
          onConfigChange({
            ...config,
            rotors: ['I', 'II', 'III'],
            rotorPositions: [0, 3, 20],
          });
        },
      },
      {
        id: 2,
        title: isIt
          ? 'Sfida 3 - Intercettazione Hut 6'
          : 'Mission 3 - Hut 6 Night Intercept',
        goal: isIt
          ? `Messaggio: ${MISSION3_CIPHER}. Chiave: I-III-II, UKW-B, anelli 01-01-01, finestra MAX, cavi BE e KT.`
          : `Intercept: ${MISSION3_CIPHER}. Key: I-III-II, UKW-B, rings 01-01-01, window MAX, plugs BE and KT.`,
        setupLabel: isIt ? 'Imposta Chiave MAX' : 'Apply Key MAX',
        onSetup: () => {
          setPlainTape('');
          setCipherTape('');
          onConfigChange(MISSION3_CONFIG);
        },
      },
    ],
    [isIt, config, onConfigChange]
  );

  const handleStepRotor = (slot: 0 | 1 | 2, delta: number) => {
    enigmaAudio.playRotorTick();
    const nextPos: [number, number, number] = [...config.rotorPositions] as [
      number,
      number,
      number,
    ];
    nextPos[slot] = (nextPos[slot] + delta + ALPHABET_SIZE) % ALPHABET_SIZE;
    onConfigChange({ ...config, rotorPositions: nextPos });
  };

  const handleRotorSelect = (slot: 0 | 1 | 2, rotorId: RotorId) => {
    enigmaAudio.playRotorTick();
    const nextRotors: [RotorId, RotorId, RotorId] = [...config.rotors] as [
      RotorId,
      RotorId,
      RotorId,
    ];
    nextRotors[slot] = rotorId;
    onConfigChange({ ...config, rotors: nextRotors });
  };

  const handleRingChange = (slot: 0 | 1 | 2, ringIdx: number) => {
    enigmaAudio.playRotorTick();
    const nextRings: [number, number, number] = [...config.ringSettings] as [
      number,
      number,
      number,
    ];
    nextRings[slot] = ringIdx;
    onConfigChange({ ...config, ringSettings: nextRings });
  };

  const operatorRank =
    completedMissions.length >= 3
      ? isIt
        ? 'Maestro Bletchley'
        : 'Bletchley Master'
      : completedMissions.length === 2
        ? isIt
          ? 'Crittoanalista Hut 6'
          : 'Hut 6 Analyst'
        : completedMissions.length === 1
          ? isIt
            ? 'Operatore Scelto'
            : 'Cipher Operator'
          : isIt
            ? 'Recluta'
            : 'Recruit';

  const litLamp = lastTrace?.lampChar ?? null;
  const activeInputKey = heldKey ?? lastTrace?.inputChar ?? null;
  const activeMission = missions[activeMissionIdx];

  return (
    <div className={fullscreen ? 'flex h-full w-full items-center justify-center' : 'space-y-4'}>
      {/* Hide Mission HUD completely in dedicated Fullscreen Machine Mode */}
      {!fullscreen && (
        <div className="rounded-xl border border-bletchley-brass/40 bg-bletchley-panel/95 px-4 py-3 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-bletchley-brass/50 bg-bletchley-brass/15 text-bletchley-brass-bright">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-bletchley-brass-bright">
                  {isIt ? 'Sfide Interattive Enigma' : 'Interactive Cipher Challenges'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  <Trophy className="h-3 w-3" />
                  {completedMissions.length}/3 - {operatorRank}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {missions.map((m, idx) => {
                const won = completedMissions.includes(idx);
                const selected = activeMissionIdx === idx;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveMissionIdx(idx);
                      setShowMissions(true);
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-bold transition ${
                      selected
                        ? 'border-bletchley-brass bg-bletchley-brass/20 text-bletchley-brass-bright'
                        : won
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-bletchley-border bg-bletchley-card text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {won && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    <span>#{idx + 1}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onToggleFullscreen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-brass bg-bletchley-brass/20 px-3 py-1 font-mono text-xs font-bold text-bletchley-brass-bright shadow-brass transition hover:bg-bletchley-brass hover:text-bletchley-ink"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>{isIt ? 'Schermo Intero' : 'Fullscreen'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMissions((s) => !s)}
                className="rounded-md border border-bletchley-border bg-bletchley-card px-2 py-1 text-xs text-slate-300 hover:text-bletchley-ivory"
              >
                {showMissions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {showMissions && activeMission && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bletchley-border/80 bg-bletchley-ink/80 px-3.5 py-2 text-xs">
              <div className="max-w-3xl space-y-0.5">
                <div className="flex items-center gap-2 font-semibold text-bletchley-ivory">
                  <span>{activeMission.title}</span>
                  {completedMissions.includes(activeMission.id) && (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                      {isIt ? 'COMPLETATA' : 'CLEARED'}
                    </span>
                  )}
                </div>
                <p className="text-slate-300">{activeMission.goal}</p>
              </div>
              <button
                type="button"
                onClick={activeMission.onSetup}
                className="shrink-0 rounded-lg border border-bletchley-brass/60 bg-bletchley-brass/15 px-3 py-1.5 font-mono text-xs font-bold text-bletchley-brass-bright transition hover:bg-bletchley-brass/25"
              >
                {activeMission.setupLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          AUTHENTIC OAK WOOD CASE & MATTE BLACK CRACKLE STEEL ENIGMA M3
         ===================================================================== */}
      <div
        className={`wood-cabinet rounded-2xl border-4 border-[#5a3b20] ${
          fullscreen
            ? 'flex h-full w-full max-w-[1160px] flex-col p-2 sm:p-3'
            : 'p-3 sm:p-4'
        }`}
      >
        <div
          className={`enigma-chassis relative rounded-xl border border-zinc-800 ${
            fullscreen
              ? 'flex min-h-0 flex-1 flex-col justify-between gap-1.5 px-3 py-2.5 sm:px-5 sm:py-3'
              : 'space-y-3 p-3.5 sm:p-5'
          }`}
        >
          <BrassScrew className="absolute left-2 top-2" />
          <BrassScrew className="absolute right-2 top-2" />
          <BrassScrew className="absolute bottom-2 left-2" />
          <BrassScrew className="absolute bottom-2 right-2" />

          {/* Top Bar: Stamped ENIGMA Plate + Compact Paper Tape + Brass Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/90 px-4 pb-2">
            <div className="flex items-center gap-2.5">
              {/* Etched Wehrmacht-style Nameplate */}
              <div className="rounded border border-zinc-600/70 bg-gradient-to-b from-zinc-900 to-black px-3 py-0.5 shadow-inner">
                <span className="font-mono text-xs font-extrabold italic tracking-[0.26em] text-zinc-100 sm:text-sm">
                  ENIGMA
                </span>
                <span className="ml-2 font-mono text-[10px] text-bletchley-brass">
                  M3·A16422
                </span>
              </div>

              {lastTrace?.doubleStepped && (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-amber-400 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  <Zap className="h-3 w-3" />
                  {t.doubleStepBadge}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHoodOpen((h) => !h)}
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px] font-semibold transition ${
                  hoodOpen
                    ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-bletchley-brass'
                }`}
              >
                {hoodOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>
                  {hoodOpen
                    ? isIt
                      ? 'Chiudi Coperchio'
                      : 'Close Lid'
                    : isIt
                      ? 'Apri Coperchio'
                      : 'Open Lid (X-Ray)'}
                </span>
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

              <button
                type="button"
                onClick={onBookmarkGround}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-bletchley-brass"
                title={t.resetPositions}
              >
                <Save className="h-3 w-3 text-bletchley-brass" />
                <span>
                  {isIt ? 'Salva' : 'Save'}: {formatPositionLabel(config.rotorPositions)}
                </span>
              </button>

              <button
                type="button"
                onClick={onRestoreGround}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-sky-300 hover:border-sky-400"
                title={t.syncGroundBtn}
              >
                <RotateCcw className="h-3 w-3" />
                <span>
                  {isIt ? 'Ripristina' : 'Reset'}: {formatPositionLabel(savedGround)}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleFullscreen}
                className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 font-mono text-[11px] font-bold transition ${
                  fullscreen
                    ? 'border-rose-500/70 bg-rose-500/20 text-rose-200 hover:bg-rose-500/35'
                    : 'border-bletchley-brass bg-bletchley-brass/20 text-bletchley-brass-bright hover:bg-bletchley-brass hover:text-bletchley-ink'
                }`}
              >
                {fullscreen ? (
                  <>
                    <Minimize2 className="h-3 w-3" />
                    <span>{isIt ? 'Esci (ESC)' : 'Exit (ESC)'}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    <span>{isIt ? 'Schermo Intero' : 'Fullscreen'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 1. UPPER ROTOR COVER & COMPACT TICKER STRIP */}
          <div className="relative rounded-lg border border-zinc-800 bg-[#0b0c0f] px-3 py-2 shadow-inner">
            {!hoodOpen ? (
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              {/* Left Block: Fixed Reflector Dial */}
              <div className="flex flex-col items-center rounded border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  UKW Reflector
                </span>
                <div className="mt-1 flex gap-1">
                  {REFLECTOR_IDS.map((reflId) => {
                    const active = config.reflector === reflId;
                    return (
                      <button
                        key={reflId}
                        type="button"
                        onClick={() => {
                          enigmaAudio.playRotorTick();
                          onConfigChange({ ...config, reflector: reflId as ReflectorId });
                        }}
                        className={`rounded border px-2 py-1 font-mono text-[11px] font-bold transition ${
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

              {/* Center Tight Bank: 3 Cylindrical Windows & Exposed Notched Steel Wheels */}
              <div className="flex items-center gap-2.5 rounded-lg border border-zinc-700/80 bg-[#14161b] px-3 py-1.5 shadow-inner sm:gap-4">
                {([0, 1, 2] as const).map((slot) => {
                  const rotorId = config.rotors[slot];
                  const spec = ROTORS[rotorId];
                  const pos = config.rotorPositions[slot];
                  const ring = config.ringSettings[slot];
                  const atNotch = pos === spec.notchIndex;

                  return (
                    <div key={slot} className="flex items-center gap-1.5">
                      <div className="flex flex-col items-center gap-1">
                        {/* Tight top wheel / ring selector */}
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[9px] font-bold uppercase text-zinc-500">
                            {slot === 0 ? 'SX' : slot === 1 ? 'CX' : 'DX'}
                          </span>
                          <select
                            value={rotorId}
                            aria-label={`Rotor ${slot + 1}`}
                            title={isIt ? 'Tipo di rotore (I–V)' : 'Rotor wheel (I–V)'}
                            onChange={(e) => handleRotorSelect(slot, e.target.value as RotorId)}
                            className="rounded border border-zinc-700 bg-black px-1 py-0.5 font-mono text-[10px] font-bold text-bletchley-brass-bright focus:outline-none"
                          >
                            {ROTOR_IDS.map((id) => (
                              <option key={id} value={id}>
                                {id}({ROTORS[id].notchChar})
                              </option>
                            ))}
                          </select>
                          <select
                            value={ring}
                            aria-label={`Ring ${slot + 1}`}
                            title={isIt ? 'Anello interno (Ringstellung)' : 'Ring setting'}
                            onChange={(e) => handleRingChange(slot, Number(e.target.value))}
                            className="rounded border border-zinc-800 bg-black px-1 py-0.5 font-mono text-[10px] text-zinc-400 focus:outline-none"
                          >
                            {Array.from({ length: ALPHABET_SIZE }, (_, idx) => (
                              <option key={idx} value={idx}>
                                {String(idx + 1).padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Authentic Riveted Beveled Drum Window */}
                        <div
                          className={`relative flex items-center justify-center rounded border-2 px-1.5 py-0.5 shadow-inner ${
                            atNotch
                              ? 'border-amber-500/80 bg-[#1c170d]'
                              : 'border-zinc-500/70 bg-gradient-to-b from-zinc-950 via-zinc-800 to-zinc-950'
                          }`}
                        >
                          <div
                            key={`${slot}-${pos}`}
                            className="flex h-8 w-8 items-center justify-center rounded-sm border border-zinc-400/50 bg-[#ece4cf] font-mono text-lg font-extrabold text-zinc-950 shadow-inner animate-rotor-tick"
                          >
                            {indexToChar(pos)}
                          </div>
                          {atNotch && (
                            <span
                              title={`Notch ${spec.notchChar}`}
                              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 shadow-lamp"
                            />
                          )}
                        </div>
                      </div>

                      {/* Protruding Notched Thumbwheel */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => handleStepRotor(slot, -1)}
                          aria-label={`Roll rotor ${slot + 1} backward`}
                          className="flex h-4 w-5 items-center justify-center rounded-t border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-bletchley-brass"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <div
                          onClick={() => handleStepRotor(slot, 1)}
                          className="knurled-wheel h-8 w-5 cursor-pointer border-x border-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepRotor(slot, 1)}
                          aria-label={`Roll rotor ${slot + 1} forward`}
                          className="flex h-4 w-5 items-center justify-center rounded-b border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-bletchley-brass"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Block: Compact Inline Perforated Paper Tape */}
              <div className="flex min-w-[230px] flex-1 flex-col gap-1 sm:max-w-sm">
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                  <span>{isIt ? 'NASTRO LIVE' : 'PAPER TAPE'}</span>
                  <div className="flex items-center gap-1">
                    {!fullscreen && (
                      <>
                        <button
                          type="button"
                          disabled={!cipherTape}
                          onClick={() => onSendToStats(cipherTape)}
                          className="inline-flex items-center gap-0.5 rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300 disabled:opacity-40"
                        >
                          <BarChart3 className="h-2.5 w-2.5" />
                          <span>Stats</span>
                        </button>
                        <button
                          type="button"
                          disabled={!cipherTape}
                          onClick={() => onSendToBombe(cipherTape)}
                          className="inline-flex items-center gap-0.5 rounded border border-bletchley-brass/50 bg-bletchley-brass/10 px-1.5 py-0.5 text-[10px] text-bletchley-brass-bright disabled:opacity-40"
                        >
                          <Cpu className="h-2.5 w-2.5" />
                          <span>Bombe</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPlainTape('');
                        setCipherTape('');
                      }}
                      className="inline-flex items-center gap-0.5 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-rose-500/50"
                    >
                      <Scissors className="h-2.5 w-2.5" />
                      <span>{isIt ? 'Taglia' : 'Cut'}</span>
                    </button>
                  </div>
                </div>

                <div className="paper-tape overflow-x-auto rounded border border-[#c7b998] px-2.5 py-1 font-mono text-[11px] leading-tight text-zinc-900">
                  <div className="flex gap-2 whitespace-nowrap">
                    <span className="w-10 shrink-0 font-bold text-zinc-500">KEY :</span>
                    <span className="tracking-widest font-semibold">
                      {formatFiveGroups(plainTape.slice(-30))}
                    </span>
                  </div>
                  <div className="flex gap-2 whitespace-nowrap">
                    <span className="w-10 shrink-0 font-bold text-[#8a3a18]">LAMP:</span>
                    <span className="tracking-widest font-extrabold">
                      {formatFiveGroups(cipherTape.slice(-30))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <SignalPathSVG
                config={config}
                trace={lastTrace}
                language={language}
                compact={fullscreen}
              />
            )}
          </div>

          {/* 2. GLÜHLAMPENFELD (AUTHENTIC MATTE BLACK LAMPBOARD) */}
          <div
            className={`rounded-lg border border-zinc-800/90 bg-[#08090b] shadow-inner ${
              fullscreen
                ? 'flex flex-1 min-h-0 flex-col justify-center px-3 py-2'
                : 'px-3 py-3'
            }`}
          >
            <div className={fullscreen ? 'space-y-1.5' : 'space-y-2'}>
              {QWERTZ_ROWS.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-2 sm:gap-3.5">
                  {row.map((ch) => {
                    const isLit = litLamp === ch;
                    return (
                      <div
                        key={ch}
                        className={`flex items-center justify-center rounded-full border font-mono font-extrabold transition-all duration-100 ${
                          fullscreen
                            ? 'h-9 w-9 text-xs sm:h-10 sm:w-10 sm:text-sm'
                            : 'h-9 w-9 text-sm sm:h-11 sm:w-11 sm:text-base'
                        } ${
                          isLit
                            ? 'scale-110 border-amber-200 bg-gradient-to-b from-amber-100 via-amber-400 to-amber-500 text-zinc-950 shadow-lamp'
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

          {/* 3. TASTATUR (SPRING-MOUNTED CHROME-BEZEL MECHANICAL KEYS) */}
          <div
            className={`rounded-lg border border-zinc-800/90 bg-[#111216] ${
              fullscreen
                ? 'flex flex-1 min-h-0 flex-col justify-center px-3 py-2'
                : 'px-3 py-3'
            }`}
          >
            <div className={fullscreen ? 'space-y-2' : 'space-y-2.5'}>
              {QWERTZ_ROWS.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-2 sm:gap-3">
                  {row.map((ch) => {
                    const pressed = activeInputKey === ch && heldKey === ch;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => strikeKey(ch)}
                        className={`flex items-center justify-center rounded-full border-2 border-zinc-300/80 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black font-mono font-bold text-zinc-100 ring-1 ring-black transition-transform duration-75 ${
                          fullscreen
                            ? 'h-9 w-9 text-xs sm:h-10 sm:w-10 sm:text-sm'
                            : 'h-9 w-9 text-sm sm:h-11 sm:w-11 sm:text-base'
                        } ${
                          pressed
                            ? 'translate-y-[3px] border-amber-400 shadow-none'
                            : 'shadow-[0_4px_0_#040406,0_5px_9px_rgba(0,0,0,0.8)] hover:border-bletchley-brass hover:text-bletchley-brass-bright active:translate-y-[3px] active:shadow-none'
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

          {/* 4. HINGED FRONT STECKERBRETT FLAP */}
          {!hoodOpen && (
            <PlugboardCablesSVG
              plugboard={config.plugboard}
              language={language}
              fullscreen={fullscreen}
              onChange={(pairs: PlugPair[]) => onConfigChange({ ...config, plugboard: pairs })}
            />
          )}
        </div>
      </div>

      {/* Collapsible Operator Batch Notepad (Hidden cleanly in Fullscreen Mode) */}
      {!fullscreen && (
        <section className="bletchley-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBatchPad((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-bletchley-card/60"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-bletchley-brass" />
              <span className="font-display text-sm font-semibold text-bletchley-ivory">
                {t.batchTitle}
              </span>
              <span className="font-mono text-xs text-slate-400">
                ({batchOutput.length} chars)
              </span>
            </div>
            {showBatchPad ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showBatchPad && (
            <div className="space-y-3 border-t border-bletchley-border p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t.batchInputLabel}
                  </label>
                  <textarea
                    value={batchInput}
                    onChange={(e) => onBatchInputChange(e.target.value)}
                    rows={3}
                    placeholder={t.batchPlaceholder}
                    className="w-full rounded-lg border border-bletchley-border bg-bletchley-ink p-2.5 font-mono text-xs uppercase text-bletchley-ivory focus:border-bletchley-brass focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t.batchOutputLabel}
                  </label>
                  <div className="min-h-[76px] break-all rounded-lg border border-bletchley-border bg-bletchley-ink/90 p-2.5 font-mono text-xs text-bletchley-lamp">
                    {batchOutput || '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onRunBatch}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-bletchley-brass px-3 py-1.5 text-xs font-bold text-bletchley-ink hover:bg-bletchley-brass-bright"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{t.encryptBatchBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onSwapBatch}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span>{t.swapIOBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClearBatch}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-3 py-1.5 text-xs text-slate-300 hover:border-rose-500/60"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span>{t.clearBatchBtn}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!batchOutput}
                    onClick={() => onSendToStats(batchOutput)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-signal/50 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-40"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>{t.sendToStatsBtn}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!batchOutput}
                    onClick={() => onSendToBombe(batchOutput)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-brass/50 bg-bletchley-brass/10 px-3 py-1.5 text-xs font-medium text-bletchley-brass-bright hover:bg-bletchley-brass/20 disabled:opacity-40"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    <span>{t.sendToBombeBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
