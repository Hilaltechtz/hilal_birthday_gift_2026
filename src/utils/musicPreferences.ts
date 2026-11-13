const FAVORITES_KEY = 'mbs_music_favorites_v1';
const RECENT_KEY = 'mbs_music_recent_v1';

export function loadFavoriteTrackIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavoriteTrackIds(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Ignore storage quota errors
  }
}

export function toggleFavoriteTrackId(current: string[], trackId: string): string[] {
  const exists = current.includes(trackId);
  const next = exists ? current.filter((id) => id !== trackId) : [trackId, ...current];
  saveFavoriteTrackIds(next);
  return next;
}

export function loadRecentTrackIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentTrackId(current: string[], trackId: string): string[] {
  const filtered = current.filter((id) => id !== trackId);
  const next = [trackId, ...filtered].slice(0, 12);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}
