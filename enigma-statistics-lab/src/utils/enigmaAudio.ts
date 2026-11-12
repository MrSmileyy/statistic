/**
 * Pure Web Audio API tactile sound synthesizer simulating Enigma mechanical key switches,
 * pawl stepping ratchets, plugboard jack snaps, and mission completion chimes.
 */
class EnigmaAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private fireSnap(ctx: AudioContext, delaySec: number, freqHz: number, gainPeak: number): void {
    const start = ctx.currentTime + delaySec;

    // Metallic ratchet click transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqHz, start);
    osc.frequency.exponentialRampToValueAtTime(95, start + 0.045);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.055);
  }

  playKeyPress(doubleStepped = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      // Heavy bakelite switch down + right rotor ratchet
      this.fireSnap(ctx, 0, 520, 0.12);
      this.fireSnap(ctx, 0.018, 1180, 0.07);
      if (doubleStepped) {
        // Distinct double pawl clack when middle + left rotors step simultaneously
        this.fireSnap(ctx, 0.048, 860, 0.11);
      }
    } catch {
      // Ignore audio scheduling errors in restricted browser environments.
    }
  }

  playRotorTick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      this.fireSnap(ctx, 0, 1450, 0.06);
    } catch {
      // Ignore
    }
  }

  playPlugJack(pluggedIn: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      this.fireSnap(ctx, 0, pluggedIn ? 780 : 420, 0.09);
    } catch {
      // Ignore
    }
  }

  playMissionSuccess(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const notes = [329.63, 415.3, 493.88, 659.25];
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch {
      // Ignore
    }
  }
}

export const enigmaAudio = new EnigmaAudioEngine();

