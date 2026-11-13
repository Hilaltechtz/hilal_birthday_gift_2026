import {
  Check,
  Copy,
  Eye,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FRAME_CONFIG,
  DEFAULT_PHOTO_EFFECT_CONFIG,
  PHOTO_EFFECTS_CATALOG,
  PhotoEffectConfig,
  PhotoEffectMetadata,
  PhotoEffectType,
  StudioPhoto,
  VideoThemeConfig,
} from '../../types';
import {
  createParticleSeeds,
  drawFramedImageContent,
  LoadedImageMap,
  ParticleSeed,
} from '../../utils/videoCanvasScene';
import {
  drawPhotoEffectOverlay,
  getPhotoEffectName,
  resolvePhotoPreTransform,
} from '../../utils/videoPhotoEffects';

interface PhotoEffectsStudioPanelProps {
  photos: StudioPhoto[];
  selectedPhotoId: string | null;
  images: LoadedImageMap;
  videoTheme: VideoThemeConfig;
  onSelectPhotoId: (id: string) => void;
  onUpdatePhotoEffect: (id: string, nextEffect: PhotoEffectConfig) => void;
  onApplyEffectToAll: (effect: PhotoEffectConfig) => void;
}

type EffectCategoryFilter = 'all' | PhotoEffectMetadata['category'];

const CATEGORY_TABS: { id: EffectCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All (26)' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'luxury', label: 'Luxury Gold' },
  { id: 'neon-motion', label: 'Neon & Motion' },
  { id: 'atmosphere', label: 'Atmosphere' },
];

interface EffectThumbCanvasProps {
  effectMeta: PhotoEffectMetadata;
  photo: StudioPhoto;
  img: HTMLImageElement | null;
  seeds: ParticleSeed[];
  videoTheme: VideoThemeConfig;
  clockSec: number;
}

function EffectThumbCanvas({
  effectMeta,
  photo,
  img,
  seeds,
  videoTheme,
  clockSec,
}: EffectThumbCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = videoTheme.backgroundPrimary;
    ctx.fillRect(0, 0, w, h);

    const previewCfg: PhotoEffectConfig = {
      ...DEFAULT_PHOTO_EFFECT_CONFIG,
      type: effectMeta.id,
    };
    const pre = resolvePhotoPreTransform(previewCfg, clockSec);

    if (img) {
      ctx.save();
      if (pre.blurPx > 0.3 && 'filter' in ctx) {
        ctx.filter = `blur(${pre.blurPx.toFixed(1)}px)`;
      }
      if (pre.mirrorX || pre.pulseScale !== 1) {
        ctx.translate(w * 0.5, h * 0.5);
        ctx.scale((pre.mirrorX ? -1 : 1) * pre.pulseScale, pre.pulseScale);
        ctx.translate(-w * 0.5, -h * 0.5);
      }
      drawFramedImageContent(
        ctx,
        img,
        0,
        0,
        w,
        h,
        photo.frame || DEFAULT_FRAME_CONFIG,
        1.0,
        0,
        0,
      );
      ctx.restore();
      if ('filter' in ctx) ctx.filter = 'none';
    }

    drawPhotoEffectOverlay(ctx, 0, 0, w, h, clockSec, previewCfg, seeds, videoTheme);
  }, [effectMeta.id, photo.frame, img, seeds, videoTheme, clockSec]);

  return (
    <canvas
      ref={ref}
      width={180}
      height={120}
      className="w-full aspect-[3/2] rounded-lg object-cover bg-black/60 block"
    />
  );
}

export function PhotoEffectsStudioPanel({
  photos,
  selectedPhotoId,
  images,
  videoTheme,
  onSelectPhotoId,
  onUpdatePhotoEffect,
  onApplyEffectToAll,
}: PhotoEffectsStudioPanelProps) {
  const activePhoto =
    photos.find((p) => p.id === selectedPhotoId) ?? photos[0] ?? null;

  const activeAppliedEffect: PhotoEffectConfig = activePhoto?.effect
    ? { ...DEFAULT_PHOTO_EFFECT_CONFIG, ...activePhoto.effect }
    : { ...DEFAULT_PHOTO_EFFECT_CONFIG };

  const [stagedEffect, setStagedEffect] = useState<PhotoEffectConfig>(
    activeAppliedEffect,
  );
  const [previewOriginal, setPreviewOriginal] = useState(false);
  const [categoryFilter, setCategoryFilter] =
    useState<EffectCategoryFilter>('all');
  const [clockSec, setClockSec] = useState(0);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const seeds = useMemo(() => createParticleSeeds(150), []);

  // Keep staged parameters synced whenever user switches selected photo
  useEffect(() => {
    if (!activePhoto) return;
    setStagedEffect(
      activePhoto.effect
        ? { ...DEFAULT_PHOTO_EFFECT_CONFIG, ...activePhoto.effect }
        : { ...DEFAULT_PHOTO_EFFECT_CONFIG },
    );
    setPreviewOriginal(false);
  }, [
    activePhoto?.id,
    activePhoto?.effect?.type,
    activePhoto?.effect?.intensity,
    activePhoto?.effect?.speed,
    activePhoto?.effect?.size,
    activePhoto?.effect?.opacity,
  ]);

  // Lightweight shared animation ticker (~20fps keeps thumbnails + stage silky without CPU spikes)
  useEffect(() => {
    if (photos.length === 0) return;
    const id = window.setInterval(() => {
      setClockSec((prev) => (prev + 0.05) % 60);
    }, 50);
    return () => window.clearInterval(id);
  }, [photos.length]);

  // Render big live comparison stage (Original vs Staged Preview)
  useEffect(() => {
    if (!activePhoto) return;
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = videoTheme.backgroundPrimary;
    ctx.fillRect(0, 0, w, h);

    const img = images[activePhoto.id] || null;
    const effectiveToDraw = previewOriginal
      ? { ...DEFAULT_PHOTO_EFFECT_CONFIG, type: 'none' as PhotoEffectType }
      : stagedEffect;
    const pre = resolvePhotoPreTransform(effectiveToDraw, clockSec);

    if (img) {
      ctx.save();
      if (pre.blurPx > 0.3 && 'filter' in ctx) {
        ctx.filter = `blur(${pre.blurPx.toFixed(1)}px)`;
      }
      if (pre.mirrorX || pre.pulseScale !== 1) {
        ctx.translate(w * 0.5, h * 0.5);
        ctx.scale((pre.mirrorX ? -1 : 1) * pre.pulseScale, pre.pulseScale);
        ctx.translate(-w * 0.5, -h * 0.5);
      }
      drawFramedImageContent(
        ctx,
        img,
        0,
        0,
        w,
        h,
        activePhoto.frame || DEFAULT_FRAME_CONFIG,
        1.0,
        0,
        0,
      );
      ctx.restore();
      if ('filter' in ctx) ctx.filter = 'none';
    }

    if (!previewOriginal && effectiveToDraw.type !== 'none') {
      drawPhotoEffectOverlay(
        ctx,
        0,
        0,
        w,
        h,
        clockSec,
        effectiveToDraw,
        seeds,
        videoTheme,
      );
    }
  }, [activePhoto, images, stagedEffect, previewOriginal, clockSec, seeds, videoTheme]);

  if (photos.length === 0 || !activePhoto) {
    return null;
  }

  const flashNote = (msg: string) => {
    setStatusNote(msg);
    window.setTimeout(() => setStatusNote(null), 1800);
  };

  const applyEffectForActive = (next: PhotoEffectConfig) => {
    setStagedEffect(next);
    setPreviewOriginal(false);
    onUpdatePhotoEffect(activePhoto.id, next);
    flashNote(
      next.type === 'none'
        ? 'Restored original photo'
        : `Applied "${getPhotoEffectName(next.type)}"`,
    );
  };

  const handleSliderChange = (
    key: 'intensity' | 'speed' | 'size' | 'opacity',
    val: number,
  ) => {
    const next = { ...stagedEffect, [key]: val };
    setStagedEffect(next);
    setPreviewOriginal(false);
    // Live-update applied effect if the active photo already has this effect type applied
    if (
      activeAppliedEffect.type !== 'none' &&
      activeAppliedEffect.type === stagedEffect.type
    ) {
      onUpdatePhotoEffect(activePhoto.id, next);
    }
  };

  const filteredEffects =
    categoryFilter === 'all'
      ? PHOTO_EFFECTS_CATALOG
      : PHOTO_EFFECTS_CATALOG.filter((e) => e.category === categoryFilter);

  const isStagedMatchingApplied =
    stagedEffect.type === activeAppliedEffect.type &&
    Math.abs(stagedEffect.intensity - activeAppliedEffect.intensity) < 0.01 &&
    Math.abs(stagedEffect.speed - activeAppliedEffect.speed) < 0.01 &&
    Math.abs(stagedEffect.size - activeAppliedEffect.size) < 0.01 &&
    Math.abs(stagedEffect.opacity - activeAppliedEffect.opacity) < 0.01;

  return (
    <div
      id="photo-effects-studio"
      className="mt-6 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] p-4 sm:p-5 space-y-4 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--studio-border-soft)] pb-3.5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--studio-primary)] inline-flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            <span>Per-Photo Visual Overlays</span>
          </p>
          <h3 className="mt-1 text-lg sm:text-xl font-semibold text-[var(--studio-heading)]">
            PHOTO EFFECTS STUDIO
          </h3>
          <p className="mt-0.5 text-xs text-[var(--studio-muted)]">
            Select a photo, preview any of the 26 visual effects live, fine-tune intensity &amp; motion, then click Apply.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusNote && (
            <span className="px-2.5 py-1 rounded-md bg-[var(--studio-active-tile)] border border-[var(--studio-border)] text-[11px] font-medium text-[var(--studio-primary)]">
              {statusNote}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onApplyEffectToAll({ ...stagedEffect });
              flashNote(
                stagedEffect.type === 'none'
                  ? 'Cleared effects on all photos'
                  : `Applied "${getPhotoEffectName(stagedEffect.type)}" to all photos`,
              );
            }}
            className="min-h-[34px] px-3 py-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-input)] text-xs font-semibold text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Apply to All Photos</span>
          </button>
        </div>
      </div>

      {/* Photo Target Selector Strip */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--studio-muted)]">
          Select Photo to Edit ({photos.length} uploaded)
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {photos.map((photo, idx) => {
            const isSelected = photo.id === activePhoto.id;
            const effName = getPhotoEffectName(photo.effect?.type);
            const hasEff = Boolean(photo.effect && photo.effect.type !== 'none');
            return (
              <button
                key={`effect-target-${photo.id}`}
                type="button"
                onClick={() => onSelectPhotoId(photo.id)}
                className={`shrink-0 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] hover:border-[var(--studio-border)]'
                }`}
              >
                <img
                  src={photo.dataUrl}
                  alt=""
                  className="h-8 w-8 rounded-md object-cover shrink-0"
                />
                <div className="leading-tight min-w-0">
                  <p className="text-xs font-semibold text-[var(--studio-text)] tabular-nums">
                    Photo #{idx + 1}
                  </p>
                  <p
                    className={`text-[10px] max-w-[115px] truncate ${
                      hasEff
                        ? 'text-[var(--studio-primary)] font-medium'
                        : 'text-[var(--studio-muted)]'
                    }`}
                  >
                    {hasEff ? effName : 'No Effect'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Stage + Effect Fine-Tuning Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--studio-text)] truncate">
              {previewOriginal
                ? 'Original Photo'
                : `Preview: ${getPhotoEffectName(stagedEffect.type)}`}
            </span>
            <button
              type="button"
              onClick={() => setPreviewOriginal((p) => !p)}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                previewOriginal
                  ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                  : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)]'
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>{previewOriginal ? 'Showing Original' : 'Compare Original'}</span>
            </button>
          </div>

          <canvas
            ref={stageCanvasRef}
            width={420}
            height={300}
            className="w-full aspect-[7/5] rounded-lg border border-[var(--studio-border-soft)] bg-black block"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyEffectForActive(stagedEffect)}
              disabled={stagedEffect.type === 'none'}
              className="flex-1 h-9 px-3 rounded-lg bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] disabled:opacity-40 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default"
            >
              <Check className="h-3.5 w-3.5" />
              <span>
                {isStagedMatchingApplied && activeAppliedEffect.type !== 'none'
                  ? 'Effect Applied'
                  : 'Apply Selected Effect'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                applyEffectForActive({
                  ...DEFAULT_PHOTO_EFFECT_CONFIG,
                  type: 'none',
                })
              }
              disabled={
                activeAppliedEffect.type === 'none' && stagedEffect.type === 'none'
              }
              className="h-9 px-3 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-text)] disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
              title="Remove effect and restore original photo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Sliders: Intensity, Speed, Size, Opacity */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--studio-muted)] font-medium">
                Effect Intensity
              </span>
              <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                {Math.round(stagedEffect.intensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Effect intensity"
              min={0.2}
              max={1.6}
              step={0.05}
              value={stagedEffect.intensity}
              onChange={(e) =>
                handleSliderChange('intensity', Number(e.target.value))
              }
              className="w-full accent-[var(--studio-primary)] cursor-pointer"
            />
          </div>

          <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--studio-muted)] font-medium">
                Animation Speed
              </span>
              <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                {stagedEffect.speed.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              aria-label="Effect speed"
              min={0.4}
              max={2.0}
              step={0.1}
              value={stagedEffect.speed}
              onChange={(e) => handleSliderChange('speed', Number(e.target.value))}
              className="w-full accent-[var(--studio-primary)] cursor-pointer"
            />
          </div>

          <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--studio-muted)] font-medium">
                Element Size
              </span>
              <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                {Math.round(stagedEffect.size * 100)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Effect size"
              min={0.5}
              max={1.6}
              step={0.05}
              value={stagedEffect.size}
              onChange={(e) => handleSliderChange('size', Number(e.target.value))}
              className="w-full accent-[var(--studio-primary)] cursor-pointer"
            />
          </div>

          <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--studio-muted)] font-medium">
                Effect Opacity
              </span>
              <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                {Math.round(stagedEffect.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Effect opacity"
              min={0.15}
              max={1.0}
              step={0.05}
              value={stagedEffect.opacity}
              onChange={(e) =>
                handleSliderChange('opacity', Number(e.target.value))
              }
              className="w-full accent-[var(--studio-primary)] cursor-pointer"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-[var(--studio-primary)] shrink-0" />
              <span className="text-[var(--studio-muted)]">Active on photo:</span>
              <span className="font-semibold text-[var(--studio-heading)] truncate">
                {getPhotoEffectName(activeAppliedEffect.type)}
              </span>
            </div>
            <span className="text-[11px] text-[var(--studio-muted)]">
              Combines seamlessly with transition: {activePhoto.transition.type}
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                  : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[var(--studio-muted)]">
          Click thumbnail to preview · Click Apply to attach
        </span>
      </div>

      {/* All 26 Visual Effects Catalog Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredEffects.map((eff) => {
          const catalogNum =
            PHOTO_EFFECTS_CATALOG.findIndex((item) => item.id === eff.id) + 1;
          const isPreviewed = stagedEffect.type === eff.id;
          const isApplied = activeAppliedEffect.type === eff.id;
          return (
            <div
              key={eff.id}
              onClick={() => {
                setPreviewOriginal(false);
                setStagedEffect((prev) => ({ ...prev, type: eff.id }));
              }}
              className={`rounded-xl border p-2 space-y-2 transition-colors cursor-pointer flex flex-col justify-between ${
                isApplied
                  ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)]'
                  : isPreviewed
                    ? 'border-[var(--studio-accent)] bg-[var(--studio-input)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] hover:border-[var(--studio-border)]'
              }`}
            >
              <div className="relative">
                <EffectThumbCanvas
                  effectMeta={eff}
                  photo={activePhoto}
                  img={images[activePhoto.id] || null}
                  seeds={seeds}
                  videoTheme={videoTheme}
                  clockSec={clockSec}
                />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-semibold text-[#F6E1A8] tabular-nums">
                  #{catalogNum}
                </span>
                {isApplied && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[var(--studio-btn-bg)] text-[10px] font-semibold text-[var(--studio-btn-text)]">
                    Applied
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <p
                  className="text-xs font-semibold text-[var(--studio-heading)] truncate"
                  title={eff.shortDesc}
                >
                  {eff.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyEffectForActive({ ...stagedEffect, type: eff.id });
                    }}
                    className={`flex-1 h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      isApplied
                        ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                        : 'border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-primary)] hover:border-[var(--studio-primary)]'
                    }`}
                  >
                    {isApplied ? 'Applied ✓' : 'Apply'}
                  </button>
                  {isApplied && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyEffectForActive({
                          ...DEFAULT_PHOTO_EFFECT_CONFIG,
                          type: 'none',
                        });
                      }}
                      className="h-7 px-2 rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[10px] font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                      title="Remove effect"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
