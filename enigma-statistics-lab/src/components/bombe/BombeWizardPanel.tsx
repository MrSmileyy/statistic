import React from 'react';
import { formatPositionLabel, HISTORICAL_PRESETS } from '../../core/constants';
import type {
  BombeMenu,
  CribAlignment,
  EnigmaConfig,
  Language,
  PlugPair,
  TargetLanguage,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';
import { BombeCabinet } from './BombeCabinet';
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
  language?: Language;
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

export const BombeWizardPanel: React.FC<BombeWizardPanelProps> = ({
  ciphertext,
  crib,
  alignments,
  selectedOffset,
  menu,
  enigmaConfig,
  targetLanguage,
  onCiphertextChange,
  onCribChange,
  onSelectOffset,
  onLoadGuidedDemo,
  onConfigChange,
  onApplyStopToEnigma,
}) => {
  const ringLabel = enigmaConfig.ringSettings
    .map((r) => String(r + 1).padStart(2, '0'))
    .join('-');
  const plugLabel =
    enigmaConfig.plugboard.length > 0
      ? enigmaConfig.plugboard.map(([a, b]) => `${a}${b}`).join(' ')
      : 'none';

  return (
    <div className="space-y-4">
      {/* Daily Key vs. Variable Message Key Distinction */}
      <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center font-semibold uppercase tracking-wider text-sky-300">
              Fixed Daily Key (Tagesschlüssel):
              <InfoTooltip
                title="Fixed Daily Key"
                text="Codebook settings shared by the whole radio network for 24 hours: which 3 rotors to insert, reflector choice, internal ring offsets, and front plugboard cables."
                align="left"
              />
            </span>
            <span className="rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5 text-zinc-300">
              Walzenlage: <strong className="text-zinc-100">{enigmaConfig.rotors.join('-')}</strong>
              <InfoTooltip
                title="Walzenlage (Rotor Order)"
                text="Which 3 rotor wheels (out of I–V) are placed in the Left, Middle, and Right slots (5 × 4 × 3 = 60 choices)."
              />
            </span>
            <span className="rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5 text-zinc-300">
              UKW: <strong className="text-zinc-100">{enigmaConfig.reflector}</strong>
              <InfoTooltip
                title="What is the UKW Reflector? (Umkehrwalze)"
                text={`A fixed, non-rotating disc at the left end with 13 wire pairs connecting all 26 contacts.\n\n• Forces current to make a U-turn onto a different wire and return back through the 3 rotors.\n• Makes Enigma self-reciprocal (decrypting uses the exact same settings as encrypting).\n• Because no contact wires to itself, E(x) ≠ x always holds—the exact rule that lets Crib Collision Filtering work!\n• UKW-B vs UKW-C switches between the two historical German reflector wirings.`}
              />
            </span>
            <span className="rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5 text-zinc-300">
              Ringstellung: <strong className="text-zinc-100">{ringLabel}</strong>
              <InfoTooltip
                title="Ringstellung (Ring Setting)"
                text="Rotates the alphabet ring relative to each rotor's internal wires, shifting when the turnover notch steps the next wheel."
              />
            </span>
            <span className="rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5 text-zinc-300">
              Steckerbrett: <strong className="text-emerald-300">{plugLabel}</strong>
              <InfoTooltip
                title="Steckerbrett (Plugboard)"
                text="Front patch panel swapping pairs of letters before and after the rotors (~150 trillion combinations with 10 cables)."
              />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center font-semibold uppercase tracking-wider text-amber-300">
              Message Key (Grundstellung):
              <InfoTooltip
                title="Variable Message Key"
                text="The 3-letter starting rotor window chosen uniquely for each message (26³ = 17,576 positions). This is what the Bombe searches."
                align="right"
              />
            </span>
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-bold tracking-widest text-amber-300">
              {formatPositionLabel(enigmaConfig.rotorPositions)}
            </span>
          </div>
        </div>
      </div>

      <BombeCabinet
        ciphertext={ciphertext}
        menu={menu}
        enigmaConfig={enigmaConfig}
        onConfigChange={onConfigChange}
        onApplyStopToEnigma={onApplyStopToEnigma}
      />

      <CribScannerPanel
        ciphertext={ciphertext}
        crib={crib}
        alignments={alignments}
        selectedOffset={selectedOffset}
        onCiphertextChange={onCiphertextChange}
        onCribChange={onCribChange}
        onSelectOffset={onSelectOffset}
        onLoadSample={() => onLoadGuidedDemo(HISTORICAL_PRESETS[0].id)}
      />

      <MenuGraphSVG
        menu={menu}
        enigmaConfig={enigmaConfig}
        onConfigChange={onConfigChange}
      />

      <BombeConsolePanel
        ciphertext={ciphertext}
        menu={menu}
        enigmaConfig={enigmaConfig}
        targetLanguage={targetLanguage}
        onConfigChange={onConfigChange}
        onApplyStopToEnigma={onApplyStopToEnigma}
      />
    </div>
  );
};
