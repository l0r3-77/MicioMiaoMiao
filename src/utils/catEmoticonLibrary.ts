import type { TodoBlockKey } from '../types/dailyTodo';

export type CatEmoticonId =
  | 'cat_note'
  | 'cat_happy'
  | 'cat_lol'
  | 'cat_love'
  | 'cat_kiss'
  | 'cat_wink'
  | 'cat_cool'
  | 'cat_star'
  | 'cat_party'
  | 'cat_think'
  | 'cat_wow'
  | 'cat_sad'
  | 'cat_angry'
  | 'cat_sleep'
  | 'cat_sick'
  | 'cat_hug'
  | 'cat_idea'
  | 'cat_fire'
  | 'cat_bills'
  | 'cat_shop'
  | 'cat_food'
  | 'cat_coffee'
  | 'cat_call'
  | 'cat_work'
  | 'cat_book'
  | 'cat_fun'
  | 'cat_movie'
  | 'cat_game'
  | 'cat_sport'
  | 'cat_clean'
  | 'cat_shower'
  | 'cat_health'
  | 'cat_car'
  | 'cat_home'
  | 'cat_gift'
  | 'cat_sun';

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
    label: 'Sorriso',
    widgetEmoji: '😸',
    accentColor: '#FCD34D',
    keywords: /felic|content|bello|sorris|allegri/i,
  },
  {
    id: 'cat_lol',
    label: 'Risata',
    widgetEmoji: '😹',
    accentColor: '#FDE047',
    keywords: /rider|risat|battut|divertent|buff|comic/i,
  },
  {
    id: 'cat_love',
    label: 'Cuori',
    widgetEmoji: '😻',
    accentColor: '#F9A8D4',
    keywords: /amor|cuor|innamor|tesor|mici|gatto|cane|pelos/i,
  },
  {
    id: 'cat_kiss',
    label: 'Bacio',
    widgetEmoji: '😽',
    accentColor: '#F472B6',
    keywords: /baci|coccol|tenerez|dolc|carin/i,
  },
  {
    id: 'cat_wink',
    label: 'Occhiolino',
    widgetEmoji: '😼',
    accentColor: '#FBBF24',
    keywords: /occhiolin|furbo|complice|segret|ok/i,
  },
  {
    id: 'cat_cool',
    label: 'Cool',
    widgetEmoji: '😎',
    accentColor: '#38BDF8',
    keywords: /figo|cool|top|grande|stile|occhiali|vacanz/i,
  },
  {
    id: 'cat_star',
    label: 'Super',
    widgetEmoji: '🤩',
    accentColor: '#FACC15',
    keywords: /stell|super|fantast|meravigl|evviva|brav|success/i,
  },
  {
    id: 'cat_party',
    label: 'Festa',
    widgetEmoji: '🥳',
    accentColor: '#A855F7',
    keywords: /fest|brindis|celebr|party|capodann|laure/i,
  },
  {
    id: 'cat_think',
    label: 'Dubbio',
    widgetEmoji: '🤔',
    accentColor: '#818CF8',
    keywords: /dubbi|forse|valut|sceglier|domand|chiss/i,
  },
  {
    id: 'cat_wow',
    label: 'Sorpresa',
    widgetEmoji: '😮',
    accentColor: '#F59E0B',
    keywords: /sorpres|incredibil|stupor|wow|novit/i,
  },
  {
    id: 'cat_sad',
    label: 'Triste',
    widgetEmoji: '😿',
    accentColor: '#60A5FA',
    keywords: /trist|piang|malincon|giù|delus|dispiac/i,
  },
  {
    id: 'cat_angry',
    label: 'Arrabbiato',
    widgetEmoji: '😾',
    accentColor: '#F87171',
    keywords: /rabb|arrabb|nervos|seccat|basta|stress|litig/i,
  },
  {
    id: 'cat_sleep',
    label: 'Sonno',
    widgetEmoji: '😴',
    accentColor: '#6366F1',
    keywords: /dormir|sonn|letto|serat|relax|ripos|medit|notte|calma|poi poi|pisolin/i,
  },
  {
    id: 'cat_sick',
    label: 'Malessere',
    widgetEmoji: '🤒',
    accentColor: '#34D399',
    keywords: /febbr|raffredd|mal di|influencer|influenz|stanco|male|dolor/i,
  },
  {
    id: 'cat_hug',
    label: 'Abbraccio',
    widgetEmoji: '🤗',
    accentColor: '#FB7185',
    keywords: /abbracc|amic|mam|pap|famigl|insiem|grazie/i,
  },
  {
    id: 'cat_idea',
    label: 'Idea',
    widgetEmoji: '💡',
    accentColor: '#FDE047',
    keywords: /ide|pensar|progett|creativ|invent|capir/i,
  },
  {
    id: 'cat_fire',
    label: 'Urgente',
    widgetEmoji: '🔥',
    accentColor: '#FB923C',
    keywords: /urgent|subito|import|priorit|fuoc|caric|scadenz/i,
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
    keywords: /spes|supermercat|comprar|comprare|latte|pane|frutta|verdura|negozi|ordinar/i,
  },
  {
    id: 'cat_food',
    label: 'Cucina',
    widgetEmoji: '🍽️',
    accentColor: '#F97316',
    keywords: /cibo|cena|pranzo|cucin|ricett|pasta|pizza|mangi|forno|apparecchi/i,
  },
  {
    id: 'cat_coffee',
    label: 'Pausa',
    widgetEmoji: '☕',
    accentColor: '#FDBA74',
    keywords: /caff|tazz|colazion|merend|paus|thè|te |tisana|bar/i,
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
    keywords: /lavor|riunion|ufficio|client|document|cv|pc|computer|scrivani|progett/i,
  },
  {
    id: 'cat_book',
    label: 'Lettura',
    widgetEmoji: '📖',
    accentColor: '#8B5CF6',
    keywords: /libr|legger|stud|esam|corso|pagin|diario|ripas/i,
  },
  {
    id: 'cat_fun',
    label: 'Musica',
    widgetEmoji: '🎵',
    accentColor: '#C084FC',
    keywords: /music|concert|canzon|chitar|piano|playlist|aperitiv|uscit|svago/i,
  },
  {
    id: 'cat_movie',
    label: 'Film & TV',
    widgetEmoji: '🎬',
    accentColor: '#EC4899',
    keywords: /film|serie|netflix|cinema|teatro|episod|guard/i,
  },
  {
    id: 'cat_game',
    label: 'Giochi',
    widgetEmoji: '🎮',
    accentColor: '#6366F1',
    keywords: /gioco|giocar|videogio|play|nintendo|console|partita/i,
  },
  {
    id: 'cat_sport',
    label: 'Sport',
    widgetEmoji: '🏃',
    accentColor: '#34D399',
    keywords: /palestr|corsa|correr|allen|sport|cammin|bici|nuot|yoga|pilates/i,
  },
  {
    id: 'cat_shower',
    label: 'Doccia',
    widgetEmoji: '🚿',
    accentColor: '#38BDF8',
    keywords: /docci|bagno|shampoo|lavarsi|capell|skincare|barba/i,
  },
  {
    id: 'cat_clean',
    label: 'Pulizie',
    widgetEmoji: '🧹',
    accentColor: '#67E8F9',
    keywords: /pulir|lavar|bucato|lavatric|stirar|riordin|spazzat|piatt|sistemar|aspirap/i,
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
    id: 'cat_home',
    label: 'Casa',
    widgetEmoji: '🏠',
    accentColor: '#14B8A6',
    keywords: /casa|giardin|piant|chiav|riparaz|idraulic|condomini/i,
  },
  {
    id: 'cat_gift',
    label: 'Regali',
    widgetEmoji: '🎁',
    accentColor: '#FB7185',
    keywords: /compleann|regal|anniversar|fiori|sorpres/i,
  },
  {
    id: 'cat_sun',
    label: 'Sole',
    widgetEmoji: '☀️',
    accentColor: '#FBBF24',
    keywords: /sole|mare|parco|passeggiat|natura|montagn|spiaggi|aria aperta/i,
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
  '😂': 'cat_lol',
  '😹': 'cat_lol',
  '😻': 'cat_love',
  '😍': 'cat_love',
  '😽': 'cat_kiss',
  '😘': 'cat_kiss',
  '😉': 'cat_wink',
  '😼': 'cat_wink',
  '😎': 'cat_cool',
  '🤩': 'cat_star',
  '🥳': 'cat_party',
  '🤔': 'cat_think',
  '😮': 'cat_wow',
  '😢': 'cat_sad',
  '😿': 'cat_sad',
  '😠': 'cat_angry',
  '😾': 'cat_angry',
  '😴': 'cat_sleep',
  '🌙': 'cat_sleep',
  '📌': 'cat_sleep',
  '🤒': 'cat_sick',
  '🤗': 'cat_hug',
  '🐾': 'cat_love',
  '💡': 'cat_idea',
  '🔥': 'cat_fire',
  '💳': 'cat_bills',
  '🛒': 'cat_shop',
  '🍽️': 'cat_food',
  '☕': 'cat_coffee',
  '📞': 'cat_call',
  '💼': 'cat_work',
  '📖': 'cat_book',
  '🎵': 'cat_fun',
  '✨': 'cat_fun',
  '🎬': 'cat_movie',
  '🎮': 'cat_game',
  '🏃': 'cat_sport',
  '🚿': 'cat_shower',
  '🧹': 'cat_clean',
  '🩺': 'cat_health',
  '🚗': 'cat_car',
  '🏠': 'cat_home',
  '🎁': 'cat_gift',
  '☀️': 'cat_sun',
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
    // Check shower/bathroom explicitly before general cleaning keywords
    if (CAT_EMOTICON_MAP.cat_shower.keywords.test(clean)) {
      return 'cat_shower';
    }
    for (const def of CAT_EMOTICON_LIBRARY) {
      if (def.id === 'cat_note' || def.id === 'cat_shower') continue;
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
