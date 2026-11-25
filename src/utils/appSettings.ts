import type { DailyZoomLevel } from '../components/NoteCard';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type AppColorPreset = 'default' | 'sky' | 'rose' | 'sage' | 'sand' | 'custom';
export type TodoColorPreset = 'default' | 'ocean' | 'mint' | 'lavender' | 'peach' | 'custom';

export interface AppSettings {
  includeAudioInBackup: boolean;
  autoExtractReminders: boolean;
  defaultAgendaZoom: DailyZoomLevel;
  autoBackupOnOpenClose: boolean;
  themeMode: ThemeMode;
  appColorPreset: AppColorPreset;
  appCustomColor: string;
  todoColorPreset: TodoColorPreset;
  todoCustomColor: string;
}

const SETTINGS_STORAGE_KEY = 'agendavoce_app_settings_v1';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  includeAudioInBackup: true,
  autoExtractReminders: true,
  defaultAgendaZoom: 'full',
  autoBackupOnOpenClose: true,
  themeMode: 'light',
  appColorPreset: 'default',
  appCustomColor: '#7E22CE',
  todoColorPreset: 'default',
  todoCustomColor: '#0E8A7E',
};

const VALID_THEME_MODES: ThemeMode[] = ['light', 'dark', 'auto'];
const VALID_APP_PRESETS: AppColorPreset[] = ['default', 'sky', 'rose', 'sage', 'sand', 'custom'];
const VALID_TODO_PRESETS: TodoColorPreset[] = ['default', 'ocean', 'mint', 'lavender', 'peach', 'custom'];

export function sanitizeHexColor(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.trim())) {
    return raw.trim();
  }
  return fallback;
}

export function sanitizeAppSettings(raw: unknown): AppSettings {
  const parsed =
    raw && typeof raw === 'object'
      ? (raw as Partial<AppSettings> & { autoNightlyBackupEnabled?: boolean })
      : {};

  return {
    includeAudioInBackup:
      typeof parsed.includeAudioInBackup === 'boolean' ? parsed.includeAudioInBackup : true,
    autoExtractReminders:
      typeof parsed.autoExtractReminders === 'boolean' ? parsed.autoExtractReminders : true,
    defaultAgendaZoom:
      parsed.defaultAgendaZoom === 'full' ||
      parsed.defaultAgendaZoom === 'sensations' ||
      parsed.defaultAgendaZoom === 'overview'
        ? parsed.defaultAgendaZoom
        : 'full',
    autoBackupOnOpenClose:
      typeof parsed.autoBackupOnOpenClose === 'boolean'
        ? parsed.autoBackupOnOpenClose
        : typeof parsed.autoNightlyBackupEnabled === 'boolean'
          ? parsed.autoNightlyBackupEnabled
          : true,
    themeMode: VALID_THEME_MODES.includes(parsed.themeMode as ThemeMode)
      ? (parsed.themeMode as ThemeMode)
      : 'light',
    appColorPreset: VALID_APP_PRESETS.includes(parsed.appColorPreset as AppColorPreset)
      ? (parsed.appColorPreset as AppColorPreset)
      : 'default',
    appCustomColor: sanitizeHexColor(parsed.appCustomColor, '#7E22CE'),
    todoColorPreset: VALID_TODO_PRESETS.includes(parsed.todoColorPreset as TodoColorPreset)
      ? (parsed.todoColorPreset as TodoColorPreset)
      : 'default',
    todoCustomColor: sanitizeHexColor(parsed.todoCustomColor, '#0E8A7E'),
  };
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_APP_SETTINGS));
      return { ...DEFAULT_APP_SETTINGS };
    }
    return sanitizeAppSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}
