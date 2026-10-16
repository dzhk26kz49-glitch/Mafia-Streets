// Mafia Streets - Cinematic Sound & Atmosphere Engine (المؤثرات الصوتية والموسيقى السينمائية)
// Uses Web Audio API for zero-lag, offline-ready procedural synthesis with rich acoustic textures

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMusicPlaying: boolean = false;
  private musicGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private musicVolume: number = 0.25;
  private sfxVolume: number = 0.75;
  private isMuted: boolean = false;
  private musicIntervalId: any = null;
  private musicOscillators: OscillatorNode[] = [];
  private vinylNoiseNode: AudioNode | null = null;
  private listeners: Set<(isPlaying: boolean, volume: number, isMuted: boolean) => void> = new Set();

  constructor() {
    // Restore preferences
    if (typeof window !== 'undefined') {
      const savedMusic = localStorage.getItem('mafia_bg_music_active');
      const savedVolume = localStorage.getItem('mafia_bg_music_volume');
      const savedMute = localStorage.getItem('mafia_audio_muted');

      if (savedVolume !== null) {
        this.musicVolume = Math.max(0, Math.min(1, parseFloat(savedVolume)));
      }
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }

      // Autoplay if previously enabled on first user gesture
      if (savedMusic === 'true' && !this.isMuted) {
        const unlockAudio = () => {
          this.initContext();
          this.startBackgroundMusic();
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribe(listener: (isPlaying: boolean, volume: number, isMuted: boolean) => void) {
    this.listeners.add(listener);
    listener(this.isMusicPlaying, this.musicVolume, this.isMuted);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.isMusicPlaying, this.musicVolume, this.isMuted));
  }

  public getStatus() {
    return {
      isPlaying: this.isMusicPlaying,
      volume: this.musicVolume,
      isMuted: this.isMuted
    };
  }

  public setVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('mafia_bg_music_volume', this.musicVolume.toString());
    if (this.musicGainNode && this.ctx && !this.isMuted) {
      this.musicGainNode.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('mafia_audio_muted', this.isMuted.toString());

    if (this.ctx) {
      if (this.musicGainNode) {
        this.musicGainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.musicVolume, this.ctx.currentTime, 0.05);
      }
      if (this.sfxGainNode) {
        this.sfxGainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime, 0.05);
      }
    }

    if (!this.isMuted && !this.isMusicPlaying) {
      this.startBackgroundMusic();
    }

    this.notify();
    return this.isMuted;
  }

  // ==========================================
  // 1. MAFIA NOIR LO-FI BACKGROUND MUSIC
  // ==========================================
  public toggleBackgroundMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopBackgroundMusic();
      return false;
    } else {
      this.startBackgroundMusic();
      return true;
    }
  }

  public startBackgroundMusic() {
    const ctx = this.initContext();
    if (!ctx) return;

    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    localStorage.setItem('mafia_bg_music_active', 'true');

    // Master Music Gain Node
    this.musicGainNode = ctx.createGain();
    this.musicGainNode.gain.setValueAtTime(0, ctx.currentTime);
    this.musicGainNode.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.musicVolume, ctx.currentTime + 1.8);
    this.musicGainNode.connect(ctx.destination);

    // Filter to give that mellow, warm vintage Lo-Fi sound
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.setValueAtTime(1100, ctx.currentTime);
    masterFilter.Q.setValueAtTime(1.2, ctx.currentTime);
    masterFilter.connect(this.musicGainNode);

    // Warm Vinyl Crackle & Ambient Tape Dust
    this.startVinylNoise(ctx, masterFilter);

    // Start Procedural Lo-Fi Noir Progression Loop
    this.startLoFiChordsLoop(ctx, masterFilter);

    this.notify();
  }

  private startVinylNoise(ctx: AudioContext, destination: AudioNode) {
    try {
      const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter approximation
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];

        // Random vinyl crackle pop clicks
        if (Math.random() < 0.0018) {
          data[i] += (Math.random() > 0.5 ? 0.35 : -0.35);
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1400;
      noiseFilter.Q.value = 0.8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.035; // subtle crackle bed

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(destination);

      noiseSource.start();
      this.vinylNoiseNode = noiseSource;
    } catch (e) {
      console.warn('Vinyl noise fallback:', e);
    }
  }

  private startLoFiChordsLoop(ctx: AudioContext, destination: AudioNode) {
    // Cinematic D Minor Noir Progression: Dm9 -> Bbmaj7 -> Gm9 -> A7alt
    const chords = [
      // D minor 9 (D3, F3, A3, C4, E4)
      [146.83, 174.61, 220.00, 261.63, 329.63],
      // Bb major 7 (Bb2, D3, F3, A3, D4)
      [116.54, 146.83, 174.61, 220.00, 293.66],
      // G minor 9 (G2, Bb2, D3, F3, A3)
      [98.00, 116.54, 146.83, 174.61, 220.00],
      // A7b9 (A2, C#3, E3, G3, Bb3)
      [110.00, 138.59, 164.81, 196.00, 233.08]
    ];

    let chordIndex = 0;
    const stepDuration = 4.2; // 4.2 seconds per chord (slow tempo ~57 BPM)

    const playChordStep = () => {
      if (!this.isMusicPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;
      const chord = chords[chordIndex % chords.length];
      chordIndex++;

      // Play soft synth pad notes for this chord
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        // Slight detune for warm analog chorus effect
        osc.type = idx === 0 ? 'sine' : (idx % 2 === 0 ? 'triangle' : 'sawtooth');
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, t);

        // Envelope: soft slow attack, warm sustain, gentle release
        const noteVol = idx === 0 ? 0.16 : 0.055; // Root bass slightly firmer
        oscGain.gain.setValueAtTime(0.001, t);
        oscGain.gain.linearRampToValueAtTime(noteVol, t + 1.2);
        oscGain.gain.setTargetAtTime(noteVol * 0.7, t + 1.5, 1.0);
        oscGain.gain.linearRampToValueAtTime(0.001, t + stepDuration);

        osc.connect(oscGain);
        oscGain.connect(destination);

        osc.start(t);
        osc.stop(t + stepDuration + 0.1);

        this.musicOscillators.push(osc);
      });

      // Add soft Lo-Fi brushed drum tick / sub thump on beats
      this.playSubLoFiBeat(ctx, destination, t);
      this.playSubLoFiBeat(ctx, destination, t + stepDuration * 0.5);

      // Schedule next chord in progression
      this.musicIntervalId = setTimeout(playChordStep, (stepDuration - 0.1) * 1000);
    };

    playChordStep();
  }

  private playSubLoFiBeat(ctx: AudioContext, destination: AudioNode, time: number) {
    try {
      // Soft muffled lo-fi kick / sub-thump
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.frequency.setValueAtTime(95, time);
      kickOsc.frequency.exponentialRampToValueAtTime(35, time + 0.18);

      kickGain.gain.setValueAtTime(0.12, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      kickOsc.connect(kickGain);
      kickGain.connect(destination);
      kickOsc.start(time);
      kickOsc.stop(time + 0.25);

      // Subtle soft brushed snare tick
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const tick = ctx.createBufferSource();
      tick.buffer = buffer;
      const tickFilter = ctx.createBiquadFilter();
      tickFilter.type = 'highpass';
      tickFilter.frequency.value = 3500;
      const tickGain = ctx.createGain();
      tickGain.gain.value = 0.02;

      tick.connect(tickFilter);
      tickFilter.connect(tickGain);
      tickGain.connect(destination);
      tick.start(time + 0.02);
    } catch (e) {
      // Ignore background drum errors
    }
  }

  public stopBackgroundMusic() {
    if (!this.isMusicPlaying) return;
    this.isMusicPlaying = false;
    localStorage.setItem('mafia_bg_music_active', 'false');

    if (this.musicIntervalId) {
      clearTimeout(this.musicIntervalId);
      this.musicIntervalId = null;
    }

    if (this.ctx && this.musicGainNode) {
      // Gentle fade-out
      this.musicGainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        try {
          this.musicOscillators.forEach(osc => {
            try { osc.stop(); } catch (_) {}
          });
          this.musicOscillators = [];
          if (this.vinylNoiseNode) {
            try { (this.vinylNoiseNode as any).stop(); } catch (_) {}
            this.vinylNoiseNode = null;
          }
        } catch (_) {}
      }, 900);
    }

    this.notify();
  }

  // =========================================================================
  // 2. REALISTIC SOUND EFFECTS (SFX)
  // =========================================================================

  /**
   * صوت عدّ النقود (Cash Counting & Banknote Flutter + Register Chime)
   * Realistic rapid paper banknote counting machine flutter + satisfying register chime
   */
  public playCashSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const countTicks = 7; // 7 crisp bill flips
      const tickInterval = 0.045; // 45ms per bill flip

      for (let i = 0; i < countTicks; i++) {
        const tickTime = now + (i * tickInterval);

        // Filtered white noise burst for paper friction
        const bufferSize = Math.floor(ctx.sampleRate * 0.035);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.35));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200 + (i * 120), tickTime);
        filter.Q.setValueAtTime(3.5, tickTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, tickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.035);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start(tickTime);
        source.stop(tickTime + 0.04);
      }

      // Satisfying cash register / Swiss vault bell chime at the end
      const chimeTime = now + (countTicks * tickInterval) + 0.04;
      const chimeFreqs = [1760, 2637]; // High A6 + E7 bell harmonics

      chimeFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, chimeTime);

        gain.gain.setValueAtTime(idx === 0 ? 0.22 : 0.12, chimeTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(chimeTime);
        osc.stop(chimeTime + 0.7);
      });
    } catch (e) {
      console.warn('Cash sound error:', e);
    }
  }

  /**
   * صوت سارينة الشرطة (Police Siren Wail & Yelp)
   * Authentic dual-tone Doppler frequency sweep wail with emergency echo
   */
  public playPoliceSirenSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const sirenDuration = 2.4; // 2.4 seconds emergency wail

      // Dual oscillator for rich police vehicle horn/siren tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const sirenGain = ctx.createGain();
      const distortion = ctx.createWaveShaper();
      const sirenFilter = ctx.createBiquadFilter();

      // Bandpass to mimic megaphone police speaker horn
      sirenFilter.type = 'bandpass';
      sirenFilter.frequency.setValueAtTime(1100, now);
      sirenFilter.Q.setValueAtTime(2.2, now);

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      // Realistic Yelp/Wail frequency modulation curve
      const sweepCycles = 3;
      const cycleDuration = sirenDuration / sweepCycles;

      for (let c = 0; c < sweepCycles; c++) {
        const start = now + (c * cycleDuration);
        const mid = start + (cycleDuration * 0.48);
        const end = start + cycleDuration;

        // Sweep from 680Hz up to 1350Hz and back down
        osc1.frequency.setValueAtTime(680, start);
        osc1.frequency.linearRampToValueAtTime(1350, mid);
        osc1.frequency.linearRampToValueAtTime(680, end);

        // Slight harmonic detune for second horn
        osc2.frequency.setValueAtTime(686, start);
        osc2.frequency.linearRampToValueAtTime(1362, mid);
        osc2.frequency.linearRampToValueAtTime(686, end);
      }

      // Envelope
      sirenGain.gain.setValueAtTime(0.01, now);
      sirenGain.gain.linearRampToValueAtTime(0.24, now + 0.15);
      sirenGain.gain.setValueAtTime(0.24, now + sirenDuration - 0.35);
      sirenGain.gain.linearRampToValueAtTime(0.001, now + sirenDuration);

      osc1.connect(sirenFilter);
      osc2.connect(sirenFilter);
      sirenFilter.connect(sirenGain);
      sirenGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + sirenDuration + 0.05);
      osc2.stop(now + sirenDuration + 0.05);
    } catch (e) {
      console.warn('Police siren sound error:', e);
    }
  }

  /**
   * صوت صفقات السوق السوداء (Black Market Contraband Deal Sound)
   * Heavy metallic briefcase latch snap + clandestine low sub rumble and contraband clink
   */
  public playBlackMarketDealSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy Metal Briefcase Latch Snap (dual mechanical clicks)
      [0, 0.08].forEach((offset, idx) => {
        const t = now + offset;
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();

        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(idx === 0 ? 1850 : 2400, t);
        clickOsc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

        clickGain.gain.setValueAtTime(0.25, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);

        clickOsc.start(t);
        clickOsc.stop(t + 0.04);
      });

      // 2. Heavy Lock Thud (low metallic suitcase closure)
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(140, now + 0.08);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

      thudGain.gain.setValueAtTime(0.3, now + 0.08);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(now + 0.08);
      thudOsc.stop(now + 0.35);

      // 3. Dark Underworld Clandestine Resonance & Gold Ring
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(880, now + 0.12); // A5 metallic clink
      bellOsc.frequency.exponentialRampToValueAtTime(659.25, now + 0.45); // slides to E5

      bellGain.gain.setValueAtTime(0.18, now + 0.12);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      bellOsc.connect(bellGain);
      bellGain.connect(ctx.destination);
      bellOsc.start(now + 0.12);
      bellOsc.stop(now + 0.9);
    } catch (e) {
      console.warn('Black market sound error:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
