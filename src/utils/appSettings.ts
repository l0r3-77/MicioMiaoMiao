import type { DailyZoomLevel } from '../components/NoteCard';

export interface AppSettings {
  includeAudioInBackup: boolean;
  autoExtractReminders: boolean;
  defaultAgendaZoom: DailyZoomLevel;
  autoBackupOnOpenClose: boolean;
}

const SETTINGS_STORAGE_KEY = 'agendavoce_app_settings_v1';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  includeAudioInBackup: true,
  autoExtractReminders: true,
  defaultAgendaZoom: 'full',
  autoBackupOnOpenClose: true,
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_APP_SETTINGS));
      return { ...DEFAULT_APP_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      autoNightlyBackupEnabled?: boolean;
    };

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
    };
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
