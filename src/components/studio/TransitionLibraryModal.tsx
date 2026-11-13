import { Check, Eye, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DEFAULT_TRANSITION_CONFIG,
  PhotoTransitionConfig,
  SAMPLE_STUDIO_PHOTOS,
  StudioPhoto,
  TRANSITION_CATALOG,
  TransitionMetadata,
  TransitionType,
} from '../../types';
import { DEFAULT_VIDEO_THEME, VideoThemeConfig } from '../../types/theme';
import { LoadedImageMap } from '../../utils/videoCanvasScene';
import { TransitionPreviewCanvas } from './TransitionPreviewCanvas';

interface TransitionLibraryModalProps {
  isOpen: boolean;
  photos: StudioPhoto[];
  images: LoadedImageMap;
  videoTheme?: VideoThemeConfig;
  targetPhotoId: string | null;
  onSelectTransitionForPhoto: (photoId: string, type: TransitionType) => void;
  onClose: () => void;
}

type CategoryFilter = 'all' | 'motion' | 'optics' | 'light';

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All (16)' },
  { id: 'motion', label: 'Motion & Zoom' },
  { id: 'optics', label: '3D & Optics' },
  { id: 'light', label: 'Light & Mask' },
];

export function TransitionLibraryModal({
  isOpen,
  photos,
  images,
  videoTheme = DEFAULT_VIDEO_THEME,
  targetPhotoId,
  onSelectTransitionForPhoto,
  onClose,
}: TransitionLibraryModalProps) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [activePhotoId, setActivePhotoId] = useState<string>(
    targetPhotoId || photos[0]?.id || '',
  );
  const [previewMeta, setPreviewMeta] = useState<TransitionMetadata | null>(
    null,
  );
  const [replayNonce, setReplayNonce] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    if (targetPhotoId && photos.some((p) => p.id === targetPhotoId)) {
      setActivePhotoId(targetPhotoId);
    } else if (photos.length > 0) {
      setActivePhotoId((prev) =>
        photos.some((p) => p.id === prev) ? prev : photos[0].id,
      );
    }
  }, [isOpen, targetPhotoId, photos]);

  if (!isOpen) return null;

  const activePhotoIndex = photos.findIndex((p) => p.id === activePhotoId);
  const activePhoto =
    activePhotoIndex >= 0 ? photos[activePhotoIndex] : photos[0] || null;
  const currentSelectedType = activePhoto?.transition.type ?? null;

  const demoPairA =
    activePhotoIndex > 0
      ? photos[activePhotoIndex - 1]
      : photos[0] || SAMPLE_STUDIO_PHOTOS[0];
  const demoPairB =
    activePhotoIndex > 0
      ? photos[activePhotoIndex]
      : photos[1] || SAMPLE_STUDIO_PHOTOS[1];

  const filtered =
    category === 'all'
      ? TRANSITION_CATALOG
      : TRANSITION_CATALOG.filter((item) => item.category === category);

  const previewConfig: PhotoTransitionConfig | null = previewMeta
    ? {
        ...(activePhoto?.transition || DEFAULT_TRANSITION_CONFIG),
        type: previewMeta.id,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-md p-0 sm:p-5"
      style={{ backgroundColor: 'var(--studio-overlay)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-library-title"
    >
      <div className="w-full max-w-5xl max-h-[94vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-[var(--studio-border-soft)] flex flex-wrap items-center justify-between gap-3 bg-[var(--studio-input)]">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[var(--studio-primary)]">
              Motion Graphics Vault
            </p>
            <h2
              id="transition-library-title"
              className="text-xl sm:text-2xl font-semibold text-[var(--studio-heading)]"
            >
              Transition Library
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {photos.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-[var(--studio-muted)]">
                <span className="hidden sm:inline">Applying to:</span>
                <select
                  value={activePhoto?.id || ''}
                  onChange={(e) => setActivePhotoId(e.target.value)}
                  className="min-h-[38px] rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--studio-primary)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
                >
                  {photos.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      Photo #{idx + 1} — {p.caption.slice(0, 22) || 'Untitled'}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Transition Library"
              className="h-10 w-10 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-primary)] flex items-center justify-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-5 py-3 sm:px-6 border-b border-[var(--studio-border-soft)] flex items-center gap-2 overflow-x-auto bg-[var(--studio-subcard)]">
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] font-semibold'
                    : 'bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-soft)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Spotlight Preview Stage */}
          {previewMeta && previewConfig && (
            <div className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5">
              <div className="w-full md:w-[320px] shrink-0 rounded-xl overflow-hidden border border-[var(--studio-border)] bg-black">
                <TransitionPreviewCanvas
                  photoA={demoPairA}
                  photoB={demoPairB}
                  images={images}
                  transition={previewConfig}
                  videoTheme={videoTheme}
                  width={320}
                  height={210}
                  highFps
                  replayNonce={replayNonce}
                  className="w-full h-auto block"
                />
              </div>

              <div className="flex-1 space-y-3 text-center md:text-left">
                <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
                  Live Transition Preview
                </p>
                <h3 className="text-xl font-semibold text-[var(--studio-heading)]">
                  {previewMeta.name}
                </h3>
                <p className="text-sm text-[var(--studio-muted)]">
                  {previewMeta.shortDesc}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setReplayNonce((n) => n + 1)}
                    className="min-h-[40px] px-4 py-2 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-text)] hover:border-[var(--studio-primary)] cursor-pointer"
                  >
                    Replay Demo
                  </button>

                  {activePhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTransitionForPhoto(
                          activePhoto.id,
                          previewMeta.id,
                        );
                        onClose();
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] hover:opacity-90 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        Select for Photo #{activePhotoIndex + 1}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewMeta(null)}
                    className="min-h-[40px] px-3 py-2 rounded-xl text-xs text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                  >
                    Hide Spotlight
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 16 Transition Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const isSelected = currentSelectedType === item.id;
              const isSpotlight = previewMeta?.id === item.id;
              const cardTransition: PhotoTransitionConfig = {
                ...DEFAULT_TRANSITION_CONFIG,
                type: item.id,
                durationSec: 1.0,
              };

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border overflow-hidden flex flex-col transition-all ${
                    isSelected
                      ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] shadow-md'
                      : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] hover:border-[var(--studio-border)]'
                  }`}
                >
                  <div className="relative bg-black border-b border-[var(--studio-border-soft)]">
                    <TransitionPreviewCanvas
                      photoA={demoPairA}
                      photoB={demoPairB}
                      images={images}
                      transition={cardTransition}
                      videoTheme={videoTheme}
                      width={260}
                      height={165}
                      className="w-full h-auto block"
                    />
                    {isSelected && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] text-[10px] font-semibold inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--studio-muted)] leading-relaxed">
                        {item.shortDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewMeta(item);
                          setReplayNonce((n) => n + 1);
                        }}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isSpotlight
                            ? 'border-[var(--studio-accent)] bg-[var(--studio-active-tile)] text-[var(--studio-accent)]'
                            : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border)]'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        disabled={!activePhoto}
                        onClick={() => {
                          if (!activePhoto) return;
                          onSelectTransitionForPhoto(activePhoto.id, item.id);
                          onClose();
                        }}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                          isSelected
                            ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                            : 'bg-[var(--studio-btn-secondary-bg)] text-[var(--studio-primary)] hover:bg-[var(--studio-btn-bg)] hover:text-[var(--studio-btn-text)]'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Select</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
