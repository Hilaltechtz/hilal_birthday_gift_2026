/**
 * Audio Analysis & Built-in Celebratory Soundtrack Synthesizer
 * Decodes uploaded MP3/audio files to extract duration & estimate tempo (BPM)
 * for synchronized photo transitions, and synthesizes a celebratory celesta/harp
 * score when no custom MP3 is provided.
 */

import { MusicBeatMarker } from '../types';

export interface AnalyzedAudioResult {
  durationSeconds: number;
  bpm: number;
  waveformPeaks: number[];
  detectedBeats: MusicBeatMarker[];
}

export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return await response.arrayBuffer();
}

export async function analyzeUploadedMusic(
  dataUrl: string,
  sensitivity = 0.65,
): Promise<AnalyzedAudioResult> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const buffer = await dataUrlToArrayBuffer(dataUrl);
    const audioBuffer = await ctx.decodeAudioData(buffer);
    const durationSeconds = audioBuffer.duration || 30;
    const { bpm, waveformPeaks, detectedBeats } = extractAudioFeatures(
      audioBuffer,
      sensitivity,
    );
    void ctx.close();
    return { durationSeconds, bpm, waveformPeaks, detectedBeats };
  } catch {
    return {
      durationSeconds: 30,
      bpm: 96,
      waveformPeaks: Array.from({ length: 160 }, (_, i) =>
        0.28 + 0.35 * Math.abs(Math.sin(i * 0.25)),
      ),
      detectedBeats: [],
    };
  }
}

export async function inspectAudioFile(
  dataUrl: string,
): Promise<AnalyzedAudioResult> {
  return analyzeUploadedMusic(dataUrl, 0.65);
}

/**
 * Computes normalized amplitude waveform, transient energy peaks (beats),
 * and approximate tempo (BPM) directly from decoded PCM samples.
 */
function extractAudioFeatures(
  audioBuffer: AudioBuffer,
  sensitivity = 0.65,
): {
  bpm: number;
  waveformPeaks: number[];
  detectedBeats: MusicBeatMarker[];
} {
  try {
    const sampleRate = audioBuffer.sampleRate || 44100;
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
    const totalSamples = ch0.length;

    // 1. Extract 240 normalized amplitude peaks across the entire track for waveform rendering
    const bucketCount = 240;
    const samplesPerBucket = Math.max(1, Math.floor(totalSamples / bucketCount));
    const rawPeaks: number[] = [];
    let globalMaxPeak = 0.0001;

    for (let b = 0; b < bucketCount; b++) {
      const start = b * samplesPerBucket;
      const end = Math.min(totalSamples, start + samplesPerBucket);
      const stride = Math.max(1, Math.floor((end - start) / 48));
      let peak = 0;
      for (let i = start; i < end; i += stride) {
        const s = ch1 ? (Math.abs(ch0[i]) + Math.abs(ch1[i])) * 0.5 : Math.abs(ch0[i]);
        if (s > peak) peak = s;
      }
      if (peak > globalMaxPeak) globalMaxPeak = peak;
      rawPeaks.push(peak);
    }
    const waveformPeaks = rawPeaks.map((p) =>
      Math.max(0.06, Math.min(1, Number((p / globalMaxPeak).toFixed(3)))),
    );

    // 2. Analyze 25ms energy + positive spectral/amplitude flux frames across track (up to 180s)
    const frameSec = 0.025;
    const frameSamples = Math.max(256, Math.floor(sampleRate * frameSec));
    const maxSamples = Math.min(totalSamples, Math.floor(sampleRate * 180));
    const frameCount = Math.floor(maxSamples / frameSamples);

    if (frameCount < 16) {
      return { bpm: 96, waveformPeaks, detectedBeats: [] };
    }

    const energies = new Float32Array(frameCount);
    const onsets = new Float32Array(frameCount);

    for (let f = 0; f < frameCount; f++) {
      const start = f * frameSamples;
      let sumSq = 0;
      const stride = 4;
      let count = 0;
      for (let j = 0; j < frameSamples; j += stride) {
        const s = ch0[start + j];
        sumSq += s * s;
        count++;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, count));
      energies[f] = rms;
      onsets[f] = f > 0 ? Math.max(0, rms - energies[f - 1]) : rms;
    }

    // Local moving average (~0.75s window = 30 frames) to isolate musical beats regardless of loudness shifts
    const halfWin = 15;
    const minInterBeatFrames = 11; // ~275ms debounce (~218 BPM max)
    const thresholdMult = 1.65 - Math.max(0.3, Math.min(1.0, sensitivity)) * 0.45; // ~1.20 .. 1.51

    const candidateBeats: { frame: number; prominence: number }[] = [];
    let lastBeatFrame = -minInterBeatFrames;

    for (let f = 2; f < frameCount - 2; f++) {
      let winSum = 0;
      let winCount = 0;
      const wStart = Math.max(0, f - halfWin);
      const wEnd = Math.min(frameCount - 1, f + halfWin);
      for (let k = wStart; k <= wEnd; k++) {
        winSum += energies[k];
        winCount++;
      }
      const localAvg = winSum / Math.max(1, winCount);
      const score = energies[f] + onsets[f] * 0.85;
      const threshold = Math.max(0.015, localAvg * thresholdMult);

      const isLocalPeak =
        score > threshold &&
        energies[f] >= energies[f - 1] &&
        energies[f] >= energies[f + 1];

      if (isLocalPeak && f - lastBeatFrame >= minInterBeatFrames) {
        const prominence = score / Math.max(0.01, localAvg);
        candidateBeats.push({ frame: f, prominence });
        lastBeatFrame = f;
      }
    }

    // 3. Estimate tempo (BPM) from median inter-beat intervals
    let bpm = 96;
    if (candidateBeats.length >= 4) {
      const intervals: number[] = [];
      for (let i = 1; i < candidateBeats.length; i++) {
        const dt = (candidateBeats[i].frame - candidateBeats[i - 1].frame) * frameSec;
        if (dt >= 0.25 && dt <= 1.6) {
          intervals.push(dt);
        }
      }
      if (intervals.length >= 3) {
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)] || 0.625;
        let est = Math.round(60 / medianInterval);
        while (est < 72) est *= 2;
        while (est > 156) est = Math.round(est / 2);
        bpm = est;
      }
    }

    // 4. Normalize detected beat strengths cleanly to [0.25 .. 1.0]
    let maxProm = 1.5;
    for (const c of candidateBeats) {
      if (c.prominence > maxProm) maxProm = c.prominence;
    }

    const detectedBeats: MusicBeatMarker[] = candidateBeats.map((c, idx) => {
      const norm = (c.prominence - 1.1) / Math.max(0.4, maxProm - 1.1);
      const strength = Math.max(0.25, Math.min(1, Number((0.25 + norm * 0.75).toFixed(2))));
      return {
        id: `auto-beat-${idx}-${Math.round(c.frame * frameSec * 1000)}`,
        timeSec: Number((c.frame * frameSec).toFixed(3)),
        strength,
        isManual: false,
      };
    });

    return { bpm, waveformPeaks, detectedBeats };
  } catch {
    return {
      bpm: 96,
      waveformPeaks: Array.from({ length: 160 }, () => 0.35),
      detectedBeats: [],
    };
  }
}

// Celebratory pentatonic + major-7th chime frequencies (Hz)
const MELODY_NOTES = [
  261.63, 329.63, 392.0, 493.88, 523.25, 493.88, 392.0, 329.63,
  293.66, 349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 349.23,
  392.0, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88,
  261.63, 329.63, 392.0, 523.25, 659.25, 523.25, 392.0, 329.63,
];

/**
 * Schedules a gentle built-in celebratory harp/celesta melody into a Web Audio GainNode
 * across [0, durationSeconds] for preview or export when no custom MP3 is provided.
 */
export function scheduleBuiltInSoundtrack(
  audioCtx: BaseAudioContext,
  destination: AudioNode,
  startAtTime: number,
  durationSeconds: number,
  volume: number,
): { stop: () => void } {
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.0001, startAtTime);
  master.gain.linearRampToValueAtTime(volume * 0.34, startAtTime + 0.8);
  master.gain.setValueAtTime(
    volume * 0.34,
    Math.max(startAtTime + 0.9, startAtTime + durationSeconds - 1.6),
  );
  master.gain.linearRampToValueAtTime(0.0001, startAtTime + durationSeconds);
  master.connect(destination);

  const oscs: OscillatorNode[] = [];
  const step = 0.55;
  const totalNotes = Math.ceil(durationSeconds / step);

  for (let i = 0; i < totalNotes; i++) {
    const noteTime = startAtTime + i * step;
    if (noteTime >= startAtTime + durationSeconds) break;
    const freq = MELODY_NOTES[i % MELODY_NOTES.length];

    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const overEnv = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, noteTime);

    overEnv.gain.setValueAtTime(0.14, noteTime);

    env.gain.setValueAtTime(0.0001, noteTime);
    env.gain.exponentialRampToValueAtTime(0.32, noteTime + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.6);

    osc.connect(env);
    osc2.connect(overEnv);
    overEnv.connect(env);
    env.connect(master);

    osc.start(noteTime);
    osc2.start(noteTime);
    osc.stop(noteTime + 1.65);
    osc2.stop(noteTime + 1.65);
    oscs.push(osc, osc2);
  }

  return {
    stop: () => {
      oscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // Already stopped
        }
      });
      try {
        master.disconnect();
      } catch {
        // Ignore
      }
    },
  };
}

/**
 * Schedules crystalline page-flip date ticks (day 1 .. birthdayDay) and a warm
 * celebratory reveal chord during the Calendar Introduction scene.
 */
export function scheduleCalendarCueSounds(
  audioCtx: BaseAudioContext,
  destination: AudioNode,
  playbackStartAudioTime: number,
  playbackOffsetSec: number,
  calendarStartSec: number,
  calendarDurationSec: number,
  birthdayDay: number,
  volume = 0.55,
): { stop: () => void } {
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(Math.max(0.05, Math.min(1, volume)) * 0.28, playbackStartAudioTime);
  master.connect(destination);

  const oscs: OscillatorNode[] = [];
  const countStartSec = calendarStartSec + calendarDurationSec * 0.22;
  const countSpanSec = calendarDurationSec * 0.42;
  const targetDay = Math.max(1, Math.min(31, Math.round(birthdayDay)));

  // Thin ultra-dense ticks gently if birthdayDay > 20 while preserving start & final tick
  const stride = targetDay > 20 ? 2 : 1;
  const scheduledDays: number[] = [];
  for (let d = 1; d <= targetDay; d += stride) {
    scheduledDays.push(d);
  }
  if (scheduledDays[scheduledDays.length - 1] !== targetDay) {
    scheduledDays.push(targetDay);
  }

  for (const d of scheduledDays) {
    const frac = targetDay === 1 ? 0.5 : (d - 1) / targetDay;
    const movieTime = countStartSec + frac * countSpanSec;
    if (movieTime < playbackOffsetSec - 0.02) continue;

    const when = playbackStartAudioTime + Math.max(0.01, movieTime - playbackOffsetSec);
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();

    // Gently ascending crystalline pitch toward the birthday date
    const pitch = 740 + (d / targetDay) * 420;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, when);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.12, when + 0.045);

    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.24, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);

    osc.connect(env);
    env.connect(master);
    osc.start(when);
    osc.stop(when + 0.11);
    oscs.push(osc);
  }

  // Radiant golden reveal arpeggio chord when reaching birthdayDay
  const revealMovieTime = calendarStartSec + calendarDurationSec * 0.645;
  if (revealMovieTime >= playbackOffsetSec - 0.05) {
    const revealWhen =
      playbackStartAudioTime + Math.max(0.01, revealMovieTime - playbackOffsetSec);
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const noteWhen = revealWhen + idx * 0.065;
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteWhen);

      env.gain.setValueAtTime(0.0001, noteWhen);
      env.gain.exponentialRampToValueAtTime(0.3, noteWhen + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, noteWhen + 1.15);

      osc.connect(env);
      env.connect(master);
      osc.start(noteWhen);
      osc.stop(noteWhen + 1.2);
      oscs.push(osc);
    });
  }

  return {
    stop: () => {
      oscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // Already stopped
        }
      });
      try {
        master.disconnect();
      } catch {
        // Ignore
      }
    },
  };
}

