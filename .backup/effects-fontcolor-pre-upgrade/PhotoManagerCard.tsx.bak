import {
  ArrowLeft,
  ArrowRight,
  Crop,
  Eye,
  Flag,
  ImagePlus,
  Layers,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_FRAME_CONFIG,
  DEFAULT_TRANSITION_CONFIG,
  PhotoFrameConfig,
  PhotoTransitionConfig,
  SAMPLE_STUDIO_PHOTOS,
  StudioPhoto,
  TransitionType,
} from '../../types';
import { DEFAULT_VIDEO_THEME, VideoThemeConfig } from '../../types/theme';
import { optimizeImageFile } from '../../utils/storage';
import {
  getTransitionName,
  LoadedImageMap,
  preloadProjectImages,
} from '../../utils/videoCanvasScene';
import { InspectorTab, PhotoInspectorModal } from './PhotoInspectorModal';
import { TransitionLibraryModal } from './TransitionLibraryModal';

interface PhotoManagerCardProps {
  photos: StudioPhoto[];
  openingPhotoId: string | null;
  finalPhotoId: string | null;
  videoTheme?: VideoThemeConfig;
  videoDimensions: {
    width: number;
    height: number;
    cssAspect: string;
    label: string;
  };
  onChangePhotos: (nextPhotos: StudioPhoto[]) => void;
  onSelectOpening: (id: string) => void;
  onSelectFinal: (id: string) => void;
}

export function PhotoManagerCard({
  photos,
  openingPhotoId,
  finalPhotoId,
  videoTheme = DEFAULT_VIDEO_THEME,
  videoDimensions,
  onChangePhotos,
  onSelectOpening,
  onSelectFinal,
}: PhotoManagerCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<LoadedImageMap>({});

  const [inspectorPhotoId, setInspectorPhotoId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('transition');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTargetPhotoId, setLibraryTargetPhotoId] = useState<
    string | null
  >(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    void preloadProjectImages(photos).then((loaded) => {
      if (active) setImages(loaded);
    });
    return () => {
      active = false;
    };
  }, [photos]);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    try {
      const added: StudioPhoto[] = [];
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await optimizeImageFile(file);
        const cleanName = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ');
        added.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dataUrl,
          caption: cleanName || 'A cherished birthday memory',
          transition: { ...DEFAULT_TRANSITION_CONFIG },
          frame: { ...DEFAULT_FRAME_CONFIG },
        });
      }
      if (added.length > 0) {
        const hasOnlySamples =
          photos.length > 0 && photos.every((p) => p.isSample);
        const nextList = hasOnlySamples ? added : [...photos, ...added];
        onChangePhotos(nextList);
        if (hasOnlySamples) {
          onSelectOpening(added[0].id);
          onSelectFinal(added[added.length - 1].id);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    void processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void processFiles(e.dataTransfer.files);
  };

  const movePhoto = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const copy = [...photos];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    onChangePhotos(copy);
  };

  const removePhoto = (id: string) => {
    if (inspectorPhotoId === id) {
      setInspectorPhotoId(null);
    }
    onChangePhotos(photos.filter((p) => p.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    onChangePhotos(
      photos.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  };

  const updatePhotoTransition = (
    id: string,
    patch: Partial<PhotoTransitionConfig>,
  ) => {
    onChangePhotos(
      photos.map((p) =>
        p.id === id ? { ...p, transition: { ...p.transition, ...patch } } : p,
      ),
    );
  };

  const updatePhotoFrame = (id: string, patch: Partial<PhotoFrameConfig>) => {
    onChangePhotos(
      photos.map((p) =>
        p.id === id ? { ...p, frame: { ...p.frame, ...patch } } : p,
      ),
    );
  };

  const applyTransitionToAll = (source: PhotoTransitionConfig) => {
    onChangePhotos(
      photos.map((p) => ({
        ...p,
        transition: { ...source },
      })),
    );
  };

  const openInspector = (id: string, tab: InspectorTab) => {
    setInspectorPhotoId(id);
    setInspectorTab(tab);
  };

  const openLibraryForPhoto = (id: string | null) => {
    setLibraryTargetPhotoId(id || photos[0]?.id || null);
    setLibraryOpen(true);
  };

  return (
    <section
      id="section-photos"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
            Section B
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
            Photo Timeline &amp; Transition Editor
          </h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            Set an independent transition, display duration, and frame crop for every photo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openLibraryForPhoto(inspectorPhotoId)}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-semibold text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Transition Library (16)</span>
          </button>

          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => onChangePhotos([])}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--studio-border-soft)] text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-accent)] transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onChangePhotos(
                SAMPLE_STUDIO_PHOTOS.map((p) => ({
                  ...p,
                  transition: { ...p.transition },
                  frame: { ...p.frame },
                })),
              );
              onSelectOpening(SAMPLE_STUDIO_PHOTOS[0].id);
              onSelectFinal(SAMPLE_STUDIO_PHOTOS[2].id);
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--studio-border-soft)] text-xs font-medium text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] transition-colors cursor-pointer"
          >
            Load Samples
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`mt-5 rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)]'
            : 'border-[var(--studio-border)] bg-[var(--studio-input)] hover:border-[var(--studio-border-strong)]'
        }`}
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--studio-btn-secondary-bg)] text-[var(--studio-primary)]">
          <ImagePlus className="h-5 w-5" />
        </div>
        <p className="mt-2.5 text-sm font-medium text-[var(--studio-text)]">
          {isProcessing
            ? 'Optimizing uploaded photos...'
            : 'Click or drag & drop recipient photographs'}
        </p>
        <p className="mt-1 text-xs text-[var(--studio-muted)]">
          Supports JPG, PNG, WebP · Click any timeline card below to customize its transition &amp; frame
        </p>
      </div>

      {/* Photo Timeline Editor */}
      {photos.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-6 text-center">
          <p className="text-sm text-[var(--studio-muted)]">
            No photos selected yet. Upload pictures above or click &ldquo;Load Samples&rdquo;.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Compact Visual Timeline Sequence Strip */}
          <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3">
            <div className="flex items-center justify-between text-[11px] text-[var(--studio-muted)] mb-2">
              <span className="font-medium uppercase tracking-wider text-[var(--studio-primary)]">
                Scene 3 Photo Timeline ({photos.length} scenes)
              </span>
              <span className="tabular-nums">
                Total weight:{' '}
                {photos
                  .reduce((acc, p) => acc + p.transition.displayDurationSec, 0)
                  .toFixed(1)}
                s
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openInspector(photo.id, 'transition')}
                  className="shrink-0 flex items-center gap-2 rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] hover:border-[var(--studio-primary)] px-2 py-1.5 text-left transition-colors cursor-pointer"
                >
                  <img
                    src={photo.dataUrl}
                    alt=""
                    className="h-7 w-7 rounded object-cover"
                  />
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold text-[var(--studio-text)] tabular-nums">
                      #{idx + 1} · {photo.transition.displayDurationSec.toFixed(1)}s
                    </p>
                    <p className="text-[10px] text-[var(--studio-primary)] max-w-[110px] truncate">
                      {getTransitionName(photo.transition.type)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Individual Photo Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo, index) => {
              const isOpening = openingPhotoId === photo.id;
              const isFinal = finalPhotoId === photo.id;
              const transitionLabel = getTransitionName(photo.transition.type);

              return (
                <div
                  key={photo.id}
                  className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] overflow-hidden flex flex-col hover:border-[var(--studio-border-strong)] transition-colors"
                >
                  <div
                    onClick={() => openInspector(photo.id, 'transition')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openInspector(photo.id, 'transition');
                      }
                    }}
                    className="relative aspect-[4/3] bg-black cursor-pointer group"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption}
                      referrerPolicy="no-referrer"
                      className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.03] ${
                        photo.frame.fitMode === 'fit'
                          ? 'object-contain p-1'
                          : 'object-cover'
                      }`}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-semibold text-[#f6e1a8] tabular-nums">
                      #{index + 1} · {photo.transition.displayDurationSec.toFixed(1)}s
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.id);
                      }}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-black/80 text-[#f5b8d0] hover:bg-black flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Transition Name Bar */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-2.5 py-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#f6e1a8] truncate">
                        {transitionLabel}
                      </span>
                      <span className="text-[10px] font-mono text-white/80 shrink-0 uppercase">
                        {photo.frame.fitMode}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(e) => updateCaption(photo.id, e.target.value)}
                      placeholder="Photo caption..."
                      aria-label={`Caption for photo ${index + 1}`}
                      className="w-full rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border-soft)] px-2.5 py-1.5 text-xs text-[var(--studio-text)] placeholder:text-[var(--studio-muted)]/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
                    />

                    {/* Individual Transition & Frame Actions */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openInspector(photo.id, 'transition')}
                        className="min-h-[34px] px-2 py-1 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] hover:border-[var(--studio-primary)] text-[11px] font-medium text-[var(--studio-primary)] inline-flex items-center justify-center gap-1 cursor-pointer"
                        title="Edit transition settings"
                      >
                        <Sliders className="h-3 w-3 shrink-0" />
                        <span className="truncate">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openInspector(photo.id, 'transition')}
                        className="min-h-[34px] px-2 py-1 rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] hover:border-[var(--studio-primary)] text-[11px] font-medium text-[var(--studio-text)] inline-flex items-center justify-center gap-1 cursor-pointer"
                        title="Preview transition effect"
                      >
                        <Eye className="h-3 w-3 shrink-0" />
                        <span className="truncate">Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openInspector(photo.id, 'frame')}
                        className="min-h-[34px] px-2 py-1 rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] hover:border-[var(--studio-primary)] text-[11px] font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] inline-flex items-center justify-center gap-1 cursor-pointer"
                        title="Adjust crop & video framing"
                      >
                        <Crop className="h-3 w-3 shrink-0" />
                        <span className="truncate">Frame</span>
                      </button>
                    </div>

                    {/* Role & Order Controls */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--studio-border-soft)]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectOpening(photo.id)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            isOpening
                              ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                              : 'bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Opening</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectFinal(photo.id)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            isFinal
                              ? 'bg-[var(--studio-accent)] text-[var(--studio-btn-text)]'
                              : 'bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                          }`}
                        >
                          <Flag className="h-3 w-3" />
                          <span>Final</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0}
                          aria-label="Move photo earlier"
                          className="h-7 w-7 rounded-md bg-[var(--studio-subcard)] text-[var(--studio-text)] disabled:opacity-30 flex items-center justify-center cursor-pointer disabled:cursor-default"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === photos.length - 1}
                          aria-label="Move photo later"
                          className="h-7 w-7 rounded-md bg-[var(--studio-subcard)] text-[var(--studio-text)] disabled:opacity-30 flex items-center justify-center cursor-pointer disabled:cursor-default"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Photo Transition & Frame Inspector Modal */}
      <PhotoInspectorModal
        isOpen={Boolean(inspectorPhotoId)}
        photos={photos}
        photoId={inspectorPhotoId}
        initialTab={inspectorTab}
        images={images}
        videoTheme={videoTheme}
        videoDimensions={videoDimensions}
        onSelectPhotoId={(id) => setInspectorPhotoId(id)}
        onUpdatePhotoTransition={updatePhotoTransition}
        onUpdatePhotoFrame={updatePhotoFrame}
        onApplyTransitionToAll={applyTransitionToAll}
        onOpenTransitionLibrary={(id) => openLibraryForPhoto(id)}
        onClose={() => setInspectorPhotoId(null)}
      />

      {/* Dedicated 16-Transition Library Modal */}
      <TransitionLibraryModal
        isOpen={libraryOpen}
        photos={photos}
        images={images}
        videoTheme={videoTheme}
        targetPhotoId={libraryTargetPhotoId}
        onSelectTransitionForPhoto={(photoId, type: TransitionType) =>
          updatePhotoTransition(photoId, { type })
        }
        onClose={() => setLibraryOpen(false)}
      />
    </section>
  );
}
