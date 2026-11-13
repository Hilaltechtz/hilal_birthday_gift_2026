import {
  CheckCircle2,
  Clock,
  Disc3,
  Heart,
  Lock,
  Pause,
  Play,
  Search,
  Sparkles,
  Upload,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BUILT_IN_MUSIC_LIBRARY,
  LicensedLibraryTrack,
  MUSIC_CATEGORIES,
  MusicCategoryId,
  REQUESTED_SONGS_CATALOG,
  RequestedCommercialTrack,
} from '../../data/musicLibraryCatalog';
import { StudioMusic } from '../../types';
import { analyzeUploadedMusic } from '../../utils/audioAnalyzer';
import {
  loadFavoriteTrackIds,
  loadRecentTrackIds,
  recordRecentTrackId,
  toggleFavoriteTrackId,
} from '../../utils/musicPreferences';
import { synthesizeLibraryTrackWavDataUrl } from '../../utils/studioMusicSynthesizer';

interface MusicLibraryBrowserProps {
  activeMusic: StudioMusic | null;
  stopSignal?: number;
  onSelectLibraryTrack: (music: StudioMusic) => void;
  onRequestUploadOwnMp3: () => void;
  onStopExternalPreview: () => void;
}

type LibraryViewTab = 'all' | 'favorites' | 'recent' | 'requested';
type SortOption = 'popularity' | 'duration' | 'title' | 'bpm';

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function MusicLibraryBrowser({
  activeMusic,
  stopSignal,
  onSelectLibraryTrack,
  onRequestUploadOwnMp3,
  onStopExternalPreview,
}: MusicLibraryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MusicCategoryId | 'all'>('all');
  const [viewTab, setViewTab] = useState<LibraryViewTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');

  const [favorites, setFavorites] = useState<string[]>(() => loadFavoriteTrackIds());
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecentTrackIds());

  // Single active preview audio state
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgressSec, setPreviewProgressSec] = useState(0);
  const [previewDurationSec, setPreviewDurationSec] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(0.85);
  const [applyingTrackId, setApplyingTrackId] = useState<string | null>(null);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = previewVolume;
    }
  }, [previewVolume]);

  useEffect(() => {
    if (stopSignal && stopSignal > 0) {
      stopPreview();
    }
  }, [stopSignal]);

  const handleTogglePreview = (track: LicensedLibraryTrack) => {
    // Enforce single active preview across library + active card
    onStopExternalPreview();

    if (previewTrackId === track.id && previewAudioRef.current) {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
        void previewAudioRef.current
          .play()
          .then(() => setIsPreviewPlaying(true))
          .catch(() => setIsPreviewPlaying(false));
      }
      return;
    }

    stopPreview();
    const { dataUrl } = synthesizeLibraryTrackWavDataUrl(track);
    const audio = new Audio(dataUrl);
    audio.volume = previewVolume;
    audio.ontimeupdate = () => setPreviewProgressSec(audio.currentTime || 0);
    audio.onloadedmetadata = () =>
      setPreviewDurationSec(audio.duration || track.durationSeconds);
    audio.onended = () => {
      setIsPreviewPlaying(false);
      setPreviewProgressSec(0);
    };
    previewAudioRef.current = audio;
    setPreviewTrackId(track.id);
    setPreviewProgressSec(0);
    setPreviewDurationSec(track.durationSeconds);

    setRecentIds((prev) => recordRecentTrackId(prev, track.id));
    void audio
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch(() => setIsPreviewPlaying(false));
  };

  const handleSeekPreview = (trackId: string, nextSec: number) => {
    if (previewTrackId === trackId && previewAudioRef.current) {
      previewAudioRef.current.currentTime = nextSec;
      setPreviewProgressSec(nextSec);
    }
  };

  const handleUseTrack = async (track: LicensedLibraryTrack) => {
    setApplyingTrackId(track.id);
    try {
      const { dataUrl } = synthesizeLibraryTrackWavDataUrl(track);
      const analyzed = await analyzeUploadedMusic(dataUrl, 0.65);
      setRecentIds((prev) => recordRecentTrackId(prev, track.id));
      onSelectLibraryTrack({
        name: track.title,
        dataUrl,
        durationSeconds: analyzed.durationSeconds || track.durationSeconds,
        startOffsetSeconds: 0,
        volume: activeMusic?.volume ?? previewVolume,
        syncToBeat: true,
        bpm: analyzed.bpm || track.bpm,
        waveformPeaks: analyzed.waveformPeaks,
        detectedBeats: analyzed.detectedBeats,
        sourceType: 'library',
        libraryTrackId: track.id,
        artist: track.artist,
        category: track.categoryLabel,
        licenseLabel: track.licenseLabel,
        qualityLabel: track.qualityLabel,
        formatLabel: track.formatLabel,
      });
    } finally {
      setApplyingTrackId(null);
    }
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredLicensedTracks = useMemo(() => {
    let list = [...BUILT_IN_MUSIC_LIBRARY];

    if (viewTab === 'favorites') {
      list = list.filter((t) => favorites.includes(t.id));
    } else if (viewTab === 'recent') {
      const orderMap = new Map(recentIds.map((id, i) => [id, i]));
      list = list
        .filter((t) => orderMap.has(t.id))
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    }

    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.categoryLabel.toLowerCase().includes(q) ||
          t.idealScene.toLowerCase().includes(q),
      );
    }

    if (viewTab !== 'recent') {
      list.sort((a, b) => {
        if (sortBy === 'popularity') return b.popularityScore - a.popularityScore;
        if (sortBy === 'duration') return a.durationSeconds - b.durationSeconds;
        if (sortBy === 'bpm') return a.bpm - b.bpm;
        return a.title.localeCompare(b.title);
      });
    }

    return list;
  }, [viewTab, favorites, recentIds, selectedCategory, q, sortBy]);

  const filteredRequestedTracks = useMemo(() => {
    if (viewTab === 'favorites' || viewTab === 'recent') return [];
    if (viewTab === 'all' && !q) return [];
    if (!q) return REQUESTED_SONGS_CATALOG;
    return REQUESTED_SONGS_CATALOG.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.artist.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q),
    );
  }, [viewTab, q]);

  const renderRequestedRow = (req: RequestedCommercialTrack) => (
    <div
      key={req.id}
      className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-5 px-1.5 items-center rounded bg-[var(--studio-input)] border border-[var(--studio-border-soft)] text-[10px] font-mono text-[var(--studio-muted)]">
            #{req.requestNumber}
          </span>
          <span className="text-sm font-semibold text-[var(--studio-text)]">
            {req.title}
          </span>
          <span className="text-xs text-[var(--studio-muted)]">· {req.artist}</span>
          {req.isDuplicate && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--studio-input)] border border-[var(--studio-border)] text-[10px] font-semibold text-[var(--studio-accent)]">
              Duplicate of #{req.duplicateOfRequestNumber}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--studio-input)] border border-[var(--studio-border)] text-[10px] font-medium text-[var(--studio-accent)]">
            <Lock className="h-3 w-3" />
            <span>Unavailable · Commercial License Required</span>
          </span>
        </div>
        <p className="text-[11px] text-[var(--studio-muted)] leading-relaxed">
          {req.note}
        </p>
      </div>

      <button
        type="button"
        onClick={onRequestUploadOwnMp3}
        className="shrink-0 h-8 px-3 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-input)] text-xs font-medium text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Upload className="h-3.5 w-3.5" />
        <span>Upload Licensed MP3</span>
      </button>
    </div>
  );

  return (
    <div className="mt-5 space-y-4">
      {/* Search, Sort & Volume Bar */}
      <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-6 relative">
            <Search className="h-4 w-4 text-[var(--studio-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, artist, or scene (e.g. Dandelions, Piano)..."
              aria-label="Search music library"
              className="w-full h-10 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] pl-9 pr-3 text-xs sm:text-sm text-[var(--studio-text)] placeholder:text-[var(--studio-muted)]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              aria-label="Sort music library"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full h-10 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] px-3 text-xs text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
            >
              <option value="popularity">Sort: Popularity</option>
              <option value="duration">Sort: Duration</option>
              <option value="title">Sort: Title (A–Z)</option>
              <option value="bpm">Sort: Tempo (BPM)</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2 rounded-lg bg-[var(--studio-subcard)] border border-[var(--studio-border)] px-3 h-10">
            <Volume2 className="h-3.5 w-3.5 text-[var(--studio-primary)] shrink-0" />
            <input
              type="range"
              aria-label="Library preview volume"
              min={0}
              max={1}
              step={0.05}
              value={previewVolume}
              onChange={(e) => setPreviewVolume(Number(e.target.value))}
              className="flex-1 accent-[var(--studio-primary)] cursor-pointer"
            />
            <span className="text-[11px] font-mono tabular-nums text-[var(--studio-primary)] w-8 text-right">
              {Math.round(previewVolume * 100)}%
            </span>
          </div>
        </div>

        {/* View Tabs: All Library / Favorites / Recently Played / Requested Titles */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              { id: 'all', label: `Licensed Library (${BUILT_IN_MUSIC_LIBRARY.length})` },
              { id: 'favorites', label: `Favorites (${favorites.length})` },
              { id: 'recent', label: `Recently Played (${recentIds.length})` },
              { id: 'requested', label: `Requested Titles (${REQUESTED_SONGS_CATALOG.length})` },
            ] as { id: LibraryViewTab; label: string }[]
          ).map((tab) => {
            const active = viewTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 9 Music Categories Filter Bar */}
        {viewTab !== 'requested' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                  : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              All 9 Collections
            </button>
            {MUSIC_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  title={cat.description}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                    active
                      ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)]'
                      : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Requested Commercial Songs View */}
      {viewTab === 'requested' && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] px-4 py-3 text-xs text-[var(--studio-muted)] flex flex-wrap items-center justify-between gap-2">
            <span>
              Commercial copyrighted titles cannot be included or exported without external licensing. Upload your own legally obtained MP3 in Option B, or choose a licensed celebration track from the library.
            </span>
          </div>
          {filteredRequestedTracks.map(renderRequestedRow)}
        </div>
      )}

      {/* Search Matches in Requested Songs (shown transparently when user searches a requested song in All tab) */}
      {viewTab === 'all' && filteredRequestedTracks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-muted)] px-1">
            Matching Requested Commercial Titles
          </p>
          {filteredRequestedTracks.map(renderRequestedRow)}
        </div>
      )}

      {/* Licensed Library Tracks Grid/List */}
      {viewTab !== 'requested' && (
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {filteredLicensedTracks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--studio-border)] bg-[var(--studio-input)] p-6 text-center space-y-2">
              <Disc3 className="h-6 w-6 text-[var(--studio-muted)] mx-auto" />
              <p className="text-sm font-medium text-[var(--studio-text)]">
                {viewTab === 'favorites'
                  ? 'No favorite tracks saved yet.'
                  : viewTab === 'recent'
                    ? 'No recently played library tracks yet.'
                    : 'No licensed tracks matched your filter.'}
              </p>
              <p className="text-xs text-[var(--studio-muted)]">
                Try clearing your search or selecting All 9 Collections.
              </p>
            </div>
          ) : (
            filteredLicensedTracks.map((track) => {
              const isSelected = activeMusic?.libraryTrackId === track.id;
              const isThisPreview = previewTrackId === track.id;
              const isPlayingHere = isThisPreview && isPreviewPlaying;
              const isFav = favorites.includes(track.id);
              const isBusy = applyingTrackId === track.id;
              const curSec = isThisPreview ? previewProgressSec : 0;
              const totSec =
                isThisPreview && previewDurationSec > 0
                  ? previewDurationSec
                  : track.durationSeconds;

              return (
                <div
                  key={track.id}
                  className={`rounded-xl border p-3.5 transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)]'
                      : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] hover:border-[var(--studio-border)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Play/Pause + Track Metadata */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePreview(track)}
                        aria-label={
                          isPlayingHere
                            ? `Pause ${track.title}`
                            : `Preview ${track.title}`
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        {isPlayingHere ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 translate-x-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-[var(--studio-text)] truncate">
                            {track.title}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--studio-subcard)] border border-[var(--studio-border-soft)] text-[var(--studio-primary)]">
                            {track.categoryLabel}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--studio-muted)] truncate mt-0.5">
                          {track.artist} · Ideal for {track.idealScene}
                        </p>

                        <p className="text-[11px] font-mono tabular-nums text-[var(--studio-muted)]/85 mt-0.5">
                          {formatClock(track.durationSeconds)} · {track.bpm} BPM ·{' '}
                          {track.formatLabel} · {track.qualityLabel}
                        </p>
                      </div>
                    </div>

                    {/* Favorite + Select Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFavorites((prev) => toggleFavoriteTrackId(prev, track.id))
                        }
                        aria-label={
                          isFav
                            ? `Remove ${track.title} from favorites`
                            : `Favorite ${track.title}`
                        }
                        className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                          isFav
                            ? 'border-[var(--studio-accent)] bg-[var(--studio-subcard)] text-[var(--studio-accent)]'
                            : 'border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleUseTrack(track)}
                        className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                          isSelected
                            ? 'bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                            : 'border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)]'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Selected</span>
                          </>
                        ) : isBusy ? (
                          <span>Loading...</span>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Use Track</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Audio Progress Bar + License Footer */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="text-[10px] font-mono tabular-nums text-[var(--studio-muted)] inline-flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatClock(curSec)} / {formatClock(totSec)}
                      </span>
                    </span>

                    <input
                      type="range"
                      aria-label={`${track.title} audio progress`}
                      min={0}
                      max={Math.max(1, Math.floor(totSec))}
                      step={0.2}
                      value={curSec}
                      disabled={!isThisPreview}
                      onChange={(e) =>
                        handleSeekPreview(track.id, Number(e.target.value))
                      }
                      className="flex-1 min-w-[120px] accent-[var(--studio-primary)] cursor-pointer disabled:opacity-45"
                    />

                    <span className="text-[10px] text-[var(--studio-primary)] font-medium whitespace-nowrap">
                      {track.licenseLabel} · Export Ready
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
