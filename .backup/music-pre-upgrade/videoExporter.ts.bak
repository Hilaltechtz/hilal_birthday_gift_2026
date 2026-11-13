import {
  RenderedVideoResult,
  resolveVideoDimensions,
  resolveVideoScenes,
  StudioProjectConfig,
} from '../types';
import {
  dataUrlToArrayBuffer,
  scheduleBuiltInSoundtrack,
  scheduleCalendarCueSounds,
} from './audioAnalyzer';
import {
  createParticleSeeds,
  drawVideoFrame,
  getSceneAtTime,
  preloadProjectImages,
} from './videoCanvasScene';

export interface VideoExportProgress {
  progress: number; // 0..1
  currentTime: number;
  totalTime: number;
  sceneLabel: string;
}

interface SupportedCodec {
  mimeType: string;
  extension: 'mp4' | 'webm';
  formatLabel: string;
}

export function detectBestVideoMimeType(): SupportedCodec {
  if (typeof MediaRecorder === 'undefined') {
    return {
      mimeType: 'video/webm',
      extension: 'webm',
      formatLabel: 'WebM Video',
    };
  }

  const candidates: SupportedCodec[] = [
    {
      mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      extension: 'mp4',
      formatLabel: 'MP4 (H.264 + AAC)',
    },
    {
      mimeType: 'video/mp4;codecs=avc1,mp4a',
      extension: 'mp4',
      formatLabel: 'MP4 (H.264)',
    },
    {
      mimeType: 'video/mp4',
      extension: 'mp4',
      formatLabel: 'MP4 Video',
    },
    {
      mimeType: 'video/webm;codecs=vp9,opus',
      extension: 'webm',
      formatLabel: 'WebM (VP9 + Opus · Browser Fallback)',
    },
    {
      mimeType: 'video/webm;codecs=vp8,opus',
      extension: 'webm',
      formatLabel: 'WebM (VP8 + Opus · Browser Fallback)',
    },
    {
      mimeType: 'video/webm',
      extension: 'webm',
      formatLabel: 'WebM Video (Browser Fallback)',
    },
  ];

  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) {
        return c;
      }
    } catch {
      // Continue checking
    }
  }

  return {
    mimeType: '',
    extension: 'webm',
    formatLabel: 'WebM Video (Browser Fallback)',
  };
}

export async function renderBirthdayVideo(
  config: StudioProjectConfig,
  onProgress: (info: VideoExportProgress) => void,
  signal?: AbortSignal,
): Promise<RenderedVideoResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error(
      'Video recording (MediaRecorder) is not supported in this browser.',
    );
  }

  const preset = resolveVideoDimensions(config);
  const duration = config.durationSeconds;
  const codec = detectBestVideoMimeType();

  // Preload all project photos so frames draw synchronously with zero flicker
  const images = await preloadProjectImages(config.photos);
  const seeds = createParticleSeeds(150);

  if (signal?.aborted) {
    throw new DOMException('Render cancelled', 'AbortError');
  }

  // Create high-res export canvas attached cleanly off-viewport for reliable captureStream
  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  canvas.style.position = 'fixed';
  canvas.style.left = '-99999px';
  canvas.style.top = '0';
  canvas.style.width = '1px';
  canvas.style.height = '1px';
  canvas.style.opacity = '0';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    throw new Error('Could not initialize 2D canvas context for video export.');
  }

  // Setup Web Audio mixing destination so MP3 / soundtrack embeds directly in the video
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  const audioDest = audioCtx.createMediaStreamDestination();

  let audioBufferSource: AudioBufferSourceNode | null = null;
  let builtInStop: (() => void) | null = null;
  let calendarSfxStop: (() => void) | null = null;

  // Draw frame 0 immediately so stream has initial video frame
  drawVideoFrame(ctx, preset.width, preset.height, 0, config, images, seeds);

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: 3_600_000,
    audioBitsPerSecond: 128_000,
  };
  if (codec.mimeType) {
    recorderOptions.mimeType = codec.mimeType;
  }

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Decode uploaded MP3 if present
  if (config.music?.dataUrl) {
    try {
      const arrayBuf = await dataUrlToArrayBuffer(config.music.dataUrl);
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      const gainNode = audioCtx.createGain();
      const targetVol = Math.max(0.05, Math.min(1, config.music.volume));

      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(targetVol, now + 0.8);
      gainNode.gain.setValueAtTime(
        targetVol,
        Math.max(now + 0.9, now + duration - 1.6),
      );
      gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);
      gainNode.connect(audioDest);

      const src = audioCtx.createBufferSource();
      src.buffer = decoded;
      src.loop = true;
      src.connect(gainNode);

      const offset = Math.max(
        0,
        Math.min(
          Math.max(0, decoded.duration - 0.5),
          config.music.startOffsetSeconds || 0,
        ),
      );
      src.start(now, offset);
      src.stop(now + duration + 0.1);
      audioBufferSource = src;
    } catch {
      const handle = scheduleBuiltInSoundtrack(
        audioCtx,
        audioDest,
        audioCtx.currentTime,
        duration,
        0.8,
      );
      builtInStop = handle.stop;
    }
  } else {
    const handle = scheduleBuiltInSoundtrack(
      audioCtx,
      audioDest,
      audioCtx.currentTime,
      duration,
      0.8,
    );
    builtInStop = handle.stop;
  }

  // Mix synchronized calendar date ticks & golden reveal chime when Calendar Intro & SFX are enabled
  const resolvedScenes = resolveVideoScenes(config);
  const calendarScene = resolvedScenes.find((s) => s.id === 'calendar');
  if (
    calendarScene &&
    config.calendarConfig?.enabled &&
    config.calendarConfig.enableSoundEffects
  ) {
    const calStartSec = calendarScene.startFrac * duration;
    const calDurSec = (calendarScene.endFrac - calendarScene.startFrac) * duration;
    const calAudioHandle = scheduleCalendarCueSounds(
      audioCtx,
      audioDest,
      audioCtx.currentTime,
      0,
      calStartSec,
      calDurSec,
      config.birthdayDay || 7,
      0.65,
    );
    calendarSfxStop = calAudioHandle.stop;
  }

  return await new Promise<RenderedVideoResult>((resolve, reject) => {
    let rafId = 0;
    let finished = false;
    const startPerf = performance.now();

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      try {
        audioBufferSource?.stop();
      } catch {
        // Ignore
      }
      builtInStop?.();
      calendarSfxStop?.();
      canvasStream.getTracks().forEach((tr) => tr.stop());
      audioDest.stream.getTracks().forEach((tr) => tr.stop());
      void audioCtx.close();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };

    const onAbort = () => {
      if (finished) return;
      finished = true;
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {
        // Ignore
      }
      cleanup();
      reject(new DOMException('Render cancelled', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    recorder.onerror = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      cleanup();
      reject(new Error('MediaRecorder encountered an error while encoding.'));
    };

    recorder.onstop = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      const actualMime =
        recorder.mimeType || codec.mimeType || 'video/webm';
      const isMp4 = actualMime.includes('mp4');
      const blob = new Blob(chunks, { type: actualMime });
      const url = URL.createObjectURL(blob);

      cleanup();

      onProgress({
        progress: 1,
        currentTime: duration,
        totalTime: duration,
        sceneLabel: 'Finalizing Export',
      });

      resolve({
        blob,
        url,
        mimeType: actualMime,
        extension: isMp4 ? 'mp4' : 'webm',
        formatLabel: isMp4
          ? codec.formatLabel
          : 'WebM Video (Browser Fallback)',
        sizeBytes: blob.size,
        durationSeconds: duration,
        aspectRatioLabel: preset.label,
      });
    };

    recorder.start(250);

    const step = () => {
      if (finished) return;
      const elapsedSec = (performance.now() - startPerf) / 1000;
      const t = Math.min(duration, elapsedSec);

      drawVideoFrame(ctx, preset.width, preset.height, t, config, images, seeds);

      const { scene } = getSceneAtTime(t, duration, config);
      onProgress({
        progress: Math.min(0.99, t / duration),
        currentTime: t,
        totalTime: duration,
        sceneLabel: scene.label,
      });

      if (elapsedSec >= duration) {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
  });
}
