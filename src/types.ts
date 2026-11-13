import floralTeaImg from './assets/images/memory_floral_tea_1794581063510.jpg';
import sunsetTerraceImg from './assets/images/memory_sunset_terrace_1794581064474.jpg';
import celebrationBouquetImg from './assets/images/memory_celebration_bouquet_1794581064744.jpg';
import { DEFAULT_VIDEO_THEME, VideoThemeConfig } from './types/theme';

export * from './types/theme';

export type AspectRatioOption = '9:16' | '16:9' | '1:1' | 'custom';
export type VideoDurationOption = 15 | 30 | 45 | 60;
export type CelebrationBurstType =
  | 'sparkles'
  | 'confetti'
  | 'fireworks'
  | 'hearts';

export type TransitionType =
  | 'fade'
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'flip-3d'
  | 'rotate'
  | 'blur'
  | 'cross-dissolve'
  | 'golden-particles'
  | 'light-flash'
  | 'circular-reveal'
  | 'smooth-mask'
  | 'pan-zoom';

export type TransitionSpeed = 'slow' | 'normal' | 'fast';
export type TransitionDirection = 'left' | 'right' | 'up' | 'down' | 'cw' | 'ccw';
export type FrameFitMode = 'fill' | 'fit';

export type PlatformId =
  | 'whatsapp-status'
  | 'tiktok'
  | 'instagram-reels'
  | 'youtube'
  | 'facebook-landscape'
  | 'instagram-square'
  | 'facebook-square'
  | 'custom';

export interface PhotoTransitionConfig {
  type: TransitionType;
  durationSec: number; // 0.4 .. 2.5
  speed: TransitionSpeed;
  direction: TransitionDirection;
  displayDurationSec: number; // 2 .. 12
  zoomIntensity: number; // 0 .. 0.35
}

export interface PhotoFrameConfig {
  fitMode: FrameFitMode;
  zoom: number; // 1.0 .. 2.5
  offsetX: number; // -1 .. 1
  offsetY: number; // -1 .. 1
}

export type PhotoEffectType =
  | 'none'
  | 'valentine-night'
  | 'bobbing-heart'
  | 'winter-light'
  | 'rose-shower'
  | 'heart-emojis'
  | 'flash'
  | 'rainbow-heart'
  | 'heart-bubbles'
  | 'love-comment'
  | 'sketch-heart'
  | 'golden-melody'
  | 'rainbow-neon'
  | 'flipped'
  | 'heart-kisses'
  | 'heartbeat'
  | 'rave-frequency'
  | 'golden-sparkles'
  | 'cinematic-glow'
  | 'dreamy-soft-focus'
  | 'butterfly-garden'
  | 'floating-stars'
  | 'pink-dust'
  | 'golden-frame'
  | 'aurora-lights'
  | 'glitter-explosion'
  | 'luxury-shimmer';

export interface PhotoEffectConfig {
  type: PhotoEffectType;
  intensity: number; // 0.2 .. 1.6
  speed: number; // 0.4 .. 2.0
  size: number; // 0.5 .. 1.6
  opacity: number; // 0.15 .. 1.0
}

export interface StudioPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  isSample?: boolean;
  transition: PhotoTransitionConfig;
  frame: PhotoFrameConfig;
  effect?: PhotoEffectConfig;
}

export type TextAnimationType =
  | 'fade-in'
  | 'zoom-in'
  | 'slide-up'
  | 'slide-left'
  | 'slide-right'
  | 'golden-particle'
  | 'typewriter'
  | 'blur-focus'
  | 'flip-3d'
  | 'letter-reveal'
  | 'glowing-reveal'
  | 'light-sweep'
  | 'scale-fade'
  | 'split-reveal'
  | 'floating';

export type TextFontFamily =
  | 'cormorant'
  | 'playfair'
  | 'cinzel'
  | 'great-vibes'
  | 'jakarta';

export type TextColorMode = 'theme' | 'gradient' | 'custom';
export type TextPositionMode = 'top' | 'center' | 'lower' | 'custom';
export type BeatSyncMode = 'auto' | 'manual' | 'off';

export interface TextAnimationConfig {
  entrance: TextAnimationType;
  exit: TextAnimationType;
  entranceDurationSec: number; // 0.35 .. 2.2
  exitDurationSec: number; // 0.3 .. 2.0
  displayDurationSec: number; // 2.0 .. 12.0
  speed: number; // 0.5 .. 2.0
  enableGlow: boolean;
  glowIntensity: number; // 0 .. 1.5
  enableParticles: boolean;
  fontFamily: TextFontFamily;
  fontSizeScale: number; // 0.75 .. 1.45
  fontWeight: '400' | '500' | '600' | '700';
  colorMode: TextColorMode;
  customColor: string;
  gradientStartColor: string;
  gradientEndColor: string;
  position: TextPositionMode;
  customYFrac: number; // 0.18 .. 0.85
  manualStartSec: number | null;
}

export interface MusicBeatMarker {
  id: string;
  timeSec: number;
  strength: number; // 0.2 .. 1.0
  isManual?: boolean;
  label?: string;
}

export interface BeatSyncConfig {
  mode: BeatSyncMode;
  manualMarkers: MusicBeatMarker[];
  removedDetectedBeatIds: string[];
  editedDetectedBeats: Record<string, number>;
  sceneBeatSnap: boolean;
  sensitivity: number; // 0.3 .. 1.0
}

export interface StudioMusic {
  name: string;
  dataUrl: string;
  durationSeconds: number;
  startOffsetSeconds: number;
  volume: number;
  syncToBeat: boolean;
  bpm?: number;
  waveformPeaks?: number[];
  detectedBeats?: MusicBeatMarker[];
  sourceType?: 'library' | 'upload';
  libraryTrackId?: string;
  artist?: string;
  category?: string;
  licenseLabel?: string;
  qualityLabel?: string;
  formatLabel?: string;
}

export interface StudioMessages {
  openingMessage: string;
  announcementHeadline: string;
  wishes: string[];
  wishAnimations: TextAnimationConfig[];
  specialMessage: string;
  specialMessageAnimation: TextAnimationConfig;
  finalMessage: string;
  senderIntroAnimation: TextAnimationConfig;
  senderName: string;
  senderNameAnimation: TextAnimationConfig;
}

export interface CustomAspectConfig {
  width: number;
  height: number;
}

export type CalendarTransitionEffect =
  | 'golden-rays'
  | 'particle-burst'
  | 'iris-zoom'
  | 'curtain-fade';

export type CalendarCountingSpeed = 'slow' | 'normal' | 'fast' | 'cinematic';

export interface CalendarIntroConfig {
  enabled: boolean;
  durationSec: number; // 4 .. 10
  countingSpeed: CalendarCountingSpeed;
  calendarBgColor: string;
  calendarColor: string;
  calendarAccentColor: string;
  highlightColor: string;
  transitionEffect: CalendarTransitionEffect;
  enableSoundEffects: boolean;
  showWeekdays: boolean;
}

export interface CakeEffectsToggles {
  bubbles: boolean;
  sparklingStars: boolean;
  glowingParticles: boolean;
  confetti: boolean;
  lightRays: boolean;
  floatingHearts: boolean;
  glowCircles: boolean;
  fireworks: boolean;
  glitter: boolean;
  decorations: boolean;
}

export interface CakeShowConfig {
  cakeColor: string;
  ribbonColor: string;
  candleColor: string;
  bubbleColor: string;
  starColor: string;
  particleColor: string;
  confettiColor: string;
  animationIntensity: number; // 0.3 .. 1.6
  animationSpeed: number; // 0.5 .. 1.8
  autoExtinguishInVideo: boolean;
  autoCutInVideo: boolean;
  effects: CakeEffectsToggles;
}

export interface CakeInteractionState {
  extinguished: boolean;
  extinguishedAtSec: number | null;
  cut: boolean;
  cutAtSec: number | null;
}

export type TextColorElementId =
  | 'mainTitle'
  | 'recipientName'
  | 'birthdayWishes'
  | 'specialMessage'
  | 'senderName'
  | 'openingMessage'
  | 'greetingAndDate'
  | 'closingPrefix'
  | 'photoCaption';

export type FontColorFillMode = 'theme' | 'solid' | 'gradient' | 'rainbow';

export interface TextColorStyleConfig {
  mode: FontColorFillMode;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  outlineColor: string;
  outlineWidth: number; // 0 .. 4
  shadowColor: string;
  glowColor: string;
  glowIntensity: number; // 0 .. 1.6
}

export type FontColorStudioConfig = Record<TextColorElementId, TextColorStyleConfig>;

export interface StudioProjectConfig {
  recipientName: string;
  birthdayDate: string;
  birthdayMonth: number;
  birthdayDay: number;
  birthdayYear: number | null;
  personalGreeting: string;
  photos: StudioPhoto[];
  openingPhotoId: string | null;
  finalPhotoId: string | null;
  music: StudioMusic | null;
  messages: StudioMessages;
  platformId: PlatformId;
  aspectRatio: AspectRatioOption;
  customAspect: CustomAspectConfig;
  durationSeconds: VideoDurationOption;
  videoTheme: VideoThemeConfig;
  calendarConfig: CalendarIntroConfig;
  cakeConfig: CakeShowConfig;
  beatSync: BeatSyncConfig;
  fontColors: FontColorStudioConfig;
}

export interface RenderedVideoResult {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: 'mp4' | 'webm';
  formatLabel: string;
  sizeBytes: number;
  durationSeconds: number;
  aspectRatioLabel: string;
}

export interface TransitionMetadata {
  id: TransitionType;
  name: string;
  category: 'motion' | 'optics' | 'light';
  shortDesc: string;
  supportsDirection: boolean;
  directionMode?: 'cardinal' | 'rotation' | 'horizontal';
  supportsZoom: boolean;
}

export const TRANSITION_CATALOG: TransitionMetadata[] = [
  {
    id: 'fade',
    name: 'Fade In / Fade Out',
    category: 'motion',
    shortDesc: 'Classic velvet opacity fade between frames',
    supportsDirection: false,
    supportsZoom: false,
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'motion',
    shortDesc: 'Forward lens push into the next memory',
    supportsDirection: false,
    supportsZoom: true,
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    category: 'motion',
    shortDesc: 'Pull-back reveal from close-up depth',
    supportsDirection: false,
    supportsZoom: true,
  },
  {
    id: 'slide-left',
    name: 'Slide Left',
    category: 'motion',
    shortDesc: 'Crisp leftward editorial frame glide',
    supportsDirection: false,
    supportsZoom: false,
  },
  {
    id: 'slide-right',
    name: 'Slide Right',
    category: 'motion',
    shortDesc: 'Crisp rightward editorial frame glide',
    supportsDirection: false,
    supportsZoom: false,
  },
  {
    id: 'slide-up',
    name: 'Slide Up',
    category: 'motion',
    shortDesc: 'Vertical upward reveal across frame',
    supportsDirection: false,
    supportsZoom: false,
  },
  {
    id: 'slide-down',
    name: 'Slide Down',
    category: 'motion',
    shortDesc: 'Vertical downward curtain slide',
    supportsDirection: false,
    supportsZoom: false,
  },
  {
    id: 'flip-3d',
    name: '3D Flip',
    category: 'optics',
    shortDesc: 'Perspective 3D card turn with gold sheen',
    supportsDirection: true,
    directionMode: 'horizontal',
    supportsZoom: false,
  },
  {
    id: 'rotate',
    name: 'Rotate Transition',
    category: 'optics',
    shortDesc: 'Dynamic cinema spin & scale blend',
    supportsDirection: true,
    directionMode: 'rotation',
    supportsZoom: true,
  },
  {
    id: 'blur',
    name: 'Blur Transition',
    category: 'optics',
    shortDesc: 'Soft dreamlike lens defocus dissolve',
    supportsDirection: false,
    supportsZoom: false,
  },
  {
    id: 'cross-dissolve',
    name: 'Cross Dissolve',
    category: 'optics',
    shortDesc: 'Luminous overlapping dual-frame melt',
    supportsDirection: false,
    supportsZoom: true,
  },
  {
    id: 'golden-particles',
    name: 'Golden Particle Reveal',
    category: 'light',
    shortDesc: 'Sweeping stardust sparkles reveal the next photo',
    supportsDirection: true,
    directionMode: 'horizontal',
    supportsZoom: false,
  },
  {
    id: 'light-flash',
    name: 'Light Flash',
    category: 'light',
    shortDesc: 'Warm champagne studio strobe flash cut',
    supportsDirection: false,
    supportsZoom: true,
  },
  {
    id: 'circular-reveal',
    name: 'Circular Reveal',
    category: 'light',
    shortDesc: 'Expanding iris ring with golden border',
    supportsDirection: false,
    supportsZoom: true,
  },
  {
    id: 'smooth-mask',
    name: 'Smooth Mask Reveal',
    category: 'light',
    shortDesc: 'Angled luxury wipe mask with luminous edge',
    supportsDirection: true,
    directionMode: 'cardinal',
    supportsZoom: false,
  },
  {
    id: 'pan-zoom',
    name: 'Cinematic Pan and Zoom',
    category: 'motion',
    shortDesc: 'Continuous sweeping Ken Burns camera drift',
    supportsDirection: true,
    directionMode: 'cardinal',
    supportsZoom: true,
  },
];

export const DEFAULT_TRANSITION_CONFIG: PhotoTransitionConfig = {
  type: 'fade',
  durationSec: 1.0,
  speed: 'normal',
  direction: 'left',
  displayDurationSec: 4.0,
  zoomIntensity: 0.14,
};

export const DEFAULT_FRAME_CONFIG: PhotoFrameConfig = {
  fitMode: 'fill',
  zoom: 1.0,
  offsetX: 0,
  offsetY: 0,
};

export interface PhotoEffectMetadata {
  id: Exclude<PhotoEffectType, 'none'>;
  name: string;
  category: 'romantic' | 'luxury' | 'neon-motion' | 'atmosphere';
  shortDesc: string;
}

export const PHOTO_EFFECTS_CATALOG: PhotoEffectMetadata[] = [
  { id: 'valentine-night', name: 'Valentine Night', category: 'romantic', shortDesc: 'Velvet rose vignette with warm crimson bokeh embers' },
  { id: 'bobbing-heart', name: 'Bobbing Heart', category: 'romantic', shortDesc: 'Buoyant ruby hearts floating & bobbing across the frame' },
  { id: 'winter-light', name: 'Winter Light', category: 'atmosphere', shortDesc: 'Frost crystalline snowflakes and cool Arctic glow' },
  { id: 'rose-shower', name: 'Rose Shower', category: 'romantic', shortDesc: 'Cascading velvet rose petals drifting down' },
  { id: 'heart-emojis', name: 'Heart Emojis', category: 'romantic', shortDesc: 'Playful glossy multi-tone floating heart emblems' },
  { id: 'flash', name: 'Flash', category: 'neon-motion', shortDesc: 'Crisp paparazzi studio strobe pulse & lens flare' },
  { id: 'rainbow-heart', name: 'Rainbow Heart', category: 'romantic', shortDesc: 'Prismatic spectrum hearts swirling around the portrait' },
  { id: 'heart-bubbles', name: 'Heart Bubbles', category: 'romantic', shortDesc: 'Translucent iridescent soap bubbles enclosing tiny hearts' },
  { id: 'love-comment', name: 'Love Comment', category: 'romantic', shortDesc: 'Floating celebratory love & heart reaction cards' },
  { id: 'sketch-heart', name: 'Sketch Heart', category: 'romantic', shortDesc: 'Hand-drawn animated chalk & gold-ink heart flourishes' },
  { id: 'golden-melody', name: 'Golden Melody', category: 'luxury', shortDesc: 'Champagne gold musical notes & treble glints' },
  { id: 'rainbow-neon', name: 'Rainbow Neon', category: 'neon-motion', shortDesc: 'Animated full-spectrum glowing neon edge aura' },
  { id: 'flipped', name: 'Flipped', category: 'neon-motion', shortDesc: 'Artistic horizontal mirror reflection of the photograph' },
  { id: 'heart-kisses', name: 'Heart Kisses', category: 'romantic', shortDesc: 'Warm rose-pink kiss marks paired with shimmering hearts' },
  { id: 'heartbeat', name: 'Heartbeat', category: 'neon-motion', shortDesc: 'Rhythmic double-lub pulse magnification with crimson halo' },
  { id: 'rave-frequency', name: 'Rave Frequency', category: 'neon-motion', shortDesc: 'Vibrant dancing audio equalizer bars along the lower frame' },
  { id: 'golden-sparkles', name: 'Golden Sparkles', category: 'luxury', shortDesc: 'Four-point royal champagne stars twinkling softly' },
  { id: 'cinematic-glow', name: 'Cinematic Glow', category: 'luxury', shortDesc: 'Warm golden-hour anamorphic lens bloom' },
  { id: 'dreamy-soft-focus', name: 'Dreamy Soft Focus', category: 'atmosphere', shortDesc: 'Silky pastel mist and delicate soft-edge diffusion' },
  { id: 'butterfly-garden', name: 'Butterfly Garden', category: 'atmosphere', shortDesc: 'Luminous golden & lavender butterflies fluttering gently' },
  { id: 'floating-stars', name: 'Floating Stars', category: 'luxury', shortDesc: 'Drifting celestial starfield orbiting the memory' },
  { id: 'pink-dust', name: 'Pink Dust', category: 'atmosphere', shortDesc: 'Fine rose-quartz stardust drifting in soft currents' },
  { id: 'golden-frame', name: 'Golden Frame', category: 'luxury', shortDesc: 'Ornate filigree double-gold border & corner ornaments' },
  { id: 'aurora-lights', name: 'Aurora Lights', category: 'atmosphere', shortDesc: 'Flowing northern-lights silk ribbons across upper frame' },
  { id: 'glitter-explosion', name: 'Glitter Explosion', category: 'luxury', shortDesc: 'Radiant multi-facet celebratory glitter burst' },
  { id: 'luxury-shimmer', name: 'Luxury Shimmer', category: 'luxury', shortDesc: 'Diagonal sweeping liquid-gold studio sheen' },
];

export const DEFAULT_PHOTO_EFFECT_CONFIG: PhotoEffectConfig = {
  type: 'none',
  intensity: 1.0,
  speed: 1.0,
  size: 1.0,
  opacity: 0.9,
};

export interface TextAnimationMetadata {
  id: TextAnimationType;
  label: string;
  exitLabel: string;
  category: 'classic' | 'cinema' | 'particles';
}

export const TEXT_ANIMATION_CATALOG: TextAnimationMetadata[] = [
  { id: 'fade-in', label: 'Elegant Fade In', exitLabel: 'Smooth Fade Out', category: 'classic' },
  { id: 'zoom-in', label: 'Cinematic Zoom In', exitLabel: 'Zoom Out Dissolve', category: 'cinema' },
  { id: 'slide-up', label: 'Smooth Slide Up', exitLabel: 'Slide Up Exit', category: 'classic' },
  { id: 'slide-left', label: 'Smooth Slide Left', exitLabel: 'Slide Left Exit', category: 'classic' },
  { id: 'slide-right', label: 'Smooth Slide Right', exitLabel: 'Slide Right Exit', category: 'classic' },
  { id: 'golden-particle', label: 'Golden Particle Reveal', exitLabel: 'Golden Particle Dissolve', category: 'particles' },
  { id: 'typewriter', label: 'Typewriter Animation', exitLabel: 'Typewriter Erase', category: 'cinema' },
  { id: 'blur-focus', label: 'Blur to Focus', exitLabel: 'Soft Blur Dissolve', category: 'cinema' },
  { id: 'flip-3d', label: '3D Flip Text', exitLabel: '3D Flip Out', category: 'cinema' },
  { id: 'letter-reveal', label: 'Letter-by-Letter Reveal', exitLabel: 'Letter Fade Out', category: 'cinema' },
  { id: 'glowing-reveal', label: 'Glowing Text Reveal', exitLabel: 'Golden Glow Fade', category: 'particles' },
  { id: 'light-sweep', label: 'Cinematic Light Sweep', exitLabel: 'Luminous Sweep Fade', category: 'particles' },
  { id: 'scale-fade', label: 'Scale and Fade', exitLabel: 'Scale Down Fade', category: 'classic' },
  { id: 'split-reveal', label: 'Split Text Reveal', exitLabel: 'Center Split Close', category: 'cinema' },
  { id: 'floating', label: 'Floating Text Animation', exitLabel: 'Drift Up Fade', category: 'particles' },
];

export const TEXT_FONT_OPTIONS: {
  id: TextFontFamily;
  label: string;
  cssFamily: string;
}[] = [
  { id: 'cormorant', label: 'Cormorant Garamond (Luxury Serif)', cssFamily: '"Cormorant Garamond", Georgia, serif' },
  { id: 'playfair', label: 'Playfair Display (Editorial Serif)', cssFamily: '"Playfair Display", Georgia, serif' },
  { id: 'cinzel', label: 'Cinzel (Royal Roman Capitals)', cssFamily: '"Cinzel", Georgia, serif' },
  { id: 'great-vibes', label: 'Great Vibes (Calligraphy Script)', cssFamily: '"Great Vibes", cursive, serif' },
  { id: 'jakarta', label: 'Plus Jakarta Sans (Modern Sans)', cssFamily: '"Plus Jakarta Sans", sans-serif' },
];

export const DEFAULT_TEXT_ANIMATION: TextAnimationConfig = {
  entrance: 'golden-particle',
  exit: 'fade-in',
  entranceDurationSec: 0.9,
  exitDurationSec: 0.65,
  displayDurationSec: 4.0,
  speed: 1.0,
  enableGlow: true,
  glowIntensity: 0.8,
  enableParticles: true,
  fontFamily: 'cormorant',
  fontSizeScale: 1.0,
  fontWeight: '600',
  colorMode: 'theme',
  customColor: '#FDF9FF',
  gradientStartColor: '#F7D97E',
  gradientEndColor: '#F5B8D0',
  position: 'center',
  customYFrac: 0.5,
  manualStartSec: null,
};

export const DEFAULT_WISH_ANIMATION_PRESETS: TextAnimationConfig[] = [
  {
    ...DEFAULT_TEXT_ANIMATION,
    entrance: 'golden-particle',
    exit: 'fade-in',
  },
  {
    ...DEFAULT_TEXT_ANIMATION,
    entrance: 'zoom-in',
    exit: 'slide-up',
  },
  {
    ...DEFAULT_TEXT_ANIMATION,
    entrance: 'blur-focus',
    exit: 'glowing-reveal',
  },
];

export const DEFAULT_SPECIAL_MESSAGE_ANIMATION: TextAnimationConfig = {
  ...DEFAULT_TEXT_ANIMATION,
  entrance: 'light-sweep',
  exit: 'fade-in',
  colorMode: 'gradient',
  fontSizeScale: 1.05,
  glowIntensity: 1.05,
  enableParticles: true,
};

export const DEFAULT_SENDER_INTRO_ANIMATION: TextAnimationConfig = {
  ...DEFAULT_TEXT_ANIMATION,
  entrance: 'slide-up',
  exit: 'fade-in',
  fontFamily: 'jakarta',
  fontSizeScale: 0.9,
  fontWeight: '600',
  enableParticles: false,
  glowIntensity: 0.45,
};

export const DEFAULT_SENDER_NAME_ANIMATION: TextAnimationConfig = {
  ...DEFAULT_TEXT_ANIMATION,
  entrance: 'flip-3d',
  exit: 'golden-particle',
  fontFamily: 'cinzel',
  fontSizeScale: 1.15,
  fontWeight: '700',
  colorMode: 'gradient',
  gradientStartColor: '#FCE8A6',
  gradientEndColor: '#E8C574',
  glowIntensity: 1.15,
  enableParticles: true,
};

export const DEFAULT_BEAT_SYNC_CONFIG: BeatSyncConfig = {
  mode: 'auto',
  manualMarkers: [],
  removedDetectedBeatIds: [],
  editedDetectedBeats: {},
  sceneBeatSnap: true,
  sensitivity: 0.65,
};

export interface PlatformPreset {
  id: PlatformId;
  name: string;
  aspectRatio: AspectRatioOption;
  ratioLabel: string;
  width: number;
  height: number;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'whatsapp-status',
    name: 'WhatsApp Status',
    aspectRatio: '9:16',
    ratioLabel: '9:16',
    width: 720,
    height: 1280,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    aspectRatio: '9:16',
    ratioLabel: '9:16',
    width: 720,
    height: 1280,
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    aspectRatio: '9:16',
    ratioLabel: '9:16',
    width: 720,
    height: 1280,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    aspectRatio: '16:9',
    ratioLabel: '16:9',
    width: 1280,
    height: 720,
  },
  {
    id: 'facebook-landscape',
    name: 'Facebook Landscape',
    aspectRatio: '16:9',
    ratioLabel: '16:9',
    width: 1280,
    height: 720,
  },
  {
    id: 'instagram-square',
    name: 'Instagram Square Post',
    aspectRatio: '1:1',
    ratioLabel: '1:1',
    width: 960,
    height: 960,
  },
  {
    id: 'facebook-square',
    name: 'Facebook Square Post',
    aspectRatio: '1:1',
    ratioLabel: '1:1',
    width: 960,
    height: 960,
  },
  {
    id: 'custom',
    name: 'Custom Aspect Ratio',
    aspectRatio: 'custom',
    ratioLabel: 'Custom',
    width: 864,
    height: 1080,
  },
];

export function resolveVideoDimensions(config: StudioProjectConfig): {
  width: number;
  height: number;
  cssAspect: string;
  label: string;
} {
  if (config.platformId === 'custom' || config.aspectRatio === 'custom') {
    const w = Math.max(480, Math.min(1920, Math.round(config.customAspect.width / 2) * 2));
    const h = Math.max(480, Math.min(1920, Math.round(config.customAspect.height / 2) * 2));
    return {
      width: w,
      height: h,
      cssAspect: `${w} / ${h}`,
      label: `Custom (${w}×${h})`,
    };
  }

  const preset =
    PLATFORM_PRESETS.find((p) => p.id === config.platformId) ??
    PLATFORM_PRESETS[0];

  return {
    width: preset.width,
    height: preset.height,
    cssAspect:
      preset.aspectRatio === '9:16'
        ? '9 / 16'
        : preset.aspectRatio === '16:9'
          ? '16 / 9'
          : '1 / 1',
    label: `${preset.name} · ${preset.ratioLabel}`,
  };
}

export const SAMPLE_STUDIO_PHOTOS: StudioPhoto[] = [
  {
    id: 'sample-floral-tea',
    dataUrl: floralTeaImg,
    caption: 'Quiet mornings filled with lavender blooms and golden warmth',
    isSample: true,
    transition: { ...DEFAULT_TRANSITION_CONFIG, type: 'fade' },
    frame: { ...DEFAULT_FRAME_CONFIG },
    effect: { ...DEFAULT_PHOTO_EFFECT_CONFIG },
  },
  {
    id: 'sample-sunset-terrace',
    dataUrl: sunsetTerraceImg,
    caption: 'Laughter echoing beneath twilight lanterns and open skies',
    isSample: true,
    transition: { ...DEFAULT_TRANSITION_CONFIG, type: 'golden-particles' },
    frame: { ...DEFAULT_FRAME_CONFIG },
    effect: { ...DEFAULT_PHOTO_EFFECT_CONFIG },
  },
  {
    id: 'sample-celebration-bouquet',
    dataUrl: celebrationBouquetImg,
    caption: 'A timeless celebration wrapped in grace, beauty, and joy',
    isSample: true,
    transition: { ...DEFAULT_TRANSITION_CONFIG, type: 'zoom-in' },
    frame: { ...DEFAULT_FRAME_CONFIG },
    effect: { ...DEFAULT_PHOTO_EFFECT_CONFIG },
  },
];

export const DEFAULT_CALENDAR_CONFIG: CalendarIntroConfig = {
  enabled: true,
  durationSec: 6,
  countingSpeed: 'cinematic',
  calendarBgColor: '#16072B',
  calendarColor: '#250F45',
  calendarAccentColor: '#E8C574',
  highlightColor: '#F7D97E',
  transitionEffect: 'golden-rays',
  enableSoundEffects: true,
  showWeekdays: true,
};

export const DEFAULT_CAKE_CONFIG: CakeShowConfig = {
  cakeColor: '#7B3FA3',
  ribbonColor: '#E8C574',
  candleColor: '#FDF9FF',
  bubbleColor: '#E9D5FF',
  starColor: '#F7D97E',
  particleColor: '#F5B8D0',
  confettiColor: '#E8C574',
  animationIntensity: 1.0,
  animationSpeed: 1.0,
  autoExtinguishInVideo: true,
  autoCutInVideo: false,
  effects: {
    bubbles: true,
    sparklingStars: true,
    glowingParticles: true,
    confetti: true,
    lightRays: true,
    floatingHearts: true,
    glowCircles: true,
    fireworks: true,
    glitter: true,
    decorations: true,
  },
};

export const DEFAULT_TEXT_COLOR_STYLE: TextColorStyleConfig = {
  mode: 'theme',
  solidColor: '#FDF9FF',
  gradientStart: '#F7D97E',
  gradientEnd: '#F5B8D0',
  outlineColor: '#16072B',
  outlineWidth: 0,
  shadowColor: '#0A0216',
  glowColor: '#E8C574',
  glowIntensity: 0.85,
};

export const DEFAULT_FONT_COLORS: FontColorStudioConfig = {
  mainTitle: { ...DEFAULT_TEXT_COLOR_STYLE },
  recipientName: { ...DEFAULT_TEXT_COLOR_STYLE },
  birthdayWishes: { ...DEFAULT_TEXT_COLOR_STYLE },
  specialMessage: { ...DEFAULT_TEXT_COLOR_STYLE },
  senderName: { ...DEFAULT_TEXT_COLOR_STYLE },
  openingMessage: { ...DEFAULT_TEXT_COLOR_STYLE },
  greetingAndDate: { ...DEFAULT_TEXT_COLOR_STYLE },
  closingPrefix: { ...DEFAULT_TEXT_COLOR_STYLE },
  photoCaption: { ...DEFAULT_TEXT_COLOR_STYLE },
};

export interface FontColorElementMeta {
  id: TextColorElementId;
  label: string;
  sampleFallback: string;
}

export const FONT_COLOR_ELEMENT_META: FontColorElementMeta[] = [
  { id: 'mainTitle', label: 'Main Birthday Title', sampleFallback: 'HAPPY BIRTHDAY!' },
  { id: 'recipientName', label: "Recipient's Name", sampleFallback: 'SALMA' },
  { id: 'birthdayWishes', label: 'Birthday Wishes', sampleFallback: 'May every new chapter bring you joy.' },
  { id: 'specialMessage', label: 'Special Message', sampleFallback: 'YOU ARE SPECIAL. KEEP SHINING!' },
  { id: 'senderName', label: "Sender's Name", sampleFallback: 'YOUR FRIEND' },
  { id: 'openingMessage', label: 'Opening Message', sampleFallback: 'THIS SPECIAL MOMENT IS FOR YOU...' },
  { id: 'greetingAndDate', label: 'Date & Greeting', sampleFallback: 'April 7 · Celebrating you today' },
  { id: 'closingPrefix', label: 'Closing Intro', sampleFallback: 'WITH LOVE AND BEST WISHES FROM' },
  { id: 'photoCaption', label: 'Photo Captions', sampleFallback: 'Quiet mornings filled with golden warmth' },
];

export interface FontColorPreset {
  id: string;
  name: string;
  swatch: string;
  patch: Partial<TextColorStyleConfig>;
}

export const FONT_COLOR_PRESETS: FontColorPreset[] = [
  {
    id: 'gold',
    name: 'Gold',
    swatch: 'linear-gradient(135deg, #FFF2B8, #E8C574, #B8862D)',
    patch: {
      mode: 'gradient',
      solidColor: '#F7D97E',
      gradientStart: '#FFF2B8',
      gradientEnd: '#D4A53C',
      outlineColor: '#2A1405',
      shadowColor: '#0E0502',
      glowColor: '#F7D97E',
      glowIntensity: 1.0,
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    swatch: 'linear-gradient(135deg, #FFFFFF, #CBD5E1, #94A3B8)',
    patch: {
      mode: 'gradient',
      solidColor: '#E2E8F0',
      gradientStart: '#FFFFFF',
      gradientEnd: '#94A3B8',
      outlineColor: '#0F172A',
      shadowColor: '#020617',
      glowColor: '#E2E8F0',
      glowIntensity: 0.9,
    },
  },
  {
    id: 'pink',
    name: 'Pink',
    swatch: 'linear-gradient(135deg, #FCE7F3, #F472B6, #DB2777)',
    patch: {
      mode: 'gradient',
      solidColor: '#F9A8D4',
      gradientStart: '#FDE8F2',
      gradientEnd: '#EC4899',
      outlineColor: '#3B0726',
      shadowColor: '#190211',
      glowColor: '#F472B6',
      glowIntensity: 1.0,
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    swatch: 'linear-gradient(135deg, #F3E8FF, #C084FC, #7E22CE)',
    patch: {
      mode: 'gradient',
      solidColor: '#D8B4FE',
      gradientStart: '#F3E8FF',
      gradientEnd: '#A855F7',
      outlineColor: '#22063F',
      shadowColor: '#0C021A',
      glowColor: '#C084FC',
      glowIntensity: 1.0,
    },
  },
  {
    id: 'white',
    name: 'White',
    swatch: '#FFFFFF',
    patch: {
      mode: 'solid',
      solidColor: '#FFFFFF',
      gradientStart: '#FFFFFF',
      gradientEnd: '#E9D5FF',
      outlineColor: '#140529',
      shadowColor: '#070210',
      glowColor: '#FFFFFF',
      glowIntensity: 0.85,
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    swatch: 'linear-gradient(90deg, #FF5E7E, #FBBF24, #34D399, #38BDF8, #C084FC)',
    patch: {
      mode: 'rainbow',
      solidColor: '#F472B6',
      gradientStart: '#FF5E7E',
      gradientEnd: '#38BDF8',
      outlineColor: '#16072B',
      shadowColor: '#05010D',
      glowColor: '#F7D97E',
      glowIntensity: 1.05,
    },
  },
];

export const DEFAULT_PROJECT_CONFIG: StudioProjectConfig = {
  recipientName: 'Salma',
  birthdayDate: 'April 7',
  birthdayMonth: 4,
  birthdayDay: 7,
  birthdayYear: null,
  personalGreeting:
    'Celebrating another radiant year of grace, warmth, and unforgettable moments.',
  photos: SAMPLE_STUDIO_PHOTOS,
  openingPhotoId: SAMPLE_STUDIO_PHOTOS[0].id,
  finalPhotoId: SAMPLE_STUDIO_PHOTOS[2].id,
  music: null,
  messages: {
    openingMessage: 'THIS SPECIAL MOMENT IS FOR YOU...',
    announcementHeadline: 'HAPPY BIRTHDAY, SALMA!',
    wishes: [
      'May Allah bless your new age with happiness, good health, success, and endless opportunities.',
      'May your dreams come true and may every new chapter bring you beautiful memories.',
    ],
    wishAnimations: [
      { ...DEFAULT_WISH_ANIMATION_PRESETS[0] },
      { ...DEFAULT_WISH_ANIMATION_PRESETS[1] },
    ],
    specialMessage: 'YOU ARE SPECIAL. KEEP SHINING!',
    specialMessageAnimation: { ...DEFAULT_SPECIAL_MESSAGE_ANIMATION },
    finalMessage: 'WITH LOVE AND BEST WISHES FROM',
    senderIntroAnimation: { ...DEFAULT_SENDER_INTRO_ANIMATION },
    senderName: 'YOUR FRIEND',
    senderNameAnimation: { ...DEFAULT_SENDER_NAME_ANIMATION },
  },
  platformId: 'whatsapp-status',
  aspectRatio: '9:16',
  customAspect: { width: 864, height: 1080 },
  durationSeconds: 30,
  videoTheme: { ...DEFAULT_VIDEO_THEME },
  calendarConfig: { ...DEFAULT_CALENDAR_CONFIG },
  cakeConfig: {
    ...DEFAULT_CAKE_CONFIG,
    effects: { ...DEFAULT_CAKE_CONFIG.effects },
  },
  beatSync: { ...DEFAULT_BEAT_SYNC_CONFIG },
  fontColors: {
    mainTitle: { ...DEFAULT_TEXT_COLOR_STYLE },
    recipientName: { ...DEFAULT_TEXT_COLOR_STYLE },
    birthdayWishes: { ...DEFAULT_TEXT_COLOR_STYLE },
    specialMessage: { ...DEFAULT_TEXT_COLOR_STYLE },
    senderName: { ...DEFAULT_TEXT_COLOR_STYLE },
    openingMessage: { ...DEFAULT_TEXT_COLOR_STYLE },
    greetingAndDate: { ...DEFAULT_TEXT_COLOR_STYLE },
    closingPrefix: { ...DEFAULT_TEXT_COLOR_STYLE },
    photoCaption: { ...DEFAULT_TEXT_COLOR_STYLE },
  },
};

export type VideoSceneId =
  | 'calendar'
  | 'intro'
  | 'announce'
  | 'memories'
  | 'cake'
  | 'wishes'
  | 'surprise';

export interface VideoSceneDef {
  id: VideoSceneId;
  label: string;
  startFrac: number;
  endFrac: number;
}

export const VIDEO_SCENES: readonly VideoSceneDef[] = [
  { id: 'intro', label: '1. Intro', startFrac: 0, endFrac: 0.14 },
  { id: 'announce', label: '2. Birthday', startFrac: 0.14, endFrac: 0.28 },
  { id: 'memories', label: '3. Memories', startFrac: 0.28, endFrac: 0.58 },
  { id: 'cake', label: '4. Cake', startFrac: 0.58, endFrac: 0.72 },
  { id: 'wishes', label: '5. Wishes', startFrac: 0.72, endFrac: 0.86 },
  { id: 'surprise', label: '6. Finale', startFrac: 0.86, endFrac: 1.0 },
] as const;

export function resolveVideoScenes(
  config?: StudioProjectConfig,
): VideoSceneDef[] {
  const calCfg = config?.calendarConfig;
  if (!calCfg || !calCfg.enabled) {
    return [...VIDEO_SCENES];
  }

  const totalDur = Math.max(15, config?.durationSeconds || 30);
  const calFrac = Math.max(
    0.15,
    Math.min(0.36, (calCfg.durationSec || 6) / totalDur),
  );
  const rem = 1 - calFrac;

  const baseWeights: { id: Exclude<VideoSceneId, 'calendar'>; title: string; w: number }[] = [
    { id: 'intro', title: 'Intro', w: 0.09 },
    { id: 'announce', title: 'Birthday', w: 0.13 },
    { id: 'memories', title: 'Memories', w: 0.32 },
    { id: 'cake', title: 'Cake', w: 0.18 },
    { id: 'wishes', title: 'Wishes', w: 0.14 },
    { id: 'surprise', title: 'Finale', w: 0.14 },
  ];

  const scenes: VideoSceneDef[] = [
    { id: 'calendar', label: '1. Calendar', startFrac: 0, endFrac: calFrac },
  ];

  let cursor = calFrac;
  baseWeights.forEach((item, idx) => {
    const startFrac = cursor;
    const endFrac =
      idx === baseWeights.length - 1 ? 1.0 : cursor + item.w * rem;
    scenes.push({
      id: item.id,
      label: `${idx + 2}. ${item.title}`,
      startFrac,
      endFrac,
    });
    cursor = endFrac;
  });

  return scenes;
}
