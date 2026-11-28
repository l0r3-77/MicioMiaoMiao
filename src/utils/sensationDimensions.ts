import type { NoteColor, NoteEntry } from '../types/note';
import { NOTE_COLORS } from './noteColors';

export type SensationDimensionKey =
  | 'umore'
  | 'energia_mentale'
  | 'energia_fisica'
  | 'stress'
  | 'ansia';

export interface SensationDimensionMeta {
  key: SensationDimensionKey;
  label: string;
  shortLabel: string;
  color: string;
  scaleHint: string;
}

export const SENSATION_DIMENSIONS: SensationDimensionMeta[] = [
  {
    key: 'umore',
    label: 'Umore',
    shortLabel: 'Umore',
    color: '#0EA5E9',
    scaleHint: '+2 felice · -2 giù',
  },
  {
    key: 'energia_mentale',
    label: 'Energia mentale',
    shortLabel: 'Mentale',
    color: '#8B5CF6',
    scaleHint: '+2 lucido · -2 scarico',
  },
  {
    key: 'energia_fisica',
    label: 'Energia fisica',
    shortLabel: 'Fisica',
    color: '#10B981',
    scaleHint: '+2 carico · -2 stanco',
  },
  {
    key: 'stress',
    label: 'Stress',
    shortLabel: 'Stress',
    color: '#F97316',
    scaleHint: '+2 calmo · -2 alto',
  },
  {
    key: 'ansia',
    label: 'Ansia',
    shortLabel: 'Ansia',
    color: '#E11D48',
    scaleHint: '+2 quieto · -2 forte',
  },
];

export const SENSATION_DIMENSION_MAP: Record<SensationDimensionKey, SensationDimensionMeta> = {
  umore: SENSATION_DIMENSIONS[0],
  energia_mentale: SENSATION_DIMENSIONS[1],
  energia_fisica: SENSATION_DIMENSIONS[2],
  stress: SENSATION_DIMENSIONS[3],
  ansia: SENSATION_DIMENSIONS[4],
};

interface WeightedSignalRule {
  dimension: SensationDimensionKey;
  pattern: RegExp;
  baseScore: number; // +2 (best wellbeing) to -2 (worst wellbeing)
  weight?: number;
  allowNegationFlip?: boolean;
}

function normalizeItalianForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampValenceScore(v: number): number {
  return Math.max(-2, Math.min(2, v));
}

function detectIntensityFactor(clause: string): number {
  if (
    /\b(tantissim\w*|moltissim\w*|fortissim\w*|estrem\w*|total\w*|complet\w*|altissim\w*|insostenibil\w*|massim\w*|enorm\w*|profond\w*|atroce|devast\w*|pienissim\w*)\b/.test(
      clause
    )
  ) {
    return 1.35;
  }
  if (
    /\b(molto|tanta|tanto|parecchi\w*|davvero|proprio|abbastanza\s+alt\w*|medio[\s-]alt\w*|elevat\w*|marcata|marcato|forte|intenso|intensa|pesante)\b/.test(
      clause
    )
  ) {
    return 1.15;
  }
  if (/\b(abbastanza|discret\w*|abbondant\w*|piuttosto|sufficient\w*|moderata|moderato|medi[ao])\b/.test(clause)) {
    return 0.78;
  }
  if (/\b(legger\w*|lieve\w*|poco|poca|pochi|poche|un\s+po|appena|minimo|minima|basso|bassa|lievemente)\b/.test(clause)) {
    return 0.52;
  }
  return 1.0;
}

function hasNegationBeforeMatch(clause: string, matchIndex: number): boolean {
  const prefix = clause.slice(Math.max(0, matchIndex - 32), matchIndex);
  return /\b(non|senza|zero|nessun\w*|niente|nulla|passat[ao]|svanit[ao]|calat[ao]|diminuit[ao]|lontano\s+da|libero\s+da|libera\s+da)\s+(?:piu\s+|alcun\w*\s+|molt\w*\s+|tant\w*\s+|un\s+po\s+di\s+)?$/i.test(
    prefix
  );
}

const SIGNAL_RULES: WeightedSignalRule[] = [
  // ===== UMORE (+2 felice / contento -> -2 triste / arrabbiato / apatico) =====
  {
    dimension: 'umore',
    pattern: /\b(contentissim\w*|felicissim\w*|entusiast\w*|raggiante|euforic\w*|splendid\w*|meraviglios\w*|benissimo|alla\s+grande|al\s+top|gioia\s+immensa|super\s+felic\w*|gratissim\w*)\b/g,
    baseScore: 2,
    weight: 1.5,
  },
  {
    dimension: 'umore',
    pattern: /\b(content\w*|felic\w*|gioios\w*|gioia|allegro|allegra|allegria|ottimist\w*|sorrident\w*|soddisfatt\w*|grat\w*|fiduci\w*|seren\w*|buon\s+umore|sto\s+bene|giornata\s+(?:bella|positiva|buona)|bella\s+giornata|umore\s+(?:alto|buono|positivo|ottimo|sereno|sollevato)|sollievo|appagato|appagata|leggerezza)\b/g,
    baseScore: 1.35,
    weight: 1.3,
  },
  {
    dimension: 'umore',
    pattern: /\b(umore\s+(?:normale|neutro|stabile|regolare|medio|cosi\s+cosi|misto)|cosi\s+cosi|altalenante)\b/g,
    baseScore: 0,
    weight: 1.1,
    allowNegationFlip: false,
  },
  {
    dimension: 'umore',
    pattern: /\b(trist\w*|giu\s+di\s+morale|mi\s+sento\s+giu|sto\s+giu|morale\s+(?:basso|a\s+terra)|giu\s+di\s+corda|malincon\w*|delus\w*|amareggiat\w*|demoralizz\w*|scoraggi\w*|giornata\s+(?:no|brutta|storta|grigia)|sto\s+male|umore\s+(?:basso|negativo|cupo|grigio|pessimo|nero)|spento|spenta|abbattut\w*|scontento|insoddisfatt\w*|malumore)\b/g,
    baseScore: -1.35,
    weight: 1.35,
  },
  {
    dimension: 'umore',
    pattern: /\b(depress\w*|disperat\w*|piang\w*|pianto|lacrim\w*|arrabbiat\w*|rabbia|furi\w*|frustrat\w*|esasperat\w*|senso\s+di\s+vuoto|vuoto\s+dentro|a\s+terra|schifo|malissimo|giornata\s+(?:pessima|terribile|orribile)|umore\s+(?:pessimo|terribile|distrugg\w*))\b/g,
    baseScore: -1.9,
    weight: 1.6,
  },

  // ===== ENERGIA MENTALE (+2 lucido/focus/motivato -> -2 confuso/distratto/burnout) =====
  {
    dimension: 'energia_mentale',
    pattern: /\b(lucidissim\w*|super\s+concentrat\w*|iper[\s-]?focus|mente\s+(?:brillante|fresca|limpida|veloce|reattiva|super\s+chiara)|chiarezza\s+totale|energia\s+mentale\s+(?:altissima|al\s+massimo|ottima)|ispiratissim\w*|pieno\s+di\s+idee)\b/g,
    baseScore: 1.9,
    weight: 1.5,
  },
  {
    dimension: 'energia_mentale',
    pattern: /\b(lucid\w*|lucidita|concentrat\w*|concentrazione|focus\s*(?:alto|buono|ottimo|attivo|presente|recuperato|chiaro|ritrovato)|focalizzat\w*|attento|attenta|mente\s+(?:chiara|lucida|attiva|presente|riposata|libera)|energia\s+mentale\s+(?:buona|alta|discreta|positiva|presente)|motivat\w*|ispirat\w*|creativ\w*|produttiv\w*|chiarezza\s+mentale|voglia\s+di\s+fare)\b/g,
    baseScore: 1.3,
    weight: 1.35,
  },
  {
    dimension: 'energia_mentale',
    pattern: /\b(focus\s*(?:normale|medio|discreto|stabile)|energia\s+mentale\s+(?:media|normale|stabile))\b/g,
    baseScore: 0,
    weight: 1.1,
    allowNegationFlip: false,
  },
  {
    dimension: 'energia_mentale',
    pattern: /\b(distratt\w*|poca\s+concentraz\w*|scarsa\s+concentraz\w*|fatico\s+a\s+concentr\w*|non\s+riesco\s+a\s+concentr\w*|focus\s*(?:basso|scarso|calo|calato|debole|perso|difficile|assente|esaurito|zero)|nebbia\s+mentale|mente\s+(?:annebbiata|confusa|lenta|stanca|piena|affollata|chiusa)|confus\w*|spaesat\w*|svogliat\w*|procrastin\w*|stanchezza\s+mentale|affaticamento\s+mentale|energia\s+mentale\s+(?:bassa|poca|calata|in\s+calo))\b/g,
    baseScore: -1.35,
    weight: 1.4,
  },
  {
    dimension: 'energia_mentale',
    pattern: /\b(burnout|esaurit\w*\s+mental\w*|mente\s+(?:svuotata|fritta|a\s+pezzi|bruciata|bloccata|esaurita)|energia\s+mentale\s+(?:zero|esaurita|scarica|a\s+zero|nulla|assente)|zero\s+(?:voglia|focus|concentraz\w*)|blocco\s+mentale|apatic\w*|apatia|testa\s+(?:che\s+scoppia|fusa|vuota|pesantissim\w*))\b/g,
    baseScore: -1.9,
    weight: 1.6,
  },

  // ===== ENERGIA FISICA (+2 carico/riposato/in forma -> -2 spossato/stanco/senza forze) =====
  {
    dimension: 'energia_fisica',
    pattern: /\b(pien\w*\s+di\s+energi\w*|carichissim\w*|in\s+gran\s+forma|energia\s+fisica\s+(?:altissima|ottima|al\s+top|massima)|dormito\s+(?:benissimo|profondamente)|riposatissim\w*|super\s+attivo|molto\s+energic\w*|forze\s+al\s+massimo)\b/g,
    baseScore: 1.9,
    weight: 1.5,
  },
  {
    dimension: 'energia_fisica',
    pattern: /\b(energia\s+fisica\s+(?:buona|alta|positiva|discreta)|riposat\w*|dormito\s+bene|sonno\s+ristorat\w*|in\s+forma|scattante|tonico|tonica|vigor\w*|forza\s+fisica|corpo\s+(?:leggero|rilassato|attivo|riposato|bene)|allenat\w*\s+bene|energic\w*|ricaricat\w*|attivo|attiva|fresco|fresca|vitalita)\b/g,
    baseScore: 1.3,
    weight: 1.35,
  },
  {
    dimension: 'energia_fisica',
    pattern: /\b(energia\s+fisica\s+(?:normale|media|stabile)|fisicamente\s+(?:normale|stabile|cosi\s+cosi))\b/g,
    baseScore: 0,
    weight: 1.1,
    allowNegationFlip: false,
  },
  {
    dimension: 'energia_fisica',
    pattern: /\b(stanc\w*\s+fisic\w*|fisicamente\s+(?:stanc\w*|scaric\w*|giu|debol\w*)|energia\s+fisica\s+(?:bassa|poca|calata|scarica)|stanc\w*|spossat\w*|fiacc\w*|debol\w*|sonno\b|assonn\w*|abbioccat\w*|dormito\s+(?:poco|male)|insonnia|nottata|fatica\s+fisica|pesantezz\w*\s+(?:fisica|alle\s+gambe|corporea)|mal\s+di\s+testa|emicrania|dolor\w*\s+(?:fisic\w*|schiena|collo|muscol\w*|spalle)|indolenzit\w*|senza\s+forze|scarico|scarica)\b/g,
    baseScore: -1.35,
    weight: 1.35,
  },
  {
    dimension: 'energia_fisica',
    pattern: /\b(a\s+pezzi|distrutto|distrutta|sfinit\w*|esaust\w*|ko\b|croll\w*\s+(?:dal\s+sonno|fisic\w*)|energia\s+fisica\s+(?:zero|esaurita|a\s+terra|nulla)|nessuna\s+forza|corpo\s+(?:bloccato|esausto|spezzato)|debilitat\w*|febbre|influenza|nausea\s+forte|malessere\s+fisico\s+forte)\b/g,
    baseScore: -1.9,
    weight: 1.6,
  },

  // ===== STRESS (+2 calmo/senza stress -> -2 sotto pressione/sovraccarico/esaurito) =====
  {
    dimension: 'stress',
    pattern: /\b(zero\s+stress|nessun\w*\s+stress|senza\s+stress|stress\s*(?:assente|zero|nullo|sciolto|sparito|svanito)|completamente\s+rilassat\w*|profonda\s+calma|ritmo\s+sostenibil\w*|leggero\s+come\s+una\s+piuma)\b/g,
    baseScore: 1.85,
    weight: 1.5,
  },
  {
    dimension: 'stress',
    pattern: /\b(stress\s*(?:basso|lieve|minimo|sotto\s+controllo|gestibile|in\s+calo|ridotto)|rilassat\w*|distes\w*|sciogl\w*\s+(?:le\s+tensioni|lo\s+stress)|decompressione|scarico\s+di\s+tensione|staccato\s+dal\s+lavoro|pausa\s+rigenerant\w*|ritmo\s+(?:calmo|tranquillo|umano))\b/g,
    baseScore: 1.25,
    weight: 1.3,
  },
  {
    dimension: 'stress',
    pattern: /\b(stress\s*(?:medio|moderato|normale|leggero|nella\s+norma)|un\s+po\s+di\s+stress)\b/g,
    baseScore: -0.6,
    weight: 1.15,
  },
  {
    dimension: 'stress',
    pattern: /\b(stress\w*|sotto\s+pressione|pressione\s+(?:alta|forte|costante)|sovraccaric\w*|carico\s+(?:pesante|eccessivo|di\s+lavoro)|giornata\s+(?:pesante|intensa|faticosa|frenetica)|lavoro\s+intenso|troppe\s+cose\s+da\s+fare|corri\w*\s+tutto\s+il\s+giorno|di\s+corsa|fretta\s+(?:continua|costante)|tension\w*|teso|tesa|nervos\w*|irritabil\w*|scadenze\s+pressanti|in\s+affanno|affannat\w*|oppress\w*|soffocat\w*|ingolfat\w*|stress\s*(?:medio[\s-]alto|alto|forte|pesante|elevato|crescente))\b/g,
    baseScore: -1.4,
    weight: 1.45,
  },
  {
    dimension: 'stress',
    pattern: /\b(stress\s*(?:altissimo|estremo|insostenibile|massimo|esplosivo|alle\s+stelle|cronico)|esaurimento\s+nervoso|non\s+ce\s+la\s+faccio\s+piu|scoppio|scoppiando|esplodo|collasso\s+da\s+stress|burnout\s+lavorativo)\b/g,
    baseScore: -2,
    weight: 1.65,
  },

  // ===== ANSIA (+2 quieto/sereno/al sicuro -> -2 agitato/preoccupato/panico) =====
  {
    dimension: 'ansia',
    pattern: /\b(zero\s+ansia|nessun\w*\s+ansia|senza\s+ansia|ansia\s*(?:assente|zero|nulla|sparita|passata|svanita|sciolta)|pace\s+(?:interiore|mentale|profonda)|completamente\s+tranquill\w*|mente\s+quieta|al\s+sicuro)\b/g,
    baseScore: 1.85,
    weight: 1.5,
  },
  {
    dimension: 'ansia',
    pattern: /\b(ansia\s*(?:bassa|calata|ridotta|sotto\s+controllo|passando)|tranquill\w*|calm\w*|serenita|quiete|rassicur\w*|sollevat\w*|fiducia|in\s+pace|respiro\s+(?:calmo|libero|profondo))\b/g,
    baseScore: 1.2,
    weight: 1.25,
  },
  {
    dimension: 'ansia',
    pattern: /\b(ansia\s*(?:lieve|leggera|moderata|bassa\s+di\s+fondo)|un\s+po\s+d\s*ansia|lieve\s+preoccupaz\w*|leggera\s+inquietud\w*)\b/g,
    baseScore: -0.7,
    weight: 1.2,
  },
  {
    dimension: 'ansia',
    pattern: /\b(ansia|ansios\w*|angosc\w*|agitaz\w*|agitat\w*|inquiet\w*|irrequiet\w*|preoccupat\w*|preoccupazion\w*|timor\w*|paur\w*|apprension\w*|rimugin\w*|pensieri\s+(?:fissi|intrusivi|ossessivi|in\s+loop|che\s+girano)|nodo\s+(?:alla\s+gola|allo\s+stomaco)|peso\s+sul\s+petto|stretta\s+al\s+petto|allarme\s+interno|stato\s+d\s*allerta|sulle\s+spine|smangi\w*|ansia\s*(?:media|medio[\s-]alta|alta|forte|costante|crescente))\b/g,
    baseScore: -1.45,
    weight: 1.5,
  },
  {
    dimension: 'ansia',
    pattern: /\b(panico|attacco\s+di\s+panico|crisi\s+d\s*ansia|ansia\s*(?:altissima|terribile|forte|paralizzante|acuta|estrema|insopportabile)|tachicardia|fiato\s+corto|manca\s+l\s*aria|terrore|bloccato\s+dall\s*ansia|paura\s+forte)\b/g,
    baseScore: -2,
    weight: 1.65,
  },
];

// Explicit structured bullet prefix overrides (e.g., "Stress: molto alto", "Energia fisica: bassa")
const PREFIX_DIMENSION_MAP: Array<{ prefixRe: RegExp; dimension: SensationDimensionKey }> = [
  { prefixRe: /^(umor[ei]|stato\s+d['’]animo|animo)\b/i, dimension: 'umore' },
  { prefixRe: /^(energia\s+mentale|focus|concentraz\w*|mente|lucidit\w*)\b/i, dimension: 'energia_mentale' },
  { prefixRe: /^(energia\s+fisica|fisic\w*|corpo|sonno|stanch\w*\s+fisic\w*)\b/i, dimension: 'energia_fisica' },
  { prefixRe: /^(stress|tension[ei]|pressione|carico)\b/i, dimension: 'stress' },
  { prefixRe: /^(ansia|angosc\w*|preoccupaz\w*|agitaz\w*)\b/i, dimension: 'ansia' },
];

function scoreGenericDescriptorInLabeledClause(
  dim: SensationDimensionKey,
  normBody: string
): number | null {
  if (!normBody) return null;

  // High positive words
  if (/\b(ottim\w*|altissim\w*|splendid\w*|benissimo|eccellent\w*|al\s+top|massim\w*|pien\w*|fantast\w*)\b/.test(normBody)) {
    return dim === 'stress' || dim === 'ansia' ? -1.75 : 1.75;
  }
  if (/\b(assente|zero|null[ao]|nessun\w*|svanit\w*|libero)\b/.test(normBody)) {
    return dim === 'stress' || dim === 'ansia' ? 1.75 : -1.75;
  }
  if (/\b(buon\w*|positiv\w*|seren\w*|calmo|calma|quiet\w*|tranquill\w*|fresc\w*|alto|alta|migliorat\w*|riposat\w*|recuperat\w*|ritrovat\w*|caric\w*|lucid\w*|chiar\w*|rilassat\w*|distes\w*)\b/.test(normBody)) {
    return dim === 'stress' || dim === 'ansia'
      ? /\b(calmo|calma|quiet\w*|tranquill\w*|rilassat\w*|distes\w*|seren\w*|migliorat\w*)\b/.test(normBody)
        ? 1.25
        : -1.35 // e.g., "Stress: alto" -> negative wellbeing!
      : 1.25;
  }
  if (/\b(normale|neutr\w*|medi[ao]|stabile|regolare|equilibr\w*|cosi\s+cosi)\b/.test(normBody)) {
    return (dim === 'stress' || dim === 'ansia') && /\bmedi[ao]\b/.test(normBody) ? -0.5 : 0;
  }
  if (/\b(bass\w*|scaric\w*|stanc\w*|debol\w*|calo|calat\w*|poca|poco|ridott\w*|scars\w*|difficil\w*|affaticat\w*|pesant\w*)\b/.test(normBody)) {
    if (dim === 'stress' || dim === 'ansia') {
      // "Stress: basso" or "Ansia: in calo" -> GOOD wellbeing!
      if (/\b(bass\w*|poca|poco|ridott\w*|calo|calat\w*|legger\w*|liev\w*|minimo|minima)\b/.test(normBody)) {
        return 1.1;
      }
      return -1.2;
    }
    return -1.2;
  }
  if (/\b(pessim\w*|esaurit\w*|distrutt\w*|critico|a\s+terra|croll\w*|eccessiv\w*|elevat\w*|forte|frenetic\w*|insostenibil\w*)\b/.test(normBody)) {
    return -1.8;
  }
  return null;
}

export type EntryDimensionScores = Partial<Record<SensationDimensionKey, number>>;

export function analyzeEntrySensationDimensions(entry: NoteEntry): EntryDimensionScores {
  const accum: Record<SensationDimensionKey, { sum: number; weight: number }> = {
    umore: { sum: 0, weight: 0 },
    energia_mentale: { sum: 0, weight: 0 },
    energia_fisica: { sum: 0, weight: 0 },
    stress: { sum: 0, weight: 0 },
    ansia: { sum: 0, weight: 0 },
  };

  const addEvidence = (dim: SensationDimensionKey, score: number, weight: number) => {
    const clamped = clampValenceScore(score);
    accum[dim].sum += clamped * weight;
    accum[dim].weight += weight;
  };

  const processClause = (rawClause: string, sourceBoost: number, explicitDimHint?: SensationDimensionKey) => {
    const clause = normalizeItalianForMatch(rawClause);
    if (!clause) return;

    const intensity = detectIntensityFactor(clause);
    let matchedInClause = false;

    for (const rule of SIGNAL_RULES) {
      rule.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.pattern.exec(clause)) !== null) {
        matchedInClause = true;
        let s = rule.baseScore * intensity;
        if (rule.allowNegationFlip !== false && hasNegationBeforeMatch(clause, m.index)) {
          // Flip polarity calmly when negated (e.g., "non sono stressato" -> +1.15; "non sono felice" -> -1.1)
          s = s === 0 ? 0 : -Math.sign(s) * Math.min(1.5, Math.max(0.95, Math.abs(s) * 0.85));
        }
        addEvidence(rule.dimension, s, (rule.weight ?? 1.0) * sourceBoost);
      }
    }

    // Handle ambiguous "Energia: ..." without mental/physical qualifier
    if (!matchedInClause && !explicitDimHint && /^energia\b/.test(clause)) {
      const colonIdx = clause.indexOf(':');
      const body = colonIdx >= 0 ? clause.slice(colonIdx + 1).trim() : clause;
      const gScore = scoreGenericDescriptorInLabeledClause('energia_fisica', body);
      if (gScore !== null) {
        addEvidence('energia_fisica', gScore, 0.9 * sourceBoost);
        addEvidence('energia_mentale', gScore * 0.85, 0.7 * sourceBoost);
        matchedInClause = true;
      }
    }

    // Fallback inside explicitly labeled bullet like "Ansia: ..." or "Energia mentale: ..."
    if (!matchedInClause && explicitDimHint) {
      const colonIdx = clause.indexOf(':');
      const body = colonIdx >= 0 ? clause.slice(colonIdx + 1).trim() : clause;
      const gScore = scoreGenericDescriptorInLabeledClause(explicitDimHint, body);
      if (gScore !== null) {
        addEvidence(explicitDimHint, gScore, 1.2 * sourceBoost);
      }
    }
  };

  // 1. Analyze synthesized bullets (strong structured signal, boost 1.25)
  for (const rawBullet of entry.bullets || []) {
    const trimmed = rawBullet.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    let hint: SensationDimensionKey | undefined;
    if (colonIdx > 0 && colonIdx <= 28) {
      const prefix = trimmed.slice(0, colonIdx).trim();
      for (const mapping of PREFIX_DIMENSION_MAP) {
        if (mapping.prefixRe.test(prefix)) {
          hint = mapping.dimension;
          break;
        }
      }
    }
    processClause(trimmed, 1.25, hint);
  }

  // 2. Analyze raw transcript clauses directly (words & descriptive phrases, boost 1.0)
  const transcript = (entry.transcript || '').trim();
  if (transcript && transcript !== '[SILENZIO]') {
    const clauses = transcript
      .split(/[.;!?\n]+|(?:\s+(?:ma|pero|però|anche se|mentre|eppure|inoltre)\s+)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const c of clauses) {
      processClause(c, 1.0);
    }
  }

  // 3. Score synthesis: anchor primarily to the original note's assigned color (68% color + 32% analyzed text),
  //    falling back directly to color valence where appropriate.
  const colorMeta = NOTE_COLORS[entry.color] || NOTE_COLORS.amber;
  const colorScore = colorMeta.valenceScore;
  const COLOR_WEIGHT = 0.68;
  const TEXT_WEIGHT = 0.32;
  const result: EntryDimensionScores = {};

  (Object.keys(accum) as SensationDimensionKey[]).forEach((dim) => {
    const st = accum[dim];
    if (st.weight > 0) {
      const textScore = clampValenceScore(st.sum / st.weight);
      result[dim] = clampValenceScore(colorScore * COLOR_WEIGHT + textScore * TEXT_WEIGHT);
    }
  });

  // Umore always anchors to the entry color when no explicit mood words existed
  if (result.umore === undefined) {
    result.umore = colorScore;
  }

  // Anthracite (-2 apathy/drained) and Red (-2 stress/anger) carry clear primary dimension meaning even in brief notes
  if (entry.color === 'anthracite') {
    if (result.energia_mentale === undefined) {
      result.energia_mentale = -2;
    }
    if (result.energia_fisica === undefined) {
      result.energia_fisica = -1.85;
    }
  } else if (entry.color === 'red') {
    if (result.stress === undefined) {
      result.stress = -2;
    }
  }

  return result;
}
