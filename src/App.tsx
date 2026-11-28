import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  CheckSquare,
  Mic,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { DailyAgendaView, MonthlyAgendaView, WeeklyAgendaView } from './components/AgendaViews';
import { CatIllustration } from './components/CatIllustration';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './components/CustomizableSectionStack';
import { DailyTodoSection, type TodoSubTab } from './components/DailyTodoSection';
import { DailyNoteCard } from './components/NoteCard';
import { NoteEditorModal } from './components/NoteEditorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QuotaStatusBar } from './components/QuotaStatusBar';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { StatsAndChartsView } from './components/StatsAndChartsView';
import { VoiceRecorderPanel } from './components/VoiceRecorderPanel';
import type { OrganizeNoteItem, TodoNoteItem } from './types/dailyTodo';
import type { AgendaViewMode, DailyNote, NoteColor, NoteEntry } from './types/note';
import { loadAppSettings, saveAppSettings, type AppSettings } from './utils/appSettings';
import { clearAllAudioClips, deleteAudioClip } from './utils/audioStorage';
import {
  loadOrganizeItems,
  loadTodoItems,
  saveOrganizeItems,
  saveTodoItems,
} from './utils/dailyTodoStorage';
import {
  BACKUP_FILENAME,
  buildBackupPayload,
  downloadBackupJsonFile,
  mergeDailyNotesFromBackup,
  restoreAudioClipsFromBackup,
  writeAutoBackupToLinkedFile,
  type AgendaVoceBackupPayload,
} from './utils/backupService';
import {
  compareExtendedDayTimes,
  formatItalianDateShort,
  getAgendaDefaultDateISO,
  getCurrentTimeHHMM,
  migrateNightOwlDailyNotes,
  toISODate,
} from './utils/dateUtils';
import {
  createDefaultAllLayouts,
  createDefaultSectionLayout,
  loadAllLayoutPreferences,
  saveAllLayoutPreferences,
  type AllLayoutPreferences,
  type LayoutSectionKey,
  type SectionLayoutState,
} from './utils/layoutPreferences';
import {
  getCompanionQuoteForDate,
  getInitialLaunchQuoteOffset,
  getNextManualQuoteIndex,
} from './utils/dailyCompanionQuotes';
import { NOTE_COLOR_LIST, NOTE_COLORS, VALID_NOTE_COLORS } from './utils/noteColors';
import { CHIBI_CAT_MASCOTS } from './utils/nekoCatalog';
import { fetchApiJsonWithRetry } from './utils/apiError';
import { publishQuotaSnapshot } from './utils/quotaTracker';
import { extractRemindersLocally } from './utils/reminderExtractor';
import { applyThemeToDocument, subscribeSystemThemeChanges } from './utils/themeSystem';

const STORAGE_KEY = 'agendavoce_daily_notes_v2';
const LEGACY_STORAGE_KEY = 'agendavoce_notes_v1';
const NIGHT_OWL_MIGRATION_KEY = 'miciomiao_night_owl_migrated_v2';

type DesktopSection =
  | AgendaViewMode
  | 'stats'
  | 'pinned'
  | 'reminders'
  | 'todo'
  | 'settings';
type MobileTab =
  | 'record'
  | 'agenda'
  | 'stats'
  | 'pinned'
  | 'reminders'
  | 'todo'
  | 'settings';

const MOBILE_SWIPE_ORDER: MobileTab[] = [
  'record',
  'agenda',
  'stats',
  'pinned',
  'reminders',
  'todo',
  'settings',
];

const DESKTOP_SWIPE_ORDER: DesktopSection[] = [
  'day',
  'week',
  'month',
  'stats',
  'pinned',
  'reminders',
  'todo',
  'settings',
];

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

function sanitizeColor(value: unknown): NoteColor {
  if (typeof value !== 'string') return 'amber';
  if (VALID_NOTE_COLORS.includes(value as NoteColor)) return value as NoteColor;
  return LEGACY_COLOR_MAP[value] || 'amber';
}

function sanitizeEntry(raw: Record<string, unknown>, fallbackNow: string): NoteEntry {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    time: typeof raw.time === 'string' && raw.time ? raw.time : '09:00',
    transcript: typeof raw.transcript === 'string' ? raw.transcript : '',
    bullets: Array.isArray(raw.bullets)
      ? raw.bullets.map((b) => String(b ?? '').trim()).filter(Boolean)
      : [],
    ...(Array.isArray(raw.reminders)
      ? {
          reminders: raw.reminders.map((r) => String(r ?? '').trim()).filter(Boolean),
        }
      : {}),
    color: sanitizeColor(raw.color),
    source: raw.source === 'voice' ? 'voice' : 'text',
    audioMetadata:
      raw.audioMetadata && typeof raw.audioMetadata === 'object'
        ? (raw.audioMetadata as NoteEntry['audioMetadata'])
        : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : fallbackNow,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : fallbackNow,
  };
}

function loadStoredDailyNotes(): DailyNote[] {
  const nowIso = new Date().toISOString();
  const today = toISODate(new Date());

  let loaded: DailyNote[] = [];

  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        loaded = parsed
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => {
            const date = typeof item.date === 'string' && item.date ? item.date : today;
            const entries = Array.isArray(item.entries)
              ? item.entries
                  .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
                  .map((e) => sanitizeEntry(e, nowIso))
                  .sort((a, b) => compareExtendedDayTimes(a.time, b.time))
              : [];
            return {
              id: typeof item.id === 'string' && item.id ? item.id : `day-${date}`,
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
      }
    } else {
      const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (rawV1) {
        const legacy = JSON.parse(rawV1);
        if (Array.isArray(legacy) && legacy.length > 0) {
          const grouped = new Map<string, DailyNote>();
          for (const item of legacy) {
            if (!item || typeof item !== 'object') continue;
            const rec = item as Record<string, unknown>;
            const date = typeof rec.date === 'string' && rec.date ? rec.date : today;
            const entry = sanitizeEntry(rec, nowIso);
            if (typeof rec.title === 'string' && rec.title.trim() && !rec.title.startsWith('Nota ')) {
              const cleanTitle = rec.title.trim();
              if (!entry.transcript.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
                entry.transcript = entry.transcript
                  ? `${cleanTitle}: ${entry.transcript}`
                  : cleanTitle;
              }
            }

            const existing = grouped.get(date);
            if (existing) {
              existing.entries.push(entry);
              existing.pinned = existing.pinned || Boolean(rec.pinned);
              existing.updatedAt = nowIso;
            } else {
              grouped.set(date, {
                id: `day-${date}`,
                date,
                title: `Diario del ${formatItalianDateShort(date)}`,
                pinned: Boolean(rec.pinned),
                dailySummaryBullets: [],
                entries: [entry],
                createdAt: entry.createdAt,
                updatedAt: nowIso,
              });
            }
          }
          loaded = Array.from(grouped.values()).map((dn) => ({
            ...dn,
            entries: dn.entries.sort((a, b) => compareExtendedDayTimes(a.time, b.time)),
          }));
        }
      }
    }

    if (localStorage.getItem(NIGHT_OWL_MIGRATION_KEY) !== '1') {
      const migrated = migrateNightOwlDailyNotes(loaded, { onlyStrictCreatedAtMatch: false });
      loaded = migrated.notes;
      localStorage.setItem(NIGHT_OWL_MIGRATION_KEY, '1');
      if (loaded.length > 0 || migrated.changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      }
    }
  } catch {
    return [];
  }

  return loaded;
}

function dailyNoteMatchesFilters(
  dailyNote: DailyNote,
  colorFilter: NoteColor | 'all',
  searchQuery: string
): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (colorFilter === 'all' && !q) return true;
  if (q && dailyNote.title.toLowerCase().includes(q) && colorFilter === 'all') {
    return true;
  }
  return dailyNote.entries.some((entry) => {
    if (colorFilter !== 'all' && entry.color !== colorFilter) return false;
    if (!q) return true;
    return (
      dailyNote.title.toLowerCase().includes(q) ||
      entry.transcript.toLowerCase().includes(q) ||
      entry.bullets.some((b) => b.toLowerCase().includes(q))
    );
  });
}

export default function App() {
  const initialUrlParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return { section: null as string | null };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      section: params.get('section'),
    };
  }, []);

  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>(loadStoredDailyNotes);
  const [todoItems, setTodoItems] = useState<TodoNoteItem[]>(loadTodoItems);
  const [organizeItems, setOrganizeItems] = useState<OrganizeNoteItem[]>(loadOrganizeItems);

  const [selectedDate, setSelectedDate] = useState<string>(() => getAgendaDefaultDateISO());
  const [agendaMode, setAgendaMode] = useState<AgendaViewMode>('day');
  const [desktopSection, setDesktopSection] = useState<DesktopSection>(
    initialUrlParams.section === 'todo' ? 'todo' : 'day'
  );
  // Land directly on the Record / Write New Note section on launch (unless deep-linked)
  const [mobileTab, setMobileTab] = useState<MobileTab>(
    initialUrlParams.section === 'todo' ? 'todo' : 'record'
  );
  const [todoSubTab, setTodoSubTab] = useState<TodoSubTab>('organizza');
  const [organizeFocusTodayKey, setOrganizeFocusTodayKey] = useState<number>(0);
  const [todoSubMenuOpen, setTodoSubMenuOpen] = useState(false);
  const [layouts, setLayouts] = useState<AllLayoutPreferences>(loadAllLayoutPreferences);
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);

  const [colorFilter, setColorFilter] = useState<NoteColor | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    dailyNote: DailyNote;
    entry: NoteEntry;
  } | null>(null);
  const [quoteOffset, setQuoteOffset] = useState<number>(() =>
    getInitialLaunchQuoteOffset(getAgendaDefaultDateISO())
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const launchNumberRef = useRef<number | null>(null);
  if (launchNumberRef.current === null && typeof window !== 'undefined') {
    let sessionNum = 0;
    try {
      const existingSession = sessionStorage.getItem('miciomiao_session_launch_num_v1');
      if (existingSession) {
        sessionNum = parseInt(existingSession, 10) || 1;
      } else {
        const prevCount = parseInt(localStorage.getItem('miciomiao_launch_count_v1') || '0', 10) || 0;
        sessionNum = prevCount + 1;
        localStorage.setItem('miciomiao_launch_count_v1', String(sessionNum));
        sessionStorage.setItem('miciomiao_session_launch_num_v1', String(sessionNum));
      }
    } catch {
      sessionNum = 1;
    }
    launchNumberRef.current = sessionNum;
  }

  const hiddenAtRef = useRef<number | null>(null);
  const autoBackupRunningRef = useRef(false);
  const lastBackedUpSignatureRef = useRef<string>('');
  const lastAutoBackupAtMsRef = useRef<number>(0);
  const dailyNotesRef = useRef(dailyNotes);
  dailyNotesRef.current = dailyNotes;
  const todoItemsRef = useRef(todoItems);
  todoItemsRef.current = todoItems;
  const organizeItemsRef = useRef(organizeItems);
  organizeItemsRef.current = organizeItems;
  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyNotes));
    } catch (err) {
      console.warn('Impossibile salvare in localStorage:', err);
    }
  }, [dailyNotes]);

  useEffect(() => {
    saveTodoItems(todoItems);
  }, [todoItems]);

  useEffect(() => {
    saveOrganizeItems(organizeItems);
  }, [organizeItems]);



  // Refresh companion quote also when resuming iOS PWA after being backgrounded (>= 30s)
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const elapsedMs = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (elapsedMs >= 30000) {
          setQuoteOffset(getNextManualQuoteIndex());
        }
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  const computeBackupSignature = useCallback(() => {
    const dn = dailyNotesRef.current
      .map((d) => `${d.date}:${d.updatedAt}:${d.entries.length}`)
      .join('|');
    const td = todoItemsRef.current.map((t) => `${t.id}:${t.updatedAt}:${t.done ? 1 : 0}`).join('|');
    const og = organizeItemsRef.current
      .map((o) => `${o.id}:${o.updatedAt}:${o.done ? 1 : 0}`)
      .join('|');
    return `${dn}##${td}##${og}`;
  }, []);

  const triggerAutomaticBackup = useCallback(
    async (reason: 'open' | 'close') => {
      if (autoBackupRunningRef.current) return;
      if (!settingsRef.current.autoBackupOnOpenClose) return;
      const curDaily = dailyNotesRef.current;
      const curTodo = todoItemsRef.current;
      const curOrg = organizeItemsRef.current;
      if (curDaily.length === 0 && curTodo.length === 0 && curOrg.length === 0) return;

      const sig = computeBackupSignature();
      if (reason === 'close' && sig === lastBackedUpSignatureRef.current) return;
      if (Date.now() - lastAutoBackupAtMsRef.current < 5000) return;

      autoBackupRunningRef.current = true;
      lastAutoBackupAtMsRef.current = Date.now();
      lastBackedUpSignatureRef.current = sig;
      try {
        const payload = await buildBackupPayload(
          curDaily,
          layoutsRef.current,
          settingsRef.current.includeAudioInBackup,
          curTodo,
          curOrg,
          settingsRef.current
        );
        const overwrote = await writeAutoBackupToLinkedFile(payload);
        if (!overwrote) {
          downloadBackupJsonFile(payload);
        }
        if (reason === 'open') {
          setToastMessage(`Backup automatico salvato (${BACKUP_FILENAME})`);
        }
      } catch {
        // ignore silent background backup failures
      } finally {
        autoBackupRunningRef.current = false;
      }
    },
    [computeBackupSignature]
  );

  // Automatic backup ONLY every 3 launches and ONLY on open/permanent close (NOT when backgrounded)
  useEffect(() => {
    if (!settings.autoBackupOnOpenClose) return;
    const launchNum = launchNumberRef.current ?? 1;
    const isThirdLaunch = launchNum > 0 && launchNum % 3 === 0;
    if (!isThirdLaunch) return;

    let openTimer: number | undefined;
    try {
      if (sessionStorage.getItem('miciomiao_open_backup_done') !== '1') {
        openTimer = window.setTimeout(() => {
          try {
            sessionStorage.setItem('miciomiao_open_backup_done', '1');
          } catch {
            // ignore sessionStorage restrictions
          }
          void triggerAutomaticBackup('open');
        }, 1200);
      }
    } catch {
      openTimer = window.setTimeout(() => {
        void triggerAutomaticBackup('open');
      }, 1200);
    }

    const onPageHide = (e: PageTransitionEvent) => {
      // Only when truly unloading/closing permanently, NOT when entering background/bfcache
      if (e.persisted) return;
      void triggerAutomaticBackup('close');
    };
    const onBeforeUnload = () => {
      void triggerAutomaticBackup('close');
    };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      if (openTimer) window.clearTimeout(openTimer);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [settings.autoBackupOnOpenClose, triggerAutomaticBackup]);

  useEffect(() => {
    saveAllLayoutPreferences(layouts);
  }, [layouts]);

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    applyThemeToDocument(settings);
    if (settings.themeMode !== 'auto') return;
    return subscribeSystemThemeChanges(() => {
      applyThemeToDocument(settings);
    });
  }, [settings]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'MicioMiao — Note Vocali & Agenda iOS';

    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', 'MicioMiao');
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!highlightedEntryId) return;
    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById(`entry-${highlightedEntryId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clearTimer = window.setTimeout(() => {
      setHighlightedEntryId(null);
    }, 4500);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedEntryId, mobileTab, desktopSection, agendaMode, selectedDate]);


  const handleUpdateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleChangeLayout = (section: LayoutSectionKey, next: SectionLayoutState) => {
    setLayouts((prev) => ({ ...prev, [section]: next }));
  };

  const handleResetLayout = (section: LayoutSectionKey) => {
    setLayouts((prev) => ({ ...prev, [section]: createDefaultSectionLayout(section) }));
  };

  const handleResetAllLayouts = () => {
    setLayouts(createDefaultAllLayouts());
    setToastMessage('Layout di tutte le sezioni ripristinato');
  };

  const filteredDailyNotes = useMemo(() => {
    return dailyNotes.filter((dn) => dailyNoteMatchesFilters(dn, colorFilter, searchQuery));
  }, [dailyNotes, colorFilter, searchQuery]);

  const pinnedDailyNotes = useMemo(() => {
    return [...filteredDailyNotes]
      .filter((dn) => dn.pinned)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredDailyNotes]);

  const handleEntryCreated = (targetDate: string, entry: NoteEntry) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) => {
      const existing = prev.find((dn) => dn.date === targetDate);
      if (existing) {
        return prev.map((dn) =>
          dn.date === targetDate
            ? {
                ...dn,
                entries: [...dn.entries, entry].sort((a, b) =>
                  compareExtendedDayTimes(a.time, b.time)
                ),
                updatedAt: nowIso,
              }
            : dn
        );
      }
      const created: DailyNote = {
        id: `day-${targetDate}`,
        date: targetDate,
        title: `Diario del ${formatItalianDateShort(targetDate)}`,
        pinned: false,
        dailySummaryBullets: [],
        entries: [entry],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      return [created, ...prev];
    });

    setSelectedDate(targetDate);
    if (
      desktopSection === 'pinned' ||
      desktopSection === 'stats' ||
      desktopSection === 'reminders' ||
      desktopSection === 'todo' ||
      desktopSection === 'settings'
    ) {
      setDesktopSection(agendaMode);
    }
    setMobileTab('agenda');
    setTodoSubMenuOpen(false);
    setHighlightedEntryId(entry.id);
    const colLabel = (NOTE_COLORS[entry.color] || NOTE_COLORS.amber).label;
    setToastMessage(
      `Appunto salvato (${formatItalianDateShort(targetDate)}, ${entry.time}) · ${colLabel}`
    );
  };

  const handleSaveEntry = (
    originalDate: string,
    targetDate: string,
    updatedEntry: NoteEntry
  ) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) => {
      let next = [...prev];

      if (originalDate === targetDate) {
        const existingDay = next.find((dn) => dn.date === targetDate);
        if (existingDay) {
          const hasEntry = existingDay.entries.some((e) => e.id === updatedEntry.id);
          next = next.map((dn) =>
            dn.date === targetDate
              ? {
                  ...dn,
                  entries: (hasEntry
                    ? dn.entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
                    : [...dn.entries, updatedEntry]
                  ).sort((a, b) => compareExtendedDayTimes(a.time, b.time)),
                  updatedAt: nowIso,
                }
              : dn
          );
        } else {
          next = [
            {
              id: `day-${targetDate}`,
              date: targetDate,
              title: `Diario del ${formatItalianDateShort(targetDate)}`,
              pinned: false,
              dailySummaryBullets: [],
              entries: [updatedEntry],
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            ...next,
          ];
        }
        return next;
      }

      next = next
        .map((dn) =>
          dn.date === originalDate
            ? {
                ...dn,
                entries: dn.entries.filter((e) => e.id !== updatedEntry.id),
                updatedAt: nowIso,
              }
            : dn
        )
        .filter((dn) => dn.entries.length > 0);

      const destination = next.find((dn) => dn.date === targetDate);
      if (destination) {
        next = next.map((dn) =>
          dn.date === targetDate
            ? {
                ...dn,
                entries: [...dn.entries, updatedEntry].sort((a, b) =>
                  compareExtendedDayTimes(a.time, b.time)
                ),
                updatedAt: nowIso,
              }
            : dn
        );
      } else {
        next = [
          {
            id: `day-${targetDate}`,
            date: targetDate,
            title: `Diario del ${formatItalianDateShort(targetDate)}`,
            pinned: false,
            dailySummaryBullets: [],
            entries: [updatedEntry],
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          ...next,
        ];
      }
      return next;
    });

    setSelectedDate(targetDate);
    setEditingTarget(null);
    setToastMessage('Modifiche salvate');
  };

  const handleDeleteEntry = async (date: string, entryId: string) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) =>
      prev
        .map((dn) =>
          dn.date === date
            ? {
                ...dn,
                entries: dn.entries.filter((e) => e.id !== entryId),
                updatedAt: nowIso,
              }
            : dn
        )
        .filter((dn) => dn.entries.length > 0)
    );
    await deleteAudioClip(entryId);
    setEditingTarget(null);
    setToastMessage('Appunto eliminato');
  };

  const handleDeleteEntryAudio = async (date: string, entryId: string) => {
    const nowIso = new Date().toISOString();
    await deleteAudioClip(entryId);
    setDailyNotes((prev) =>
      prev.map((dn) =>
        dn.date === date
          ? {
              ...dn,
              entries: dn.entries.map((e) =>
                e.id === entryId && e.audioMetadata
                  ? {
                      ...e,
                      audioMetadata: {
                        ...e.audioMetadata,
                        hasAudioClip: false,
                        sizeBytes: 0,
                      },
                      updatedAt: nowIso,
                    }
                  : e
              ),
              updatedAt: nowIso,
            }
          : dn
      )
    );
    setEditingTarget((prev) =>
      prev && prev.entry.id === entryId && prev.entry.audioMetadata
        ? {
            ...prev,
            entry: {
              ...prev.entry,
              audioMetadata: {
                ...prev.entry.audioMetadata,
                hasAudioClip: false,
                sizeBytes: 0,
              },
              updatedAt: nowIso,
            },
          }
        : prev
    );
    setToastMessage('Audio eliminato (trascrizione e sintesi mantenute)');
  };

  const handleDeleteAllSavedAudio = async () => {
    const nowIso = new Date().toISOString();
    await clearAllAudioClips();
    setDailyNotes((prev) =>
      prev.map((dn) => {
        const hadAudio = dn.entries.some((e) => e.audioMetadata?.hasAudioClip);
        if (!hadAudio) return dn;
        return {
          ...dn,
          entries: dn.entries.map((e) =>
            e.audioMetadata?.hasAudioClip
              ? {
                  ...e,
                  audioMetadata: {
                    ...e.audioMetadata,
                    hasAudioClip: false,
                    sizeBytes: 0,
                  },
                  updatedAt: nowIso,
                }
              : e
          ),
          updatedAt: nowIso,
        };
      })
    );
    setEditingTarget((prev) =>
      prev && prev.entry.audioMetadata?.hasAudioClip
        ? {
            ...prev,
            entry: {
              ...prev.entry,
              audioMetadata: {
                ...prev.entry.audioMetadata,
                hasAudioClip: false,
                sizeBytes: 0,
              },
              updatedAt: nowIso,
            },
          }
        : prev
    );
    setToastMessage('Tutti i file audio eliminati (trascrizioni e sintesi mantenute)');
  };

  const handleTogglePinDay = (date: string) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) =>
      prev.map((dn) =>
        dn.date === date ? { ...dn, pinned: !dn.pinned, updatedAt: nowIso } : dn
      )
    );
  };

  const handleUpdateDayTitle = (date: string, newTitle: string) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) =>
      prev.map((dn) =>
        dn.date === date ? { ...dn, title: newTitle, updatedAt: nowIso } : dn
      )
    );
    setToastMessage('Titolo giornata aggiornato');
  };

  const handleChangeEntryColor = (date: string, entryId: string, color: NoteColor) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) =>
      prev.map((dn) =>
        dn.date === date
          ? {
              ...dn,
              entries: dn.entries.map((e) =>
                e.id === entryId ? { ...e, color, updatedAt: nowIso } : e
              ),
              updatedAt: nowIso,
            }
          : dn
      )
    );
  };

  const handleGenerateDailySummary = async (date: string) => {
    const targetDay = dailyNotes.find((dn) => dn.date === date);
    if (!targetDay) return;

    const combinedText = [...targetDay.entries]
      .sort((a, b) => compareExtendedDayTimes(a.time, b.time))
      .map((e) => `[${e.time}] ${e.transcript || '(Solo audio senza testo)'}`)
      .join('\n');

    if (!combinedText.trim()) return;

    try {
      const { response: res, data } = await fetchApiJsonWithRetry<{
        bullets?: unknown;
        quota?: unknown;
        error?: string;
      }>('/api/notes/summarize-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText, isDailyOverview: true }),
      });
      if (data.quota) {
        publishQuotaSnapshot(data.quota);
      }
      if (!res.ok) {
        throw new Error(
          data.error || 'Impossibile generare la sintesi del giorno.'
        );
      }
      const bullets = Array.isArray(data.bullets)
        ? data.bullets.map((b) => String(b ?? '').trim()).filter(Boolean)
        : [];
      const nowIso = new Date().toISOString();
      setDailyNotes((prev) =>
        prev.map((dn) =>
          dn.date === date
            ? { ...dn, dailySummaryBullets: bullets, updatedAt: nowIso }
            : dn
        )
      );
      setToastMessage('Sintesi della giornata aggiornata');
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : 'Errore nella generazione della sintesi'
      );
    }
  };

  const handleCreateBlankEntry = (isoDate: string) => {
    const nowIso = new Date().toISOString();
    const existingDay = dailyNotes.find((dn) => dn.date === isoDate);
    const blankEntry: NoteEntry = {
      id: crypto.randomUUID(),
      time: getCurrentTimeHHMM(),
      transcript: '',
      bullets: [],
      color: 'amber',
      source: 'text',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const draftDay: DailyNote = existingDay || {
      id: `day-${isoDate}`,
      date: isoDate,
      title: `Diario del ${formatItalianDateShort(isoDate)}`,
      pinned: false,
      dailySummaryBullets: [],
      entries: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setEditingTarget({ dailyNote: draftDay, entry: blankEntry });
  };

  const handleSelectEntry = (dailyNote: DailyNote, entry: NoteEntry) => {
    setEditingTarget({ dailyNote, entry });
  };

  const handleOpenNoteInAgenda = (date: string, entryId: string) => {
    setColorFilter('all');
    setSearchQuery('');
    setSelectedDate(date);
    setAgendaMode('day');
    setDesktopSection('day');
    setMobileTab('agenda');
    setTodoSubMenuOpen(false);
    setHighlightedEntryId(entryId);
  };

  const handleDismissReminder = (date: string, entryId: string, reminderIndex: number) => {
    const nowIso = new Date().toISOString();
    setDailyNotes((prev) =>
      prev.map((dn) => {
        if (dn.date !== date) return dn;
        return {
          ...dn,
          entries: dn.entries.map((e) => {
            if (e.id !== entryId) return e;
            const currentList = Array.isArray(e.reminders)
              ? e.reminders
              : extractRemindersLocally(e.transcript || '');
            return {
              ...e,
              reminders: currentList.filter((_, idx) => idx !== reminderIndex),
              updatedAt: nowIso,
            };
          }),
          updatedAt: nowIso,
        };
      })
    );
    setToastMessage('Promemoria rimosso');
  };

  const handleApplyRestoredBackup = async (
    payload: AgendaVoceBackupPayload,
    mode: 'merge' | 'replace'
  ) => {
    const restoredClips = await restoreAudioClipsFromBackup(payload.audioClips);
    if (mode === 'replace') {
      setDailyNotes(payload.dailyNotes);
      setTodoItems(payload.todoItems ?? []);
      setOrganizeItems(payload.organizeItems ?? []);
      if (payload.layouts) {
        setLayouts(payload.layouts);
      }
      if (payload.settings) {
        setSettings(payload.settings);
      }
      if (payload.statsPrefs) {
        try {
          localStorage.setItem('agendavoce_stats_prefs_v1', JSON.stringify(payload.statsPrefs));
        } catch {
          // ignore storage error
        }
      }
      if (payload.agendaZooms) {
        try {
          for (const [k, v] of Object.entries(payload.agendaZooms)) {
            if (k.startsWith('agendavoce_agenda_zoom_')) {
              localStorage.setItem(k, v);
            }
          }
        } catch {
          // ignore storage error
        }
      }
    } else {
      setDailyNotes((prev) => mergeDailyNotesFromBackup(prev, payload.dailyNotes));
      if (payload.todoItems && payload.todoItems.length > 0) {
        setTodoItems((prev) => {
          const map = new Map(prev.map((t) => [t.id, t]));
          for (const inc of payload.todoItems!) {
            const ex = map.get(inc.id);
            if (!ex || inc.updatedAt > ex.updatedAt) map.set(inc.id, inc);
          }
          return Array.from(map.values());
        });
      }
      if (payload.organizeItems && payload.organizeItems.length > 0) {
        setOrganizeItems((prev) => {
          const map = new Map(prev.map((o) => [o.id, o]));
          for (const inc of payload.organizeItems!) {
            const ex = map.get(inc.id);
            if (!ex || inc.updatedAt > ex.updatedAt) map.set(inc.id, inc);
          }
          return Array.from(map.values());
        });
      }
      if (payload.statsPrefs) {
        try {
          if (!localStorage.getItem('agendavoce_stats_prefs_v1')) {
            localStorage.setItem('agendavoce_stats_prefs_v1', JSON.stringify(payload.statsPrefs));
          }
        } catch {
          // ignore
        }
      }
      if (payload.agendaZooms) {
        try {
          for (const [k, v] of Object.entries(payload.agendaZooms)) {
            if (k.startsWith('agendavoce_agenda_zoom_') && !localStorage.getItem(k)) {
              localStorage.setItem(k, v);
            }
          }
        } catch {
          // ignore
        }
      }
    }
    const entriesCount = payload.dailyNotes.reduce((acc, d) => acc + d.entries.length, 0);
    const todoCount = payload.todoItems?.length ?? 0;
    const orgCount = payload.organizeItems?.length ?? 0;
    const parts = [`${entriesCount} appunti`];
    if (todoCount > 0) parts.push(`${todoCount} Da Fare`);
    if (orgCount > 0) parts.push(`${orgCount} Organizza`);
    if (restoredClips > 0) parts.push(`${restoredClips} clip audio`);
    setToastMessage(`Backup ripristinato: ${parts.join(', ')}`);
  };



  const selectDesktopAgendaMode = (mode: AgendaViewMode) => {
    if (mode === 'week') {
      setSelectedDate(getAgendaDefaultDateISO());
    }
    setAgendaMode(mode);
    setDesktopSection(mode);
    setMobileTab('agenda');
    setTodoSubMenuOpen(false);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const controlsEl = document.querySelector<HTMLElement>('[data-agenda-controls="true"]');
          if (!controlsEl) return;
          const headerEl = document.querySelector<HTMLElement>('header');
          const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 56;
          const rect = controlsEl.getBoundingClientRect();
          if (rect.top < headerHeight + 4 || rect.top > window.innerHeight * 0.55) {
            const targetTop = Math.max(0, window.scrollY + rect.top - headerHeight - 10);
            window.scrollTo({ top: targetTop, behavior: 'auto' });
          }
        });
      });
    }
  };

  const swipeStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const navigateSectionBySwipe = (delta: -1 | 1) => {
    const isDesktop =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

    if (!isDesktop) {
      const idx = MOBILE_SWIPE_ORDER.indexOf(mobileTab);
      if (idx < 0) return;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= MOBILE_SWIPE_ORDER.length) return;
      const nextTab = MOBILE_SWIPE_ORDER[nextIdx];
      setTodoSubMenuOpen(false);
      if (nextTab === 'record') {
        setMobileTab('record');
      } else if (nextTab === 'agenda') {
        if (agendaMode === 'week') {
          setSelectedDate(getAgendaDefaultDateISO());
        }
        setMobileTab('agenda');
        if (
          desktopSection === 'stats' ||
          desktopSection === 'pinned' ||
          desktopSection === 'reminders' ||
          desktopSection === 'todo' ||
          desktopSection === 'settings'
        ) {
          setDesktopSection(agendaMode);
        }
      } else if (nextTab === 'todo') {
        setTodoSubTab('organizza');
        setOrganizeFocusTodayKey((k) => k + 1);
        setMobileTab('todo');
        setDesktopSection('todo');
      } else {
        setMobileTab(nextTab);
        setDesktopSection(nextTab);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const dIdx = DESKTOP_SWIPE_ORDER.indexOf(desktopSection);
    if (dIdx < 0) return;
    const nextDIdx = dIdx + delta;
    if (nextDIdx < 0 || nextDIdx >= DESKTOP_SWIPE_ORDER.length) return;
    const nextSec = DESKTOP_SWIPE_ORDER[nextDIdx];
    if (nextSec === 'day' || nextSec === 'week' || nextSec === 'month') {
      selectDesktopAgendaMode(nextSec);
    } else if (nextSec === 'todo') {
      setTodoSubTab('organizza');
      setOrganizeFocusTodayKey((k) => k + 1);
      setDesktopSection('todo');
      setMobileTab('todo');
      setTodoSubMenuOpen(false);
    } else {
      setDesktopSection(nextSec);
      setMobileTab(nextSec);
      setTodoSubMenuOpen(false);
    }
  };

  const handleWorkspaceTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1 || editingTarget || document.querySelector('[role="dialog"]')) {
      swipeStartRef.current = null;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (
      !target ||
      target.closest(
        'input, textarea, select, [contenteditable="true"], [draggable="true"], [data-todo-item-id], [data-org-item-id], [data-org-insert-before], [data-todo-insert-before], .touch-none, [role="dialog"]'
      )
    ) {
      swipeStartRef.current = null;
      return;
    }

    // Do not hijack swipes inside horizontally scrollable strips/charts
    let el: HTMLElement | null = target;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 6) {
        const overflowX = window.getComputedStyle(el).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          swipeStartRef.current = null;
          return;
        }
      }
      el = el.parentElement;
    }

    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const handleWorkspaceTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dt = Date.now() - start.t;
    if (dt > 650) return;
    if (Math.abs(dx) < 64 || Math.abs(dy) > 55) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.45) return;

    navigateSectionBySwipe(dx < 0 ? 1 : -1);
  };

  const showSettingsView = mobileTab === 'settings' || desktopSection === 'settings';
  const showTodoView =
    !showSettingsView && (mobileTab === 'todo' || desktopSection === 'todo');
  const showRemindersView =
    !showSettingsView &&
    !showTodoView &&
    (mobileTab === 'reminders' || desktopSection === 'reminders');
  const showStatsView =
    !showSettingsView &&
    !showTodoView &&
    !showRemindersView &&
    (mobileTab === 'stats' || desktopSection === 'stats');
  const showPinnedView =
    !showSettingsView &&
    !showTodoView &&
    !showRemindersView &&
    !showStatsView &&
    (mobileTab === 'pinned' || desktopSection === 'pinned');
  const pinnedNeko = CHIBI_CAT_MASCOTS.cozy;
  const dailyQuote = getCompanionQuoteForDate(selectedDate, quoteOffset);
  const companionNeko = CHIBI_CAT_MASCOTS[dailyQuote.catKey];

  const sidebarBlocks: CustomizableBlockItem[] = [
    {
      id: 'recorder',
      render: () => (
        <VoiceRecorderPanel
          selectedDate={selectedDate}
          autoExtractReminders={settings.autoExtractReminders}
          onEntryCreated={handleEntryCreated}
        />
      ),
    },
    {
      id: 'cat_companion',
      render: () => (
        <div className="rounded-3xl border border-[var(--app-companion-border)] bg-[var(--app-companion-bg)] p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--app-text)]">Compagno del giorno</p>
              <p className="text-[11px] font-medium text-[var(--app-accent-text)]">
                {dailyQuote.category} · {dailyQuote.themeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuoteOffset(getNextManualQuoteIndex())}
              aria-label="Mostra un'altra frase del giorno"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[var(--app-accent-soft-border)] bg-[var(--app-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--app-text-muted)] hover:border-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3 w-3 text-[var(--app-accent)]" aria-hidden="true" />
              Altra frase
            </button>
          </div>

          <div className="flex items-start gap-3.5">
            <CatIllustration
              src={companionNeko.src}
              alt={companionNeko.alt}
              className="h-24 w-24 rounded-2xl object-cover border-2 border-[var(--app-border)] bg-white shrink-0"
            />
            <div className="min-w-0 flex-1">
              <blockquote className="text-xs sm:text-[13px] text-[var(--app-text)] leading-relaxed font-medium">
                “{dailyQuote.text}”
              </blockquote>
              {dailyQuote.author && (
                <p className="mt-1 text-[11px] font-semibold text-[var(--app-text-subtle)]">
                  — {dailyQuote.author}
                </p>
              )}
              <p className="mt-2 font-mono text-[11px] font-semibold text-[var(--app-accent-text)] tabular-nums">
                {dailyNotes.reduce((acc, d) => acc + d.entries.length, 0)} appunti totali salvati
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'quick_pinned',
      render: () => (
        <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
              <Pin className="h-4 w-4 text-[var(--app-accent)] fill-current" aria-hidden="true" />
              Giornate appuntate
            </h2>
            <span className="font-mono text-xs text-[var(--app-text-subtle)] tabular-nums">
              {pinnedDailyNotes.length}
            </span>
          </div>

          {pinnedDailyNotes.length === 0 ? (
            <p className="mt-2.5 text-xs text-[var(--app-text-muted)] leading-relaxed">
              Tocca l’icona spillo su una nota giornaliera per tenerla sempre in evidenza qui.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {pinnedDailyNotes.slice(0, 3).map((dayNote) => (
                <DailyNoteCard
                  key={`sidebar-pin-${dayNote.id}`}
                  dailyNote={dayNote}
                  compact
                  colorFilter={colorFilter}
                  searchQuery={searchQuery}
                  onSelectEntry={handleSelectEntry}
                  onTogglePinDay={handleTogglePinDay}
                  onUpdateDayTitle={handleUpdateDayTitle}
                  onChangeEntryColor={handleChangeEntryColor}
                />
              ))}
              {pinnedDailyNotes.length > 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setDesktopSection('pinned');
                    setMobileTab('pinned');
                    setTodoSubMenuOpen(false);
                  }}
                  className="w-full py-2 text-xs font-semibold text-[var(--app-accent-text)] hover:opacity-80"
                >
                  Vedi tutte ({pinnedDailyNotes.length})
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'pwa_install',
      render: () => (
        <div className="flex justify-start">
          <PWAInstallButton />
        </div>
      ),
    },
  ];

  const pinnedBlocks: CustomizableBlockItem[] = [
    {
      id: 'pinned_summary',
      render: () => (
        <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <CatIllustration
              src={pinnedNeko.src}
              alt={pinnedNeko.alt}
              className="h-14 w-14 rounded-2xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)] shrink-0"
            />
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-bold text-[var(--app-text)] truncate">
                <Pin className="h-4 w-4 text-[var(--app-accent)] fill-current shrink-0" aria-hidden="true" />
                Giornate appuntate
              </h2>
              <p className="text-xs text-[var(--app-text-muted)]">
                {pinnedDailyNotes.length}{' '}
                {pinnedDailyNotes.length === 1 ? 'giornata fissata' : 'giornate fissate'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => selectDesktopAgendaMode(agendaMode)}
            className="text-xs font-semibold text-[var(--app-accent-text)] hover:underline whitespace-nowrap"
          >
            Torna all’agenda
          </button>
        </div>
      ),
    },
    {
      id: 'pinned_list',
      render: () =>
        pinnedDailyNotes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--app-accent-soft-border)] bg-[var(--app-card)] p-8 text-center">
            <CatIllustration
              src={pinnedNeko.src}
              alt={pinnedNeko.alt}
              className="mx-auto h-32 w-32 rounded-3xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)]"
            />
            <h3 className="mt-3 text-sm font-bold text-[var(--app-text)]">
              Nessuna giornata appuntata
            </h3>
            <p className="mt-1 text-xs text-[var(--app-text-muted)] max-w-xs mx-auto leading-relaxed">
              Usa l’icona spillo su qualsiasi nota giornaliera per aggiungerla qui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pinnedDailyNotes.map((dayNote) => (
              <DailyNoteCard
                key={dayNote.id}
                dailyNote={dayNote}
                colorFilter={colorFilter}
                searchQuery={searchQuery}
                onSelectEntry={handleSelectEntry}
                onTogglePinDay={handleTogglePinDay}
                onUpdateDayTitle={handleUpdateDayTitle}
                onChangeEntryColor={handleChangeEntryColor}
                onGenerateDailySummary={handleGenerateDailySummary}
              />
            ))}
          </div>
        ),
    },
  ];



  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] pb-20 lg:pb-10 transition-colors">
      {/* Desktop Top Bar (Strict 3-zone contract) */}
      <header className="hidden lg:block sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-header-bg)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 xl:gap-5 px-3 xl:px-6">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#recorder"
            onClick={(e) => {
              e.preventDefault();
              setMobileTab('record');
              setTodoSubMenuOpen(false);
              document.getElementById('recorder')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-base xl:text-lg font-bold tracking-tight text-[var(--app-text)] whitespace-nowrap shrink-0"
          >
            MicioMiao
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav aria-label="Viste agenda" className="flex items-center gap-2 xl:gap-4 text-[11.5px] xl:text-[13px] font-medium">
            <button
              type="button"
              onClick={() => selectDesktopAgendaMode('day')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'day'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Giornaliera
            </button>
            <button
              type="button"
              onClick={() => selectDesktopAgendaMode('week')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'week'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Settimanale
            </button>
            <button
              type="button"
              onClick={() => selectDesktopAgendaMode('month')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'month'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Mensile
            </button>
            <button
              type="button"
              onClick={() => {
                setDesktopSection('stats');
                setMobileTab('stats');
                setTodoSubMenuOpen(false);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'stats'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Statistiche
            </button>
            <button
              type="button"
              onClick={() => {
                setDesktopSection('pinned');
                setMobileTab('pinned');
                setTodoSubMenuOpen(false);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'pinned'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Appuntate
            </button>
            <button
              type="button"
              onClick={() => {
                setDesktopSection('reminders');
                setMobileTab('reminders');
                setTodoSubMenuOpen(false);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'reminders'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Promemoria
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                aria-expanded={todoSubMenuOpen && desktopSection === 'todo'}
                onClick={() => {
                  if (desktopSection !== 'todo') {
                    setTodoSubTab('organizza');
                    setOrganizeFocusTodayKey((k) => k + 1);
                    setDesktopSection('todo');
                    setMobileTab('todo');
                    setTodoSubMenuOpen(false);
                  } else {
                    setTodoSubMenuOpen((prev) => !prev);
                  }
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  desktopSection === 'todo'
                    ? 'border-[var(--todo-accent)] text-[var(--todo-text)] font-semibold'
                    : 'border-transparent text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]'
                }`}
              >
                Da fare giornaliero
              </button>

              {todoSubMenuOpen && desktopSection === 'todo' && (
                <div
                  role="menu"
                  aria-label="Sottosezioni Da fare giornaliero"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 flex items-center gap-1 rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-card)]/95 backdrop-blur-md p-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTodoSubTab('da_fare');
                      setDesktopSection('todo');
                      setMobileTab('todo');
                      setTodoSubMenuOpen(false);
                    }}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      todoSubTab === 'da_fare'
                        ? 'bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] text-white shadow-xs'
                        : 'text-[var(--todo-text)] hover:bg-[var(--todo-surface-alt)]'
                    }`}
                  >
                    Da Fare
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTodoSubTab('organizza');
                      setOrganizeFocusTodayKey((k) => k + 1);
                      setDesktopSection('todo');
                      setMobileTab('todo');
                      setTodoSubMenuOpen(false);
                    }}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      todoSubTab === 'organizza'
                        ? 'bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] text-white shadow-xs'
                        : 'text-[var(--todo-text)] hover:bg-[var(--todo-surface-alt)]'
                    }`}
                  >
                    Organizza
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setDesktopSection('settings');
                setMobileTab('settings');
                setTodoSubMenuOpen(false);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'settings'
                  ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Impostazioni
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => handleCreateBlankEntry(selectedDate)}
              className="inline-flex min-h-[38px] xl:min-h-[40px] items-center gap-1.5 rounded-xl bg-[var(--app-btn-bg)] px-3 xl:px-4 py-2 text-[11.5px] xl:text-xs font-semibold text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 text-[var(--app-accent)]" aria-hidden="true" />
              <span className="hidden xl:inline">Nuovo appunto</span>
              <span className="xl:hidden">Nuovo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Sticky Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-header-bg)] backdrop-blur-md pt-safe">
        <div className="flex h-11 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <CatIllustration
              src={CHIBI_CAT_MASCOTS.mic.src}
              alt={CHIBI_CAT_MASCOTS.mic.alt}
              className="h-7 w-7 rounded-lg object-cover border border-[var(--app-border)] bg-[var(--app-companion-bg)] shrink-0"
            />
            <span className="text-base font-bold tracking-tight text-[var(--app-text)] whitespace-nowrap shrink-0">
              MicioMiao
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCreateBlankEntry(selectedDate)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--app-accent-text)] hover:bg-[var(--app-accent-soft)] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Scrivi
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace (supports horizontal swipe navigation across sections) */}
      <main
        id="top"
        onTouchStart={handleWorkspaceTouchStart}
        onTouchEnd={handleWorkspaceTouchEnd}
        onTouchCancel={() => {
          swipeStartRef.current = null;
        }}
        className="mx-auto max-w-7xl min-h-[calc(100dvh-7.5rem)] px-4 sm:px-6 py-4 sm:py-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Studio Column: Customizable Sidebar Blocks (Landing screen on Mobile!) */}
          <aside
            className={`min-w-0 lg:col-span-4 lg:sticky lg:top-22 ${
              mobileTab === 'record' ? 'block' : 'hidden lg:block'
            }`}
          >
            <CustomizableSectionStack
              section="sidebar"
              layout={layouts.sidebar}
              blocks={sidebarBlocks}
              onChangeLayout={handleChangeLayout}
              onResetSection={handleResetLayout}
              compactToolbar
              className="space-y-4"
            />
          </aside>

          {/* Right Main Workspace: Agenda Views / Stats / Pinned / Reminders / Settings */}
          <div
            className={`min-w-0 lg:col-span-8 space-y-4 ${
              mobileTab !== 'record' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Workspace Search & Color Filter Toolbar (shown for Agenda & Pinned views) */}
            {!showStatsView && !showRemindersView && !showTodoView && !showSettingsView && (
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 sm:p-4 space-y-3 shadow-xs">
                <QuotaStatusBar />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {showPinnedView && (
                    <p className="text-xs font-semibold text-[var(--app-text-muted)] px-1">
                      Filtro rapido sulle giornate appuntate
                    </p>
                  )}

                  {/* Search Input */}
                  <div className={`relative flex-1 ${showPinnedView ? 'sm:max-w-xs' : ''}`}>
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-subtle)]"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca nelle note e negli stati..."
                      aria-label="Cerca nelle note"
                      className="w-full min-h-[40px] rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-bg)] pl-9 pr-8 py-1.5 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Cancella ricerca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--app-text-subtle)] hover:text-[var(--app-text)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 5-Color Highlight Filter Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setColorFilter('all')}
                    aria-pressed={colorFilter === 'all'}
                    className={`min-h-[34px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      colorFilter === 'all'
                        ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                        : 'border-[var(--app-border-soft)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
                    }`}
                  >
                    Tutti i colori
                  </button>
                  {NOTE_COLOR_LIST.map((col) => {
                    const active = colorFilter === col.key;
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => setColorFilter(col.key)}
                        aria-pressed={active}
                        className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                            : 'border-[var(--app-border-soft)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full border shrink-0 ${col.swatchClass}`}
                          aria-hidden="true"
                        />
                        <span>{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active View Content */}
            {showSettingsView ? (
              <SettingsView
                dailyNotes={dailyNotes}
                todoItems={todoItems}
                organizeItems={organizeItems}
                layouts={layouts}
                settings={settings}
                sectionLayout={layouts.settings}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onResetAllLayouts={handleResetAllLayouts}
                onUpdateSettings={handleUpdateSettings}
                onApplyRestoredBackup={handleApplyRestoredBackup}
                onDeleteAllSavedAudio={handleDeleteAllSavedAudio}
                onNotify={setToastMessage}
              />
            ) : showTodoView ? (
              <DailyTodoSection
                subTab={todoSubTab}
                focusTodaySignal={organizeFocusTodayKey}
                dailyNotes={dailyNotes}
                todoItems={todoItems}
                organizeItems={organizeItems}
                todoLayout={layouts.todo_list}
                organizeLayout={layouts.organize}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onSetTodoItems={setTodoItems}
                onSetOrganizeItems={setOrganizeItems}
                onNotify={setToastMessage}
              />
            ) : showRemindersView ? (
              <RemindersView
                dailyNotes={dailyNotes}
                sectionLayout={layouts.reminders}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onOpenNoteInAgenda={handleOpenNoteInAgenda}
                onDismissReminder={handleDismissReminder}
              />
            ) : showStatsView ? (
              <StatsAndChartsView
                dailyNotes={dailyNotes}
                sectionLayout={layouts.stats}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onSelectDateAndOpenAgenda={(isoDate) => {
                  setSelectedDate(isoDate);
                  selectDesktopAgendaMode('day');
                }}
                onCreateBlankEntry={handleCreateBlankEntry}
              />
            ) : showPinnedView ? (
              <CustomizableSectionStack
                section="pinned"
                layout={layouts.pinned}
                blocks={pinnedBlocks}
                onChangeLayout={handleChangeLayout}
                onResetSection={handleResetLayout}
                className="space-y-4"
              />
            ) : agendaMode === 'day' ? (
              <DailyAgendaView
                dailyNotes={filteredDailyNotes}
                selectedDate={selectedDate}
                agendaMode={agendaMode}
                colorFilter={colorFilter}
                searchQuery={searchQuery}
                defaultZoomLevel={settings.defaultAgendaZoom}
                highlightedEntryId={highlightedEntryId}
                sectionLayout={layouts.daily}
                onChangeAgendaMode={selectDesktopAgendaMode}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onSelectDate={setSelectedDate}
                onSelectEntry={handleSelectEntry}
                onTogglePinDay={handleTogglePinDay}
                onUpdateDayTitle={handleUpdateDayTitle}
                onChangeEntryColor={handleChangeEntryColor}
                onGenerateDailySummary={handleGenerateDailySummary}
                onCreateBlankEntry={handleCreateBlankEntry}
              />
            ) : agendaMode === 'week' ? (
              <WeeklyAgendaView
                dailyNotes={filteredDailyNotes}
                selectedDate={selectedDate}
                agendaMode={agendaMode}
                colorFilter={colorFilter}
                searchQuery={searchQuery}
                defaultZoomLevel={settings.defaultAgendaZoom}
                highlightedEntryId={highlightedEntryId}
                sectionLayout={layouts.weekly}
                onChangeAgendaMode={selectDesktopAgendaMode}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onSelectDate={setSelectedDate}
                onSelectEntry={handleSelectEntry}
                onTogglePinDay={handleTogglePinDay}
                onUpdateDayTitle={handleUpdateDayTitle}
                onChangeEntryColor={handleChangeEntryColor}
                onGenerateDailySummary={handleGenerateDailySummary}
                onCreateBlankEntry={handleCreateBlankEntry}
              />
            ) : (
              <MonthlyAgendaView
                dailyNotes={filteredDailyNotes}
                selectedDate={selectedDate}
                agendaMode={agendaMode}
                colorFilter={colorFilter}
                searchQuery={searchQuery}
                defaultZoomLevel={settings.defaultAgendaZoom}
                highlightedEntryId={highlightedEntryId}
                sectionLayout={layouts.monthly}
                onChangeAgendaMode={selectDesktopAgendaMode}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onSelectDate={setSelectedDate}
                onSelectEntry={handleSelectEntry}
                onTogglePinDay={handleTogglePinDay}
                onUpdateDayTitle={handleUpdateDayTitle}
                onChangeEntryColor={handleChangeEntryColor}
                onGenerateDailySummary={handleGenerateDailySummary}
                onCreateBlankEntry={handleCreateBlankEntry}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Navigazione principale mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--app-border)] bg-[var(--app-header-bg)] backdrop-blur-md pb-safe"
      >
        <div className="flex h-[54px] items-stretch justify-between px-1">
          <button
            type="button"
            onClick={() => {
              setMobileTab('record');
              setTodoSubMenuOpen(false);
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'record'
                ? 'text-[var(--app-accent-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Mic className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
              Nuovo
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (mobileTab !== 'agenda' && agendaMode === 'week') {
                setSelectedDate(getAgendaDefaultDateISO());
              }
              setMobileTab('agenda');
              setTodoSubMenuOpen(false);
              if (
                desktopSection === 'stats' ||
                desktopSection === 'pinned' ||
                desktopSection === 'reminders' ||
                desktopSection === 'todo' ||
                desktopSection === 'settings'
              ) {
                setDesktopSection(agendaMode);
              }
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'agenda'
                ? 'text-[var(--app-accent-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            {agendaMode === 'month' ? (
              <CalendarDays className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            ) : (
              <Calendar className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            )}
            <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
              Agenda
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab('stats');
              setDesktopSection('stats');
              setTodoSubMenuOpen(false);
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'stats'
                ? 'text-[var(--app-accent-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <BarChart3 className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
              Statistiche
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab('pinned');
              setDesktopSection('pinned');
              setTodoSubMenuOpen(false);
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'pinned'
                ? 'text-[var(--app-accent-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Pin className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
              Appuntate
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab('reminders');
              setDesktopSection('reminders');
              setTodoSubMenuOpen(false);
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'reminders'
                ? 'text-[var(--app-accent-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Bell className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
              Promemoria
            </span>
          </button>

          <div className="relative flex flex-auto items-stretch">
            {todoSubMenuOpen && mobileTab === 'todo' && (
              <div
                role="menu"
                aria-label="Sottosezioni Da fare giornaliero"
                className="absolute bottom-full right-0 mb-2 z-50 flex items-center gap-1 rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-card)]/95 backdrop-blur-md p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTodoSubTab('da_fare');
                    setMobileTab('todo');
                    setDesktopSection('todo');
                    setTodoSubMenuOpen(false);
                  }}
                  className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold transition-colors whitespace-nowrap ${
                    todoSubTab === 'da_fare'
                      ? 'bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] text-white shadow-xs'
                      : 'text-[var(--todo-text)] hover:bg-[var(--todo-surface-alt)]'
                  }`}
                >
                  Da Fare
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTodoSubTab('organizza');
                    setOrganizeFocusTodayKey((k) => k + 1);
                    setMobileTab('todo');
                    setDesktopSection('todo');
                    setTodoSubMenuOpen(false);
                  }}
                  className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold transition-colors whitespace-nowrap ${
                    todoSubTab === 'organizza'
                      ? 'bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] text-white shadow-xs'
                      : 'text-[var(--todo-text)] hover:bg-[var(--todo-surface-alt)]'
                  }`}
                >
                  Organizza
                </button>
              </div>
            )}

            <button
              type="button"
              aria-label="Da fare giornaliero"
              aria-expanded={todoSubMenuOpen && mobileTab === 'todo'}
              onClick={() => {
                if (mobileTab !== 'todo') {
                  setTodoSubTab('organizza');
                  setOrganizeFocusTodayKey((k) => k + 1);
                  setMobileTab('todo');
                  setDesktopSection('todo');
                  setTodoSubMenuOpen(false);
                } else {
                  setTodoSubMenuOpen((prev) => !prev);
                }
              }}
              className={`flex w-full flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
                mobileTab === 'todo'
                  ? 'text-[var(--todo-accent)] font-semibold'
                  : 'text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]'
              }`}
            >
              <CheckSquare className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
              <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
                Da fare
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileTab('settings');
              setDesktopSection('settings');
              setTodoSubMenuOpen(false);
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'settings'
                ? 'text-[var(--app-accent-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Settings className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            <span className="text-[8.5px] sm:text-[10px] leading-none font-medium tracking-tight whitespace-nowrap">
              Impostazioni
            </span>
          </button>
        </div>
      </nav>

      {/* Toast Confirmation */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed right-4 z-40 rounded-xl bg-[var(--app-btn-bg)] px-4 py-2.5 text-xs font-medium text-[var(--app-btn-text)] shadow-lg ${
            showTodoView
              ? 'bottom-[calc(116px+env(safe-area-inset-bottom,0px))] lg:bottom-20'
              : 'bottom-[calc(62px+env(safe-area-inset-bottom,0px))] lg:bottom-6'
          }`}
        >
          {toastMessage}
        </div>
      )}

      {/* Entry Editor Modal / Bottom Sheet */}
      {editingTarget && (
        <NoteEditorModal
          dailyNote={editingTarget.dailyNote}
          entry={editingTarget.entry}
          autoExtractReminders={settings.autoExtractReminders}
          onClose={() => setEditingTarget(null)}
          onSaveEntry={handleSaveEntry}
          onDeleteEntry={handleDeleteEntry}
          onDeleteAudio={handleDeleteEntryAudio}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
