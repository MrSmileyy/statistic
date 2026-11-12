import type { Language } from '../types';

export interface TranslationDictionary {
  brandTitle: string;
  brandSubtitle: string;
  presetLabel: string;
  loadPreset: string;
  tabs: {
    enigma: string;
    statistics: string;
    bombe: string;
    theory: string;
  };
  enigma: {
    title: string;
    subtitle: string;
    rotorsHeader: string;
    leftRotor: string;
    middleRotor: string;
    rightRotor: string;
    reflectorLabel: string;
    ringSettingLabel: string;
    groundSettingLabel: string;
    notchLabel: string;
    doubleStepBadge: string;
    resetPositions: string;
    syncGroundBtn: string;
    plugboardTitle: string;
    plugboardHelp: string;
    plugboardClear: string;
    plugboardRandom: string;
    plugboardPairsCount: string;
    signalPathTitle: string;
    signalPathEmpty: string;
    stageInput: string;
    stagePlugIn: string;
    stageRight: string;
    stageMiddle: string;
    stageLeft: string;
    stageReflector: string;
    stagePlugOut: string;
    stageLamp: string;
    forwardSignal: string;
    returnSignal: string;
    keyboardTitle: string;
    lampboardTitle: string;
    batchTitle: string;
    batchPlaceholder: string;
    batchInputLabel: string;
    batchOutputLabel: string;
    encryptBatchBtn: string;
    swapIOBtn: string;
    clearBatchBtn: string;
    sendToStatsBtn: string;
    sendToBombeBtn: string;
    tapeLabel: string;
  };
  statistics: {
    title: string;
    subtitle: string;
    inputLabel: string;
    targetLanguageLabel: string;
    sampleLengthLabel: string;
    loadCiphertextBtn: string;
    loadPlaintextBtn: string;
    kpiIocTitle: string;
    kpiIocSub: string;
    kpiZTitle: string;
    kpiZSub: string;
    kpiChiTitle: string;
    kpiChiSub: string;
    kpiEntropyTitle: string;
    kpiEntropySub: string;
    kpiDecibanTitle: string;
    kpiDecibanSub: string;
    verdictRandom: string;
    verdictStructured: string;
    verdictNatural: string;
    chartFreqTitle: string;
    chartObserved: string;
    chartExpected: string;
    chartChiCol: string;
    banburismusTitle: string;
    banburismusSprtTitle: string;
    banburismusSprtDesc: string;
    banburismusDepthTitle: string;
    banburismusDepthDesc: string;
    banburismusMsgA: string;
    banburismusMsgB: string;
    banburismusGenerateDemo: string;
    banburismusBestOffset: string;
    attackTitle: string;
    attackDesc: string;
    attackRankBy: string;
    attackRunBtn: string;
    attackCancelBtn: string;
    attackProgress: string;
    attackApplyKey: string;
  };
  bombe: {
    title: string;
    subtitle: string;
    cipherLabel: string;
    cribLabel: string;
    scannerTitle: string;
    scannerValid: string;
    scannerCollision: string;
    selectedOffset: string;
    menuTitle: string;
    menuNodes: string;
    menuEdges: string;
    menuCycles: string;
    testRegisterLabel: string;
    noValidAlignError: string;
    sweepTitle: string;
    sweepHelp: string;
    sweepRunBtn: string;
    sweepCancelBtn: string;
    stopsFoundLabel: string;
    noStopsYet: string;
    applyStopBtn: string;
    inspectStopBtn: string;
    diagonalTitle: string;
    diagonalHelp: string;
    hypothesisConsistent: string;
    hypothesisContradicted: string;
    deducedSteckerLabel: string;
    propagatedStepsLabel: string;
  };
  theory: {
    title: string;
    subtitle: string;
    selfTestTitle: string;
    selfTestDesc: string;
    runSelfTestBtn: string;
    passedLabel: string;
    failedLabel: string;
  };
  footer: {
    note: string;
    vectorBadge: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  it: {
    brandTitle: 'Enigma M3 e Crittanalisi',
    brandSubtitle: 'Simulatore elettromeccanico, Bombe di Turing e analisi delle frequenze',
    presetLabel: 'Messaggio',
    loadPreset: 'Carica',
    tabs: {
      enigma: 'Macchina Enigma',
      statistics: 'Analisi Statistica',
      bombe: 'Bombe di Turing',
      theory: 'Note Matematiche',
    },
    enigma: {
      title: 'Simulatore Enigma M3',
      subtitle: 'Configurazione rotori I-V, anelli, posizione iniziale e pannello cavi.',
      rotorsHeader: 'Gruppo Rotori e Riflettore',
      leftRotor: 'Rotore Sinistro',
      middleRotor: 'Rotore Centrale',
      rightRotor: 'Rotore Destro',
      reflectorLabel: 'Riflettore',
      ringSettingLabel: 'Anello',
      groundSettingLabel: 'Finestra',
      notchLabel: 'Tacca',
      doubleStepBadge: 'Doppio scatto',
      resetPositions: 'Salva posizione iniziale',
      syncGroundBtn: 'Torna a posizione salvata',
      plugboardTitle: 'Pannello Cavi (Steckerbrett)',
      plugboardHelp: 'Seleziona due lettere per collegarle o scollegarle (massimo 13 coppie).',
      plugboardClear: 'Scollega tutto',
      plugboardRandom: '6 coppie casuali',
      plugboardPairsCount: 'Coppie attive',
      signalPathTitle: 'Sezione Rotori e Percorso Elettrico',
      signalPathEmpty: 'Premi un tasto sulla tastiera per osservare il passaggio di corrente.',
      stageInput: 'Tasto',
      stagePlugIn: 'Cavi In',
      stageRight: 'Rotore DX',
      stageMiddle: 'Rotore CX',
      stageLeft: 'Rotore SX',
      stageReflector: 'Riflettore',
      stagePlugOut: 'Cavi Out',
      stageLamp: 'Lampada',
      forwardSignal: 'Andata',
      returnSignal: 'Ritorno',
      keyboardTitle: 'Tastiera (QWERTZ)',
      lampboardTitle: 'Quadro Lampade',
      batchTitle: 'Cifratura e Decifratura Blocco di Testo',
      batchPlaceholder: 'Inserisci il testo da processare (vengono lette solo le lettere A-Z)...',
      batchInputLabel: 'Testo in ingresso',
      batchOutputLabel: 'Testo in uscita',
      encryptBatchBtn: 'Processa da posizione salvata',
      swapIOBtn: 'Scambia ingresso/uscita',
      clearBatchBtn: 'Pulisci',
      sendToStatsBtn: 'Apri in Statistica',
      sendToBombeBtn: 'Apri in Bombe',
      tapeLabel: 'Nastro in gruppi di 5 lettere',
    },
    statistics: {
      title: 'Analisi Statistica del Testo',
      subtitle: 'Studio delle frequenze, indice di coincidenza e ricerca sui 17.576 stati dei rotori.',
      inputLabel: 'Testo in esame',
      targetLanguageLabel: 'Lingua di riferimento',
      sampleLengthLabel: 'Lunghezza N',
      loadCiphertextBtn: 'Prendi uscita Enigma',
      loadPlaintextBtn: 'Prendi ingresso Enigma',
      kpiIocTitle: 'Indice di Coincidenza (IoC)',
      kpiIocSub: 'Uniforme: 0.0385 | Tedesco: 0.0762 | Inglese: 0.0667',
      kpiZTitle: 'Scarto Z-Score',
      kpiZSub: 'Deviazioni standard rispetto alla distribuzione uniforme',
      kpiChiTitle: 'Test Chi-Quadro (25 gradi di liberta)',
      kpiChiSub: 'Distanza rispetto alle frequenze della lingua selezionata',
      kpiEntropyTitle: 'Entropia di Shannon (H)',
      kpiEntropySub: 'Massimo teorico su 26 lettere: 4.700 bit/lettera',
      kpiDecibanTitle: 'Punteggio di Turing (Deciban)',
      kpiDecibanSub: 'Rapporto di verosimiglianza logaritmico',
      verdictRandom: 'Distribuzione uniforme compatibile con testo cifrato',
      verdictStructured: 'Deviazione parziale dalla distribuzione uniforme',
      verdictNatural: 'Distribuzione compatibile con un testo in lingua naturale',
      chartFreqTitle: 'Frequenze Osservate e Frequenze Attese (A-Z)',
      chartObserved: 'Testo in esame (%)',
      chartExpected: 'Lingua di riferimento (%)',
      chartChiCol: 'Scarto Chi-Quadro',
      banburismusTitle: 'Procedura Banburismus e Confronto tra Due Messaggi',
      banburismusSprtTitle: 'Andamento Cumulativo Deciban',
      banburismusSprtDesc: 'Somma progressiva del punteggio lettera per lettera lungo il messaggio.',
      banburismusDepthTitle: 'Sovrapposizione tra Due Cifrati',
      banburismusDepthDesc: 'Ricerca dello scorrimento relativo tra due messaggi cifrati con la stessa chiave.',
      banburismusMsgA: 'Messaggio Cifrato A',
      banburismusMsgB: 'Messaggio Cifrato B',
      banburismusGenerateDemo: 'Genera coppia con scorrimento +5',
      banburismusBestOffset: 'Scorrimento con piu coincidenze',
      attackTitle: 'Scansione delle 17.576 Posizioni dei Rotori',
      attackDesc: 'Decifra il testo in ogni posizione possibile da AAA a ZZZ e ordina i risultati in base alla vicinanza statistica con la lingua.',
      attackRankBy: 'Ordina per',
      attackRunBtn: 'Avvia scansione',
      attackCancelBtn: 'Interrompi',
      attackProgress: 'Avanzamento',
      attackApplyKey: 'Imposta su Enigma',
    },
    bombe: {
      title: 'Console Bombe di Turing-Welchman',
      subtitle: 'Ricerca della posizione dei rotori e dei cavi a partire da una parola ipotizzata (Crib).',
      cipherLabel: 'Messaggio cifrato intercettato',
      cribLabel: 'Parola ipotizzata nel testo (Crib)',
      scannerTitle: 'Verifica allineamenti senza lettere uguali',
      scannerValid: 'Posizione compatibile',
      scannerCollision: 'Esclusa (stessa lettera)',
      selectedOffset: 'Posizione',
      menuTitle: 'Schema dei Collegamenti e Cicli',
      menuNodes: 'Lettere',
      menuEdges: 'Collegamenti',
      menuCycles: 'Cicli chiusi',
      testRegisterLabel: 'Lettera centrale',
      noValidAlignError: 'Nessuna posizione compatibile trovata per questa parola.',
      sweepTitle: 'Scansione su 17.576 Posizioni',
      sweepHelp: 'Verifica la coerenza elettrica su tutte le posizioni possibili dei tre rotori.',
      sweepRunBtn: 'Avvia scansione Bombe',
      sweepCancelBtn: 'Interrompi',
      stopsFoundLabel: 'Posizioni compatibili (Stop)',
      noStopsYet: 'Avvia la scansione per elencare le posizioni compatibili.',
      applyStopBtn: 'Imposta su Enigma',
      inspectStopBtn: 'Matrice 26x26',
      diagonalTitle: 'Matrice della Scheda Diagonale (26 ipotesi)',
      diagonalHelp: 'Verifica delle 26 ipotesi di cablaggio sulla lettera centrale per la posizione selezionata.',
      hypothesisConsistent: 'Coerente',
      hypothesisContradicted: 'Contraddizione',
      deducedSteckerLabel: 'Cavi individuati',
      propagatedStepsLabel: 'Passaggi verificati',
    },
    theory: {
      title: 'Riferimenti Matematici e Verifica Vettori',
      subtitle: 'Formule utilizzate nel codice e controllo automatico dei risultati storici.',
      selfTestTitle: 'Controllo Automatico dei Vettori Storici',
      selfTestDesc: 'Verifica diretta nel browser di permutazioni, doppio scatto (ADU -> ADV -> AEW -> BFX), vettore AAAAA -> BDZGO e recupero chiave.',
      runSelfTestBtn: 'Esegui controllo',
      passedLabel: 'OK',
      failedLabel: 'ERRORE',
    },
    footer: {
      note: 'Simulatore Enigma M3, Bombe di Turing e analisi statistica.',
      vectorBadge: 'Vettore di riferimento: I-II-III, UKW-B, Anelli 01-01-01, AAA -> AAAAA = BDZGO',
    },
  },
  en: {
    brandTitle: 'Enigma M3 and Cryptanalysis',
    brandSubtitle: 'Electromechanical simulator, Turing Bombe, and frequency analysis',
    presetLabel: 'Preset',
    loadPreset: 'Load',
    tabs: {
      enigma: 'Enigma Machine',
      statistics: 'Statistical Analysis',
      bombe: 'Turing Bombe',
      theory: 'Mathematical Notes',
    },
    enigma: {
      title: 'Enigma M3 Simulator',
      subtitle: 'Configure rotors I-V, ring settings, window positions, and plugboard cables.',
      rotorsHeader: 'Rotor Assembly and Reflector',
      leftRotor: 'Left Rotor',
      middleRotor: 'Middle Rotor',
      rightRotor: 'Right Rotor',
      reflectorLabel: 'Reflector',
      ringSettingLabel: 'Ring',
      groundSettingLabel: 'Window',
      notchLabel: 'Notch',
      doubleStepBadge: 'Double step',
      resetPositions: 'Save start position',
      syncGroundBtn: 'Restore saved position',
      plugboardTitle: 'Plugboard (Steckerbrett)',
      plugboardHelp: 'Select two letters to connect or disconnect a cable (up to 13 pairs).',
      plugboardClear: 'Clear cables',
      plugboardRandom: '6 random pairs',
      plugboardPairsCount: 'Active pairs',
      signalPathTitle: 'Rotor Cutaway and Electrical Path',
      signalPathEmpty: 'Press any key on the keyboard to trace the electrical current.',
      stageInput: 'Key',
      stagePlugIn: 'Plug In',
      stageRight: 'Right Rotor',
      stageMiddle: 'Mid Rotor',
      stageLeft: 'Left Rotor',
      stageReflector: 'Reflector',
      stagePlugOut: 'Plug Out',
      stageLamp: 'Lamp',
      forwardSignal: 'Forward',
      returnSignal: 'Return',
      keyboardTitle: 'Keyboard (QWERTZ)',
      lampboardTitle: 'Lampboard',
      batchTitle: 'Text Block Encryption and Decryption',
      batchPlaceholder: 'Enter text to process (only A-Z letters are read)...',
      batchInputLabel: 'Input text',
      batchOutputLabel: 'Output text',
      encryptBatchBtn: 'Process from saved position',
      swapIOBtn: 'Swap input/output',
      clearBatchBtn: 'Clear',
      sendToStatsBtn: 'Open in Statistics',
      sendToBombeBtn: 'Open in Bombe',
      tapeLabel: 'Five-letter groups',
    },
    statistics: {
      title: 'Statistical Text Analysis',
      subtitle: 'Letter frequencies, index of coincidence, and 17,576-position rotor search.',
      inputLabel: 'Sample text',
      targetLanguageLabel: 'Reference language',
      sampleLengthLabel: 'Length N',
      loadCiphertextBtn: 'Use Enigma output',
      loadPlaintextBtn: 'Use Enigma input',
      kpiIocTitle: 'Index of Coincidence (IoC)',
      kpiIocSub: 'Uniform: 0.0385 | German: 0.0762 | English: 0.0667',
      kpiZTitle: 'Z-Score',
      kpiZSub: 'Standard deviations from uniform random baseline',
      kpiChiTitle: 'Chi-Squared Test (25 df)',
      kpiChiSub: 'Distance from reference language frequencies',
      kpiEntropyTitle: 'Shannon Entropy (H)',
      kpiEntropySub: 'Theoretical maximum on 26 letters: 4.700 bits/char',
      kpiDecibanTitle: 'Turing Score (Decibans)',
      kpiDecibanSub: 'Log-likelihood weight of evidence',
      verdictRandom: 'Uniform distribution consistent with ciphertext',
      verdictStructured: 'Partial deviation from uniform random distribution',
      verdictNatural: 'Distribution consistent with natural language text',
      chartFreqTitle: 'Observed vs Expected Letter Frequencies (A-Z)',
      chartObserved: 'Sample text (%)',
      chartExpected: 'Reference language (%)',
      chartChiCol: 'Chi-Squared term',
      banburismusTitle: 'Banburismus Procedure and Depth Comparison',
      banburismusSprtTitle: 'Cumulative Deciban Path',
      banburismusSprtDesc: 'Letter-by-letter cumulative log-likelihood score.',
      banburismusDepthTitle: 'Two-Message Overlap Test',
      banburismusDepthDesc: 'Search for relative shift between two messages encrypted with the same key.',
      banburismusMsgA: 'Ciphertext A',
      banburismusMsgB: 'Ciphertext B',
      banburismusGenerateDemo: 'Generate +5 shifted pair',
      banburismusBestOffset: 'Highest coincidence shift',
      attackTitle: '17,576 Rotor Position Scan',
      attackDesc: 'Decrypts the text across every position from AAA to ZZZ and orders results by language similarity.',
      attackRankBy: 'Order by',
      attackRunBtn: 'Start scan',
      attackCancelBtn: 'Stop',
      attackProgress: 'Progress',
      attackApplyKey: 'Set on Enigma',
    },
    bombe: {
      title: 'Turing-Welchman Bombe Console',
      subtitle: 'Recover rotor positions and plugboard cables from an assumed plaintext word (Crib).',
      cipherLabel: 'Intercepted ciphertext',
      cribLabel: 'Assumed plaintext word (Crib)',
      scannerTitle: 'Collision-free alignment check',
      scannerValid: 'Compatible position',
      scannerCollision: 'Excluded (same letter)',
      selectedOffset: 'Position',
      menuTitle: 'Connection Diagram and Closed Loops',
      menuNodes: 'Letters',
      menuEdges: 'Links',
      menuCycles: 'Closed loops',
      testRegisterLabel: 'Central letter',
      noValidAlignError: 'No collision-free alignment found for this word.',
      sweepTitle: '17,576-Position Rotor Scan',
      sweepHelp: 'Tests electrical consistency across all three-rotor combinations.',
      sweepRunBtn: 'Start Bombe scan',
      sweepCancelBtn: 'Stop',
      stopsFoundLabel: 'Compatible positions (Stops)',
      noStopsYet: 'Start the scan to list compatible rotor positions.',
      applyStopBtn: 'Set on Enigma',
      inspectStopBtn: '26x26 Matrix',
      diagonalTitle: 'Diagonal Board Matrix (26 hypotheses)',
      diagonalHelp: 'Tests all 26 plugboard hypotheses on the central letter for the selected position.',
      hypothesisConsistent: 'Consistent',
      hypothesisContradicted: 'Contradiction',
      deducedSteckerLabel: 'Identified cables',
      propagatedStepsLabel: 'Verified links',
    },
    theory: {
      title: 'Mathematical Reference and Vector Checks',
      subtitle: 'Formulas used in the engine and automated verification of historical test vectors.',
      selfTestTitle: 'Automated Historical Vector Checks',
      selfTestDesc: 'Browser verification of rotor permutations, double-stepping (ADU -> ADV -> AEW -> BFX), AAAAA -> BDZGO, and key recovery.',
      runSelfTestBtn: 'Run checks',
      passedLabel: 'OK',
      failedLabel: 'FAIL',
    },
    footer: {
      note: 'Enigma M3, Turing Bombe, and statistical analysis simulator.',
      vectorBadge: 'Reference vector: I-II-III, UKW-B, Rings 01-01-01, AAA -> AAAAA = BDZGO',
    },
  },
};
