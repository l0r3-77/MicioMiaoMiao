import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck2,
  HardDrive,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings,
  Share2,
  Sliders,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import type { OrganizeNoteItem, TodoNoteItem } from '../types/dailyTodo';
import type { DailyNote } from '../types/note';
import type { AppSettings, ThemeMode } from '../utils/appSettings';
import { formatBytes } from '../utils/dateUtils';
import {
  APP_COLOR_PRESET_OPTIONS,
  TODO_COLOR_PRESET_OPTIONS,
} from '../utils/themeSystem';
import {
  BACKUP_FILENAME,
  buildBackupPayload,
  clearLinkedAutoBackupFile,
  downloadBackupJsonFile,
  getLinkedAutoBackupFileName,
  pickLinkedAutoBackupFile,
  shareBackupToICloudOrFiles,
  supportsDirectFileOverwritePicker,
  validateAndParseBackupJson,
  type AgendaVoceBackupPayload,
} from '../utils/backupService';
import type {
  AllLayoutPreferences,
  LayoutSectionKey,
  SectionLayoutState,
} from '../utils/layoutPreferences';
import { CHIBI_CAT_MASCOTS } from '../utils/nekoCatalog';
import { CatIllustration } from './CatIllustration';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';
import { type DailyZoomLevel } from './NoteCard';
import { PWAInstallButton } from './PWAInstallButton';
import { QuotaStatusBar } from './QuotaStatusBar';
import { SystemDiagnosticViewer } from './SystemDiagnosticViewer';

interface SettingsViewProps {
  dailyNotes: DailyNote[];
  todoItems?: TodoNoteItem[];
  organizeItems?: OrganizeNoteItem[];
  layouts: AllLayoutPreferences;
  settings: AppSettings;
  sectionLayout: SectionLayoutState;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onResetAllLayouts: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onApplyRestoredBackup: (
    payload: AgendaVoceBackupPayload,
    mode: 'merge' | 'replace'
  ) => Promise<void>;
  onDeleteAllSavedAudio?: () => Promise<void>;
  onNotify: (msg: string) => void;
}

type PendingModal =
  | {
      kind: 'confirm_restore';
      sourceLabel: string;
      payload: AgendaVoceBackupPayload;
    }
  | {
      kind: 'confirm_delete_all_audio';
      count: number;
      totalBytes: number;
    };

export const SettingsView: React.FC<SettingsViewProps> = ({
  dailyNotes,
  todoItems = [],
  organizeItems = [],
  layouts,
  settings,
  sectionLayout,
  onChangeLayout,
  onResetLayout,
  onResetAllLayouts,
  onUpdateSettings,
  onApplyRestoredBackup,
  onDeleteAllSavedAudio,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localActionLoading, setLocalActionLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal | null>(null);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [linkedFileName, setLinkedFileName] = useState<string | null>(null);
  const [showSystemLogs, setShowSystemLogs] = useState(false);

  const neko = CHIBI_CAT_MASCOTS.zen;
  const totalEntriesCount = dailyNotes.reduce((acc, d) => acc + d.entries.length, 0);
  const savedAudioStats = dailyNotes.reduce(
    (acc, dn) => {
      for (const entry of dn.entries) {
        if (entry.audioMetadata?.hasAudioClip) {
          acc.count += 1;
          acc.totalBytes += entry.audioMetadata.sizeBytes || 0;
        }
      }
      return acc;
    },
    { count: 0, totalBytes: 0 }
  );
  const canShareFiles =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const canPickDirectFile = supportsDirectFileOverwritePicker();

  useEffect(() => {
    let mounted = true;
    getLinkedAutoBackupFileName().then((name) => {
      if (mounted) setLinkedFileName(name);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownloadJsonBackup = async () => {
    setSettingsError(null);
    setLocalActionLoading(true);
    try {
      const payload = await buildBackupPayload(
        dailyNotes,
        layouts,
        settings.includeAudioInBackup,
        todoItems,
        organizeItems,
        settings
      );
      const filename = downloadBackupJsonFile(payload);
      onNotify(`Backup completo scaricato: ${filename}`);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore nel download del backup.');
    } finally {
      setLocalActionLoading(false);
    }
  };

  const handleShareToICloud = async () => {
    setSettingsError(null);
    setLocalActionLoading(true);
    try {
      const payload = await buildBackupPayload(
        dailyNotes,
        layouts,
        settings.includeAudioInBackup,
        todoItems,
        organizeItems,
        settings
      );
      const shared = await shareBackupToICloudOrFiles(payload);
      if (!shared) {
        const filename = downloadBackupJsonFile(payload);
        onNotify(`File scaricato (${filename}): puoi salvarlo in iCloud Drive da File`);
      } else {
        onNotify(`Menu condivisione aperto: salva "${BACKUP_FILENAME}" su File`);
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setSettingsError(
          err instanceof Error
            ? err.message
            : 'Impossibile condividere il backup su File / iCloud.'
        );
      }
    } finally {
      setLocalActionLoading(false);
    }
  };

  const handleUploadBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSettingsError(null);
    setLocalActionLoading(true);
    try {
      const text = await file.text();
      const payload = validateAndParseBackupJson(text);
      setPendingModal({
        kind: 'confirm_restore',
        sourceLabel: file.name,
        payload,
      });
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : 'Il file selezionato non è un backup valido.'
      );
    } finally {
      setLocalActionLoading(false);
    }
  };

  const handleConfirmRestore = async (mode: 'merge' | 'replace') => {
    if (!pendingModal || pendingModal.kind !== 'confirm_restore') return;
    const { payload } = pendingModal;
    setRestoreInProgress(true);
    try {
      await onApplyRestoredBackup(payload, mode);
      setPendingModal(null);
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleLinkLocalAutoFile = async () => {
    setSettingsError(null);
    setLocalActionLoading(true);
    try {
      const payload = await buildBackupPayload(
        dailyNotes,
        layouts,
        settings.includeAudioInBackup,
        todoItems,
        organizeItems,
        settings
      );
      const chosen = await pickLinkedAutoBackupFile(payload);
      if (chosen) {
        setLinkedFileName(chosen);
        onNotify(`File collegato: ${chosen} verrà aggiornato automaticamente`);
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setSettingsError(
          err instanceof Error ? err.message : 'Impossibile collegare il file locale.'
        );
      }
    } finally {
      setLocalActionLoading(false);
    }
  };

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'settings_theme',
      render: () => (
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] flex items-center justify-center shrink-0">
              <Palette className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--app-text)]">
                Aspetto, Tema &amp; Colori
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                Scegli chiaro, scuro o automatico e personalizza i colori delle due aree dell’app.
              </p>
            </div>
          </div>

          {/* 3-way Theme Mode Selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--app-text)]">Modalità schermo</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              {(
                [
                  { id: 'light', label: 'Chiaro', Icon: Sun },
                  { id: 'dark', label: 'Scuro', Icon: Moon },
                  { id: 'auto', label: 'Automatico', Icon: Monitor },
                ] as ReadonlyArray<{ id: ThemeMode; label: string; Icon: React.FC<{ className?: string }> }>
              ).map(({ id, label, Icon }) => {
                const active = settings.themeMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateSettings({ themeMode: id })}
                    className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rest of App Color Customization */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[var(--app-text)]">Colore «Resto dell’app»</p>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-[var(--app-text-muted)]">
                <span>Personalizzato</span>
                <input
                  type="color"
                  value={settings.appCustomColor}
                  onChange={(e) =>
                    onUpdateSettings({
                      appColorPreset: 'custom',
                      appCustomColor: e.target.value,
                    })
                  }
                  aria-label="Scegli colore personalizzato per il resto dell'app"
                  className="h-7 w-9 cursor-pointer rounded-md border border-[var(--app-border)] bg-transparent p-0.5"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {APP_COLOR_PRESET_OPTIONS.map((opt) => {
                const active = settings.appColorPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateSettings({ appColorPreset: opt.id })}
                    className={`min-h-[32px] inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                        : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: opt.swatch }}
                      aria-hidden="true"
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Da Fare Giornaliero Color Customization */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[var(--app-text)]">
                Colore «Da fare giornaliero»
              </p>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-[var(--app-text-muted)]">
                <span>Personalizzato</span>
                <input
                  type="color"
                  value={settings.todoCustomColor}
                  onChange={(e) =>
                    onUpdateSettings({
                      todoColorPreset: 'custom',
                      todoCustomColor: e.target.value,
                    })
                  }
                  aria-label="Scegli colore personalizzato per Da fare giornaliero"
                  className="h-7 w-9 cursor-pointer rounded-md border border-[var(--app-border)] bg-transparent p-0.5"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TODO_COLOR_PRESET_OPTIONS.map((opt) => {
                const active = settings.todoColorPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateSettings({ todoColorPreset: opt.id })}
                    className={`min-h-[32px] inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                        : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: opt.swatch }}
                      aria-hidden="true"
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ),
    },
    {
      id: 'settings_local_backup',
      render: () => (
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] flex items-center justify-center shrink-0">
              <HardDrive className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--app-text)]">
                Backup JSON &amp; Salva su File
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                Esporta o importa tutto in <span className="font-mono">{BACKUP_FILENAME}</span> (
                {dailyNotes.length} giornate · {totalEntriesCount} appunti · {todoItems.length} Da
                Fare · {organizeItems.length} Organizza, layout e preferenze).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={localActionLoading}
              onClick={handleDownloadJsonBackup}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--app-btn-bg)] px-4 py-3 text-xs font-semibold text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4 opacity-85" aria-hidden="true" />
              <span>Download Backup (JSON)</span>
            </button>

            <button
              type="button"
              disabled={localActionLoading}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-xs font-semibold text-[var(--app-text)] hover:border-[var(--app-accent-soft-border)] hover:bg-[var(--app-accent-soft)] disabled:opacity-50 transition-colors"
            >
              <Upload className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
              <span>Upload Backup (JSON)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleUploadBackupFile}
              className="hidden"
            />
          </div>

          {canShareFiles && (
            <button
              type="button"
              disabled={localActionLoading}
              onClick={handleShareToICloud}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--app-accent-soft-border)] bg-[var(--app-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--app-accent-text)] hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>Salva su File / iCloud Drive (iOS)</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3.5 py-3">
            <div>
              <p className="text-xs font-semibold text-[var(--app-text)]">
                Includi clip audio nel backup JSON
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                Disattivalo se vuoi esportare solo testi, colori, sensazioni e promemoria in un file
                più leggero.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.includeAudioInBackup}
              onClick={() =>
                onUpdateSettings({ includeAudioInBackup: !settings.includeAudioInBackup })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                settings.includeAudioInBackup ? 'bg-[var(--app-accent)]' : 'bg-stone-300 dark:bg-stone-600'
              }`}
            >
              <span className="sr-only">Includi clip audio nel backup</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  settings.includeAudioInBackup ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--app-accent-soft-border)] bg-[var(--app-accent-soft)] px-3.5 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--app-text)]">
                  Backup automatico ogni 3 aperture (chiusura definitiva)
                </p>
                <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5 leading-snug">
                  Scarica automaticamente <span className="font-mono">{BACKUP_FILENAME}</span> ogni
                  3 aperture dell’app e solo alla chiusura definitiva (escluso quando resta in
                  background).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoBackupOnOpenClose}
                onClick={() =>
                  onUpdateSettings({
                    autoBackupOnOpenClose: !settings.autoBackupOnOpenClose,
                  })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  settings.autoBackupOnOpenClose ? 'bg-[var(--app-accent)]' : 'bg-stone-300 dark:bg-stone-600'
                }`}
              >
                <span className="sr-only">Attiva backup automatico ogni 3 aperture</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.autoBackupOnOpenClose ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {settings.autoBackupOnOpenClose && canPickDirectFile && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2">
                <div className="text-[11px] text-[var(--app-text)] flex items-center gap-1.5 min-w-0">
                  <FileCheck2 className="h-3.5 w-3.5 text-[var(--app-accent-text)] shrink-0" />
                  <span className="truncate">
                    {linkedFileName
                      ? `File collegato: ${linkedFileName}`
                      : `Collega ${BACKUP_FILENAME} da sovrascrivere`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLinkLocalAutoFile}
                    className="min-h-[30px] rounded-lg border border-[var(--app-accent-soft-border)] bg-[var(--app-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--app-accent-text)] hover:opacity-90"
                  >
                    {linkedFileName ? 'Cambia' : 'Collega file'}
                  </button>
                  {linkedFileName && (
                    <button
                      type="button"
                      onClick={async () => {
                        await clearLinkedAutoBackupFile();
                        setLinkedFileName(null);
                      }}
                      className="min-h-[30px] rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 text-[11px] font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)]"
                    >
                      Scollega
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {onDeleteAllSavedAudio && (
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3.5 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--app-text)]">
                  Audio salvati sul dispositivo ({savedAudioStats.count}{' '}
                  {savedAudioStats.count === 1 ? 'clip' : 'clip'}
                  {savedAudioStats.totalBytes > 0
                    ? ` · ${formatBytes(savedAudioStats.totalBytes)}`
                    : ''}
                  )
                </p>
                <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5 leading-snug">
                  Cancella solo i file audio per liberare spazio: trascrizioni, sensazioni e
                  promemoria già salvati negli appunti restano intatti.
                </p>
              </div>
              <button
                type="button"
                disabled={localActionLoading || savedAudioStats.count === 0}
                onClick={() =>
                  setPendingModal({
                    kind: 'confirm_delete_all_audio',
                    count: savedAudioStats.count,
                    totalBytes: savedAudioStats.totalBytes,
                  })
                }
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-500/40 bg-[var(--app-card)] px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-45 disabled:pointer-events-none transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancella audio salvati</span>
              </button>
            </div>
          )}
        </section>
      ),
    },
    {
      id: 'settings_preferences',
      render: () => (
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] flex items-center justify-center shrink-0">
              <Sliders className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--app-text)]">
                Preferenze diario, Promemoria &amp; App
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                Personalizza il comportamento dei promemoria automatici, lo zoom iniziale e i layout.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Bell className="h-4 w-4 text-[var(--app-accent-text)] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-[var(--app-text)]">
                  Estrai promemoria automaticamente
                </p>
                <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                  Rileva frasi da ricordare, domande su benessere/focus/vita (con “?”) e possibili
                  soluzioni o azioni in ogni appunto.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoExtractReminders}
              onClick={() =>
                onUpdateSettings({ autoExtractReminders: !settings.autoExtractReminders })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                settings.autoExtractReminders ? 'bg-[var(--app-accent)]' : 'bg-stone-300 dark:bg-stone-600'
              }`}
            >
              <span className="sr-only">Estrai promemoria automaticamente</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  settings.autoExtractReminders ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--app-border)] px-3.5 py-3 space-y-2">
            <p className="text-xs font-semibold text-[var(--app-text)]">Zoom predefinito in Agenda</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              {(
                [
                  { id: 'full', label: 'Tutto' },
                  { id: 'sensations', label: 'Sensazioni' },
                  { id: 'overview', label: 'Colore e orario' },
                ] as ReadonlyArray<{ id: DailyZoomLevel; label: string }>
              ).map((z) => {
                const active = settings.defaultAgendaZoom === z.id;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => onUpdateSettings({ defaultAgendaZoom: z.id })}
                    className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {z.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3.5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--app-text)]">Ordine &amp; blocchi sezioni</p>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                Ripristina l’ordine e la visibilità predefiniti di tutte le schermate.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetAllLayouts}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-alt)] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Ripristina layout
            </button>
          </div>

          <QuotaStatusBar />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <PWAInstallButton />
          </div>
        </section>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
        <CatIllustration
          src={neko.src}
          alt={neko.alt}
          className="h-14 w-14 rounded-2xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)] shrink-0"
        />
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--app-text)]">
            <Settings className="h-4 w-4 text-[var(--app-accent-text)] shrink-0" aria-hidden="true" />
            Impostazioni, Aspetto &amp; Backup
          </h2>
          <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
            Tema, colori personalizzati, file JSON / iCloud Drive e preferenze dell’app.
          </p>
        </div>
      </section>

      {settingsError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1 leading-relaxed">{settingsError}</span>
          <button
            type="button"
            onClick={() => setSettingsError(null)}
            className="text-rose-700 dark:text-rose-300 font-semibold hover:underline shrink-0"
          >
            Chiudi
          </button>
        </div>
      )}

      <CustomizableSectionStack
        section="settings"
        layout={sectionLayout}
        blocks={blocks}
        onChangeLayout={onChangeLayout}
        onResetSection={onResetLayout}
        className="space-y-4"
      />

      {/* Hidden-by-default Real-Time System Log & Mic Diagnostic Viewer */}
      <div className="pt-1 space-y-3">
        <button
          type="button"
          aria-expanded={showSystemLogs}
          onClick={() => setShowSystemLogs((prev) => !prev)}
          className="w-full min-h-[40px] flex items-center justify-between gap-2 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card)]/70 px-4 py-2 text-xs font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-accent-soft-border)] transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[var(--app-accent-text)]" aria-hidden="true" />
            <span>Diagnostica avanzata &amp; Log di sistema</span>
          </span>
          {showSystemLogs ? (
            <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
        </button>

        {showSystemLogs && <SystemDiagnosticViewer onNotify={onNotify} />}
      </div>

      {/* Explicit Confirmation Modal before Backup Restore */}
      {pendingModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-confirm-title"
          onClick={() => !restoreInProgress && setPendingModal(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] p-5 shadow-2xl space-y-4 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {pendingModal.kind === 'confirm_restore' ? (
              <>
                <div>
                  <h3 id="settings-confirm-title" className="text-sm font-bold text-[var(--app-text)]">
                    Ripristina backup da {pendingModal.sourceLabel}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)] leading-relaxed">
                    Il backup contiene{' '}
                    <strong>{pendingModal.payload.dailyNotes.length} giornate</strong>,{' '}
                    <strong>
                      {pendingModal.payload.dailyNotes.reduce((a, d) => a + d.entries.length, 0)}{' '}
                      appunti diario
                    </strong>
                    ,{' '}
                    <strong>{pendingModal.payload.todoItems?.length || 0} note Da Fare</strong>,{' '}
                    <strong>{pendingModal.payload.organizeItems?.length || 0} note Organizza</strong>{' '}
                    e{' '}
                    <strong>
                      {pendingModal.payload.audioClips
                        ? Object.keys(pendingModal.payload.audioClips).length
                        : 0}{' '}
                      clip audio
                    </strong>
                    , più layout e preferenze. Come vuoi procedere?
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={() => handleConfirmRestore('merge')}
                    className="w-full min-h-[44px] rounded-xl bg-[var(--app-btn-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] disabled:opacity-50"
                  >
                    {restoreInProgress
                      ? 'Ripristino in corso...'
                      : 'Unisci con gli appunti attuali (Consigliato)'}
                  </button>
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={() => handleConfirmRestore('replace')}
                    className="w-full min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-xs font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50"
                  >
                    Sostituisci tutti i dati locali con questo backup
                  </button>
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={() => setPendingModal(null)}
                    className="w-full min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)]"
                  >
                    Annulla
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 id="settings-confirm-title" className="text-sm font-bold text-[var(--app-text)]">
                    Cancella tutti gli audio salvati
                  </h3>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)] leading-relaxed">
                    Verranno eliminati <strong>{pendingModal.count} clip audio</strong>
                    {pendingModal.totalBytes > 0 ? ` (${formatBytes(pendingModal.totalBytes)})` : ''}{' '}
                    dal dispositivo. Le trascrizioni, le sensazioni sintetizzate e i promemoria di
                    tutti gli appunti resteranno salvati.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={async () => {
                      if (!onDeleteAllSavedAudio) return;
                      setRestoreInProgress(true);
                      try {
                        await onDeleteAllSavedAudio();
                        setPendingModal(null);
                      } finally {
                        setRestoreInProgress(false);
                      }
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {restoreInProgress
                      ? 'Eliminazione in corso...'
                      : 'Elimina solo i file audio salvati'}
                  </button>
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={() => setPendingModal(null)}
                    className="w-full min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)]"
                  >
                    Annulla
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
