import {
  DEFAULT_PHOTO_EFFECT_CONFIG,
  DEFAULT_VIDEO_THEME,
  PHOTO_EFFECTS_CATALOG,
  PhotoEffectConfig,
  PhotoEffectType,
  VideoThemeConfig,
} from '../types';
import { hexToRgba } from './themeColorUtils';

export interface EffectSeed {
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

export function getPhotoEffectName(type?: PhotoEffectType): string {
  if (!type || type === 'none') return 'Original (No Effect)';
  const found = PHOTO_EFFECTS_CATALOG.find((e) => e.id === type);
  return found ? found.name : 'Original (No Effect)';
}

export interface PhotoPreEffectTransform {
  mirrorX: boolean;
  pulseScale: number;
  blurPx: number;
}

/**
 * Returns pre-draw image transforms for effects that alter photo geometry/optics
 * (e.g., Flipped horizontal mirror, Heartbeat rhythmic pulse, Dreamy Soft Focus).
 */
export function resolvePhotoPreTransform(
  effect?: PhotoEffectConfig,
  t = 0,
): PhotoPreEffectTransform {
  if (!effect || effect.type === 'none') {
    return { mirrorX: false, pulseScale: 1, blurPx: 0 };
  }
  const intensity = Math.max(0.2, Math.min(1.6, effect.intensity ?? 1));
  const speed = Math.max(0.4, Math.min(2.0, effect.speed ?? 1));

  if (effect.type === 'flipped') {
    return { mirrorX: true, pulseScale: 1, blurPx: 0 };
  }

  if (effect.type === 'heartbeat') {
    // Classic double-beat lub-dub cardiac curve (~1.25 Hz * speed)
    const phase = ((t * 1.15 * speed) % 1 + 1) % 1;
    const lub = Math.exp(-Math.pow((phase - 0.14) / 0.055, 2));
    const dub = Math.exp(-Math.pow((phase - 0.31) / 0.065, 2)) * 0.72;
    const bump = Math.max(lub, dub) * 0.065 * intensity;
    return { mirrorX: false, pulseScale: 1 + bump, blurPx: 0 };
  }

  if (effect.type === 'dreamy-soft-focus') {
    return {
      mirrorX: false,
      pulseScale: 1,
      blurPx: 1.4 * intensity * (effect.opacity ?? 0.9),
    };
  }

  return { mirrorX: false, pulseScale: 1, blurPx: 0 };
}

function drawHeartPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rot = 0,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rot !== 0) ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.34);
  ctx.bezierCurveTo(r * 0.06, -r * 0.12, r * 0.85, -r * 0.25, r * 0.85, r * 0.22);
  ctx.bezierCurveTo(r * 0.85, r * 0.65, r * 0.25, r * 0.92, 0, r * 1.12);
  ctx.bezierCurveTo(-r * 0.25, r * 0.92, -r * 0.85, r * 0.65, -r * 0.85, r * 0.22);
  ctx.bezierCurveTo(-r * 0.85, -r * 0.25, -r * 0.06, -r * 0.12, 0, r * 0.34);
  ctx.closePath();
  ctx.restore();
}

function fillHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  rot = 0,
  glossy = false,
) {
  ctx.save();
  ctx.translate(cx, cy - r * 0.42);
  if (rot !== 0) ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.34);
  ctx.bezierCurveTo(r * 0.06, -r * 0.12, r * 0.85, -r * 0.25, r * 0.85, r * 0.22);
  ctx.bezierCurveTo(r * 0.85, r * 0.65, r * 0.25, r * 0.92, 0, r * 1.12);
  ctx.bezierCurveTo(-r * 0.25, r * 0.92, -r * 0.85, r * 0.65, -r * 0.85, r * 0.22);
  ctx.bezierCurveTo(-r * 0.85, -r * 0.25, -r * 0.06, -r * 0.12, 0, r * 0.34);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (glossy) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, r * 0.14, r * 0.16, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFourPointSpark(
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
    ctx.lineTo(Math.cos(ia) * r * 0.25, Math.sin(ia) * r * 0.25);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFivePointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  rot: number,
) {
  const innerR = outerR * 0.44;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Renders the selected Photo Effects Studio overlay clipped cleanly to the photo bounds
 * (rx, ry, rw, rh). Runs identically inside live mini-preview, studio preview, and video export.
 */
export function drawPhotoEffectOverlay(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  t: number,
  rawEffect: PhotoEffectConfig | undefined,
  seeds: EffectSeed[],
  theme: VideoThemeConfig = DEFAULT_VIDEO_THEME,
) {
  if (!rawEffect || rawEffect.type === 'none') return;

  const effect: PhotoEffectConfig = { ...DEFAULT_PHOTO_EFFECT_CONFIG, ...rawEffect };
  const intensity = Math.max(0.2, Math.min(1.6, effect.intensity));
  const speed = Math.max(0.4, Math.min(2.0, effect.speed));
  const sizeMult = Math.max(0.5, Math.min(1.6, effect.size));
  const masterOp = clamp01(effect.opacity);
  if (masterOp <= 0.02) return;

  const minDim = Math.min(rw, rh);
  const countScale = Math.max(0.45, intensity);

  ctx.save();
  ctx.globalAlpha *= masterOp;

  switch (effect.type) {
    case 'valentine-night': {
      // Deep romantic crimson-violet edge vignette + glowing bokeh embers
      const vig = ctx.createRadialGradient(
        rx + rw * 0.5,
        ry + rh * 0.48,
        minDim * 0.22,
        rx + rw * 0.5,
        ry + rh * 0.5,
        Math.max(rw, rh) * 0.68,
      );
      vig.addColorStop(0, 'rgba(255, 80, 140, 0.04)');
      vig.addColorStop(0.65, `rgba(92, 12, 54, ${(0.28 * intensity).toFixed(3)})`);
      vig.addColorStop(1, `rgba(26, 4, 24, ${(0.62 * intensity).toFixed(3)})`);
      ctx.fillStyle = vig;
      ctx.fillRect(rx, ry, rw, rh);

      const n = Math.round(18 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 3) % seeds.length];
        const bx = rx + (((s.x + Math.sin(t * 0.5 * speed + s.phase) * 0.04) % 1 + 1) % 1) * rw;
        const by = ry + (((s.y - t * 0.08 * speed * s.speed) % 1 + 1) % 1) * rh;
        const br = minDim * (0.018 + s.size * 0.03) * sizeMult;
        const glow = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 * speed + s.phase));
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, i % 2 === 0 ? `rgba(255, 130, 175, ${glow})` : `rgba(247, 217, 126, ${glow * 0.85})`);
        g.addColorStop(1, 'rgba(255, 80, 140, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'bobbing-heart': {
      const n = Math.round(14 * countScale);
      const colors = ['#FF4D79', '#FF85A6', '#F43F5E', '#FDA4AF'];
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 9) % seeds.length];
        const cycleY = (((s.y - t * 0.14 * speed * s.speed) % 1.15) + 1.15) % 1.15 - 0.08;
        const bobX = Math.sin(t * 2.6 * speed + s.phase) * rw * 0.045;
        const hx = rx + s.x * rw + bobX;
        const hy = ry + cycleY * rh;
        const hr = minDim * (0.026 + s.size * 0.022) * sizeMult;
        const a = Math.sin(clamp01((cycleY + 0.05) / 1.1) * Math.PI);
        ctx.save();
        ctx.globalAlpha *= clamp01(a * 0.92);
        fillHeart(ctx, hx, hy, hr, colors[i % colors.length], Math.sin(t * 2 + s.phase) * 0.18, true);
        ctx.restore();
      }
      break;
    }

    case 'winter-light': {
      // Cool frosty ice border + drifting 6-point crystalline snowflakes
      const iceGrad = ctx.createRadialGradient(
        rx + rw * 0.5,
        ry + rh * 0.5,
        minDim * 0.25,
        rx + rw * 0.5,
        ry + rh * 0.5,
        Math.max(rw, rh) * 0.72,
      );
      iceGrad.addColorStop(0, 'rgba(205, 240, 255, 0.04)');
      iceGrad.addColorStop(1, `rgba(147, 217, 255, ${(0.28 * intensity).toFixed(3)})`);
      ctx.fillStyle = iceGrad;
      ctx.fillRect(rx, ry, rw, rh);

      const n = Math.round(24 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 17) % seeds.length];
        const fx = rx + (((s.x + Math.sin(t * 0.9 * speed + s.phase) * 0.03) % 1 + 1) % 1) * rw;
        const fy = ry + (((s.y + t * 0.12 * speed * s.speed) % 1 + 1) % 1) * rh;
        const r = minDim * (0.012 + s.size * 0.015) * sizeMult;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(s.rot + t * 0.8 * speed);
        ctx.strokeStyle = 'rgba(235, 248, 255, 0.85)';
        ctx.lineWidth = Math.max(1, r * 0.16);
        for (let arm = 0; arm < 3; arm++) {
          const a = (arm * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'rose-shower': {
      const n = Math.round(22 * countScale);
      const petalColors = ['#E11D48', '#FB7185', '#BE123C', '#FDA4AF'];
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 23) % seeds.length];
        const px = rx + (((s.x + Math.sin(t * 1.4 * speed + s.phase) * 0.06) % 1 + 1) % 1) * rw;
        const py = ry + (((s.y + t * 0.17 * speed * s.speed) % 1.1) + 1.1) % 1.1 * rh - rh * 0.05;
        const pw = minDim * (0.016 + s.size * 0.018) * sizeMult;
        const ph = pw * 0.62;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(s.rot + t * 1.8 * speed * (i % 2 === 0 ? 1 : -1));
        ctx.fillStyle = petalColors[i % petalColors.length];
        ctx.globalAlpha *= 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, pw, ph, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 228, 235, 0.32)';
        ctx.beginPath();
        ctx.ellipse(-pw * 0.25, -ph * 0.2, pw * 0.4, ph * 0.3, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'heart-emojis': {
      const n = Math.round(16 * countScale);
      const badgePalette = ['#EF4444', '#EC4899', '#F59E0B', '#A855F7', '#F43F5E'];
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 31) % seeds.length];
        const bx = rx + s.x * rw + Math.sin(t * 1.6 * speed + s.phase) * rw * 0.03;
        const by = ry + (((s.y - t * 0.13 * speed * s.speed) % 1.1) + 1.1) % 1.1 * rh;
        const r = minDim * (0.025 + s.size * 0.018) * sizeMult;
        const scalePulse = 0.88 + 0.18 * Math.sin(t * 3 * speed + s.phase);
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(scalePulse, scalePulse);
        // Glossy sticker halo behind each heart emoji badge
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
        ctx.fill();
        fillHeart(ctx, 0, 0, r * 0.78, badgePalette[i % badgePalette.length], Math.sin(s.phase) * 0.25, true);
        ctx.restore();
      }
      break;
    }

    case 'flash': {
      const beat = ((t * 1.25 * speed) % 1 + 1) % 1;
      const strobe = Math.pow(Math.max(0, 1 - beat * 3.4), 2.2) * Math.min(1, intensity * 0.72);
      if (strobe > 0.01) {
        const fg = ctx.createRadialGradient(
          rx + rw * 0.5,
          ry + rh * 0.45,
          minDim * 0.04,
          rx + rw * 0.5,
          ry + rh * 0.5,
          Math.max(rw, rh) * 0.78,
        );
        fg.addColorStop(0, `rgba(255, 255, 255, ${strobe.toFixed(3)})`);
        fg.addColorStop(0.55, `rgba(255, 240, 200, ${(strobe * 0.55).toFixed(3)})`);
        fg.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = fg;
        ctx.fillRect(rx, ry, rw, rh);
      }
      // Subtle diagonal camera lens glint
      const flareAlpha = (0.14 + strobe * 0.65) * Math.min(1, intensity);
      ctx.fillStyle = `rgba(255, 250, 230, ${flareAlpha.toFixed(3)})`;
      drawFourPointSpark(ctx, rx + rw * 0.22, ry + rh * 0.22, minDim * 0.09 * sizeMult, t * 0.6 * speed);
      break;
    }

    case 'rainbow-heart': {
      const n = Math.round(15 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 41) % seeds.length];
        const hue = (i * 34 + t * 85 * speed) % 360;
        const hx = rx + (((s.x + Math.cos(t * 0.8 * speed + s.phase) * 0.05) % 1 + 1) % 1) * rw;
        const hy = ry + (((s.y - t * 0.11 * speed * s.speed) % 1 + 1) % 1) * rh;
        const r = minDim * (0.024 + s.size * 0.022) * sizeMult;
        ctx.save();
        ctx.shadowColor = `hsla(${hue}, 95%, 65%, 0.75)`;
        ctx.shadowBlur = r * 0.65;
        fillHeart(ctx, hx, hy, r, `hsla(${hue}, 92%, 65%, 0.9)`, Math.sin(t + s.phase) * 0.25, true);
        ctx.restore();
      }
      break;
    }

    case 'heart-bubbles': {
      const n = Math.round(13 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 47) % seeds.length];
        const bx = rx + s.x * rw + Math.sin(t * 1.2 * speed + s.phase) * rw * 0.05;
        const by = ry + (((s.y - t * 0.12 * speed * s.speed) % 1.1) + 1.1) % 1.1 * rh;
        const br = minDim * (0.036 + s.size * 0.028) * sizeMult;
        ctx.save();
        // Iridescent soap bubble shell
        const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);
        bg.addColorStop(0, 'rgba(255,255,255,0.22)');
        bg.addColorStop(0.7, 'rgba(244, 114, 182, 0.12)');
        bg.addColorStop(1, 'rgba(196, 181, 253, 0.42)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = Math.max(1, br * 0.05);
        ctx.stroke();
        // Tiny pink heart nestled inside each bubble
        fillHeart(ctx, bx, by + br * 0.05, br * 0.45, '#F472B6', Math.sin(t + i) * 0.15, true);
        ctx.restore();
      }
      break;
    }

    case 'love-comment': {
      const n = Math.max(4, Math.round(7 * countScale));
      const labels = ['LOVE!', 'SO SPECIAL', 'HAPPY BDAY', 'ADORABLE', 'XO ♥', 'QUEEN', 'STUNNING'];
      const pillColors = ['#EC4899', '#A855F7', '#F43F5E', '#D97706'];
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 53) % seeds.length];
        const cycle = (((s.y - t * 0.15 * speed * (0.7 + s.size * 0.4)) % 1.15) + 1.15) % 1.15 - 0.08;
        const px = rx + rw * (0.14 + ((i * 0.23 + s.x * 0.4) % 0.72));
        const py = ry + cycle * rh;
        const a = Math.sin(clamp01((cycle + 0.05) / 1.1) * Math.PI);
        if (a <= 0.05) continue;

        const fontSize = Math.max(9, Math.round(minDim * 0.032 * sizeMult));
        const tag = labels[i % labels.length];
        const pillW = Math.max(fontSize * 5.2, tag.length * fontSize * 0.65 + fontSize * 1.9);
        const pillH = fontSize * 1.75;

        ctx.save();
        ctx.globalAlpha *= clamp01(a * 0.94);
        ctx.translate(px, py);
        ctx.fillStyle = 'rgba(20, 8, 36, 0.78)';
        drawRoundedRect(ctx, -pillW * 0.5, -pillH * 0.5, pillW, pillH, pillH * 0.5);
        ctx.fill();
        ctx.strokeStyle = pillColors[i % pillColors.length];
        ctx.lineWidth = Math.max(1.2, minDim * 0.004);
        ctx.stroke();

        fillHeart(ctx, -pillW * 0.5 + pillH * 0.52, 0, fontSize * 0.46, pillColors[i % pillColors.length], 0, false);
        ctx.fillStyle = '#FDF9FF';
        ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, -pillW * 0.5 + pillH * 0.92, 0.5);
        ctx.restore();
      }
      break;
    }

    case 'sketch-heart': {
      const n = Math.max(5, Math.round(9 * countScale));
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 59) % seeds.length];
        const hx = rx + rw * (0.12 + s.x * 0.76);
        const hy = ry + rh * (0.14 + s.y * 0.72) + Math.sin(t * 1.4 * speed + s.phase) * rh * 0.025;
        const r = minDim * (0.045 + s.size * 0.04) * sizeMult;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate((s.rot - Math.PI) * 0.28 + Math.sin(t * speed + s.phase) * 0.08);
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 245, 220, 0.88)' : 'rgba(251, 182, 206, 0.9)';
        ctx.lineWidth = Math.max(1.5, minDim * 0.0055 * sizeMult);
        ctx.setLineDash([r * 0.55, r * 0.16]);
        ctx.lineDashOffset = -t * 16 * speed;
        drawHeartPath(ctx, 0, -r * 0.4, r, 0);
        ctx.stroke();
        ctx.lineWidth *= 0.65;
        ctx.setLineDash([]);
        drawHeartPath(ctx, r * 0.06, -r * 0.36, r * 0.88, 0.06);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'golden-melody': {
      const n = Math.round(15 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 67) % seeds.length];
        const nx = rx + s.x * rw + Math.sin(t * 1.7 * speed + s.phase) * rw * 0.04;
        const ny = ry + (((s.y - t * 0.13 * speed * s.speed) % 1.1) + 1.1) % 1.1 * rh;
        const nr = minDim * (0.018 + s.size * 0.014) * sizeMult;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(Math.sin(t * 1.8 * speed + s.phase) * 0.25);
        ctx.fillStyle = i % 2 === 0 ? '#F7D97E' : '#FDE68A';
        ctx.strokeStyle = '#F7D97E';
        ctx.lineWidth = Math.max(1.6, nr * 0.25);
        // Note head
        ctx.beginPath();
        ctx.ellipse(0, 0, nr * 0.55, nr * 0.38, -0.35, 0, Math.PI * 2);
        ctx.fill();
        // Stem & flag
        ctx.beginPath();
        ctx.moveTo(nr * 0.45, 0);
        ctx.lineTo(nr * 0.45, -nr * 1.9);
        ctx.quadraticCurveTo(nr * 1.2, -nr * 1.5, nr * 0.9, -nr * 0.95);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'rainbow-neon': {
      const lw = Math.max(3, minDim * 0.014 * sizeMult);
      const shift = (t * 90 * speed) % 360;
      const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
      for (let stop = 0; stop <= 4; stop++) {
        const h = (shift + stop * 72) % 360;
        g.addColorStop(stop / 4, `hsl(${h}, 95%, 64%)`);
      }
      ctx.save();
      ctx.shadowColor = `hsl(${shift}, 95%, 62%)`;
      ctx.shadowBlur = minDim * 0.065 * intensity;
      ctx.strokeStyle = g;
      ctx.lineWidth = lw;
      drawRoundedRect(ctx, rx + lw * 0.8, ry + lw * 0.8, rw - lw * 1.6, rh - lw * 1.6, minDim * 0.03);
      ctx.stroke();
      ctx.lineWidth = lw * 0.45;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'flipped': {
      // Horizontal flip itself happens in pre-transform; add a subtle mirror-divider shimmer badge at corner
      ctx.save();
      ctx.strokeStyle = 'rgba(247, 217, 126, 0.32)';
      ctx.lineWidth = Math.max(1, minDim * 0.004);
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(rx + rw * 0.5, ry + rh * 0.06);
      ctx.lineTo(rx + rw * 0.5, ry + rh * 0.94);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'heart-kisses': {
      const n = Math.round(12 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 71) % seeds.length];
        const kx = rx + rw * (0.1 + s.x * 0.8);
        const ky = ry + (((s.y - t * 0.09 * speed) % 1 + 1) % 1) * rh;
        const kr = minDim * (0.028 + s.size * 0.018) * sizeMult;
        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate((s.rot - Math.PI) * 0.35);
        if (i % 2 === 0) {
          // Stylized velvet lip kiss mark
          ctx.fillStyle = '#FB7185';
          ctx.beginPath();
          ctx.moveTo(-kr, 0);
          ctx.quadraticCurveTo(-kr * 0.45, -kr * 0.62, 0, -kr * 0.22);
          ctx.quadraticCurveTo(kr * 0.45, -kr * 0.62, kr, 0);
          ctx.quadraticCurveTo(0, kr * 0.14, -kr, 0);
          ctx.fill();
          ctx.fillStyle = '#E11D48';
          ctx.beginPath();
          ctx.moveTo(-kr * 0.92, kr * 0.08);
          ctx.quadraticCurveTo(0, kr * 0.72, kr * 0.92, kr * 0.08);
          ctx.quadraticCurveTo(0, kr * 0.25, -kr * 0.92, kr * 0.08);
          ctx.fill();
        } else {
          fillHeart(ctx, 0, 0, kr * 0.78, '#F43F5E', 0, true);
        }
        ctx.restore();
      }
      break;
    }

    case 'heartbeat': {
      const phase = ((t * 1.15 * speed) % 1 + 1) % 1;
      const pulse = Math.max(
        Math.exp(-Math.pow((phase - 0.14) / 0.06, 2)),
        Math.exp(-Math.pow((phase - 0.31) / 0.07, 2)) * 0.72,
      );
      const rg = ctx.createRadialGradient(
        rx + rw * 0.5,
        ry + rh * 0.5,
        minDim * 0.18,
        rx + rw * 0.5,
        ry + rh * 0.5,
        Math.max(rw, rh) * 0.72,
      );
      rg.addColorStop(0, 'rgba(244, 63, 94, 0)');
      rg.addColorStop(1, `rgba(225, 29, 72, ${(0.22 + pulse * 0.34 * intensity).toFixed(3)})`);
      ctx.fillStyle = rg;
      ctx.fillRect(rx, ry, rw, rh);

      // Subtle glowing pulse heart & ECG line along bottom
      const ecgY = ry + rh * 0.88;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 130, 175, ${(0.55 + pulse * 0.4).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.5, minDim * 0.006 * sizeMult);
      ctx.beginPath();
      ctx.moveTo(rx + rw * 0.12, ecgY);
      ctx.lineTo(rx + rw * 0.38, ecgY);
      ctx.lineTo(rx + rw * 0.43, ecgY - minDim * 0.045 * (0.6 + pulse));
      ctx.lineTo(rx + rw * 0.49, ecgY + minDim * 0.035 * (0.6 + pulse));
      ctx.lineTo(rx + rw * 0.55, ecgY - minDim * 0.07 * (0.6 + pulse));
      ctx.lineTo(rx + rw * 0.61, ecgY + minDim * 0.02 * (0.6 + pulse));
      ctx.lineTo(rx + rw * 0.65, ecgY);
      ctx.lineTo(rx + rw * 0.88, ecgY);
      ctx.stroke();
      fillHeart(ctx, rx + rw * 0.5, ry + rh * 0.14, minDim * (0.045 + pulse * 0.015) * sizeMult, '#FB7185', 0, true);
      ctx.restore();
      break;
    }

    case 'rave-frequency': {
      const bars = 26;
      const barSpan = (rw * 0.86) / bars;
      const baseX = rx + rw * 0.07;
      const baseY = ry + rh * 0.94;
      for (let i = 0; i < bars; i++) {
        const hue = (i * 14 + t * 140 * speed) % 360;
        const amp =
          0.25 +
          0.75 *
            Math.abs(
              Math.sin(t * 6.5 * speed + i * 0.55) * 0.65 +
                Math.cos(t * 4.2 * speed - i * 0.35) * 0.35,
            );
        const bh = minDim * 0.22 * amp * intensity * sizeMult;
        const bw = barSpan * 0.68;
        ctx.fillStyle = `hsla(${hue}, 95%, 64%, 0.88)`;
        drawRoundedRect(ctx, baseX + i * barSpan, baseY - bh, bw, bh, bw * 0.4);
        ctx.fill();
      }
      break;
    }

    case 'golden-sparkles': {
      const n = Math.round(28 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 83) % seeds.length];
        const sx = rx + s.x * rw;
        const sy = ry + s.y * rh;
        const twinkle = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.8 * speed + s.phase), 2);
        const sr = minDim * (0.012 + s.size * 0.022) * sizeMult * (0.55 + twinkle * 0.65);
        ctx.save();
        ctx.globalAlpha *= twinkle;
        ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? '#F7D97E' : theme.particleColor;
        drawFourPointSpark(ctx, sx, sy, sr, s.rot + t * 0.9 * speed);
        ctx.restore();
      }
      break;
    }

    case 'cinematic-glow': {
      const orbX = rx + rw * (0.35 + Math.sin(t * 0.6 * speed) * 0.2);
      const orbY = ry + rh * 0.28;
      const g1 = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, Math.max(rw, rh) * 0.72);
      g1.addColorStop(0, `rgba(255, 224, 150, ${(0.36 * intensity).toFixed(3)})`);
      g1.addColorStop(0.5, `rgba(247, 178, 126, ${(0.18 * intensity).toFixed(3)})`);
      g1.addColorStop(1, 'rgba(255, 215, 130, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(rx, ry, rw, rh);

      const g2 = ctx.createRadialGradient(
        rx + rw * 0.5,
        ry + rh * 0.5,
        minDim * 0.25,
        rx + rw * 0.5,
        ry + rh * 0.5,
        Math.max(rw, rh) * 0.7,
      );
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(1, `rgba(245, 158, 11, ${(0.22 * intensity).toFixed(3)})`);
      ctx.fillStyle = g2;
      ctx.fillRect(rx, ry, rw, rh);
      break;
    }

    case 'dreamy-soft-focus': {
      const dg = ctx.createRadialGradient(
        rx + rw * 0.5,
        ry + rh * 0.5,
        minDim * 0.16,
        rx + rw * 0.5,
        ry + rh * 0.5,
        Math.max(rw, rh) * 0.72,
      );
      dg.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      dg.addColorStop(0.65, `rgba(245, 208, 254, ${(0.22 * intensity).toFixed(3)})`);
      dg.addColorStop(1, `rgba(253, 242, 248, ${(0.45 * intensity).toFixed(3)})`);
      ctx.fillStyle = dg;
      ctx.fillRect(rx, ry, rw, rh);
      break;
    }

    case 'butterfly-garden': {
      const n = Math.max(4, Math.round(8 * countScale));
      const wingPalette = ['#F7D97E', '#F472B6', '#C084FC', '#38BDF8'];
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 97) % seeds.length];
        const bx = rx + (((s.x + t * 0.06 * speed * (i % 2 === 0 ? 1 : -1)) % 1 + 1) % 1) * rw;
        const by = ry + (((s.y - t * 0.05 * speed * s.speed) % 1 + 1) % 1) * rh + Math.sin(t * 2.5 * speed + s.phase) * rh * 0.03;
        const br = minDim * (0.028 + s.size * 0.018) * sizeMult;
        const flap = 0.38 + 0.62 * Math.abs(Math.sin(t * 7.5 * speed + s.phase));
        const col = wingPalette[i % wingPalette.length];

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(Math.sin(t * 1.4 + s.phase) * 0.35);
        ctx.fillStyle = col;
        // Left wings
        ctx.beginPath();
        ctx.ellipse(-br * 0.45 * flap, -br * 0.25, br * 0.55 * flap, br * 0.38, -0.35, 0, Math.PI * 2);
        ctx.ellipse(-br * 0.35 * flap, br * 0.28, br * 0.4 * flap, br * 0.28, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Right wings
        ctx.beginPath();
        ctx.ellipse(br * 0.45 * flap, -br * 0.25, br * 0.55 * flap, br * 0.38, 0.35, 0, Math.PI * 2);
        ctx.ellipse(br * 0.35 * flap, br * 0.28, br * 0.4 * flap, br * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#FFF7ED';
        ctx.fillRect(-br * 0.06, -br * 0.42, br * 0.12, br * 0.84);
        ctx.restore();
      }
      break;
    }

    case 'floating-stars': {
      const n = Math.round(22 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 107) % seeds.length];
        const sx = rx + (((s.x + t * 0.03 * speed) % 1 + 1) % 1) * rw;
        const sy = ry + (((s.y - t * 0.09 * speed * s.speed) % 1 + 1) % 1) * rh;
        const sr = minDim * (0.012 + s.size * 0.016) * sizeMult;
        const twinkle = 0.45 + 0.55 * Math.sin(t * 2.5 * speed + s.phase);
        ctx.save();
        ctx.globalAlpha *= twinkle;
        ctx.fillStyle = i % 2 === 0 ? '#FDE68A' : '#FDF9FF';
        drawFivePointStar(ctx, sx, sy, sr, s.rot + t * 0.7 * speed);
        ctx.restore();
      }
      break;
    }

    case 'pink-dust': {
      const n = Math.round(45 * countScale);
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 113) % seeds.length];
        const dx = rx + (((s.x + Math.sin(t * 0.8 * speed + s.phase) * 0.05) % 1 + 1) % 1) * rw;
        const dy = ry + (((s.y - t * 0.07 * speed * s.speed) % 1 + 1) % 1) * rh;
        const dr = minDim * (0.0045 + s.size * 0.009) * sizeMult;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 228, 242, 0.85)' : 'rgba(244, 114, 182, 0.72)';
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'golden-frame': {
      const pad = minDim * 0.045;
      const lw = Math.max(2, minDim * 0.012 * sizeMult);
      const gg = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
      gg.addColorStop(0, '#FFF2B8');
      gg.addColorStop(0.5, '#E8C574');
      gg.addColorStop(1, '#B8862D');

      ctx.save();
      ctx.strokeStyle = gg;
      ctx.lineWidth = lw;
      drawRoundedRect(ctx, rx + pad, ry + pad, rw - pad * 2, rh - pad * 2, minDim * 0.02);
      ctx.stroke();

      ctx.lineWidth = lw * 0.45;
      drawRoundedRect(ctx, rx + pad * 1.45, ry + pad * 1.45, rw - pad * 2.9, rh - pad * 2.9, minDim * 0.015);
      ctx.stroke();

      // Corner diamond filigree stars
      ctx.fillStyle = '#FFF2B8';
      const corners = [
        [rx + pad, ry + pad],
        [rx + rw - pad, ry + pad],
        [rx + pad, ry + rh - pad],
        [rx + rw - pad, ry + rh - pad],
      ];
      corners.forEach(([cx, cy], idx) => {
        drawFourPointSpark(ctx, cx, cy, lw * 2.4, t * 0.5 * speed + idx);
      });
      ctx.restore();
      break;
    }

    case 'aurora-lights': {
      const ribbons = 3;
      const ribbonColors = ['rgba(52, 211, 153, 0.34)', 'rgba(56, 189, 248, 0.32)', 'rgba(192, 132, 252, 0.32)'];
      for (let rIdx = 0; rIdx < ribbons; rIdx++) {
        ctx.save();
        const baseY = ry + rh * (0.18 + rIdx * 0.11);
        const amp = rh * 0.08 * sizeMult;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx, baseY);
        for (let step = 0; step <= 12; step++) {
          const sx = rx + (step / 12) * rw;
          const sy = baseY + Math.sin(t * 1.4 * speed + step * 0.65 + rIdx * 1.7) * amp;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(rx + rw, ry);
        ctx.closePath();
        const ag = ctx.createLinearGradient(0, ry, 0, baseY + amp);
        ag.addColorStop(0, ribbonColors[rIdx]);
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag;
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'glitter-explosion': {
      const cycle = ((t * 0.85 * speed) % 1 + 1) % 1;
      const expand = Math.pow(cycle, 0.65);
      const n = Math.round(36 * countScale);
      const palette = ['#FFF2B8', '#F472B6', '#38BDF8', '#C084FC', '#FFFFFF'];
      for (let i = 0; i < n; i++) {
        const s = seeds[(i + 127) % seeds.length];
        const ang = (i / n) * Math.PI * 2 + s.phase;
        const dist = expand * Math.max(rw, rh) * (0.28 + s.size * 0.42);
        const gx = rx + rw * 0.5 + Math.cos(ang) * dist;
        const gy = ry + rh * 0.5 + Math.sin(ang) * dist;
        const alpha = clamp01(1 - Math.pow(cycle, 1.8));
        if (alpha <= 0.04) continue;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = palette[i % palette.length];
        drawFourPointSpark(ctx, gx, gy, minDim * (0.012 + s.size * 0.016) * sizeMult, ang + t * 2);
        ctx.restore();
      }
      break;
    }

    case 'luxury-shimmer': {
      const cycle = ((t * 0.55 * speed) % 1.4 + 1.4) % 1.4 - 0.2;
      const diagX = rx + rw * cycle;
      const beamW = rw * 0.34 * sizeMult;
      const sg = ctx.createLinearGradient(diagX - beamW, ry, diagX + beamW, ry + rh);
      sg.addColorStop(0, 'rgba(255, 242, 184, 0)');
      sg.addColorStop(0.45, `rgba(255, 242, 184, ${(0.28 * intensity).toFixed(3)})`);
      sg.addColorStop(0.5, `rgba(255, 255, 255, ${(0.42 * intensity).toFixed(3)})`);
      sg.addColorStop(0.55, `rgba(232, 197, 116, ${(0.24 * intensity).toFixed(3)})`);
      sg.addColorStop(1, 'rgba(232, 197, 116, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(rx, ry, rw, rh);
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
