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

  // --- Ulteriori citazioni & saggezza sui temi calma, presenza, respiro, piccoli passi ---
  {
    id: 'zen-kaze-yanagi',
    text: 'Yanagi ni kaze — Come il salice al vento, cedere un momento all’onda evita di spezzarsi.',
    author: 'Proverbio giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-chiri-tsumoreba',
    text: 'Chiri mo tsumoreba yama to naru — Anche granelli minuscoli di calma, giorno dopo giorno, costruiscono montagne.',
    author: 'Proverbio giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-kokoro-quiet',
    text: 'Quando il cuore smette di rincorrere l’urgenza, vede subito ciò che conta davvero.',
    author: 'Detto Zen',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-ma-space',
    text: 'Ma — Nella tradizione giapponese la pausa tra due note non è silenzio vuoto: è ciò che rende armoniosa la musica.',
    author: 'Estetica giapponese',
    category: 'Zen Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'zen-shunryu-breath',
    text: 'Ogni respiro è una porta aperta per tornare esattamente dove sei adesso.',
    author: 'Ispirato a Shunryū Suzuki',
    category: 'Zen Giapponese',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'zen-ikigai-morning',
    text: 'Non serve avere grandi risposte per iniziare bene: basta un piccolo motivo autentico per alzarsi con cura.',
    author: 'Saggezza giapponese (Ikigai)',
    category: 'Proverbio Giapponese',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'zen-shinrin-trees',
    text: 'Shinrin-yoku: anche pochi minuti all’aria aperta o vicino al verde abbassano il rumore della mente.',
    author: 'Cultura giapponese',
    category: 'Zen Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-hachibunme',
    text: 'Hara hachi bun me — Fermarsi un passo prima della saturazione lascia energia per tutto il resto della giornata.',
    author: 'Proverbio giapponese',
    category: 'Proverbio Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'zen-kumo-clouds',
    text: 'I pensieri agitati somigliano alle nuvole: cambiano forma da soli se non ti metti a litigarci.',
    author: 'Detto Zen',
    category: 'Zen Giapponese',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'zen-ichi-step',
    text: 'Senza fretta ma senza fermarti: l’acqua lenta scava la pietra meglio della tempesta.',
    author: 'Saggezza orientale',
    category: 'Proverbio Giapponese',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'zen-tea-hands',
    text: 'Scaldati le mani sulla tazza prima di decidere cosa fare dopo: la calma migliora ogni scelta.',
    author: 'Tradizione del tè',
    category: 'Zen Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'seneca-anchor',
    text: 'Soffriamo più spesso nell’immaginazione che nella realtà: torna ai fatti concreti dell’ora presente.',
    author: 'Seneca',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'aurelio-inner',
    text: 'In qualunque momento puoi ritirarti dentro te stesso: nessun luogo è più quieto della propria mente pacificata.',
    author: 'Marco Aurelio',
    category: 'Citazione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'aurelio-obstacle',
    text: 'Ciò che oggi ti rallenta può diventare la materia stessa del tuo prossimo passo avanti.',
    author: 'Marco Aurelio',
    category: 'Citazione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'kabat-wave',
    text: 'Non puoi fermare le onde, ma puoi imparare a mantenere l’equilibrio mentre arrivano.',
    author: 'Jon Kabat-Zinn',
    category: 'Citazione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'thich-smile',
    text: 'Qualche volta la tua calma è la fonte della tua gioia, e qualche volta un piccolo sorriso scioglie la tensione.',
    author: 'Thich Nhat Hanh',
    category: 'Zen Giapponese',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'tolstoy-now',
    text: 'Il momento più importante è sempre uno solo: quello che stai vivendo adesso.',
    author: 'Lev Tolstoj',
    category: 'Citazione',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'emerson-walk',
    text: 'Adotta il passo della natura: il suo segreto più grande è la pazienza.',
    author: 'Ralph Waldo Emerson',
    category: 'Citazione',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'kafka-quiet',
    text: 'Resta fermo ad ascoltare in silenzio, e la vita stessa ti mostrerà cosa ti serve.',
    author: 'Ispirato a Franz Kafka',
    category: 'Citazione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'camus-summer',
    text: 'Nel mezzo dell’inverno ho imparato finalmente che c’era in me un’invincibile estate.',
    author: 'Albert Camus',
    category: 'Citazione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'persona-horizon',
    text: 'Porta dentro di te un orizzonte aperto, anche quando la giornata ti chiede solo piccoli compiti.',
    author: 'Ispirato a Fernando Pessoa',
    category: 'Citazione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'didion-diary',
    text: 'Tenere un diario è restare in contatto con chi eravamo, per ascoltare con tenerezza chi stiamo diventando.',
    author: 'Ispirato a Joan Didion',
    category: 'Citazione',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'montessori-order',
    text: 'Mettere un piccolo ordine attorno a sé aiuta subito anche i pensieri a ritrovare respiro.',
    author: 'Ispirato a Maria Montessori',
    category: 'Citazione',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'leopardi-night',
    text: 'Nel silenzio della sera i pensieri si distendono e diventano più sinceri e leggeri.',
    author: 'Ispirato a Giacomo Leopardi',
    category: 'Citazione',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'rodari-words',
    text: 'Le parole giuste, dette con calma, aprono strade che la stanchezza faceva sembrare chiuse.',
    author: 'Ispirato a Gianni Rodari',
    category: 'Citazione',
    catKey: 'mic',
    themeLabel: 'Gattino voce',
  },
  {
    id: 'riflessione-respiro-3',
    text: 'Tre respiri lenti prima di rispondere a un pensiero urgente cambiano quasi sempre la qualità della scelta.',
    category: 'Riflessione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'riflessione-tensione-corpo',
    text: 'Abbassa le spalle, lascia la mascella morbida: spesso il corpo trattiene ansia che la testa ha già superato.',
    category: 'Riflessione',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'aforisma-chiudere-giorno',
    text: 'Non tutto va risolto prima di dormire: qualcosa ha solo bisogno di riposo e di una mattina nuova.',
    category: 'Aforisma',
    catKey: 'stargazer',
    themeLabel: 'Gattino astronomo',
  },
  {
    id: 'riflessione-ascolto-voce',
    text: 'Parlare ad alta voce dei propri dubbi li toglie dal loop mentale e li trasforma in frasi osservabili.',
    category: 'Riflessione',
    catKey: 'mic',
    themeLabel: 'Gattino voce',
  },
  {
    id: 'aforisma-semplice',
    text: 'Quando sei stanco, scegli la versione più semplice possibile della cosa giusta da fare.',
    category: 'Aforisma',
    catKey: 'calendar',
    themeLabel: 'Gattino agenda',
  },
  {
    id: 'riflessione-dati-non-colpe',
    text: 'La stanchezza non è pigrizia: è un segnale prezioso che ti chiede ritmo umano e cura.',
    category: 'Riflessione',
    catKey: 'stats',
    themeLabel: 'Gattino analista',
  },
  {
    id: 'aforisma-gentilezza-errori',
    text: 'Se oggi qualcosa è andato storto, riparti dal punto in cui sei senza sprecare energia nei rimproveri.',
    category: 'Aforisma',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'riflessione-piccoli-traguardi',
    text: 'Anche aver portato a termine una sola cosa importante, in un giorno pesante, è una vittoria reale.',
    category: 'Riflessione',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'aforisma-focus-gentile',
    text: 'La concentrazione non nasce dalla rigidità, ma dal togliere ciò che oggi non serve.',
    category: 'Aforisma',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
  {
    id: 'riflessione-scrittura-chiarezza',
    text: 'Scrivere due righe sincere vale più di un’ora passata a rimuginare in silenzio.',
    category: 'Riflessione',
    catKey: 'diary',
    themeLabel: 'Gattino diario',
  },
  {
    id: 'aforisma-lentezza-buona',
    text: 'Andare un po’ più piano oggi spesso ti evita di doverti fermare del tutto domani.',
    category: 'Aforisma',
    catKey: 'sprout',
    themeLabel: 'Gattino giardiniere',
  },
  {
    id: 'riflessione-confini',
    text: 'Dire di no a qualcosa di superfluo è il modo più diretto per dire sì alla tua serenità.',
    category: 'Riflessione',
    catKey: 'zen',
    themeLabel: 'Gattino zen',
  },
  {
    id: 'aforisma-presenza-piccola',
    text: 'La pace quotidiana non aspetta le vacanze: abita in dieci minuti tranquilli presi sul serio.',
    category: 'Aforisma',
    catKey: 'cozy',
    themeLabel: 'Gattino tisana',
  },
  {
    id: 'riflessione-emozioni-meteo',
    text: 'Le emozioni sono come il meteo: puoi leggerle con attenzione senza credere che restino uguali per sempre.',
    category: 'Riflessione',
    catKey: 'stats',
    themeLabel: 'Gattino analista',
  },
  {
    id: 'aforisma-voce-sincera',
    text: 'Non serve trovare subito parole eleganti: basta iniziare da ciò che senti davvero.',
    category: 'Aforisma',
    catKey: 'mic',
    themeLabel: 'Gattino voce',
  },
  {
    id: 'riflessione-domande-buone',
    text: 'Farsi una buona domanda è già uscire dalla nebbia: lascia il tempo alla risposta di maturare.',
    category: 'Riflessione',
    catKey: 'philosopher',
    themeLabel: 'Gattino filosofo',
  },
];

const QUOTE_DECK_STORAGE_KEY = 'miciomiao_quote_deck_v2';

interface QuoteDeckState {
  order: number[];
  cursor: number;
  lastQuoteIdx?: number;
}

function buildShuffledDeck(length: number, avoidFirstIdx?: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  if (avoidFirstIdx !== undefined && arr.length > 1 && arr[0] === avoidFirstIdx) {
    const swapIdx = 1 + Math.floor(Math.random() * (arr.length - 1));
    const tmp = arr[0];
    arr[0] = arr[swapIdx];
    arr[swapIdx] = tmp;
  }
  return arr;
}

function loadDeckState(length: number): QuoteDeckState {
  try {
    const raw = localStorage.getItem(QUOTE_DECK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<QuoteDeckState>;
      if (
        Array.isArray(parsed.order) &&
        parsed.order.length === length &&
        parsed.order.every((n) => typeof n === 'number' && n >= 0 && n < length) &&
        typeof parsed.cursor === 'number' &&
        Number.isFinite(parsed.cursor)
      ) {
        return {
          order: parsed.order,
          cursor: Math.max(0, Math.min(length - 1, Math.floor(parsed.cursor))),
          lastQuoteIdx:
            typeof parsed.lastQuoteIdx === 'number' ? parsed.lastQuoteIdx : undefined,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  const initialOrder = buildShuffledDeck(length);
  return { order: initialOrder, cursor: 0, lastQuoteIdx: initialOrder[0] };
}

function saveDeckState(state: QuoteDeckState): void {
  try {
    localStorage.setItem(QUOTE_DECK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function stepDeckAndSave(delta: number): number {
  const len = DAILY_COMPANION_QUOTES.length;
  const state = loadDeckState(len);
  const currentQuoteIdx = state.order[state.cursor] ?? 0;
  let nextCursor = state.cursor + delta;
  let nextOrder = state.order;

  if (nextCursor >= len || nextCursor < 0) {
    nextOrder = buildShuffledDeck(len, currentQuoteIdx);
    nextCursor = 0;
  }

  const nextQuoteIdx = nextOrder[nextCursor] ?? 0;
  saveDeckState({ order: nextOrder, cursor: nextCursor, lastQuoteIdx: nextQuoteIdx });
  return nextQuoteIdx;
}

export function getCompanionQuoteForDate(_isoDate: string, extraOffset = 0): DailyCompanionQuote {
  const len = DAILY_COMPANION_QUOTES.length;
  const normalizedIdx = ((extraOffset % len) + len) % len;
  return DAILY_COMPANION_QUOTES[normalizedIdx] || DAILY_COMPANION_QUOTES[0];
}

export function getInitialLaunchQuoteOffset(_isoDate: string): number {
  return stepDeckAndSave(1);
}

export function getNextManualQuoteIndex(): number {
  return stepDeckAndSave(1);
}

export function saveManualQuoteOffset(_isoDate: string, _offset: number): void {
  // Kept for backwards compatibility; stepDeckAndSave handles persistence automatically.
}
