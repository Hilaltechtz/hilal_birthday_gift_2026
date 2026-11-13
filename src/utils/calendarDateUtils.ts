export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const WEEKDAY_HEADERS = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
] as const;

export function isLeapYear(year: number): boolean {
  if (!Number.isFinite(year)) return false;
  const y = Math.trunc(year);
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function normalizeMonth(month: number): number {
  if (!Number.isFinite(month)) return 1;
  return Math.max(1, Math.min(12, Math.trunc(month)));
}

/**
 * Returns the exact number of days in a month (1..12).
 * When month is February (2):
 *  - If year is provided, uses exact Gregorian leap-year rules (28 or 29).
 *  - If year is null/undefined, returns 29 so February 29 birthdays remain valid.
 */
export function getDaysInMonth(month: number, year?: number | null): number {
  const m = normalizeMonth(month);
  if (m === 2) {
    if (year !== null && year !== undefined && Number.isFinite(year)) {
      return isLeapYear(year) ? 29 : 28;
    }
    return 29;
  }
  if (m === 4 || m === 6 || m === 9 || m === 11) {
    return 30;
  }
  return 31;
}

export function clampDayToMonth(
  month: number,
  day: number,
  year?: number | null,
): number {
  const maxDay = getDaysInMonth(month, year);
  if (!Number.isFinite(day)) return 1;
  return Math.max(1, Math.min(maxDay, Math.round(day)));
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[normalizeMonth(month) - 1];
}

export function formatBirthdayLabel(
  month: number,
  day: number,
  year?: number | null,
): string {
  const m = normalizeMonth(month);
  const d = clampDayToMonth(m, day, year);
  const base = `${MONTH_NAMES[m - 1]} ${d}`;
  if (year !== null && year !== undefined && Number.isFinite(year) && year > 0) {
    return `${base}, ${Math.trunc(year)}`;
  }
  return base;
}

export function parseBirthdayString(
  raw: string,
  fallbackMonth = 4,
  fallbackDay = 7,
): { month: number; day: number; year: number | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      month: normalizeMonth(fallbackMonth),
      day: clampDayToMonth(fallbackMonth, fallbackDay, null),
      year: null,
    };
  }

  // ISO format YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = normalizeMonth(Number(isoMatch[2]));
    const day = clampDayToMonth(month, Number(isoMatch[3]), year);
    return { month, day, year };
  }

  // Numeric MM/DD or MM/DD/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (slashMatch) {
    const month = normalizeMonth(Number(slashMatch[1]));
    const rawYear = slashMatch[3] ? Number(slashMatch[3]) : null;
    const year =
      rawYear !== null && rawYear > 0
        ? rawYear < 100
          ? 2000 + rawYear
          : rawYear
        : null;
    const day = clampDayToMonth(month, Number(slashMatch[2]), year);
    return { month, day, year };
  }

  // Named month ("November 13", "April 7, 1999", "13 Nov", etc.)
  const lower = trimmed.toLowerCase();
  let detectedMonth: number | null = null;
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (
      lower.includes(MONTH_NAMES[i].toLowerCase()) ||
      new RegExp(`\\b${MONTH_SHORT_NAMES[i].toLowerCase()}\\b`).test(lower)
    ) {
      detectedMonth = i + 1;
      break;
    }
  }

  const nums = trimmed.match(/\d+/g)?.map(Number) || [];
  let detectedYear: number | null = null;
  let detectedDay: number | null = null;

  for (const n of nums) {
    if (n >= 1900 && n <= 2200) {
      detectedYear = n;
    } else if (detectedDay === null && n >= 1 && n <= 31) {
      detectedDay = n;
    }
  }

  const month = detectedMonth ?? normalizeMonth(fallbackMonth);
  const day = clampDayToMonth(
    month,
    detectedDay ?? fallbackDay,
    detectedYear,
  );
  return { month, day, year: detectedYear };
}

export interface CalendarMonthGrid {
  month: number;
  layoutYear: number;
  daysInMonth: number;
  firstDayOffset: number;
  cells: (number | null)[];
}

/**
 * Generates an accurate 7-column calendar grid for the given month/year.
 * Defaults layoutYear to 2024 (a leap year) when year is omitted so Feb 29 has a real slot.
 */
export function getCalendarMonthGrid(
  month: number,
  year?: number | null,
): CalendarMonthGrid {
  const m = normalizeMonth(month);
  const layoutYear =
    year !== null && year !== undefined && Number.isFinite(year) && year > 0
      ? Math.trunc(year)
      : 2024;
  const daysInMonth = getDaysInMonth(m, year);
  const firstDayOffset = new Date(layoutYear, m - 1, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return {
    month: m,
    layoutYear,
    daysInMonth,
    firstDayOffset,
    cells,
  };
}

/**
 * Computes which day (1..birthdayDay) is currently spotlighted during
 * the Calendar Counting stage. Strictly bounded between 1 and birthdayDay,
 * never counting past birthdayDay.
 */
export function computeCalendarHighlightedDay(
  countingProgress01: number,
  birthdayDay: number,
): { currentDay: number; stepLocalProgress: number } {
  const target = Math.max(1, Math.min(31, Math.round(birthdayDay)));
  const p = Math.max(0, Math.min(1, countingProgress01));

  if (target === 1) {
    return { currentDay: 1, stepLocalProgress: p };
  }

  // Spread 1..target evenly across [0..1] so the final day lands cleanly before p = 1
  const scaled = p * target;
  const currentDay = Math.min(target, Math.max(1, Math.floor(scaled) + 1));
  const stepLocalProgress =
    currentDay === target && scaled >= target
      ? 1
      : Math.max(0, Math.min(1, scaled - Math.floor(scaled)));

  return { currentDay, stepLocalProgress };
}
