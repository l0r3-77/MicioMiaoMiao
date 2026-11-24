import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Home,
  Maximize2,
  RefreshCw,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type {
  OrganizeNoteItem,
  TodoNoteItem,
  WidgetConfig,
  WidgetSizePreset,
  WidgetSourceKey,
} from '../types/dailyTodo';
import {
  buildScriptableWidgetCode,
  DAY_PHASE_MAP,
  DAY_PHASES,
  TODO_BLOCK_MAP,
  TODO_BLOCKS,
} from '../utils/dailyTodoStorage';
import { resolveCatEmoticonId } from '../utils/catEmoticonLibrary';
import { formatItalianDateShort, toISODate } from '../utils/dateUtils';
import { CatEmoticonIcon } from './CatEmoticon';

interface IPhoneWidgetStudioProps {
  config: WidgetConfig;
  todoItems: TodoNoteItem[];
  organizeItems: OrganizeNoteItem[];
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  openHomeTrigger?: number;
  onChangeConfig: (patch: Partial<WidgetConfig>) => void;
  onForceSync: () => void;
  onActivateDirectHomeWidget?: () => void;
  onToggleTodoDone?: (id: string) => void;
  onToggleOrganizeDone?: (id: string) => void;
  onNotify: (msg: string) => void;
}

const SIZE_PRESETS: Array<{
  id: WidgetSizePreset;
  label: string;
  dimLabel: string;
  heightPx: number;
  widthPct: number;
}> = [
  { id: 'small', label: 'Piccolo', dimLabel: '2×2', heightPx: 158, widthPct: 58 },
  { id: 'medium', label: 'Medio', dimLabel: '4×2', heightPx: 196, widthPct: 100 },
  { id: 'large', label: 'Grande', dimLabel: '4×4', heightPx: 336, widthPct: 100 },
];

export const IPhoneWidgetStudio: React.FC<IPhoneWidgetStudioProps> = ({
  config,
  todoItems,
  organizeItems,
  syncStatus,
  lastSyncedAt,
  openHomeTrigger = 0,
  onChangeConfig,
  onForceSync,
  onActivateDirectHomeWidget,
  onToggleTodoDone,
  onToggleOrganizeDone,
  onNotify,
}) => {
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<'code' | 'url' | null>(null);
  const { isInstallable, isIOS, install } = usePWAInstall();

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://agendavoce.app';

  const todayIso = toISODate(new Date());

  useEffect(() => {
    if (openHomeTrigger > 0) {
      onForceSync();
      setShowAddHomeModal(true);
    }
  }, [openHomeTrigger]);

  const sourceOptions: Array<{ key: WidgetSourceKey; label: string }> = [
    { key: 'today', label: 'Giornata attuale' },
    ...TODO_BLOCKS.map((b) => ({ key: b.key as WidgetSourceKey, label: b.title })),
  ];

  const widgetData = useMemo(() => {
    if (config.source === 'today') {
      const phaseOrder = new Map(DAY_PHASES.map((p, idx) => [p.key, idx]));
      const sorted = organizeItems
        .filter((item) => item.date === todayIso)
        .sort((a, b) => {
          const pa = phaseOrder.get(a.phase) ?? 0;
          const pb = phaseOrder.get(b.phase) ?? 0;
          if (pa !== pb) return pa - pb;
          return a.order - b.order;
        });
      let lastPhase: string | null = null;
      const items = sorted.map((item) => {
        const isFirst = item.phase !== lastPhase;
        lastPhase = item.phase;
        return {
          id: item.id,
          kind: 'organize' as const,
          text: item.text,
          emoji: resolveCatEmoticonId(item.emoji, item.text),
          phaseLabel: isFirst ? DAY_PHASE_MAP[item.phase]?.title || item.phase : '',
          done: item.done,
        };
      });
      return {
        title: `Oggi · ${formatItalianDateShort(todayIso)}`,
        subtitle: '',
        items,
      };
    }

    const blockMeta = TODO_BLOCK_MAP[config.source];
    const items = todoItems
      .filter((item) => item.block === config.source)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        id: item.id,
        kind: 'todo' as const,
        text: item.text,
        emoji: resolveCatEmoticonId(item.emoji, item.text, item.block),
        phaseLabel: '',
        done: item.done,
      }));
    return {
      title: blockMeta.title,
      subtitle: 'Sottosezione Da Fare',
      items,
    };
  }, [config.source, organizeItems, todoItems, todayIso]);

  const scriptCode = useMemo(
    () => buildScriptableWidgetCode(origin, config),
    [origin, config]
  );

  const standaloneUrl = `${origin}/?widget=1&token=${encodeURIComponent(config.token)}&source=${encodeURIComponent(config.source)}&size=${encodeURIComponent(config.size)}`;

  const handleSelectPreset = (preset: (typeof SIZE_PRESETS)[number]) => {
    onChangeConfig({
      size: preset.id,
      customHeightPx: preset.heightPx,
      customWidthPct: preset.widthPct,
    });
  };

  const handleCopy = async (text: string, which: 'code' | 'url', silent = false) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(which);
      if (!silent) {
        onNotify(
          which === 'code'
            ? 'Codice widget Scriptable copiato per iPhone!'
            : 'Link live del widget copiato!'
        );
      }
      window.setTimeout(() => setCopiedKey(null), 2200);
      return true;
    } catch {
      if (!silent) {
        onNotify('Copia non riuscita: seleziona il testo manualmente.');
      }
      return false;
    }
  };

  const handleDownloadScriptFile = () => {
    const blob = new Blob([scriptCode], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MicioMiaoWidget-${config.source}.js`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('File widget scaricato: aprilo in Scriptable per aggiungerlo alla Home.');
  };

  const handleDirectAddWidgetClick = async () => {
    onForceSync();
    await handleCopy(scriptCode, 'code', true);
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        onNotify('Widget installato sulla schermata Home!');
        return;
      }
    }
    setShowAddHomeModal(true);
  };

  const handleOpenLiveHomeWidget = async () => {
    onForceSync();
    setShowAddHomeModal(false);
    if (onActivateDirectHomeWidget) {
      onActivateDirectHomeWidget();
      return;
    }
    window.location.href = standaloneUrl;
  };

  const handleOpenInScriptable = async () => {
    await handleCopy(scriptCode, 'code', true);
    onNotify('Codice copiato: incollalo nel nuovo script Scriptable!');
    window.location.href = 'scriptable:///add';
  };

  const isCompactWidth = config.customWidthPct <= 66;
  const maxPreviewRows =
    config.customHeightPx < 175 ? 4 : config.customHeightPx < 240 ? 6 : 11;

  return (
    <section className="rounded-3xl border border-[#7ECBBF]/85 bg-[#F7FEFC]/95 p-3.5 sm:p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0E8A7E] to-[#0B5B53] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#083B37] truncate">
              Widget Home iPhone
            </h3>
            <p className="text-[11px] text-[#0E645D] truncate">
              Giornata attuale o blocco «Da Fare» sempre sincronizzato
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onForceSync}
          disabled={syncStatus === 'syncing'}
          className="min-h-[34px] inline-flex items-center gap-1.5 rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-2.5 py-1 text-[11px] font-semibold text-[#0B4F49] hover:bg-[#D4F3EC] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <RefreshCw
            className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>
            {syncStatus === 'syncing'
              ? 'Sincronizzo...'
              : syncStatus === 'synced'
                ? 'Sincronizzato'
                : 'Sincronizza'}
          </span>
        </button>
      </div>

      {/* Primary Direct Button: Aggiungi widget in Home */}
      <button
        type="button"
        onClick={handleDirectAddWidgetClick}
        className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-[#0C786E] hover:to-[#08443E] transition-colors whitespace-nowrap"
      >
        <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Aggiungi widget in Home</span>
      </button>

      {/* Source selector */}
      <div className="flex flex-wrap gap-1.5">
        {sourceOptions.map((opt) => {
          const active = config.source === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChangeConfig({ source: opt.key })}
              aria-pressed={active}
              className={`min-h-[32px] rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'border-[#08443E] bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] text-white shadow-xs'
                  : 'border-[#7ECBBF] bg-[#E5F9F4] text-[#0B4F49] hover:border-[#0E8A7E]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Size Presets + Custom Resize Sliders */}
      <div className="rounded-2xl border border-[#8AD1C5]/85 bg-[#EDFBF8]/95 p-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0B4F49]">
            <Maximize2 className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>Dimensione</span>
          </div>
          <div className="flex items-center gap-1">
            {SIZE_PRESETS.map((preset) => {
              const active = config.size === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`min-h-[28px] rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#08443E] bg-[#0B5B53] text-white'
                      : 'border-[#7ECBBF] bg-[#F7FEFC] text-[#0B4F49] hover:border-[#0E8A7E]'
                  }`}
                >
                  {preset.label} ({preset.dimLabel})
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="block space-y-0.5">
            <div className="flex items-center justify-between text-[10.5px] font-medium text-[#0B534D]">
              <span>Altezza</span>
              <span className="font-mono tabular-nums">{config.customHeightPx}px</span>
            </div>
            <input
              type="range"
              min={140}
              max={400}
              step={8}
              value={config.customHeightPx}
              onChange={(e) => {
                const h = Number(e.target.value);
                const inferredSize: WidgetSizePreset =
                  h < 175 ? 'small' : h < 250 ? 'medium' : 'large';
                onChangeConfig({ customHeightPx: h, size: inferredSize });
              }}
              aria-label="Altezza widget"
              className="w-full accent-[#0D7D72] cursor-pointer"
            />
          </label>

          <label className="block space-y-0.5">
            <div className="flex items-center justify-between text-[10.5px] font-medium text-[#0B534D]">
              <span>Larghezza</span>
              <span className="font-mono tabular-nums">{config.customWidthPct}%</span>
            </div>
            <input
              type="range"
              min={52}
              max={100}
              step={2}
              value={config.customWidthPct}
              onChange={(e) => onChangeConfig({ customWidthPct: Number(e.target.value) })}
              aria-label="Larghezza widget"
              className="w-full accent-[#0D7D72] cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Glossy Light Aqua-Green Live iPhone Widget Preview */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0F766E] via-[#0A534D] to-[#063632] p-3.5 sm:p-4 flex flex-col items-center justify-center shadow-inner">
        <div
          style={{
            width: `${config.customWidthPct}%`,
            height: `${config.customHeightPx}px`,
          }}
          className="rounded-[22px] bg-gradient-to-b from-[#F7FEFC]/95 via-[#E5F9F4]/95 to-[#C7EFE6]/95 border border-[#E6FCF8]/85 shadow-xl p-3 flex flex-col overflow-hidden transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#8AD1C5]/80 shrink-0">
            <div className="min-w-0">
              <p
                className={`font-bold text-[#083B37] truncate ${
                  isCompactWidth ? 'text-xs' : 'text-sm'
                }`}
              >
                {widgetData.title}
              </p>
              {!isCompactWidth && widgetData.subtitle && (
                <p className="text-[10px] font-medium text-[#0E645D] truncate">
                  {widgetData.subtitle}
                </p>
              )}
            </div>
            <span className="font-mono text-[11px] font-bold text-[#0B534D] bg-[#BEECE1]/90 rounded-md px-1.5 py-0.5 tabular-nums shrink-0">
              {widgetData.items.filter((i) => !i.done).length}/{widgetData.items.length}
            </span>
          </div>

          <div className="mt-1.5 flex-1 overflow-y-auto space-y-1 pr-0.5">
            {widgetData.items.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-2">
                <p className="text-xs text-[#0E645D]">Nessuna nota al momento.</p>
              </div>
            ) : (
              widgetData.items.slice(0, maxPreviewRows).map((item) => (
                <React.Fragment key={item.id}>
                  {item.phaseLabel ? (
                    <div className="px-1 pt-0.5 text-[9.5px] font-bold text-[#0F766E] leading-none">
                      {item.phaseLabel}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (item.kind === 'todo') onToggleTodoDone?.(item.id);
                      else onToggleOrganizeDone?.(item.id);
                    }}
                    className="w-full text-left flex items-center gap-1.5 rounded-lg border border-[#9BDCD1]/90 bg-[#F7FEFC]/90 px-2 py-0.5 hover:border-[#0E8A7E] transition-colors"
                  >
                    {item.done ? (
                      <CheckCircle2
                        className="h-3 w-3 text-[#0F766E] shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="h-3 w-3 text-[#68B9AD] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <CatEmoticonIcon emoticonId={item.emoji} text={item.text} sizeClass="h-4 w-4" />
                    <span
                      className={`min-w-0 flex-1 truncate text-[11px] leading-tight font-medium text-[#072C29] ${
                        item.done ? 'line-through opacity-55' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>
                </React.Fragment>
              ))
            )}
            {widgetData.items.length > maxPreviewRows && (
              <p className="text-[10.5px] font-semibold text-[#0B534D] pt-0.5 pl-1">
                +{widgetData.items.length - maxPreviewRows} altre note…
              </p>
            )}
          </div>
        </div>

        <p className="mt-2 text-[10.5px] text-[#CCFBF1] text-center">
          Anteprima live · {lastSyncedAt ? `Aggiornato alle ${lastSyncedAt}` : 'Pronto per iPhone'}
        </p>
      </div>

      {/* Secondary Widget Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleCopy(scriptCode, 'code')}
          className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-3 py-1.5 text-xs font-semibold text-[#0B4F49] hover:bg-[#D4F3EC] transition-colors whitespace-nowrap"
        >
          {copiedKey === 'code' ? (
            <Check className="h-3.5 w-3.5 text-[#0B5B53]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
          )}
          <span>
            {copiedKey === 'code' ? 'Script copiato!' : 'Copia codice Scriptable'}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenLiveHomeWidget}
            className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC] px-3 py-1.5 text-xs font-semibold text-[#0B4F49] hover:bg-[#D8F4EE] transition-colors whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>Apri Widget</span>
          </button>
          <button
            type="button"
            onClick={() => setShowScriptCode((v) => !v)}
            className="min-h-[38px] inline-flex items-center justify-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC] px-3 py-1.5 text-xs font-semibold text-[#0B534D] hover:bg-[#D8F4EE] whitespace-nowrap"
          >
            <Code2 className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>{showScriptCode ? 'Nascondi' : 'Codice'}</span>
          </button>
        </div>
      </div>

      {showScriptCode && (
        <div className="rounded-2xl border border-[#74C4B6] bg-[#062B28] text-[#E6FCF8] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#BFF5EA]">
            <span>
              Incolla nell’app gratuita <strong>Scriptable</strong> su iPhone → aggiungi Widget sulla Home.
            </span>
            <button
              type="button"
              onClick={() => handleCopy(standaloneUrl, 'url')}
              className="underline font-semibold text-[#5EEAD4] shrink-0"
            >
              Copia link feed
            </button>
          </div>
          <pre className="max-h-40 overflow-auto text-[10.5px] font-mono leading-relaxed text-[#CCFBF1] whitespace-pre-wrap break-all">
            {scriptCode}
          </pre>
        </div>
      )}

      {/* Compact Direct Add-to-Home Widget Modal */}
      {showAddHomeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#042422]/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="widget-home-modal-title"
          onClick={() => setShowAddHomeModal(false)}
        >
          <div
            className="w-full max-w-[330px] rounded-2xl border border-[#7ECBBF] bg-[#F7FEFC] p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#0E8A7E] to-[#0B5B53] text-white flex items-center justify-center shrink-0">
                  <Home className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <h4 id="widget-home-modal-title" className="text-xs font-bold text-[#083B37] truncate">
                  Aggiungi widget in Home
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddHomeModal(false)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#9BDCD1] text-[#0B534D] hover:bg-[#D8F4EE] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenLiveHomeWidget}
                className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-3 py-2 text-xs font-bold text-white hover:from-[#0C786E] hover:to-[#08443E] transition-colors"
              >
                <Share className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {isIOS
                    ? 'Apri Widget → Condividi su Home'
                    : 'Apri Widget in modalità Home'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenInScriptable}
                  className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-2.5 py-1.5 text-[11px] font-semibold text-[#0B4F49] hover:bg-[#D4F3EC] whitespace-nowrap"
                >
                  <Smartphone className="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
                  <span>Apri Scriptable</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadScriptFile}
                  className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#F7FEFC] px-2.5 py-1.5 text-[11px] font-semibold text-[#0B4F49] hover:bg-[#D8F4EE] whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
                  <span>Scarica .js</span>
                </button>
              </div>
            </div>

            <p className="text-[10.5px] text-[#0B534D] leading-snug">
              {isIOS
                ? 'Per il collegamento diretto su Safari tocca Condividi (□↑) → Aggiungi alla schermata Home. Oppure usa Scriptable (codice già copiato).'
                : 'Il codice Scriptable per iOS è già copiato negli appunti. Puoi anche aprire il widget live o scaricare il file .js.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

interface StandaloneIPhoneWidgetViewProps {
  source: WidgetSourceKey;
  size: WidgetSizePreset;
  todoItems: TodoNoteItem[];
  organizeItems: OrganizeNoteItem[];
  onToggleTodoDone: (id: string) => void;
  onToggleOrganizeDone: (id: string) => void;
  onOpenFullApp: () => void;
}

export const StandaloneIPhoneWidgetView: React.FC<StandaloneIPhoneWidgetViewProps> = ({
  source,
  size,
  todoItems,
  organizeItems,
  onToggleTodoDone,
  onToggleOrganizeDone,
  onOpenFullApp,
}) => {
  const todayIso = toISODate(new Date());
  const isToday = source === 'today';
  const phaseOrder = new Map(DAY_PHASES.map((p, idx) => [p.key, idx]));
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [homeHint, setHomeHint] = useState(false);

  const items = useMemo(() => {
    if (isToday) {
      const sorted = organizeItems
        .filter((item) => item.date === todayIso)
        .sort((a, b) => {
          const pa = phaseOrder.get(a.phase) ?? 0;
          const pb = phaseOrder.get(b.phase) ?? 0;
          if (pa !== pb) return pa - pb;
          return a.order - b.order;
        });
      let lastPhase: string | null = null;
      return sorted.map((item) => {
        const isFirst = item.phase !== lastPhase;
        lastPhase = item.phase;
        return {
          id: item.id,
          kind: 'organize' as const,
          text: item.text,
          emoji: resolveCatEmoticonId(item.emoji, item.text),
          phaseLabel: isFirst ? DAY_PHASE_MAP[item.phase]?.title || item.phase : '',
          done: item.done,
        };
      });
    }
    return todoItems
      .filter((item) => item.block === source)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        id: item.id,
        kind: 'todo' as const,
        text: item.text,
        emoji: resolveCatEmoticonId(item.emoji, item.text, item.block),
        phaseLabel: '',
        done: item.done,
      }));
  }, [isToday, organizeItems, todoItems, source, todayIso]);

  const title = isToday
    ? `Oggi · ${formatItalianDateShort(todayIso)}`
    : TODO_BLOCK_MAP[source].title;

  const maxWidthClass =
    size === 'small' ? 'max-w-[260px]' : size === 'medium' ? 'max-w-md' : 'max-w-lg';

  const handlePinWidgetToHome = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${title} · MicioMiao`,
          url: window.location.href,
        });
        return;
      } catch {
        // user dismissed or unsupported; fall back to crisp inline guide
      }
    }
    setHomeHint((v) => !v);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#C4EFE6] via-[#E5FAF6] to-[#AEE6DA] p-4 flex items-center justify-center">
      <div
        className={`w-full ${maxWidthClass} rounded-3xl border border-[#74C4B6] bg-[#F7FEFC]/95 p-3.5 shadow-xl space-y-2.5`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#B6E6DD] pb-2">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#083B37] truncate">{title}</h1>
            <p className="text-[10.5px] font-medium text-[#0E645D]">
              {isToday ? 'MicioMiao' : 'MicioMiao · Da Fare'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isInstalled && (
              <button
                type="button"
                onClick={handlePinWidgetToHome}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[#74C4B6] bg-[#D8F4EE] px-2.5 py-1 text-[11px] font-semibold text-[#083B37] hover:bg-[#BEECE1] whitespace-nowrap"
              >
                <Home className="h-3 w-3 text-[#0F766E]" aria-hidden="true" />
                <span>In Home</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenFullApp}
              className="min-h-[34px] rounded-xl bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-3 py-1 text-xs font-semibold text-white hover:from-[#0C786E] hover:to-[#08443E] whitespace-nowrap"
            >
              Apri App
            </button>
          </div>
        </div>

        {homeHint && (
          <div className="rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-2.5 py-2 text-[11px] text-[#083B37] leading-snug">
            Tocca <strong>Condividi (□↑)</strong> nel browser e seleziona{' '}
            <strong>Aggiungi alla schermata Home</strong> per avere questo widget sempre pronto.
          </div>
        )}

        {items.length === 0 ? (
          <p className="py-5 text-center text-xs text-[#0E645D]">
            Nessuna nota presente al momento.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <React.Fragment key={item.id}>
                {item.phaseLabel ? (
                  <div className="px-1 pt-1 text-[10px] font-bold text-[#0F766E] leading-none">
                    {item.phaseLabel}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    item.kind === 'todo'
                      ? onToggleTodoDone(item.id)
                      : onToggleOrganizeDone(item.id)
                  }
                  className="w-full text-left flex items-center gap-2 rounded-lg border border-[#9BDCD1] bg-[#EDFBF8]/90 px-2.5 py-1 hover:border-[#0E8A7E] transition-colors"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0F766E] shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-[#68B9AD] shrink-0" />
                  )}
                  <CatEmoticonIcon emoticonId={item.emoji} text={item.text} sizeClass="h-4 w-4" />
                  <span
                    className={`text-xs font-medium text-[#072C29] flex-1 leading-tight ${
                      item.done ? 'line-through opacity-55' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
