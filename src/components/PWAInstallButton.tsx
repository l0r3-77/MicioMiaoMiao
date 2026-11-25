import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-card)] px-3.5 py-2 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-card-alt)] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
      >
        <Download className="h-4 w-4 text-[var(--app-accent)]" aria-hidden="true" />
        Installa App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-card)] px-3.5 py-2 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-card-alt)] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
        >
          <Smartphone className="h-4 w-4 text-[var(--app-accent)]" aria-hidden="true" />
          Aggiungi a iPhone
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/45 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[var(--app-card)] border border-[var(--app-border-soft)] p-6 shadow-xl pb-safe">
              <div className="w-10 h-1.5 bg-[var(--app-border-soft)] rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-start justify-between gap-4">
                <h3 id="ios-install-title" className="text-lg font-semibold text-[var(--app-text)]">
                  Installa su iPhone
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Chiudi guida"
                  className="min-h-[44px] min-w-[44px] -mt-2 -mr-2 flex items-center justify-center rounded-xl text-[var(--app-text-subtle)] hover:bg-[var(--app-card-alt)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-3 text-sm text-[var(--app-text-muted)] leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[var(--app-accent)] pt-0.5 tabular-nums">01.</span>
                  <span>
                    Tocca il pulsante <strong className="text-[var(--app-text)] inline-flex items-center gap-1">Condividi <Share className="h-3.5 w-3.5 inline" /></strong> nella barra di Safari.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[var(--app-accent)] pt-0.5 tabular-nums">02.</span>
                  <span>
                    Scorri verso il basso e seleziona <strong className="text-[var(--app-text)]">Aggiungi a schermata Home</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[var(--app-accent)] pt-0.5 tabular-nums">03.</span>
                  <span>
                    Conferma toccando <strong className="text-[var(--app-text)]">Aggiungi</strong> in alto a destra.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full min-h-[44px] rounded-xl bg-[var(--app-btn-bg)] py-2.5 text-sm font-medium text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] transition-colors"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
