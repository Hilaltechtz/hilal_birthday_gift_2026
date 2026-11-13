import {
  DEFAULT_BEAT_SYNC_CONFIG,
  DEFAULT_SENDER_INTRO_ANIMATION,
  DEFAULT_SENDER_NAME_ANIMATION,
  DEFAULT_SPECIAL_MESSAGE_ANIMATION,
  DEFAULT_WISH_ANIMATION_PRESETS,
  MusicBeatMarker,
  resolveVideoScenes,
  StudioProjectConfig,
  TextAnimationConfig,
} from '../types';

export interface ScheduledTextSegment {
  id: string;
  label: string;
  text: string;
  startSec: number;
  endSec: number;
  config: TextAnimationConfig;
  snappedBeatTimeSec: number | null;
}

export interface BeatSyncSchedule {
  videoBeats: MusicBeatMarker[];
  wishSegments: ScheduledTextSegment[];
  specialSegment: ScheduledTextSegment;
  senderIntroSegment: ScheduledTextSegment;
  senderNameSegment: ScheduledTextSegment;
}

/**
 * Extracts active musical beat markers mapped cleanly onto the video timeline [0 .. durationSeconds].
 * Combines analyzed MP3 beats (shifted by startOffsetSeconds + loop wrap), manual edits,
 * user-added markers, or fallback tempo beats when using the built-in harp score.
 */
export function resolveVideoTimelineBeats(
  config: StudioProjectConfig,
): MusicBeatMarker[] {
  const duration = Math.max(1, config.durationSeconds);
  const beatSync = config.beatSync || DEFAULT_BEAT_SYNC_CONFIG;
  const removed = new Set(beatSync.removedDetectedBeatIds || []);
  const edited = beatSync.editedDetectedBeats || {};
  const result: MusicBeatMarker[] = [];

  if (config.music?.detectedBeats && config.music.detectedBeats.length > 0) {
    const trackDur = Math.max(1, config.music.durationSeconds || 30);
    const offset = Math.max(0, config.music.startOffsetSeconds || 0);

    // Collect beats across enough track loops to fill [0 .. duration]
    const loopCount = Math.ceil((offset + duration) / trackDur) + 1;
    for (let loopIdx = 0; loopIdx < loopCount; loopIdx++) {
      for (const b of config.music.detectedBeats) {
        if (removed.has(b.id)) continue;
        const baseTrackT = edited[b.id] !== undefined ? edited[b.id] : b.timeSec;
        const movieT = loopIdx * trackDur + baseTrackT - offset;
        if (movieT >= 0 && movieT <= duration) {
          result.push({
            id: loopIdx === 0 ? b.id : `${b.id}-loop${loopIdx}`,
            timeSec: Number(movieT.toFixed(3)),
            strength: b.strength,
            isManual: false,
            label: b.label,
          });
        }
      }
    }
  } else {
    // Built-in harp score clean musical beat grid (~96 BPM -> 0.625s beat, strong every 2 bars = 1.25s)
    const bpm = config.music?.bpm || 96;
    const beatInterval = 60 / bpm;
    let idx = 0;
    for (let t = 0.35; t <= duration; t += beatInterval) {
      const isBarDownbeat = idx % 4 === 0;
      const isHalfBar = idx % 2 === 0;
      result.push({
        id: `synth-beat-${idx}`,
        timeSec: Number(t.toFixed(3)),
        strength: isBarDownbeat ? 0.92 : isHalfBar ? 0.66 : 0.42,
        isManual: false,
      });
      idx++;
    }
  }

  for (const m of beatSync.manualMarkers || []) {
    if (m.timeSec >= 0 && m.timeSec <= duration) {
      result.push({ ...m, isManual: true });
    }
  }

  result.sort((a, b) => a.timeSec - b.timeSec);
  return result;
}

/**
 * Finds the best musical beat within a search window, strongly preferring
 * manual markers or prominent downbeats while avoiding too-tight packing.
 */
function pickNearestStrongBeat(
  beats: MusicBeatMarker[],
  targetSec: number,
  minSec: number,
  maxSec: number,
): MusicBeatMarker | null {
  let best: MusicBeatMarker | null = null;
  let bestScore = -Infinity;

  for (const b of beats) {
    if (b.timeSec < minSec || b.timeSec > maxSec) continue;
    const dist = Math.abs(b.timeSec - targetSec);
    const span = Math.max(0.25, maxSec - minSec);
    const proximity = 1 - Math.min(1, dist / span);
    const manualBonus = b.isManual ? 0.45 : 0;
    const score = proximity * 0.6 + b.strength * 0.45 + manualBonus;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best;
}

/**
 * Computes deterministic, beat-synchronized timestamps for all Birthday Wishes,
 * Special Message, Sender Prefix Line, and Prominent Sender Name.
 * Shared identically by UI Timeline Editor, Live Preview, and Video Exporter.
 */
export function computeBeatAlignedSchedule(
  config: StudioProjectConfig,
): BeatSyncSchedule {
  const duration = Math.max(1, config.durationSeconds);
  const scenes = resolveVideoScenes(config);
  const wishesScene =
    scenes.find((s) => s.id === 'wishes') || scenes[scenes.length - 2];
  const finaleScene =
    scenes.find((s) => s.id === 'surprise') || scenes[scenes.length - 1];

  const beats = resolveVideoTimelineBeats(config);
  const mode = config.beatSync?.mode || 'auto';

  const wishesStart = wishesScene.startFrac * duration;
  const wishesEnd = wishesScene.endFrac * duration;
  const wishesSpan = Math.max(2, wishesEnd - wishesStart);

  const finaleStart = finaleScene.startFrac * duration;
  const finaleEnd = finaleScene.endFrac * duration;
  const finaleSpan = Math.max(2, finaleEnd - finaleStart);

  const rawWishes = config.messages.wishes.filter((w) => w.trim().length > 0);
  const wishes =
    rawWishes.length > 0
      ? rawWishes
      : ['Wishing you joy, health, and endless blessings.'];

  const wishAnims = wishes.map((_, idx) => ({
    ...DEFAULT_WISH_ANIMATION_PRESETS[idx % DEFAULT_WISH_ANIMATION_PRESETS.length],
    ...(config.messages.wishAnimations?.[idx] || {}),
  }));

  // 1. Compute Birthday Wishes segments
  const totalWeight = wishAnims.reduce(
    (acc, a) => acc + Math.max(1.5, a.displayDurationSec || 4),
    0,
  );
  const wishSegments: ScheduledTextSegment[] = [];
  let cursor = wishesStart;

  for (let i = 0; i < wishes.length; i++) {
    const anim = wishAnims[i];
    const weightFrac = Math.max(1.5, anim.displayDurationSec || 4) / Math.max(1, totalWeight);
    const nominalStart = cursor;
    const nominalEnd = i === wishes.length - 1 ? wishesEnd : cursor + weightFrac * wishesSpan;

    let actualStart = nominalStart;
    let snappedBeat: number | null = null;

    if (mode === 'manual' && anim.manualStartSec !== null && anim.manualStartSec !== undefined) {
      const prevEnd = i > 0 ? wishSegments[i - 1].startSec + 0.65 : wishesStart;
      actualStart = Math.max(
        prevEnd,
        Math.min(wishesEnd - 0.65, anim.manualStartSec),
      );
    } else if (mode === 'auto' && i > 0) {
      // Snap wish transitions smoothly to a clean musical beat around nominalStart
      const prevStart = wishSegments[i - 1].startSec;
      const winMin = Math.max(prevStart + 1.15, nominalStart - 0.75);
      const winMax = Math.min(wishesEnd - 1.15, nominalStart + 0.75);
      const beat = pickNearestStrongBeat(beats, nominalStart, winMin, winMax);
      if (beat) {
        actualStart = beat.timeSec;
        snappedBeat = beat.timeSec;
      }
    } else if (mode === 'auto' && i === 0) {
      const beat = pickNearestStrongBeat(
        beats,
        wishesStart + 0.12,
        wishesStart,
        Math.min(wishesStart + 0.65, wishesEnd - 1.2),
      );
      if (beat) {
        actualStart = beat.timeSec;
        snappedBeat = beat.timeSec;
      }
    }

    if (i > 0 && wishSegments[i - 1]) {
      // Handoff smoothly so consecutive wish exits & entrances glide seamlessly
      wishSegments[i - 1].endSec = Math.max(
        wishSegments[i - 1].startSec + 0.65,
        actualStart,
      );
    }

    wishSegments.push({
      id: `wish-${i}`,
      label: `Wish ${i + 1}`,
      text: wishes[i],
      startSec: actualStart,
      endSec: nominalEnd,
      config: anim,
      snappedBeatTimeSec: snappedBeat,
    });
    cursor = nominalEnd;
  }

  if (wishSegments.length > 0) {
    wishSegments[wishSegments.length - 1].endSec = wishesEnd;
  }

  // 2. Compute Special Message, Sender Intro ("FROM YOUR FRIEND"), and Sender Name ("HILAL") inside Finale
  const spCfg = {
    ...DEFAULT_SPECIAL_MESSAGE_ANIMATION,
    ...(config.messages.specialMessageAnimation || {}),
  };
  const sIntroCfg = {
    ...DEFAULT_SENDER_INTRO_ANIMATION,
    ...(config.messages.senderIntroAnimation || {}),
  };
  const sNameCfg = {
    ...DEFAULT_SENDER_NAME_ANIMATION,
    ...(config.messages.senderNameAnimation || {}),
  };

  let spStart = finaleStart + 0.08;
  let spBeat: number | null = null;
  let introStart = finaleStart + finaleSpan * 0.42;
  let introBeat: number | null = null;
  let nameStart = finaleStart + finaleSpan * 0.6;
  let nameBeat: number | null = null;

  if (mode === 'manual') {
    if (spCfg.manualStartSec !== null) {
      spStart = Math.max(finaleStart, Math.min(finaleEnd - 1.5, spCfg.manualStartSec));
    }
    if (sIntroCfg.manualStartSec !== null) {
      introStart = Math.max(finaleStart + 0.3, Math.min(finaleEnd - 1.0, sIntroCfg.manualStartSec));
    }
    if (sNameCfg.manualStartSec !== null) {
      nameStart = Math.max(finaleStart + 0.5, Math.min(finaleEnd - 0.8, sNameCfg.manualStartSec));
    }
  } else if (mode === 'auto') {
    const bSp = pickNearestStrongBeat(
      beats,
      finaleStart + 0.25,
      finaleStart,
      finaleStart + finaleSpan * 0.24,
    );
    if (bSp) {
      spStart = bSp.timeSec;
      spBeat = bSp.timeSec;
    }

    const bIntro = pickNearestStrongBeat(
      beats,
      finaleStart + finaleSpan * 0.42,
      Math.max(spStart + 0.7, finaleStart + finaleSpan * 0.28),
      finaleStart + finaleSpan * 0.56,
    );
    if (bIntro) {
      introStart = bIntro.timeSec;
      introBeat = bIntro.timeSec;
    }

    const bName = pickNearestStrongBeat(
      beats,
      finaleStart + finaleSpan * 0.62,
      Math.max(introStart + 0.45, finaleStart + finaleSpan * 0.48),
      finaleStart + finaleSpan * 0.78,
    );
    if (bName) {
      nameStart = bName.timeSec;
      nameBeat = bName.timeSec;
    }
  }

  return {
    videoBeats: beats,
    wishSegments,
    specialSegment: {
      id: 'special-message',
      label: 'Special Message',
      text: config.messages.specialMessage || 'YOU ARE SPECIAL. KEEP SHINING!',
      startSec: spStart,
      endSec: finaleEnd,
      config: spCfg,
      snappedBeatTimeSec: spBeat,
    },
    senderIntroSegment: {
      id: 'sender-intro',
      label: 'Sender Prefix',
      text: config.messages.finalMessage || 'WITH LOVE AND BEST WISHES FROM',
      startSec: introStart,
      endSec: finaleEnd,
      config: sIntroCfg,
      snappedBeatTimeSec: introBeat,
    },
    senderNameSegment: {
      id: 'sender-name',
      label: 'Sender Name',
      text: config.messages.senderName || 'YOUR FRIEND',
      startSec: nameStart,
      endSec: finaleEnd,
      config: sNameCfg,
      snappedBeatTimeSec: nameBeat,
    },
  };
}

/**
 * Returns subtle musical beat pulse [0..1] at time t (strongest right on detected/manual beats).
 */
export function sampleBeatPulseAtTime(
  t: number,
  beats: MusicBeatMarker[],
): number {
  let maxPulse = 0;
  for (const b of beats) {
    const dt = t - b.timeSec;
    if (dt >= 0 && dt < 0.35) {
      const decay = 1 - dt / 0.35;
      const val = decay * decay * b.strength;
      if (val > maxPulse) maxPulse = val;
    }
  }
  return maxPulse;
}
