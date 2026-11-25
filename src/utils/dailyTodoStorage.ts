import type {
  DayPhaseKey,
  OrganizeNoteItem,
  TaskHighlightColor,
  TodoBlockKey,
  TodoNoteItem,
} from '../types/dailyTodo';
import {
  inferCatEmoticonId,
  resolveCatEmoticonId,
} from './catEmoticonLibrary';
import { toISODate } from './dateUtils';
import { VALID_NOTE_COLORS } from './noteColors';

const TODO_STORAGE_KEY = 'agendavoce_todo_items_v1';
const ORGANIZE_STORAGE_KEY = 'agendavoce_organize_items_v1';

export interface TodoBlockMeta {
  key: TodoBlockKey;
  blockId: string;
  title: string;
  subtitle: string;
  cardSurfaceClass: string;
  headerAccentClass: string;
  badgeClass: string;
}

export const TODO_BLOCKS: TodoBlockMeta[] = [
  {
    key: 'poi',
    blockId: 'todo_poi',
    title: 'Poi',
    subtitle: '',
    cardSurfaceClass: 'bg-[var(--todo-card)] border-[var(--todo-card-border)]',
    headerAccentClass: 'text-[var(--todo-text)]',
    badgeClass: 'bg-[var(--todo-accent-soft)] text-[var(--todo-text)] border-[var(--todo-card-border)]',
  },
  {
    key: 'svaghi',
    blockId: 'todo_svaghi',
    title: 'Svaghi',
    subtitle: '',
    cardSurfaceClass: 'bg-[var(--todo-card)] border-[var(--todo-card-border)]',
    headerAccentClass: 'text-[var(--todo-text)]',
    badgeClass: 'bg-[var(--todo-accent-soft)] text-[var(--todo-text)] border-[var(--todo-card-border)]',
  },
  {
    key: 'bollette',
    blockId: 'todo_bollette',
    title: 'Bollette e pagamenti',
    subtitle: '',
    cardSurfaceClass: 'bg-[var(--todo-card)] border-[var(--todo-card-border)]',
    headerAccentClass: 'text-[var(--todo-text)]',
    badgeClass: 'bg-[var(--todo-accent-soft)] text-[var(--todo-text)] border-[var(--todo-card-border)]',
  },
  {
    key: 'poi_poi',
    blockId: 'todo_poi_poi',
    title: 'Poi poi',
    subtitle: '',
    cardSurfaceClass: 'bg-[var(--todo-card)] border-[var(--todo-card-border)]',
    headerAccentClass: 'text-[var(--todo-text)]',
    badgeClass: 'bg-[var(--todo-accent-soft)] text-[var(--todo-text)] border-[var(--todo-card-border)]',
  },
];

export const TODO_BLOCK_MAP: Record<TodoBlockKey, TodoBlockMeta> = {
  poi: TODO_BLOCKS[0],
  svaghi: TODO_BLOCKS[1],
  bollette: TODO_BLOCKS[2],
  poi_poi: TODO_BLOCKS[3],
};

export interface DayPhaseMeta {
  key: DayPhaseKey;
  title: string;
  hint: string;
}

export const DAY_PHASES: DayPhaseMeta[] = [
  { key: 'mattina', title: 'Mattina', hint: 'Avvio giornata' },
  { key: 'dopopranzo', title: 'Dopopranzo', hint: 'Dopo pranzo' },
  { key: 'pomeriggio', title: 'Pomeriggio', hint: 'Parte centrale' },
  { key: 'dopocena', title: 'Dopocena', hint: 'Sera / fine giornata' },
];

export const DAY_PHASE_MAP: Record<DayPhaseKey, DayPhaseMeta> = {
  mattina: DAY_PHASES[0],
  dopopranzo: DAY_PHASES[1],
  pomeriggio: DAY_PHASES[2],
  dopocena: DAY_PHASES[3],
};

export function sanitizeTaskColor(raw: unknown): TaskHighlightColor {
  if (raw === 'none') return 'none';
  if (
    typeof raw === 'string' &&
    VALID_NOTE_COLORS.includes(raw as (typeof VALID_NOTE_COLORS)[number])
  ) {
    return raw as TaskHighlightColor;
  }
  return 'none';
}

export function sanitizeTodoBlockKey(raw: unknown): TodoBlockKey {
  if (raw === 'poi' || raw === 'svaghi' || raw === 'bollette' || raw === 'poi_poi') {
    return raw;
  }
  return 'poi';
}

export function sanitizeDayPhaseKey(raw: unknown): DayPhaseKey {
  if (raw === 'mattina' || raw === 'dopopranzo' || raw === 'pomeriggio' || raw === 'dopocena') {
    return raw;
  }
  return 'mattina';
}

export function inferTaskEmoji(text: string, blockHint?: TodoBlockKey): string {
  return inferCatEmoticonId(text, blockHint);
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  details?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}): string {
  const [y, m, d] = params.date.split('-').map(Number);
  const [hh, mm] = params.time.split(':').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startDt = new Date(y || 2026, Math.max(0, (m || 1) - 1), d || 1, hh || 0, mm || 0, 0);
  const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(
      dt.getMinutes()
    )}00`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', params.title.trim() || 'Promemoria MicioMiao');
  url.searchParams.set('dates', `${fmt(startDt)}/${fmt(endDt)}`);
  const fullDetails =
    params.details && params.details.trim()
      ? params.details.trim()
      : params.title.trim();
  if (fullDetails) {
    url.searchParams.set('details', fullDetails);
  }
  return url.toString();
}

export function sanitizeTodoItems(raw: unknown): TodoNoteItem[] {
  if (!Array.isArray(raw)) return [];
  const nowIso = new Date().toISOString();
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => {
      const text = typeof item.text === 'string' ? item.text : '';
      const block = sanitizeTodoBlockKey(item.block);
      const reminderDate =
        typeof item.reminderDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.reminderDate)
          ? item.reminderDate
          : undefined;
      const reminderTime =
        typeof item.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(item.reminderTime)
          ? item.reminderTime
          : undefined;
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        block,
        text,
        emoji: resolveCatEmoticonId(
          typeof item.emoji === 'string' ? item.emoji.trim() : undefined,
          text,
          block
        ),
        color: 'none' as TaskHighlightColor,
        done: Boolean(item.done),
        order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : idx,
        source: (item.source === 'voice' ? 'voice' : 'text') as 'voice' | 'text',
        ...(reminderDate ? { reminderDate } : {}),
        ...(reminderTime ? { reminderTime } : {}),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso,
      };
    })
    .filter((item) => item.text.trim().length > 0);
}

export function sanitizeOrganizeItems(raw: unknown): OrganizeNoteItem[] {
  if (!Array.isArray(raw)) return [];
  const nowIso = new Date().toISOString();
  const today = toISODate(new Date());
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => {
      const text = typeof item.text === 'string' ? item.text : '';
      const reminderDate =
        typeof item.reminderDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.reminderDate)
          ? item.reminderDate
          : undefined;
      const reminderTime =
        typeof item.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(item.reminderTime)
          ? item.reminderTime
          : undefined;
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        date:
          typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
            ? item.date
            : today,
        phase: sanitizeDayPhaseKey(item.phase),
        text,
        emoji: resolveCatEmoticonId(
          typeof item.emoji === 'string' ? item.emoji.trim() : undefined,
          text
        ),
        color: 'none' as TaskHighlightColor,
        done: Boolean(item.done),
        order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : idx,
        source: (item.source === 'voice' ? 'voice' : 'text') as 'voice' | 'text',
        linkedTodoId: typeof item.linkedTodoId === 'string' ? item.linkedTodoId : undefined,
        ...(reminderDate ? { reminderDate } : {}),
        ...(reminderTime ? { reminderTime } : {}),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso,
      };
    })
    .filter((item) => item.text.trim().length > 0);
}

export function loadTodoItems(): TodoNoteItem[] {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeTodoItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveTodoItems(items: TodoNoteItem[]): void {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function loadOrganizeItems(): OrganizeNoteItem[] {
  try {
    const raw = localStorage.getItem(ORGANIZE_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeOrganizeItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveOrganizeItems(items: OrganizeNoteItem[]): void {
  try {
    localStorage.setItem(ORGANIZE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}
