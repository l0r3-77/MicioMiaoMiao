// Diagnostic logger & real-time telemetry store for voice transcription & API calls:
// intercepts NOT_FOUND / 4xx / 5xx responses and tracks live API status,
// session/cookie presence, and microphone permissions/tracks across devices.

export type TranscribeLogLevel = 'info' | 'warn' | 'error';

export type TranscribeLogStage =
  | 'mic_permission_check'
  | 'mic_probe_test'
  | 'recording_start'
  | 'recording_track_event'
  | 'recording_stop'
  | 'send_prepare'
  | 'fetch_start'
  | 'fetch_retry'
  | 'fetch_response'
  | 'not_found_intercepted'
  | 'health_probe'
  | 'send_success'
  | 'send_error';

export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'error';

export type LiveApiPhase =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'retrying'
  | 'success'
  | 'error';

export interface LiveApiStatusSnapshot {
  phase: LiveApiPhase;
  endpoint: string | null;
  caller: string | null;
  traceId: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  elapsedMs: number | null;
  lastHttpStatus: number | null;
  lastError: string | null;
  attempt: number;
  serverSessionSeen: string | null;
}

export interface ClientSessionSnapshot {
  origin: string;
  pathname: string;
  isStandalonePwa: boolean;
  isSecureContext: boolean;
  onLine: boolean;
  visibilityState: string;
  hasDocumentCookie: boolean;
  cookieKeyNames: string[];
  localStorageAccessible: boolean;
}

export interface TranscribeDebugEntry {
  id: string;
  timestamp: string;
  traceId: string;
  stage: TranscribeLogStage;
  level: TranscribeLogLevel;
  httpStatus?: number | null;
  details: Record<string, unknown>;
}

export interface MicRecordingDiagnostics {
  traceId?: string;
  micPermissionAtStart?: MicPermissionState;
  micPermissionAtStop?: MicPermissionState;
  trackStateBeforeStop?: string;
  trackMutedDuringRecord?: boolean;
  trackEndedUnexpectedly?: boolean;
  visibilityChangedDuringRecord?: boolean;
}

export interface LiveDeviceDiagnostics {
  micPermission: MicPermissionState;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  supportedMimeTypes: string[];
  isStandalonePwa: boolean;
  onLine: boolean;
  visibilityState: string;
  origin: string;
  hasDocumentCookie: boolean;
  cookieKeyNames: string[];
  userAgent: string;
}

const DEBUG_LOG_STORAGE_KEY = 'miciomiao_temp_transcribe_debug_logs_v1';
const MAX_DEBUG_LOGS = 100;

const listeners = new Set<() => void>();

let liveApiStatus: LiveApiStatusSnapshot = {
  phase: 'idle',
  endpoint: null,
  caller: null,
  traceId: null,
  startedAt: null,
  updatedAt: null,
  elapsedMs: null,
  lastHttpStatus: null,
  lastError: null,
  attempt: 0,
  serverSessionSeen: null,
};

function notifySubscribers(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

export function subscribeTranscribeDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiveApiStatusSnapshot(): LiveApiStatusSnapshot {
  return liveApiStatus;
}

export function updateLiveApiStatus(patch: Partial<LiveApiStatusSnapshot>): void {
  liveApiStatus = {
    ...liveApiStatus,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  notifySubscribers();
}

export function isServerStartingHtml(rawText: string): boolean {
  const trimmed = rawText.trim();
  if (!trimmed) return false;
  return (
    /<title>\s*Starting Server/i.test(trimmed) ||
    /<!doctype html>[\s\S]{0,400}Starting Server/i.test(trimmed)
  );
}

export function createTranscribeTraceId(): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `tr_${Date.now().toString(36)}_${rand}`;
}

export async function probeMicPermissionState(): Promise<MicPermissionState> {
  if (typeof navigator === 'undefined') return 'unsupported';
  try {
    const perms = navigator.permissions;
    if (!perms || typeof perms.query !== 'function') {
      return 'unsupported';
    }
    const status = await perms.query({ name: 'microphone' as PermissionName });
    if (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied') {
      return status.state;
    }
    return 'unsupported';
  } catch {
    // Safari iOS throws TypeError for permissions.query({ name: 'microphone' })
    return 'unsupported';
  }
}

export function probeClientSessionSnapshot(): ClientSessionSnapshot {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      origin: '',
      pathname: '',
      isStandalonePwa: false,
      isSecureContext: true,
      onLine: true,
      visibilityState: 'unknown',
      hasDocumentCookie: false,
      cookieKeyNames: [],
      localStorageAccessible: false,
    };
  }

  let cookieKeyNames: string[] = [];
  let hasDocumentCookie = false;
  try {
    const rawCookie = document.cookie || '';
    hasDocumentCookie = rawCookie.trim().length > 0;
    cookieKeyNames = rawCookie
      .split(';')
      .map((part) => part.split('=')[0]?.trim() || '')
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    hasDocumentCookie = false;
    cookieKeyNames = [];
  }

  let localStorageAccessible = false;
  try {
    const testKey = '__mm_ls_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    localStorageAccessible = true;
  } catch {
    localStorageAccessible = false;
  }

  const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    isStandalonePwa: navStandalone || mediaStandalone,
    isSecureContext: Boolean(window.isSecureContext),
    onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
    visibilityState: document.visibilityState || 'unknown',
    hasDocumentCookie,
    cookieKeyNames,
    localStorageAccessible,
  };
}

export async function probeLiveDeviceDiagnostics(): Promise<LiveDeviceDiagnostics> {
  const micPermission = await probeMicPermissionState();
  const session = probeClientSessionSnapshot();
  const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
  const hasGetUserMedia =
    hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  const candidateMimes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
  ];
  const supportedMimeTypes =
    hasMediaRecorder && typeof MediaRecorder.isTypeSupported === 'function'
      ? candidateMimes.filter((m) => {
          try {
            return MediaRecorder.isTypeSupported(m);
          } catch {
            return false;
          }
        })
      : [];

  return {
    micPermission,
    isSecureContext: session.isSecureContext,
    hasMediaDevices,
    hasGetUserMedia,
    hasMediaRecorder,
    supportedMimeTypes,
    isStandalonePwa: session.isStandalonePwa,
    onLine: session.onLine,
    visibilityState: session.visibilityState,
    origin: session.origin,
    hasDocumentCookie: session.hasDocumentCookie,
    cookieKeyNames: session.cookieKeyNames,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}

export function getTranscribeDebugLogs(): TranscribeDebugEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DEBUG_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TranscribeDebugEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearTranscribeDebugLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEBUG_LOG_STORAGE_KEY);
    (window as unknown as { __micioMiaoTranscribeLogs?: TranscribeDebugEntry[] }).__micioMiaoTranscribeLogs = [];
  } catch {
    // ignore storage errors
  }
  notifySubscribers();
}

export function logTranscribeEvent(
  traceId: string,
  stage: TranscribeLogStage,
  details: Record<string, unknown>,
  level: TranscribeLogLevel = 'info',
  httpStatus?: number | null
): TranscribeDebugEntry {
  const inferredStatus =
    typeof httpStatus === 'number'
      ? httpStatus
      : typeof details.status === 'number'
        ? (details.status as number)
        : null;

  const entry: TranscribeDebugEntry = {
    id: `${traceId}:${stage}:${Date.now()}:${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    traceId,
    stage,
    level,
    httpStatus: inferredStatus,
    details,
  };

  const prefix = `[TranscribeDebug][${traceId}][${stage}]`;
  if (level === 'error' || level === 'warn') {
    console.warn(prefix, details);
  } else {
    console.info(prefix, details);
  }

  if (typeof window !== 'undefined') {
    try {
      const existing = getTranscribeDebugLogs();
      const next = [...existing, entry].slice(-MAX_DEBUG_LOGS);
      window.localStorage.setItem(DEBUG_LOG_STORAGE_KEY, JSON.stringify(next));
      (window as unknown as { __micioMiaoTranscribeLogs?: TranscribeDebugEntry[] }).__micioMiaoTranscribeLogs = next;
    } catch {
      // ignore storage quota errors
    }
  }

  notifySubscribers();
  return entry;
}

export function sendDiagnosticLogToServer(entry: TranscribeDebugEntry): void {
  if (typeof fetch !== 'function') return;
  try {
    void fetch('/api/debug/transcribe-logs', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'X-Transcribe-Trace-Id': entry.traceId,
      },
      body: JSON.stringify(entry),
    }).catch(() => {});
  } catch {
    // best-effort logging only
  }
}

export async function testMicrophoneAccessNow(): Promise<{
  ok: boolean;
  message: string;
  permissionAfter: MicPermissionState;
}> {
  const traceId = createTranscribeTraceId();
  const permBefore = await probeMicPermissionState();
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    const msg = 'navigator.mediaDevices.getUserMedia non disponibile su questo dispositivo/contesto.';
    logTranscribeEvent(
      traceId,
      'mic_probe_test',
      {
        ok: false,
        permBefore,
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
        error: msg,
      },
      'error'
    );
    return { ok: false, message: msg, permissionAfter: permBefore };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tracks = stream.getAudioTracks().map((t) => ({
      label: t.label || 'AudioTrack',
      readyState: t.readyState,
      muted: t.muted,
      enabled: t.enabled,
    }));
    stream.getTracks().forEach((t) => t.stop());
    const permAfter = await probeMicPermissionState();
    logTranscribeEvent(traceId, 'mic_probe_test', {
      ok: true,
      permBefore,
      permAfter,
      tracks,
    });
    return {
      ok: true,
      message: `Microfono OK (${tracks[0]?.label || 'attivo'}) · permesso=${permAfter}`,
      permissionAfter: permAfter,
    };
  } catch (err) {
    const permAfter = await probeMicPermissionState();
    const errName = (err as { name?: string })?.name || 'Error';
    const errMsg = err instanceof Error ? err.message : String(err);
    logTranscribeEvent(
      traceId,
      'mic_probe_test',
      {
        ok: false,
        permBefore,
        permAfter,
        errorName: errName,
        errorMessage: errMsg,
      },
      'error'
    );
    return {
      ok: false,
      message: `${errName}: ${errMsg}`,
      permissionAfter: permAfter,
    };
  }
}

export async function runServerHealthDiagnosticCheck(): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  sessionSeen: string | null;
  error?: string;
}> {
  const traceId = createTranscribeTraceId();
  const t0 = Date.now();
  updateLiveApiStatus({
    phase: 'uploading',
    endpoint: '/api/health',
    caller: 'SettingsDiagnostic',
    traceId,
    startedAt: new Date().toISOString(),
    lastError: null,
    attempt: 1,
  });

  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'X-Transcribe-Trace-Id': traceId },
    });
    const latencyMs = Date.now() - t0;
    const body = await res.text();
    const sessionSeen = res.headers.get('x-server-session-seen');
    const isWarmup = isServerStartingHtml(body);
    const ok = res.ok && !isWarmup && !/<!doctype|<html/i.test(body.trim());

    logTranscribeEvent(
      traceId,
      'health_probe',
      {
        endpoint: '/api/health',
        status: res.status,
        ok,
        latencyMs,
        redirected: res.redirected,
        serverSessionSeen: sessionSeen,
        serverStartingHtml: isWarmup,
        bodyPreview: body.slice(0, 140),
      },
      ok ? 'info' : 'error',
      res.status
    );

    updateLiveApiStatus({
      phase: ok ? 'success' : 'error',
      endpoint: '/api/health',
      traceId,
      elapsedMs: latencyMs,
      lastHttpStatus: res.status,
      serverSessionSeen: sessionSeen,
      lastError: ok
        ? null
        : isWarmup
          ? 'Server in avvio (Starting Server HTML)'
          : `HTTP ${res.status}`,
    });

    return {
      ok,
      status: res.status,
      latencyMs,
      sessionSeen,
      error: ok ? undefined : body.slice(0, 140),
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    logTranscribeEvent(
      traceId,
      'health_probe',
      { endpoint: '/api/health', latencyMs, error: msg },
      'error',
      null
    );
    updateLiveApiStatus({
      phase: 'error',
      endpoint: '/api/health',
      traceId,
      elapsedMs: latencyMs,
      lastHttpStatus: null,
      lastError: msg,
    });
    return {
      ok: false,
      status: 0,
      latencyMs,
      sessionSeen: null,
      error: msg,
    };
  }
}

export interface ServerTranscribeLogEntry {
  id: string;
  timestamp: string;
  source: 'server' | 'client';
  traceId: string;
  stage: string;
  level: 'info' | 'warn' | 'error';
  details: Record<string, unknown>;
}

export async function fetchServerDebugLogs(): Promise<{
  ok: boolean;
  logs: ServerTranscribeLogEntry[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/debug/transcribe-logs', {
      method: 'GET',
      credentials: 'same-origin',
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, logs: [], error: `HTTP ${res.status}` };
    }
    const parsed = JSON.parse(text) as { logs?: ServerTranscribeLogEntry[] };
    return {
      ok: true,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch (err) {
    return {
      ok: false,
      logs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function clearServerDebugLogs(): Promise<void> {
  try {
    await fetch('/api/debug/transcribe-logs', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch {
    // ignore
  }
}

export interface TranscribeFetchResult<T extends Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
  traceId: string;
  isNotFound: boolean;
}

export async function fetchTranscribeWithDebug<T extends Record<string, unknown>>(params: {
  endpoint: '/api/notes/transcribe' | '/api/notes/transcribe-todo';
  caller: 'VoiceRecorderPanel' | 'NoteEditorModal' | 'DaFareSubsection' | 'OrganizzaSubsection';
  payload: Record<string, unknown>;
  signal?: AbortSignal;
  micDiagnostics?: MicRecordingDiagnostics;
}): Promise<TranscribeFetchResult<T>> {
  const traceId = params.micDiagnostics?.traceId || createTranscribeTraceId();
  const t0 = Date.now();
  const startedAt = new Date().toISOString();

  updateLiveApiStatus({
    phase: 'preparing',
    endpoint: params.endpoint,
    caller: params.caller,
    traceId,
    startedAt,
    elapsedMs: 0,
    lastHttpStatus: null,
    lastError: null,
    attempt: 1,
    serverSessionSeen: null,
  });

  const micPermissionBefore = await probeMicPermissionState();
  const sessionBefore = probeClientSessionSnapshot();
  const audioBase64Len =
    typeof params.payload.audioBase64 === 'string' ? params.payload.audioBase64.length : 0;

  logTranscribeEvent(traceId, 'send_prepare', {
    endpoint: params.endpoint,
    caller: params.caller,
    micPermissionBefore,
    micDiagnostics: params.micDiagnostics || null,
    sessionBefore,
    audioBase64Len,
    mimeType: params.payload.mimeType || null,
  });

  const bodyString = JSON.stringify({
    ...params.payload,
    debugContext: {
      traceId,
      caller: params.caller,
      micPermissionBefore,
      micDiagnostics: params.micDiagnostics || null,
      sessionBefore,
    },
  });

  logTranscribeEvent(traceId, 'fetch_start', {
    endpoint: params.endpoint,
    bodyBytes: bodyString.length,
    visibilityAtSend: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
  });

  updateLiveApiStatus({
    phase: 'uploading',
    endpoint: params.endpoint,
    caller: params.caller,
    traceId,
    attempt: 1,
  });

  let response!: Response;
  let rawText = '';
  const maxWarmupRetries = 3;

  for (let attempt = 0; attempt <= maxWarmupRetries; attempt++) {
    try {
      response = await fetch(params.endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Transcribe-Trace-Id': traceId,
          'X-Transcribe-Caller': params.caller,
          'X-Session-Cookie-Present': sessionBefore.hasDocumentCookie ? '1' : '0',
          'X-Mic-Permission': micPermissionBefore,
        },
        signal: params.signal,
        body: bodyString,
      });
    } catch (networkErr) {
      const errName = (networkErr as { name?: string })?.name || 'Error';
      if (errName !== 'AbortError' && !params.signal?.aborted && attempt < 1) {
        updateLiveApiStatus({
          phase: 'retrying',
          attempt: attempt + 2,
          elapsedMs: Date.now() - t0,
          lastError: 'Connessione interrotta, nuovo tentativo...',
        });
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            params.signal?.removeEventListener('abort', onAbort);
            resolve();
          }, 1200);
          const onAbort = () => {
            window.clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          params.signal?.addEventListener('abort', onAbort, { once: true });
        });
        continue;
      }

      const micPermissionAfter = await probeMicPermissionState();
      const sessionAfter = probeClientSessionSnapshot();
      const errMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const errIsNotFound = /NOT_FOUND/i.test(errMsg);
      const elapsedMs = Date.now() - t0;

      const errEntry = logTranscribeEvent(
        traceId,
        errIsNotFound ? 'not_found_intercepted' : 'send_error',
        {
          endpoint: params.endpoint,
          caller: params.caller,
          elapsedMs,
          errorName: errName,
          errorMessage: errMsg,
          micPermissionBefore,
          micPermissionAfter,
          micPermissionLost:
            micPermissionBefore === 'granted' && micPermissionAfter !== 'granted',
          sessionBeforeHasCookie: sessionBefore.hasDocumentCookie,
          sessionAfterHasCookie: sessionAfter.hasDocumentCookie,
          sessionCookieLost:
            sessionBefore.hasDocumentCookie && !sessionAfter.hasDocumentCookie,
          visibilityAtFail: sessionAfter.visibilityState,
        },
        'error',
        null
      );
      updateLiveApiStatus({
        phase: 'error',
        elapsedMs,
        lastHttpStatus: null,
        lastError: errMsg,
        attempt: attempt + 1,
      });
      sendDiagnosticLogToServer(errEntry);
      throw networkErr;
    }

    rawText = await response.text();
    const isWarmupHtml = isServerStartingHtml(rawText);
    const isTransientGatewayHtml =
      (response.status === 502 || response.status === 503 || response.status === 504) &&
      /<!doctype|<html/i.test(rawText.trim());

    if ((isWarmupHtml || isTransientGatewayHtml) && attempt < maxWarmupRetries) {
      updateLiveApiStatus({
        phase: 'retrying',
        lastHttpStatus: response.status,
        attempt: attempt + 2,
        elapsedMs: Date.now() - t0,
        lastError: isWarmupHtml ? 'Server in avvio, nuovo tentativo...' : `Gateway ${response.status}`,
      });
      logTranscribeEvent(
        traceId,
        'fetch_retry',
        {
          endpoint: params.endpoint,
          warmupRetry: attempt + 1,
          maxWarmupRetries,
          status: response.status,
          serverStartingHtml: isWarmupHtml,
        },
        'warn',
        response.status
      );
      await new Promise<void>((resolve, reject) => {
        if (params.signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const timer = window.setTimeout(() => {
          params.signal?.removeEventListener('abort', onAbort);
          resolve();
        }, 1800 + attempt * 700);
        const onAbort = () => {
          window.clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        params.signal?.addEventListener('abort', onAbort, { once: true });
      });
      continue;
    }

    break;
  }

  const micPermissionAfter = await probeMicPermissionState();
  const sessionAfter = probeClientSessionSnapshot();
  const elapsedMs = Date.now() - t0;

  const proxyHeaders = {
    xVercelId: response.headers.get('x-vercel-id'),
    xVercelError: response.headers.get('x-vercel-error'),
    xMatchedPath: response.headers.get('x-matched-path'),
    xServerTraceId: response.headers.get('x-server-trace-id'),
    xServerSessionSeen: response.headers.get('x-server-session-seen'),
    contentType: response.headers.get('content-type'),
    server: response.headers.get('server'),
  };

  let parsedData: (T & { error?: string }) | null = null;
  if (rawText) {
    try {
      parsedData = JSON.parse(rawText) as T & { error?: string };
    } catch {
      parsedData = null;
    }
  }

  if (response.status === 413) {
    const tooLargeMsg =
      'Audio troppo pesante per l’invio diretto al server. Prova un file/registrazione leggermente più breve.';
    const errEntry = logTranscribeEvent(
      traceId,
      'send_error',
      { endpoint: params.endpoint, status: 413, bodyBytes: bodyString.length },
      'error',
      413
    );
    sendDiagnosticLogToServer(errEntry);
    updateLiveApiStatus({
      phase: 'error',
      elapsedMs,
      lastHttpStatus: 413,
      serverSessionSeen: proxyHeaders.xServerSessionSeen,
      lastError: tooLargeMsg,
    });
    return {
      ok: false,
      status: 413,
      traceId,
      isNotFound: false,
      data: { ...(parsedData || {}), error: tooLargeMsg } as T & { error?: string },
    };
  }

  const trimmedRaw = rawText.trim();
  const serverJsonErr = typeof parsedData?.error === 'string' ? parsedData.error : '';
  const serverWarmupActive = isServerStartingHtml(trimmedRaw);
  const isNotFound =
    !serverWarmupActive &&
    (response.status === 404 ||
      /NOT_FOUND|page could not be found|<!doctype|<html/i.test(trimmedRaw) ||
      /NOT_FOUND/i.test(serverJsonErr) ||
      Boolean(proxyHeaders.xVercelError && /NOT_FOUND/i.test(proxyHeaders.xVercelError)));

  logTranscribeEvent(
    traceId,
    'fetch_response',
    {
      endpoint: params.endpoint,
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      responseUrl: response.url,
      elapsedMs,
      isNotFound,
      micPermissionBefore,
      micPermissionAfter,
      micPermissionLost:
        micPermissionBefore === 'granted' && micPermissionAfter !== 'granted',
      sessionBeforeHasCookie: sessionBefore.hasDocumentCookie,
      sessionAfterHasCookie: sessionAfter.hasDocumentCookie,
      sessionCookieLost:
        sessionBefore.hasDocumentCookie && !sessionAfter.hasDocumentCookie,
      proxyHeaders,
    },
    response.ok ? 'info' : 'warn',
    response.status
  );

  if (isNotFound) {
    let healthProbe: Record<string, unknown> = { attempted: true };
    try {
      const hRes = await fetch('/api/health', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'X-Transcribe-Trace-Id': traceId },
      });
      const hBody = await hRes.text();
      healthProbe = {
        status: hRes.status,
        ok: hRes.ok,
        redirected: hRes.redirected,
        url: hRes.url,
        serverSessionSeen: hRes.headers.get('x-server-session-seen'),
        bodyPreview: hBody.slice(0, 120),
      };
    } catch (hErr) {
      healthProbe = {
        error: hErr instanceof Error ? hErr.message : String(hErr),
      };
    }

    logTranscribeEvent(traceId, 'health_probe', healthProbe, 'warn', (healthProbe.status as number) || null);

    const interceptedEntry = logTranscribeEvent(
      traceId,
      'not_found_intercepted',
      {
        endpoint: params.endpoint,
        caller: params.caller,
        status: response.status,
        redirected: response.redirected,
        responseUrl: response.url,
        expectedOrigin: sessionBefore.origin,
        micPermissionBefore,
        micPermissionAfter,
        micDiagnostics: params.micDiagnostics || null,
        sessionBefore,
        sessionAfter,
        proxyHeaders,
        healthProbe,
        rawBodyPreview: trimmedRaw.slice(0, 350),
      },
      'error',
      response.status
    );
    sendDiagnosticLogToServer(interceptedEntry);

    const cookieLost = sessionBefore.hasDocumentCookie && !sessionAfter.hasDocumentCookie;
    const micLost = micPermissionBefore === 'granted' && micPermissionAfter !== 'granted';
    const sessionDiagnosis = response.redirected
      ? 'redirect rilevato (possibile scadenza sessione)'
      : cookieLost
        ? 'cookie/sessione persi durante invio'
        : proxyHeaders.xServerSessionSeen
          ? `server attivo (${proxyHeaders.xServerSessionSeen})`
          : proxyHeaders.xVercelError || proxyHeaders.xVercelId
            ? `edge deploy ${proxyHeaders.xVercelError || '404'}`
            : sessionAfter.hasDocumentCookie
              ? 'cookie browser presenti, proxy ha risposto prima del server'
              : 'endpoint non raggiunto sul server host';
    const micDiagnosis = micLost
      ? 'autorizzazione microfono persa'
      : `microfono=${micPermissionAfter}`;

    const baseMessage = serverJsonErr || 'Errore NOT_FOUND dal server/proxy (404).';
    const finalMsg = `${baseMessage} [Diagnostica ${traceId}: stato ${response.status}, ${sessionDiagnosis}, ${micDiagnosis}]`;

    updateLiveApiStatus({
      phase: 'error',
      elapsedMs,
      lastHttpStatus: response.status,
      serverSessionSeen: proxyHeaders.xServerSessionSeen,
      lastError: finalMsg,
    });

    return {
      ok: false,
      status: response.status,
      traceId,
      isNotFound: true,
      data: {
        ...(parsedData || {}),
        error: finalMsg,
      } as T & { error?: string },
    };
  }

  if (parsedData) {
    if (response.ok) {
      logTranscribeEvent(
        traceId,
        'send_success',
        {
          endpoint: params.endpoint,
          status: response.status,
          elapsedMs,
          serverSessionSeen: proxyHeaders.xServerSessionSeen,
        },
        'info',
        response.status
      );
      updateLiveApiStatus({
        phase: 'success',
        elapsedMs,
        lastHttpStatus: response.status,
        serverSessionSeen: proxyHeaders.xServerSessionSeen,
        lastError: null,
      });
    } else {
      const errEntry = logTranscribeEvent(
        traceId,
        'send_error',
        {
          endpoint: params.endpoint,
          status: response.status,
          elapsedMs,
          serverError: parsedData.error || null,
          serverSessionSeen: proxyHeaders.xServerSessionSeen,
          micPermissionAfter,
        },
        'error',
        response.status
      );
      sendDiagnosticLogToServer(errEntry);
      updateLiveApiStatus({
        phase: 'error',
        elapsedMs,
        lastHttpStatus: response.status,
        serverSessionSeen: proxyHeaders.xServerSessionSeen,
        lastError: parsedData.error || `HTTP ${response.status}`,
      });
    }
    return {
      ok: response.ok,
      status: response.status,
      traceId,
      isNotFound: false,
      data: parsedData,
    };
  }

  const fallbackMsg = trimmedRaw.slice(0, 220) || `Errore HTTP ${response.status} [${traceId}]`;
  const fallbackErrEntry = logTranscribeEvent(
    traceId,
    'send_error',
    {
      endpoint: params.endpoint,
      status: response.status,
      elapsedMs,
      nonJsonBodyPreview: trimmedRaw.slice(0, 250),
      micPermissionAfter,
      sessionAfterHasCookie: sessionAfter.hasDocumentCookie,
    },
    'error',
    response.status
  );
  sendDiagnosticLogToServer(fallbackErrEntry);
  updateLiveApiStatus({
    phase: 'error',
    elapsedMs,
    lastHttpStatus: response.status,
    serverSessionSeen: proxyHeaders.xServerSessionSeen,
    lastError: fallbackMsg,
  });

  return {
    ok: false,
    status: response.status,
    traceId,
    isNotFound: false,
    data: {
      error: fallbackMsg,
    } as T & { error?: string },
  };
}
