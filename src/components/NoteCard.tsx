import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileSpreadsheet,
  FileText,
  Highlighter,
  Loader2,
  Mic,
  Pencil,
  Pin,
  RefreshCw,
} from 'lucide-react';
import type { DailyNote, NoteColor, NoteEntry } from '../types/note';
import { formatDuration, formatItalianDateLong, formatItalianDateShort } from '../utils/dateUtils';
import { exportSingleDayNotes } from '../utils/exportReports';
import { NOTE_COLOR_LIST, NOTE_COLORS } from '../utils/noteColors';

export type DailyZoomLevel = 'full' | 'sensations' | 'overview';

interface DailyNoteCardProps {
  dailyNote: DailyNote;
  compact?: boolean;
  zoomLevel?: DailyZoomLevel;
  colorFilter?: NoteColor | 'all';
  searchQuery?: string;
  highlightedEntryId?: string | null;
  onSelectEntry: (dailyNote: DailyNote, entry: NoteEntry) => void;
  onTogglePinDay: (date: string) => void;
  onUpdateDayTitle: (date: string, newTitle: string) => void;
  onChangeEntryColor: (date: string, entryId: string, color: NoteColor) => void;
  onGenerateDailySummary?: (date: string) => Promise<void>;
}

export const DailyNoteCard: React.FC<DailyNoteCardProps> = ({
  dailyNote,
  compact = false,
  zoomLevel = 'full',
  colorFilter = 'all',
  searchQuery = '',
  highlightedEntryId = null,
  onSelectEntry,
  onTogglePinDay,
  onUpdateDayTitle,
  onChangeEntryColor,
  onGenerateDailySummary,
}) => {
  const [openColorEntryId, setOpenColorEntryId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(dailyNote.title);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(dailyNote.title);
  }, [dailyNote.title]);

  useEffect(() => {
    if (!openColorEntryId) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenColorEntryId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openColorEntryId]);

  const q = searchQuery.trim().toLowerCase();
  const visibleEntries = [...dailyNote.entries]
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

  const handleSaveTitle = () => {
    const clean = draftTitle.trim();
    if (clean && clean !== dailyNote.title) {
      onUpdateDayTitle(dailyNote.date, clean);
    } else {
      setDraftTitle(dailyNote.title);
    }
    setIsEditingTitle(false);
  };

  const handleDailySummaryClick = async () => {
    if (!onGenerateDailySummary || isGeneratingDaily) return;
    setIsGeneratingDaily(true);
    try {
      await onGenerateDailySummary(dailyNote.date);
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  return (
    <article
      ref={menuContainerRef}
      className="rounded-3xl border border-stone-900/12 bg-white p-4 sm:p-5 shadow-xs"
    >
      {/* Daily Note Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex-1 min-w-0">
          {isEditingTitle && !compact ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setDraftTitle(dailyNote.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="flex-1 min-h-[38px] rounded-xl border border-purple-400 bg-white px-3 py-1 text-sm font-semibold text-stone-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                aria-label="Salva titolo"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-800"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className={`font-bold text-stone-900 truncate ${
                  compact ? 'text-xs' : 'text-base sm:text-lg'
                }`}
              >
                {dailyNote.title}
              </h3>
              {!compact && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  aria-label="Modifica titolo della giornata"
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Unboxed metadata */}
          <div
            className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-stone-500 ${
              compact ? 'text-[11px]' : 'text-xs'
            }`}
          >
            <span className="capitalize">
              {compact ? formatItalianDateShort(dailyNote.date) : formatItalianDateLong(dailyNote.date)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {visibleEntries.length} {visibleEntries.length === 1 ? 'appunto' : 'appunti'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
          {!compact && dailyNote.entries.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => exportSingleDayNotes(dailyNote, 'excel')}
                title="Esporta questa giornata in Excel"
                aria-label="Esporta questa giornata in Excel"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-purple-300 hover:text-purple-800 transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => exportSingleDayNotes(dailyNote, 'pdf')}
                title="Esporta questa giornata in PDF"
                aria-label="Esporta questa giornata in PDF"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-purple-300 hover:text-purple-800 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}

          {!compact && onGenerateDailySummary && dailyNote.entries.length > 0 && (
            <button
              type="button"
              disabled={isGeneratingDaily}
              onClick={handleDailySummaryClick}
              title="Aggiorna sintesi della giornata"
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isGeneratingDaily ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Sintesi giorno</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onTogglePinDay(dailyNote.date)}
            aria-label={dailyNote.pinned ? 'Rimuovi nota appuntata' : 'Appunta nota del giorno'}
            aria-pressed={dailyNote.pinned}
            className={`flex items-center justify-center rounded-xl transition-colors ${
              compact ? 'min-h-[36px] min-w-[36px]' : 'min-h-[42px] min-w-[42px]'
            } ${
              dailyNote.pinned
                ? 'text-purple-800 bg-purple-100/80 hover:bg-purple-200/70'
                : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'
            }`}
          >
            <Pin
              className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${
                dailyNote.pinned ? 'fill-current' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Overall Day Mood/Stress Summary (hidden at overview zoom to focus purely on colors & hours) */}
      {!compact &&
        zoomLevel !== 'overview' &&
        dailyNote.dailySummaryBullets &&
        dailyNote.dailySummaryBullets.length > 0 && (
          <div className="mt-3.5 rounded-2xl border border-purple-200/70 bg-[#FAF7F0] p-3.5">
            <p className="text-xs font-semibold text-stone-800">Sintesi della giornata</p>
            <ul className="mt-2 space-y-1 text-xs sm:text-sm text-stone-700">
              {dailyNote.dailySummaryBullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Timestamped Entries within the Single Daily Note */}
      {!compact && zoomLevel === 'overview' ? (
        <div className="mt-4 space-y-3">
          {/* Chronological Color Ribbon of the Whole Day */}
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100 gap-0.5 p-0.5"
            aria-label="Sequenza oraria dei colori della giornata"
          >
            {visibleEntries.map((entry) => {
              const colMeta = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
              return (
                <div
                  key={`strip-${entry.id}`}
                  style={{ backgroundColor: colMeta.hex }}
                  className="flex-1 h-full rounded-full"
                  title={`${entry.time} · ${colMeta.label}`}
                />
              );
            })}
          </div>

          {/* Strictly Vertical Single-Column Stack: ONLY Color + Time (never side-by-side) */}
          <div className="flex flex-col gap-1.5">
            {visibleEntries.map((entry) => {
              const colMeta = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
              const isHighlighted = highlightedEntryId === entry.id;
              return (
                <button
                  key={entry.id}
                  id={!compact ? `entry-${entry.id}` : undefined}
                  type="button"
                  onClick={() => onSelectEntry(dailyNote, entry)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all active:scale-[0.99] hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                    colMeta.highlightClass
                  } ${
                    isHighlighted
                      ? 'border-purple-600 ring-2 ring-purple-500 shadow-sm'
                      : 'border-stone-200/70'
                  }`}
                >
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {entry.time}
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold">
                    <span
                      className={`h-2.5 w-2.5 rounded-full border shrink-0 ${colMeta.swatchClass}`}
                      aria-hidden="true"
                    />
                    <span>{colMeta.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={compact ? 'mt-2.5 space-y-2' : 'mt-4 space-y-4'}>
          {visibleEntries.map((entry) => {
            const colMeta = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
            const isMenuOpen = openColorEntryId === entry.id;
            const isHighlighted = highlightedEntryId === entry.id;

            return (
              <div
                key={entry.id}
                id={!compact ? `entry-${entry.id}` : undefined}
                className={`relative space-y-2 transition-all ${
                  isHighlighted
                    ? 'rounded-2xl ring-2 ring-purple-500 bg-purple-50/45 p-2.5 -mx-2.5'
                    : ''
                }`}
              >
                {/* Entry Time & Metadata Header */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEntry(dailyNote, entry)}
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 rounded-md"
                  >
                    <span
                      className={`font-mono font-semibold text-stone-900 tabular-nums ${
                        compact ? 'text-[11px]' : 'text-xs'
                      }`}
                    >
                      {entry.time}
                    </span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700">
                      <span className={`h-2 w-2 rounded-full ${colMeta.dotClass}`} aria-hidden="true" />
                      {colMeta.label}
                    </span>
                    {!compact && entry.audioMetadata && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-500 tabular-nums">
                          <Mic className="h-3 w-3 text-stone-400" aria-hidden="true" />
                          {formatDuration(entry.audioMetadata.durationSeconds)}
                          {entry.audioMetadata.sizeBytes > 0 && (
                            <span className="text-stone-400">
                              (
                              {entry.audioMetadata.sizeBytes >= 1024 * 1024
                                ? `${(entry.audioMetadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.max(1, Math.round(entry.audioMetadata.sizeBytes / 1024))} KB`}
                              )
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </button>

                  {!compact && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenColorEntryId(isMenuOpen ? null : entry.id);
                        }}
                        aria-label="Scegli colore evidenziatore per questo appunto"
                        aria-expanded={isMenuOpen}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                      >
                        <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          aria-label="Evidenzia testo appunto"
                          className="absolute right-0 top-full mt-1 z-30 w-48 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg"
                        >
                          <p className="px-2 py-1 text-[11px] font-medium text-stone-500">
                            Cambia colore
                          </p>
                          <div className="mt-1 grid grid-cols-1 gap-1">
                            {NOTE_COLOR_LIST.map((col) => {
                              const selected = entry.color === col.key;
                              return (
                                <button
                                  key={col.key}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={selected}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onChangeEntryColor(dailyNote.date, entry.id, col.key);
                                    setOpenColorEntryId(null);
                                  }}
                                  className={`flex min-h-[34px] items-center gap-2 rounded-xl px-2.5 py-1 text-xs font-medium transition-colors ${
                                    selected
                                      ? 'bg-stone-900 text-white'
                                      : 'text-stone-700 hover:bg-stone-100'
                                  }`}
                                >
                                  <span
                                    className={`h-3 w-3 rounded-full border shrink-0 ${col.swatchClass}`}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{col.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Highlighted Text Block (hidden at 'sensations' zoom level — text drops first) */}
                <button
                  type="button"
                  onClick={() => onSelectEntry(dailyNote, entry)}
                  className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 rounded-xl"
                >
                  {zoomLevel === 'sensations' && !compact ? (
                    <div
                      className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 ${colMeta.highlightClass}`}
                    >
                      <span className="text-xs font-medium opacity-85">
                        {entry.bullets && entry.bullets.length > 0
                          ? `${entry.bullets.length} ${entry.bullets.length === 1 ? 'sensazione rilevata' : 'sensazioni rilevate'}`
                          : 'Nessuna sensazione (tocca per vedere il testo)'}
                      </span>
                      <span className="font-mono text-[11px] opacity-75 tabular-nums">
                        {entry.time}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl transition-colors ${colMeta.highlightClass} ${
                        compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'
                      }`}
                    >
                      {entry.transcript ? (
                        <p
                          className={`whitespace-pre-line leading-relaxed ${
                            compact ? 'line-clamp-2 text-xs' : 'text-sm'
                          }`}
                        >
                          {entry.transcript}
                        </p>
                      ) : (
                        <p className="text-xs italic opacity-75">
                          Solo audio registrato — tocca per ascoltare o trascrivere
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mood / Stress / Sensations Bullet Synthesis for this Entry */}
                  {!compact && entry.bullets && entry.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-1 text-xs text-stone-600">
                      {entry.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};
