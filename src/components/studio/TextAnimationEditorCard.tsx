import { Copy, Pause, Play, RotateCcw, Sparkles, Type } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SENDER_INTRO_ANIMATION,
  DEFAULT_SENDER_NAME_ANIMATION,
  DEFAULT_SPECIAL_MESSAGE_ANIMATION,
  DEFAULT_WISH_ANIMATION_PRESETS,
  FontColorStudioConfig,
  StudioMessages,
  StudioProjectConfig,
  TEXT_ANIMATION_CATALOG,
  TEXT_FONT_OPTIONS,
  TextAnimationConfig,
  TextAnimationType,
  TextColorMode,
  TextFontFamily,
  TextPositionMode,
} from '../../types';
import { hexToRgba } from '../../utils/themeColorUtils';
import { createParticleSeeds } from '../../utils/videoCanvasScene';
import { drawAnimatedTextBlock } from '../../utils/videoTextAnimations';
import { FontColorStudioPanel } from './FontColorStudioPanel';

interface TextAnimationEditorCardProps {
  config: StudioProjectConfig;
  onChangeMessages: (next: StudioMessages) => void;
  onChangeFontColors: (next: FontColorStudioConfig) => void;
  onSyncTextTarget?: (targetId: string) => void;
}

type TargetSelection =
  | { kind: 'wish'; index: number }
  | { kind: 'special' }
  | { kind: 'senderIntro' }
  | { kind: 'senderName' };

export function TextAnimationEditorCard({
  config,
  onChangeMessages,
  onChangeFontColors,
}: TextAnimationEditorCardProps) {
  const wishes =
    config.messages.wishes.length > 0
      ? config.messages.wishes
      : ['Wishing you joy, health, and endless blessings.'];

  const [target, setTarget] = useState<TargetSelection>({ kind: 'wish', index: 0 });
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewClockSec, setPreviewClockSec] = useState(0);
  const [appliedFlash, setAppliedFlash] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seeds = useMemo(() => createParticleSeeds(150), []);

  // Ensure selected wish index stays valid when wishes are added/removed
  useEffect(() => {
    if (target.kind === 'wish' && target.index >= wishes.length) {
      setTarget({ kind: 'wish', index: Math.max(0, wishes.length - 1) });
    }
  }, [wishes.length, target]);

  const getCurrentConfig = (): TextAnimationConfig => {
    if (target.kind === 'wish') {
      return {
        ...DEFAULT_WISH_ANIMATION_PRESETS[
          target.index % DEFAULT_WISH_ANIMATION_PRESETS.length
        ],
        ...(config.messages.wishAnimations?.[target.index] || {}),
      };
    }
    if (target.kind === 'special') {
      return {
        ...DEFAULT_SPECIAL_MESSAGE_ANIMATION,
        ...(config.messages.specialMessageAnimation || {}),
      };
    }
    if (target.kind === 'senderIntro') {
      return {
        ...DEFAULT_SENDER_INTRO_ANIMATION,
        ...(config.messages.senderIntroAnimation || {}),
      };
    }
    return {
      ...DEFAULT_SENDER_NAME_ANIMATION,
      ...(config.messages.senderNameAnimation || {}),
    };
  };

  const getCurrentText = (): string => {
    if (target.kind === 'wish') {
      return (
        wishes[target.index]?.trim() ||
        'Wishing you joy, health, and endless blessings.'
      );
    }
    if (target.kind === 'special') {
      return (
        config.messages.specialMessage.trim() ||
        'YOU ARE SPECIAL. KEEP SHINING!'
      );
    }
    if (target.kind === 'senderIntro') {
      return (
        config.messages.finalMessage.trim() ||
        'WITH LOVE AND BEST WISHES FROM'
      );
    }
    return config.messages.senderName.trim() || 'YOUR FRIEND';
  };

  const activeAnim = getCurrentConfig();
  const activeText = getCurrentText();

  const updateCurrentAnim = (patch: Partial<TextAnimationConfig>) => {
    const nextCfg: TextAnimationConfig = { ...activeAnim, ...patch };
    if (target.kind === 'wish') {
      const nextWishAnims = wishes.map((_, idx) =>
        idx === target.index
          ? nextCfg
          : {
              ...DEFAULT_WISH_ANIMATION_PRESETS[
                idx % DEFAULT_WISH_ANIMATION_PRESETS.length
              ],
              ...(config.messages.wishAnimations?.[idx] || {}),
            },
      );
      onChangeMessages({ ...config.messages, wishAnimations: nextWishAnims });
    } else if (target.kind === 'special') {
      onChangeMessages({
        ...config.messages,
        specialMessageAnimation: nextCfg,
      });
    } else if (target.kind === 'senderIntro') {
      onChangeMessages({
        ...config.messages,
        senderIntroAnimation: nextCfg,
      });
    } else {
      onChangeMessages({
        ...config.messages,
        senderNameAnimation: nextCfg,
      });
    }
  };

  const handleApplyToAllWishes = () => {
    const nextWishAnims = wishes.map(() => ({ ...activeAnim }));
    onChangeMessages({
      ...config.messages,
      wishAnimations: nextWishAnims,
    });
    setAppliedFlash(true);
    window.setTimeout(() => setAppliedFlash(false), 1600);
  };

  // Real-time mini animation preview loop
  const cycleDur = Math.max(2.6, activeAnim.displayDurationSec || 4.0);
  useEffect(() => {
    if (!previewPlaying) return;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setPreviewClockSec((prev) => {
        const next = prev + dt;
        return next >= cycleDur ? 0 : next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [previewPlaying, cycleDur]);

  // Paint live text animation preview onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const theme = config.videoTheme;

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, theme.backgroundPrimary);
    bg.addColorStop(0.55, theme.backgroundSecondary);
    bg.addColorStop(1, theme.backgroundPrimary);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle ambient stars
    const minDim = Math.min(w, h);
    for (let i = 0; i < 24; i++) {
      const s = seeds[i % seeds.length];
      ctx.fillStyle = hexToRgba(theme.particleColor, 0.25 + 0.4 * s.size);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, minDim * 0.003, 0, Math.PI * 2);
      ctx.fill();
    }

    const targetColorStyle =
      target.kind === 'wish'
        ? config.fontColors?.birthdayWishes
        : target.kind === 'special'
          ? config.fontColors?.specialMessage
          : target.kind === 'senderIntro'
            ? config.fontColors?.closingPrefix
            : config.fontColors?.senderName;

    drawAnimatedTextBlock(ctx, {
      width: w,
      height: h,
      t: previewClockSec,
      elapsedInSegment: previewClockSec,
      segmentDuration: cycleDur,
      text: activeText,
      anim: activeAnim,
      theme,
      colorStyle: targetColorStyle,
      baseFontSize:
        target.kind === 'senderName'
          ? minDim * 0.115
          : target.kind === 'senderIntro'
            ? minDim * 0.056
            : minDim * 0.082,
      maxWidth: w * 0.84,
      defaultY: h * 0.5,
      italic: target.kind === 'wish',
      quoted: target.kind === 'wish',
      uppercase: target.kind !== 'wish',
      seeds,
      showRuleLines: target.kind === 'wish',
    });
  }, [previewClockSec, cycleDur, activeText, activeAnim, target, config.videoTheme, config.fontColors, seeds]);

  return (
    <section
      id="section-text-animations"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20 space-y-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--studio-border-soft)] pb-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
            Section D2 · Motion Typography
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
            Cinematic Text Animation Studio
          </h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            Assign independent entrance/exit animations, typography, glows, and positions to each birthday message.
          </p>
        </div>

        {target.kind === 'wish' && wishes.length > 1 && (
          <button
            type="button"
            onClick={handleApplyToAllWishes}
            className="h-9 px-3.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-semibold text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{appliedFlash ? 'Applied to All Wishes' : 'Apply to All Wishes'}</span>
          </button>
        )}
      </div>

      {/* Independent Message Target Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {wishes.map((_, idx) => {
          const isActive = target.kind === 'wish' && target.index === idx;
          return (
            <button
              key={`wish-tab-${idx}`}
              type="button"
              onClick={() => {
                setTarget({ kind: 'wish', index: idx });
                setPreviewClockSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isActive
                  ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                  : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Wish {idx + 1}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setTarget({ kind: 'special' });
            setPreviewClockSec(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            target.kind === 'special'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          Special Message
        </button>

        <button
          type="button"
          onClick={() => {
            setTarget({ kind: 'senderIntro' });
            setPreviewClockSec(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            target.kind === 'senderIntro'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          Sender Intro Line
        </button>

        <button
          type="button"
          onClick={() => {
            setTarget({ kind: 'senderName' });
            setPreviewClockSec(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            target.kind === 'senderName'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          Sender Name Reveal
        </button>
      </div>

      {/* Live Mini Animation Stage */}
      <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-3 space-y-2.5">
        <div className="w-full overflow-hidden rounded-lg border border-[var(--studio-border-soft)] bg-black aspect-[16/7]">
          <canvas
            ref={canvasRef}
            width={800}
            height={350}
            className="w-full h-full block"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 px-1">
          <button
            type="button"
            onClick={() => setPreviewPlaying((p) => !p)}
            className="h-8 px-3 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-text)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            {previewPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setPreviewClockSec(0);
              setPreviewPlaying(true);
            }}
            className="h-8 px-3 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-text)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay Entrance</span>
          </button>

          <input
            type="range"
            min={0}
            max={cycleDur}
            step={0.04}
            value={previewClockSec}
            aria-label="Text preview scrubber"
            onChange={(e) => {
              setPreviewPlaying(false);
              setPreviewClockSec(Number(e.target.value));
            }}
            className="flex-1 min-w-[120px] accent-[var(--studio-primary)] cursor-pointer"
          />

          <span className="text-[11px] font-mono tabular-nums text-[var(--studio-muted)]">
            {previewClockSec.toFixed(1)}s / {cycleDur.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Entrance + Exit Animation Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="text-anim-entrance"
            className="block text-xs font-medium text-[var(--studio-muted)] mb-1.5"
          >
            Entrance Transition (15 Styles)
          </label>
          <select
            id="text-anim-entrance"
            value={activeAnim.entrance}
            onChange={(e) => {
              updateCurrentAnim({ entrance: e.target.value as TextAnimationType });
              setPreviewClockSec(0);
              setPreviewPlaying(true);
            }}
            className="w-full h-10 rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3 text-xs sm:text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
          >
            {TEXT_ANIMATION_CATALOG.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="text-anim-exit"
            className="block text-xs font-medium text-[var(--studio-muted)] mb-1.5"
          >
            Exit Transition
          </label>
          <select
            id="text-anim-exit"
            value={activeAnim.exit}
            onChange={(e) => {
              updateCurrentAnim({ exit: e.target.value as TextAnimationType });
              setPreviewClockSec(Math.max(0, cycleDur - activeAnim.exitDurationSec - 0.15));
              setPreviewPlaying(true);
            }}
            className="w-full h-10 rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3 text-xs sm:text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
          >
            {TEXT_ANIMATION_CATALOG.map((item) => (
              <option key={item.id} value={item.id}>
                {item.exitLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timing & Motion Speed Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--studio-muted)]">Entrance Speed/Dur</span>
            <span className="font-mono tabular-nums text-[var(--studio-primary)]">
              {activeAnim.entranceDurationSec.toFixed(2)}s
            </span>
          </div>
          <input
            type="range"
            min={0.35}
            max={2.2}
            step={0.05}
            value={activeAnim.entranceDurationSec}
            onChange={(e) =>
              updateCurrentAnim({ entranceDurationSec: Number(e.target.value) })
            }
            className="w-full accent-[var(--studio-primary)] cursor-pointer"
          />
        </div>

        <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--studio-muted)]">Display Weight</span>
            <span className="font-mono tabular-nums text-[var(--studio-primary)]">
              {activeAnim.displayDurationSec.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={2.0}
            max={10.0}
            step={0.5}
            value={activeAnim.displayDurationSec}
            onChange={(e) =>
              updateCurrentAnim({ displayDurationSec: Number(e.target.value) })
            }
            className="w-full accent-[var(--studio-primary)] cursor-pointer"
          />
        </div>

        <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--studio-muted)]">Animation Speed</span>
            <span className="font-mono tabular-nums text-[var(--studio-primary)]">
              {activeAnim.speed.toFixed(1)}×
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={activeAnim.speed}
            onChange={(e) =>
              updateCurrentAnim({ speed: Number(e.target.value) })
            }
            className="w-full accent-[var(--studio-primary)] cursor-pointer"
          />
        </div>
      </div>

      {/* Typography, Colors, Glow, Particles & Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        <div>
          <label
            htmlFor="text-font-family"
            className="block text-xs font-medium text-[var(--studio-muted)] mb-1.5 inline-flex items-center gap-1"
          >
            <Type className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
            <span>Font Family</span>
          </label>
          <select
            id="text-font-family"
            value={activeAnim.fontFamily}
            onChange={(e) =>
              updateCurrentAnim({ fontFamily: e.target.value as TextFontFamily })
            }
            className="w-full h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-2.5 text-xs text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
          >
            {TEXT_FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="text-size-scale"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-1.5"
            >
              Size ({Math.round(activeAnim.fontSizeScale * 100)}%)
            </label>
            <input
              id="text-size-scale"
              type="range"
              min={0.75}
              max={1.45}
              step={0.05}
              value={activeAnim.fontSizeScale}
              onChange={(e) =>
                updateCurrentAnim({ fontSizeScale: Number(e.target.value) })
              }
              className="w-full h-9 accent-[var(--studio-primary)] cursor-pointer"
            />
          </div>

          <div>
            <label
              htmlFor="text-font-weight"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-1.5"
            >
              Weight
            </label>
            <select
              id="text-font-weight"
              value={activeAnim.fontWeight}
              onChange={(e) =>
                updateCurrentAnim({
                  fontWeight: e.target.value as TextAnimationConfig['fontWeight'],
                })
              }
              className="w-full h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-2 text-xs font-mono text-[var(--studio-text)]"
            >
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">SemiBold (600)</option>
              <option value="700">Bold (700)</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="text-position-mode"
            className="block text-xs font-medium text-[var(--studio-muted)] mb-1.5"
          >
            Text Vertical Position
          </label>
          <div className="flex items-center gap-2">
            <select
              id="text-position-mode"
              value={activeAnim.position}
              onChange={(e) =>
                updateCurrentAnim({ position: e.target.value as TextPositionMode })
              }
              className="flex-1 h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-2.5 text-xs text-[var(--studio-text)]"
            >
              <option value="top">Upper Frame</option>
              <option value="center">Default Centered</option>
              <option value="lower">Lower Frame</option>
              <option value="custom">Custom Y%</option>
            </select>
            {activeAnim.position === 'custom' && (
              <input
                type="number"
                min={18}
                max={85}
                value={Math.round((activeAnim.customYFrac || 0.5) * 100)}
                onChange={(e) => {
                  const pct = Math.max(18, Math.min(85, Number(e.target.value) || 50));
                  updateCurrentAnim({ customYFrac: pct / 100 });
                }}
                aria-label="Custom vertical position percentage"
                className="w-16 h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-2 text-xs font-mono tabular-nums text-[var(--studio-text)]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Color Mode, Glow Intensity & Particles Row */}
      <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--studio-muted)]">
            Text Fill Style
          </span>
          <div className="flex items-center gap-2">
            <select
              aria-label="Text color mode"
              value={activeAnim.colorMode}
              onChange={(e) =>
                updateCurrentAnim({ colorMode: e.target.value as TextColorMode })
              }
              className="flex-1 h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-2.5 text-xs text-[var(--studio-text)]"
            >
              <option value="theme">Theme Palette</option>
              <option value="gradient">Luxury Gradient</option>
              <option value="custom">Solid Custom</option>
            </select>

            {activeAnim.colorMode === 'custom' && (
              <input
                type="color"
                aria-label="Custom solid text color"
                value={activeAnim.customColor}
                onChange={(e) => updateCurrentAnim({ customColor: e.target.value })}
                className="h-9 w-10 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer"
              />
            )}

            {activeAnim.colorMode === 'gradient' && (
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  aria-label="Gradient start color"
                  value={activeAnim.gradientStartColor}
                  onChange={(e) =>
                    updateCurrentAnim({ gradientStartColor: e.target.value })
                  }
                  className="h-9 w-8 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer"
                />
                <input
                  type="color"
                  aria-label="Gradient end color"
                  value={activeAnim.gradientEndColor}
                  onChange={(e) =>
                    updateCurrentAnim({ gradientEndColor: e.target.value })
                  }
                  className="h-9 w-8 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--studio-text)]">
              <input
                type="checkbox"
                checked={activeAnim.enableGlow}
                onChange={(e) =>
                  updateCurrentAnim({ enableGlow: e.target.checked })
                }
                className="h-4 w-4 accent-[var(--studio-primary)]"
              />
              <span>Text Glow</span>
            </label>
            <span className="font-mono tabular-nums text-[var(--studio-primary)]">
              {Math.round(activeAnim.glowIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            disabled={!activeAnim.enableGlow}
            value={activeAnim.glowIntensity}
            onChange={(e) =>
              updateCurrentAnim({ glowIntensity: Number(e.target.value) })
            }
            className="w-full accent-[var(--studio-primary)] cursor-pointer disabled:opacity-40"
          />
        </div>

        <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-input)] px-3 py-2.5 cursor-pointer">
          <span className="text-xs font-medium text-[var(--studio-text)] inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
            <span>Particle Sparks on Reveal</span>
          </span>
          <input
            type="checkbox"
            checked={activeAnim.enableParticles}
            onChange={(e) =>
              updateCurrentAnim({ enableParticles: e.target.checked })
            }
            className="h-4 w-4 accent-[var(--studio-primary)]"
          />
        </label>
      </div>

      {/* FONT COLOR STUDIO */}
      <FontColorStudioPanel
        config={config}
        onChangeFontColors={onChangeFontColors}
      />
    </section>
  );
}
