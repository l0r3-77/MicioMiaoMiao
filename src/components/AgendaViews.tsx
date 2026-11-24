import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pin, Plus, ZoomIn, ZoomOut } from 'lucide-react';
import type { AgendaViewMode, DailyNote, NoteColor, NoteEntry } from '../types/note';
import {
  addDaysISO,
  formatItalianDateLong,
  formatItalianDateShort,
  formatItalianMonthYear,
  formatItalianWeekdayShort,
  getMonthCalendarCells,
  getWeekDaysISO,
  parseISODate,
  toISODate,
} from '../utils/dateUtils';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import { NOTE_COLORS } from '../utils/noteColors';
import { CHIBI_CAT_MASCOTS, getNekoForDate } from '../utils/nekoCatalog';
import { CatIllustration } from './CatIllustration';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';
import { DailyNoteCard, type DailyZoomLevel } from './NoteCard';

interface SharedAgendaProps {
  dailyNotes: DailyNote[];
  selectedDate: string;
  agendaMode: AgendaViewMode;
  colorFilter: NoteColor | 'all';
  searchQuery: string;
  defaultZoomLevel?: DailyZoomLevel;
  highlightedEntryId?: string | null;
  sectionLayout: SectionLayoutState;
  onChangeAgendaMode: (mode: AgendaViewMode) => void;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onSelectDate: (isoDate: string) => void;
  onSelectEntry: (dailyNote: DailyNote, entry: NoteEntry) => void;
  onTogglePinDay: (date: string) => void;
  onUpdateDayTitle: (date: string, newTitle: string) => void;
  onChangeEntryColor: (date: string, entryId: string, color: NoteColor) => void;
  onGenerateDailySummary: (date: string) => Promise<void>;
  onCreateBlankEntry: (isoDate: string) => void;
}

function getFilteredEntries(
  dailyNote: DailyNote | undefined,
  colorFilter: NoteColor | 'all',
  searchQuery: string
): NoteEntry[] {
  if (!dailyNote) return [];
  const q = searchQuery.trim().toLowerCase();
  return [...dailyNote.entries]
    .sort((a, b) => a.time.localeCompare(b.time))
    .filter((entry) => {
      if (colorFilter !== 'all' && entry.color !== colorFilter) return false;
      if (!q) return true;
      return (
        dailyNote.title.toLowerCase().includes(q) ||
        entry.transcript.toLowerCase().includes(q) ||
        entry.bullets.some((b) => b.toLowerCase().includes(q))
      );
    });
}

interface ZoomControlBarProps {
  zoomLevel: DailyZoomLevel;
  onChangeZoom: (next: DailyZoomLevel) => void;
  compact?: boolean;
}

const ZOOM_STEPS: ReadonlyArray<{ id: DailyZoomLevel; label: string }> = [
  { id: 'full', label: 'Tutto' },
  { id: 'sensations', label: 'Sensazioni' },
  { id: 'overview', label: 'Colore e orario' },
];

const ZoomControlBar: React.FC<ZoomControlBarProps> = ({
  zoomLevel,
  onChangeZoom,
  compact = false,
}) => {
  const zoomIndex = ZOOM_STEPS.findIndex((s) => s.id === zoomLevel);

  const handleZoomOut = () => {
    if (zoomIndex < ZOOM_STEPS.length - 1) {
      onChangeZoom(ZOOM_STEPS[zoomIndex + 1].id);
    }
  };

  const handleZoomIn = () => {
    if (zoomIndex > 0) {
      onChangeZoom(ZOOM_STEPS[zoomIndex - 1].id);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-stone-500">Livello dettaglio</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel === 'overview'}
          aria-label="Zoom indietro"
          title="Zoom indietro: riduci dettagli"
          className={`${
            compact ? 'min-h-[30px] min-w-[30px]' : 'min-h-[34px] min-w-[34px]'
          } flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-35 transition-colors`}
        >
          <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div
          role="group"
          aria-label="Seleziona livello zoom"
          className="inline-flex items-center gap-0.5 rounded-xl bg-purple-50/90 border border-purple-200/70 p-0.5"
        >
          {ZOOM_STEPS.map((step) => {
            const active = zoomLevel === step.id;
            return (
              <button
                key={step.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeZoom(step.id)}
                className={`${
                  compact ? 'min-h-[26px] px-2 text-[10px]' : 'min-h-[28px] px-2.5 text-[11px]'
                } rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomLevel === 'full'}
          aria-label="Zoom avanti"
          title="Zoom avanti: mostra più dettagli"
          className={`${
            compact ? 'min-h-[30px] min-w-[30px]' : 'min-h-[34px] min-w-[34px]'
          } flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-35 transition-colors`}
        >
          <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

function usePersistedZoom(
  storageKey: string,
  fallbackDefault: DailyZoomLevel = 'full'
): [DailyZoomLevel, (next: DailyZoomLevel) => void] {
  const [zoomLevel, setZoomLevel] = useState<DailyZoomLevel>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'full' || saved === 'sensations' || saved === 'overview') return saved;
    } catch {
      // ignore
    }
    return fallbackDefault;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, zoomLevel);
    } catch {
      // ignore
    }
  }, [storageKey, zoomLevel]);

  return [zoomLevel, setZoomLevel];
}

const AGENDA_MODE_TABS: ReadonlyArray<{ id: AgendaViewMode; label: string }> = [
  { id: 'day', label: 'Giornaliera' },
  { id: 'week', label: 'Settimanale' },
  { id: 'month', label: 'Mensile' },
];

const AgendaModeTabs: React.FC<{
  agendaMode: AgendaViewMode;
  onChangeAgendaMode: (mode: AgendaViewMode) => void;
}> = ({ agendaMode, onChangeAgendaMode }) => (
  <div
    role="tablist"
    aria-label="Modalità vista agenda"
    className="grid grid-cols-3 items-center gap-1 rounded-xl bg-purple-50/90 border border-purple-200/70 p-1"
  >
    {AGENDA_MODE_TABS.map((tab) => {
      const active = agendaMode === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChangeAgendaMode(tab.id)}
          className={`min-h-[36px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
            active
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export const DailyAgendaView: React.FC<SharedAgendaProps> = ({
  dailyNotes,
  selectedDate,
  agendaMode,
  colorFilter,
  searchQuery,
  defaultZoomLevel = 'full',
  highlightedEntryId = null,
  sectionLayout,
  onChangeAgendaMode,
  onChangeLayout,
  onResetLayout,
  onSelectDate,
  onSelectEntry,
  onTogglePinDay,
  onUpdateDayTitle,
  onChangeEntryColor,
  onGenerateDailySummary,
  onCreateBlankEntry,
}) => {
  const todayISO = toISODate(new Date());
  const weekStrip = getWeekDaysISO(selectedDate);
  const dailyNeko = getNekoForDate(selectedDate, 1);
  const dailyEmptyNeko = getNekoForDate(selectedDate, 4);

  const [zoomLevel, setZoomLevel] = usePersistedZoom('agendavoce_daily_zoom_v1', defaultZoomLevel);

  const selectedDayNote = dailyNotes.find((d) => d.date === selectedDate);
  const visibleEntries = getFilteredEntries(selectedDayNote, colorFilter, searchQuery);

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'daily_controls',
      render: () => (
        /* Compact Mode Tabs + Day Selector + 7-day strip + Zoom Block */
        <div className="rounded-3xl border border-stone-900/12 bg-white p-3 sm:p-3.5 shadow-xs space-y-3">
          <AgendaModeTabs agendaMode={agendaMode} onChangeAgendaMode={onChangeAgendaMode} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <CatIllustration
                src={dailyNeko.src}
                alt={dailyNeko.alt}
                className="h-12 w-12 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold capitalize text-stone-900 truncate">
                  {formatItalianDateLong(selectedDate)}
                </h2>
                <p className="text-[11px] text-stone-500 tabular-nums">
                  {visibleEntries.length === 0
                    ? 'Nessun appunto'
                    : `${visibleEntries.length} ${
                        visibleEntries.length === 1 ? 'orario registrato' : 'orari registrati'
                      }`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onSelectDate(addDaysISO(selectedDate, -1))}
                aria-label="Giorno precedente"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(todayISO)}
                className="min-h-[36px] rounded-xl border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors whitespace-nowrap"
              >
                Oggi
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(addDaysISO(selectedDate, 1))}
                aria-label="Giorno successivo"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCreateBlankEntry(selectedDate)}
                className="min-h-[36px] inline-flex items-center gap-1 rounded-xl bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Appunto</span>
              </button>
            </div>
          </div>

          {/* Compact Horizontal 7-Day Scroller */}
          <div className="mt-2.5 grid grid-cols-7 gap-1">
            {weekStrip.map((iso) => {
              const isSelected = iso === selectedDate;
              const isToday = iso === todayISO;
              const dayNote = dailyNotes.find((d) => d.date === iso);
              const count = getFilteredEntries(dayNote, colorFilter, searchQuery).length;
              const dayNum = Number(iso.split('-')[2]);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDate(iso)}
                  className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl py-1 px-0.5 transition-colors ${
                    isSelected
                      ? 'bg-stone-900 text-white'
                      : isToday
                        ? 'bg-purple-50 text-purple-950 border border-purple-200 hover:bg-purple-100/70'
                        : 'bg-[#FAF7F0] text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span
                    className={`text-[9px] uppercase tracking-wide ${
                      isSelected ? 'text-purple-200' : 'text-stone-500'
                    }`}
                  >
                    {formatItalianWeekdayShort(iso)}
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums leading-tight">
                    {dayNum}
                  </span>
                  <span
                    className={`mt-0.5 h-1 w-1 rounded-full ${
                      count > 0
                        ? isSelected
                          ? 'bg-purple-300'
                          : 'bg-purple-500'
                        : 'bg-transparent'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          {/* Compact Daily Zoom Bar */}
          <div className="mt-2.5 border-t border-stone-100 pt-2">
            <ZoomControlBar zoomLevel={zoomLevel} onChangeZoom={setZoomLevel} compact />
          </div>
        </div>
      ),
    },
    {
      id: 'daily_notes',
      render: () =>
        !selectedDayNote || visibleEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-purple-300/80 bg-white/95 p-7 text-center">
            <CatIllustration
              src={dailyEmptyNeko.src}
              alt={dailyEmptyNeko.alt}
              className="mx-auto h-32 w-32 rounded-3xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8]"
            />
            <h3 className="mt-4 text-sm font-bold text-stone-900">
              {selectedDayNote && selectedDayNote.entries.length > 0
                ? 'Nessun appunto corrisponde ai filtri'
                : 'Giornata pronta per i tuoi pensieri'}
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Tutte le registrazioni vocali o i testi aggiunti oggi confluiranno con il proprio
              orario nella nota del {formatItalianDateShort(selectedDate)}.
            </p>
            <button
              type="button"
              onClick={() => onCreateBlankEntry(selectedDate)}
              className="mt-4 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Aggiungi appunto manuale
            </button>
          </div>
        ) : (
          <div
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const order: DailyZoomLevel[] = ['full', 'sensations', 'overview'];
                const idx = order.indexOf(zoomLevel);
                if (e.deltaY > 0 && idx < order.length - 1) setZoomLevel(order[idx + 1]);
                else if (e.deltaY < 0 && idx > 0) setZoomLevel(order[idx - 1]);
              }
            }}
          >
            <DailyNoteCard
              dailyNote={selectedDayNote}
              zoomLevel={zoomLevel}
              colorFilter={colorFilter}
              searchQuery={searchQuery}
              highlightedEntryId={highlightedEntryId}
              onSelectEntry={onSelectEntry}
              onTogglePinDay={onTogglePinDay}
              onUpdateDayTitle={onUpdateDayTitle}
              onChangeEntryColor={onChangeEntryColor}
              onGenerateDailySummary={onGenerateDailySummary}
            />
          </div>
        ),
    },
  ];

  return (
    <CustomizableSectionStack
      section="daily"
      layout={sectionLayout}
      blocks={blocks}
      onChangeLayout={onChangeLayout}
      onResetSection={onResetLayout}
    />
  );
};

export const WeeklyAgendaView: React.FC<SharedAgendaProps> = ({
  dailyNotes,
  selectedDate,
  agendaMode,
  colorFilter,
  searchQuery,
  defaultZoomLevel = 'full',
  sectionLayout,
  onChangeAgendaMode,
  onChangeLayout,
  onResetLayout,
  onSelectDate,
  onSelectEntry,
  onTogglePinDay,
  onCreateBlankEntry,
}) => {
  const todayISO = toISODate(new Date());
  const weekDays = getWeekDaysISO(selectedDate);
  const startLabel = formatItalianDateShort(weekDays[0]);
  const endLabel = formatItalianDateShort(weekDays[6]);

  const [zoomLevel, setZoomLevel] = usePersistedZoom('agendavoce_weekly_zoom_v1', defaultZoomLevel);

  const totalWeekEntries = weekDays.reduce((acc, iso) => {
    const dayNote = dailyNotes.find((d) => d.date === iso);
    return acc + getFilteredEntries(dayNote, colorFilter, searchQuery).length;
  }, 0);
  const weeklyNeko = CHIBI_CAT_MASCOTS.calendar;

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'weekly_controls',
      render: () => (
        <div className="rounded-3xl border border-stone-900/12 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
          <AgendaModeTabs agendaMode={agendaMode} onChangeAgendaMode={onChangeAgendaMode} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CatIllustration
                src={weeklyNeko.src}
                alt={weeklyNeko.alt}
                className="h-14 w-14 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">
                  Settimana {startLabel} – {endLabel}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                  {totalWeekEntries} {totalWeekEntries === 1 ? 'appunto' : 'appunti'} · Scorri
                  orizzontalmente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onSelectDate(addDaysISO(selectedDate, -7))}
                aria-label="Settimana precedente"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(todayISO)}
                className="min-h-[40px] rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 whitespace-nowrap"
              >
                Questa
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(addDaysISO(selectedDate, 7))}
                aria-label="Settimana successiva"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-2.5">
            <ZoomControlBar zoomLevel={zoomLevel} onChangeZoom={setZoomLevel} compact />
          </div>
        </div>
      ),
    },
    {
      id: 'weekly_grid',
      render: () => (
        /* 7-Day Horizontally Scrollable Agenda with 3 selectable zoom levels */
        <div
          className={`flex flex-row overflow-x-auto snap-x snap-mandatory pb-3 ${
            zoomLevel === 'overview' ? 'gap-1.5 sm:gap-2' : 'gap-3'
          }`}
        >
          {weekDays.map((iso) => {
            const dayNote = dailyNotes.find((d) => d.date === iso);
            const dayEntries = getFilteredEntries(dayNote, colorFilter, searchQuery);
            const isToday = iso === todayISO;
            const isSelected = iso === selectedDate;
            const dayNum = Number(iso.split('-')[2]);

            // Narrow columns in 'overview' (Colore e orario) so 4 days fit together on screen
            const cardWidthClass =
              zoomLevel === 'overview'
                ? 'w-[calc((100%-18px)/4)] min-w-[82px] sm:w-[152px] lg:w-[170px] p-2 sm:p-2.5 min-h-[220px]'
                : zoomLevel === 'sensations'
                  ? 'w-[66vw] max-w-[240px] sm:w-[225px] p-3 min-h-[250px]'
                  : 'w-[82vw] max-w-[295px] sm:w-[272px] p-3.5 min-h-[280px]';

            return (
              <div
                key={iso}
                className={`${cardWidthClass} shrink-0 snap-start flex flex-col rounded-2xl border transition-colors ${
                  isSelected
                    ? 'border-stone-900 bg-white'
                    : isToday
                      ? 'border-purple-300 bg-purple-50/35'
                      : 'border-stone-900/12 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1 pb-2 border-b border-stone-100">
                  <button
                    type="button"
                    onClick={() => onSelectDate(iso)}
                    className="flex items-baseline gap-1 text-left min-h-[32px] min-w-0"
                  >
                    <span className="text-[11px] font-semibold capitalize text-stone-700 truncate">
                      {formatItalianWeekdayShort(iso)}
                    </span>
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${
                        isToday ? 'text-purple-700' : 'text-stone-900'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {dayNote && zoomLevel !== 'overview' && (
                      <button
                        type="button"
                        onClick={() => onTogglePinDay(iso)}
                        aria-label={dayNote.pinned ? 'Rimuovi spillo giorno' : 'Appunta giorno'}
                        className={`min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg transition-colors ${
                          dayNote.pinned
                            ? 'text-purple-700 bg-purple-100/80'
                            : 'text-stone-300 hover:text-stone-600'
                        }`}
                      >
                        <Pin
                          className={`h-3.5 w-3.5 ${dayNote.pinned ? 'fill-current' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onCreateBlankEntry(iso)}
                      aria-label={`Aggiungi appunto il ${formatItalianDateShort(iso)}`}
                      className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Entries inside each Weekly Day Column */}
                <div
                  className={`mt-2 flex-1 flex flex-col ${
                    zoomLevel === 'overview' ? 'gap-1.5' : 'gap-2.5'
                  }`}
                >
                  {!dayNote || dayEntries.length === 0 ? (
                    <p className="py-5 text-center text-[11px] text-stone-400">Libero</p>
                  ) : zoomLevel === 'overview' ? (
                    /* Strictly vertical list of Time + Color in Weekly Overview */
                    dayEntries.map((entry) => {
                      const colMeta = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => onSelectEntry(dayNote, entry)}
                          title={`${entry.time} · ${colMeta.label}`}
                          className={`w-full flex flex-col items-start gap-0.5 rounded-xl border border-stone-200/70 px-2 py-1.5 text-left transition-transform active:scale-[0.98] hover:border-stone-400 ${colMeta.highlightClass}`}
                        >
                          <div className="flex w-full items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-bold tabular-nums">
                              {entry.time}
                            </span>
                            <span
                              className={`h-2 w-2 rounded-full border shrink-0 ${colMeta.swatchClass}`}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="text-[10px] font-medium truncate w-full opacity-90">
                            {colMeta.label}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    dayEntries.map((entry) => {
                      const colMeta = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => onSelectEntry(dayNote, entry)}
                          className="w-full rounded-xl border border-stone-100 bg-white p-2.5 text-left hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-stone-900 tabular-nums">
                              {entry.time}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-stone-600">
                              <span
                                className={`h-2 w-2 rounded-full border shrink-0 ${colMeta.swatchClass}`}
                                aria-hidden="true"
                              />
                              {colMeta.label}
                            </span>
                          </div>

                          {zoomLevel === 'full' ? (
                            <div className={`mt-1.5 rounded-lg px-2 py-1.5 ${colMeta.highlightClass}`}>
                              <p className="line-clamp-4 text-xs leading-snug">
                                {entry.transcript || 'Solo audio registrato'}
                              </p>
                            </div>
                          ) : (
                            <div className={`mt-1.5 rounded-lg px-2 py-1 ${colMeta.highlightClass}`}>
                              <p className="text-[10px] font-medium opacity-85">
                                {entry.bullets && entry.bullets.length > 0
                                  ? `${entry.bullets.length} ${entry.bullets.length === 1 ? 'sensazione' : 'sensazioni'}`
                                  : 'Tocca per dettagli'}
                              </p>
                            </div>
                          )}

                          {/* Show ALL sensation synthesis bullets */}
                          {entry.bullets && entry.bullets.length > 0 && (
                            <ul className="mt-2 space-y-1 text-[11px] text-stone-600">
                              {entry.bullets.map((bullet, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-1.5 leading-snug">
                                  <span
                                    className="mt-1.5 h-1 w-1 rounded-full bg-purple-400 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <CustomizableSectionStack
      section="weekly"
      layout={sectionLayout}
      blocks={blocks}
      onChangeLayout={onChangeLayout}
      onResetSection={onResetLayout}
    />
  );
};

export const MonthlyAgendaView: React.FC<SharedAgendaProps> = ({
  dailyNotes,
  selectedDate,
  agendaMode,
  colorFilter,
  searchQuery,
  highlightedEntryId = null,
  sectionLayout,
  onChangeAgendaMode,
  onChangeLayout,
  onResetLayout,
  onSelectDate,
  onSelectEntry,
  onTogglePinDay,
  onUpdateDayTitle,
  onChangeEntryColor,
  onGenerateDailySummary,
  onCreateBlankEntry,
}) => {
  const todayISO = toISODate(new Date());
  const parsed = parseISODate(selectedDate);
  const year = parsed.getFullYear();
  const monthIndex = parsed.getMonth();

  const cells = getMonthCalendarCells(year, monthIndex);
  const selectedDayNote = dailyNotes.find((d) => d.date === selectedDate);
  const selectedDayEntries = getFilteredEntries(selectedDayNote, colorFilter, searchQuery);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthIndex + delta, 1);
    onSelectDate(toISODate(d));
  };

  const weekdayHeaders = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const monthlyNeko = getNekoForDate(
    `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
    2
  );
  const monthlyEmptyDayNeko = getNekoForDate(selectedDate, 4);

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'monthly_calendar',
      render: () => (
        <div className="rounded-3xl border border-stone-900/12 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="mb-3">
            <AgendaModeTabs agendaMode={agendaMode} onChangeAgendaMode={onChangeAgendaMode} />
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <CatIllustration
                src={monthlyNeko.src}
                alt={monthlyNeko.alt}
                className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
              />
              <h2 className="text-[13px] sm:text-base font-bold capitalize text-stone-900 leading-tight">
                {formatItalianMonthYear(year, monthIndex)}
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Mese precedente"
                className="min-h-[34px] min-w-[34px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(todayISO)}
                className="min-h-[34px] sm:min-h-[40px] rounded-xl border border-stone-200 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 whitespace-nowrap"
              >
                Oggi
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Mese successivo"
                className="min-h-[34px] min-w-[34px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weekdayHeaders.map((wd) => (
              <div key={wd} className="py-1.5 text-[11px] font-semibold text-stone-400">
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {cells.map((cell) => {
              const cellDayNote = dailyNotes.find((d) => d.date === cell.isoDate);
              const cellEntries = getFilteredEntries(cellDayNote, colorFilter, searchQuery);
              const isSelected = cell.isoDate === selectedDate;
              const isToday = cell.isoDate === todayISO;

              return (
                <button
                  key={cell.isoDate}
                  type="button"
                  onClick={() => onSelectDate(cell.isoDate)}
                  className={`min-h-[54px] sm:min-h-[68px] flex flex-col items-start justify-between rounded-xl border p-1.5 sm:p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : isToday
                        ? 'border-purple-300 bg-purple-50/70 text-stone-900'
                        : cell.inCurrentMonth
                          ? 'border-stone-200/80 bg-white text-stone-900 hover:border-purple-300'
                          : 'border-transparent bg-[#FAF7F0] text-stone-400 hover:bg-stone-100/70'
                  }`}
                >
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {cell.dayNumber}
                  </span>

                  {cellEntries.length > 0 && (
                    <div className="flex w-full items-center justify-between gap-1 mt-1">
                      <div className="flex items-center gap-0.5 overflow-hidden">
                        {cellEntries.slice(0, 3).map((entry) => (
                          <span
                            key={entry.id}
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              (NOTE_COLORS[entry.color] || NOTE_COLORS.amber).dotClass
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`font-mono text-[10px] tabular-nums ${
                          isSelected ? 'text-purple-200' : 'text-stone-500'
                        }`}
                      >
                        {cellEntries.length}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      id: 'monthly_day_notes',
      render: () => (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-sm font-semibold capitalize text-stone-900">
                {formatItalianDateLong(selectedDate)}
              </h3>
              <p className="text-xs text-stone-500 tabular-nums">
                {selectedDayEntries.length}{' '}
                {selectedDayEntries.length === 1 ? 'appunto nella nota' : 'appunti nella nota'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCreateBlankEntry(selectedDate)}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Nuovo appunto
            </button>
          </div>

          {!selectedDayNote || selectedDayEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-purple-300/80 bg-white/90 p-6 text-center text-xs text-stone-500">
              <CatIllustration
                src={monthlyEmptyDayNeko.src}
                alt={monthlyEmptyDayNeko.alt}
                className="mx-auto mb-3 h-28 w-28 rounded-3xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8]"
              />
              Nessun appunto salvato per questo giorno.
            </div>
          ) : (
            <DailyNoteCard
              dailyNote={selectedDayNote}
              colorFilter={colorFilter}
              searchQuery={searchQuery}
              highlightedEntryId={highlightedEntryId}
              onSelectEntry={onSelectEntry}
              onTogglePinDay={onTogglePinDay}
              onUpdateDayTitle={onUpdateDayTitle}
              onChangeEntryColor={onChangeEntryColor}
              onGenerateDailySummary={onGenerateDailySummary}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <CustomizableSectionStack
      section="monthly"
      layout={sectionLayout}
      blocks={blocks}
      onChangeLayout={onChangeLayout}
      onResetSection={onResetLayout}
    />
  );
};
