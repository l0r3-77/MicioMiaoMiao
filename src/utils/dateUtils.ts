import type { DailyNote, NoteEntry } from '../types/note';

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function isNightOwlTime(hhmm?: string): boolean {
  if (!hhmm || typeof hhmm !== 'string') return false;
  const h = Number(hhmm.split(':')[0]);
  return Number.isFinite(h) && h >= 0 && h < 5;
}

export function getAgendaDefaultDateISO(now: Date = new Date()): string {
  const calendarToday = toISODate(now);
  if (now.getHours() >= 0 && now.getHours() < 5) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return toISODate(prev);
  }
  return calendarToday;
}

export function addDaysISO(isoDate: string, delta: number): string {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function formatItalianDateLong(isoDate: string): string {
  const d = parseISODate(isoDate);
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatItalianDateShort(isoDate: string): string {
  const d = parseISODate(isoDate);
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

export function formatItalianWeekdayShort(isoDate: string): string {
  const d = parseISODate(isoDate);
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
    .format(d)
    .replace('.', '');
}

export function formatItalianMonthYear(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  return new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatRecordedDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns 7 ISO dates (Monday -> Sunday) containing anchorIsoDate
export function getWeekDaysISO(anchorIsoDate: string): string[] {
  const anchor = parseISODate(anchorIsoDate);
  const day = anchor.getDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    return toISODate(cur);
  });
}

export interface CalendarCell {
  isoDate: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

// Returns Monday-first calendar cells for a given year and 0-based monthIndex
export function getMonthCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  const firstWeekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const leadingDays = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const totalDays = lastOfMonth.getDate();

  const totalCells = Math.ceil((leadingDays + totalDays) / 7) * 7;
  const startDate = new Date(year, monthIndex, 1 - leadingDays);

  return Array.from({ length: totalCells }, (_, idx) => {
    const cur = new Date(startDate);
    cur.setDate(startDate.getDate() + idx);
    return {
      isoDate: toISODate(cur),
      dayNumber: cur.getDate(),
      inCurrentMonth: cur.getMonth() === monthIndex,
    };
  });
}

export type DayPeriod = 'mattina' | 'pomeriggio' | 'sera' | 'notte';

/**
 * Mattina: 06:00 – 13:29
 * Pomeriggio: 13:30 – 18:30
 * Sera: 18:31 – 23:59
 * Notte: 00:00 – 05:59
 */
export function getDayPeriod(hhmm: string): DayPeriod {
  const [hStr, mStr] = (hhmm || '09:00').split(':');
  const hour = Number.isFinite(Number(hStr)) ? Number(hStr) : 9;
  const minute = Number.isFinite(Number(mStr)) ? Number(mStr) : 0;
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes >= 360 && totalMinutes < 810) return 'mattina'; // 06:00 - 13:29
  if (totalMinutes >= 810 && totalMinutes <= 1110) return 'pomeriggio'; // 13:30 - 18:30
  if (totalMinutes >= 1111 && totalMinutes < 1440) return 'sera'; // 18:31 - 23:59
  return 'notte';
}

export const DAY_PERIOD_LABELS: Record<
  DayPeriod,
  { title: string; range: string; shortRange: string }
> = {
  mattina: { title: 'Mattina', range: '06:00 – 13:29', shortRange: '06:00–13:29' },
  pomeriggio: { title: 'Pomeriggio', range: '13:30 – 18:30', shortRange: '13:30–18:30' },
  sera: { title: 'Sera', range: '18:31 – 23:59', shortRange: '18:31–23:59' },
  notte: { title: 'Notte', range: '00:00 – 05:59', shortRange: '00:00–05:59' },
};

export function migrateNightOwlDailyNotes(
  notes: DailyNote[],
  options: { onlyStrictCreatedAtMatch?: boolean } = {}
): { notes: DailyNote[]; changed: boolean } {
  const { onlyStrictCreatedAtMatch = false } = options;
  const nowIso = new Date().toISOString();
  const byDate = new Map<string, DailyNote>();
  let changed = false;

  const ensureDay = (date: string, template?: DailyNote, copyPinned = false): DailyNote => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const created: DailyNote = {
      id: `day-${date}`,
      date,
      title: template ? `Diario del ${formatItalianDateShort(date)}` : `Diario del ${formatItalianDateShort(date)}`,
      pinned: copyPinned && template ? template.pinned : false,
      dailySummaryBullets: [],
      entries: [],
      createdAt: template?.createdAt || nowIso,
      updatedAt: nowIso,
    };
    byDate.set(date, created);
    return created;
  };

  for (const dn of notes) {
    const allMove =
      dn.entries.length > 0 &&
      dn.entries.every((e) => {
        if (!isNightOwlTime(e.time)) return false;
        const createdDate = e.createdAt ? new Date(e.createdAt) : null;
        if (onlyStrictCreatedAtMatch) {
          return Boolean(
            createdDate &&
              !Number.isNaN(createdDate.getTime()) &&
              createdDate.getHours() >= 0 &&
              createdDate.getHours() < 5 &&
              toISODate(createdDate) === dn.date
          );
        }
        if (createdDate && !Number.isNaN(createdDate.getTime())) {
          if (toISODate(createdDate) === addDaysISO(dn.date, 1)) {
            return false; // already shifted previously
          }
        }
        return true;
      });

    const stayingEntries: NoteEntry[] = [];

    for (const entry of dn.entries) {
      let shouldMove = false;
      if (isNightOwlTime(entry.time)) {
        const createdDate = entry.createdAt ? new Date(entry.createdAt) : null;
        const hasValidCreated = Boolean(createdDate && !Number.isNaN(createdDate.getTime()));
        if (onlyStrictCreatedAtMatch) {
          if (
            hasValidCreated &&
            createdDate!.getHours() >= 0 &&
            createdDate!.getHours() < 5 &&
            toISODate(createdDate!) === dn.date
          ) {
            shouldMove = true;
          }
        } else {
          const alreadyShifted =
            hasValidCreated && toISODate(createdDate!) === addDaysISO(dn.date, 1);
          if (!alreadyShifted) {
            shouldMove = true;
          }
        }
      }

      if (shouldMove) {
        changed = true;
        const prevDate = addDaysISO(dn.date, -1);
        const targetDay = ensureDay(prevDate, dn, allMove);
        if (!targetDay.entries.some((e) => e.id === entry.id)) {
          targetDay.entries.push(entry);
          targetDay.updatedAt = nowIso;
        }
      } else {
        stayingEntries.push(entry);
      }
    }

    if (stayingEntries.length > 0) {
      const existing = byDate.get(dn.date);
      if (existing) {
        const map = new Map(existing.entries.map((e) => [e.id, e]));
        for (const e of stayingEntries) {
          if (!map.has(e.id)) map.set(e.id, e);
        }
        byDate.set(dn.date, {
          ...existing,
          title: dn.title || existing.title,
          pinned: existing.pinned || dn.pinned,
          dailySummaryBullets:
            existing.dailySummaryBullets.length > 0
              ? existing.dailySummaryBullets
              : dn.dailySummaryBullets,
          entries: Array.from(map.values()),
          updatedAt: dn.updatedAt > existing.updatedAt ? dn.updatedAt : existing.updatedAt,
        });
      } else {
        byDate.set(dn.date, {
          ...dn,
          entries: stayingEntries,
        });
      }
    }
  }

  const normalized = Array.from(byDate.values())
    .filter((d) => d.entries.length > 0)
    .map((d) => ({
      ...d,
      entries: [...d.entries].sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { notes: normalized, changed };
}
