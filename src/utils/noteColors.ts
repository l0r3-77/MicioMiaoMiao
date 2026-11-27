import type { NoteColor } from '../types/note';

export type ColorValence =
  | 'very_positive'
  | 'positive'
  | 'middle'
  | 'mild_negative'
  | 'negative';

export interface NoteColorMeta {
  key: NoteColor;
  label: string;
  hex: string;
  valence: ColorValence;
  valenceLabel: string;
  valenceScore: number; // +2, +1, 0, -1, -2
  highlightClass: string;
  surfaceClass: string;
  hoverSurfaceClass: string;
  swatchClass: string;
  dotClass: string;
}

export const NOTE_COLORS: Record<NoteColor, NoteColorMeta> = {
  celeste: {
    key: 'celeste',
    label: 'Celeste',
    hex: '#0EA5E9',
    valence: 'very_positive',
    valenceLabel: 'Contento (+2)',
    valenceScore: 2,
    highlightClass: 'bg-sky-200/85 text-stone-900',
    surfaceClass: 'bg-sky-100/90 border-sky-300/90',
    hoverSurfaceClass: 'hover:border-sky-400',
    swatchClass: 'bg-sky-500 border-sky-600',
    dotClass: 'bg-sky-500',
  },
  sky: {
    key: 'sky',
    label: 'Celeste chiaro',
    hex: '#7DD3FC',
    valence: 'positive',
    valenceLabel: 'Abbastanza bene (+1)',
    valenceScore: 1,
    highlightClass: 'bg-sky-100/80 text-stone-900',
    surfaceClass: 'bg-sky-50/80 border-sky-200/90',
    hoverSurfaceClass: 'hover:border-sky-300',
    swatchClass: 'bg-sky-300 border-sky-400',
    dotClass: 'bg-sky-400',
  },
  amber: {
    key: 'amber',
    label: 'Ambra',
    hex: '#F59E0B',
    valence: 'middle',
    valenceLabel: 'Normale (0)',
    valenceScore: 0,
    highlightClass: 'bg-amber-100/80 text-stone-900',
    surfaceClass: 'bg-amber-50/80 border-amber-200/90',
    hoverSurfaceClass: 'hover:border-amber-300',
    swatchClass: 'bg-amber-400 border-amber-500',
    dotClass: 'bg-amber-500',
  },
  light_red: {
    key: 'light_red',
    label: 'Rosso chiaro',
    hex: '#FCA5A5',
    valence: 'mild_negative',
    valenceLabel: 'Male (-1)',
    valenceScore: -1,
    highlightClass: 'bg-rose-100/85 text-stone-900',
    surfaceClass: 'bg-rose-50/80 border-rose-200/90',
    hoverSurfaceClass: 'hover:border-rose-300',
    swatchClass: 'bg-rose-300 border-rose-400',
    dotClass: 'bg-rose-400',
  },
  red: {
    key: 'red',
    label: 'Rosso',
    hex: '#EF4444',
    valence: 'negative',
    valenceLabel: 'Malissimo · Stress / Rabbia (-2)',
    valenceScore: -2,
    highlightClass: 'bg-red-100/90 text-stone-900',
    surfaceClass: 'bg-red-50/80 border-red-200/90',
    hoverSurfaceClass: 'hover:border-red-300',
    swatchClass: 'bg-red-500 border-red-600',
    dotClass: 'bg-red-500',
  },
  anthracite: {
    key: 'anthracite',
    label: 'Antracita',
    hex: '#3F3F46',
    valence: 'negative',
    valenceLabel: 'Malissimo · Apatia / Scarico (-2)',
    valenceScore: -2,
    highlightClass: 'bg-zinc-800 text-white',
    surfaceClass: 'bg-zinc-800 border-zinc-900 text-white',
    hoverSurfaceClass: 'hover:border-zinc-700',
    swatchClass: 'bg-zinc-800 border-zinc-950',
    dotClass: 'bg-zinc-800',
  },
};

export const NOTE_COLOR_LIST: NoteColorMeta[] = [
  NOTE_COLORS.celeste,
  NOTE_COLORS.sky,
  NOTE_COLORS.amber,
  NOTE_COLORS.light_red,
  NOTE_COLORS.red,
  NOTE_COLORS.anthracite,
];

export const VALID_NOTE_COLORS: NoteColor[] = NOTE_COLOR_LIST.map((c) => c.key);

export const COLOR_VALENCE_META: Record<
  ColorValence,
  { label: string; subtitle: string; scoreLabel: string; hex: string; barClass: string }
> = {
  very_positive: {
    label: 'Contento',
    subtitle: 'Celeste',
    scoreLabel: '+2',
    hex: '#0EA5E9',
    barClass: 'bg-sky-500',
  },
  positive: {
    label: 'Abbastanza bene',
    subtitle: 'Celeste chiaro',
    scoreLabel: '+1',
    hex: '#7DD3FC',
    barClass: 'bg-sky-300',
  },
  middle: {
    label: 'Normale',
    subtitle: 'Ambra',
    scoreLabel: '0',
    hex: '#F59E0B',
    barClass: 'bg-amber-400',
  },
  mild_negative: {
    label: 'Male',
    subtitle: 'Rosso chiaro',
    scoreLabel: '-1',
    hex: '#FB7185',
    barClass: 'bg-rose-400',
  },
  negative: {
    label: 'Malissimo',
    subtitle: 'Rosso · Antracita',
    scoreLabel: '-2',
    hex: '#EF4444',
    barClass: 'bg-red-500',
  },
};

export const NEGATIVE_SPLIT_GRADIENT =
  'linear-gradient(90deg, #EF4444 0%, #EF4444 50%, #3F3F46 50%, #3F3F46 100%)';

export function getValenceBackground(valence: ColorValence): string {
  if (valence === 'negative') return NEGATIVE_SPLIT_GRADIENT;
  return COLOR_VALENCE_META[valence].hex;
}

export function inferNoteColorFromText(text: string, bullets: string[] = []): NoteColor {
  const combined = `${text} ${bullets.join(' ')}`.toLowerCase();

  // -2 Antracita: apatia, assenza di sentimenti, visione grigia, energia mentale estremamente scarica
  if (
    /apati|assenza di sentiment|nessun sentiment|vuoto|spento|spenta|grigio|grigia|visione negativa|distacc|indifferent|energia mentale.{0,24}scaric|estremamente scaric|completamente scaric|senza energie|demotivat|blocc|crollo|sfinit|esaurit|non sento nulla|anestetizzat|malissimo/.test(
      combined
    )
  ) {
    return 'anthracite';
  }
  // -2 Rosso: emotività negativa intensa, rabbia, troppo stress, agitazione, frustrazione
  if (
    /rabbia|arrabbi|furios|irritat|emotivit.{0,12}negativ|troppo stress|stress alt|molto stress|ansia|panico|frustr|sopraffatt|esaurimento|forte tensione|pressione alt|agitazion|nervosism|esasperat|odio|esplod/.test(
      combined
    )
  ) {
    return 'red';
  }
  // -1 Rosso chiaro: male, stanchezza lieve, piccolo stress o disagio
  if (
    /stanc|un po' giù|lieve|legger|appesantit|nervos|fastidio|preoccupat|sotto tono|scaric|pausa|riposo|difficil|teso|tesa|stress|male/.test(
      combined
    )
  ) {
    return 'light_red';
  }
  // +2 Celeste: contento, felicissimo, entusiasta, giornata splendida, al top
  if (
    /contentissim|felicissim|molto content|contento|contenta|entusiast|euforic|splendid|meraviglios|benissimo|alla grande|al top|gioia grande|super positiv|straordinari|soddisfattissim/.test(
      combined
    )
  ) {
    return 'celeste';
  }
  // +1 Celeste chiaro: abbastanza bene, sereno, calmo, positivo
  if (
    /abbastanza bene|seren|felic|calmo|calma|rilassat|tranquill|ottim|buon|positiv|gioi|solliev|grat|soddisfatt|caric|energ|lucid|bene|bell/.test(
      combined
    )
  ) {
    return 'sky';
  }
  return 'amber';
}
