import React, { useState } from 'react';
import {
  EnigmaConfig,
  Language,
  StatisticalReport,
  TargetLanguage
} from '../../types';
import { getTranslations } from '../../i18n/translations';
import { StatisticalDashboard } from './StatisticalDashboard';
import { BanburismusPanel } from './BanburismusPanel';
import { CiphertextAttackPanel } from './CiphertextAttackPanel';

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
  onApplyCandidate
}) => {
  const t = getTranslations(language);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [viewAll, setViewAll] = useState(false);

  const steps: {
    id: 1 | 2 | 3;
    title: string;
    subtitle: string;
  }[] = [
    {
      id: 1,
      title: language === 'it' ? 'Fase 1: Campione di testo' : 'Phase 1: Text sample',
      subtitle:
        language === 'it'
          ? 'Seleziona il testo da misurare e la lingua di riferimento'
          : 'Select the text sample to measure and the reference language'
    },
    {
      id: 2,
      title: language === 'it' ? 'Fase 2: Frequenze e indici' : 'Phase 2: Frequencies and indices',
      subtitle:
        language === 'it'
          ? 'Confronta l’istogramma delle 26 lettere con la distribuzione uniforme'
          : 'Compare the 26-letter histogram against the uniform distribution'
    },
    {
      id: 3,
      title: language === 'it' ? 'Fase 3: Scansione rotori' : 'Phase 3: Rotor scan',
      subtitle:
        language === 'it'
          ? 'Prova tutte le 17.576 posizioni e individua la chiave con IoC massimo'
          : 'Test all 17,576 positions and isolate the key with peak IoC'
    }
  ];

  const isNatural = report.ioc > 0.058;

  const Step1Content = (
    <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
            {t.statistics.sampleTextLabel}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {language === 'it'
              ? 'Un testo in chiaro conserva i picchi tipici della lingua (IoC ~ 0.076 in tedesco). Un testo cifrato con Enigma appiattisce le frequenze vicino a 1/26 (IoC ~ 0.0385).'
              : 'Plaintext preserves natural language frequency peaks (IoC ~ 0.076 in German). Enigma ciphertext flattens frequencies near 1/26 (IoC ~ 0.0385).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onUseEnigmaOutput}
            className="rounded border border-zinc-700 bg-[#08090c] px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            {t.statistics.useEnigmaOutput}
          </button>
          <button
            onClick={onUseEnigmaInput}
            className="rounded border border-zinc-700 bg-[#08090c] px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            {t.statistics.useEnigmaInput}
          </button>
          <button
            onClick={onLoadUnsteckeredDemo}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            {t.statistics.loadUnsteckeredDemo}
          </button>

          <div className="ml-1 flex items-center rounded border border-zinc-800 bg-[#08090c] p-0.5 font-mono text-xs">
            <button
              onClick={() => onTargetLanguageChange('DE')}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                targetLanguage === 'DE'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.statistics.germanRef}
            </button>
            <button
              onClick={() => onTargetLanguageChange('EN')}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                targetLanguage === 'EN'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.statistics.englishRef}
            </button>
          </div>
        </div>
      </div>

      <textarea
        rows={3}
        value={sampleText}
        onChange={(e) => onSampleTextChange(e.target.value.toUpperCase())}
        className="w-full rounded border border-zinc-800 bg-[#08090c] p-3 font-mono text-xs tracking-widest text-amber-300 focus:border-amber-500 focus:outline-none"
      />

      {/* Instant diagnostic bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 bg-[#08090c] px-4 py-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-zinc-500">N: </span>
            <strong className="text-zinc-200">{report.length}</strong>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500">IoC: </span>
            <strong className={isNatural ? 'text-emerald-400' : 'text-amber-300'}>
              {report.ioc.toFixed(4)}
            </strong>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500">DECIBAN: </span>
            <strong className={report.decibans > 0 ? 'text-emerald-400' : 'text-zinc-300'}>
              {report.decibans > 0 ? '+' : ''}
              {report.decibans.toFixed(1)} dB
            </strong>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <span className={isNatural ? 'text-emerald-400' : 'text-zinc-400'}>
            {isNatural
              ? language === 'it'
                ? 'Profilo compatibile con lingua naturale'
                : 'Profile consistent with natural language'
              : language === 'it'
              ? 'Profilo piatto tipico di testo cifrato'
              : 'Flat profile typical of ciphertext'}
          </span>
        </div>

        {!viewAll && (
          <button
            onClick={() => setActiveStep(2)}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-sans text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            {language === 'it' ? 'Passa alla Fase 2' : 'Proceed to Phase 2'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Console Header & Phase Selector */}
      <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {language === 'it'
                ? 'SEZIONE CRITTOANALISI STATISTICA'
                : 'STATISTICAL CRYPTANALYSIS SECTION'}
            </div>
            <h2 className="mt-1 text-base font-bold uppercase tracking-wider text-zinc-100">
              {language === 'it'
                ? 'Analisi delle frequenze e scansione su solo testo cifrato'
                : 'Frequency analysis and ciphertext-only rotor scan'}
            </h2>
            <p className="mt-1 max-w-3xl text-xs text-zinc-400">
              {language === 'it'
                ? 'Quando non si dispone di una parola nota ma i cavi dello Steckerbrett sono assenti o già noti, la chiave dei rotori si individua cercando l’unica posizione che riporta l’Indice di Coincidenza ai valori della lingua naturale.'
                : 'When no crib is available but plugboard cables are absent or already known, the rotor key is found by locating the single position that restores the Index of Coincidence to natural language levels.'}
            </p>
          </div>

          <button
            onClick={() => setViewAll(!viewAll)}
            className="rounded border border-zinc-700 bg-[#08090c] px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            {viewAll
              ? language === 'it'
                ? 'Vista per fasi'
                : 'Phased view'
              : language === 'it'
              ? 'Mostra tutti i pannelli'
              : 'Show all panels'}
          </button>
        </div>

        {/* Phase Tabs */}
        {!viewAll && (
          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {steps.map((s) => {
              const isCurrent = activeStep === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`flex flex-col items-start rounded border p-3.5 text-left transition ${
                    isCurrent
                      ? 'border-amber-500/60 bg-[#08090c] text-zinc-100'
                      : 'border-zinc-800/90 bg-[#08090c]/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="mb-1 flex w-full items-center justify-between font-mono text-xs font-bold uppercase tracking-wider">
                    <span className={isCurrent ? 'text-amber-300' : 'text-zinc-300'}>
                      {s.title}
                    </span>
                    <span className="text-[10px] text-zinc-600">{s.id}/3</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {s.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      {viewAll ? (
        <div className="space-y-5">
          {Step1Content}
          <StatisticalDashboard
            report={report}
            targetLanguage={targetLanguage}
            language={language}
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
      ) : (
        <div className="space-y-4">
          {activeStep === 1 && Step1Content}

          {activeStep === 2 && (
            <div className="space-y-4">
              <StatisticalDashboard
                report={report}
                targetLanguage={targetLanguage}
                language={language}
              />

              <div className="flex items-center justify-between rounded border border-zinc-800 bg-[#0d0e12] px-5 py-3">
                <button
                  onClick={() => setActiveStep(1)}
                  className="rounded border border-zinc-700 bg-[#08090c] px-3.5 py-1.5 font-mono text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  {language === 'it' ? 'Indietro: Fase 1' : 'Back: Phase 1'}
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="rounded border border-amber-500/50 bg-amber-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-950 hover:bg-amber-400"
                >
                  {language === 'it' ? 'Avanti: Fase 3 (Scansione 17.576 chiavi)' : 'Next: Phase 3 (Scan 17,576 keys)'}
                </button>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <CiphertextAttackPanel
                ciphertext={sampleText}
                enigmaConfig={enigmaConfig}
                targetLanguage={targetLanguage}
                language={language}
                onLoadUnsteckeredDemo={onLoadUnsteckeredDemo}
                onApplyCandidate={onApplyCandidate}
              />

              <details className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
                <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200">
                  {language === 'it'
                    ? 'Calcolo Bayesiano di Turing (Deciban e aggiornamento probabilità)'
                    : 'Turing Bayesian calculator (Decibans and probability update)'}
                </summary>
                <div className="mt-4">
                  <BanburismusPanel
                    report={report}
                    targetLanguage={targetLanguage}
                    language={language}
                    enigmaConfig={enigmaConfig}
                  />
                </div>
              </details>

              <div className="flex items-center justify-between rounded border border-zinc-800 bg-[#0d0e12] px-5 py-3">
                <button
                  onClick={() => setActiveStep(2)}
                  className="rounded border border-zinc-700 bg-[#08090c] px-3.5 py-1.5 font-mono text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  {language === 'it' ? 'Indietro: Fase 2' : 'Back: Phase 2'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
