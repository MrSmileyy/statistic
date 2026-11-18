import {
  ALPHABET,
  ALPHABET_SIZE,
  charToIndex,
  indexToChar,
  normalizeAsciiLetters,
  ROTORS,
} from './constants';
import { EnigmaM3, stepRotorPositions } from './enigma';
import type {
  BombeHypothesisTrace,
  BombeMenu,
  CribAlignment,
  MenuCycle,
  MenuEdge,
  MenuNode,
  PlugPair,
  ReflectorId,
  RotorId,
} from '../types';

/**
 * Slide a plaintext crib along the ciphertext and enforce Enigma's reflector invariant
 * P(C_i = P_i) = 0. Any offset with at least one self-encrypted letter is mathematically impossible.
 */
export function findValidCribAlignments(
  rawCiphertext: string,
  rawCrib: string
): CribAlignment[] {
  const cipher = normalizeAsciiLetters(rawCiphertext);
  const crib = normalizeAsciiLetters(rawCrib);
  if (crib.length === 0 || crib.length > cipher.length) return [];

  const alignments: CribAlignment[] = [];
  const maxOffset = cipher.length - crib.length;

  for (let offset = 0; offset <= maxOffset; offset++) {
    const collisions: number[] = [];
    const cipherSlice = cipher.slice(offset, offset + crib.length);

    for (let j = 0; j < crib.length; j++) {
      if (cipherSlice[j] === crib[j]) {
        collisions.push(j);
      }
    }

    alignments.push({
      offset,
      cipherSlice,
      crib,
      isValid: collisions.length === 0,
      collisionIndices: collisions,
    });
  }

  return alignments;
}

/**
 * Build the Turing-Welchman Bombe Menu graph for a given crib alignment, extract elementary
 * cycles (closures), and select the optimal Test Register (highest degree, preferably in a cycle).
 */
export function buildBombeMenu(
  rawCiphertext: string,
  rawCrib: string,
  offset: number
): BombeMenu {
  const cipher = normalizeAsciiLetters(rawCiphertext);
  const crib = normalizeAsciiLetters(rawCrib);
  const cipherSlice = cipher.slice(offset, offset + crib.length);

  if (crib.length === 0 || offset < 0 || offset + crib.length > cipher.length) {
    return {
      crib,
      offset,
      cipherSlice: '',
      nodes: [],
      edges: [],
      cycles: [],
      testRegister: 'A',
      testRegisterIdx: 0,
      isValidAlignment: false,
    };
  }

  const edges: MenuEdge[] = [];
  const adj = Array.from({ length: ALPHABET_SIZE }, () => [] as { toIdx: number; edgeId: number }[]);
  const degree = new Int32Array(ALPHABET_SIZE);
  const activeMask = new Int32Array(ALPHABET_SIZE);
  let valid = true;

  for (let i = 0; i < crib.length; i++) {
    const pChar = crib[i];
    const cChar = cipherSlice[i];
    if (pChar === cChar) {
      valid = false;
    }
    const u = charToIndex(pChar);
    const v = charToIndex(cChar);
    const edgeId = edges.length;

    edges.push({
      id: edgeId,
      from: pChar,
      to: cChar,
      fromIdx: u,
      toIdx: v,
      cribIndex: i,
      messageIndex: offset + i,
    });

    adj[u].push({ toIdx: v, edgeId });
    adj[v].push({ toIdx: u, edgeId });
    degree[u]++;
    degree[v]++;
    activeMask[u] = 1;
    activeMask[v] = 1;
  }

  // Detect 2-cycles (parallel edges between the same letter pair) and elementary cycles up to length 8.
  const cycles: MenuCycle[] = [];
  const cycleSignatures = new Set<string>();
  const nodesInCycle = new Set<number>();

  // First check parallel 2-cycles between pairs (u < v).
  for (let u = 0; u < ALPHABET_SIZE; u++) {
    if (degree[u] < 2) continue;
    for (let i = 0; i < adj[u].length; i++) {
      for (let j = i + 1; j < adj[u].length; j++) {
        if (adj[u][i].toIdx === adj[u][j].toIdx) {
          const v = adj[u][i].toIdx;
          const edgeIds = [adj[u][i].edgeId, adj[u][j].edgeId].sort((a, b) => a - b);
          const sig = edgeIds.join(',');
          if (!cycleSignatures.has(sig)) {
            cycleSignatures.add(sig);
            cycles.push({
              nodes: [ALPHABET[u], ALPHABET[v]],
              edgeIds,
              length: 2,
            });
            nodesInCycle.add(u);
            nodesInCycle.add(v);
          }
        }
      }
    }
  }

  // Bounded DFS for simple loops of length 3..8.
  const MAX_CYCLES = 20;
  const MAX_DEPTH = 8;

  for (let start = 0; start < ALPHABET_SIZE && cycles.length < MAX_CYCLES; start++) {
    if (degree[start] < 2) continue;

    const pathNodes: number[] = [start];
    const pathEdges: number[] = [];
    const visitedNodes = new Set<number>([start]);

    const dfs = (curr: number) => {
      if (cycles.length >= MAX_CYCLES) return;
      for (const { toIdx, edgeId } of adj[curr]) {
        if (toIdx === start && pathEdges.length >= 2) {
          const sortedEdges = [...pathEdges, edgeId].sort((a, b) => a - b);
          const sig = sortedEdges.join(',');
          if (!cycleSignatures.has(sig)) {
            cycleSignatures.add(sig);
            cycles.push({
              nodes: pathNodes.map((n) => ALPHABET[n]),
              edgeIds: sortedEdges,
              length: sortedEdges.length,
            });
            for (const nodeIdx of pathNodes) {
              nodesInCycle.add(nodeIdx);
            }
          }
          continue;
        }

        if (
          toIdx > start &&
          !visitedNodes.has(toIdx) &&
          pathNodes.length < MAX_DEPTH
        ) {
          visitedNodes.add(toIdx);
          pathNodes.push(toIdx);
          pathEdges.push(edgeId);
          dfs(toIdx);
          pathEdges.pop();
          pathNodes.pop();
          visitedNodes.delete(toIdx);
        }
      }
    };

    dfs(start);
  }

  const nodes: MenuNode[] = [];
  let bestRegisterIdx = edges.length > 0 ? edges[0].fromIdx : 0;
  let bestScore = -1;

  for (let i = 0; i < ALPHABET_SIZE; i++) {
    if (!activeMask[i]) continue;
    const inCycle = nodesInCycle.has(i);
    nodes.push({
      char: ALPHABET[i],
      index: i,
      degree: degree[i],
      inCycle,
    });

    const score = degree[i] * 10 + (inCycle ? 5 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestRegisterIdx = i;
    }
  }

  nodes.sort((a, b) => b.degree - a.degree || a.index - b.index);

  return {
    crib,
    offset,
    cipherSlice,
    nodes,
    edges,
    cycles,
    testRegister: ALPHABET[bestRegisterIdx],
    testRegisterIdx: bestRegisterIdx,
    isValidAlignment: valid,
  };
}

/** Extract clean PlugPair[] entries from a steady-state 26-letter bitmask Diagonal Board. */
export function extractDeducedPlugboard(boardMask: Int32Array | number[]): PlugPair[] {
  const pairs: PlugPair[] = [];
  for (let x = 0; x < ALPHABET_SIZE; x++) {
    const mask = boardMask[x];
    // Must have exactly one bit set to represent an unambiguous deduced partner.
    if (mask === 0 || (mask & (mask - 1)) !== 0) continue;
    const y = Math.clz32(mask) ^ 31; // Trailing zero / bit index for single-bit 32-bit int
    if (x < y) {
      pairs.push([indexToChar(x), indexToChar(y)]);
    }
  }
  return pairs;
}

/**
 * Reusable preallocated workspace for 17,576-position Diagonal Board sweeps.
 * Keeping fixed-size typed arrays eliminates GC churn inside the Web Worker loop.
 */
export interface BombeSweepWorkspace {
  scramblers: Int32Array; // menu.edges.length * 26
  board: Int32Array; // 26 bitmasks
  queueU: Int32Array; // 676
  queueP: Int32Array; // 676
  edgeHead: Int32Array; // 26
  edgeTo: Int32Array; // menu.edges.length * 2
  edgeSlot: Int32Array; // menu.edges.length * 2 (which scrambler slot corresponds to each edge)
  edgeNext: Int32Array; // menu.edges.length * 2
  cribLen: number;
  offset: number;
}

/** Compile a BombeMenu into compact linked adjacency arrays + scratch buffers for fast sweeps. */
export function createBombeWorkspace(menu: BombeMenu): BombeSweepWorkspace {
  const edgeCount = menu.edges.length;
  const edgeHead = new Int32Array(ALPHABET_SIZE).fill(-1);
  const edgeTo = new Int32Array(edgeCount * 2);
  const edgeSlot = new Int32Array(edgeCount * 2);
  const edgeNext = new Int32Array(edgeCount * 2);

  let ptr = 0;
  for (let e = 0; e < edgeCount; e++) {
    const { fromIdx, toIdx } = menu.edges[e];

    edgeTo[ptr] = toIdx;
    edgeSlot[ptr] = e;
    edgeNext[ptr] = edgeHead[fromIdx];
    edgeHead[fromIdx] = ptr++;

    edgeTo[ptr] = fromIdx;
    edgeSlot[ptr] = e;
    edgeNext[ptr] = edgeHead[toIdx];
    edgeHead[toIdx] = ptr++;
  }

  return {
    scramblers: new Int32Array(Math.max(1, edgeCount) * ALPHABET_SIZE),
    board: new Int32Array(ALPHABET_SIZE),
    queueU: new Int32Array(ALPHABET_SIZE * ALPHABET_SIZE),
    queueP: new Int32Array(ALPHABET_SIZE * ALPHABET_SIZE),
    edgeHead,
    edgeTo,
    edgeSlot,
    edgeNext,
    cribLen: menu.crib.length,
    offset: menu.offset,
  };
}

/**
 * Populate scrambler permutations for all menu edges starting from candidate ground setting
 * `positions` (state before character 0 of the ciphertext), stepping faithfully up to `offset + cribLen`.
 */
function populateMenuScramblers(
  ws: BombeSweepWorkspace,
  rotors: readonly [RotorId, RotorId, RotorId],
  reflector: ReflectorId,
  ringSettings: readonly [number, number, number],
  positions: readonly [number, number, number]
): void {
  let [posL, posM, posR] = positions;
  const notchM = ROTORS[rotors[1]].notchIndex;
  const notchR = ROTORS[rotors[2]].notchIndex;

  // Step through ciphertext prefix before the crib begins.
  for (let s = 0; s < ws.offset; s++) {
    const midAtNotch = posM === notchM;
    const rightAtNotch = posR === notchR;
    if (midAtNotch) {
      posL = (posL + 1) % ALPHABET_SIZE;
      posM = (posM + 1) % ALPHABET_SIZE;
    } else if (rightAtNotch) {
      posM = (posM + 1) % ALPHABET_SIZE;
    }
    posR = (posR + 1) % ALPHABET_SIZE;
  }

  // Step across each crib character and store the 26-entry involution.
  const stepBuf: [number, number, number] = [posL, posM, posR];
  for (let k = 0; k < ws.cribLen; k++) {
    const { next } = stepRotorPositions(rotors, stepBuf);
    stepBuf[0] = next[0];
    stepBuf[1] = next[1];
    stepBuf[2] = next[2];
    EnigmaM3.computeScramblerPermutation(
      rotors,
      reflector,
      ringSettings,
      stepBuf,
      ws.scramblers,
      k * ALPHABET_SIZE
    );
  }
}

/**
 * Evaluate all 26 test-register hypotheses for one candidate ground setting using Welchman's
 * Diagonal Board connected-component equivalence optimization:
 * Because scramblers are involutions and the Diagonal Board is symmetric, any two hypotheses (T, H)
 * lying in the same connected component of the implied equivalence graph must fail or survive together.
 */
export function evaluatePositionOnBombe(
  ws: BombeSweepWorkspace,
  testRegisterIdx: number,
  rotors: readonly [RotorId, RotorId, RotorId],
  reflector: ReflectorId,
  ringSettings: readonly [number, number, number],
  positions: readonly [number, number, number]
): { hypotheses: number[]; deducedPlugboards: PlugPair[][] } {
  populateMenuScramblers(ws, rotors, reflector, ringSettings, positions);

  const hypotheses: number[] = [];
  const deducedPlugboards: PlugPair[][] = [];
  let testedMask = 0;

  const { board, queueU, queueP, edgeHead, edgeTo, edgeSlot, edgeNext, scramblers } = ws;

  for (let h = 0; h < ALPHABET_SIZE; h++) {
    if ((testedMask & (1 << h)) !== 0) continue;

    board.fill(0);
    let qHead = 0;
    let qTail = 0;
    let contradicted = false;

    const enqueue = (u: number, p: number) => {
      const bit = 1 << p;
      const prev = board[u];
      if ((prev & bit) === 0) {
        if (prev !== 0) {
          contradicted = true;
        }
        board[u] = prev | bit;
        queueU[qTail] = u;
        queueP[qTail] = p;
        qTail++;
      }
    };

    // Energize hypothesis S(T) = h and its Diagonal Board twin S(h) = T.
    enqueue(testRegisterIdx, h);
    enqueue(h, testRegisterIdx);

    while (qHead < qTail && !contradicted) {
      const u = queueU[qHead];
      const p = queueP[qHead];
      qHead++;

      for (let arc = edgeHead[u]; arc !== -1; arc = edgeNext[arc]) {
        const v = edgeTo[arc];
        const q = scramblers[edgeSlot[arc] * ALPHABET_SIZE + p];
        enqueue(v, q);
        enqueue(q, v); // Diagonal Board symmetry
        if (contradicted) break;
      }
    }

    // Any partner bits reached on testRegister belong to this exact connected component.
    testedMask |= board[testRegisterIdx];

    if (!contradicted) {
      hypotheses.push(h);
      deducedPlugboards.push(extractDeducedPlugboard(board));
    }
  }

  return { hypotheses, deducedPlugboards };
}

/**
 * Full diagnostic trace across all 26 hypotheses at a single rotor position for interactive UI inspection
 * of energized wires on the Welchman Diagonal Board.
 */
export function inspectBombeHypotheses(
  menu: BombeMenu,
  rotors: readonly [RotorId, RotorId, RotorId],
  reflector: ReflectorId,
  ringSettings: readonly [number, number, number],
  positions: readonly [number, number, number],
  customRegisterIdx: number = menu.testRegisterIdx
): BombeHypothesisTrace[] {
  const ws = createBombeWorkspace(menu);
  populateMenuScramblers(ws, rotors, reflector, ringSettings, positions);

  const { board, queueU, queueP, edgeHead, edgeTo, edgeSlot, edgeNext, scramblers } = ws;
  const traces: BombeHypothesisTrace[] = [];
  const regIdx =
    customRegisterIdx >= 0 && customRegisterIdx < ALPHABET_SIZE
      ? customRegisterIdx
      : menu.testRegisterIdx;

  for (let h = 0; h < ALPHABET_SIZE; h++) {
    board.fill(0);
    let qHead = 0;
    let qTail = 0;

    const enqueue = (u: number, p: number) => {
      const bit = 1 << p;
      if ((board[u] & bit) === 0) {
        board[u] |= bit;
        queueU[qTail] = u;
        queueP[qTail] = p;
        qTail++;
      }
    };

    enqueue(regIdx, h);
    enqueue(h, regIdx);

    while (qHead < qTail) {
      const u = queueU[qHead];
      const p = queueP[qHead];
      qHead++;

      for (let arc = edgeHead[u]; arc !== -1; arc = edgeNext[arc]) {
        const v = edgeTo[arc];
        const q = scramblers[edgeSlot[arc] * ALPHABET_SIZE + p];
        enqueue(v, q);
        enqueue(q, v);
      }
    }

    const contradictedNodes: string[] = [];
    for (let x = 0; x < ALPHABET_SIZE; x++) {
      const mask = board[x];
      if (mask !== 0 && (mask & (mask - 1)) !== 0) {
        contradictedNodes.push(ALPHABET[x]);
      }
    }

    traces.push({
      assumedPartner: ALPHABET[h],
      assumedPartnerIdx: h,
      consistent: contradictedNodes.length === 0,
      propagatedSteps: qTail,
      contradictedNodes,
      boardMask: Array.from(board),
      deducedPairs:
        contradictedNodes.length === 0 ? extractDeducedPlugboard(board) : [],
    });
  }

  return traces;
}

