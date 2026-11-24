import React, { useMemo, useState } from 'react';
import { ArrowRight, Bell, Search, X } from 'lucide-react';
import type { DailyNote, NoteColor } from '../types/note';
import { formatItalianDateLong, formatItalianDateShort } from '../utils/dateUtils';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import { NOTE_COLOR_LIST, NOTE_COLORS } from '../utils/noteColors';
import { CHIBI_CAT_MASCOTS } from '../utils/nekoCatalog';
import { collectAllReminders, type FlattenedReminder } from '../utils/reminderExtractor';
import { CatIllustration } from './CatIllustration';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';

interface RemindersViewProps {
  dailyNotes: DailyNote[];
  sectionLayout: SectionLayoutState;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onOpenNoteInAgenda: (date: string, entryId: string) => void;
  onDismissReminder: (date: string, entryId: string, reminderIndex: number) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  dailyNotes,
  sectionLayout,
  onChangeLayout,
  onResetLayout,
  onOpenNoteInAgenda,
  onDismissReminder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<NoteColor | 'all'>('all');

  const allReminders = useMemo(() => collectAllReminders(dailyNotes), [dailyNotes]);

  const filteredReminders = useMemo<FlattenedReminder[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return allReminders.filter((item) => {
      if (colorFilter !== 'all' && item.color !== colorFilter) return false;
      if (!q) return true;
      return (
        item.text.toLowerCase().includes(q) ||
        item.dayTitle.toLowerCase().includes(q) ||
        item.date.includes(q)
      );
    });
  }, [allReminders, colorFilter, searchQuery]);

  const neko = CHIBI_CAT_MASCOTS.philosopher;

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'reminders_header',
      render: () => (
        <section className="rounded-3xl border border-stone-900/12 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <CatIllustration
                src={neko.src}
                alt={neko.alt}
                className="h-14 w-14 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
              />
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
                  <Bell className="h-4 w-4 text-purple-700 shrink-0" aria-hidden="true" />
                  Promemoria dagli appunti
                </h2>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Frasi importanti e intenzioni
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-lg font-bold text-stone-900 tabular-nums">
                {filteredReminders.length}
              </span>
              <span className="block text-[11px] text-stone-500">
                {filteredReminders.length === 1 ? 'promemoria' : 'promemoria'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca nei promemoria..."
                aria-label="Cerca nei promemoria"
                className="w-full min-h-[40px] rounded-xl border border-stone-200 bg-[#FAF7F0] pl-9 pr-8 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-purple-500 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Cancella ricerca promemoria"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
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
                Tutti
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
        </section>
      ),
    },
    {
      id: 'reminders_list',
      render: () =>
        filteredReminders.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-purple-300/80 bg-white/95 p-8 text-center">
            <CatIllustration
              src={neko.src}
              alt={neko.alt}
              className="mx-auto h-28 w-28 rounded-3xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8]"
            />
            <h3 className="mt-3 text-sm font-bold text-stone-900">
              {allReminders.length === 0
                ? 'Nessun promemoria trovato finora'
                : 'Nessun promemoria corrisponde ai filtri'}
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Quando registri o scrivi frasi come “potrei fare…”, “forse dovrei…” o “mi sa che
              se…”, appariranno qui in blocchi orizzontali pronti per portarti subito alla nota.
            </p>
          </section>
        ) : (
          <div className="space-y-2.5">
            {filteredReminders.map((rem) => {
              const colMeta = NOTE_COLORS[rem.color] || NOTE_COLORS.amber;
              return (
                <div
                  key={rem.id}
                  className="group relative flex items-stretch rounded-2xl border border-stone-900/12 bg-white shadow-xs overflow-hidden hover:border-purple-400 transition-colors"
                >
                  {/* Color Accent Bar */}
                  <div
                    className="w-1.5 shrink-0"
                    style={{ backgroundColor: colMeta.hex }}
                    aria-hidden="true"
                  />

                  <button
                    type="button"
                    onClick={() => onOpenNoteInAgenda(rem.date, rem.entryId)}
                    className="flex-1 min-w-0 px-4 py-3 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-600"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Horizontal metadata strip: Day · Time · Color */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
                        <span
                          className="font-semibold text-stone-900 capitalize"
                          title={formatItalianDateLong(rem.date)}
                        >
                          {formatItalianDateShort(rem.date)}
                        </span>
                        <span aria-hidden="true" className="text-stone-300">
                          ·
                        </span>
                        <span className="font-mono font-semibold text-stone-800 tabular-nums">
                          {rem.time}
                        </span>
                        <span aria-hidden="true" className="text-stone-300">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                          <span
                            className={`h-2.5 w-2.5 rounded-full border shrink-0 ${colMeta.swatchClass}`}
                            aria-hidden="true"
                          />
                          <span>{colMeta.label}</span>
                        </span>
                      </div>

                      {/* Full extracted reminder sentence */}
                      <p className="text-sm text-stone-900 leading-relaxed">{rem.text}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 shrink-0 self-end sm:self-center">
                      <span>Vai alla nota</span>
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  <div className="flex items-start p-2 shrink-0 border-l border-stone-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissReminder(rem.date, rem.entryId, rem.reminderIndex);
                      }}
                      title="Rimuovi questo promemoria"
                      aria-label="Rimuovi questo promemoria"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
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
      section="reminders"
      layout={sectionLayout}
      blocks={blocks}
      onChangeLayout={onChangeLayout}
      onResetSection={onResetLayout}
      className="space-y-4"
    />
  );
};
