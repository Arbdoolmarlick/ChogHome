export class PixelAudio {
  ctx: AudioContext | null = null;
  enabled: boolean = false;
  masterVol: number = 0.7;
  sfxVol: number = 0.8;
  musicVol: number = 0.5;
  ducking: boolean = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  effectiveGain(base = 0.045) {
    const duckMult = this.ducking ? 0.35 : 1;
    return base * this.masterVol * this.sfxVol * duckMult;
  }

  tone(freq = 480, dur = 0.07, type: OscillatorType = 'square', vol = 0.045) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(this.effectiveGain(vol), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch {
      // AudioContext could be blocked by autoplay policies
    }
  }

  step(surface = 'stone') {
    const baseFreq = surface === 'grass' ? 140 : 210;
    this.tone(baseFreq + Math.random() * 35, 0.022, 'triangle', 0.022);
  }

  emotePop() {
    this.tone(540, 0.04, 'sine', 0.04);
    setTimeout(() => this.tone(760, 0.06, 'triangle', 0.045), 35);
  }

  jump() {
    this.tone(320, 0.05, 'square');
    setTimeout(() => this.tone(480, 0.07, 'square'), 45);
    setTimeout(() => this.tone(640, 0.09, 'square'), 90);
  }

  doorCreak() {
    [280, 350, 440, 580].forEach((f, i) => setTimeout(() => this.tone(f, 0.08, 'triangle', 0.05), i * 65));
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.1, 'square'), i * 80));
  }

  lose() {
    [320, 260, 190].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'sawtooth'), i * 95));
  }
}

export const sfx = new PixelAudio();
