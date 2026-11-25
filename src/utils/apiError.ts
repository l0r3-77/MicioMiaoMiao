import {
  createTranscribeTraceId,
  isServerStartingHtml,
  logTranscribeEvent,
  sendDiagnosticLogToServer,
  updateLiveApiStatus,
} from './transcribeDebugLog';

export { isServerStartingHtml };

export async function parseApiJsonSafe<T extends Record<string, unknown>>(
  response: Response
): Promise<T & { error?: string }> {
  const raw = await response.text();
  return parseApiRawTextSafe<T>(raw, response);
}

export function parseApiRawTextSafe<T extends Record<string, unknown>>(
  raw: string,
  response: Pick<Response, 'url' | 'status' | 'redirected' | 'headers'>
): T & { error?: string } {
  if (!raw) {
    return {} as T & { error?: string };
  }
  try {
    return JSON.parse(raw) as T & { error?: string };
  } catch {
    const trimmed = raw.trim();
    if (isServerStartingHtml(trimmed)) {
      console.warn('[ApiProxyWarmup] Server in fase di avvio:', {
        url: response.url,
        status: response.status,
      });
      return {
        error: 'Il server si sta avviando, riprova tra qualche secondo.',
      } as T & { error?: string };
    }

    const looksLikeNotFound =
      response.status === 404 ||
      /NOT_FOUND|page could not be found|<!doctype|<html/i.test(trimmed);
    if (looksLikeNotFound) {
      console.warn('[TranscribeDebug][parseApiJsonSafe][NOT_FOUND]', {
        url: response.url,
        status: response.status,
        redirected: response.redirected,
        xVercelError: response.headers.get('x-vercel-error'),
        xVercelId: response.headers.get('x-vercel-id'),
        preview: trimmed.slice(0, 220),
      });
      return {
        error:
          'Servizio di analisi AI temporaneamente non raggiungibile (NOT_FOUND / 404). Ricarica la pagina o riprova tra qualche secondo.',
      } as T & { error?: string };
    }
    return {
      error: trimmed.slice(0, 220) || `Errore HTTP ${response.status}`,
    } as T & { error?: string };
  }
}

async function waitWithAbort(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchApiJsonWithRetry<T extends Record<string, unknown>>(
  url: string,
  init: RequestInit = {},
  options?: { maxWarmupRetries?: number; retryDelayMs?: number }
): Promise<{ response: Response; data: T & { error?: string } }> {
  const maxRetries = options?.maxWarmupRetries ?? 3;
  const baseDelay = options?.retryDelayMs ?? 1800;
  const traceId = createTranscribeTraceId();
  const t0 = Date.now();

  updateLiveApiStatus({
    phase: 'uploading',
    endpoint: url,
    caller: 'ApiRetryFetch',
    traceId,
    startedAt: new Date().toISOString(),
    elapsedMs: 0,
    lastHttpStatus: null,
    lastError: null,
    attempt: 1,
    serverSessionSeen: null,
  });

  logTranscribeEvent(traceId, 'fetch_start', {
    endpoint: url,
    method: init.method || 'GET',
  });

  let lastResponse!: Response;
  let lastRaw = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const mergedHeaders = new Headers(init.headers || {});
      if (!mergedHeaders.has('X-Transcribe-Trace-Id')) {
        mergedHeaders.set('X-Transcribe-Trace-Id', traceId);
      }

      lastResponse = await fetch(url, {
        credentials: 'same-origin',
        ...init,
        headers: mergedHeaders,
      });
    } catch (err) {
      const errName = (err as { name?: string })?.name;
      if (errName !== 'AbortError' && !init.signal?.aborted && attempt < 1) {
        updateLiveApiStatus({
          phase: 'retrying',
          attempt: attempt + 2,
          elapsedMs: Date.now() - t0,
          lastError: 'Connessione interrotta, nuovo tentativo...',
        });
        await waitWithAbort(1200, init.signal);
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      const elapsedMs = Date.now() - t0;
      const errEntry = logTranscribeEvent(
        traceId,
        'send_error',
        { endpoint: url, elapsedMs, errorMessage: msg },
        'error',
        null
      );
      updateLiveApiStatus({
        phase: 'error',
        elapsedMs,
        lastHttpStatus: null,
        lastError: msg,
        attempt: attempt + 1,
      });
      sendDiagnosticLogToServer(errEntry);
      throw err;
    }

    lastRaw = await lastResponse.text();
    const warmupHtml = isServerStartingHtml(lastRaw);
    const transientHtmlGateway =
      (lastResponse.status === 502 || lastResponse.status === 503 || lastResponse.status === 504) &&
      /<!doctype|<html/i.test(lastRaw.trim());

    if ((warmupHtml || transientHtmlGateway) && attempt < maxRetries) {
      updateLiveApiStatus({
        phase: 'retrying',
        lastHttpStatus: lastResponse.status,
        attempt: attempt + 2,
        elapsedMs: Date.now() - t0,
        lastError: warmupHtml ? 'Server in avvio, nuovo tentativo...' : `Gateway ${lastResponse.status}`,
      });
      logTranscribeEvent(
        traceId,
        'fetch_retry',
        {
          endpoint: url,
          attempt: attempt + 1,
          status: lastResponse.status,
          serverStartingHtml: warmupHtml,
        },
        'warn',
        lastResponse.status
      );
      await waitWithAbort(baseDelay + attempt * 700, init.signal);
      continue;
    }

    break;
  }

  const elapsedMs = Date.now() - t0;
  const parsed = parseApiRawTextSafe<T>(lastRaw, lastResponse);
  const sessionSeen = lastResponse.headers.get('x-server-session-seen');
  const isNotFound =
    !isServerStartingHtml(lastRaw) &&
    (lastResponse.status === 404 ||
      /NOT_FOUND|page could not be found|<!doctype|<html/i.test(lastRaw.trim()));

  if (isNotFound) {
    const entry = logTranscribeEvent(
      traceId,
      'not_found_intercepted',
      {
        endpoint: url,
        status: lastResponse.status,
        elapsedMs,
        redirected: lastResponse.redirected,
        serverSessionSeen: sessionSeen,
        preview: lastRaw.trim().slice(0, 220),
      },
      'error',
      lastResponse.status
    );
    sendDiagnosticLogToServer(entry);
    updateLiveApiStatus({
      phase: 'error',
      elapsedMs,
      lastHttpStatus: lastResponse.status,
      serverSessionSeen: sessionSeen,
      lastError: parsed.error || `HTTP ${lastResponse.status} NOT_FOUND`,
    });
  } else if (lastResponse.ok) {
    logTranscribeEvent(
      traceId,
      'send_success',
      {
        endpoint: url,
        status: lastResponse.status,
        elapsedMs,
        serverSessionSeen: sessionSeen,
      },
      'info',
      lastResponse.status
    );
    updateLiveApiStatus({
      phase: 'success',
      elapsedMs,
      lastHttpStatus: lastResponse.status,
      serverSessionSeen: sessionSeen,
      lastError: null,
    });
  } else {
    const entry = logTranscribeEvent(
      traceId,
      'send_error',
      {
        endpoint: url,
        status: lastResponse.status,
        elapsedMs,
        serverSessionSeen: sessionSeen,
        error: parsed.error || `HTTP ${lastResponse.status}`,
      },
      'error',
      lastResponse.status
    );
    sendDiagnosticLogToServer(entry);
    updateLiveApiStatus({
      phase: 'error',
      elapsedMs,
      lastHttpStatus: lastResponse.status,
      serverSessionSeen: sessionSeen,
      lastError: parsed.error || `HTTP ${lastResponse.status}`,
    });
  }

  return {
    response: lastResponse,
    data: parsed,
  };
}
