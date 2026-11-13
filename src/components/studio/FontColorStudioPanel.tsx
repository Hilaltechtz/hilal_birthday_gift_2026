import { Palette, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FONT_COLORS,
  DEFAULT_TEXT_COLOR_STYLE,
  FONT_COLOR_ELEMENT_META,
  FONT_COLOR_PRESETS,
  FontColorFillMode,
  FontColorStudioConfig,
  StudioProjectConfig,
  TextColorElementId,
  TextColorStyleConfig,
} from '../../types';
import {
  hexToRgb,
  hexToRgba,
  normalizeHex,
  rgbToHex,
} from '../../utils/themeColorUtils';
import {
  buildFontColorFillStyle,
  drawStyledTextLine,
  wrapStyledTextLines,
} from '../../utils/videoTextAnimations';

interface FontColorStudioPanelProps {
  config: StudioProjectConfig;
  onChangeFontColors: (next: FontColorStudioConfig) => void;
}

export function FontColorStudioPanel({
  config,
  onChangeFontColors,
}: FontColorStudioPanelProps) {
  const [selectedId, setSelectedId] = useState<TextColorElementId>('mainTitle');
  const [activeGradientStop, setActiveGradientStop] = useState<'start' | 'end'>(
    'start',
  );
  const [hexDraft, setHexDraft] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fontColors: FontColorStudioConfig = useMemo(
    () => ({
      ...DEFAULT_FONT_COLORS,
      ...(config.fontColors || {}),
    }),
    [config.fontColors],
  );

  const currentStyle: TextColorStyleConfig = {
    ...DEFAULT_TEXT_COLOR_STYLE,
    ...(fontColors[selectedId] || {}),
  };

  // Which hex slot is bound to the primary HEX / RGB editor
  const activePrimaryHex =
    currentStyle.mode === 'gradient'
      ? activeGradientStop === 'start'
        ? currentStyle.gradientStart
        : currentStyle.gradientEnd
      : currentStyle.solidColor;

  useEffect(() => {
    setHexDraft(activePrimaryHex);
  }, [activePrimaryHex, selectedId, currentStyle.mode, activeGradientStop]);

  const rgb = hexToRgb(activePrimaryHex);

  const getSampleTextForElement = (id: TextColorElementId): string => {
    switch (id) {
      case 'mainTitle':
        return (
          config.messages.announcementHeadline.trim() ||
          `HAPPY BIRTHDAY, ${config.recipientName.toUpperCase()}!`
        );
      case 'recipientName':
        return config.recipientName.trim().toUpperCase() || 'SALMA';
      case 'birthdayWishes':
        return (
          config.messages.wishes[0]?.trim() ||
          'May every new chapter bring you joy and endless blessings.'
        );
      case 'specialMessage':
        return (
          config.messages.specialMessage.trim() ||
          'YOU ARE SPECIAL. KEEP SHINING!'
        );
      case 'senderName':
        return config.messages.senderName.trim() || 'YOUR FRIEND';
      case 'openingMessage':
        return (
          config.messages.openingMessage.trim() ||
          'THIS SPECIAL MOMENT IS FOR YOU...'
        );
      case 'greetingAndDate':
        return (
          config.personalGreeting.trim() ||
          config.birthdayDate.trim() ||
          'April 7'
        );
      case 'closingPrefix':
        return (
          config.messages.finalMessage.trim() ||
          'WITH LOVE AND BEST WISHES FROM'
        );
      case 'photoCaption':
        return (
          config.photos[0]?.caption.trim() ||
          'Quiet mornings filled with golden warmth'
        );
    }
  };

  const updateCurrentStyle = (patch: Partial<TextColorStyleConfig>) => {
    onChangeFontColors({
      ...fontColors,
      [selectedId]: {
        ...currentStyle,
        ...patch,
      },
    });
  };

  const applyPrimaryHexUpdate = (rawHex: string) => {
    const clean = normalizeHex(rawHex, activePrimaryHex);
    if (currentStyle.mode === 'gradient') {
      updateCurrentStyle(
        activeGradientStop === 'start'
          ? { mode: 'gradient', gradientStart: clean }
          : { mode: 'gradient', gradientEnd: clean },
      );
    } else {
      updateCurrentStyle({ mode: 'solid', solidColor: clean });
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(val) || 0));
    const nextRgb = { ...rgb, [channel]: clamped };
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    applyPrimaryHexUpdate(nextHex);
  };

  const handleResetElement = () => {
    onChangeFontColors({
      ...fontColors,
      [selectedId]: { ...DEFAULT_TEXT_COLOR_STYLE },
    });
  };

  const handleResetAll = () => {
    onChangeFontColors({
      mainTitle: { ...DEFAULT_TEXT_COLOR_STYLE },
      recipientName: { ...DEFAULT_TEXT_COLOR_STYLE },
      birthdayWishes: { ...DEFAULT_TEXT_COLOR_STYLE },
      specialMessage: { ...DEFAULT_TEXT_COLOR_STYLE },
      senderName: { ...DEFAULT_TEXT_COLOR_STYLE },
      openingMessage: { ...DEFAULT_TEXT_COLOR_STYLE },
      greetingAndDate: { ...DEFAULT_TEXT_COLOR_STYLE },
      closingPrefix: { ...DEFAULT_TEXT_COLOR_STYLE },
      photoCaption: { ...DEFAULT_TEXT_COLOR_STYLE },
    });
  };

  // Render authentic real-time Canvas preview matching exported video colors/outlines/glows
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

    // Subtle radial glow
    const rg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.48);
    rg.addColorStop(0, hexToRgba(theme.backgroundGlow, 0.25));
    rg.addColorStop(1, hexToRgba(theme.backgroundPrimary, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    const sampleText = getSampleTextForElement(selectedId);
    const isUppercase =
      selectedId === 'mainTitle' ||
      selectedId === 'recipientName' ||
      selectedId === 'specialMessage' ||
      selectedId === 'senderName' ||
      selectedId === 'openingMessage' ||
      selectedId === 'closingPrefix';
    const renderedStr = isUppercase ? sampleText.toUpperCase() : sampleText;
    const baseSize =
      selectedId === 'recipientName'
        ? 44
        : selectedId === 'mainTitle' || selectedId === 'senderName'
          ? 34
          : 26;

    ctx.save();
    ctx.font = `${selectedId === 'photoCaption' || selectedId === 'birthdayWishes' ? 'italic ' : ''}600 ${baseSize}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapStyledTextLines(ctx, renderedStr, w * 0.86).slice(0, 3);
    const lineH = baseSize * 1.24;
    const totalH = lines.length * lineH;
    const startY = h * 0.5 - totalH * 0.5 + lineH * 0.5;

    const themeDefaultGrad = ctx.createLinearGradient(
      w * 0.2,
      h * 0.25,
      w * 0.8,
      h * 0.75,
    );
    themeDefaultGrad.addColorStop(0, theme.titleColor);
    themeDefaultGrad.addColorStop(0.5, theme.textColor);
    themeDefaultGrad.addColorStop(1, theme.titleGradientEnd);

    const fillStyle = buildFontColorFillStyle(
      ctx,
      currentStyle,
      w * 0.16,
      h * 0.28,
      w * 0.84,
      h * 0.72,
      themeDefaultGrad,
    );

    lines.forEach((line, idx) => {
      drawStyledTextLine(
        ctx,
        line,
        w * 0.5,
        startY + idx * lineH,
        baseSize,
        fillStyle,
        currentStyle,
        theme.glowColor,
        currentStyle.glowIntensity,
      );
    });
    ctx.restore();
  }, [
    selectedId,
    currentStyle,
    config.videoTheme,
    config.recipientName,
    config.birthdayDate,
    config.personalGreeting,
    config.messages,
    config.photos,
  ]);

  const activeMeta =
    FONT_COLOR_ELEMENT_META.find((m) => m.id === selectedId) ??
    FONT_COLOR_ELEMENT_META[0];

  return (
    <div
      id="font-color-studio"
      className="mt-6 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] p-4 sm:p-5 space-y-4 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--studio-border-soft)] pb-3.5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--studio-primary)] inline-flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            <span>Independent Typography Palette</span>
          </p>
          <h3 className="mt-1 text-lg sm:text-xl font-semibold text-[var(--studio-heading)]">
            FONT COLOR STUDIO
          </h3>
          <p className="mt-0.5 text-xs text-[var(--studio-muted)]">
            Independently customize solid, gradient, or rainbow colors, HEX/RGB values, outlines, shadows, and glow for every video text element.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetElement}
            className="h-8 px-3 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-input)] text-xs font-medium text-[var(--studio-text)] hover:border-[var(--studio-primary)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Element</span>
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="h-8 px-3 rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
          >
            Reset All to Default
          </button>
        </div>
      </div>

      {/* Independent Text Element Selector Pills */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--studio-muted)]">
          Select Text Element
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FONT_COLOR_ELEMENT_META.map((item) => {
            const st = fontColors[item.id] || DEFAULT_TEXT_COLOR_STYLE;
            const isSelected = selectedId === item.id;
            const hasCustom =
              st.mode !== 'theme' ||
              st.outlineWidth > 0 ||
              st.glowColor !== DEFAULT_TEXT_COLOR_STYLE.glowColor ||
              st.shadowColor !== DEFAULT_TEXT_COLOR_STYLE.shadowColor;

            const dotBg =
              st.mode === 'rainbow'
                ? 'linear-gradient(90deg, #FF5E7E, #FBBF24, #34D399, #38BDF8, #C084FC)'
                : st.mode === 'gradient'
                  ? `linear-gradient(135deg, ${st.gradientStart}, ${st.gradientEnd})`
                  : st.mode === 'solid'
                    ? st.solidColor
                    : config.videoTheme.titleColor;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-text)] hover:border-[var(--studio-border)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-white/40 shrink-0"
                  style={{ background: dotBg }}
                />
                <span>{item.label}</span>
                {hasCustom && !isSelected && (
                  <span className="text-[10px] text-[var(--studio-primary)]">•</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Canvas */}
      <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--studio-text)]">
            Live Preview · {activeMeta.label}
          </span>
          <span className="text-[11px] font-mono text-[var(--studio-primary)] uppercase">
            {currentStyle.mode === 'theme'
              ? 'Theme Default'
              : currentStyle.mode}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={760}
          height={180}
          className="w-full aspect-[38/9] rounded-lg border border-[var(--studio-border-soft)] bg-black block"
        />
      </div>

      {/* Quick Presets Row */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--studio-muted)]">
          Quick Color Presets
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {FONT_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => updateCurrentStyle(preset.patch)}
              className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] hover:border-[var(--studio-primary)] px-2.5 py-2 flex items-center gap-2 text-xs font-semibold text-[var(--studio-text)] cursor-pointer transition-colors"
            >
              <span
                className="h-4 w-4 rounded-full border border-white/40 shrink-0"
                style={{ background: preset.swatch }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fill Mode + HEX / RGB / Gradient Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Fill Mode + Primary Color Picker + HEX + RGB */}
        <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--studio-heading)]">
              Text Fill &amp; Color Values
            </span>
            <div className="inline-flex rounded-lg border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-0.5">
              {(
                [
                  { id: 'theme', label: 'Theme' },
                  { id: 'solid', label: 'Solid' },
                  { id: 'gradient', label: 'Gradient' },
                  { id: 'rainbow', label: 'Rainbow' },
                ] as { id: FontColorFillMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateCurrentStyle({ mode: m.id })}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                    currentStyle.mode === m.id
                      ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                      : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {currentStyle.mode === 'gradient' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveGradientStop('start')}
                className={`flex-1 h-8 rounded-lg border px-2 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer ${
                  activeGradientStop === 'start'
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)]'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded border border-white/40"
                  style={{ backgroundColor: currentStyle.gradientStart }}
                />
                <span>Start Color</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGradientStop('end')}
                className={`flex-1 h-8 rounded-lg border px-2 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer ${
                  activeGradientStop === 'end'
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)]'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded border border-white/40"
                  style={{ backgroundColor: currentStyle.gradientEnd }}
                />
                <span>End Color</span>
              </button>
            </div>
          )}

          {/* Picker + HEX + R / G / B */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <label className="block text-[10px] font-medium text-[var(--studio-muted)] mb-1">
                Picker
              </label>
              <input
                type="color"
                aria-label={`${activeMeta.label} color picker`}
                value={activePrimaryHex}
                onChange={(e) => applyPrimaryHexUpdate(e.target.value)}
                className="w-full h-9 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer"
              />
            </div>

            <div className="col-span-4">
              <label
                htmlFor="font-color-hex-input"
                className="block text-[10px] font-medium text-[var(--studio-muted)] mb-1"
              >
                HEX
              </label>
              <input
                id="font-color-hex-input"
                type="text"
                value={hexDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  setHexDraft(val);
                  if (/^#?[0-9a-fA-F]{6}$/.test(val.trim())) {
                    applyPrimaryHexUpdate(val);
                  }
                }}
                onBlur={() => {
                  const normalized = normalizeHex(hexDraft, activePrimaryHex);
                  setHexDraft(normalized);
                  applyPrimaryHexUpdate(normalized);
                }}
                placeholder="#E8C574"
                className="w-full h-9 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] px-2 text-xs font-mono uppercase text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
              />
            </div>

            <div className="col-span-5 grid grid-cols-3 gap-1">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <div key={ch}>
                  <label
                    htmlFor={`font-color-rgb-${ch}`}
                    className="block text-[10px] font-medium text-[var(--studio-muted)] uppercase mb-1 text-center"
                  >
                    {ch}
                  </label>
                  <input
                    id={`font-color-rgb-${ch}`}
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[ch]}
                    onChange={(e) => handleRgbChange(ch, Number(e.target.value))}
                    className="w-full h-9 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] px-1.5 text-center text-xs font-mono tabular-nums text-[var(--studio-text)]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Text Outline, Text Shadow, Glow Color & Glow Strength */}
        <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-input)] p-3.5 space-y-3">
          <span className="block text-xs font-semibold text-[var(--studio-heading)]">
            Outline, Shadow &amp; Glow Styling
          </span>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-medium text-[var(--studio-muted)] mb-1">
                Outline Color
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  aria-label="Text outline color"
                  value={currentStyle.outlineColor}
                  onChange={(e) =>
                    updateCurrentStyle({
                      outlineColor: e.target.value,
                      outlineWidth:
                        currentStyle.outlineWidth > 0 ? currentStyle.outlineWidth : 1.5,
                    })
                  }
                  className="h-8 w-9 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer shrink-0"
                />
                <span className="text-[10px] font-mono text-[var(--studio-muted)] truncate">
                  {currentStyle.outlineColor}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[var(--studio-muted)] mb-1">
                Shadow Color
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  aria-label="Text shadow color"
                  value={currentStyle.shadowColor}
                  onChange={(e) =>
                    updateCurrentStyle({ shadowColor: e.target.value })
                  }
                  className="h-8 w-9 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer shrink-0"
                />
                <span className="text-[10px] font-mono text-[var(--studio-muted)] truncate">
                  {currentStyle.shadowColor}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[var(--studio-muted)] mb-1">
                Glow Color
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  aria-label="Text glow color"
                  value={currentStyle.glowColor}
                  onChange={(e) =>
                    updateCurrentStyle({ glowColor: e.target.value })
                  }
                  className="h-8 w-9 rounded-lg border border-[var(--studio-border)] bg-transparent cursor-pointer shrink-0"
                />
                <span className="text-[10px] font-mono text-[var(--studio-muted)] truncate">
                  {currentStyle.glowColor}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[var(--studio-muted)]">Outline Width</span>
                <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                  {currentStyle.outlineWidth.toFixed(1)}px
                </span>
              </div>
              <input
                type="range"
                aria-label="Text outline width"
                min={0}
                max={4}
                step={0.5}
                value={currentStyle.outlineWidth}
                onChange={(e) =>
                  updateCurrentStyle({ outlineWidth: Number(e.target.value) })
                }
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[var(--studio-muted)] inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[var(--studio-primary)]" />
                  <span>Glow Strength</span>
                </span>
                <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                  {Math.round(currentStyle.glowIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Text glow intensity"
                min={0}
                max={1.6}
                step={0.05}
                value={currentStyle.glowIntensity}
                onChange={(e) =>
                  updateCurrentStyle({ glowIntensity: Number(e.target.value) })
                }
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
