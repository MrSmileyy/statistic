import React, { useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import type { Language, StatisticalReport, TargetLanguage } from '../../types';
import { FrequencyChartSVG } from './FrequencyChartSVG';

interface StatisticalDashboardProps {
  sampleText: string;
  onSampleTextChange: (text: string) => void;
  targetLanguage: TargetLanguage;
  onTargetLanguageChange: (lang: TargetLanguage) => void;
  report: StatisticalReport;
  language: Language;
  onUseEnigmaOutput: () => void;
  onUseEnigmaInput: () => void;
  hideInputSection?: boolean;
  advancedExtra?: React.ReactNode;
}

export const StatisticalDashboard: React.FC<StatisticalDashboardProps> = ({
  sampleText,
  onSampleTextChange,
  targetLanguage,
  onTargetLanguageChange,
  report,
  language,
  onUseEnigmaOutput,
  onUseEnigmaInput,
  hideInputSection = false,
  advancedExtra,
}) => {
  const t = TRANSLATIONS[language].statistics;
  const isIt = language === 'it';
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const isSignificant = report.zScore >= 2.58;
  const isNatural = report.zScore >= 3.5 && report.totalDecibans >= 15;

  const verdictText = isNatural
    ? t.verdictNatural
    : isSignificant
      ? t.verdictStructured
      : t.verdictRandom;

  const formatPValue = (p: number) => {
    if (p < 0.0001) return '< 0.0001';
    return p.toFixed(4);
  };

  const iocGaugePct = Math.min(
    100,
    Math.max(
      6,
      ((report.ioc - report.expectedIocRandom * 0.85) /
        Math.max(0.01, report.expectedIocLanguage - report.expectedIocRandom * 0.85)) *
        100
    )
  );

  const decibanGaugePct = Math.min(
    100,
    Math.max(4, ((report.totalDecibans + 25) / 55) * 100)
  );

  return (
    <div className="space-y-4">
      {!hideInputSection && (
        <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4 shadow-panel sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100">
                {t.title}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">{t.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onUseEnigmaOutput}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
              >
                {t.loadCiphertextBtn}
              </button>
              <button
                type="button"
                onClick={onUseEnigmaInput}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-500"
              >
                {t.loadPlaintextBtn}
              </button>

              <div className="inline-flex rounded border border-zinc-700 bg-[#08090c] p-0.5">
                {(['DE', 'EN'] as TargetLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onTargetLanguageChange(lang)}
                    className={`rounded px-2.5 py-1 font-mono text-xs font-bold transition ${
                      targetLanguage === lang
                        ? 'bg-bletchley-brass text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            value={sampleText}
            onChange={(e) => onSampleTextChange(e.target.value)}
            rows={3}
            className="w-full rounded border border-zinc-700 bg-[#08090c] p-3 font-mono text-xs uppercase tracking-wider text-zinc-100 focus:border-bletchley-brass focus:outline-none"
          />
        </section>
      )}

      {/* Sober Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#0d0e12] px-4 py-3 font-mono text-xs">
        <div>
          <span className="text-zinc-500">{isIt ? 'ESITO: ' : 'STATUS: '}</span>
          <strong
            className={
              isNatural
                ? 'text-emerald-400'
                : isSignificant
                  ? 'text-amber-300'
                  : 'text-zinc-200'
            }
          >
            {verdictText}
          </strong>
        </div>
        <span className="text-zinc-400">
          N = {report.length} | {isIt ? 'Lingua' : 'Language'}: {targetLanguage}
        </span>
      </div>

      {/* Two Primary Instrument Gauges */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Gauge 1: Index of Coincidence */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
              {t.kpiIocTitle}
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {(report.ioc * 100).toFixed(2)}%
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between font-mono">
            <span className="text-2xl font-extrabold text-zinc-100">
              {report.ioc.toFixed(4)}
            </span>
            <span className="text-xs text-zinc-400">
              {isIt ? 'Atteso' : 'Expected'} ({targetLanguage}):{' '}
              {report.expectedIocLanguage.toFixed(4)}
            </span>
          </div>

          <div className="mt-2.5 h-2 overflow-hidden rounded bg-[#08090c]">
            <div
              style={{ width: `${iocGaugePct}%` }}
              className={`h-full transition-all duration-300 ${
                iocGaugePct >= 68
                  ? 'bg-emerald-400'
                  : iocGaugePct >= 38
                    ? 'bg-bletchley-brass'
                    : 'bg-zinc-500'
              }`}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
            <span>{isIt ? 'Uniforme: 0.0385' : 'Uniform: 0.0385'}</span>
            <span>
              {targetLanguage}: {report.expectedIocLanguage.toFixed(4)}
            </span>
          </div>
          <p className="mt-2.5 text-xs text-zinc-400">
            {isIt
              ? 'Misura la probabilita che due lettere estratte a caso dal testo siano identiche.'
              : 'Measures the probability that two randomly selected letters in the text are identical.'}
          </p>
        </div>

        {/* Gauge 2: Turing Decibans */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
              {t.kpiDecibanTitle}
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {report.decibansPerChar >= 0 ? '+' : ''}
              {report.decibansPerChar.toFixed(2)} db/char
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between font-mono">
            <span
              className={`text-2xl font-extrabold ${
                report.totalDecibans >= 15
                  ? 'text-emerald-400'
                  : report.totalDecibans < 0
                    ? 'text-zinc-300'
                    : 'text-bletchley-brass-bright'
              }`}
            >
              {report.totalDecibans >= 0 ? '+' : ''}
              {report.totalDecibans.toFixed(1)} db
            </span>
            <span className="text-xs text-zinc-400">
              {isIt ? 'Soglia chiaro: +20.0 db' : 'Plaintext threshold: +20.0 db'}
            </span>
          </div>

          <div className="mt-2.5 h-2 overflow-hidden rounded bg-[#08090c]">
            <div
              style={{ width: `${decibanGaugePct}%` }}
              className={`h-full transition-all duration-300 ${
                report.totalDecibans >= 15
                  ? 'bg-emerald-400'
                  : report.totalDecibans >= 0
                    ? 'bg-bletchley-brass'
                    : 'bg-zinc-600'
              }`}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
            <span>{isIt ? '< 0 db (cifrato)' : '< 0 db (cipher)'}</span>
            <span>{isIt ? '> +20 db (lingua naturale)' : '> +20 db (natural language)'}</span>
          </div>
          <p className="mt-2.5 text-xs text-zinc-400">
            {isIt
              ? 'Punteggio logaritmico di verosimiglianza calcolato sulle frequenze della lingua.'
              : 'Logarithmic likelihood score computed from the expected letter frequencies.'}
          </p>
        </div>
      </div>

      {/* Letter Frequency Bar Chart */}
      <FrequencyChartSVG frequencies={report.frequencies} language={language} />

      {/* Collapsible Secondary Metrics & Banburismus */}
      <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-zinc-900/60"
        >
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
              {isIt
                ? 'Parametri aggiuntivi (Chi-Quadro, Z-Score, Entropia, Banburismus)'
                : 'Additional Parameters (Chi-Squared, Z-Score, Entropy, Banburismus)'}
            </span>
            <p className="mt-0.5 text-xs text-zinc-500">
              {isIt
                ? 'Test di adattamento Chi-Quadro, entropia di Shannon e confronto tra coppie di cifrati.'
                : 'Chi-Squared goodness-of-fit, Shannon entropy, and two-message depth comparison.'}
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {showAdvanced
              ? isIt
                ? 'Chiudi'
                : 'Hide'
              : isIt
                ? 'Apri'
                : 'Open'}
          </span>
        </button>

        {showAdvanced && (
          <div className="space-y-4 border-t border-zinc-800 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5 font-mono">
                <div className="text-[11px] uppercase text-zinc-400">{t.kpiZTitle}</div>
                <div className="mt-1.5 text-xl font-bold text-zinc-100">
                  {report.zScore >= 0 ? '+' : ''}
                  {report.zScore.toFixed(2)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  SE(H0) = {report.iocStandardErrorH0.toFixed(5)}
                </div>
              </div>

              <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5 font-mono">
                <div className="text-[11px] uppercase text-zinc-400">{t.kpiChiTitle}</div>
                <div className="mt-1.5 text-xl font-bold text-zinc-100">
                  {report.chiSquared.toFixed(1)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  p-value = {formatPValue(report.chiSquaredPValue)}
                </div>
              </div>

              <div className="rounded border border-zinc-800 bg-[#08090c] p-3.5 font-mono">
                <div className="text-[11px] uppercase text-zinc-400">{t.kpiEntropyTitle}</div>
                <div className="mt-1.5 text-xl font-bold text-zinc-100">
                  {report.shannonEntropy.toFixed(3)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  H / Hmax = {((report.shannonEntropy / report.maxEntropy) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {advancedExtra}
          </div>
        )}
      </section>
    </div>
  );
};
