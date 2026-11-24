export interface QuotaSnapshot {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  resetAt: number;
  updatedAt: string;
}

const QUOTA_STORAGE_KEY = 'agendavoce_quota_state_v1';
const QUOTA_EVENT_NAME = 'agendavoce:quota-updated';
export const DEFAULT_DAILY_QUOTA_LIMIT = 20;

export function getNextPacificMidnightMs(nowMs = Date.now()): number {
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

export function normalizeQuotaSnapshot(raw: unknown): QuotaSnapshot {
  const now = Date.now();
  const obj = raw && typeof raw === 'object' ? (raw as Partial<QuotaSnapshot>) : {};
  const limit =
    typeof obj.limit === 'number' && Number.isFinite(obj.limit) && obj.limit > 0
      ? Math.round(obj.limit)
      : DEFAULT_DAILY_QUOTA_LIMIT;
  let resetAt =
    typeof obj.resetAt === 'number' && Number.isFinite(obj.resetAt) && obj.resetAt > 0
      ? obj.resetAt
      : getNextPacificMidnightMs(now);

  if (now >= resetAt) {
    resetAt = getNextPacificMidnightMs(now);
    return {
      used: 0,
      limit,
      remaining: limit,
      exhausted: false,
      resetAt,
      updatedAt: new Date(now).toISOString(),
    };
  }

  const used =
    typeof obj.used === 'number' && Number.isFinite(obj.used) && obj.used >= 0
      ? Math.min(limit, Math.round(obj.used))
      : 0;
  const exhausted = Boolean(obj.exhausted) || used >= limit;
  const remaining = exhausted
    ? 0
    : typeof obj.remaining === 'number' && Number.isFinite(obj.remaining)
      ? Math.max(0, Math.min(limit, Math.round(obj.remaining)))
      : Math.max(0, limit - used);

  return {
    used: exhausted ? limit : used,
    limit,
    remaining,
    exhausted: remaining === 0 || exhausted,
    resetAt,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date(now).toISOString(),
  };
}

function isSameQuotaWindow(a: QuotaSnapshot, b: QuotaSnapshot): boolean {
  // Windows within ~2 hours of each other belong to the same Pacific day / reset cycle
  return Math.abs(a.resetAt - b.resetAt) < 2 * 3600 * 1000;
}

export function mergeQuotaSnapshots(
  local: QuotaSnapshot,
  incoming: QuotaSnapshot
): QuotaSnapshot {
  const now = Date.now();
  if (now >= local.resetAt) {
    return incoming;
  }
  if (!isSameQuotaWindow(local, incoming)) {
    // If incoming explicitly marks exhaustion with a newer/authoritative resetAt, trust it
    return incoming.exhausted ? incoming : local.exhausted ? local : incoming;
  }

  const limit = Math.max(1, incoming.limit || local.limit || DEFAULT_DAILY_QUOTA_LIMIT);
  const exhausted = local.exhausted || incoming.exhausted;
  const used = exhausted ? limit : Math.min(limit, Math.max(local.used, incoming.used));
  const remaining = exhausted ? 0 : Math.max(0, limit - used);
  const resetAt = incoming.exhausted ? incoming.resetAt : Math.max(local.resetAt, incoming.resetAt);

  return {
    used,
    limit,
    remaining,
    exhausted,
    resetAt,
    updatedAt:
      incoming.updatedAt > local.updatedAt ? incoming.updatedAt : local.updatedAt,
  };
}

export function loadStoredQuota(): QuotaSnapshot {
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      return normalizeQuotaSnapshot(JSON.parse(raw));
    }
  } catch {
    // ignore storage errors
  }
  return normalizeQuotaSnapshot(null);
}

export function publishQuotaSnapshot(
  raw: unknown,
  options: { mergeWithLocal?: boolean } = {}
): QuotaSnapshot {
  const normalizedIncoming = normalizeQuotaSnapshot(raw);
  const finalSnapshot = options.mergeWithLocal
    ? mergeQuotaSnapshots(loadStoredQuota(), normalizedIncoming)
    : normalizedIncoming;

  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(finalSnapshot));
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<QuotaSnapshot>(QUOTA_EVENT_NAME, { detail: finalSnapshot }));
  }
  return finalSnapshot;
}

export function subscribeQuotaUpdates(handler: (snapshot: QuotaSnapshot) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const custom = event as CustomEvent<QuotaSnapshot>;
    if (custom.detail) {
      handler(normalizeQuotaSnapshot(custom.detail));
    }
  };
  window.addEventListener(QUOTA_EVENT_NAME, listener);
  return () => window.removeEventListener(QUOTA_EVENT_NAME, listener);
}

export async function fetchServerQuota(): Promise<QuotaSnapshot | null> {
  const local = loadStoredQuota();
  try {
    const res = await fetch('/api/quota/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quota: local }),
    });
    if (res.ok) {
      const data = (await res.json()) as { quota?: unknown };
      if (data?.quota) {
        return publishQuotaSnapshot(data.quota, { mergeWithLocal: true });
      }
    }
  } catch {
    // fallback to GET if needed
  }

  try {
    const res = await fetch('/api/quota');
    if (!res.ok) return null;
    const data = (await res.json()) as { quota?: unknown };
    if (data?.quota) {
      return publishQuotaSnapshot(data.quota, { mergeWithLocal: true });
    }
  } catch {
    // offline or transient failure
  }
  return null;
}

export function formatCountdownHHMMSS(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export function formatResetLocalClock(resetAtMs: number): string {
  try {
    return new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(resetAtMs));
  } catch {
    return '09:00';
  }
}
