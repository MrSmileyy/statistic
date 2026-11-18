export type Language = 'it' | 'en';
export type TargetLanguage = 'DE' | 'EN';
export type RotorId = 'I' | 'II' | 'III' | 'IV' | 'V';
export type ReflectorId = 'UKW-B' | 'UKW-C';
export type StatisticalRankMetric = 'IOC' | 'CHI_SQUARED' | 'DECIBANS';
export type PlugPair = [string, string];

export interface RotorSpec {
  id: RotorId;
  wiring: string;
  forward: number[];
  backward: number[];
  notchIndex: number;
  notchChar: string;
  year: string;
}

export interface ReflectorSpec {
  id: ReflectorId;
  wiring: string;
  mapping: number[];
}

export interface EnigmaConfig {
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  ringSettings: [number, number, number];
  rotorPositions: [number, number, number];
  plugboard: PlugPair[];
}

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

export interface LetterFrequencyItem {
  char: string;
  index: number;
  count: number;
  observedFreq: number;
  expectedFreq: number;
  chiSquaredComponent: number;
}

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

export interface BanburismusOffsetResult {
  offset: number;
  overlapLength: number;
  coincidences: number;
  coincidenceRate: number;
  decibans: number;
  zScore: number;
}

export interface CribAlignment {
  offset: number;
  cipherSlice: string;
  crib: string;
  isValid: boolean;
  collisionIndices: number[];
}

export interface MenuNode {
  char: string;
  index: number;
  degree: number;
  inCycle: boolean;
}

export interface MenuEdge {
  id: number;
  from: string;
  to: string;
  fromIdx: number;
  toIdx: number;
  cribIndex: number;
  messageIndex: number;
}

export interface MenuCycle {
  nodes: string[];
  edgeIds: number[];
  length: number;
}

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

export interface BombeHypothesisTrace {
  assumedPartner: string;
  assumedPartnerIdx: number;
  consistent: boolean;
  propagatedSteps: number;
  contradictedNodes: string[];
  boardMask: number[];
  deducedPairs: PlugPair[];
}

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

export interface CancelWorkerRequest {
  type: 'CANCEL';
  requestId: string;
}

export type WorkerRequest =
  | BombeSweepRequest
  | CiphertextAttackRequest
  | CancelWorkerRequest;

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
