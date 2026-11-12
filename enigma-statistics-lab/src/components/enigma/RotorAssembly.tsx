import React from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Save, Zap } from 'lucide-react';
import {
  ALPHABET_SIZE,
  indexToChar,
  REFLECTOR_IDS,
  ROTOR_IDS,
  ROTORS,
} from '../../core/constants';
import { TRANSLATIONS } from '../../i18n/translations';
import type {
  EnigmaConfig,
  Language,
  ReflectorId,
  RotorId,
  SignalTrace,
} from '../../types';

interface RotorAssemblyProps {
  config: EnigmaConfig;
  savedGround: [number, number, number];
  lastTrace: SignalTrace | null;
  language: Language;
  onChange: (next: EnigmaConfig) => void;
  onBookmarkGround: () => void;
  onRestoreGround: () => void;
}

export const RotorAssembly: React.FC<RotorAssemblyProps> = ({
  config,
  savedGround,
  lastTrace,
  language,
  onChange,
  onBookmarkGround,
  onRestoreGround,
}) => {
  const t = TRANSLATIONS[language].enigma;
  const slotLabels = [t.leftRotor, t.middleRotor, t.rightRotor];

  const handleRotorSelect = (slot: 0 | 1 | 2, rotorId: RotorId) => {
    const nextRotors: [RotorId, RotorId, RotorId] = [...config.rotors] as [
      RotorId,
      RotorId,
      RotorId,
    ];
    nextRotors[slot] = rotorId;
    onChange({ ...config, rotors: nextRotors });
  };

  const handleRingChange = (slot: 0 | 1 | 2, ringIdx: number) => {
    const nextRings: [number, number, number] = [...config.ringSettings] as [
      number,
      number,
      number,
    ];
    nextRings[slot] = ringIdx;
    onChange({ ...config, ringSettings: nextRings });
  };

  const handlePositionDelta = (slot: 0 | 1 | 2, delta: number) => {
    const nextPos: [number, number, number] = [...config.rotorPositions] as [
      number,
      number,
      number,
    ];
    nextPos[slot] = (nextPos[slot] + delta + ALPHABET_SIZE) % ALPHABET_SIZE;
    onChange({ ...config, rotorPositions: nextPos });
  };

  const handleReflectorChange = (reflector: ReflectorId) => {
    onChange({ ...config, reflector });
  };

  return (
    <section className="bletchley-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-bletchley-brass">
            {t.rotorsHeader}
          </h3>
          {lastTrace?.doubleStepped && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300 animate-pulse">
              <Zap className="h-3 w-3" />
              {t.doubleStepBadge}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBookmarkGround}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-bletchley-brass/60 hover:text-bletchley-brass-bright"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{t.resetPositions}</span>
            <span className="font-mono text-bletchley-brass">
              ({config.rotorPositions.map((p) => indexToChar(p)).join('')})
            </span>
          </button>

          <button
            type="button"
            onClick={onRestoreGround}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-bletchley-signal/60 hover:text-bletchley-signal"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t.syncGroundBtn}</span>
            <span className="font-mono text-bletchley-signal">
              ({savedGround.map((p) => indexToChar(p)).join('')})
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Reflector Selector Card */}
        <div className="flex flex-col justify-between rounded-xl border border-bletchley-border bg-bletchley-card/80 p-3.5">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {t.reflectorLabel}
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {REFLECTOR_IDS.map((reflId) => {
                const active = config.reflector === reflId;
                return (
                  <button
                    key={reflId}
                    type="button"
                    onClick={() => handleReflectorChange(reflId)}
                    className={`rounded-lg border py-2.5 font-mono text-sm font-bold transition ${
                      active
                        ? 'border-bletchley-brass bg-bletchley-brass/20 text-bletchley-brass-bright shadow-brass'
                        : 'border-bletchley-border bg-bletchley-slate/70 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {reflId}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-bletchley-border/70 bg-bletchley-ink/70 p-2.5 font-mono text-[11px] text-slate-400">
            <div>P(C_i = P_i) = 0</div>
            <div className="mt-0.5 text-bletchley-signal">
              {config.reflector}: fixed-point free involution
            </div>
          </div>
        </div>

        {/* Three Rotor Wheel Slots [Left=0, Middle=1, Right=2] */}
        {([0, 1, 2] as const).map((slot) => {
          const rotorId = config.rotors[slot];
          const spec = ROTORS[rotorId];
          const pos = config.rotorPositions[slot];
          const ring = config.ringSettings[slot];
          const atNotch = pos === spec.notchIndex;

          return (
            <div
              key={slot}
              className={`rounded-xl border p-3.5 transition ${
                atNotch
                  ? 'border-amber-400/70 bg-bletchley-card shadow-brass'
                  : 'border-bletchley-border bg-bletchley-card/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {slotLabels[slot]}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                    atNotch
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'bg-bletchley-ink/70 text-slate-400'
                  }`}
                >
                  {t.notchLabel}: {spec.notchChar}
                </span>
              </div>

              {/* Rotor Model & Ringstellung Controls */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={rotorId}
                  aria-label={slotLabels[slot]}
                  onChange={(e) => handleRotorSelect(slot, e.target.value as RotorId)}
                  className="rounded-lg border border-bletchley-border bg-bletchley-ink px-2 py-1.5 font-mono text-xs font-semibold text-bletchley-ivory focus:border-bletchley-brass focus:outline-none"
                >
                  {ROTOR_IDS.map((id) => (
                    <option key={id} value={id}>
                      Rotor {id} ({ROTORS[id].notchChar})
                    </option>
                  ))}
                </select>

                <select
                  value={ring}
                  aria-label={`${slotLabels[slot]} ${t.ringSettingLabel}`}
                  onChange={(e) => handleRingChange(slot, Number(e.target.value))}
                  className="rounded-lg border border-bletchley-border bg-bletchley-ink px-2 py-1.5 font-mono text-xs text-slate-200 focus:border-bletchley-brass focus:outline-none"
                >
                  {Array.from({ length: ALPHABET_SIZE }, (_, idx) => (
                    <option key={idx} value={idx}>
                      Ring {String(idx + 1).padStart(2, '0')} ({indexToChar(idx)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mechanical Drum Window Display */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-bletchley-border bg-bletchley-ink/90 px-3 py-2">
                <div className="flex flex-col items-center font-mono text-[11px] text-slate-500">
                  <span>{indexToChar(pos - 1)}</span>
                  <span className="my-0.5 text-[9px] uppercase tracking-widest text-slate-600">
                    {t.groundSettingLabel.split(' ')[0]}
                  </span>
                  <span>{indexToChar(pos + 1)}</span>
                </div>

                <div
                  key={`${slot}-${pos}`}
                  className="flex h-11 w-14 items-center justify-center rounded-md border border-bletchley-brass/50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 font-mono text-2xl font-bold text-bletchley-brass-bright shadow-inner animate-rotor-tick"
                >
                  {indexToChar(pos)}
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handlePositionDelta(slot, 1)}
                    aria-label={`Step forward rotor ${slot + 1}`}
                    className="rounded border border-bletchley-border bg-bletchley-card p-1 text-slate-300 transition hover:border-bletchley-brass hover:text-bletchley-brass-bright"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePositionDelta(slot, -1)}
                    aria-label={`Step back rotor ${slot + 1}`}
                    className="rounded border border-bletchley-border bg-bletchley-card p-1 text-slate-300 transition hover:border-bletchley-brass hover:text-bletchley-brass-bright"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

