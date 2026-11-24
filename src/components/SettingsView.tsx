import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  Clock,
  Copy,
  Download,
  FileCheck2,
  HardDrive,
  RotateCcw,
  Settings,
  Share2,
  Sliders,
  Upload,
} from 'lucide-react';
import type { OrganizeNoteItem, TodoNoteItem, WidgetConfig } from '../types/dailyTodo';
import type { DailyNote } from '../types/note';
import type { AppSettings } from '../utils/appSettings';
import {
  AUTO_BACKUP_FILENAME,
  buildBackupPayload,
  clearLinkedAutoBackupFile,
  downloadBackupJsonFile,
  downloadFixedNightlyBackupFile,
  getLinkedAutoBackupFileName,
  pickLinkedAutoBackupFile,
  shareBackupToICloudOrFiles,
  supportsDirectFileOverwritePicker,
  syncNightlyBackupToServer,
  validateAndParseBackupJson,
  writeAutoBackupToLinkedFile,
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

interface SettingsViewProps {
  dailyNotes: DailyNote[];
  todoItems?: TodoNoteItem[];
  organizeItems?: OrganizeNoteItem[];
  widgetConfig?: WidgetConfig;
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
  onNotify: (msg: string) => void;
}

type PendingModal = {
  kind: 'confirm_restore';
  sourceLabel: string;
  payload: AgendaVoceBackupPayload;
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  dailyNotes,
  todoItems = [],
  organizeItems = [],
  widgetConfig,
  layouts,
  settings,
  sectionLayout,
  onChangeLayout,
  onResetLayout,
  onResetAllLayouts,
  onUpdateSettings,
  onApplyRestoredBackup,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localActionLoading, setLocalActionLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal | null>(null);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [linkedFileName, setLinkedFileName] = useState<string | null>(null);
  const [autoUrlCopied, setAutoUrlCopied] = useState(false);

  const neko = CHIBI_CAT_MASCOTS.zen;
  const totalEntriesCount = dailyNotes.reduce((acc, d) => acc + d.entries.length, 0);
  const canShareFiles =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const canPickDirectFile = supportsDirectFileOverwritePicker();
  const autoBackupUrl =
    typeof window !== 'undefined' && settings.autoBackupToken
      ? `${window.location.origin}/api/backup/${encodeURIComponent(settings.autoBackupToken)}`
      : '';

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
        settings,
        widgetConfig
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
        settings,
        widgetConfig
      );
      const shared = await shareBackupToICloudOrFiles(payload);
      if (!shared) {
        const filename = downloadBackupJsonFile(payload);
        onNotify(`File scaricato (${filename}): puoi salvarlo in iCloud Drive da File`);
      } else {
        onNotify('Menu condivisione aperto: scegli "Salva su File / iCloud Drive"');
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setSettingsError(
          err instanceof Error ? err.message : 'Impossibile condividere il backup su File / iCloud.'
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

  const handleRunNightlyBackupNow = async () => {
    setSettingsError(null);
    setLocalActionLoading(true);
    try {
      const payload = await buildBackupPayload(
        dailyNotes,
        layouts,
        settings.includeAudioInBackup,
        todoItems,
        organizeItems,
        settings,
        widgetConfig
      );
      await syncNightlyBackupToServer(settings.autoBackupToken, payload);
      const overwroteLinked = await writeAutoBackupToLinkedFile(payload);
      if (!overwroteLinked) {
        downloadFixedNightlyBackupFile(payload);
      }
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;
      onUpdateSettings({
        lastAutoBackupDate: todayIso,
        lastAutoBackupAt: now.toISOString(),
      });
      onNotify(
        overwroteLinked
          ? `File «${linkedFileName || AUTO_BACKUP_FILENAME}» aggiornato e sostituito`
          : `Backup automatico scaricato (${AUTO_BACKUP_FILENAME})`
      );
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : 'Errore nel salvataggio automatico del backup.'
      );
    } finally {
      setLocalActionLoading(false);
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
        settings,
        widgetConfig
      );
      const chosen = await pickLinkedAutoBackupFile(payload);
      if (chosen) {
        setLinkedFileName(chosen);
        onNotify(`File collegato: ${chosen} verrà sostituito automaticamente`);
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

  const handleCopyAutoBackupUrl = async () => {
    if (!autoBackupUrl) return;
    try {
      const payload = await buildBackupPayload(
        dailyNotes,
        layouts,
        settings.includeAudioInBackup,
        todoItems,
        organizeItems,
        settings,
        widgetConfig
      );
      await syncNightlyBackupToServer(settings.autoBackupToken, payload);
      await navigator.clipboard.writeText(autoBackupUrl);
      setAutoUrlCopied(true);
      window.setTimeout(() => setAutoUrlCopied(false), 2600);
      onNotify('URL backup notturno copiato negli appunti');
    } catch {
      setSettingsError('Copia il link direttamente dal riquadro qui sotto.');
    }
  };

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'settings_local_backup',
      render: () => (
        <section className="rounded-3xl border border-stone-900/12 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <HardDrive className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Backup manuale JSON &amp; iCloud Drive
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Esporta o importa tutto in un unico JSON ({dailyNotes.length} giornate ·{' '}
                {totalEntriesCount} appunti · {todoItems.length} Da Fare ·{' '}
                {organizeItems.length} Organizza, layout, widget e preferenze).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={localActionLoading}
              onClick={handleDownloadJsonBackup}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4 text-purple-300" aria-hidden="true" />
              <span>Download Backup (JSON)</span>
            </button>

            <button
              type="button"
              disabled={localActionLoading}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs font-semibold text-stone-800 hover:border-purple-400 hover:bg-purple-50/40 disabled:opacity-50 transition-colors"
            >
              <Upload className="h-4 w-4 text-purple-700" aria-hidden="true" />
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
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50/60 px-4 py-2 text-xs font-semibold text-purple-900 hover:bg-purple-100/70 disabled:opacity-50 transition-colors"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>Salva su File / iCloud Drive (iOS)</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-[#FAF7F0] px-3.5 py-3">
            <div>
              <p className="text-xs font-semibold text-stone-900">
                Includi clip audio nel backup JSON
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
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
                settings.includeAudioInBackup ? 'bg-purple-600' : 'bg-stone-300'
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

          {/* Automatic Nightly Backup to iOS Files (Replaces previous file) */}
          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/45 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Clock className="h-4 w-4 text-purple-700 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900">
                    Backup automatico notturno su File (iOS)
                  </p>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                    Genera sempre lo stesso file <span className="font-mono">{AUTO_BACKUP_FILENAME}</span>{' '}
                    sostituendo quello della notte precedente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoNightlyBackupEnabled}
                onClick={() =>
                  onUpdateSettings({
                    autoNightlyBackupEnabled: !settings.autoNightlyBackupEnabled,
                  })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  settings.autoNightlyBackupEnabled ? 'bg-purple-600' : 'bg-stone-300'
                }`}
              >
                <span className="sr-only">Attiva backup automatico notturno</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.autoNightlyBackupEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {settings.autoNightlyBackupEnabled && (
              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200/70 bg-white/90 px-3 py-2">
                  <label
                    htmlFor="nightly-backup-hour"
                    className="text-xs font-semibold text-stone-800"
                  >
                    Orario notturno automatico
                  </label>
                  <select
                    id="nightly-backup-hour"
                    value={settings.autoNightlyBackupHour}
                    onChange={(e) =>
                      onUpdateSettings({ autoNightlyBackupHour: Number(e.target.value) })
                    }
                    className="min-h-[34px] rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-base sm:text-xs font-semibold text-stone-900"
                  >
                    {[0, 1, 2, 3, 4, 5].map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 px-0.5">
                  <span>
                    Ultimo automatico:{' '}
                    <strong className="text-stone-800">
                      {settings.lastAutoBackupAt
                        ? new Date(settings.lastAutoBackupAt).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Mai eseguito'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    disabled={localActionLoading}
                    onClick={handleRunNightlyBackupNow}
                    className="min-h-[32px] inline-flex items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3 text-purple-300" aria-hidden="true" />
                    <span>Esegui ora</span>
                  </button>
                </div>

                {canPickDirectFile && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white/80 px-3 py-2">
                    <div className="text-[11px] text-stone-700 flex items-center gap-1.5 min-w-0">
                      <FileCheck2 className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                      <span className="truncate">
                        {linkedFileName
                          ? `File collegato: ${linkedFileName}`
                          : 'Collega file fisso da sovrascrivere'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleLinkLocalAutoFile}
                        className="min-h-[30px] rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-900 hover:bg-purple-100"
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
                          className="min-h-[30px] rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100"
                        >
                          Scollega
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* iOS Autonomous Nightly File Replacement via Comandi Rapidi */}
                <div className="rounded-xl border border-purple-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-stone-900">
                      Automazione autonoma iPhone (Comandi Rapidi)
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyAutoBackupUrl}
                      className="min-h-[30px] inline-flex items-center gap-1 rounded-lg bg-purple-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-800 shrink-0"
                    >
                      {autoUrlCopied ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{autoUrlCopied ? 'Copiato!' : 'Copia URL'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={autoBackupUrl}
                    onClick={(e) => e.currentTarget.select()}
                    aria-label="URL automatico per Comandi Rapidi iPhone"
                    className="w-full min-h-[34px] rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-mono text-base sm:text-[11px] text-stone-700"
                  />
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-stone-600 leading-snug">
                    <li>
                      Su iPhone apri <strong>Comandi Rapidi → Automazione → + → Ora del giorno</strong>{' '}
                      (es. <strong>{String(settings.autoNightlyBackupHour).padStart(2, '0')}:00</strong>,
                      ogni giorno, <em>Esegui subito</em>).
                    </li>
                    <li>
                      Aggiungi l’azione <strong>Ottieni contenuto di URL</strong> e incolla l’URL qui sopra.
                    </li>
                    <li>
                      Aggiungi <strong>Salva file</strong> in una cartella di <strong>File / iCloud</strong>{' '}
                      con percorso <span className="font-mono">{AUTO_BACKUP_FILENAME}</span> e attiva{' '}
                      <strong>Sovrascrivi se esiste</strong>: ogni notte aggiornerà lo stesso file anche ad app chiusa.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </section>
      ),
    },
    {
      id: 'settings_preferences',
      render: () => (
        <section className="rounded-3xl border border-stone-900/12 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <Sliders className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Preferenze diario, Promemoria &amp; App
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Personalizza il comportamento dei promemoria automatici, lo zoom iniziale e i layout.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Bell className="h-4 w-4 text-purple-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-stone-900">
                  Estrai promemoria automaticamente
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Rileva frasi intere come “potrei fare…”, “forse dovrei…”, “mi sa che se…” in ogni
                  appunto.
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
                settings.autoExtractReminders ? 'bg-purple-600' : 'bg-stone-300'
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

          <div className="rounded-2xl border border-stone-200/80 px-3.5 py-3 space-y-2">
            <p className="text-xs font-semibold text-stone-900">Zoom predefinito in Agenda</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-purple-50/90 border border-purple-200/70 p-1">
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
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    {z.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-[#FAF7F0] px-3.5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-stone-900">Ordine &amp; blocchi sezioni</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Ripristina l’ordine e la visibilità predefiniti di tutte le schermate.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetAllLayouts}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
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
      <section className="rounded-3xl border border-stone-900/12 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
        <CatIllustration
          src={neko.src}
          alt={neko.alt}
          className="h-14 w-14 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
        />
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <Settings className="h-4 w-4 text-purple-700 shrink-0" aria-hidden="true" />
            Impostazioni &amp; Backup
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            File JSON / iCloud Drive e preferenze dell’app.
          </p>
        </div>
      </section>

      {settingsError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1 leading-relaxed">{settingsError}</span>
          <button
            type="button"
            onClick={() => setSettingsError(null)}
            className="text-rose-700 font-semibold hover:underline shrink-0"
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

      {/* Explicit Confirmation Modal before Backup Restore */}
      {pendingModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-confirm-title"
          onClick={() => !restoreInProgress && setPendingModal(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-stone-900/10 p-5 shadow-2xl space-y-4 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {pendingModal.kind === 'confirm_restore' && (
              <>
                <div>
                  <h3 id="settings-confirm-title" className="text-sm font-bold text-stone-900">
                    Ripristina backup da {pendingModal.sourceLabel}
                  </h3>
                  <p className="mt-1 text-xs text-stone-600 leading-relaxed">
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
                    className="w-full min-h-[44px] rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                  >
                    {restoreInProgress
                      ? 'Ripristino in corso...'
                      : 'Unisci con gli appunti attuali (Consigliato)'}
                  </button>
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={() => handleConfirmRestore('replace')}
                    className="w-full min-h-[44px] rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Sostituisci tutti i dati locali con questo backup
                  </button>
                  <button
                    type="button"
                    disabled={restoreInProgress}
                    onClick={() => setPendingModal(null)}
                    className="w-full min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
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
