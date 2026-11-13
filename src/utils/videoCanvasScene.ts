import {
  CakeInteractionState,
  DEFAULT_FRAME_CONFIG,
  DEFAULT_TRANSITION_CONFIG,
  DEFAULT_VIDEO_THEME,
  PhotoFrameConfig,
  PhotoTransitionConfig,
  resolveVideoScenes,
  StudioPhoto,
  StudioProjectConfig,
  TextColorStyleConfig,
  TransitionType,
  VideoThemeConfig,
} from '../types';
import { blendHex, hexToRgba } from './themeColorUtils';
import {
  computeBeatAlignedSchedule,
  resolveVideoTimelineBeats,
  sampleBeatPulseAtTime,
} from './beatSyncEngine';
import { drawAdvancedCakeScene } from './videoCakeScene';
import { drawCalendarIntroScene } from './videoCalendarScene';
import {
  drawPhotoEffectOverlay,
  resolvePhotoPreTransform,
} from './videoPhotoEffects';
import {
  buildFontColorFillStyle,
  drawAnimatedTextBlock,
  drawStyledTextLine,
} from './videoTextAnimations';

export interface LoadedImageMap {
  [photoId: string]: HTMLImageElement;
}

export interface ParticleSeed {
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

const CONFETTI_COLORS = [
  '#E8C574',
  '#F6E1A8',
  '#F5B8D0',
  '#CBB4EC',
  '#FDF9FF',
  '#A855F7',
];

export function createParticleSeeds(count = 150): ParticleSeed[] {
  let s = 42197;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    vx: (rand() - 0.5) * 2,
    vy: 0.4 + rand() * 1.4,
    size: 0.35 + rand() * 0.9,
    phase: rand() * Math.PI * 2,
    speed: 0.5 + rand() * 1.5,
    colorIdx: Math.floor(rand() * CONFETTI_COLORS.length),
    rot: rand() * Math.PI * 2,
  }));
}

export async function preloadProjectImages(
  photos: StudioPhoto[],
): Promise<LoadedImageMap> {
  const entries = await Promise.all(
    photos.map(
      (p) =>
        new Promise<[string, HTMLImageElement | null]>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve([p.id, img]);
          img.onerror = () => resolve([p.id, null]);
          img.src = p.dataUrl;
        }),
    ),
  );

  const map: LoadedImageMap = {};
  for (const [id, img] of entries) {
    if (img) map[id] = img;
  }
  return map;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(x: number): number {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function wrapTextLines(
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

/**
 * Draws an image into a rectangular viewport respecting user's custom framing
 * (fill vs fit, manual zoom, horizontal/vertical offset) plus Ken Burns motion.
 */
export function drawFramedImageContent(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  frame: PhotoFrameConfig,
  motionZoom: number,
  motionPanX: number,
  motionPanY: number,
) {
  const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxAspect = rw / Math.max(1, rh);
  const totalZoom = Math.max(0.6, frame.zoom) * motionZoom;

  if (frame.fitMode === 'fit') {
    // Fit whole photo cleanly with ambient blurred velvet backing so nothing crops
    ctx.fillStyle = '#120722';
    ctx.fillRect(rx, ry, rw, rh);

    ctx.save();
    ctx.globalAlpha *= 0.26;
    let bgW: number;
    let bgH: number;
    if (imgAspect > boxAspect) {
      bgH = rh * 1.15;
      bgW = bgH * imgAspect;
    } else {
      bgW = rw * 1.15;
      bgH = bgW / imgAspect;
    }
    ctx.drawImage(
      img,
      rx + (rw - bgW) * 0.5,
      ry + (rh - bgH) * 0.5,
      bgW,
      bgH,
    );
    ctx.restore();

    let fitW: number;
    let fitH: number;
    if (imgAspect > boxAspect) {
      fitW = rw * totalZoom;
      fitH = fitW / imgAspect;
    } else {
      fitH = rh * totalZoom;
      fitW = fitH * imgAspect;
    }
    const maxShiftX = Math.max(rw * 0.25, Math.abs(fitW - rw) * 0.5);
    const maxShiftY = Math.max(rh * 0.25, Math.abs(fitH - rh) * 0.5);
    const dx = rx + (rw - fitW) * 0.5 + frame.offsetX * maxShiftX + motionPanX * 6;
    const dy = ry + (rh - fitH) * 0.5 + frame.offsetY * maxShiftY + motionPanY * 6;
    ctx.drawImage(img, dx, dy, fitW, fitH);
    return;
  }

  // 'fill' mode: cover frame cleanly with user pan & zoom
  let drawW: number;
  let drawH: number;
  if (imgAspect > boxAspect) {
    drawH = rh * totalZoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = rw * totalZoom;
    drawH = drawW / imgAspect;
  }

  const slackX = Math.max(0, (drawW - rw) * 0.5);
  const slackY = Math.max(0, (drawH - rh) * 0.5);
  const dx =
    rx +
    (rw - drawW) * 0.5 +
    frame.offsetX * slackX +
    motionPanX * Math.min(slackX * 0.35, rw * 0.04);
  const dy =
    ry +
    (rh - drawH) * 0.5 +
    frame.offsetY * slackY +
    motionPanY * Math.min(slackY * 0.35, rh * 0.04);

  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function getOrderedMemoryPhotos(config: StudioProjectConfig): StudioPhoto[] {
  if (config.photos.length === 0) return [];
  const list = [...config.photos];
  if (config.openingPhotoId) {
    const idx = list.findIndex((p) => p.id === config.openingPhotoId);
    if (idx > 0) {
      const [opening] = list.splice(idx, 1);
      list.unshift(opening);
    }
  }
  return list;
}

export function getFinalPhoto(config: StudioProjectConfig): StudioPhoto | null {
  if (config.photos.length === 0) return null;
  if (config.finalPhotoId) {
    const match = config.photos.find((p) => p.id === config.finalPhotoId);
    if (match) return match;
  }
  return config.photos[config.photos.length - 1];
}

export function getSceneAtTime(
  t: number,
  duration: number,
  config?: StudioProjectConfig,
) {
  const scenes = resolveVideoScenes(config);
  const p = clamp01(t / Math.max(1, duration));
  for (const scene of scenes) {
    if (p >= scene.startFrac && p <= scene.endFrac) {
      const localP = clamp01(
        (p - scene.startFrac) / Math.max(0.0001, scene.endFrac - scene.startFrac),
      );
      return { scene, localP, globalP: p };
    }
  }
  return {
    scene: scenes[scenes.length - 1],
    localP: 1,
    globalP: 1,
  };
}

function drawRoyalBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seeds: ParticleSeed[],
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  const angleRad = ((theme.gradientAngle ?? 155) * Math.PI) / 180;
  const dx = Math.cos(angleRad) * w * 0.5;
  const dy = Math.sin(angleRad) * h * 0.5;
  const bg = ctx.createLinearGradient(
    w * 0.5 - dx,
    h * 0.5 - dy,
    w * 0.5 + dx,
    h * 0.5 + dy,
  );
  bg.addColorStop(0, theme.backgroundPrimary);
  bg.addColorStop(0.5, theme.backgroundSecondary);
  bg.addColorStop(1, theme.backgroundPrimary);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const motionScale = theme.animatedGradient ? 1 : 0;
  const orbX = w * (0.5 + Math.sin(t * 0.25) * 0.16 * motionScale);
  const orbY = h * (0.35 + Math.cos(t * 0.2) * 0.08 * motionScale);
  const orbGrad = ctx.createRadialGradient(
    orbX,
    orbY,
    0,
    orbX,
    orbY,
    Math.max(w, h) * 0.65,
  );
  orbGrad.addColorStop(0, hexToRgba(theme.backgroundGlow, 0.28));
  orbGrad.addColorStop(0.48, hexToRgba(theme.glowColor, 0.12));
  orbGrad.addColorStop(1, hexToRgba(theme.backgroundPrimary, 0));
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, w, h);

  const minDim = Math.min(w, h);
  for (let i = 0; i < 72; i++) {
    const s = seeds[i % seeds.length];
    const sx =
      (((s.x + t * 0.012 * (s.colorIdx % 2 === 0 ? 1 : -0.6)) % 1) + 1) %
      1 *
      w;
    const sy = (((s.y - t * 0.025 * s.speed) % 1) + 1) % 1 * h;
    const twinkle =
      0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.4 * s.speed + s.phase));
    const isPrimaryParticle = i % 3 !== 0;

    ctx.fillStyle = isPrimaryParticle
      ? hexToRgba(theme.particleColor, twinkle)
      : hexToRgba(theme.particleSecondaryColor, twinkle * 0.85);

    const radius = minDim * (0.0022 + s.size * 0.0028);
    if (i % 7 === 0) {
      drawFourPointStar(ctx, sx, sy, radius * 2.1, s.rot + t * 0.4);
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawConfettiBurst(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  localT: number,
  seeds: ParticleSeed[],
  intensity = 1,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  const minDim = Math.min(w, h);
  const count = Math.floor(75 * intensity);
  const palette = [
    ...theme.confettiColors,
    theme.particleColor,
    theme.particleSecondaryColor,
  ];
  for (let i = 0; i < count; i++) {
    const s = seeds[(i + 25) % seeds.length];
    const progress = clamp01(localT * 0.85);
    const originX = w * (0.2 + (i % 5) * 0.15);
    const x = originX + s.vx * progress * w * 0.32;
    const y =
      h * 0.48 -
      Math.sin(progress * Math.PI) * h * 0.38 * s.speed +
      progress * progress * h * 0.68;

    const alpha = clamp01(1 - Math.pow(progress, 2.2));
    if (alpha <= 0.02) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(s.rot + localT * 4.5 * s.speed);
    ctx.fillStyle = palette[s.colorIdx % palette.length];
    const cw = minDim * 0.014 * (0.7 + s.size * 0.6);
    ctx.fillRect(-cw * 0.5, -cw * 0.28, cw, cw * 0.56);
    ctx.restore();
  }
}

function drawBalloons(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  localP: number,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  const minDim = Math.min(w, h);
  const bColors = theme.balloonColors;

  for (let i = 0; i < 8; i++) {
    const baseHex = bColors[i % bColors.length];
    const fill = hexToRgba(baseHex, 0.5);
    const stroke = hexToRgba(blendHex(baseHex, '#FFFFFF', 0.35), 0.78);
    const baseX = w * (0.1 + (i / 7) * 0.8);
    const sway = Math.sin(localP * 6 + i * 1.4) * minDim * 0.025;
    const bx = baseX + sway;
    const by = h * (1.12 - localP * (1.15 + (i % 3) * 0.16));
    const r = minDim * (0.045 + (i % 3) * 0.012);

    ctx.save();
    ctx.strokeStyle = hexToRgba(theme.particleColor, 0.38);
    ctx.lineWidth = Math.max(1, minDim * 0.002);
    ctx.beginPath();
    ctx.moveTo(bx, by + r * 1.15);
    ctx.quadraticCurveTo(bx + r * 0.2, by + r * 1.8, bx - r * 0.12, by + r * 2.5);
    ctx.stroke();

    ctx.translate(bx, by);
    ctx.scale(0.86, 1.08);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.2, minDim * 0.0025);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.32, r * 0.16, r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGoldenText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  alpha = 1,
  italic = false,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
  colorStyle?: TextColorStyleConfig,
) {
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${italic ? 'italic ' : ''}600 ${Math.round(fontSize)}px "Cormorant Garamond", Georgia, serif`;

  const totalH = lines.length * lineHeight;
  const startY = y - totalH * 0.5 + lineHeight * 0.5;

  const grad = ctx.createLinearGradient(
    x - fontSize * 4,
    y - totalH * 0.5,
    x + fontSize * 4,
    y + totalH * 0.5,
  );
  grad.addColorStop(0, theme.titleColor);
  grad.addColorStop(0.5, theme.textColor);
  grad.addColorStop(1, theme.titleGradientEnd);

  const fillStyle = buildFontColorFillStyle(
    ctx,
    colorStyle,
    x - fontSize * 4,
    y - totalH * 0.5,
    x + fontSize * 4,
    y + totalH * 0.5,
    grad,
  );

  lines.forEach((line, idx) => {
    drawStyledTextLine(
      ctx,
      line,
      x,
      startY + idx * lineHeight,
      fontSize,
      fillStyle,
      colorStyle,
      theme.glowColor,
      0.95,
    );
  });
  ctx.restore();
}

function drawFireworks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  localP: number,
  seeds: ParticleSeed[],
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  const minDim = Math.min(w, h);
  const fwColors = theme.fireworksColors;
  const centers = [
    { x: w * 0.22, y: h * 0.24, delay: 0.0 },
    { x: w * 0.78, y: h * 0.22, delay: 0.22 },
    { x: w * 0.5, y: h * 0.18, delay: 0.44 },
    { x: w * 0.3, y: h * 0.34, delay: 0.65 },
  ];

  centers.forEach((c, cIdx) => {
    const cycle = (localP * 1.4 - c.delay + 1) % 1;
    const expand = easeOutCubic(cycle);
    const alpha = clamp01(1 - Math.pow(cycle, 1.8));
    if (alpha <= 0.03) return;

    const rayCount = 22;
    for (let i = 0; i < rayCount; i++) {
      const ang = (i / rayCount) * Math.PI * 2 + cIdx * 0.3;
      const dist =
        expand *
        minDim *
        0.22 *
        (0.75 + seeds[i % seeds.length].size * 0.45);
      const px = c.x + Math.cos(ang) * dist;
      const py = c.y + Math.sin(ang) * dist + cycle * cycle * minDim * 0.05;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fwColors[(i + cIdx) % fwColors.length];
      ctx.beginPath();
      ctx.arc(px, py, minDim * 0.0045, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

// =============================================================================
// 16 CINEMATIC PHOTO TRANSITION ENGINE
// =============================================================================

interface CardTransform {
  alpha: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  blurPx: number;
  clipMode?: 'none' | 'circle' | 'mask';
  clipProgress?: number;
  clipDirection?: string;
}

function drawSingleFramedCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  photo: StudioPhoto,
  img: HTMLImageElement | null,
  kenBurnsP: number,
  transform: CardTransform,
  showCaption: boolean,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
  effectTimeSec = 0,
  seeds: ParticleSeed[] = [],
  captionColorStyle?: TextColorStyleConfig,
) {
  if (transform.alpha <= 0.01) return;
  const minDim = Math.min(width, height);
  const radius = minDim * 0.025;
  const frameCfg = photo.frame || DEFAULT_FRAME_CONFIG;
  const transCfg = photo.transition || DEFAULT_TRANSITION_CONFIG;
  const zoomAmt = transCfg.zoomIntensity ?? 0.14;
  const preEffect = resolvePhotoPreTransform(photo.effect, effectTimeSec);

  const cx = frameX + frameW * 0.5 + transform.offsetX;
  const cy = frameY + frameH * 0.5 + transform.offsetY;

  ctx.save();
  ctx.globalAlpha *= clamp01(transform.alpha);

  if (transform.clipMode === 'circle' && transform.clipProgress !== undefined) {
    const maxR = Math.hypot(frameW * 0.55, frameH * 0.55);
    const r = Math.max(1, maxR * transform.clipProgress);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
  } else if (
    transform.clipMode === 'mask' &&
    transform.clipProgress !== undefined
  ) {
    const p = transform.clipProgress;
    ctx.beginPath();
    const dir = transform.clipDirection || 'left';
    if (dir === 'right') {
      ctx.rect(frameX + frameW * (1 - p) - 20, frameY - 20, frameW * p + 40, frameH + 40);
    } else if (dir === 'up') {
      ctx.rect(frameX - 20, frameY + frameH * (1 - p) - 20, frameW + 40, frameH * p + 40);
    } else if (dir === 'down') {
      ctx.rect(frameX - 20, frameY - 20, frameW + 40, frameH * p + 40);
    } else {
      const edgeX = frameX - 30 + (frameW + 90) * p;
      ctx.moveTo(frameX - 40, frameY - 40);
      ctx.lineTo(edgeX, frameY - 40);
      ctx.lineTo(edgeX - 40, frameY + frameH + 40);
      ctx.lineTo(frameX - 40, frameY + frameH + 40);
      ctx.closePath();
    }
    ctx.clip();
  }

  ctx.translate(cx, cy);
  if (transform.rotation !== 0) {
    ctx.rotate(transform.rotation);
  }
  ctx.scale(transform.scaleX, transform.scaleY);
  ctx.translate(-(frameX + frameW * 0.5), -(frameY + frameH * 0.5));

  const totalBlur = Math.max(transform.blurPx, preEffect.blurPx);
  if (totalBlur > 0.3 && 'filter' in ctx) {
    ctx.filter = `blur(${totalBlur.toFixed(1)}px)`;
  }

  ctx.shadowColor = hexToRgba(theme.glowColor, 0.42);
  ctx.shadowBlur = minDim * 0.045;
  ctx.fillStyle = theme.backgroundPrimary;
  drawRoundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  drawRoundedRectPath(
    ctx,
    frameX + 4,
    frameY + 4,
    frameW - 8,
    frameH - 8,
    radius - 2,
  );
  ctx.clip();

  if (img) {
    ctx.save();
    if (preEffect.mirrorX || preEffect.pulseScale !== 1) {
      const imgCx = frameX + frameW * 0.5;
      const imgCy = frameY + frameH * 0.5;
      ctx.translate(imgCx, imgCy);
      ctx.scale(
        (preEffect.mirrorX ? -1 : 1) * preEffect.pulseScale,
        preEffect.pulseScale,
      );
      ctx.translate(-imgCx, -imgCy);
    }

    const dirFactor =
      transCfg.direction === 'right' || transCfg.direction === 'down' ? -1 : 1;
    const motionZoom = 1.0 + easeInOutCubic(kenBurnsP) * zoomAmt;
    const panX = dirFactor * (kenBurnsP - 0.5);
    const panY =
      (transCfg.direction === 'up' || transCfg.direction === 'down' ? 1 : 0.5) *
      (kenBurnsP - 0.5);
    drawFramedImageContent(
      ctx,
      img,
      frameX,
      frameY,
      frameW,
      frameH,
      frameCfg,
      motionZoom,
      panX,
      panY,
    );
    ctx.restore();
  }

  if ('filter' in ctx) {
    ctx.filter = 'none';
  }

  // Render active Photo Effects Studio overlay cleanly inside photo bounds
  if (photo.effect && photo.effect.type !== 'none') {
    drawPhotoEffectOverlay(
      ctx,
      frameX + 4,
      frameY + 4,
      frameW - 8,
      frameH - 8,
      effectTimeSec,
      photo.effect,
      seeds,
      theme,
    );
  }
  ctx.restore();

  if ('filter' in ctx) {
    ctx.filter = 'none';
  }

  ctx.strokeStyle = theme.photoFrameColor;
  ctx.lineWidth = Math.max(2, minDim * 0.005);
  drawRoundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(theme.photoFrameAccentColor, 0.55);
  ctx.lineWidth = Math.max(1, minDim * 0.002);
  drawRoundedRectPath(
    ctx,
    frameX - minDim * 0.012,
    frameY - minDim * 0.012,
    frameW + minDim * 0.024,
    frameH + minDim * 0.024,
    radius + 4,
  );
  ctx.stroke();

  if (showCaption && photo.caption.trim()) {
    const capFontSize = Math.round(minDim * 0.036);
    ctx.font = `italic 500 ${capFontSize}px "Cormorant Garamond", Georgia, serif`;
    const cLines = wrapTextLines(ctx, photo.caption, width * 0.8);
    ctx.textAlign = 'center';
    const capFill = buildFontColorFillStyle(
      ctx,
      captionColorStyle,
      width * 0.2,
      frameY + frameH,
      width * 0.8,
      frameY + frameH + minDim * 0.14,
      theme.subtitleColor,
    );
    cLines.slice(0, 2).forEach((line, lineIdx) => {
      drawStyledTextLine(
        ctx,
        line,
        width * 0.5,
        frameY + frameH + minDim * 0.068 + lineIdx * minDim * 0.044,
        capFontSize,
        capFill,
        captionColorStyle,
        theme.glowColor,
        captionColorStyle ? captionColorStyle.glowIntensity : 0.3,
      );
    });
  }

  ctx.restore();
}

function drawGoldenTransitionParticles(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  tr: number,
  seeds: ParticleSeed[],
  direction: string,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  const count = 48;
  const sweepX =
    direction === 'right'
      ? frameX + frameW * (1 - tr)
      : frameX + frameW * tr;

  for (let i = 0; i < count; i++) {
    const s = seeds[(i + 15) % seeds.length];
    const spread = (s.x - 0.5) * frameW * 0.35;
    const px = sweepX + spread * Math.sin(tr * Math.PI);
    const py = frameY + s.y * frameH;
    const alpha = Math.sin(tr * Math.PI) * (0.45 + s.size * 0.5);
    const r = Math.max(2, Math.min(frameW, frameH) * 0.014 * s.size);

    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    ctx.fillStyle =
      i % 3 === 0 ? theme.particleSecondaryColor : theme.transitionEffectColor;
    drawFourPointStar(ctx, px, py, r, s.rot + tr * 3);
    ctx.restore();
  }
}

/**
 * Renders the transition between photoA (outgoing) and photoB (incoming)
 * at normalized progress tr (0..1) using photoB's transition config.
 */
export function renderPhotoTransitionPair(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  photoA: StudioPhoto,
  imgA: HTMLImageElement | null,
  photoB: StudioPhoto,
  imgB: HTMLImageElement | null,
  trRaw: number,
  transition: PhotoTransitionConfig,
  seeds: ParticleSeed[],
  showCaptions = true,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
  effectTimeSec = 0,
  captionColorStyle?: TextColorStyleConfig,
) {
  const speedMult =
    transition.speed === 'fast' ? 1.35 : transition.speed === 'slow' ? 0.78 : 1.0;
  const tr = easeInOutCubic(clamp01(trRaw * speedMult));
  const type = transition.type;

  const baseOut: CardTransform = {
    alpha: 1,
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    blurPx: 0,
  };
  const baseIn: CardTransform = { ...baseOut };

  switch (type) {
    case 'fade':
      baseOut.alpha = 1 - tr;
      baseIn.alpha = tr;
      break;

    case 'cross-dissolve':
      baseOut.alpha = 1 - tr * 0.9;
      baseOut.scaleX = baseOut.scaleY = 1 + tr * 0.04;
      baseIn.alpha = tr;
      baseIn.scaleX = baseIn.scaleY = 1.04 - tr * 0.04;
      break;

    case 'zoom-in':
      baseOut.alpha = 1 - tr;
      baseOut.scaleX = baseOut.scaleY = 1 + tr * 0.16;
      baseIn.alpha = tr;
      baseIn.scaleX = baseIn.scaleY = 0.78 + tr * 0.22;
      break;

    case 'zoom-out':
      baseOut.alpha = 1 - tr;
      baseOut.scaleX = baseOut.scaleY = 1 - tr * 0.16;
      baseIn.alpha = tr;
      baseIn.scaleX = baseIn.scaleY = 1.24 - tr * 0.24;
      break;

    case 'slide-left':
      baseOut.offsetX = -tr * width * 0.85;
      baseOut.alpha = 1 - tr * 0.4;
      baseIn.offsetX = (1 - tr) * width * 0.85;
      baseIn.alpha = 0.6 + tr * 0.4;
      break;

    case 'slide-right':
      baseOut.offsetX = tr * width * 0.85;
      baseOut.alpha = 1 - tr * 0.4;
      baseIn.offsetX = -(1 - tr) * width * 0.85;
      baseIn.alpha = 0.6 + tr * 0.4;
      break;

    case 'slide-up':
      baseOut.offsetY = -tr * height * 0.72;
      baseOut.alpha = 1 - tr * 0.45;
      baseIn.offsetY = (1 - tr) * height * 0.72;
      baseIn.alpha = 0.55 + tr * 0.45;
      break;

    case 'slide-down':
      baseOut.offsetY = tr * height * 0.72;
      baseOut.alpha = 1 - tr * 0.45;
      baseIn.offsetY = -(1 - tr) * height * 0.72;
      baseIn.alpha = 0.55 + tr * 0.45;
      break;

    case 'flip-3d': {
      const flipCos = Math.cos(tr * Math.PI);
      if (tr < 0.5) {
        baseOut.scaleX = Math.max(0.02, Math.abs(flipCos));
        baseOut.scaleY = 1 - tr * 0.12;
        baseIn.alpha = 0;
      } else {
        baseOut.alpha = 0;
        baseIn.scaleX = Math.max(0.02, Math.abs(flipCos));
        baseIn.scaleY = 1 - (1 - tr) * 0.12;
      }
      break;
    }

    case 'rotate': {
      const sign = transition.direction === 'ccw' ? -1 : 1;
      baseOut.alpha = 1 - tr;
      baseOut.rotation = sign * tr * 0.42;
      baseOut.scaleX = baseOut.scaleY = 1 - tr * 0.18;
      baseIn.alpha = tr;
      baseIn.rotation = -sign * (1 - tr) * 0.42;
      baseIn.scaleX = baseIn.scaleY = 0.82 + tr * 0.18;
      break;
    }

    case 'blur':
      baseOut.alpha = 1 - tr;
      baseOut.blurPx = tr * 14;
      baseIn.alpha = tr;
      baseIn.blurPx = (1 - tr) * 14;
      break;

    case 'golden-particles':
      baseOut.alpha = 1 - tr;
      baseIn.alpha = tr;
      baseIn.clipMode = 'mask';
      baseIn.clipProgress = tr;
      baseIn.clipDirection = transition.direction || 'left';
      break;

    case 'light-flash':
      baseOut.alpha = tr < 0.5 ? 1 : 0;
      baseIn.alpha = tr >= 0.5 ? 1 : 0;
      break;

    case 'circular-reveal':
      baseOut.alpha = 1;
      baseIn.alpha = 1;
      baseIn.clipMode = 'circle';
      baseIn.clipProgress = tr;
      break;

    case 'smooth-mask':
      baseOut.alpha = 1;
      baseIn.alpha = 1;
      baseIn.clipMode = 'mask';
      baseIn.clipProgress = tr;
      baseIn.clipDirection = transition.direction || 'left';
      break;

    case 'pan-zoom':
      baseOut.alpha = 1 - tr;
      baseOut.offsetX = -tr * width * 0.12;
      baseOut.scaleX = baseOut.scaleY = 1 + tr * 0.1;
      baseIn.alpha = tr;
      baseIn.offsetX = (1 - tr) * width * 0.12;
      baseIn.scaleX = baseIn.scaleY = 1.08 - tr * 0.08;
      break;
  }

  drawSingleFramedCard(
    ctx,
    width,
    height,
    frameX,
    frameY,
    frameW,
    frameH,
    photoA,
    imgA,
    1,
    baseOut,
    showCaptions,
    theme,
    effectTimeSec,
    seeds,
    captionColorStyle,
  );
  drawSingleFramedCard(
    ctx,
    width,
    height,
    frameX,
    frameY,
    frameW,
    frameH,
    photoB,
    imgB,
    tr * 0.25,
    baseIn,
    showCaptions,
    theme,
    effectTimeSec,
    seeds,
    captionColorStyle,
  );

  if (type === 'golden-particles') {
    drawGoldenTransitionParticles(
      ctx,
      frameX,
      frameY,
      frameW,
      frameH,
      tr,
      seeds,
      transition.direction || 'left',
      theme,
    );
  } else if (type === 'light-flash') {
    const flashAlpha = Math.sin(tr * Math.PI);
    ctx.save();
    ctx.fillStyle = hexToRgba(theme.transitionEffectColor, flashAlpha * 0.88);
    drawRoundedRectPath(
      ctx,
      frameX - 4,
      frameY - 4,
      frameW + 8,
      frameH + 8,
      Math.min(width, height) * 0.025,
    );
    ctx.fill();
    ctx.restore();
  } else if (type === 'circular-reveal' && tr > 0.02 && tr < 0.98) {
    const maxR = Math.hypot(frameW * 0.55, frameH * 0.55);
    ctx.save();
    ctx.strokeStyle = hexToRgba(theme.transitionEffectColor, 0.9);
    ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
    ctx.beginPath();
    ctx.arc(frameX + frameW * 0.5, frameY + frameH * 0.5, maxR * tr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Standalone Transition Demo Renderer used by the Photo Transition Preview
 * and the Transition Library cards.
 */
export function drawStandaloneTransitionDemo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress01: number,
  photoA: StudioPhoto,
  imgA: HTMLImageElement | null,
  photoB: StudioPhoto,
  imgB: HTMLImageElement | null,
  transition: PhotoTransitionConfig,
  seeds: ParticleSeed[],
  showCaptions = false,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  const demoTimeSec = progress01 * 4;
  drawRoyalBackdrop(ctx, width, height, demoTimeSec, seeds, theme);

  const frameW = width * 0.78;
  const frameH = height * (showCaptions ? 0.64 : 0.76);
  const frameX = (width - frameW) * 0.5;
  const frameY = (height - frameH) * (showCaptions ? 0.42 : 0.5);

  if (progress01 < 0.25) {
    drawSingleFramedCard(
      ctx,
      width,
      height,
      frameX,
      frameY,
      frameW,
      frameH,
      photoA,
      imgA,
      progress01 * 2,
      { alpha: 1, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, blurPx: 0 },
      showCaptions,
      theme,
      demoTimeSec,
      seeds,
    );
  } else if (progress01 < 0.75) {
    const tr = (progress01 - 0.25) / 0.5;
    renderPhotoTransitionPair(
      ctx,
      width,
      height,
      frameX,
      frameY,
      frameW,
      frameH,
      photoA,
      imgA,
      photoB,
      imgB,
      tr,
      transition,
      seeds,
      showCaptions,
      theme,
      demoTimeSec,
    );
  } else {
    drawSingleFramedCard(
      ctx,
      width,
      height,
      frameX,
      frameY,
      frameW,
      frameH,
      photoB,
      imgB,
      (progress01 - 0.75) * 2,
      { alpha: 1, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, blurPx: 0 },
      showCaptions,
      theme,
      demoTimeSec,
      seeds,
    );
  }
}

/**
 * Computes proportional per-photo timeline slices inside Scene 3 based on each
 * photo's individual displayDurationSec (optionally aligned to music beats).
 */
function getScene3PhotoSchedule(
  orderedPhotos: StudioPhoto[],
  sceneStartSec: number,
  sceneDurationSec: number,
  config: StudioProjectConfig,
) {
  const weights = orderedPhotos.map((p) =>
    Math.max(1.5, p.transition?.displayDurationSec || 4),
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const beats =
    config.beatSync?.sceneBeatSnap && config.beatSync?.mode !== 'off'
      ? resolveVideoTimelineBeats(config)
      : [];

  const segments: {
    index: number;
    startSec: number;
    endSec: number;
    durationSec: number;
  }[] = [];

  let cursor = 0;
  for (let i = 0; i < orderedPhotos.length; i++) {
    let segDur = (weights[i] / totalWeight) * sceneDurationSec;
    if (i < orderedPhotos.length - 1) {
      const targetMovieSec = sceneStartSec + cursor + segDur;
      if (beats.length > 0 && (config.music?.syncToBeat ?? true)) {
        // Pick strongest beat within +/-0.6s of proportional boundary
        let bestBeatSec: number | null = null;
        let bestScore = -Infinity;
        for (const b of beats) {
          const dist = Math.abs(b.timeSec - targetMovieSec);
          if (dist <= 0.6) {
            const candidateDur = b.timeSec - (sceneStartSec + cursor);
            if (candidateDur >= 1.1 && cursor + candidateDur < sceneDurationSec - 0.9) {
              const score = (1 - dist / 0.6) * 0.55 + b.strength * 0.45 + (b.isManual ? 0.35 : 0);
              if (score > bestScore) {
                bestScore = score;
                bestBeatSec = b.timeSec;
              }
            }
          }
        }
        if (bestBeatSec !== null) {
          segDur = bestBeatSec - (sceneStartSec + cursor);
        }
      } else if (config.music?.syncToBeat && config.music.bpm) {
        const beatSec = 60 / config.music.bpm;
        const snapped = Math.max(beatSec * 2, Math.round(segDur / beatSec) * beatSec);
        if (cursor + snapped < sceneDurationSec - 0.8) {
          segDur = snapped;
        }
      }
    }
    const endSec = i === orderedPhotos.length - 1 ? sceneDurationSec : cursor + segDur;
    segments.push({
      index: i,
      startSec: cursor,
      endSec,
      durationSec: Math.max(0.5, endSec - cursor),
    });
    cursor = endSec;
  }

  return segments;
}

export interface VideoFrameRenderOptions {
  cakeState?: CakeInteractionState;
  interactionClockSec?: number;
}

/**
 * Deterministic master frame renderer for both live studio preview and export.
 */
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  config: StudioProjectConfig,
  images: LoadedImageMap,
  seeds: ParticleSeed[],
  options?: VideoFrameRenderOptions,
) {
  const duration = config.durationSeconds;
  const minDim = Math.min(width, height);
  const { scene, localP, globalP } = getSceneAtTime(t, duration, config);
  const theme: VideoThemeConfig = config.videoTheme || DEFAULT_VIDEO_THEME;

  const masterAlpha =
    globalP < 0.03
      ? clamp01(globalP / 0.03)
      : globalP > 0.96
        ? clamp01((1 - globalP) / 0.04)
        : 1;

  if (scene.id === 'calendar') {
    drawCalendarIntroScene(ctx, width, height, localP, t, config, seeds);
    if (masterAlpha < 1) {
      ctx.fillStyle = hexToRgba(theme.backgroundPrimary, 1 - masterAlpha);
      ctx.fillRect(0, 0, width, height);
    }
    return;
  }

  drawRoyalBackdrop(ctx, width, height, t, seeds, theme);

  ctx.save();

  const fontColors = config.fontColors;

  // SCENE 1: MAGICAL INTRODUCTION
  if (scene.id === 'intro') {
    const camZoom = 1 + localP * 0.07;
    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-width * 0.5, -height * 0.5);

    const rayAlpha = Math.sin(localP * Math.PI) * 0.24;
    const rayGrad = ctx.createLinearGradient(0, 0, width, height);
    rayGrad.addColorStop(0, hexToRgba(theme.glowColor, 0));
    rayGrad.addColorStop(0.5, hexToRgba(theme.glowColor, rayAlpha));
    rayGrad.addColorStop(1, hexToRgba(theme.glowColor, 0));
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, width, height);

    if (localP < 0.55) {
      const textAlpha = Math.sin((localP / 0.55) * Math.PI);
      const slideY = (1 - easeOutCubic(localP / 0.35)) * minDim * 0.04;
      ctx.font = `500 ${Math.round(minDim * 0.046)}px "Cormorant Garamond", Georgia, serif`;
      const lines = wrapTextLines(
        ctx,
        config.messages.openingMessage || 'THIS SPECIAL MOMENT IS FOR YOU...',
        width * 0.82,
      );
      drawGoldenText(
        ctx,
        lines,
        width * 0.5,
        height * 0.5 + slideY,
        minDim * 0.056,
        minDim * 0.072,
        textAlpha,
        false,
        theme,
        fontColors?.openingMessage,
      );
    } else {
      const subP = clamp01((localP - 0.55) / 0.45);
      const nameAlpha =
        easeOutCubic(Math.min(1, subP * 2)) *
        (subP > 0.85 ? (1 - subP) / 0.15 : 1);
      const nameScale = 0.92 + easeOutCubic(subP) * 0.1;

      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(nameScale, nameScale);
      drawGoldenText(
        ctx,
        [config.recipientName.toUpperCase() || 'SALMA'],
        0,
        0,
        minDim * 0.125,
        minDim * 0.14,
        nameAlpha,
        false,
        theme,
        fontColors?.recipientName,
      );
      ctx.restore();

      if (config.birthdayDate.trim()) {
        const dateStyle = fontColors?.greetingAndDate;
        const dateFontSz = Math.round(minDim * 0.028);
        ctx.save();
        ctx.globalAlpha = nameAlpha * 0.92;
        ctx.textAlign = 'center';
        ctx.font = `500 ${dateFontSz}px "Plus Jakarta Sans", sans-serif`;
        const dateFill = buildFontColorFillStyle(
          ctx,
          dateStyle,
          width * 0.3,
          height * 0.5 + minDim * 0.08,
          width * 0.7,
          height * 0.5 + minDim * 0.14,
          theme.subtitleColor,
        );
        drawStyledTextLine(
          ctx,
          config.birthdayDate.toUpperCase(),
          width * 0.5,
          height * 0.5 + minDim * 0.11,
          dateFontSz,
          dateFill,
          dateStyle,
          theme.glowColor,
          dateStyle ? dateStyle.glowIntensity : 0.3,
        );
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // SCENE 2: BIRTHDAY ANNOUNCEMENT
  else if (scene.id === 'announce') {
    drawBalloons(ctx, width, height, localP, theme);
    drawConfettiBurst(ctx, width, height, localP * 2.1, seeds, 1, theme);

    const fade =
      localP < 0.15
        ? localP / 0.15
        : localP > 0.86
          ? (1 - localP) / 0.14
          : 1;

    const headline =
      config.messages.announcementHeadline.trim() ||
      `HAPPY BIRTHDAY, ${config.recipientName.toUpperCase()}!`;
    const fontSize = minDim * 0.075;
    ctx.font = `600 ${Math.round(fontSize)}px "Cormorant Garamond", Georgia, serif`;
    const lines = wrapTextLines(ctx, headline, width * 0.84);

    drawGoldenText(
      ctx,
      lines,
      width * 0.5,
      height * 0.46,
      fontSize,
      fontSize * 1.18,
      fade,
      false,
      theme,
      fontColors?.mainTitle,
    );

    if (config.personalGreeting.trim()) {
      const greetFontSz = Math.round(minDim * 0.028);
      const greetStyle = fontColors?.greetingAndDate;
      ctx.font = `400 ${greetFontSz}px "Plus Jakarta Sans", sans-serif`;
      const gLines = wrapTextLines(ctx, config.personalGreeting, width * 0.78);
      ctx.save();
      ctx.globalAlpha = fade * 0.94;
      ctx.textAlign = 'center';
      const greetFill = buildFontColorFillStyle(
        ctx,
        greetStyle,
        width * 0.15,
        height * 0.58,
        width * 0.85,
        height * 0.72,
        theme.textColor,
      );
      gLines.slice(0, 3).forEach((line, idx) => {
        drawStyledTextLine(
          ctx,
          line,
          width * 0.5,
          height * 0.61 + idx * minDim * 0.04,
          greetFontSz,
          greetFill,
          greetStyle,
          theme.glowColor,
          greetStyle ? greetStyle.glowIntensity : 0.25,
        );
      });
      ctx.restore();
    }
  }

  // SCENE 3: PERSONAL PHOTO MEMORIES
  else if (scene.id === 'memories') {
    const orderedPhotos = getOrderedMemoryPhotos(config);
    if (orderedPhotos.length > 0) {
      const sceneStartSec = scene.startFrac * duration;
      const sceneDurationSec = Math.max(
        1,
        (scene.endFrac - scene.startFrac) * duration,
      );
      const elapsedInScene = localP * sceneDurationSec;
      const schedule = getScene3PhotoSchedule(
        orderedPhotos,
        sceneStartSec,
        sceneDurationSec,
        config,
      );

      let activeSeg = schedule[schedule.length - 1];
      for (const seg of schedule) {
        if (elapsedInScene >= seg.startSec && elapsedInScene <= seg.endSec) {
          activeSeg = seg;
          break;
        }
      }

      const slideIdx = activeSeg.index;
      const segElapsed = Math.max(0, elapsedInScene - activeSeg.startSec);
      const slideLocalP = clamp01(segElapsed / activeSeg.durationSec);

      const frameW = width * (width > height ? 0.62 : 0.82);
      const frameH = height * (width > height ? 0.66 : 0.56);
      const frameX = (width - frameW) * 0.5;
      const frameY = height * 0.45 - frameH * 0.5;

      const currentPhoto = orderedPhotos[slideIdx];
      const currentImg = images[currentPhoto.id] || null;
      const transCfg = currentPhoto.transition || DEFAULT_TRANSITION_CONFIG;
      const transWinSec = Math.min(
        activeSeg.durationSec * 0.55,
        Math.max(0.35, transCfg.durationSec),
      );

      if (slideIdx > 0 && segElapsed < transWinSec) {
        const prevPhoto = orderedPhotos[slideIdx - 1];
        const prevImg = images[prevPhoto.id] || null;
        const tr = clamp01(segElapsed / transWinSec);
        renderPhotoTransitionPair(
          ctx,
          width,
          height,
          frameX,
          frameY,
          frameW,
          frameH,
          prevPhoto,
          prevImg,
          currentPhoto,
          currentImg,
          tr,
          transCfg,
          seeds,
          true,
          theme,
          t,
          fontColors?.photoCaption,
        );
      } else {
        let alpha = 1;
        let scale = 1;
        let offsetX = 0;

        if (slideIdx === 0 && slideLocalP < 0.14) {
          const pIn = easeOutCubic(slideLocalP / 0.14);
          alpha = pIn;
          if (transCfg.type.startsWith('zoom')) scale = 0.92 + pIn * 0.08;
          if (transCfg.type === 'slide-left') offsetX = (1 - pIn) * width * 0.35;
          if (transCfg.type === 'slide-right') offsetX = -(1 - pIn) * width * 0.35;
        } else if (
          slideIdx === orderedPhotos.length - 1 &&
          slideLocalP > 0.86
        ) {
          const pOut = easeInOutCubic((slideLocalP - 0.86) / 0.14);
          alpha = 1 - pOut;
        }

        drawSingleFramedCard(
          ctx,
          width,
          height,
          frameX,
          frameY,
          frameW,
          frameH,
          currentPhoto,
          currentImg,
          slideLocalP,
          {
            alpha,
            offsetX,
            offsetY: 0,
            scaleX: scale,
            scaleY: scale,
            rotation: 0,
            blurPx: 0,
          },
          true,
          theme,
          t,
          seeds,
          fontColors?.photoCaption,
        );
      }
    } else {
      drawGoldenText(
        ctx,
        ['CHERISHED MEMORIES'],
        width * 0.5,
        height * 0.5,
        minDim * 0.065,
        minDim * 0.08,
        1,
        false,
        theme,
      );
    }
  }

  // SCENE 4: ADVANCED MAGICAL BIRTHDAY CAKE SHOW
  else if (scene.id === 'cake') {
    drawAdvancedCakeScene(ctx, width, height, config, seeds, {
      t,
      localP,
      cakeState: options?.cakeState,
      interactionClockSec: options?.interactionClockSec,
      allowAutoVideoTriggers: true,
      drawStandaloneBackdrop: false,
    });
  }

  // SCENE 5: PERSONALIZED BIRTHDAY WISHES (15-Style Per-Wish Beat-Synced Motion)
  else if (scene.id === 'wishes') {
    const schedule = computeBeatAlignedSchedule(config);
    const beatPulse = sampleBeatPulseAtTime(t, schedule.videoBeats);

    // Slight cross-transition overlap window (0.12s) avoids any blank flash between consecutive wishes
    for (let i = 0; i < schedule.wishSegments.length; i++) {
      const seg = schedule.wishSegments[i];
      const segDur = Math.max(1.0, seg.endSec - seg.startSec);
      if (t >= seg.startSec && t <= seg.endSec) {
        drawAnimatedTextBlock(ctx, {
          width,
          height,
          t,
          elapsedInSegment: t - seg.startSec,
          segmentDuration: segDur,
          text: seg.text,
          anim: seg.config,
          theme,
          colorStyle: fontColors?.birthdayWishes,
          baseFontSize: minDim * 0.052,
          maxWidth: width * 0.82,
          defaultY: height * 0.5,
          italic: true,
          quoted: true,
          beatPulse,
          seeds,
          showRuleLines: true,
        });
      }
    }
  }

  // SCENE 6: FINAL SURPRISE + SPECIAL MESSAGE + TWO-STAGE SENDER REVEAL + FIREWORKS
  else if (scene.id === 'surprise') {
    const schedule = computeBeatAlignedSchedule(config);
    const beatPulse = sampleBeatPulseAtTime(t, schedule.videoBeats);

    drawFireworks(ctx, width, height, localP, seeds, theme);

    const fade = localP < 0.12 ? localP / 0.12 : 1;
    ctx.save();
    ctx.globalAlpha = fade;

    const finalPhoto = getFinalPhoto(config);
    const finalImg = finalPhoto ? images[finalPhoto.id] : null;

    if (finalPhoto && finalImg) {
      const boxSize = minDim * 0.34;
      const bx = (width - boxSize) * 0.5;
      const by = height * 0.31 - boxSize * 0.5;
      const r = minDim * 0.025;
      const preFinalFx = resolvePhotoPreTransform(finalPhoto.effect, t);

      ctx.save();
      ctx.shadowColor = hexToRgba(theme.glowColor, 0.45 + beatPulse * 0.25);
      ctx.shadowBlur = minDim * 0.04;
      drawRoundedRectPath(ctx, bx, by, boxSize, boxSize, r);
      ctx.fillStyle = theme.backgroundPrimary;
      ctx.fill();
      ctx.restore();

      ctx.save();
      drawRoundedRectPath(ctx, bx, by, boxSize, boxSize, r);
      ctx.clip();
      if (preFinalFx.blurPx > 0.3 && 'filter' in ctx) {
        ctx.filter = `blur(${preFinalFx.blurPx.toFixed(1)}px)`;
      }
      ctx.save();
      if (preFinalFx.mirrorX || preFinalFx.pulseScale !== 1) {
        const fcx = bx + boxSize * 0.5;
        const fcy = by + boxSize * 0.5;
        ctx.translate(fcx, fcy);
        ctx.scale(
          (preFinalFx.mirrorX ? -1 : 1) * preFinalFx.pulseScale,
          preFinalFx.pulseScale,
        );
        ctx.translate(-fcx, -fcy);
      }
      drawFramedImageContent(
        ctx,
        finalImg,
        bx,
        by,
        boxSize,
        boxSize,
        finalPhoto.frame || DEFAULT_FRAME_CONFIG,
        1.02 + localP * 0.05 + beatPulse * 0.015,
        0,
        0,
      );
      ctx.restore();
      if ('filter' in ctx) {
        ctx.filter = 'none';
      }
      if (finalPhoto.effect && finalPhoto.effect.type !== 'none') {
        drawPhotoEffectOverlay(
          ctx,
          bx,
          by,
          boxSize,
          boxSize,
          t,
          finalPhoto.effect,
          seeds,
          theme,
        );
      }
      ctx.restore();

      ctx.strokeStyle = theme.photoFrameColor;
      ctx.lineWidth = Math.max(2, minDim * 0.005);
      drawRoundedRectPath(ctx, bx, by, boxSize, boxSize, r);
      ctx.stroke();
    }

    // 1. Special Message Reveal (Synced to dramatic beat + independent entrance/exit)
    const spSeg = schedule.specialSegment;
    if (t >= spSeg.startSec) {
      const spDefaultY = finalImg ? height * 0.585 : height * 0.38;
      // Golden ambient halo behind special message
      const glowW = width * 0.72;
      const haloGrad = ctx.createRadialGradient(
        width * 0.5,
        spDefaultY,
        0,
        width * 0.5,
        spDefaultY,
        glowW * 0.5,
      );
      haloGrad.addColorStop(0, hexToRgba(theme.glowColor, 0.16 + beatPulse * 0.14));
      haloGrad.addColorStop(1, hexToRgba(theme.backgroundPrimary, 0));
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, spDefaultY - glowW * 0.25, width, glowW * 0.5);

      drawAnimatedTextBlock(ctx, {
        width,
        height,
        t,
        elapsedInSegment: t - spSeg.startSec,
        segmentDuration: Math.max(1.2, spSeg.endSec - spSeg.startSec),
        text: spSeg.text,
        anim: spSeg.config,
        theme,
        colorStyle: fontColors?.specialMessage,
        baseFontSize: minDim * 0.054,
        maxWidth: width * 0.84,
        defaultY: spDefaultY,
        uppercase: true,
        beatPulse,
        seeds,
      });
    }

    // 2. Sender Intro Line (e.g. "WITH LOVE AND BEST WISHES FROM" / "FROM YOUR FRIEND")
    const introSeg = schedule.senderIntroSegment;
    if (t >= introSeg.startSec) {
      const introDefaultY = finalImg ? height * 0.715 : height * 0.55;
      drawAnimatedTextBlock(ctx, {
        width,
        height,
        t,
        elapsedInSegment: t - introSeg.startSec,
        segmentDuration: Math.max(1.0, introSeg.endSec - introSeg.startSec),
        text: introSeg.text,
        anim: introSeg.config,
        theme,
        colorStyle: fontColors?.closingPrefix,
        baseFontSize: minDim * 0.028,
        maxWidth: width * 0.82,
        defaultY: introDefaultY,
        uppercase: true,
        beatPulse: beatPulse * 0.4,
        seeds,
      });
    }

    // 3. Prominent Sender Name Reveal (e.g. "HILAL") with Golden Halo & Celebration Glow
    const nameSeg = schedule.senderNameSegment;
    if (t >= nameSeg.startSec) {
      const nameDefaultY = finalImg ? height * 0.805 : height * 0.67;
      drawAnimatedTextBlock(ctx, {
        width,
        height,
        t,
        elapsedInSegment: t - nameSeg.startSec,
        segmentDuration: Math.max(0.9, nameSeg.endSec - nameSeg.startSec),
        text: nameSeg.text,
        anim: nameSeg.config,
        theme,
        colorStyle: fontColors?.senderName,
        baseFontSize: minDim * 0.068,
        maxWidth: width * 0.82,
        defaultY: nameDefaultY,
        uppercase: true,
        beatPulse,
        seeds,
      });
    }

    ctx.restore();
  }

  ctx.restore();

  if (masterAlpha < 1) {
    ctx.fillStyle = hexToRgba(theme.backgroundPrimary, 1 - masterAlpha);
    ctx.fillRect(0, 0, width, height);
  }
}

export function getTransitionName(type: TransitionType): string {
  const names: Record<TransitionType, string> = {
    fade: 'Fade In / Fade Out',
    'zoom-in': 'Zoom In',
    'zoom-out': 'Zoom Out',
    'slide-left': 'Slide Left',
    'slide-right': 'Slide Right',
    'slide-up': 'Slide Up',
    'slide-down': 'Slide Down',
    'flip-3d': '3D Flip',
    rotate: 'Rotate Transition',
    blur: 'Blur Transition',
    'cross-dissolve': 'Cross Dissolve',
    'golden-particles': 'Golden Particle Reveal',
    'light-flash': 'Light Flash',
    'circular-reveal': 'Circular Reveal',
    'smooth-mask': 'Smooth Mask Reveal',
    'pan-zoom': 'Cinematic Pan and Zoom',
  };
  return names[type] || 'Fade In / Fade Out';
}

export function drawFramingPreview(
  ctx: CanvasRenderingContext2D,
  videoWidth: number,
  videoHeight: number,
  photo: StudioPhoto,
  img: HTMLImageElement | null,
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  ctx.fillStyle = theme.backgroundPrimary;
  ctx.fillRect(0, 0, videoWidth, videoHeight);

  const frameW = videoWidth * (videoWidth > videoHeight ? 0.62 : 0.82);
  const frameH = videoHeight * (videoWidth > videoHeight ? 0.66 : 0.56);
  const frameX = (videoWidth - frameW) * 0.5;
  const frameY = videoHeight * 0.45 - frameH * 0.5;
  const minDim = Math.min(videoWidth, videoHeight);
  const radius = minDim * 0.025;

  ctx.fillStyle = hexToRgba(theme.backgroundSecondary, 0.55);
  ctx.fillRect(0, 0, videoWidth, videoHeight);

  ctx.save();
  drawRoundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.clip();

  if (img) {
    drawFramedImageContent(
      ctx,
      img,
      frameX,
      frameY,
      frameW,
      frameH,
      photo.frame || DEFAULT_FRAME_CONFIG,
      1,
      0,
      0,
    );
  } else {
    ctx.fillStyle = theme.backgroundSecondary;
    ctx.fillRect(frameX, frameY, frameW, frameH);
  }

  ctx.strokeStyle = hexToRgba(theme.photoFrameAccentColor, 0.28);
  ctx.lineWidth = Math.max(1, minDim * 0.002);
  ctx.beginPath();
  ctx.moveTo(frameX + frameW / 3, frameY);
  ctx.lineTo(frameX + frameW / 3, frameY + frameH);
  ctx.moveTo(frameX + (frameW * 2) / 3, frameY);
  ctx.lineTo(frameX + (frameW * 2) / 3, frameY + frameH);
  ctx.moveTo(frameX, frameY + frameH / 3);
  ctx.lineTo(frameX + frameW, frameY + frameH / 3);
  ctx.moveTo(frameX, frameY + (frameH * 2) / 3);
  ctx.lineTo(frameX + frameW, frameY + (frameH * 2) / 3);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = theme.photoFrameColor;
  ctx.lineWidth = Math.max(2, minDim * 0.005);
  drawRoundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.stroke();

  if (photo.caption.trim()) {
    ctx.font = `italic 500 ${Math.round(minDim * 0.036)}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = theme.subtitleColor;
    ctx.textAlign = 'center';
    ctx.fillText(
      photo.caption.slice(0, 42),
      videoWidth * 0.5,
      frameY + frameH + minDim * 0.068,
    );
  }
}
