import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildBombeMenu, findValidCribAlignments } from './core/bombe';
import { HISTORICAL_PRESETS, normalizeAsciiLetters } from './core/constants';
import { EnigmaM3 } from './core/enigma';
import { computeStatisticalReport } from './core/statistics';
import { BombeWizardPanel } from './components/bombe/BombeWizardPanel';
import { EnigmaCabinet } from './components/enigma/EnigmaCabinet';
import { ExamTheoryPanel } from './components/exam/ExamTheoryPanel';
import { Footer } from './components/layout/Footer';
import { type AppTab, Navbar } from './components/layout/Navbar';
import { StatisticsWizardPanel } from './components/statistics/StatisticsWizardPanel';
import { DecryptionWalkthroughPanel } from './components/walkthrough/DecryptionWalkthroughPanel';
import type {
  EnigmaConfig,
  Language,
  PlugPair,
  SignalTrace,
  TargetLanguage,
} from './types';

function computeInitialCiphertext(presetIndex = 0): string {
  const preset = HISTORICAL_PRESETS[presetIndex];
  return new EnigmaM3(preset.config).encryptText(preset.plaintext).ciphertext;
}

export function App() {
  const defaultPreset = HISTORICAL_PRESETS[0];

  const language: Language = 'en';
  const [activeTab, setActiveTab] = useState<AppTab>('enigma');
  const [machineFullscreen, setMachineFullscreen] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setMachineFullscreen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMachineFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setMachineFullscreen((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      return next;
    });
  }, []);

  // Enigma machine live configuration + bookmarked ground start for reproducible batch decrypts
  const [enigmaConfig, setEnigmaConfig] = useState<EnigmaConfig>(defaultPreset.config);
  const [savedGround, setSavedGround] = useState<[number, number, number]>(
    defaultPreset.config.rotorPositions
  );
  const [lastTrace, setLastTrace] = useState<SignalTrace | null>(null);
  const [batchInput, setBatchInput] = useState<string>(defaultPreset.plaintext);
  const [batchOutput, setBatchOutput] = useState<string>(() => computeInitialCiphertext(0));

  // Shared Statistics state
  const [statsSampleText, setStatsSampleText] = useState<string>(() => computeInitialCiphertext(0));
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(
    defaultPreset.targetLanguage
  );

  // Shared Bombe state
  const [bombeCiphertext, setBombeCiphertext] = useState<string>(() =>
    computeInitialCiphertext(0)
  );
  const [bombeCrib, setBombeCrib] = useState<string>(defaultPreset.crib);
  const [bombeOffset, setBombeOffset] = useState<number>(defaultPreset.expectedOffset);

  const handleSelectPreset = (presetId: string) => {
    const preset = HISTORICAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const encrypted = new EnigmaM3(preset.config).encryptText(preset.plaintext).ciphertext;

    setSelectedPresetId(preset.id);
    setEnigmaConfig(preset.config);
    setSavedGround(preset.config.rotorPositions);
    setLastTrace(null);
    setBatchInput(preset.plaintext);
    setBatchOutput(encrypted);
    setStatsSampleText(encrypted);
    setTargetLanguage(preset.targetLanguage);
    setBombeCiphertext(encrypted);
    setBombeCrib(preset.crib);
    setBombeOffset(preset.expectedOffset);
  };

  // Single-keypress simulation stepping rotors live
  const handleKeyPress = useCallback(
    (char: string) => {
      const machine = new EnigmaM3(enigmaConfig);
      const trace = machine.encryptChar(char);
      if (!trace) return;

      setLastTrace(trace);
      setEnigmaConfig((prev) => ({
        ...prev,
        rotorPositions: trace.rotorPositionsAfter,
      }));
    },
    [enigmaConfig]
  );

  // Batch text simulation starting deterministically from bookmarked ground position
  const handleRunBatch = () => {
    const startConfig: EnigmaConfig = {
      ...enigmaConfig,
      rotorPositions: savedGround,
    };
    const machine = new EnigmaM3(startConfig);
    const { ciphertext, traces } = machine.encryptText(batchInput);
    setBatchOutput(ciphertext);
    setLastTrace(traces.length > 0 ? traces[traces.length - 1] : null);
    setEnigmaConfig((prev) => ({
      ...prev,
      rotorPositions: machine.getConfig().rotorPositions,
    }));
  };

  const handleSwapBatch = () => {
    const cleanOut = normalizeAsciiLetters(batchOutput);
    if (!cleanOut) return;
    setBatchInput(cleanOut);
    const machine = new EnigmaM3({
      ...enigmaConfig,
      rotorPositions: savedGround,
    });
    const { ciphertext, traces } = machine.encryptText(cleanOut);
    setBatchOutput(ciphertext);
    setLastTrace(traces.length > 0 ? traces[traces.length - 1] : null);
    setEnigmaConfig((prev) => ({
      ...prev,
      rotorPositions: machine.getConfig().rotorPositions,
    }));
  };

  const handleApplyKeyToEnigma = (
    positions: [number, number, number],
    plugboard?: PlugPair[]
  ) => {
    const nextConfig: EnigmaConfig = {
      ...enigmaConfig,
      rotorPositions: positions,
      plugboard: plugboard ?? enigmaConfig.plugboard,
    };
    setEnigmaConfig(nextConfig);
    setSavedGround(positions);
    setLastTrace(null);
    setActiveTab('enigma');
  };

  const handleOpenWalkthroughInEnigma = (
    presetId: string,
    config: EnigmaConfig,
    ciphertext: string
  ) => {
    handleSelectPreset(presetId);
    const decrypted = new EnigmaM3(config).encryptText(ciphertext).ciphertext;
    setEnigmaConfig(config);
    setSavedGround(config.rotorPositions);
    setBatchInput(ciphertext);
    setBatchOutput(decrypted);
    setLastTrace(null);
    setActiveTab('enigma');
  };

  const statisticalReport = useMemo(
    () => computeStatisticalReport(statsSampleText, targetLanguage),
    [statsSampleText, targetLanguage]
  );

  const cribAlignments = useMemo(
    () => findValidCribAlignments(bombeCiphertext, bombeCrib),
    [bombeCiphertext, bombeCrib]
  );

  const bombeMenu = useMemo(
    () => buildBombeMenu(bombeCiphertext, bombeCrib, bombeOffset),
    [bombeCiphertext, bombeCrib, bombeOffset]
  );

  const isFullMachine = machineFullscreen && activeTab === 'enigma';

  return (
    <div
      className={
        isFullMachine
          ? 'fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#050403] p-1.5 sm:p-3'
          : 'flex min-h-screen flex-col'
      }
    >
      {!isFullMachine && (
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
        />
      )}

      <main
        className={
          isFullMachine
            ? 'h-full w-full'
            : 'mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6'
        }
      >
        {activeTab === 'enigma' && (
          <div className={isFullMachine ? 'h-full w-full' : 'space-y-5'}>
            <EnigmaCabinet
              config={enigmaConfig}
              savedGround={savedGround}
              lastTrace={lastTrace}
              batchInput={batchInput}
              batchOutput={batchOutput}
              language={language}
              keyboardActive={activeTab === 'enigma'}
              fullscreen={isFullMachine}
              onToggleFullscreen={handleToggleFullscreen}
              onConfigChange={(next) => {
                setEnigmaConfig(next);
              }}
              onBookmarkGround={() => setSavedGround(enigmaConfig.rotorPositions)}
              onRestoreGround={() =>
                setEnigmaConfig((prev) => ({ ...prev, rotorPositions: savedGround }))
              }
              onPressKey={handleKeyPress}
              onBatchInputChange={setBatchInput}
              onRunBatch={handleRunBatch}
              onSwapBatch={handleSwapBatch}
              onClearBatch={() => {
                setBatchInput('');
                setBatchOutput('');
                setLastTrace(null);
              }}
              onSendToStats={(text) => {
                setStatsSampleText(text);
                setActiveTab('statistics');
              }}
              onSendToBombe={(cipher) => {
                const nextAligns = findValidCribAlignments(cipher, bombeCrib);
                const firstValid = nextAligns.find((a) => a.isValid)?.offset ?? 0;
                setBombeCiphertext(cipher);
                setBombeOffset(firstValid);
                setActiveTab('bombe');
              }}
            />
          </div>
        )}

        {activeTab === 'statistics' && (
          <StatisticsWizardPanel
            sampleText={statsSampleText}
            onSampleTextChange={setStatsSampleText}
            targetLanguage={targetLanguage}
            onTargetLanguageChange={setTargetLanguage}
            report={statisticalReport}
            enigmaConfig={enigmaConfig}
            language={language}
            onUseEnigmaOutput={() => setStatsSampleText(batchOutput)}
            onUseEnigmaInput={() =>
              setStatsSampleText(normalizeAsciiLetters(batchInput))
            }
            onLoadUnsteckeredDemo={() => handleSelectPreset(HISTORICAL_PRESETS[2].id)}
            onApplyCandidate={(pos) => handleApplyKeyToEnigma(pos)}
          />
        )}

        {activeTab === 'bombe' && (
          <BombeWizardPanel
            ciphertext={bombeCiphertext}
            crib={bombeCrib}
            alignments={cribAlignments}
            selectedOffset={bombeOffset}
            menu={bombeMenu}
            enigmaConfig={enigmaConfig}
            targetLanguage={targetLanguage}
            language={language}
            onCiphertextChange={(text) => {
              const nextAligns = findValidCribAlignments(text, bombeCrib);
              const firstValid = nextAligns.find((a) => a.isValid)?.offset ?? 0;
              setBombeCiphertext(text);
              setBombeOffset(firstValid);
            }}
            onCribChange={(text) => {
              const nextAligns = findValidCribAlignments(bombeCiphertext, text);
              const firstValid = nextAligns.find((a) => a.isValid)?.offset ?? 0;
              setBombeCrib(text);
              setBombeOffset(firstValid);
            }}
            onSelectOffset={setBombeOffset}
            onLoadGuidedDemo={handleSelectPreset}
            onConfigChange={setEnigmaConfig}
            onApplyStopToEnigma={(pos, plugs) => handleApplyKeyToEnigma(pos, plugs)}
          />
        )}

        {activeTab === 'walkthrough' && (
          <DecryptionWalkthroughPanel
            selectedPresetId={selectedPresetId}
            onSelectPreset={handleSelectPreset}
            onOpenInEnigma={handleOpenWalkthroughInEnigma}
            onOpenInBombe={(presetId) => {
              handleSelectPreset(presetId);
              setActiveTab('bombe');
            }}
            onOpenInStats={(presetId) => {
              handleSelectPreset(presetId);
              setActiveTab('statistics');
            }}
          />
        )}

        {activeTab === 'theory' && <ExamTheoryPanel language={language} />}
      </main>

      {!isFullMachine && <Footer language={language} />}
    </div>
  );
}

export default App;
