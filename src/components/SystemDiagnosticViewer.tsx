import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCopy,
  Mic,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/clipboardHelper';
import {
  clearServerDebugLogs,
  clearTranscribeDebugLogs,
  fetchServerDebugLogs,
  getLiveApiStatusSnapshot,
  getTranscribeDebugLogs,
  probeLiveDeviceDiagnostics,
  runServerHealthDiagnosticCheck,
  subscribeTranscribeDebug,
  testMicrophoneAccessNow,
  type LiveApiPhase,
  type LiveApiStatusSnapshot,
  type LiveDeviceDiagnostics,
  type MicPermissionState,
  type ServerTranscribeLogEntry,
  type TranscribeDebugEntry,
} from '../utils/transcribeDebugLog';

type LogFilterTab = 'all' | 'http_errors' | 'mic' | 'server';

interface UnifiedLogRow {
  id: string;
  timestamp: string;
  source: 'client' | 'server';
  traceId: string;
  stage: string;
  level: 'info' | 'warn' | 'error';
  httpStatus: number | null;
  details: Record<string, unknown>;
}

interface SystemDiagnosticViewerProps {
  onNotify?: (msg: string) => void;
}

const PHASE_LABELS: Record<LiveApiPhase, string> = {
  idle: 'In attesa',
  preparing: 'Preparazione audio/dati',
  uploading: 'Richiesta API in corso',
  retrying: 'Nuovo tentativo (avvio server)',
  success: 'Completata con successo',
  error: 'Errore rilevato',
};

const MIC_LABELS: Record<MicPermissionState, string> = {
  granted: 'Consentito',
  prompt: 'Da richiedere',
  denied: 'Negato / Bloccato',
  unsupported: 'Non interrogabile (es. Safari iOS)',
  error: 'Errore verifica',
};

function extractStatusFromDetails(details: Record<string, unknown>): number | null {
  if (typeof details.status === 'number') return details.status;
  if (typeof details.httpStatus === 'number') return details.httpStatus;
  return null;
}

function formatTimeHMS(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  } catch {
    return iso;
  }
}

export const SystemDiagnosticViewer: React.FC<SystemDiagnosticViewerProps> = ({ onNotify }) => {
  const [liveStatus, setLiveStatus] = useState<LiveApiStatusSnapshot>(() =>
    getLiveApiStatusSnapshot()
  );
  const [clientLogs, setClientLogs] = useState<TranscribeDebugEntry[]>(() =>
    getTranscribeDebugLogs()
  );
  const [serverLogs, setServerLogs] = useState<ServerTranscribeLogEntry[]>([]);
  const [deviceDiag, setDeviceDiag] = useState<LiveDeviceDiagnostics | null>(null);
  const [activeFilter, setActiveFilter] = useState<LogFilterTab>('all');
  const [testingMic, setTestingMic] = useState(false);
  const [testingHealth, setTestingHealth] = useState(false);
  const [loadingServerLogs, setLoadingServerLogs] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<string | null>(null);

  const refreshDeviceDiagnostics = useCallback(async () => {
    const diag = await probeLiveDeviceDiagnostics();
    setDeviceDiag(diag);
  }, []);

  const refreshServerLogs = useCallback(async () => {
    setLoadingServerLogs(true);
    try {
      const res = await fetchServerDebugLogs();
      if (res.ok) {
        setServerLogs(res.logs);
      }
    } finally {
      setLoadingServerLogs(false);
    }
  }, []);

  useEffect(() => {
    void refreshDeviceDiagnostics();
    void refreshServerLogs();

    const unsubscribe = subscribeTranscribeDebug(() => {
      setLiveStatus(getLiveApiStatusSnapshot());
      setClientLogs(getTranscribeDebugLogs());
    });

    const handleOnlineChange = () => {
      void refreshDeviceDiagnostics();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshDeviceDiagnostics();
      }
    };

    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    document.addEventListener('visibilitychange', handleVisibility);

    let permStatusObj: PermissionStatus | null = null;
    const handlePermChange = () => {
      void refreshDeviceDiagnostics();
    };
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          permStatusObj = status;
          status.addEventListener('change', handlePermChange);
        })
        .catch(() => {
          // Safari iOS throws TypeError for microphone permissions query
        });
    }

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (permStatusObj) {
        permStatusObj.removeEventListener('change', handlePermChange);
      }
    };
  }, [refreshDeviceDiagnostics, refreshServerLogs]);

  // Auto-refresh server logs whenever a live API request finishes (success or error)
  useEffect(() => {
    if (liveStatus.phase === 'success' || liveStatus.phase === 'error') {
      const t = window.setTimeout(() => {
        void refreshServerLogs();
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [liveStatus.phase, liveStatus.updatedAt, refreshServerLogs]);

  const unifiedRows = useMemo<UnifiedLogRow[]>(() => {
    const mappedClient: UnifiedLogRow[] = clientLogs.map((c) => ({
      id: `c_${c.id}`,
      timestamp: c.timestamp,
      source: 'client',
      traceId: c.traceId,
      stage: c.stage,
      level: c.level,
      httpStatus:
        typeof c.httpStatus === 'number'
          ? c.httpStatus
          : extractStatusFromDetails(c.details),
      details: c.details,
    }));

    const mappedServer: UnifiedLogRow[] = serverLogs.map((s) => ({
      id: `s_${s.id}`,
      timestamp: s.timestamp,
      source: s.source,
      traceId: s.traceId,
      stage: s.stage,
      level: s.level,
      httpStatus: extractStatusFromDetails(s.details),
      details: s.details,
    }));

    const combined = [...mappedClient, ...mappedServer].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    if (activeFilter === 'http_errors') {
      return combined.filter(
        (r) =>
          r.level === 'error' ||
          r.stage.includes('not_found') ||
          (r.httpStatus !== null && r.httpStatus >= 400)
      );
    }
    if (activeFilter === 'mic') {
      return combined.filter(
        (r) =>
          r.stage.includes('mic') ||
          r.stage.includes('recording') ||
          'micPermissionBefore' in r.details ||
          'micPermissionAfter' in r.details
      );
    }
    if (activeFilter === 'server') {
      return combined.filter((r) => r.source === 'server');
    }
    return combined;
  }, [clientLogs, serverLogs, activeFilter]);

  const handleTestMicrophone = async () => {
    setTestingMic(true);
    try {
      const res = await testMicrophoneAccessNow();
      setLastActionResult(`Test microfono: ${res.message}`);
      await refreshDeviceDiagnostics();
    } finally {
      setTestingMic(false);
    }
  };

  const handleTestServerHealth = async () => {
    setTestingHealth(true);
    try {
      const res = await runServerHealthDiagnosticCheck();
      setLastActionResult(
        res.ok
          ? `Server OK (HTTP ${res.status} in ${res.latencyMs}ms · sessione: ${res.sessionSeen || 'none'})`
          : `Errore server: HTTP ${res.status} (${res.error || 'non raggiungibile'})`
      );
      await refreshServerLogs();
    } finally {
      setTestingHealth(false);
    }
  };

  const handleCopyReport = async () => {
    const report = {
      exportedAt: new Date().toISOString(),
      liveApiStatus: liveStatus,
      deviceDiagnostics: deviceDiag,
      clientLogsCount: clientLogs.length,
      serverLogsCount: serverLogs.length,
      recentLogs: unifiedRows.slice(0, 60),
    };
    const ok = await copyTextToClipboard(JSON.stringify(report, null, 2));
    if (ok) {
      setLastActionResult('Report diagnostico copiato negli appunti.');
      onNotify?.('Report diagnostico copiato negli appunti');
    } else {
      setLastActionResult('Impossibile copiare automaticamente il report.');
    }
  };

  const handleClearAllLogs = async () => {
    clearTranscribeDebugLogs();
    await clearServerDebugLogs();
    setServerLogs([]);
    setLastActionResult('Log client e server azzerati.');
  };

  const statusTone =
    liveStatus.phase === 'error'
      ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/35 text-rose-800 dark:text-rose-200'
      : liveStatus.phase === 'success'
        ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-200'
        : liveStatus.phase === 'uploading' ||
            liveStatus.phase === 'preparing' ||
            liveStatus.phase === 'retrying'
          ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-200'
          : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text)]';

  const micTone =
    deviceDiag?.micPermission === 'granted'
      ? 'text-emerald-700 dark:text-emerald-300'
      : deviceDiag?.micPermission === 'denied'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-amber-700 dark:text-amber-300';

  return (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--app-text)]">
              Log di sistema &amp; Diagnostica Live
            </h4>
            <p className="text-xs text-[var(--app-text-muted)]">
              Stato richieste API in tempo reale, codici HTTP (404 / 500) e permessi microfono.
            </p>
          </div>
        </div>
      </div>

      {/* Live API & Microphone Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className={`rounded-2xl border p-3 space-y-1.5 ${statusTone}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Stato API Live
            </span>
            {liveStatus.lastHttpStatus !== null && (
              <span className="rounded-md border border-current/25 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                HTTP {liveStatus.lastHttpStatus}
              </span>
            )}
          </div>
          <p className="text-xs font-bold">{PHASE_LABELS[liveStatus.phase]}</p>
          <div className="text-[11px] opacity-85 space-y-0.5 font-mono break-all">
            <div>Endpoint: {liveStatus.endpoint || '—'}</div>
            <div>
              Latenza: {liveStatus.elapsedMs !== null ? `${liveStatus.elapsedMs} ms` : '—'} ·
              Sessione: {liveStatus.serverSessionSeen || '—'}
            </div>
            {liveStatus.lastError && (
              <div className="pt-1 font-sans font-semibold text-rose-700 dark:text-rose-300 break-words">
                {liveStatus.lastError}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Microfono &amp; Device
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-text-muted)]">
              {deviceDiag?.onLine ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  Offline
                </>
              )}
            </span>
          </div>
          <p className={`text-xs font-bold ${micTone}`}>
            Permesso: {deviceDiag ? MIC_LABELS[deviceDiag.micPermission] : 'Verifica…'}
          </p>
          <div className="text-[11px] text-[var(--app-text-muted)] space-y-0.5 font-mono break-all">
            <div>
              HTTPS: {deviceDiag?.isSecureContext ? 'Sì' : 'No'} · Recorder:{' '}
              {deviceDiag?.hasMediaRecorder && deviceDiag?.hasGetUserMedia ? 'Pronto' : 'Assente'} ·
              PWA: {deviceDiag?.isStandalonePwa ? 'Sì' : 'Browser'}
            </div>
            <div>
              Codec:{' '}
              {deviceDiag?.supportedMimeTypes.length
                ? deviceDiag.supportedMimeTypes.join(', ')
                : 'Default browser'}
            </div>
            <div>
              Cookie browser:{' '}
              {deviceDiag?.hasDocumentCookie
                ? `Presenti (${deviceDiag.cookieKeyNames.join(', ')})`
                : 'Nessuno visibile'}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Action Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={testingMic}
          onClick={handleTestMicrophone}
          className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-alt)] disabled:opacity-50"
        >
          <Mic className="h-3.5 w-3.5 text-[var(--app-accent-text)]" aria-hidden="true" />
          <span>{testingMic ? 'Verifica microfono…' : 'Test microfono'}</span>
        </button>

        <button
          type="button"
          disabled={testingHealth}
          onClick={handleTestServerHealth}
          className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-alt)] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-[var(--app-accent-text)] ${testingHealth ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{testingHealth ? 'Test server…' : 'Test connessione API'}</span>
        </button>

        <button
          type="button"
          disabled={loadingServerLogs}
          onClick={refreshServerLogs}
          className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-alt)] disabled:opacity-50"
        >
          <Server className="h-3.5 w-3.5 text-[var(--app-accent-text)]" aria-hidden="true" />
          <span>{loadingServerLogs ? 'Carico…' : `Aggiorna server (${serverLogs.length})`}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyReport}
          className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-alt)]"
        >
          <ClipboardCopy className="h-3.5 w-3.5 text-[var(--app-accent-text)]" aria-hidden="true" />
          <span>Copia report</span>
        </button>

        <button
          type="button"
          onClick={handleClearAllLogs}
          className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200 hover:opacity-90"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Pulisci</span>
        </button>
      </div>

      {lastActionResult && (
        <div className="rounded-xl border border-[var(--app-accent-soft-border)] bg-[var(--app-accent-soft)] px-3 py-2 text-xs text-[var(--app-text)] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[var(--app-accent-text)] shrink-0" />
          <span className="break-words">{lastActionResult}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-1">
        {(
          [
            { id: 'all', label: `Tutti (${clientLogs.length + serverLogs.length})` },
            { id: 'http_errors', label: 'Errori HTTP / 404 / 500' },
            { id: 'mic', label: 'Microfono' },
            { id: 'server', label: `Server (${serverLogs.length})` },
          ] as ReadonlyArray<{ id: LogFilterTab; label: string }>
        ).map((tab) => {
          const active = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`min-h-[32px] rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[var(--app-btn-bg)] text-[var(--app-btn-text)] shadow-xs'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Live Log List */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {unifiedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] px-4 py-6 text-center text-xs text-[var(--app-text-muted)]">
            Nessun evento registrato per questo filtro. Avvia una registrazione o esegui un test per vedere i log in tempo reale.
          </div>
        ) : (
          unifiedRows.map((row) => {
            const isError =
              row.level === 'error' ||
              row.stage.includes('not_found') ||
              (row.httpStatus !== null && row.httpStatus >= 400);
            const isWarn = !isError && row.level === 'warn';
            const badgeClass = isError
              ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
              : isWarn
                ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text)]';

            return (
              <div
                key={row.id}
                className={`rounded-xl border p-2.5 text-xs space-y-1 ${badgeClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                    <span className="font-bold">{formatTimeHMS(row.timestamp)}</span>
                    <span className="rounded border border-current/25 px-1.5 py-0.2 uppercase font-bold">
                      {row.source}
                    </span>
                    <span className="font-semibold">{row.stage}</span>
                    {row.httpStatus !== null && (
                      <span className="rounded border border-current/35 px-1.5 py-0.2 font-bold">
                        HTTP {row.httpStatus}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] opacity-75">{row.traceId}</span>
                </div>
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] opacity-90 leading-snug max-h-36 overflow-y-auto">
                  {JSON.stringify(row.details, null, 2)}
                </pre>
              </div>
            );
          })
        )}
      </div>

      {deviceDiag && (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-[11px] text-[var(--app-text-muted)] flex items-start gap-2">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="break-all font-mono">Device UA: {deviceDiag.userAgent}</span>
        </div>
      )}
    </div>
  );
};
