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
  | 'cat_cook'
  | 'cat_pizza'
  | 'cat_coffee'
  | 'cat_water'
  | 'cat_drink'
  | 'cat_call'
  | 'cat_email'
  | 'cat_work'
  | 'cat_paperwork'
  | 'cat_computer'
  | 'cat_battery'
  | 'cat_book'
  | 'cat_sport'
  | 'cat_meditate'
  | 'cat_bike'
  | 'cat_music'
  | 'cat_movie'
  | 'cat_game'
  | 'cat_camera'
  | 'cat_gift'
  | 'cat_clothes'
  | 'cat_bag'
  | 'cat_shoes'
  | 'cat_glasses'
  | 'cat_clock'
  | 'cat_bed'
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
    id: 'cat_laundry',
    label: 'Lavatrice & Bucato',
    accentColor: '#22D3EE',
    keywords:
      /\b(lavatric\w*|asciugatric\w*|bucat\w*|panni|stend\w*|stirar\w*|stiro|detersiv\w*|ammorbident\w*|ferro\s+da\s+stiro|lavanderi\w*|centrifug\w*)\b/i,
  },
  {
    id: 'cat_clean',
    label: 'Pulizie & Riordino',
    accentColor: '#2DD4BF',
    keywords:
      /\b(pulisc\w*|pulir\w*|puliz\w*|pulit\w*|spolver\w*|riordin\w*|spazzar\w*|spazzo\w*|scopa\w*|aspirapolver\w*|piatt\w*|lavastovigli\w*|polvere|sistemar\w*|mocio|igienizz\w*|sanific\w*|vetri|paviment\w*|sgrass\w*)\b/i,
  },
  {
    id: 'cat_bag',
    label: 'Borsa & Zaino',
    accentColor: '#F472B6',
    keywords:
      /\b(bors[ae]|borsett\w*|zain\w*|tracoll\w*|marsupio|sacca(\s+palestra)?|valigett\w*|tote|trolley)\b/i,
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
      /\b(auto|macchin\w*|meccanic\w*|gommist\w*|tagliand\w*|gomme|revisione|lavaggio\s+auto|lavar\w*\s+(l['’]?\s*)?(auto|macchina)|autolavagg\w*|parchegg\w*|assicuraz\w*|bollo\s+auto|autostrad\w*|guidar\w*)\b/i,
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
      /\b(aere\w*|volo|voli|aeroport\w*|imbarc\w*|valigi\w*|viagg\w*|check-?in|hotel|b&b|partir\w*|bigliett\w*)\b/i,
  },
  {
    id: 'cat_shower',
    label: 'Doccia & Cura',
    accentColor: '#38BDF8',
    keywords:
      /\b(docci\w*|shampoo|balsamo|skincare|lavars\w*|lavar\w*\s+(la\s+faccia|le\s+mani)|crema|sapone|viso|maschera\s+viso|depilaz\w*|unghie|estetist\w*|barba\s+doccia|bagnoschiuma)\b/i,
  },
  {
    id: 'cat_trash',
    label: 'Spazzatura & Riciclo',
    accentColor: '#4ADE80',
    keywords:
      /\b(spazzatur\w*|differenziat\w*|immondiz\w*|rifiut\w*|organico|umido|plastica|carta\s+vetro|bidon\w*|buttar\w*\s+(la\s+)?spazzatura|sacchett\w*)\b/i,
  },
  {
    id: 'cat_bed',
    label: 'Letto & Lenzuola',
    accentColor: '#818CF8',
    keywords:
      /\b(lenzuol\w*|rifar\w*\s+(il\s+)?letto|fedor\w*|copripiumin\w*|materass\w*|cuscin\w*|cambi\w*\s+(le\s+)?lenzuola)\b/i,
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
      /\b(ripar\w*|aggiust\w*|idraulic\w*|elettricist\w*|caldaia|ferrament\w*|trapan\w*|martell\w*|cacciavit\w*|bricolage|montar\w*|lavori\s+casa|tecnico|lampadin\w*)\b/i,
  },
  {
    id: 'cat_garden',
    label: 'Piante & Giardino',
    accentColor: '#22C55E',
    keywords:
      /\b(giardin\w*|piant\w*|innaffi\w*|fior\w*|prato|tagliare\s+erba|orto|potar\w*|balcone\s+piante|terriccio|vaso|vasi)\b/i,
  },
  {
    id: 'cat_package',
    label: 'Pacchi & Posta',
    accentColor: '#D97706',
    keywords:
      /\b(pacco|pacchi|corriere|posta|poste|ufficio\s+postale|spedizion\w*|consegn\w*|ritirar\w*\s+(il\s+)?pacco|amazon|vinted|reso|raccomandat\w*)\b/i,
  },
  {
    id: 'cat_paperwork',
    label: 'Documenti & Pratiche',
    accentColor: '#64748B',
    keywords:
      /\b(document\w*|patente|passaport\w*|carta\s+d['’]identit[aà]|anagrafe|comune|modulo|moduli|pratic[ae]|certificat\w*|spid|cie|firma|firmar\w*)\b/i,
  },
  {
    id: 'cat_bills',
    label: 'Bollette & Scadenze',
    accentColor: '#FBBF24',
    keywords:
      /\b(bollett\w*|luce|enel|acqua\s+bolletta|gas\s+casa|affitt\w*|mutuo|fattur\w*|tass\w*|f24|multa|abbonament\w*|spese\s+condominiali|commercialist\w*)\b/i,
  },
  {
    id: 'cat_bank',
    label: 'Banca & Soldi',
    accentColor: '#10B981',
    keywords:
      /\b(banc\w*|bancomat|carta(\s+di\s+credito)?|pagar\w*|pagament\w*|bonific\w*|ricaric\w*\s+(carta|conto)|sold\w*|euro|stipend\w*|pos|preliev\w*|portafogli|conto|paypal|satispay)\b/i,
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
      /\b(dentist\w*|denti|spazzolin\w*|lavar\w*\s+i\s+denti|igiene\s+dentale|carie|apparecchio\s+denti|pulizia\s+denti|ortodonz\w*|filo\s+interdentale)\b/i,
  },
  {
    id: 'cat_glasses',
    label: 'Occhiali & Vista',
    accentColor: '#38BDF8',
    keywords: /\b(occhial\w*|lenti(\s+a\s+contatto)?|ottico|colliri\w*|pulire\s+occhiali)\b/i,
  },
  {
    id: 'cat_shop',
    label: 'Spesa & Carrello',
    accentColor: '#60A5FA',
    keywords:
      /\b(spes\w*|supermercat\w*|esselunga|conad|coop|lidl|eurospin|carrefour|compro|compri|compra|comprar\w*|acquist\w*|latte|pane|frutta|verdur\w*|negoz\w*|ordinar\w*|carrell\w*|alimentari)\b/i,
  },
  {
    id: 'cat_cook',
    label: 'Pentola & Cucinare',
    accentColor: '#F97316',
    keywords:
      /\b(cucin\w*|pentol\w*|padell\w*|soffritto|sugo|bollir\w*|fornell\w*|impast\w*|scolar\w*|preparar\w*\s+(la\s+)?(cena|pranzo|pasta))\b/i,
  },
  {
    id: 'cat_food',
    label: 'Pasti & Ristorante',
    accentColor: '#FB923C',
    keywords:
      /\b(cibo|cena\w*|pranz\w*|ricett\w*|past\w*|ristorant\w*|mangiar\w*|forn\w*|sushi|apparecchi\w*|dolce|torta|gelat\w*)\b/i,
  },
  {
    id: 'cat_pizza',
    label: 'Pizza & Takeaway',
    accentColor: '#F97316',
    keywords:
      /\b(pizz\w*|pizzeri\w*|hamburger|burger|kebab|panin\w*|patatine|glovo|deliveroo|just\s*eat|take\s*away|asporto)\b/i,
  },
  {
    id: 'cat_water',
    label: 'Acqua & Idratazione',
    accentColor: '#0EA5E9',
    keywords:
      /\b(ber[ei]\s+(pi[uù]\s+)?acqua|borraccia|idratazion\w*|idratarm\w*|bottigli\w*\s+d['’]?acqua|bicchier\w*\s+d['’]?acqua|acqua)\b/i,
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
      /\b(aperitiv\w*|spritz|birr\w*|vino|cocktail|drink|brindis\w*|pub|enotec\w*|locale)\b/i,
  },
  {
    id: 'cat_call',
    label: 'Chiamate & Telefono',
    accentColor: '#38BDF8',
    keywords:
      /\b(chiam\w*|telefon\w*|whatsapp|sms|rispond\w*|contatt\w*|videochiamat\w*|zoom|call|sentir\w*|messagg\w*)\b/i,
  },
  {
    id: 'cat_email',
    label: 'Email & Scrivere',
    accentColor: '#6366F1',
    keywords:
      /\b(email|e-mail|mail|pec|inviar\w*(\s+la)?\s+mail|letter\w*|newsletter|posta\s+elettronica|scriver\w*\s+a)\b/i,
  },
  {
    id: 'cat_battery',
    label: 'Ricarica & Cavi',
    accentColor: '#22C55E',
    keywords:
      /\b(caric\w*\s+(il\s+)?(telefono|cellulare|iphone|watch|orologio|powerbank|tablet|cuffie|pc)|caricabatteri\w*|powerbank|batteri\w*|cavett\w*|cavo\s+usb)\b/i,
  },
  {
    id: 'cat_work',
    label: 'Lavoro & Ufficio',
    accentColor: '#818CF8',
    keywords:
      /\b(lavor\w*|riunion\w*|ufficio|client\w*|cv|curriculum|scrivani\w*|turno|contratt\w*|progett\w*|presentazion\w*|colloqu\w*|smart\s*working|busta\s+paga)\b/i,
  },
  {
    id: 'cat_computer',
    label: 'PC & Tech',
    accentColor: '#3B82F6',
    keywords:
      /\b(pc|computer|portatil\w*|laptop|stamp\w*|backup|aggiornar\w*|app|software|sito|codice|password|wifi|stampant\w*|tablet|iphone|smartphone)\b/i,
  },
  {
    id: 'cat_book',
    label: 'Studio & Libri',
    accentColor: '#A78BFA',
    keywords:
      /\b(libr\w*|legger\w*|lettur\w*|stud\w*|esam\w*|cors\w*|ripas\w*|bibliotec\w*|scuol\w*|compit\w*|lezion\w*|tesi|universit\w*|diario)\b/i,
  },
  {
    id: 'cat_meditate',
    label: 'Respiro & Calma',
    accentColor: '#2DD4BF',
    keywords:
      /\b(medit\w*|mindfulness|respir\w*|calmarm\w*|rilassament\w*|pausa\s+mentale|centrat\w*|silenzio\s+interiore)\b/i,
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
    id: 'cat_shoes',
    label: 'Scarpe & Passeggio',
    accentColor: '#EC4899',
    keywords:
      /\b(scarp\w*|sneakers|stival\w*|ciabatt\w*|calzin\w*|stringh\w*|sandal\w*)\b/i,
  },
  {
    id: 'cat_clothes',
    label: 'Vestiti & Cambio',
    accentColor: '#E879F9',
    keywords:
      /\b(vestit\w*|magli\w*|pantalon\w*|giacc\w*|cappott\w*|camici\w*|armadio|guardarob\w*|sart\w*|cintur\w*|felp\w*|intimo)\b/i,
  },
  {
    id: 'cat_clock',
    label: 'Sveglia & Orari',
    accentColor: '#F59E0B',
    keywords:
      /\b(svegli\w*|orologi\w*|puntual\w*|orario|appuntament\w*|sveglia\s+presto|sveglia)\b/i,
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
      /\b(dormir\w*|sonn\w*|letto|pisolin\w*|serat\w*|relax|ripos\w*|notte|calma|poi\s+poi|divano|pigiam\w*)\b/i,
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

/**
 * High-specificity priority order:
 * Specific objects/appliances/actions ALWAYS precede generic nouns like casa/lavoro/cibo
 * (e.g. "lavatrice" -> cat_laundry, "pulisci casa" -> cat_clean, "borsa" -> cat_bag).
 */
const INFERENCE_PRIORITY_ORDER: CatEmoticonId[] = [
  'cat_laundry',
  'cat_clean',
  'cat_bag',
  'cat_fuel',
  'cat_barber',
  'cat_package',
  'cat_trash',
  'cat_pharmacy',
  'cat_dentist',
  'cat_glasses',
  'cat_repair',
  'cat_garden',
  'cat_bed',
  'cat_train',
  'cat_plane',
  'cat_keys',
  'cat_battery',
  'cat_shoes',
  'cat_clothes',
  'cat_paperwork',
  'cat_bank',
  'cat_bills',
  'cat_pizza',
  'cat_drink',
  'cat_water',
  'cat_coffee',
  'cat_cook',
  'cat_food',
  'cat_shower',
  'cat_health',
  'cat_pet',
  'cat_car',
  'cat_shop',
  'cat_email',
  'cat_call',
  'cat_computer',
  'cat_work',
  'cat_book',
  'cat_meditate',
  'cat_bike',
  'cat_sport',
  'cat_camera',
  'cat_music',
  'cat_movie',
  'cat_game',
  'cat_gift',
  'cat_clock',
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

const COMPOUND_PHRASE_RULES: Array<{ pattern: RegExp; id: CatEmoticonId }> = [
  {
    pattern: /\b(lavatric\w*|asciugatric\w*|bucat\w*|panni\b|stender\w*|stirar\w*)\b/i,
    id: 'cat_laundry',
  },
  {
    pattern: /\b(lavaggio\s+auto|(pulir\w*|pulisc\w*|lavar\w*)\s+(l['’]?\s*)?(auto|macchina))\b/i,
    id: 'cat_car',
  },
  {
    pattern: /\b(pulisc\w*|pulir\w*|puliz\w*|spolver\w*|riordin\w*|aspirapolver\w*|mocio|igienizz\w*|sanific\w*|scopar\w*)\b/i,
    id: 'cat_clean',
  },
  {
    pattern: /\b(bors[ae]|borsett\w*|zain\w*|tracoll\w*|marsupio|sacca(\s+palestra)?|valigett\w*)\b/i,
    id: 'cat_bag',
  },
  {
    pattern: /\b(lavar\w*\s+i\s+denti|spazzolin\w*|dentist\w*)\b/i,
    id: 'cat_dentist',
  },
  {
    pattern: /\b(rifar\w*\s+(il\s+)?letto|cambi\w*\s+(le\s+)?lenzuol\w*|lenzuol\w*)\b/i,
    id: 'cat_bed',
  },
  {
    pattern: /\b(caricar\w*\s+(il\s+)?(telefono|cellulare|iphone|watch|orologio|powerbank|tablet|cuffie)|powerbank|caricabatteri\w*)\b/i,
    id: 'cat_battery',
  },
  {
    pattern: /\b(ber[ei]\s+(pi[uù]\s+)?acqua|borraccia)\b/i,
    id: 'cat_water',
  },
];

export function isCatEmoticonId(val?: string | null): val is CatEmoticonId {
  return typeof val === 'string' && val in CAT_EMOTICON_MAP;
}

export function inferSpecificCatEmoticonId(text: string): CatEmoticonId | null {
  const clean = (text || '').trim();
  if (!clean) return null;

  for (const rule of COMPOUND_PHRASE_RULES) {
    if (rule.pattern.test(clean)) {
      return rule.id;
    }
  }

  for (const id of INFERENCE_PRIORITY_ORDER) {
    if (CAT_EMOTICON_MAP[id].keywords.test(clean)) {
      return id;
    }
  }

  return null;
}

export function inferCatEmoticonId(
  text: string,
  blockHint?: TodoBlockKey
): CatEmoticonId {
  const matched = inferSpecificCatEmoticonId(text);
  if (matched) return matched;
  if (blockHint === 'bollette') return 'cat_bills';
  if (blockHint === 'svaghi') return 'cat_game';
  if (blockHint === 'poi_poi') return 'cat_sleep';
  return 'cat_note';
}

/**
 * Used on auto-generated AI results (transcribe-todo / parse-batch-todos):
 * if the text clearly contains an explicit high-specificity object/phrase keyword
 * (e.g. lavatrice, pulisci casa, borsa), prefer the exact matched icon over a
 * looser AI guess, while preserving AI selection when no explicit keyword matched.
 */
export function reconcileAutoCatEmoticonId(
  aiEmoji: string | undefined,
  text: string,
  blockHint?: TodoBlockKey
): CatEmoticonId {
  const specific = inferSpecificCatEmoticonId(text);
  if (specific) {
    return specific;
  }
  return resolveCatEmoticonId(aiEmoji, text, blockHint);
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

