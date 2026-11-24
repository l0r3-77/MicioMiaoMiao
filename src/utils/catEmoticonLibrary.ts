import type { TodoBlockKey } from '../types/dailyTodo';

export type CatEmoticonId =
  | 'cat_note'
  | 'cat_fuel'
  | 'cat_barber'
  | 'cat_car'
  | 'cat_shower'
  | 'cat_clean'
  | 'cat_home'
  | 'cat_bills'
  | 'cat_pet'
  | 'cat_health'
  | 'cat_shop'
  | 'cat_food'
  | 'cat_coffee'
  | 'cat_call'
  | 'cat_work'
  | 'cat_book'
  | 'cat_sport'
  | 'cat_music'
  | 'cat_movie'
  | 'cat_game'
  | 'cat_gift'
  | 'cat_sun'
  | 'cat_baby'
  | 'cat_idea'
  | 'cat_fire'
  | 'cat_sleep'
  | 'cat_think'
  | 'cat_sad'
  | 'cat_love'
  | 'cat_happy';

export interface CatEmoticonDef {
  id: CatEmoticonId;
  label: string;
  accentColor: string;
  keywords: RegExp;
}

export const CAT_EMOTICON_LIBRARY: CatEmoticonDef[] = [
  {
    id: 'cat_note',
    label: 'Appunto',
    accentColor: '#C4B5FD',
    keywords: /\b(appunt|nota|ricord|scriver|elenco|lista)\b/i,
  },
  {
    id: 'cat_fuel',
    label: 'Benzina / GPL',
    accentColor: '#FB923C',
    keywords:
      /\b(benzin\w*|gpl|diesel|gasolio|metano|carburant\w*|distributore|benzinaio|riforniment\w*|pieno(\s+auto)?|pompa)\b/i,
  },
  {
    id: 'cat_barber',
    label: 'Barbiere / Capelli',
    accentColor: '#F472B6',
    keywords:
      /\b(barber\w*|barbier\w*|parrucchier\w*|tagli\w*(\s+capelli|\s+barba)?|capell\w*|barba|piega|tint\w*|rasatur\w*|shatush|balayage|acconciatur\w*)\b/i,
  },
  {
    id: 'cat_car',
    label: 'Auto & Viaggi',
    accentColor: '#60A5FA',
    keywords:
      /\b(auto|macchin\w*|meccanic\w*|gommist\w*|tagliand\w*|gomme|revisione|lavaggio\s+auto|autolavagg\w*|parchegg\w*|treno|aereo|volo|bigliett\w*|assicuraz\w*|bollo\s+auto|viagg\w*|partir\w*|autostrad\w*)\b/i,
  },
  {
    id: 'cat_shower',
    label: 'Doccia & Cura',
    accentColor: '#38BDF8',
    keywords:
      /\b(docci\w*|bagno|shampoo|balsamo|skincare|lavars\w*|lavar\w*\s+(i\s+denti|la\s+faccia|le\s+mani)|crema|denti|spazzolin\w*|viso|maschera\s+viso|depilaz\w*|unghie|estetist\w*)\b/i,
  },
  {
    id: 'cat_clean',
    label: 'Pulizie & Bucato',
    accentColor: '#2DD4BF',
    keywords:
      /\b(pulir\w*|puliz\w*|lavatr\w*|bucat\w*|panni|stender\w*|stirar\w*|riordin\w*|spazzar\w*|scopa|aspirapolver\w*|piatt\w*|lavastovigli\w*|polvere|spazzatur\w*|differenziat\w*|immondiz\w*|sistemar\w*|mocio|igienizz\w*)\b/i,
  },
  {
    id: 'cat_home',
    label: 'Casa & Pacchi',
    accentColor: '#14B8A6',
    keywords:
      /\b(casa|giardin\w*|piant\w*|innaffiar\w*|chiav\w*|riparaz\w*|idraulic\w*|elettricist\w*|caldaia|condomini\w*|pacco|pacchi|corriere|posta|poste|ufficio\s+postale|mobil\w*|ikea|ferrament\w*)\b/i,
  },
  {
    id: 'cat_bills',
    label: 'Bollette & Soldi',
    accentColor: '#FBBF24',
    keywords:
      /\b(bollett\w*|luce|enel|acqua|affitt\w*|mutuo|pagar\w*|pagament\w*|bonific\w*|fattur\w*|banc\w*|bancomat|carta(\s+di\s+credito)?|tass\w*|f24|multa|abbonament\w*|ricaric\w*|sold\w*|euro|stipend\w*|commercialist\w*|spese\s+condominiali|pos|preliev\w*)\b/i,
  },
  {
    id: 'cat_pet',
    label: 'Animali & Pet',
    accentColor: '#F472B6',
    keywords:
      /\b(gatt\w*|mici\w*|can[ei]|veterinari\w*|croccantin\w*|lettiere?|toelett\w*|guinzagli\w*|antiparassitari\w*|cibo\s+(gatto|cane))\b/i,
  },
  {
    id: 'cat_health',
    label: 'Salute & Medico',
    accentColor: '#4ADE80',
    keywords:
      /\b(medic\w*|dottor\w*|visit\w*(\s+medica|\s+specialistica)?|dentist\w*|farmac\w*|medicin\w*|analis\w*|esami\s+(del\s+sangue|clinici)|ricett\w*|salut\w*|pillol\w*|ospedal\w*|oculist\w*|terapi\w*|fisioterapi\w*|osteopat\w*|psicolog\w*|vaccin\w*|febbr\w*|raffredd\w*|tachipirin\w*)\b/i,
  },
  {
    id: 'cat_shop',
    label: 'Spesa & Acquisti',
    accentColor: '#60A5FA',
    keywords:
      /\b(spes\w*|supermercat\w*|esselunga|conad|coop|lidl|eurospin|carrefour|comprar\w*|acquist\w*|latte|pane|frutta|verdur\w*|negoz\w*|amazon|ordinar\w*|scarp\w*|vestit\w*|magli\w*|pantalon\w*|carrell\w*)\b/i,
  },
  {
    id: 'cat_food',
    label: 'Cucina & Pasti',
    accentColor: '#FB923C',
    keywords:
      /\b(cibo|cena\w*|pranz\w*|cucin\w*|ricett\w*|past\w*|pizz\w*|ristorant\w*|mangiar\w*|forn\w*|sushi|panin\w*|spesa\s+cena|apparecchi\w*|dolce|torta|gelat\w*)\b/i,
  },
  {
    id: 'cat_coffee',
    label: 'Caffè & Pausa',
    accentColor: '#F59E0B',
    keywords:
      /\b(caff[eè]\w*|tazz\w*|colazion\w*|merend\w*|paus\w*|th[eè]|t[eè]|tisan\w*|bar|cappuccin\w*|cornett\w*|aperitiv\w*|spritz|brioche)\b/i,
  },
  {
    id: 'cat_call',
    label: 'Chiamate & Chat',
    accentColor: '#38BDF8',
    keywords:
      /\b(chiamar\w*|telefon\w*|messagg\w*|whatsapp|sms|email|e-mail|mail|risponder\w*|contatt\w*|videochiamat\w*|zoom|call|sentir\w*|scriver\w*\s+a)\b/i,
  },
  {
    id: 'cat_work',
    label: 'Lavoro & Ufficio',
    accentColor: '#818CF8',
    keywords:
      /\b(lavor\w*|riunion\w*|ufficio|client\w*|document\w*|cv|curriculum|pc|computer|scrivani\w*|turno|contratt\w*|progett\w*|presentazion\w*|stamp\w*|colloqu\w*|smart\s*working)\b/i,
  },
  {
    id: 'cat_book',
    label: 'Studio & Lettura',
    accentColor: '#A78BFA',
    keywords:
      /\b(libr\w*|legger\w*|lettur\w*|stud\w*|esam\w*|cors\w*|ripas\w*|bibliotec\w*|scuol\w*|compit\w*|lezion\w*|tesi|universit\w*|diario)\b/i,
  },
  {
    id: 'cat_sport',
    label: 'Sport & Movimento',
    accentColor: '#34D399',
    keywords:
      /\b(palestr\w*|cors[ae]|correr\w*|allen\w*|sport\w*|cammin\w*|bici\w*|biciclett\w*|nuot\w*|piscin\w*|yoga|pilates|calcio|padel|tennis|stretching|pesi|workout)\b/i,
  },
  {
    id: 'cat_music',
    label: 'Musica & Audio',
    accentColor: '#C084FC',
    keywords:
      /\b(music\w*|concert\w*|canzon\w*|suonar\w*|chitarr\w*|pianofort\w*|playlist|cuffi\w*|spotify|podcast|audio\s*libro)\b/i,
  },
  {
    id: 'cat_movie',
    label: 'Film & Serie',
    accentColor: '#F472B6',
    keywords:
      /\b(film|serie\s*tv|netflix|prime\s*video|disney|cinema|teatr\w*|spettacol\w*|tv|episod\w*|documentari\w*|guardare\s+un)\b/i,
  },
  {
    id: 'cat_game',
    label: 'Giochi & Svago',
    accentColor: '#6366F1',
    keywords:
      /\b(gioc\w*|videogio\w*|playstation|ps5|switch|nintendo|xbox|partit\w*|consol\w*|svag\w*|carte|giochi\s+da\s+tavolo|uscit\w*)\b/i,
  },
  {
    id: 'cat_gift',
    label: 'Regali & Feste',
    accentColor: '#FB7185',
    keywords:
      /\b(compleann\w*|regal\w*|anniversar\w*|fior\w*|sorpres\w*|fest[ae]\w*|matrimon\w*|invit\w*|brindis\w*|party|biglietto\s+auguri)\b/i,
  },
  {
    id: 'cat_sun',
    label: 'Mare & Natura',
    accentColor: '#FBBF24',
    keywords:
      /\b(sole|mare|spiaggi\w*|parco|montagn\w*|picnic|natura|vacanz\w*|gita|terrazz\w*|passeggi\w*|aperto)\b/i,
  },
  {
    id: 'cat_baby',
    label: 'Famiglia & Casa',
    accentColor: '#FB7185',
    keywords:
      /\b(figli\w*|bimb\w*|bambin\w*|asilo|mamma|papà|papa|genitor\w*|nonn\w*|famigl\w*|nipot\w*|fratell\w*|sorell\w*)\b/i,
  },
  {
    id: 'cat_idea',
    label: 'Idee & Progetti',
    accentColor: '#FDE047',
    keywords:
      /\b(ide[ae]|pensar\w*|invent\w*|creativ\w*|ispiraz\w*|capir\w*|soluzion\w*|bozz\w*)\b/i,
  },
  {
    id: 'cat_fire',
    label: 'Urgente',
    accentColor: '#FB923C',
    keywords:
      /\b(urgent\w*|subito|important\w*|priorit\w*|emergenz\w*|scadenz\w*|assolutament\w*)\b/i,
  },
  {
    id: 'cat_sleep',
    label: 'Riposo & Notte',
    accentColor: '#818CF8',
    keywords:
      /\b(dormir\w*|sonn\w*|letto|pisolin\w*|serat\w*|relax|ripos\w*|medit\w*|notte|calma|poi\s+poi|divano|pigiam\w*)\b/i,
  },
  {
    id: 'cat_think',
    label: 'Controllo & Dubbi',
    accentColor: '#818CF8',
    keywords:
      /\b(dubbi\w*|forse|valut\w*|sceglier\w*|domand\w*|chiss\w*|controll\w*|verific\w*|decider\w*|cercar\w*)\b/i,
  },
  {
    id: 'cat_sad',
    label: 'Cura & Comfort',
    accentColor: '#60A5FA',
    keywords:
      /\b(trist\w*|stanc\w*|stress\w*|giù|arrabb\w*|nervos\w*|sfog\w*|pazienz\w*|recuper\w*|calo)\b/i,
  },
  {
    id: 'cat_love',
    label: 'Affetto & Cuore',
    accentColor: '#F472B6',
    keywords:
      /\b(amor\w*|cuor\w*|baci\w*|abbracc\w*|tesor\w*|dolc\w*|coccol\w*|affett\w*|grazie)\b/i,
  },
  {
    id: 'cat_happy',
    label: 'Felice & Top',
    accentColor: '#FACC15',
    keywords:
      /\b(felic\w*|content\w*|bell\w*|sorris\w*|evviva|brav\w*|success\w*|gioi\w*|super|top|fantast\w*|ok)\b/i,
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
  // Previous cat_ IDs that were merged or renamed
  cat_lol: 'cat_happy',
  cat_kiss: 'cat_love',
  cat_wink: 'cat_happy',
  cat_cool: 'cat_sun',
  cat_star: 'cat_happy',
  cat_party: 'cat_gift',
  cat_wow: 'cat_idea',
  cat_angry: 'cat_fire',
  cat_sick: 'cat_health',
  cat_hug: 'cat_love',
  cat_fun: 'cat_music',
  // Legacy Unicode emoji values
  '📝': 'cat_note',
  '🐱': 'cat_note',
  '😸': 'cat_happy',
  '😂': 'cat_happy',
  '😹': 'cat_happy',
  '😻': 'cat_love',
  '😍': 'cat_love',
  '😽': 'cat_love',
  '😘': 'cat_love',
  '😉': 'cat_happy',
  '😼': 'cat_happy',
  '😎': 'cat_sun',
  '🤩': 'cat_happy',
  '🥳': 'cat_gift',
  '🤔': 'cat_think',
  '😮': 'cat_idea',
  '😢': 'cat_sad',
  '😿': 'cat_sad',
  '😠': 'cat_fire',
  '😾': 'cat_fire',
  '😴': 'cat_sleep',
  '🌙': 'cat_sleep',
  '📌': 'cat_sleep',
  '🤒': 'cat_health',
  '🤗': 'cat_love',
  '🐾': 'cat_pet',
  '💡': 'cat_idea',
  '🔥': 'cat_fire',
  '💳': 'cat_bills',
  '🛒': 'cat_shop',
  '🍽️': 'cat_food',
  '☕': 'cat_coffee',
  '📞': 'cat_call',
  '💼': 'cat_work',
  '📖': 'cat_book',
  '🎵': 'cat_music',
  '✨': 'cat_happy',
  '🎬': 'cat_movie',
  '🎮': 'cat_game',
  '🏃': 'cat_sport',
  '🚿': 'cat_shower',
  '🧹': 'cat_clean',
  '🩺': 'cat_health',
  '🚗': 'cat_car',
  '⛽': 'cat_fuel',
  '✂️': 'cat_barber',
  '🏠': 'cat_home',
  '🎁': 'cat_gift',
  '☀️': 'cat_sun',
};

const INFERENCE_PRIORITY_ORDER: CatEmoticonId[] = [
  'cat_fuel',
  'cat_barber',
  'cat_shower',
  'cat_health',
  'cat_bills',
  'cat_pet',
  'cat_car',
  'cat_clean',
  'cat_food',
  'cat_coffee',
  'cat_shop',
  'cat_call',
  'cat_work',
  'cat_book',
  'cat_sport',
  'cat_music',
  'cat_movie',
  'cat_game',
  'cat_gift',
  'cat_home',
  'cat_sun',
  'cat_baby',
  'cat_fire',
  'cat_sleep',
  'cat_idea',
  'cat_think',
  'cat_sad',
  'cat_love',
  'cat_happy',
];

export function isCatEmoticonId(val?: string | null): val is CatEmoticonId {
  return typeof val === 'string' && val in CAT_EMOTICON_MAP;
}

export function inferCatEmoticonId(
  text: string,
  blockHint?: TodoBlockKey
): CatEmoticonId {
  const clean = (text || '').trim();
  if (clean) {
    for (const id of INFERENCE_PRIORITY_ORDER) {
      if (CAT_EMOTICON_MAP[id].keywords.test(clean)) {
        return id;
      }
    }
  }
  if (blockHint === 'bollette') return 'cat_bills';
  if (blockHint === 'svaghi') return 'cat_game';
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
