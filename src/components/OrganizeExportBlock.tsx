import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import type { OrganizeNoteItem } from '../types/dailyTodo';
import type { DailyNote } from '../types/note';
import { DAY_PHASES } from '../utils/dailyTodoStorage';
import { toISODate } from '../utils/dateUtils';
import { CatEmoticonIcon } from './CatEmoticon';
import {
  buildOrganizeExportData,
  buildOrganizePlainText,
  exportOrganizeToExcel,
  exportOrganizeToPdf,
  type BuiltOrganizeExportData,
  type OrganizeExportOptions,
  type OrganizeExportScope,
  type OrganizePrintLayout,
} from '../utils/organizeExport';

const PRINT_LAYOUT_OPTIONS: Array<{
  id: OrganizePrintLayout;
  label: string;
}> = [
  { id: 'phases', label: 'Per Fasi' },
  { id: 'grid', label: 'Griglia' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'planner', label: 'Planner + Diario' },
];

export const OrganizeSheetPreview: React.FC<{
  data: BuiltOrganizeExportData;
  options: OrganizeExportOptions;
  isPrintMode?: boolean;
}> = ({ data, options, isPrintMode = false }) => {
  const isGridWeek = options.layout === 'grid';

  if (isGridWeek) {
    return (
      <div className={isPrintMode ? 'p-2 text-slate-900' : 'text-[10.5px] text-[#072C29]'}>
        <div className="mb-2 border-b border-[#7ECBBF] pb-1.5 flex items-baseline justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-[#083B37]">{data.title}</h4>
            <p className="text-[10px] text-[#0F6E66]">
              {data.totalTasks} attività · {data.totalCompleted} completate
              {options.includeDiaryNotes ? ` · ${data.totalDiaryEntries} appunti diario` : ''}
            </p>
          </div>
          <span className="font-mono text-[9.5px] text-[#0F766E]">Griglia fasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#E5F9F4]">
                <th className="border border-[#9BDCD1] px-1.5 py-1 font-bold text-[10px] text-[#083B37] w-20">
                  Fase
                </th>
                {data.days.map((d) => (
                  <th
                    key={d.date}
                    className="border border-[#9BDCD1] px-1.5 py-1 font-bold text-[10px] text-[#083B37] min-w-[92px]"
                  >
                    <span className="uppercase text-[#0F766E] mr-1">{d.weekdayLabel}</span>
                    <span>{d.dateShort}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_PHASES.map((phaseMeta) => (
                <tr key={phaseMeta.key} className="align-top">
                  <td className="border border-[#9BDCD1] bg-[#EDFBF8] px-1.5 py-1 font-bold text-[10px] text-[#0B534D]">
                    {phaseMeta.title}
                  </td>
                  {data.days.map((d) => {
                    const phase = d.phases.find((p) => p.key === phaseMeta.key);
                    const items = phase?.items || [];
                    return (
                      <td
                        key={`${d.date}-${phaseMeta.key}`}
                        className="border border-[#9BDCD1] px-1.5 py-1 bg-white"
                      >
                        {items.length === 0 ? (
                          <span className="text-[9.5px] text-slate-400">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {items.map((it) => (
                              <li
                                key={it.id}
                                className={`text-[10px] leading-snug flex items-start gap-1 ${
                                  it.done ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                <span className="shrink-0">{it.done ? '✓' : '•'}</span>
                                <CatEmoticonIcon
                                  emoticonId={it.catEmoticonId}
                                  text={it.text}
                                  sizeClass="h-3 w-3 mt-[1px]"
                                />
                                <span>{it.text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {options.includeDiaryNotes && (
                <tr className="align-top">
                  <td className="border border-[#9BDCD1] bg-[#F5F3FF] px-1.5 py-1 font-bold text-[10px] text-purple-900">
                    Diario
                  </td>
                  {data.days.map((d) => (
                    <td
                      key={`${d.date}-diary`}
                      className="border border-[#9BDCD1] px-1.5 py-1 bg-white"
                    >
                      {d.diaryEntries.length === 0 ? (
                        <span className="text-[9.5px] text-slate-400">—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {d.diaryEntries.map((e) => (
                            <li key={e.id} className="text-[9.5px] leading-snug text-slate-700">
                              <strong className="font-mono">{e.time}</strong> {e.transcript}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={isPrintMode ? 'p-2 text-slate-900 space-y-3' : 'space-y-2.5 text-[#072C29]'}>
      <div className="border-b border-[#7ECBBF] pb-1.5 flex items-baseline justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-[#083B37]">{data.title}</h4>
          <p className="text-[10px] text-[#0F6E66]">
            {data.totalTasks} attività · {data.totalCompleted} completate
            {options.includeDiaryNotes ? ` · ${data.totalDiaryEntries} appunti diario` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.days.map((day) => {
          const visiblePhases = day.phases.filter(
            (p) => p.items.length > 0 || options.includeEmptyPhases
          );
          return (
            <div
              key={day.date}
              className={`rounded-xl border border-[#9BDCD1] bg-white ${
                options.layout === 'minimal' ? 'p-2' : 'p-2.5'
              } space-y-1.5 break-inside-avoid`}
            >
              <div className="flex items-center justify-between border-b border-[#D4F3EC] pb-1">
                <h5 className="font-bold text-xs text-[#083B37] capitalize">
                  {day.dateLong}
                </h5>
                <span className="font-mono text-[10px] text-[#0F766E]">
                  {day.phases.reduce((acc, p) => acc + p.items.length, 0)} note
                </span>
              </div>

              {visiblePhases.length === 0 && (!options.includeDiaryNotes || day.diaryEntries.length === 0) ? (
                <p className="text-[10.5px] italic text-slate-400">Nessuna nota salvata</p>
              ) : (
                <div className={options.layout === 'minimal' ? 'space-y-1' : 'space-y-1.5'}>
                  {visiblePhases.map((phase) => (
                    <div key={phase.key} className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F766E]">
                        {phase.title}
                      </p>
                      {phase.items.length === 0 ? (
                        <p className="text-[10px] text-slate-400 pl-2">
                          {options.layout === 'planner'
                            ? '________________________________________'
                            : '—'}
                        </p>
                      ) : (
                        <ul className="space-y-0.5 pl-1.5">
                          {phase.items.map((item) => (
                            <li
                              key={item.id}
                              className={`text-[11px] leading-snug flex items-start gap-1.5 ${
                                item.done ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              <span className="font-mono text-[10px] shrink-0">
                                {item.done ? '☑' : '☐'}
                              </span>
                              {options.layout !== 'minimal' && (
                                <CatEmoticonIcon
                                  emoticonId={item.catEmoticonId}
                                  text={item.text}
                                  sizeClass="h-3.5 w-3.5 mt-[1px]"
                                />
                              )}
                              <span>{item.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                  {options.includeDiaryNotes && day.diaryEntries.length > 0 && (
                    <div className="pt-1 border-t border-dashed border-[#CBECE5] space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-purple-800">
                        Appunti Diario
                      </p>
                      <ul className="space-y-0.5 pl-1.5">
                        {day.diaryEntries.map((entry) => (
                          <li key={entry.id} className="text-[10.5px] leading-snug text-slate-700">
                            <span className="font-mono font-semibold text-purple-900 mr-1">
                              {entry.time}
                            </span>
                            <span className="text-slate-500 mr-1">({entry.colorLabel})</span>
                            <span>{entry.transcript}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {options.layout === 'planner' && (
                    <div className="pt-1.5 space-y-2">
                      <div className="border-b border-dashed border-slate-300 h-3" />
                      <div className="border-b border-dashed border-slate-300 h-3" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface OrganizeExportControlsProps {
  organizeItems: OrganizeNoteItem[];
  dailyNotes: DailyNote[];
  initialDate?: string;
  initialScope?: OrganizeExportScope;
  compact?: boolean;
  onNotify: (msg: string) => void;
}

export const OrganizeExportControls: React.FC<OrganizeExportControlsProps> = ({
  organizeItems,
  dailyNotes,
  initialDate,
  initialScope = 'day',
  compact = false,
  onNotify,
}) => {
  const [scope, setScope] = useState<OrganizeExportScope>(initialScope);
  const [anchorDate, setAnchorDate] = useState<string>(initialDate || toISODate(new Date()));
  const [layout, setLayout] = useState<OrganizePrintLayout>('phases');
  const [includeEmptyPhases, setIncludeEmptyPhases] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeDiaryNotes, setIncludeDiaryNotes] = useState(true);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (initialDate) setAnchorDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialScope) setScope(initialScope);
  }, [initialScope]);

  const options: OrganizeExportOptions = {
    scope,
    anchorDate,
    layout,
    includeEmptyPhases,
    includeCompleted,
    includeDiaryNotes,
  };

  const exportData = useMemo(
    () => buildOrganizeExportData(organizeItems, dailyNotes, options),
    [organizeItems, dailyNotes, scope, anchorDate, layout, includeEmptyPhases, includeCompleted, includeDiaryNotes]
  );

  // Ensure #agendavoce-print-portal exists on document.body while printing
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('agendavoce-print-portal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'agendavoce-print-portal';
      el.className = 'hidden print:block';
      document.body.appendChild(el);
    }
    setPortalNode(el);
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => setIsPrinting(false), 600);
    }, 80);
  };

  const handleCopyText = async () => {
    const plain = buildOrganizePlainText(exportData, options);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plain);
      } else {
        throw new Error('fallback');
      }
      setCopiedFeedback(true);
      onNotify('Programma copiato negli appunti');
      window.setTimeout(() => setCopiedFeedback(false), 1800);
    } catch {
      onNotify('Copia non consentita dal browser');
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Scope & Date Row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#D4F3EC] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setScope('day')}
            className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              scope === 'day'
                ? 'bg-[#0B5B53] text-white shadow-xs'
                : 'text-[#0B4F49] hover:text-[#083B37]'
            }`}
          >
            Giornata
          </button>
          <button
            type="button"
            onClick={() => setScope('week')}
            className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              scope === 'week'
                ? 'bg-[#0B5B53] text-white shadow-xs'
                : 'text-[#0B4F49] hover:text-[#083B37]'
            }`}
          >
            Settimana
          </button>
        </div>

        <input
          type="date"
          value={anchorDate}
          onChange={(e) => {
            if (e.target.value) setAnchorDate(e.target.value);
          }}
          aria-label="Data di riferimento per stampa ed esportazione"
          className="flex-1 min-h-[32px] rounded-xl border border-[#7ECBBF] bg-[#EDFBF8] px-2.5 py-1 text-[#072C29]"
        />
      </div>

      {/* 4 Visualization Modes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {PRINT_LAYOUT_OPTIONS.map((opt) => {
          const active = layout === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLayout(opt.id)}
              aria-pressed={active}
              className={`min-h-[30px] rounded-lg border px-2 py-1 text-[10.5px] font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'border-[#08443E] bg-[#0B5B53] text-white shadow-xs'
                  : 'border-[#7ECBBF] bg-[#EDFBF8] text-[#0B4F49] hover:bg-[#D8F4EE]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Filter Toggles */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[11px] text-[#083B37]">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeEmptyPhases}
            onChange={(e) => setIncludeEmptyPhases(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#0F766E] rounded"
          />
          <span>Fasi vuote</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => setIncludeCompleted(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#0F766E] rounded"
          />
          <span>Completate</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDiaryNotes}
            onChange={(e) => setIncludeDiaryNotes(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#0F766E] rounded"
          />
          <span>Appunti Diario</span>
        </label>
      </div>

      {/* Live Preview */}
      <div
        className={`rounded-xl border border-[#9BDCD1] bg-[#EDFBF8]/80 p-2 overflow-y-auto ${
          compact ? 'max-h-48' : 'max-h-64'
        }`}
      >
        <OrganizeSheetPreview data={exportData} options={options} />
      </div>

      {/* Export & Print Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-2.5 py-1 text-[11px] font-semibold text-white hover:from-[#0C786E] hover:to-[#08443E]"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isPrinting ? 'Preparo...' : 'Stampa'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const filename = exportOrganizeToPdf(exportData, options);
            onNotify(`PDF esportato: ${filename}`);
          }}
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC] px-2.5 py-1 text-[11px] font-semibold text-[#083B37] hover:bg-[#D8F4EE]"
        >
          <FileText className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
          <span>PDF</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const filename = exportOrganizeToExcel(exportData, options);
            onNotify(`Excel esportato: ${filename}`);
          }}
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC] px-2.5 py-1 text-[11px] font-semibold text-[#083B37] hover:bg-[#D8F4EE]"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
          <span>Excel</span>
        </button>

        <button
          type="button"
          onClick={handleCopyText}
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC] px-2.5 py-1 text-[11px] font-semibold text-[#083B37] hover:bg-[#D8F4EE]"
        >
          {copiedFeedback ? (
            <Check className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
          )}
          <span>{copiedFeedback ? 'Copiato' : 'Copia'}</span>
        </button>
      </div>

      {portalNode &&
        createPortal(
          <OrganizeSheetPreview data={exportData} options={options} isPrintMode />,
          portalNode
        )}
    </div>
  );
};

export const OrganizeExportCardBlock: React.FC<{
  organizeItems: OrganizeNoteItem[];
  dailyNotes: DailyNote[];
  onNotify: (msg: string) => void;
}> = ({ organizeItems, dailyNotes, onNotify }) => {
  return (
    <section className="rounded-2xl border border-[#7ECBBF]/85 bg-[#F7FEFC]/95 p-3 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Printer className="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
          <h3 className="text-xs sm:text-sm font-bold text-[#083B37] truncate">
            Esporta &amp; Stampa programma
          </h3>
        </div>
        <span className="font-mono text-[10px] font-semibold text-[#0F6E66] shrink-0">
          4 viste
        </span>
      </div>

      <OrganizeExportControls
        organizeItems={organizeItems}
        dailyNotes={dailyNotes}
        onNotify={onNotify}
      />
    </section>
  );
};

export const OrganizeExportModal: React.FC<{
  open: boolean;
  organizeItems: OrganizeNoteItem[];
  dailyNotes: DailyNote[];
  initialDate?: string;
  initialScope?: OrganizeExportScope;
  onClose: () => void;
  onNotify: (msg: string) => void;
}> = ({
  open,
  organizeItems,
  dailyNotes,
  initialDate,
  initialScope = 'day',
  onClose,
  onNotify,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#042422]/45 backdrop-blur-xs p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-export-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#F7FEFC] border border-[#7ECBBF] p-3.5 shadow-2xl space-y-2.5 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Printer className="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
            <h3 id="org-export-modal-title" className="text-xs font-bold text-[#083B37] truncate">
              Stampa &amp; Esporta Giornata / Settimana
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#9BDCD1] text-[#0B534D] hover:bg-[#D8F4EE] shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <OrganizeExportControls
          organizeItems={organizeItems}
          dailyNotes={dailyNotes}
          initialDate={initialDate}
          initialScope={initialScope}
          compact
          onNotify={onNotify}
        />
      </div>
    </div>
  );
};
