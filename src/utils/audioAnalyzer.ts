/**
 * Audio Analysis & Built-in Celebratory Soundtrack Synthesizer
 * Decodes uploaded MP3/audio files to extract duration & estimate tempo (BPM)
 * for synchronized photo transitions, and synthesizes a celebratory celesta/harp
 * score when no custom MP3 is provided.
 */

export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return await response.arrayBuffer();
}

export async function inspectAudioFile(
  dataUrl: string,
): Promise<{ durationSeconds: number; bpm: number }> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const buffer = await dataUrlToArrayBuffer(dataUrl);
    const audioBuffer = await ctx.decodeAudioData(buffer);
    const durationSeconds = audioBuffer.duration || 30;
    const bpm = estimateTempoFromBuffer(audioBuffer);
    void ctx.close();
    return { durationSeconds, bpm };
  } catch {
    return { durationSeconds: 30, bpm: 96 };
  }
}

function estimateTempoFromBuffer(audioBuffer: AudioBuffer): number {
  try {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const windowSize = Math.floor(sampleRate * 0.04); // 40ms energy windows
    const maxSamples = Math.min(channelData.length, sampleRate * 25); // analyze up to 25s
    const energies: number[] = [];

    for (let i = 0; i < maxSamples - windowSize; i += windowSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j += 4) {
        const s = channelData[i + j];
        sum += s * s;
      }
      energies.push(sum / (windowSize / 4));
    }

    if (energies.length < 16) return 96;

    // Count significant onset peaks
    const avg = energies.reduce((a, b) => a + b, 0) / energies.length;
    const threshold = avg * 1.45;
    const peakIndices: number[] = [];

    for (let i = 1; i < energies.length - 1; i++) {
      if (
        energies[i] > threshold &&
        energies[i] > energies[i - 1] &&
        energies[i] >= energies[i + 1]
      ) {
        if (
          peakIndices.length === 0 ||
          i - peakIndices[peakIndices.length - 1] >= 6
        ) {
          peakIndices.push(i);
        }
      }
    }

    if (peakIndices.length < 4) return 96;

    const intervals: number[] = [];
    for (let i = 1; i < peakIndices.length; i++) {
      intervals.push((peakIndices[i] - peakIndices[i - 1]) * 0.04);
    }

    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)] || 0.625;
    let bpm = Math.round(60 / medianInterval);
    while (bpm < 72) bpm *= 2;
    while (bpm > 152) bpm = Math.round(bpm / 2);
    return bpm;
  } catch {
    return 96;
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
