import {
  ALPHABET,
  ALPHABET_SIZE,
  DECIBAN_WEIGHTS,
  EXPECTED_IOC,
  LETTER_FREQUENCIES,
  normalizeAsciiLetters,
} from './constants';
import type {
  BanburismusOffsetResult,
  LetterFrequencyItem,
  StatisticalReport,
  TargetLanguage,
} from '../types';

/** Convert arbitrary text into compact A-Z indices (0..25) after Enigma normalization. */
export function textToIndices(text: string): Uint8Array {
  const clean = normalizeAsciiLetters(text);
  const out = new Uint8Array(clean.length);
  for (let i = 0; i < clean.length; i++) {
    out[i] = clean.charCodeAt(i) - 65;
  }
  return out;
}

/**
 * Exact log-gamma via Lanczos approximation for computing Chi-Squared upper-tail p-values.
 */
function logGamma(z: number): number {
  const coeffs = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < coeffs.length; j++) {
    y += 1;
    ser += coeffs[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Regularized lower incomplete gamma P(a, x) via power series (accurate when x < a + 1). */
function gammaLowerSeries(a: number, x: number): number {
  const gln = logGamma(a);
  if (x <= 0) return 0;
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= 200; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

/** Regularized upper incomplete gamma Q(a, x) via modified Lentz continued fraction. */
function gammaUpperContinuedFraction(a: number, x: number): number {
  const gln = logGamma(a);
  const fpMin = 1e-30;
  let b = x + 1 - a;
  let c = 1 / fpMin;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = b + an / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }

  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** Compute upper-tail Chi-Squared p-value P(X >= chiSq) for given degrees of freedom. */
export function chiSquaredPValue(chiSq: number, df: number): number {
  if (chiSq <= 0) return 1;
  if (!Number.isFinite(chiSq)) return 0;
  const a = df / 2;
  const x = chiSq / 2;
  if (x < a + 1) {
    return Math.max(0, Math.min(1, 1 - gammaLowerSeries(a, x)));
  }
  return Math.max(0, Math.min(1, gammaUpperContinuedFraction(a, x)));
}

/**
 * Compute Index of Coincidence, Z-Score under uniform H0, Pearson's Chi-Squared,
 * Shannon Entropy, and Alan Turing's sequential Bayesian Deciban evidence.
 */
export function computeStatisticalReport(
  rawText: string,
  targetLanguage: TargetLanguage
): StatisticalReport {
  const indices = textToIndices(rawText);
  const n = indices.length;
  const counts = new Int32Array(ALPHABET_SIZE);

  for (let i = 0; i < n; i++) {
    counts[indices[i]]++;
  }

  const expectedLangFreqs = LETTER_FREQUENCIES[targetLanguage];
  const decibanWeights = DECIBAN_WEIGHTS[targetLanguage];
  const expectedIocRandom = EXPECTED_IOC.RANDOM;
  const expectedIocLanguage = EXPECTED_IOC[targetLanguage];

  let pairSum = 0;
  let chiSquared = 0;
  let shannonEntropy = 0;
  let totalDecibans = 0;

  const frequencies: LetterFrequencyItem[] = new Array(ALPHABET_SIZE);

  for (let i = 0; i < ALPHABET_SIZE; i++) {
    const count = counts[i];
    pairSum += count * (count - 1);

    const observedFreq = n > 0 ? count / n : 0;
    const expectedFreq = expectedLangFreqs[i];
    const expectedCount = n * expectedFreq;

    let chiComp = 0;
    if (n > 0 && expectedCount > 0) {
      const diff = count - expectedCount;
      chiComp = (diff * diff) / expectedCount;
      chiSquared += chiComp;
    }

    if (count > 0 && n > 0) {
      shannonEntropy -= observedFreq * Math.log2(observedFreq);
      totalDecibans += count * decibanWeights[i];
    }

    frequencies[i] = {
      char: ALPHABET[i],
      index: i,
      count,
      observedFreq,
      expectedFreq,
      chiSquaredComponent: chiComp,
    };
  }

  // Track cumulative Bayesian Deciban trajectory character by character (SPRT visualization).
  const cumulativeDecibans = new Array<number>(n);
  let runningDb = 0;
  for (let i = 0; i < n; i++) {
    runningDb += decibanWeights[indices[i]];
    cumulativeDecibans[i] = runningDb;
  }

  const ioc = n > 1 ? pairSum / (n * (n - 1)) : 0;

  // Under uniform H0 (p_0 = 1/26), pairwise coincidence indicators have zero covariance across triples.
  // Exact variance over M = n(n-1)/2 pairs is Var(IoC) = p_0(1 - p_0) / M = 25 / (338 * n * (n - 1)).
  const iocStandardErrorH0 = n > 1 ? Math.sqrt(25 / (338 * n * (n - 1))) : 0;
  const zScore = iocStandardErrorH0 > 0 ? (ioc - expectedIocRandom) / iocStandardErrorH0 : 0;

  const df = ALPHABET_SIZE - 1;
  const pValue = n > 0 ? chiSquaredPValue(chiSquared, df) : 1;
  const clampedLogOdds = Math.max(-20, Math.min(20, totalDecibans / 10));

  return {
    length: n,
    targetLanguage,
    ioc,
    expectedIocLanguage,
    expectedIocRandom,
    kappaNormalized: ioc * ALPHABET_SIZE,
    zScore,
    iocStandardErrorH0,
    chiSquared,
    chiSquaredDegreesOfFreedom: df,
    chiSquaredPValue: pValue,
    shannonEntropy,
    maxEntropy: Math.log2(ALPHABET_SIZE),
    totalDecibans,
    decibansPerChar: n > 0 ? totalDecibans / n : 0,
    posteriorOddsFactor: n > 0 ? Math.pow(10, clampedLogOdds) : 1,
    cumulativeDecibans,
    frequencies,
  };
}

/**
 * Allocation-light statistical scorer for Web Worker 17,576-position scans.
 * Expects a preallocated counts Int32Array(26) supplied by the caller.
 */
export function scoreIndicesFast(
  indices: Uint8Array,
  targetLanguage: TargetLanguage,
  countsScratch: Int32Array
): { ioc: number; zScore: number; chiSquared: number; decibans: number } {
  const n = indices.length;
  countsScratch.fill(0);
  for (let i = 0; i < n; i++) {
    countsScratch[indices[i]]++;
  }

  const expectedLangFreqs = LETTER_FREQUENCIES[targetLanguage];
  const decibanWeights = DECIBAN_WEIGHTS[targetLanguage];

  let pairSum = 0;
  let chiSquared = 0;
  let decibans = 0;

  for (let i = 0; i < ALPHABET_SIZE; i++) {
    const count = countsScratch[i];
    pairSum += count * (count - 1);

    const expectedCount = n * expectedLangFreqs[i];
    if (expectedCount > 0) {
      const diff = count - expectedCount;
      chiSquared += (diff * diff) / expectedCount;
    }
    if (count > 0) {
      decibans += count * decibanWeights[i];
    }
  }

  const ioc = n > 1 ? pairSum / (n * (n - 1)) : 0;
  const seH0 = n > 1 ? Math.sqrt(25 / (338 * n * (n - 1))) : 0;
  const zScore = seH0 > 0 ? (ioc - EXPECTED_IOC.RANDOM) / seH0 : 0;

  return { ioc, zScore, chiSquared, decibans };
}

/**
 * Turing's Banburismus coincidence analysis between two ciphertexts across integer shifts tau.
 * Same Enigma depth yields expected coincidence rate kappa_lang (> 0.066) vs random 1/26 (~0.0385).
 */
export function computeBanburismusOffsets(
  rawCipherA: string,
  rawCipherB: string,
  targetLanguage: TargetLanguage,
  maxAbsOffset = 20
): BanburismusOffsetResult[] {
  const a = textToIndices(rawCipherA);
  const b = textToIndices(rawCipherB);
  const results: BanburismusOffsetResult[] = [];

  if (a.length === 0 || b.length === 0) return results;

  const pLang = EXPECTED_IOC[targetLanguage];
  const pRand = EXPECTED_IOC.RANDOM;
  const logHit = Math.log10(pLang / pRand);
  const logMiss = Math.log10((1 - pLang) / (1 - pRand));

  for (let offset = -maxAbsOffset; offset <= maxAbsOffset; offset++) {
    const startA = Math.max(0, offset);
    const startB = Math.max(0, -offset);
    const overlapLength = Math.min(a.length - startA, b.length - startB);
    if (overlapLength < 8) continue;

    let coincidences = 0;
    for (let i = 0; i < overlapLength; i++) {
      if (a[startA + i] === b[startB + i]) {
        coincidences++;
      }
    }

    const coincidenceRate = coincidences / overlapLength;
    const decibans =
      10 * (coincidences * logHit + (overlapLength - coincidences) * logMiss);
    const se = Math.sqrt((pRand * (1 - pRand)) / overlapLength);
    const zScore = se > 0 ? (coincidenceRate - pRand) / se : 0;

    results.push({
      offset,
      overlapLength,
      coincidences,
      coincidenceRate,
      decibans,
      zScore,
    });
  }

  return results;
}

