import type { TodoBlockKey } from '../types/dailyTodo';

export type CatEmoticonId =
  | 'cat_note'
  | 'cat_happy'
  | 'cat_love'
  | 'cat_idea'
  | 'cat_bills'
  | 'cat_shop'
  | 'cat_call'
  | 'cat_work'
  | 'cat_coffee'
  | 'cat_fun'
  | 'cat_sport'
  | 'cat_clean'
  | 'cat_health'
  | 'cat_car'
  | 'cat_gift'
  | 'cat_sleep';

export interface CatEmoticonDef {
  id: CatEmoticonId;
  label: string;
  widgetEmoji: string;
  accentColor: string;
  keywords: RegExp;
}

export const CAT_EMOTICON_LIBRARY: CatEmoticonDef[] = [
  {
    id: 'cat_note',
    label: 'Appunto',
    widgetEmoji: '🐱',
    accentColor: '#93C5FD',
    keywords: /appunt|scriver|nota|ricord|lista/i,
  },
  {
    id: 'cat_happy',
    label: 'Contento',
    widgetEmoji: '😸',
    accentColor: '#FCD34D',
    keywords: /felic|content|bello|evviva|brav|success/i,
  },
  {
    id: 'cat_love',
    label: 'Cuore',
    widgetEmoji: '😻',
    accentColor: '#F9A8D4',
    keywords: /amor|cuor|abbracc|baci|mam|pap|famigl|amic|gatto|cane|pelos/i,
  },
  {
    id: 'cat_idea',
    label: 'Idea',
    widgetEmoji: '💡',
    accentColor: '#FDE047',
    keywords: /ide|pensar|progett|creativ|invent|capir/i,
  },
  {
    id: 'cat_bills',
    label: 'Pagamenti',
    widgetEmoji: '💳',
    accentColor: '#FBBF24',
    keywords:
      /bollett|luce|enel|gas|acqua|affitto|mutuo|pagar|pagamento|bonifico|fattur|banca|tass|f24|multa|abbonament|ricarica|sold|euro/i,
  },
  {
    id: 'cat_shop',
    label: 'Spesa',
    widgetEmoji: '🛒',
    accentColor: '#60A5FA',
    keywords:
      /spes|supermercat|comprar|comprare|latte|pane|frutta|verdura|cibo|cena|pranzo|cucin|ricett|negozi/i,
  },
  {
    id: 'cat_call',
    label: 'Chiamata',
    widgetEmoji: '📞',
    accentColor: '#38BDF8',
    keywords: /chiamar|telef|telefon|messagg|whatsapp|email|mail|risponder|contatt/i,
  },
  {
    id: 'cat_work',
    label: 'Lavoro',
    widgetEmoji: '💼',
    accentColor: '#A5B4FC',
    keywords: /lavor|riunion|ufficio|client|document|cv|stud|esam|corso|pc|computer|scrivani/i,
  },
  {
    id: 'cat_coffee',
    label: 'Pausa',
    widgetEmoji: '☕',
    accentColor: '#FDBA74',
    keywords: /caff|tazz|colazion|merend|paus|thè|te |tisana|bar/i,
  },
  {
    id: 'cat_fun',
    label: 'Svago',
    widgetEmoji: '✨',
    accentColor: '#C084FC',
    keywords:
      /film|serie|netflix|cinema|gioco|videogio|play|libro|legger|music|concert|teatro|aperitiv|uscit|svago|divert/i,
  },
  {
    id: 'cat_sport',
    label: 'Sport',
    widgetEmoji: '🏃',
    accentColor: '#34D399',
    keywords: /palestr|corsa|correr|allen|sport|cammin|bici|nuot|yoga|passeggiat|pilates/i,
  },
  {
    id: 'cat_clean',
    label: 'Casa',
    widgetEmoji: '🧹',
    accentColor: '#67E8F9',
    keywords: /pulir|lavar|bucato|lavatric|stirar|riordin|spazzat|casa|piatt|sistemar/i,
  },
  {
    id: 'cat_health',
    label: 'Salute',
    widgetEmoji: '🩺',
    accentColor: '#4ADE80',
    keywords: /medic|dottor|visit|dentist|farmac|analisi|ricetta|salute|pillol|ospedal/i,
  },
  {
    id: 'cat_car',
    label: 'Viaggi',
    widgetEmoji: '🚗',
    accentColor: '#94A3B8',
    keywords: /auto|macchin|benzin|tagliand|gomme|tren|aereo|bigliett|parchegg|assicuraz|viagg|partir/i,
  },
  {
    id: 'cat_gift',
    label: 'Regali',
    widgetEmoji: '🎁',
    accentColor: '#FB7185',
    keywords: /compleann|regal|festa|anniversar|fiori|sorpres/i,
  },
  {
    id: 'cat_sleep',
    label: 'Calma',
    widgetEmoji: '🌙',
    accentColor: '#818CF8',
    keywords: /dormir|sonn|letto|serat|relax|ripos|medit|notte|calma|poi poi/i,
  },
];

export const CAT_EMOTICON_MAP: Record<CatEmoticonId, CatEmoticonDef> =
  CAT_EMOTICON_LIBRARY.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<CatEmoticonId, CatEmoticonDef>
  );

const LEGACY_EMOJI_TO_CAT: Record<string, CatEmoticonId> = {
  '📝': 'cat_note',
  '🐱': 'cat_note',
  '😸': 'cat_happy',
  '😻': 'cat_love',
  '🐾': 'cat_love',
  '💡': 'cat_idea',
  '💳': 'cat_bills',
  '🛒': 'cat_shop',
  '📞': 'cat_call',
  '💼': 'cat_work',
  '☕': 'cat_coffee',
  '🎬': 'cat_fun',
  '✨': 'cat_fun',
  '🏃': 'cat_sport',
  '🧹': 'cat_clean',
  '🩺': 'cat_health',
  '🚗': 'cat_car',
  '🎁': 'cat_gift',
  '📌': 'cat_sleep',
  '🌙': 'cat_sleep',
};

export function isCatEmoticonId(val?: string | null): val is CatEmoticonId {
  return typeof val === 'string' && val in CAT_EMOTICON_MAP;
}

export function inferCatEmoticonId(
  text: string,
  blockHint?: TodoBlockKey
): CatEmoticonId {
  const clean = (text || '').trim();
  if (clean) {
    for (const def of CAT_EMOTICON_LIBRARY) {
      if (def.id === 'cat_note') continue;
      if (def.keywords.test(clean)) {
        return def.id;
      }
    }
  }
  if (blockHint === 'bollette') return 'cat_bills';
  if (blockHint === 'svaghi') return 'cat_fun';
  if (blockHint === 'poi_poi') return 'cat_sleep';
  return 'cat_note';
}

export function resolveCatEmoticonId(
  storedEmoji: string | undefined,
  text: string,
  blockHint?: TodoBlockKey
): CatEmoticonId {
  if (isCatEmoticonId(storedEmoji)) {
    return storedEmoji;
  }
  if (storedEmoji && storedEmoji in LEGACY_EMOJI_TO_CAT) {
    return LEGACY_EMOJI_TO_CAT[storedEmoji];
  }
  return inferCatEmoticonId(text, blockHint);
}

export function getWidgetEmojiForNote(
  storedEmoji: string | undefined,
  text: string,
  blockHint?: TodoBlockKey
): string {
  const id = resolveCatEmoticonId(storedEmoji, text, blockHint);
  return CAT_EMOTICON_MAP[id]?.widgetEmoji || '🐱';
}
