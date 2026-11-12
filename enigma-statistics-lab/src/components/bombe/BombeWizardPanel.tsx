import React, { useState } from 'react';
import { HISTORICAL_PRESETS } from '../../core/constants';
import type {
  BombeMenu,
  CribAlignment,
  EnigmaConfig,
  Language,
  PlugPair,
  TargetLanguage,
} from '../../types';
import { BombeConsolePanel } from './BombeConsolePanel';
import { CribScannerPanel } from './CribScannerPanel';
import { MenuGraphSVG } from './MenuGraphSVG';

interface BombeWizardPanelProps {
  ciphertext: string;
  crib: string;
  alignments: CribAlignment[];
  selectedOffset: number;
  menu: BombeMenu;
  enigmaConfig: EnigmaConfig;
  targetLanguage: TargetLanguage;
  language: Language;
  onCiphertextChange: (text: string) => void;
  onCribChange: (crib: string) => void;
  onSelectOffset: (offset: number) => void;
  onLoadGuidedDemo: (presetId: string) => void;
  onConfigChange: (next: EnigmaConfig) => void;
  onApplyStopToEnigma: (
    positions: [number, number, number],
    plugboard: PlugPair[]
  ) => void;
}

type BombeStep = 1 | 2 | 3;

export const BombeWizardPanel: React.FC<BombeWizardPanelProps> = ({
  ciphertext,
  crib,
  alignments,
  selectedOffset,
  menu,
  enigmaConfig,
  targetLanguage,
  language,
  onCiphertextChange,
  onCribChange,
  onSelectOffset,
  onLoadGuidedDemo,
  onConfigChange,
  onApplyStopToEnigma,
}) => {
  const [guidedMode, setGuidedMode] = useState<boolean>(true);
  const [step, setStep] = useState<BombeStep>(1);
  const isIt = language === 'it';

  const steps: { id: BombeStep; shortTitle: string; fullTitle: string; guideText: string }[] = [
    {
      id: 1,
      shortTitle: isIt ? 'Fase 1: Allineamento parola' : 'Phase 1: Word Alignment',
      fullTitle: isIt
        ? 'Fase 1 - Allineamento della parola ipotizzata sul cifrato'
        : 'Phase 1 - Aligning the Assumed Word Against Ciphertext',
      guideText: isIt
        ? 'Inserisci il cifrato e una parola che ritieni presente nel messaggio originale (ad esempio WETTERBERICHT). Poiche Enigma non cifra mai una lettera in se stessa, seleziona una posizione in cui nessuna lettera verticale coincida.'
        : 'Enter the ciphertext and a word assumed to appear in the plaintext (such as WETTERBERICHT). Because Enigma never encrypts a letter into itself, select a position where no vertical pair matches.',
    },
    {
      id: 2,
      shortTitle: isIt ? 'Fase 2: Schema collegamenti' : 'Phase 2: Link Diagram',
      fullTitle: isIt
        ? 'Fase 2 - Collegamenti tra lettere e cicli chiusi'
        : 'Phase 2 - Letter Connections and Closed Loops',
      guideText: isIt
        ? 'Ogni corrispondenza tra cifrato e parola ipotizzata stabilisce un legame elettrico tra due lettere. Quando i legami formano un percorso chiuso, la macchina puo verificare la coerenza dell intera catena.'
        : 'Each pair between ciphertext and assumed word creates an electrical link between two letters. When links form a closed loop, the machine can test consistency across the entire chain.',
    },
    {
      id: 3,
      shortTitle: isIt ? 'Fase 3: Scansione rotori' : 'Phase 3: Rotor Scan',
      fullTitle: isIt
        ? 'Fase 3 - Scansione delle 17.576 posizioni dei rotori'
        : 'Phase 3 - Scanning All 17,576 Rotor Positions',
      guideText: isIt
        ? 'Avvia la scansione per verificare tutte le combinazioni da AAA a ZZZ. Le posizioni che non generano contraddizioni vengono elencate insieme ai cavi dedotti e al testo decifrato.'
        : 'Run the scan to check every combination from AAA to ZZZ. Positions that produce no contradictions are listed with their deduced plugboard cables and decrypted text.',
    },
  ];

  const currentStepMeta = steps.find((s) => s.id === step) ?? steps[0];

  const handleConfirmStep1 = () => {
    if (!menu.isValidAlignment) {
      const firstValid = alignments.find((a) => a.isValid);
      if (firstValid) {
        onSelectOffset(firstValid.offset);
      }
    }
    setStep(2);
  };

  return (
    <div className="space-y-4">
      {/* Console Top Bar */}
      <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4 shadow-panel sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100 sm:text-base">
              {isIt ? 'Console Bombe di Turing-Welchman' : 'Turing-Welchman Bombe Console'}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isIt
                ? 'Procedura di recupero chiave tramite parola ipotizzata (Crib).'
                : 'Key recovery procedure using an assumed plaintext word (Crib).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onLoadGuidedDemo(HISTORICAL_PRESETS[0].id);
                setStep(1);
              }}
              className="rounded border border-bletchley-brass/60 bg-bletchley-brass/15 px-3 py-1.5 font-mono text-xs font-semibold text-bletchley-brass-bright transition hover:bg-bletchley-brass/25"
            >
              {isIt ? 'Carica messaggio di prova' : 'Load sample intercept'}
            </button>

            <button
              type="button"
              onClick={() => setGuidedMode((g) => !g)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-200 transition hover:border-zinc-500"
            >
              {guidedMode
                ? isIt
                  ? 'Mostra tutte le fasi'
                  : 'Show all phases'
                : isIt
                  ? 'Vista per fasi'
                  : 'Step-by-step view'}
            </button>
          </div>
        </div>

        {/* Phase Switcher */}
        {guidedMode && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {steps.map((s) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={`rounded border px-3 py-2 text-left font-mono text-xs font-semibold transition ${
                      active
                        ? 'border-bletchley-brass bg-bletchley-brass/20 text-bletchley-brass-bright'
                        : done
                          ? 'border-zinc-700 bg-zinc-900 text-emerald-400'
                          : 'border-zinc-800 bg-[#08090c] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    {s.shortTitle}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded border border-zinc-800 bg-[#08090c] px-3.5 py-2.5 text-xs leading-relaxed text-zinc-300">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-bletchley-brass-bright">
                {currentStepMeta.fullTitle}
              </div>
              <p className="mt-1 text-zinc-400">{currentStepMeta.guideText}</p>
            </div>
          </>
        )}
      </section>

      {/* Phase 1 */}
      {(!guidedMode || step === 1) && (
        <div className="space-y-3">
          <CribScannerPanel
            ciphertext={ciphertext}
            crib={crib}
            alignments={alignments}
            selectedOffset={selectedOffset}
            language={language}
            compactHeader={guidedMode}
            onCiphertextChange={onCiphertextChange}
            onCribChange={onCribChange}
            onSelectOffset={onSelectOffset}
          />
          {guidedMode && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!alignments.some((a) => a.isValid)}
                onClick={handleConfirmStep1}
                className="rounded border border-bletchley-brass bg-bletchley-brass px-4 py-2 font-mono text-xs font-bold uppercase text-zinc-950 transition hover:bg-bletchley-brass-bright disabled:opacity-40"
              >
                {isIt ? 'Vai alla Fase 2: Schema collegamenti' : 'Next: Link Diagram'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 2 */}
      {(!guidedMode || step === 2) && (
        <div className="space-y-3">
          <MenuGraphSVG
            menu={menu}
            language={language}
            compactHeader={guidedMode}
          />
          {guidedMode && (
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded border border-zinc-700 bg-zinc-900 px-3.5 py-2 font-mono text-xs text-zinc-200 hover:border-zinc-500"
              >
                {isIt ? 'Torna alla Fase 1' : 'Back to Phase 1'}
              </button>
              <button
                type="button"
                disabled={!menu.isValidAlignment || menu.edges.length === 0}
                onClick={() => setStep(3)}
                className="rounded border border-bletchley-brass bg-bletchley-brass px-4 py-2 font-mono text-xs font-bold uppercase text-zinc-950 transition hover:bg-bletchley-brass-bright disabled:opacity-40"
              >
                {isIt ? 'Vai alla Fase 3: Scansione rotori' : 'Next: Rotor Scan'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 3 (kept mounted) */}
      <div className={guidedMode && step !== 3 ? 'hidden' : 'space-y-3'}>
        <BombeConsolePanel
          ciphertext={ciphertext}
          menu={menu}
          enigmaConfig={enigmaConfig}
          targetLanguage={targetLanguage}
          language={language}
          onConfigChange={onConfigChange}
          onApplyStopToEnigma={onApplyStopToEnigma}
        />

        {guidedMode && step === 3 && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3.5 py-2 font-mono text-xs text-zinc-200 hover:border-zinc-500"
            >
              {isIt ? 'Torna alla Fase 2' : 'Back to Phase 2'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
