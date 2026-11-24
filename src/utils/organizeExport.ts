import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { DayPhaseKey, OrganizeNoteItem } from '../types/dailyTodo';
import type { DailyNote, NoteEntry } from '../types/note';
import { resolveCatEmoticonId, type CatEmoticonId } from './catEmoticonLibrary';
import { DAY_PHASE_MAP, DAY_PHASES } from './dailyTodoStorage';
import {
  formatItalianDateLong,
  formatItalianDateShort,
  formatItalianWeekdayShort,
  getWeekDaysISO,
} from './dateUtils';
import { NOTE_COLORS } from './noteColors';

export type OrganizeExportScope = 'day' | 'week';
export type OrganizePrintLayout = 'phases' | 'grid' | 'minimal' | 'planner';

export interface OrganizeExportOptions {
  scope: OrganizeExportScope;
  anchorDate: string;
  layout: OrganizePrintLayout;
  includeEmptyPhases: boolean;
  includeCompleted: boolean;
  includeDiaryNotes: boolean;
}

export interface OrganizeExportDayRow {
  date: string;
  weekdayLabel: string;
  dateShort: string;
  dateLong: string;
  phases: Array<{
    key: DayPhaseKey;
    title: string;
    items: Array<{
      id: string;
      text: string;
      catEmoticonId: CatEmoticonId;
      done: boolean;
    }>;
  }>;
  diaryEntries: Array<{
    id: string;
    time: string;
    colorLabel: string;
    transcript: string;
    bullets: string[];
  }>;
}

export interface BuiltOrganizeExportData {
  scope: OrganizeExportScope;
  title: string;
  periodLabel: string;
  days: OrganizeExportDayRow[];
  totalTasks: number;
  totalCompleted: number;
  totalDiaryEntries: number;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function buildOrganizeExportData(
  organizeItems: OrganizeNoteItem[],
  dailyNotes: DailyNote[],
  options: OrganizeExportOptions
): BuiltOrganizeExportData {
  const dates =
    options.scope === 'week' ? getWeekDaysISO(options.anchorDate) : [options.anchorDate];

  const diaryByDate = new Map<string, NoteEntry[]>();
  if (options.includeDiaryNotes) {
    for (const dn of dailyNotes) {
      diaryByDate.set(
        dn.date,
        [...dn.entries].sort((a, b) => a.time.localeCompare(b.time))
      );
    }
  }

  let totalTasks = 0;
  let totalCompleted = 0;
  let totalDiaryEntries = 0;

  const days: OrganizeExportDayRow[] = dates.map((date) => {
    const phases = DAY_PHASES.map((phase) => {
      const slotItems = organizeItems
        .filter((it) => it.date === date && it.phase === phase.key)
        .filter((it) => options.includeCompleted || !it.done)
        .sort((a, b) => a.order - b.order)
        .map((it) => {
          totalTasks += 1;
          if (it.done) totalCompleted += 1;
          return {
            id: it.id,
            text: it.text,
            catEmoticonId: resolveCatEmoticonId(it.emoji, it.text),
            done: it.done,
          };
        });
      return {
        key: phase.key,
        title: phase.title,
        items: slotItems,
      };
    });

    const rawDiary = diaryByDate.get(date) || [];
    const diaryEntries = rawDiary.map((e) => {
      totalDiaryEntries += 1;
      return {
        id: e.id,
        time: e.time,
        colorLabel: (NOTE_COLORS[e.color] || NOTE_COLORS.amber).label,
        transcript: e.transcript || '(Solo audio)',
        bullets: e.bullets || [],
      };
    });

    return {
      date,
      weekdayLabel: formatItalianWeekdayShort(date),
      dateShort: formatItalianDateShort(date),
      dateLong: formatItalianDateLong(date),
      phases,
      diaryEntries,
    };
  });

  const periodLabel =
    options.scope === 'week'
      ? `${formatItalianDateShort(dates[0])} – ${formatItalianDateShort(dates[dates.length - 1])}`
      : formatItalianDateLong(options.anchorDate);

  return {
    scope: options.scope,
    title:
      options.scope === 'week'
        ? `Settimana · ${periodLabel}`
        : `Giornata · ${formatItalianDateShort(options.anchorDate)}`,
    periodLabel,
    days,
    totalTasks,
    totalCompleted,
    totalDiaryEntries,
  };
}

export function buildOrganizePlainText(
  data: BuiltOrganizeExportData,
  options: OrganizeExportOptions
): string {
  const lines: string[] = [`MICIOMIAO — ${data.title.toUpperCase()}`, ''];

  for (const day of data.days) {
    lines.push(`=== ${day.dateLong.toUpperCase()} ===`);
    let hadContent = false;
    for (const phase of day.phases) {
      if (phase.items.length === 0 && !options.includeEmptyPhases) continue;
      hadContent = true;
      lines.push(`  [${phase.title}]`);
      if (phase.items.length === 0) {
        lines.push('    (nessuna nota)');
      } else {
        for (const item of phase.items) {
          lines.push(`    ${item.done ? '[x]' : '[ ]'} ${item.text}`);
        }
      }
    }
    if (options.includeDiaryNotes && day.diaryEntries.length > 0) {
      hadContent = true;
      lines.push('  [Appunti Diario]');
      for (const d of day.diaryEntries) {
        lines.push(`    • ${d.time} (${d.colorLabel}): ${d.transcript}`);
      }
    }
    if (!hadContent) {
      lines.push('  Nessuna nota salvata.');
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function exportOrganizeToExcel(
  data: BuiltOrganizeExportData,
  options: OrganizeExportOptions
): string {
  const wb = XLSX.utils.book_new();
  const phaseRows: Array<Array<string | number>> = [
    ['Data', 'Giorno', 'Fase del giorno', 'Stato', 'Nota', 'N.'],
  ];

  for (const day of data.days) {
    for (const phase of day.phases) {
      if (phase.items.length === 0 && !options.includeEmptyPhases) continue;
      if (phase.items.length === 0) {
        phaseRows.push([day.date, day.weekdayLabel, phase.title, '-', '(Vuota)', 0]);
      } else {
        phase.items.forEach((it, idx) => {
          phaseRows.push([
            day.date,
            day.weekdayLabel,
            phase.title,
            it.done ? 'Completata' : 'Da fare',
            it.text,
            idx + 1,
          ]);
        });
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(phaseRows), 'Fasi Organizza');

  if (options.includeDiaryNotes) {
    const diaryRows: Array<Array<string>> = [
      ['Data', 'Orario', 'Colore', 'Appunto', 'Sensazioni'],
    ];
    for (const day of data.days) {
      for (const entry of day.diaryEntries) {
        diaryRows.push([
          day.date,
          entry.time,
          entry.colorLabel,
          entry.transcript,
          entry.bullets.join(' | '),
        ]);
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(diaryRows), 'Appunti Diario');
  }

  const outArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([outArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const slug = data.days[0]?.date || 'programma';
  const filename = `miciomiao-${options.scope === 'week' ? 'settimana' : 'giornata'}-${slug}.xlsx`;
  triggerBlobDownload(blob, filename);
  return filename;
}

export function exportOrganizeToPdf(
  data: BuiltOrganizeExportData,
  options: OrganizeExportOptions
): string {
  const isWeeklyGrid = options.layout === 'grid' && data.scope === 'week';
  const doc = new jsPDF({
    orientation: isWeeklyGrid ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 12) {
      doc.addPage();
      y = 14;
    }
  };

  // Header
  doc.setFillColor(212, 244, 236);
  doc.roundedRect(margin, y - 4, usableWidth, 16, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(8, 59, 55);
  doc.text(`MicioMiao — ${data.title}`, margin + 4, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  const layoutLabels: Record<OrganizePrintLayout, string> = {
    phases: 'Scheda per Fasi',
    grid: 'Griglia Compatta',
    minimal: 'Lista Minimal',
    planner: 'Planner + Diario',
  };
  doc.text(
    `Vista: ${layoutLabels[options.layout]}  |  Attività: ${data.totalTasks} (${data.totalCompleted} completate)${
      options.includeDiaryNotes ? `  |  Appunti diario: ${data.totalDiaryEntries}` : ''
    }`,
    margin + 4,
    y + 9
  );
  y += 18;

  if (isWeeklyGrid) {
    // 7 columns x 4 phases weekly table
    const phaseColW = 26;
    const dayColW = (usableWidth - phaseColW) / data.days.length;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(237, 251, 248);
    doc.rect(margin, y, usableWidth, 8, 'F');
    doc.setTextColor(8, 59, 55);
    doc.text('Fase', margin + 2, y + 5.2);
    data.days.forEach((d, idx) => {
      const x = margin + phaseColW + idx * dayColW;
      doc.text(`${d.weekdayLabel.toUpperCase()} ${d.dateShort}`, x + 1.5, y + 5.2);
    });
    y += 8;

    for (const phaseMeta of DAY_PHASES) {
      const cellLines = data.days.map((d) => {
        const p = d.phases.find((ph) => ph.key === phaseMeta.key);
        const items = p?.items || [];
        if (items.length === 0) return ['-'];
        const allLines: string[] = [];
        for (const it of items) {
          const prefix = it.done ? '✓ ' : '• ';
          const wrapped = doc.splitTextToSize(`${prefix}${it.text}`, dayColW - 3);
          allLines.push(...wrapped);
        }
        return allLines;
      });
      const maxLines = Math.max(2, ...cellLines.map((cl) => cl.length));
      const rowH = Math.max(18, maxLines * 3.8 + 4);
      ensureSpace(rowH);

      doc.setDrawColor(155, 220, 209);
      doc.rect(margin, y, phaseColW, rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(11, 91, 83);
      doc.text(phaseMeta.title, margin + 2, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(7, 44, 41);
      data.days.forEach((_, idx) => {
        const x = margin + phaseColW + idx * dayColW;
        doc.rect(x, y, dayColW, rowH);
        doc.text(cellLines[idx], x + 1.5, y + 5);
      });
      y += rowH;
    }
  } else {
    for (const day of data.days) {
      ensureSpace(16);
      doc.setFillColor(237, 251, 248);
      doc.roundedRect(margin, y, usableWidth, 7.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(8, 59, 55);
      doc.text(day.dateLong, margin + 3, y + 5.2);
      y += 9.5;

      for (const phase of day.phases) {
        if (phase.items.length === 0 && !options.includeEmptyPhases) continue;
        ensureSpace(9);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(15, 118, 110);
        doc.text(DAY_PHASE_MAP[phase.key].title, margin + 2, y);
        y += 4.2;

        if (phase.items.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.2);
          doc.setTextColor(120, 140, 136);
          doc.text(options.layout === 'planner' ? '________________________________________' : 'Nessuna nota', margin + 5, y);
          y += 4.5;
        } else {
          for (const item of phase.items) {
            const box = item.done ? '[x]' : '[ ]';
            const wrapped = doc.splitTextToSize(`${box} ${item.text}`, usableWidth - 8);
            ensureSpace(wrapped.length * 4 + 1.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(options.layout === 'minimal' ? 8.3 : 9);
            doc.setTextColor(item.done ? 110 : 15, item.done ? 130 : 30, item.done ? 128 : 28);
            doc.text(wrapped, margin + 5, y);
            y += wrapped.length * 4 + 1;
          }
        }
      }

      if (options.includeDiaryNotes && day.diaryEntries.length > 0) {
        ensureSpace(9);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(109, 40, 217);
        doc.text('Appunti Diario salvati', margin + 2, y);
        y += 4.2;
        for (const entry of day.diaryEntries) {
          const wrapped = doc.splitTextToSize(
            `${entry.time} (${entry.colorLabel}) — ${entry.transcript}`,
            usableWidth - 8
          );
          ensureSpace(wrapped.length * 4 + 2);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(41, 37, 36);
          doc.text(wrapped, margin + 5, y);
          y += wrapped.length * 4 + 1.2;
        }
      }

      if (options.layout === 'planner') {
        ensureSpace(12);
        doc.setDrawColor(200, 226, 221);
        doc.line(margin + 2, y + 3, pageWidth - margin - 2, y + 3);
        doc.line(margin + 2, y + 8, pageWidth - margin - 2, y + 8);
        y += 11;
      } else {
        y += 2.5;
      }
    }
  }

  const slug = data.days[0]?.date || 'programma';
  const filename = `miciomiao-${options.scope === 'week' ? 'settimana' : 'giornata'}-${slug}.pdf`;
  triggerBlobDownload(doc.output('blob'), filename);
  return filename;
}
