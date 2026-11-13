import { WebsiteThemeConfig } from '../types/theme';
import { blendHex, hexToRgba, isLightHex } from './themeColorUtils';

export function buildWebsiteCssVariables(
  theme: WebsiteThemeConfig,
): Record<string, string> {
  const isLight = isLightHex(theme.backgroundColor);

  const panelBg = hexToRgba(theme.cardBackgroundColor, isLight ? 0.92 : 0.78);
  const headerBg = hexToRgba(theme.backgroundColor, 0.9);
  const subcardBg = blendHex(
    theme.inputBackgroundColor,
    theme.cardBackgroundColor,
    0.35,
  );
  const secondaryBtnBg = blendHex(
    theme.cardBackgroundColor,
    theme.primaryColor,
    isLight ? 0.1 : 0.14,
  );
  const activeTileBg = blendHex(
    theme.cardBackgroundColor,
    theme.primaryColor,
    isLight ? 0.14 : 0.22,
  );

  return {
    '--studio-bg': theme.backgroundColor,
    '--studio-bg-grad': `linear-gradient(${theme.gradientAngle}deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%)`,
    '--studio-surface': theme.cardBackgroundColor,
    '--studio-panel-bg': panelBg,
    '--studio-header-bg': headerBg,
    '--studio-input': theme.inputBackgroundColor,
    '--studio-subcard': subcardBg,
    '--studio-active-tile': activeTileBg,
    '--studio-primary': theme.primaryColor,
    '--studio-secondary': theme.secondaryColor,
    '--studio-btn-bg': theme.buttonColor,
    '--studio-btn-bg-2': theme.buttonSecondaryColor,
    '--studio-btn-text': theme.buttonTextColor,
    '--studio-btn-secondary-bg': secondaryBtnBg,
    '--studio-text': theme.textColor,
    '--studio-heading': theme.headingColor,
    '--studio-muted': theme.mutedTextColor,
    '--studio-border': hexToRgba(theme.borderColor, isLight ? 0.55 : 0.3),
    '--studio-border-soft': hexToRgba(theme.borderColor, isLight ? 0.35 : 0.18),
    '--studio-border-strong': hexToRgba(theme.borderColor, isLight ? 0.9 : 0.72),
    '--studio-accent': theme.accentColor,
    '--studio-glow': theme.glowColor,
    '--studio-glow-soft': hexToRgba(theme.glowColor, isLight ? 0.26 : 0.38),
    '--studio-shadow': isLight
      ? '0 18px 46px -14px rgba(15, 23, 42, 0.13)'
      : '0 24px 64px -16px rgba(5, 2, 12, 0.75)',
    '--studio-overlay': isLight
      ? 'rgba(15, 23, 42, 0.52)'
      : 'rgba(7, 2, 14, 0.85)',
    colorScheme: isLight ? 'light' : 'dark',
  };
}

export function applyWebsiteThemeToDocument(theme: WebsiteThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = buildWebsiteCssVariables(theme);
  for (const [key, value] of Object.entries(vars)) {
    if (key === 'colorScheme') {
      root.style.colorScheme = value;
    } else {
      root.style.setProperty(key, value);
    }
  }
}
