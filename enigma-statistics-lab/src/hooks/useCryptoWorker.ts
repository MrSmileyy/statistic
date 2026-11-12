import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerRequest, WorkerResponse } from '../types';

interface WorkerProgressState {
  running: boolean;
  tested: number;
  total: number;
  elapsedMs: number;
  error: string | null;
}

/**
 * React hook managing a dedicated Web Worker instance for heavy 17,576-position
 * Bombe and statistical ciphertext-only sweeps without freezing the main UI thread.
 */
export function useCryptoWorker(onComplete: (response: WorkerResponse) => void) {
  const workerRef = useRef<Worker | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [state, setState] = useState<WorkerProgressState>({
    running: false,
    tested: 0,
    total: 17576,
    elapsedMs: 0,
    error: null,
  });

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/cryptoAnalysis.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (msg.requestId !== activeRequestIdRef.current) return;

      if (msg.type === 'PROGRESS') {
        setState((prev) => ({
          ...prev,
          running: true,
          tested: msg.tested ?? prev.tested,
          total: msg.total ?? prev.total,
          elapsedMs: msg.elapsedMs ?? prev.elapsedMs,
        }));
      } else if (msg.type === 'BOMBE_COMPLETE' || msg.type === 'ATTACK_COMPLETE') {
        setState({
          running: false,
          tested: msg.tested ?? 17576,
          total: msg.total ?? 17576,
          elapsedMs: msg.elapsedMs ?? 0,
          error: null,
        });
        onCompleteRef.current(msg);
      } else if (msg.type === 'ERROR') {
        setState((prev) => ({
          ...prev,
          running: false,
          error: msg.error ?? 'Worker execution failed',
        }));
      }
    };

    worker.onerror = (err) => {
      setState((prev) => ({
        ...prev,
        running: false,
        error: err.message || 'Web Worker crashed unexpectedly',
      }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const startJob = useCallback((payloadBuilder: (requestId: string) => WorkerRequest) => {
    const worker = workerRef.current;
    if (!worker) return;

    if (activeRequestIdRef.current) {
      worker.postMessage({ type: 'CANCEL', requestId: activeRequestIdRef.current });
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeRequestIdRef.current = requestId;
    setState({ running: true, tested: 0, total: 17576, elapsedMs: 0, error: null });
    worker.postMessage(payloadBuilder(requestId));
  }, []);

  const cancelJob = useCallback(() => {
    const worker = workerRef.current;
    const reqId = activeRequestIdRef.current;
    if (worker && reqId) {
      worker.postMessage({ type: 'CANCEL', requestId: reqId });
      activeRequestIdRef.current = null;
      setState((prev) => ({ ...prev, running: false }));
    }
  }, []);

  return { ...state, startJob, cancelJob };
}

