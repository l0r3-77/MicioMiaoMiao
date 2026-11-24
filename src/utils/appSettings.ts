import type { DailyZoomLevel } from '../components/NoteCard';

export interface AppSettings {
  includeAudioInBackup: boolean;
  autoExtractReminders: boolean;
  defaultAgendaZoom: DailyZoomLevel;
  autoNightlyBackupEnabled: boolean;
  autoNightlyBackupHour: number;
  autoBackupToken: string;
  lastAutoBackupDate: string | null;
  lastAutoBackupAt: string | null;
}

const SETTINGS_STORAGE_KEY = 'agendavoce_app_settings_v1';

export function generateAutoBackupToken(): string {
  try {
    return `mm_${crypto.randomUUID().replace(/-/g, '')}`;
  } catch {
    return `mm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}

export function isValidAutoBackupToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-zA-Z0-9_-]{24,64}$/.test(token);
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  includeAudioInBackup: true,
  autoExtractReminders: true,
  defaultAgendaZoom: 'full',
  autoNightlyBackupEnabled: true,
  autoNightlyBackupHour: 2,
  autoBackupToken: '',
  lastAutoBackupDate: null,
  lastAutoBackupAt: null,
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      const init: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        autoBackupToken: generateAutoBackupToken(),
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const token = isValidAutoBackupToken(parsed.autoBackupToken)
      ? parsed.autoBackupToken
      : generateAutoBackupToken();
    const hour =
      typeof parsed.autoNightlyBackupHour === 'number' &&
      Number.isInteger(parsed.autoNightlyBackupHour) &&
      parsed.autoNightlyBackupHour >= 0 &&
      parsed.autoNightlyBackupHour <= 5
        ? parsed.autoNightlyBackupHour
        : 2;

    const loaded: AppSettings = {
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
      autoNightlyBackupEnabled:
        typeof parsed.autoNightlyBackupEnabled === 'boolean'
          ? parsed.autoNightlyBackupEnabled
          : true,
      autoNightlyBackupHour: hour,
      autoBackupToken: token,
      lastAutoBackupDate:
        typeof parsed.lastAutoBackupDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastAutoBackupDate)
          ? parsed.lastAutoBackupDate
          : null,
      lastAutoBackupAt:
        typeof parsed.lastAutoBackupAt === 'string' ? parsed.lastAutoBackupAt : null,
    };

    if (!isValidAutoBackupToken(parsed.autoBackupToken)) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(loaded));
    }
    return loaded;
  } catch {
    return {
      ...DEFAULT_APP_SETTINGS,
      autoBackupToken: generateAutoBackupToken(),
    };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}
