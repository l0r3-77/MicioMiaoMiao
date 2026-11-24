export interface NekoAsset {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export const CHIBI_CAT_MASCOTS = {
  mic: {
    id: 'chibi_mic',
    src: '/assets/aistudio/IMG_8005_8c16ccb2.jpeg',
    alt: 'Gattino nero chibi sorridente con microfono su sfondo lilla e crema',
    caption: 'Pronto ad ascoltare la tua voce',
  },
  diary: {
    id: 'chibi_diary',
    src: '/src/assets/images/chibi_cat_diary_1795346053592.jpg',
    alt: 'Gattino nero chibi che scrive sul taccuino con penna lilla',
    caption: 'Appunti e pensieri del giorno',
  },
  calendar: {
    id: 'chibi_calendar',
    src: '/src/assets/images/chibi_cat_calendar_1795346053892.jpg',
    alt: 'Gattino nero chibi allegro accanto al calendario lilla e crema',
    caption: 'La tua agenda giorno dopo giorno',
  },
  stats: {
    id: 'chibi_stats',
    src: '/src/assets/images/chibi_cat_stats_1795346054128.jpg',
    alt: 'Gattino nero chibi che indica i grafici delle sensazioni',
    caption: 'Uno sguardo sereno alle tue statistiche',
  },
  cozy: {
    id: 'chibi_cozy',
    src: '/src/assets/images/chibi_cat_cozy_1795346053222.jpg',
    alt: 'Gattino nero chibi rilassato con tazza calda e cuoricino lilla',
    caption: 'Momento di calma e giornate appuntate',
  },
  philosopher: {
    id: 'chibi_philosopher',
    src: '/src/assets/images/chibi_cat_philosopher_1795350255468.jpg',
    alt: 'Gattino nero chibi con occhiali tondi dorati e pergamena filosofica',
    caption: 'Saggezza e parole che restano',
  },
  stargazer: {
    id: 'chibi_stargazer',
    src: '/src/assets/images/chibi_cat_stargazer_1795350256529.jpg',
    alt: 'Gattino nero chibi che guarda la luna crescente dorata e le stelle',
    caption: 'Sguardo ampio e respiro leggero',
  },
  sprout: {
    id: 'chibi_sprout',
    src: '/src/assets/images/chibi_cat_sprout_1795350256317.jpg',
    alt: 'Gattino nero chibi che cura una piantina verde con innaffiatoio lilla',
    caption: 'Piccoli passi che crescono nel tempo',
  },
  zen: {
    id: 'chibi_zen',
    src: '/src/assets/images/chibi_cat_zen_1795350256259.jpg',
    alt: 'Gattino nero chibi in meditazione serena con foglioline pastello',
    caption: 'Calma interiore e presenza nel momento',
  },
} as const satisfies Record<string, NekoAsset>;

export type ChibiCatKey = keyof typeof CHIBI_CAT_MASCOTS;

export const NEKO_CATALOG: NekoAsset[] = [
  CHIBI_CAT_MASCOTS.mic,
  CHIBI_CAT_MASCOTS.diary,
  CHIBI_CAT_MASCOTS.calendar,
  CHIBI_CAT_MASCOTS.stats,
  CHIBI_CAT_MASCOTS.cozy,
  CHIBI_CAT_MASCOTS.philosopher,
  CHIBI_CAT_MASCOTS.stargazer,
  CHIBI_CAT_MASCOTS.sprout,
  CHIBI_CAT_MASCOTS.zen,
];

function dayIndexFromISODate(isoDate: string): number {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return 0;
  }
  const [y, m, d] = parts;
  const utcDays = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return Math.abs(utcDays);
}

/**
 * Restituisce un gattino nero chibi in stile lilla/crema diverso per ogni giorno e sezione.
 */
export function getNekoForDate(isoDate: string, offset = 0): NekoAsset {
  const idx = (dayIndexFromISODate(isoDate) + offset) % NEKO_CATALOG.length;
  return NEKO_CATALOG[idx];
}
