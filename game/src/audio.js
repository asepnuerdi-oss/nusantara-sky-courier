// Nusantara Sky Courier — synthesized sound, no audio files.
// One file, one job: engine hum, wind, and event tones from WebAudio only.
export function createAudio() {
  const audio = { ctx: null, engine: null, engineGain: null, windGain: null, muted: false, started: false };

  function ensure() {
    if (audio.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio.ctx = new Ctx();
      audio.engine = audio.ctx.createOscillator();
      audio.engine.type = 'sawtooth';
      audio.engine.frequency.value = 70;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engine.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.ctx.destination);
      audio.engine.start();
      audio.started = true;
    } catch (error) {
      audio.started = false;
    }
  }

  function tone(freq, duration, type = 'sine', volume = 0.12) {
    if (!audio.ctx || audio.muted) return;
    try {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audio.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audio.ctx.destination);
      osc.start();
      osc.stop(audio.ctx.currentTime + duration);
    } catch (error) {
      // Sound is decoration; a failure never stops the game.
    }
  }

  return {
    ensure,
    update(throttle, speed, flying) {
      if (!audio.ctx || audio.muted) return;
      try {
        if (audio.ctx.state === 'suspended') void audio.ctx.resume();
        const target = flying ? 0.035 + throttle * 0.05 + speed * 0.0004 : 0;
        audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
        audio.engine.frequency.setTargetAtTime(58 + throttle * 95 + speed * 0.7, audio.ctx.currentTime, 0.1);
      } catch (error) {
        // Ignore audio errors.
      }
    },
    ring() { tone(880, 0.18, 'sine', 0.14); setTimeout(() => tone(1318, 0.22, 'sine', 0.12), 90); },
    land() { tone(523, 0.16, 'triangle', 0.14); setTimeout(() => tone(784, 0.3, 'triangle', 0.12), 110); },
    crash() { tone(110, 0.5, 'sawtooth', 0.16); setTimeout(() => tone(55, 0.7, 'square', 0.1), 80); },
    warn() { tone(220, 0.12, 'square', 0.06); },
    toggleMute() {
      audio.muted = !audio.muted;
      if (audio.engineGain) audio.engineGain.gain.value = 0;
      return audio.muted;
    },
  };
}
