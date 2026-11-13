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

export interface StudioPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  isSample?: boolean;
  transition: PhotoTransitionConfig;
  frame: PhotoFrameConfig;
}

export interface StudioMusic {
  name: string;
  dataUrl: string;
  durationSeconds: number;
  startOffsetSeconds: number;
  volume: number;
  syncToBeat: boolean;
  bpm?: number;
}

export interface StudioMessages {
  openingMessage: string;
  announcementHeadline: string;
  wishes: string[];
  specialMessage: string;
  finalMessage: string;
  senderName: string;
}

export interface CustomAspectConfig {
  width: number;
  height: number;
}

export interface StudioProjectConfig {
  recipientName: string;
  birthdayDate: string;
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
  },
  {
    id: 'sample-sunset-terrace',
    dataUrl: sunsetTerraceImg,
    caption: 'Laughter echoing beneath twilight lanterns and open skies',
    isSample: true,
    transition: { ...DEFAULT_TRANSITION_CONFIG, type: 'golden-particles' },
    frame: { ...DEFAULT_FRAME_CONFIG },
  },
  {
    id: 'sample-celebration-bouquet',
    dataUrl: celebrationBouquetImg,
    caption: 'A timeless celebration wrapped in grace, beauty, and joy',
    isSample: true,
    transition: { ...DEFAULT_TRANSITION_CONFIG, type: 'zoom-in' },
    frame: { ...DEFAULT_FRAME_CONFIG },
  },
];

export const DEFAULT_PROJECT_CONFIG: StudioProjectConfig = {
  recipientName: 'Salma',
  birthdayDate: 'April 7',
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
    specialMessage: 'YOU ARE SPECIAL. KEEP SHINING!',
    finalMessage: 'WITH LOVE AND BEST WISHES FROM',
    senderName: 'YOUR FRIEND',
  },
  platformId: 'whatsapp-status',
  aspectRatio: '9:16',
  customAspect: { width: 864, height: 1080 },
  durationSeconds: 30,
  videoTheme: { ...DEFAULT_VIDEO_THEME },
};

export const VIDEO_SCENES = [
  { id: 'intro', label: '1. Intro', startFrac: 0, endFrac: 0.14 },
  { id: 'announce', label: '2. Birthday', startFrac: 0.14, endFrac: 0.28 },
  { id: 'memories', label: '3. Memories', startFrac: 0.28, endFrac: 0.58 },
  { id: 'cake', label: '4. Cake', startFrac: 0.58, endFrac: 0.72 },
  { id: 'wishes', label: '5. Wishes', startFrac: 0.72, endFrac: 0.86 },
  { id: 'surprise', label: '6. Finale', startFrac: 0.86, endFrac: 1.0 },
] as const;
