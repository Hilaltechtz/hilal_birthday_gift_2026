/**
 * Pure TypeScript 32 kHz Stereo 16-bit PCM WAV Studio Synthesizer
 * Produces warm, multi-instrument musical compositions (Grand Piano, Chamber Strings,
 * Crystal Celesta, Deep Bass, and Soft Percussion) cleanly inside both browser and Node,
 * with zero external CDN failures, zero CORS restrictions, and full MediaRecorder export support.
 */

import { LicensedLibraryTrack } from '../data/musicLibraryCatalog';

const SAMPLE_RATE = 32000;
const renderedWavCache = new Map<string, string>();

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Mixes an expressive Grand Piano note (fundamental + 3 warm overtones + hammer transient) */
function addPianoNote(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  durSec: number,
  midi: number,
  gain: number,
  pan = 0, // -1 left .. +1 right
) {
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const totalSamples = left.length;
  const ringSec = Math.max(durSec, 1.35);
  const endIdx = Math.min(totalSamples, startIdx + Math.floor(ringSec * SAMPLE_RATE));
  const f = midiToFreq(midi);
  const lGain = gain * (1 - Math.max(0, pan) * 0.35);
  const rGain = gain * (1 - Math.max(0, -pan) * 0.35);

  const w1 = 2 * Math.PI * f;
  const w2 = 2 * Math.PI * f * 2.001;
  const w3 = 2 * Math.PI * f * 3.002;
  const w4 = 2 * Math.PI * f * 4.004;

  for (let i = startIdx; i < endIdx; i++) {
    const dt = (i - startIdx) / SAMPLE_RATE;
    const attack = dt < 0.008 ? dt / 0.008 : 1;
    const gate = dt <= durSec ? 1 : Math.exp(-(dt - durSec) * 6.5);
    const decay = Math.exp(-dt * 2.1);
    const env = attack * decay * gate;
    const brightDecay = Math.exp(-dt * 5.2);

    const tone =
      Math.sin(w1 * dt) * 0.64 +
      Math.sin(w2 * dt) * 0.24 * brightDecay +
      Math.sin(w3 * dt) * 0.09 * brightDecay +
      Math.sin(w4 * dt) * 0.04 * Math.exp(-dt * 9.0);

    const sample = tone * env;
    left[i] += sample * lGain;
    right[i] += sample * rGain;
  }
}

/** Mixes a wide detuned stereo Chamber String pad chord voice */
function addStringNote(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  durSec: number,
  midi: number,
  gain: number,
) {
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const endIdx = Math.min(left.length, startIdx + Math.floor((durSec + 0.55) * SAMPLE_RATE));
  const f = midiToFreq(midi);
  const fL = f * 0.9978;
  const fR = f * 1.0022;

  for (let i = startIdx; i < endIdx; i++) {
    const dt = (i - startIdx) / SAMPLE_RATE;
    const att = Math.min(1, dt / 0.28);
    const rel = dt <= durSec ? 1 : Math.exp(-(dt - durSec) * 3.4);
    const env = att * rel * gain;

    const lWave =
      Math.sin(2 * Math.PI * fL * dt) * 0.6 +
      Math.sin(2 * Math.PI * fL * 2 * dt) * 0.22 +
      Math.sin(2 * Math.PI * fL * 3 * dt) * 0.08;
    const rWave =
      Math.sin(2 * Math.PI * fR * dt) * 0.6 +
      Math.sin(2 * Math.PI * fR * 2 * dt) * 0.22 +
      Math.sin(2 * Math.PI * fR * 3 * dt) * 0.08;

    left[i] += lWave * env;
    right[i] += rWave * env;
  }
}

/** Mixes a sparkling Celesta / Bell chime note */
function addCelestaNote(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  midi: number,
  gain: number,
  pan = 0,
) {
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const endIdx = Math.min(left.length, startIdx + Math.floor(1.4 * SAMPLE_RATE));
  const f = midiToFreq(midi);
  const lG = gain * (1 - Math.max(0, pan) * 0.45);
  const rG = gain * (1 - Math.max(0, -pan) * 0.45);

  for (let i = startIdx; i < endIdx; i++) {
    const dt = (i - startIdx) / SAMPLE_RATE;
    const att = dt < 0.004 ? dt / 0.004 : 1;
    const env = att * Math.exp(-dt * 3.2);
    const sample =
      (Math.sin(2 * Math.PI * f * dt) * 0.72 +
        Math.sin(2 * Math.PI * f * 2 * dt) * 0.22 * Math.exp(-dt * 4) +
        Math.sin(2 * Math.PI * f * 4 * dt) * 0.06 * Math.exp(-dt * 12)) *
      env;
    left[i] += sample * lG;
    right[i] += sample * rG;
  }
}

/** Mixes a warm deep bass voice */
function addBassNote(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  durSec: number,
  midi: number,
  gain: number,
) {
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const endIdx = Math.min(left.length, startIdx + Math.floor((durSec + 0.18) * SAMPLE_RATE));
  const f = midiToFreq(midi);
  for (let i = startIdx; i < endIdx; i++) {
    const dt = (i - startIdx) / SAMPLE_RATE;
    const att = Math.min(1, dt / 0.025);
    const gate = dt <= durSec ? Math.exp(-dt * 0.9) : Math.exp(-(dt - durSec) * 8);
    const tone =
      Math.sin(2 * Math.PI * f * dt) * 0.8 +
      Math.sin(2 * Math.PI * f * 2 * dt) * 0.18 * Math.exp(-dt * 2);
    const s = tone * att * gate * gain;
    left[i] += s;
    right[i] += s;
  }
}

/** Tight percussive kick & delicate hi-hat/rim hits so beat detection detects real musical transients */
function addDrumHit(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  kind: 'kick' | 'rim' | 'hat',
  gain: number,
  seed: number,
) {
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const lenSec = kind === 'kick' ? 0.16 : kind === 'rim' ? 0.08 : 0.045;
  const endIdx = Math.min(left.length, startIdx + Math.floor(lenSec * SAMPLE_RATE));
  let phase = 0;
  let rng = (seed * 9301 + 49297) % 233280;

  for (let i = startIdx; i < endIdx; i++) {
    const dt = (i - startIdx) / SAMPLE_RATE;
    let s = 0;
    if (kind === 'kick') {
      const f = 48 + 95 * Math.exp(-dt * 38);
      phase += (2 * Math.PI * f) / SAMPLE_RATE;
      const env = (dt < 0.003 ? dt / 0.003 : 1) * Math.exp(-dt * 19);
      s = Math.sin(phase) * env * gain;
      left[i] += s;
      right[i] += s;
    } else if (kind === 'rim') {
      rng = (rng * 9301 + 49297) % 233280;
      const noise = (rng / 233280) * 2 - 1;
      const env = Math.exp(-dt * 42);
      s = (Math.sin(2 * Math.PI * 520 * dt) * 0.45 + noise * 0.55) * env * gain;
      left[i] += s * 0.92;
      right[i] += s * 1.05;
    } else {
      rng = (rng * 9301 + 49297) % 233280;
      const noise = (rng / 233280) * 2 - 1;
      const env = Math.exp(-dt * 85);
      s = noise * env * gain;
      left[i] += s * 1.05;
      right[i] += s * 0.85;
    }
  }
}

/** Encodes stereo Float32 PCM buffers into a standard 16-bit PCM WAV Base64 Data URL */
function encodeStereoWavDataUrl(left: Float32Array, right: Float32Array): string {
  const numSamples = left.length;
  const blockAlign = 4; // 2 channels * 2 bytes
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataBytes = numSamples * blockAlign;
  const buf = new Uint8Array(44 + dataBytes);
  const view = new DataView(buf.buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      buf[offset + i] = str.charCodeAt(i);
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 2, true); // Stereo
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // Bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let ptr = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(ptr, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(ptr + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    ptr += 4;
  }

  // Convert Uint8Array cleanly in chunks to base64 (works in Node + Browser)
  if (typeof Buffer !== 'undefined') {
    return `data:audio/wav;base64,${Buffer.from(buf).toString('base64')}`;
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    const slice = buf.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Synthesizes a complete licensed built-in composition from its metadata definition,
 * applies warm stereo delay ambiance + peak normalizing, and caches the resulting WAV Data URL.
 */
export function synthesizeLibraryTrackWavDataUrl(
  track: LicensedLibraryTrack,
): { dataUrl: string; byteLength: number } {
  const cached = renderedWavCache.get(track.id);
  if (cached) {
    return {
      dataUrl: cached,
      byteLength: Math.round((cached.length * 3) / 4),
    };
  }

  const totalSamples = Math.floor(track.durationSeconds * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const beatSec = 60 / track.bpm;
  const beatsPerBar = track.arrangementStyle === 'waltz-romantic' || track.arrangementStyle === 'happy-birthday-classic' ? 3 : 4;
  const barSec = beatSec * beatsPerBar;
  const totalBars = Math.ceil(track.durationSeconds / barSec);

  const majorScale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  const isMinorProg = (offset: number) => offset === 9 || offset === 4 || offset === 2;

  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = bar * barSec;
    if (barStart >= track.durationSeconds - 0.3) break;

    const chordOffset = track.progression[bar % track.progression.length];
    const chordRoot = track.rootMidi + chordOffset;
    const third = chordRoot + (isMinorProg(chordOffset) ? 3 : 4);
    const fifth = chordRoot + 7;
    const ninth = chordRoot + 14;
    const triad = [chordRoot, third, fifth, chordRoot + 12];

    const dynRamp = bar < 2 ? 0.68 + bar * 0.14 : 1.0;

    // 1. Warm Bass Anchor
    if (track.arrangementStyle !== 'solo-piano') {
      addBassNote(left, right, barStart, barSec * 0.92, chordRoot - 12, 0.24 * dynRamp);
      if (beatsPerBar === 4 && (track.arrangementStyle === 'social-pop-beat' || track.arrangementStyle === 'inspirational-pulse')) {
        addBassNote(left, right, barStart + beatSec * 2, beatSec * 1.8, fifth - 12, 0.17 * dynRamp);
      }
    }

    // 2. Lush Strings Pad (bars 1+ for dynamic lift)
    if (
      track.arrangementStyle !== 'solo-piano' &&
      (bar >= 1 || track.arrangementStyle === 'emotional-strings' || track.arrangementStyle === 'cinematic-swell')
    ) {
      const strGain =
        (track.arrangementStyle === 'emotional-strings' || track.arrangementStyle === 'cinematic-swell'
          ? 0.13
          : 0.085) * dynRamp;
      addStringNote(left, right, barStart, barSec * 0.96, chordRoot, strGain);
      addStringNote(left, right, barStart, barSec * 0.96, fifth, strGain * 0.8);
      addStringNote(left, right, barStart, barSec * 0.96, third + 12, strGain * 0.65);
    }

    // 3. Expressive Grand Piano Accompaniment Arpeggios & Chords
    if (beatsPerBar === 3) {
      // Flowing 3/4 Waltz Piano Pattern
      addPianoNote(left, right, barStart, beatSec * 1.1, chordRoot - 12, 0.22 * dynRamp, -0.25);
      addPianoNote(left, right, barStart + beatSec * 0.5, beatSec * 0.7, fifth, 0.14 * dynRamp, -0.1);
      addPianoNote(left, right, barStart + beatSec * 1.0, beatSec * 0.9, third + 12, 0.17 * dynRamp, 0.1);
      addPianoNote(left, right, barStart + beatSec * 2.0, beatSec * 0.9, fifth + 12, 0.15 * dynRamp, 0.25);
    } else {
      // Lush 4/4 Flowing Broken Arpeggio or Rhythmic Comping
      const stepBeats = track.arrangementStyle === 'social-pop-beat' ? 1.0 : 0.5;
      const steps = Math.floor(beatsPerBar / stepBeats);
      for (let s = 0; s < steps; s++) {
        const noteTime = barStart + s * stepBeats * beatSec;
        if (noteTime >= track.durationSeconds - 0.3) break;
        const n = triad[s % triad.length];
        const vel = (s === 0 ? 0.22 : s % 2 === 0 ? 0.16 : 0.12) * dynRamp;
        addPianoNote(left, right, noteTime, stepBeats * beatSec * 1.25, n, vel, ((s % 4) - 1.5) * 0.15);
      }
      if (track.arrangementStyle === 'social-pop-beat') {
        addPianoNote(left, right, barStart, beatSec * 1.5, third + 12, 0.15 * dynRamp, 0.2);
        addPianoNote(left, right, barStart + beatSec * 2, beatSec * 1.5, fifth + 12, 0.15 * dynRamp, -0.2);
      }
    }

    // 4. Sparkling Celesta Accent on Bar Downbeat & Phrase Peaks
    if (track.arrangementStyle !== 'solo-piano' && bar % 2 === 0) {
      addCelestaNote(left, right, barStart, ninth + 12, 0.11 * dynRamp, bar % 4 === 0 ? -0.35 : 0.35);
    }

    // 5. Expressive Top Melody (Skip if custom melody handles it, like Happy Birthday Classic)
    if (!track.customMelodyMidi) {
      const melodicSlots = beatsPerBar === 3 ? [0, 1.5, 2.0] : [0, 1.0, 2.5, 3.0];
      melodicSlots.forEach((bOff, mIdx) => {
        const t = barStart + bOff * beatSec;
        if (t >= track.durationSeconds - 0.5) return;
        const scaleIdx = (bar * 3 + mIdx * 2 + track.seedOffset) % majorScale.length;
        const melMidi = track.rootMidi + 12 + majorScale[scaleIdx];
        addPianoNote(left, right, t, beatSec * 1.2, melMidi, 0.2 * dynRamp, 0.15);
        if (mIdx === 0 && (track.arrangementStyle === 'cinematic-swell' || track.arrangementStyle === 'luxury-soiree')) {
          addCelestaNote(left, right, t, melMidi + 12, 0.09 * dynRamp, 0.3);
        }
      });
    }

    // 6. Musical Percussion Hits (for Happy Birthday, Friendship, Inspirational, Luxury, Social Beats)
    if (track.hasPercussion) {
      for (let b = 0; b < beatsPerBar; b++) {
        const t = barStart + b * beatSec;
        if (t >= track.durationSeconds - 0.3) break;
        if (b === 0 || (beatsPerBar === 4 && b === 2 && track.arrangementStyle === 'social-pop-beat')) {
          addDrumHit(left, right, t, 'kick', track.arrangementStyle === 'social-pop-beat' ? 0.36 : 0.24, bar * 17 + b);
        }
        if ((beatsPerBar === 4 && (b === 1 || b === 3)) || (beatsPerBar === 3 && b === 2)) {
          addDrumHit(left, right, t, 'rim', 0.11 * dynRamp, bar * 31 + b);
        }
        addDrumHit(left, right, t + beatSec * 0.5, 'hat', 0.055 * dynRamp, bar * 13 + b);
      }
    }
  }

  // Optional Authentic Melody Track (e.g. Traditional Public Domain "Happy Birthday to You")
  if (track.customMelodyMidi && track.customMelodyBeats) {
    let cursorBeat = 0;
    const totalNotes = track.customMelodyMidi.length;
    while (cursorBeat * beatSec < track.durationSeconds - 1.0) {
      for (let i = 0; i < totalNotes; i++) {
        const noteTime = cursorBeat * beatSec;
        if (noteTime >= track.durationSeconds - 0.5) break;
        const durBeats = track.customMelodyBeats[i];
        const midi = track.customMelodyMidi[i];
        addPianoNote(left, right, noteTime, durBeats * beatSec * 0.92, midi, 0.28, 0.12);
        addCelestaNote(left, right, noteTime, midi + 12, 0.12, -0.2);
        cursorBeat += durBeats;
      }
    }
  }

  // Apply gentle stereo hall delay reflection (cross-channel 55ms & 95ms) + smooth 1.4s fade-out
  const delay1 = Math.floor(0.058 * SAMPLE_RATE);
  const delay2 = Math.floor(0.097 * SAMPLE_RATE);
  for (let i = delay2; i < totalSamples; i++) {
    const lDry = left[i];
    const rDry = right[i];
    left[i] = lDry + right[i - delay1] * 0.18 + left[i - delay2] * 0.1;
    right[i] = rDry + left[i - delay1] * 0.18 + right[i - delay2] * 0.1;
  }

  // Smooth fade in (0.15s) + fade out (1.4s) + headroom normalization to 0.88 peak
  const fadeInSamples = Math.min(totalSamples, Math.floor(0.15 * SAMPLE_RATE));
  const fadeOutSamples = Math.min(totalSamples, Math.floor(1.4 * SAMPLE_RATE));
  for (let i = 0; i < fadeInSamples; i++) {
    const m = i / Math.max(1, fadeInSamples);
    left[i] *= m;
    right[i] *= m;
  }
  for (let i = 0; i < fadeOutSamples; i++) {
    const idx = totalSamples - 1 - i;
    const m = i / Math.max(1, fadeOutSamples);
    left[idx] *= m;
    right[idx] *= m;
  }

  let peak = 0.001;
  for (let i = 0; i < totalSamples; i++) {
    const al = Math.abs(left[i]);
    const ar = Math.abs(right[i]);
    if (al > peak) peak = al;
    if (ar > peak) peak = ar;
  }
  const norm = 0.88 / peak;
  for (let i = 0; i < totalSamples; i++) {
    left[i] *= norm;
    right[i] *= norm;
  }

  const dataUrl = encodeStereoWavDataUrl(left, right);
  renderedWavCache.set(track.id, dataUrl);
  return {
    dataUrl,
    byteLength: Math.round((dataUrl.length * 3) / 4),
  };
}
