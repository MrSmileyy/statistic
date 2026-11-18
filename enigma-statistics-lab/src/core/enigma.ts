import {
  ALPHABET_SIZE,
  charToIndex,
  indexToChar,
  normalizeAsciiLetters,
  REFLECTORS,
  ROTORS,
} from './constants';
import type {
  EnigmaConfig,
  PlugPair,
  ReflectorId,
  RotorId,
  SignalTrace,
} from '../types';

/**
 * Construct a 26-entry involution lookup table from user plugboard pairs.
 * Conflicting or malformed letters are ignored so the permutation stays strictly bijective.
 */
export function buildPlugboardMap(plugboard: PlugPair[]): Int32Array {
  const map = new Int32Array(ALPHABET_SIZE);
  for (let i = 0; i < ALPHABET_SIZE; i++) {
    map[i] = i;
  }

  for (const [rawA, rawB] of plugboard) {
    const a = charToIndex(rawA);
    const b = charToIndex(rawB);
    if (a < 0 || b < 0 || a === b) continue;
    // Skip pair if either socket is already occupied.
    if (map[a] !== a || map[b] !== b) continue;
    map[a] = b;
    map[b] = a;
  }

  return map;
}

/**
 * Advance rotor window positions [Left, Middle, Right] according to Enigma M3 mechanics,
 * including the mechanical middle-rotor double-stepping anomaly.
 */
export function stepRotorPositions(
  rotors: readonly [RotorId, RotorId, RotorId],
  positions: readonly [number, number, number]
): { next: [number, number, number]; doubleStepped: boolean } {
  let [leftPos, middlePos, rightPos] = positions;
  const middleAtNotch = middlePos === ROTORS[rotors[1]].notchIndex;
  const rightAtNotch = rightPos === ROTORS[rotors[2]].notchIndex;

  let doubleStepped = false;
  if (middleAtNotch) {
    // Middle pawl sits in the middle notch: pushes left rotor AND self-advances middle rotor.
    leftPos = (leftPos + 1) % ALPHABET_SIZE;
    middlePos = (middlePos + 1) % ALPHABET_SIZE;
    doubleStepped = true;
  } else if (rightAtNotch) {
    middlePos = (middlePos + 1) % ALPHABET_SIZE;
  }

  rightPos = (rightPos + 1) % ALPHABET_SIZE;
  return { next: [leftPos, middlePos, rightPos], doubleStepped };
}

/** Pass signal forward (right-to-left) through one rotor adjusted by position and ring offset. */
function passForward(rotorId: RotorId, idx: number, pos: number, ring: number): number {
  const shift = pos - ring;
  const entered = (idx + shift + ALPHABET_SIZE) % ALPHABET_SIZE;
  const exited = ROTORS[rotorId].forward[entered];
  return (exited - shift + ALPHABET_SIZE) % ALPHABET_SIZE;
}

/** Pass signal backward (left-to-right) through one rotor adjusted by position and ring offset. */
function passBackward(rotorId: RotorId, idx: number, pos: number, ring: number): number {
  const shift = pos - ring;
  const entered = (idx + shift + ALPHABET_SIZE) % ALPHABET_SIZE;
  const exited = ROTORS[rotorId].backward[entered];
  return (exited - shift + ALPHABET_SIZE) % ALPHABET_SIZE;
}

export class EnigmaM3 {
  private config: EnigmaConfig;
  private plugMap: Int32Array;

  constructor(config: EnigmaConfig) {
    this.config = {
      rotors: [...config.rotors] as [RotorId, RotorId, RotorId],
      reflector: config.reflector,
      ringSettings: [...config.ringSettings] as [number, number, number],
      rotorPositions: [...config.rotorPositions] as [number, number, number],
      plugboard: config.plugboard.map(([a, b]) => [a.toUpperCase(), b.toUpperCase()] as PlugPair),
    };
    this.plugMap = buildPlugboardMap(this.config.plugboard);
  }

  /** Return a defensive copy of the current Enigma configuration. */
  getConfig(): EnigmaConfig {
    return {
      rotors: [...this.config.rotors] as [RotorId, RotorId, RotorId],
      reflector: this.config.reflector,
      ringSettings: [...this.config.ringSettings] as [number, number, number],
      rotorPositions: [...this.config.rotorPositions] as [number, number, number],
      plugboard: this.config.plugboard.map(([a, b]) => [a, b] as PlugPair),
    };
  }

  /** Update partial or full machine configuration and rebuild plugboard lookup. */
  reset(partial?: Partial<EnigmaConfig>): void {
    if (partial?.rotors) {
      this.config.rotors = [...partial.rotors] as [RotorId, RotorId, RotorId];
    }
    if (partial?.reflector) {
      this.config.reflector = partial.reflector;
    }
    if (partial?.ringSettings) {
      this.config.ringSettings = [...partial.ringSettings] as [number, number, number];
    }
    if (partial?.rotorPositions) {
      this.config.rotorPositions = [...partial.rotorPositions] as [number, number, number];
    }
    if (partial?.plugboard) {
      this.config.plugboard = partial.plugboard.map(
        ([a, b]) => [a.toUpperCase(), b.toUpperCase()] as PlugPair
      );
      this.plugMap = buildPlugboardMap(this.config.plugboard);
    }
  }

  clone(): EnigmaM3 {
    return new EnigmaM3(this.getConfig());
  }

  /** Advance rotors by one keypress before encryption and report double-stepping events. */
  step(): { positions: [number, number, number]; doubleStepped: boolean } {
    const { next, doubleStepped } = stepRotorPositions(
      this.config.rotors,
      this.config.rotorPositions
    );
    this.config.rotorPositions = next;
    return { positions: [...next] as [number, number, number], doubleStepped };
  }

  /**
   * Encrypt/decrypt a single alphabetic letter: advances rotors first, then traces the
   * complete electrical path through Plugboard -> Right -> Middle -> Left -> Reflector -> back.
   */
  encryptChar(rawChar: string): SignalTrace | null {
    const inputIdx = charToIndex(rawChar);
    if (inputIdx < 0) return null;

    const before: [number, number, number] = [...this.config.rotorPositions];
    const { positions: after, doubleStepped } = this.step();

    const [rL, rM, rR] = this.config.rotors;
    const [ringL, ringM, ringR] = this.config.ringSettings;
    const [posL, posM, posR] = after;

    const steckerInIdx = this.plugMap[inputIdx];
    const rightInIdx = steckerInIdx;
    const rightOutIdx = passForward(rR, rightInIdx, posR, ringR);
    const middleInIdx = rightOutIdx;
    const middleOutIdx = passForward(rM, middleInIdx, posM, ringM);
    const leftInIdx = middleOutIdx;
    const leftOutIdx = passForward(rL, leftInIdx, posL, ringL);

    const reflectorInIdx = leftOutIdx;
    const reflectorOutIdx = REFLECTORS[this.config.reflector].mapping[reflectorInIdx];

    const leftBackIdx = passBackward(rL, reflectorOutIdx, posL, ringL);
    const middleBackIdx = passBackward(rM, leftBackIdx, posM, ringM);
    const rightBackIdx = passBackward(rR, middleBackIdx, posR, ringR);
    const steckerOutIdx = this.plugMap[rightBackIdx];

    return {
      inputChar: indexToChar(inputIdx),
      inputIdx,
      steckerInIdx,
      rightInIdx,
      rightOutIdx,
      middleInIdx,
      middleOutIdx,
      leftInIdx,
      leftOutIdx,
      reflectorInIdx,
      reflectorOutIdx,
      leftBackIdx,
      middleBackIdx,
      rightBackIdx,
      steckerOutIdx,
      lampIdx: steckerOutIdx,
      lampChar: indexToChar(steckerOutIdx),
      rotorPositionsBefore: before,
      rotorPositionsAfter: after,
      doubleStepped,
    };
  }

  /** Sanitize text to uppercase A-Z letters and run Enigma transformation across all letters. */
  encryptText(text: string): { ciphertext: string; traces: SignalTrace[] } {
    const normalized = normalizeAsciiLetters(text);
    const traces: SignalTrace[] = [];
    const outChars: string[] = [];

    for (let i = 0; i < normalized.length; i++) {
      const trace = this.encryptChar(normalized[i]);
      if (trace) {
        traces.push(trace);
        outChars.push(trace.lampChar);
      }
    }

    return { ciphertext: outChars.join(''), traces };
  }

  /**
   * Compute the 26-letter scrambler involution (excluding plugboard) at a static rotor window state.
   * Writing into a caller-supplied buffer keeps 17,576-position Bombe scans allocation-free.
   */
  static computeScramblerPermutation(
    rotors: readonly [RotorId, RotorId, RotorId],
    reflector: ReflectorId,
    ringSettings: readonly [number, number, number],
    positions: readonly [number, number, number],
    outBuffer: Int32Array | number[] = new Int32Array(ALPHABET_SIZE),
    outOffset = 0
  ): Int32Array | number[] {
    const [rL, rM, rR] = rotors;
    const [ringL, ringM, ringR] = ringSettings;
    const [posL, posM, posR] = positions;

    const rFwd = ROTORS[rR].forward;
    const rBwd = ROTORS[rR].backward;
    const mFwd = ROTORS[rM].forward;
    const mBwd = ROTORS[rM].backward;
    const lFwd = ROTORS[rL].forward;
    const lBwd = ROTORS[rL].backward;
    const refl = REFLECTORS[reflector].mapping;

    const shiftR = (posR - ringR + ALPHABET_SIZE) % ALPHABET_SIZE;
    const shiftM = (posM - ringM + ALPHABET_SIZE) % ALPHABET_SIZE;
    const shiftL = (posL - ringL + ALPHABET_SIZE) % ALPHABET_SIZE;

    for (let c = 0; c < ALPHABET_SIZE; c++) {
      let sig = (rFwd[(c + shiftR) % ALPHABET_SIZE] - shiftR + ALPHABET_SIZE) % ALPHABET_SIZE;
      sig = (mFwd[(sig + shiftM) % ALPHABET_SIZE] - shiftM + ALPHABET_SIZE) % ALPHABET_SIZE;
      sig = (lFwd[(sig + shiftL) % ALPHABET_SIZE] - shiftL + ALPHABET_SIZE) % ALPHABET_SIZE;
      sig = refl[sig];
      sig = (lBwd[(sig + shiftL) % ALPHABET_SIZE] - shiftL + ALPHABET_SIZE) % ALPHABET_SIZE;
      sig = (mBwd[(sig + shiftM) % ALPHABET_SIZE] - shiftM + ALPHABET_SIZE) % ALPHABET_SIZE;
      sig = (rBwd[(sig + shiftR) % ALPHABET_SIZE] - shiftR + ALPHABET_SIZE) % ALPHABET_SIZE;
      outBuffer[outOffset + c] = sig;
    }

    return outBuffer;
  }
}

export function decryptIndicesFast(
  cipherIndices: Uint8Array,
  rotors: readonly [RotorId, RotorId, RotorId],
  reflector: ReflectorId,
  ringSettings: readonly [number, number, number],
  plugMap: Int32Array,
  initialPos: readonly [number, number, number],
  outPlainIndices: Uint8Array
): void {
  const rRSpec = ROTORS[rotors[2]];
  const rMSpec = ROTORS[rotors[1]];
  const rLSpec = ROTORS[rotors[0]];
  const refl = REFLECTORS[reflector].mapping;

  const rFwd = rRSpec.forward;
  const rBwd = rRSpec.backward;
  const mFwd = rMSpec.forward;
  const mBwd = rMSpec.backward;
  const lFwd = rLSpec.forward;
  const lBwd = rLSpec.backward;

  const notchM = rMSpec.notchIndex;
  const notchR = rRSpec.notchIndex;

  const [ringL, ringM, ringR] = ringSettings;
  let [posL, posM, posR] = initialPos;

  for (let i = 0; i < cipherIndices.length; i++) {
    const midAtNotch = posM === notchM;
    const rightAtNotch = posR === notchR;
    if (midAtNotch) {
      posL = (posL + 1) % ALPHABET_SIZE;
      posM = (posM + 1) % ALPHABET_SIZE;
    } else if (rightAtNotch) {
      posM = (posM + 1) % ALPHABET_SIZE;
    }
    posR = (posR + 1) % ALPHABET_SIZE;

    const shiftR = (posR - ringR + ALPHABET_SIZE) % ALPHABET_SIZE;
    const shiftM = (posM - ringM + ALPHABET_SIZE) % ALPHABET_SIZE;
    const shiftL = (posL - ringL + ALPHABET_SIZE) % ALPHABET_SIZE;

    let sig = plugMap[cipherIndices[i]];
    sig = (rFwd[(sig + shiftR) % ALPHABET_SIZE] - shiftR + ALPHABET_SIZE) % ALPHABET_SIZE;
    sig = (mFwd[(sig + shiftM) % ALPHABET_SIZE] - shiftM + ALPHABET_SIZE) % ALPHABET_SIZE;
    sig = (lFwd[(sig + shiftL) % ALPHABET_SIZE] - shiftL + ALPHABET_SIZE) % ALPHABET_SIZE;
    sig = refl[sig];
    sig = (lBwd[(sig + shiftL) % ALPHABET_SIZE] - shiftL + ALPHABET_SIZE) % ALPHABET_SIZE;
    sig = (mBwd[(sig + shiftM) % ALPHABET_SIZE] - shiftM + ALPHABET_SIZE) % ALPHABET_SIZE;
    sig = (rBwd[(sig + shiftR) % ALPHABET_SIZE] - shiftR + ALPHABET_SIZE) % ALPHABET_SIZE;
    outPlainIndices[i] = plugMap[sig];
  }
}

/** Convert normalized indices back into an uppercase string preview. */
export function indicesToString(indices: Uint8Array, limit = indices.length): string {
  const len = Math.min(limit, indices.length);
  const chars = new Array<string>(len);
  for (let i = 0; i < len; i++) {
    chars[i] = indexToChar(indices[i]);
  }
  return chars.join('');
}

