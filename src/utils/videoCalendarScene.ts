import {
  DEFAULT_CALENDAR_CONFIG,
  DEFAULT_VIDEO_THEME,
  StudioProjectConfig,
} from '../types';
import {
  clampDayToMonth,
  computeCalendarHighlightedDay,
  formatBirthdayLabel,
  getCalendarMonthGrid,
  getMonthName,
  normalizeMonth,
  WEEKDAY_HEADERS,
} from './calendarDateUtils';
import { blendHex, hexToRgba } from './themeColorUtils';

export interface CalendarParticleSeed {
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
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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

/**
 * Renders the 4-stage Cinematic Birthday Calendar Introduction.
 * Works identically inside full video export, main preview, and the mini Calendar Studio preview.
 */
export function drawCalendarIntroScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localP: number,
  t: number,
  config: StudioProjectConfig,
  seeds: CalendarParticleSeed[],
) {
  const cal = config.calendarConfig || DEFAULT_CALENDAR_CONFIG;
  const theme = config.videoTheme || DEFAULT_VIDEO_THEME;
  const minDim = Math.min(width, height);
  const isLandscape = width > height * 1.15;

  const month = normalizeMonth(config.birthdayMonth);
  const targetDay = clampDayToMonth(month, config.birthdayDay, config.birthdayYear);
  const year = config.birthdayYear;
  const monthName = getMonthName(month).toUpperCase();
  const recipient = (config.recipientName.trim() || 'FRIEND').toUpperCase();
  const formattedBirthday = formatBirthdayLabel(month, targetDay, year).toUpperCase();
  const grid = getCalendarMonthGrid(month, year);

  // Stage transition envelope
  const exitP = localP > 0.88 ? clamp01((localP - 0.88) / 0.12) : 0;
  const sceneAlpha =
    localP < 0.06 ? clamp01(localP / 0.06) : exitP > 0 ? 1 - exitP * 0.92 : 1;

  // STAGE 0: Deep atmospheric calendar backdrop (respecting calendarBgColor)
  ctx.save();
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    minDim * 0.05,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78,
  );
  bgGrad.addColorStop(0, blendHex(cal.calendarBgColor, cal.calendarAccentColor, 0.14));
  bgGrad.addColorStop(0.55, cal.calendarBgColor);
  bgGrad.addColorStop(1, blendHex(cal.calendarBgColor, '#000000', 0.35));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Volumetric celestial light beams
  ctx.save();
  ctx.translate(width * 0.5, height * 0.38);
  ctx.rotate(t * 0.08);
  for (let rIdx = 0; rIdx < 6; rIdx++) {
    ctx.rotate(Math.PI / 3);
    const beamGrad = ctx.createLinearGradient(0, 0, minDim * 0.9, 0);
    beamGrad.addColorStop(0, hexToRgba(cal.highlightColor, 0.1));
    beamGrad.addColorStop(1, hexToRgba(cal.highlightColor, 0));
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, -minDim * 0.018);
    ctx.lineTo(minDim * 0.9, -minDim * 0.12);
    ctx.lineTo(minDim * 0.9, minDim * 0.12);
    ctx.lineTo(0, minDim * 0.018);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Floating golden stars & glowing atmosphere particles
  for (let i = 0; i < 64; i++) {
    const s = seeds[i % seeds.length];
    const sx = (((s.x + t * 0.01 * (i % 2 === 0 ? 1 : -0.7)) % 1) + 1) % 1 * width;
    const sy = (((s.y - t * 0.022 * s.speed) % 1) + 1) % 1 * height;
    const twinkle = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.8 * s.speed + s.phase));
    const pr = minDim * (0.002 + s.size * 0.003);

    ctx.fillStyle =
      i % 4 === 0
        ? hexToRgba(cal.highlightColor, twinkle)
        : hexToRgba(cal.calendarAccentColor, twinkle * 0.85);
    if (i % 5 === 0) {
      drawFourPointStar(ctx, sx, sy, pr * 2.4, s.rot + t * 0.5);
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = sceneAlpha;

  // Compute animated state across 4 sub-scenes:
  // 1: Appearance (0.00..0.22)
  // 2: Date Counting 1..targetDay (0.22..0.64)
  // 3: Reveal Celebration (0.64..0.88)
  // 4: Celebration Transition (0.88..1.00)
  const appearP = easeOutBack(clamp01(localP / 0.2));

  let activeCountDay = 0;
  let stepFlipP = 0;
  let isRevealing = false;
  let revealP = 0;

  if (localP >= 0.22 && localP < 0.64) {
    const rawStageP = (localP - 0.22) / 0.42;
    const speedSpan =
      cal.countingSpeed === 'fast'
        ? 0.72
        : cal.countingSpeed === 'slow'
          ? 0.98
          : cal.countingSpeed === 'normal'
            ? 0.88
            : 0.92;
    let adjustedP = clamp01(rawStageP / speedSpan);
    if (cal.countingSpeed === 'cinematic') {
      // Gentle acceleration into middle dates, reverent slow-down right onto birthdayDay
      adjustedP = 0.5 - 0.5 * Math.cos(adjustedP * Math.PI);
    }
    const step = computeCalendarHighlightedDay(adjustedP, targetDay);
    activeCountDay = Math.min(targetDay, step.currentDay);
    stepFlipP = step.stepLocalProgress;
  } else if (localP >= 0.64) {
    activeCountDay = targetDay;
    isRevealing = true;
    revealP = clamp01((localP - 0.64) / 0.24);
  }

  // Iris-zoom / scale entrance + exit transform
  const exitZoom =
    exitP > 0 && cal.transitionEffect === 'iris-zoom' ? 1 + exitP * 0.35 : 1;
  const calScale = (0.76 + appearP * 0.24) * exitZoom;

  // Calendar Card Geometry (responsive Portrait vs Square vs Landscape)
  const cardW = isLandscape ? Math.min(width * 0.46, height * 0.76) : width * 0.82;
  const cardH = isLandscape ? height * 0.68 : minDim * 0.78;
  const cardX = isLandscape ? width * 0.08 : (width - cardW) * 0.5;
  const cardY = isLandscape ? (height - cardH) * 0.5 : height * 0.14;
  const cardRadius = minDim * 0.028;

  // Draw Calendar Plaque
  ctx.save();
  ctx.translate(cardX + cardW * 0.5, cardY + cardH * 0.5);
  ctx.scale(calScale, calScale);
  ctx.translate(-(cardX + cardW * 0.5), -(cardY + cardH * 0.5));

  // Outer celestial aura
  ctx.shadowColor = hexToRgba(
    isRevealing ? cal.highlightColor : cal.calendarAccentColor,
    isRevealing ? 0.55 : 0.32,
  );
  ctx.shadowBlur = minDim * (isRevealing ? 0.055 : 0.032);

  // Calendar Card Body
  const bodyGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  bodyGrad.addColorStop(0, blendHex(cal.calendarColor, '#FFFFFF', 0.06));
  bodyGrad.addColorStop(1, blendHex(cal.calendarColor, '#000000', 0.22));
  ctx.fillStyle = bodyGrad;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Double luxury metallic border
  ctx.strokeStyle = cal.calendarAccentColor;
  ctx.lineWidth = Math.max(2, minDim * 0.0045);
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();

  // Top Header Strip (Rings + Month Name + Optional Year)
  const headerH = cardH * 0.21;
  const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
  headerGrad.addColorStop(0, blendHex(cal.calendarColor, cal.calendarAccentColor, 0.25));
  headerGrad.addColorStop(1, blendHex(cal.calendarColor, '#000000', 0.15));

  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.clip();
  ctx.fillStyle = headerGrad;
  ctx.fillRect(cardX, cardY, cardW, headerH);
  ctx.restore();

  // Binder rings at top edge
  const ringCount = 5;
  for (let i = 0; i < ringCount; i++) {
    const rx = cardX + cardW * (0.16 + (i / (ringCount - 1)) * 0.68);
    const ry = cardY - minDim * 0.006;
    ctx.fillStyle = cal.calendarAccentColor;
    drawRoundedRect(ctx, rx - minDim * 0.007, ry, minDim * 0.014, minDim * 0.026, 4);
    ctx.fill();
  }

  // Month Typography (e.g., NOVEMBER or NOVEMBER 2026)
  const monthFontSize = Math.round(cardW * 0.095);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${monthFontSize}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = cal.highlightColor;
  ctx.shadowColor = hexToRgba(cal.highlightColor, 0.4);
  ctx.shadowBlur = 8;
  const headerTitle = year ? `${monthName} · ${year}` : monthName;
  ctx.fillText(headerTitle, cardX + cardW * 0.5, cardY + headerH * 0.54);
  ctx.restore();

  // Divider line
  ctx.strokeStyle = hexToRgba(cal.calendarAccentColor, 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.06, cardY + headerH);
  ctx.lineTo(cardX + cardW * 0.94, cardY + headerH);
  ctx.stroke();

  // Weekday Headers
  const innerPadX = cardW * 0.07;
  const gridX = cardX + innerPadX;
  const gridW = cardW - innerPadX * 2;
  let gridTop = cardY + headerH + cardH * 0.04;

  if (cal.showWeekdays) {
    const wkH = cardH * 0.085;
    ctx.save();
    ctx.font = `600 ${Math.max(9, Math.round(cardW * 0.036))}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexToRgba(cal.calendarAccentColor, 0.78);
    WEEKDAY_HEADERS.forEach((wk, colIdx) => {
      const colW = gridW / 7;
      ctx.fillText(wk, gridX + colW * (colIdx + 0.5), gridTop + wkH * 0.5);
    });
    ctx.restore();
    gridTop += wkH + cardH * 0.015;
  }

  // 7-Column Calendar Date Cells
  const rows = Math.ceil(grid.cells.length / 7);
  const gridBottom = cardY + cardH - cardH * 0.06;
  const cellW = gridW / 7;
  const cellH = (gridBottom - gridTop) / Math.max(4, rows);
  const dayFontSize = Math.max(10, Math.round(Math.min(cellW, cellH) * 0.44));

  grid.cells.forEach((dayNum, cellIdx) => {
    if (dayNum === null) return;
    const row = Math.floor(cellIdx / 7);
    const col = cellIdx % 7;
    const cx = gridX + col * cellW + cellW * 0.5;
    const cy = gridTop + row * cellH + cellH * 0.5;
    const cellR = Math.min(cellW, cellH) * 0.4;

    const isVisited = activeCountDay > 0 && dayNum < activeCountDay;
    const isCurrentActive = activeCountDay > 0 && dayNum === activeCountDay;
    const isBirthdayTargetCell = isRevealing && dayNum === targetDay;

    if (isBirthdayTargetCell) {
      // Glowing celebratory circle & starburst halo on the recipient's birthday cell
      const pulse = 1 + Math.sin(t * 9) * 0.08 + easeOutBack(Math.min(1, revealP * 2)) * 0.14;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellR * 2.1);
      glow.addColorStop(0, hexToRgba(cal.highlightColor, 0.85));
      glow.addColorStop(0.55, hexToRgba(cal.calendarAccentColor, 0.35));
      glow.addColorStop(1, hexToRgba(cal.highlightColor, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, cellR * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.fillStyle = cal.highlightColor;
      ctx.beginPath();
      ctx.arc(cx, cy, cellR * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.5, minDim * 0.003);
      ctx.beginPath();
      ctx.arc(cx, cy, cellR * pulse * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (isCurrentActive) {
      const pop = 0.94 + Math.sin(stepFlipP * Math.PI) * 0.14;
      ctx.fillStyle = hexToRgba(cal.highlightColor, 0.88);
      ctx.beginPath();
      ctx.arc(cx, cy, cellR * pop, 0, Math.PI * 2);
      ctx.fill();
    } else if (isVisited) {
      ctx.fillStyle = hexToRgba(cal.calendarAccentColor, 0.22);
      ctx.beginPath();
      ctx.arc(cx, cy, cellR * 0.82, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${isCurrentActive || isBirthdayTargetCell ? '700' : '500'} ${dayFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle =
      isCurrentActive || isBirthdayTargetCell
        ? '#1A0B2E'
        : isVisited
          ? theme.textColor
          : hexToRgba(theme.textColor, 0.58);
    ctx.fillText(String(dayNum), cx, cy + 1);
    ctx.restore();
  });

  ctx.restore();

  // Stage 2 & Stage 3 Right/Bottom Focus Medallion + Reveal Headlines
  const focusX = isLandscape ? width * 0.76 : width * 0.5;
  const focusY = isLandscape ? height * 0.44 : height * 0.73;

  // Page-flipping Active Date Medallion during Stage 2 OR Reveal Glow during Stage 3
  if (localP >= 0.2) {
    const medallionR = isLandscape ? minDim * 0.17 : minDim * 0.125;
    const isCounting = !isRevealing && activeCountDay > 0;

    if (isCounting) {
      // Crisp 3D calendar leaf page flip effect as each date steps from 1..targetDay
      const flipCos = Math.cos(Math.min(1, stepFlipP * 2.2) * Math.PI * 0.28);
      const medY = isLandscape ? height * 0.42 : height * 0.72;

      ctx.save();
      ctx.translate(focusX, medY);
      ctx.scale(1, Math.max(0.76, flipCos));

      ctx.shadowColor = hexToRgba(cal.highlightColor, 0.45);
      ctx.shadowBlur = minDim * 0.035;
      ctx.fillStyle = blendHex(cal.calendarColor, '#FFFFFF', 0.08);
      drawRoundedRect(
        ctx,
        -medallionR * 1.15,
        -medallionR * 0.85,
        medallionR * 2.3,
        medallionR * 1.7,
        minDim * 0.024,
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = cal.highlightColor;
      ctx.lineWidth = Math.max(2, minDim * 0.004);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(medallionR * 0.28)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = cal.calendarAccentColor;
      ctx.fillText(monthName, 0, -medallionR * 0.44);

      ctx.font = `700 ${Math.round(medallionR * 0.92)}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = theme.textColor;
      ctx.fillText(String(activeCountDay), 0, medallionR * 0.14);
      ctx.restore();

      // Small golden particle burst radiating on each date flip
      const burstProg = stepFlipP;
      for (let b = 0; b < 8; b++) {
        const ang = (b / 8) * Math.PI * 2 + activeCountDay * 0.6;
        const dist = medallionR * (0.9 + burstProg * 0.55);
        const bx = focusX + Math.cos(ang) * dist;
        const by = medY + Math.sin(ang) * dist;
        ctx.save();
        ctx.globalAlpha = sceneAlpha * (1 - burstProg) * 0.85;
        ctx.fillStyle = cal.highlightColor;
        drawFourPointStar(ctx, bx, by, minDim * 0.008, t * 2 + b);
        ctx.restore();
      }
    }

    // Stage 3: Birthday Reveal Headlines & Sparkle Celebration
    if (isRevealing) {
      const zoomPulse = 0.88 + easeOutBack(Math.min(1, revealP * 1.9)) * 0.14;
      const sparkleCount = 26;
      const burstOriginY = isLandscape ? height * 0.36 : height * 0.68;

      // Confetti & Sparkle fountain on reveal
      const palette = [
        cal.highlightColor,
        cal.calendarAccentColor,
        ...theme.confettiColors,
      ];
      for (let i = 0; i < sparkleCount; i++) {
        const s = seeds[(i + 40) % seeds.length];
        const ang = -Math.PI * 0.5 + (s.x - 0.5) * Math.PI * 1.5;
        const dist = easeOutCubic(revealP) * minDim * (0.18 + s.speed * 0.22);
        const px = focusX + Math.cos(ang) * dist;
        const py = burstOriginY + Math.sin(ang) * dist + revealP * revealP * minDim * 0.08;
        ctx.save();
        ctx.globalAlpha = sceneAlpha * clamp01(1 - revealP * 0.7);
        ctx.fillStyle = palette[i % palette.length];
        drawFourPointStar(ctx, px, py, minDim * (0.007 + s.size * 0.007), t * 3 + i);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(focusX, focusY);
      ctx.scale(zoomPulse, zoomPulse);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (revealP < 0.45) {
        const subA = Math.sin((revealP / 0.45) * Math.PI);
        ctx.globalAlpha = sceneAlpha * Math.max(0.25, subA);
        ctx.font = `700 ${Math.round(minDim * (isLandscape ? 0.044 : 0.042))}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = cal.highlightColor;
        ctx.shadowColor = hexToRgba(cal.highlightColor, 0.55);
        ctx.shadowBlur = 14;
        ctx.fillText('AND THE SPECIAL DAY IS HERE!', 0, -minDim * 0.03);
        ctx.font = `600 ${Math.round(minDim * 0.028)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = theme.textColor;
        ctx.fillText(formattedBirthday, 0, minDim * 0.04);
      } else {
        const finP = clamp01((revealP - 0.45) / 0.55);
        ctx.globalAlpha = sceneAlpha * easeOutCubic(Math.min(1, finP * 2.4));
        ctx.font = `700 ${Math.round(minDim * (isLandscape ? 0.046 : 0.044))}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = cal.highlightColor;
        ctx.shadowColor = hexToRgba(cal.highlightColor, 0.58);
        ctx.shadowBlur = 16;
        ctx.fillText(`HAPPY BIRTHDAY,`, 0, -minDim * 0.042);

        ctx.font = `700 ${Math.round(minDim * (isLandscape ? 0.068 : 0.064))}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = theme.textColor;
        ctx.fillText(`${recipient}!`, 0, minDim * 0.022);

        ctx.font = `600 ${Math.round(minDim * 0.024)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = cal.calendarAccentColor;
        ctx.fillText(formattedBirthday, 0, minDim * 0.084);
      }
      ctx.restore();
    }
  } else {
    // Stage 1 Subtitle during initial calendar reveal
    ctx.save();
    ctx.globalAlpha = sceneAlpha * clamp01(localP / 0.14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(minDim * 0.03)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = cal.calendarAccentColor;
    ctx.fillText(
      `COUNTING DOWN TO ${monthName} ${targetDay}...`,
      isLandscape ? width * 0.74 : width * 0.5,
      isLandscape ? height * 0.5 : height * 0.73,
    );
    ctx.restore();
  }

  // Stage 4: Transition Effect Sweep into Main Celebration
  if (exitP > 0) {
    if (cal.transitionEffect === 'golden-rays') {
      const rayGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * (0.25 + exitP * 0.8),
      );
      rayGrad.addColorStop(0, hexToRgba(cal.highlightColor, exitP * 0.85));
      rayGrad.addColorStop(0.55, hexToRgba(cal.calendarAccentColor, exitP * 0.35));
      rayGrad.addColorStop(1, hexToRgba(theme.backgroundPrimary, exitP));
      ctx.fillStyle = rayGrad;
      ctx.fillRect(0, 0, width, height);
    } else if (cal.transitionEffect === 'particle-burst') {
      ctx.fillStyle = hexToRgba(theme.backgroundPrimary, exitP * 0.85);
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 48; i++) {
        const s = seeds[(i + 60) % seeds.length];
        const px = s.x * width + (s.vx * exitP * width * 0.25);
        const py = s.y * height + (s.vy - 0.5) * exitP * height * 0.25;
        ctx.fillStyle = hexToRgba(cal.highlightColor, Math.sin(exitP * Math.PI));
        drawFourPointStar(ctx, px, py, minDim * 0.015 * s.size, s.rot + exitP * 4);
      }
    } else if (cal.transitionEffect === 'iris-zoom') {
      ctx.fillStyle = hexToRgba(theme.backgroundPrimary, exitP * 0.92);
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = hexToRgba(theme.backgroundPrimary, exitP);
      ctx.fillRect(0, 0, width, height);
    }
  }

  ctx.restore();
}
