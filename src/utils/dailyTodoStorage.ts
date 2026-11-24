import type {
  DayPhaseKey,
  OrganizeNoteItem,
  TaskHighlightColor,
  TodoBlockKey,
  TodoNoteItem,
  WidgetConfig,
  WidgetSizePreset,
  WidgetSourceKey,
} from '../types/dailyTodo';
import {
  getWidgetEmojiForNote,
  inferCatEmoticonId,
  resolveCatEmoticonId,
} from './catEmoticonLibrary';
import { toISODate } from './dateUtils';
import { VALID_NOTE_COLORS } from './noteColors';

const TODO_STORAGE_KEY = 'agendavoce_todo_items_v1';
const ORGANIZE_STORAGE_KEY = 'agendavoce_organize_items_v1';
const WIDGET_CONFIG_STORAGE_KEY = 'agendavoce_widget_config_v1';
const TODO_ORG_UPDATED_AT_KEY = 'agendavoce_todo_org_updated_at_v1';

export function getTodoOrganizeUpdatedAt(): string | null {
  try {
    return localStorage.getItem(TODO_ORG_UPDATED_AT_KEY);
  } catch {
    return null;
  }
}

export function setTodoOrganizeUpdatedAt(isoTimestamp: string): void {
  try {
    localStorage.setItem(TODO_ORG_UPDATED_AT_KEY, isoTimestamp);
  } catch {
    // ignore storage errors
  }
}

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
    cardSurfaceClass: 'bg-[#F7FEFC]/95 border-[#7ECBBF]/85',
    headerAccentClass: 'text-[#083B37]',
    badgeClass: 'bg-[#D8F4EE] text-[#0B534D] border-[#7ECBBF]/80',
  },
  {
    key: 'svaghi',
    blockId: 'todo_svaghi',
    title: 'Svaghi',
    subtitle: '',
    cardSurfaceClass: 'bg-[#F7FEFC]/95 border-[#7ECBBF]/85',
    headerAccentClass: 'text-[#083B37]',
    badgeClass: 'bg-[#DCF5EF] text-[#0B534D] border-[#7ECBBF]/80',
  },
  {
    key: 'bollette',
    blockId: 'todo_bollette',
    title: 'Bollette e pagamenti',
    subtitle: '',
    cardSurfaceClass: 'bg-[#F7FEFC]/95 border-[#7ECBBF]/85',
    headerAccentClass: 'text-[#083B37]',
    badgeClass: 'bg-[#D8F4EE] text-[#0B534D] border-[#7ECBBF]/80',
  },
  {
    key: 'poi_poi',
    blockId: 'todo_poi_poi',
    title: 'Poi poi',
    subtitle: '',
    cardSurfaceClass: 'bg-[#F7FEFC]/95 border-[#7ECBBF]/85',
    headerAccentClass: 'text-[#083B37]',
    badgeClass: 'bg-[#D8F4EE] text-[#0F635B] border-[#7ECBBF]/80',
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
  if (typeof raw === 'string' && VALID_NOTE_COLORS.includes(raw as (typeof VALID_NOTE_COLORS)[number])) {
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

export function sanitizeTodoItems(raw: unknown): TodoNoteItem[] {
  if (!Array.isArray(raw)) return [];
  const nowIso = new Date().toISOString();
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => {
      const text = typeof item.text === 'string' ? item.text : '';
      const block = sanitizeTodoBlockKey(item.block);
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

function generateWidgetToken(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function loadWidgetConfig(): WidgetConfig {
  const defaultToken = generateWidgetToken();
  try {
    const raw = localStorage.getItem(WIDGET_CONFIG_STORAGE_KEY);
    if (!raw) {
      const init: WidgetConfig = {
        token: defaultToken,
        source: 'today',
        size: 'medium',
        customHeightPx: 196,
        customWidthPct: 100,
      };
      localStorage.setItem(WIDGET_CONFIG_STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as Partial<WidgetConfig>;
    const validSource: WidgetSourceKey =
      parsed.source === 'today' ||
      parsed.source === 'poi' ||
      parsed.source === 'svaghi' ||
      parsed.source === 'bollette' ||
      parsed.source === 'poi_poi'
        ? parsed.source
        : 'today';
    const validSize: WidgetSizePreset =
      parsed.size === 'small' || parsed.size === 'medium' || parsed.size === 'large'
        ? parsed.size
        : 'medium';
    return {
      token:
        typeof parsed.token === 'string' && /^[a-zA-Z0-9_-]{12,64}$/.test(parsed.token)
          ? parsed.token
          : defaultToken,
      source: validSource,
      size: validSize,
      customHeightPx:
        typeof parsed.customHeightPx === 'number' &&
        parsed.customHeightPx >= 130 &&
        parsed.customHeightPx <= 460
          ? parsed.customHeightPx
          : 196,
      customWidthPct:
        typeof parsed.customWidthPct === 'number' &&
        parsed.customWidthPct >= 50 &&
        parsed.customWidthPct <= 100
          ? parsed.customWidthPct
          : 100,
    };
  } catch {
    return {
      token: defaultToken,
      source: 'today',
      size: 'medium',
      customHeightPx: 196,
      customWidthPct: 100,
    };
  }
}

export function saveWidgetConfig(config: WidgetConfig): void {
  try {
    localStorage.setItem(WIDGET_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface WidgetSnapshotTodoEntry {
  id: string;
  block: TodoBlockKey;
  text: string;
  emoji?: string;
  catId?: string;
  done: boolean;
  order: number;
}

export interface WidgetSnapshotOrganizeEntry {
  id: string;
  date: string;
  phase: DayPhaseKey;
  text: string;
  emoji?: string;
  catId?: string;
  done: boolean;
  order: number;
}

export interface WidgetSnapshotPayload {
  updatedAt: string;
  todayDate: string;
  todoItems: WidgetSnapshotTodoEntry[];
  organizeItems: WidgetSnapshotOrganizeEntry[];
}

export function buildWidgetSnapshotPayload(
  todoItems: TodoNoteItem[],
  organizeItems: OrganizeNoteItem[],
  updatedAtOverride?: string
): WidgetSnapshotPayload {
  return {
    updatedAt: updatedAtOverride || new Date().toISOString(),
    todayDate: toISODate(new Date()),
    todoItems: todoItems.map((t) => ({
      id: t.id,
      block: t.block,
      text: t.text,
      emoji: getWidgetEmojiForNote(t.emoji, t.text, t.block),
      catId: resolveCatEmoticonId(t.emoji, t.text, t.block),
      done: t.done,
      order: t.order,
    })),
    organizeItems: organizeItems.map((o) => ({
      id: o.id,
      date: o.date,
      phase: o.phase,
      text: o.text,
      emoji: getWidgetEmojiForNote(o.emoji, o.text),
      catId: resolveCatEmoticonId(o.emoji, o.text),
      done: o.done,
      order: o.order,
    })),
  };
}

export async function syncWidgetSnapshotToServer(
  token: string,
  todoItems: TodoNoteItem[],
  organizeItems: OrganizeNoteItem[],
  updatedAtOverride?: string
): Promise<string | null> {
  try {
    const payload = buildWidgetSnapshotPayload(todoItems, organizeItems, updatedAtOverride);
    const res = await fetch(`/api/widget/${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { updatedAt?: string };
    return typeof data.updatedAt === 'string' ? data.updatedAt : payload.updatedAt;
  } catch {
    return null;
  }
}

export interface RemoteWidgetStateResponse {
  exists: boolean;
  updatedAt: string;
  todayDate: string;
  todoItems: WidgetSnapshotTodoEntry[];
  organizeItems: WidgetSnapshotOrganizeEntry[];
}

export async function fetchWidgetSnapshotStateFromServer(
  token: string
): Promise<RemoteWidgetStateResponse | null> {
  if (!token || !/^[a-zA-Z0-9_-]{12,64}$/.test(token)) return null;
  try {
    const res = await fetch(`/api/widget/${encodeURIComponent(token)}/state`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RemoteWidgetStateResponse>;
    if (!data || typeof data !== 'object' || !data.exists) return null;
    return {
      exists: true,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
      todayDate: typeof data.todayDate === 'string' ? data.todayDate : toISODate(new Date()),
      todoItems: Array.isArray(data.todoItems) ? data.todoItems : [],
      organizeItems: Array.isArray(data.organizeItems) ? data.organizeItems : [],
    };
  } catch {
    return null;
  }
}

export function hydrateTodoItemsFromRemote(
  remoteItems: WidgetSnapshotTodoEntry[],
  existingLocal: TodoNoteItem[],
  fallbackIso: string
): TodoNoteItem[] {
  const existingMap = new Map(existingLocal.map((item) => [item.id, item]));
  return sanitizeTodoItems(
    remoteItems.map((r, idx) => {
      const prev = existingMap.get(r.id);
      return {
        id: r.id,
        block: r.block,
        text: r.text,
        emoji: r.catId || prev?.emoji || r.emoji,
        color: 'none',
        done: Boolean(r.done),
        order: typeof r.order === 'number' ? r.order : idx,
        source: prev?.source || 'text',
        audioMetadata: prev?.audioMetadata,
        createdAt: prev?.createdAt || fallbackIso,
        updatedAt: fallbackIso,
      };
    })
  );
}

export function hydrateOrganizeItemsFromRemote(
  remoteItems: WidgetSnapshotOrganizeEntry[],
  existingLocal: OrganizeNoteItem[],
  fallbackIso: string
): OrganizeNoteItem[] {
  const existingMap = new Map(existingLocal.map((item) => [item.id, item]));
  return sanitizeOrganizeItems(
    remoteItems.map((r, idx) => {
      const prev = existingMap.get(r.id);
      return {
        id: r.id,
        date: r.date,
        phase: r.phase,
        text: r.text,
        emoji: r.catId || prev?.emoji || r.emoji,
        color: 'none',
        done: Boolean(r.done),
        order: typeof r.order === 'number' ? r.order : idx,
        source: prev?.source || 'text',
        linkedTodoId: prev?.linkedTodoId,
        audioMetadata: prev?.audioMetadata,
        createdAt: prev?.createdAt || fallbackIso,
        updatedAt: fallbackIso,
      };
    })
  );
}

export function buildScriptableWidgetCode(origin: string, config: WidgetConfig): string {
  const feedUrl = `${origin}/api/widget/${encodeURIComponent(config.token)}?source=${encodeURIComponent(config.source)}`;
  const sourceTitle =
    config.source === 'today' ? 'Oggi' : `Da Fare · ${TODO_BLOCK_MAP[config.source].title}`;

  return `// MicioMiao · Widget iPhone (${sourceTitle})
// Ridimensionabile automaticamente su iOS (Piccolo 2x2, Medio 4x2, Grande 4x4)
const FEED_URL = "${feedUrl}";
const FAMILY = config.widgetFamily || "${config.size}";

const w = new ListWidget();
w.backgroundColor = new Color("#D4F4EC");
w.setPadding(14, 14, 14, 14);
w.url = "${origin}/?section=todo";

let data = null;
try {
  const req = new Request(FEED_URL);
  req.timeoutInterval = 8;
  data = await req.loadJSON();
} catch (e) {}

const header = w.addStack();
header.centerAlignContent();
const titleTxt = header.addText(data && data.title ? data.title : "${sourceTitle}");
titleTxt.font = Font.boldSystemFont(FAMILY === "small" ? 13 : 15);
titleTxt.textColor = new Color("#083B37");
header.addSpacer();
const countTxt = header.addText(data ? String(data.items.length) : "0");
countTxt.font = Font.semiboldMonospacedSystemFont(12);
countTxt.textColor = new Color("#0F766E");
w.addSpacer(8);

if (!data || !Array.isArray(data.items) || data.items.length === 0) {
  const empty = w.addText(data ? "Nessuna nota al momento" : "Apri l'app per sincronizzare");
  empty.font = Font.systemFont(12);
  empty.textColor = new Color("#0B534D");
} else {
  const maxRows = FAMILY === "small" ? 4 : FAMILY === "medium" ? 5 : 11;
  const visible = data.items.slice(0, maxRows);
  for (const item of visible) {
    if (item.phaseLabel) {
      const pTxt = w.addText(item.phaseLabel);
      pTxt.font = Font.boldSystemFont(10);
      pTxt.textColor = new Color("#0F766E");
      w.addSpacer(1);
    }
    const row = w.addStack();
    row.centerAlignContent();
    const prefix = item.done ? "✓ " : "• ";
    const em = item.emoji ? item.emoji + " " : "";
    const t = row.addText(prefix + em + item.text);
    t.font = Font.systemFont(FAMILY === "small" ? 11 : 12);
    t.textColor = item.done ? new Color("#4F8F88") : new Color("#072C29");
    t.lineLimit = 1;
    w.addSpacer(4);
  }
  if (data.items.length > maxRows) {
    w.addSpacer(2);
    const more = w.addText("+" + (data.items.length - maxRows) + " altre note");
    more.font = Font.mediumSystemFont(10);
    more.textColor = new Color("#0B534D");
  }
}

w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await (FAMILY === "small" ? w.presentSmall() : FAMILY === "large" ? w.presentLarge() : w.presentMedium());
}
Script.complete();`;
}
