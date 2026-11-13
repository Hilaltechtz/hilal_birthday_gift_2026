import { Plus, Trash2 } from 'lucide-react';
import {
  CustomAspectConfig,
  DEFAULT_WISH_ANIMATION_PRESETS,
  PLATFORM_PRESETS,
  PlatformId,
  StudioMessages,
  VideoDurationOption,
} from '../../types';
import {
  clampDayToMonth,
  formatBirthdayLabel,
  getDaysInMonth,
  getMonthName,
  isLeapYear,
  MONTH_NAMES,
} from '../../utils/calendarDateUtils';

interface RecipientInfoCardProps {
  recipientName: string;
  birthdayMonth: number;
  birthdayDay: number;
  birthdayYear: number | null;
  personalGreeting: string;
  onChangeName: (name: string) => void;
  onChangeBirthdayParts: (month: number, day: number, year: number | null) => void;
  onChangeGreeting: (greeting: string) => void;
}

export function RecipientInfoCard({
  recipientName,
  birthdayMonth,
  birthdayDay,
  birthdayYear,
  personalGreeting,
  onChangeName,
  onChangeBirthdayParts,
  onChangeGreeting,
}: RecipientInfoCardProps) {
  const daysInSelectedMonth = getDaysInMonth(birthdayMonth, birthdayYear);
  const formattedPreview = formatBirthdayLabel(
    birthdayMonth,
    birthdayDay,
    birthdayYear,
  );
  const isLeap =
    birthdayYear !== null && birthdayYear > 0 ? isLeapYear(birthdayYear) : null;

  const handleMonthChange = (nextMonth: number) => {
    const clampedDay = clampDayToMonth(nextMonth, birthdayDay, birthdayYear);
    onChangeBirthdayParts(nextMonth, clampedDay, birthdayYear);
  };

  const handleDayChange = (nextDay: number) => {
    const clampedDay = clampDayToMonth(birthdayMonth, nextDay, birthdayYear);
    onChangeBirthdayParts(birthdayMonth, clampedDay, birthdayYear);
  };

  const handleYearChange = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      const clampedDay = clampDayToMonth(birthdayMonth, birthdayDay, null);
      onChangeBirthdayParts(birthdayMonth, clampedDay, null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    const nextYear = Math.max(1900, Math.min(2150, Math.trunc(parsed)));
    const clampedDay = clampDayToMonth(birthdayMonth, birthdayDay, nextYear);
    onChangeBirthdayParts(birthdayMonth, clampedDay, nextYear);
  };

  return (
    <section
      id="section-recipient"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20"
    >
      <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
        Section A
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
        Recipient Information
      </h2>
      <p className="mt-1 text-sm text-[var(--studio-muted)]">
        Personalize who this birthday movie is created for and the exact birthday calendar date.
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="studio-recipient-name"
            className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
          >
            Recipient Name
          </label>
          <input
            id="studio-recipient-name"
            type="text"
            value={recipientName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Salma"
            className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-4 py-3 text-sm sm:text-base text-[var(--studio-text)] placeholder:text-[var(--studio-muted)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
          />
        </div>

        {/* Validated Birthday Month / Day / Optional Year */}
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="studio-birthday-month"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Birthday Month
            </label>
            <select
              id="studio-birthday-month"
              value={birthdayMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="w-full h-[46px] rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 text-sm sm:text-base text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="studio-birthday-day"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Birthday Day (1 – {daysInSelectedMonth})
            </label>
            <select
              id="studio-birthday-day"
              value={birthdayDay}
              onChange={(e) => handleDayChange(Number(e.target.value))}
              className="w-full h-[46px] rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 text-sm sm:text-base font-mono tabular-nums text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            >
              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(
                (dayNum) => (
                  <option key={dayNum} value={dayNum}>
                    {dayNum}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="studio-birthday-year"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Year (Optional)
            </label>
            <input
              id="studio-birthday-year"
              type="number"
              min={1900}
              max={2150}
              placeholder="Any year"
              value={birthdayYear ?? ''}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full h-[46px] rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 text-sm sm:text-base font-mono tabular-nums text-[var(--studio-text)] placeholder:text-[var(--studio-muted)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>

          <p className="sm:col-span-3 text-xs text-[var(--studio-muted)] tabular-nums">
            Selected celebration date:{' '}
            <span className="font-semibold text-[var(--studio-primary)]">
              {formattedPreview}
            </span>{' '}
            · {getMonthName(birthdayMonth)} has {daysInSelectedMonth} days
            {birthdayMonth === 2 && isLeap !== null
              ? isLeap
                ? ' (Leap Year)'
                : ' (Standard Year)'
              : ''}
          </p>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="studio-personal-greeting"
            className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
          >
            Optional Personal Greeting (Birthday Scene Subtitle)
          </label>
          <input
            id="studio-personal-greeting"
            type="text"
            value={personalGreeting}
            onChange={(e) => onChangeGreeting(e.target.value)}
            placeholder="Celebrating another radiant year of grace and joy..."
            className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-4 py-3 text-sm sm:text-base text-[var(--studio-text)] placeholder:text-[var(--studio-muted)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
          />
        </div>
      </div>
    </section>
  );
}

interface MessageEditorCardProps {
  messages: StudioMessages;
  onChangeMessages: (next: StudioMessages) => void;
}

export function MessageEditorCard({
  messages,
  onChangeMessages,
}: MessageEditorCardProps) {
  const updateWish = (idx: number, val: string) => {
    const nextWishes = [...messages.wishes];
    nextWishes[idx] = val;
    onChangeMessages({ ...messages, wishes: nextWishes });
  };

  const addWish = () => {
    const nextIdx = messages.wishes.length;
    const currentAnims = messages.wishes.map((_, i) => ({
      ...DEFAULT_WISH_ANIMATION_PRESETS[i % DEFAULT_WISH_ANIMATION_PRESETS.length],
      ...(messages.wishAnimations?.[i] || {}),
    }));
    const newAnim = {
      ...DEFAULT_WISH_ANIMATION_PRESETS[
        nextIdx % DEFAULT_WISH_ANIMATION_PRESETS.length
      ],
    };
    onChangeMessages({
      ...messages,
      wishes: [
        ...messages.wishes,
        'May your heart always overflow with joy, peace, and blessings.',
      ],
      wishAnimations: [...currentAnims, newAnim],
    });
  };

  const removeWish = (idx: number) => {
    if (messages.wishes.length <= 1) return;
    const currentAnims = messages.wishes.map((_, i) => ({
      ...DEFAULT_WISH_ANIMATION_PRESETS[i % DEFAULT_WISH_ANIMATION_PRESETS.length],
      ...(messages.wishAnimations?.[i] || {}),
    }));
    onChangeMessages({
      ...messages,
      wishes: messages.wishes.filter((_, i) => i !== idx),
      wishAnimations: currentAnims.filter((_, i) => i !== idx),
    });
  };

  return (
    <section
      id="section-messages"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20"
    >
      <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
        Section D
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
        Birthday Message Editor
      </h2>
      <p className="mt-1 text-sm text-[var(--studio-muted)]">
        Customize every title card, heartfelt wish, and final sign-off rendered inside the movie.
      </p>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="msg-opening"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Opening Message (Scene 1)
            </label>
            <input
              id="msg-opening"
              type="text"
              value={messages.openingMessage}
              onChange={(e) =>
                onChangeMessages({ ...messages, openingMessage: e.target.value })
              }
              className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2.5 text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="msg-announcement"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Birthday Announcement (Scene 2)
            </label>
            <input
              id="msg-announcement"
              type="text"
              value={messages.announcementHeadline}
              onChange={(e) =>
                onChangeMessages({
                  ...messages,
                  announcementHeadline: e.target.value,
                })
              }
              className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2.5 text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>
        </div>

        {/* Wishes List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--studio-muted)]">
              Birthday Wishes (Scene 5)
            </span>
            <button
              type="button"
              onClick={addWish}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Wish</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {messages.wishes.map((wish, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <textarea
                  rows={2}
                  value={wish}
                  onChange={(e) => updateWish(idx, e.target.value)}
                  aria-label={`Birthday wish ${idx + 1}`}
                  className="flex-1 rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)] resize-none"
                />
                {messages.wishes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWish(idx)}
                    aria-label={`Remove wish ${idx + 1}`}
                    className="h-10 w-10 shrink-0 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] text-[var(--studio-accent)] hover:border-[var(--studio-accent)] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Special & Final Message + Sender */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--studio-border-soft)]">
          <div>
            <label
              htmlFor="msg-special"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Special Message (Scene 6)
            </label>
            <input
              id="msg-special"
              type="text"
              value={messages.specialMessage}
              onChange={(e) =>
                onChangeMessages({ ...messages, specialMessage: e.target.value })
              }
              className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2.5 text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="msg-final"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Closing Prefix
            </label>
            <input
              id="msg-final"
              type="text"
              value={messages.finalMessage}
              onChange={(e) =>
                onChangeMessages({ ...messages, finalMessage: e.target.value })
              }
              className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2.5 text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="msg-sender"
              className="block text-xs font-medium text-[var(--studio-muted)] mb-2"
            >
              Sender&apos;s Name
            </label>
            <input
              id="msg-sender"
              type="text"
              value={messages.senderName}
              onChange={(e) =>
                onChangeMessages({ ...messages, senderName: e.target.value })
              }
              placeholder="YOUR FRIEND"
              className="w-full rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border)] px-3.5 py-2.5 text-sm text-[var(--studio-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface VideoSettingsCardProps {
  platformId: PlatformId;
  customAspect: CustomAspectConfig;
  durationSeconds: VideoDurationOption;
  onSelectPlatform: (platformId: PlatformId) => void;
  onChangeCustomAspect: (next: CustomAspectConfig) => void;
  onChangeDuration: (dur: VideoDurationOption) => void;
}

const DURATIONS: VideoDurationOption[] = [15, 30, 45, 60];

const CUSTOM_RATIO_QUICK_PRESETS: {
  label: string;
  width: number;
  height: number;
}[] = [
  { label: '4:5 Portrait', width: 864, height: 1080 },
  { label: '3:4 Classic', width: 810, height: 1080 },
  { label: '21:9 Cinema', width: 1470, height: 630 },
  { label: '2:3 Vertical', width: 720, height: 1080 },
];

export function VideoSettingsCard({
  platformId,
  customAspect,
  durationSeconds,
  onSelectPlatform,
  onChangeCustomAspect,
  onChangeDuration,
}: VideoSettingsCardProps) {
  const clampDim = (val: number) =>
    Math.max(480, Math.min(1920, Math.round(val / 2) * 2));

  return (
    <section
      id="section-settings"
      className="luxury-panel rounded-2xl p-6 sm:p-7 scroll-mt-20"
    >
      <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--studio-primary)]">
        Section E
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--studio-heading)]">
        CHOOSE YOUR VIDEO PLATFORM
      </h2>
      <p className="mt-1 text-sm text-[var(--studio-muted)]">
        Select your publishing destination or custom aspect dimensions. Live video preview updates immediately.
      </p>

      {/* 8 Platform Presets */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLATFORM_PRESETS.map((preset) => {
          const active = platformId === preset.id;
          const boxW =
            preset.aspectRatio === '16:9'
              ? 20
              : preset.aspectRatio === '1:1'
                ? 15
                : preset.aspectRatio === 'custom'
                  ? 14
                  : 10;
          const boxH =
            preset.aspectRatio === '16:9'
              ? 12
              : preset.aspectRatio === '1:1'
                ? 15
                : preset.aspectRatio === 'custom'
                  ? 17
                  : 18;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPlatform(preset.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                active
                  ? 'border-[var(--studio-primary)] bg-[var(--studio-active-tile)] shadow-md'
                  : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] hover:border-[var(--studio-border)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs sm:text-sm font-semibold text-[var(--studio-text)] leading-snug">
                  {preset.name}
                </span>
                <span
                  className={`shrink-0 inline-block border ${
                    active
                      ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/25'
                      : 'border-[var(--studio-muted)]/45'
                  }`}
                  style={{ width: boxW, height: boxH, borderRadius: 3 }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                <span className={active ? 'text-[var(--studio-primary)] font-semibold' : 'text-[var(--studio-muted)]'}>
                  {preset.ratioLabel}
                </span>
                <span className="text-[var(--studio-muted)]/80">
                  {preset.id === 'custom'
                    ? `${customAspect.width}×${customAspect.height}`
                    : `${preset.width}×${preset.height}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Aspect Ratio Controls */}
      {platformId === 'custom' && (
        <div className="mt-4 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-subcard)] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--studio-primary)]">
              Custom Video Dimensions (px)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CUSTOM_RATIO_QUICK_PRESETS.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() =>
                    onChangeCustomAspect({ width: qp.width, height: qp.height })
                  }
                  className="px-2.5 py-1 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-input)] text-[11px] font-medium text-[var(--studio-muted)] hover:text-[var(--studio-primary)] hover:border-[var(--studio-border-strong)] cursor-pointer"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="custom-width-input"
                className="block text-[11px] text-[var(--studio-muted)] mb-1"
              >
                Width (480 – 1920)
              </label>
              <input
                id="custom-width-input"
                type="number"
                min={480}
                max={1920}
                step={2}
                value={customAspect.width}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) {
                    onChangeCustomAspect({
                      ...customAspect,
                      width: clampDim(val),
                    });
                  }
                }}
                className="w-full rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-3 py-2 text-sm font-mono tabular-nums text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
              />
            </div>

            <div>
              <label
                htmlFor="custom-height-input"
                className="block text-[11px] text-[var(--studio-muted)] mb-1"
              >
                Height (480 – 1920)
              </label>
              <input
                id="custom-height-input"
                type="number"
                min={480}
                max={1920}
                step={2}
                value={customAspect.height}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) {
                    onChangeCustomAspect({
                      ...customAspect,
                      height: clampDim(val),
                    });
                  }
                }}
                className="w-full rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] px-3 py-2 text-sm font-mono tabular-nums text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Duration Buttons */}
      <div className="mt-5 pt-4 border-t border-[var(--studio-border-soft)]">
        <span className="block text-xs font-medium text-[var(--studio-muted)] mb-2.5">
          Video Duration
        </span>
        <div className="grid grid-cols-4 gap-2.5">
          {DURATIONS.map((dur) => {
            const active = durationSeconds === dur;
            return (
              <button
                key={dur}
                type="button"
                onClick={() => onChangeDuration(dur)}
                className={`min-h-[44px] rounded-xl border text-sm font-semibold tabular-nums transition-all cursor-pointer ${
                  active
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-btn-bg)] text-[var(--studio-btn-text)]'
                    : 'border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-text)] hover:border-[var(--studio-border)]'
                }`}
              >
                {dur}s
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
