import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { hexToRgb, normalizeHex, rgbToHex } from '../../utils/themeColorUtils';

interface ColorControlFieldProps {
  label: string;
  value: string;
  defaultValue: string;
  description?: string;
  onChange: (nextHex: string) => void;
}

export function ColorControlField({
  label,
  value,
  defaultValue,
  description,
  onChange,
}: ColorControlFieldProps) {
  const normalized = normalizeHex(value, defaultValue);
  const [hexDraft, setHexDraft] = useState(normalized);
  const rgb = hexToRgb(normalized);

  useEffect(() => {
    setHexDraft(normalized);
  }, [normalized]);

  const isModified =
    normalized.toUpperCase() !== normalizeHex(defaultValue).toUpperCase();

  const handleHexInput = (raw: string) => {
    setHexDraft(raw);
    const cleaned = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(`#${cleaned.toUpperCase()}`);
    }
  };

  const handleHexBlur = () => {
    const resolved = normalizeHex(hexDraft, normalized);
    setHexDraft(resolved);
    onChange(resolved);
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, Math.min(255, Math.round(parsed)));
    const nextRgb = { ...rgb, [channel]: clamped };
    onChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  };

  return (
    <div className="rounded-xl border border-[var(--studio-border-soft)] bg-[var(--studio-subcard)] p-3 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--studio-text)] truncate">
            {label}
          </p>
          {description && (
            <p className="text-[11px] text-[var(--studio-muted)] truncate">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onChange(normalizeHex(defaultValue))}
          disabled={!isModified}
          title={`Reset ${label} to default`}
          aria-label={`Reset ${label}`}
          className="h-6 w-6 rounded-md border border-[var(--studio-border-soft)] bg-[var(--studio-input)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] disabled:opacity-30 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:cursor-default"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>

      {/* Swatch + HEX Input */}
      <div className="flex items-center gap-2">
        <label className="relative h-9 w-11 shrink-0 rounded-lg overflow-hidden border border-[var(--studio-border)] cursor-pointer shadow-inner">
          <span
            className="absolute inset-0 block"
            style={{ backgroundColor: normalized }}
            aria-hidden="true"
          />
          <input
            type="color"
            value={normalized}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${label} color picker`}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>

        <input
          type="text"
          value={hexDraft}
          onChange={(e) => handleHexInput(e.target.value)}
          onBlur={handleHexBlur}
          maxLength={7}
          aria-label={`${label} HEX value`}
          className="flex-1 min-w-0 h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border-soft)] px-2.5 text-xs font-mono uppercase tracking-wider text-[var(--studio-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--studio-primary)]"
        />
      </div>

      {/* RGB Numeric Inputs */}
      <div className="grid grid-cols-3 gap-1.5">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <label
            key={ch}
            className="flex items-center gap-1 rounded-md bg-[var(--studio-input)] border border-[var(--studio-border-soft)] px-1.5 py-1"
          >
            <span className="text-[10px] font-mono uppercase text-[var(--studio-muted)]">
              {ch}
            </span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb[ch]}
              onChange={(e) => handleRgbChange(ch, e.target.value)}
              aria-label={`${label} ${ch.toUpperCase()} channel`}
              className="w-full bg-transparent text-[11px] font-mono tabular-nums text-[var(--studio-text)] focus:outline-none text-right"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
