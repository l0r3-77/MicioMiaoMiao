import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  fetchServerQuota,
  formatCountdownHHMMSS,
  formatResetLocalClock,
  loadStoredQuota,
  subscribeQuotaUpdates,
  type QuotaSnapshot,
} from '../utils/quotaTracker';

interface QuotaStatusBarProps {
  className?: string;
}

export const QuotaStatusBar: React.FC<QuotaStatusBarProps> = ({ className = '' }) => {
  const [quota, setQuota] = useState<QuotaSnapshot>(loadStoredQuota);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const unsubscribe = subscribeQuotaUpdates((next) => setQuota(next));
    fetchServerQuota();
    return unsubscribe;
  }, []);

  const isQuotaExhausted = quota.exhausted || quota.remaining <= 0;

  useEffect(() => {
    if (!isQuotaExhausted) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (current >= quota.resetAt) {
        fetchServerQuota();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isQuotaExhausted, quota.resetAt]);

  return (
    <div
      aria-live="polite"
      className={`rounded-2xl border px-3 py-2 text-[11px] transition-colors ${
        isQuotaExhausted
          ? 'border-rose-200 bg-rose-50/75 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200'
          : quota.remaining <= 5
            ? 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-200'
            : 'border-[var(--app-border-soft)] bg-[var(--app-card-alt)] text-[var(--app-text-muted)]'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span className="inline-flex items-center gap-1.5 font-medium min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              isQuotaExhausted
                ? 'bg-rose-500'
                : quota.remaining <= 5
                  ? 'bg-amber-500'
                  : 'bg-sky-400'
            }`}
            aria-hidden="true"
          />
          <span className="truncate">Richieste AI oggi</span>
        </span>
        <span className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0">
          {isQuotaExhausted
            ? `0 / ${quota.limit} · Esaurite`
            : `${quota.remaining} / ${quota.limit} disponibili`}
        </span>
      </div>

      {isQuotaExhausted && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-t border-rose-200/70 dark:border-rose-500/30 pt-1 text-[11px]">
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-rose-800 dark:text-rose-200 tabular-nums">
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            Reset tra {formatCountdownHHMMSS(Math.max(0, quota.resetAt - nowMs))}
          </span>
          <span className="font-mono text-rose-700 dark:text-rose-300 tabular-nums">
            (alle {formatResetLocalClock(quota.resetAt)})
          </span>
        </div>
      )}
    </div>
  );
};
