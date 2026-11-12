import React, { useState } from 'react';
import { normalizeAsciiLetters } from '../../core/constants';
import type { CribAlignment, Language } from '../../types';

interface CribScannerPanelProps {
  ciphertext: string;
  crib: string;
  alignments: CribAlignment[];
  selectedOffset: number;
  language: Language;
  compactHeader?: boolean;
  onCiphertextChange: (text: string) => void;
  onCribChange: (crib: string) => void;
  onSelectOffset: (offset: number) => void;
}

export const CribScannerPanel: React.FC<CribScannerPanelProps> = ({
  ciphertext,
  crib,
  alignments,
  selectedOffset,
  language,
  compactHeader = false,
  onCiphertextChange,
  onCribChange,
  onSelectOffset,
}) => {
  const isIt = language === 'it';
  const [showInvalid, setShowInvalid] = useState<boolean>(false);

  const cleanCipher = normalizeAsciiLetters(ciphertext);
  const cleanCrib = normalizeAsciiLetters(crib);

  const activeAlignment =
    alignments.find((a) => a.offset === selectedOffset) ?? alignments[0] ?? null;

  const validAlignments = alignments.filter((a) => a.isValid);
  const visibleAlignments =
    showInvalid || validAlignments.length === 0 ? alignments : validAlignments;

  const maxOffset = Math.max(0, alignments.length - 1);

  const handleStepOffset = (delta: number) => {
    if (alignments.length === 0) return;
    const next = Math.min(maxOffset, Math.max(0, selectedOffset + delta));
    onSelectOffset(next);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4 shadow-panel sm:p-5">
      {!compactHeader && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100">
              {isIt ? 'Fase 1 - Allineamento della parola ipotizzata' : 'Phase 1 - Word Alignment'}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isIt
                ? 'Scorri la parola lungo il cifrato per trovare le posizioni prive di lettere coincidenti.'
                : 'Slide the assumed word along the ciphertext to find positions with no matching letters.'}
            </p>
          </div>
          <span className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-bletchley-brass-bright">
            {isIt ? 'Compatibili' : 'Valid'}: {validAlignments.length}/{alignments.length}
          </span>
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {isIt
              ? `Messaggio cifrato (${cleanCipher.length} lettere)`
              : `Ciphertext (${cleanCipher.length} letters)`}
          </label>
          <textarea
            rows={2}
            value={ciphertext}
            onChange={(e) => onCiphertextChange(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs uppercase tracking-wider text-zinc-100 focus:border-bletchley-brass focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {isIt
              ? `Parola ipotizzata (${cleanCrib.length} lettere)`
              : `Assumed word (${cleanCrib.length} letters)`}
          </label>
          <input
            type="text"
            value={crib}
            onChange={(e) => onCribChange(e.target.value)}
            placeholder="WETTERBERICHT"
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-2.5 font-mono text-xs uppercase tracking-wider text-bletchley-brass-bright focus:border-bletchley-brass focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-zinc-400">
              {isIt ? 'Scorrimento:' : 'Offset:'}{' '}
              <strong className="text-zinc-100">{selectedOffset}</strong>
            </span>
            <div className="inline-flex gap-1">
              <button
                type="button"
                disabled={selectedOffset <= 0}
                onClick={() => handleStepOffset(-1)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
              >
                &larr;
              </button>
              <button
                type="button"
                disabled={selectedOffset >= maxOffset}
                onClick={() => handleStepOffset(1)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compatible Positions Bar */}
      <div className="mt-4 border-t border-zinc-800/80 pt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
            {isIt
              ? `Posizioni compatibili (${validAlignments.length} su ${alignments.length})`
              : `Compatible positions (${validAlignments.length} of ${alignments.length})`}
          </span>

          {alignments.length > validAlignments.length && validAlignments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInvalid((v) => !v)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:border-zinc-500"
            >
              {showInvalid
                ? isIt
                  ? 'Mostra solo compatibili'
                  : 'Show compatible only'
                : isIt
                  ? `Mostra anche le ${alignments.length - validAlignments.length} escluse`
                  : `Show ${alignments.length - validAlignments.length} excluded`}
            </button>
          )}
        </div>

        <p className="mb-2 text-xs text-zinc-400">
          {isIt
            ? 'In Enigma il riflettore impedisce che una lettera venga cifrata in se stessa. Se in una posizione compaiono due lettere identiche in verticale, quella posizione viene scartata.'
            : 'Because of the reflector, Enigma never encrypts a letter into itself. Any position where identical letters line up vertically is impossible.'}
        </p>

        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded border border-zinc-800 bg-[#08090c] p-2">
          {visibleAlignments.map((al) => {
            const active = activeAlignment?.offset === al.offset;
            return (
              <button
                key={al.offset}
                type="button"
                onClick={() => onSelectOffset(al.offset)}
                className={`rounded border px-2.5 py-1 font-mono text-[11px] transition ${
                  active
                    ? al.isValid
                      ? 'border-bletchley-brass bg-bletchley-brass/25 font-bold text-bletchley-brass-bright'
                      : 'border-rose-500 bg-rose-950/80 font-bold text-rose-200'
                    : al.isValid
                      ? 'border-zinc-700 bg-zinc-900 text-emerald-300 hover:border-emerald-500/60'
                      : 'border-zinc-800 bg-zinc-950 text-rose-400/70 hover:border-rose-500/40'
                }`}
              >
                {isIt ? `Pos ${al.offset}` : `Pos ${al.offset}`}
                {!al.isValid && ` (${al.collisionIndices.length})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Telegraph Tape Letter-by-Letter Alignment */}
      {activeAlignment && (
        <div className="mt-4 rounded border border-zinc-800 bg-[#08090c] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <span className="text-zinc-300">
              {isIt
                ? `Verifica sovrapposizione alla posizione ${activeAlignment.offset}`
                : `Alignment check at position ${activeAlignment.offset}`}
            </span>
            <span
              className={
                activeAlignment.isValid ? 'text-emerald-400' : 'text-rose-400'
              }
            >
              {activeAlignment.isValid
                ? isIt
                  ? 'Esito: posizione compatibile (0 collisioni)'
                  : 'Status: compatible position (0 collisions)'
                : isIt
                  ? `Esito: posizione esclusa (${activeAlignment.collisionIndices.length} lettere uguali)`
                  : `Status: excluded (${activeAlignment.collisionIndices.length} identical letters)`}
            </span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-1 font-mono text-xs">
              <div className="flex flex-col items-end pr-2 text-[10px] uppercase tracking-wider text-zinc-500">
                <span className="h-4">Pos</span>
                <span className="flex h-6 items-center text-zinc-300">
                  {isIt ? 'Cifrato' : 'Cipher'}
                </span>
                <span className="flex h-6 items-center text-bletchley-brass-bright">
                  {isIt ? 'Parola' : 'Word'}
                </span>
              </div>

              {activeAlignment.crib.split('').map((pChar, i) => {
                const cChar = activeAlignment.cipherSlice[i] ?? '?';
                const collided = cChar === pChar;
                return (
                  <div
                    key={i}
                    className={`flex w-7 flex-col items-center rounded border py-0.5 ${
                      collided
                        ? 'border-rose-500 bg-rose-950/60 text-rose-200'
                        : 'border-zinc-800 bg-zinc-900/90 text-zinc-200'
                    }`}
                  >
                    <span className="h-4 text-[9px] text-zinc-500">
                      {activeAlignment.offset + i}
                    </span>
                    <span className="flex h-6 items-center font-bold text-zinc-100">
                      {cChar}
                    </span>
                    <span className="flex h-6 items-center font-bold text-bletchley-brass-bright">
                      {pChar}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
