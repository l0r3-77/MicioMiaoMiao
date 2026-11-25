import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const QUOTA_CACHE_DIR = path.join(__dirname, 'node_modules', '.cache');
const QUOTA_STATE_FILES = [
  path.join(QUOTA_CACHE_DIR, 'agendavoce-quota-state.json'),
  '/tmp/agendavoce-quota-state.json',
];
const DEFAULT_FREE_TIER_LIMIT = 20;

const CAT_EMOTICON_IDS = [
  'cat_note',
  'cat_fuel',
  'cat_barber',
  'cat_car',
  'cat_shower',
  'cat_clean',
  'cat_home',
  'cat_bills',
  'cat_pet',
  'cat_health',
  'cat_shop',
  'cat_food',
  'cat_coffee',
  'cat_call',
  'cat_work',
  'cat_book',
  'cat_sport',
  'cat_music',
  'cat_movie',
  'cat_game',
  'cat_gift',
  'cat_sun',
  'cat_baby',
  'cat_idea',
  'cat_fire',
  'cat_sleep',
  'cat_think',
  'cat_sad',
  'cat_love',
  'cat_happy',
];

interface ServerQuotaState {
  dayKey: string;
  used: number;
  limit: number;
  exhausted: boolean;
  resetAt: number;
  modelExhaustedUntil: Record<string, number>;
  updatedAt: string;
}

function getPacificDayKey(nowMs = Date.now()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(nowMs));
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}

function getNextPacificMidnightMs(nowMs = Date.now()): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(nowMs)).map((p) => [p.type, p.value])
    );
    const h = Number(parts.hour === '24' ? 0 : parts.hour);
    const m = Number(parts.minute);
    const s = Number(parts.second);
    const elapsedSec = h * 3600 + m * 60 + s;
    const remainingSec = Math.max(60, 86400 - elapsedSec);
    return nowMs + remainingSec * 1000;
  } catch {
    return nowMs + 24 * 3600 * 1000;
  }
}

function loadInitialQuotaState(): ServerQuotaState {
  const now = Date.now();
  const dayKey = getPacificDayKey(now);
  const resetAt = getNextPacificMidnightMs(now);
  let best: ServerQuotaState | null = null;

  for (const filePath of QUOTA_STATE_FILES) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<ServerQuotaState>;
      if (
        parsed &&
        parsed.dayKey === dayKey &&
        typeof parsed.resetAt === 'number' &&
        now < parsed.resetAt
      ) {
        const candidate: ServerQuotaState = {
          dayKey,
          used: typeof parsed.used === 'number' ? Math.max(0, parsed.used) : 0,
          limit:
            typeof parsed.limit === 'number' && parsed.limit > 0
              ? parsed.limit
              : DEFAULT_FREE_TIER_LIMIT,
          exhausted: Boolean(parsed.exhausted),
          resetAt: parsed.resetAt,
          modelExhaustedUntil:
            parsed.modelExhaustedUntil && typeof parsed.modelExhaustedUntil === 'object'
              ? parsed.modelExhaustedUntil
              : {},
          updatedAt:
            typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(now).toISOString(),
        };
        if (
          !best ||
          (candidate.exhausted && !best.exhausted) ||
          candidate.used > best.used ||
          candidate.updatedAt > best.updatedAt
        ) {
          best = candidate;
        }
      }
    } catch {
      // ignore corrupt temp state
    }
  }

  if (best) return best;

  return {
    dayKey,
    used: 0,
    limit: DEFAULT_FREE_TIER_LIMIT,
    exhausted: false,
    resetAt,
    modelExhaustedUntil: {},
    updatedAt: new Date(now).toISOString(),
  };
}

let quotaState: ServerQuotaState = loadInitialQuotaState();

function persistQuotaState() {
  const serialized = JSON.stringify(quotaState);
  try {
    if (!fs.existsSync(QUOTA_CACHE_DIR)) {
      fs.mkdirSync(QUOTA_CACHE_DIR, { recursive: true });
    }
  } catch {
    // ignore mkdir errors
  }
  for (const filePath of QUOTA_STATE_FILES) {
    try {
      fs.writeFileSync(filePath, serialized);
    } catch {
      // ignore disk errors
    }
  }
}

function ensureCurrentQuotaWindow() {
  const now = Date.now();
  const currentDayKey = getPacificDayKey(now);
  if (now >= quotaState.resetAt || quotaState.dayKey !== currentDayKey) {
    quotaState = {
      dayKey: currentDayKey,
      used: 0,
      limit: quotaState.limit || DEFAULT_FREE_TIER_LIMIT,
      exhausted: false,
      resetAt: getNextPacificMidnightMs(now),
      modelExhaustedUntil: {},
      updatedAt: new Date(now).toISOString(),
    };
    persistQuotaState();
  }
}

function getPublicQuotaSnapshot() {
  ensureCurrentQuotaWindow();
  const limit = Math.max(1, quotaState.limit || DEFAULT_FREE_TIER_LIMIT);
  const exhausted = quotaState.exhausted || quotaState.used >= limit;
  const remaining = exhausted ? 0 : Math.max(0, limit - quotaState.used);
  return {
    used: exhausted ? limit : quotaState.used,
    limit,
    remaining,
    exhausted,
    resetAt: quotaState.resetAt,
    updatedAt: quotaState.updatedAt,
  };
}

function recordSuccessfulGeminiUsage() {
  ensureCurrentQuotaWindow();
  quotaState.used = Math.min(quotaState.limit, quotaState.used + 1);
  quotaState.exhausted = quotaState.used >= quotaState.limit;
  quotaState.updatedAt = new Date().toISOString();
  persistQuotaState();
}

function parseQuotaDetailsFromError(err: unknown): {
  isDailyFreeTier: boolean;
  retryDelayMs: number | null;
  limit: number | null;
} {
  let rawText = '';
  try {
    const errObj = err as { message?: string };
    rawText = `${errObj?.message || ''} ${JSON.stringify(err)}`;
  } catch {
    rawText = String(err || '');
  }

  const isDailyFreeTier =
    rawText.includes('FreeTier') ||
    rawText.includes('PerDay') ||
    rawText.includes('generate_content_free_tier_requests');

  let retryDelayMs: number | null = null;
  const secMatch = rawText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (secMatch) {
    retryDelayMs = Math.round(Number(secMatch[1]) * 1000);
  } else {
    const hmsMatch = rawText.match(/Please retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
    if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
      const h = Number(hmsMatch[1] || 0);
      const m = Number(hmsMatch[2] || 0);
      const s = Number(hmsMatch[3] || 0);
      retryDelayMs = Math.round((h * 3600 + m * 60 + s) * 1000);
    }
  }

  let limit: number | null = null;
  const limitMatch = rawText.match(/"quotaValue"\s*:\s*"(\d+)"|limit:\s*(\d+)/);
  if (limitMatch) {
    const val = Number(limitMatch[1] || limitMatch[2]);
    if (Number.isFinite(val) && val > 0) {
      limit = val;
    }
  }

  return { isDailyFreeTier, retryDelayMs, limit };
}

function markModelQuotaExhausted(model: string, err: unknown) {
  ensureCurrentQuotaWindow();
  const { isDailyFreeTier, retryDelayMs, limit } = parseQuotaDetailsFromError(err);
  if (!isDailyFreeTier) return;
  const now = Date.now();
  const nextReset =
    retryDelayMs && retryDelayMs > 60_000 ? now + retryDelayMs : getNextPacificMidnightMs(now);
  quotaState.modelExhaustedUntil[model] = nextReset;
  if (limit) {
    quotaState.limit = limit;
  }
  quotaState.resetAt = nextReset;
  quotaState.updatedAt = new Date(now).toISOString();
  persistQuotaState();
}

function markGlobalDailyQuotaExhausted(err: unknown) {
  ensureCurrentQuotaWindow();
  const { isDailyFreeTier, retryDelayMs, limit } = parseQuotaDetailsFromError(err);
  if (!isDailyFreeTier) return;
  const now = Date.now();
  const nextReset =
    retryDelayMs && retryDelayMs > 60_000 ? now + retryDelayMs : getNextPacificMidnightMs(now);
  if (limit) {
    quotaState.limit = limit;
  }
  quotaState.used = quotaState.limit;
  quotaState.exhausted = true;
  quotaState.resetAt = nextReset;
  quotaState.updatedAt = new Date(now).toISOString();
  persistQuotaState();
}

function isModelKnownExhausted(model: string): boolean {
  ensureCurrentQuotaWindow();
  const until = quotaState.modelExhaustedUntil[model];
  return typeof until === 'number' && Date.now() < until;
}

function syncClientQuotaState(raw: unknown) {
  ensureCurrentQuotaWindow();
  if (!raw || typeof raw !== 'object') {
    return getPublicQuotaSnapshot();
  }
  const incoming = raw as {
    used?: unknown;
    limit?: unknown;
    exhausted?: unknown;
    resetAt?: unknown;
  };
  const now = Date.now();
  const incomingResetAt =
    typeof incoming.resetAt === 'number' && Number.isFinite(incoming.resetAt)
      ? incoming.resetAt
      : 0;

  // Only merge incoming snapshots that belong to the current active reset window
  if (incomingResetAt <= now || Math.abs(incomingResetAt - quotaState.resetAt) >= 2 * 3600 * 1000) {
    return getPublicQuotaSnapshot();
  }

  const incomingLimit =
    typeof incoming.limit === 'number' && Number.isFinite(incoming.limit) && incoming.limit > 0
      ? Math.round(incoming.limit)
      : quotaState.limit;
  const incomingUsed =
    typeof incoming.used === 'number' && Number.isFinite(incoming.used) && incoming.used >= 0
      ? Math.min(incomingLimit, Math.round(incoming.used))
      : 0;
  const incomingExhausted = Boolean(incoming.exhausted) || incomingUsed >= incomingLimit;

  if (incomingLimit > quotaState.limit) {
    quotaState.limit = incomingLimit;
  }
  if (incomingUsed > quotaState.used) {
    quotaState.used = Math.min(quotaState.limit, incomingUsed);
  }
  if (incomingExhausted) {
    quotaState.exhausted = true;
    quotaState.used = quotaState.limit;
    quotaState.resetAt = Math.max(quotaState.resetAt, incomingResetAt);
  }
  quotaState.updatedAt = new Date(now).toISOString();
  persistQuotaState();
  return getPublicQuotaSnapshot();
}

type SuggestedColor = 'celeste' | 'sky' | 'amber' | 'light_red' | 'red' | 'anthracite';
const VALID_COLORS: SuggestedColor[] = ['celeste', 'sky', 'amber', 'light_red', 'red', 'anthracite'];

const SERVER_REMINDER_REGEX =
  /\b(potrei|forse\s+dovrei|forse\s+potrei|dovrei|mi\s+sa\s+che|se\s+(?:faccio|dico|penso|provo|chiedo|chiamo|scrivo|vado|aspetto|lascio|parlo)|devo\s+(?:fare|dire|ricordar|chiamar|scriver|mandar|inviar|parlar|comprar|prenotar|pagar|controllar|fissar|organizzar|finir|mandare)|ricordarmi|da\s+ricordare|non\s+(?:devo\s+)?dimenticar|sarebbe\s+(?:meglio|utile|opportuno|bene)|converrebbe|mi\s+conviene|bisogna\s+che|bisognerebbe|magari\s+(?:faccio|provo|chiamo|scrivo|prendo|cambio|proviamo)|appena\s+posso|la\s+prossima\s+volta|domani\s+(?:faccio|chiamo|scrivo|provo|devo|potrei)|proverò\s+a|devo\s+assolutamente|faccio\s+prima\s+a|meglio\s+se)\b/i;

function extractRemindersFallback(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const sentences = text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    if (SERVER_REMINDER_REGEX.test(s)) {
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(s);
      }
    }
  }
  return out;
}

function mergeServerReminders(rawReminders: unknown, text: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (raw: string) => {
    const clean = raw.replace(/^[•\-*\s]+/, '').trim();
    if (clean.length < 4) return;
    const key = clean.toLowerCase();
    for (const existing of seen) {
      if (existing === key || existing.includes(key)) return;
    }
    seen.add(key);
    result.push(clean);
  };

  if (Array.isArray(rawReminders)) {
    for (const item of rawReminders) {
      if (typeof item === 'string') pushUnique(item);
    }
  }
  for (const fb of extractRemindersFallback(text)) {
    pushUnique(fb);
  }
  return result;
}

function inferSuggestedColor(text: string, bullets: string[] = []): SuggestedColor {
  const combined = `${text} ${bullets.join(' ')}`.toLowerCase();

  if (
    /apati|assenza di sentiment|nessun sentiment|vuoto|spento|spenta|grigio|grigia|visione negativa|distacc|indifferent|energia mentale.{0,24}scaric|estremamente scaric|completamente scaric|senza energie|demotivat|blocc|crollo|sfinit|esaurit|non sento nulla|anestetizzat|malissimo/.test(
      combined
    )
  ) {
    return 'anthracite';
  }
  if (
    /rabbia|arrabbi|furios|irritat|emotivit.{0,12}negativ|troppo stress|stress alt|molto stress|ansia|panico|frustr|sopraffatt|esaurimento|forte tensione|pressione alt|agitazion|nervosism|esasperat|odio|esplod/.test(
      combined
    )
  ) {
    return 'red';
  }
  if (
    /stanc|un po' giù|lieve|legger|appesantit|nervos|fastidio|preoccupat|sotto tono|scaric|pausa|riposo|difficil|teso|tesa|stress|\bmale\b/.test(
      combined
    )
  ) {
    return 'light_red';
  }
  if (
    /contentissim|felicissim|molto content|\bcontento\b|\bcontenta\b|entusiast|euforic|splendid|meraviglios|benissimo|alla grande|al top|gioia grande|super positiv|straordinari|soddisfattissim/.test(
      combined
    )
  ) {
    return 'celeste';
  }
  if (
    /abbastanza bene|seren|felic|calmo|calma|rilassat|tranquill|ottim|buon|positiv|gioi|solliev|grat|soddisfatt|caric|energ|lucid|bene|bell/.test(
      combined
    )
  ) {
    return 'sky';
  }
  return 'amber';
}

function sanitizeSuggestedColor(raw: unknown, text: string, bullets: string[]): SuggestedColor {
  if (typeof raw === 'string' && VALID_COLORS.includes(raw as SuggestedColor)) {
    return raw as SuggestedColor;
  }
  return inferSuggestedColor(text, bullets);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function normalizeAudioMimeType(mimeType: string | undefined): string {
  if (!mimeType || typeof mimeType !== 'string') {
    return 'audio/mp4';
  }
  const base = mimeType.split(';')[0].trim().toLowerCase();
  if (base === 'audio/x-m4a' || base === 'video/mp4') {
    return 'audio/mp4';
  }
  if (base === 'audio/wave' || base === 'audio/x-wav') {
    return 'audio/wav';
  }
  if (base === 'video/webm') {
    return 'audio/webm';
  }
  return base || 'audio/mp4';
}

async function callWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeoutMs)
    ),
  ]);
}

function isFailoverEligibleError(err: unknown): boolean {
  const errObj = err as { status?: number; message?: string };
  const msg = errObj?.message || '';
  if (
    msg === 'MISSING_API_KEY' ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    errObj?.status === 403
  ) {
    return false;
  }
  return (
    errObj?.status === 500 ||
    errObj?.status === 502 ||
    errObj?.status === 503 ||
    errObj?.status === 504 ||
    errObj?.status === 429 ||
    errObj?.status === 404 ||
    errObj?.status === 400 ||
    msg === 'GEMINI_TIMEOUT' ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('504') ||
    msg.includes('404') ||
    msg.includes('NOT_FOUND') ||
    msg.toLowerCase().includes('not found') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

interface TranscribeSynthesisResult {
  transcript: string;
  bullets: string[];
  reminders: string[];
  suggestedColor: SuggestedColor;
}

const COLOR_GUIDE_PROMPT = `3. "suggestedColor": scegli ESATTAMENTE uno di questi 6 codici colore in base alla valenza emotiva complessiva dell'appunto (parole e tono):
   - "celeste": (+2 contento — Celeste) umore chiaramente contento, entusiasta, molto felice, benissimo, giornata splendida, slancio positivo forte.
   - "sky": (+1 abbastanza bene — Celeste chiaro) umore abbastanza buono, sereno, calmo, rilassato, sollievo, giornata discreta/positiva.
   - "amber": (0 normale — Ambra) umore normale, neutro, misto, riflessivo, giornata regolare né positiva né negativa.
   - "light_red": (-1 male — Rosso chiaro) umore negativo moderato ("male"), stanchezza, piccolo stress, tensione, disagio o calo di energie.
   - "red": (-2 malissimo ad alta carica — Rosso) umore pessimo con emotività negativa intensa, rabbia, irritazione, agitazione, troppo stress, forte ansia o frustrazione marcata.
   - "anthracite": (-2 malissimo a bassa energia — Antracita) apatia profonda, assenza di sentimenti, distacco emotivo, visione negativa e grigia, energia mentale estremamente scarica o senso di vuoto.`;

const REMINDERS_GUIDE_PROMPT = `4. "reminders": cerca nel testo eventuali cose importanti da ricordare, intenzioni pratiche, idee d'azione o ipotesi su cosa fare/dire/pensare (ad esempio frasi con "potrei fare...", "forse dovrei...", "mi sa che se faccio/dico/penso...", "devo ricordarmi...", "sarebbe meglio se...", "bisogna che...", "magari...", "domani provo...", "non devo dimenticare..."). Riporta l'INTERA frase o le INTERE frasi originali complete così come dette, senza riassumerle né tagliarle. Se non ci sono frasi di questo tipo o se transcript è "[SILENZIO]", restituisci [].`;

async function transcribeAndSynthesizeWithFailover(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string
): Promise<TranscribeSynthesisResult> {
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  let uploadedFile: { uri?: string; mimeType?: string; name?: string } | null = null;

  // Use Gemini Files API for larger audio payloads (>1.5 MB) to improve multi-minute reliability
  if (audioBuffer.length > 1_500_000) {
    try {
      uploadedFile = await callWithTimeout(
        () =>
          ai.files.upload({
            file: new Blob([audioBuffer], { type: mimeType }),
            config: { mimeType },
          }),
        45000
      );
    } catch (uploadErr) {
      console.warn(
        '[Gemini Files upload fallback to inlineData]',
        (uploadErr as Error)?.message?.slice(0, 160)
      );
      uploadedFile = null;
    }
  }

  const audioPart =
    uploadedFile?.uri
      ? {
          fileData: {
            fileUri: uploadedFile.uri,
            mimeType: uploadedFile.mimeType || mimeType,
          },
        }
      : {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        };

  const attempts: Array<{
    model: string;
    thinkingLevel: ThinkingLevel;
    timeoutMs: number;
    backoffMs: number;
  }> = [
    {
      model: 'gemini-3.1-flash-lite',
      thinkingLevel: ThinkingLevel.MINIMAL,
      timeoutMs: 90000,
      backoffMs: 1200,
    },
    {
      model: 'gemini-4-hydrogen',
      thinkingLevel: ThinkingLevel.LOW,
      timeoutMs: 90000,
      backoffMs: 0,
    },
  ];

  const activeAttempts = attempts.filter((cfg) => !isModelKnownExhausted(cfg.model));
  if (activeAttempts.length === 0) {
    const err = new Error('RESOURCE_EXHAUSTED: FreeTier daily quota exhausted until reset') as Error & {
      status?: number;
    };
    err.status = 429;
    throw err;
  }

  let lastError: unknown;

  try {
    for (let i = 0; i < activeAttempts.length; i++) {
      const cfg = activeAttempts[i];
      const t0 = Date.now();
      try {
        const response = await callWithTimeout(
          () =>
            ai.models.generateContent({
              model: cfg.model,
              contents: [
                {
                  role: 'user',
                  parts: [
                    audioPart,
                    {
                      text: `Ascolta con attenzione questa nota vocale personale in italiano (anche se dura diversi minuti o l'audio è colloquiale) e restituisci un JSON valido con quattro campi:
1. "transcript": trascrivi fedelmente in italiano chiaro e scorrevole TUTTO ciò che la persona ha detto dall'inizio alla fine della registrazione, senza omettere o troncare la parte finale. Rispondi "[SILENZIO]" SOLO se non si sente proprio alcuna parola o voce umana.
2. "bullets": individua SUBITO da questo stesso audio da 2 a 4 punti brevi sulle sensazioni, stato d'animo, stress, energia, focus o bisogni della persona (esempi: "Umore: sereno", "Stress: medio-alto", "Energia: stanca", "Focus: esaurito", "Sensazione: sollievo", "Bisogno: fare una pausa"). Deduci le sensazioni sia dalle parole sia dal tono. Niente trattini o pallini iniziali. Se transcript è "[SILENZIO]", restituisci [].
${COLOR_GUIDE_PROMPT}
${REMINDERS_GUIDE_PROMPT}`,
                    },
                  ],
                },
              ],
              config: {
                thinkingConfig: { thinkingLevel: cfg.thinkingLevel },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    transcript: {
                      type: Type.STRING,
                      description: 'Testo completo di ciò che dice la persona in italiano, oppure [SILENZIO].',
                    },
                    bullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Almeno 2-4 punti brevi sulle sensazioni, stato d’animo, stress, focus e bisogni.',
                    },
                    reminders: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Eventuali frasi intere complete con cose importanti da ricordare, intenzioni o azioni da fare.',
                    },
                    suggestedColor: {
                      type: Type.STRING,
                      enum: VALID_COLORS,
                      description: 'Colore consigliato tra celeste (+2), sky (+1), amber (0), light_red (-1), red (-2 rabbia/stress), anthracite (-2 apatia/energia scarica).',
                    },
                  },
                  required: ['transcript', 'bullets', 'reminders', 'suggestedColor'],
                },
              },
            }),
          cfg.timeoutMs
        );

        const rawText = (response.text ?? '').trim();
        let transcript = '';
        let bullets: string[] = [];
        let rawReminders: unknown;
        let rawSuggestedColor: unknown;

        try {
          const parsed = JSON.parse(rawText) as {
            transcript?: unknown;
            bullets?: unknown;
            reminders?: unknown;
            suggestedColor?: unknown;
          };
          transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
          bullets = Array.isArray(parsed.bullets)
            ? parsed.bullets
                .map((item) => String(item ?? '').replace(/^[•\-*\s]+/, '').trim())
                .filter(Boolean)
            : [];
          rawReminders = parsed.reminders;
          rawSuggestedColor = parsed.suggestedColor;
        } catch {
          transcript = rawText.replace(/^["']|["']$/g, '').trim();
        }

        let suggestedColor = sanitizeSuggestedColor(rawSuggestedColor, transcript, bullets);
        let reminders =
          transcript && transcript !== '[SILENZIO]'
            ? mergeServerReminders(rawReminders, transcript)
            : [];

        if (transcript && transcript !== '[SILENZIO]' && bullets.length === 0) {
          try {
            const fallback = await synthesizeMoodBullets(ai, transcript, false);
            bullets = fallback.bullets;
            if (fallback.reminders.length > 0) {
              reminders = mergeServerReminders([...reminders, ...fallback.reminders], transcript);
            }
            if (!rawSuggestedColor) {
              suggestedColor = fallback.suggestedColor;
            }
          } catch {
            // keep transcript even if fallback synthesis fails
          }
        }

        console.log(
          `[Transcribe+Mood ${cfg.model}] ok in ${Date.now() - t0}ms (${bullets.length} sensazioni, ${reminders.length} promemoria, colore=${suggestedColor})`
        );
        recordSuccessfulGeminiUsage();
        return { transcript, bullets, reminders, suggestedColor };
      } catch (err) {
        lastError = err;
        const msg = (err as Error)?.message || String(err);
        console.warn(
          `[Transcribe attempt ${i + 1} (${cfg.model}) failed in ${Date.now() - t0}ms]`,
          msg.slice(0, 220)
        );
        if ((err as { status?: number })?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
          markModelQuotaExhausted(cfg.model, err);
        }
        if (!isFailoverEligibleError(err) || i === activeAttempts.length - 1) {
          throw err;
        }
        if (cfg.backoffMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, cfg.backoffMs));
        }
      }
    }

    if (!isModelKnownExhausted('gemini-3.5-transcribe')) {
      const t0 = Date.now();
      try {
        const transcribeResp = await callWithTimeout(
          () =>
            ai.models.generateContent({
              model: 'gemini-3.5-transcribe',
              contents: {
                parts: [
                  audioPart,
                  {
                    text: 'Transcribe this audio faithfully in Italian. Reply "[SILENZIO]" only if there is no spoken voice at all.',
                  },
                ],
              },
            }),
          90000
        );
        const transcript = (transcribeResp.text ?? '').trim();
        let bullets: string[] = [];
        let reminders: string[] = [];
        let suggestedColor: SuggestedColor = inferSuggestedColor(transcript);
        if (transcript && transcript !== '[SILENZIO]') {
          try {
            const synth = await synthesizeMoodBullets(ai, transcript, false);
            bullets = synth.bullets;
            reminders = synth.reminders;
            suggestedColor = synth.suggestedColor;
          } catch {
            reminders = extractRemindersFallback(transcript);
          }
        }
        console.log(`[Transcribe gemini-3.5-transcribe] ok in ${Date.now() - t0}ms`);
        recordSuccessfulGeminiUsage();
        return { transcript, bullets, reminders, suggestedColor };
      } catch (transcribeErr) {
        lastError = transcribeErr;
      }
    }
  } finally {
    if (uploadedFile?.name) {
      ai.files.delete({ name: uploadedFile.name }).catch(() => {});
    }
  }

  throw lastError;
}

async function synthesizeMoodBullets(
  ai: GoogleGenAI,
  text: string,
  isDailyOverview = false
): Promise<{ bullets: string[]; reminders: string[]; suggestedColor: SuggestedColor }> {
  const attempts: Array<{
    model: string;
    thinkingLevel: ThinkingLevel;
    timeoutMs: number;
    backoffMs: number;
  }> = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 28000, backoffMs: 800 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 25000, backoffMs: 0 },
  ];

  const activeAttempts = attempts.filter((cfg) => !isModelKnownExhausted(cfg.model));
  if (activeAttempts.length === 0) {
    const err = new Error('RESOURCE_EXHAUSTED: FreeTier daily quota exhausted until reset') as Error & {
      status?: number;
    };
    err.status = 429;
    throw err;
  }

  const prompt = isDailyOverview
    ? `Analizza tutti gli appunti della giornata riportati qui sotto (relativi a stati d'animo, stress, energie, focus e sensazioni) e restituisci:
1. "bullets": una sintesi complessiva della giornata in 3-5 punti chiave molto concisi in italiano (esempio: "Stress: medio-alto nel pomeriggio", "Focus: esaurito a fine giornata", "Bisogno: pausa e recupero"). Non aggiungere simboli di elenco all'inizio delle stringhe.
${COLOR_GUIDE_PROMPT}

Appunti della giornata:
"""
${text}
"""`
    : `Analizza questo appunto personale su stati d'animo, stress, focus, energie e sensazioni, e restituisci:
1. "bullets": una sintesi in 2-4 punti molto brevi e diretti in italiano. Usa etichette sintetiche chiare quando pertinenti (esempi: "Stress: alto", "Focus: esaurito", "Energia: bassa", "Umore: teso", "Bisogno: staccare e riposare"). Non aggiungere trattini o pallini iniziali.
${COLOR_GUIDE_PROMPT}
${REMINDERS_GUIDE_PROMPT}

Testo dell'appunto:
"""
${text}
"""`;

  for (let i = 0; i < activeAttempts.length; i++) {
    const cfg = activeAttempts[i];
    const t0 = Date.now();
    try {
      const response = await callWithTimeout(
        () =>
          ai.models.generateContent({
            model: cfg.model,
            contents: prompt,
            config: {
              thinkingConfig: { thinkingLevel: cfg.thinkingLevel },
              systemInstruction:
                'Sei un assistente discreto per il diario personale di stati d’animo, stress e sensazioni. Rispondi esclusivamente in JSON valido secondo lo schema.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  bullets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Lista di punti sintetici su stato d’animo, stress, focus e bisogni.',
                  },
                  ...(isDailyOverview
                    ? {}
                    : {
                        reminders: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description:
                            'Eventuali frasi intere complete con cose da ricordare, intenzioni o azioni da fare.',
                        },
                      }),
                  suggestedColor: {
                    type: Type.STRING,
                    enum: VALID_COLORS,
                    description:
                      'Colore consigliato tra celeste (+2), sky (+1), amber (0), light_red (-1), red (-2 rabbia/stress), anthracite (-2 apatia/energia scarica).',
                  },
                },
                required: isDailyOverview
                  ? ['bullets', 'suggestedColor']
                  : ['bullets', 'reminders', 'suggestedColor'],
              },
            },
          }),
        cfg.timeoutMs
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        bullets?: unknown;
        reminders?: unknown;
        suggestedColor?: unknown;
      };
      const bullets = Array.isArray(parsed.bullets)
        ? parsed.bullets
            .map((item) => String(item ?? '').replace(/^[•\-*\s]+/, '').trim())
            .filter(Boolean)
        : [];
      const reminders = isDailyOverview ? [] : mergeServerReminders(parsed.reminders, text);
      const suggestedColor = sanitizeSuggestedColor(parsed.suggestedColor, text, bullets);
      console.log(
        `[MoodBullets ${cfg.model}] ok in ${Date.now() - t0}ms (${bullets.length} punti, ${reminders.length} promemoria, colore=${suggestedColor})`
      );
      recordSuccessfulGeminiUsage();
      return { bullets, reminders, suggestedColor };
    } catch (err) {
      const msg = (err as Error)?.message || String(err);
      console.warn(
        `[MoodBullets attempt ${i + 1} (${cfg.model}) failed in ${Date.now() - t0}ms]`,
        msg.slice(0, 220)
      );
      if ((err as { status?: number })?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        markModelQuotaExhausted(cfg.model, err);
      }
      if (!isFailoverEligibleError(err) || i === activeAttempts.length - 1) {
        throw err;
      }
      if (cfg.backoffMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, cfg.backoffMs));
      }
    }
  }

  return {
    bullets: [],
    reminders: isDailyOverview ? [] : extractRemindersFallback(text),
    suggestedColor: inferSuggestedColor(text),
  };
}

function handleGeminiError(
  error: unknown,
  res: express.Response,
  mode: 'audio' | 'text' = 'audio'
) {
  const errObj = error as { status?: number; message?: string };
  const message = errObj?.message || 'Errore imprevisto durante l’elaborazione.';

  if (message.includes('RESOURCE_EXHAUSTED') || errObj?.status === 429) {
    console.warn('[Gemini Quota/Rate Limit 429]', message.slice(0, 220));
    const parsedQuota = parseQuotaDetailsFromError(error);
    if (parsedQuota.isDailyFreeTier) {
      markGlobalDailyQuotaExhausted(error);
    }
    const dailyMsg =
      mode === 'text'
        ? 'Quota giornaliera gratuita dell’API Gemini esaurita (condivisa tra voce e testo). Riprova dopo il reset oppure modifica sensazioni e colore manualmente.'
        : 'Quota giornaliera gratuita dell’API Gemini esaurita (condivisa tra voce e testo). Riprova dopo il reset oppure usa "Salva solo audio".';
    return res.status(429).json({
      error: parsedQuota.isDailyFreeTier
        ? dailyMsg
        : 'Limite temporaneo di richieste API raggiunto. Attendi qualche secondo e riprova.',
      quota: getPublicQuotaSnapshot(),
    });
  }

  console.error('[Gemini API Error]', error);

  if (message === 'MISSING_API_KEY') {
    return res.status(500).json({
      error: 'Chiave GEMINI_API_KEY non configurata. Controlla il pannello Settings > Secrets.',
      quota: getPublicQuotaSnapshot(),
    });
  }
  if (message === 'GEMINI_TIMEOUT') {
    return res.status(504).json({
      error: 'La richiesta sta impiegando troppo tempo. Riprova tra qualche secondo.',
      quota: getPublicQuotaSnapshot(),
    });
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID') || errObj?.status === 403) {
    return res.status(403).json({
      error: 'Chiave API non valida o permessi insufficienti. Verifica GEMINI_API_KEY in Settings > Secrets.',
      quota: getPublicQuotaSnapshot(),
    });
  }
  if (message.includes('UNAVAILABLE') || errObj?.status === 503) {
    return res.status(503).json({
      error: 'Il servizio AI è temporaneamente sovraccarico. Riprova tra qualche secondo.',
      quota: getPublicQuotaSnapshot(),
    });
  }
  return res.status(500).json({
    error: `Errore durante l’elaborazione: ${message}`,
    quota: getPublicQuotaSnapshot(),
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/quota', (_req, res) => {
    res.json({ quota: getPublicQuotaSnapshot() });
  });

  app.post('/api/quota/sync', (req, res) => {
    const body = (req.body || {}) as { quota?: unknown };
    res.json({ quota: syncClientQuotaState(body.quota) });
  });



  app.post('/api/notes/transcribe', async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType,
        durationSeconds,
        sizeBytes,
        recordedAt,
      } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        durationSeconds?: number;
        sizeBytes?: number;
        recordedAt?: string;
      };

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return res.status(400).json({ error: 'Nessun dato audio ricevuto dal microfono.' });
      }

      const now = new Date();
      const cleanMime = normalizeAudioMimeType(mimeType);
      const ai = getGeminiClient();

      // Single combined Gemini call: faithful transcription + sensations bullets + reminders + color
      const { transcript, bullets, reminders, suggestedColor } =
        await transcribeAndSynthesizeWithFailover(ai, audioBase64, cleanMime);

      if (!transcript || transcript === '[SILENZIO]' || transcript.toLowerCase() === 'silenzio') {
        return res.status(422).json({
          error:
            'Non è stato rilevato alcun parlato nella registrazione. Riprova parlando più vicino al microfono.',
          quota: getPublicQuotaSnapshot(),
        });
      }

      return res.json({
        transcript,
        bullets,
        reminders,
        suggestedColor,
        quota: getPublicQuotaSnapshot(),
        audioMetadata: {
          recordedAt: recordedAt || now.toISOString(),
          durationSeconds:
            typeof durationSeconds === 'number' ? Math.max(1, Math.round(durationSeconds)) : 1,
          mimeType: cleanMime,
          sizeBytes:
            typeof sizeBytes === 'number'
              ? sizeBytes
              : Math.round((audioBase64.length * 3) / 4),
          hasAudioClip: true,
        },
      });
    } catch (error) {
      return handleGeminiError(error, res, 'audio');
    }
  });

  app.post('/api/notes/summarize-mood', async (req, res) => {
    try {
      const { text, isDailyOverview } = req.body as {
        text?: string;
        isDailyOverview?: boolean;
      };

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Nessun testo da analizzare.' });
      }

      const ai = getGeminiClient();
      const { bullets, reminders, suggestedColor } = await synthesizeMoodBullets(
        ai,
        text.trim(),
        Boolean(isDailyOverview)
      );

      return res.json({ bullets, reminders, suggestedColor, quota: getPublicQuotaSnapshot() });
    } catch (error) {
      return handleGeminiError(error, res, 'text');
    }
  });

  app.post('/api/notes/transcribe-todo', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return res.status(400).json({ error: 'Nessun audio ricevuto.' });
      }
      const cleanMime = normalizeAudioMimeType(mimeType);
      const ai = getGeminiClient();

      const todoAttempts: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
        { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
        { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
      ].filter((a) => !isModelKnownExhausted(a.model));

      if (todoAttempts.length === 0 && isModelKnownExhausted('gemini-3.5-transcribe')) {
        return res.status(429).json({
          error: 'Richieste AI di oggi esaurite: scrivi la nota manualmente.',
          quota: getPublicQuotaSnapshot(),
        });
      }

      const catEmoticonIds = CAT_EMOTICON_IDS;

      let lastErr: unknown;
      for (const attempt of todoAttempts) {
        try {
          const response = await callWithTimeout(
            () =>
              ai.models.generateContent({
                model: attempt.model,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { inlineData: { mimeType: cleanMime, data: audioBase64 } },
                      {
                        text: `Trascrivi fedelmente questa breve nota vocale da fare in italiano e scegli l'ID icona del gatto MicioMiao più inerente al significato del testo tra quelli consentiti (es. benzina/gpl/diesel/rifornimento -> "cat_fuel", barbiere/barber/capelli/barba -> "cat_barber", auto/gomme/meccanico -> "cat_car", doccia/bagno/lavarsi -> "cat_shower", pulizie/bucato/spazzare -> "cat_clean", bollette/pagamenti/banca -> "cat_bills", cane/gatto/veterinario -> "cat_pet", spesa/supermercato/comprare -> "cat_shop", dottore/farmacia/visita -> "cat_health", caffè/colazione -> "cat_coffee", pranzo/cena/cucinare -> "cat_food", chiamata/messaggio -> "cat_call", lavoro/ufficio/email -> "cat_work", sport/palestra -> "cat_sport", urgente -> "cat_fire"). Restituisci SOLO JSON con "text" e "emoji". Se non c'è parlato metti text="[SILENZIO]".`,
                      },
                    ],
                  },
                ],
                config: {
                  thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      emoji: { type: Type.STRING, enum: catEmoticonIds },
                    },
                    required: ['text', 'emoji'],
                  },
                },
              }),
            45000
          );

          const parsed = JSON.parse((response.text ?? '{}').trim()) as {
            text?: string;
            emoji?: string;
          };
          const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
          if (!text || text === '[SILENZIO]') {
            return res.status(422).json({
              error: 'Nessuna parola rilevata nella registrazione.',
              quota: getPublicQuotaSnapshot(),
            });
          }
          recordSuccessfulGeminiUsage();
          return res.json({
            text,
            emoji:
              typeof parsed.emoji === 'string' && catEmoticonIds.includes(parsed.emoji.trim())
                ? parsed.emoji.trim()
                : 'cat_note',
            quota: getPublicQuotaSnapshot(),
          });
        } catch (err) {
          lastErr = err;
          if ((err as { status?: number })?.status === 429) {
            markModelQuotaExhausted(attempt.model, err);
          }
          if (!isFailoverEligibleError(err)) break;
        }
      }

      if (!isModelKnownExhausted('gemini-3.5-transcribe')) {
        try {
          const transcribeResp = await callWithTimeout(
            () =>
              ai.models.generateContent({
                model: 'gemini-3.5-transcribe',
                contents: {
                  parts: [
                    { inlineData: { mimeType: cleanMime, data: audioBase64 } },
                    { text: 'Transcribe this audio in Italian. Reply "[SILENZIO]" if empty.' },
                  ],
                },
              }),
            45000
          );
          const text = (transcribeResp.text ?? '').trim();
          if (!text || text === '[SILENZIO]') {
            return res.status(422).json({
              error: 'Nessuna parola rilevata nella registrazione.',
              quota: getPublicQuotaSnapshot(),
            });
          }
          recordSuccessfulGeminiUsage();
          return res.json({
            text,
            emoji: 'cat_note',
            quota: getPublicQuotaSnapshot(),
          });
        } catch (transcribeErr) {
          lastErr = transcribeErr;
        }
      }
      throw lastErr;
    } catch (error) {
      return handleGeminiError(error, res, 'audio');
    }
  });

  app.post('/api/notes/parse-batch-todos', async (req, res) => {
    const { rawText } = req.body as { rawText?: string };
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Incolla almeno una riga di testo.' });
    }

    // Strict 1-line = 1-note rule: keep multiple activities on the same line together on one row
    const fallbackLines = rawText
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)]|\[[ xX]?\])\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 60);

    if (fallbackLines.length === 0) {
      return res.status(400).json({ error: 'Incolla almeno una riga di testo.' });
    }

    try {
      const batchAttempts: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
        { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
        { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
      ].filter((a) => !isModelKnownExhausted(a.model));
      if (batchAttempts.length === 0) {
        return res.json({
          items: fallbackLines.map((text) => ({ text, emoji: '' })),
          usedFallback: true,
          quota: getPublicQuotaSnapshot(),
        });
      }

      const catEmoticonIds = CAT_EMOTICON_IDS;

      const numberedLines = fallbackLines.map((line, i) => `${i}: ${line}`).join('\n');

      const ai = getGeminiClient();
      const chosen = batchAttempts[0];
      const response = await callWithTimeout(
        () =>
          ai.models.generateContent({
            model: chosen.model,
            contents: `Associa a ciascuna delle ${fallbackLines.length} righe numerate l'ID icona del gatto MicioMiao più inerente al testo (es. benzina/gpl/rifornimento -> "cat_fuel", barber/barbiere/capelli -> "cat_barber", auto/revisione -> "cat_car", doccia -> "cat_shower", pulizie/bucato -> "cat_clean", bollette/pagamenti -> "cat_bills", cane/gatto -> "cat_pet", spesa/acquisti -> "cat_shop", dottore/salute -> "cat_health", caffè -> "cat_coffee", cibo/cena -> "cat_food", chiamare -> "cat_call", lavoro -> "cat_work", sport -> "cat_sport").
REGOLA ASSOLUTA: ogni riga numerata DEVE restare UNA SOLA nota. Anche se su una stessa riga ci sono più attività (separate da virgole, "e", ";", "/" o trattini), NON dividerle MAI su più note: mantieni tutte le attività di quella riga in una riga sola. Restituisci esattamente un elemento per ogni indice da 0 a ${fallbackLines.length - 1}.

Righe:
"""
${numberedLines.slice(0, 6000)}
"""`,
            config: {
              thinkingConfig: { thinkingLevel: chosen.thinkingLevel },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        index: { type: Type.INTEGER },
                        emoji: { type: Type.STRING, enum: catEmoticonIds },
                      },
                      required: ['index', 'emoji'],
                    },
                  },
                },
                required: ['items'],
              },
            },
          }),
        25000
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        items?: Array<{ index?: unknown; emoji?: unknown }>;
      };
      const emojiByIndex = new Map<number, string>();
      if (Array.isArray(parsed.items)) {
        for (const it of parsed.items) {
          if (
            typeof it?.index === 'number' &&
            Number.isInteger(it.index) &&
            typeof it?.emoji === 'string' &&
            catEmoticonIds.includes(it.emoji.trim())
          ) {
            emojiByIndex.set(it.index, it.emoji.trim());
          }
        }
      }

      const items = fallbackLines.map((text, idx) => ({
        text,
        emoji: emojiByIndex.get(idx) || '',
      }));

      recordSuccessfulGeminiUsage();
      return res.json({
        items,
        usedFallback: false,
        quota: getPublicQuotaSnapshot(),
      });
    } catch {
      return res.json({
        items: fallbackLines.map((text) => ({ text, emoji: '' })),
        usedFallback: true,
        quota: getPublicQuotaSnapshot(),
      });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API non trovato sul server.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.get('/@vite/client', async (req, res, next) => {
      try {
        const result = await vite.transformRequest(req.originalUrl);
        if (!result) return next();
        const patchedCode = result.code.replace(
          'transport.connect(createHMRHandler(handleMessage));',
          'transport.send = async () => {}; transport.disconnect = async () => {}; /* HMR WebSocket disabled in preview */'
        );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.send(patchedCode);
      } catch (err) {
        return next(err);
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgendaVoce server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
