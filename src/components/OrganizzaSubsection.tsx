import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardPaste,
  GripVertical,
  ListTodo,
  Loader2,
  Mic,
  Plus,
  Printer,
  Send,
  Square,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type {
  DayPhaseKey,
  OrganizeNoteItem,
  TodoNoteItem,
  WidgetConfig,
} from '../types/dailyTodo';
import type { DailyNote } from '../types/note';
import {
  DAY_PHASE_MAP,
  DAY_PHASES,
  TODO_BLOCKS,
} from '../utils/dailyTodoStorage';
import {
  parsePastedLinesSingleRow,
  readClipboardTextDirect,
} from '../utils/clipboardHelper';
import {
  CAT_EMOTICON_MAP,
  inferCatEmoticonId,
  resolveCatEmoticonId,
  type CatEmoticonId,
} from '../utils/catEmoticonLibrary';
import {
  addDaysISO,
  formatDuration,
  formatItalianDateShort,
  formatItalianWeekdayShort,
  toISODate,
} from '../utils/dateUtils';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import { publishQuotaSnapshot } from '../utils/quotaTracker';
import { CatEmoticonIcon, CatEmoticonPicker } from './CatEmoticon';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';
import { IPhoneWidgetStudio } from './IPhoneWidgetStudio';
import {
  OrganizeExportCardBlock,
  OrganizeExportModal,
} from './OrganizeExportBlock';

interface OrganizzaSubsectionProps {
  dailyNotes?: DailyNote[];
  todoItems: TodoNoteItem[];
  organizeItems: OrganizeNoteItem[];
  sectionLayout: SectionLayoutState;
  widgetConfig: WidgetConfig;
  widgetSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  widgetLastSyncedAt: string | null;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onAddOrganizeItem: (item: OrganizeNoteItem) => void;
  onAddManyOrganizeItems: (items: OrganizeNoteItem[]) => void;
  onUpdateOrganizeItem: (id: string, patch: Partial<OrganizeNoteItem>) => void;
  onDeleteOrganizeItem: (id: string) => void;
  onMoveOrReorderOrganizeItem: (
    draggedId: string,
    targetDate: string,
    targetPhase: DayPhaseKey,
    targetItemId?: string | null
  ) => void;
  onMergeOrganizeItems: (sourceId: string, targetId: string) => void;
  onMoveOrganizeStep: (id: string, delta: -1 | 1) => void;
  onPickTodoForOrganize: (
    todo: TodoNoteItem,
    date: string,
    phase: DayPhaseKey,
    removeFromTodo: boolean
  ) => void;
  onChangeWidgetConfig: (patch: Partial<WidgetConfig>) => void;
  onForceSyncWidget: () => void;
  openWidgetHomeTrigger?: number;
  onActivateDirectHomeWidget?: () => void;
  onToggleTodoDone: (id: string) => void;
  onNotify: (msg: string) => void;
}

export const OrganizzaSubsection: React.FC<OrganizzaSubsectionProps> = ({
  dailyNotes = [],
  todoItems,
  organizeItems,
  sectionLayout,
  widgetConfig,
  widgetSyncStatus,
  widgetLastSyncedAt,
  onChangeLayout,
  onResetLayout,
  onAddOrganizeItem,
  onAddManyOrganizeItems,
  onUpdateOrganizeItem,
  onDeleteOrganizeItem,
  onMoveOrReorderOrganizeItem,
  onMergeOrganizeItems,
  onMoveOrganizeStep,
  onPickTodoForOrganize,
  onChangeWidgetConfig,
  onForceSyncWidget,
  openWidgetHomeTrigger = 0,
  onActivateDirectHomeWidget,
  onToggleTodoDone,
  onNotify,
}) => {
  const todayIso = toISODate(new Date());
  const [rangeStartIso, setRangeStartIso] = useState<string>(() => todayIso);
  const [totalDaysCount, setTotalDaysCount] = useState<number>(14);
  // Horizontal zoom slider: 1 to 4 visible days on screen (default 4)
  const [visibleDaysZoom, setVisibleDaysZoom] = useState<number>(4);

  // Compact New Note Modal (triggered by tapping a day phase or "+ Nuova nota")
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalTab, setNewModalTab] = useState<'create' | 'from_todo'>('create');
  const [newModalDate, setNewModalDate] = useState<string>(todayIso);
  const [newModalPhase, setNewModalPhase] = useState<DayPhaseKey>('mattina');
  const [newModalText, setNewModalText] = useState('');
  const [manualNewCat, setManualNewCat] = useState<CatEmoticonId | null>(null);
  const [showNewCatPicker, setShowNewCatPicker] = useState(false);
  const [newModalError, setNewModalError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [removePickedTodo, setRemovePickedTodo] = useState(false);

  // Compact Edit Existing Note Modal
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [showEditCatPicker, setShowEditCatPicker] = useState(false);

  // Batch Paste Modal for any day in Organizza
  const [pasteDate, setPasteDate] = useState<string | null>(null);
  const [pastePhase, setPastePhase] = useState<DayPhaseKey>('mattina');
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isParsingBatch, setIsParsingBatch] = useState(false);
  const pasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Quick Export & Print Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalDate, setExportModalDate] = useState<string>(todayIso);
  const [exportModalScope, setExportModalScope] = useState<'day' | 'week'>('day');

  // Drag & Drop state (mouse HTML5 + iPhone touch pointer drag): supports Move/Reorder AND Merge
  const [draggedOrgId, setDraggedOrgId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    date: string;
    phase: DayPhaseKey;
    insertBeforeId?: string | null;
    insertEnd?: boolean;
    mergeTargetId?: string | null;
  } | null>(null);
  const pointerDragRef = useRef<{ id: string; active: boolean } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    isRecording,
    elapsedSeconds,
    levels,
    error: micError,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: clearMicError,
  } = useVoiceRecorder();

  const daysList = useMemo(() => {
    return Array.from({ length: totalDaysCount }, (_, idx) =>
      addDaysISO(rangeStartIso, idx)
    );
  }, [rangeStartIso, totalDaysCount]);

  const itemsBySlot = useMemo(() => {
    const map = new Map<string, OrganizeNoteItem[]>();
    for (const item of organizeItems) {
      const key = `${item.date}|${item.phase}`;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [organizeItems]);

  const selectedOrgItem = useMemo(
    () => organizeItems.find((o) => o.id === selectedOrgId) || null,
    [organizeItems, selectedOrgId]
  );

  useEffect(() => {
    if (selectedOrgItem) {
      setEditDraftText(selectedOrgItem.text);
      setShowEditCatPicker(false);
    }
  }, [selectedOrgItem?.id]);

  const resetOrgDragState = () => {
    pointerDragRef.current = null;
    setDraggedOrgId(null);
    setDropTarget(null);
  };

  // Touch Pointer drag support for iPhone (Move/Reorder + Merge)
  useEffect(() => {
    const inspectPoint = (x: number, y: number, draggedId: string) => {
      const elements = document.elementsFromPoint(x, y);
      let insertBeforeId: string | null = null;
      let insertEndSlot: { date: string; phase: DayPhaseKey } | null = null;
      let mergeTargetId: string | null = null;
      let slotDate: string | null = null;
      let slotPhase: DayPhaseKey | null = null;

      for (const el of elements) {
        if (!insertBeforeId) {
          const ib = el.getAttribute('data-org-insert-before');
          if (ib && ib !== draggedId) insertBeforeId = ib;
        }
        if (!insertEndSlot) {
          const ie = el.getAttribute('data-org-insert-end');
          if (ie && ie.includes('|')) {
            const [d, p] = ie.split('|');
            if (d && p) insertEndSlot = { date: d, phase: p as DayPhaseKey };
          }
        }
        if (!mergeTargetId) {
          const mi = el.getAttribute('data-org-merge-id');
          if (mi && mi !== draggedId) mergeTargetId = mi;
        }
        if (!slotDate || !slotPhase) {
          const d = el.getAttribute('data-org-date');
          const p = el.getAttribute('data-org-phase') as DayPhaseKey | null;
          if (d && p) {
            slotDate = d;
            slotPhase = p;
          }
        }
      }
      return { insertBeforeId, insertEndSlot, mergeTargetId, slotDate, slotPhase };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const st = pointerDragRef.current;
      if (!st?.active) return;
      const hit = inspectPoint(e.clientX, e.clientY, st.id);
      if (hit.insertBeforeId && hit.slotDate && hit.slotPhase) {
        setDropTarget({
          date: hit.slotDate,
          phase: hit.slotPhase,
          insertBeforeId: hit.insertBeforeId,
        });
      } else if (hit.insertEndSlot) {
        setDropTarget({
          date: hit.insertEndSlot.date,
          phase: hit.insertEndSlot.phase,
          insertEnd: true,
        });
      } else if (hit.mergeTargetId && hit.slotDate && hit.slotPhase) {
        setDropTarget({
          date: hit.slotDate,
          phase: hit.slotPhase,
          mergeTargetId: hit.mergeTargetId,
        });
      } else if (hit.slotDate && hit.slotPhase) {
        setDropTarget({ date: hit.slotDate, phase: hit.slotPhase });
      } else {
        setDropTarget(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const st = pointerDragRef.current;
      if (!st?.active) return;
      const hit = inspectPoint(e.clientX, e.clientY, st.id);
      if (hit.insertBeforeId && hit.slotDate && hit.slotPhase) {
        onMoveOrReorderOrganizeItem(st.id, hit.slotDate, hit.slotPhase, hit.insertBeforeId);
      } else if (hit.insertEndSlot) {
        onMoveOrReorderOrganizeItem(st.id, hit.insertEndSlot.date, hit.insertEndSlot.phase, null);
      } else if (hit.mergeTargetId) {
        onMergeOrganizeItems(st.id, hit.mergeTargetId);
      } else if (hit.slotDate && hit.slotPhase) {
        onMoveOrReorderOrganizeItem(st.id, hit.slotDate, hit.slotPhase, null);
      }
      resetOrgDragState();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onMoveOrReorderOrganizeItem, onMergeOrganizeItems]);

  const openNewNoteModal = (date: string, phase: DayPhaseKey) => {
    setNewModalDate(date);
    setNewModalPhase(phase);
    setNewModalText('');
    setManualNewCat(null);
    setShowNewCatPicker(false);
    setNewModalError(null);
    setNewModalTab('create');
    clearMicError();
    setNewModalOpen(true);
  };

  const closeNewNoteModal = () => {
    if (isRecording) cancelRecording();
    setNewModalOpen(false);
  };

  const nextOrderForSlot = (date: string, phase: DayPhaseKey): number => {
    const existing = itemsBySlot.get(`${date}|${phase}`) || [];
    if (existing.length === 0) return 0;
    return Math.max(...existing.map((i) => i.order)) + 1;
  };

  const effectiveNewCat: CatEmoticonId = manualNewCat ?? inferCatEmoticonId(newModalText);

  const handleSaveWrittenNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newModalText.trim();
    if (!trimmed) {
      setNewModalError('Scrivi il testo della nota o registra.');
      return;
    }
    const nowIso = new Date().toISOString();
    const chosenCat = manualNewCat ?? inferCatEmoticonId(trimmed);
    const item: OrganizeNoteItem = {
      id: crypto.randomUUID(),
      date: newModalDate,
      phase: newModalPhase,
      text: trimmed,
      emoji: chosenCat,
      color: 'none',
      done: false,
      order: nextOrderForSlot(newModalDate, newModalPhase),
      source: 'text',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    onAddOrganizeItem(item);
    setNewModalOpen(false);
    onNotify(
      `Nota aggiunta (${formatItalianDateShort(newModalDate)} · ${DAY_PHASE_MAP[newModalPhase].title})`
    );
  };

  // Transcribe-only (no audio saved)
  const handleStopAndSaveVoiceNewNote = async () => {
    setNewModalError(null);
    const rec = await stopRecording();
    if (!rec) return;

    setIsTranscribing(true);
    try {
      const res = await fetch('/api/notes/transcribe-todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: rec.base64,
          mimeType: rec.mimeType,
        }),
      });
      const raw = await res.text();
      let data: { text?: string; emoji?: string; quota?: unknown; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (data.quota) publishQuotaSnapshot(data.quota);
      if (!res.ok || !data.text?.trim()) {
        setNewModalError(
          data.error || 'Impossibile trascrivere la registrazione. Riprova o scrivi a mano.'
        );
        return;
      }

      const cleanText = data.text.trim();
      const nowIso = new Date().toISOString();
      const chosenCat =
        manualNewCat ??
        resolveCatEmoticonId(
          typeof data.emoji === 'string' ? data.emoji.trim() : undefined,
          cleanText
        );
      const item: OrganizeNoteItem = {
        id: crypto.randomUUID(),
        date: newModalDate,
        phase: newModalPhase,
        text: cleanText,
        emoji: chosenCat,
        color: 'none',
        done: false,
        order: nextOrderForSlot(newModalDate, newModalPhase),
        source: 'voice',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      onAddOrganizeItem(item);
      setNewModalOpen(false);
      onNotify(
        `Nota trascritta (${formatItalianDateShort(newModalDate)} · ${DAY_PHASE_MAP[newModalPhase].title})`
      );
    } catch {
      setNewModalError('Errore di rete durante la trascrizione.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleOpenPasteModalForDay = async (isoDate: string) => {
    setPasteDate(isoDate);
    setPastePhase('mattina');
    setPasteRawText('');
    setPasteError(null);
    const res = await readClipboardTextDirect();
    if (res.text) {
      setPasteRawText(res.text);
    } else {
      window.setTimeout(() => pasteTextareaRef.current?.focus(), 90);
    }
  };

  const handlePasteFromClipboard = async () => {
    setPasteError(null);
    const res = await readClipboardTextDirect();
    if (res.text) {
      setPasteRawText((prev) => (prev.trim() ? `${prev.trim()}\n${res.text}` : res.text!));
      onNotify('Testo incollato dagli appunti');
      return;
    }

    if (pasteTextareaRef.current) {
      pasteTextareaRef.current.focus();
      try {
        const ok = document.execCommand('paste');
        if (ok && pasteTextareaRef.current.value.trim()) {
          setPasteRawText(pasteTextareaRef.current.value);
          return;
        }
      } catch {
        // ignore
      }
    }

    setPasteError(
      res.reason === 'empty'
        ? 'Gli appunti sono vuoti: scrivi o incolla qui sotto.'
        : 'Il browser limita l’accesso automatico: tocca dentro al riquadro qui sotto e premi Incolla.'
    );
  };

  const handleSubmitOrganizeBatchPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteDate) return;
    const raw = pasteRawText.trim();
    if (!raw) {
      setPasteError('Incolla almeno una riga di testo.');
      return;
    }

    // Strict 1-line = 1-note: keeps multi-activity single lines together on one row
    const strictLines = parsePastedLinesSingleRow(raw);
    if (strictLines.length === 0) {
      setPasteError('Nessuna nota valida trovata nel testo.');
      return;
    }

    setPasteError(null);
    setIsParsingBatch(true);
    try {
      let emojiSuggestions: string[] = [];
      try {
        const res = await fetch('/api/notes/parse-batch-todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: strictLines.join('\n') }),
        });
        const text = await res.text();
        const data = text
          ? (JSON.parse(text) as {
              items?: Array<{ text?: string; emoji?: string }>;
              quota?: unknown;
            })
          : {};
        if (data.quota) publishQuotaSnapshot(data.quota);
        if (Array.isArray(data.items) && data.items.length === strictLines.length) {
          emojiSuggestions = data.items.map((it) =>
            typeof it.emoji === 'string' ? it.emoji.trim() : ''
          );
        }
      } catch {
        // Fallback locally
      }

      const baseOrder = nextOrderForSlot(pasteDate, pastePhase);
      const nowIso = new Date().toISOString();
      const created: OrganizeNoteItem[] = strictLines.map((clean, idx) => ({
        id: crypto.randomUUID(),
        date: pasteDate,
        phase: pastePhase,
        text: clean,
        emoji: resolveCatEmoticonId(emojiSuggestions[idx] || undefined, clean),
        color: 'none',
        done: false,
        order: baseOrder + idx,
        source: 'text',
        createdAt: nowIso,
        updatedAt: nowIso,
      }));

      onAddManyOrganizeItems(created);
      onNotify(
        `${created.length} ${created.length === 1 ? 'nota aggiunta' : 'note aggiunte'} (${formatItalianDateShort(
          pasteDate
        )} · ${DAY_PHASE_MAP[pastePhase].title})`
      );
      setPasteDate(null);
      setPasteRawText('');
    } catch {
      setPasteError('Errore durante l’elaborazione del testo.');
    } finally {
      setIsParsingBatch(false);
    }
  };

  // Zoom calibration (1 to 4 days visible in scroll viewport)
  const isDense4 = visibleDaysZoom >= 4;
  const isDense3 = visibleDaysZoom === 3;
  const dayMinHeightCalc =
    visibleDaysZoom === 1
      ? 'calc(100% - 4px)'
      : visibleDaysZoom === 2
        ? 'calc((100% - 6px) / 2)'
        : visibleDaysZoom === 3
          ? 'calc((100% - 12px) / 3)'
          : 'calc((100% - 18px) / 4)';

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'org_controls',
      render: () => (
        <section className="rounded-2xl border border-[#7ECBBF]/85 bg-[#F7FEFC]/95 p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRangeStartIso(todayIso);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-2.5 py-1 text-xs font-semibold text-white hover:from-[#0C786E] hover:to-[#08443E] transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-[#99F6E4]" aria-hidden="true" />
                Oggi
              </button>
              <button
                type="button"
                onClick={() => setRangeStartIso((prev) => addDaysISO(prev, -4))}
                aria-label="Giorni precedenti"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-2 py-1 text-xs font-semibold text-[#0B4F49] hover:bg-[#D4F3EC]"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Prima</span>
              </button>
              <button
                type="button"
                onClick={() => setRangeStartIso((prev) => addDaysISO(prev, 4))}
                aria-label="Giorni successivi"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-2 py-1 text-xs font-semibold text-[#0B4F49] hover:bg-[#D4F3EC]"
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Dopo</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setExportModalDate(rangeStartIso);
                  setExportModalScope('week');
                  setExportModalOpen(true);
                }}
                aria-label="Stampa o esporta programma"
                title="Stampa & Esporta giornata o settimana"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[#7ECBBF] bg-[#E5F9F4] px-2 py-1 text-[11px] font-semibold text-[#0B4F49] hover:bg-[#D4F3EC] transition-colors whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
                <span className="hidden sm:inline">Stampa</span>
              </button>

              <button
                type="button"
                onClick={() => openNewNoteModal(todayIso, 'mattina')}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[#74C4B6] bg-[#D8F4EE] px-2.5 py-1 text-xs font-semibold text-[#083B37] hover:bg-[#BEECE1] transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Nuova nota</span>
              </button>
            </div>
          </div>
        </section>
      ),
    },
    {
      id: 'org_calendar',
      render: () => (
        <section className="rounded-2xl border border-[#7ECBBF]/85 bg-[#F7FEFC]/95 p-2 sm:p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-[#0B534D]">
              Calendario verticale
            </span>
            <button
              type="button"
              onClick={() => setRangeStartIso((prev) => addDaysISO(prev, -7))}
              className="text-[11px] font-semibold text-[#0F766E] hover:underline whitespace-nowrap"
            >
              +7 giorni prima
            </button>
          </div>

          {/* Horizontal Zoom Bar INSIDE the calendar block: 1 to 4 visible days */}
          <div className="rounded-xl border border-[#9BDCD1] bg-[#EDFBF8]/95 px-2.5 py-1.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#0B4F49]">
                <ZoomIn className="h-3 w-3 text-[#0F766E]" aria-hidden="true" />
                Zoom giorni
              </span>
              <span className="font-mono text-[11px] font-bold text-[#083B37] tabular-nums">
                {visibleDaysZoom} {visibleDaysZoom === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] font-semibold text-[#0E645D] shrink-0">1</span>
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={visibleDaysZoom}
                onChange={(e) => setVisibleDaysZoom(Number(e.target.value))}
                aria-label="Regola zoom dei giorni da 1 a 4"
                className="flex-1 accent-[#0D7D72] cursor-pointer"
              />
              <span className="font-mono text-[10px] font-semibold text-[#0E645D] shrink-0">4</span>

              <div className="hidden sm:flex items-center gap-1 ml-1">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setVisibleDaysZoom(num)}
                    className={`min-h-[24px] min-w-[24px] rounded-md border text-[11px] font-bold tabular-nums transition-colors ${
                      visibleDaysZoom === num
                        ? 'border-[#08443E] bg-[#0B5B53] text-white'
                        : 'border-[#7ECBBF] bg-[#F7FEFC] text-[#0B4F49] hover:border-[#0E8A7E]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vertical Scrollable Calendar Viewport (calibrated for 1-4 stacked-phase days) */}
          <div
            ref={scrollContainerRef}
            className="h-[620px] sm:h-[680px] overflow-y-auto pr-1 space-y-1.5"
          >
            {daysList.map((isoDate) => {
              const isToday = isoDate === todayIso;
              const weekdayLabel = formatItalianWeekdayShort(isoDate);
              const dateShort = formatItalianDateShort(isoDate);
              const dayTotalCount = DAY_PHASES.reduce(
                (acc, p) => acc + (itemsBySlot.get(`${isoDate}|${p.key}`)?.length || 0),
                0
              );

              return (
                <article
                  key={isoDate}
                  style={{ minHeight: dayMinHeightCalc }}
                  className={`rounded-xl border flex flex-col transition-colors ${
                    isToday
                      ? 'border-[#0E8A7E] bg-gradient-to-b from-[#CEF3EB] to-[#EDFBF8] ring-1 ring-[#0E8A7E]/35'
                      : 'border-[#9BDCD1]/90 bg-[#EDFBF8]/85'
                  } ${isDense4 ? 'p-1.5' : isDense3 ? 'p-2' : 'p-2.5'}`}
                >
                  {/* Day Header with unobtrusive Paste & Print buttons */}
                  <div className="flex items-center justify-between gap-1.5 border-b border-[#B6E6DD]/90 pb-0.5 mb-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`uppercase font-bold tracking-wide ${
                          isDense4 ? 'text-[9.5px]' : 'text-[11px]'
                        } ${isToday ? 'text-[#0B5B53]' : 'text-[#0E645D]'}`}
                      >
                        {weekdayLabel}
                      </span>
                      <span
                        className={`font-bold text-[#083B37] truncate ${
                          isDense4 ? 'text-[11px]' : 'text-xs'
                        }`}
                      >
                        {dateShort}
                      </span>
                      {isToday && (
                        <span className="rounded bg-[#0B5B53] px-1.5 py-[1px] text-[9px] font-bold text-white">
                          Oggi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenPasteModalForDay(isoDate)}
                        aria-label={`Incolla note in ${dateShort}`}
                        title="Incolla da appunti (1 riga = 1 nota)"
                        className="h-5 inline-flex items-center gap-0.5 rounded border border-[#7ECBBF] bg-[#E5F9F4] px-1 text-[9.5px] font-semibold text-[#083B37] hover:bg-[#C7EFE6] transition-colors whitespace-nowrap"
                      >
                        <ClipboardPaste className="h-2.5 w-2.5 text-[#0F766E]" aria-hidden="true" />
                        <span>Incolla</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportModalDate(isoDate);
                          setExportModalScope('day');
                          setExportModalOpen(true);
                        }}
                        aria-label={`Stampa o esporta ${dateShort}`}
                        title="Stampa / Esporta questa giornata"
                        className="h-5 w-5 inline-flex items-center justify-center rounded border border-[#9BDCD1] bg-[#F7FEFC] text-[#0F766E] hover:bg-[#D8F4EE] transition-colors"
                      >
                        <Printer className="h-2.5 w-2.5" aria-hidden="true" />
                      </button>
                      <span className="font-mono text-[10px] font-semibold text-[#0E645D] tabular-nums pl-0.5">
                        {dayTotalCount}
                      </span>
                    </div>
                  </div>

                  {/* 4 Phases ALWAYS Stacked One Below Another (Ultra-Slim Strips) */}
                  <div className="flex-1 flex flex-col gap-1">
                    {DAY_PHASES.map((phase) => {
                      const slotItems = itemsBySlot.get(`${isoDate}|${phase.key}`) || [];
                      const isPhaseDropTarget =
                        dropTarget?.date === isoDate && dropTarget?.phase === phase.key;
                      const isPhaseEndInsert =
                        isPhaseDropTarget && Boolean(dropTarget?.insertEnd);

                      return (
                        <div
                          key={`${isoDate}-${phase.key}`}
                          data-org-date={isoDate}
                          data-org-phase={phase.key}
                          onDragOver={(e) => {
                            if (!draggedOrgId) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (
                              dropTarget?.date !== isoDate ||
                              dropTarget?.phase !== phase.key ||
                              dropTarget?.mergeTargetId ||
                              dropTarget?.insertBeforeId
                            ) {
                              setDropTarget({ date: isoDate, phase: phase.key });
                            }
                          }}
                          onDrop={(e) => {
                            if (!draggedOrgId) return;
                            e.preventDefault();
                            const sourceId =
                              draggedOrgId || e.dataTransfer.getData('text/plain');
                            if (sourceId) {
                              if (
                                dropTarget?.mergeTargetId &&
                                dropTarget.mergeTargetId !== sourceId
                              ) {
                                onMergeOrganizeItems(sourceId, dropTarget.mergeTargetId);
                              } else if (
                                dropTarget?.insertBeforeId &&
                                dropTarget.insertBeforeId !== sourceId
                              ) {
                                onMoveOrReorderOrganizeItem(
                                  sourceId,
                                  isoDate,
                                  phase.key,
                                  dropTarget.insertBeforeId
                                );
                              } else {
                                onMoveOrReorderOrganizeItem(
                                  sourceId,
                                  isoDate,
                                  phase.key,
                                  null
                                );
                              }
                            }
                            resetOrgDragState();
                          }}
                          className={`rounded-lg border transition-all flex flex-col ${
                            isPhaseDropTarget
                              ? 'border-[#0E8A7E] bg-[#C7EFE6]/80 ring-1 ring-[#0E8A7E]'
                              : 'border-[#B6E6DD]/90 bg-[#F7FEFC]/95 hover:border-[#0E8A7E]/65'
                          } ${isDense4 ? 'px-1.5 py-[2px]' : 'px-2 py-1'}`}
                        >
                          {/* Ultra-slim clickable Phase Strip */}
                          <button
                            type="button"
                            onClick={() => openNewNoteModal(isoDate, phase.key)}
                            className="w-full flex items-center justify-between gap-1 text-left group leading-none py-[1px]"
                          >
                            <span
                              className={`font-bold text-[#0B534D] group-hover:text-[#0F766E] truncate ${
                                isDense4 ? 'text-[9.5px]' : 'text-[10.5px]'
                              }`}
                            >
                              {phase.title}
                            </span>
                            <Plus
                              className="h-3 w-3 shrink-0 text-[#49A197] group-hover:text-[#0F766E]"
                              aria-hidden="true"
                            />
                          </button>

                          {/* Ultra-slim Note Rows inside this Phase + Reorder Gaps + Merge Targets */}
                          {slotItems.length > 0 && (
                            <div className="mt-0.5 space-y-0.5">
                              {slotItems.map((item) => {
                                const isDragged = draggedOrgId === item.id;
                                const isInsertBefore =
                                  draggedOrgId !== null &&
                                  draggedOrgId !== item.id &&
                                  dropTarget?.insertBeforeId === item.id;
                                const isMergeTarget =
                                  draggedOrgId !== null &&
                                  draggedOrgId !== item.id &&
                                  dropTarget?.mergeTargetId === item.id;
                                const catId = resolveCatEmoticonId(item.emoji, item.text);

                                return (
                                  <React.Fragment key={item.id}>
                                    {draggedOrgId && draggedOrgId !== item.id && (
                                      <div
                                        data-org-insert-before={item.id}
                                        data-org-date={isoDate}
                                        data-org-phase={phase.key}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDropTarget({
                                            date: isoDate,
                                            phase: phase.key,
                                            insertBeforeId: item.id,
                                          });
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const sourceId =
                                            draggedOrgId || e.dataTransfer.getData('text/plain');
                                          if (sourceId && sourceId !== item.id) {
                                            onMoveOrReorderOrganizeItem(
                                              sourceId,
                                              isoDate,
                                              phase.key,
                                              item.id
                                            );
                                          }
                                          resetOrgDragState();
                                        }}
                                        className="relative z-10 h-2.5 -my-1 flex items-center"
                                      >
                                        <div
                                          className={`w-full rounded-full transition-all ${
                                            isInsertBefore
                                              ? 'h-[3px] bg-[#0E8A7E]'
                                              : 'h-[1px] bg-transparent'
                                          }`}
                                        />
                                      </div>
                                    )}

                                    <div
                                      data-org-merge-id={item.id}
                                      data-org-date={isoDate}
                                      data-org-phase={phase.key}
                                      draggable
                                      onDragStart={(e) => {
                                        setDraggedOrgId(item.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', item.id);
                                      }}
                                      onDragOver={(e) => {
                                        if (!draggedOrgId || draggedOrgId === item.id) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDropTarget({
                                          date: isoDate,
                                          phase: phase.key,
                                          mergeTargetId: item.id,
                                        });
                                      }}
                                      onDrop={(e) => {
                                        if (!draggedOrgId || draggedOrgId === item.id) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const sourceId =
                                          draggedOrgId || e.dataTransfer.getData('text/plain');
                                        if (sourceId && sourceId !== item.id) {
                                          onMergeOrganizeItems(sourceId, item.id);
                                        }
                                        resetOrgDragState();
                                      }}
                                      onDragEnd={resetOrgDragState}
                                      className={`flex items-center gap-1 rounded border px-1 py-[1px] transition-all ${
                                        isMergeTarget
                                          ? 'border-[#0B5B53] bg-[#C4EFE6] ring-2 ring-[#0E8A7E]'
                                          : 'border-[#9BDCD1] bg-[#EDFBF8]/95 hover:border-[#0E8A7E]'
                                      } ${isDragged ? 'opacity-45' : ''}`}
                                    >
                                      <button
                                        type="button"
                                        aria-label={`Trascina "${item.text}"`}
                                        onPointerDown={(e) => {
                                          if (e.pointerType === 'mouse') return;
                                          e.stopPropagation();
                                          pointerDragRef.current = { id: item.id, active: true };
                                          setDraggedOrgId(item.id);
                                        }}
                                        className="touch-none h-4 w-3.5 flex items-center justify-center rounded cursor-grab active:cursor-grabbing shrink-0 text-[#3D8B83]"
                                      >
                                        <GripVertical className="h-2.5 w-2.5" aria-hidden="true" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onUpdateOrganizeItem(item.id, {
                                            done: !item.done,
                                            updatedAt: new Date().toISOString(),
                                          });
                                        }}
                                        aria-label={item.done ? 'Da fare' : 'Completata'}
                                        className="shrink-0 text-[#0F766E]"
                                      >
                                        {item.done ? (
                                          <CheckCircle2 className="h-3 w-3 text-[#0F766E]" />
                                        ) : (
                                          <Circle className="h-3 w-3 text-[#68B9AD]" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrgId(item.id)}
                                        className="min-w-0 flex-1 text-left flex items-center gap-1"
                                      >
                                        <CatEmoticonIcon
                                          emoticonId={catId}
                                          text={item.text}
                                          sizeClass="h-[15px] w-[15px]"
                                        />
                                        <span
                                          className={`block font-medium text-[#072C29] leading-[1.15] ${
                                            item.done ? 'line-through opacity-55' : ''
                                          } ${
                                            isDense4
                                              ? 'text-[10.5px] line-clamp-1'
                                              : isDense3
                                                ? 'text-[11px] line-clamp-2'
                                                : 'text-xs'
                                          }`}
                                        >
                                          {item.text}
                                        </span>
                                      </button>

                                      {isMergeTarget && (
                                        <span className="rounded bg-[#0B5B53] px-1 py-[0.5px] text-[9px] font-bold text-white shrink-0">
                                          Unisci
                                        </span>
                                      )}
                                    </div>
                                  </React.Fragment>
                                );
                              })}

                              {draggedOrgId && (
                                <div
                                  data-org-insert-end={`${isoDate}|${phase.key}`}
                                  data-org-date={isoDate}
                                  data-org-phase={phase.key}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDropTarget({
                                      date: isoDate,
                                      phase: phase.key,
                                      insertEnd: true,
                                    });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const sourceId =
                                      draggedOrgId || e.dataTransfer.getData('text/plain');
                                    if (sourceId) {
                                      onMoveOrReorderOrganizeItem(
                                        sourceId,
                                        isoDate,
                                        phase.key,
                                        null
                                      );
                                    }
                                    resetOrgDragState();
                                  }}
                                  className="relative z-10 h-2.5 -my-0.5 flex items-center"
                                >
                                  <div
                                    className={`w-full rounded-full transition-all ${
                                      isPhaseEndInsert
                                        ? 'h-[3px] bg-[#0E8A7E]'
                                        : 'h-[1px] bg-transparent'
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}

            <button
              type="button"
              onClick={() => setTotalDaysCount((c) => c + 7)}
              className="w-full min-h-[36px] rounded-xl border border-dashed border-[#74C4B6] bg-[#E5F9F4] text-xs font-semibold text-[#0B4F49] hover:bg-[#D4F3EC]"
            >
              Carica altri 7 giorni
            </button>
          </div>
        </section>
      ),
    },
    {
      id: 'org_export',
      render: () => (
        <OrganizeExportCardBlock
          organizeItems={organizeItems}
          dailyNotes={dailyNotes}
          onNotify={onNotify}
        />
      ),
    },
    {
      id: 'org_widget',
      render: () => (
        <IPhoneWidgetStudio
          config={widgetConfig}
          todoItems={todoItems}
          organizeItems={organizeItems}
          syncStatus={widgetSyncStatus}
          lastSyncedAt={widgetLastSyncedAt}
          openHomeTrigger={openWidgetHomeTrigger}
          onChangeConfig={onChangeWidgetConfig}
          onForceSync={onForceSyncWidget}
          onActivateDirectHomeWidget={onActivateDirectHomeWidget}
          onToggleTodoDone={onToggleTodoDone}
          onToggleOrganizeDone={(id) => {
            const target = organizeItems.find((o) => o.id === id);
            if (target) {
              onUpdateOrganizeItem(id, {
                done: !target.done,
                updatedAt: new Date().toISOString(),
              });
            }
          }}
          onNotify={onNotify}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <CustomizableSectionStack
        section="organize"
        layout={sectionLayout}
        blocks={blocks}
        onChangeLayout={onChangeLayout}
        onResetSection={onResetLayout}
        accentTheme="aqua"
        className="space-y-2.5"
      />

      {/* Compact New Note Modal (>50% smaller, no instructions, only "Nuova nota") */}
      {newModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#042422]/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-new-modal-title"
          onClick={closeNewNoteModal}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl bg-[#F7FEFC] border border-[#7ECBBF] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 id="org-new-modal-title" className="text-xs font-bold text-[#083B37]">
                  Nuova nota
                </h3>
                {newModalTab === 'create' && (
                  <button
                    type="button"
                    onClick={() => setShowNewCatPicker((v) => !v)}
                    aria-expanded={showNewCatPicker}
                    className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                      showNewCatPicker
                        ? 'border-[#0F766E] bg-[#C4EFE6] text-[#083B37]'
                        : 'border-[#7ECBBF] bg-[#E5F9F4] text-[#0B4F49] hover:bg-[#D4F3EC]'
                    }`}
                  >
                    <CatEmoticonIcon emoticonId={effectiveNewCat} sizeClass="h-4 w-4" />
                    <span>{CAT_EMOTICON_MAP[effectiveNewCat].label}</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeNewNoteModal}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#9BDCD1] text-[#0B534D] hover:bg-[#D8F4EE] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {newModalTab === 'create' && showNewCatPicker && (
              <CatEmoticonPicker
                value={effectiveNewCat}
                isAuto={manualNewCat === null}
                onSelect={(id) => {
                  setManualNewCat(id);
                  setShowNewCatPicker(false);
                }}
                onResetAuto={() => {
                  setManualNewCat(null);
                  setShowNewCatPicker(false);
                }}
              />
            )}

            {/* Compact Day & Phase */}
            <div className="rounded-xl border border-[#9BDCD1] bg-[#EDFBF8] p-2 space-y-1.5">
              <input
                type="date"
                value={newModalDate}
                onChange={(e) => setNewModalDate(e.target.value)}
                className="w-full min-h-[30px] rounded-lg border border-[#7ECBBF] bg-[#F7FEFC] px-2 py-0.5 text-[11px] text-[#072C29]"
              />
              <div className="grid grid-cols-2 gap-1">
                {DAY_PHASES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setNewModalPhase(p.key)}
                    className={`min-h-[28px] rounded-lg border px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
                      newModalPhase === p.key
                        ? 'border-[#08443E] bg-[#0B5B53] text-white'
                        : 'border-[#7ECBBF] bg-[#F7FEFC] text-[#0B4F49] hover:bg-[#D8F4EE]'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#D4F3EC] p-0.5">
              <button
                type="button"
                onClick={() => setNewModalTab('create')}
                className={`min-h-[28px] rounded-md px-2 text-[11px] font-semibold transition-colors ${
                  newModalTab === 'create'
                    ? 'bg-[#0B5B53] text-white shadow-xs'
                    : 'text-[#0B534D]'
                }`}
              >
                Nuova
              </button>
              <button
                type="button"
                onClick={() => setNewModalTab('from_todo')}
                className={`min-h-[28px] inline-flex items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors ${
                  newModalTab === 'from_todo'
                    ? 'bg-[#0B5B53] text-white shadow-xs'
                    : 'text-[#0B534D]'
                }`}
              >
                <ListTodo className="h-3 w-3" aria-hidden="true" />
                Da Fare ({todoItems.length})
              </button>
            </div>

            {newModalTab === 'create' ? (
              <div className="space-y-2">
                {!isRecording ? (
                  <form onSubmit={handleSaveWrittenNewNote} className="space-y-2">
                    <textarea
                      rows={2}
                      value={newModalText}
                      onChange={(e) => {
                        setNewModalText(e.target.value);
                        if (newModalError) setNewModalError(null);
                      }}
                      placeholder="Scrivi nota..."
                      className="w-full rounded-xl border border-[#7ECBBF] bg-[#EDFBF8] p-2 text-xs text-[#072C29] placeholder:text-[#4F928B] focus:border-[#0E8A7E] focus:bg-[#F7FEFC] focus:outline-none"
                    />

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isTranscribing}
                        onClick={async () => {
                          clearMicError();
                          setNewModalError(null);
                          await startRecording();
                        }}
                        className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-lg border border-[#7ECBBF] bg-[#E5F9F4] px-2.5 py-1 text-[11px] font-semibold text-[#083B37] hover:bg-[#D4F3EC] disabled:opacity-50"
                      >
                        {isTranscribing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mic className="h-3.5 w-3.5 text-[#0F766E]" />
                        )}
                        <span>{isTranscribing ? 'Trascrivo...' : 'Voce'}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isTranscribing}
                        className="flex-1 min-h-[34px] inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-3 py-1 text-[11px] font-semibold text-white hover:from-[#0C786E] hover:to-[#08443E] disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        Inserisci
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl border border-[#74C4B6] bg-[#062E2B] text-white p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-[#99F6E4]">
                        {DAY_PHASE_MAP[newModalPhase].title}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatDuration(elapsedSeconds)}
                      </span>
                    </div>
                    <div className="flex h-6 items-end gap-1">
                      {levels.map((lvl, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${Math.round(lvl * 100)}%` }}
                          className="flex-1 rounded-full bg-[#2DD4BF]"
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleStopAndSaveVoiceNewNote}
                        className="flex-1 min-h-[32px] inline-flex items-center justify-center gap-1 rounded-lg bg-[#2DD4BF] px-2.5 py-1 text-[11px] font-bold text-[#042422]"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        Trascrivi
                      </button>
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="min-h-[32px] rounded-lg border border-white/25 px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}

                {(newModalError || micError) && (
                  <p className="text-[11px] font-medium text-rose-700">
                    {newModalError || micError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 rounded-lg border border-[#9BDCD1] bg-[#EDFBF8] px-2 py-1 text-[11px] font-medium text-[#083B37] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removePickedTodo}
                    onChange={(e) => setRemovePickedTodo(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#0F766E] rounded"
                  />
                  <span>Sposta (rimuovi da «Da Fare»)</span>
                </label>

                {todoItems.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-[#0E645D]">
                    Nessuna nota in «Da Fare».
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                    {TODO_BLOCKS.map((blk) => {
                      const blkItems = todoItems
                        .filter((t) => t.block === blk.key)
                        .sort((a, b) => a.order - b.order);
                      if (blkItems.length === 0) return null;
                      return (
                        <div key={blk.key} className="space-y-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#0E645D]">
                            {blk.title}
                          </p>
                          <div className="space-y-0.5">
                            {blkItems.map((todo) => (
                              <button
                                key={todo.id}
                                type="button"
                                onClick={() => {
                                  onPickTodoForOrganize(
                                    todo,
                                    newModalDate,
                                    newModalPhase,
                                    removePickedTodo
                                  );
                                  setNewModalOpen(false);
                                }}
                                className="w-full min-h-[28px] flex items-center justify-between gap-1.5 rounded-lg border border-[#9BDCD1] bg-[#F7FEFC] px-2 py-0.5 text-left hover:border-[#0E8A7E]"
                              >
                                <span className="inline-flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-[#072C29]">
                                  <CatEmoticonIcon
                                    emoticonId={todo.emoji}
                                    text={todo.text}
                                    blockHint={todo.block}
                                    sizeClass="h-4 w-4"
                                  />
                                  <span className="truncate">{todo.text}</span>
                                </span>
                                <span className="text-[10px] font-semibold text-[#0F766E] shrink-0">
                                  +
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Edit Existing Note Modal */}
      {selectedOrgItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#042422]/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-edit-modal-title"
          onClick={() => setSelectedOrgId(null)}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl bg-[#F7FEFC] border border-[#7ECBBF] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowEditCatPicker((v) => !v)}
                className="flex items-center gap-1.5 min-w-0 rounded-lg border border-[#9BDCD1] bg-[#EDFBF8] px-2 py-1 hover:border-[#0E8A7E] transition-colors"
                title="Cambia emoticon gatto companion"
              >
                <CatEmoticonIcon
                  emoticonId={selectedOrgItem.emoji}
                  text={selectedOrgItem.text}
                  sizeClass="h-5 w-5"
                />
                <h3 id="org-edit-modal-title" className="text-xs font-bold text-[#083B37] truncate">
                  {formatItalianDateShort(selectedOrgItem.date)} ·{' '}
                  {DAY_PHASE_MAP[selectedOrgItem.phase].title}
                </h3>
                <span className="text-[10px] font-semibold text-[#0F766E] shrink-0">
                  Cambia
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrgId(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#9BDCD1] text-[#0B534D] hover:bg-[#D8F4EE] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {showEditCatPicker && (
              <CatEmoticonPicker
                value={resolveCatEmoticonId(selectedOrgItem.emoji, selectedOrgItem.text)}
                onSelect={(catId) => {
                  onUpdateOrganizeItem(selectedOrgItem.id, {
                    emoji: catId,
                    updatedAt: new Date().toISOString(),
                  });
                  setShowEditCatPicker(false);
                  onNotify(`Emoticon «${CAT_EMOTICON_MAP[catId].label}» applicata`);
                }}
              />
            )}

            <div className="flex gap-1.5">
              <input
                type="text"
                value={editDraftText}
                onChange={(e) => setEditDraftText(e.target.value)}
                className="flex-1 min-h-[34px] rounded-lg border border-[#7ECBBF] bg-[#EDFBF8] px-2.5 py-1 text-xs text-[#072C29] focus:border-[#0E8A7E] focus:bg-[#F7FEFC] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const clean = editDraftText.trim();
                  if (!clean) return;
                  onUpdateOrganizeItem(selectedOrgItem.id, {
                    text: clean,
                    updatedAt: new Date().toISOString(),
                  });
                  onNotify('Nota aggiornata');
                }}
                className="min-h-[34px] rounded-lg bg-[#0B5B53] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#08443E] shrink-0"
              >
                Salva
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-[#9BDCD1] bg-[#EDFBF8] p-2">
              <input
                type="date"
                value={selectedOrgItem.date}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onMoveOrReorderOrganizeItem(
                    selectedOrgItem.id,
                    e.target.value,
                    selectedOrgItem.phase,
                    null
                  );
                }}
                className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[#7ECBBF] bg-[#F7FEFC] px-2 py-0.5 text-[#072C29]"
              />
              <select
                value={selectedOrgItem.phase}
                onChange={(e) =>
                  onMoveOrReorderOrganizeItem(
                    selectedOrgItem.id,
                    selectedOrgItem.date,
                    e.target.value as DayPhaseKey,
                    null
                  )
                }
                className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[#7ECBBF] bg-[#F7FEFC] px-2 py-0.5 text-[#072C29]"
              >
                {DAY_PHASES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMoveOrganizeStep(selectedOrgItem.id, -1)}
                className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 rounded-lg border border-[#7ECBBF] bg-[#E5F9F4] px-2 text-[11px] font-semibold text-[#0B4F49] hover:bg-[#D4F3EC]"
              >
                <ArrowUp className="h-3 w-3" /> Su
              </button>
              <button
                type="button"
                onClick={() => onMoveOrganizeStep(selectedOrgItem.id, 1)}
                className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 rounded-lg border border-[#7ECBBF] bg-[#E5F9F4] px-2 text-[11px] font-semibold text-[#0B4F49] hover:bg-[#D4F3EC]"
              >
                <ArrowDown className="h-3 w-3" /> Giù
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const idToDel = selectedOrgItem.id;
                  setSelectedOrgId(null);
                  onDeleteOrganizeItem(idToDel);
                  onNotify('Nota eliminata');
                }}
                className="min-h-[32px] inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3 w-3" /> Elimina
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrgId(null)}
                className="min-h-[32px] rounded-lg border border-[#9BDCD1] bg-[#F7FEFC] px-3 py-1 text-[11px] font-semibold text-[#0B534D] hover:bg-[#D8F4EE]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Modal: Batch Paste from Clipboard for a Day in Organizza (1 line = 1 note) */}
      {pasteDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#042422]/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-batch-paste-title"
          onClick={() => !isParsingBatch && setPasteDate(null)}
          onPaste={(e) => {
            if (document.activeElement !== pasteTextareaRef.current) {
              const pasted = e.clipboardData?.getData('text');
              if (pasted && pasted.trim()) {
                e.preventDefault();
                setPasteRawText((prev) =>
                  prev.trim() ? `${prev.trim()}\n${pasted}` : pasted
                );
                setPasteError(null);
              }
            }
          }}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl bg-[#F7FEFC] border border-[#7ECBBF] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id="org-batch-paste-title" className="text-xs font-bold text-[#083B37] truncate">
                Incolla note · {formatItalianDateShort(pasteDate)}
              </h3>
              <button
                type="button"
                disabled={isParsingBatch}
                onClick={() => setPasteDate(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#9BDCD1] text-[#0B534D] hover:bg-[#D8F4EE] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Phase Destination Selector */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#9BDCD1] bg-[#EDFBF8] p-1.5">
              {DAY_PHASES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={isParsingBatch}
                  onClick={() => setPastePhase(p.key)}
                  className={`min-h-[28px] rounded-lg border px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
                    pastePhase === p.key
                      ? 'border-[#08443E] bg-[#0B5B53] text-white'
                      : 'border-[#7ECBBF] bg-[#F7FEFC] text-[#0B4F49] hover:bg-[#D8F4EE]'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={isParsingBatch}
              onClick={handlePasteFromClipboard}
              className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#74C4B6] bg-[#D8F4EE] px-2.5 py-1 text-xs font-semibold text-[#0B4F49] hover:bg-[#BEECE1] disabled:opacity-50"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Incolla dagli appunti</span>
            </button>

            <form onSubmit={handleSubmitOrganizeBatchPaste} className="space-y-2">
              <textarea
                ref={pasteTextareaRef}
                rows={4}
                value={pasteRawText}
                disabled={isParsingBatch}
                onChange={(e) => {
                  setPasteRawText(e.target.value);
                  if (pasteError) setPasteError(null);
                }}
                placeholder={'Riga 1...\nRiga 2...\nRiga 3...'}
                className="w-full rounded-xl border border-[#7ECBBF] bg-[#EDFBF8] p-2 text-[#072C29] placeholder:text-[#4F928B] focus:border-[#0E8A7E] focus:bg-[#F7FEFC] focus:outline-none"
              />

              {pasteError && (
                <p className="text-[11px] font-medium text-rose-700">{pasteError}</p>
              )}

              <button
                type="submit"
                disabled={isParsingBatch || !pasteRawText.trim()}
                className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0E8A7E] to-[#0B5B53] px-3 py-1.5 text-xs font-semibold text-white hover:from-[#0C786E] hover:to-[#08443E] disabled:opacity-50"
              >
                {isParsingBatch ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Elaboro righe...</span>
                  </>
                ) : (
                  <span>Aggiungi tutte le note</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Export & Print Modal */}
      <OrganizeExportModal
        open={exportModalOpen}
        organizeItems={organizeItems}
        dailyNotes={dailyNotes}
        initialDate={exportModalDate}
        initialScope={exportModalScope}
        onClose={() => setExportModalOpen(false)}
        onNotify={onNotify}
      />

      {/* Floating Drag Guidance Pill */}
      {draggedOrgId && (
        <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-full bg-[#083B37] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg border border-[#74C4B6]/60 whitespace-nowrap max-w-[92vw] truncate">
          {dropTarget?.mergeTargetId
            ? `Rilascia per unire con «${organizeItems.find((o) => o.id === dropTarget.mergeTargetId)?.text || 'nota'}»`
            : dropTarget?.insertBeforeId || dropTarget?.insertEnd
              ? 'Rilascia per spostare qui'
              : dropTarget
                ? `Rilascia in ${formatItalianDateShort(dropTarget.date)} · ${DAY_PHASE_MAP[dropTarget.phase].title}`
                : 'Trascina su una nota per unirla, o tra le righe per spostarla'}
        </div>
      )}
    </div>
  );
};
