import type { ChibiCatKey } from './nekoCatalog';

export type CompanionQuoteCategory =
  | 'Zen Giapponese'
  | 'Proverbio Giapponese'
  | 'Citazione'
  | 'Aforisma'
  | 'Riflessione';

export interface DailyCompanionQuote {
  id: string;
  text: string;
  author?: string;
  category: CompanionQuoteCategory;
  catKey: ChibiCatKey;
  themeLabel: string;
}

export const DAILY_COMPANION_QUOTES: DailyCompanionQuote[] = [
  // --- Zen & Saggezza Giapponese ---
  {
    id: 'zen-nanakorobi',
    text: 'Nanakorobi yaoki — Cadi sette volte, rialzati otto: la costanza conta più della perfezione.',
    author: 'Proverbio giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-ichigo-ichie',
    text: 'Ichigo ichie — Ogni incontro e ogni istante è irripetibile: merita la tua presenza quieta.',
    author: 'Tradizione Zen del tè',
    category: 'Zen Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'zen-shoshin',
    text: 'Nella mente del principiante ci sono molte possibilità; in quella dell’esperto ce ne sono poche.',
    author: 'Shunryū Suzuki (Shoshin)',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-dogen-present',
    text: 'Quando cammini, cammina soltanto. Quando siedi, siedi soltanto. Non oscillare tra ieri e domani.',
    author: 'Maestro Dōgen',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-kintsugi',
    text: 'Come nel Kintsugi, ciò che si è incrinato e poi riparato con cura diventa parte della tua forza.',
    author: 'Filosofia giapponese',
    category: 'Zen Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'zen-wabi-sabi',
    text: 'Wabi-sabi: c’è una pace autentica nell’accettare giornate imperfette ma vissute con sincerità.',
    author: 'Estetica Zen giapponese',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-basho-moon',
    text: 'Siedi in silenzio, non fare nulla: la primavera arriva e l’erba cresce da sé.',
    author: 'Detto Zen giapponese',
    category: 'Zen Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-rikyu-tea',
    text: 'Anche versare una semplice tazza calda, se fatto con attenzione, calma l’intera giornata.',
    author: 'Sen no Rikyū',
    category: 'Zen Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'zen-ryokan-wind',
    text: 'Lascia che il vento porti via i pensieri superflui, come foglie leggere sull’acqua calma.',
    author: 'Ryōkan Taigu',
    category: 'Zen Giapponese',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'zen-kaizen',
    text: 'Kaizen: un passo minuscolo fatto oggi con serenità vale più di cento propositi rimandati.',
    author: 'Saggezza giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-komorebi',
    text: 'Komorebi: anche nelle giornate dense esiste sempre uno spiraglio di luce tra i rami.',
    author: 'Espressione giapponese',
    category: 'Zen Giapponese',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'zen-pine',
    text: 'La neve piega il bambù, ma non lo spezza: la flessibilità è una forma silenziosa di forza.',
    author: 'Proverbio giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-kenko',
    text: 'Il momento più prezioso è quello in cui non stai inseguendo nulla e ascolti semplicemente come stai.',
    author: 'Ispirato a Yoshida Kenkō',
    category: 'Zen Giapponese',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'zen-ikkyu',
    text: 'La mente limpida non cerca di fermare le onde, impara a restare salda mentre passano.',
    author: 'Tradizione Zen (Ikkyū)',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-mizu',
    text: 'Sii come l’acqua: aggira l’ostacolo senza rabbia e trova comunque il tuo percorso.',
    author: 'Proverbio orientale',
    category: 'Proverbio Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-basho-journey',
    text: 'Ogni giorno è un viaggio, e il viaggio stesso è già casa.',
    author: 'Matsuo Bashō',
    category: 'Zen Giapponese',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'zen-ame-tsuchi',
    text: 'Dopo la pioggia il terreno diventa più saldo: anche i giorni faticosi lasciano radici più profonde.',
    author: 'Proverbio giapponese (Ame futte ji katamaru)',
    category: 'Proverbio Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-isogaba-maware',
    text: 'Isogaba maware — Quando hai fretta, scegli la strada più calma: arriverai meglio e prima.',
    author: 'Proverbio giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },

  // --- Citazioni celebri (Filosofia, Letteratura, Scienza) ---
  {
    id: 'seneca-step',
    text: 'Non è perché le cose sono difficili che non osiamo, è perché non osiamo che sono difficili.',
    author: 'Seneca',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'seneca-time',
    text: 'Non abbiamo poco tempo: ne abbiamo abbastanza, se impariamo a non disperderlo nell’ansia.',
    author: 'Seneca',
    category: 'Citazione',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'aurelio-mind',
    text: 'Hai potere sulla tua mente, non sugli eventi esterni. Comprendilo e troverai forza.',
    author: 'Marco Aurelio',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'aurelio-day',
    text: 'Compi ogni azione della giornata come se meritasse tutta la tua attenzione, senza peso né fretta.',
    author: 'Marco Aurelio',
    category: 'Citazione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'epitteto-control',
    text: 'La serenità comincia nel momento esatto in cui distingui ciò che dipende da te da ciò che non dipende da te.',
    author: 'Epitteto',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'calvino-lightness',
    text: 'Prendete la vita con leggerezza, che leggerezza non è superficialità, ma planare sulle cose dall’alto.',
    author: 'Italo Calvino',
    category: 'Citazione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'montaigne-joy',
    text: 'Il segno più certo della saggezza è una serenità costante, anche nei giorni comuni.',
    author: 'Michel de Montaigne',
    category: 'Citazione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'einstein-calm',
    text: 'Nel mezzo delle difficoltà nascono le opportunità di comprendere qualcosa di nuovo.',
    author: 'Albert Einstein',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'curie-fear',
    text: 'Nulla nella vita va temuto, va solo compreso. Ora è il momento di capire di più, per temere di meno.',
    author: 'Marie Curie',
    category: 'Citazione',
    catKey: 'stats',
    themeLabel: 'Gattino analista',
  },
  {
    id: 'hesse-patience',
    text: 'La pazienza è il ponte discreto tra la fatica di oggi e la chiarezza di domani.',
    author: 'Hermann Hesse',
    category: 'Citazione',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'rilke-questions',
    text: 'Abbi pazienza verso tutto ciò che è irrisolto nel tuo cuore e prova ad amare le domande stesse.',
    author: 'Rainer Maria Rilke',
    category: 'Citazione',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'frankl-space',
    text: 'Tra lo stimolo e la risposta c’è uno spazio. In quello spazio risiede la nostra libertà di scegliere.',
    author: 'Viktor Frankl',
    category: 'Citazione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'jung-clear',
    text: 'La tua visione diventerà chiara solo quando guarderai dentro il tuo cuore con onestà.',
    author: 'Carl Gustav Jung',
    category: 'Citazione',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'laozi-journey',
    text: 'Un viaggio di mille miglia comincia sempre con un singolo passo.',
    author: 'Laozi',
    category: 'Citazione',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'laozi-nature',
    text: 'La natura non ha fretta, eppure ogni cosa si compie al suo tempo.',
    author: 'Laozi',
    category: 'Citazione',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'confucio-move',
    text: 'Non importa quanto lentamente procedi, purché tu non smetta di prenderti cura del cammino.',
    author: 'Confucio',
    category: 'Citazione',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'rumi-light',
    text: 'Anche dove ti senti stanco o ferito, è spesso proprio lì che entra una comprensione più vera.',
    author: 'Rumi',
    category: 'Citazione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'tagore-stars',
    text: 'Se chiudi la porta a tutti gli errori, anche la verità resterà fuori.',
    author: 'Rabindranath Tagore',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'woolf-room',
    text: 'Scrivere o dire ad alta voce ciò che provi restituisce forma alle giornate confuse.',
    author: 'Ispirato a Virginia Woolf',
    category: 'Citazione',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'merini-respiro',
    text: 'C’è sempre una piccola grazia nascosta nei gesti semplici con cui ricominciamo.',
    author: 'Ispirato ad Alda Merini',
    category: 'Citazione',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'levi-mestiere',
    text: 'Dare un nome preciso alle cose che senti è il primo gesto di chiarezza e libertà.',
    author: 'Ispirato a Primo Levi',
    category: 'Citazione',
    catKey: 'mic',
    themeLabel: 'Gattino voce',
  },
  {
    id: 'pavese-mattino',
    text: 'Ogni mattina è un piccolo foglio pulito: non serve sapere tutto, basta iniziare con misura.',
    author: 'Ispirato a Cesare Pavese',
    category: 'Citazione',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'gibran-silenzio',
    text: 'Il silenzio non è vuoto: è lo spazio in cui i pensieri smettono di fare rumore.',
    author: 'Khalil Gibran',
    category: 'Citazione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'thich-breath',
    text: 'Inspirando calmo il corpo; espirando lascio andare ciò che non serve portare oltre.',
    author: 'Thich Nhat Hanh',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'spinoza-capire',
    text: 'Non giudicare subito le tue emozioni: prima cerca di comprenderle.',
    author: 'Ispirato a Baruch Spinoza',
    category: 'Citazione',
    catKey: 'stats',
    themeLabel: 'Gattino analista',
  },

  // --- Aforismi e Riflessioni positive equilibrate ---
  {
    id: 'zen-breath-step',
    text: 'Non devi risolvere tutta la settimana oggi: basta abitare con calma il prossimo passo.',
    category: 'Riflessione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'sprout-small',
    text: 'Anche i cambiamenti più solidi cominciano da piccoli gesti ripetuti senza fretta.',
    category: 'Aforisma',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'stargazer-sky',
    text: 'Guardare le cose da un po’ più lontano restituisce quasi sempre la giusta misura.',
    category: 'Riflessione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'cozy-pause',
    text: 'Concedersi una pausa vera non è perdere tempo: è preparare spazio per ripartire lucidi.',
    category: 'Riflessione',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'diary-clarity',
    text: 'Mettere in parole ciò che senti trasforma la nebbia mentale in qualcosa che puoi osservare.',
    category: 'Aforisma',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'calendar-fresh',
    text: 'Ogni giornata nuova porta margini bianchi su cui scegliere un ritmo più gentile.',
    category: 'Riflessione',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'stats-pattern',
    text: 'Osservare i propri alti e bassi senza giudicarsi aiuta a capire ciò che ci fa stare bene.',
    category: 'Riflessione',
    catKey: 'stats',
    themeLabel: 'Gattino analista',
  },
  {
    id: 'mic-voice',
    text: 'Ascoltare la propria voce con sincerità è il modo più semplice per fare chiarezza dentro.',
    category: 'Aforisma',
    catKey: 'mic',
    themeLabel: 'Gattino voce',
  },
  {
    id: 'aphorism-energy',
    text: 'Una giornata storta è un dato utile su cui riposare, non una sentenza su ciò che vali.',
    category: 'Riflessione',
    catKey: 'stats',
    themeLabel: 'Gattino analista',
  },
  {
    id: 'aphorism-kindness',
    text: 'Tratta te stesso con la stessa pazienza che useresti con un amico molto stanco.',
    category: 'Aforisma',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'aphorism-focus',
    text: 'Fare una sola cosa alla volta, con calma, è il contrario dell’affanno.',
    category: 'Aforisma',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'aphorism-roots',
    text: 'Nessun albero fiorisce tutto l’anno: anche le stagioni lente servono a raccogliere energie.',
    category: 'Riflessione',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'aphorism-night',
    text: 'Di sera chiudi i conti aperti della mente: domani vedrai le stesse cose con occhi più freschi.',
    category: 'Riflessione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'aphorism-notes',
    text: 'Un appunto breve oggi può diventare tra un mese la prova di quanto sei cresciuto.',
    category: 'Aforisma',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'aphorism-speak',
    text: 'Quello che resta chiuso dentro pesa di più; dirlo a parole lo rende subito più gestibile.',
    category: 'Riflessione',
    catKey: 'mic',
    themeLabel: 'Gattino voce',
  },
  {
    id: 'aphorism-margin',
    text: 'Lasciare un po’ di margine tra un impegno e l’altro è il segreto delle giornate sostenibili.',
    category: 'Aforisma',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'aphorism-enough',
    text: 'Aver fatto il possibile con le energie reali di oggi è già abbastanza.',
    category: 'Riflessione',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'aphorism-curiosity',
    text: 'Quando sostituisci il giudizio con la curiosità, anche le emozioni difficili insegnano qualcosa.',
    category: 'Aforisma',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
];

function daySeedFromISODate(isoDate: string): number {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return 0;
  }
  const [y, m, d] = parts;
  return Math.abs(Math.floor(Date.UTC(y, m - 1, d) / 86400000));
}

export function getCompanionQuoteForDate(isoDate: string, extraOffset = 0): DailyCompanionQuote {
  const len = DAILY_COMPANION_QUOTES.length;
  // Use a coprime stride (+11) on manual cycling so successive clicks vary authors, categories, and cats
  const step = extraOffset === 0 ? 0 : extraOffset * 11;
  const idx = (daySeedFromISODate(isoDate) + step % len + len) % len;
  return DAILY_COMPANION_QUOTES[idx];
}
