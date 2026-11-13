import {
  DEFAULT_PROJECT_CONFIG,
  DEFAULT_VIDEO_THEME,
  DEFAULT_WEBSITE_THEME,
  StudioProjectConfig,
  VideoThemeConfig,
  WebsiteThemeConfig,
} from '../types';

const DB_NAME = 'magical_birthday_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'studio_projects';
const PROJECT_KEY = 'active_project_v2';
const WEBSITE_THEME_KEY = 'website_appearance_v1';
const CUSTOM_WEBSITE_THEMES_KEY = 'custom_website_themes_v1';
const CUSTOM_VIDEO_THEMES_KEY = 'custom_video_themes_v1';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord<T>(key: string, value: T): Promise<void> {
  try {
    try {
      localStorage.setItem(`mbs_${key}`, JSON.stringify(value));
    } catch {
      // Ignore quota errors on localStorage fallback
    }
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful no-op in restricted browser storage
  }
}

async function getRecord<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const res = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
    if (res !== null) return res;
  } catch {
    // Fallback to localStorage below
  }

  try {
    const raw = localStorage.getItem(`mbs_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveStudioProject(
  config: StudioProjectConfig,
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(config, PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful no-op in restricted browser storage
  }
}

export async function loadStudioProject(): Promise<StudioProjectConfig> {
  try {
    const db = await openDB();
    const saved = await new Promise<StudioProjectConfig | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(PROJECT_KEY);
        req.onsuccess = () =>
          resolve((req.result as StudioProjectConfig) ?? null);
        req.onerror = () => reject(req.error);
      },
    );
    if (!saved) return DEFAULT_PROJECT_CONFIG;
    const rawPhotos = Array.isArray(saved.photos)
      ? saved.photos
      : DEFAULT_PROJECT_CONFIG.photos;

    const normalizedPhotos = rawPhotos.map((p) => ({
      ...p,
      transition: {
        ...DEFAULT_PROJECT_CONFIG.photos[0].transition,
        ...(p.transition || {}),
      },
      frame: {
        ...DEFAULT_PROJECT_CONFIG.photos[0].frame,
        ...(p.frame || {}),
      },
    }));

    return {
      ...DEFAULT_PROJECT_CONFIG,
      ...saved,
      customAspect: {
        ...DEFAULT_PROJECT_CONFIG.customAspect,
        ...(saved.customAspect || {}),
      },
      messages: {
        ...DEFAULT_PROJECT_CONFIG.messages,
        ...(saved.messages || {}),
      },
      videoTheme: {
        ...DEFAULT_VIDEO_THEME,
        ...(saved.videoTheme || {}),
      },
      photos: normalizedPhotos,
    };
  } catch {
    return DEFAULT_PROJECT_CONFIG;
  }
}

export async function resetStudioProject(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore
  }
}

export async function saveWebsiteTheme(theme: WebsiteThemeConfig): Promise<void> {
  await putRecord(WEBSITE_THEME_KEY, theme);
}

export async function loadWebsiteTheme(): Promise<WebsiteThemeConfig> {
  const saved = await getRecord<WebsiteThemeConfig>(WEBSITE_THEME_KEY);
  if (!saved) return DEFAULT_WEBSITE_THEME;
  return { ...DEFAULT_WEBSITE_THEME, ...saved };
}

export function loadWebsiteThemeSync(): WebsiteThemeConfig {
  try {
    const raw = localStorage.getItem(`mbs_${WEBSITE_THEME_KEY}`);
    if (!raw) return DEFAULT_WEBSITE_THEME;
    return { ...DEFAULT_WEBSITE_THEME, ...(JSON.parse(raw) as WebsiteThemeConfig) };
  } catch {
    return DEFAULT_WEBSITE_THEME;
  }
}

export async function saveCustomWebsiteThemes(
  themes: WebsiteThemeConfig[],
): Promise<void> {
  await putRecord(CUSTOM_WEBSITE_THEMES_KEY, themes);
}

export async function loadCustomWebsiteThemes(): Promise<WebsiteThemeConfig[]> {
  const saved = await getRecord<WebsiteThemeConfig[]>(CUSTOM_WEBSITE_THEMES_KEY);
  return Array.isArray(saved) ? saved : [];
}

export async function saveCustomVideoThemes(
  themes: VideoThemeConfig[],
): Promise<void> {
  await putRecord(CUSTOM_VIDEO_THEMES_KEY, themes);
}

export async function loadCustomVideoThemes(): Promise<VideoThemeConfig[]> {
  const saved = await getRecord<VideoThemeConfig[]>(CUSTOM_VIDEO_THEMES_KEY);
  return Array.isArray(saved) ? saved : [];
}

/**
 * Optimizes an uploaded image file by resizing to max 1600px while preserving aspect ratio.
 */
export function optimizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;
        if (width <= MAX_DIM && height <= MAX_DIM) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function readAudioFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}
