import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
  Languages,
  ShieldCheck,
} from 'lucide-react';
import { HISTORICAL_PRESETS } from '../../core/constants';
import { TRANSLATIONS } from '../../i18n/translations';
import type { Language } from '../../types';

export type AppTab = 'enigma' | 'statistics' | 'bombe' | 'theory';

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  language: Language;
  onToggleLanguage: () => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  language,
  onToggleLanguage,
  selectedPresetId,
  onSelectPreset,
}) => {
  const t = TRANSLATIONS[language];

  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'enigma', label: t.tabs.enigma, icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'bombe', label: t.tabs.bombe, icon: <Cpu className="h-4 w-4" /> },
    { id: 'statistics', label: t.tabs.statistics, icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'theory', label: t.tabs.theory, icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-bletchley-border bg-bletchley-ink/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand Crest */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-bletchley-brass/50 bg-bletchley-panel shadow-brass">
              <Activity className="h-5 w-5 text-bletchley-brass" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-bletchley-ivory sm:text-lg">
                {t.brandTitle}
              </h1>
              <p className="text-xs text-slate-400">{t.brandSubtitle}</p>
            </div>
          </div>

          {/* Right Controls: Preset Selector & Language Switch */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-2.5 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t.presetLabel}:
              </span>
              <select
                value={selectedPresetId}
                onChange={(e) => onSelectPreset(e.target.value)}
                aria-label={t.presetLabel}
                className="bg-transparent font-mono text-xs text-bletchley-brass-bright focus:outline-none"
              >
                {HISTORICAL_PRESETS.map((preset) => (
                  <option
                    key={preset.id}
                    value={preset.id}
                    className="bg-bletchley-slate text-bletchley-ivory"
                  >
                    {language === 'it' ? preset.titleIt : preset.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bletchley-border bg-bletchley-card px-3 py-1.5 font-mono text-xs font-semibold text-bletchley-signal transition hover:border-bletchley-signal/60"
              title="Toggle IT / EN"
            >
              <Languages className="h-4 w-4" />
              <span>{language.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3 flex flex-wrap gap-1.5 border-t border-bletchley-border/60 pt-2.5">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                  active
                    ? 'border border-bletchley-brass/60 bg-bletchley-brass/15 text-bletchley-brass-bright shadow-brass'
                    : 'border border-transparent text-slate-300 hover:border-bletchley-border hover:bg-bletchley-card/70 hover:text-bletchley-ivory'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
