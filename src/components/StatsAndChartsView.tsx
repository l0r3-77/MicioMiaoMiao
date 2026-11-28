import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
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
  exportToExcel,
  exportToPdf,
  type ExportScope,
  type ExportStatsPayload,
} from '../utils/exportReports';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import {
  COLOR_VALENCE_META,
  NEGATIVE_SPLIT_GRADIENT,
  NOTE_COLOR_LIST,
  NOTE_COLORS,
  getValenceBackground,
  type ColorValence,
} from '../utils/noteColors';
import {
  SENSATION_DIMENSIONS,
  analyzeEntrySensationDimensions,
  type EntryDimensionScores,
  type SensationDimensionKey,
} from '../utils/sensationDimensions';
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
type TimelineChartType = 'line' | 'valence';
type HourlyChartType = 'hours24' | 'periodValence';
type SensationTone = ColorValence;

interface StatsPreferences {
  timelineChartType: TimelineChartType;
  hourlyChartType: HourlyChartType;
}

const PREFS_STORAGE_KEY = 'agendavoce_stats_prefs_v2';

const DEFAULT_PREFS: StatsPreferences = {
  timelineChartType: 'line',
  hourlyChartType: 'hours24',
};

function loadPreferences(): StatsPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<{
      timelineChartType: string;
      hourlyChartType: string;
    }>;
    const timelineChartType: TimelineChartType =
      parsed.timelineChartType === 'valence' ? 'valence' : 'line';
    const hourlyChartType: HourlyChartType =
      parsed.hourlyChartType === 'periodValence' ? 'periodValence' : 'hours24';
    return { timelineChartType, hourlyChartType };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface FlatEntry {
  date: string;
  entry: NoteEntry;
  period: DayPeriod;
  hour: number;
  minute: number;
  colorValence: ColorValence;
  colorScore: number;
}

const VALENCE_TO_SCORE: Record<ColorValence, number> = {
  very_positive: 2,
  positive: 1,
  middle: 0,
  mild_negative: -1,
  negative: -2,
};

function scoreToValence(score: number): ColorValence {
  if (score >= 1.45) return 'very_positive';
  if (score >= 0.45) return 'positive';
  if (score >= -0.45) return 'middle';
  if (score >= -1.45) return 'mild_negative';
  return 'negative';
}

function scoreToHex(score: number): string {
  return COLOR_VALENCE_META[scoreToValence(score)].hex;
}

function scoreToSvgFill(score: number, gradId = 'negSplitGrad'): string {
  if (score <= -1.45) return `url(#${gradId})`;
  return scoreToHex(score);
}

function normalizeBulletText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function canonicalizeAreaName(rawPrefix: string): string {
  const lower = rawPrefix
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/^bisogn/.test(lower)) return 'Bisogno';
  if (/^umor/.test(lower)) return 'Umore';
  if (/^stress/.test(lower) || /^tension/.test(lower) || /^ansia/.test(lower)) return 'Stress';
  if (/^energi/.test(lower) || /^stanchezz/.test(lower)) return 'Energia';
  if (/^focus/.test(lower) || /^concentraz/.test(lower) || /^attenzion/.test(lower)) return 'Focus';
  if (/^sensazion/.test(lower) || /^stato/.test(lower) || /^emozion/.test(lower)) return 'Sensazione';

  const trimmed = rawPrefix.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function splitSensationAreaAndBody(bullet: string): { area: string; body: string } {
  const colonIdx = bullet.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 24) {
    const prefix = bullet.slice(0, colonIdx).trim();
    const rest = bullet.slice(colonIdx + 1).trim();
    if (prefix && rest) {
      const cleanedBody = rest.charAt(0).toUpperCase() + rest.slice(1);
      return { area: canonicalizeAreaName(prefix), body: cleanedBody };
    }
  }
  return { area: 'Sensazione', body: bullet };
}

const ITALIAN_STOPWORDS = new Set([
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'uno',
  'una',
  'di',
  'del',
  'dello',
  'della',
  'dei',
  'degli',
  'delle',
  'a',
  'al',
  'allo',
  'alla',
  'da',
  'dal',
  'dallo',
  'dalla',
  'in',
  'nel',
  'nello',
  'nella',
  'con',
  'su',
  'per',
  'tra',
  'fra',
  'e',
  'ed',
  'o',
  'po',
  'poco',
  'molto',
  'abbastanza',
  'leggermente',
  'lievemente',
  'piuttosto',
  'davvero',
  'proprio',
  'tanto',
  'fare',
  'farsi',
  'prendere',
  'prendersi',
  'avere',
  'essere',
  'sentire',
  'sentirsi',
  'mi',
  'ti',
  'si',
  'ci',
  'livello',
  'stato',
  'senso',
]);

function stemItalianToken(tok: string): string {
  let t = tok;
  if (t.length > 6 && t.endsWith('mente')) {
    t = t.slice(0, -5);
  } else if (t.length > 6 && (t.endsWith('zione') || t.endsWith('zioni'))) {
    t = t.slice(0, -5);
  } else if (t.length > 5 && (t.endsWith('ezza') || t.endsWith('ezze'))) {
    t = t.slice(0, -4);
  }
  if (t.length >= 5 && /[aeio]$/.test(t)) {
    t = t.slice(0, -1);
  }
  return t;
}

function tokenizeForSimilarity(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const filtered = rawTokens.filter((tok) => !ITALIAN_STOPWORDS.has(tok));
  const base = filtered.length > 0 ? filtered : rawTokens;
  return Array.from(new Set(base.map(stemItalianToken))).sort();
}

function areDescriptionsVerySimilar(tokensA: string[], tokensB: string[]): boolean {
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  if (tokensA.join('|') === tokensB.join('|')) return true;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  if (intersection === 0) return false;

  const union = setA.size + setB.size - intersection;
  const jaccard = intersection / union;
  if (jaccard >= 0.65) return true;

  const minSize = Math.min(setA.size, setB.size);
  if (minSize >= 1 && intersection === minSize && Math.max(setA.size, setB.size) <= minSize + 1) {
    return true;
  }
  return false;
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
  if (
    /stanc|lieve|legger|pausa|riposo|scaric|teso|tesa|difficil|basso|bassa|\bmale\b/.test(lower)
  ) {
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

interface UnifiedSensationCluster {
  area: string;
  displayText: string;
  fullText: string;
  tokens: string[];
  count: number;
  scoreSum: number;
  avgScore: number;
  tone: SensationTone;
  variants: Map<string, number>;
}

function buildUnifiedSensationClusters(
  items: Array<{ rawText: string; area: string; body: string; tone: SensationTone }>
): UnifiedSensationCluster[] {
  const clusters: UnifiedSensationCluster[] = [];

  for (const item of items) {
    const score = VALENCE_TO_SCORE[item.tone];
    const tokens = tokenizeForSimilarity(item.body);

    const match = clusters.find((c) => {
      if (c.area !== item.area) return false;
      const avg = c.scoreSum / c.count;
      // Avoid merging opposite polarities (e.g. +2 vs -2)
      if (Math.abs(avg - score) > 1.2) return false;
      return areDescriptionsVerySimilar(c.tokens, tokens);
    });

    if (match) {
      match.count += 1;
      match.scoreSum += score;
      match.avgScore = match.scoreSum / match.count;
      match.tone = scoreToValence(match.avgScore);
      match.variants.set(item.body, (match.variants.get(item.body) || 0) + 1);
    } else {
      const variants = new Map<string, number>();
      variants.set(item.body, 1);
      clusters.push({
        area: item.area,
        displayText: item.body,
        fullText: item.rawText,
        tokens,
        count: 1,
        scoreSum: score,
        avgScore: score,
        tone: item.tone,
        variants,
      });
    }
  }

  for (const c of clusters) {
    // Pick the most frequent concise variant as display label
    const sortedVariants = Array.from(c.variants.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].length - b[0].length;
    });
    const bestBody = sortedVariants[0]?.[0] || c.displayText;
    c.displayText = bestBody;
    c.fullText = c.area === 'Sensazione' ? bestBody : `${c.area}: ${bestBody}`;
    c.avgScore = c.scoreSum / c.count;
    c.tone = scoreToValence(c.avgScore);
  }

  return clusters;
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
  const [activeDimensions, setActiveDimensions] = useState<Record<SensationDimensionKey, boolean>>({
    umore: true,
    energia_mentale: true,
    energia_fisica: true,
    stress: true,
    ansia: true,
  });

  const timelineChartRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const valenceBarsScrollRef = useRef<HTMLDivElement | null>(null);
  const fiveDimensionsChartRef = useRef<HTMLDivElement | null>(null);
  const fiveDimScrollRef = useRef<HTMLDivElement | null>(null);
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
    return 'all';
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

        const timeParts = (entry.time || '09:00').split(':');
        const parsedHour = Number(timeParts[0]);
        const parsedMin = Number(timeParts[1]);
        const hour = Number.isFinite(parsedHour) ? Math.max(0, Math.min(23, parsedHour)) : 9;
        const minute = Number.isFinite(parsedMin) ? Math.max(0, Math.min(59, parsedMin)) : 0;
        const meta = NOTE_COLORS[safeColor];

        result.push({
          date: dn.date,
          entry: { ...entry, color: safeColor },
          period: dp,
          hour,
          minute,
          colorValence: meta.valence,
          colorScore: meta.valenceScore,
        });
      }
    }

    return result.sort((a, b) =>
      `${a.date} ${a.entry.time}`.localeCompare(`${b.date} ${b.entry.time}`)
    );
  }, [dailyNotes, dateRange, selectedColors, dayPeriodFilter, keywordFilter]);

  // All entries passing color/period/keyword filters across all dates (for single-day 00:00-24:00 boundary interpolation)
  const nonDateFilteredEntries = useMemo<FlatEntry[]>(() => {
    const q = keywordFilter.trim().toLowerCase();
    const result: FlatEntry[] = [];

    for (const dn of dailyNotes) {
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

        const timeParts = (entry.time || '09:00').split(':');
        const parsedHour = Number(timeParts[0]);
        const parsedMin = Number(timeParts[1]);
        const hour = Number.isFinite(parsedHour) ? Math.max(0, Math.min(23, parsedHour)) : 9;
        const minute = Number.isFinite(parsedMin) ? Math.max(0, Math.min(59, parsedMin)) : 0;
        const meta = NOTE_COLORS[safeColor];

        result.push({
          date: dn.date,
          entry: { ...entry, color: safeColor },
          period: dp,
          hour,
          minute,
          colorValence: meta.valence,
          colorScore: meta.valenceScore,
        });
      }
    }

    return result.sort((a, b) =>
      `${a.date} ${a.entry.time}`.localeCompare(`${b.date} ${b.entry.time}`)
    );
  }, [dailyNotes, selectedColors, dayPeriodFilter, keywordFilter]);

  const activeDaysCount = useMemo(() => {
    return new Set(flatEntries.map((item) => item.date)).size;
  }, [flatEntries]);

  // Color distribution across the 6 colors (still tracked for topColor & export)
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

  // Time-of-day stats with area score bars instead of exact synthesized phrases
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
      let redCount = 0;
      let anthraciteCount = 0;
      const areaStatsMap = new Map<string, { count: number; scoreSum: number }>();

      for (const item of items) {
        valenceCounts[item.colorValence]++;
        if (item.entry.color === 'red') redCount++;
        else if (item.entry.color === 'anthracite') anthraciteCount++;
        for (const b of item.entry.bullets) {
          const clean = normalizeBulletText(b);
          if (!clean) continue;
          const { area } = splitSensationAreaAndBody(clean);
          const tone = classifySensationTone(clean, item.entry.color);
          const score = VALENCE_TO_SCORE[tone];
          const prev = areaStatsMap.get(area) || { count: 0, scoreSum: 0 };
          prev.count += 1;
          prev.scoreSum += score;
          areaStatsMap.set(area, prev);
        }
      }

      const topAreas = Array.from(areaStatsMap.entries())
        .sort((a, b) => {
          if (b[1].count !== a[1].count) return b[1].count - a[1].count;
          return b[1].scoreSum / b[1].count - a[1].scoreSum / a[1].count;
        })
        .slice(0, 4)
        .map(([area, st]) => {
          const avgScore = st.scoreSum / st.count;
          const valence = scoreToValence(avgScore);
          return {
            area,
            count: st.count,
            avgScore,
            valence,
            colorHex: COLOR_VALENCE_META[valence].hex,
            scoreLabel: COLOR_VALENCE_META[valence].scoreLabel,
          };
        });

      return {
        period: p,
        meta: DAY_PERIOD_LABELS[p],
        count: items.length,
        pct: flatEntries.length ? Math.round((items.length / flatEntries.length) * 100) : 0,
        valenceCounts,
        redCount,
        anthraciteCount,
        topAreas,
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

  // Daily timeline buckets (for multi-day views & exports)
  const timelineBuckets = useMemo(() => {
    if (flatEntries.length === 0) return [];
    const byDate = new Map<string, FlatEntry[]>();

    if (periodFilter !== 'all') {
      let cursor = dateRange.start;
      let guard = 0;
      while (cursor <= dateRange.end && guard < 180) {
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
        const veryPosCount = items.filter((i) => i.colorValence === 'very_positive').length;
        const posCount = items.filter((i) => i.colorValence === 'positive').length;
        const midCount = items.filter((i) => i.colorValence === 'middle').length;
        const mildNegCount = items.filter((i) => i.colorValence === 'mild_negative').length;
        const redCount = items.filter((i) => i.entry.color === 'red').length;
        const anthraciteCount = items.filter((i) => i.entry.color === 'anthracite').length;
        const negCount = redCount + anthraciteCount;

        const scoreSum = items.reduce((acc, i) => acc + i.colorScore, 0);
        const avgScore = items.length > 0 ? scoreSum / items.length : null;

        const topBullet = items
          .flatMap((i) => i.entry.bullets)
          .map(normalizeBulletText)
          .find(Boolean);

        const parts = date.split('-');
        const ddmm = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;

        return {
          key: date,
          date,
          shortLabel: formatItalianDateShort(date),
          axisLabel: ddmm,
          dayNum: parts[2] || date,
          total: items.length,
          veryPosCount,
          posCount,
          midCount,
          mildNegCount,
          redCount,
          anthraciteCount,
          negCount,
          avgScore,
          topBullet: topBullet || null,
        };
      });
  }, [flatEntries, periodFilter, dateRange]);

  // Single-day chronological slots for hourly horizontal progression
  const singleDayTimelineSlots = useMemo(() => {
    if (periodFilter !== 'single_day' || flatEntries.length === 0) return [];
    const byTime = new Map<string, FlatEntry[]>();
    for (const item of flatEntries) {
      const timeKey = item.entry.time || `${String(item.hour).padStart(2, '0')}:00`;
      const arr = byTime.get(timeKey) || [];
      arr.push(item);
      byTime.set(timeKey, arr);
    }
    return Array.from(byTime.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([timeStr, items]) => {
        const first = items[0];
        const hourFloat = first.hour + first.minute / 60;
        const veryPosCount = items.filter((i) => i.colorValence === 'very_positive').length;
        const posCount = items.filter((i) => i.colorValence === 'positive').length;
        const midCount = items.filter((i) => i.colorValence === 'middle').length;
        const mildNegCount = items.filter((i) => i.colorValence === 'mild_negative').length;
        const redCount = items.filter((i) => i.entry.color === 'red').length;
        const anthraciteCount = items.filter((i) => i.entry.color === 'anthracite').length;
        const negCount = redCount + anthraciteCount;
        const scoreSum = items.reduce((acc, i) => acc + i.colorScore, 0);
        const avgScore = scoreSum / items.length;
        const topBullet = items
          .flatMap((i) => i.entry.bullets)
          .map(normalizeBulletText)
          .find(Boolean);
        return {
          key: `${first.date}@${timeStr}`,
          date: first.date,
          shortLabel: `${formatItalianDateShort(first.date)} · ${timeStr}`,
          axisLabel: timeStr,
          hourFloat,
          total: items.length,
          veryPosCount,
          posCount,
          midCount,
          mildNegCount,
          redCount,
          anthraciteCount,
          negCount,
          avgScore,
          topBullet: topBullet || null,
        };
      });
  }, [periodFilter, flatEntries]);

  const activeTimelineItems =
    periodFilter === 'single_day' ? singleDayTimelineSlots : timelineBuckets;

  const maxTimelineTotal = useMemo(() => {
    return Math.max(1, ...activeTimelineItems.map((b) => b.total));
  }, [activeTimelineItems]);

  const activeBucket = useMemo(() => {
    if (activeTimelineItems.length === 0) return null;
    if (selectedTimelineKey) {
      const match = activeTimelineItems.find((b) => b.key === selectedTimelineKey);
      if (match) return match;
    }
    return (
      [...activeTimelineItems].reverse().find((b) => b.total > 0) ||
      activeTimelineItems[activeTimelineItems.length - 1]
    );
  }, [activeTimelineItems, selectedTimelineKey]);

  // SVG horizontal line chart geometry (hours 00-24 for single day, scrollable days with pinned Y-axis for multi-day)
  const lineChartGeometry = useMemo(() => {
    const height = 208;
    const padTop = 18;
    const padBottom = 34;
    const usableH = height - padTop - padBottom;
    const scoreToY = (s: number) => padTop + ((2 - Math.max(-2, Math.min(2, s))) / 4) * usableH;

    if (periodFilter === 'single_day') {
      const plotWidth = 540;
      const plotPadX = 16;
      const plotPadRight = 18;
      const usableW = plotWidth - plotPadX - plotPadRight;
      const targetDay = singleDayDate || todayISO;
      const targetMs = parseISODate(targetDay).getTime();
      const MS_PER_DAY = 86400000;

      const points = singleDayTimelineSlots.map((slot) => {
        const x = plotPadX + (Math.max(0, Math.min(24, slot.hourFloat)) / 24) * usableW;
        const y = scoreToY(slot.avgScore);
        return {
          x,
          y,
          score: slot.avgScore,
          svgFill: scoreToSvgFill(slot.avgScore),
          bucket: slot,
        };
      });

      const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => ({
        x: plotPadX + (h / 24) * usableW,
        label: h === 24 ? '24:00' : `${String(h).padStart(2, '0')}:00`,
      }));

      // Interpolate continuous 00:00 start & 24:00 end using nearest entries before and after singleDayDate
      const beforeEntries = nonDateFilteredEntries.filter((e) => e.date < targetDay);
      const afterEntries = nonDateFilteredEntries.filter((e) => e.date > targetDay);
      const lastPrevEntry =
        beforeEntries.length > 0 ? beforeEntries[beforeEntries.length - 1] : null;
      const firstNextEntry = afterEntries.length > 0 ? afterEntries[0] : null;

      let fullPathPoints: Array<{ x: number; y: number; score: number; label: string; isBoundary?: boolean }> = [];
      let boundaryHints: Array<{ x: number; y: number; title: string }> = [];

      if (points.length > 0) {
        const firstSlot = singleDayTimelineSlots[0];
        const lastSlot = singleDayTimelineSlots[singleDayTimelineSlots.length - 1];

        let startScore = firstSlot.avgScore;
        let startHint = '00:00 (proiezione inizio giornata)';
        if (lastPrevEntry) {
          const prevDaysDiff = Math.max(
            1,
            Math.round((targetMs - parseISODate(lastPrevEntry.date).getTime()) / MS_PER_DAY)
          );
          const prevHour = lastPrevEntry.hour + lastPrevEntry.minute / 60;
          const dtBefore = Math.max(0.25, prevDaysDiff * 24 - prevHour);
          const dtAfter = Math.max(0.25, firstSlot.hourFloat);
          startScore =
            lastPrevEntry.colorScore +
            (firstSlot.avgScore - lastPrevEntry.colorScore) * (dtBefore / (dtBefore + dtAfter));
          startHint = `00:00 (da ${formatItalianDateShort(lastPrevEntry.date)} · valenza ${startScore.toFixed(2)})`;
        }

        let endScore = lastSlot.avgScore;
        let endHint = '24:00 (proiezione fine giornata)';
        if (firstNextEntry) {
          const nextDaysDiff = Math.max(
            1,
            Math.round((parseISODate(firstNextEntry.date).getTime() - targetMs) / MS_PER_DAY)
          );
          const nextHour = firstNextEntry.hour + firstNextEntry.minute / 60;
          const dtBefore = Math.max(0.25, 24 - lastSlot.hourFloat);
          const dtAfter = Math.max(0.25, (nextDaysDiff - 1) * 24 + nextHour);
          endScore =
            lastSlot.avgScore +
            (firstNextEntry.colorScore - lastSlot.avgScore) * (dtBefore / (dtBefore + dtAfter));
          endHint = `24:00 (verso ${formatItalianDateShort(firstNextEntry.date)} · valenza ${endScore.toFixed(2)})`;
        }

        const x0 = plotPadX;
        const y0 = scoreToY(startScore);
        const x24 = plotPadX + usableW;
        const y24 = scoreToY(endScore);

        fullPathPoints = [
          { x: x0, y: y0, score: startScore, label: startHint, isBoundary: true },
          ...points.map((p) => ({ x: p.x, y: p.y, score: p.score, label: p.bucket.shortLabel })),
          { x: x24, y: y24, score: endScore, label: endHint, isBoundary: true },
        ];
        boundaryHints = [
          { x: x0, y: y0, title: startHint },
          { x: x24, y: y24, title: endHint },
        ];
      }

      const polyline = fullPathPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const baseY = scoreToY(-2);
      const areaPath =
        fullPathPoints.length > 1
          ? `M ${fullPathPoints[0].x.toFixed(1)} ${baseY.toFixed(1)} ` +
            fullPathPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
            ` L ${fullPathPoints[fullPathPoints.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} Z`
          : '';

      return {
        plotWidth,
        height,
        plotPadX,
        plotPadRight,
        scoreToY,
        points,
        boundaryHints,
        polyline,
        areaPath,
        xTicks: hourTicks,
      };
    }

    const totalDays = timelineBuckets.length;
    const plotWidth = Math.max(520, totalDays * 38);
    const plotPadX = 18;
    const plotPadRight = 18;
    const usableW = plotWidth - plotPadX - plotPadRight;

    const scoredIndices = timelineBuckets
      .map((b, idx) => ({ bucket: b, idx }))
      .filter((x) => x.bucket.avgScore !== null);

    const denom = Math.max(1, totalDays - 1);
    const points = scoredIndices.map(({ bucket, idx }) => {
      const x = totalDays === 1 ? plotPadX + usableW / 2 : plotPadX + (idx / denom) * usableW;
      const score = bucket.avgScore ?? 0;
      const y = scoreToY(score);
      return { x, y, score, svgFill: scoreToSvgFill(score), bucket };
    });

    const xTicks: Array<{ x: number; label: string }> = [];
    if (totalDays > 0) {
      if (totalDays === 1) {
        xTicks.push({ x: plotPadX + usableW / 2, label: timelineBuckets[0].axisLabel });
      } else {
        const tickStep = totalDays <= 14 ? 1 : totalDays <= 35 ? 3 : 5;
        for (let idx = 0; idx < totalDays; idx++) {
          if (idx === 0 || idx === totalDays - 1 || idx % tickStep === 0) {
            if (idx !== totalDays - 1 && totalDays - 1 - idx < Math.max(1, Math.floor(tickStep / 2))) {
              continue;
            }
            xTicks.push({
              x: plotPadX + (idx / denom) * usableW,
              label: timelineBuckets[idx].axisLabel,
            });
          }
        }
      }
    }

    const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const baseY = scoreToY(-2);
    const areaPath =
      points.length > 1
        ? `M ${points[0].x.toFixed(1)} ${baseY.toFixed(1)} ` +
          points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
          ` L ${points[points.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} Z`
        : '';

    return {
      plotWidth,
      height,
      plotPadX,
      plotPadRight,
      scoreToY,
      points,
      boundaryHints: [] as Array<{ x: number; y: number; title: string }>,
      polyline,
      areaPath,
      xTicks,
    };
  }, [
    periodFilter,
    singleDayDate,
    todayISO,
    singleDayTimelineSlots,
    timelineBuckets,
    nonDateFilteredEntries,
  ]);

  // Analyze all non-date-filtered entries across the 5 sensation dimensions
  const dimensionScoresByEntryId = useMemo(() => {
    const map = new Map<string, EntryDimensionScores>();
    for (const item of nonDateFilteredEntries) {
      map.set(item.entry.id, analyzeEntrySensationDimensions(item.entry));
    }
    return map;
  }, [nonDateFilteredEntries]);

  const fiveDimensionsSummary = useMemo(() => {
    const sums: Record<SensationDimensionKey, { sum: number; count: number }> = {
      umore: { sum: 0, count: 0 },
      energia_mentale: { sum: 0, count: 0 },
      energia_fisica: { sum: 0, count: 0 },
      stress: { sum: 0, count: 0 },
      ansia: { sum: 0, count: 0 },
    };
    for (const item of flatEntries) {
      const scores = dimensionScoresByEntryId.get(item.entry.id);
      if (!scores) continue;
      for (const dim of SENSATION_DIMENSIONS) {
        const val = scores[dim.key];
        if (typeof val === 'number') {
          sums[dim.key].sum += val;
          sums[dim.key].count += 1;
        }
      }
    }
    return SENSATION_DIMENSIONS.map((dim) => {
      const st = sums[dim.key];
      return {
        ...dim,
        count: st.count,
        avgScore: st.count > 0 ? st.sum / st.count : null,
      };
    });
  }, [flatEntries, dimensionScoresByEntryId]);

  const fiveDimensionsGeometry = useMemo(() => {
    const height = 224;
    const padTop = 18;
    const padBottom = 34;
    const usableH = height - padTop - padBottom;
    const scoreToY = (s: number) => padTop + ((2 - Math.max(-2, Math.min(2, s))) / 4) * usableH;

    type DimPoint = {
      x: number;
      y: number;
      score: number;
      count: number;
      label: string;
      isBoundary?: boolean;
    };

    const buildSeriesSkeleton = () =>
      SENSATION_DIMENSIONS.map((dim) => ({
        meta: dim,
        points: [] as DimPoint[],
        pathPoints: [] as DimPoint[],
        polyline: '',
      }));

    if (periodFilter === 'single_day') {
      const plotWidth = 640;
      const plotPadX = 16;
      const plotPadRight = 18;
      const usableW = plotWidth - plotPadX - plotPadRight;
      const targetDay = singleDayDate || todayISO;
      const targetMs = parseISODate(targetDay).getTime();
      const MS_PER_DAY = 86400000;

      const byTime = new Map<string, FlatEntry[]>();
      for (const item of flatEntries) {
        const timeKey = item.entry.time || `${String(item.hour).padStart(2, '0')}:00`;
        const arr = byTime.get(timeKey) || [];
        arr.push(item);
        byTime.set(timeKey, arr);
      }
      const chronologicalSlots = Array.from(byTime.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([timeStr, items]) => {
          const first = items[0];
          return {
            timeStr,
            hourFloat: first.hour + first.minute / 60,
            label: `${formatItalianDateShort(first.date)} · ${timeStr}`,
            items,
          };
        });

      const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => ({
        x: plotPadX + (h / 24) * usableW,
        label: h === 24 ? '24:00' : `${String(h).padStart(2, '0')}:00`,
      }));

      const beforeEntries = nonDateFilteredEntries.filter((e) => e.date < targetDay);
      const afterEntries = nonDateFilteredEntries.filter((e) => e.date > targetDay);

      const series = buildSeriesSkeleton().map((s) => {
        const dimKey = s.meta.key;
        const pts: DimPoint[] = [];

        for (const slot of chronologicalSlots) {
          const vals: number[] = [];
          for (const item of slot.items) {
            const v = dimensionScoresByEntryId.get(item.entry.id)?.[dimKey];
            if (typeof v === 'number') vals.push(v);
          }
          if (vals.length === 0) continue;
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const x = plotPadX + (Math.max(0, Math.min(24, slot.hourFloat)) / 24) * usableW;
          pts.push({
            x,
            y: scoreToY(avg),
            score: avg,
            count: vals.length,
            label: slot.label,
          });
        }

        let pathPoints: DimPoint[] = [...pts];
        if (pts.length > 0) {
          const firstSlot = chronologicalSlots.find((slot) =>
            slot.items.some((it) => typeof dimensionScoresByEntryId.get(it.entry.id)?.[dimKey] === 'number')
          );
          const lastSlot = [...chronologicalSlots]
            .reverse()
            .find((slot) =>
              slot.items.some((it) => typeof dimensionScoresByEntryId.get(it.entry.id)?.[dimKey] === 'number')
            );

          const prevEntryWithDim = [...beforeEntries]
            .reverse()
            .find((e) => typeof dimensionScoresByEntryId.get(e.entry.id)?.[dimKey] === 'number');
          const nextEntryWithDim = afterEntries.find(
            (e) => typeof dimensionScoresByEntryId.get(e.entry.id)?.[dimKey] === 'number'
          );

          const firstScore = pts[0].score;
          const lastScore = pts[pts.length - 1].score;
          let startScore = firstScore;
          if (prevEntryWithDim && firstSlot) {
            const prevScore = dimensionScoresByEntryId.get(prevEntryWithDim.entry.id)![dimKey]!;
            const prevDaysDiff = Math.max(
              1,
              Math.round((targetMs - parseISODate(prevEntryWithDim.date).getTime()) / MS_PER_DAY)
            );
            const prevHour = prevEntryWithDim.hour + prevEntryWithDim.minute / 60;
            const dtBefore = Math.max(0.25, prevDaysDiff * 24 - prevHour);
            const dtAfter = Math.max(0.25, firstSlot.hourFloat);
            startScore = prevScore + (firstScore - prevScore) * (dtBefore / (dtBefore + dtAfter));
          }

          let endScore = lastScore;
          if (nextEntryWithDim && lastSlot) {
            const nextScore = dimensionScoresByEntryId.get(nextEntryWithDim.entry.id)![dimKey]!;
            const nextDaysDiff = Math.max(
              1,
              Math.round((parseISODate(nextEntryWithDim.date).getTime() - targetMs) / MS_PER_DAY)
            );
            const nextHour = nextEntryWithDim.hour + nextEntryWithDim.minute / 60;
            const dtBefore = Math.max(0.25, 24 - lastSlot.hourFloat);
            const dtAfter = Math.max(0.25, (nextDaysDiff - 1) * 24 + nextHour);
            endScore = lastScore + (nextScore - lastScore) * (dtBefore / (dtBefore + dtAfter));
          }

          pathPoints = [
            {
              x: plotPadX,
              y: scoreToY(startScore),
              score: startScore,
              count: 0,
              label: '00:00',
              isBoundary: true,
            },
            ...pts,
            {
              x: plotPadX + usableW,
              y: scoreToY(endScore),
              score: endScore,
              count: 0,
              label: '24:00',
              isBoundary: true,
            },
          ];
        }

        const polyline = pathPoints
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ');
        return { ...s, points: pts, pathPoints, polyline };
      });

      const lastHour =
        chronologicalSlots.length > 0
          ? chronologicalSlots[chronologicalSlots.length - 1].hourFloat
          : 24;
      const focusTargetX = plotPadX + (Math.max(0, Math.min(24, lastHour)) / 24) * usableW;

      return {
        plotWidth,
        height,
        plotPadX,
        plotPadRight,
        scoreToY,
        xTicks: hourTicks,
        series,
        focusTargetX,
        hasAnyPoint: series.some((s) => s.points.length > 0),
      };
    }

    const totalDays = timelineBuckets.length;
    const plotWidth = Math.max(520, totalDays * 38);
    const plotPadX = 18;
    const plotPadRight = 18;
    const usableW = plotWidth - plotPadX - plotPadRight;
    const denom = Math.max(1, totalDays - 1);

    const byDate = new Map<string, FlatEntry[]>();
    for (const item of flatEntries) {
      const arr = byDate.get(item.date) || [];
      arr.push(item);
      byDate.set(item.date, arr);
    }

    const series = buildSeriesSkeleton().map((s) => {
      const dimKey = s.meta.key;
      const pts: DimPoint[] = [];

      timelineBuckets.forEach((bucket, idx) => {
        const dayItems = byDate.get(bucket.date) || [];
        if (dayItems.length === 0) return;
        const vals: number[] = [];
        for (const item of dayItems) {
          const v = dimensionScoresByEntryId.get(item.entry.id)?.[dimKey];
          if (typeof v === 'number') vals.push(v);
        }
        if (vals.length === 0) return;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const x = totalDays === 1 ? plotPadX + usableW / 2 : plotPadX + (idx / denom) * usableW;
        pts.push({
          x,
          y: scoreToY(avg),
          score: avg,
          count: vals.length,
          label: bucket.shortLabel,
        });
      });

      const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      return { ...s, points: pts, pathPoints: pts, polyline };
    });

    const xTicks: Array<{ x: number; label: string }> = [];
    if (totalDays > 0) {
      if (totalDays === 1) {
        xTicks.push({ x: plotPadX + usableW / 2, label: timelineBuckets[0].axisLabel });
      } else {
        const tickStep = totalDays <= 14 ? 1 : totalDays <= 35 ? 3 : 5;
        for (let idx = 0; idx < totalDays; idx++) {
          if (idx === 0 || idx === totalDays - 1 || idx % tickStep === 0) {
            if (idx !== totalDays - 1 && totalDays - 1 - idx < Math.max(1, Math.floor(tickStep / 2))) {
              continue;
            }
            xTicks.push({
              x: plotPadX + (idx / denom) * usableW,
              label: timelineBuckets[idx].axisLabel,
            });
          }
        }
      }
    }

    return {
      plotWidth,
      height,
      plotPadX,
      plotPadRight,
      scoreToY,
      xTicks,
      series,
      focusTargetX: plotWidth,
      hasAnyPoint: series.some((s) => s.points.length > 0),
    };
  }, [
    periodFilter,
    singleDayDate,
    todayISO,
    flatEntries,
    timelineBuckets,
    nonDateFilteredEntries,
    dimensionScoresByEntryId,
  ]);

  // Auto-scroll timeline horizontally to rightmost (current/most recent days or latest hours) whenever filters or mode change
  useEffect(() => {
    const scrollChartsToLatest = () => {
      if (periodFilter !== 'single_day') {
        if (timelineScrollRef.current) {
          const el = timelineScrollRef.current;
          if (el.scrollWidth > el.clientWidth) {
            el.scrollLeft = el.scrollWidth - el.clientWidth;
          }
        }
        if (valenceBarsScrollRef.current) {
          const el = valenceBarsScrollRef.current;
          if (el.scrollWidth > el.clientWidth) {
            el.scrollLeft = el.scrollWidth - el.clientWidth;
          }
        }
      }
      if (fiveDimScrollRef.current) {
        const el = fiveDimScrollRef.current;
        if (el.scrollWidth > el.clientWidth) {
          if (periodFilter === 'single_day') {
            const targetPx = Math.max(
              0,
              Math.min(
                el.scrollWidth - el.clientWidth,
                fiveDimensionsGeometry.focusTargetX - el.clientWidth + 44
              )
            );
            el.scrollLeft = targetPx;
          } else {
            el.scrollLeft = el.scrollWidth - el.clientWidth;
          }
        }
      }
    };
    const rafId = window.requestAnimationFrame(scrollChartsToLatest);
    const tId = window.setTimeout(scrollChartsToLatest, 80);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(tId);
    };
  }, [
    periodFilter,
    prefs.timelineChartType,
    timelineBuckets.length,
    flatEntries.length,
    dateRange.start,
    dateRange.end,
    fiveDimensionsGeometry.focusTargetX,
  ]);

  // Sensations analytics: unified similar phrases, grouped by area, ordered +2 to -2 vertically
  const sensationAnalytics = useMemo(() => {
    const rawItems: Array<{
      rawText: string;
      area: string;
      body: string;
      tone: SensationTone;
      color: NoteColor;
    }> = [];

    let veryPositiveCount = 0;
    let positiveCount = 0;
    let middleCount = 0;
    let mildNegativeCount = 0;
    let negativeCount = 0;

    for (const item of flatEntries) {
      for (const rawBullet of item.entry.bullets) {
        const clean = normalizeBulletText(rawBullet);
        if (!clean) continue;
        const tone = classifySensationTone(clean, item.entry.color);
        if (tone === 'very_positive') veryPositiveCount++;
        else if (tone === 'positive') positiveCount++;
        else if (tone === 'middle') middleCount++;
        else if (tone === 'mild_negative') mildNegativeCount++;
        else negativeCount++;

        const { area, body } = splitSensationAreaAndBody(clean);
        rawItems.push({ rawText: clean, area, body, tone, color: item.entry.color });
      }
    }

    const filteredItems =
      sensationToneFilter === 'all'
        ? rawItems
        : rawItems.filter((it) => it.tone === sensationToneFilter);

    // 1. Unified sensation clusters across filtered items
    const allUnified = buildUnifiedSensationClusters(filteredItems);

    // 2. Divided by Areas, with both Areas AND items ordered vertically from +2 to -2
    const areaMap = new Map<string, UnifiedSensationCluster[]>();
    for (const cluster of allUnified) {
      const list = areaMap.get(cluster.area) || [];
      list.push(cluster);
      areaMap.set(cluster.area, list);
    }

    const areaGroups = Array.from(areaMap.entries())
      .map(([area, clusters]) => {
        const sortedItems = [...clusters].sort((a, b) => {
          const scoreDiff = VALENCE_TO_SCORE[b.tone] - VALENCE_TO_SCORE[a.tone];
          if (scoreDiff !== 0) return scoreDiff;
          if (Math.abs(b.avgScore - a.avgScore) > 0.05) return b.avgScore - a.avgScore;
          return b.count - a.count;
        });
        const totalAreaCount = sortedItems.reduce((acc, c) => acc + c.count, 0);
        const areaScoreSum = sortedItems.reduce((acc, c) => acc + c.scoreSum, 0);
        const areaAvgScore = totalAreaCount > 0 ? areaScoreSum / totalAreaCount : 0;
        const maxAreaCount = Math.max(1, ...sortedItems.map((c) => c.count));
        return {
          area,
          totalCount: totalAreaCount,
          avgScore: areaAvgScore,
          topScore: sortedItems[0]?.avgScore ?? 0,
          maxItemCount: maxAreaCount,
          items: sortedItems,
        };
      })
      .sort((a, b) => {
        if (Math.abs(b.avgScore - a.avgScore) > 0.05) return b.avgScore - a.avgScore;
        return b.totalCount - a.totalCount;
      });

    // Flattened sorted list for exports
    const flatExportPhrases = areaGroups.flatMap((g) => g.items);

    // 3. Per-color frequent sensations ordered strictly +2 -> -2 vertically
    const orderedColorMeta = [...NOTE_COLOR_LIST].sort(
      (a, b) => b.valenceScore - a.valenceScore
    );
    const colorCorrelations = orderedColorMeta
      .map((col) => {
        const colorItems = filteredItems.filter((it) => it.color === col.key);
        if (colorItems.length === 0) return null;
        const clustered = buildUnifiedSensationClusters(colorItems)
          .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.avgScore - a.avgScore;
          })
          .slice(0, 4)
          .map((c) => ({ text: c.fullText, count: c.count }));
        return { meta: col, topBullets: clustered };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      totalBullets: rawItems.length,
      filteredTotalBullets: filteredItems.length,
      veryPositiveCount,
      positiveCount,
      middleCount,
      mildNegativeCount,
      negativeCount,
      areaGroups,
      flatExportPhrases,
      colorCorrelations,
    };
  }, [flatEntries, sensationToneFilter]);

  const activeFiltersSummary = useMemo(() => {
    const parts: string[] = [];
    if (activeValencePreset !== 'all') {
      const labelMap: Record<string, string> = {
        very_positive: '+2 Contento (Celeste)',
        positive: '+1 Abbastanza bene (Celeste chiaro)',
        middle: '0 Normale (Ambra)',
        mild_negative: '-1 Male (Rosso chiaro)',
        negative: '-2 Malissimo (Rosso/Antracita)',
      };
      parts.push(`Colore: ${labelMap[activeValencePreset] || selectedColors.join(', ')}`);
    }
    if (dayPeriodFilter !== 'all') {
      parts.push(`Fascia: ${DAY_PERIOD_LABELS[dayPeriodFilter].title}`);
    }
    if (keywordFilter.trim()) {
      parts.push(`Parola: "${keywordFilter.trim()}"`);
    }
    if (sensationToneFilter !== 'all') {
      parts.push(`Sensazioni: ${COLOR_VALENCE_META[sensationToneFilter].label}`);
    }
    return parts.join(' · ');
  }, [activeValencePreset, selectedColors, dayPeriodFilter, keywordFilter, sensationToneFilter]);

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

    return {
      periodLabel: dateRange.label,
      activeFiltersSummary: activeFiltersSummary || undefined,
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
        topSensations: p.topAreas
          .map((a) => `${a.area}: ${a.scoreLabel} (${a.count})`)
          .join(', '),
      })),
      sensationRows: sensationAnalytics.flatExportPhrases.map((s) => ({
        text: s.fullText,
        tone: `${COLOR_VALENCE_META[s.tone].scoreLabel} ${COLOR_VALENCE_META[s.tone].label}`,
        count: s.count,
      })),
      dailyTimelineRows: timelineBuckets.map((b) => ({
        date: b.date,
        count: b.total,
        avgScore: b.avgScore,
        summary: b.topBullet || '',
      })),
      filteredNotes: filteredNoteRows,
      chartSvgContainers: [
        { title: 'Andamento nel periodo', element: timelineChartRef.current },
        { title: 'Andamento 5 sensazioni nel tempo', element: fiveDimensionsChartRef.current },
        { title: 'Distribuzione valenza (+2 a -2)', element: colorsChartRef.current },
        { title: 'Orari e fasce', element: hourlyChartRef.current },
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
    sensationToneFilter !== 'all' ||
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
                  Scarica in Excel (.xlsx) o PDF con i filtri attivi ({dateRange.label}
                  {activeFiltersSummary ? ` · ${activeFiltersSummary}` : ''})
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
                    <FileSpreadsheet
                      className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
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
                  : periodFilter === 'single_day'
                    ? 'Tocca una fascia oraria sul grafico per vedere i dettagli'
                    : 'Tocca un giorno sul grafico per vedere i dettagli'}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1">
              {(
                [
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
                <>
                  <div className="flex items-stretch">
                    {/* Pinned non-scrolling vertical score Y-axis (+2 to -2) */}
                    <div className="shrink-0 w-[44px] border-r border-[var(--app-divider)]/60 bg-[var(--app-card)] z-10">
                      <svg
                        width="44"
                        height={lineChartGeometry.height}
                        viewBox={`0 0 44 ${lineChartGeometry.height}`}
                        className="block"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id="negSplitAxisGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="50%" stopColor="#EF4444" />
                            <stop offset="50%" stopColor="#3F3F46" />
                          </linearGradient>
                        </defs>
                        {[
                          { val: '+2', s: 2, textCol: '#0284C7', fill: '#0EA5E9' },
                          { val: '+1', s: 1, textCol: '#0EA5E9', fill: '#7DD3FC' },
                          { val: '0', s: 0, textCol: '#D97706', fill: '#F59E0B' },
                          { val: '-1', s: -1, textCol: '#E11D48', fill: '#FB7185' },
                          { val: '-2', s: -2, textCol: '#DC2626', fill: 'url(#negSplitAxisGrad)' },
                        ].map((ref) => {
                          const ry = lineChartGeometry.scoreToY(ref.s);
                          return (
                            <g key={ref.val}>
                              <circle cx="9" cy={ry} r="4" fill={ref.fill} />
                              <text
                                x="39"
                                y={ry + 3.5}
                                textAnchor="end"
                                fontSize="10.5"
                                fontWeight="600"
                                fill={ref.textCol}
                                fontFamily="monospace"
                              >
                                {ref.val}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Horizontally scrollable chart plot */}
                    <div ref={timelineScrollRef} className="flex-1 min-w-0 overflow-x-auto">
                      <svg
                        width={lineChartGeometry.plotWidth}
                        height={lineChartGeometry.height}
                        viewBox={`0 0 ${lineChartGeometry.plotWidth} ${lineChartGeometry.height}`}
                        className="block"
                        role="img"
                        aria-label="Grafico orizzontale a linea della valenza emotiva (+2 a -2)"
                      >
                        <defs>
                          <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.22" />
                            <stop offset="25%" stopColor="#7DD3FC" stopOpacity="0.16" />
                            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.10" />
                            <stop offset="75%" stopColor="#FB7185" stopOpacity="0.10" />
                            <stop offset="90%" stopColor="#EF4444" stopOpacity="0.16" />
                            <stop offset="100%" stopColor="#3F3F46" stopOpacity="0.22" />
                          </linearGradient>
                          <linearGradient id="negSplitGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="50%" stopColor="#EF4444" />
                            <stop offset="50%" stopColor="#3F3F46" />
                          </linearGradient>
                        </defs>

                        {[2, 1, 0, -1, -2].map((s) => {
                          const ry = lineChartGeometry.scoreToY(s);
                          return (
                            <line
                              key={s}
                              x1={lineChartGeometry.plotPadX}
                              y1={ry}
                              x2={lineChartGeometry.plotWidth - lineChartGeometry.plotPadRight}
                              y2={ry}
                              stroke="var(--app-divider)"
                              strokeDasharray="3 3"
                            />
                          );
                        })}

                        <line
                          x1={lineChartGeometry.plotPadX}
                          y1={lineChartGeometry.scoreToY(-2) + 8}
                          x2={lineChartGeometry.plotWidth - lineChartGeometry.plotPadRight}
                          y2={lineChartGeometry.scoreToY(-2) + 8}
                          stroke="var(--app-divider)"
                          strokeWidth="1"
                        />
                        {lineChartGeometry.xTicks.map((tick, idx) => (
                          <g key={`${tick.label}-${idx}`}>
                            <line
                              x1={tick.x}
                              y1={lineChartGeometry.scoreToY(2)}
                              x2={tick.x}
                              y2={lineChartGeometry.scoreToY(-2) + 8}
                              stroke="var(--app-divider)"
                              strokeOpacity="0.45"
                              strokeWidth="1"
                            />
                            <text
                              x={tick.x}
                              y={lineChartGeometry.height - 8}
                              textAnchor={
                                idx === 0
                                  ? 'start'
                                  : idx === lineChartGeometry.xTicks.length - 1
                                    ? 'end'
                                    : 'middle'
                              }
                              fontSize="9.5"
                              fill="var(--app-text-subtle)"
                              fontFamily="monospace"
                            >
                              {tick.label}
                            </text>
                          </g>
                        ))}

                        {lineChartGeometry.areaPath && (
                          <path d={lineChartGeometry.areaPath} fill="url(#moodAreaGrad)" />
                        )}
                        {lineChartGeometry.polyline && (
                          <polyline
                            fill="none"
                            stroke="var(--app-text)"
                            strokeWidth="2.2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={lineChartGeometry.polyline}
                          />
                        )}
                        {lineChartGeometry.boundaryHints.map((bh, bIdx) => (
                          <circle
                            key={`boundary-${bIdx}`}
                            cx={bh.x}
                            cy={bh.y}
                            r={2.8}
                            fill="var(--app-card)"
                            stroke="var(--app-text-muted)"
                            strokeWidth="1.5"
                          >
                            <title>{bh.title}</title>
                          </circle>
                        ))}
                        {lineChartGeometry.points.map((pt) => {
                          const isSelected = activeBucket?.key === pt.bucket.key;
                          return (
                            <g
                              key={pt.bucket.key}
                              className="cursor-pointer"
                              onClick={() => setSelectedTimelineKey(pt.bucket.key)}
                            >
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isSelected ? 6.5 : 4.8}
                                fill={pt.svgFill}
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
                  </div>

                  {/* Hidden combined SVG (pinned Y-axis + plot) for PDF Export */}
                  <svg
                    data-export-chart="true"
                    viewBox={`0 0 ${lineChartGeometry.plotWidth + 44} ${lineChartGeometry.height}`}
                    className="sr-only"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="negSplitPdfLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="50%" stopColor="#EF4444" />
                        <stop offset="50%" stopColor="#3F3F46" />
                      </linearGradient>
                    </defs>
                    {[
                      { val: '+2', s: 2, col: '#0284C7', fill: '#0EA5E9' },
                      { val: '+1', s: 1, col: '#0EA5E9', fill: '#7DD3FC' },
                      { val: '0', s: 0, col: '#D97706', fill: '#F59E0B' },
                      { val: '-1', s: -1, col: '#E11D48', fill: '#FB7185' },
                      { val: '-2', s: -2, col: '#DC2626', fill: 'url(#negSplitPdfLineGrad)' },
                    ].map((ref) => {
                      const ry = lineChartGeometry.scoreToY(ref.s);
                      return (
                        <g key={ref.val}>
                          <circle cx="9" cy={ry} r="4" fill={ref.fill} />
                          <text x="38" y={ry + 3.5} textAnchor="end" fontSize="10" fill={ref.col} fontFamily="monospace">
                            {ref.val}
                          </text>
                          <line
                            x1={44 + lineChartGeometry.plotPadX}
                            y1={ry}
                            x2={44 + lineChartGeometry.plotWidth - lineChartGeometry.plotPadRight}
                            y2={ry}
                            stroke="#E7E5E4"
                            strokeDasharray="3 3"
                          />
                        </g>
                      );
                    })}
                    {lineChartGeometry.xTicks.map((tick, idx) => (
                      <text
                        key={`pdf-x-${idx}`}
                        x={44 + tick.x}
                        y={lineChartGeometry.height - 8}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill="#78716C"
                        fontFamily="monospace"
                      >
                        {tick.label}
                      </text>
                    ))}
                    {lineChartGeometry.polyline && (
                      <polyline
                        fill="none"
                        stroke="#292524"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        transform="translate(44, 0)"
                        points={lineChartGeometry.polyline}
                      />
                    )}
                    {lineChartGeometry.points.map((pt) => (
                      <circle
                        key={`pdf-pt-${pt.bucket.key}`}
                        cx={44 + pt.x}
                        cy={pt.y}
                        r={4.5}
                        fill={pt.score <= -1.45 ? 'url(#negSplitPdfLineGrad)' : scoreToHex(pt.score)}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {activeTimelineItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--app-text-muted)]">
                  Servono appunti nel periodo per mostrare le fasce di valenza.
                </p>
              ) : (
                <div
                  ref={valenceBarsScrollRef}
                  className="flex items-end gap-1.5 overflow-x-auto pb-2 min-h-[156px]"
                >
                  {activeTimelineItems.map((bucket) => {
                    const isSelected = activeBucket?.key === bucket.key;
                    const heightPct = bucket.total
                      ? Math.max(14, Math.round((bucket.total / maxTimelineTotal) * 100))
                      : 4;

                    return (
                      <button
                        key={bucket.key}
                        type="button"
                        onClick={() => setSelectedTimelineKey(bucket.key)}
                        aria-label={`${bucket.shortLabel}: ${bucket.total} appunti`}
                        className={`group flex flex-col items-center justify-end gap-1.5 min-w-[34px] flex-1 shrink-0 h-[140px] rounded-lg px-0.5 py-1 transition-colors ${
                          isSelected ? 'bg-[var(--app-accent-soft)]' : 'hover:bg-[var(--app-card-alt)]'
                        }`}
                      >
                        <div className="w-full max-w-[24px] flex-1 flex flex-col justify-end">
                          {bucket.total === 0 ? (
                            <div className="w-full h-1 rounded-full bg-[var(--app-divider)]" />
                          ) : (
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full flex flex-col-reverse overflow-hidden rounded-md border border-[var(--app-border)]"
                            >
                              {bucket.anthraciteCount > 0 && (
                                <div
                                  style={{ flexGrow: bucket.anthraciteCount, backgroundColor: '#3F3F46' }}
                                  title={`Malissimo (-2 · Antracita): ${bucket.anthraciteCount}`}
                                />
                              )}
                              {bucket.redCount > 0 && (
                                <div
                                  style={{ flexGrow: bucket.redCount, backgroundColor: '#EF4444' }}
                                  title={`Malissimo (-2 · Rosso): ${bucket.redCount}`}
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
                          )}
                        </div>
                        <span
                          className={`font-mono text-[9.5px] tabular-nums ${
                            isSelected ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-subtle)]'
                          }`}
                        >
                          {bucket.axisLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Compact SVG snapshot for PDF export when Fasce valenza is active */}
              {activeTimelineItems.length > 0 && (
                <svg data-export-chart="true" viewBox="0 0 600 100" className="sr-only" aria-hidden="true">
                  <defs>
                    <linearGradient id="negSplitPdfBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="50%" stopColor="#EF4444" />
                      <stop offset="50%" stopColor="#3F3F46" />
                    </linearGradient>
                  </defs>
                  {activeTimelineItems.slice(-31).map((b, i, arr) => {
                    const slotW = 560 / Math.max(1, arr.length);
                    const barH = b.total ? Math.max(8, (b.total / maxTimelineTotal) * 76) : 2;
                    const fillVal = b.avgScore !== null ? scoreToSvgFill(b.avgScore, 'negSplitPdfBarGrad') : '#E7E5E4';
                    return (
                      <rect
                        key={b.key}
                        x={20 + i * slotW}
                        y={88 - barH}
                        width={Math.max(4, slotW - 3)}
                        height={barH}
                        rx="2"
                        fill={b.total > 0 ? fillVal : '#E7E5E4'}
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          {activeBucket?.topBullet && (
            <p className="mt-2 border-t border-[var(--app-divider)] pt-2.5 text-xs text-[var(--app-text-muted)]">
              Nota chiave ({activeBucket.shortLabel}): {activeBucket.topBullet}
            </p>
          )}
        </section>
      ),
    },
    {
      id: 'stats_five_dimensions',
      render: () => {
        const activeCount = SENSATION_DIMENSIONS.filter((d) => activeDimensions[d.key]).length;
        return (
          <section
            ref={fiveDimensionsChartRef}
            className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
                  <Activity className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
                  Andamento 5 sensazioni nel tempo ({dateRange.label})
                </h3>
                <p className="text-[11px] sm:text-xs text-[var(--app-text-muted)] mt-0.5">
                  Valutazione da testo e sintesi (+2 stato migliore · -2 carico critico)
                </p>
              </div>
              {activeCount < 5 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveDimensions({
                      umore: true,
                      energia_mentale: true,
                      energia_fisica: true,
                      stress: true,
                      ansia: true,
                    })
                  }
                  className="min-h-[28px] rounded-lg border border-[var(--app-border)] bg-[var(--app-card-alt)] px-2.5 py-1 text-[11px] font-semibold text-[var(--app-text)] hover:border-[var(--app-accent-soft-border)] transition-colors whitespace-nowrap"
                >
                  Mostra tutte (5)
                </button>
              )}
            </div>

            {/* 5 In-Block Dimension Filter Toggles */}
            <div
              role="group"
              aria-label="Filtra le 5 sensazioni sul grafico"
              className="mt-3 flex flex-wrap items-center gap-1.5"
            >
              {fiveDimensionsSummary.map((dim) => {
                const isActive = activeDimensions[dim.key];
                return (
                  <button
                    key={dim.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setActiveDimensions((prev) => ({
                        ...prev,
                        [dim.key]: !prev[dim.key],
                      }))
                    }
                    title={`${dim.label} (${dim.scaleHint})`}
                    className={`min-h-[30px] inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      isActive
                        ? 'border-[var(--app-accent-soft-border)] bg-[var(--app-card-alt)] text-[var(--app-text)] shadow-2xs'
                        : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-subtle)] opacity-55 hover:opacity-85'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isActive ? dim.color : 'transparent',
                        border: `2px solid ${dim.color}`,
                      }}
                      aria-hidden="true"
                    />
                    <span>{dim.label}</span>
                    {dim.avgScore !== null && (
                      <span className="font-mono text-[10px] text-[var(--app-text-muted)] tabular-nums">
                        {dim.avgScore > 0 ? '+' : ''}
                        {dim.avgScore.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {!fiveDimensionsGeometry.hasAnyPoint || activeCount === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--app-text-muted)]">
                  {activeCount === 0
                    ? 'Seleziona almeno una delle 5 sensazioni sopra per visualizzare la linea.'
                    : 'Servono appunti con descrizioni o sensazioni nel periodo per tracciare le linee.'}
                </p>
              ) : (
                <>
                  <div className="flex items-stretch">
                    {/* Fixed Non-Scrolling Y-Axis (+2 to -2 with red/anthracite split on -2) */}
                    <div className="shrink-0 w-[44px] border-r border-[var(--app-divider)]/60 bg-[var(--app-card)] z-10">
                      <svg
                        width="44"
                        height={fiveDimensionsGeometry.height}
                        viewBox={`0 0 44 ${fiveDimensionsGeometry.height}`}
                        className="block"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id="negSplitAxisGrad5" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="50%" stopColor="#EF4444" />
                            <stop offset="50%" stopColor="#3F3F46" />
                          </linearGradient>
                        </defs>
                        {[
                          { val: '+2', s: 2, textCol: '#0284C7', fill: '#0EA5E9' },
                          { val: '+1', s: 1, textCol: '#0EA5E9', fill: '#7DD3FC' },
                          { val: '0', s: 0, textCol: '#D97706', fill: '#F59E0B' },
                          { val: '-1', s: -1, textCol: '#E11D48', fill: '#FB7185' },
                          { val: '-2', s: -2, textCol: '#DC2626', fill: 'url(#negSplitAxisGrad5)' },
                        ].map((ref) => {
                          const ry = fiveDimensionsGeometry.scoreToY(ref.s);
                          return (
                            <g key={ref.val}>
                              <circle cx="9" cy={ry} r="4" fill={ref.fill} />
                              <text
                                x="39"
                                y={ry + 3.5}
                                textAnchor="end"
                                fontSize="10.5"
                                fontWeight="600"
                                fill={ref.textCol}
                                fontFamily="monospace"
                              >
                                {ref.val}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Horizontally Scrollable 5-Dimension Plot */}
                    <div ref={fiveDimScrollRef} className="flex-1 min-w-0 overflow-x-auto">
                      <svg
                        width={fiveDimensionsGeometry.plotWidth}
                        height={fiveDimensionsGeometry.height}
                        viewBox={`0 0 ${fiveDimensionsGeometry.plotWidth} ${fiveDimensionsGeometry.height}`}
                        className="block"
                        role="img"
                        aria-label="Grafico a linee dell'andamento di umore, energia mentale, energia fisica, stress e ansia"
                      >
                        {[2, 1, 0, -1, -2].map((s) => {
                          const ry = fiveDimensionsGeometry.scoreToY(s);
                          return (
                            <line
                              key={s}
                              x1={fiveDimensionsGeometry.plotPadX}
                              y1={ry}
                              x2={fiveDimensionsGeometry.plotWidth - fiveDimensionsGeometry.plotPadRight}
                              y2={ry}
                              stroke={s === 0 ? 'var(--app-border)' : 'var(--app-divider)'}
                              strokeDasharray={s === 0 ? '4 2' : '3 3'}
                            />
                          );
                        })}

                        <line
                          x1={fiveDimensionsGeometry.plotPadX}
                          y1={fiveDimensionsGeometry.scoreToY(-2) + 8}
                          x2={fiveDimensionsGeometry.plotWidth - fiveDimensionsGeometry.plotPadRight}
                          y2={fiveDimensionsGeometry.scoreToY(-2) + 8}
                          stroke="var(--app-divider)"
                          strokeWidth="1"
                        />

                        {fiveDimensionsGeometry.xTicks.map((tick, idx) => (
                          <g key={`dim-tick-${tick.label}-${idx}`}>
                            <line
                              x1={tick.x}
                              y1={fiveDimensionsGeometry.scoreToY(2)}
                              x2={tick.x}
                              y2={fiveDimensionsGeometry.scoreToY(-2) + 8}
                              stroke="var(--app-divider)"
                              strokeOpacity="0.45"
                              strokeWidth="1"
                            />
                            <text
                              x={tick.x}
                              y={fiveDimensionsGeometry.height - 8}
                              textAnchor={
                                idx === 0
                                  ? 'start'
                                  : idx === fiveDimensionsGeometry.xTicks.length - 1
                                    ? 'end'
                                    : 'middle'
                              }
                              fontSize="9.5"
                              fill="var(--app-text-subtle)"
                              fontFamily="monospace"
                            >
                              {tick.label}
                            </text>
                          </g>
                        ))}

                        {fiveDimensionsGeometry.series.map((s) => {
                          if (!activeDimensions[s.meta.key] || s.points.length === 0) return null;
                          return (
                            <g key={s.meta.key}>
                              {s.polyline && (
                                <polyline
                                  fill="none"
                                  stroke={s.meta.color}
                                  strokeWidth="2.2"
                                  strokeOpacity="0.9"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                  points={s.polyline}
                                />
                              )}
                              {s.pathPoints
                                .filter((pt) => pt.isBoundary)
                                .map((bp, bIdx) => (
                                  <circle
                                    key={`${s.meta.key}-b-${bIdx}`}
                                    cx={bp.x}
                                    cy={bp.y}
                                    r={2.5}
                                    fill="var(--app-card)"
                                    stroke={s.meta.color}
                                    strokeWidth="1.4"
                                  />
                                ))}
                              {s.points.map((pt, pIdx) => (
                                <circle
                                  key={`${s.meta.key}-p-${pIdx}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={3.8}
                                  fill={s.meta.color}
                                  stroke="var(--app-card)"
                                  strokeWidth="1.5"
                                >
                                  <title>
                                    {`${s.meta.label} · ${pt.label}: ${pt.score > 0 ? '+' : ''}${pt.score.toFixed(2)} (${pt.count} ${pt.count === 1 ? 'nota' : 'note'})`}
                                  </title>
                                </circle>
                              ))}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Hidden combined SVG for PDF Export */}
                  <svg
                    data-export-chart="true"
                    viewBox={`0 0 ${fiveDimensionsGeometry.plotWidth + 44} ${fiveDimensionsGeometry.height}`}
                    className="sr-only"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="negSplitPdf5Grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="50%" stopColor="#EF4444" />
                        <stop offset="50%" stopColor="#3F3F46" />
                      </linearGradient>
                    </defs>
                    {[
                      { val: '+2', s: 2, col: '#0284C7', fill: '#0EA5E9' },
                      { val: '+1', s: 1, col: '#0EA5E9', fill: '#7DD3FC' },
                      { val: '0', s: 0, col: '#D97706', fill: '#F59E0B' },
                      { val: '-1', s: -1, col: '#E11D48', fill: '#FB7185' },
                      { val: '-2', s: -2, col: '#DC2626', fill: 'url(#negSplitPdf5Grad)' },
                    ].map((ref) => {
                      const ry = fiveDimensionsGeometry.scoreToY(ref.s);
                      return (
                        <g key={ref.val}>
                          <circle cx="9" cy={ry} r="4" fill={ref.fill} />
                          <text x="38" y={ry + 3.5} textAnchor="end" fontSize="10" fill={ref.col} fontFamily="monospace">
                            {ref.val}
                          </text>
                          <line
                            x1={44 + fiveDimensionsGeometry.plotPadX}
                            y1={ry}
                            x2={44 + fiveDimensionsGeometry.plotWidth - fiveDimensionsGeometry.plotPadRight}
                            y2={ry}
                            stroke="#E7E5E4"
                            strokeDasharray="3 3"
                          />
                        </g>
                      );
                    })}
                    {fiveDimensionsGeometry.xTicks.map((tick, idx) => (
                      <text
                        key={`pdf-dim-x-${idx}`}
                        x={44 + tick.x}
                        y={fiveDimensionsGeometry.height - 8}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill="#78716C"
                        fontFamily="monospace"
                      >
                        {tick.label}
                      </text>
                    ))}
                    {fiveDimensionsGeometry.series.map((s) => {
                      if (!activeDimensions[s.meta.key] || s.points.length === 0) return null;
                      return (
                        <g key={`pdf-dim-${s.meta.key}`} transform="translate(44, 0)">
                          {s.polyline && (
                            <polyline
                              fill="none"
                              stroke={s.meta.color}
                              strokeWidth="2.1"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              points={s.polyline}
                            />
                          )}
                          {s.points.map((pt, pIdx) => (
                            <circle
                              key={`pdf-dim-pt-${s.meta.key}-${pIdx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={3.5}
                              fill={s.meta.color}
                              stroke="#FFFFFF"
                              strokeWidth="1.2"
                            />
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                </>
              )}
            </div>

            <p className="mt-2.5 border-t border-[var(--app-divider)] pt-2 text-[10.5px] text-[var(--app-text-subtle)] leading-snug">
              Umore, Energia mentale &amp; fisica: +2 ottimo · -2 scarico/giù. Stress &amp; Ansia: +2 calmo/assente · -2 intenso/alto.
            </p>
          </section>
        );
      },
    },
    {
      id: 'stats_colors',
      render: () => (
        <section
          ref={colorsChartRef}
          className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--app-text)]">
              Colori &amp; Valenza emotiva (+2 a -2)
            </h3>
          </div>

          <div className="mt-4 space-y-4">
            <div className="h-4 w-full rounded-full overflow-hidden bg-[var(--app-divider)] flex">
              {colorValenceStats.map((item) =>
                item.count > 0 ? (
                  <div
                    key={item.valence}
                    style={{
                      width: `${(item.count / (flatEntries.length || 1)) * 100}%`,
                      background: getValenceBackground(item.valence),
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
                      <span className="font-normal text-[var(--app-text-subtle)]">
                        ({item.meta.subtitle})
                      </span>
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
                        background: getValenceBackground(item.valence),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {flatEntries.length > 0 && (
              <svg data-export-chart="true" viewBox="0 0 600 96" className="sr-only" aria-hidden="true">
                <defs>
                  <linearGradient id="negSplitPdfColorGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="50%" stopColor="#EF4444" />
                    <stop offset="50%" stopColor="#3F3F46" />
                  </linearGradient>
                </defs>
                {colorValenceStats.map((item, idx) => {
                  const y = 6 + idx * 18;
                  const barW = Math.max(4, Math.round((item.pct / 100) * 440));
                  const fillVal =
                    item.valence === 'negative' ? 'url(#negSplitPdfColorGrad)' : item.meta.hex;
                  return (
                    <g key={item.valence}>
                      <text x="4" y={y + 11} fontSize="10" fill="#44403C" fontFamily="sans-serif">
                        {item.meta.scoreLabel} {item.meta.label}
                      </text>
                      <rect x="130" y={y + 2} width={barW} height="11" rx="3" fill={fillVal} />
                      <text x={136 + barW} y={y + 11} fontSize="9.5" fill="#57534E" fontFamily="monospace">
                        {item.count} ({item.pct}%)
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
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
              <h3 className="text-sm font-bold text-[var(--app-text)]">Orari &amp; Fasce</h3>
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
                data-export-chart="true"
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
                          {dp.redCount > 0 && (
                            <div
                              style={{
                                width: `${(dp.redCount / total) * 100}%`,
                                backgroundColor: '#EF4444',
                              }}
                              title={`Malissimo (-2 Rosso): ${dp.redCount}`}
                            />
                          )}
                          {dp.anthraciteCount > 0 && (
                            <div
                              style={{
                                width: `${(dp.anthraciteCount / total) * 100}%`,
                                backgroundColor: '#3F3F46',
                              }}
                              title={`Malissimo (-2 Antracita): ${dp.anthraciteCount}`}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {flatEntries.length > 0 && (
                <svg data-export-chart="true" viewBox="0 0 600 84" className="sr-only" aria-hidden="true">
                  {dayPeriodStats.map((dp, idx) => {
                    const y = 6 + idx * 19;
                    const barW = Math.max(4, Math.round((dp.pct / 100) * 430));
                    return (
                      <g key={dp.period}>
                        <text x="4" y={y + 11} fontSize="10" fill="#44403C" fontFamily="sans-serif">
                          {dp.meta.title}
                        </text>
                        <rect x="110" y={y + 2} width={barW} height="11" rx="3" fill="#0EA5E9" />
                        <text x={116 + barW} y={y + 11} fontSize="9.5" fill="#57534E" fontFamily="monospace">
                          {dp.count} ({dp.pct}%)
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          {/* Clickable 4 Time-of-Day Windows with inline short score-colored area bars */}
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
                {dp.topAreas.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--app-text-muted)]">
                    {dp.topAreas.map((a) => (
                      <span
                        key={a.area}
                        className="inline-flex items-center gap-1.5"
                        title={`${a.area}: media ${a.avgScore.toFixed(1)} (${a.count}×)`}
                      >
                        <span className="font-medium text-[var(--app-text)]">{a.area}:</span>
                        <span
                          className="inline-block h-2 w-7 rounded-full shrink-0"
                          style={{ background: getValenceBackground(a.valence) }}
                          aria-label={`punteggio ${a.scoreLabel}`}
                        />
                      </span>
                    ))}
                  </div>
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
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Smile className="h-4 w-4 text-[var(--app-accent-text)] shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[var(--app-text)]">
                Sensazioni, stati d’animo e colori
              </h3>
            </div>

            {/* Full-width horizontal tone filters */}
            <div
              role="group"
              aria-label="Filtra sensazioni per valenza"
              className="w-full grid grid-cols-3 sm:grid-cols-6 gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1"
            >
              {(
                [
                  { id: 'all', label: 'Tutte' },
                  { id: 'very_positive', label: '+2 Contento' },
                  { id: 'positive', label: '+1 Abb. bene' },
                  { id: 'middle', label: '0 Normale' },
                  { id: 'mild_negative', label: '-1 Male' },
                  { id: 'negative', label: '-2 Malissimo' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSensationToneFilter(t.id)}
                  className={`min-h-[28px] rounded-lg px-1.5 py-1 text-[10.5px] sm:text-[11px] font-semibold leading-tight text-center transition-colors ${
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

          {sensationAnalytics.filteredTotalBullets === 0 ? (
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              Nessuna sensazione presente per i filtri selezionati.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                          background: NEGATIVE_SPLIT_GRADIENT,
                        }}
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
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: NEGATIVE_SPLIT_GRADIENT }}
                        aria-hidden="true"
                      />
                      Malissimo ({sensationAnalytics.negativeCount})
                    </span>
                  </div>
                </div>

                {sensationAnalytics.colorCorrelations.length > 0 && (
                  <div className="border-t border-[var(--app-divider)] pt-3">
                    <p className="text-xs font-medium text-[var(--app-text-muted)] mb-2">
                      Sensazioni frequenti per colore (+2 a -2)
                    </p>
                    <div className="space-y-2">
                      {sensationAnalytics.colorCorrelations.map(({ meta, topBullets }) => (
                        <div key={meta.key} className="text-xs leading-relaxed">
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

              {/* Frequent sensations divided by Area, unified similar descriptions, sorted +2 -> -2 vertically */}
              <div className="lg:col-span-7 space-y-4">
                <p className="text-xs font-medium text-[var(--app-text-muted)]">
                  Sensazioni e stati più frequenti (divisi per aree, da +2 a -2)
                </p>
                {sensationAnalytics.areaGroups.length === 0 ? (
                  <p className="text-xs text-[var(--app-text-subtle)] py-4">
                    Nessuna sensazione in questa categoria.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sensationAnalytics.areaGroups.map((group) => (
                      <div
                        key={group.area}
                        className="border-t border-[var(--app-divider)] pt-2.5 first:border-t-0 first:pt-0 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[var(--app-text)]">{group.area}</span>
                          <span className="font-mono text-[11px] text-[var(--app-text-subtle)] tabular-nums">
                            {group.totalCount}×
                          </span>
                        </div>

                        <div className="space-y-2">
                          {group.items.map((phrase) => {
                            const widthPct = Math.max(
                              14,
                              Math.round((phrase.count / group.maxItemCount) * 100)
                            );
                            const scoreLabel = COLOR_VALENCE_META[phrase.tone].scoreLabel;

                            return (
                              <div key={`${group.area}-${phrase.displayText}`} className="space-y-1">
                                <div className="flex items-start justify-between gap-2 text-xs">
                                  <span className="text-[var(--app-text)] font-medium leading-snug break-words">
                                    {phrase.displayText}
                                  </span>
                                  <span className="font-mono text-[11px] text-[var(--app-text-muted)] tabular-nums shrink-0">
                                    {scoreLabel} · {phrase.count}×
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-[var(--app-divider)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${widthPct}%`,
                                      background: getValenceBackground(phrase.tone),
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
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
      {/* Header + Compact Proportional Filters + Summary Strip */}
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-3.5 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CatIllustration
              src={statsNeko.src}
              alt={statsNeko.alt}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)] shrink-0"
            />
            <div>
              <h2 className="flex items-center gap-1.5 text-sm sm:text-lg font-bold text-[var(--app-text)]">
                <BarChart3 className="h-4 w-4 text-[var(--app-accent-text)]" aria-hidden="true" />
                Statistiche &amp; Grafici
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--app-text-muted)] mt-0.5">
                +2 Contento · +1 Abbastanza bene · 0 Normale · -1 Male · -2 Malissimo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {hasCustomFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[32px] inline-flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Ripristina filtri
              </button>
            )}
          </div>
        </div>

        {/* Compact Full-Width Filters */}
        <div className="mt-3.5 flex flex-col gap-2">
          {/* 6 Temporal Filters spanning full horizontal width */}
          <div
            role="tablist"
            aria-label="Periodo statistiche"
            className="w-full grid grid-cols-3 sm:grid-cols-6 gap-1 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent-soft-border)] p-1"
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
                  className={`min-h-[30px] rounded-lg px-1.5 py-1 text-[10.5px] sm:text-[11px] font-semibold leading-tight text-center transition-colors ${
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

          {periodFilter === 'single_day' && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--app-accent-soft-border)] bg-[var(--app-accent-soft)] p-2 text-xs">
              <label className="flex items-center gap-2 text-[var(--app-text)]">
                <span className="text-[11px] font-semibold">Seleziona giornata:</span>
                <input
                  type="date"
                  value={singleDayDate}
                  onChange={(e) => setSingleDayDate(e.target.value || todayISO)}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)] tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={() => setSingleDayDate(todayISO)}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-text)] hover:bg-[var(--app-card-alt)]"
              >
                Oggi
              </button>
            </div>
          )}

          {periodFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2 text-xs">
              <label className="flex items-center gap-1.5 text-[var(--app-text-muted)]">
                <span className="text-[11px] font-medium">Dal:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)] tabular-nums"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[var(--app-text-muted)]">
                <span className="text-[11px] font-medium">Al:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)] tabular-nums"
                />
              </label>
            </div>
          )}

          {/* Descriptive Valence/Color Filters side-by-side (dot placed at start inside parenthesis) */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-pressed={activeValencePreset === 'all'}
              onClick={() => applyValencePreset('all')}
              className={`min-h-[28px] rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
                activeValencePreset === 'all'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              Tutti i colori
            </button>

            <button
              type="button"
              aria-pressed={activeValencePreset === 'very_positive'}
              onClick={() => applyValencePreset('very_positive')}
              className={`min-h-[28px] inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
                activeValencePreset === 'very_positive'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              <span>+2 Contento (</span>
              <span
                className="h-2 w-2 rounded-full bg-sky-500 border border-sky-600 shrink-0 -mx-0.5"
                aria-hidden="true"
              />
              <span>Celeste)</span>
            </button>

            <button
              type="button"
              aria-pressed={activeValencePreset === 'positive'}
              onClick={() => applyValencePreset('positive')}
              className={`min-h-[28px] inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
                activeValencePreset === 'positive'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              <span>+1 Abbastanza bene (</span>
              <span
                className="h-2 w-2 rounded-full bg-sky-300 border border-sky-400 shrink-0 -mx-0.5"
                aria-hidden="true"
              />
              <span>Celeste chiaro)</span>
            </button>

            <button
              type="button"
              aria-pressed={activeValencePreset === 'middle'}
              onClick={() => applyValencePreset('middle')}
              className={`min-h-[28px] inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
                activeValencePreset === 'middle'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              <span>0 Normale (</span>
              <span
                className="h-2 w-2 rounded-full bg-amber-400 border border-amber-500 shrink-0 -mx-0.5"
                aria-hidden="true"
              />
              <span>Ambra)</span>
            </button>

            <button
              type="button"
              aria-pressed={activeValencePreset === 'mild_negative'}
              onClick={() => applyValencePreset('mild_negative')}
              className={`min-h-[28px] inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
                activeValencePreset === 'mild_negative'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              <span>-1 Male (</span>
              <span
                className="h-2 w-2 rounded-full bg-rose-300 border border-rose-400 shrink-0 -mx-0.5"
                aria-hidden="true"
              />
              <span>Rosso chiaro)</span>
            </button>

            <button
              type="button"
              aria-pressed={activeValencePreset === 'negative'}
              onClick={() => applyValencePreset('negative')}
              className={`min-h-[28px] inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
                activeValencePreset === 'negative'
                  ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
              }`}
            >
              <span>-2 Malissimo (</span>
              <span
                className="h-2 w-2 rounded-full bg-red-500 border border-red-600 shrink-0 -mx-0.5"
                aria-hidden="true"
              />
              <span>Rosso/</span>
              <span
                className="h-2 w-2 rounded-full bg-zinc-800 border border-zinc-950 shrink-0 -mx-0.5"
                aria-hidden="true"
              />
              <span>Antracita)</span>
            </button>
          </div>

          {/* Time-of-day filter strip + compact search side-by-side/wrapped */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setDayPeriodFilter('all')}
                aria-pressed={dayPeriodFilter === 'all'}
                className={`min-h-[28px] rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
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
                    className={`min-h-[28px] rounded-lg border px-2 py-0.5 text-[10.5px] sm:text-[11px] font-medium transition-colors ${
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

            <div className="relative w-full sm:w-52">
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
                className="w-full min-h-[32px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] pl-8 pr-7 py-1 text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
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
        </div>

        {/* Summary Metrics Strip */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--app-divider)] border-t border-[var(--app-divider)] pt-3.5">
          <div className="py-1.5 sm:py-0 sm:pr-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">Appunti analizzati</span>
            <span className="mt-0.5 block font-mono text-lg sm:text-xl font-bold text-[var(--app-text)] tabular-nums">
              {flatEntries.length}
            </span>
          </div>
          <div className="py-1.5 sm:py-0 sm:px-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">Giorni con note</span>
            <span className="mt-0.5 block font-mono text-lg sm:text-xl font-bold text-[var(--app-text)] tabular-nums">
              {activeDaysCount}
            </span>
          </div>
          <div className="py-1.5 sm:py-0 sm:px-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">
              Media valenza (-2 a +2)
            </span>
            <span className="mt-0.5 block font-mono text-xs sm:text-sm font-semibold text-[var(--app-text)] tabular-nums">
              {avgValenceScore === null
                ? '—'
                : `${avgValenceScore > 0 ? '+' : ''}${avgValenceScore.toFixed(2)} (${scoreToVerdict(
                    avgValenceScore
                  )})`}
            </span>
          </div>
          <div className="py-1.5 sm:py-0 sm:pl-4">
            <span className="block text-[11px] text-[var(--app-text-muted)]">
              Colore più frequente
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--app-text)]">
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
            Prova ad allargare il periodo, rimuovere un filtro oppure aggiungi un nuovo appunto per
            vedere subito i grafici.
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
          className="space-y-5"
        />
      )}
    </div>
  );
};
