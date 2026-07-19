// Synthesized "bell" notification sound (Web Audio API) used to alert bar staff
// of new orders. No external audio file is used, so there are no licensing concerns.

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/**
 * Registers a one-time listener on the first user interaction (click/touch/key)
 * to resume/create the AudioContext. Browsers block audio playback until a user
 * gesture happens, so this silently "unlocks" sound as soon as staff interacts
 * with the page in any way, without needing a dedicated button.
 */
export function setupAudioUnlock() {
  if (typeof window === 'undefined' || unlocked) return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    unlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/**
 * Plays a short reception-bell-like "ding" (two overlapping tones with a quick decay).
 */
export function playDing() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);

  // Two tones (a fifth apart) give a classic "bell/ding" timbre.
  const freqs = [1318.5, 1975.5]; // E6, B6
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 1);
  });
}
