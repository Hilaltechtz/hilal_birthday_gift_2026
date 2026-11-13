import {
  BookmarkPlus,
  Check,
  Copy,
  Edit3,
  Monitor,
  Palette,
  RotateCcw,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StudioProjectConfig, VIDEO_SCENES } from '../../types';
import {
  DEFAULT_VIDEO_THEME,
  DEFAULT_WEBSITE_THEME,
  PREDEFINED_THEMES,
  VideoThemeConfig,
  WebsiteThemeConfig,
} from '../../types/theme';
import {
  createParticleSeeds,
  drawVideoFrame,
  LoadedImageMap,
  preloadProjectImages,
} from '../../utils/videoCanvasScene';
import { ColorControlField } from './ColorControlField';

type StudioTargetTab = 'website' | 'video';

type PreviewSceneMode =
  | 'website'
  | 'intro'
  | 'slideshow'
  | 'cake'
  | 'wishes'
  | 'finale';

type WebsiteEditorGroup = 'brand' | 'surfaces' | 'typography' | 'gradient';
type VideoEditorGroup =
  | 'backdrop'
  | 'typography'
  | 'frames'
  | 'celebration'
  | 'cake'
  | 'effects';

interface ThemeAppearanceStudioCardProps {
  websiteTheme: WebsiteThemeConfig;
  videoTheme: VideoThemeConfig;
  customWebsiteThemes: WebsiteThemeConfig[];
  customVideoThemes: VideoThemeConfig[];
  projectConfig: StudioProjectConfig;
  onChangeWebsiteTheme: (next: WebsiteThemeConfig) => void;
  onChangeVideoTheme: (next: VideoThemeConfig) => void;
  onSaveCustomWebsiteTheme: (name: string) => void;
  onSaveCustomVideoTheme: (name: string) => void;
  onRenameCustomWebsiteTheme: (id: string, name: string) => void;
  onRenameCustomVideoTheme: (id: string, name: string) => void;
  onDeleteCustomWebsiteTheme: (id: string) => void;
  onDeleteCustomVideoTheme: (id: string) => void;
  onDuplicateCustomWebsiteTheme: (theme: WebsiteThemeConfig) => void;
  onDuplicateCustomVideoTheme: (theme: VideoThemeConfig) => void;
  onResetWebsiteTheme: () => void;
  onResetVideoTheme: () => void;
}

const PREVIEW_MODES: { id: PreviewSceneMode; label: string }[] = [
  { id: 'website', label: 'Website Interface' },
  { id: 'intro', label: 'Video Intro' },
  { id: 'slideshow', label: 'Photo Slideshow' },
  { id: 'cake', label: 'Birthday Cake Scene' },
  { id: 'wishes', label: 'Birthday Wishes Scene' },
  { id: 'finale', label: 'Final Celebration Scene' },
];

export function ThemeAppearanceStudioCard({
  websiteTheme,
  videoTheme,
  customWebsiteThemes,
  customVideoThemes,
  projectConfig,
  onChangeWebsiteTheme,
  onChangeVideoTheme,
  onSaveCustomWebsiteTheme,
  onSaveCustomVideoTheme,
  onRenameCustomWebsiteTheme,
  onRenameCustomVideoTheme,
  onDeleteCustomWebsiteTheme,
  onDeleteCustomVideoTheme,
  onDuplicateCustomWebsiteTheme,
  onDuplicateCustomVideoTheme,
  onResetWebsiteTheme,
  onResetVideoTheme,
}: ThemeAppearanceStudioCardProps) {
  const [activeStudio, setActiveStudio] = useState<StudioTargetTab>('website');
  const [websiteGroup, setWebsiteGroup] = useState<WebsiteEditorGroup>('brand');
  const [videoGroup, setVideoGroup] = useState<VideoEditorGroup>('backdrop');
  const [previewMode, setPreviewMode] = useState<PreviewSceneMode>('website');

  const [newThemeName, setNewThemeName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [images, setImages] = useState<LoadedImageMap>({});
  const seeds = useMemo(() => createParticleSeeds(90), []);

  useEffect(() => {
    let active = true;
    void preloadProjectImages(projectConfig.photos).then((loaded) => {
      if (active) setImages(loaded);
    });
    return () => {
      active = false;
    };
  }, [projectConfig.photos]);

  // Switch live preview gracefully when switching studios
  const handleSelectStudioTab = (tab: StudioTargetTab) => {
    setActiveStudio(tab);
    if (tab === 'website') {
      setPreviewMode('website');
    } else if (previewMode === 'website') {
      setPreviewMode('cake');
    }
    setRenamingId(null);
  };

  // Live animated video scene preview when previewMode !== 'website'
  useEffect(() => {
    if (previewMode === 'website') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sceneMap: Record<Exclude<PreviewSceneMode, 'website'>, number> = {
      intro: 0,
      slideshow: 2,
      cake: 3,
      wishes: 4,
      finale: 5,
    };
    const sceneDef = VIDEO_SCENES[sceneMap[previewMode]];
    const sceneStart = sceneDef.startFrac * projectConfig.durationSeconds;
    const sceneLen = Math.max(
      1.5,
      (sceneDef.endFrac - sceneDef.startFrac) * projectConfig.durationSeconds,
    );

    const startPerf = performance.now();
    let rafId = 0;

    const renderLoop = (now: number) => {
      const elapsedSec = ((now - startPerf) / 1000) % sceneLen;
      const t = sceneStart + Math.min(sceneLen - 0.05, elapsedSec * 0.7 + sceneLen * 0.2);
      drawVideoFrame(
        ctx,
        640,
        360,
        t,
        { ...projectConfig, videoTheme },
        images,
        seeds,
      );
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [previewMode, projectConfig, videoTheme, images, seeds]);

  const updateWebsiteField = <K extends keyof WebsiteThemeConfig>(
    key: K,
    val: WebsiteThemeConfig[K],
  ) => {
    onChangeWebsiteTheme({
      ...websiteTheme,
      id: `${websiteTheme.id}-edited`,
      [key]: val,
    });
  };

  const updateVideoField = <K extends keyof VideoThemeConfig>(
    key: K,
    val: VideoThemeConfig[K],
  ) => {
    onChangeVideoTheme({
      ...videoTheme,
      id: `${videoTheme.id}-edited`,
      [key]: val,
    });
  };

  const updateVideoTuple = (
    key: 'confettiColors' | 'balloonColors' | 'fireworksColors',
    index: 0 | 1 | 2,
    hex: string,
  ) => {
    const nextTuple = [...videoTheme[key]] as [string, string, string];
    nextTuple[index] = hex;
    updateVideoField(key, nextTuple);
  };

  const handleSaveNewCustom = () => {
    const trimmed = newThemeName.trim();
    if (!trimmed) return;
    if (activeStudio === 'website') {
      onSaveCustomWebsiteTheme(trimmed);
    } else {
      onSaveCustomVideoTheme(trimmed);
    }
    setNewThemeName('');
    setSavedNotice(`Saved "${trimmed}"`);
    window.setTimeout(() => setSavedNotice(null), 2400);
  };

  const activePresetId =
    activeStudio === 'website' ? websiteTheme.id : videoTheme.id;
  const activeCustomList =
    activeStudio === 'website' ? customWebsiteThemes : customVideoThemes;

  const activeHexSummary =
    activeStudio === 'website'
      ? [
          { label: 'Primary', hex: websiteTheme.primaryColor },
          { label: 'Background', hex: websiteTheme.backgroundColor },
          { label: 'Card', hex: websiteTheme.cardBackgroundColor },
          { label: 'Button', hex: websiteTheme.buttonColor },
          { label: 'Text', hex: websiteTheme.textColor },
          { label: 'Accent', hex: websiteTheme.accentColor },
        ]
      : [
          { label: 'Backdrop 1', hex: videoTheme.backgroundPrimary },
          { label: 'Backdrop 2', hex: videoTheme.backgroundSecondary },
          { label: 'Title', hex: videoTheme.titleColor },
          { label: 'Frame', hex: videoTheme.photoFrameColor },
          { label: 'Cake', hex: videoTheme.cakeTier1Color },
          { label: 'Fireworks', hex: videoTheme.fireworksColors[0] },
        ];

  return (
    <section
      id="section-themes"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
            Theme &amp; Color Studio
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
            Appearance Customization
          </h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            Customize your Website workspace and exported Video look completely independently.
          </p>
        </div>

        <button
          type="button"
          onClick={
            activeStudio === 'website'
              ? onResetWebsiteTheme
              : onResetVideoTheme
          }
          className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>
            Restore Default {activeStudio === 'website' ? 'Website' : 'Video'} Theme
          </span>
        </button>
      </div>

      {/* Independent Mode Switcher: Website vs Video */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSelectStudioTab('website')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            activeStudio === 'website'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] shadow-md'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] hover:border-[var(--studio-border)]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] flex items-center justify-center shrink-0">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--studio-text)] truncate">
                Website Appearance Studio
              </p>
              <p className="text-xs text-[var(--studio-muted)] truncate">
                Active: {websiteTheme.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
            <span
              className="h-4 w-4 rounded-full border border-white/25"
              style={{ backgroundColor: websiteTheme.backgroundColor }}
            />
            <span
              className="h-4 w-4 rounded-full border border-white/25"
              style={{ backgroundColor: websiteTheme.primaryColor }}
            />
            <span
              className="h-4 w-4 rounded-full border border-white/25"
              style={{ backgroundColor: websiteTheme.accentColor }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectStudioTab('video')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            activeStudio === 'video'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] shadow-md'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] hover:border-[var(--studio-border)]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] flex items-center justify-center shrink-0">
              <Video className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--studio-text)] truncate">
                Video Appearance Studio
              </p>
              <p className="text-xs text-[var(--studio-muted)] truncate">
                Active: {videoTheme.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
            <span
              className="h-4 w-4 rounded-full border border-white/25"
              style={{ backgroundColor: videoTheme.backgroundPrimary }}
            />
            <span
              className="h-4 w-4 rounded-full border border-white/25"
              style={{ backgroundColor: videoTheme.titleColor }}
            />
            <span
              className="h-4 w-4 rounded-full border border-white/25"
              style={{ backgroundColor: videoTheme.cakeTier2Color }}
            />
          </div>
        </button>
      </div>

      {/* 1. Predefined 10 Coordinated Themes */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--studio-heading)] flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--studio-primary)]" />
            <span>
              Predefined Color Themes (
              {activeStudio === 'website'
                ? 'Applied to Website UI Only'
                : 'Applied to Exported Video Only'}
              )
            </span>
          </h3>
          <span className="text-[11px] text-[var(--studio-muted)]">
            10 luxury presets
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {PREDEFINED_THEMES.map((preset) => {
            const target =
              activeStudio === 'website' ? preset.website : preset.video;
            const isActive = activePresetId === preset.id;
            const swatches =
              activeStudio === 'website'
                ? [
                    preset.website.backgroundColor,
                    preset.website.cardBackgroundColor,
                    preset.website.primaryColor,
                    preset.website.accentColor,
                  ]
                : [
                    preset.video.backgroundPrimary,
                    preset.video.backgroundSecondary,
                    preset.video.titleColor,
                    preset.video.cakeTier2Color,
                  ];

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (activeStudio === 'website') {
                    onChangeWebsiteTheme({ ...preset.website });
                  } else {
                    onChangeVideoTheme({ ...preset.video });
                  }
                }}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] shadow-sm'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] hover:border-[var(--studio-border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {swatches.map((hex, sIdx) => (
                      <span
                        key={sIdx}
                        className="h-4 w-4 rounded-full border border-white/25 shadow-xs"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 text-[var(--studio-primary)] shrink-0" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--studio-text)] leading-snug">
                    {target.name}
                  </p>
                  <p className="text-[10px] text-[var(--studio-muted)] line-clamp-1 mt-0.5">
                    {preset.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Saved Custom Palettes (Save, Rename, Duplicate, Delete) */}
      <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[var(--studio-text)]">
              Saved Custom {activeStudio === 'website' ? 'Website' : 'Video'}{' '}
              Palettes
            </p>
            <p className="text-[11px] text-[var(--studio-muted)]">
              Save your current custom palette for instant reuse across projects.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder={`Name custom ${activeStudio} theme...`}
              aria-label={`Name custom ${activeStudio} theme`}
              className="flex-1 sm:w-52 h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-3 text-xs text-[var(--studio-text)] placeholder:text-[var(--studio-muted)]/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
            />
            <button
              type="button"
              onClick={handleSaveNewCustom}
              disabled={!newThemeName.trim()}
              className="h-9 px-3.5 rounded-lg bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-45"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Save Theme</span>
            </button>
          </div>
        </div>

        {savedNotice && (
          <p className="text-xs font-medium text-[var(--studio-primary)]">
            {savedNotice}
          </p>
        )}

        {activeCustomList.length === 0 ? (
          <p className="text-xs text-[var(--studio-muted)] italic">
            No custom {activeStudio} themes saved yet. Tweak colors below and click Save Theme.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeCustomList.map((savedItem) => {
              const isSelected = activePresetId === savedItem.id;
              const isRenaming = renamingId === savedItem.id;
              const chipColors =
                activeStudio === 'website'
                  ? [
                      (savedItem as WebsiteThemeConfig).backgroundColor,
                      (savedItem as WebsiteThemeConfig).primaryColor,
                      (savedItem as WebsiteThemeConfig).accentColor,
                    ]
                  : [
                      (savedItem as VideoThemeConfig).backgroundPrimary,
                      (savedItem as VideoThemeConfig).titleColor,
                      (savedItem as VideoThemeConfig).cakeTier2Color,
                    ];

              return (
                <div
                  key={savedItem.id}
                  className={`rounded-xl border p-3 flex flex-col gap-2.5 ${
                    isSelected
                      ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)]'
                      : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {isRenaming ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          className="flex-1 min-w-0 h-7 rounded bg-[var(--studio-surface)] border border-[var(--studio-border)] px-2 text-xs text-[var(--studio-text)]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (renameDraft.trim()) {
                              if (activeStudio === 'website') {
                                onRenameCustomWebsiteTheme(
                                  savedItem.id,
                                  renameDraft.trim(),
                                );
                              } else {
                                onRenameCustomVideoTheme(
                                  savedItem.id,
                                  renameDraft.trim(),
                                );
                              }
                            }
                            setRenamingId(null);
                          }}
                          className="px-2 h-7 rounded bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] text-[11px] font-semibold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeStudio === 'website') {
                            onChangeWebsiteTheme({
                              ...(savedItem as WebsiteThemeConfig),
                            });
                          } else {
                            onChangeVideoTheme({
                              ...(savedItem as VideoThemeConfig),
                            });
                          }
                        }}
                        className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-1 shrink-0">
                          {chipColors.map((c, idx) => (
                            <span
                              key={idx}
                              className="h-3.5 w-3.5 rounded-full border border-white/25"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-[var(--studio-text)] truncate">
                          {savedItem.name}
                        </span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(savedItem.id);
                          setRenameDraft(savedItem.name);
                        }}
                        title="Rename theme"
                        aria-label={`Rename ${savedItem.name}`}
                        className="h-7 w-7 rounded border border-[var(--studio-border-soft)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] flex items-center justify-center cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeStudio === 'website') {
                            onDuplicateCustomWebsiteTheme(
                              savedItem as WebsiteThemeConfig,
                            );
                          } else {
                            onDuplicateCustomVideoTheme(
                              savedItem as VideoThemeConfig,
                            );
                          }
                        }}
                        title="Duplicate theme"
                        aria-label={`Duplicate ${savedItem.name}`}
                        className="h-7 w-7 rounded border border-[var(--studio-border-soft)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] flex items-center justify-center cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeStudio === 'website') {
                            onDeleteCustomWebsiteTheme(savedItem.id);
                          } else {
                            onDeleteCustomVideoTheme(savedItem.id);
                          }
                        }}
                        title="Delete custom theme"
                        aria-label={`Delete ${savedItem.name}`}
                        className="h-7 w-7 rounded border border-[var(--studio-border-soft)] text-[var(--studio-accent)] hover:border-[var(--studio-accent)] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Granular Custom Color & Gradient Controls */}
      {activeStudio === 'website' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--studio-border-soft)] pb-3">
            {(
              [
                { id: 'brand', label: 'Primary, Buttons & Glow' },
                { id: 'surfaces', label: 'Backgrounds, Cards & Borders' },
                { id: 'typography', label: 'Headings & Text Colors' },
                { id: 'gradient', label: 'Gradient Studio' },
              ] as { id: WebsiteEditorGroup; label: string }[]
            ).map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setWebsiteGroup(grp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  websiteGroup === grp.id
                    ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] font-semibold'
                    : 'bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-soft)]'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>

          {websiteGroup === 'brand' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ColorControlField
                label="Primary Color"
                value={websiteTheme.primaryColor}
                defaultValue={DEFAULT_WEBSITE_THEME.primaryColor}
                onChange={(hex) => updateWebsiteField('primaryColor', hex)}
              />
              <ColorControlField
                label="Secondary Color"
                value={websiteTheme.secondaryColor}
                defaultValue={DEFAULT_WEBSITE_THEME.secondaryColor}
                onChange={(hex) => updateWebsiteField('secondaryColor', hex)}
              />
              <ColorControlField
                label="Accent Color"
                value={websiteTheme.accentColor}
                defaultValue={DEFAULT_WEBSITE_THEME.accentColor}
                onChange={(hex) => updateWebsiteField('accentColor', hex)}
              />
              <ColorControlField
                label="Button Primary"
                value={websiteTheme.buttonColor}
                defaultValue={DEFAULT_WEBSITE_THEME.buttonColor}
                onChange={(hex) => updateWebsiteField('buttonColor', hex)}
              />
              <ColorControlField
                label="Button Shimmer End"
                value={websiteTheme.buttonSecondaryColor}
                defaultValue={DEFAULT_WEBSITE_THEME.buttonSecondaryColor}
                onChange={(hex) => updateWebsiteField('buttonSecondaryColor', hex)}
              />
              <ColorControlField
                label="Button Label Text"
                value={websiteTheme.buttonTextColor}
                defaultValue={DEFAULT_WEBSITE_THEME.buttonTextColor}
                onChange={(hex) => updateWebsiteField('buttonTextColor', hex)}
              />
              <ColorControlField
                label="Glow & Shadow Color"
                value={websiteTheme.glowColor}
                defaultValue={DEFAULT_WEBSITE_THEME.glowColor}
                onChange={(hex) => updateWebsiteField('glowColor', hex)}
              />
            </div>
          )}

          {websiteGroup === 'surfaces' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ColorControlField
                label="Website Background"
                value={websiteTheme.backgroundColor}
                defaultValue={DEFAULT_WEBSITE_THEME.backgroundColor}
                onChange={(hex) => updateWebsiteField('backgroundColor', hex)}
              />
              <ColorControlField
                label="Card Surface"
                value={websiteTheme.cardBackgroundColor}
                defaultValue={DEFAULT_WEBSITE_THEME.cardBackgroundColor}
                onChange={(hex) => updateWebsiteField('cardBackgroundColor', hex)}
              />
              <ColorControlField
                label="Input & Tile Surface"
                value={websiteTheme.inputBackgroundColor}
                defaultValue={DEFAULT_WEBSITE_THEME.inputBackgroundColor}
                onChange={(hex) => updateWebsiteField('inputBackgroundColor', hex)}
              />
              <ColorControlField
                label="Border Color"
                value={websiteTheme.borderColor}
                defaultValue={DEFAULT_WEBSITE_THEME.borderColor}
                onChange={(hex) => updateWebsiteField('borderColor', hex)}
              />
            </div>
          )}

          {websiteGroup === 'typography' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ColorControlField
                label="Heading Color"
                value={websiteTheme.headingColor}
                defaultValue={DEFAULT_WEBSITE_THEME.headingColor}
                onChange={(hex) => updateWebsiteField('headingColor', hex)}
              />
              <ColorControlField
                label="Body Text Color"
                value={websiteTheme.textColor}
                defaultValue={DEFAULT_WEBSITE_THEME.textColor}
                onChange={(hex) => updateWebsiteField('textColor', hex)}
              />
              <ColorControlField
                label="Muted / Helper Text"
                value={websiteTheme.mutedTextColor}
                defaultValue={DEFAULT_WEBSITE_THEME.mutedTextColor}
                onChange={(hex) => updateWebsiteField('mutedTextColor', hex)}
              />
            </div>
          )}

          {websiteGroup === 'gradient' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorControlField
                  label="Gradient Start"
                  value={websiteTheme.gradientStart}
                  defaultValue={DEFAULT_WEBSITE_THEME.gradientStart}
                  onChange={(hex) => updateWebsiteField('gradientStart', hex)}
                />
                <ColorControlField
                  label="Gradient End"
                  value={websiteTheme.gradientEnd}
                  defaultValue={DEFAULT_WEBSITE_THEME.gradientEnd}
                  onChange={(hex) => updateWebsiteField('gradientEnd', hex)}
                />
              </div>
              <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--studio-text)]">
                    Gradient Angle
                  </span>
                  <span className="font-mono text-[var(--studio-primary)] tabular-nums">
                    {websiteTheme.gradientAngle}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={websiteTheme.gradientAngle}
                  onChange={(e) =>
                    updateWebsiteField('gradientAngle', Number(e.target.value))
                  }
                  className="w-full accent-[var(--studio-primary)] cursor-pointer"
                />
                <div
                  className="h-8 w-full rounded-lg border border-[var(--studio-border)]"
                  style={{
                    background: `linear-gradient(${websiteTheme.gradientAngle}deg, ${websiteTheme.gradientStart} 0%, ${websiteTheme.backgroundColor} 50%, ${websiteTheme.gradientEnd} 100%)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIDEO APPEARANCE ELEMENT CONTROLS */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--studio-border-soft)] pb-3">
            {(
              [
                { id: 'backdrop', label: 'Backdrop & Gradient' },
                { id: 'typography', label: 'Titles & Wishes Text' },
                { id: 'frames', label: 'Photo Frames & Transitions' },
                { id: 'celebration', label: 'Confetti & Balloons' },
                { id: 'cake', label: 'Birthday Cake' },
                { id: 'effects', label: 'Particles, Fireworks & Glow' },
              ] as { id: VideoEditorGroup; label: string }[]
            ).map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setVideoGroup(grp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  videoGroup === grp.id
                    ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] font-semibold'
                    : 'bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-soft)]'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>

          {videoGroup === 'backdrop' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ColorControlField
                  label="Backdrop Start"
                  value={videoTheme.backgroundPrimary}
                  defaultValue={DEFAULT_VIDEO_THEME.backgroundPrimary}
                  onChange={(hex) => updateVideoField('backgroundPrimary', hex)}
                />
                <ColorControlField
                  label="Backdrop End"
                  value={videoTheme.backgroundSecondary}
                  defaultValue={DEFAULT_VIDEO_THEME.backgroundSecondary}
                  onChange={(hex) => updateVideoField('backgroundSecondary', hex)}
                />
                <ColorControlField
                  label="Ambient Nebula Glow"
                  value={videoTheme.backgroundGlow}
                  defaultValue={DEFAULT_VIDEO_THEME.backgroundGlow}
                  onChange={(hex) => updateVideoField('backgroundGlow', hex)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--studio-text)]">
                      Backdrop Gradient Angle
                    </span>
                    <span className="font-mono text-[var(--studio-primary)] tabular-nums">
                      {videoTheme.gradientAngle}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={videoTheme.gradientAngle}
                    onChange={(e) =>
                      updateVideoField('gradientAngle', Number(e.target.value))
                    }
                    className="w-full accent-[var(--studio-primary)] cursor-pointer"
                  />
                </div>

                <label className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-[var(--studio-text)]">
                      Animated Gradient Motion
                    </p>
                    <p className="text-[11px] text-[var(--studio-muted)]">
                      Subtly sweeps aurora gradient and glow inside exported video
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={videoTheme.animatedGradient}
                    onChange={(e) =>
                      updateVideoField('animatedGradient', e.target.checked)
                    }
                    className="h-5 w-5 accent-[var(--studio-primary)] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {videoGroup === 'typography' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ColorControlField
                label="Birthday Heading Start"
                value={videoTheme.titleColor}
                defaultValue={DEFAULT_VIDEO_THEME.titleColor}
                onChange={(hex) => updateVideoField('titleColor', hex)}
              />
              <ColorControlField
                label="Birthday Heading End"
                value={videoTheme.titleGradientEnd}
                defaultValue={DEFAULT_VIDEO_THEME.titleGradientEnd}
                onChange={(hex) => updateVideoField('titleGradientEnd', hex)}
              />
              <ColorControlField
                label="Wishes & Body Text"
                value={videoTheme.textColor}
                defaultValue={DEFAULT_VIDEO_THEME.textColor}
                onChange={(hex) => updateVideoField('textColor', hex)}
              />
              <ColorControlField
                label="Subtitle & Captions"
                value={videoTheme.subtitleColor}
                defaultValue={DEFAULT_VIDEO_THEME.subtitleColor}
                onChange={(hex) => updateVideoField('subtitleColor', hex)}
              />
            </div>
          )}

          {videoGroup === 'frames' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ColorControlField
                label="Photo Frame Primary"
                value={videoTheme.photoFrameColor}
                defaultValue={DEFAULT_VIDEO_THEME.photoFrameColor}
                onChange={(hex) => updateVideoField('photoFrameColor', hex)}
              />
              <ColorControlField
                label="Inner Frame Highlight"
                value={videoTheme.photoFrameAccentColor}
                defaultValue={DEFAULT_VIDEO_THEME.photoFrameAccentColor}
                onChange={(hex) =>
                  updateVideoField('photoFrameAccentColor', hex)
                }
              />
              <ColorControlField
                label="Light Flash / Transition"
                value={videoTheme.transitionEffectColor}
                defaultValue={DEFAULT_VIDEO_THEME.transitionEffectColor}
                onChange={(hex) =>
                  updateVideoField('transitionEffectColor', hex)
                }
              />
            </div>
          )}

          {videoGroup === 'celebration' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ColorControlField
                label="Confetti Color 1"
                value={videoTheme.confettiColors[0]}
                defaultValue={DEFAULT_VIDEO_THEME.confettiColors[0]}
                onChange={(hex) => updateVideoTuple('confettiColors', 0, hex)}
              />
              <ColorControlField
                label="Confetti Color 2"
                value={videoTheme.confettiColors[1]}
                defaultValue={DEFAULT_VIDEO_THEME.confettiColors[1]}
                onChange={(hex) => updateVideoTuple('confettiColors', 1, hex)}
              />
              <ColorControlField
                label="Confetti Color 3"
                value={videoTheme.confettiColors[2]}
                defaultValue={DEFAULT_VIDEO_THEME.confettiColors[2]}
                onChange={(hex) => updateVideoTuple('confettiColors', 2, hex)}
              />
              <ColorControlField
                label="Balloon Color 1"
                value={videoTheme.balloonColors[0]}
                defaultValue={DEFAULT_VIDEO_THEME.balloonColors[0]}
                onChange={(hex) => updateVideoTuple('balloonColors', 0, hex)}
              />
              <ColorControlField
                label="Balloon Color 2"
                value={videoTheme.balloonColors[1]}
                defaultValue={DEFAULT_VIDEO_THEME.balloonColors[1]}
                onChange={(hex) => updateVideoTuple('balloonColors', 1, hex)}
              />
              <ColorControlField
                label="Balloon Color 3"
                value={videoTheme.balloonColors[2]}
                defaultValue={DEFAULT_VIDEO_THEME.balloonColors[2]}
                onChange={(hex) => updateVideoTuple('balloonColors', 2, hex)}
              />
            </div>
          )}

          {videoGroup === 'cake' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ColorControlField
                label="Cake Base Tier"
                value={videoTheme.cakeTier1Color}
                defaultValue={DEFAULT_VIDEO_THEME.cakeTier1Color}
                onChange={(hex) => updateVideoField('cakeTier1Color', hex)}
              />
              <ColorControlField
                label="Cake Middle Tier"
                value={videoTheme.cakeTier2Color}
                defaultValue={DEFAULT_VIDEO_THEME.cakeTier2Color}
                onChange={(hex) => updateVideoField('cakeTier2Color', hex)}
              />
              <ColorControlField
                label="Cake Top Tier"
                value={videoTheme.cakeTier3Color}
                defaultValue={DEFAULT_VIDEO_THEME.cakeTier3Color}
                onChange={(hex) => updateVideoField('cakeTier3Color', hex)}
              />
              <ColorControlField
                label="Cake Icing & Beads"
                value={videoTheme.cakeIcingColor}
                defaultValue={DEFAULT_VIDEO_THEME.cakeIcingColor}
                onChange={(hex) => updateVideoField('cakeIcingColor', hex)}
              />
              <ColorControlField
                label="Cake Stand & Pedestal"
                value={videoTheme.cakeStandColor}
                defaultValue={DEFAULT_VIDEO_THEME.cakeStandColor}
                onChange={(hex) => updateVideoField('cakeStandColor', hex)}
              />
            </div>
          )}

          {videoGroup === 'effects' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ColorControlField
                label="Particle Primary"
                value={videoTheme.particleColor}
                defaultValue={DEFAULT_VIDEO_THEME.particleColor}
                onChange={(hex) => updateVideoField('particleColor', hex)}
              />
              <ColorControlField
                label="Particle Secondary"
                value={videoTheme.particleSecondaryColor}
                defaultValue={DEFAULT_VIDEO_THEME.particleSecondaryColor}
                onChange={(hex) =>
                  updateVideoField('particleSecondaryColor', hex)
                }
              />
              <ColorControlField
                label="Light & Halo Glow"
                value={videoTheme.glowColor}
                defaultValue={DEFAULT_VIDEO_THEME.glowColor}
                onChange={(hex) => updateVideoField('glowColor', hex)}
              />
              <ColorControlField
                label="Firework Burst 1"
                value={videoTheme.fireworksColors[0]}
                defaultValue={DEFAULT_VIDEO_THEME.fireworksColors[0]}
                onChange={(hex) => updateVideoTuple('fireworksColors', 0, hex)}
              />
              <ColorControlField
                label="Firework Burst 2"
                value={videoTheme.fireworksColors[1]}
                defaultValue={DEFAULT_VIDEO_THEME.fireworksColors[1]}
                onChange={(hex) => updateVideoTuple('fireworksColors', 1, hex)}
              />
              <ColorControlField
                label="Firework Burst 3"
                value={videoTheme.fireworksColors[2]}
                defaultValue={DEFAULT_VIDEO_THEME.fireworksColors[2]}
                onChange={(hex) => updateVideoTuple('fireworksColors', 2, hex)}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. 6-Mode Live Theme Preview Stage */}
      <div className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--studio-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--studio-heading)]">
              Live Theme Preview Stage
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PREVIEW_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  previewMode === m.id
                    ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] font-semibold'
                    : 'bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-soft)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {previewMode === 'website' ? (
          /* Miniature Interactive Website UI Specimen */
          <div
            className="rounded-xl border p-5 transition-all"
            style={{
              background: `linear-gradient(${websiteTheme.gradientAngle}deg, ${websiteTheme.gradientStart} 0%, ${websiteTheme.backgroundColor} 55%, ${websiteTheme.gradientEnd} 100%)`,
              borderColor: websiteTheme.borderColor,
              color: websiteTheme.textColor,
            }}
          >
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{
                backgroundColor: websiteTheme.cardBackgroundColor,
                borderColor: websiteTheme.borderColor,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: websiteTheme.primaryColor }}
                  >
                    Website Appearance Preview
                  </p>
                  <h4
                    className="font-display text-xl font-semibold"
                    style={{ color: websiteTheme.headingColor }}
                  >
                    {websiteTheme.name}
                  </h4>
                </div>
                <span
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
                  style={{
                    background: `linear-gradient(110deg, ${websiteTheme.buttonColor} 0%, ${websiteTheme.buttonSecondaryColor} 100%)`,
                    color: websiteTheme.buttonTextColor,
                  }}
                >
                  Primary CTA
                </span>
              </div>
              <p className="text-xs" style={{ color: websiteTheme.mutedTextColor }}>
                Body copy and secondary labels adapt automatically for high-contrast readability across dark and light palettes.
              </p>
            </div>
          </div>
        ) : (
          /* Real-time Rendered Video Scene Canvas */
          <div className="rounded-xl overflow-hidden border border-[var(--studio-border)] bg-black max-w-2xl mx-auto shadow-xl">
            <canvas
              ref={previewCanvasRef}
              width={640}
              height={360}
              className="w-full h-auto block"
            />
          </div>
        )}

        {/* Active HEX Color Readout Strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
          {activeHexSummary.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] px-2.5 py-1.5 flex items-center gap-2 min-w-0"
            >
              <span
                className="h-4 w-4 rounded-md border border-white/25 shrink-0"
                style={{ backgroundColor: item.hex }}
              />
              <div className="min-w-0 leading-tight">
                <p className="text-[10px] text-[var(--studio-muted)] truncate">
                  {item.label}
                </p>
                <p className="text-[11px] font-mono text-[var(--studio-text)] uppercase truncate">
                  {item.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
