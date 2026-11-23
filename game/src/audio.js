// audio.js — all sound is synthesised with WebAudio: no audio files, no network.
// A tiny synth voice kit (blips, noise bursts, a two-tone siren, an engine hum and a
// laid-back bass-and-keys music loop) behind one createAudio() object the game calls.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = 0;
  let musicTimer = 0;
  let musicStep = 0;
  let muted = false;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch { ctx = null; }
    return !!ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1800;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t);
  }

  // The music loop: a sun-soaked minor groove, one scheduled step at a time.
  const BASS = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 73.4, 0, 82.4, 0];
  const KEYS = [220, 261.6, 329.6, 261.6, 196, 246.9, 293.7, 246.9];

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    click() { tone(660, 0.06, 'square', 0.08); },
    pickup() { tone(880, 0.09, 'sine', 0.16, 1320); },
    cash() { tone(1180, 0.07, 'triangle', 0.16); setTimeout(() => tone(1560, 0.1, 'triangle', 0.14), 55); },
    hurt() { tone(140, 0.16, 'sawtooth', 0.2, 70); },
    gunshot(auto) { noise(auto ? 0.07 : 0.12, 0.32, 2400); tone(160, 0.08, 'square', 0.1, 60); },
    shotgun() { noise(0.24, 0.42, 1200); tone(110, 0.16, 'square', 0.14, 45); },
    punch() { noise(0.06, 0.2, 700); },
    explosion() { noise(0.6, 0.5, 500); tone(70, 0.5, 'sine', 0.4, 32); },
    carDoor() { tone(190, 0.07, 'square', 0.12, 120); },
    carHorn() { tone(370, 0.22, 'square', 0.1); tone(466, 0.22, 'square', 0.08); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.16), i * 90)); },
    missionFail() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.14), i * 110)); },
    busted() { [330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.24, 'sawtooth', 0.1), i * 140)); },

    /** Engine hum follows the driven car's speed; pass 0 when on foot. */
    setEngine(speedRatio) {
      if (!ensure()) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 420;
        engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(master);
        engineOsc.start();
      }
      const target = muted ? 0 : Math.min(0.09, Math.abs(speedRatio) * 0.09);
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedRatio) * 130, ctx.currentTime, 0.08);
    },

    /** Called every frame: drives the police siren and the music loop. */
    update(dt, sirenOn) {
      if (!ctx || muted) return;
      if (sirenOn) {
        sirenTimer -= dt;
        if (sirenTimer <= 0) { tone(720, 0.28, 'triangle', 0.045); setTimeout(() => tone(960, 0.28, 'triangle', 0.045), 240); sirenTimer = 0.55; }
      }
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 0.21;
        const bass = BASS[musicStep % BASS.length];
        if (bass) tone(bass, 0.2, 'triangle', 0.11);
        if (musicStep % 2 === 0) { const key = KEYS[(musicStep / 2) % KEYS.length]; tone(key, 0.3, 'sine', 0.035); }
        musicStep += 1;
      }
    },
  };
}
