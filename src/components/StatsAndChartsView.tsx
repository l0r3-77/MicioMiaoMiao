import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Smile,
  TrendingUp,
  X,
} from 'lucide-react';
import type { DailyNote, NoteColor, NoteEntry } from '../types/note';
import {
  DAY_PERIOD_LABELS,
  addDaysISO,
  formatItalianDateLong,
  formatItalianDateShort,
  getDayPeriod,
  parseISODate,
  toISODate,
  type DayPeriod,
} from '../utils/dateUtils';
import {
  buildNotesExportRows,
  exportToExcel,
  exportToPdf,
  type ExportScope,
  type ExportStatsPayload,
} from '../utils/exportReports';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import {
  COLOR_VALENCE_META,
  NOTE_COLOR_LIST,
  NOTE_COLORS,
  type ColorValence,
} from '../utils/noteColors';
import { CHIBI_CAT_MASCOTS, getNekoForDate } from '../utils/nekoCatalog';
import { CatIllustration } from './CatIllustration';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';

interface StatsAndChartsViewProps {
  dailyNotes: DailyNote[];
  sectionLayout: SectionLayoutState;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onSelectDateAndOpenAgenda: (isoDate: string) => void;
  onCreateBlankEntry: (isoDate: string) => void;
}

type StatsPeriod = 'single_day' | '7d' | '30d' | 'month' | 'all' | 'custom';
type TimelineChartType = 'bars' | 'line' | 'valence';
type ColorChartType = 'donut' | 'valence';
type HourlyChartType = 'hours24' | 'periodValence';
type SensationTone = ColorValence;

interface StatsPreferences {
  timelineChartType: TimelineChartType;
  colorChartType: ColorChartType;
  hourlyChartType: HourlyChartType;
}

const PREFS_STORAGE_KEY = 'agendavoce_stats_prefs_v2';

const DEFAULT_PREFS: StatsPreferences = {
  timelineChartType: 'bars',
  colorChartType: 'donut',
  hourlyChartType: 'hours24',
};

function loadPreferences(): StatsPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<StatsPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface FlatEntry {
  date: string;
  entry: NoteEntry;
  period: DayPeriod;
  hour: number;
  colorValence: ColorValence;
  colorScore: number;
}

function normalizeBulletText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function extractSensationCategory(bullet: string): string {
  const colonIdx = bullet.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 22) {
    const prefix = bullet.slice(0, colonIdx).trim();
    if (prefix) {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    }
  }
  return 'Sensazione';
}

function classifySensationTone(bullet: string, entryColor?: NoteColor): SensationTone {
  const lower = bullet.toLowerCase();
  if (
    /esaurit|crollo|stress alt|ansia|rabbia|frustr|pesant|sovraccaric|nervos|pressione alt|trist|malissimo/.test(
      lower
    )
  ) {
    return entryColor === 'light_red' ? 'mild_negative' : 'negative';
  }
  if (/stanc|lieve|legger|pausa|riposo|scaric|teso|tesa|difficil|basso|bassa|\bmale\b/.test(lower)) {
    return entryColor === 'red' || entryColor === 'anthracite' ? 'negative' : 'mild_negative';
  }
  if (
    /contentissim|felicissim|content|entusiast|splendid|benissimo|gioia grande|alla grande/.test(
      lower
    )
  ) {
    return entryColor === 'sky' ? 'positive' : 'very_positive';
  }
  if (
    /seren|calmo|calma|rilassat|tranquill|equilibr|chiar|buon|ottim|felic|positiv|energ|caric|attiv|lucid|solliev|grat|gioi|soddisfatt|abbastanza bene/.test(
      lower
    )
  ) {
    return entryColor === 'celeste' ? 'very_positive' : 'positive';
  }
  if (entryColor && NOTE_COLORS[entryColor]) {
    return NOTE_COLORS[entryColor].valence;
  }
  return 'middle';
}

export const StatsAndChartsView: React.FC<StatsAndChartsViewProps> = ({
  dailyNotes,
  sectionLayout,
  onChangeLayout,
  onResetLayout,
  onSelectDateAndOpenAgenda,
  onCreateBlankEntry,
}) => {
  const todayISO = toISODate(new Date());

  const [prefs, setPrefs] = useState<StatsPreferences>(loadPreferences);
  const [periodFilter, setPeriodFilter] = useState<StatsPeriod>('30d');
  const [singleDayDate, setSingleDayDate] = useState<string>(() => todayISO);
  const [customStartDate, setCustomStartDate] = useState<string>(() => addDaysISO(todayISO, -13));
  const [customEndDate, setCustomEndDate] = useState<string>(() => todayISO);

  const [selectedColors, setSelectedColors] = useState<NoteColor[]>([]);
  const [dayPeriodFilter, setDayPeriodFilter] = useState<DayPeriod | 'all'>('all');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [sensationToneFilter, setSensationToneFilter] = useState<SensationTone | 'all'>('all');
  const [selectedTimelineKey, setSelectedTimelineKey] = useState<string | null>(null);
  const [exportingState, setExportingState] = useState<string | null>(null);

  const timelineChartRef = useRef<HTMLDivElement | null>(null);
  const colorsChartRef = useRef<HTMLDivElement | null>(null);
  const hourlyChartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  }, [prefs]);

  const updatePref = <K extends keyof StatsPreferences>(key: K, value: StatsPreferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const dateRange = useMemo(() => {
    const today = parseISODate(todayISO);
    if (periodFilter === 'single_day') {
      const target = singleDayDate || todayISO;
      return {
        start: target,
        end: target,
        label: formatItalianDateLong(target),
      };
    }
    if (periodFilter === '7d') {
      return { start: addDaysISO(todayISO, -6), end: todayISO, label: 'Ultimi 7 giorni' };
    }
    if (periodFilter === '30d') {
      return { start: addDaysISO(todayISO, -29), end: todayISO, label: 'Ultimi 30 giorni' };
    }
    if (periodFilter === 'month') {
      const monthStart = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
      return { start: monthStart, end: todayISO, label: 'Questo mese' };
    }
    if (periodFilter === 'custom') {
      const s = customStartDate <= customEndDate ? customStartDate : customEndDate;
      const e = customStartDate <= customEndDate ? customEndDate : customStartDate;
      return {
        start: s,
        end: e,
        label: `${formatItalianDateShort(s)} – ${formatItalianDateShort(e)}`,
      };
    }
    return { start: '0000-01-01', end: '9999-12-31', label: 'Tutto lo storico' };
  }, [periodFilter, singleDayDate, customStartDate, customEndDate, todayISO]);

  const toggleSingleColor = (color: NoteColor) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const applyValencePreset = (
    preset: 'all' | 'very_positive' | 'positive' | 'middle' | 'mild_negative' | 'negative'
  ) => {
    if (preset === 'all') {
      setSelectedColors([]);
      return;
    }
    if (preset === 'very_positive') {
      setSelectedColors(['celeste']);
      return;
    }
    if (preset === 'positive') {
      setSelectedColors(['sky']);
      return;
    }
    if (preset === 'middle') {
      setSelectedColors(['amber']);
      return;
    }
    if (preset === 'mild_negative') {
      setSelectedColors(['light_red']);
      return;
    }
    setSelectedColors(['red', 'anthracite']);
  };

  const activeValencePreset = useMemo(() => {
    if (selectedColors.length === 0) return 'all';
    if (selectedColors.length === 1 && selectedColors[0] === 'celeste') return 'very_positive';
    if (selectedColors.length === 1 && selectedColors[0] === 'sky') return 'positive';
    if (selectedColors.length === 1 && selectedColors[0] === 'amber') return 'middle';
    if (selectedColors.length === 1 && selectedColors[0] === 'light_red') return 'mild_negative';
    if (
      selectedColors.length === 2 &&
      selectedColors.includes('red') &&
      selectedColors.includes('anthracite')
    ) {
      return 'negative';
    }
    return 'custom';
  }, [selectedColors]);

  const flatEntries = useMemo<FlatEntry[]>(() => {
    const q = keywordFilter.trim().toLowerCase();
    const result: FlatEntry[] = [];

    for (const dn of dailyNotes) {
      if (dn.date < dateRange.start || dn.date > dateRange.end) continue;
      for (const entry of dn.entries) {
        const safeColor: NoteColor = entry.color in NOTE_COLORS ? entry.color : 'amber';
        if (selectedColors.length > 0 && !selectedColors.includes(safeColor)) continue;

        const dp = getDayPeriod(entry.time || '09:00');
        if (dayPeriodFilter !== 'all' && dp !== dayPeriodFilter) continue;

        if (q) {
          const matchesText =
            entry.transcript.toLowerCase().includes(q) ||
            entry.bullets.some((b) => b.toLowerCase().includes(q));
          if (!matchesText) continue;
        }

        const parsedHour = Number((entry.time || '09:00').split(':')[0]);
        const hour = Number.isFinite(parsedHour) ? Math.max(0, Math.min(23, parsedHour)) : 9;
        const meta = NOTE_COLORS[safeColor];

        result.push({
          date: dn.date,
          entry: { ...entry, color: safeColor },
          period: dp,
          hour,
          colorValence: meta.valence,
          colorScore: meta.valenceScore,
        });
      }
    }

    return result.sort((a, b) =>
      `${a.date} ${a.entry.time}`.localeCompare(`${b.date} ${b.entry.time}`)
    );
  }, [dailyNotes, dateRange, selectedColors, dayPeriodFilter, keywordFilter]);

  const activeDaysCount = useMemo(() => {
    return new Set(flatEntries.map((item) => item.date)).size;
  }, [flatEntries]);

  // Color distribution across the 6 colors
  const colorStats = useMemo(() => {
    const counts: Record<NoteColor, number> = {
      celeste: 0,
      sky: 0,
      amber: 0,
      light_red: 0,
      red: 0,
      anthracite: 0,
    };
    for (const item of flatEntries) {
      counts[item.entry.color]++;
    }
    const total = flatEntries.length || 1;
    return NOTE_COLOR_LIST.map((col) => ({
      meta: col,
      count: counts[col.key],
      pct: Math.round((counts[col.key] / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [flatEntries]);

  const usedColorStats = useMemo(() => colorStats.filter((c) => c.count > 0), [colorStats]);

  // Exact valence breakdown: +2 Contento | +1 Abbastanza bene | 0 Normale | -1 Male | -2 Malissimo
  const colorValenceStats = useMemo(() => {
    const counts: Record<ColorValence, number> = {
      very_positive: 0,
      positive: 0,
      middle: 0,
      mild_negative: 0,
      negative: 0,
    };
    for (const item of flatEntries) {
      counts[item.colorValence]++;
    }
    const total = flatEntries.length || 1;
    const order: ColorValence[] = [
      'very_positive',
      'positive',
      'middle',
      'mild_negative',
      'negative',
    ];
    return order.map((val) => ({
      valence: val,
      meta: COLOR_VALENCE_META[val],
      count: counts[val],
      pct: Math.round((counts[val] / total) * 100),
    }));
  }, [flatEntries]);

  const avgValenceScore = useMemo(() => {
    if (flatEntries.length === 0) return null;
    const sum = flatEntries.reduce((acc, e) => acc + e.colorScore, 0);
    return sum / flatEntries.length;
  }, [flatEntries]);

  const topColor = useMemo(() => {
    return usedColorStats[0] || null;
  }, [usedColorStats]);

  // Time-of-day stats (Pomeriggio 13:30–18:30, Sera 18:31–23:59)
  const dayPeriodStats = useMemo(() => {
    const periods: DayPeriod[] = ['mattina', 'pomeriggio', 'sera', 'notte'];
    return periods.map((p) => {
      const items = flatEntries.filter((f) => f.period === p);
      const valenceCounts: Record<ColorValence, number> = {
        very_positive: 0,
        positive: 0,
        middle: 0,
        mild_negative: 0,
        negative: 0,
      };
      const sensationCounts = new Map<string, number>();

      for (const item of items) {
        valenceCounts[item.colorValence]++;
        for (const b of item.entry.bullets) {
          const clean = normalizeBulletText(b);
          if (clean) sensationCounts.set(clean, (sensationCounts.get(clean) || 0) + 1);
        }
      }

      const topSensations = Array.from(sensationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([text, count]) => ({ text, count }));

      return {
        period: p,
        meta: DAY_PERIOD_LABELS[p],
        count: items.length,
        pct: flatEntries.length ? Math.round((items.length / flatEntries.length) * 100) : 0,
        valenceCounts,
        topSensations,
      };
    });
  }, [flatEntries]);

  const busiestPeriod = useMemo(() => {
    return [...dayPeriodStats].sort((a, b) => b.count - a.count)[0];
  }, [dayPeriodStats]);

  const hourlyCounts = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      dominantColor: 'amber' as NoteColor,
      colorMap: {} as Partial<Record<NoteColor, number>>,
    }));
    for (const item of flatEntries) {
      const slot = hours[item.hour];
      slot.count++;
      slot.colorMap[item.entry.color] = (slot.colorMap[item.entry.color] || 0) + 1;
    }
    for (const slot of hours) {
      let bestColor: NoteColor = 'amber';
      let bestCount = -1;
      for (const [k, v] of Object.entries(slot.colorMap)) {
        if ((v || 0) > bestCount) {
          bestCount = v || 0;
          bestColor = k as NoteColor;
        }
      }
      slot.dominantColor = bestColor;
    }
    return hours;
  }, [flatEntries]);

  const maxHourCount = useMemo(() => {
    return Math.max(1, ...hourlyCounts.map((h) => h.count));
  }, [hourlyCounts]);

  // Daily timeline buckets (scores in [-2, +1])
  const timelineBuckets = useMemo(() => {
    if (flatEntries.length === 0) return [];
    const byDate = new Map<string, FlatEntry[]>();

    if (periodFilter !== 'all') {
      let cursor = dateRange.start;
      let guard = 0;
      while (cursor <= dateRange.end && guard < 62) {
        byDate.set(cursor, []);
        cursor = addDaysISO(cursor, 1);
        guard++;
      }
    }

    for (const item of flatEntries) {
      const arr = byDate.get(item.date) || [];
      arr.push(item);
      byDate.set(item.date, arr);
    }

    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => {
        const colorSegments = NOTE_COLOR_LIST.map((col) => ({
          color: col.key,
          hex: col.hex,
          label: col.label,
          count: items.filter((i) => i.entry.color === col.key).length,
        })).filter((s) => s.count > 0);

        const veryPosCount = items.filter((i) => i.colorValence === 'very_positive').length;
        const posCount = items.filter((i) => i.colorValence === 'positive').length;
        const midCount = items.filter((i) => i.colorValence === 'middle').length;
        const mildNegCount = items.filter((i) => i.colorValence === 'mild_negative').length;
        const negCount = items.filter((i) => i.colorValence === 'negative').length;

        const scoreSum = items.reduce((acc, i) => acc + i.colorScore, 0);
        const avgScore = items.length > 0 ? scoreSum / items.length : null;

        const topBullet = items
          .flatMap((i) => i.entry.bullets)
          .map(normalizeBulletText)
          .find(Boolean);

        return {
          date,
          shortLabel: formatItalianDateShort(date),
          dayNum: date.split('-')[2],
          total: items.length,
          colorSegments,
          veryPosCount,
          posCount,
          midCount,
          mildNegCount,
          negCount,
          avgScore,
          topBullet: topBullet || null,
        };
      });
  }, [flatEntries, periodFilter, dateRange]);

  const maxTimelineTotal = useMemo(() => {
    return Math.max(1, ...timelineBuckets.map((b) => b.total));
  }, [timelineBuckets]);

  const activeBucket = useMemo(() => {
    if (timelineBuckets.length === 0) return null;
    if (selectedTimelineKey) {
      const match = timelineBuckets.find((b) => b.date === selectedTimelineKey);
      if (match) return match;
    }
    return (
      [...timelineBuckets].reverse().find((b) => b.total > 0) ||
      timelineBuckets[timelineBuckets.length - 1]
    );
  }, [timelineBuckets, selectedTimelineKey]);

  // SVG line chart points on scale [-2, +2]
  const lineChartGeometry = useMemo(() => {
    const scoredIndices = timelineBuckets
      .map((b, idx) => ({ bucket: b, idx }))
      .filter((x) => x.bucket.avgScore !== null);

    if (scoredIndices.length === 0) return { points: [], polyline: '', areaPath: '' };

    const width = 600;
    const height = 160;
    const padX = 28;
    const padY = 16;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    const denom = Math.max(1, timelineBuckets.length - 1);

    const scoreToY = (s: number) => padY + ((2 - Math.max(-2, Math.min(2, s))) / 4) * usableH;

    const points = scoredIndices.map(({ bucket, idx }) => {
      const x = timelineBuckets.length === 1 ? width / 2 : padX + (idx / denom) * usableW;
      const score = bucket.avgScore ?? 0;
      const y = scoreToY(score);
      const color =
        score >= 1.35
          ? '#0EA5E9'
          : score >= 0.4
            ? '#7DD3FC'
            : score >= -0.4
              ? '#F59E0B'
              : score >= -1.4
                ? '#FB7185'
                : '#EF4444';
      return { x, y, score, color, bucket };
    });

    const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const baseY = scoreToY(-2);
    const areaPath =
      points.length > 1
        ? `M ${points[0].x.toFixed(1)} ${baseY.toFixed(1)} ` +
          points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
          ` L ${points[points.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} Z`
        : '';

    return { points, polyline, areaPath };
  }, [timelineBuckets]);

  // Sensations & Color Correlations
  const sensationAnalytics = useMemo(() => {
    const phraseMap = new Map<string, { count: number; tone: SensationTone }>();
    const categoryMap = new Map<string, number>();
    const colorCorrelationMap = new Map<NoteColor, Map<string, number>>();

    let veryPositiveCount = 0;
    let positiveCount = 0;
    let middleCount = 0;
    let mildNegativeCount = 0;
    let negativeCount = 0;
    let totalBullets = 0;

    for (const item of flatEntries) {
      for (const rawBullet of item.entry.bullets) {
        const clean = normalizeBulletText(rawBullet);
        if (!clean) continue;
        totalBullets++;
        const tone = classifySensationTone(clean, item.entry.color);
        if (tone === 'very_positive') veryPositiveCount++;
        else if (tone === 'positive') positiveCount++;
        else if (tone === 'middle') middleCount++;
        else if (tone === 'mild_negative') mildNegativeCount++;
        else negativeCount++;

        const existing = phraseMap.get(clean);
        if (existing) {
          existing.count++;
        } else {
          phraseMap.set(clean, { count: 1, tone });
        }

        const cat = extractSensationCategory(clean);
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

        if (!colorCorrelationMap.has(item.entry.color)) {
          colorCorrelationMap.set(item.entry.color, new Map());
        }
        const cMap = colorCorrelationMap.get(item.entry.color)!;
        cMap.set(clean, (cMap.get(clean) || 0) + 1);
      }
    }

    const topPhrases = Array.from(phraseMap.entries())
      .map(([text, meta]) => ({ text, count: meta.count, tone: meta.tone }))
      .filter((p) => sensationToneFilter === 'all' || p.tone === sensationToneFilter)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const colorCorrelations = NOTE_COLOR_LIST.filter((c) => colorCorrelationMap.has(c.key)).map(
      (col) => {
        const entries = Array.from(colorCorrelationMap.get(col.key)!.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([text, count]) => ({ text, count }));
        return { meta: col, topBullets: entries };
      }
    );

    return {
      totalBullets,
      veryPositiveCount,
      positiveCount,
      middleCount,
      mildNegativeCount,
      negativeCount,
      topPhrases,
      categories,
      colorCorrelations,
    };
  }, [flatEntries, sensationToneFilter]);

  const donutSegments = useMemo(() => {
    const total = flatEntries.length;
    if (total === 0) return [];
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    let cumulativeFraction = 0;
    return usedColorStats.map((c) => {
      const fraction = c.count / total;
      const dashLength = fraction * circumference;
      const offset = -cumulativeFraction * circumference;
      cumulativeFraction += fraction;
      return {
        key: c.meta.key,
        label: c.meta.label,
        hex: c.meta.hex,
        count: c.count,
        pct: c.pct,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset: offset,
      };
    });
  }, [usedColorStats, flatEntries.length]);

  const buildExportPayload = (): ExportStatsPayload => {
    const dayLookup = new Map(dailyNotes.map((d) => [d.date, d.title]));
    const filteredNoteRows = flatEntries.map((f) => {
      const col = NOTE_COLORS[f.entry.color] || NOTE_COLORS.amber;
      return {
        date: f.date,
        dayTitle: dayLookup.get(f.date) || `Diario del ${formatItalianDateShort(f.date)}`,
        time: f.entry.time,
        colorLabel: col.label,
        score: col.valenceScore,
        source: f.entry.source === 'voice' ? 'Voce' : 'Testo',
        transcript: f.entry.transcript || '(Solo audio)',
        bullets: f.entry.bullets || [],
      };
    });

    // If user exports notes directly and filter was empty, fall back to dateRange notes
    const notesForExport =
      filteredNoteRows.length > 0
        ? filteredNoteRows
        : buildNotesExportRows(
            dailyNotes,
            periodFilter === 'all' ? undefined : dateRange.start,
            periodFilter === 'all' ? undefined : dateRange.end
          );

    return {
      periodLabel: dateRange.label,
      totalEntries: flatEntries.length,
      activeDaysCount,
      avgValenceScore,
      topColorLabel: topColor ? `${topColor.meta.label} (${topColor.pct}%)` : 'N/D',
      colorRows: colorStats.map((c) => ({
        label: c.meta.label,
        valenceLabel: c.meta.valenceLabel,
        score: c.meta.valenceScore,
        count: c.count,
        pct: c.pct,
      })),
      valenceRows: colorValenceStats.map((v) => ({
        label: v.meta.label,
        scoreLabel: v.meta.scoreLabel,
        colors: v.meta.subtitle,
        count: v.count,
        pct: v.pct,
      })),
      periodRows: dayPeriodStats.map((p) => ({
        title: p.meta.title,
        range: p.meta.range,
        count: p.count,
        pct: p.pct,
        topSensations: p.topSensations.map((s) => `${s.text} (${s.count})`).join(', '),
      })),
      sensationRows: sensationAnalytics.topPhrases.map((s) => ({
        text: s.text,
        tone: COLOR_VALENCE_META[s.tone].label,
        count: s.count,
      })),
      dailyTimelineRows: timelineBuckets.map((b) => ({
        date: b.date,
        count: b.total,
        avgScore: b.avgScore,
        summary: b.topBullet || '',
      })),
      filteredNotes: notesForExport,
      chartSvgContainers: [
        { title: 'Andamento nel periodo', element: timelineChartRef.current },
        { title: 'Distribuzione colori', element: colorsChartRef.current },
        { title: 'Distribuzione oraria (00–23)', element: hourlyChartRef.current },
      ],
    };
  };

  const handleRunExport = async (format: 'excel' | 'pdf', scope: ExportScope) => {
    const key = `${format}-${scope}`;
    setExportingState(key);
    try {
      const payload = buildExportPayload();
      if (format === 'excel') {
        exportToExcel(scope, payload);
      } else {
        await exportToPdf(scope, payload);
      }
    } finally {
      setExportingState(null);
    }
  };

  const hasCustomFilters =
    selectedColors.length > 0 ||
    dayPeriodFilter !== 'all' ||
    keywordFilter.trim() !== '' ||
    periodFilter === 'custom' ||
    periodFilter === 'single_day';

  const resetAllFilters = () => {
    setPeriodFilter('30d');
    setSelectedColors([]);
    setDayPeriodFilter('all');
    setKeywordFilter('');
    setSensationToneFilter('all');
    setSelectedTimelineKey(null);
  };

  const statsNeko = CHIBI_CAT_MASCOTS.stats;
  const statsEmptyNeko = getNekoForDate(todayISO, 4);

  const scoreToVerdict = (score: number) => {
    if (score >= 1.35) return 'Contento';
    if (score >= 0.45) return 'Abbastanza bene';
    if (score >= -0.45) return 'Normale';
    if (score >= -1.35) return 'Male';
    return 'Malissimo';
  };

  const customizableBlocks: CustomizableBlockItem[] = [
    {
      id: 'stats_export',
      render: () => (
        <section className="rounded-3xl border border-[var(--app-accent-soft-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] flex items-center justify-center shrink-0">
                <Download className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--app-text)]">
                  Esporta Grafici, Statistiche o Note
                </h3>
                <p className="text-[11px] text-[var(--app-text-muted)]">
                  Scarica subito in formato Excel (.xlsx) o PDF per il periodo: {dateRange.label}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  scope: 'stats' as const,
                  title: 'Grafici & Statistiche',
                  desc: 'Tabelle + grafici SVG',
                },
                {
                  scope: 'notes' as const,
                  title: 'Note giornaliere',
                  desc: 'Testi, orari, colori e sensazioni',
                },
                {
                  scope: 'all' as const,
                  title: 'Report completo',
                  desc: 'Statistiche, grafici e note insieme',
                },
              ] as const
            ).map((item) => (
              <div
                key={item.scope}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3 flex flex-col justify-between gap-2.5"
              >
                <div>
                  <p className="text-xs font-bold text-[var(--app-text)]">{item.title}</p>
                  <p className="text-[11px] text-[var(--app-text-muted)]">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={exportingState !== null}
                    onClick={() => handleRunExport('excel', item.scope)}
                    className="flex-1 min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:border-[var(--app-accent-soft-border)] hover:bg-[var(--app-accent-soft)] disabled:opacity-50 transition-colors"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    disabled={exportingState !== null}
                    onClick={() => handleRunExport('pdf', item.scope)}
                    className="flex-1 min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--app-btn-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] disabled:opacity-50 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 opacity-85" aria-hidden="true" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ),
    },
    {
      id: 'stats_timeline',
      render: () => (
        <section
          ref={timelineChartRef}
          className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
                <TrendingUp className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
                Andamento nel periodo ({dateRange.label})
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                {prefs.timelineChartType === 'line'
                  ? 'Scala valenza: +2 Contento · +1 Abbastanza bene · 0 Normale · -1 Male · -2 Malissimo'
                  : 'Tocca un giorno sul grafico per aprire i dettagli'}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              {(
                [
                  { id: 'bars', label: 'Barre colori' },
                  { id: 'line', label: 'Linea valenza' },
                  { id: 'valence', label: 'Fasce valenza' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updatePref('timelineChartType', mode.id)}
                  className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    prefs.timelineChartType === mode.id
                      ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {activeBucket && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-muted)]">
              <span className="font-mono font-semibold text-[var(--app-text)]">
                {activeBucket.shortLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {activeBucket.total} {activeBucket.total === 1 ? 'appunto' : 'appunti'}
              </span>
              {activeBucket.avgScore !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Media: {activeBucket.avgScore > 0 ? '+' : ''}
                    {activeBucket.avgScore.toFixed(2)}
                  </span>
                </>
              )}
              {activeBucket.total > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onSelectDateAndOpenAgenda(activeBucket.date)}
                    className="font-semibold text-[var(--app-accent-text)] hover:underline"
                  >
                    Apri giorno
                  </button>
                </>
              )}
            </div>
          )}

          {prefs.timelineChartType === 'line' ? (
            <div className="mt-4">
              {lineChartGeometry.points.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--app-text-muted)]">
                  Servono appunti nel periodo per tracciare la linea emotiva.
                </p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 600 165"
                    className="w-full min-w-[340px] h-48"
                    role="img"
                    aria-label="Grafico a linea della valenza emotiva (+2 a -2)"
                  >
                    <defs>
                      <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.22" />
                        <stop offset="25%" stopColor="#7DD3FC" stopOpacity="0.16" />
                        <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.10" />
                        <stop offset="75%" stopColor="#FB7185" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0.16" />
                      </linearGradient>
                    </defs>
                    {/* Reference lines for +2, +1, 0, -1, -2 */}
                    {[
                      { val: '+2', y: 16, col: '#0284C7' },
                      { val: '+1', y: 48, col: '#0EA5E9' },
                      { val: '0', y: 80, col: '#D97706' },
                      { val: '-1', y: 112, col: '#E11D48' },
                      { val: '-2', y: 144, col: '#DC2626' },
                    ].map((ref) => (
                      <g key={ref.val}>
                        <line
                          x1="28"
                          y1={ref.y}
                          x2="572"
                          y2={ref.y}
                          stroke="var(--app-divider)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x="4"
                          y={ref.y + 3}
                          fontSize="9.5"
                          fill={ref.col}
                          fontFamily="monospace"
                        >
                          {ref.val}
                        </text>
                      </g>
                    ))}

                    {lineChartGeometry.areaPath && (
                      <path d={lineChartGeometry.areaPath} fill="url(#moodAreaGrad)" />
                    )}
                    {lineChartGeometry.points.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="var(--app-text)"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={lineChartGeometry.polyline}
                      />
                    )}
                    {lineChartGeometry.points.map((pt) => {
                      const isSelected = activeBucket?.date === pt.bucket.date;
                      return (
                        <g
                          key={pt.bucket.date}
                          className="cursor-pointer"
                          onClick={() => setSelectedTimelineKey(pt.bucket.date)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? 6.5 : 4.5}
                            fill={pt.color}
                            stroke="var(--app-card)"
                            strokeWidth="2"
                          />
                          <title>
                            {`${pt.bucket.shortLabel}: media ${pt.score.toFixed(2)} (${pt.bucket.total} appunti)`}
                          </title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {/* SVG Bar Chart for clean PDF capture + interactive click columns */}
              <div className="flex items-end gap-1.5 overflow-x-auto pb-2 min-h-[156px]">
                {timelineBuckets.map((bucket) => {
                  const isSelected = activeBucket?.date === bucket.date;
                  const heightPct = bucket.total
                    ? Math.max(14, Math.round((bucket.total / maxTimelineTotal) * 100))
                    : 4;

                  return (
                    <button
                      key={bucket.date}
                      type="button"
                      onClick={() => setSelectedTimelineKey(bucket.date)}
                      aria-label={`${bucket.shortLabel}: ${bucket.total} appunti`}
                      className={`group flex flex-col items-center justify-end gap-1.5 min-w-[26px] flex-1 h-[140px] rounded-lg px-0.5 py-1 transition-colors ${
                        isSelected ? 'bg-[var(--app-accent-soft)]' : 'hover:bg-[var(--app-card-alt)]'
                      }`}
                    >
                      <div className="w-full max-w-[22px] flex-1 flex flex-col justify-end">
                        {bucket.total === 0 ? (
                          <div className="w-full h-1 rounded-full bg-[var(--app-divider)]" />
                        ) : prefs.timelineChartType === 'valence' ? (
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full flex flex-col-reverse overflow-hidden rounded-md border border-[var(--app-border)]"
                          >
                            {bucket.negCount > 0 && (
                              <div
                                style={{ flexGrow: bucket.negCount, backgroundColor: '#EF4444' }}
                                title={`Malissimo (-2 · Rosso/Antracita): ${bucket.negCount}`}
                              />
                            )}
                            {bucket.mildNegCount > 0 && (
                              <div
                                style={{
                                  flexGrow: bucket.mildNegCount,
                                  backgroundColor: '#FCA5A5',
                                }}
                                title={`Male (-1 · Rosso chiaro): ${bucket.mildNegCount}`}
                              />
                            )}
                            {bucket.midCount > 0 && (
                              <div
                                style={{ flexGrow: bucket.midCount, backgroundColor: '#F59E0B' }}
                                title={`Normale (0 · Ambra): ${bucket.midCount}`}
                              />
                            )}
                            {bucket.posCount > 0 && (
                              <div
                                style={{ flexGrow: bucket.posCount, backgroundColor: '#7DD3FC' }}
                                title={`Abbastanza bene (+1 · Celeste chiaro): ${bucket.posCount}`}
                              />
                            )}
                            {bucket.veryPosCount > 0 && (
                              <div
                                style={{ flexGrow: bucket.veryPosCount, backgroundColor: '#0EA5E9' }}
                                title={`Contento (+2 · Celeste): ${bucket.veryPosCount}`}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full flex flex-col-reverse overflow-hidden rounded-md border border-[var(--app-border)]"
                          >
                            {bucket.colorSegments.map((seg) => (
                              <div
                                key={seg.color}
                                style={{
                                  flexGrow: seg.count,
                                  backgroundColor: seg.hex,
                                }}
                                title={`${seg.label}: ${seg.count}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <span
                        className={`font-mono text-[10px] tabular-nums ${
                          isSelected ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-subtle)]'
                        }`}
                      >
                        {bucket.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Hidden/Compact SVG snapshot for PDF when bars mode is active */}
              {timelineBuckets.length > 0 && (
                <svg
                  viewBox="0 0 600 100"
                  className="sr-only"
                  aria-hidden="true"
                >
                  {timelineBuckets.slice(0, 31).map((b, i, arr) => {
                    const slotW = 560 / Math.max(1, arr.length);
                    const barH = b.total ? Math.max(8, (b.total / maxTimelineTotal) * 76) : 2;
                    const dominant = b.colorSegments[0]?.hex || '#E7E5E4';
                    return (
                      <rect
                        key={b.date}
                        x={20 + i * slotW}
                        y={88 - barH}
                        width={Math.max(4, slotW - 3)}
                        height={barH}
                        rx="2"
                        fill={b.total > 0 ? dominant : '#E7E5E4'}
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          {activeBucket?.topBullet && (
            <p className="mt-2 border-t border-[var(--app-divider)] pt-2.5 text-xs text-[var(--app-text-muted)]">
              Nota chiave del{' '}
              <span className="font-semibold text-[var(--app-text)]">{activeBucket.shortLabel}</span>:{' '}
              {activeBucket.topBullet}
            </p>
          )}
        </section>
      ),
    },
    {
      id: 'stats_colors',
      render: () => (
        <section
          ref={colorsChartRef}
          className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[var(--app-text)]">
                Colori &amp; Valenza emotiva (+2 a -2)
              </h3>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              <button
                type="button"
                onClick={() => updatePref('colorChartType', 'donut')}
                className={`min-h-[28px] rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  prefs.colorChartType === 'donut'
                    ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                6 Colori
              </button>
              <button
                type="button"
                onClick={() => updatePref('colorChartType', 'valence')}
                className={`min-h-[28px] rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  prefs.colorChartType === 'valence'
                    ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Punteggi (+2 / +1 / 0 / -1 / -2)
              </button>
            </div>
          </div>

          {prefs.colorChartType === 'donut' ? (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-5">
              {/* Donut SVG */}
              <div className="relative h-36 w-36 shrink-0">
                <svg
                  viewBox="0 0 112 112"
                  className="h-full w-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    fill="none"
                    stroke="var(--app-divider)"
                    strokeWidth="14"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="56"
                      cy="56"
                      r="44"
                      fill="none"
                      stroke={seg.hex}
                      strokeWidth="14"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-lg font-bold text-[var(--app-text)] tabular-nums">
                    {flatEntries.length}
                  </span>
                  <span className="text-[10px] text-[var(--app-text-muted)]">appunti</span>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                {usedColorStats.map(({ meta, count, pct }) => (
                  <div key={meta.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-[var(--app-text)]">
                        <span
                          className={`h-2.5 w-2.5 rounded-full border shrink-0 ${meta.swatchClass}`}
                          aria-hidden="true"
                        />
                        <span>{meta.label}</span>
                        <span className="text-[11px] font-normal text-[var(--app-text-subtle)]">
                          · {meta.valenceLabel}
                        </span>
                      </span>
                      <span className="font-mono text-[var(--app-text-muted)] tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--app-divider)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: meta.hex,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="h-4 w-full rounded-full overflow-hidden bg-[var(--app-divider)] flex">
                {colorValenceStats.map((item) =>
                  item.count > 0 ? (
                    <div
                      key={item.valence}
                      style={{
                        width: `${(item.count / (flatEntries.length || 1)) * 100}%`,
                        backgroundColor: item.meta.hex,
                      }}
                      title={`${item.meta.label} (${item.meta.scoreLabel}): ${item.count} (${item.pct}%)`}
                    />
                  ) : null
                )}
              </div>

              <div className="space-y-3">
                {colorValenceStats.map((item) => (
                  <div key={item.valence} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--app-text)]">
                        {item.meta.scoreLabel} · {item.meta.label}{' '}
                        <span className="font-normal text-[var(--app-text-subtle)]">({item.meta.subtitle})</span>
                      </span>
                      <span className="font-mono text-[var(--app-text-muted)] tabular-nums">
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--app-divider)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.pct}%`,
                          backgroundColor: item.meta.hex,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ),
    },
    {
      id: 'stats_hourly',
      render: () => (
        <section
          ref={hourlyChartRef}
          className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[var(--app-text)]">
                Orari &amp; Fasce (Pomeriggio 13:30–18:30)
              </h3>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              <button
                type="button"
                onClick={() => updatePref('hourlyChartType', 'hours24')}
                className={`min-h-[28px] rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  prefs.hourlyChartType === 'hours24'
                    ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Ore 00–23
              </button>
              <button
                type="button"
                onClick={() => updatePref('hourlyChartType', 'periodValence')}
                className={`min-h-[28px] rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  prefs.hourlyChartType === 'periodValence'
                    ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Valenza per fascia
              </button>
            </div>
          </div>

          {prefs.hourlyChartType === 'hours24' ? (
            <div className="mt-4">
              <svg
                viewBox="0 0 480 96"
                className="w-full h-24"
                role="img"
                aria-label="Distribuzione oraria degli appunti dalle 00 alle 23"
              >
                {hourlyCounts.map((slot, idx) => {
                  const barH = slot.count
                    ? Math.max(12, Math.round((slot.count / maxHourCount) * 70))
                    : 5;
                  const hex =
                    slot.count > 0
                      ? NOTE_COLORS[slot.dominantColor]?.hex || '#F59E0B'
                      : 'var(--app-divider)';
                  const x = idx * 20 + 2;
                  return (
                    <g key={slot.hour}>
                      <rect
                        x={x}
                        y={74 - barH}
                        width="15"
                        height={barH}
                        rx="3"
                        fill={hex}
                      >
                        <title>{`${String(slot.hour).padStart(2, '0')}:00 — ${slot.count} appunti`}</title>
                      </rect>
                    </g>
                  );
                })}
                <line x1="0" y1="76" x2="480" y2="76" stroke="var(--app-divider)" strokeWidth="1" />
                {[0, 6, 13, 18, 23].map((h) => (
                  <text
                    key={h}
                    x={h * 20 + 9}
                    y="90"
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--app-text-subtle)"
                    fontFamily="monospace"
                  >
                    {h === 13 ? '13:30' : h === 18 ? '18:31' : String(h).padStart(2, '0')}
                  </text>
                ))}
              </svg>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {dayPeriodStats.map((dp) => {
                const total = dp.count || 1;
                return (
                  <div key={dp.period} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--app-text)]">{dp.meta.title}</span>
                      <span className="font-mono text-[var(--app-text-muted)] tabular-nums">
                        {dp.count} ({dp.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[var(--app-divider)] overflow-hidden flex">
                      {dp.count > 0 && (
                        <>
                          {dp.valenceCounts.very_positive > 0 && (
                            <div
                              style={{
                                width: `${(dp.valenceCounts.very_positive / total) * 100}%`,
                                backgroundColor: '#0EA5E9',
                              }}
                              title={`Contento (+2 Celeste): ${dp.valenceCounts.very_positive}`}
                            />
                          )}
                          {dp.valenceCounts.positive > 0 && (
                            <div
                              style={{
                                width: `${(dp.valenceCounts.positive / total) * 100}%`,
                                backgroundColor: '#7DD3FC',
                              }}
                              title={`Abbastanza bene (+1 Celeste chiaro): ${dp.valenceCounts.positive}`}
                            />
                          )}
                          {dp.valenceCounts.middle > 0 && (
                            <div
                              style={{
                                width: `${(dp.valenceCounts.middle / total) * 100}%`,
                                backgroundColor: '#F59E0B',
                              }}
                              title={`Normale (0 Ambra): ${dp.valenceCounts.middle}`}
                            />
                          )}
                          {dp.valenceCounts.mild_negative > 0 && (
                            <div
                              style={{
                                width: `${(dp.valenceCounts.mild_negative / total) * 100}%`,
                                backgroundColor: '#FCA5A5',
                              }}
                              title={`Male (-1 Rosso chiaro): ${dp.valenceCounts.mild_negative}`}
                            />
                          )}
                          {dp.valenceCounts.negative > 0 && (
                            <div
                              style={{
                                width: `${(dp.valenceCounts.negative / total) * 100}%`,
                                backgroundColor: '#EF4444',
                              }}
                              title={`Malissimo (-2 Rosso/Antracita): ${dp.valenceCounts.negative}`}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clickable 4 Time-of-Day Windows */}
          <div className="mt-4 divide-y divide-[var(--app-divider)]">
            {dayPeriodStats.map((dp) => (
              <div key={dp.period} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setDayPeriodFilter((curr) => (curr === dp.period ? 'all' : dp.period))
                    }
                    className="font-semibold text-[var(--app-text)] hover:text-[var(--app-accent-text)] text-left"
                  >
                    {dp.meta.title}{' '}
                    <span className="font-mono font-normal text-[var(--app-text-subtle)] tabular-nums">
                      ({dp.meta.range})
                    </span>
                    {busiestPeriod?.period === dp.period && dp.count > 0 && (
                      <span className="ml-1.5 text-[11px] font-semibold text-[var(--app-accent-text)]">
                        · Più attiva
                      </span>
                    )}
                  </button>
                  <span className="font-mono text-[var(--app-text-muted)] tabular-nums">
                    {dp.count} ({dp.pct}%)
                  </span>
                </div>
                {dp.topSensations.length > 0 && (
                  <p className="mt-1 text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                    {dp.topSensations.map((s) => `${s.text} (${s.count})`).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ),
    },
    {
      id: 'stats_sensations',
      render: () => (
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smile className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-[var(--app-text)]">
                  Sensazioni, stati d’animo e correlazione colori
                </h3>
                <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                  +2 Celeste · +1 Celeste chiaro · 0 Ambra · -1 Rosso chiaro · -2 Rosso / Antracita
                </p>
              </div>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              {(
                [
                  { id: 'all', label: 'Tutte' },
                  { id: 'very_positive', label: '+2 Contento' },
                  { id: 'positive', label: '+1 Abbastanza bene' },
                  { id: 'middle', label: '0 Normale' },
                  { id: 'mild_negative', label: '-1 Male' },
                  { id: 'negative', label: '-2 Malissimo' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSensationToneFilter(t.id)}
                  className={`min-h-[28px] rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    sensationToneFilter === t.id
                      ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {sensationAnalytics.totalBullets === 0 ? (
            <p className="mt-4 text-xs text-[var(--app-text-muted)]">
              Ancora nessuna sintesi di sensazioni presente negli appunti filtrati. Registra una
              nuova nota vocale per estrarle automaticamente.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <p className="text-xs font-medium text-[var(--app-text-muted)] mb-2">
                    Equilibrio delle sensazioni ({sensationAnalytics.totalBullets} rilevazioni)
                  </p>
                  <div className="h-3 w-full rounded-full overflow-hidden bg-[var(--app-divider)] flex">
                    {sensationAnalytics.veryPositiveCount > 0 && (
                      <div
                        style={{
                          width: `${(sensationAnalytics.veryPositiveCount / sensationAnalytics.totalBullets) * 100}%`,
                        }}
                        className="bg-sky-500"
                        title={`Contento (+2 Celeste): ${sensationAnalytics.veryPositiveCount}`}
                      />
                    )}
                    {sensationAnalytics.positiveCount > 0 && (
                      <div
                        style={{
                          width: `${(sensationAnalytics.positiveCount / sensationAnalytics.totalBullets) * 100}%`,
                        }}
                        className="bg-sky-300"
                        title={`Abbastanza bene (+1 Celeste chiaro): ${sensationAnalytics.positiveCount}`}
                      />
                    )}
                    {sensationAnalytics.middleCount > 0 && (
                      <div
                        style={{
                          width: `${(sensationAnalytics.middleCount / sensationAnalytics.totalBullets) * 100}%`,
                        }}
                        className="bg-amber-400"
                        title={`Normale (0 Ambra): ${sensationAnalytics.middleCount}`}
                      />
                    )}
                    {sensationAnalytics.mildNegativeCount > 0 && (
                      <div
                        style={{
                          width: `${(sensationAnalytics.mildNegativeCount / sensationAnalytics.totalBullets) * 100}%`,
                        }}
                        className="bg-rose-300"
                        title={`Male (-1 Rosso chiaro): ${sensationAnalytics.mildNegativeCount}`}
                      />
                    )}
                    {sensationAnalytics.negativeCount > 0 && (
                      <div
                        style={{
                          width: `${(sensationAnalytics.negativeCount / sensationAnalytics.totalBullets) * 100}%`,
                        }}
                        className="bg-red-500"
                        title={`Malissimo (-2 Rosso/Antracita): ${sensationAnalytics.negativeCount}`}
                      />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--app-text-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                      Contento ({sensationAnalytics.veryPositiveCount})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
                      Abb. bene ({sensationAnalytics.positiveCount})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
                      Normale ({sensationAnalytics.middleCount})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-300" aria-hidden="true" />
                      Male ({sensationAnalytics.mildNegativeCount})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                      Malissimo ({sensationAnalytics.negativeCount})
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--app-divider)] pt-3">
                  <p className="text-xs font-medium text-[var(--app-text-muted)] mb-2">Aree più annotate</p>
                  <div className="space-y-1.5">
                    {sensationAnalytics.categories.map((cat) => {
                      const pct = Math.round(
                        (cat.count / sensationAnalytics.totalBullets) * 100
                      );
                      return (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--app-text)]">{cat.name}</span>
                          <span className="font-mono text-[var(--app-text-muted)] tabular-nums">
                            {cat.count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {sensationAnalytics.colorCorrelations.length > 0 && (
                  <div className="border-t border-[var(--app-divider)] pt-3">
                    <p className="text-xs font-medium text-[var(--app-text-muted)] mb-2">
                      Sensazioni frequenti per colore
                    </p>
                    <div className="space-y-2">
                      {sensationAnalytics.colorCorrelations.map(({ meta, topBullets }) => (
                        <div key={meta.key} className="text-xs">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--app-text)]">
                            <span
                              className={`h-2 w-2 rounded-full border shrink-0 ${meta.swatchClass}`}
                              aria-hidden="true"
                            />
                            {meta.label}:
                          </span>{' '}
                          <span className="text-[var(--app-text-muted)]">
                            {topBullets.map((b) => `${b.text} (${b.count})`).join(' · ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 space-y-2.5">
                <p className="text-xs font-medium text-[var(--app-text-muted)]">
                  Sensazioni e stati più frequenti
                </p>
                {sensationAnalytics.topPhrases.length === 0 ? (
                  <p className="text-xs text-[var(--app-text-subtle)] py-4">
                    Nessuna sensazione in questa categoria.
                  </p>
                ) : (
                  sensationAnalytics.topPhrases.map((phrase) => {
                    const maxCount = sensationAnalytics.topPhrases[0]?.count || 1;
                    const widthPct = Math.max(12, Math.round((phrase.count / maxCount) * 100));
                    const barColor =
                      phrase.tone === 'very_positive'
                        ? 'bg-sky-500'
                        : phrase.tone === 'positive'
                          ? 'bg-sky-300'
                          : phrase.tone === 'middle'
                            ? 'bg-amber-400'
                            : phrase.tone === 'mild_negative'
                              ? 'bg-rose-300'
                              : 'bg-red-500';

                    return (
                      <div key={phrase.text} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[var(--app-text)] font-medium truncate">
                            {phrase.text}
                          </span>
                          <span className="font-mono text-[var(--app-text-muted)] tabular-nums shrink-0">
                            {phrase.count}×
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--app-divider)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header + Filters + Summary Strip */}
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <CatIllustration
              src={statsNeko.src}
              alt={statsNeko.alt}
              className="h-16 w-16 rounded-2xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)] shrink-0"
            />
            <div>
              <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--app-text)]">
                <BarChart3 className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
                Statistiche &amp; Grafici
              </h2>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                +2 Contento · +1 Abbastanza bene · 0 Normale · -1 Male · -2 Malissimo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasCustomFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Ripristina filtri
              </button>
            )}
          </div>
        </div>

        {/* Period Selector (including Single Day filter!) + Search */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Periodo statistiche"
              className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1"
            >
              {(
                [
                  { id: 'single_day', label: 'Giorno singolo' },
                  { id: '7d', label: '7 giorni' },
                  { id: '30d', label: '30 giorni' },
                  { id: 'month', label: 'Questo mese' },
                  { id: 'all', label: 'Tutto' },
                  { id: 'custom', label: 'Intervallo' },
                ] as const
              ).map((tab) => {
                const active = periodFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setPeriodFilter(tab.id);
                      setSelectedTimelineKey(null);
                    }}
                    className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-56">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--app-text-subtle)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                placeholder="Filtra per parola o stato..."
                aria-label="Filtra statistiche per parola"
                className="w-full min-h-[38px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] pl-8 pr-7 py-1 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
              />
              {keywordFilter && (
                <button
                  type="button"
                  onClick={() => setKeywordFilter('')}
                  aria-label="Pulisci filtro parola"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-text-subtle)] hover:text-[var(--app-text)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {periodFilter === 'single_day' && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-accent-soft-border)] bg-[var(--app-accent-soft)] p-2.5 text-xs">
              <label className="flex items-center gap-2 text-[var(--app-text)]">
                <span className="font-semibold">Seleziona giornata:</span>
                <input
                  type="date"
                  value={singleDayDate}
                  onChange={(e) => setSingleDayDate(e.target.value || todayISO)}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--app-text)] tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={() => setSingleDayDate(todayISO)}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--app-card-alt)]"
              >
                Oggi
              </button>
            </div>
          )}

          {periodFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 text-xs">
              <label className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <span className="font-medium">Dal:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1 font-mono text-xs text-[var(--app-text)] tabular-nums"
                />
              </label>
              <label className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <span className="font-medium">Al:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1 font-mono text-xs text-[var(--app-text)] tabular-nums"
                />
              </label>
            </div>
          )}

          {/* Valence Presets + 6 Color Toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'Tutti i colori' },
                { id: 'very_positive', label: '+2 Contento (Celeste)' },
                { id: 'positive', label: '+1 Abbastanza bene (Celeste chiaro)' },
                { id: 'middle', label: '0 Normale (Ambra)' },
                { id: 'mild_negative', label: '-1 Male (Rosso chiaro)' },
                { id: 'negative', label: '-2 Malissimo (Rosso/Antracita)' },
              ] as const
            ).map((preset) => {
              const active = activeValencePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyValencePreset(preset.id)}
                  className={`min-h-[32px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                      : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            <span aria-hidden="true" className="mx-1 text-[var(--app-text-subtle)]">
              |
            </span>

            {NOTE_COLOR_LIST.map((col) => {
              const selected = selectedColors.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSingleColor(col.key)}
                  title={`Includi o escludi ${col.label} (${col.valenceLabel})`}
                  className={`min-h-[32px] inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selected
                      ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                      : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
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

          {/* Time-of-day filter strip (Pomeriggio 13:30–18:30, Sera 18:31–23:59) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setDayPeriodFilter('all')}
              aria-pressed={dayPeriodFilter === 'all'}
              className={`min-h-[32px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                dayPeriodFilter === 'all'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              Tutte le fasce orarie
            </button>
            {(['mattina', 'pomeriggio', 'sera', 'notte'] as const).map((dp) => {
              const active = dayPeriodFilter === dp;
              return (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setDayPeriodFilter(dp)}
                  aria-pressed={active}
                  className={`min-h-[32px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                      : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
                  }`}
                >
                  {DAY_PERIOD_LABELS[dp].title} ({DAY_PERIOD_LABELS[dp].shortRange})
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--app-divider)] border-t border-[var(--app-divider)] pt-4">
          <div className="py-2 sm:py-0 sm:pr-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">Appunti analizzati</span>
            <span className="mt-0.5 block font-mono text-xl font-bold text-[var(--app-text)] tabular-nums">
              {flatEntries.length}
            </span>
          </div>
          <div className="py-2 sm:py-0 sm:px-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">Giorni con note</span>
            <span className="mt-0.5 block font-mono text-xl font-bold text-[var(--app-text)] tabular-nums">
              {activeDaysCount}
            </span>
          </div>
          <div className="py-2 sm:py-0 sm:px-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">Media valenza (-2 a +2)</span>
            <span className="mt-0.5 block font-mono text-sm font-semibold text-[var(--app-text)] tabular-nums">
              {avgValenceScore === null
                ? '—'
                : `${avgValenceScore > 0 ? '+' : ''}${avgValenceScore.toFixed(2)} (${scoreToVerdict(
                    avgValenceScore
                  )})`}
            </span>
          </div>
          <div className="py-2 sm:py-0 sm:pl-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">Colore più frequente</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--app-text)]">
              {topColor ? (
                <>
                  <span
                    className={`h-2.5 w-2.5 rounded-full border shrink-0 ${topColor.meta.swatchClass}`}
                    aria-hidden="true"
                  />
                  <span>
                    {topColor.meta.label} ({topColor.pct}%)
                  </span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>
      </section>

      {flatEntries.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[var(--app-accent-soft-border)] bg-[var(--app-card)] p-8 text-center">
          <CatIllustration
            src={statsEmptyNeko.src}
            alt={statsEmptyNeko.alt}
            className="mx-auto h-32 w-32 rounded-3xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)]"
          />
          <h3 className="mt-4 text-sm font-bold text-[var(--app-text)]">
            Nessun dato corrisponde ai filtri ({dateRange.label})
          </h3>
          <p className="mt-1 text-xs text-[var(--app-text-muted)] max-w-sm mx-auto leading-relaxed">
            Prova ad allargare il periodo, rimuovere un filtro colore oppure aggiungi un nuovo
            appunto vocale per vedere subito i grafici.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {hasCustomFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-alt)] transition-colors"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Ripristina filtri
              </button>
            )}
            <button
              type="button"
              onClick={() => onCreateBlankEntry(periodFilter === 'single_day' ? singleDayDate : todayISO)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--app-btn-bg)] px-4 py-2 text-xs font-semibold text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Aggiungi appunto
            </button>
          </div>
        </section>
      ) : (
        <CustomizableSectionStack
          section="stats"
          layout={sectionLayout}
          blocks={customizableBlocks}
          onChangeLayout={onChangeLayout}
          onResetSection={onResetLayout}
          className="space-y-4"
        />
      )}
    </div>
  );
};
