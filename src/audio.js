/**
 * ZenMasu: Procedural Web Audio Acoustic Synthesizer
 * Pure Web Audio API synthesis for meditative garden & pearl sounds.
 * Zero external audio files, zero network dependencies, 100% offline.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZenAudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  // Load persisted audio preference
  try {
    const saved = localStorage.getItem('zenmasu_muted');
    if (saved !== null) {
      isMuted = JSON.parse(saved);
    }
  } catch (e) {
    // LocalStorage fallback
  }

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function isAudioMuted() {
    return isMuted;
  }

  function toggleMute() {
    isMuted = !isMuted;
    try {
      localStorage.setItem('zenmasu_muted', JSON.stringify(isMuted));
    } catch (e) {}
    return isMuted;
  }

  function setMuted(val) {
    isMuted = !!val;
    try {
      localStorage.setItem('zenmasu_muted', JSON.stringify(isMuted));
    } catch (e) {}
    return isMuted;
  }

  /**
   * Crisp bamboo tick when placing a loop segment
   */
  function playSegment() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Soft stone click when marking an edge as crossed (X)
   */
  function playCross() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.035);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * Gentle erase tone when clearing an edge
   */
  function playErase() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(130, t + 0.04);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Singing bowl harmonic chime when a pearl constraint is satisfied
   */
  function playPearlSatisfied() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const freqs = [528, 792, 1056]; // Harmonics of 528 Hz (Miracle Tone)

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const amp = 0.12 / (idx + 1);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8 + idx * 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  /**
   * Hint chime: delicate koto pluck
   */
  function playHint() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [440, 660];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.2, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.45);
    });
  }

  /**
   * Temple gong upon puzzle completion
   */
  function playVictory() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gongPartials = [
      { f: 144, a: 0.4, d: 2.8 },
      { f: 288, a: 0.25, d: 2.4 },
      { f: 432, a: 0.2, d: 1.8 },
      { f: 576, a: 0.15, d: 1.4 },
      { f: 864, a: 0.08, d: 1.0 }
    ];

    gongPartials.forEach(p => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, t);

      gain.gain.setValueAtTime(p.a, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + p.d);
    });
  }

  return {
    getAudioContext,
    isAudioMuted,
    toggleMute,
    setMuted,
    playSegment,
    playCross,
    playErase,
    playPearlSatisfied,
    playHint,
    playVictory
  };
}));
