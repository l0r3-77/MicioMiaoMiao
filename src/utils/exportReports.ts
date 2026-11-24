import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { DailyNote } from '../types/note';
import {
  formatItalianDateLong,
  formatItalianDateShort,
  getDayPeriod,
  DAY_PERIOD_LABELS,
} from './dateUtils';
import { NOTE_COLORS, type ColorValence, COLOR_VALENCE_META } from './noteColors';

export type ExportScope = 'all' | 'stats' | 'notes';

export interface ExportStatsPayload {
  periodLabel: string;
  totalEntries: number;
  activeDaysCount: number;
  avgValenceScore: number | null;
  topColorLabel: string;
  colorRows: Array<{
    label: string;
    valenceLabel: string;
    score: number;
    count: number;
    pct: number;
  }>;
  valenceRows: Array<{
    label: string;
    scoreLabel: string;
    colors: string;
    count: number;
    pct: number;
  }>;
  periodRows: Array<{
    title: string;
    range: string;
    count: number;
    pct: number;
    topSensations: string;
  }>;
  sensationRows: Array<{
    text: string;
    tone: string;
    count: number;
  }>;
  dailyTimelineRows: Array<{
    date: string;
    count: number;
    avgScore: number | null;
    summary: string;
  }>;
  filteredNotes: Array<{
    date: string;
    dayTitle: string;
    time: string;
    colorLabel: string;
    score: number;
    source: string;
    transcript: string;
    bullets: string[];
  }>;
  chartSvgContainers?: Array<{ title: string; element: HTMLElement | null }>;
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

function sanitizeFilenameSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'report';
}

export function buildNotesExportRows(dailyNotes: DailyNote[], startDate?: string, endDate?: string) {
  const rows: ExportStatsPayload['filteredNotes'] = [];
  const sortedDays = [...dailyNotes]
    .filter((d) => {
      if (startDate && d.date < startDate) return false;
      if (endDate && d.date > endDate) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const dn of sortedDays) {
    const sortedEntries = [...dn.entries].sort((a, b) => a.time.localeCompare(b.time));
    for (const entry of sortedEntries) {
      const col = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
      rows.push({
        date: dn.date,
        dayTitle: dn.title,
        time: entry.time,
        colorLabel: col.label,
        score: col.valenceScore,
        source: entry.source === 'voice' ? 'Voce' : 'Testo',
        transcript: entry.transcript || '(Solo audio)',
        bullets: entry.bullets || [],
      });
    }
  }
  return rows;
}

export function exportToExcel(scope: ExportScope, payload: ExportStatsPayload) {
  const wb = XLSX.utils.book_new();
  const slug = sanitizeFilenameSlug(payload.periodLabel);

  if (scope === 'all' || scope === 'stats') {
    const summaryData = [
      ['Report Statistiche MicioMiao'],
      ['Periodo filtro', payload.periodLabel],
      ['Appunti analizzati', payload.totalEntries],
      ['Giorni con note', payload.activeDaysCount],
      [
        'Media valenza (-2 a +2)',
        payload.avgValenceScore !== null ? Number(payload.avgValenceScore.toFixed(2)) : 'N/D',
      ],
      ['Colore più frequente', payload.topColorLabel || 'N/D'],
      [],
      ['Valenza', 'Punteggio', 'Colori inclusi', 'Appunti', '%'],
      ...payload.valenceRows.map((v) => [v.label, v.scoreLabel, v.colors, v.count, `${v.pct}%`]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Riepilogo');

    const colorsSheetData = [
      ['Colore', 'Valenza', 'Punteggio', 'Appunti', 'Percentuale'],
      ...payload.colorRows.map((c) => [c.label, c.valenceLabel, c.score, c.count, `${c.pct}%`]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(colorsSheetData), 'Colori');

    const periodSheetData = [
      ['Fascia oraria', 'Intervallo', 'Appunti', 'Percentuale', 'Sensazioni frequenti'],
      ...payload.periodRows.map((p) => [p.title, p.range, p.count, `${p.pct}%`, p.topSensations]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(periodSheetData), 'Fasce orarie');

    const timelineSheetData = [
      ['Data', 'Appunti', 'Media punteggio (-2..+2)', 'Nota chiave'],
      ...payload.dailyTimelineRows.map((d) => [
        d.date,
        d.count,
        d.avgScore !== null ? Number(d.avgScore.toFixed(2)) : '',
        d.summary,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(timelineSheetData), 'Andamento');

    const sensationsSheetData = [
      ['Sensazione / Stato', 'Tono', 'Occorrenze'],
      ...payload.sensationRows.map((s) => [s.text, s.tone, s.count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sensationsSheetData), 'Sensazioni');
  }

  if (scope === 'all' || scope === 'notes') {
    const notesSheetData = [
      ['Data', 'Titolo giornata', 'Orario', 'Fascia', 'Colore', 'Valenza', 'Fonte', 'Testo appunto', 'Sintesi sensazioni'],
      ...payload.filteredNotes.map((n) => {
        const dp = DAY_PERIOD_LABELS[getDayPeriod(n.time)].title;
        return [
          n.date,
          n.dayTitle,
          n.time,
          dp,
          n.colorLabel,
          n.score,
          n.source,
          n.transcript,
          n.bullets.join(' | '),
        ];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notesSheetData), 'Note giornaliere');
  }

  const outArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([outArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const suffix = scope === 'notes' ? 'note' : scope === 'stats' ? 'statistiche' : 'completo';
  triggerBlobDownload(blob, `miciomiao-${suffix}-${slug}.xlsx`);
}

async function svgElementToPngDataUrl(svg: SVGSVGElement): Promise<{
  dataUrl: string;
  aspect: number;
} | null> {
  try {
    const serializer = new XMLSerializer();
    const cloned = svg.cloneNode(true) as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const w = Math.max(rect.width || 600, 320);
    const h = Math.max(rect.height || 200, 120);
    cloned.setAttribute('width', String(w));
    cloned.setAttribute('height', String(h));
    if (!cloned.getAttribute('xmlns')) {
      cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const svgStr = serializer.serializeToString(cloned);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve({ dataUrl: png, aspect: w / h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function exportToPdf(scope: ExportScope, payload: ExportStatsPayload) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(28, 25, 23);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(196, 181, 253);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Document Header
  doc.setFillColor(250, 245, 232);
  doc.roundedRect(margin, y - 5, usableWidth, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text('MicioMiao — Report Personale', margin + 4, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(87, 83, 78);
  const scopeLabel =
    scope === 'notes'
      ? 'Note giornaliere'
      : scope === 'stats'
        ? 'Grafici e statistiche'
        : 'Statistiche, grafici e note complete';
  doc.text(`Sezione: ${scopeLabel}   |   Periodo: ${payload.periodLabel}`, margin + 4, y + 10);
  y += 22;

  if (scope === 'all' || scope === 'stats') {
    addSectionTitle('Riepilogo Statistiche');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(41, 37, 36);
    const avgTxt =
      payload.avgValenceScore !== null
        ? `${payload.avgValenceScore > 0 ? '+' : ''}${payload.avgValenceScore.toFixed(2)} (scala da -2 a +2)`
        : 'N/D';
    const summaryLines = [
      `• Appunti analizzati: ${payload.totalEntries}`,
      `• Giorni con note: ${payload.activeDaysCount}`,
      `• Media valenza emotiva: ${avgTxt}`,
      `• Colore più frequente: ${payload.topColorLabel || 'N/D'}`,
    ];
    for (const line of summaryLines) {
      ensureSpace(6);
      doc.text(line, margin + 2, y);
      y += 5.5;
    }
    y += 2;

    addSectionTitle('Distribuzione Colori & Valenza');
    doc.setFontSize(9.5);
    for (const c of payload.colorRows) {
      ensureSpace(6);
      doc.text(
        `• ${c.label} (${c.valenceLabel}): ${c.count} appunti (${c.pct}%)`,
        margin + 2,
        y
      );
      y += 5;
    }
    y += 2;

    addSectionTitle('Fasce Orarie della Giornata');
    for (const p of payload.periodRows) {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.title} (${p.range}): ${p.count} appunti (${p.pct}%)`, margin + 2, y);
      y += 4.5;
      if (p.topSensations) {
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(`Sensazioni: ${p.topSensations}`, usableWidth - 6);
        doc.text(wrapped, margin + 4, y);
        y += wrapped.length * 4.2 + 1;
      }
    }
    y += 2;

    // Render SVG Charts as High-Res PNGs in PDF
    if (payload.chartSvgContainers && payload.chartSvgContainers.length > 0) {
      for (const container of payload.chartSvgContainers) {
        if (!container.element) continue;
        const svg = container.element.querySelector('svg');
        if (!svg) continue;
        const png = await svgElementToPngDataUrl(svg);
        if (!png) continue;

        const targetW = Math.min(usableWidth, 175);
        const targetH = Math.min(72, targetW / Math.max(0.5, png.aspect));
        ensureSpace(targetH + 14);
        addSectionTitle(`Grafico: ${container.title}`);
        doc.addImage(png.dataUrl, 'PNG', margin, y, targetW, targetH);
        y += targetH + 6;
      }
    }

    if (payload.sensationRows.length > 0) {
      addSectionTitle('Sensazioni più Frequenti');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      for (const s of payload.sensationRows.slice(0, 15)) {
        ensureSpace(5.5);
        doc.text(`• ${s.text} — ${s.count}× (${s.tone})`, margin + 2, y);
        y += 5;
      }
      y += 2;
    }
  }

  if (scope === 'all' || scope === 'notes') {
    addSectionTitle(`Note Giornaliere (${payload.filteredNotes.length} appunti)`);
    if (payload.filteredNotes.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Nessuna nota presente nel periodo selezionato.', margin + 2, y);
      y += 6;
    } else {
      let lastDate = '';
      for (const note of payload.filteredNotes) {
        if (note.date !== lastDate) {
          ensureSpace(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(109, 40, 217);
          doc.text(
            `${formatItalianDateLong(note.date)} — ${note.dayTitle}`,
            margin,
            y
          );
          y += 5.5;
          lastDate = note.date;
        }

        const textLines = doc.splitTextToSize(note.transcript, usableWidth - 6);
        const bulletText =
          note.bullets.length > 0 ? `Sensazioni: ${note.bullets.join(' · ')}` : '';
        const bulletLines = bulletText
          ? doc.splitTextToSize(bulletText, usableWidth - 6)
          : [];
        const estHeight = 6 + textLines.length * 4.3 + bulletLines.length * 4 + 4;
        ensureSpace(estHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(28, 25, 23);
        doc.text(
          `${note.time}  ·  ${note.colorLabel} (${note.score > 0 ? '+' : ''}${note.score})  ·  ${note.source}`,
          margin + 2,
          y
        );
        y += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(41, 37, 36);
        doc.text(textLines, margin + 3, y);
        y += textLines.length * 4.3 + 1;

        if (bulletLines.length > 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.8);
          doc.setTextColor(87, 83, 78);
          doc.text(bulletLines, margin + 3, y);
          y += bulletLines.length * 4 + 1;
        }
        y += 2.5;
      }
    }
  }

  const slug = sanitizeFilenameSlug(payload.periodLabel);
  const suffix = scope === 'notes' ? 'note' : scope === 'stats' ? 'statistiche' : 'completo';
  const pdfBlob = doc.output('blob');
  triggerBlobDownload(pdfBlob, `miciomiao-${suffix}-${slug}.pdf`);
}

export function exportSingleDayNotes(
  dailyNote: DailyNote,
  format: 'excel' | 'pdf'
) {
  const rows = buildNotesExportRows([dailyNote]);
  const payload: ExportStatsPayload = {
    periodLabel: formatItalianDateShort(dailyNote.date),
    totalEntries: rows.length,
    activeDaysCount: 1,
    avgValenceScore: null,
    topColorLabel: '',
    colorRows: [],
    valenceRows: Object.values(COLOR_VALENCE_META).map((m) => ({
      label: m.label,
      scoreLabel: m.scoreLabel,
      colors: m.subtitle,
      count: 0,
      pct: 0,
    })),
    periodRows: [],
    sensationRows: [],
    dailyTimelineRows: [],
    filteredNotes: rows,
  };
  if (format === 'excel') {
    exportToExcel('notes', payload);
  } else {
    void exportToPdf('notes', payload);
  }
}
