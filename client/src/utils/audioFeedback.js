/**
 * audioFeedback.js
 * Browser-native Web Audio API synthesizer for tactile micro-interactions.
 * Produces crisp, satisfying, low-latency audio chimes with 0 external sound files.
 */

class SoundFeedbackEngine {
  constructor() {
    this.ctx = null;
    this.enabled = typeof window !== 'undefined' ? localStorage.getItem('docdiff_sound_enabled') !== 'false' : true;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('docdiff_sound_enabled', String(this.enabled));
    }
    if (this.enabled) {
      this.playAccept();
    }
    return this.enabled;
  }

  isSoundEnabled() {
    return this.enabled;
  }

  /**
   * Crisp, pleasing upward chime for "Accept"
   */
  playAccept() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // 520Hz (C5) -> 880Hz (A5)
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      osc2.frequency.setValueAtTime(650, now);
      osc2.frequency.exponentialRampToValueAtTime(1040, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } catch (e) {
      // Audio autoplay policies or device mute
    }
  }

  /**
   * Gentle, soft muted wooden pop for "Reject"
   */
  playReject() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // 360Hz -> 180Hz rapid pitch drop
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.09);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      // Audio autoplay policies
    }
  }

  /**
   * Subtle soft click for change jumping / navigation
   */
  playTick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  /**
   * Harmonic celebratory chord when 100% of revisions are resolved
   */
  playCelebration() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major chord C5-E5-G5-C6
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.06, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + idx * 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + 0.6 + idx * 0.06);
      });
    } catch (e) {}
  }
}

export const soundEffects = new SoundFeedbackEngine();
