import {
  Check,
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  Crop,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { PointerEvent, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_FRAME_CONFIG,
  PhotoFrameConfig,
  PhotoTransitionConfig,
  SAMPLE_STUDIO_PHOTOS,
  StudioPhoto,
  TRANSITION_CATALOG,
  TransitionDirection,
  TransitionSpeed,
  TransitionType,
} from '../../types';
import { DEFAULT_VIDEO_THEME, VideoThemeConfig } from '../../types/theme';
import {
  drawFramingPreview,
  getTransitionName,
  LoadedImageMap,
} from '../../utils/videoCanvasScene';
import { TransitionPreviewCanvas } from './TransitionPreviewCanvas';

export type InspectorTab = 'transition' | 'frame';

interface PhotoInspectorModalProps {
  isOpen: boolean;
  photos: StudioPhoto[];
  photoId: string | null;
  initialTab: InspectorTab;
  images: LoadedImageMap;
  videoTheme?: VideoThemeConfig;
  videoDimensions: { width: number; height: number; cssAspect: string; label: string };
  onSelectPhotoId: (id: string) => void;
  onUpdatePhotoTransition: (
    photoId: string,
    next: Partial<PhotoTransitionConfig>,
  ) => void;
  onUpdatePhotoFrame: (photoId: string, next: Partial<PhotoFrameConfig>) => void;
  onApplyTransitionToAll: (source: PhotoTransitionConfig) => void;
  onOpenTransitionLibrary: (photoId: string) => void;
  onClose: () => void;
}

const DIRECTION_OPTIONS_CARDINAL: { id: TransitionDirection; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'up', label: 'Up' },
  { id: 'down', label: 'Down' },
];

const DIRECTION_OPTIONS_HORIZONTAL: { id: TransitionDirection; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

const DIRECTION_OPTIONS_ROTATION: { id: TransitionDirection; label: string }[] = [
  { id: 'cw', label: 'Clockwise' },
  { id: 'ccw', label: 'Counter-CW' },
];

export function PhotoInspectorModal({
  isOpen,
  photos,
  photoId,
  initialTab,
  images,
  videoTheme = DEFAULT_VIDEO_THEME,
  videoDimensions,
  onSelectPhotoId,
  onUpdatePhotoTransition,
  onUpdatePhotoFrame,
  onApplyTransitionToAll,
  onOpenTransitionLibrary,
  onClose,
}: PhotoInspectorModalProps) {
  const [tab, setTab] = useState<InspectorTab>(initialTab);
  const [replayNonce, setReplayNonce] = useState(0);
  const [appliedAllFeedback, setAppliedAllFeedback] = useState(false);

  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
  }>({ active: false, startX: 0, startY: 0, origOffsetX: 0, origOffsetY: 0 });

  useEffect(() => {
    setTab(initialTab);
    setAppliedAllFeedback(false);
  }, [initialTab, photoId, isOpen]);

  const photoIndex = photos.findIndex((p) => p.id === photoId);
  const photo = photoIndex >= 0 ? photos[photoIndex] : null;

  // Render interactive framing canvas whenever framing settings or platform aspect ratio changes
  useEffect(() => {
    if (!isOpen || !photo || tab !== 'frame') return;
    const canvas = frameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawFramingPreview(
      ctx,
      videoDimensions.width,
      videoDimensions.height,
      photo,
      images[photo.id] ?? null,
      videoTheme,
    );
  }, [
    isOpen,
    photo,
    tab,
    images,
    videoTheme,
    videoDimensions.width,
    videoDimensions.height,
  ]);

  if (!isOpen || !photo) return null;

  const meta =
    TRANSITION_CATALOG.find((t) => t.id === photo.transition.type) ||
    TRANSITION_CATALOG[0];

  // Pair for live transition preview: if there is a next photo, show Photo N -> Photo N+1,
  // or if it's the last photo and >1 photos exist, show Photo N-1 -> Photo N
  const pairA =
    photoIndex < photos.length - 1
      ? photo
      : photos[Math.max(0, photoIndex - 1)] || SAMPLE_STUDIO_PHOTOS[0];
  const pairB =
    photoIndex < photos.length - 1
      ? photos[photoIndex + 1]
      : photoIndex > 0
        ? photo
        : SAMPLE_STUDIO_PHOTOS[1];

  const directionChoices =
    meta.directionMode === 'rotation'
      ? DIRECTION_OPTIONS_ROTATION
      : meta.directionMode === 'horizontal'
        ? DIRECTION_OPTIONS_HORIZONTAL
        : DIRECTION_OPTIONS_CARDINAL;

  const handleApplyToAll = () => {
    onApplyTransitionToAll(photo.transition);
    setAppliedAllFeedback(true);
    window.setTimeout(() => setAppliedAllFeedback(false), 2200);
  };

  const handleFramePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: photo.frame.offsetX,
      origOffsetY: photo.frame.offsetY,
    };
  };

  const handleFramePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - dragStateRef.current.startX) / Math.max(80, rect.width)) * 2.4;
    const dy = ((e.clientY - dragStateRef.current.startY) / Math.max(80, rect.height)) * 2.4;
    const nextX = Math.max(-1, Math.min(1, dragStateRef.current.origOffsetX + dx));
    const nextY = Math.max(-1, Math.min(1, dragStateRef.current.origOffsetY + dy));
    onUpdatePhotoFrame(photo.id, {
      offsetX: Number(nextX.toFixed(2)),
      offsetY: Number(nextY.toFixed(2)),
    });
  };

  const handleFramePointerUp = () => {
    dragStateRef.current.active = false;
  };

  const isPortraitFrame = videoDimensions.height > videoDimensions.width;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center backdrop-blur-md p-0 sm:p-5"
      style={{ backgroundColor: 'var(--studio-overlay)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-inspector-title"
    >
      <div className="w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-5 py-4 sm:px-6 border-b border-[var(--studio-border-soft)] flex flex-wrap items-center justify-between gap-3 bg-[var(--studio-input)]">
          <div className="flex items-center gap-3">
            <img
              src={photo.dataUrl}
              alt=""
              className="h-11 w-11 rounded-lg object-cover border border-[var(--studio-border)]"
            />
            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
                Photo #{photoIndex + 1} of {photos.length}
              </p>
              <h2
                id="photo-inspector-title"
                className="text-lg sm:text-xl font-semibold text-[var(--studio-heading)] truncate max-w-[230px] sm:max-w-xs"
              >
                {photo.caption || 'Individual Photo Studio'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next photo quick switcher */}
            <button
              type="button"
              disabled={photoIndex <= 0}
              onClick={() => onSelectPhotoId(photos[photoIndex - 1].id)}
              aria-label="Previous photo"
              className="h-9 w-9 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] disabled:opacity-35 flex items-center justify-center cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={photoIndex >= photos.length - 1}
              onClick={() => onSelectPhotoId(photos[photoIndex + 1].id)}
              aria-label="Next photo"
              className="h-9 w-9 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] disabled:opacity-35 flex items-center justify-center cursor-pointer disabled:cursor-default"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close photo editor"
              className="h-9 w-9 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-primary)] flex items-center justify-center cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 py-2.5 sm:px-6 border-b border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('transition')}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'transition'
                ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                : 'bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Transition &amp; Timing</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('frame')}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'frame'
                ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                : 'bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Crop className="h-3.5 w-3.5" />
            <span>Video Frame Adjustment</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === 'transition' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Real-Time Transition Preview */}
              <div className="lg:col-span-5 space-y-3">
                <div className="rounded-2xl border border-[var(--studio-border)] bg-black overflow-hidden">
                  <TransitionPreviewCanvas
                    photoA={pairA}
                    photoB={pairB}
                    images={images}
                    transition={photo.transition}
                    videoTheme={videoTheme}
                    width={360}
                    height={250}
                    highFps
                    replayNonce={replayNonce}
                    className="w-full h-auto block"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--studio-primary)] font-medium truncate">
                    {getTransitionName(photo.transition.type)} ·{' '}
                    {photo.transition.durationSec.toFixed(1)}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplayNonce((n) => n + 1)}
                    className="min-h-[34px] px-3 py-1 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-primary)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Replay</span>
                  </button>
                </div>

                <p className="text-[11px] text-[var(--studio-muted)] leading-relaxed">
                  Settings here apply independently to Photo #{photoIndex + 1} and stay preserved if you reorder your timeline.
                </p>

                {/* Intentional Apply to All Photos */}
                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={handleApplyToAll}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-primary)] hover:border-[var(--studio-primary)] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {appliedAllFeedback ? (
                      <>
                        <Check className="h-4 w-4 text-[var(--studio-primary)]" />
                        <span>Applied to All {photos.length} Photos</span>
                      </>
                    ) : (
                      <>
                        <CopyCheck className="h-4 w-4" />
                        <span>Apply to All Photos</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Right: Individual Transition Controls */}
              <div className="lg:col-span-7 space-y-5">
                {/* Transition Type + Browse Library */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="photo-transition-select"
                      className="text-xs font-medium text-[var(--studio-muted)]"
                    >
                      Transition Effect
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenTransitionLibrary(photo.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--studio-primary)] hover:underline cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Browse Transition Library (16)</span>
                    </button>
                  </div>

                  <select
                    id="photo-transition-select"
                    value={photo.transition.type}
                    onChange={(e) => {
                      const nextType = e.target.value as TransitionType;
                      const nextMeta = TRANSITION_CATALOG.find(
                        (t) => t.id === nextType,
                      );
                      const nextDir: TransitionDirection =
                        nextMeta?.directionMode === 'rotation'
                          ? 'cw'
                          : photo.transition.direction === 'cw' ||
                              photo.transition.direction === 'ccw'
                            ? 'left'
                            : photo.transition.direction;
                      onUpdatePhotoTransition(photo.id, {
                        type: nextType,
                        direction: nextDir,
                      });
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2.5 text-sm font-medium text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
                  >
                    {TRANSITION_CATALOG.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.shortDesc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transition Duration & Display Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[var(--studio-muted)]">Transition Duration</span>
                      <span className="font-mono font-semibold text-[var(--studio-primary)] tabular-nums">
                        {photo.transition.durationSec.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2.5}
                      step={0.1}
                      value={photo.transition.durationSec}
                      onChange={(e) =>
                        onUpdatePhotoTransition(photo.id, {
                          durationSec: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[var(--studio-primary)] cursor-pointer"
                    />
                  </div>

                  <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[var(--studio-muted)]">Photo Display Duration</span>
                      <span className="font-mono font-semibold text-[var(--studio-primary)] tabular-nums">
                        {photo.transition.displayDurationSec.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2.0}
                      max={12.0}
                      step={0.5}
                      value={photo.transition.displayDurationSec}
                      onChange={(e) =>
                        onUpdatePhotoTransition(photo.id, {
                          displayDurationSec: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[var(--studio-primary)] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Animation Speed */}
                <div>
                  <span className="block text-xs font-medium text-[var(--studio-muted)] mb-2">
                    Animation Speed
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['slow', 'normal', 'fast'] as TransitionSpeed[]).map(
                      (spd) => {
                        const active = photo.transition.speed === spd;
                        return (
                          <button
                            key={spd}
                            type="button"
                            onClick={() =>
                              onUpdatePhotoTransition(photo.id, { speed: spd })
                            }
                            className={`min-h-[40px] rounded-xl border text-xs font-semibold capitalize transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                                : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border)]'
                            }`}
                          >
                            {spd}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Animation Direction (when applicable) */}
                {meta.supportsDirection && (
                  <div>
                    <span className="block text-xs font-medium text-[var(--studio-muted)] mb-2">
                      Animation Direction
                    </span>
                    <div
                      className={`grid gap-2 ${
                        directionChoices.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-4'
                      }`}
                    >
                      {directionChoices.map((dir) => {
                        const active = photo.transition.direction === dir.id;
                        return (
                          <button
                            key={dir.id}
                            type="button"
                            onClick={() =>
                              onUpdatePhotoTransition(photo.id, {
                                direction: dir.id,
                              })
                            }
                            className={`min-h-[40px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-primary)]'
                                : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                            }`}
                          >
                            {dir.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Zoom Intensity */}
                <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--studio-muted)]">
                      Ken Burns / Zoom Intensity
                    </span>
                    <span className="font-mono font-semibold text-[var(--studio-primary)] tabular-nums">
                      {Math.round(photo.transition.zoomIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.35}
                    step={0.01}
                    value={photo.transition.zoomIntensity}
                    onChange={(e) =>
                      onUpdatePhotoTransition(photo.id, {
                        zoomIntensity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--studio-primary)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* VIDEO FRAME ADJUSTMENT TAB */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Interactive Frame Viewport */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-3 flex flex-col items-center">
                  <div
                    className="overflow-hidden rounded-xl border border-[var(--studio-border)] bg-black shadow-xl"
                    style={{
                      aspectRatio: videoDimensions.cssAspect,
                      maxHeight: isPortraitFrame ? '360px' : '280px',
                      maxWidth: isPortraitFrame ? '215px' : '100%',
                      width: '100%',
                    }}
                  >
                    <canvas
                      ref={frameCanvasRef}
                      width={videoDimensions.width}
                      height={videoDimensions.height}
                      onPointerDown={handleFramePointerDown}
                      onPointerMove={handleFramePointerMove}
                      onPointerUp={handleFramePointerUp}
                      onPointerCancel={handleFramePointerUp}
                      className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
                    />
                  </div>
                  <p className="mt-2.5 text-[11px] text-[var(--studio-muted)] text-center">
                    Drag directly on the preview to pan · Format: {videoDimensions.label}
                  </p>
                </div>
              </div>

              {/* Framing Controls */}
              <div className="lg:col-span-6 space-y-4">
                {/* Fill vs Fit */}
                <div>
                  <span className="block text-xs font-medium text-[var(--studio-muted)] mb-2">
                    Framing Mode (Avoid Unwanted Cropping)
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePhotoFrame(photo.id, { fitMode: 'fill' })
                      }
                      className={`min-h-[46px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        photo.frame.fitMode === 'fill'
                          ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                          : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border)]'
                      }`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Fill Frame</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePhotoFrame(photo.id, { fitMode: 'fit' })
                      }
                      className={`min-h-[46px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        photo.frame.fitMode === 'fit'
                          ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                          : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border)]'
                      }`}
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>Fit Whole Photo</span>
                    </button>
                  </div>
                </div>

                {/* Zoom Slider */}
                <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--studio-muted)]">Zoom In / Out</span>
                    <span className="font-mono font-semibold text-[var(--studio-primary)] tabular-nums">
                      {photo.frame.zoom.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={2.5}
                    step={0.05}
                    value={photo.frame.zoom}
                    onChange={(e) =>
                      onUpdatePhotoFrame(photo.id, {
                        zoom: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--studio-primary)] cursor-pointer"
                  />
                </div>

                {/* Move Left / Right */}
                <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--studio-muted)]">Move Left / Right</span>
                    <span className="font-mono font-semibold text-[var(--studio-primary)] tabular-nums">
                      {Math.round(photo.frame.offsetX * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.02}
                    value={photo.frame.offsetX}
                    onChange={(e) =>
                      onUpdatePhotoFrame(photo.id, {
                        offsetX: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--studio-primary)] cursor-pointer"
                  />
                </div>

                {/* Move Up / Down */}
                <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--studio-muted)]">Move Up / Down</span>
                    <span className="font-mono font-semibold text-[var(--studio-primary)] tabular-nums">
                      {Math.round(photo.frame.offsetY * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.02}
                    value={photo.frame.offsetY}
                    onChange={(e) =>
                      onUpdatePhotoFrame(photo.id, {
                        offsetY: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--studio-primary)] cursor-pointer"
                  />
                </div>

                {/* Reset Framing */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePhotoFrame(photo.id, { ...DEFAULT_FRAME_CONFIG })
                  }
                  className="w-full min-h-[40px] rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-primary)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Photo Framing</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-[var(--studio-border-soft)] bg-[var(--studio-input)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] hover:opacity-90 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
