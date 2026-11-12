import {
  ALPHABET_SIZE,
  formatPositionLabel,
  indexToChar,
  normalizeAsciiLetters,
  TOTAL_ROTOR_POSITIONS,
} from '../core/constants';
import {
  buildBombeMenu,
  createBombeWorkspace,
  evaluatePositionOnBombe,
} from '../core/bombe';
import {
  buildPlugboardMap,
  decryptIndicesFast,
  indicesToString,
} from '../core/enigma';
import { scoreIndicesFast, textToIndices } from '../core/statistics';
import type {
  BombeStop,
  BombeSweepRequest,
  CiphertextAttackRequest,
  StatisticalCandidate,
  WorkerRequest,
  WorkerResponse,
} from '../types';

interface WorkerGlobalLike {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const workerScope = self as unknown as WorkerGlobalLike;
const cancelledRequestIds = new Set<string>();

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function sendResponse(msg: WorkerResponse): void {
  workerScope.postMessage(msg);
}

async function handleBombeSweep(req: BombeSweepRequest): Promise<void> {
  const startMs = performance.now();
  const cipher = normalizeAsciiLetters(req.ciphertext);
  const crib = normalizeAsciiLetters(req.crib);
  const menu = buildBombeMenu(cipher, crib, req.offset);

  if (!menu.isValidAlignment || menu.edges.length === 0) {
    sendResponse({
      type: 'ERROR',
      requestId: req.requestId,
      error: 'Invalid crib alignment: self-encryption collision detected or empty crib.',
    });
    return;
  }

  const ws = createBombeWorkspace(menu);
  const cipherIndices = textToIndices(cipher);
  const plainBuffer = new Uint8Array(cipherIndices.length);
  const countsScratch = new Int32Array(ALPHABET_SIZE);
  const maxStops = req.maxStops ?? 25;
  const stops: BombeStop[] = [];
  const candidatePos: [number, number, number] = [0, 0, 0];

  let tested = 0;
  const CHUNK_SIZE = 512;

  for (let l = 0; l < ALPHABET_SIZE; l++) {
    candidatePos[0] = l;
    for (let m = 0; m < ALPHABET_SIZE; m++) {
      candidatePos[1] = m;
      for (let r = 0; r < ALPHABET_SIZE; r++) {
        if (cancelledRequestIds.has(req.requestId)) {
          cancelledRequestIds.delete(req.requestId);
          return;
        }

        candidatePos[2] = r;
        const { hypotheses, deducedPlugboards } = evaluatePositionOnBombe(
          ws,
          menu.testRegisterIdx,
          req.rotors,
          req.reflector,
          req.ringSettings,
          candidatePos
        );

        if (hypotheses.length > 0) {
          // Score each consistent Steckerbrett branch and retain the statistically strongest plaintext.
          let bestIdx = 0;
          let bestStats = { ioc: 0, zScore: 0, chiSquared: Infinity, decibans: -Infinity };
          let bestPreview = '';

          for (let hIdx = 0; hIdx < hypotheses.length; hIdx++) {
            const plugMap = buildPlugboardMap(deducedPlugboards[hIdx]);
            decryptIndicesFast(
              cipherIndices,
              req.rotors,
              req.reflector,
              req.ringSettings,
              plugMap,
              candidatePos,
              plainBuffer
            );
            const stats = scoreIndicesFast(plainBuffer, req.targetLanguage, countsScratch);
            if (stats.decibans > bestStats.decibans) {
              bestStats = stats;
              bestIdx = hIdx;
              bestPreview = indicesToString(plainBuffer, 72);
            }
          }

          const posCopy: [number, number, number] = [l, m, r];
          stops.push({
            positions: posCopy,
            positionLabel: formatPositionLabel(posCopy),
            rotors: req.rotors,
            reflector: req.reflector,
            consistentHypotheses: hypotheses.map((idx) => indexToChar(idx)),
            deducedPlugboard: deducedPlugboards[bestIdx],
            decryptedPreview: bestPreview,
            ioc: bestStats.ioc,
            chiSquared: bestStats.chiSquared,
            decibans: bestStats.decibans,
            zScore: bestStats.zScore,
          });
        }

        tested++;
        if (tested % CHUNK_SIZE === 0) {
          sendResponse({
            type: 'PROGRESS',
            requestId: req.requestId,
            tested,
            total: TOTAL_ROTOR_POSITIONS,
            elapsedMs: performance.now() - startMs,
          });
          await yieldToEventLoop();
        }
      }
    }
  }

  // Rank surviving Bombe Stops by Bayesian Deciban evidence (then lowest Chi-Squared).
  stops.sort((a, b) => b.decibans - a.decibans || a.chiSquared - b.chiSquared);

  sendResponse({
    type: 'BOMBE_COMPLETE',
    requestId: req.requestId,
    tested,
    total: TOTAL_ROTOR_POSITIONS,
    elapsedMs: performance.now() - startMs,
    stops: stops.slice(0, maxStops),
  });
}

async function handleCiphertextAttack(req: CiphertextAttackRequest): Promise<void> {
  const startMs = performance.now();
  const cipherIndices = textToIndices(req.ciphertext);
  if (cipherIndices.length < 4) {
    sendResponse({
      type: 'ERROR',
      requestId: req.requestId,
      error: 'Ciphertext must contain at least 4 alphabetic characters.',
    });
    return;
  }

  const plugMap = buildPlugboardMap(req.plugboard);
  const plainBuffer = new Uint8Array(cipherIndices.length);
  const countsScratch = new Int32Array(ALPHABET_SIZE);
  const topK = req.topK ?? 15;
  const topCandidates: StatisticalCandidate[] = [];
  const candidatePos: [number, number, number] = [0, 0, 0];

  const fitnessOf = (stats: {
    ioc: number;
    chiSquared: number;
    decibans: number;
  }): number => {
    if (req.rankBy === 'IOC') return stats.ioc;
    if (req.rankBy === 'CHI_SQUARED') return -stats.chiSquared;
    return stats.decibans;
  };

  let minTopScore = -Infinity;
  let tested = 0;
  const CHUNK_SIZE = 512;

  for (let l = 0; l < ALPHABET_SIZE; l++) {
    candidatePos[0] = l;
    for (let m = 0; m < ALPHABET_SIZE; m++) {
      candidatePos[1] = m;
      for (let r = 0; r < ALPHABET_SIZE; r++) {
        if (cancelledRequestIds.has(req.requestId)) {
          cancelledRequestIds.delete(req.requestId);
          return;
        }

        candidatePos[2] = r;
        decryptIndicesFast(
          cipherIndices,
          req.rotors,
          req.reflector,
          req.ringSettings,
          plugMap,
          candidatePos,
          plainBuffer
        );

        const stats = scoreIndicesFast(plainBuffer, req.targetLanguage, countsScratch);
        const fit = fitnessOf(stats);

        if (topCandidates.length < topK || fit > minTopScore) {
          const posCopy: [number, number, number] = [l, m, r];
          topCandidates.push({
            positions: posCopy,
            positionLabel: formatPositionLabel(posCopy),
            rotors: req.rotors,
            reflector: req.reflector,
            ioc: stats.ioc,
            zScore: stats.zScore,
            chiSquared: stats.chiSquared,
            decibans: stats.decibans,
            decryptedPreview: indicesToString(plainBuffer, 72),
          });
          topCandidates.sort((a, b) => fitnessOf(b) - fitnessOf(a));
          if (topCandidates.length > topK) {
            topCandidates.pop();
          }
          if (topCandidates.length === topK) {
            minTopScore = fitnessOf(topCandidates[topCandidates.length - 1]);
          }
        }

        tested++;
        if (tested % CHUNK_SIZE === 0) {
          sendResponse({
            type: 'PROGRESS',
            requestId: req.requestId,
            tested,
            total: TOTAL_ROTOR_POSITIONS,
            elapsedMs: performance.now() - startMs,
          });
          await yieldToEventLoop();
        }
      }
    }
  }

  sendResponse({
    type: 'ATTACK_COMPLETE',
    requestId: req.requestId,
    tested,
    total: TOTAL_ROTOR_POSITIONS,
    elapsedMs: performance.now() - startMs,
    candidates: topCandidates,
  });
}

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.type === 'CANCEL') {
    cancelledRequestIds.add(req.requestId);
    return;
  }

  const run =
    req.type === 'BOMBE_SWEEP'
      ? handleBombeSweep(req)
      : handleCiphertextAttack(req);

  run.catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unexpected worker error';
    sendResponse({
      type: 'ERROR',
      requestId: req.requestId,
      error: message,
    });
  });
};

