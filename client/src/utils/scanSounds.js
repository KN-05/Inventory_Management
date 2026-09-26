// src/utils/scanSounds.js
// PHASE 32: audible feedback for barcode scanning - louder single beep on
// a successful match, and a distinct lower double-buzz when a scanned
// code doesn't match any product. Synthesized via Web Audio API so no
// audio file needs to be bundled/loaded.

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return new AudioContextClass();
}

function tone(ctx, frequency, startTime, duration, volume) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// Single high, loud beep - matches the sound of a real handheld scanner
// on a successful read.
export function playSuccessBeep() {
  try {
    const ctx = getAudioContext();
    tone(ctx, 1500, ctx.currentTime, 0.15, 0.5);
    setTimeout(() => ctx.close(), 300);
  } catch {
    // Web Audio unsupported - skip sound, scanning still works.
  }
}

// Two short low buzzes - clearly different from the success beep, for
// "scanned something, but no matching product was found".
export function playErrorBeep() {
  try {
    const ctx = getAudioContext();
    tone(ctx, 300, ctx.currentTime, 0.15, 0.5);
    tone(ctx, 300, ctx.currentTime + 0.2, 0.15, 0.5);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Web Audio unsupported - skip sound, scanning still works.
  }
}
