import React, { useEffect } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Cpu,
  Eraser,
  Lightbulb,
  Play,
} from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import type { Language, SignalTrace } from '../../types';

const QWERTZ_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
  ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L'],
];

interface KeyboardLampboardProps {
  activeTrace: SignalTrace | null;
  batchInput: string;
  batchOutput: string;
  language: Language;
  keyboardActive: boolean;
  onPressKey: (char: string) => void;
  onBatchInputChange: (val: string) => void;
  onRunBatch: () => void;
  onSwapBatch: () => void;
  onClearBatch: () => void;
  onSendToStats: (text: string) => void;
  onSendToBombe: (ciphertext: string) => void;
}

function formatFiveLetterGroups(text: string): string {
  if (!text) return '—';
  return text.match(/.{1,5}/g)?.join(' ') ?? text;
}

export const KeyboardLampboard: React.FC<KeyboardLampboardProps> = ({
  activeTrace,
  batchInput,
  batchOutput,
  language,
  keyboardActive,
  onPressKey,
  onBatchInputChange,
  onRunBatch,
  onSwapBatch,
  onClearBatch,
  onSendToStats,
  onSendToBombe,
}) => {
  const t = TRANSLATIONS[language].enigma;
  const litChar = activeTrace?.lampChar ?? null;
  const pressedChar = activeTrace?.inputChar ?? null;

  useEffect(() => {
    if (!keyboardActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
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
        onPressKey(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardActive, onPressKey]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Lampboard + Tactile QWERTZ Keyboard */}
      <section className="bletchley-card p-4 sm:p-5 lg:col-span-7">
        {/* Lampboard */}
        <div className="mb-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-bletchley-brass">
              <Lightbulb className="h-4 w-4" />
              <span>{t.lampboardTitle}</span>
            </h3>
            {litChar && (
              <span className="font-mono text-xs text-amber-300">
                {pressedChar} → <strong>{litChar}</strong>
              </span>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-bletchley-border bg-bletchley-ink/90 p-3">
            {QWERTZ_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2.5">
                {row.map((ch) => {
                  const lit = litChar === ch;
                  return (
                    <div
                      key={ch}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs font-bold transition-all duration-150 sm:h-9 sm:w-9 sm:text-sm ${
                        lit
                          ? 'scale-110 border-amber-300 bg-amber-300 text-slate-950 shadow-lamp'
                          : 'border-slate-700 bg-slate-900/90 text-slate-500'
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

        {/* Interactive Mechanical Keyboard */}
        <div>
          <h3 className="mb-2.5 font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.keyboardTitle}
          </h3>
          <div className="space-y-2 rounded-xl border border-bletchley-border bg-bletchley-card/60 p-3">
            {QWERTZ_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2">
                {row.map((ch) => {
                  const pressed = pressedChar === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => onPressKey(ch)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border font-mono text-xs font-bold shadow transition active:translate-y-0.5 sm:h-10 sm:w-10 sm:text-sm ${
                        pressed
                          ? 'border-bletchley-signal bg-sky-500/25 text-sky-200'
                          : 'border-slate-600 bg-gradient-to-b from-slate-700 to-slate-900 text-bletchley-ivory hover:border-bletchley-brass hover:text-bletchley-brass-bright'
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
      </section>

      {/* Batch Stream Console & 5-Letter Telegraph Tape */}
      <section className="bletchley-card flex flex-col justify-between p-4 sm:p-5 lg:col-span-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-bletchley-brass">
              {t.batchTitle}
            </h3>
            <button
              type="button"
              onClick={onClearBatch}
              className="inline-flex items-center gap-1 rounded border border-bletchley-border bg-bletchley-card px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
            >
              <Eraser className="h-3 w-3" />
              <span>{t.clearBatchBtn}</span>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              {t.batchInputLabel}
            </label>
            <textarea
              value={batchInput}
              onChange={(e) => onBatchInputChange(e.target.value)}
              rows={3}
              placeholder={t.batchPlaceholder}
              className="w-full rounded-lg border border-bletchley-border bg-bletchley-ink p-2.5 font-mono text-xs uppercase text-bletchley-ivory placeholder:normal-case placeholder:text-slate-600 focus:border-bletchley-brass focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRunBatch}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-bletchley-brass px-3 py-2 text-xs font-bold text-bletchley-ink transition hover:bg-bletchley-brass-bright"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{t.encryptBatchBtn}</span>
            </button>
            <button
              type="button"
              onClick={onSwapBatch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-bletchley-signal/60"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>{t.swapIOBtn}</span>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              {t.batchOutputLabel}
            </label>
            <div className="min-h-[76px] break-all rounded-lg border border-bletchley-border bg-bletchley-ink/90 p-2.5 font-mono text-xs text-bletchley-lamp">
              {batchOutput || '—'}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {t.tapeLabel}
            </span>
            <div className="max-h-20 overflow-y-auto rounded-lg border border-bletchley-border/70 bg-bletchley-slate/90 px-3 py-2 font-mono text-xs tracking-widest text-bletchley-parchment">
              {formatFiveLetterGroups(batchOutput)}
            </div>
          </div>
        </div>

        {/* Cross-Module Handoff Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-bletchley-border/60 pt-3">
          <button
            type="button"
            disabled={!batchOutput}
            onClick={() => onSendToStats(batchOutput)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-bletchley-signal/50 bg-sky-500/10 px-2.5 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{t.sendToStatsBtn}</span>
          </button>
          <button
            type="button"
            disabled={!batchOutput}
            onClick={() => onSendToBombe(batchOutput)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-bletchley-brass/50 bg-bletchley-brass/10 px-2.5 py-2 text-xs font-medium text-bletchley-brass-bright transition hover:bg-bletchley-brass/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>{t.sendToBombeBtn}</span>
          </button>
        </div>
      </section>
    </div>
  );
};

