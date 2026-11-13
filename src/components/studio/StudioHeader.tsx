import { Film, RotateCcw } from 'lucide-react';

interface StudioHeaderProps {
  onJumpTo: (sectionId: string) => void;
  onResetProject: () => void;
  onGenerateClick: () => void;
  isRendering: boolean;
}

const SECTIONS = [
  { id: 'section-recipient', label: 'Recipient' },
  { id: 'section-calendar-cake', label: 'Calendar & Cake' },
  { id: 'section-music', label: 'Music & Sync' },
  { id: 'section-messages', label: 'Wishes & Text' },
  { id: 'section-settings', label: 'Format' },
];

export function StudioHeader({
  onJumpTo,
  onResetProject,
  onGenerateClick,
  isRendering,
}: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--studio-border)] bg-[var(--studio-header-bg)] backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto h-14 px-4 sm:px-8 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-gold-gradient whitespace-nowrap shrink-0"
        >
          MAGICAL BIRTHDAY STUDIO
        </a>

        {/* Zone 2: Section Navigation Links */}
        <nav
          aria-label="Studio workspace sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--studio-muted)]"
        >
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => onJumpTo(sec.id)}
              className="hover:text-[var(--studio-heading)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {sec.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetProject}
            title="Reset project to defaults"
            aria-label="Reset project to defaults"
            className="h-9 w-9 sm:w-auto sm:px-3 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-xs font-medium text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={onGenerateClick}
            disabled={isRendering}
            className="gold-shimmer-btn h-9 px-4 rounded-lg text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Film className="h-3.5 w-3.5" />
            <span>{isRendering ? 'Rendering...' : 'Generate Video'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
