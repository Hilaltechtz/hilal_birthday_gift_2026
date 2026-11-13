import {
  DEFAULT_TEXT_ANIMATION,
  DEFAULT_TEXT_COLOR_STYLE,
  DEFAULT_VIDEO_THEME,
  TEXT_FONT_OPTIONS,
  TextAnimationConfig,
  TextAnimationType,
  TextColorStyleConfig,
  VideoThemeConfig,
} from '../types';
import { blendHex, hexToRgba } from './themeColorUtils';

export interface TextParticleSeed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  speed: number;
  colorIdx: number;
  rot: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(x: number): number {
  const t = clamp01(x);
  const c1 = 1.6;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    const ia = a + Math.PI / 4;
    ctx.lineTo(Math.cos(ia) * r * 0.28, Math.sin(ia) * r * 0.28);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function resolveCanvasFontFamily(fontFamily: TextAnimationConfig['fontFamily']): string {
  const found = TEXT_FONT_OPTIONS.find((f) => f.id === fontFamily);
  return found ? found.cssFamily : '"Cormorant Garamond", Georgia, serif';
}

export function wrapStyledTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export interface AnimatedTextRenderParams {
  width: number;
  height: number;
  t: number;
  elapsedInSegment: number;
  segmentDuration: number;
  text: string;
  anim: TextAnimationConfig;
  theme?: VideoThemeConfig;
  colorStyle?: TextColorStyleConfig;
  baseFontSize: number;
  maxWidth: number;
  defaultY: number;
  italic?: boolean;
  uppercase?: boolean;
  quoted?: boolean;
  beatPulse?: number;
  seeds: TextParticleSeed[];
  showRuleLines?: boolean;
  allowContinuousExit?: boolean;
}

export function buildFontColorFillStyle(
  ctx: CanvasRenderingContext2D,
  style: TextColorStyleConfig | undefined,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fallbackFill: string | CanvasGradient,
): string | CanvasGradient {
  if (!style || style.mode === 'theme') return fallbackFill;
  if (style.mode === 'solid') return style.solidColor || '#FFFFFF';
  if (style.mode === 'gradient') {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const start = style.gradientStart || '#F7D97E';
    const end = style.gradientEnd || '#F5B8D0';
    g.addColorStop(0, start);
    g.addColorStop(0.5, blendHex(start, '#FFFFFF', 0.28));
    g.addColorStop(1, end);
    return g;
  }
  // 'rainbow'
  const rg = ctx.createLinearGradient(x0, y0, x1, y1);
  rg.addColorStop(0, '#FF5E7E');
  rg.addColorStop(0.25, '#FBBF24');
  rg.addColorStop(0.5, '#34D399');
  rg.addColorStop(0.75, '#38BDF8');
  rg.addColorStop(1, '#C084FC');
  return rg;
}

/**
 * Draws a line of text honoring outline stroke, drop shadow, glow, and fillStyle.
 */
export function drawStyledTextLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  fontSize: number,
  fillStyle: string | CanvasGradient,
  colorStyle?: TextColorStyleConfig,
  defaultGlowColor = '#E8C574',
  defaultGlowStrength = 0.8,
) {
  const hasCustomStyle = Boolean(colorStyle);
  const effectiveGlowStr = hasCustomStyle
    ? (colorStyle!.glowIntensity ?? defaultGlowStrength)
    : defaultGlowStrength;
  const effectiveGlowCol =
    hasCustomStyle &&
    (colorStyle!.glowColor !== DEFAULT_TEXT_COLOR_STYLE.glowColor ||
      colorStyle!.mode !== 'theme')
      ? colorStyle!.glowColor
      : defaultGlowColor;

  // Optional custom dark drop shadow layer
  if (
    hasCustomStyle &&
    colorStyle!.shadowColor &&
    colorStyle!.shadowColor !== DEFAULT_TEXT_COLOR_STYLE.shadowColor
  ) {
    ctx.save();
    ctx.shadowColor = hexToRgba(colorStyle!.shadowColor, 0.85);
    ctx.shadowBlur = Math.max(4, fontSize * 0.14);
    ctx.shadowOffsetX = Math.max(1, fontSize * 0.03);
    ctx.shadowOffsetY = Math.max(1.5, fontSize * 0.045);
    ctx.fillStyle = colorStyle!.shadowColor;
    ctx.fillText(line, x, y);
    ctx.restore();
  }

  ctx.save();
  if (effectiveGlowStr > 0.05) {
    ctx.shadowColor = hexToRgba(
      effectiveGlowCol,
      Math.min(0.95, 0.38 * effectiveGlowStr),
    );
    ctx.shadowBlur = Math.max(6, fontSize * 0.24 * effectiveGlowStr);
  } else {
    ctx.shadowBlur = 0;
  }

  // Outer stroke outline before fill so letter interiors remain sharp
  if (hasCustomStyle && (colorStyle!.outlineWidth ?? 0) > 0.05) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = colorStyle!.outlineColor || '#16072B';
    ctx.lineWidth = Math.max(
      1.2,
      colorStyle!.outlineWidth * Math.max(1.2, fontSize / 20),
    );
    ctx.strokeText(line, x, y);
  }

  ctx.fillStyle = fillStyle;
  ctx.fillText(line, x, y);
  ctx.restore();
}

export function getTextAnimationLabel(type: TextAnimationType): string {
  const map: Record<TextAnimationType, string> = {
    'fade-in': 'Elegant Fade In',
    'zoom-in': 'Cinematic Zoom In',
    'slide-up': 'Smooth Slide Up',
    'slide-left': 'Smooth Slide Left',
    'slide-right': 'Smooth Slide Right',
    'golden-particle': 'Golden Particle Reveal',
    typewriter: 'Typewriter Animation',
    'blur-focus': 'Blur to Focus',
    'flip-3d': '3D Flip Text',
    'letter-reveal': 'Letter-by-Letter Reveal',
    'glowing-reveal': 'Glowing Text Reveal',
    'light-sweep': 'Cinematic Light Sweep',
    'scale-fade': 'Scale and Fade',
    'split-reveal': 'Split Text Reveal',
    floating: 'Floating Text Animation',
  };
  return map[type] || 'Elegant Fade In';
}

/**
 * Computes position center Y based on TextPositionMode preset or customYFrac.
 */
export function resolveTextCenterY(
  anim: TextAnimationConfig,
  height: number,
  defaultY: number,
): number {
  if (anim.position === 'top') return height * 0.25;
  if (anim.position === 'lower') return height * 0.74;
  if (anim.position === 'custom') return height * clamp01(anim.customYFrac || 0.5);
  return defaultY;
}

/**
 * Renders animated text cleanly across all 15 entrance & exit motion styles
 * on any 2D Canvas (Live Studio Preview, Text Editor Mini-Preview, and Export).
 */
export function drawAnimatedTextBlock(
  ctx: CanvasRenderingContext2D,
  params: AnimatedTextRenderParams,
) {
  const {
    width,
    height,
    t,
    elapsedInSegment,
    segmentDuration,
    text,
    anim: rawAnim,
    theme = DEFAULT_VIDEO_THEME,
    colorStyle,
    baseFontSize,
    maxWidth,
    defaultY,
    italic = false,
    uppercase = false,
    quoted = false,
    beatPulse = 0,
    seeds,
    showRuleLines = false,
    allowContinuousExit = true,
  } = params;

  if (elapsedInSegment < 0 || elapsedInSegment > segmentDuration + 0.05) return;

  const anim: TextAnimationConfig = { ...DEFAULT_TEXT_ANIMATION, ...rawAnim };
  const rawDisplayText = text.trim();
  if (!rawDisplayText) return;

  const finalStr = uppercase
    ? rawDisplayText.toUpperCase()
    : quoted
      ? `“${rawDisplayText}”`
      : rawDisplayText;

  const speedMult = Math.max(0.45, Math.min(2.0, anim.speed || 1));
  const inDur = Math.min(
    segmentDuration * 0.45,
    Math.max(0.25, (anim.entranceDurationSec || 0.9) / speedMult),
  );
  const outDur = allowContinuousExit
    ? Math.min(
        segmentDuration * 0.38,
        Math.max(0.25, (anim.exitDurationSec || 0.65) / speedMult),
      )
    : 0;

  let phase: 'in' | 'hold' | 'out' = 'hold';
  let activeEffect: TextAnimationType = anim.entrance;
  // visP runs 0 -> 1 on entrance, stays 1 during hold, runs 1 -> 0 on exit
  let visP = 1;

  if (elapsedInSegment < inDur) {
    phase = 'in';
    activeEffect = anim.entrance;
    visP = clamp01(elapsedInSegment / inDur);
  } else if (allowContinuousExit && segmentDuration - elapsedInSegment < outDur) {
    phase = 'out';
    activeEffect = anim.exit;
    visP = clamp01((segmentDuration - elapsedInSegment) / outDur);
  } else {
    phase = 'hold';
    activeEffect = anim.entrance;
    visP = 1;
  }

  const minDim = Math.min(width, height);
  const fontSize = Math.round(
    baseFontSize * Math.max(0.7, Math.min(1.5, anim.fontSizeScale || 1)),
  );
  const fontFamilyCss = resolveCanvasFontFamily(anim.fontFamily);
  const italicPrefix =
    italic && anim.fontFamily !== 'great-vibes' ? 'italic ' : '';
  const fontSpec = `${italicPrefix}${anim.fontWeight || '600'} ${fontSize}px ${fontFamilyCss}`;

  ctx.save();
  ctx.font = fontSpec;
  const lines = wrapStyledTextLines(ctx, finalStr, maxWidth);
  if (lines.length === 0) {
    ctx.restore();
    return;
  }

  const lineHeight = fontSize * (anim.fontFamily === 'great-vibes' ? 1.35 : 1.24);
  const totalH = lines.length * lineHeight;
  const centerX = width * 0.5;
  const centerY = resolveTextCenterY(anim, height, defaultY);

  // Subtle ambient levitation for 'floating' animation (or subtle beat breath)
  let offsetX = 0;
  let offsetY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let alpha = 1;
  let blurPx = 0;
  let maskMode: 'none' | 'particle-wipe' | 'split' | 'typewriter' | 'letter' =
    'none';
  let maskP = 1;

  const eased = easeOutCubic(visP);

  // Beat pulse gently breathes scale & glow without jittering readability
  const beatBoost = beatPulse * 0.028;

  if (phase === 'hold') {
    alpha = 1;
    scaleX = scaleY = 1 + beatBoost;
    if (anim.entrance === 'floating') {
      offsetY = Math.sin(t * 1.9 * speedMult) * minDim * 0.014;
    }
  } else {
    const dir = phase === 'out' ? -1 : 1;
    switch (activeEffect) {
      case 'fade-in':
        alpha = eased;
        offsetY = (1 - eased) * minDim * 0.015 * dir;
        break;

      case 'zoom-in':
        alpha = eased;
        scaleX = scaleY =
          phase === 'in' ? 0.74 + eased * 0.26 : 1.24 - eased * 0.24;
        break;

      case 'slide-up':
        alpha = eased;
        offsetY =
          phase === 'in'
            ? (1 - eased) * minDim * 0.085
            : -(1 - eased) * minDim * 0.085;
        break;

      case 'slide-left':
        alpha = eased;
        offsetX =
          phase === 'in'
            ? (1 - eased) * width * 0.22
            : -(1 - eased) * width * 0.22;
        break;

      case 'slide-right':
        alpha = eased;
        offsetX =
          phase === 'in'
            ? -(1 - eased) * width * 0.22
            : (1 - eased) * width * 0.22;
        break;

      case 'golden-particle':
        alpha = clamp01(eased * 1.25);
        maskMode = 'particle-wipe';
        maskP = eased;
        break;

      case 'typewriter':
        alpha = phase === 'out' ? eased : 1;
        maskMode = 'typewriter';
        maskP = phase === 'in' ? visP : eased;
        break;

      case 'blur-focus':
        alpha = eased;
        blurPx = (1 - eased) * 14;
        scaleX = scaleY = 1.06 - eased * 0.06;
        break;

      case 'flip-3d': {
        alpha = clamp01(eased * 1.4);
        scaleY = Math.max(0.04, Math.sin(eased * Math.PI * 0.5));
        scaleX = 0.92 + eased * 0.08;
        break;
      }

      case 'letter-reveal':
        alpha = phase === 'out' ? eased : 1;
        maskMode = 'letter';
        maskP = eased;
        break;

      case 'glowing-reveal':
        alpha = eased;
        scaleX = scaleY = 0.94 + eased * 0.06;
        break;

      case 'light-sweep':
        alpha = eased;
        maskMode = 'none';
        break;

      case 'scale-fade': {
        const back = easeOutBack(visP);
        alpha = eased;
        scaleX = scaleY =
          phase === 'in' ? 0.8 + back * 0.2 : 0.8 + eased * 0.2;
        break;
      }

      case 'split-reveal':
        alpha = clamp01(eased * 1.3);
        maskMode = 'split';
        maskP = eased;
        break;

      case 'floating':
        alpha = eased;
        offsetY =
          (phase === 'in' ? (1 - eased) : -(1 - eased)) * minDim * 0.06 +
          Math.sin(t * 2.0 * speedMult) * minDim * 0.012;
        break;
    }
    scaleX += beatBoost;
    scaleY += beatBoost;
  }

  if (alpha <= 0.01) {
    ctx.restore();
    return;
  }

  // Optional decorative top & bottom rule lines (classic Birthday Wishes framing)
  if (showRuleLines) {
    const lineW = minDim * 0.24 * Math.min(1, alpha * 1.2);
    const padY = Math.max(totalH * 0.5 + minDim * 0.045, minDim * 0.14);
    ctx.save();
    ctx.globalAlpha *= alpha * 0.68;
    ctx.strokeStyle = theme.photoFrameColor;
    ctx.lineWidth = Math.max(1.5, minDim * 0.0025);
    ctx.beginPath();
    ctx.moveTo(centerX - lineW * 0.5, centerY - padY);
    ctx.lineTo(centerX + lineW * 0.5, centerY - padY);
    ctx.moveTo(centerX - lineW * 0.5, centerY + padY);
    ctx.lineTo(centerX + lineW * 0.5, centerY + padY);
    ctx.stroke();
    ctx.restore();
  }

  // Measure widest line for sweep / particle bounds
  const widestLine = Math.max(
    minDim * 0.3,
    ...lines.map((l) => ctx.measureText(l).width),
  );

  // Transform around text center
  ctx.translate(centerX + offsetX, centerY + offsetY);
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha *= clamp01(alpha);

  if (blurPx > 0.35 && 'filter' in ctx) {
    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
  }

  // Clipping masks for 'particle-wipe' and 'split-reveal'
  if (maskMode === 'particle-wipe') {
    const leftEdge = -widestLine * 0.56 - 20;
    const totalW = widestLine * 1.12 + 40;
    ctx.beginPath();
    ctx.rect(leftEdge, -totalH * 0.7 - 20, totalW * maskP, totalH * 1.4 + 40);
    ctx.clip();
  } else if (maskMode === 'split') {
    const halfSpan = (totalH * 0.65 + 24) * maskP;
    ctx.beginPath();
    ctx.rect(-widestLine * 0.65, -halfSpan, widestLine * 1.3, halfSpan * 2);
    ctx.clip();
  }

  // Resolve fill color / gradient / light-sweep shimmer
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fillStyle: string | CanvasGradient = theme.textColor;
  if (colorStyle && colorStyle.mode !== 'theme') {
    fillStyle = buildFontColorFillStyle(
      ctx,
      colorStyle,
      -widestLine * 0.5,
      -totalH * 0.4,
      widestLine * 0.5,
      totalH * 0.4,
      theme.textColor,
    );
  } else if (anim.colorMode === 'custom') {
    fillStyle = anim.customColor || theme.textColor;
  } else if (anim.colorMode === 'gradient') {
    const g = ctx.createLinearGradient(-widestLine * 0.5, -totalH * 0.4, widestLine * 0.5, totalH * 0.4);
    g.addColorStop(0, anim.gradientStartColor || theme.titleColor);
    g.addColorStop(0.5, '#FFFFFF');
    g.addColorStop(1, anim.gradientEndColor || theme.titleGradientEnd);
    fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(-widestLine * 0.45, -totalH * 0.3, widestLine * 0.45, totalH * 0.3);
    g.addColorStop(0, theme.textColor);
    g.addColorStop(0.55, '#FFFFFF');
    g.addColorStop(1, theme.titleColor);
    fillStyle = g;
  }

  // Light-Sweep dynamic bright metallic gleam across text fill
  if (activeEffect === 'light-sweep' && phase !== 'hold') {
    const sweepCenter = -0.3 + (phase === 'in' ? 1 - visP : visP) * 1.6;
    const lg = ctx.createLinearGradient(-widestLine * 0.55, 0, widestLine * 0.55, 0);
    const baseCol =
      colorStyle && colorStyle.mode === 'solid'
        ? colorStyle.solidColor
        : colorStyle && colorStyle.mode === 'gradient'
          ? colorStyle.gradientStart
          : anim.colorMode === 'custom'
            ? anim.customColor
            : anim.colorMode === 'gradient'
              ? anim.gradientStartColor
              : theme.titleColor;
    const endCol =
      colorStyle && colorStyle.mode === 'solid'
        ? colorStyle.solidColor
        : colorStyle && colorStyle.mode === 'gradient'
          ? colorStyle.gradientEnd
          : anim.colorMode === 'gradient'
            ? anim.gradientEndColor
            : theme.textColor;
    lg.addColorStop(0, baseCol);
    lg.addColorStop(clamp01(sweepCenter - 0.16), baseCol);
    lg.addColorStop(clamp01(sweepCenter), '#FFFFFF');
    lg.addColorStop(clamp01(sweepCenter + 0.16), endCol);
    lg.addColorStop(1, endCol);
    fillStyle = lg;
  }

  // Glow shadow intensity
  const extraGlow =
    activeEffect === 'glowing-reveal' && phase !== 'hold'
      ? (1 - eased) * 1.8 + 0.4
      : 0;
  const baseGlow = colorStyle
    ? colorStyle.glowIntensity
    : (anim.glowIntensity ?? 0.8);
  const glowStr = anim.enableGlow
    ? baseGlow + beatPulse * 0.55 + extraGlow
    : 0;
  const glowColorHex =
    colorStyle &&
    (colorStyle.glowColor !== DEFAULT_TEXT_COLOR_STYLE.glowColor ||
      colorStyle.mode !== 'theme')
      ? colorStyle.glowColor
      : anim.colorMode === 'gradient'
        ? anim.gradientStartColor
        : theme.glowColor;

  const startY = -totalH * 0.5 + lineHeight * 0.5;

  if (maskMode === 'typewriter') {
    const totalChars = lines.reduce((sum, l) => sum + l.length, 0);
    const visibleChars = Math.max(1, Math.round(totalChars * maskP));
    let remaining = visibleChars;
    lines.forEach((line, idx) => {
      if (remaining <= 0) return;
      const chunk = line.slice(0, remaining);
      const isActiveCursorLine =
        remaining <= line.length && phase === 'in' && maskP < 0.98;
      const rendered = isActiveCursorLine ? `${chunk}|` : chunk;
      drawStyledTextLine(
        ctx,
        rendered,
        0,
        startY + idx * lineHeight,
        fontSize,
        fillStyle,
        colorStyle,
        glowColorHex,
        glowStr,
      );
      remaining -= line.length;
    });
  } else if (maskMode === 'letter' && phase !== 'hold') {
    const totalChars = Math.max(1, lines.reduce((s, l) => s + l.length, 0));
    let charCounter = 0;
    ctx.textAlign = 'left';
    lines.forEach((line, idx) => {
      const lineW = ctx.measureText(line).width;
      let cursorX = -lineW * 0.5;
      const ly = startY + idx * lineHeight;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        const chW = ctx.measureText(ch).width;
        const threshold = (charCounter / totalChars) * 0.65;
        const cP = clamp01((maskP - threshold) / 0.35);
        ctx.save();
        ctx.globalAlpha *= cP;
        drawStyledTextLine(
          ctx,
          ch,
          cursorX,
          ly + (1 - cP) * fontSize * 0.25,
          fontSize,
          fillStyle,
          colorStyle,
          glowColorHex,
          glowStr,
        );
        ctx.restore();
        cursorX += chW;
        charCounter++;
      }
    });
  } else {
    lines.forEach((line, idx) => {
      drawStyledTextLine(
        ctx,
        line,
        0,
        startY + idx * lineHeight,
        fontSize,
        fillStyle,
        colorStyle,
        glowColorHex,
        glowStr,
      );
    });
  }

  if ('filter' in ctx) {
    ctx.filter = 'none';
  }
  ctx.restore();

  // Golden / shimmering particles radiating around text reveal or on strong musical beats
  if (anim.enableParticles && (phase !== 'hold' || beatPulse > 0.35)) {
    const burstFactor =
      phase !== 'hold' ? Math.sin(clamp01(visP) * Math.PI) : beatPulse * 0.65;
    const pCount = maskMode === 'particle-wipe' ? 28 : 14;
    const wipeX =
      maskMode === 'particle-wipe'
        ? centerX - widestLine * 0.5 + widestLine * maskP
        : centerX;

    for (let i = 0; i < pCount; i++) {
      const s = seeds[(i + 80) % seeds.length];
      const px =
        maskMode === 'particle-wipe'
          ? wipeX + (s.x - 0.5) * minDim * 0.1
          : centerX + (s.x - 0.5) * widestLine * 1.15;
      const py =
        centerY + (s.y - 0.5) * Math.max(totalH * 1.4, minDim * 0.16);
      const starA = burstFactor * (0.4 + s.size * 0.55);
      if (starA <= 0.04) continue;

      ctx.save();
      ctx.globalAlpha *= clamp01(starA);
      ctx.fillStyle =
        i % 2 === 0
          ? anim.gradientStartColor || theme.particleColor
          : theme.particleSecondaryColor;
      drawFourPointStar(
        ctx,
        px,
        py,
        minDim * (0.0055 + s.size * 0.008),
        s.rot + t * 2.5,
      );
      ctx.restore();
    }
  }
}
