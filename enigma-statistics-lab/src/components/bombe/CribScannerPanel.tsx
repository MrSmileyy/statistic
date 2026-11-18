import React, { useState } from 'react';
import { normalizeAsciiLetters } from '../../core/constants';
import type { CribAlignment, Language } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface CribScannerPanelProps {
  ciphertext: string;
  crib: string;
  alignments: CribAlignment[];
  selectedOffset: number;
  language?: Language;
  onCiphertextChange: (text: string) => void;
  onCribChange: (crib: string) => void;
  onSelectOffset: (offset: number) => void;
  onLoadSample?: () => void;
}

const CRIB_PRESETS = [
  'WETTERBERICHT',
  'WETTERVORHERSAGE',
  'KEINEBESONDERENEREIGNISSE',
];

export const CribScannerPanel: React.FC<CribScannerPanelProps> = ({
  ciphertext,
  crib,
  alignments,
  selectedOffset,
  onCiphertextChange,
  onCribChange,
  onSelectOffset,
  onLoadSample,
}) => {
  const [showInvalid, setShowInvalid] = useState<boolean>(true);

  const cleanCipher = normalizeAsciiLetters(ciphertext);
  const cleanCrib = normalizeAsciiLetters(crib);

  const activeAlignment =
    alignments.find((a) => a.offset === selectedOffset) ?? alignments[0] ?? null;

  const validAlignments = alignments.filter((a) => a.isValid);
  const visibleAlignments =
    showInvalid || validAlignments.length === 0 ? alignments : validAlignments;

  const maxOffset = Math.max(0, alignments.length - 1);
  const clampedOffset = Math.min(maxOffset, Math.max(0, selectedOffset));

  const handleStepOffset = (delta: number) => {
    if (alignments.length === 0) return;
    const next = Math.min(maxOffset, Math.max(0, clampedOffset + delta));
    onSelectOffset(next);
  };

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
          <span>Crib Alignment &amp; Reflector Collision Filter</span>
          <InfoTooltip
            title="Crib Sliding & Collision Test"
            text="A crib is a word we guess appears in the plaintext (like WETTERBERICHT). Because Enigma never encrypts a letter as itself, any position where a ciphertext letter matches the crib letter underneath it is immediately impossible."
            align="left"
          />
        </h3>
        <div className="flex items-center gap-2">
          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              className="rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Load sample intercept
            </button>
          )}
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2.5 py-1 font-mono text-xs text-zinc-400">
            Valid offsets:{' '}
            <strong className="ml-1 text-amber-300">
              {validAlignments.length}/{alignments.length}
            </strong>
            <InfoTooltip
              title="Valid Crib Offsets"
              text="Counts how many positions along the ciphertext have zero self-encrypted collisions and can safely be fed into the Turing Menu graph."
              align="right"
            />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="mb-1 inline-flex items-center font-mono text-xs text-zinc-400">
            Intercepted Ciphertext ({cleanCipher.length} chars)
            <InfoTooltip
              title="Intercepted Ciphertext"
              text="The encrypted radio message captured from Enigma. Only A–Z letters are aligned."
              align="left"
            />
          </label>
          <textarea
            rows={2}
            value={ciphertext}
            onChange={(e) => onCiphertextChange(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs uppercase tracking-wider text-zinc-100 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 inline-flex items-center font-mono text-xs text-zinc-400">
            Assumed Plaintext Crib ({cleanCrib.length} chars)
            <InfoTooltip
              title="Probable Word (Crib)"
              text="A guessed German or English phrase expected inside the message (e.g., weather report terms). Longer cribs create more loops in the Bombe menu."
            />
          </label>
          <input
            type="text"
            value={crib}
            onChange={(e) => onCribChange(e.target.value)}
            placeholder="WETTERBERICHT"
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 focus:border-amber-500 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CRIB_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onCribChange(preset)}
                className={`rounded border px-2 py-0.5 font-mono text-[10px] transition ${
                  cleanCrib === preset
                    ? 'border-amber-500/70 bg-amber-500/20 font-bold text-amber-300'
                    : 'border-zinc-700 bg-[#08090c] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Sliding Bar */}
      <div className="mt-3 rounded border border-zinc-800 bg-[#08090c] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={clampedOffset <= 0 || alignments.length === 0}
            onClick={() => handleStepOffset(-1)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 font-mono text-xs text-zinc-200 transition hover:border-zinc-500 disabled:opacity-40"
          >
            &larr; Shift Crib
          </button>

          <div className="flex min-w-[200px] flex-1 items-center gap-3">
            <span className="whitespace-nowrap font-mono text-xs font-semibold text-zinc-300">
              Pos {clampedOffset + 1} (offset +{clampedOffset})
            </span>
            <input
              type="range"
              min={0}
              max={maxOffset}
              value={clampedOffset}
              disabled={maxOffset === 0}
              onChange={(e) => onSelectOffset(Number(e.target.value))}
              aria-label="Slide crib offset"
              className="h-1.5 w-full cursor-pointer accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>

          <button
            type="button"
            disabled={clampedOffset >= maxOffset || alignments.length === 0}
            onClick={() => handleStepOffset(1)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 font-mono text-xs text-zinc-200 transition hover:border-zinc-500 disabled:opacity-40"
          >
            Shift Crib &rarr;
          </button>
        </div>

        {/* Status Banner */}
        {activeAlignment && (
          <div
            className={`mt-2.5 rounded border px-3 py-2 font-mono text-xs ${
              activeAlignment.isValid
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-rose-500/50 bg-rose-950/35 text-rose-300'
            }`}
          >
            {activeAlignment.isValid ? (
              <span>
                <strong>Valid Alignment (0 collisions)</strong> &mdash; Turing Menu &amp; Loop Graph active at offset +{activeAlignment.offset} (positions {activeAlignment.offset + 1}&ndash;{activeAlignment.offset + cleanCrib.length}).
              </span>
            ) : (
              <span>
                <strong>Collision Detected ({activeAlignment.collisionIndices.length})</strong> &mdash; Because Enigma&rsquo;s reflector swaps 13 disjoint pairs, E(x) &ne; x always holds. Any column where Cipher = Crib is impossible.
              </span>
            )}
          </div>
        )}

        {/* Two-Row Sliding Alignment Grid across Ciphertext */}
        {cleanCipher.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded border border-zinc-800 bg-[#0d0e12] p-2.5">
            <div className="inline-flex items-stretch gap-1 font-mono text-xs">
              <div className="sticky left-0 z-10 flex shrink-0 flex-col items-end justify-between bg-[#0d0e12] pr-2 text-[10px] font-bold text-zinc-500">
                <span className="flex h-4 items-center">Pos</span>
                <span className="flex h-6 items-center text-sky-300">Cipher</span>
                <span className="flex h-6 items-center text-amber-300">Crib</span>
                <span className="flex h-5 items-center">Check</span>
              </div>

              {cleanCipher.split('').map((cChar, i) => {
                const inCrib =
                  activeAlignment !== null &&
                  i >= clampedOffset &&
                  i < clampedOffset + cleanCrib.length;
                const pChar = inCrib ? cleanCrib[i - clampedOffset] : '';
                const collided = inCrib && cChar === pChar;
                const validWindow = inCrib && activeAlignment?.isValid;

                return (
                  <div
                    key={i}
                    className={`flex w-7 shrink-0 flex-col items-center rounded border py-0.5 transition-colors ${
                      collided
                        ? 'border-rose-500/70 bg-rose-950/50 text-rose-200'
                        : validWindow
                          ? 'border-emerald-500/50 bg-emerald-950/35 text-emerald-200'
                          : inCrib
                            ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                            : 'border-zinc-800/80 bg-[#08090c] text-zinc-500'
                    }`}
                  >
                    <span className="flex h-4 items-center text-[9px] text-zinc-500">
                      {i + 1}
                    </span>
                    <span
                      className={`flex h-6 items-center font-bold ${
                        collided
                          ? 'text-rose-300'
                          : inCrib
                            ? 'text-sky-300'
                            : 'text-zinc-400'
                      }`}
                    >
                      {cChar}
                    </span>
                    <span
                      className={`flex h-6 items-center font-bold ${
                        collided
                          ? 'text-rose-300'
                          : validWindow
                            ? 'text-emerald-300'
                            : inCrib
                              ? 'text-amber-300'
                              : 'text-transparent'
                      }`}
                    >
                      {inCrib ? pChar : '·'}
                    </span>
                    <span className="flex h-5 items-center text-[10px] font-bold">
                      {collided ? (
                        <span className="text-rose-400" title="Self-encryption collision">
                          &#10005;
                        </span>
                      ) : validWindow ? (
                        <span className="text-emerald-400" title="Compatible pair">
                          &#10003;
                        </span>
                      ) : inCrib ? (
                        <span className="text-zinc-500">&middot;</span>
                      ) : (
                        <span className="text-transparent">&middot;</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Candidate Offset Selector */}
      <div className="mt-3 border-t border-zinc-800 pt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center font-mono text-xs text-zinc-400">
            All Offsets (click to jump)
            <InfoTooltip
              title="Offset Pills"
              text="Green pills have 0 collisions (valid crib alignments). Red pills show the number of impossible letter collisions in parentheses."
              align="left"
            />
          </span>

          {alignments.length > validAlignments.length && validAlignments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInvalid((v) => !v)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:border-zinc-500"
            >
              {showInvalid
                ? 'Show valid only'
                : `Show ${alignments.length - validAlignments.length} excluded`}
            </button>
          )}
        </div>

        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded border border-zinc-800 bg-[#08090c] p-2">
          {visibleAlignments.map((al) => {
            const active = activeAlignment?.offset === al.offset;
            return (
              <button
                key={al.offset}
                type="button"
                onClick={() => onSelectOffset(al.offset)}
                className={`rounded border px-2 py-0.5 font-mono text-[11px] transition ${
                  active
                    ? al.isValid
                      ? 'border-emerald-400 bg-emerald-500/25 font-bold text-emerald-200'
                      : 'border-rose-400 bg-rose-500/25 font-bold text-rose-200'
                    : al.isValid
                      ? 'border-zinc-700 bg-zinc-900 text-emerald-300 hover:border-emerald-500/60'
                      : 'border-zinc-800 bg-zinc-950 text-rose-400/75 hover:border-rose-500/50'
                }`}
              >
                +{al.offset}
                {!al.isValid && ` (${al.collisionIndices.length})`}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
