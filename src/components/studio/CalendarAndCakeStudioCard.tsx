import {
  Cake,
  CalendarDays,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CakeEffectsToggles,
  CakeInteractionState,
  CakeShowConfig,
  CalendarCountingSpeed,
  CalendarIntroConfig,
  CalendarTransitionEffect,
  DEFAULT_CAKE_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  StudioProjectConfig,
} from '../../types';
import {
  formatBirthdayLabel,
  getMonthName,
} from '../../utils/calendarDateUtils';
import { drawAdvancedCakeScene } from '../../utils/videoCakeScene';
import { drawCalendarIntroScene } from '../../utils/videoCalendarScene';
import { createParticleSeeds } from '../../utils/videoCanvasScene';
import { ColorControlField } from './ColorControlField';

interface CalendarAndCakeStudioCardProps {
  config: StudioProjectConfig;
  onChangeCalendarConfig: (next: CalendarIntroConfig) => void;
  onChangeCakeConfig: (next: CakeShowConfig) => void;
}

const COUNTING_SPEED_OPTIONS: { id: CalendarCountingSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'fast', label: 'Fast' },
];

const CALENDAR_TRANSITION_OPTIONS: {
  id: CalendarTransitionEffect;
  label: string;
}[] = [
  { id: 'golden-rays', label: 'Golden Light Rays' },
  { id: 'particle-burst', label: 'Particle Burst' },
  { id: 'iris-zoom', label: 'Iris Zoom' },
  { id: 'curtain-fade', label: 'Velvet Fade' },
];

const CAKE_EFFECT_ITEMS: { key: keyof CakeEffectsToggles; label: string }[] = [
  { key: 'bubbles', label: 'Floating Bubbles' },
  { key: 'sparklingStars', label: 'Sparkling Stars' },
  { key: 'glowingParticles', label: 'Glowing Particles' },
  { key: 'confetti', label: 'Celebration Confetti' },
  { key: 'lightRays', label: 'Magical Light Rays' },
  { key: 'floatingHearts', label: 'Floating Hearts' },
  { key: 'glowCircles', label: 'Soft Bokeh Circles' },
  { key: 'fireworks', label: 'Firework Bursts' },
  { key: 'glitter', label: 'Frosting Glitter' },
  { key: 'decorations', label: 'Balloons & Ribbons' },
];

export function CalendarAndCakeStudioCard({
  config,
  onChangeCalendarConfig,
  onChangeCakeConfig,
}: CalendarAndCakeStudioCardProps) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'cake'>('calendar');
  const [calPlaying, setCalPlaying] = useState(true);
  const [calProgress, setCalProgress] = useState(0.5);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const seeds = useMemo(() => createParticleSeeds(150), []);

  // Local interactive clock & state for real-time Cake Stage experiments
  const [cakeClockSec, setCakeClockSec] = useState(0);
  const [cakeState, setCakeState] = useState<CakeInteractionState>({
    extinguished: false,
    extinguishedAtSec: null,
    cut: false,
    cutAtSec: null,
  });

  const calCfg = config.calendarConfig;
  const cakeCfg = config.cakeConfig;

  // Real-time mini stage animation loop (Calendar Intro or Interactive Cake Stage)
  useEffect(() => {
    let rafId = 0;
    let lastPerf = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastPerf) / 1000);
      lastPerf = now;

      if (activeTab === 'calendar' && calPlaying) {
        const span = Math.max(3, calCfg.durationSec || 6);
        setCalProgress((prev) => {
          const next = prev + dt / span;
          return next >= 1 ? 0 : next;
        });
      } else if (activeTab === 'cake') {
        setCakeClockSec((prev) => prev + dt);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, calPlaying, calCfg.durationSec]);

  // Draw mini stage canvas smoothly whenever clock/state/config updates
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTab === 'calendar') {
      const calTime = calProgress * Math.max(3, calCfg.durationSec || 6);
      drawCalendarIntroScene(ctx, canvas.width, canvas.height, calProgress, calTime, config, seeds);
    } else {
      drawAdvancedCakeScene(ctx, canvas.width, canvas.height, config, seeds, {
        t: cakeClockSec,
        localP: 0.5,
        cakeState,
        interactionClockSec: cakeClockSec,
        allowAutoVideoTriggers: false,
        drawStandaloneBackdrop: true,
      });
    }
  }, [activeTab, calProgress, cakeClockSec, cakeState, config, seeds, calCfg.durationSec]);

  const handleToggleEffect = (key: keyof CakeEffectsToggles) => {
    onChangeCakeConfig({
      ...cakeCfg,
      effects: {
        ...cakeCfg.effects,
        [key]: !cakeCfg.effects[key],
      },
    });
  };

  const handleSetAllEffects = (enabled: boolean) => {
    const nextEffects = { ...cakeCfg.effects };
    (Object.keys(nextEffects) as (keyof CakeEffectsToggles)[]).forEach((k) => {
      nextEffects[k] = enabled;
    });
    onChangeCakeConfig({ ...cakeCfg, effects: nextEffects });
  };

  const handleToggleExtinguish = () => {
    setCakeState((prev) =>
      prev.extinguished
        ? { ...prev, extinguished: false, extinguishedAtSec: null }
        : { ...prev, extinguished: true, extinguishedAtSec: cakeClockSec },
    );
  };

  const handleToggleCutCake = () => {
    setCakeState((prev) =>
      prev.cut
        ? { ...prev, cut: false, cutAtSec: null }
        : { ...prev, cut: true, cutAtSec: cakeClockSec },
    );
  };

  const handleResetCakeStage = () => {
    setCakeState({
      extinguished: false,
      extinguishedAtSec: null,
      cut: false,
      cutAtSec: null,
    });
  };

  const birthdaySummary = formatBirthdayLabel(
    config.birthdayMonth,
    config.birthdayDay,
    config.birthdayYear,
  );

  return (
    <section
      id="section-calendar-cake"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20 space-y-5"
    >
      {/* Header + Studio Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--studio-border-soft)] pb-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
            Section B · Opening &amp; Climax
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
            Calendar Intro &amp; Cake Show Studio
          </h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            Configure the animated opening birthday countdown calendar and interactive luxury cake effects.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] shadow-sm'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Calendar Intro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cake')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'cake'
                ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] shadow-sm'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Cake className="h-3.5 w-3.5" />
            <span>Cake Show</span>
          </button>
        </div>
      </div>

      {/* Real-Time Stage Preview Window */}
      <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-semibold text-[var(--studio-heading)]">
            {activeTab === 'calendar'
              ? `Live Calendar Stage · ${getMonthName(config.birthdayMonth)} ${config.birthdayDay}`
              : 'Interactive Cake Celebration Stage'}
          </span>
          <span className="text-[11px] font-mono tabular-nums text-[var(--studio-muted)]">
            {activeTab === 'calendar'
              ? `${birthdaySummary} · ${calCfg.enabled ? 'Active in Video' : 'Skipped'}`
              : `${Object.values(cakeCfg.effects).filter(Boolean).length}/10 Effects Active`}
          </span>
        </div>

        <div className="w-full overflow-hidden rounded-lg border border-[var(--studio-border-soft)] bg-black aspect-[16/9]">
          <canvas
            ref={stageCanvasRef}
            width={960}
            height={540}
            className="w-full h-full block"
          />
        </div>

        {/* Stage Transport or Interactive Cake Buttons */}
        {activeTab === 'calendar' ? (
          <div className="flex flex-wrap items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => setCalPlaying((p) => !p)}
              className="h-8 px-3 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {calPlaying ? (
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
                setCalProgress(0);
                setCalPlaying(true);
              }}
              className="h-8 px-3 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay Counting</span>
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={calProgress}
              aria-label="Calendar stage scrubber"
              onChange={(e) => {
                setCalPlaying(false);
                setCalProgress(Number(e.target.value));
              }}
              className="flex-1 min-w-[120px] accent-[var(--studio-primary)] cursor-pointer"
            />

            <span className="text-[11px] font-mono tabular-nums text-[var(--studio-muted)]">
              {Math.round(calProgress * 100)}%
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleExtinguish}
                className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  cakeState.extinguished
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                    : 'border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border-strong)]'
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
                <span>
                  {cakeState.extinguished
                    ? 'Relight Candles'
                    : 'Extinguish Candles'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleCutCake}
                className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  cakeState.cut
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                    : 'border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-text)] hover:border-[var(--studio-border-strong)]'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>{cakeState.cut ? 'Reset Slice' : 'Cut Cake'}</span>
              </button>
            </div>

            {(cakeState.extinguished || cakeState.cut) && (
              <button
                type="button"
                onClick={handleResetCakeStage}
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Cake State</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: CALENDAR INTRO SETTINGS */}
      {activeTab === 'calendar' && (
        <div className="space-y-5">
          {/* Enable + Sound + Weekdays Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 flex items-center justify-between gap-2 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-[var(--studio-text)]">
                  Enable Calendar Intro
                </p>
                <p className="text-[11px] text-[var(--studio-muted)]">
                  Opens every generated video
                </p>
              </div>
              <input
                type="checkbox"
                checked={calCfg.enabled}
                onChange={(e) =>
                  onChangeCalendarConfig({ ...calCfg, enabled: e.target.checked })
                }
                className="h-4 w-4 accent-[var(--studio-primary)]"
              />
            </label>

            <label className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 flex items-center justify-between gap-2 cursor-pointer">
              <div className="flex items-center gap-2 min-w-0">
                {calCfg.enableSoundEffects ? (
                  <Volume2 className="h-4 w-4 text-[var(--studio-primary)] shrink-0" />
                ) : (
                  <VolumeX className="h-4 w-4 text-[var(--studio-muted)] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--studio-text)] truncate">
                    Calendar SFX
                  </p>
                  <p className="text-[11px] text-[var(--studio-muted)] truncate">
                    Date tick &amp; reveal chime
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={calCfg.enableSoundEffects}
                onChange={(e) =>
                  onChangeCalendarConfig({
                    ...calCfg,
                    enableSoundEffects: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-[var(--studio-primary)]"
              />
            </label>

            <label className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 flex items-center justify-between gap-2 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-[var(--studio-text)]">
                  Weekday Row
                </p>
                <p className="text-[11px] text-[var(--studio-muted)]">
                  Show SUN – SAT headers
                </p>
              </div>
              <input
                type="checkbox"
                checked={calCfg.showWeekdays}
                onChange={(e) =>
                  onChangeCalendarConfig({
                    ...calCfg,
                    showWeekdays: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-[var(--studio-primary)]"
              />
            </label>
          </div>

          {/* Duration, Speed, and Transition */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--studio-muted)]">
                  Calendar Duration
                </span>
                <span className="text-xs font-mono font-semibold tabular-nums text-[var(--studio-primary)]">
                  {calCfg.durationSec.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={10}
                step={0.5}
                value={calCfg.durationSec}
                onChange={(e) =>
                  onChangeCalendarConfig({
                    ...calCfg,
                    durationSec: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />
            </div>

            <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-2">
              <span className="block text-xs font-medium text-[var(--studio-muted)]">
                Counting Speed
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {COUNTING_SPEED_OPTIONS.map((opt) => {
                  const active = calCfg.countingSpeed === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChangeCalendarConfig({
                          ...calCfg,
                          countingSpeed: opt.id,
                        })
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                        active
                          ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                          : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-2">
              <label
                htmlFor="calendar-exit-transition"
                className="block text-xs font-medium text-[var(--studio-muted)]"
              >
                Transition to Celebration
              </label>
              <select
                id="calendar-exit-transition"
                value={calCfg.transitionEffect}
                onChange={(e) =>
                  onChangeCalendarConfig({
                    ...calCfg,
                    transitionEffect: e.target.value as CalendarTransitionEffect,
                  })
                }
                className="w-full h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-2.5 text-xs font-medium text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
              >
                {CALENDAR_TRANSITION_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Color Studio */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-[var(--studio-heading)]">
                Calendar Palette Customization
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeCalendarConfig({ ...DEFAULT_CALENDAR_CONFIG })
                }
                className="text-[11px] font-medium text-[var(--studio-muted)] hover:text-[var(--studio-primary)] cursor-pointer"
              >
                Reset Calendar Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ColorControlField
                label="Scene Backdrop"
                value={calCfg.calendarBgColor}
                defaultValue={DEFAULT_CALENDAR_CONFIG.calendarBgColor}
                onChange={(calendarBgColor) =>
                  onChangeCalendarConfig({ ...calCfg, calendarBgColor })
                }
              />
              <ColorControlField
                label="Calendar Card"
                value={calCfg.calendarColor}
                defaultValue={DEFAULT_CALENDAR_CONFIG.calendarColor}
                onChange={(calendarColor) =>
                  onChangeCalendarConfig({ ...calCfg, calendarColor })
                }
              />
              <ColorControlField
                label="Metallic Accents"
                value={calCfg.calendarAccentColor}
                defaultValue={DEFAULT_CALENDAR_CONFIG.calendarAccentColor}
                onChange={(calendarAccentColor) =>
                  onChangeCalendarConfig({ ...calCfg, calendarAccentColor })
                }
              />
              <ColorControlField
                label="Birthday Highlight"
                value={calCfg.highlightColor}
                defaultValue={DEFAULT_CALENDAR_CONFIG.highlightColor}
                onChange={(highlightColor) =>
                  onChangeCalendarConfig({ ...calCfg, highlightColor })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAKE SHOW SETTINGS */}
      {activeTab === 'cake' && (
        <div className="space-y-5">
          {/* Intensity, Speed & Auto Video Climax Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--studio-muted)]">
                  Particle &amp; Effect Density
                </span>
                <span className="text-xs font-mono tabular-nums text-[var(--studio-primary)]">
                  {Math.round(cakeCfg.animationIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.4}
                max={1.6}
                step={0.1}
                value={cakeCfg.animationIntensity}
                onChange={(e) =>
                  onChangeCakeConfig({
                    ...cakeCfg,
                    animationIntensity: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-[var(--studio-muted)]">
                  Animation Motion Speed
                </span>
                <span className="text-xs font-mono tabular-nums text-[var(--studio-primary)]">
                  {cakeCfg.animationSpeed.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.8}
                step={0.1}
                value={cakeCfg.animationSpeed}
                onChange={(e) =>
                  onChangeCakeConfig({
                    ...cakeCfg,
                    animationSpeed: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />
            </div>

            <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 space-y-3">
              <p className="text-xs font-semibold text-[var(--studio-heading)]">
                Exported Video Climax Cues
              </p>

              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-[var(--studio-text)]">
                    Auto-Extinguish Candles at Cake Finale
                  </p>
                  <p className="text-[11px] text-[var(--studio-muted)]">
                    Smoothly blows out candles with rising smoke wisps
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={cakeCfg.autoExtinguishInVideo}
                  onChange={(e) =>
                    onChangeCakeConfig({
                      ...cakeCfg,
                      autoExtinguishInVideo: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[var(--studio-primary)]"
                />
              </label>

              <label className="flex items-center justify-between gap-2 cursor-pointer pt-1 border-t border-[var(--studio-border-soft)]">
                <div>
                  <p className="text-xs font-medium text-[var(--studio-text)]">
                    Auto-Cut Cake Slice Reveal in Video
                  </p>
                  <p className="text-[11px] text-[var(--studio-muted)]">
                    Slides out a slice wedge with confetti celebration
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={cakeCfg.autoCutInVideo}
                  onChange={(e) =>
                    onChangeCakeConfig({
                      ...cakeCfg,
                      autoCutInVideo: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[var(--studio-primary)]"
                />
              </label>
            </div>
          </div>

          {/* 10 Individual Cake Effects Toggles */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold text-[var(--studio-heading)] inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
                <span>Coordinated Cake Effects (10 Layers)</span>
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSetAllEffects(true)}
                  className="text-[var(--studio-primary)] hover:underline cursor-pointer"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllEffects(false)}
                  className="text-[var(--studio-muted)] hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CAKE_EFFECT_ITEMS.map((item) => {
                const active = cakeCfg.effects[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggleEffect(item.key)}
                    className={`px-2.5 py-2 rounded-lg border text-left text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                        : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cake & Effect Colors */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-[var(--studio-heading)]">
                Cake &amp; Celebration Effect Colors
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeCakeConfig({
                    ...DEFAULT_CAKE_CONFIG,
                    effects: { ...DEFAULT_CAKE_CONFIG.effects },
                  })
                }
                className="text-[11px] font-medium text-[var(--studio-muted)] hover:text-[var(--studio-primary)] cursor-pointer"
              >
                Reset Cake Colors
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ColorControlField
                label="Cake Frosting"
                value={cakeCfg.cakeColor}
                defaultValue={DEFAULT_CAKE_CONFIG.cakeColor}
                onChange={(cakeColor) =>
                  onChangeCakeConfig({ ...cakeCfg, cakeColor })
                }
              />
              <ColorControlField
                label="Ribbon & Stand"
                value={cakeCfg.ribbonColor}
                defaultValue={DEFAULT_CAKE_CONFIG.ribbonColor}
                onChange={(ribbonColor) =>
                  onChangeCakeConfig({ ...cakeCfg, ribbonColor })
                }
              />
              <ColorControlField
                label="Candles"
                value={cakeCfg.candleColor}
                defaultValue={DEFAULT_CAKE_CONFIG.candleColor}
                onChange={(candleColor) =>
                  onChangeCakeConfig({ ...cakeCfg, candleColor })
                }
              />
              <ColorControlField
                label="Bubbles Tint"
                value={cakeCfg.bubbleColor}
                defaultValue={DEFAULT_CAKE_CONFIG.bubbleColor}
                onChange={(bubbleColor) =>
                  onChangeCakeConfig({ ...cakeCfg, bubbleColor })
                }
              />
              <ColorControlField
                label="Star Glow"
                value={cakeCfg.starColor}
                defaultValue={DEFAULT_CAKE_CONFIG.starColor}
                onChange={(starColor) =>
                  onChangeCakeConfig({ ...cakeCfg, starColor })
                }
              />
              <ColorControlField
                label="Particles & Hearts"
                value={cakeCfg.particleColor}
                defaultValue={DEFAULT_CAKE_CONFIG.particleColor}
                onChange={(particleColor) =>
                  onChangeCakeConfig({ ...cakeCfg, particleColor })
                }
              />
              <ColorControlField
                label="Confetti Gold"
                value={cakeCfg.confettiColor}
                defaultValue={DEFAULT_CAKE_CONFIG.confettiColor}
                onChange={(confettiColor) =>
                  onChangeCakeConfig({ ...cakeCfg, confettiColor })
                }
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
