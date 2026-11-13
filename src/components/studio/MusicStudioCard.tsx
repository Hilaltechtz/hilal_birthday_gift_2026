import {
  Library,
  Music,
  Pause,
  Play,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { StudioMessages, StudioMusic, StudioProjectConfig } from '../../types';
import { analyzeUploadedMusic } from '../../utils/audioAnalyzer';
import { readAudioFileAsDataUrl } from '../../utils/storage';
import { MusicBeatSyncPanel } from './MusicBeatSyncPanel';
import { MusicLibraryBrowser } from './MusicLibraryBrowser';

interface MusicStudioCardProps {
  config: StudioProjectConfig;
  onChangeMusic: (next: StudioMusic | null) => void;
  onChangeBeatSync: (next: StudioProjectConfig['beatSync']) => void;
  onChangeMessages: (next: StudioMessages) => void;
}

type MusicSourceTab = 'library' | 'upload';

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function MusicStudioCard({
  config,
  onChangeMusic,
  onChangeBeatSync,
  onChangeMessages,
}: MusicStudioCardProps) {
  const music = config.music;
  const [sourceTab, setSourceTab] = useState<MusicSourceTab>(() =>
    config.music?.sourceType === 'upload' || (config.music && !config.music.libraryTrackId)
      ? 'upload'
      : 'library',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [libraryPreviewStopSignal, setLibraryPreviewStopSignal] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && music) {
      audioRef.current.volume = music.volume;
    }
  }, [music?.volume]);

  const stopPreviewAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopPreviewAudio();
    setLibraryPreviewStopSignal((n) => n + 1);
    setIsLoading(true);
    try {
      const dataUrl = await readAudioFileAsDataUrl(file);
      const { durationSeconds, bpm, waveformPeaks, detectedBeats } =
        await analyzeUploadedMusic(dataUrl, config.beatSync.sensitivity);
      onChangeMusic({
        name: file.name,
        dataUrl,
        durationSeconds,
        startOffsetSeconds: 0,
        volume: 0.85,
        syncToBeat: true,
        bpm,
        waveformPeaks,
        detectedBeats,
        sourceType: 'upload',
        artist: 'Personal Upload',
        category: 'Uploaded Soundtrack',
        licenseLabel: 'User-Supplied Licensed MP3',
        formatLabel: file.type ? file.type.toUpperCase() : 'MP3 / Audio',
      });
      onChangeBeatSync({
        ...config.beatSync,
        removedDetectedBeatIds: [],
        editedDetectedBeats: {},
      });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const toggleAudioPreview = () => {
    if (!music) return;
    if (isPlayingPreview && audioRef.current) {
      stopPreviewAudio();
      return;
    }
    setLibraryPreviewStopSignal((n) => n + 1);
    const el = new Audio(music.dataUrl);
    el.currentTime = Math.min(
      music.startOffsetSeconds,
      Math.max(0, music.durationSeconds - 1),
    );
    el.volume = music.volume;
    el.onended = () => setIsPlayingPreview(false);
    audioRef.current = el;
    void el.play().then(() => setIsPlayingPreview(true)).catch(() => {
      setIsPlayingPreview(false);
    });
  };

  const handleSelectLibraryTrack = (nextMusic: StudioMusic) => {
    stopPreviewAudio();
    onChangeMusic(nextMusic);
    onChangeBeatSync({
      ...config.beatSync,
      removedDetectedBeatIds: [],
      editedDetectedBeats: {},
    });
  };

  return (
    <section
      id="section-music"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
            Section C
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
            Music Studio &amp; Beat Sync
          </h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            Choose a licensed birthday track from the built-in library or upload your own MP3, then sync cuts &amp; wishes to beats.
          </p>
        </div>

        {music && (
          <button
            type="button"
            onClick={() => {
              stopPreviewAudio();
              onChangeMusic(null);
              onChangeBeatSync({
                ...config.beatSync,
                removedDetectedBeatIds: [],
                editedDetectedBeats: {},
              });
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-accent)] hover:border-[var(--studio-accent)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remove Soundtrack</span>
          </button>
        )}
      </div>

      {/* Two Clear Options Switcher: Option A (Built-In Library) / Option B (Personal MP3 Upload) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSourceTab('library')}
          className={`min-h-[46px] px-4 py-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
            sourceTab === 'library'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)] shadow-sm'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          <Library className="h-4 w-4 text-[var(--studio-primary)] shrink-0" />
          <div>
            <span className="block text-xs font-semibold">
              Option A: Choose From Music Library
            </span>
            <span className="block text-[11px] opacity-80">
              18 licensed celebration tracks · 9 collections
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSourceTab('upload')}
          className={`min-h-[46px] px-4 py-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
            sourceTab === 'upload'
              ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] text-[var(--studio-heading)] shadow-sm'
              : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          <Upload className="h-4 w-4 text-[var(--studio-primary)] shrink-0" />
          <div>
            <span className="block text-xs font-semibold">
              Option B: Upload My Own MP3
            </span>
            <span className="block text-[11px] opacity-80">
              Use your personal licensed MP3 / audio file
            </span>
          </div>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Option A: Built-In Licensed Music Library */}
      {sourceTab === 'library' && (
        <MusicLibraryBrowser
          activeMusic={music}
          stopSignal={libraryPreviewStopSignal}
          onSelectLibraryTrack={handleSelectLibraryTrack}
          onRequestUploadOwnMp3={() => {
            setSourceTab('upload');
            window.setTimeout(() => fileRef.current?.click(), 80);
          }}
          onStopExternalPreview={stopPreviewAudio}
        />
      )}

      {/* Option B: Personal MP3 Upload Drop Area */}
      {sourceTab === 'upload' && (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--studio-border)] bg-[var(--studio-input)] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-btn-secondary-bg)] text-[var(--studio-primary)]">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--studio-text)]">
                {isLoading
                  ? 'Analyzing audio waveform & beats...'
                  : music?.sourceType === 'upload'
                    ? `Active Upload: ${music.name}`
                    : 'Upload Personal Licensed MP3'}
              </p>
              <p className="text-xs text-[var(--studio-muted)]">
                Import your own MP3 track to embed it directly into preview, beat sync, and exported video.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
            className="gold-shimmer-btn min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>
              {isLoading
                ? 'Analyzing MP3...'
                : music?.sourceType === 'upload'
                  ? 'Replace MP3'
                  : 'Upload MP3 Music'}
            </span>
          </button>
        </div>
      )}

      {/* Selected Active Track Deck (works identically for Library selection & Uploaded MP3) */}
      {music && (
        <div className="mt-5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-input)] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={toggleAudioPreview}
                aria-label={isPlayingPreview ? 'Pause selected track' : 'Play selected track'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                {isPlayingPreview ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5" />
                )}
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--studio-text)]">
                    {music.name}
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--studio-subcard)] border border-[var(--studio-border)] text-[var(--studio-primary)]">
                    {music.sourceType === 'library' ? 'Library Track' : 'Uploaded MP3'}
                  </span>
                </div>
                <p className="text-xs text-[var(--studio-muted)] tabular-nums">
                  {music.artist ? `${music.artist} · ` : ''}
                  {formatSec(music.durationSeconds)} total
                  {music.bpm ? ` · ~${music.bpm} BPM` : ''}
                  {music.detectedBeats?.length
                    ? ` · ${music.detectedBeats.length} energy peaks`
                    : ''}
                  {music.qualityLabel ? ` · ${music.qualityLabel}` : ''}
                </p>
              </div>
            </div>

            {music.sourceType === 'upload' && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] transition-colors cursor-pointer"
              >
                Replace MP3
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--studio-border-soft)]">
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--studio-muted)] mb-2">
                <label htmlFor="music-start-offset">Music Starting Point</label>
                <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                  {formatSec(music.startOffsetSeconds)}
                </span>
              </div>
              <input
                id="music-start-offset"
                type="range"
                min={0}
                max={Math.max(1, Math.floor(music.durationSeconds - 2))}
                step={1}
                value={music.startOffsetSeconds}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeMusic({ ...music, startOffsetSeconds: val });
                  if (audioRef.current && isPlayingPreview) {
                    audioRef.current.currentTime = val;
                  }
                }}
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-[var(--studio-muted)] mb-2">
                <label
                  htmlFor="music-volume-studio"
                  className="inline-flex items-center gap-1.5"
                >
                  <Volume2 className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
                  <span>Track Volume</span>
                </label>
                <span className="font-mono tabular-nums text-[var(--studio-primary)]">
                  {Math.round(music.volume * 100)}%
                </span>
              </div>
              <input
                id="music-volume-studio"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={music.volume}
                onChange={(e) =>
                  onChangeMusic({ ...music, volume: Number(e.target.value) })
                }
                className="w-full accent-[var(--studio-primary)] cursor-pointer"
              />
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--studio-border-soft)] cursor-pointer">
            <div>
              <span className="block text-sm font-medium text-[var(--studio-text)]">
                Synchronize photo transitions with music
              </span>
              <span className="block text-xs text-[var(--studio-muted)]">
                Aligns Scene 3 memory cuts to musical phrases and energy peaks
              </span>
            </div>
            <input
              type="checkbox"
              checked={music.syncToBeat}
              onChange={(e) =>
                onChangeMusic({ ...music, syncToBeat: e.target.checked })
              }
              className="h-5 w-5 accent-[var(--studio-primary)] rounded cursor-pointer"
            />
          </label>
        </div>
      )}

      <MusicBeatSyncPanel
        config={config}
        onChangeMusic={onChangeMusic}
        onChangeBeatSync={onChangeBeatSync}
        onChangeMessages={onChangeMessages}
      />
    </section>
  );
}
