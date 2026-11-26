import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const QUOTA_CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache');
const QUOTA_STATE_FILES = [
  '/tmp/agendavoce-quota-state.json',
  path.join(QUOTA_CACHE_DIR, 'agendavoce-quota-state.json'),
];
const DEFAULT_FREE_TIER_LIMIT = 20;

interface ServerTranscribeLogEntry {
  id: string;
  timestamp: string;
  source: 'server' | 'client';
  traceId: string;
  stage: string;
  level: 'info' | 'warn' | 'error';
  details: Record<string, unknown>;
}

const MAX_SERVER_TRANSCRIBE_LOGS = 100;
const serverTranscribeLogs: ServerTranscribeLogEntry[] = [];

function appendServerTranscribeLog(
  entry: Omit<ServerTranscribeLogEntry, 'id' | 'timestamp'>
): ServerTranscribeLogEntry {
  const full: ServerTranscribeLogEntry = {
    id: `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  serverTranscribeLogs.push(full);
  if (serverTranscribeLogs.length > MAX_SERVER_TRANSCRIBE_LOGS) {
    serverTranscribeLogs.splice(0, serverTranscribeLogs.length - MAX_SERVER_TRANSCRIBE_LOGS);
  }
  const tag = `[TranscribeDebug][${full.source}][${full.traceId}][${full.stage}]`;
  if (full.level === 'error') {
    console.error(tag, JSON.stringify(full.details));
  } else if (full.level === 'warn') {
    console.warn(tag, JSON.stringify(full.details));
  } else {
    console.info(tag, JSON.stringify(full.details));
  }
  return full;
}

function extractCookieKeyNames(cookieHeader: string | undefined): string[] {
  if (!cookieHeader || typeof cookieHeader !== 'string') return [];
  return cookieHeader
    .split(';')
    .map((part) => part.split('=')[0]?.trim() || '')
    .filter(Boolean)
    .slice(0, 25);
}

function sanitizeUrlPathOnly(rawUrl: string | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const u = new URL(rawUrl);
    return `${u.origin}${u.pathname}`;
  } catch {
    return rawUrl.split('?')[0]?.slice(0, 140) || null;
  }
}

function buildSanitizedReqMeta(req: express.Request) {
  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;
  const iapHeader = req.headers['x-goog-iap-jwt-assertion'];
  const cookieKeyNames = extractCookieKeyNames(cookieHeader);

  return {
    method: req.method,
    originalUrl: req.originalUrl,
    host: req.headers.host || null,
    forwardedHost: req.headers['x-forwarded-host'] || null,
    forwardedProto: req.headers['x-forwarded-proto'] || null,
    origin: req.headers.origin || null,
    referer: sanitizeUrlPathOnly(
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined
    ),
    hasCookieHeader: Boolean(cookieHeader && cookieHeader.trim().length > 0),
    cookieKeyNames,
    hasAuthorizationHeader: Boolean(authHeader && authHeader.trim().length > 0),
    hasIapJwt: Boolean(iapHeader),
    clientCookiePresentHeader: req.headers['x-session-cookie-present'] || null,
    clientMicPermissionHeader: req.headers['x-mic-permission'] || null,
    clientCaller: req.headers['x-transcribe-caller'] || null,
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    isVercel: Boolean(process.env.VERCEL),
  };
}

function detectSessionSeenLabel(meta: ReturnType<typeof buildSanitizedReqMeta>): string {
  const parts: string[] = [];
  if (meta.hasCookieHeader) parts.push('cookie');
  if (meta.hasAuthorizationHeader) parts.push('auth');
  if (meta.hasIapJwt) parts.push('iap');
  if (parts.length > 0) return parts.join('+');
  return meta.isVercel ? 'vercel-direct' : 'direct';
}

function resolveTraceId(req: express.Request): string {
  const fromHeader = req.headers['x-transcribe-trace-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim().slice(0, 80);
  }
  const bodyObj = req.body as { debugContext?: { traceId?: unknown } } | undefined;
  if (typeof bodyObj?.debugContext?.traceId === 'string' && bodyObj.debugContext.traceId.trim()) {
    return bodyObj.debugContext.traceId.trim().slice(0, 80);
  }
  return `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function redactSensitiveObject(input: unknown, depth = 0): unknown {
  if (depth > 4 || input == null) return input;
  if (typeof input === 'string') return input.slice(0, 500);
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.slice(0, 30).map((item) => redactSensitiveObject(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (
      lower === 'cookie' ||
      lower === 'cookies' ||
      lower === 'authorization' ||
      lower === 'token' ||
      lower === 'apikey' ||
      lower === 'gemini_api_key' ||
      lower === 'audiobase64'
    ) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactSensitiveObject(v, depth + 1);
    }
  }
  return out;
}

export const CAT_EMOTICON_IDS = [
  'cat_note',
  'cat_fuel',
  'cat_barber',
  'cat_car',
  'cat_train',
  'cat_plane',
  'cat_shower',
  'cat_clean',
  'cat_laundry',
  'cat_trash',
  'cat_home',
  'cat_repair',
  'cat_garden',
  'cat_package',
  'cat_bills',
  'cat_bank',
  'cat_pet',
  'cat_health',
  'cat_pharmacy',
  'cat_dentist',
  'cat_shop',
  'cat_food',
  'cat_cook',
  'cat_pizza',
  'cat_coffee',
  'cat_water',
  'cat_drink',
  'cat_call',
  'cat_email',
  'cat_work',
  'cat_paperwork',
  'cat_computer',
  'cat_battery',
  'cat_book',
  'cat_sport',
  'cat_meditate',
  'cat_bike',
  'cat_music',
  'cat_movie',
  'cat_game',
  'cat_camera',
  'cat_gift',
  'cat_clothes',
  'cat_bag',
  'cat_shoes',
  'cat_glasses',
  'cat_clock',
  'cat_bed',
  'cat_sun',
  'cat_mountain',
  'cat_baby',
  'cat_keys',
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
  for (const filePath of QUOTA_STATE_FILES) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized);
    } catch {
      // ignore read-only filesystem errors (e.g. serverless)
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

const unsupportedModels = new Set<string>();
const modelTransientUnavailableUntil: Record<string, number> = {};

function markModelTransientUnavailable(model: string, ttlMs = 120_000) {
  modelTransientUnavailableUntil[model] = Date.now() + ttlMs;
}

function isModelTemporarilyUnavailable(model: string): boolean {
  const until = modelTransientUnavailableUntil[model];
  return typeof until === 'number' && Date.now() < until;
}

function isTransientServiceError(err: unknown): boolean {
  const errObj = err as { status?: number; message?: string };
  const msg = errObj?.message || '';
  return (
    errObj?.status === 503 ||
    errObj?.status === 504 ||
    errObj?.status === 502 ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg === 'GEMINI_TIMEOUT'
  );
}

function isModelKnownExhausted(model: string): boolean {
  if (unsupportedModels.has(model)) return true;
  ensureCurrentQuotaWindow();
  const until = quotaState.modelExhaustedUntil[model];
  return typeof until === 'number' && Date.now() < until;
}

function isModelNotFoundError(err: unknown): boolean {
  const errObj = err as { status?: number; message?: string };
  const msg = (errObj?.message || '').toLowerCase();
  return errObj?.status === 404 || msg.includes('not_found') || msg.includes('not found');
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
  /\b(potrei|forse\s+dovrei|forse\s+potrei|dovrei|mi\s+sa\s+che|se\s+(?:faccio|dico|penso|provo|chiedo|chiamo|scrivo|vado|aspetto|lascio|parlo|provo\s+a)|devo\s+(?:fare|dire|ricordar|chiamar|scriver|mandar|inviar|parlar|comprar|prenotar|pagar|controllar|fissar|organizzar|finir|mandare|capire|provare|cambiare|migliorare)|ricordarmi|da\s+ricordare|non\s+(?:devo\s+)?dimenticar|sarebbe\s+(?:meglio|utile|opportuno|bene)|converrebbe|mi\s+conviene|bisogna\s+che|bisognerebbe|magari\s+(?:faccio|provo|chiamo|scrivo|prendo|cambio|proviamo)|appena\s+posso|la\s+prossima\s+volta|domani\s+(?:faccio|chiamo|scrivo|provo|devo|potrei)|proverò\s+a|devo\s+assolutamente|faccio\s+prima\s+a|meglio\s+se|mi\s+chiedo|mi\s+domando|chissà\s+(?:se|come|perché|cosa)|come\s+(?:posso|faccio|potrei|dovrei|riuscire)|perché\s+(?:mi\s+sento|non\s+riesco|faccio|succede|continuo)|cosa\s+(?:posso|potrei|dovrei|mi\s+fa|è\s+meglio)|ha\s+senso|vale\s+la\s+pena|e\s+se\s+(?:provassi|provo|facessi|faccio|cambiassi)|vorrei\s+(?:capire|provare|riuscire|stare\s+meglio)|benessere|modo\s+di\s+vivere|stile\s+di\s+vita|per\s+stare\s+meglio|per\s+(?:il\s+mio\s+)?focus|per\s+concentrarmi|una\s+soluzione\s+(?:è|sarebbe|potrebbe)|un['’]?idea\s+sarebbe|mi\s+farebbe\s+bene|mi\s+aiuterebbe\s+a)\b/i;

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
    const isQuestion = s.includes('?') && s.length >= 8;
    if (isQuestion || SERVER_REMINDER_REGEX.test(s)) {
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

function getGeminiV1BetaClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ModelAttemptConfig {
  model: string;
  thinkingLevel: ThinkingLevel | null;
  timeoutMs: number;
  backoffMs: number;
}

function getHealthyModelAttempts(timeoutMs = 55000): ModelAttemptConfig[] {
  const allCandidates: ModelAttemptConfig[] = [
    { model: 'gemini-3.5-flash-lite', thinkingLevel: null, timeoutMs, backoffMs: 500 },
    { model: 'gemini-3.5-flash', thinkingLevel: null, timeoutMs, backoffMs: 500 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs, backoffMs: 600 },
    { model: 'gemini-3.6-flash', thinkingLevel: null, timeoutMs, backoffMs: 500 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs, backoffMs: 0 },
  ];

  const nonExhausted = allCandidates.filter((cfg) => !isModelKnownExhausted(cfg.model));
  const nonCooled = nonExhausted.filter((cfg) => !isModelTemporarilyUnavailable(cfg.model));
  return nonCooled.length > 0 ? nonCooled : nonExhausted;
}

function normalizeAudioMimeType(mimeType: string | undefined): string {
  if (!mimeType || typeof mimeType !== 'string') {
    return 'audio/mp4';
  }
  const base = mimeType.split(';')[0].trim().toLowerCase();
  if (base === 'audio/x-m4a' || base === 'video/mp4' || base === 'audio/m4a') {
    return 'audio/mp4';
  }
  if (base === 'audio/wave' || base === 'audio/x-wav') {
    return 'audio/wav';
  }
  if (base === 'video/webm') {
    return 'audio/webm';
  }
  if (base === 'audio/x-mp3' || base === 'audio/mpeg3') {
    return 'audio/mp3';
  }
  return base || 'audio/mp4';
}

function parseGeminiJson<T>(raw: string): T | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function inferSpecificServerCatIcon(text: string): string | null {
  const clean = (text || '').trim();
  if (!clean) return null;

  // 1. High-specificity compound phrases & everyday objects
  if (/\b(lavatric\w*|asciugatric\w*|bucat\w*|panni\b|stend\w*|stirar\w*|stiro|lavanderi\w*|detersiv\w*)\b/i.test(clean)) return 'cat_laundry';
  if (/\b(lavaggio\s+auto|(pulir\w*|pulisc\w*|lavar\w*)\s+(l['’]?\s*)?(auto|macchina))\b/i.test(clean)) return 'cat_car';
  if (/\b(pulisc\w*|pulir\w*|puliz\w*|pulit\w*|spolver\w*|riordin\w*|aspirapolver\w*|mocio|igienizz\w*|sanific\w*|scopar\w*|piatt\w*|lavastovigli\w*|paviment\w*|sgrass\w*)\b/i.test(clean)) return 'cat_clean';
  if (/\b(bors[ae]|borsett\w*|zain\w*|tracoll\w*|marsupio|sacca(\s+palestra)?|valigett\w*|tote|trolley)\b/i.test(clean)) return 'cat_bag';
  if (/\b(scarp\w*|sneaker\w*|stival\w*|ciabatt\w*|sandal\w*|calzatur\w*)\b/i.test(clean)) return 'cat_shoes';
  if (/\b(occhial\w*|lenti(\s+a\s+contatto)?|ottico|colliri\w*)\b/i.test(clean)) return 'cat_glasses';
  if (/\b(caricar\w*\s+(il\s+)?(telefono|cellulare|iphone|watch|orologio|powerbank|tablet|cuffie)|batteri\w*|powerbank|caricator\w*|caricabatteri\w*)\b/i.test(clean)) return 'cat_battery';
  if (/\b(rifar\w*\s+(il\s+)?letto|cambi\w*\s+(le\s+)?lenzuol\w*|lenzuol\w*|fedor\w*|copripiumin\w*)\b/i.test(clean)) return 'cat_bed';
  if (/\b(lavar\w*\s+i\s+denti|spazzolin\w*|dentist\w*|denti|carie|igiene\s+dentale)\b/i.test(clean)) return 'cat_dentist';
  if (/\b(ber[ei]\s+(pi[uù]\s+)?acqua|borraccia|idrataz\w*)\b/i.test(clean)) return 'cat_water';

  // 2. Domain keywords in strict priority order
  if (/\b(benzin\w*|gpl|diesel|gasolio|riforniment\w*|carburant\w*|benzinaio)\b/i.test(clean)) return 'cat_fuel';
  if (/\b(barber\w*|barbier\w*|parrucchier\w*|capell\w*|barba)\b/i.test(clean)) return 'cat_barber';
  if (/\b(pacco|pacchi|corriere|spedizion\w*|posta|poste|ufficio\s+postale|amazon|vinted)\b/i.test(clean)) return 'cat_package';
  if (/\b(document\w*|patente|passaport\w*|carta\s+d['’]identit[aà]|anagrafe|pratic[ae]|spid|firma\w*)\b/i.test(clean)) return 'cat_paperwork';
  if (/\b(spazzatur\w*|immondiz\w*|differenziat\w*|ricicl\w*|rifiut\w*|bidon\w*|umido|organico)\b/i.test(clean)) return 'cat_trash';
  if (/\b(farmac\w*|pillol\w*|medicin\w*|tachipirin\w*|ibuprofen\w*|ricett\w*|integrator\w*)\b/i.test(clean)) return 'cat_pharmacy';
  if (/\b(ripar\w*|aggiust\w*|attrezz\w*|martell\w*|trapan\w*|cacciavit\w*|idraulic\w*|elettricist\w*|ferrament\w*|caldaia)\b/i.test(clean)) return 'cat_repair';
  if (/\b(piant\w*|giardin\w*|fior\w*|innaffi\w*|potar\w*|orto|vaso|vasi)\b/i.test(clean)) return 'cat_garden';
  if (/\b(treno|stazion\w*|metro|metropolitan\w*|bus|autobus|tram)\b/i.test(clean)) return 'cat_train';
  if (/\b(aere\w*|volo|voli|aeroport\w*|valigi\w*|imbarc\w*|viagg\w*)\b/i.test(clean)) return 'cat_plane';
  if (/\b(chiav\w*|serratur\w*|lucchett\w*)\b/i.test(clean)) return 'cat_keys';
  if (/\b(svegli\w*|orolog\w*|puntual\w*|appuntament\w*|promemori\w*)\b/i.test(clean)) return 'cat_clock';
  if (/\b(vestit\w*|magli\w*|pantalon\w*|armadi\w*|camic\w*|giacc\w*)\b/i.test(clean)) return 'cat_clothes';
  if (/\b(banc\w*|bancomat|bonific\w*|portafogli|preliev\w*|euro|sold\w*|pagar\w*)\b/i.test(clean)) return 'cat_bank';
  if (/\b(bollett\w*|fattur\w*|affitt\w*|tass\w*|abbonament\w*|f24|multa)\b/i.test(clean)) return 'cat_bills';
  if (/\b(pizz\w*|hamburger|kebab|panin\w*|takeaway|asporto)\b/i.test(clean)) return 'cat_pizza';
  if (/\b(aperitiv\w*|spritz|birr\w*|vino|cocktail|bevand\w*)\b/i.test(clean)) return 'cat_drink';
  if (/\b(caff[eè]|colazion\w*|cappuccin\w*|cornett\w*|bar\b)\b/i.test(clean)) return 'cat_coffee';
  if (/\b(cucin\w*|pentol\w*|padell\w*|fornell\w*|soffritto|sugo|bollir\w*)\b/i.test(clean)) return 'cat_cook';
  if (/\b(pranz\w*|cen[ae]|mangiar\w*|ristorant\w*|cibo|sushi)\b/i.test(clean)) return 'cat_food';
  if (/\b(docci\w*|shampoo|skincare|sapone|crema|depilaz\w*)\b/i.test(clean)) return 'cat_shower';
  if (/\b(dottor\w*|medic\w*|visit\w*|analis\w*|salut\w*|ospedal\w*)\b/i.test(clean)) return 'cat_health';
  if (/\b(can[ei]|gatt\w*|mici\w*|veterinar\w*|croccant\w*|lettier\w*)\b/i.test(clean)) return 'cat_pet';
  if (/\b(auto|macchin\w*|gomm\w*|meccanic\w*|tagliand\w*|revisione|parchegg\w*)\b/i.test(clean)) return 'cat_car';
  if (/\b(spes\w*|supermercat\w*|compro|compri|compra|comprar\w*|acquist\w*|negoz\w*|pane|latte|frutta|verdur\w*)\b/i.test(clean)) return 'cat_shop';
  if (/\b(email|mail|e-mail|pec|inviar\w*|mandar\w*\s+mail)\b/i.test(clean)) return 'cat_email';
  if (/\b(chiam\w*|telefon\w*|whatsapp|sms|contattar\w*)\b/i.test(clean)) return 'cat_call';
  if (/\b(pc\b|computer|portatil\w*|laptop|schermo|stampant\w*|software|tablet)\b/i.test(clean)) return 'cat_computer';
  if (/\b(lavor\w*|uffic\w*|riunion\w*|progett\w*|smart\s*working)\b/i.test(clean)) return 'cat_work';
  if (/\b(libr\w*|studi\w*|esam\w*|legger\w*|universit\w*|scuol\w*)\b/i.test(clean)) return 'cat_book';
  if (/\b(medit\w*|respir\w*|yoga|stretching|mindfulness|zen)\b/i.test(clean)) return 'cat_meditate';
  if (/\b(bici\w*|ciclism\w*|casco)\b/i.test(clean)) return 'cat_bike';
  if (/\b(sport|palestr\w*|corsa|correr\w*|allenament\w*|piscin\w*|pesi|workout)\b/i.test(clean)) return 'cat_sport';
  if (/\b(foto\w*|camera|selfie|scatt\w*)\b/i.test(clean)) return 'cat_camera';
  if (/\b(music\w*|concert\w*|canzon\w*|spotify|podcast|cuffie)\b/i.test(clean)) return 'cat_music';
  if (/\b(film|cinema|netflix|serie|tv)\b/i.test(clean)) return 'cat_movie';
  if (/\b(gioc\w*|videogioc\w*|ps5|switch|xbox|partita)\b/i.test(clean)) return 'cat_game';
  if (/\b(regal\w*|compleann\w*|festa|party|sorpresa)\b/i.test(clean)) return 'cat_gift';
  if (/\b(montagn\w*|trekking|escursion\w*|sentier\w*|campegg\w*)\b/i.test(clean)) return 'cat_mountain';
  if (/\b(sole|mare|spiaggi\w*|vacanz\w*|parco)\b/i.test(clean)) return 'cat_sun';
  if (/\b(figl\w*|bimb\w*|bambin\w*|mamma|pap[aà]|famigl\w*)\b/i.test(clean)) return 'cat_baby';
  if (/\b(casa|condomini\w*|mobil\w*|stanz\w*)\b/i.test(clean)) return 'cat_home';
  if (/\b(urgent\w*|subito|emergenz\w*|immediat\w*|scadenz\w*)\b/i.test(clean)) return 'cat_fire';
  if (/\b(dormir\w*|sonn\w*|ripos\w*|nott\w*|letto)\b/i.test(clean)) return 'cat_sleep';
  if (/\b(idea|pensar\w*|invent\w*|creativ\w*)\b/i.test(clean)) return 'cat_idea';
  return null;
}

function inferServerCatIconFallback(text: string): string {
  return inferSpecificServerCatIcon(text) || 'cat_note';
}

function reconcileServerCatIcon(aiEmoji: unknown, text: string): string {
  const specific = inferSpecificServerCatIcon(text);
  if (specific) return specific;
  if (typeof aiEmoji === 'string') {
    const trimmed = aiEmoji.trim();
    if (CAT_EMOTICON_IDS.includes(trimmed)) return trimmed;
  }
  return 'cat_note';
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

const REMINDERS_GUIDE_PROMPT = `4. "reminders": cerca nel testo:
   - eventuali cose importanti da ricordare, intenzioni pratiche, cose che l'utente dice di dover fare, idee d'azione o ipotesi (es. "potrei fare...", "forse dovrei...", "mi sa che se...", "devo ricordarmi...", "devo fare...", "sarebbe meglio se...", "bisogna che...", "magari...", "domani provo...", "non devo dimenticare...").
   - DOMANDE che l'utente si pone e RIFLESSIONI / POSSIBILI SOLUZIONI che si dà, soprattutto su benessere, focus, concentrazione, stile e modo di vivere, scelte o abitudini (es. qualsiasi domanda con "?", "mi chiedo...", "come posso...", "cosa potrei fare per...", "perché continuo a...", "una soluzione sarebbe...", "potrei provare a...").
   Riporta l'INTERA frase o domanda originale completa (compreso eventuale punto interrogativo "?") così come detta, senza riassumerla né tagliarla. Se non ci sono frasi o domande di questo tipo o se transcript è "[SILENZIO]", restituisci [].`;

async function transcribeAndSynthesizeWithFailover(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string,
  traceId?: string
): Promise<TranscribeSynthesisResult> {
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  let uploadedFile: { uri?: string; mimeType?: string; name?: string } | null = null;

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

  const perAttemptTimeoutMs = audioBuffer.length > 500_000 ? 45000 : 28000;
  const activeAttempts = getHealthyModelAttempts(perAttemptTimeoutMs);
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
1. "transcript": trascrivi fedelmente in italiano chiaro e scorrevole TUTTO ciò che la persona ha detto dall'inizio alla fine della registrazione, senza omettere o troncare la parte finale. IMPORTANTE: se nell'audio c'è solo silenzio, fruscio o rumore di fondo senza parole umane chiare, restituisci esattamente "[SILENZIO]" senza MAI inventare frasi.
2. "bullets": individua SUBITO da questo stesso audio da 2 a 4 punti brevi sulle sensazioni, stato d'animo, stress, energia, focus o bisogni della persona (esempi: "Umore: sereno", "Stress: medio-alto", "Energia: stanca", "Focus: esaurito", "Sensazione: sollievo", "Bisogno: fare una pausa"). Deduci le sensazioni sia dalle parole sia dal tono. Niente trattini o pallini iniziali. Se transcript è "[SILENZIO]", restituisci [].
${COLOR_GUIDE_PROMPT}
${REMINDERS_GUIDE_PROMPT}`,
                    },
                  ],
                },
              ],
              config: {
                ...(cfg.thinkingLevel ? { thinkingConfig: { thinkingLevel: cfg.thinkingLevel } } : {}),
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

        const parsed = parseGeminiJson<{
          transcript?: unknown;
          bullets?: unknown;
          reminders?: unknown;
          suggestedColor?: unknown;
        }>(rawText);

        if (parsed) {
          transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
          bullets = Array.isArray(parsed.bullets)
            ? parsed.bullets
                .map((item) => String(item ?? '').replace(/^[•\-*\s]+/, '').trim())
                .filter(Boolean)
            : [];
          rawReminders = parsed.reminders;
          rawSuggestedColor = parsed.suggestedColor;
        } else {
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
        const notFound = isModelNotFoundError(err);
        console.warn(
          `[Transcribe attempt ${i + 1} (${cfg.model}) failed in ${Date.now() - t0}ms]`,
          msg.slice(0, 220)
        );
        if (traceId || notFound) {
          appendServerTranscribeLog({
            source: 'server',
            traceId: traceId || 'no-trace',
            stage: notFound ? 'gemini_model_not_found' : 'gemini_attempt_failed',
            level: notFound ? 'error' : 'warn',
            details: {
              attempt: i + 1,
              model: cfg.model,
              durationMs: Date.now() - t0,
              status: (err as { status?: number })?.status || null,
              isNotFound: notFound,
              messagePreview: msg.slice(0, 220),
            },
          });
        }
        if ((err as { status?: number })?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
          markModelQuotaExhausted(cfg.model, err);
        } else if (isTransientServiceError(err)) {
          markModelTransientUnavailable(cfg.model);
        } else if (notFound) {
          unsupportedModels.add(cfg.model);
        }
        if (!isFailoverEligibleError(err)) {
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
        const aiBeta = getGeminiV1BetaClient();
        const transcribeResp = await callWithTimeout(
          () =>
            aiBeta.models.generateContent({
              model: 'gemini-3.5-transcribe',
              contents: {
                parts: [
                  audioPart,
                  {
                    text: 'Transcribe this audio faithfully in Italian. Reply "[SILENZIO]" if there is only silence or background noise with no clear spoken words.',
                  },
                ],
              },
            }),
          35000
        );
        const transcript = (transcribeResp.text ?? '').trim();
        let bullets: string[] = [];
        let reminders: string[] = [];
        let suggestedColor: SuggestedColor = inferSuggestedColor(transcript);
        if (transcript && transcript !== '[SILENZIO]') {
          try {
            const synth = await synthesizeMoodBullets(ai, transcript, false, traceId);
            bullets = synth.bullets;
            reminders = synth.reminders;
            suggestedColor = synth.suggestedColor;
          } catch {
            reminders = extractRemindersFallback(transcript);
          }
        }
        console.log(`[Transcribe gemini-3.5-transcribe v1beta] ok in ${Date.now() - t0}ms`);
        recordSuccessfulGeminiUsage();
        return { transcript, bullets, reminders, suggestedColor };
      } catch (transcribeErr) {
        if (isModelNotFoundError(transcribeErr)) {
          unsupportedModels.add('gemini-3.5-transcribe');
          appendServerTranscribeLog({
            source: 'server',
            traceId: traceId || 'no-trace',
            stage: 'gemini_model_not_found',
            level: 'warn',
            details: {
              model: 'gemini-3.5-transcribe',
              durationMs: Date.now() - t0,
              cachedSkip: true,
              messagePreview: ((transcribeErr as Error)?.message || String(transcribeErr)).slice(0, 200),
            },
          });
          if (!lastError) lastError = transcribeErr;
        } else {
          lastError = transcribeErr;
        }
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
  isDailyOverview = false,
  traceId?: string
): Promise<{ bullets: string[]; reminders: string[]; suggestedColor: SuggestedColor }> {
  const activeAttempts = getHealthyModelAttempts(15000);
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
              ...(cfg.thinkingLevel ? { thinkingConfig: { thinkingLevel: cfg.thinkingLevel } } : {}),
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
      const parsed =
        parseGeminiJson<{
          bullets?: unknown;
          reminders?: unknown;
          suggestedColor?: unknown;
        }>(rawJson) || {};
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
      const notFound = isModelNotFoundError(err);
      console.warn(
        `[MoodBullets attempt ${i + 1} (${cfg.model}) failed in ${Date.now() - t0}ms]`,
        msg.slice(0, 220)
      );
      if (traceId || notFound) {
        appendServerTranscribeLog({
          source: 'server',
          traceId: traceId || 'no-trace',
          stage: notFound ? 'mood_gemini_model_not_found' : 'mood_gemini_attempt_failed',
          level: notFound ? 'error' : 'warn',
          details: {
            attempt: i + 1,
            model: cfg.model,
            durationMs: Date.now() - t0,
            status: (err as { status?: number })?.status || null,
            messagePreview: msg.slice(0, 200),
          },
        });
      }
      if ((err as { status?: number })?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        markModelQuotaExhausted(cfg.model, err);
      } else if (isTransientServiceError(err)) {
        markModelTransientUnavailable(cfg.model);
      } else if (notFound) {
        unsupportedModels.add(cfg.model);
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
  mode: 'audio' | 'text' = 'audio',
  traceId?: string
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
      traceId,
      quota: getPublicQuotaSnapshot(),
    });
  }

  if (isModelNotFoundError(error)) {
    appendServerTranscribeLog({
      source: 'server',
      traceId: traceId || 'no-trace',
      stage: 'gemini_not_found_response',
      level: 'error',
      details: {
        mode,
        status: errObj?.status || 404,
        messagePreview: message.slice(0, 260),
      },
    });
    return res.status(404).json({
      error: `Modello AI non trovato (NOT_FOUND): ${message.slice(0, 180)}`,
      notFoundSource: 'gemini_model_not_found',
      traceId,
      quota: getPublicQuotaSnapshot(),
    });
  }

  console.error('[Gemini API Error]', error);

  if (message === 'MISSING_API_KEY') {
    return res.status(500).json({
      error:
        'Chiave GEMINI_API_KEY non configurata sul server pubblicato. Aggiungi GEMINI_API_KEY nelle Environment Variables / Secrets del progetto.',
      traceId,
      quota: getPublicQuotaSnapshot(),
    });
  }
  if (message === 'GEMINI_TIMEOUT') {
    return res.status(504).json({
      error: 'La richiesta sta impiegando troppo tempo. Riprova tra qualche secondo.',
      traceId,
      quota: getPublicQuotaSnapshot(),
    });
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID') || errObj?.status === 403) {
    return res.status(403).json({
      error: 'Chiave API non valida o permessi insufficienti. Verifica GEMINI_API_KEY nelle variabili ambiente.',
      traceId,
      quota: getPublicQuotaSnapshot(),
    });
  }
  if (message.includes('UNAVAILABLE') || errObj?.status === 503) {
    return res.status(503).json({
      error: 'Il servizio AI è temporaneamente sovraccarico. Riprova tra qualche secondo.',
      traceId,
      quota: getPublicQuotaSnapshot(),
    });
  }
  return res.status(500).json({
    error: `Errore durante l’elaborazione: ${message}`,
    traceId,
    quota: getPublicQuotaSnapshot(),
  });
}

export function createApiApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  app.use(
    [
      '/api/notes/transcribe',
      '/api/notes/transcribe-todo',
      '/api/notes/summarize-mood',
      '/api/notes/parse-batch-todos',
      '/api/health',
    ],
    (req, res, next) => {
      const traceId = resolveTraceId(req);
      const meta = buildSanitizedReqMeta(req);
      const sessionSeen = detectSessionSeenLabel(meta);
      res.locals.transcribeTraceId = traceId;
      res.setHeader('X-Server-Trace-Id', traceId);
      res.setHeader('X-Server-Session-Seen', sessionSeen);

      if (req.method === 'POST') {
        const bodyObj = (req.body || {}) as {
          audioBase64?: unknown;
          mimeType?: unknown;
          debugContext?: unknown;
        };
        appendServerTranscribeLog({
          source: 'server',
          traceId,
          stage: 'server_req_received',
          level: 'info',
          details: {
            ...meta,
            sessionSeen,
            audioBase64Length: typeof bodyObj.audioBase64 === 'string' ? bodyObj.audioBase64.length : 0,
            mimeType: typeof bodyObj.mimeType === 'string' ? bodyObj.mimeType : null,
            clientDebugContext: redactSensitiveObject(bodyObj.debugContext || null),
          },
        });
      }
      next();
    }
  );

  app.get('/api/debug/transcribe-logs', (_req, res) => {
    res.json({
      count: serverTranscribeLogs.length,
      logs: serverTranscribeLogs,
    });
  });

  app.post('/api/debug/transcribe-logs', (req, res) => {
    const body = (req.body || {}) as {
      traceId?: unknown;
      stage?: unknown;
      level?: unknown;
      details?: unknown;
    };
    const traceId =
      typeof body.traceId === 'string' && body.traceId.trim()
        ? body.traceId.trim().slice(0, 80)
        : resolveTraceId(req);
    const stage =
      typeof body.stage === 'string' && body.stage.trim()
        ? body.stage.trim().slice(0, 60)
        : 'client_event';
    const level: 'info' | 'warn' | 'error' =
      body.level === 'error' || body.level === 'warn' || body.level === 'info'
        ? body.level
        : 'info';

    appendServerTranscribeLog({
      source: 'client',
      traceId,
      stage,
      level,
      details: (redactSensitiveObject(body.details || {}) as Record<string, unknown>) || {},
    });

    res.json({ ok: true, count: serverTranscribeLogs.length });
  });

  app.delete('/api/debug/transcribe-logs', (_req, res) => {
    serverTranscribeLogs.length = 0;
    res.json({ ok: true, cleared: true });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      runtime: process.env.VERCEL ? 'vercel' : 'node',
    });
  });

  app.get('/api/quota', (_req, res) => {
    res.json({ quota: getPublicQuotaSnapshot() });
  });

  app.post('/api/quota/sync', (req, res) => {
    const body = (req.body || {}) as { quota?: unknown };
    res.json({ quota: syncClientQuotaState(body.quota) });
  });

  app.post('/api/notes/transcribe', async (req, res) => {
    const traceId = (res.locals.transcribeTraceId as string | undefined) || resolveTraceId(req);
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
        return res.status(400).json({ error: 'Nessun dato audio ricevuto dal microfono.', traceId });
      }

      const now = new Date();
      const cleanMime = normalizeAudioMimeType(mimeType);
      const ai = getGeminiClient();

      const { transcript, bullets, reminders, suggestedColor } =
        await transcribeAndSynthesizeWithFailover(ai, audioBase64, cleanMime, traceId);

      if (!transcript || transcript === '[SILENZIO]' || transcript.toLowerCase() === 'silenzio') {
        return res.status(422).json({
          error:
            'Non è stato rilevato alcun parlato nella registrazione. Riprova parlando più vicino al microfono.',
          traceId,
          quota: getPublicQuotaSnapshot(),
        });
      }

      return res.json({
        transcript,
        bullets,
        reminders,
        suggestedColor,
        traceId,
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
      return handleGeminiError(error, res, 'audio', traceId);
    }
  });

  app.post('/api/notes/summarize-mood', async (req, res) => {
    const traceId = (res.locals.transcribeTraceId as string | undefined) || resolveTraceId(req);
    try {
      const { text, isDailyOverview } = req.body as {
        text?: string;
        isDailyOverview?: boolean;
      };

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Nessun testo da analizzare.', traceId });
      }

      const ai = getGeminiClient();
      const { bullets, reminders, suggestedColor } = await synthesizeMoodBullets(
        ai,
        text.trim(),
        Boolean(isDailyOverview),
        traceId
      );

      return res.json({ bullets, reminders, suggestedColor, traceId, quota: getPublicQuotaSnapshot() });
    } catch (error) {
      return handleGeminiError(error, res, 'text', traceId);
    }
  });

  app.post('/api/notes/transcribe-todo', async (req, res) => {
    const traceId = (res.locals.transcribeTraceId as string | undefined) || resolveTraceId(req);
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return res.status(400).json({ error: 'Nessun audio ricevuto.', traceId });
      }
      const cleanMime = normalizeAudioMimeType(mimeType);
      const ai = getGeminiClient();

      const todoAttempts = getHealthyModelAttempts(20000);

      if (todoAttempts.length === 0) {
        return res.status(429).json({
          error: 'Richieste AI di oggi esaurite: scrivi la nota manualmente.',
          traceId,
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
                        text: `Trascrivi fedelmente questa breve nota vocale da fare in italiano e scegli l'ID icona MicioMiao più inerente al significato del testo tra quelli consentiti (es. benzina/gpl -> "cat_fuel", barbiere -> "cat_barber", auto -> "cat_car", treno -> "cat_train", aereo -> "cat_plane", pacchi/posta -> "cat_package", documenti -> "cat_paperwork", lavatrice/bucato -> "cat_laundry", pulizie/pulisci casa -> "cat_clean", borsa/zaino -> "cat_bag", scarpe -> "cat_shoes", occhiali -> "cat_glasses", sveglia/orario -> "cat_clock", lenzuola/letto -> "cat_bed", spazzatura -> "cat_trash", attrezzi/riparazioni -> "cat_repair", piante -> "cat_garden", farmacia/pillole -> "cat_pharmacy", dentista -> "cat_dentist", dottore -> "cat_health", banca/soldi -> "cat_bank", bollette -> "cat_bills", pizza -> "cat_pizza", aperitivo/bevande -> "cat_drink", acqua -> "cat_water", caffè -> "cat_coffee", cucinare/pentola -> "cat_cook", pranzo/cena -> "cat_food", spesa -> "cat_shop", email -> "cat_email", chiamate -> "cat_call", computer/pc -> "cat_computer", batteria/caricabatterie -> "cat_battery", lavoro -> "cat_work", meditazione/respiro -> "cat_meditate", bici -> "cat_bike", sport -> "cat_sport", foto -> "cat_camera", vestiti -> "cat_clothes", chiavi -> "cat_keys", montagna -> "cat_mountain"). Restituisci SOLO JSON con "text" e "emoji". IMPORTANTE: se nell'audio c'è solo silenzio o rumore di fondo senza parole chiare, restituisci esattamente text="[SILENZIO]" senza inventare nulla.`,
                      },
                    ],
                  },
                ],
                config: {
                  ...(attempt.thinkingLevel
                    ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
                    : {}),
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
            attempt.timeoutMs
          );

          const parsed =
            parseGeminiJson<{
              text?: string;
              emoji?: string;
            }>(response.text ?? '{}') || {};
          const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
          if (!text || text === '[SILENZIO]') {
            return res.status(422).json({
              error: 'Nessuna parola rilevata nella registrazione.',
              traceId,
              quota: getPublicQuotaSnapshot(),
            });
          }
          recordSuccessfulGeminiUsage();
          return res.json({
            text,
            emoji: reconcileServerCatIcon(parsed.emoji, text),
            traceId,
            quota: getPublicQuotaSnapshot(),
          });
        } catch (err) {
          lastErr = err;
          const notFound = isModelNotFoundError(err);
          appendServerTranscribeLog({
            source: 'server',
            traceId,
            stage: notFound ? 'todo_gemini_model_not_found' : 'todo_gemini_attempt_failed',
            level: notFound ? 'error' : 'warn',
            details: {
              model: attempt.model,
              status: (err as { status?: number })?.status || null,
              isNotFound: notFound,
              messagePreview: ((err as Error)?.message || String(err)).slice(0, 200),
            },
          });
          if ((err as { status?: number })?.status === 429) {
            markModelQuotaExhausted(attempt.model, err);
          } else if (isTransientServiceError(err)) {
            markModelTransientUnavailable(attempt.model);
          } else if (notFound) {
            unsupportedModels.add(attempt.model);
          }
          if (!isFailoverEligibleError(err)) break;
        }
      }

      if (!isModelKnownExhausted('gemini-3.5-transcribe')) {
        try {
          const aiBeta = getGeminiV1BetaClient();
          const transcribeResp = await callWithTimeout(
            () =>
              aiBeta.models.generateContent({
                model: 'gemini-3.5-transcribe',
                contents: {
                  parts: [
                    { inlineData: { mimeType: cleanMime, data: audioBase64 } },
                    { text: 'Transcribe this audio in Italian. Reply "[SILENZIO]" if empty.' },
                  ],
                },
              }),
            25000
          );
          const text = (transcribeResp.text ?? '').trim();
          if (!text || text === '[SILENZIO]') {
            return res.status(422).json({
              error: 'Nessuna parola rilevata nella registrazione.',
              traceId,
              quota: getPublicQuotaSnapshot(),
            });
          }
          recordSuccessfulGeminiUsage();
          return res.json({
            text,
            emoji: inferServerCatIconFallback(text),
            traceId,
            quota: getPublicQuotaSnapshot(),
          });
        } catch (transcribeErr) {
          if (isModelNotFoundError(transcribeErr)) {
            unsupportedModels.add('gemini-3.5-transcribe');
            appendServerTranscribeLog({
              source: 'server',
              traceId,
              stage: 'todo_gemini_model_not_found',
              level: 'warn',
              details: {
                model: 'gemini-3.5-transcribe',
                cachedSkip: true,
                messagePreview: ((transcribeErr as Error)?.message || String(transcribeErr)).slice(0, 200),
              },
            });
            if (!lastErr) lastErr = transcribeErr;
          } else {
            lastErr = transcribeErr;
          }
        }
      }
      throw lastErr;
    } catch (error) {
      return handleGeminiError(error, res, 'audio', traceId);
    }
  });

  app.post('/api/notes/parse-batch-todos', async (req, res) => {
    const { rawText } = req.body as { rawText?: string };
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Incolla almeno una riga di testo.' });
    }

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
      const batchAttempts = getHealthyModelAttempts(15000);
      if (batchAttempts.length === 0) {
        return res.json({
          items: fallbackLines.map((text) => ({ text, emoji: inferServerCatIconFallback(text) })),
          usedFallback: true,
          quota: getPublicQuotaSnapshot(),
        });
      }

      const catEmoticonIds = CAT_EMOTICON_IDS;
      const numberedLines = fallbackLines.map((line, i) => `${i}: ${line}`).join('\n');
      const ai = getGeminiClient();

      for (const chosen of batchAttempts) {
        try {
          const response = await callWithTimeout(
            () =>
              ai.models.generateContent({
                model: chosen.model,
                contents: `Associa a ciascuna delle ${fallbackLines.length} righe numerate l'ID icona MicioMiao più inerente al testo (es. benzina/gpl -> "cat_fuel", barber/capelli -> "cat_barber", auto -> "cat_car", treno -> "cat_train", aereo -> "cat_plane", pacchi/posta -> "cat_package", documenti -> "cat_paperwork", bucato/lavatrice -> "cat_laundry", pulizie/pulisci casa -> "cat_clean", borsa/zaino -> "cat_bag", scarpe -> "cat_shoes", occhiali -> "cat_glasses", sveglia/orario -> "cat_clock", lenzuola/letto -> "cat_bed", spazzatura -> "cat_trash", riparazioni/attrezzi -> "cat_repair", piante -> "cat_garden", farmacia -> "cat_pharmacy", dentista -> "cat_dentist", dottore -> "cat_health", banca -> "cat_bank", bollette -> "cat_bills", pizza -> "cat_pizza", drink -> "cat_drink", acqua -> "cat_water", caffè -> "cat_coffee", cucinare/pentola -> "cat_cook", cibo -> "cat_food", spesa -> "cat_shop", email -> "cat_email", chiamare -> "cat_call", computer -> "cat_computer", batteria -> "cat_battery", lavoro -> "cat_work", meditazione -> "cat_meditate", bici -> "cat_bike", sport -> "cat_sport", chiavi -> "cat_keys", vestiti -> "cat_clothes", montagna -> "cat_mountain").
REGOLA ASSOLUTA: ogni riga numerata DEVE restare UNA SOLA nota. Anche se su una stessa riga ci sono più attività (separate da virgole, "e", ";", "/" o trattini), NON dividerle MAI su più note: mantieni tutte le attività di quella riga in una riga sola. Restituisci esattamente un elemento per ogni indice da 0 a ${fallbackLines.length - 1}.

Righe:
"""
${numberedLines.slice(0, 6000)}
"""`,
                config: {
                  ...(chosen.thinkingLevel
                    ? { thinkingConfig: { thinkingLevel: chosen.thinkingLevel } }
                    : {}),
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
            chosen.timeoutMs
          );

          const parsed =
            parseGeminiJson<{
              items?: Array<{ index?: unknown; emoji?: unknown }>;
            }>(response.text ?? '{}') || {};
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
            emoji: reconcileServerCatIcon(emojiByIndex.get(idx), text),
          }));

          recordSuccessfulGeminiUsage();
          return res.json({
            items,
            usedFallback: false,
            quota: getPublicQuotaSnapshot(),
          });
        } catch (err) {
          if ((err as { status?: number })?.status === 429) {
            markModelQuotaExhausted(chosen.model, err);
          } else if (isTransientServiceError(err)) {
            markModelTransientUnavailable(chosen.model);
          } else if (isModelNotFoundError(err)) {
            unsupportedModels.add(chosen.model);
          }
          if (!isFailoverEligibleError(err)) break;
        }
      }

      return res.json({
        items: fallbackLines.map((text) => ({ text, emoji: inferServerCatIconFallback(text) })),
        usedFallback: true,
        quota: getPublicQuotaSnapshot(),
      });
    } catch {
      return res.json({
        items: fallbackLines.map((text) => ({ text, emoji: inferServerCatIconFallback(text) })),
        usedFallback: true,
        quota: getPublicQuotaSnapshot(),
      });
    }
  });

  app.use('/api', (req, res) => {
    const traceId = resolveTraceId(req);
    const meta = buildSanitizedReqMeta(req);
    const sessionSeen = detectSessionSeenLabel(meta);
    res.setHeader('X-Server-Trace-Id', traceId);
    res.setHeader('X-Server-Session-Seen', sessionSeen);

    appendServerTranscribeLog({
      source: 'server',
      traceId,
      stage: 'express_api_not_found',
      level: 'warn',
      details: {
        ...meta,
        sessionSeen,
      },
    });

    res.status(404).json({
      error: 'Endpoint API non trovato sul server (NOT_FOUND).',
      notFoundSource: 'express_api_router',
      path: req.originalUrl,
      traceId,
    });
  });

  return app;
}
