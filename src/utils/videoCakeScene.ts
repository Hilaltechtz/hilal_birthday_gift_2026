import {
  CakeInteractionState,
  DEFAULT_CAKE_CONFIG,
  DEFAULT_VIDEO_THEME,
  StudioProjectConfig,
} from '../types';
import { blendHex, hexToRgba } from './themeColorUtils';

export interface CakeParticleSeed {
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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
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

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rot: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(
    -size * 0.9,
    -size * 0.25,
    -size * 0.55,
    -size * 0.95,
    0,
    -size * 0.4,
  );
  ctx.bezierCurveTo(
    size * 0.55,
    -size * 0.95,
    size * 0.9,
    -size * 0.25,
    0,
    size * 0.35,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export interface DrawCakeSceneOptions {
  /** Current timeline or stage elapsed clock in seconds */
  t: number;
  /** Normalized progress within the Cake scene (0..1) */
  localP: number;
  /** Optional explicit interactive state from live preview / Cake Studio */
  cakeState?: CakeInteractionState;
  /** Current stage clock matching cakeState.extinguishedAtSec / cutAtSec */
  interactionClockSec?: number;
  /** Whether scene-end auto-triggers from cakeConfig should apply when interactive override is absent */
  allowAutoVideoTriggers?: boolean;
  /** Whether to draw standalone background gradient (true for Cake Studio mini-preview) */
  drawStandaloneBackdrop?: boolean;
}

/**
 * Renders the upgraded 3-tier luxury birthday cake, 10 coordinated visual effects,
 * candle-extinguishing smoke + golden burst, and cake-cutting slice reveal.
 */
export function drawAdvancedCakeScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: StudioProjectConfig,
  seeds: CakeParticleSeed[],
  options: DrawCakeSceneOptions,
) {
  const {
    t,
    localP,
    cakeState,
    interactionClockSec = t,
    allowAutoVideoTriggers = true,
    drawStandaloneBackdrop = false,
  } = options;

  const minDim = Math.min(width, height);
  const cakeCfg = config.cakeConfig || DEFAULT_CAKE_CONFIG;
  const theme = config.videoTheme || DEFAULT_VIDEO_THEME;
  const fx = cakeCfg.effects;
  const intensity = Math.max(0.3, Math.min(1.6, cakeCfg.animationIntensity || 1));
  const spd = Math.max(0.4, Math.min(2.0, cakeCfg.animationSpeed || 1));
  const animT = t * spd;

  if (drawStandaloneBackdrop) {
    const bg = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      minDim * 0.05,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.78,
    );
    bg.addColorStop(0, blendHex(theme.backgroundSecondary, cakeCfg.cakeColor, 0.24));
    bg.addColorStop(0.55, theme.backgroundPrimary);
    bg.addColorStop(1, blendHex(theme.backgroundPrimary, '#000000', 0.35));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  const sceneFade = drawStandaloneBackdrop
    ? 1
    : localP < 0.09
      ? localP / 0.09
      : localP > 0.92
        ? (1 - localP) / 0.08
        : 1;

  ctx.save();
  ctx.globalAlpha *= clamp01(sceneFade);

  // Determine candle extinguish & cake cut progresses (manual OR automated climax)
  let extElapsedSec = -1;
  if (cakeState?.extinguished) {
    extElapsedSec =
      cakeState.extinguishedAtSec !== null
        ? Math.max(0, interactionClockSec - cakeState.extinguishedAtSec)
        : 1.5;
  } else if (!cakeState && allowAutoVideoTriggers && cakeCfg.autoExtinguishInVideo && localP >= 0.72) {
    extElapsedSec = ((localP - 0.72) / 0.28) * 3.0;
  }

  const isExtinguished = extElapsedSec >= 0;
  const flameLevel = isExtinguished ? clamp01(1 - extElapsedSec / 0.45) : 1;

  let cutElapsedSec = -1;
  if (cakeState?.cut) {
    cutElapsedSec =
      cakeState.cutAtSec !== null
        ? Math.max(0, interactionClockSec - cakeState.cutAtSec)
        : 1.6;
  } else if (!cakeState && allowAutoVideoTriggers && cakeCfg.autoCutInVideo && localP >= 0.78) {
    cutElapsedSec = ((localP - 0.78) / 0.22) * 2.5;
  }
  const isCut = cutElapsedSec >= 0;
  const cutProgress = isCut ? clamp01(cutElapsedSec / 1.45) : 0;

  // EFFECT 7: Soft glowing bokeh circles (deep background layer)
  if (fx.glowCircles) {
    const circleCount = Math.round(14 * intensity);
    for (let i = 0; i < circleCount; i++) {
      const s = seeds[(i + 5) % seeds.length];
      const cx = (((s.x + Math.sin(animT * 0.25 + s.phase) * 0.06) % 1) + 1) % 1 * width;
      const cy = (((s.y - animT * 0.015 * s.speed) % 1) + 1) % 1 * height;
      const r = minDim * (0.04 + s.size * 0.075);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const col = i % 2 === 0 ? cakeCfg.bubbleColor : cakeCfg.particleColor;
      grad.addColorStop(0, hexToRgba(col, 0.14));
      grad.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // EFFECT 5: Magical rotating volumetric light rays
  if (fx.lightRays) {
    ctx.save();
    ctx.translate(width * 0.5, height * 0.56);
    ctx.rotate(animT * 0.12);
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      ctx.rotate((Math.PI * 2) / rayCount);
      const rayGrad = ctx.createLinearGradient(0, 0, minDim * 0.75, 0);
      rayGrad.addColorStop(0, hexToRgba(cakeCfg.starColor, 0.14 * intensity));
      rayGrad.addColorStop(1, hexToRgba(cakeCfg.starColor, 0));
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(0, -minDim * 0.014);
      ctx.lineTo(minDim * 0.78, -minDim * 0.095);
      ctx.lineTo(minDim * 0.78, minDim * 0.095);
      ctx.lineTo(0, minDim * 0.014);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // EFFECT 8: Celebratory background fireworks
  if (fx.fireworks) {
    const centers = [
      { x: width * 0.2, y: height * 0.22, offset: 0 },
      { x: width * 0.8, y: height * 0.2, offset: 0.35 },
      { x: width * 0.5, y: height * 0.14, offset: 0.68 },
    ];
    const fwColors = [
      cakeCfg.starColor,
      cakeCfg.particleColor,
      cakeCfg.confettiColor,
      ...theme.fireworksColors,
    ];
    centers.forEach((c, idx) => {
      const cycle = ((animT * 0.48 + c.offset) % 1 + 1) % 1;
      const expand = easeOutCubic(cycle);
      const alpha = clamp01(1 - Math.pow(cycle, 1.9)) * 0.82 * Math.min(1.2, intensity);
      if (alpha <= 0.03) return;
      for (let r = 0; r < 18; r++) {
        const ang = (r / 18) * Math.PI * 2 + idx * 0.4;
        const dist = expand * minDim * (0.14 + seeds[r % seeds.length].size * 0.08);
        const px = c.x + Math.cos(ang) * dist;
        const py = c.y + Math.sin(ang) * dist + cycle * cycle * minDim * 0.04;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = fwColors[(r + idx) % fwColors.length];
        ctx.beginPath();
        ctx.arc(px, py, minDim * 0.004, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // EFFECT 10: Floating birthday ribbons & balloons framing cake edges
  if (fx.decorations) {
    const decoColors = [cakeCfg.ribbonColor, cakeCfg.cakeColor, cakeCfg.particleColor];
    for (let i = 0; i < 6; i++) {
      const isLeft = i % 2 === 0;
      const baseX = isLeft
        ? width * (0.09 + (i * 0.035))
        : width * (0.91 - (i * 0.035));
      const sway = Math.sin(animT * 1.4 + i * 1.2) * minDim * 0.022;
      const bx = baseX + sway;
      const by = (((0.92 - ((animT * 0.07 * (0.7 + (i % 3) * 0.2) + i * 0.19) % 1)) % 1) + 1) % 1 * height;
      const br = minDim * (0.032 + (i % 2) * 0.009);
      const col = decoColors[i % decoColors.length];

      ctx.save();
      ctx.strokeStyle = hexToRgba(cakeCfg.ribbonColor, 0.45);
      ctx.lineWidth = Math.max(1, minDim * 0.002);
      ctx.beginPath();
      ctx.moveTo(bx, by + br * 1.1);
      ctx.quadraticCurveTo(bx + br * 0.3, by + br * 1.8, bx - br * 0.15, by + br * 2.4);
      ctx.stroke();

      ctx.translate(bx, by);
      ctx.scale(0.86, 1.08);
      ctx.fillStyle = hexToRgba(col, 0.46);
      ctx.beginPath();
      ctx.arc(0, 0, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(blendHex(col, '#FFFFFF', 0.4), 0.72);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // EFFECT 3: Small glowing particles rising behind/around cake
  if (fx.glowingParticles) {
    const pCount = Math.round(36 * intensity);
    for (let i = 0; i < pCount; i++) {
      const s = seeds[(i + 10) % seeds.length];
      const px = (((s.x + Math.sin(animT * 0.8 + s.phase) * 0.02) % 1) + 1) % 1 * width;
      const py = (((s.y - animT * 0.038 * s.speed) % 1) + 1) % 1 * height;
      const pulse = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(animT * 3 + s.phase));
      ctx.fillStyle = hexToRgba(cakeCfg.particleColor, pulse);
      ctx.beginPath();
      ctx.arc(px, py, minDim * (0.002 + s.size * 0.0026), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // EFFECT 6: Floating luminous hearts
  if (fx.floatingHearts) {
    const hCount = Math.round(10 * intensity);
    for (let i = 0; i < hCount; i++) {
      const s = seeds[(i + 70) % seeds.length];
      const sideX = i % 2 === 0 ? 0.08 + s.x * 0.22 : 0.7 + s.x * 0.22;
      const hx = width * sideX + Math.sin(animT * 1.6 + s.phase) * minDim * 0.02;
      const hy = (((s.y - animT * 0.055 * s.speed) % 1) + 1) % 1 * height;
      const alpha = Math.sin(hy / height * Math.PI) * 0.65;
      if (alpha <= 0.05) continue;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = i % 2 === 0 ? cakeCfg.particleColor : cakeCfg.ribbonColor;
      drawHeart(ctx, hx, hy, minDim * (0.014 + s.size * 0.008), Math.sin(animT + i) * 0.18);
      ctx.restore();
    }
  }

  // HEADLINE ABOVE CAKE
  const headlineText = isCut
    ? 'MAKE A WISH & CELEBRATE!'
    : isExtinguished
      ? 'WISH SENT TO THE STARS'
      : 'MAKE A WISH';
  const hSize = minDim * 0.058;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(hSize)}px "Cormorant Garamond", Georgia, serif`;
  ctx.shadowColor = hexToRgba(cakeCfg.starColor, 0.45);
  ctx.shadowBlur = 12;
  ctx.fillStyle = cakeCfg.starColor;
  ctx.fillText(headlineText, width * 0.5, height * 0.155);
  ctx.restore();

  // =========================================================================
  // LUXURY 3-TIER ROYAL CAKE ILLUSTRATION + CANDLES + SMOKE + SLICE CUTTING
  // =========================================================================
  const cx = width * 0.5;
  const baseY = height * 0.735;
  const entryScale = drawStandaloneBackdrop ? 1 : easeOutCubic(clamp01(localP * 3.2));

  // Warm under-cake table halo
  const tableGlow = ctx.createRadialGradient(
    cx,
    baseY + minDim * 0.04,
    minDim * 0.03,
    cx,
    baseY + minDim * 0.04,
    minDim * 0.38,
  );
  tableGlow.addColorStop(0, hexToRgba(cakeCfg.starColor, 0.25 + flameLevel * 0.12));
  tableGlow.addColorStop(1, hexToRgba(cakeCfg.cakeColor, 0));
  ctx.fillStyle = tableGlow;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + minDim * 0.04, minDim * 0.36, minDim * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(entryScale, entryScale);
  ctx.translate(-cx, -baseY);

  // Pedestal Stand
  const standW = minDim * 0.54;
  const standDark = blendHex(theme.cakeStandColor, '#000000', 0.25);
  const standLight = blendHex(cakeCfg.ribbonColor, '#FFFFFF', 0.32);
  const goldGrad = ctx.createLinearGradient(cx - standW * 0.5, 0, cx + standW * 0.5, 0);
  goldGrad.addColorStop(0, standDark);
  goldGrad.addColorStop(0.5, standLight);
  goldGrad.addColorStop(1, standDark);

  ctx.fillStyle = goldGrad;
  drawRoundedRect(ctx, cx - standW * 0.075, baseY, standW * 0.15, minDim * 0.08, 6);
  ctx.fill();
  drawRoundedRect(ctx, cx - standW * 0.26, baseY + minDim * 0.068, standW * 0.52, minDim * 0.025, 8);
  ctx.fill();
  drawRoundedRect(ctx, cx - standW * 0.5, baseY - minDim * 0.02, standW, minDim * 0.028, 12);
  ctx.fill();

  const drawLuxuryTier = (
    tierW: number,
    tierH: number,
    yTop: number,
    tierBaseHex: string,
    dripHex: string,
    swagCount: number,
  ) => {
    const xLeft = cx - tierW * 0.5;
    const shade = blendHex(tierBaseHex, '#000000', 0.32);
    const highlight = blendHex(tierBaseHex, '#FFFFFF', 0.16);
    const bodyGrad = ctx.createLinearGradient(xLeft, yTop, xLeft + tierW, yTop);
    bodyGrad.addColorStop(0, shade);
    bodyGrad.addColorStop(0.42, highlight);
    bodyGrad.addColorStop(1, shade);

    ctx.fillStyle = bodyGrad;
    drawRoundedRect(ctx, xLeft, yTop, tierW, tierH, minDim * 0.022);
    ctx.fill();

    // Royal Ribbon Swags & Gold Band
    ctx.fillStyle = cakeCfg.ribbonColor;
    drawRoundedRect(ctx, xLeft, yTop + tierH - minDim * 0.022, tierW, minDim * 0.012, 4);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(cakeCfg.ribbonColor, 0.85);
    ctx.lineWidth = Math.max(1.5, minDim * 0.003);
    const swagSpan = tierW / swagCount;
    for (let s = 0; s < swagCount; s++) {
      const sx1 = xLeft + s * swagSpan;
      const sx2 = sx1 + swagSpan;
      ctx.beginPath();
      ctx.moveTo(sx1, yTop + tierH * 0.34);
      ctx.quadraticCurveTo(
        (sx1 + sx2) * 0.5,
        yTop + tierH * 0.72,
        sx2,
        yTop + tierH * 0.34,
      );
      ctx.stroke();

      // Pearl jewel at each swag peak
      ctx.fillStyle = theme.cakeIcingColor;
      ctx.beginPath();
      ctx.arc(sx1, yTop + tierH * 0.34, minDim * 0.0055, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bottom piped pearls
    const beadCount = 11;
    const beadR = minDim * 0.01;
    ctx.fillStyle = theme.cakeIcingColor;
    for (let i = 0; i <= beadCount; i++) {
      const bx = xLeft + beadR + (i / beadCount) * (tierW - beadR * 2);
      ctx.beginPath();
      ctx.arc(bx, yTop + tierH - beadR * 0.5, beadR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glossy frosting cap & organic drips
    ctx.fillStyle = dripHex;
    drawRoundedRect(ctx, xLeft - 2, yTop, tierW + 4, tierH * 0.25, minDim * 0.015);
    ctx.fill();
    const drips = 7;
    for (let i = 0; i < drips; i++) {
      const dx = xLeft + ((i + 0.5) / drips) * tierW;
      const dh = tierH * (0.2 + (i % 3) * 0.09);
      drawRoundedRect(ctx, dx - minDim * 0.01, yTop + tierH * 0.14, minDim * 0.02, dh, 8);
      ctx.fill();
    }
  };

  const t1Color = blendHex(theme.cakeTier1Color, cakeCfg.cakeColor, 0.58);
  const t2Color = blendHex(theme.cakeTier2Color, cakeCfg.cakeColor, 0.58);
  const t3Color = blendHex(theme.cakeTier3Color, cakeCfg.cakeColor, 0.58);

  const t1W = minDim * 0.45;
  const t1H = minDim * 0.135;
  const t1Y = baseY - minDim * 0.02 - t1H;
  drawLuxuryTier(t1W, t1H, t1Y, t1Color, theme.cakeIcingColor, 6);

  const t2W = minDim * 0.335;
  const t2H = minDim * 0.115;
  const t2Y = t1Y - t2H;
  drawLuxuryTier(
    t2W,
    t2H,
    t2Y,
    t2Color,
    blendHex(theme.cakeIcingColor, t3Color, 0.3),
    5,
  );

  const t3W = minDim * 0.225;
  const t3H = minDim * 0.092;
  const t3Y = t2Y - t3H;
  drawLuxuryTier(t3W, t3H, t3Y, t3Color, theme.cakeIcingColor, 4);

  // Decorative Star Crown Pearl Toppers
  for (let p = -1; p <= 1; p += 2) {
    ctx.fillStyle = cakeCfg.starColor;
    drawFourPointStar(
      ctx,
      cx + p * t3W * 0.42,
      t3Y - minDim * 0.008,
      minDim * 0.015,
      animT * 0.7 * p,
    );
  }

  // 5 Candles + Flames + Extinguish Smoke & Burst
  const candleCount = 5;
  for (let i = 0; i < candleCount; i++) {
    const cxCandle = cx + (i - 2) * (t3W * 0.17);
    const ch = minDim * (i === 2 ? 0.075 : 0.062);
    const cw = minDim * 0.016;
    const cyTop = t3Y - ch;

    ctx.fillStyle = i % 2 === 0 ? cakeCfg.candleColor : cakeCfg.ribbonColor;
    drawRoundedRect(ctx, cxCandle - cw * 0.5, cyTop, cw, ch, 3);
    ctx.fill();

    // Diagonal stripe on candle
    ctx.strokeStyle = hexToRgba(cakeCfg.cakeColor, 0.38);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cxCandle - cw * 0.45, cyTop + ch * 0.35);
    ctx.lineTo(cxCandle + cw * 0.45, cyTop + ch * 0.55);
    ctx.stroke();

    // Wick
    ctx.strokeStyle = '#1E1B24';
    ctx.lineWidth = Math.max(1.2, minDim * 0.0025);
    ctx.beginPath();
    ctx.moveTo(cxCandle, cyTop);
    ctx.lineTo(cxCandle, cyTop - minDim * 0.012);
    ctx.stroke();

    const flameY = cyTop - minDim * 0.024;

    // Lit flame + halo (scaled cleanly down to 0 when extinguished)
    if (flameLevel > 0.02) {
      const flicker = (1 + Math.sin(t * 14 + i * 2.1) * 0.12) * flameLevel;
      const halo = ctx.createRadialGradient(
        cxCandle,
        flameY,
        0,
        cxCandle,
        flameY,
        minDim * 0.058 * flicker,
      );
      halo.addColorStop(0, hexToRgba(theme.glowColor, 0.72 * flameLevel));
      halo.addColorStop(0.5, hexToRgba('#FFA726', 0.25 * flameLevel));
      halo.addColorStop(1, 'rgba(255, 167, 38, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cxCandle, flameY, minDim * 0.058 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cxCandle, flameY);
      ctx.rotate(Math.sin(t * 10 + i) * 0.08);
      ctx.fillStyle = '#FFA726';
      ctx.beginPath();
      ctx.ellipse(0, 0, minDim * 0.009 * flicker, minDim * 0.019 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF9D6';
      ctx.beginPath();
      ctx.ellipse(0, minDim * 0.003, minDim * 0.0045 * flicker, minDim * 0.01 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Rising wispy smoke trails & outward golden spark burst when extinguished
    if (isExtinguished && extElapsedSec >= 0.05 && extElapsedSec < 3.4) {
      const smokeP = clamp01(extElapsedSec / 2.8);
      const smokeAlpha = clamp01(Math.sin(smokeP * Math.PI)) * 0.55;
      ctx.save();
      ctx.strokeStyle = `rgba(226, 214, 248, ${smokeAlpha.toFixed(2)})`;
      ctx.lineWidth = Math.max(1.5, minDim * 0.004);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cxCandle, flameY);
      for (let sStep = 1; sStep <= 6; sStep++) {
        const frac = sStep / 6;
        const sy = flameY - minDim * 0.09 * frac * (0.3 + smokeP * 0.8);
        const sx =
          cxCandle +
          Math.sin(animT * 3.5 + i + frac * 4.5) * minDim * 0.014 * frac;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Outward golden particle ring burst right as candles extinguish
  if (isExtinguished && extElapsedSec < 1.6) {
    const burstP = clamp01(extElapsedSec / 1.4);
    for (let b = 0; b < 22; b++) {
      const ang = (b / 22) * Math.PI * 2;
      const dist = easeOutCubic(burstP) * minDim * 0.28;
      const bx = cx + Math.cos(ang) * dist;
      const by = t3Y - minDim * 0.04 + Math.sin(ang) * dist * 0.55;
      ctx.save();
      ctx.globalAlpha *= clamp01(1 - burstP);
      ctx.fillStyle = b % 2 === 0 ? cakeCfg.starColor : cakeCfg.particleColor;
      drawFourPointStar(ctx, bx, by, minDim * 0.011, animT * 2 + b);
      ctx.restore();
    }
  }

  // CAKE CUTTING KNIFE & SEPARATED LAYERED SLICE WEDGE
  if (isCut && cutProgress > 0) {
    const knifeDescend = clamp01(cutProgress / 0.42);
    const sliceSlide = easeOutCubic(clamp01((cutProgress - 0.32) / 0.58));

    // Ceremonial Silver/Gold Cake Knife descending on right-of-center cut seam
    if (cutProgress < 0.72) {
      const knifeAlpha = cutProgress < 0.55 ? 1 : clamp01(1 - (cutProgress - 0.55) / 0.17);
      const bladeX = cx + t1W * 0.16;
      const bladeTopY =
        t3Y - minDim * 0.16 + easeOutCubic(knifeDescend) * minDim * 0.25;
      ctx.save();
      ctx.globalAlpha *= knifeAlpha;
      ctx.translate(bladeX, bladeTopY);
      ctx.rotate(-0.35 + knifeDescend * 0.25);

      // Blade
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(minDim * 0.16, -minDim * 0.014);
      ctx.lineTo(minDim * 0.17, minDim * 0.008);
      ctx.lineTo(minDim * 0.015, minDim * 0.012);
      ctx.closePath();
      ctx.fill();

      // Gold handle
      ctx.fillStyle = cakeCfg.ribbonColor;
      drawRoundedRect(ctx, -minDim * 0.075, -minDim * 0.008, minDim * 0.08, minDim * 0.02, 5);
      ctx.fill();
      ctx.restore();
    }

    // Separated multi-layer slice wedge sliding cleanly outward to the right
    if (sliceSlide > 0.01) {
      const sliceOffsetX = sliceSlide * minDim * 0.185;
      const sliceOffsetY = sliceSlide * minDim * 0.04;
      const sliceW = t1W * 0.24;
      const sliceH = minDim * 0.17;
      const sx = cx + t1W * 0.2 + sliceOffsetX;
      const sy = baseY - minDim * 0.02 - sliceH + sliceOffsetY;

      ctx.save();
      // Cut seam shadow inside cake body
      ctx.fillStyle = 'rgba(18, 7, 36, 0.55)';
      drawRoundedRect(ctx, cx + t1W * 0.11, t1Y + minDim * 0.02, minDim * 0.028, t1H - minDim * 0.022, 4);
      ctx.fill();

      // Drawn Wedge Plate + Sponge Layers
      ctx.fillStyle = standLight;
      ctx.beginPath();
      ctx.ellipse(sx + sliceW * 0.45, sy + sliceH + minDim * 0.008, sliceW * 0.72, minDim * 0.014, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden sponge cake wedge face
      ctx.fillStyle = '#F6D79A';
      drawRoundedRect(ctx, sx, sy, sliceW, sliceH, 6);
      ctx.fill();

      // Berry/cream filling stripe layers
      ctx.fillStyle = cakeCfg.cakeColor;
      ctx.fillRect(sx, sy + sliceH * 0.32, sliceW, sliceH * 0.12);
      ctx.fillRect(sx, sy + sliceH * 0.68, sliceW, sliceH * 0.12);

      // Outer frosting shell & drip edge
      ctx.fillStyle = theme.cakeIcingColor;
      drawRoundedRect(ctx, sx - 2, sy - 2, sliceW + 4, sliceH * 0.18, 5);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore(); // End cake scale

  // =========================================================================
  // FOREGROUND ANIMATED CAKE EFFECTS (100% toggleable)
  // =========================================================================

  // EFFECT 1: Floating Transparent Bubbles (distinct glossy rim & highlight arc)
  if (fx.bubbles) {
    const bubbleCount = Math.round(24 * intensity);
    for (let i = 0; i < bubbleCount; i++) {
      const s = seeds[(i + 95) % seeds.length];
      const sway = Math.sin(animT * 1.4 + s.phase) * minDim * 0.024;
      const bx = s.x * width + sway;
      const by = (((s.y - animT * 0.065 * (0.55 + s.speed * 0.5)) % 1) + 1) % 1 * height;
      const br = minDim * (0.011 + s.size * 0.022);

      ctx.save();
      const bGrad = ctx.createRadialGradient(
        bx - br * 0.3,
        by - br * 0.3,
        br * 0.05,
        bx,
        by,
        br,
      );
      bGrad.addColorStop(0, hexToRgba('#FFFFFF', 0.28));
      bGrad.addColorStop(0.65, hexToRgba(cakeCfg.bubbleColor, 0.1));
      bGrad.addColorStop(1, hexToRgba(cakeCfg.bubbleColor, 0.42));
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(cakeCfg.bubbleColor, 0.52);
      ctx.lineWidth = Math.max(1, minDim * 0.0018);
      ctx.stroke();

      // Glossy specular crescent
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = Math.max(1, br * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(bx, by, br * 0.68, -Math.PI * 0.85, -Math.PI * 0.42);
      ctx.stroke();
      ctx.restore();
    }
  }

  // EFFECT 2: Golden Sparkling Stars gently orbiting & twinkling around cake
  if (fx.sparklingStars) {
    const starCount = Math.round(22 * intensity);
    for (let i = 0; i < starCount; i++) {
      const s = seeds[(i + 120) % seeds.length];
      const angle = (i / starCount) * Math.PI * 2 + animT * 0.25 * (i % 2 === 0 ? 1 : -0.7);
      const orbitR = minDim * (0.24 + (s.size * 0.24));
      const sx = cx + Math.cos(angle) * orbitR * (width > height ? 1.35 : 0.95);
      const sy = height * 0.5 + Math.sin(angle) * orbitR * 0.75 + Math.sin(animT * 1.5 + i) * minDim * 0.02;
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(animT * 4.2 + s.phase));

      ctx.save();
      ctx.globalAlpha *= twinkle;
      ctx.fillStyle = cakeCfg.starColor;
      drawFourPointStar(ctx, sx, sy, minDim * (0.008 + s.size * 0.011), s.rot + animT * 0.9);
      ctx.restore();
    }
  }

  // EFFECT 4: Floating Golden Confetti (extra burst when cut!)
  if (fx.confetti) {
    const cutBoost = isCut && cutProgress > 0.25 ? 1.55 : 1;
    const confCount = Math.round(42 * intensity * cutBoost);
    const palette = [cakeCfg.confettiColor, cakeCfg.starColor, ...theme.confettiColors];
    for (let i = 0; i < confCount; i++) {
      const s = seeds[(i + 30) % seeds.length];
      const px = (((s.x + Math.sin(animT * 1.2 + s.phase) * 0.04) % 1) + 1) % 1 * width;
      const py = (((s.y + animT * 0.095 * s.speed) % 1) + 1) % 1 * height;
      const cw = minDim * (0.008 + s.size * 0.007);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(s.rot + animT * 3.8 * s.speed);
      ctx.fillStyle = hexToRgba(palette[i % palette.length], 0.82);
      ctx.fillRect(-cw * 0.5, -cw * 0.28, cw, cw * 0.56);
      ctx.restore();
    }
  }

  // EFFECT 9: High-frequency Glittering Shimmer Particles across cake silhouette
  if (fx.glitter) {
    const glitterCount = Math.round(28 * intensity);
    for (let i = 0; i < glitterCount; i++) {
      const s = seeds[(i + 50) % seeds.length];
      const gx = cx + (s.x - 0.5) * minDim * 0.58;
      const gy = baseY - minDim * 0.02 - s.y * minDim * 0.42;
      const flash = Math.pow(0.5 + 0.5 * Math.sin(animT * 6.5 + i * 1.7), 6);
      if (flash < 0.15) continue;
      ctx.save();
      ctx.globalAlpha *= flash;
      ctx.fillStyle = '#FFFFFF';
      drawFourPointStar(ctx, gx, gy, minDim * 0.0075, animT + i);
      ctx.restore();
    }
  }

  ctx.restore();
}
