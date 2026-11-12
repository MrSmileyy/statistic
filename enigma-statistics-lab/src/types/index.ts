/** UI localization codes supported by the application. */
export type Language = 'it' | 'en';

/** Historical natural languages used for statistical frequency models. */
export type TargetLanguage = 'DE' | 'EN';

/** Wehrmacht / Kriegsmarine Enigma M3 rotor designations (wheels I through V). */
export type RotorId = 'I' | 'II' | 'III' | 'IV' | 'V';

/** Standard Enigma M3 reflectors (Umkehrwalzen). */
export type ReflectorId = 'UKW-B' | 'UKW-C';

/** Ranking criterion for 17,576-position ciphertext-only statistical sweeps. */
export type StatisticalRankMetric = 'IOC' | 'CHI_SQUARED' | 'DECIBANS';

/** Unordered letter pair connected on the plugboard (Steckerbrett). */
export type PlugPair = [string, string];

/** Internal specification of a single historical Enigma rotor wheel. */
export interface RotorSpec {
  id: RotorId;
  wiring: string;
  forward: number[];
  backward: number[];
  notchIndex: number;
  notchChar: string;
  year: string;
}

/** Internal specification of a historical Enigma reflector. */
export interface ReflectorSpec {
  id: ReflectorId;
  wiring: string;
  mapping: number[];
}

/** Complete Enigma M3 state configuration. Order of tuples is [Left, Middle, Right]. */
export interface EnigmaConfig {
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  ringSettings: [number, number, number];
  rotorPositions: [number, number, number];
  plugboard: PlugPair[];
}

/** Detailed 14-stage contact trace for a single keypress through the Enigma circuit. */
export interface SignalTrace {
  inputChar: string;
  inputIdx: number;
  steckerInIdx: number;
  rightInIdx: number;
  rightOutIdx: number;
  middleInIdx: number;
  middleOutIdx: number;
  leftInIdx: number;
  leftOutIdx: number;
  reflectorInIdx: number;
  reflectorOutIdx: number;
  leftBackIdx: number;
  middleBackIdx: number;
  rightBackIdx: number;
  steckerOutIdx: number;
  lampIdx: number;
  lampChar: string;
  rotorPositionsBefore: [number, number, number];
  rotorPositionsAfter: [number, number, number];
  doubleStepped: boolean;
}

/** Per-letter frequency bin comparing observed counts against target language expectations. */
export interface LetterFrequencyItem {
  char: string;
  index: number;
  count: number;
  observedFreq: number;
  expectedFreq: number;
  chiSquaredComponent: number;
}

/** Full statistical profile of an A-Z text sample. */
export interface StatisticalReport {
  length: number;
  targetLanguage: TargetLanguage;
  ioc: number;
  expectedIocLanguage: number;
  expectedIocRandom: number;
  kappaNormalized: number;
  zScore: number;
  iocStandardErrorH0: number;
  chiSquared: number;
  chiSquaredDegreesOfFreedom: number;
  chiSquaredPValue: number;
  shannonEntropy: number;
  maxEntropy: number;
  totalDecibans: number;
  decibansPerChar: number;
  posteriorOddsFactor: number;
  cumulativeDecibans: number[];
  frequencies: LetterFrequencyItem[];
}

/** Result of aligning two ciphertexts at shift tau for Turing's Banburismus test. */
export interface BanburismusOffsetResult {
  offset: number;
  overlapLength: number;
  coincidences: number;
  coincidenceRate: number;
  decibans: number;
  zScore: number;
}

/** Candidate alignment of a known plaintext crib against a ciphertext. */
export interface CribAlignment {
  offset: number;
  cipherSlice: string;
  crib: string;
  isValid: boolean;
  collisionIndices: number[];
}

/** Vertex in the Turing-Welchman Bombe menu graph. */
export interface MenuNode {
  char: string;
  index: number;
  degree: number;
  inCycle: boolean;
}

/** Undirected edge in the Bombe menu linking plaintext and ciphertext letters at a crib step. */
export interface MenuEdge {
  id: number;
  from: string;
  to: string;
  fromIdx: number;
  toIdx: number;
  cribIndex: number;
  messageIndex: number;
}

/** Elementary closed loop (closure) identified in the Bombe menu graph. */
export interface MenuCycle {
  nodes: string[];
  edgeIds: number[];
  length: number;
}

/** Complete Bombe menu extracted from a valid crib alignment. */
export interface BombeMenu {
  crib: string;
  offset: number;
  cipherSlice: string;
  nodes: MenuNode[];
  edges: MenuEdge[];
  cycles: MenuCycle[];
  testRegister: string;
  testRegisterIdx: number;
  isValidAlignment: boolean;
}

/** Propagation trace on the Diagonal Board for a single stecker hypothesis on the test register. */
export interface BombeHypothesisTrace {
  assumedPartner: string;
  assumedPartnerIdx: number;
  consistent: boolean;
  propagatedSteps: number;
  contradictedNodes: string[];
  boardMask: number[];
  deducedPairs: PlugPair[];
}

/** Candidate rotor position ("Stop") surviving Bombe logical contradiction elimination. */
export interface BombeStop {
  positions: [number, number, number];
  positionLabel: string;
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  consistentHypotheses: string[];
  deducedPlugboard: PlugPair[];
  decryptedPreview: string;
  ioc: number;
  chiSquared: number;
  decibans: number;
  zScore: number;
}

/** Candidate rotor position ranked purely by ciphertext-only statistical fitness. */
export interface StatisticalCandidate {
  positions: [number, number, number];
  positionLabel: string;
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  ioc: number;
  zScore: number;
  chiSquared: number;
  decibans: number;
  decryptedPreview: string;
}

/** Request payload sent to the analysis Web Worker for a Bombe rotor sweep. */
export interface BombeSweepRequest {
  type: 'BOMBE_SWEEP';
  requestId: string;
  ciphertext: string;
  crib: string;
  offset: number;
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  ringSettings: [number, number, number];
  targetLanguage: TargetLanguage;
  maxStops?: number;
}

/** Request payload sent to the analysis Web Worker for a 17,576-position statistical attack. */
export interface CiphertextAttackRequest {
  type: 'CIPHERTEXT_ATTACK';
  requestId: string;
  ciphertext: string;
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  ringSettings: [number, number, number];
  plugboard: PlugPair[];
  targetLanguage: TargetLanguage;
  rankBy: StatisticalRankMetric;
  topK?: number;
}

/** Request to abort any in-flight worker sweep matching requestId. */
export interface CancelWorkerRequest {
  type: 'CANCEL';
  requestId: string;
}

export type WorkerRequest =
  | BombeSweepRequest
  | CiphertextAttackRequest
  | CancelWorkerRequest;

/** Incremental progress and terminal result messages emitted by the analysis Web Worker. */
export type WorkerResponse =
  | {
      type: 'PROGRESS';
      requestId: string;
      tested: number;
      total: number;
      elapsedMs: number;
    }
  | {
      type: 'BOMBE_COMPLETE';
      requestId: string;
      tested: number;
      total: number;
      elapsedMs: number;
      stops: BombeStop[];
    }
  | {
      type: 'ATTACK_COMPLETE';
      requestId: string;
      tested: number;
      total: number;
      elapsedMs: number;
      candidates: StatisticalCandidate[];
    }
  | {
      type: 'ERROR';
      requestId: string;
      error: string;
    };

/** Preset scenario combining an Enigma key, historical plaintext, and known crib for demos. */
export interface HistoricalPreset {
  id: string;
  titleIt: string;
  titleEn: string;
  descriptionIt: string;
  descriptionEn: string;
  targetLanguage: TargetLanguage;
  config: EnigmaConfig;
  plaintext: string;
  crib: string;
  expectedOffset: number;
}

