import type { TodoBlockKey } from '../types/dailyTodo';

export type CatEmoticonId =
  | 'cat_note'
  | 'cat_fuel'
  | 'cat_barber'
  | 'cat_car'
  | 'cat_train'
  | 'cat_plane'
  | 'cat_shower'
  | 'cat_clean'
  | 'cat_laundry'
  | 'cat_trash'
  | 'cat_home'
  | 'cat_repair'
  | 'cat_garden'
  | 'cat_package'
  | 'cat_bills'
  | 'cat_bank'
  | 'cat_pet'
  | 'cat_health'
  | 'cat_pharmacy'
  | 'cat_dentist'
  | 'cat_shop'
  | 'cat_food'
  | 'cat_pizza'
  | 'cat_coffee'
  | 'cat_drink'
  | 'cat_call'
  | 'cat_email'
  | 'cat_work'
  | 'cat_computer'
  | 'cat_book'
  | 'cat_sport'
  | 'cat_bike'
  | 'cat_music'
  | 'cat_movie'
  | 'cat_game'
  | 'cat_camera'
  | 'cat_gift'
  | 'cat_clothes'
  | 'cat_sun'
  | 'cat_mountain'
  | 'cat_baby'
  | 'cat_keys'
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
    keywords: /\b(appunt|nota|ricord|scriver|elenco|lista|memo)\b/i,
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
      /\b(barber\w*|barbier\w*|parrucchier\w*|tagli\w*(\s+capelli|\s+barba)?|capell\w*|barba|piega|tint\w*|rasatur\w*|shatush|balayage|acconciatur\w*|forbic\w*)\b/i,
  },
  {
    id: 'cat_car',
    label: 'Auto & Meccanico',
    accentColor: '#60A5FA',
    keywords:
      /\b(auto|macchin\w*|meccanic\w*|gommist\w*|tagliand\w*|gomme|revisione|lavaggio\s+auto|autolavagg\w*|parchegg\w*|assicuraz\w*|bollo\s+auto|autostrad\w*|guidar\w*)\b/i,
  },
  {
    id: 'cat_train',
    label: 'Treno & Metro',
    accentColor: '#38BDF8',
    keywords:
      /\b(treno|treni|stazion\w*|metro|metropolitan\w*|bus|autobus|tram|pullman|frecciarossa|italo|pendolar\w*)\b/i,
  },
  {
    id: 'cat_plane',
    label: 'Volo & Viaggi',
    accentColor: '#0EA5E9',
    keywords:
      /\b(aere\w*|volo|voli|aeroport\w*|imbarc\w*|valigi\w*|viagg\w*|passaport\w*|check-?in|hotel|b&b|partir\w*|bigliett\w*)\b/i,
  },
  {
    id: 'cat_shower',
    label: 'Doccia & Cura',
    accentColor: '#38BDF8',
    keywords:
      /\b(docci\w*|bagno|shampoo|balsamo|skincare|lavars\w*|lavar\w*\s+(la\s+faccia|le\s+mani)|crema|sapone|viso|maschera\s+viso|depilaz\w*|unghie|estetist\w*|barba\s+doccia)\b/i,
  },
  {
    id: 'cat_clean',
    label: 'Pulizie & Casa',
    accentColor: '#2DD4BF',
    keywords:
      /\b(pulir\w*|puliz\w*|riordin\w*|spazzar\w*|scopa|aspirapolver\w*|piatt\w*|lavastovigli\w*|polvere|sistemar\w*|mocio|igienizz\w*|vetri|paviment\w*)\b/i,
  },
  {
    id: 'cat_laundry',
    label: 'Bucato & Lavatrice',
    accentColor: '#22D3EE',
    keywords:
      /\b(lavatr\w*|bucat\w*|panni|stender\w*|stirar\w*|asciugatric\w*|detersiv\w*|ammorbident\w*|ferro\s+da\s+stiro)\b/i,
  },
  {
    id: 'cat_trash',
    label: 'Spazzatura & Riciclo',
    accentColor: '#4ADE80',
    keywords:
      /\b(spazzatur\w*|differenziat\w*|immondiz\w*|rifiut\w*|organico|umido|plastica|carta\s+vetro|bidon\w*|buttar\w*\s+(la\s+)?spazzatura|sacchett\w*)\b/i,
  },
  {
    id: 'cat_home',
    label: 'Casa',
    accentColor: '#14B8A6',
    keywords:
      /\b(casa|condomini\w*|mobil\w*|ikea|camera|salotto|cucina\s+mobili|trasloc\w*|stanz\w*|affittare)\b/i,
  },
  {
    id: 'cat_repair',
    label: 'Attrezzi & Riparazioni',
    accentColor: '#F59E0B',
    keywords:
      /\b(riparaz\w*|aggiustar\w*|idraulic\w*|elettricist\w*|caldaia|ferrament\w*|trapan\w*|martell\w*|cacciavit\w*|bricolage|montar\w*|lavori\s+casa|tecnico)\b/i,
  },
  {
    id: 'cat_garden',
    label: 'Piante & Giardino',
    accentColor: '#22C55E',
    keywords:
      /\b(giardin\w*|piant\w*|innaffiar\w*|fior\w*|prato|tagliare\s+erba|orto|potar\w*|balcone\s+piante|terriccio|vaso)\b/i,
  },
  {
    id: 'cat_package',
    label: 'Pacchi & Posta',
    accentColor: '#D97706',
    keywords:
      /\b(pacco|pacchi|corriere|posta|poste|ufficio\s+postale|spedizion\w*|consegn\w*|ritirar\w*\s+(il\s+)?pacco|amazon|vinted|reso|raccomandat\w*)\b/i,
  },
  {
    id: 'cat_bills',
    label: 'Bollette & Scadenze',
    accentColor: '#FBBF24',
    keywords:
      /\b(bollett\w*|luce|enel|acqua|gas\s+casa|affitt\w*|mutuo|fattur\w*|tass\w*|f24|multa|abbonament\w*|spese\s+condominiali|commercialist\w*)\b/i,
  },
  {
    id: 'cat_bank',
    label: 'Banca & Soldi',
    accentColor: '#10B981',
    keywords:
      /\b(banc\w*|bancomat|carta(\s+di\s+credito)?|pagar\w*|pagament\w*|bonific\w*|ricaric\w*|sold\w*|euro|stipend\w*|pos|preliev\w*|portafogli|conto|paypal|satispay)\b/i,
  },
  {
    id: 'cat_pet',
    label: 'Animali & Pet',
    accentColor: '#F472B6',
    keywords:
      /\b(gatt\w*|mici\w*|can[ei]|veterinari\w*|croccantin\w*|lettiere?|toelett\w*|guinzagli\w*|antiparassitari\w*|cibo\s+(gatto|cane)|zamp\w*|passeggiata\s+cane)\b/i,
  },
  {
    id: 'cat_health',
    label: 'Medico & Salute',
    accentColor: '#4ADE80',
    keywords:
      /\b(medic\w*|dottor\w*|visit\w*(\s+medica|\s+specialistica)?|analis\w*|esami\s+(del\s+sangue|clinici)|salut\w*|ospedal\w*|oculist\w*|terapi\w*|fisioterapi\w*|osteopat\w*|psicolog\w*|vaccin\w*|pressione)\b/i,
  },
  {
    id: 'cat_pharmacy',
    label: 'Farmacia & Medicine',
    accentColor: '#EF4444',
    keywords:
      /\b(farmac\w*|medicin\w*|pillol\w*|ricett\w*(\s+medica)?|tachipirin\w*|ibuprofen\w*|sciropp\w*|cerott\w*|antibiotic\w*|integrator\w*|vitamine)\b/i,
  },
  {
    id: 'cat_dentist',
    label: 'Dentista & Denti',
    accentColor: '#67E8F9',
    keywords:
      /\b(dentist\w*|denti|spazzolin\w*|igiene\s+dentale|carie|apparecchio\s+denti|pulizia\s+denti|ortodonz\w*|filo\s+interdentale)\b/i,
  },
  {
    id: 'cat_shop',
    label: 'Spesa & Carrello',
    accentColor: '#60A5FA',
    keywords:
      /\b(spes\w*|supermercat\w*|esselunga|conad|coop|lidl|eurospin|carrefour|comprar\w*|acquist\w*|latte|pane|frutta|verdur\w*|negoz\w*|ordinar\w*|carrell\w*|alimentari)\b/i,
  },
  {
    id: 'cat_food',
    label: 'Cucina & Pasti',
    accentColor: '#FB923C',
    keywords:
      /\b(cibo|cena\w*|pranz\w*|cucin\w*|ricett\w*|past\w*|ristorant\w*|mangiar\w*|forn\w*|sushi|apparecchi\w*|dolce|torta|gelat\w*|preparar\w*\s+da\s+mangiare)\b/i,
  },
  {
    id: 'cat_pizza',
    label: 'Pizza & Takeaway',
    accentColor: '#F97316',
    keywords:
      /\b(pizz\w*|pizzeri\w*|hamburger|burger|kebab|panin\w*|patatine|glovo|deliveroo|just\s*eat|take\s*away|asporto)\b/i,
  },
  {
    id: 'cat_coffee',
    label: 'Caffè & Colazione',
    accentColor: '#F59E0B',
    keywords:
      /\b(caff[eè]\w*|tazz\w*|colazion\w*|merend\w*|paus\w*|th[eè]|t[eè]|tisan\w*|cappuccin\w*|cornett\w*|brioche|moka)\b/i,
  },
  {
    id: 'cat_drink',
    label: 'Aperitivo & Drink',
    accentColor: '#EC4899',
    keywords:
      /\b(aperitiv\w*|spritz|birr\w*|vino|cocktail|bere|drink|brindis\w*|pub|enotec\w*|locale)\b/i,
  },
  {
    id: 'cat_call',
    label: 'Chiamate & Telefono',
    accentColor: '#38BDF8',
    keywords:
      /\b(chiamar\w*|telefon\w*|whatsapp|sms|risponder\w*|contatt\w*|videochiamat\w*|zoom|call|sentir\w*|messagg\w*)\b/i,
  },
  {
    id: 'cat_email',
    label: 'Email & Scrivere',
    accentColor: '#6366F1',
    keywords:
      /\b(email|e-mail|mail|pec|inviar\w*(\s+la)?\s+mail|letter\w*|newsletter|posta\s+elettronica|scriver\w*\s+a)\b/i,
  },
  {
    id: 'cat_work',
    label: 'Lavoro & Ufficio',
    accentColor: '#818CF8',
    keywords:
      /\b(lavor\w*|riunion\w*|ufficio|client\w*|document\w*|cv|curriculum|scrivani\w*|turno|contratt\w*|progett\w*|presentazion\w*|colloqu\w*|smart\s*working|busta\s+paga)\b/i,
  },
  {
    id: 'cat_computer',
    label: 'PC & Tech',
    accentColor: '#3B82F6',
    keywords:
      /\b(pc|computer|portatil\w*|laptop|stamp\w*|backup|aggiornar\w*|app|software|sito|codice|password|wifi|stampant\w*|caricator\w*|tablet|iphone|smartphone)\b/i,
  },
  {
    id: 'cat_book',
    label: 'Studio & Libri',
    accentColor: '#A78BFA',
    keywords:
      /\b(libr\w*|legger\w*|lettur\w*|stud\w*|esam\w*|cors\w*|ripas\w*|bibliotec\w*|scuol\w*|compit\w*|lezion\w*|tesi|universit\w*|diario)\b/i,
  },
  {
    id: 'cat_sport',
    label: 'Palestra & Fitness',
    accentColor: '#34D399',
    keywords:
      /\b(palestr\w*|cors[ae]|correr\w*|allen\w*|sport\w*|cammin\w*|nuot\w*|piscin\w*|yoga|pilates|calcio|padel|tennis|stretching|pesi|workout|crossfit)\b/i,
  },
  {
    id: 'cat_bike',
    label: 'Bici & Mobilità',
    accentColor: '#10B981',
    keywords:
      /\b(bici|biciclett\w*|ciclism\w*|monopattin\w*|scooter|moto|casco|pedal\w*)\b/i,
  },
  {
    id: 'cat_music',
    label: 'Musica & Cuffie',
    accentColor: '#C084FC',
    keywords:
      /\b(music\w*|concert\w*|canzon\w*|suonar\w*|chitarr\w*|pianofort\w*|playlist|cuffi\w*|spotify|podcast|audio\s*libro|cassa\s+audio)\b/i,
  },
  {
    id: 'cat_movie',
    label: 'Film & Cinema',
    accentColor: '#F472B6',
    keywords:
      /\b(film|serie\s*tv|netflix|prime\s*video|disney|cinema|teatr\w*|spettacol\w*|tv|episod\w*|documentari\w*|guardare\s+un)\b/i,
  },
  {
    id: 'cat_game',
    label: 'Gaming & Svago',
    accentColor: '#6366F1',
    keywords:
      /\b(gioc\w*|videogio\w*|playstation|ps5|switch|nintendo|xbox|partit\w*|consol\w*|svag\w*|carte|giochi\s+da\s+tavolo|uscit\w*)\b/i,
  },
  {
    id: 'cat_camera',
    label: 'Foto & Video',
    accentColor: '#8B5CF6',
    keywords:
      /\b(foto\w*|fotocamer\w*|video|filmar\w*|selfie|album\s+foto|scatt\w*|reel|instagram)\b/i,
  },
  {
    id: 'cat_gift',
    label: 'Regali & Feste',
    accentColor: '#FB7185',
    keywords:
      /\b(compleann\w*|regal\w*|anniversar\w*|sorpres\w*|fest[ae]\w*|matrimon\w*|invit\w*|party|biglietto\s+auguri|natale)\b/i,
  },
  {
    id: 'cat_clothes',
    label: 'Vestiti & Cambio',
    accentColor: '#E879F9',
    keywords:
      /\b(vestit\w*|scarp\w*|magli\w*|pantalon\w*|giacc\w*|cappott\w*|camici\w*|armadio|guardarob\w*|zain\w*|borsa|sart\w*|cintur\w*)\b/i,
  },
  {
    id: 'cat_sun',
    label: 'Mare & Sole',
    accentColor: '#FBBF24',
    keywords:
      /\b(sole|mare|spiaggi\w*|parco|picnic|vacanz\w*|terrazz\w*|passeggi\w*|aperto|costume|ombrellon\w*)\b/i,
  },
  {
    id: 'cat_mountain',
    label: 'Montagna & Natura',
    accentColor: '#16A34A',
    keywords:
      /\b(montagn\w*|trekking|escursion\w*|sentier\w*|campegg\w*|tend\w*|bosco|natura|camminata\s+montagna|sci|rifugi\w*)\b/i,
  },
  {
    id: 'cat_baby',
    label: 'Famiglia & Casa',
    accentColor: '#FB7185',
    keywords:
      /\b(figli\w*|bimb\w*|bambin\w*|asilo|mamma|papà|papa|genitor\w*|nonn\w*|famigl\w*|nipot\w*|fratell\w*|sorell\w*)\b/i,
  },
  {
    id: 'cat_keys',
    label: 'Chiavi & Sicurezza',
    accentColor: '#EAB308',
    keywords:
      /\b(chiav\w*|serratur\w*|lucchett\w*|duplicat\w*\s+chiav|cancello|telecomando|porta|chiuder\w*)\b/i,
  },
  {
    id: 'cat_idea',
    label: 'Idee & Lampadina',
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
    label: 'Controllo & Ricerca',
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
      /\b(amor\w*|cuor\w*|baci\w*|abbracc\w*|tesor\w*|dolc\w*|coccol\w*|grazie)\b/i,
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
  '💳': 'cat_bank',
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
  'cat_package',
  'cat_laundry',
  'cat_trash',
  'cat_pharmacy',
  'cat_dentist',
  'cat_repair',
  'cat_garden',
  'cat_train',
  'cat_plane',
  'cat_keys',
  'cat_clothes',
  'cat_bank',
  'cat_bills',
  'cat_pizza',
  'cat_drink',
  'cat_coffee',
  'cat_food',
  'cat_shower',
  'cat_health',
  'cat_pet',
  'cat_car',
  'cat_clean',
  'cat_shop',
  'cat_email',
  'cat_call',
  'cat_computer',
  'cat_work',
  'cat_book',
  'cat_bike',
  'cat_sport',
  'cat_camera',
  'cat_music',
  'cat_movie',
  'cat_game',
  'cat_gift',
  'cat_mountain',
  'cat_sun',
  'cat_baby',
  'cat_home',
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
