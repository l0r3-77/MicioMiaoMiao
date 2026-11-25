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
      <div className={isPrintMode ? 'p-2 text-slate-900' : 'text-[10.5px] text-[var(--todo-text)]'}>
        <div
          className={`mb-2 border-b pb-1.5 flex items-baseline justify-between gap-2 ${
            isPrintMode ? 'border-slate-300' : 'border-[var(--todo-card-border)]'
          }`}
        >
          <div>
            <h4 className={`font-bold text-sm ${isPrintMode ? 'text-slate-900' : 'text-[var(--todo-text)]'}`}>
              {data.title}
            </h4>
            <p className={`text-[10px] ${isPrintMode ? 'text-slate-600' : 'text-[var(--todo-text-muted)]'}`}>
              {data.totalTasks} attività · {data.totalCompleted} completate
              {options.includeDiaryNotes ? ` · ${data.totalDiaryEntries} appunti diario` : ''}
            </p>
          </div>
          <span className={`font-mono text-[9.5px] ${isPrintMode ? 'text-slate-600' : 'text-[var(--todo-text-muted)]'}`}>
            Griglia fasi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={isPrintMode ? 'bg-slate-100' : 'bg-[var(--todo-accent-soft)]'}>
                <th
                  className={`border px-1.5 py-1 font-bold text-[10px] w-20 ${
                    isPrintMode ? 'border-slate-300 text-slate-900' : 'border-[var(--todo-card-border)] text-[var(--todo-text)]'
                  }`}
                >
                  Fase
                </th>
                {data.days.map((d) => (
                  <th
                    key={d.date}
                    className={`border px-1.5 py-1 font-bold text-[10px] min-w-[92px] ${
                      isPrintMode ? 'border-slate-300 text-slate-900' : 'border-[var(--todo-card-border)] text-[var(--todo-text)]'
                    }`}
                  >
                    <span className={`uppercase mr-1 ${isPrintMode ? 'text-slate-600' : 'text-[var(--todo-text-muted)]'}`}>
                      {d.weekdayLabel}
                    </span>
                    <span>{d.dateShort}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_PHASES.map((phaseMeta) => (
                <tr key={phaseMeta.key} className="align-top">
                  <td
                    className={`border px-1.5 py-1 font-bold text-[10px] ${
                      isPrintMode
                        ? 'border-slate-300 bg-slate-50 text-slate-800'
                        : 'border-[var(--todo-card-border)] bg-[var(--todo-surface)] text-[var(--todo-text)]'
                    }`}
                  >
                    {phaseMeta.title}
                  </td>
                  {data.days.map((d) => {
                    const phase = d.phases.find((p) => p.key === phaseMeta.key);
                    const items = phase?.items || [];
                    return (
                      <td
                        key={`${d.date}-${phaseMeta.key}`}
                        className={`border px-1.5 py-1 ${
                          isPrintMode ? 'border-slate-300 bg-white' : 'border-[var(--todo-card-border)] bg-[var(--todo-card)]'
                        }`}
                      >
                        {items.length === 0 ? (
                          <span className={`text-[9.5px] ${isPrintMode ? 'text-slate-400' : 'text-[var(--todo-text-muted)] opacity-60'}`}>
                            —
                          </span>
                        ) : (
                          <ul className="space-y-0.5">
                            {items.map((it) => (
                              <li
                                key={it.id}
                                className={`text-[10px] leading-snug flex items-start gap-1 ${
                                  it.done
                                    ? 'line-through opacity-50'
                                    : isPrintMode
                                      ? 'text-slate-800'
                                      : 'text-[var(--todo-text)]'
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
                  <td
                    className={`border px-1.5 py-1 font-bold text-[10px] ${
                      isPrintMode
                        ? 'border-slate-300 bg-slate-50 text-slate-900'
                        : 'border-[var(--todo-card-border)] bg-[var(--todo-accent-soft)] text-[var(--todo-text)]'
                    }`}
                  >
                    Diario
                  </td>
                  {data.days.map((d) => (
                    <td
                      key={`${d.date}-diary`}
                      className={`border px-1.5 py-1 ${
                        isPrintMode ? 'border-slate-300 bg-white' : 'border-[var(--todo-card-border)] bg-[var(--todo-card)]'
                      }`}
                    >
                      {d.diaryEntries.length === 0 ? (
                        <span className={`text-[9.5px] ${isPrintMode ? 'text-slate-400' : 'text-[var(--todo-text-muted)] opacity-60'}`}>
                          —
                        </span>
                      ) : (
                        <ul className="space-y-0.5">
                          {d.diaryEntries.map((e) => (
                            <li
                              key={e.id}
                              className={`text-[9.5px] leading-snug ${isPrintMode ? 'text-slate-700' : 'text-[var(--todo-text-muted)]'}`}
                            >
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
    <div className={isPrintMode ? 'p-2 text-slate-900 space-y-3' : 'space-y-2.5 text-[var(--todo-text)]'}>
      <div
        className={`border-b pb-1.5 flex items-baseline justify-between gap-2 ${
          isPrintMode ? 'border-slate-300' : 'border-[var(--todo-card-border)]'
        }`}
      >
        <div>
          <h4 className={`font-bold text-sm ${isPrintMode ? 'text-slate-900' : 'text-[var(--todo-text)]'}`}>
            {data.title}
          </h4>
          <p className={`text-[10px] ${isPrintMode ? 'text-slate-600' : 'text-[var(--todo-text-muted)]'}`}>
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
              className={`rounded-xl border ${
                isPrintMode
                  ? 'border-slate-300 bg-white'
                  : 'border-[var(--todo-card-border)] bg-[var(--todo-card)]'
              } ${options.layout === 'minimal' ? 'p-2' : 'p-2.5'} space-y-1.5 break-inside-avoid`}
            >
              <div
                className={`flex items-center justify-between border-b pb-1 ${
                  isPrintMode ? 'border-slate-200' : 'border-[var(--todo-phase-border)]'
                }`}
              >
                <h5 className={`font-bold text-xs capitalize ${isPrintMode ? 'text-slate-900' : 'text-[var(--todo-text)]'}`}>
                  {day.dateLong}
                </h5>
                <span className={`font-mono text-[10px] ${isPrintMode ? 'text-slate-600' : 'text-[var(--todo-text-muted)]'}`}>
                  {day.phases.reduce((acc, p) => acc + p.items.length, 0)} note
                </span>
              </div>

              {visiblePhases.length === 0 && (!options.includeDiaryNotes || day.diaryEntries.length === 0) ? (
                <p className={`text-[10.5px] italic ${isPrintMode ? 'text-slate-400' : 'text-[var(--todo-text-muted)] opacity-70'}`}>
                  Nessuna nota salvata
                </p>
              ) : (
                <div className={options.layout === 'minimal' ? 'space-y-1' : 'space-y-1.5'}>
                  {visiblePhases.map((phase) => (
                    <div key={phase.key} className="space-y-0.5">
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          isPrintMode ? 'text-slate-700' : 'text-[var(--todo-text-muted)]'
                        }`}
                      >
                        {phase.title}
                      </p>
                      {phase.items.length === 0 ? (
                        <p className={`text-[10px] pl-2 ${isPrintMode ? 'text-slate-400' : 'text-[var(--todo-text-muted)] opacity-60'}`}>
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
                                item.done
                                  ? 'line-through opacity-50'
                                  : isPrintMode
                                    ? 'text-slate-800'
                                    : 'text-[var(--todo-text)]'
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
                    <div
                      className={`pt-1 border-t border-dashed space-y-0.5 ${
                        isPrintMode ? 'border-slate-300' : 'border-[var(--todo-phase-border)]'
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${isPrintMode ? 'text-slate-800' : 'text-[var(--todo-text-muted)]'}`}>
                        Appunti Diario
                      </p>
                      <ul className="space-y-0.5 pl-1.5">
                        {day.diaryEntries.map((entry) => (
                          <li
                            key={entry.id}
                            className={`text-[10.5px] leading-snug ${isPrintMode ? 'text-slate-700' : 'text-[var(--todo-text)]'}`}
                          >
                            <span className={`font-mono font-semibold mr-1 ${isPrintMode ? 'text-slate-900' : 'text-[var(--todo-text)]'}`}>
                              {entry.time}
                            </span>
                            <span className={`mr-1 ${isPrintMode ? 'text-slate-500' : 'text-[var(--todo-text-muted)]'}`}>
                              ({entry.colorLabel})
                            </span>
                            <span>{entry.transcript}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {options.layout === 'planner' && (
                    <div className="pt-1.5 space-y-2">
                      <div className={`border-b border-dashed h-3 ${isPrintMode ? 'border-slate-300' : 'border-[var(--todo-phase-border)]'}`} />
                      <div className={`border-b border-dashed h-3 ${isPrintMode ? 'border-slate-300' : 'border-[var(--todo-phase-border)]'}`} />
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--todo-accent-soft)] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setScope('day')}
            className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              scope === 'day'
                ? 'bg-[var(--todo-accent-dark)] text-white shadow-xs'
                : 'text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]'
            }`}
          >
            Giornata
          </button>
          <button
            type="button"
            onClick={() => setScope('week')}
            className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              scope === 'week'
                ? 'bg-[var(--todo-accent-dark)] text-white shadow-xs'
                : 'text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]'
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
          className="flex-1 min-h-[32px] rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] px-2.5 py-1 text-[var(--todo-text)]"
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
                  ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-dark)] text-white shadow-xs'
                  : 'border-[var(--todo-card-border)] bg-[var(--todo-surface)] text-[var(--todo-text-muted)] hover:bg-[var(--todo-accent-soft)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Filter Toggles */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[11px] text-[var(--todo-text)]">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeEmptyPhases}
            onChange={(e) => setIncludeEmptyPhases(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--todo-accent)] rounded"
          />
          <span>Fasi vuote</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => setIncludeCompleted(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--todo-accent)] rounded"
          />
          <span>Completate</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDiaryNotes}
            onChange={(e) => setIncludeDiaryNotes(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--todo-accent)] rounded"
          />
          <span>Appunti Diario</span>
        </label>
      </div>

      {/* Live Preview */}
      <div
        className={`rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] p-2 overflow-y-auto ${
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
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
          style={{
            background: 'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
          }}
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
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]"
        >
          <FileText className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
          <span>PDF</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const filename = exportOrganizeToExcel(exportData, options);
            onNotify(`Excel esportato: ${filename}`);
          }}
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
          <span>Excel</span>
        </button>

        <button
          type="button"
          onClick={handleCopyText}
          className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]"
        >
          {copiedFeedback ? (
            <Check className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
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
    <section className="rounded-2xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] p-3 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Printer className="h-4 w-4 text-[var(--todo-accent)] shrink-0" aria-hidden="true" />
          <h3 className="text-xs sm:text-sm font-bold text-[var(--todo-text)] truncate">
            Esporta &amp; Stampa programma
          </h3>
        </div>
        <span className="font-mono text-[10px] font-semibold text-[var(--todo-text-muted)] shrink-0">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-export-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Printer className="h-4 w-4 text-[var(--todo-accent)] shrink-0" aria-hidden="true" />
            <h3 id="org-export-modal-title" className="text-xs font-bold text-[var(--todo-text)] truncate">
              Stampa &amp; Esporta Giornata / Settimana
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-card-border)] text-[var(--todo-text-muted)] hover:bg-[var(--todo-accent-soft)] shrink-0"
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
