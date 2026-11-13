import {
  CheckCircle2,
  Download,
  Film,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CakeInteractionState,
  RenderedVideoResult,
  resolveVideoDimensions,
  resolveVideoScenes,
  StudioProjectConfig,
} from '../../types';
import {
  scheduleBuiltInSoundtrack,
  scheduleCalendarCueSounds,
} from '../../utils/audioAnalyzer';
import {
  createParticleSeeds,
  drawVideoFrame,
  getSceneAtTime,
  LoadedImageMap,
  preloadProjectImages,
} from '../../utils/videoCanvasScene';
import { VideoExportProgress } from '../../utils/videoExporter';

interface VideoPreviewAndExportProps {
  config: StudioProjectConfig;
  isRendering: boolean;
  renderProgress: VideoExportProgress | null;
  renderError: string | null;
  renderedVideo: RenderedVideoResult | null;
  onStartRender: () => void;
  onCancelRender: () => void;
  onClearRenderedVideo: () => void;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoPreviewAndExport({
  config,
  isRendering,
  renderProgress,
  renderError,
  renderedVideo,
  onStartRender,
  onCancelRender,
  onClearRenderedVideo,
}: VideoPreviewAndExportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [images, setImages] = useState<LoadedImageMap>({});
  const [cakeState, setCakeState] = useState<CakeInteractionState>({
    extinguished: false,
    extinguishedAtSec: null,
    cut: false,
    cutAtSec: null,
  });
  const [cakeClockSec, setCakeClockSec] = useState(0);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSynthStopRef = useRef<(() => void) | null>(null);
  const previewCalSfxStopRef = useRef<(() => void) | null>(null);

  const seeds = useMemo(() => createParticleSeeds(150), []);
  const preset = resolveVideoDimensions(config);
  const scenes = useMemo(() => resolveVideoScenes(config), [config]);
  const aspectRatioValue = preset.width / Math.max(1, preset.height);

  // Preload photos whenever photo list changes
  useEffect(() => {
    let active = true;
    void preloadProjectImages(config.photos).then((loaded) => {
      if (active) setImages(loaded);
    });
    return () => {
      active = false;
    };
  }, [config.photos]);

  // Clamp previewTime when duration shrinks
  useEffect(() => {
    if (previewTime > config.durationSeconds) {
      setPreviewTime(0);
    }
  }, [config.durationSeconds, previewTime]);

  const stopPreviewSound = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewSynthStopRef.current) {
      previewSynthStopRef.current();
      previewSynthStopRef.current = null;
    }
    if (previewCalSfxStopRef.current) {
      previewCalSfxStopRef.current();
      previewCalSfxStopRef.current = null;
    }
    if (previewCtxRef.current) {
      void previewCtxRef.current.close();
      previewCtxRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPreviewSound();
  }, []);

  // Stop preview playback when entering export render
  useEffect(() => {
    if (isRendering) {
      setIsPlaying(false);
      stopPreviewSound();
    }
  }, [isRendering]);

  useEffect(() => {
    if (previewAudioRef.current && config.music) {
      previewAudioRef.current.volume = config.music.volume;
    }
  }, [config.music?.volume]);

  // Keep cake interactive clock moving smoothly while paused on Cake Scene if extinguished or cut
  useEffect(() => {
    if (renderedVideo || isRendering) return;
    if (!cakeState.extinguished && !cakeState.cut && isPlaying) return;
    const activeScene = getSceneAtTime(previewTime, config.durationSeconds, config).scene;
    if (!cakeState.extinguished && !cakeState.cut && activeScene.id !== 'cake') return;
    if (isPlaying) return;

    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setCakeClockSec((c) => c + dt);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    cakeState.extinguished,
    cakeState.cut,
    isPlaying,
    previewTime,
    config,
    renderedVideo,
    isRendering,
  ]);

  // Draw live preview frame whenever time/config/images/cakeState update
  useEffect(() => {
    if (renderedVideo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const effectiveCakeState =
      cakeState.extinguished || cakeState.cut ? cakeState : undefined;

    drawVideoFrame(
      ctx,
      preset.width,
      preset.height,
      previewTime,
      config,
      images,
      seeds,
      {
        cakeState: effectiveCakeState,
        interactionClockSec: isPlaying ? previewTime : cakeClockSec,
      },
    );
  }, [
    previewTime,
    config,
    images,
    seeds,
    preset.width,
    preset.height,
    renderedVideo,
    cakeState,
    cakeClockSec,
    isPlaying,
  ]);

  // Real-time preview playback loop
  useEffect(() => {
    if (!isPlaying || renderedVideo || isRendering) return;

    const startTimeVal =
      previewTime >= config.durationSeconds - 0.1 ? 0 : previewTime;
    const startPerf = performance.now();

    stopPreviewSound();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (config.music?.dataUrl) {
      const el = new Audio(config.music.dataUrl);
      el.volume = config.music.volume;
      el.loop = true;
      const offset =
        (config.music.startOffsetSeconds + startTimeVal) %
        Math.max(1, config.music.durationSeconds);
      el.currentTime = offset;
      previewAudioRef.current = el;
      void el.play().catch(() => {
        // Autoplay restriction safe fallback
      });
    }

    try {
      const ctx = new AudioCtx();
      previewCtxRef.current = ctx;

      if (!config.music?.dataUrl) {
        const remaining = Math.max(1, config.durationSeconds - startTimeVal);
        const handle = scheduleBuiltInSoundtrack(
          ctx,
          ctx.destination,
          ctx.currentTime,
          remaining,
          0.7,
        );
        previewSynthStopRef.current = handle.stop;
      }

      const calScene = scenes.find((s) => s.id === 'calendar');
      if (
        calScene &&
        config.calendarConfig?.enabled &&
        config.calendarConfig.enableSoundEffects
      ) {
        const calStartSec = calScene.startFrac * config.durationSeconds;
        const calDurSec =
          (calScene.endFrac - calScene.startFrac) * config.durationSeconds;
        const calHandle = scheduleCalendarCueSounds(
          ctx,
          ctx.destination,
          ctx.currentTime,
          startTimeVal,
          calStartSec,
          calDurSec,
          config.birthdayDay || 7,
          0.6,
        );
        previewCalSfxStopRef.current = calHandle.stop;
      }
    } catch {
      // Ignore if audio context fails
    }

    let rafId = 0;
    const tick = () => {
      const elapsed = (performance.now() - startPerf) / 1000;
      const nextT = startTimeVal + elapsed;
      if (nextT >= config.durationSeconds) {
        setPreviewTime(config.durationSeconds);
        setIsPlaying(false);
        stopPreviewSound();
        return;
      }
      setPreviewTime(nextT);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      stopPreviewSound();
    };
  }, [isPlaying, renderedVideo, isRendering]);

  const handleTogglePlay = () => {
    if (previewTime >= config.durationSeconds - 0.1) {
      setPreviewTime(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestartPreview = () => {
    setIsPlaying(false);
    stopPreviewSound();
    setPreviewTime(0);
    window.setTimeout(() => setIsPlaying(true), 40);
  };

  const handleDownload = () => {
    if (!renderedVideo) return;
    const safeName = (config.recipientName.trim() || 'Birthday')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '');
    const platformSlug = config.platformId;
    const filename = `${safeName}-Birthday-${platformSlug}-${preset.width}x${preset.height}.${renderedVideo.extension}`;

    const link = document.createElement('a');
    link.href = renderedVideo.url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentSceneInfo = getSceneAtTime(
    previewTime,
    config.durationSeconds,
    config,
  );

  const ensureOnCakeScene = () => {
    const cakeScene = scenes.find((s) => s.id === 'cake');
    if (cakeScene && currentSceneInfo.scene.id !== 'cake') {
      setIsPlaying(false);
      stopPreviewSound();
      const targetTime = cakeScene.startFrac * config.durationSeconds + 0.35;
      setPreviewTime(targetTime);
      setCakeClockSec(targetTime);
      return targetTime;
    }
    return isPlaying ? previewTime : cakeClockSec;
  };

  const handleInteractiveExtinguish = () => {
    const clock = ensureOnCakeScene();
    setCakeState((prev) =>
      prev.extinguished
        ? { ...prev, extinguished: false, extinguishedAtSec: null }
        : { ...prev, extinguished: true, extinguishedAtSec: clock },
    );
  };

  const handleInteractiveCutCake = () => {
    const clock = ensureOnCakeScene();
    setCakeState((prev) =>
      prev.cut
        ? { ...prev, cut: false, cutAtSec: null }
        : { ...prev, cut: true, cutAtSec: clock },
    );
  };

  // Smoothly fit tall, square, wide, and custom aspect ratios inside the monitor
  const viewportMaxHeight = aspectRatioValue < 0.85 ? 440 : 340;
  const viewportMaxWidth =
    aspectRatioValue < 0.85
      ? `${Math.round(viewportMaxHeight * aspectRatioValue)}px`
      : aspectRatioValue <= 1.1
        ? '340px'
        : '100%';

  return (
    <aside className="luxury-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      {/* Monitor Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
            Studio Monitor
          </p>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-semibold text-[var(--studio-heading)]">
            {renderedVideo ? 'Final Export Ready' : 'Live Video Preview'}
          </h2>
        </div>

        <span className="text-xs font-mono tabular-nums text-[var(--studio-muted)] text-right">
          {preset.label} · {config.durationSeconds}s
        </span>
      </div>

      {/* Aspect-Correct Video Viewport */}
      <div className="w-full flex items-center justify-center rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] p-3">
        <div
          className="relative w-full overflow-hidden rounded-lg bg-black shadow-2xl border border-[var(--studio-border)] flex items-center justify-center"
          style={{
            aspectRatio: preset.cssAspect,
            maxHeight: `${viewportMaxHeight}px`,
            maxWidth: viewportMaxWidth,
          }}
        >
          {renderedVideo ? (
            <video
              key={renderedVideo.url}
              src={renderedVideo.url}
              controls
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={preset.width}
              height={preset.height}
              className="w-full h-full block"
            />
          )}

          {/* Rendering Progress Overlay */}
          {isRendering && renderProgress && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-5 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--studio-primary)]/30 border-t-[var(--studio-primary)] animate-spin mb-3" />
              <p className="text-sm font-semibold text-white">
                Rendering Birthday Movie
              </p>
              <p className="mt-1 text-xs text-white/75">
                {renderProgress.sceneLabel}
              </p>
              <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-white">
                {Math.round(renderProgress.progress * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Timeline & Controls */}
      {!renderedVideo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isRendering}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] hover:opacity-90 text-xs font-semibold inline-flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Play Preview</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRestartPreview}
                disabled={isRendering}
                aria-label="Restart preview"
                className="min-h-[40px] px-3 py-2 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </button>
            </div>

            <div className="text-right">
              <p className="text-xs font-mono tabular-nums text-[var(--studio-primary)]">
                {formatClock(previewTime)} / {formatClock(config.durationSeconds)}
              </p>
              <p className="text-[11px] text-[var(--studio-muted)]">
                {currentSceneInfo.scene.label}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="timeline-scrubber" className="sr-only">
              Preview timeline position
            </label>
            <input
              id="timeline-scrubber"
              type="range"
              min={0}
              max={config.durationSeconds}
              step={0.05}
              value={previewTime}
              disabled={isRendering}
              onChange={(e) => {
                setIsPlaying(false);
                stopPreviewSound();
                setPreviewTime(Number(e.target.value));
              }}
              className="w-full accent-[var(--studio-primary)] cursor-pointer"
            />
          </div>

          <div
            className={`grid gap-1 ${
              scenes.length === 7 ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-3 sm:grid-cols-6'
            }`}
          >
            {scenes.map((scene) => {
              const active = currentSceneInfo.scene.id === scene.id;
              return (
                <button
                  key={scene.id}
                  type="button"
                  disabled={isRendering}
                  onClick={() => {
                    setIsPlaying(false);
                    stopPreviewSound();
                    setPreviewTime(scene.startFrac * config.durationSeconds + 0.05);
                  }}
                  title={scene.label}
                  className={`py-1.5 px-1 rounded-md text-[10px] font-medium truncate transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--studio-active-tile)] border border-[var(--studio-primary)] text-[var(--studio-heading)] font-semibold'
                      : 'bg-[var(--studio-subcard)] border border-[var(--studio-border-soft)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {scene.label.replace(/^\d+\.\s*/, '')}
                </button>
              );
            })}
          </div>

          {/* Interactive Cake Stage Actions inside Live Monitor */}
          <div className="pt-2 border-t border-[var(--studio-border-soft)] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--studio-muted)]">
              Interactive Cake Show:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={isRendering}
                onClick={handleInteractiveExtinguish}
                className={`h-8 px-2.5 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                  cakeState.extinguished
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                    : 'border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border-strong)]'
                }`}
              >
                <Flame className="h-3 w-3" />
                <span>
                  {cakeState.extinguished
                    ? 'Relight Candles'
                    : 'Extinguish Candles'}
                </span>
              </button>

              <button
                type="button"
                disabled={isRendering}
                onClick={handleInteractiveCutCake}
                className={`h-8 px-2.5 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                  cakeState.cut
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                    : 'border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border-strong)]'
                }`}
              >
                <Scissors className="h-3 w-3" />
                <span>{cakeState.cut ? 'Reset Slice' : 'Cut Cake'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rendering Progress Bar */}
      {isRendering && renderProgress && (
        <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--studio-primary)]">
              Encoding: {renderProgress.sceneLabel}
            </span>
            <span className="font-mono tabular-nums text-[var(--studio-text)]">
              {formatClock(renderProgress.currentTime)} /{' '}
              {formatClock(renderProgress.totalTime)}
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[var(--studio-subcard)] overflow-hidden">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${Math.round(renderProgress.progress * 100)}%`,
                background:
                  'linear-gradient(90deg, var(--studio-btn-bg) 0%, var(--studio-btn-bg-2) 55%, var(--studio-accent) 100%)',
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--studio-muted)]">
              Audio &amp; animations are recording in real time
            </span>
            <button
              type="button"
              onClick={onCancelRender}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--studio-accent)] hover:underline cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {renderError && (
        <div className="rounded-xl border border-[var(--studio-accent)]/50 bg-[var(--studio-subcard)] p-3.5 text-xs text-[var(--studio-accent)]">
          {renderError}
        </div>
      )}

      {/* Generate OR Download Action Area */}
      {!renderedVideo ? (
        <button
          type="button"
          onClick={onStartRender}
          disabled={isRendering}
          className="gold-shimmer-btn w-full min-h-[52px] rounded-xl px-6 py-3.5 text-sm sm:text-base font-semibold tracking-wider inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
        >
          <Film className="h-4 w-4" />
          <span>{isRendering ? 'GENERATING VIDEO...' : 'GENERATE VIDEO'}</span>
        </button>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--studio-primary)]" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--studio-text)]">
                  {renderedVideo.formatLabel}
                </p>
                <p className="text-[11px] text-[var(--studio-muted)] tabular-nums">
                  {renderedVideo.durationSeconds}s ·{' '}
                  {renderedVideo.aspectRatioLabel} ·{' '}
                  {formatBytes(renderedVideo.sizeBytes)}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="gold-shimmer-btn w-full min-h-[52px] rounded-xl px-6 py-3.5 text-sm sm:text-base font-semibold tracking-wider inline-flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>
              DOWNLOAD VIDEO (.{renderedVideo.extension.toUpperCase()})
            </span>
          </button>

          <button
            type="button"
            onClick={onClearRenderedVideo}
            className="w-full min-h-[42px] rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] transition-colors cursor-pointer"
          >
            Back to Studio Editor &amp; Live Preview
          </button>
        </div>
      )}
    </aside>
  );
}
