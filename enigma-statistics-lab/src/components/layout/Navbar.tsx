import React from 'react';
import { HISTORICAL_PRESETS } from '../../core/constants';

export type AppTab = 'enigma' | 'walkthrough' | 'statistics' | 'bombe' | 'theory';

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'enigma', label: 'Enigma M3' },
  { id: 'walkthrough', label: 'Decrypt Guide' },
  { id: 'bombe', label: 'Bombe' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'theory', label: 'Notes' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  selectedPresetId,
  onSelectPreset,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-[#0d0e12]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-6">
          <h1 className="font-mono text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
            Enigma M3 &amp; Cryptanalysis
          </h1>

          <nav className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`rounded px-3 py-1.5 font-mono text-xs transition ${
                    active
                      ? 'bg-zinc-800 font-semibold text-amber-300'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="preset-select"
            className="font-mono text-xs text-zinc-400"
          >
            Preset:
          </label>
          <select
            id="preset-select"
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="rounded border border-zinc-700 bg-[#08090c] px-2.5 py-1 font-mono text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            {HISTORICAL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-zinc-900">
                {preset.titleEn}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
