export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function normalizeHex(input: string, fallback = '#E8C574'): string {
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  return fallback.toUpperCase();
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex, '#000000').slice(1);
  const num = parseInt(norm, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(Number.isFinite(n) ? n : 0)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function isLightHex(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.42;
}

export function getContrastTextColor(bgHex: string): string {
  return isLightHex(bgHex) ? '#140724' : '#FDF9FF';
}

export function blendHex(hexA: string, hexB: string, ratioB = 0.5): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratioB));
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}
