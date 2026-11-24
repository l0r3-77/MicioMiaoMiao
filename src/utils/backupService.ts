import type { OrganizeNoteItem, TodoNoteItem, WidgetConfig } from '../types/dailyTodo';
import type { DailyNote, NoteColor, NoteEntry } from '../types/note';
import type { AppSettings } from './appSettings';
import {
  generateAutoBackupToken,
  isValidAutoBackupToken,
} from './appSettings';
import { getAudioClip, saveAudioClip } from './audioStorage';
import {
  loadWidgetConfig,
  sanitizeOrganizeItems,
  sanitizeTodoItems,
} from './dailyTodoStorage';
import { formatItalianDateShort, toISODate } from './dateUtils';
import type { AllLayoutPreferences } from './layoutPreferences';
import { VALID_NOTE_COLORS } from './noteColors';

export interface SerializedAudioClip {
  mimeType: string;
  base64: string;
}

export interface AgendaVoceBackupPayload {
  version: 1;
  app: 'AgendaVoce';
  exportedAt: string;
  dailyNotes: DailyNote[];
  todoItems?: TodoNoteItem[];
  organizeItems?: OrganizeNoteItem[];
  layouts?: AllLayoutPreferences;
  settings?: AppSettings;
  widgetConfig?: WidgetConfig;
  statsPrefs?: Record<string, unknown>;
  agendaZooms?: Record<string, string>;
  audioClips?: Record<string, SerializedAudioClip>;
}

const LEGACY_COLOR_MAP: Record<string, NoteColor> = {
  lilac: 'sky',
  cyan: 'sky',
  plum: 'sky',
  cobalt: 'sky',
  mint: 'amber',
  sage: 'amber',
  none: 'amber',
  rose: 'red',
};

function sanitizeBackupColor(raw: unknown): NoteColor {
  if (typeof raw !== 'string') return 'amber';
  if (VALID_NOTE_COLORS.includes(raw as NoteColor)) return raw as NoteColor;
  return LEGACY_COLOR_MAP[raw] || 'amber';
}

function blobToBase64Pure(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result;
      if (typeof res !== 'string') {
        reject(new Error('Errore lettura audio'));
        return;
      }
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Errore lettura audio'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || 'audio/mp4' });
}

function readLocalJsonRecord(key: string): Record<string, unknown> | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function readAgendaZooms(): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  try {
    for (const mode of ['day', 'week', 'month']) {
      const key = `agendavoce_agenda_zoom_${mode}`;
      const val = localStorage.getItem(key);
      if (val) out[key] = val;
    }
  } catch {
    // ignore storage errors
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function buildBackupPayload(
  dailyNotes: DailyNote[],
  layouts: AllLayoutPreferences,
  includeAudio: boolean,
  todoItems: TodoNoteItem[] = [],
  organizeItems: OrganizeNoteItem[] = [],
  settings?: AppSettings,
  widgetConfig?: WidgetConfig
): Promise<AgendaVoceBackupPayload> {
  const audioClips: Record<string, SerializedAudioClip> = {};

  if (includeAudio) {
    const audioIds: Array<{ id: string; mimeType?: string }> = [];
    for (const dn of dailyNotes) {
      for (const entry of dn.entries) {
        if (entry.audioMetadata?.hasAudioClip) {
          audioIds.push({ id: entry.id, mimeType: entry.audioMetadata.mimeType });
        }
      }
    }
    for (const item of todoItems) {
      if (item.audioMetadata?.hasAudioClip) {
        audioIds.push({ id: item.id, mimeType: item.audioMetadata.mimeType });
      }
    }
    for (const item of organizeItems) {
      if (item.audioMetadata?.hasAudioClip) {
        audioIds.push({ id: item.id, mimeType: item.audioMetadata.mimeType });
      }
    }

    for (const meta of audioIds) {
      try {
        const blob = await getAudioClip(meta.id);
        if (blob && blob.size > 0 && blob.size <= 15 * 1024 * 1024) {
          const base64 = await blobToBase64Pure(blob);
          audioClips[meta.id] = {
            mimeType: blob.type || meta.mimeType || 'audio/mp4',
            base64,
          };
        }
      } catch {
        // Skip unreadable clip cleanly
      }
    }
  }

  const statsPrefs = readLocalJsonRecord('agendavoce_stats_prefs_v1');
  const agendaZooms = readAgendaZooms();
  const resolvedWidgetConfig = widgetConfig || loadWidgetConfig();

  return {
    version: 1,
    app: 'AgendaVoce',
    exportedAt: new Date().toISOString(),
    dailyNotes,
    todoItems,
    organizeItems,
    layouts,
    ...(settings ? { settings } : {}),
    widgetConfig: resolvedWidgetConfig,
    ...(statsPrefs ? { statsPrefs } : {}),
    ...(agendaZooms ? { agendaZooms } : {}),
    ...(Object.keys(audioClips).length > 0 ? { audioClips } : {}),
  };
}

export function validateAndParseBackupJson(rawText: string): AgendaVoceBackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Il file selezionato non contiene un JSON valido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Struttura del backup non valida.');
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.dailyNotes)) {
    throw new Error('Il file JSON non contiene la lista degli appunti ("dailyNotes").');
  }

  const nowIso = new Date().toISOString();
  const today = toISODate(new Date());

  const sanitizedDays: DailyNote[] = record.dailyNotes
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const date =
        typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
          ? item.date
          : today;
      const rawEntries = Array.isArray(item.entries) ? item.entries : [];
      const entries: NoteEntry[] = rawEntries
        .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
        .map((e) => ({
          id: typeof e.id === 'string' && e.id.trim() ? e.id.trim() : crypto.randomUUID(),
          time:
            typeof e.time === 'string' && /^\d{2}:\d{2}$/.test(e.time) ? e.time : '09:00',
          transcript: typeof e.transcript === 'string' ? e.transcript : '',
          bullets: Array.isArray(e.bullets)
            ? e.bullets.map((b) => String(b ?? '').trim()).filter(Boolean)
            : [],
          ...(Array.isArray(e.reminders)
            ? {
                reminders: e.reminders
                  .map((r) => String(r ?? '').trim())
                  .filter(Boolean),
              }
            : {}),
          color: sanitizeBackupColor(e.color),
          source: (e.source === 'voice' ? 'voice' : 'text') as NoteEntry['source'],
          audioMetadata:
            e.audioMetadata && typeof e.audioMetadata === 'object'
              ? (e.audioMetadata as NoteEntry['audioMetadata'])
              : undefined,
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : nowIso,
          updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : nowIso,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `day-${date}`,
        date,
        title:
          typeof item.title === 'string' && item.title.trim()
            ? item.title.trim()
            : `Diario del ${formatItalianDateShort(date)}`,
        pinned: Boolean(item.pinned),
        dailySummaryBullets: Array.isArray(item.dailySummaryBullets)
          ? item.dailySummaryBullets.map((b) => String(b ?? '').trim()).filter(Boolean)
          : [],
        entries,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso,
      };
    })
    .filter((d) => d.entries.length > 0);

  const rawClips =
    record.audioClips && typeof record.audioClips === 'object'
      ? (record.audioClips as Record<string, unknown>)
      : undefined;
  const audioClips: Record<string, SerializedAudioClip> = {};
  if (rawClips) {
    for (const [id, val] of Object.entries(rawClips)) {
      if (val && typeof val === 'object') {
        const clip = val as { mimeType?: unknown; base64?: unknown };
        if (typeof clip.base64 === 'string' && clip.base64.length > 0) {
          audioClips[id] = {
            mimeType: typeof clip.mimeType === 'string' ? clip.mimeType : 'audio/mp4',
            base64: clip.base64,
          };
        }
      }
    }
  }

  const todoItems = Array.isArray(record.todoItems) ? sanitizeTodoItems(record.todoItems) : undefined;
  const organizeItems = Array.isArray(record.organizeItems)
    ? sanitizeOrganizeItems(record.organizeItems)
    : undefined;

  const parsedSettings =
    record.settings && typeof record.settings === 'object'
      ? (record.settings as Partial<AppSettings>)
      : undefined;
  const settings: AppSettings | undefined = parsedSettings
    ? {
        autoExtractReminders:
          typeof parsedSettings.autoExtractReminders === 'boolean'
            ? parsedSettings.autoExtractReminders
            : true,
        defaultAgendaZoom:
          parsedSettings.defaultAgendaZoom === 'full' ||
          parsedSettings.defaultAgendaZoom === 'sensations' ||
          parsedSettings.defaultAgendaZoom === 'overview'
            ? parsedSettings.defaultAgendaZoom
            : 'full',
        includeAudioInBackup:
          typeof parsedSettings.includeAudioInBackup === 'boolean'
            ? parsedSettings.includeAudioInBackup
            : true,
        autoNightlyBackupEnabled:
          typeof parsedSettings.autoNightlyBackupEnabled === 'boolean'
            ? parsedSettings.autoNightlyBackupEnabled
            : true,
        autoNightlyBackupHour:
          typeof parsedSettings.autoNightlyBackupHour === 'number' &&
          Number.isInteger(parsedSettings.autoNightlyBackupHour) &&
          parsedSettings.autoNightlyBackupHour >= 0 &&
          parsedSettings.autoNightlyBackupHour <= 5
            ? parsedSettings.autoNightlyBackupHour
            : 2,
        autoBackupToken: isValidAutoBackupToken(parsedSettings.autoBackupToken)
          ? parsedSettings.autoBackupToken
          : generateAutoBackupToken(),
        lastAutoBackupDate:
          typeof parsedSettings.lastAutoBackupDate === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(parsedSettings.lastAutoBackupDate)
            ? parsedSettings.lastAutoBackupDate
            : null,
        lastAutoBackupAt:
          typeof parsedSettings.lastAutoBackupAt === 'string'
            ? parsedSettings.lastAutoBackupAt
            : null,
      }
    : undefined;

  const rawWidget =
    record.widgetConfig && typeof record.widgetConfig === 'object'
      ? (record.widgetConfig as Partial<WidgetConfig>)
      : undefined;
  const widgetConfig: WidgetConfig | undefined =
    rawWidget && typeof rawWidget.token === 'string'
      ? {
          token: /^[a-zA-Z0-9_-]{12,64}$/.test(rawWidget.token)
            ? rawWidget.token
            : loadWidgetConfig().token,
          source:
            rawWidget.source === 'today' ||
            rawWidget.source === 'poi' ||
            rawWidget.source === 'svaghi' ||
            rawWidget.source === 'bollette' ||
            rawWidget.source === 'poi_poi'
              ? rawWidget.source
              : 'today',
          size:
            rawWidget.size === 'small' ||
            rawWidget.size === 'medium' ||
            rawWidget.size === 'large'
              ? rawWidget.size
              : 'medium',
          customHeightPx:
            typeof rawWidget.customHeightPx === 'number' &&
            rawWidget.customHeightPx >= 130 &&
            rawWidget.customHeightPx <= 460
              ? rawWidget.customHeightPx
              : 196,
          customWidthPct:
            typeof rawWidget.customWidthPct === 'number' &&
            rawWidget.customWidthPct >= 50 &&
            rawWidget.customWidthPct <= 100
              ? rawWidget.customWidthPct
              : 100,
        }
      : undefined;

  const statsPrefs =
    record.statsPrefs && typeof record.statsPrefs === 'object'
      ? (record.statsPrefs as Record<string, unknown>)
      : undefined;

  const agendaZooms: Record<string, string> | undefined =
    record.agendaZooms && typeof record.agendaZooms === 'object'
      ? Object.fromEntries(
          Object.entries(record.agendaZooms as Record<string, unknown>).filter(
            ([k, v]) => k.startsWith('agendavoce_agenda_zoom_') && typeof v === 'string'
          ) as Array<[string, string]>
        )
      : undefined;

  return {
    version: 1,
    app: 'AgendaVoce',
    exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : nowIso,
    dailyNotes: sanitizedDays,
    ...(todoItems ? { todoItems } : {}),
    ...(organizeItems ? { organizeItems } : {}),
    layouts:
      record.layouts && typeof record.layouts === 'object'
        ? (record.layouts as AllLayoutPreferences)
        : undefined,
    ...(settings ? { settings } : {}),
    ...(widgetConfig ? { widgetConfig } : {}),
    ...(statsPrefs ? { statsPrefs } : {}),
    ...(agendaZooms && Object.keys(agendaZooms).length > 0 ? { agendaZooms } : {}),
    ...(Object.keys(audioClips).length > 0 ? { audioClips } : {}),
  };
}

export async function restoreAudioClipsFromBackup(
  audioClips?: Record<string, SerializedAudioClip>
): Promise<number> {
  if (!audioClips) return 0;
  let restored = 0;
  for (const [entryId, clip] of Object.entries(audioClips)) {
    try {
      const blob = base64ToBlob(clip.base64, clip.mimeType);
      const ok = await saveAudioClip(entryId, blob);
      if (ok) restored++;
    } catch {
      // Ignore individual bad clip
    }
  }
  return restored;
}

export function mergeDailyNotesFromBackup(
  current: DailyNote[],
  incoming: DailyNote[]
): DailyNote[] {
  const byDate = new Map<string, DailyNote>();
  for (const dn of current) {
    byDate.set(dn.date, {
      ...dn,
      entries: [...dn.entries],
      dailySummaryBullets: [...dn.dailySummaryBullets],
    });
  }

  for (const inc of incoming) {
    const existing = byDate.get(inc.date);
    if (!existing) {
      byDate.set(inc.date, inc);
      continue;
    }

    const entryMap = new Map(existing.entries.map((e) => [e.id, e]));
    for (const incEntry of inc.entries) {
      const prev = entryMap.get(incEntry.id);
      if (!prev || incEntry.updatedAt > prev.updatedAt) {
        entryMap.set(incEntry.id, incEntry);
      }
    }

    byDate.set(inc.date, {
      ...existing,
      title: existing.title || inc.title,
      pinned: existing.pinned || inc.pinned,
      dailySummaryBullets:
        existing.dailySummaryBullets.length > 0
          ? existing.dailySummaryBullets
          : inc.dailySummaryBullets,
      entries: Array.from(entryMap.values()).sort((a, b) => a.time.localeCompare(b.time)),
      updatedAt:
        inc.updatedAt > existing.updatedAt ? inc.updatedAt : existing.updatedAt,
    });
  }

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function downloadBackupJsonFile(payload: AgendaVoceBackupPayload): string {
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `miciomiao-backup-${toISODate(new Date())}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}

export async function shareBackupToICloudOrFiles(
  payload: AgendaVoceBackupPayload
): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  const filename = `miciomiao-backup-${toISODate(new Date())}.json`;
  const file = new File([JSON.stringify(payload, null, 2)], filename, {
    type: 'application/json',
  });
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return false;
  }
  await navigator.share({
    title: 'Backup MicioMiao (JSON)',
    files: [file],
  });
  return true;
}

export const AUTO_BACKUP_FILENAME = 'miciomiao-backup-automatico.json';

export function downloadFixedNightlyBackupFile(payload: AgendaVoceBackupPayload): string {
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = AUTO_BACKUP_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return AUTO_BACKUP_FILENAME;
}

const BACKUP_HANDLE_DB = 'miciomiao_file_handles_v1';
const BACKUP_HANDLE_STORE = 'handles';
const BACKUP_HANDLE_KEY = 'nightly_backup_file';

interface WritableHandleLike {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface FileHandleLike {
  name?: string;
  createWritable?: () => Promise<WritableHandleLike>;
  queryPermission?: (opts: { mode: 'readwrite' }) => Promise<string>;
  requestPermission?: (opts: { mode: 'readwrite' }) => Promise<string>;
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BACKUP_HANDLE_STORE)) {
        db.createObjectStore(BACKUP_HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function supportsDirectFileOverwritePicker(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function'
  );
}

export async function getLinkedAutoBackupFileName(): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openHandleDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(BACKUP_HANDLE_STORE, 'readonly');
      const req = tx.objectStore(BACKUP_HANDLE_STORE).get(BACKUP_HANDLE_KEY);
      req.onsuccess = () => {
        const handle = req.result as FileHandleLike | undefined;
        resolve(handle?.name || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function pickLinkedAutoBackupFile(
  initialPayload?: AgendaVoceBackupPayload
): Promise<string | null> {
  if (!supportsDirectFileOverwritePicker()) return null;
  const picker = (
    window as unknown as {
      showSaveFilePicker: (opts: unknown) => Promise<FileHandleLike>;
    }
  ).showSaveFilePicker;
  const handle = await picker({
    suggestedName: AUTO_BACKUP_FILENAME,
    types: [
      {
        description: 'Backup JSON MicioMiao',
        accept: { 'application/json': ['.json'] },
      },
    ],
  });
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BACKUP_HANDLE_STORE, 'readwrite');
    tx.objectStore(BACKUP_HANDLE_STORE).put(handle, BACKUP_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (initialPayload && handle.createWritable) {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(initialPayload, null, 2));
    await writable.close();
  }
  return handle.name || AUTO_BACKUP_FILENAME;
}

export async function clearLinkedAutoBackupFile(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(BACKUP_HANDLE_STORE, 'readwrite');
      tx.objectStore(BACKUP_HANDLE_STORE).delete(BACKUP_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function writeAutoBackupToLinkedFile(
  payload: AgendaVoceBackupPayload
): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    const db = await openHandleDb();
    const handle = await new Promise<FileHandleLike | undefined>((resolve) => {
      const tx = db.transaction(BACKUP_HANDLE_STORE, 'readonly');
      const req = tx.objectStore(BACKUP_HANDLE_STORE).get(BACKUP_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result as FileHandleLike | undefined);
      req.onerror = () => resolve(undefined);
    });
    if (!handle || typeof handle.createWritable !== 'function') return false;
    if (typeof handle.queryPermission === 'function') {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return false;
    }
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function syncNightlyBackupToServer(
  token: string,
  payload: AgendaVoceBackupPayload
): Promise<boolean> {
  if (!isValidAutoBackupToken(token)) return false;
  try {
    const res = await fetch(`/api/backup/${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

