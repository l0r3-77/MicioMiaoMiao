import React, { useEffect, useMemo, useState } from 'react';
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
import { StandaloneIPhoneWidgetView } from './components/IPhoneWidgetStudio';
import { DailyNoteCard } from './components/NoteCard';
import { NoteEditorModal } from './components/NoteEditorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QuotaStatusBar } from './components/QuotaStatusBar';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { StatsAndChartsView } from './components/StatsAndChartsView';
import { VoiceRecorderPanel } from './components/VoiceRecorderPanel';
import type {
  OrganizeNoteItem,
  TodoNoteItem,
  WidgetConfig,
  WidgetSizePreset,
  WidgetSourceKey,
} from './types/dailyTodo';
import type { AgendaViewMode, DailyNote, NoteColor, NoteEntry } from './types/note';
import { loadAppSettings, saveAppSettings, type AppSettings } from './utils/appSettings';
import { deleteAudioClip } from './utils/audioStorage';
import {
  loadOrganizeItems,
  loadTodoItems,
  loadWidgetConfig,
  saveOrganizeItems,
  saveTodoItems,
  saveWidgetConfig,
  syncWidgetSnapshotToServer,
} from './utils/dailyTodoStorage';
import {
  mergeDailyNotesFromBackup,
  restoreAudioClipsFromBackup,
  type AgendaVoceBackupPayload,
} from './utils/backupService';
import { formatItalianDateShort, getCurrentTimeHHMM, toISODate } from './utils/dateUtils';
import {
  createDefaultAllLayouts,
  createDefaultSectionLayout,
  loadAllLayoutPreferences,
  saveAllLayoutPreferences,
  type AllLayoutPreferences,
  type LayoutSectionKey,
  type SectionLayoutState,
} from './utils/layoutPreferences';
import { getCompanionQuoteForDate } from './utils/dailyCompanionQuotes';
import { NOTE_COLOR_LIST, NOTE_COLORS, VALID_NOTE_COLORS } from './utils/noteColors';
import { CHIBI_CAT_MASCOTS } from './utils/nekoCatalog';
import { publishQuotaSnapshot } from './utils/quotaTracker';
import { extractRemindersLocally } from './utils/reminderExtractor';

const STORAGE_KEY = 'agendavoce_daily_notes_v2';
const LEGACY_STORAGE_KEY = 'agendavoce_notes_v1';

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

  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => {
            const date = typeof item.date === 'string' && item.date ? item.date : today;
            const entries = Array.isArray(item.entries)
              ? item.entries
                  .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
                  .map((e) => sanitizeEntry(e, nowIso))
                  .sort((a, b) => a.time.localeCompare(b.time))
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
    }

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
        return Array.from(grouped.values()).map((dn) => ({
          ...dn,
          entries: dn.entries.sort((a, b) => a.time.localeCompare(b.time)),
        }));
      }
    }
  } catch {
    return [];
  }

  return [];
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
      return { isWidget: false, section: null as string | null, source: null as WidgetSourceKey | null, size: null as WidgetSizePreset | null };
    }
    const params = new URLSearchParams(window.location.search);
    const rawSource = params.get('source');
    const validSource: WidgetSourceKey | null =
      rawSource === 'today' ||
      rawSource === 'poi' ||
      rawSource === 'svaghi' ||
      rawSource === 'bollette' ||
      rawSource === 'poi_poi'
        ? rawSource
        : null;
    const rawSize = params.get('size');
    const validSize: WidgetSizePreset | null =
      rawSize === 'small' || rawSize === 'medium' || rawSize === 'large' ? rawSize : null;
    return {
      isWidget: params.get('widget') === '1',
      section: params.get('section'),
      source: validSource,
      size: validSize,
    };
  }, []);

  const [isWidgetStandalone, setIsWidgetStandalone] = useState(initialUrlParams.isWidget);
  const [standaloneSource, setStandaloneSource] = useState<WidgetSourceKey | null>(
    initialUrlParams.source
  );
  const [standaloneSize, setStandaloneSize] = useState<WidgetSizePreset | null>(
    initialUrlParams.size
  );
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>(loadStoredDailyNotes);
  const [todoItems, setTodoItems] = useState<TodoNoteItem[]>(loadTodoItems);
  const [organizeItems, setOrganizeItems] = useState<OrganizeNoteItem[]>(loadOrganizeItems);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(loadWidgetConfig);
  const [widgetSyncStatus, setWidgetSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');
  const [widgetLastSyncedAt, setWidgetLastSyncedAt] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));
  const [agendaMode, setAgendaMode] = useState<AgendaViewMode>('day');
  const [desktopSection, setDesktopSection] = useState<DesktopSection>(
    initialUrlParams.section === 'todo' ? 'todo' : 'day'
  );
  // Land directly on the Record / Write New Note section on launch (unless deep-linked)
  const [mobileTab, setMobileTab] = useState<MobileTab>(
    initialUrlParams.section === 'todo' ? 'todo' : 'record'
  );
  const [todoSubTab, setTodoSubTab] = useState<TodoSubTab>('da_fare');
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
  const [quoteOffset, setQuoteOffset] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  useEffect(() => {
    saveWidgetConfig(widgetConfig);
  }, [widgetConfig]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setWidgetSyncStatus('syncing');
      const ok = await syncWidgetSnapshotToServer(
        widgetConfig.token,
        todoItems,
        organizeItems
      );
      if (cancelled) return;
      if (ok) {
        setWidgetSyncStatus('synced');
        setWidgetLastSyncedAt(getCurrentTimeHHMM());
      } else {
        setWidgetSyncStatus('error');
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [widgetConfig.token, todoItems, organizeItems]);

  useEffect(() => {
    saveAllLayoutPreferences(layouts);
  }, [layouts]);

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeSource = standaloneSource || widgetConfig.source;
    const titleSuffixMap: Record<WidgetSourceKey, string> = {
      today: 'Oggi',
      poi: 'Poi',
      svaghi: 'Svaghi',
      bollette: 'Bollette e pagamenti',
      poi_poi: 'Poi poi',
    };
    const nextTitle = isWidgetStandalone
      ? `MicioMiao Widget · ${titleSuffixMap[activeSource]}`
      : 'MicioMiao — Note Vocali & Agenda iOS';
    document.title = nextTitle;

    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute(
        'content',
        isWidgetStandalone ? `MicioMiao · ${titleSuffixMap[activeSource]}` : 'MicioMiao'
      );
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isWidgetStandalone ? '#CCF3EC' : '#FAF7F0');
    }
  }, [isWidgetStandalone, standaloneSource, widgetConfig.source]);

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
                entries: [...dn.entries, entry].sort((a, b) => a.time.localeCompare(b.time)),
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
                  ).sort((a, b) => a.time.localeCompare(b.time)),
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
                  a.time.localeCompare(b.time)
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
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((e) => `[${e.time}] ${e.transcript || '(Solo audio senza testo)'}`)
      .join('\n');

    if (!combinedText.trim()) return;

    try {
      const res = await fetch('/api/notes/summarize-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText, isDailyOverview: true }),
      });
      const raw = await res.text();
      let data: { bullets?: unknown; quota?: unknown; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw };
      }
      if (data?.quota) {
        publishQuotaSnapshot(data.quota);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Impossibile generare la sintesi del giorno.');
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
      if (payload.widgetConfig) {
        setWidgetConfig(payload.widgetConfig);
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

  const handleForceSyncWidget = async () => {
    setWidgetSyncStatus('syncing');
    const ok = await syncWidgetSnapshotToServer(
      widgetConfig.token,
      todoItems,
      organizeItems
    );
    if (ok) {
      setWidgetSyncStatus('synced');
      setWidgetLastSyncedAt(getCurrentTimeHHMM());
      setToastMessage('Widget iPhone sincronizzato');
    } else {
      setWidgetSyncStatus('error');
      setToastMessage('Impossibile sincronizzare il widget in questo momento');
    }
  };

  const handleChangeWidgetConfig = (patch: Partial<WidgetConfig>) => {
    setWidgetConfig((prev) => ({ ...prev, ...patch }));
  };

  const selectDesktopAgendaMode = (mode: AgendaViewMode) => {
    setAgendaMode(mode);
    setDesktopSection(mode);
    setMobileTab('agenda');
    setTodoSubMenuOpen(false);
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
        <div className="rounded-3xl border border-purple-200/80 bg-[#FAF5E8] p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900">Compagno del giorno</p>
              <p className="text-[11px] font-medium text-purple-800">
                {dailyQuote.category} · {dailyQuote.themeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuoteOffset((prev) => prev + 1)}
              aria-label="Mostra un'altra frase del giorno"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-purple-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:border-purple-300 hover:text-stone-900 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3 w-3 text-purple-700" aria-hidden="true" />
              Altra frase
            </button>
          </div>

          <div className="flex items-start gap-3.5">
            <CatIllustration
              src={companionNeko.src}
              alt={companionNeko.alt}
              className="h-24 w-24 rounded-2xl object-cover border-2 border-stone-900/15 bg-white shrink-0"
            />
            <div className="min-w-0 flex-1">
              <blockquote className="text-xs sm:text-[13px] text-stone-800 leading-relaxed font-medium">
                “{dailyQuote.text}”
              </blockquote>
              {dailyQuote.author && (
                <p className="mt-1 text-[11px] font-semibold text-stone-500">
                  — {dailyQuote.author}
                </p>
              )}
              <p className="mt-2 font-mono text-[11px] font-semibold text-purple-800 tabular-nums">
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
        <div className="rounded-3xl border border-stone-900/12 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
              <Pin className="h-4 w-4 text-purple-700 fill-current" aria-hidden="true" />
              Giornate appuntate
            </h2>
            <span className="font-mono text-xs text-stone-400 tabular-nums">
              {pinnedDailyNotes.length}
            </span>
          </div>

          {pinnedDailyNotes.length === 0 ? (
            <p className="mt-2.5 text-xs text-stone-500 leading-relaxed">
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
                  className="w-full py-2 text-xs font-semibold text-purple-800 hover:text-purple-950"
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
        <div className="rounded-3xl border border-stone-900/12 bg-white p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <CatIllustration
              src={pinnedNeko.src}
              alt={pinnedNeko.alt}
              className="h-14 w-14 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
            />
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-bold text-stone-900 truncate">
                <Pin className="h-4 w-4 text-purple-700 fill-current shrink-0" aria-hidden="true" />
                Giornate appuntate
              </h2>
              <p className="text-xs text-stone-500">
                {pinnedDailyNotes.length}{' '}
                {pinnedDailyNotes.length === 1 ? 'giornata fissata' : 'giornate fissate'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => selectDesktopAgendaMode(agendaMode)}
            className="text-xs font-semibold text-purple-700 hover:underline whitespace-nowrap"
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
          <div className="rounded-3xl border border-dashed border-purple-300/80 bg-white/90 p-8 text-center">
            <CatIllustration
              src={pinnedNeko.src}
              alt={pinnedNeko.alt}
              className="mx-auto h-32 w-32 rounded-3xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8]"
            />
            <h3 className="mt-3 text-sm font-bold text-stone-900">
              Nessuna giornata appuntata
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
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

  if (isWidgetStandalone) {
    const activeWidgetSource = standaloneSource || widgetConfig.source;
    const activeWidgetSize = standaloneSize || widgetConfig.size;
    return (
      <StandaloneIPhoneWidgetView
        source={activeWidgetSource}
        size={activeWidgetSize}
        todoItems={todoItems}
        organizeItems={organizeItems}
        onToggleTodoDone={(id) =>
          setTodoItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, done: !item.done, updatedAt: new Date().toISOString() }
                : item
            )
          )
        }
        onToggleOrganizeDone={(id) =>
          setOrganizeItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, done: !item.done, updatedAt: new Date().toISOString() }
                : item
            )
          )
        }
        onOpenFullApp={() => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/?section=todo');
          }
          setDesktopSection('todo');
          setMobileTab('todo');
          setTodoSubTab(activeWidgetSource === 'today' ? 'organizza' : 'da_fare');
          setStandaloneSource(null);
          setStandaloneSize(null);
          setIsWidgetStandalone(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-stone-900 pb-20 lg:pb-10">
      {/* Desktop Top Bar (Strict 3-zone contract) */}
      <header className="hidden lg:block sticky top-0 z-30 border-b border-stone-900/10 bg-[#FAF7F0]/90 backdrop-blur-md">
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
            className="text-base xl:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
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
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              Giornaliera
            </button>
            <button
              type="button"
              onClick={() => selectDesktopAgendaMode('week')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'week'
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              Settimanale
            </button>
            <button
              type="button"
              onClick={() => selectDesktopAgendaMode('month')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                desktopSection === 'month'
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
                    setDesktopSection('todo');
                    setMobileTab('todo');
                    setTodoSubMenuOpen(true);
                  } else {
                    setTodoSubMenuOpen((prev) => !prev);
                  }
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  desktopSection === 'todo'
                    ? 'border-[#0D8A7E] text-[#083B37] font-semibold'
                    : 'border-transparent text-[#0E645D] hover:text-[#083B37]'
                }`}
              >
                Da fare giornaliero
              </button>

              {todoSubMenuOpen && desktopSection === 'todo' && (
                <div
                  role="menu"
                  aria-label="Sottosezioni Da fare giornaliero"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 flex items-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC]/95 backdrop-blur-md p-1 shadow-lg"
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
                        ? 'bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] text-white shadow-xs'
                        : 'text-[#0B4F49] hover:bg-[#E5F9F4]'
                    }`}
                  >
                    Da Fare
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTodoSubTab('organizza');
                      setDesktopSection('todo');
                      setMobileTab('todo');
                      setTodoSubMenuOpen(false);
                    }}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      todoSubTab === 'organizza'
                        ? 'bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] text-white shadow-xs'
                        : 'text-[#0B4F49] hover:bg-[#E5F9F4]'
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
                  ? 'border-purple-600 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
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
              className="inline-flex min-h-[38px] xl:min-h-[40px] items-center gap-1.5 rounded-xl bg-stone-900 px-3 xl:px-4 py-2 text-[11.5px] xl:text-xs font-semibold text-white hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 text-purple-300" aria-hidden="true" />
              <span className="hidden xl:inline">Nuovo appunto</span>
              <span className="xl:hidden">Nuovo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Sticky Top Bar (44px, under 15% cap with bottom nav) */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-stone-900/10 bg-[#FAF7F0]/92 backdrop-blur-md pt-safe">
        <div className="flex h-11 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <CatIllustration
              src={CHIBI_CAT_MASCOTS.mic.src}
              alt={CHIBI_CAT_MASCOTS.mic.alt}
              className="h-7 w-7 rounded-lg object-cover border border-stone-900/15 bg-[#FAF5E8] shrink-0"
            />
            <span className="text-base font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0">
              MicioMiao
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCreateBlankEntry(selectedDate)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-purple-800 hover:bg-purple-100/60 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Scrivi
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main id="top" className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
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
              <div className="rounded-3xl border border-stone-900/12 bg-white p-3 sm:p-4 space-y-3 shadow-xs">
                <QuotaStatusBar />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {showPinnedView && (
                    <p className="text-xs font-semibold text-stone-700 px-1">
                      Filtro rapido sulle giornate appuntate
                    </p>
                  )}

                  {/* Search Input */}
                  <div className={`relative flex-1 ${showPinnedView ? 'sm:max-w-xs' : ''}`}>
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca nelle note e negli stati..."
                      aria-label="Cerca nelle note"
                      className="w-full min-h-[40px] rounded-xl border border-stone-200 bg-[#FAF7F0] pl-9 pr-8 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-purple-500 focus:bg-white focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Cancella ricerca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
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
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-purple-300'
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
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-purple-300'
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
                widgetConfig={widgetConfig}
                layouts={layouts}
                settings={settings}
                sectionLayout={layouts.settings}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onResetAllLayouts={handleResetAllLayouts}
                onUpdateSettings={handleUpdateSettings}
                onApplyRestoredBackup={handleApplyRestoredBackup}
                onNotify={setToastMessage}
              />
            ) : showTodoView ? (
              <DailyTodoSection
                subTab={todoSubTab}
                dailyNotes={dailyNotes}
                todoItems={todoItems}
                organizeItems={organizeItems}
                todoLayout={layouts.todo_list}
                organizeLayout={layouts.organize}
                widgetConfig={widgetConfig}
                widgetSyncStatus={widgetSyncStatus}
                widgetLastSyncedAt={widgetLastSyncedAt}
                onChangeLayout={handleChangeLayout}
                onResetLayout={handleResetLayout}
                onSetTodoItems={setTodoItems}
                onSetOrganizeItems={setOrganizeItems}
                onChangeWidgetConfig={handleChangeWidgetConfig}
                onForceSyncWidget={handleForceSyncWidget}
                onActivateDirectWidgetMode={() => {
                  if (typeof window !== 'undefined') {
                    const nextUrl = `/?widget=1&token=${encodeURIComponent(
                      widgetConfig.token
                    )}&source=${encodeURIComponent(widgetConfig.source)}&size=${encodeURIComponent(
                      widgetConfig.size
                    )}`;
                    window.history.pushState({}, '', nextUrl);
                  }
                  setStandaloneSource(widgetConfig.source);
                  setStandaloneSize(widgetConfig.size);
                  handleForceSyncWidget();
                  setIsWidgetStandalone(true);
                }}
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

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics, Proportional sizing so all labels read completely) */}
      <nav
        aria-label="Navigazione principale mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-stone-900/10 bg-[#FAF7F0]/95 backdrop-blur-md pb-safe"
      >
        <div className="flex h-[54px] items-stretch justify-between px-1">
          <button
            type="button"
            onClick={() => {
              setMobileTab('record');
              setTodoSubMenuOpen(false);
            }}
            className={`flex flex-auto flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
              mobileTab === 'record' ? 'text-purple-800 font-semibold' : 'text-stone-500 hover:text-stone-900'
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
              mobileTab === 'agenda' ? 'text-purple-800 font-semibold' : 'text-stone-500 hover:text-stone-900'
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
              mobileTab === 'stats' ? 'text-purple-800 font-semibold' : 'text-stone-500 hover:text-stone-900'
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
              mobileTab === 'pinned' ? 'text-purple-800 font-semibold' : 'text-stone-500 hover:text-stone-900'
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
              mobileTab === 'reminders' ? 'text-purple-800 font-semibold' : 'text-stone-500 hover:text-stone-900'
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
                className="absolute bottom-full right-0 mb-2 z-50 flex items-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC]/95 backdrop-blur-md p-1 shadow-lg"
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
                      ? 'bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] text-white shadow-xs'
                      : 'text-[#0B4F49] hover:bg-[#E5F9F4]'
                  }`}
                >
                  Da Fare
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTodoSubTab('organizza');
                    setMobileTab('todo');
                    setDesktopSection('todo');
                    setTodoSubMenuOpen(false);
                  }}
                  className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold transition-colors whitespace-nowrap ${
                    todoSubTab === 'organizza'
                      ? 'bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] text-white shadow-xs'
                      : 'text-[#0B4F49] hover:bg-[#E5F9F4]'
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
                  setMobileTab('todo');
                  setDesktopSection('todo');
                  setTodoSubMenuOpen(true);
                } else {
                  setTodoSubMenuOpen((prev) => !prev);
                }
              }}
              className={`flex w-full flex-col items-center justify-center gap-0.5 px-[3px] sm:px-1.5 transition-colors ${
                mobileTab === 'todo' ? 'text-[#0F766E] font-semibold' : 'text-[#3A7D76] hover:text-[#083B37]'
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
              mobileTab === 'settings' ? 'text-purple-800 font-semibold' : 'text-stone-500 hover:text-stone-900'
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
          className="fixed bottom-16 lg:bottom-6 right-4 z-40 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg"
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
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
