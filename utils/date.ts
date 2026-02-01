export type LocalDateKey = `${number}-${string}-${string}`;

export function getLocalDateKey(date: Date): LocalDateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as LocalDateKey;
}

export function parseLocalDateKey(key: string): Date {
  const parts = key.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  return new Date(y, Math.max(0, m - 1), d, 0, 0, 0, 0);
}

export function safeDateFromAny(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return null;

    const hasTime = raw.includes('T');
    const normalized = hasTime ? raw : `${raw}T00:00:00`;

    const parsed = new Date(normalized);
    if (!Number.isFinite(parsed.getTime())) {
      const tryRaw = new Date(raw);
      return Number.isFinite(tryRaw.getTime()) ? tryRaw : null;
    }
    return parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

export function getTaskLocalDateKey(taskDateValue: unknown): LocalDateKey | null {
  const dateObj = safeDateFromAny(taskDateValue);
  if (!dateObj) return null;
  return getLocalDateKey(dateObj);
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getWeekRangeLocal(date: Date, weekStartsOn: 'monday' | 'sunday' = 'monday') {
  const base = startOfLocalDay(date);
  const day = base.getDay();
  const shift = weekStartsOn === 'monday' ? (day === 0 ? 6 : day - 1) : day;

  const start = new Date(base);
  start.setDate(base.getDate() - shift);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start: startOfLocalDay(start), end: endOfLocalDay(end) };
}

export function getMonthRangeLocal(date: Date) {
  const base = startOfLocalDay(date);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { start: startOfLocalDay(start), end: endOfLocalDay(end) };
}

export function isDateInRangeLocal(date: Date, range: { start: Date; end: Date }): boolean {
  return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
}
