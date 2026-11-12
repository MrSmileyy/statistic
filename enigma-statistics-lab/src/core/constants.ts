import type {
  HistoricalPreset,
  ReflectorId,
  ReflectorSpec,
  RotorId,
  RotorSpec,
  TargetLanguage,
} from '../types';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ALPHABET_SIZE = 26;
export const TOTAL_ROTOR_POSITIONS = 26 * 26 * 26; // 17,576 combinations

export const ROTOR_IDS: RotorId[] = ['I', 'II', 'III', 'IV', 'V'];
export const REFLECTOR_IDS: ReflectorId[] = ['UKW-B', 'UKW-C'];

/** Convert a single uppercase ASCII character A-Z into 0-25, or -1 if invalid. */
export function charToIndex(ch: string): number {
  if (!ch) return -1;
  const code = ch.toUpperCase().charCodeAt(0) - 65;
  return code >= 0 && code < ALPHABET_SIZE ? code : -1;
}

/** Convert an integer index (modulo 26) into an uppercase letter A-Z. */
export function indexToChar(idx: number): string {
  const normalized = ((idx % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE;
  return ALPHABET[normalized];
}

/** Format a 3-rotor tuple [L, M, R] as a 3-letter window string (e.g. "AAA"). */
export function formatPositionLabel(pos: readonly [number, number, number]): string {
  return `${indexToChar(pos[0])}${indexToChar(pos[1])}${indexToChar(pos[2])}`;
}

/**
 * Normalize free-form text into uppercase A-Z letters for Enigma processing.
 * German umlauts and sharp-s expand according to historical Wehrmacht telegraph rules.
 */
export function normalizeAsciiLetters(input: string): string {
  return input
    .toUpperCase()
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .replace(/ß/g, 'SS')
    .replace(/[^A-Z]/g, '');
}

function buildRotorSpec(
  id: RotorId,
  wiring: string,
  notchChar: string,
  year: string
): RotorSpec {
  const forward = new Array<number>(ALPHABET_SIZE);
  const backward = new Array<number>(ALPHABET_SIZE);

  for (let i = 0; i < ALPHABET_SIZE; i++) {
    const out = charToIndex(wiring[i]);
    forward[i] = out;
    backward[out] = i;
  }

  return {
    id,
    wiring,
    forward,
    backward,
    notchChar,
    notchIndex: charToIndex(notchChar),
    year,
  };
}

function buildReflectorSpec(id: ReflectorId, wiring: string): ReflectorSpec {
  const mapping = new Array<number>(ALPHABET_SIZE);
  for (let i = 0; i < ALPHABET_SIZE; i++) {
    mapping[i] = charToIndex(wiring[i]);
  }
  return { id, wiring, mapping };
}

/**
 * Historical Enigma I / M3 rotor wirings and turnover notches.
 * Note: Turnover happens when the visible window letter equals the notch letter.
 */
export const ROTORS: Record<RotorId, RotorSpec> = {
  I: buildRotorSpec('I', 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q', '1930'),
  II: buildRotorSpec('II', 'AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E', '1930'),
  III: buildRotorSpec('III', 'BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V', '1930'),
  IV: buildRotorSpec('IV', 'ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J', '1938'),
  V: buildRotorSpec('V', 'VZBRGITYUPSDNHLXAWMJQOFECK', 'Z', '1938'),
};

/** Historical involutive reflectors (no fixed points: mapping[x] !== x). */
export const REFLECTORS: Record<ReflectorId, ReflectorSpec> = {
  'UKW-B': buildReflectorSpec('UKW-B', 'YRUHQSLDPXNGOKMIEBFZCWVJAT'),
  'UKW-C': buildReflectorSpec('UKW-C', 'FVPJIAOYEDRZXWGCTKUQSBNMHL'),
};

// Raw relative percentage tables (A-Z) before strict normalization to sum = 1.0.
const RAW_FREQUENCIES: Record<TargetLanguage, number[]> = {
  // Standard German prose letter distribution (Wehrmacht telegraph reference).
  DE: [
    6.51, 1.89, 3.06, 5.08, 17.40, 1.66, 3.01, 4.76, 7.55, 0.27, 1.21, 3.44, 2.53,
    9.78, 2.51, 0.79, 0.02, 7.00, 7.27, 6.15, 4.35, 0.67, 1.89, 0.03, 0.04, 1.13,
  ],
  // Standard English prose letter distribution (Lewand / Oxford corpus).
  EN: [
    8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406,
    6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.360, 0.150, 1.974, 0.074,
  ],
};

function normalizeDistribution(weights: number[]): number[] {
  const sum = weights.reduce((acc, v) => acc + v, 0);
  return weights.map((v) => v / sum);
}

/** Normalized unigram probability distributions (A-Z summing strictly to 1.0). */
export const LETTER_FREQUENCIES: Record<TargetLanguage, number[]> = {
  DE: normalizeDistribution(RAW_FREQUENCIES.DE),
  EN: normalizeDistribution(RAW_FREQUENCIES.EN),
};

function sumOfSquares(probs: number[]): number {
  return probs.reduce((acc, p) => acc + p * p, 0);
}

/** Theoretical Index of Coincidence kappa = sum(p_i^2) for German, English, and uniform noise. */
export const EXPECTED_IOC: Record<TargetLanguage | 'RANDOM', number> = {
  DE: sumOfSquares(LETTER_FREQUENCIES.DE),
  EN: sumOfSquares(LETTER_FREQUENCIES.EN),
  RANDOM: 1 / ALPHABET_SIZE,
};

/** Precomputed 10 * log10(p_i / (1/26)) per letter for fast Turing Deciban scoring. */
export const DECIBAN_WEIGHTS: Record<TargetLanguage, Float64Array> = {
  DE: Float64Array.from(LETTER_FREQUENCIES.DE, (p) => 10 * Math.log10(p * ALPHABET_SIZE)),
  EN: Float64Array.from(LETTER_FREQUENCIES.EN, (p) => 10 * Math.log10(p * ALPHABET_SIZE)),
};

/**
 * Curated educational intercepts for testing statistical profiles, Bombe menu loops,
 * and ciphertext-only sweeps without manual data entry.
 */
export const HISTORICAL_PRESETS: HistoricalPreset[] = [
  {
    id: 'wetterbericht-1941',
    titleIt: 'Bollettino Meteo Wehrmacht (WETTERBERICHT)',
    titleEn: 'Wehrmacht Weather Intercept (WETTERBERICHT)',
    descriptionIt:
      'Intercettazione tedesca standard con crib meteorologico ad alto numero di cicli sul grafo del menu e Steckerbrett attivo.',
    descriptionEn:
      'Standard German intercept with a high-closure weather crib and active Steckerbrett pairs.',
    targetLanguage: 'DE',
    config: {
      rotors: ['I', 'II', 'III'],
      reflector: 'UKW-B',
      ringSettings: [0, 0, 0],
      rotorPositions: [1, 14, 12], // BOM
      plugboard: [
        ['A', 'M'],
        ['F', 'I'],
        ['N', 'V'],
        ['P', 'S'],
        ['T', 'U'],
        ['W', 'Z'],
      ],
    },
    plaintext:
      'WETTERBERICHTVOMDIENSTAGXWINDSTAERKESECHSXSIEDLUNGSEKTORNORDOSTKLARUNDKALT',
    crib: 'WETTERBERICHT',
    expectedOffset: 0,
  },
  {
    id: 'keinebesonderen-1942',
    titleIt: 'Rapporto di Routine (KEINEBESONDERENEREIGNISSE)',
    titleEn: 'Routine Sector Report (KEINEBESONDERENEREIGNISSE)',
    descriptionIt:
      'Messaggio lungo ideale per osservare lo scarto significativo dell Indice di Coincidenza e del Test Chi-Quadro rispetto al rumore uniforme.',
    descriptionEn:
      'Long German intercept suited for clear Index of Coincidence, Z-Score, and Chi-Squared hypothesis separation.',
    targetLanguage: 'DE',
    config: {
      rotors: ['II', 'IV', 'V'],
      reflector: 'UKW-B',
      ringSettings: [2, 8, 14], // C I O
      rotorPositions: [6, 17, 10], // GRK
      plugboard: [
        ['B', 'L'],
        ['C', 'K'],
        ['D', 'G'],
        ['E', 'J'],
        ['H', 'M'],
      ],
    },
    plaintext:
      'ANGRIFFBEFEHLVERTAGTXKEINEBESONDERENEREIGNISSEIMABSCHNITTSUEDXVERSORGUNGSLAGEUNVERAENDERTGUT',
    crib: 'BESONDERENEREIGNISSE',
    expectedOffset: 26,
  },
  {
    id: 'bletchley-en-demo',
    titleIt: 'Test Statistico in Inglese (WEATHERFORECAST)',
    titleEn: 'English Statistical Corpus (WEATHERFORECAST)',
    descriptionIt:
      'Testo cifrato senza Steckerbrett configurato per testare rapidamente l attacco statistico puro sulle 17576 posizioni.',
    descriptionEn:
      'Unsteckered English message ideal for rapid 17,576-position ciphertext-only statistical ranking.',
    targetLanguage: 'EN',
    config: {
      rotors: ['III', 'I', 'II'],
      reflector: 'UKW-B',
      ringSettings: [0, 0, 0],
      rotorPositions: [19, 20, 17], // TUR
      plugboard: [],
    },
    plaintext:
      'PRIORITYDISPATCHTOTHEBLETCHLEYPARKSTATIONXWEATHERFORECASTINDICATESCLEARSKIESOVERCHANNELSECTOR',
    crib: 'WEATHERFORECAST',
    expectedOffset: 42,
  },
];

