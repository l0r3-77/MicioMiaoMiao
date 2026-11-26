import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardPaste,
  Copy,
  CopyPlus,
  GripVertical,
  LayoutGrid,
  ListTodo,
  Loader2,
  Mic,
  Plus,
  Printer,
  Rows3,
  Send,
  Square,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type {
  DayPhaseKey,
  OrganizeNoteItem,
  TodoNoteItem,
} from '../types/dailyTodo';
import type { DailyNote } from '../types/note';
import {
  DAY_PHASE_MAP,
  DAY_PHASES,
  TODO_BLOCKS,
  buildGoogleCalendarUrl,
} from '../utils/dailyTodoStorage';
import {
  copyTextToClipboard,
  parsePastedLinesSingleRow,
  readClipboardTextDirect,
} from '../utils/clipboardHelper';
import {
  CAT_EMOTICON_MAP,
  inferCatEmoticonId,
  reconcileAutoCatEmoticonId,
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
import { fetchApiJsonWithRetry } from '../utils/apiError';
import { startBackgroundSession } from '../utils/backgroundKeepAlive';
import { publishQuotaSnapshot } from '../utils/quotaTracker';
import { fetchTranscribeWithDebug } from '../utils/transcribeDebugLog';
import { CatEmoticonIcon, CatEmoticonPicker } from './CatEmoticon';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';
import {
  OrganizeExportCardBlock,
  OrganizeExportModal,
} from './OrganizeExportBlock';

import type { DuplicateSourcePayload } from './DailyTodoSection';

interface OrganizzaSubsectionProps {
  dailyNotes?: DailyNote[];
  todoItems: TodoNoteItem[];
  organizeItems: OrganizeNoteItem[];
  sectionLayout: SectionLayoutState;
  focusTodaySignal?: number;
  canUndo: boolean;
  onUndo: () => void;
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
  onDuplicateOrganizeItem: (
    sourceNote: DuplicateSourcePayload,
    date: string,
    phase: DayPhaseKey
  ) => void;
  onNotify: (msg: string) => void;
}

export const OrganizzaSubsection: React.FC<OrganizzaSubsectionProps> = ({
  dailyNotes = [],
  todoItems,
  organizeItems,
  sectionLayout,
  focusTodaySignal = 0,
  canUndo,
  onUndo,
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
  onDuplicateOrganizeItem,
  onNotify,
}) => {
  const todayIso = toISODate(new Date());
  const [rangeStartIso, setRangeStartIso] = useState<string>(() => todayIso);
  const [totalDaysCount, setTotalDaysCount] = useState<number>(14);
  // Dual view switcher: 'daily' (Giornaliera) or 'weekly' (Settimanale 2x3 compact grid)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [copiedDayIso, setCopiedDayIso] = useState<string | null>(null);

  // Duplicate Note Modal (choose target date & phase)
  const [duplicateOrgItem, setDuplicateOrgItem] = useState<OrganizeNoteItem | null>(null);
  const [dupDate, setDupDate] = useState<string>(() => todayIso);
  const [dupPhase, setDupPhase] = useState<DayPhaseKey>('mattina');

  // Compact New Note Modal (triggered by tapping a day phase or "+ Nuova nota")
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalTab, setNewModalTab] = useState<'create' | 'from_todo'>('create');
  const [newModalDate, setNewModalDate] = useState<string>(todayIso);
  const [newModalPhase, setNewModalPhase] = useState<DayPhaseKey>('mattina');
  const [newModalText, setNewModalText] = useState('');
  const [manualNewCat, setManualNewCat] = useState<CatEmoticonId | null>(null);
  const [showNewCatPicker, setShowNewCatPicker] = useState(false);
  const [newModalError, setNewModalError] = useState<string | null>(null);
  const [newModalRemDate, setNewModalRemDate] = useState('');
  const [newModalRemTime, setNewModalRemTime] = useState('');
  const [showNewRemFields, setShowNewRemFields] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [removePickedTodo, setRemovePickedTodo] = useState(false);

  // Compact Edit Existing Note Modal
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editRemDate, setEditRemDate] = useState('');
  const [editRemTime, setEditRemTime] = useState('');
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
  const dragCursorRef = useRef<{ x: number; y: number } | null>(null);
  const lastAutoExpandAtRef = useRef<number>(0);
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
      setEditRemDate(selectedOrgItem.reminderDate || '');
      setEditRemTime(selectedOrgItem.reminderTime || '');
      setShowEditCatPicker(false);
    }
  }, [selectedOrgItem?.id]);

  // Land on today's date whenever Organizza opens or focusTodaySignal increments
  useEffect(() => {
    setRangeStartIso(todayIso);
    const timer = window.setTimeout(() => {
      const container = scrollContainerRef.current;
      const el = container?.querySelector('[data-today-card="true"]') as HTMLElement | null;
      if (el && container) {
        container.scrollTop = Math.max(0, el.offsetTop - container.offsetTop - 4);
      } else {
        container?.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 45);
    return () => window.clearTimeout(timer);
  }, [focusTodaySignal, todayIso]);

  const resetOrgDragState = () => {
    pointerDragRef.current = null;
    dragCursorRef.current = null;
    setDraggedOrgId(null);
    setDropTarget(null);
  };

  const inspectOrganizePoint = (x: number, y: number, draggedId: string) => {
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

  const applyOrganizeHitToDropTarget = (
    hit: ReturnType<typeof inspectOrganizePoint>
  ) => {
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

  // Touch Pointer drag support for iPhone (Move/Reorder + Merge)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const st = pointerDragRef.current;
      if (!st?.active) return;
      dragCursorRef.current = { x: e.clientX, y: e.clientY };
      const hit = inspectOrganizePoint(e.clientX, e.clientY, st.id);
      applyOrganizeHitToDropTarget(hit);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const st = pointerDragRef.current;
      if (!st?.active) return;
      const hit = inspectOrganizePoint(e.clientX, e.clientY, st.id);
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

  // Continuous edge auto-scroll (touch + desktop HTML5 drag) so notes can move far beyond visible days
  useEffect(() => {
    if (!draggedOrgId) return;

    const handleWindowDragOver = (e: DragEvent) => {
      dragCursorRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('dragover', handleWindowDragOver);

    let rafId = 0;
    const stepAutoScroll = () => {
      const cursor = dragCursorRef.current;
      const container = scrollContainerRef.current;
      if (cursor && container) {
        const rect = container.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, 60);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight - 52);
        const edgeZone = 86;

        let scrolledDelta = 0;
        if (cursor.y > visibleBottom - edgeZone) {
          const depth = Math.min(1.65, Math.max(0.25, (cursor.y - (visibleBottom - edgeZone)) / edgeZone));
          const speed = Math.round(5 + depth * 12);
          const prevScroll = container.scrollTop;
          container.scrollTop += speed;
          scrolledDelta = container.scrollTop - prevScroll;

          if (rect.bottom > window.innerHeight - 28) {
            window.scrollBy(0, Math.min(speed, rect.bottom - (window.innerHeight - 28)));
          }

          if (
            container.scrollTop + container.clientHeight >= container.scrollHeight - 220 &&
            Date.now() - lastAutoExpandAtRef.current > 450
          ) {
            lastAutoExpandAtRef.current = Date.now();
            setTotalDaysCount((c) => c + 7);
          }
        } else if (cursor.y < visibleTop + edgeZone) {
          const depth = Math.min(1.65, Math.max(0.25, ((visibleTop + edgeZone) - cursor.y) / edgeZone));
          const speed = Math.round(5 + depth * 12);
          const prevScroll = container.scrollTop;
          container.scrollTop -= speed;
          scrolledDelta = container.scrollTop - prevScroll;

          if (rect.top < 64 && container.scrollTop <= 2) {
            window.scrollBy(0, -speed);
          }
        }

        if (scrolledDelta !== 0 && pointerDragRef.current?.active) {
          const hit = inspectOrganizePoint(cursor.x, cursor.y, draggedOrgId);
          applyOrganizeHitToDropTarget(hit);
        }
      }
      rafId = window.requestAnimationFrame(stepAutoScroll);
    };

    rafId = window.requestAnimationFrame(stepAutoScroll);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.cancelAnimationFrame(rafId);
    };
  }, [draggedOrgId]);

  const openNewNoteModal = (date: string, phase: DayPhaseKey) => {
    setNewModalDate(date);
    setNewModalPhase(phase);
    setNewModalText('');
    setManualNewCat(null);
    setShowNewCatPicker(false);
    setNewModalRemDate('');
    setNewModalRemTime('');
    setShowNewRemFields(false);
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
      ...(newModalRemDate ? { reminderDate: newModalRemDate } : {}),
      ...(newModalRemTime ? { reminderTime: newModalRemTime } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    onAddOrganizeItem(item);
    setNewModalOpen(false);
    onNotify(
      `Nota aggiunta (${formatItalianDateShort(newModalDate)} · ${DAY_PHASE_MAP[newModalPhase].title})`
    );
  };

  // Transcribe-only (no audio saved), background-safe
  const handleStopAndSaveVoiceNewNote = async () => {
    setNewModalError(null);
    const rec = await stopRecording();
    if (!rec) return;

    setIsTranscribing(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 90000);
    const stopSession = startBackgroundSession('Trascrizione nota vocale in corso');
    try {
      const { ok, data } = await fetchTranscribeWithDebug<{
        text?: string;
        emoji?: string;
        quota?: unknown;
        error?: string;
      }>({
        endpoint: '/api/notes/transcribe-todo',
        caller: 'OrganizzaSubsection',
        signal: controller.signal,
        micDiagnostics: rec.diagnostics,
        payload: {
          audioBase64: rec.base64,
          mimeType: rec.mimeType,
        },
      });
      if (data.quota) publishQuotaSnapshot(data.quota);
      if (!ok || !data.text?.trim()) {
        setNewModalError(
          data.error ||
            'Impossibile trascrivere la registrazione. Riprova o scrivi a mano.'
        );
        return;
      }

      const cleanText = data.text.trim();
      const nowIso = new Date().toISOString();
      const chosenCat =
        manualNewCat ??
        reconcileAutoCatEmoticonId(
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
        ...(newModalRemDate ? { reminderDate: newModalRemDate } : {}),
        ...(newModalRemTime ? { reminderTime: newModalRemTime } : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      onAddOrganizeItem(item);
      setNewModalOpen(false);
      onNotify(
        `Nota trascritta (${formatItalianDateShort(newModalDate)} · ${DAY_PHASE_MAP[newModalPhase].title})`
      );
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setNewModalError('Tempo di attesa scaduto durante la trascrizione. Riprova tra poco.');
      } else {
        setNewModalError('Errore di rete durante la trascrizione.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      stopSession();
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
        const { data } = await fetchApiJsonWithRetry<{
          items?: Array<{ text?: string; emoji?: string }>;
          quota?: unknown;
        }>('/api/notes/parse-batch-todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: strictLines.join('\n') }),
        });
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
        emoji: reconcileAutoCatEmoticonId(emojiSuggestions[idx] || undefined, clean),
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

  const handleCopyDayNotes = async (isoDate: string) => {
    const sections: string[] = [];
    for (const phase of DAY_PHASES) {
      const slotItems = (itemsBySlot.get(`${isoDate}|${phase.key}`) || [])
        .map((it) => it.text.trim())
        .filter(Boolean);
      if (slotItems.length > 0) {
        sections.push([phase.title, ...slotItems].join('\n'));
      }
    }
    if (sections.length === 0) {
      onNotify(`Nessuna nota da copiare per ${formatItalianDateShort(isoDate)}`);
      return;
    }
    const ok = await copyTextToClipboard(sections.join('\n\n'));
    if (ok) {
      setCopiedDayIso(isoDate);
      window.setTimeout(
        () => setCopiedDayIso((prev) => (prev === isoDate ? null : prev)),
        1800
      );
      onNotify(`Note del ${formatItalianDateShort(isoDate)} copiate negli appunti`);
    } else {
      onNotify('Copia non consentita dal browser');
    }
  };

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'org_controls',
      render: () => (
        <section className="rounded-2xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRangeStartIso(todayIso);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <Calendar className="h-3.5 w-3.5 opacity-90" aria-hidden="true" />
                Oggi
              </button>
              <button
                type="button"
                onClick={() => setRangeStartIso((prev) => addDaysISO(prev, -4))}
                aria-label="Giorni precedenti"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] px-2 py-1 text-xs font-semibold text-[var(--todo-text)] hover:opacity-85"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Prima</span>
              </button>
              <button
                type="button"
                onClick={() => setRangeStartIso((prev) => addDaysISO(prev, 4))}
                aria-label="Giorni successivi"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] px-2 py-1 text-xs font-semibold text-[var(--todo-text)] hover:opacity-85"
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Dopo</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Annulla ultima azione"
                title="Annulla ultima azione"
                className="min-h-[34px] w-[34px] inline-flex items-center justify-center rounded-xl border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-text)] hover:opacity-85 disabled:opacity-35 disabled:pointer-events-none transition-opacity"
              >
                <Undo2 className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportModalDate(rangeStartIso);
                  setExportModalScope('week');
                  setExportModalOpen(true);
                }}
                aria-label="Stampa o esporta programma"
                title="Stampa & Esporta giornata o settimana"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] px-2 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:opacity-85 transition-opacity whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
                <span className="hidden sm:inline">Stampa</span>
              </button>

              <button
                type="button"
                onClick={() => openNewNoteModal(todayIso, 'mattina')}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-xl border border-[var(--todo-shell-border)] bg-[var(--todo-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--todo-text)] hover:opacity-85 transition-opacity whitespace-nowrap"
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
        <section className="rounded-2xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] p-2 sm:p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-[var(--todo-text-muted)]">
              {viewMode === 'daily' ? 'Calendario verticale' : 'Vista settimanale compatta'}
            </span>
            <button
              type="button"
              onClick={() => setRangeStartIso((prev) => addDaysISO(prev, -7))}
              className="text-[11px] font-semibold text-[var(--todo-accent)] hover:underline whitespace-nowrap"
            >
              +7 giorni prima
            </button>
          </div>

          {/* Dual View Toggle: Giornaliera | Settimanale */}
          <div
            role="group"
            aria-label="Modalità visualizzazione calendario"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              aria-pressed={viewMode === 'daily'}
              style={
                viewMode === 'daily'
                  ? {
                      background:
                        'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
                    }
                  : undefined
              }
              className={`min-h-[32px] inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'daily'
                  ? 'text-white shadow-xs'
                  : 'text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]'
              }`}
            >
              <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Giornaliera</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              aria-pressed={viewMode === 'weekly'}
              style={
                viewMode === 'weekly'
                  ? {
                      background:
                        'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
                    }
                  : undefined
              }
              className={`min-h-[32px] inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'weekly'
                  ? 'text-white shadow-xs'
                  : 'text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Settimanale</span>
            </button>
          </div>

          {/* Vertical Scrollable Calendar Viewport (Giornaliera vs Settimanale 2-column 6-card grid) */}
          <div
            ref={scrollContainerRef}
            className={
              viewMode === 'weekly'
                ? 'h-[640px] sm:h-[700px] overflow-y-auto pr-0.5 grid grid-cols-2 gap-1.5 content-start items-start'
                : 'h-[620px] sm:h-[680px] overflow-y-auto pr-1 space-y-2'
            }
          >
            {daysList.map((isoDate) => {
              const isToday = isoDate === todayIso;
              const weekdayLabel = formatItalianWeekdayShort(isoDate);
              const dateShort = formatItalianDateShort(isoDate);
              const dayTotalCount = DAY_PHASES.reduce(
                (acc, p) => acc + (itemsBySlot.get(`${isoDate}|${p.key}`)?.length || 0),
                0
              );

              if (viewMode === 'weekly') {
                const populatedPhases = DAY_PHASES.filter(
                  (p) => (itemsBySlot.get(`${isoDate}|${p.key}`)?.length || 0) > 0
                );
                const isDayDropActive = dropTarget?.date === isoDate;

                return (
                  <article
                    key={isoDate}
                    data-today-card={isToday ? 'true' : undefined}
                    data-org-date={isoDate}
                    data-org-phase="mattina"
                    onDragOver={(e) => {
                      if (!draggedOrgId) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dropTarget?.date !== isoDate) {
                        setDropTarget({ date: isoDate, phase: 'mattina' });
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
                            dropTarget.phase || 'mattina',
                            dropTarget.insertBeforeId
                          );
                        } else {
                          onMoveOrReorderOrganizeItem(
                            sourceId,
                            isoDate,
                            dropTarget?.phase || 'mattina',
                            null
                          );
                        }
                      }
                      resetOrgDragState();
                    }}
                    className={`rounded-lg border flex flex-col p-1.5 transition-colors min-w-0 ${
                      isDayDropActive
                        ? 'border-[var(--todo-accent)] bg-[var(--todo-accent-soft)] ring-1 ring-[var(--todo-accent)]'
                        : isToday
                          ? 'border-[var(--todo-day-today-border)] bg-[var(--todo-day-today-bg)] ring-1 ring-[var(--todo-accent)]/40'
                          : 'border-[var(--todo-card-border)] bg-[var(--todo-day-bg)]'
                    }`}
                  >
                    {/* Compact Proportional Header for 2-Column Weekly Grid */}
                    <div className="flex items-center justify-between gap-1 border-b border-[var(--todo-phase-border)] pb-1 mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="uppercase font-bold text-[9px] text-[var(--todo-text-muted)] shrink-0">
                          {weekdayLabel}
                        </span>
                        <span className="font-bold text-[10.5px] text-[var(--todo-text)] whitespace-nowrap">
                          {dateShort}
                        </span>
                        {isToday && (
                          <span className="rounded bg-[var(--todo-accent-dark)] px-1 py-[0.5px] text-[8px] font-bold text-white shrink-0">
                            Oggi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openNewNoteModal(isoDate, 'mattina')}
                          aria-label={`Nuova nota il ${dateShort}`}
                          title="Nuova nota"
                          className="h-4 w-4 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-accent)] hover:opacity-85"
                        >
                          <Plus className="h-2.5 w-2.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyDayNotes(isoDate)}
                          aria-label={`Copia note di ${dateShort}`}
                          title="Copia tutte le note del giorno"
                          className="h-4 w-4 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-accent)] hover:opacity-85"
                        >
                          {copiedDayIso === isoDate ? (
                            <Check className="h-2.5 w-2.5" aria-hidden="true" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPasteModalForDay(isoDate)}
                          aria-label={`Incolla note in ${dateShort}`}
                          title="Incolla da appunti"
                          className="h-4 w-4 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-accent)] hover:opacity-85"
                        >
                          <ClipboardPaste className="h-2.5 w-2.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Weekly Notes: NO visible phases, only a small empty gap between different phases */}
                    {populatedPhases.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openNewNoteModal(isoDate, 'mattina')}
                        className="w-full min-h-[26px] flex items-center justify-center gap-1 rounded border border-dashed border-[var(--todo-phase-border)]/70 text-[9.5px] font-medium text-[var(--todo-text-muted)] opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-2.5 w-2.5" aria-hidden="true" />
                        <span>Aggiungi</span>
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        {populatedPhases.map((phase, phaseIdx) => {
                          const slotItems = itemsBySlot.get(`${isoDate}|${phase.key}`) || [];
                          return (
                            <div
                              key={`${isoDate}-w-${phase.key}`}
                              data-org-date={isoDate}
                              data-org-phase={phase.key}
                              className={phaseIdx > 0 ? 'mt-2 space-y-1' : 'space-y-1'}
                            >
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
                                const hasReminder = Boolean(item.reminderDate && item.reminderTime);
                                const remShort = hasReminder
                                  ? `${item.reminderDate!.split('-')[2]}/${item.reminderDate!.split('-')[1]} ${item.reminderTime}`
                                  : '';

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
                                        className="relative z-10 h-2 -my-1 flex items-center"
                                      >
                                        <div
                                          className={`w-full rounded-full transition-all ${
                                            isInsertBefore
                                              ? 'h-[2.5px] bg-[var(--todo-accent)]'
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
                                      className={`flex items-start gap-1 rounded-md border px-1 py-[3px] transition-all ${
                                        isMergeTarget
                                          ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-soft)] ring-1 ring-[var(--todo-accent)]'
                                          : 'border-[var(--todo-note-border)] bg-[var(--todo-note-bg)] hover:border-[var(--todo-accent)]'
                                      } ${isDragged ? 'opacity-45' : ''}`}
                                    >
                                      <button
                                        type="button"
                                        aria-label={`Trascina "${item.text}"`}
                                        onPointerDown={(e) => {
                                          if (e.pointerType === 'mouse') return;
                                          e.stopPropagation();
                                          try {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                          } catch {
                                            // ignore
                                          }
                                          dragCursorRef.current = { x: e.clientX, y: e.clientY };
                                          pointerDragRef.current = { id: item.id, active: true };
                                          setDraggedOrgId(item.id);
                                        }}
                                        className="touch-none h-4 w-3 flex items-center justify-center rounded cursor-grab active:cursor-grabbing shrink-0 text-[var(--todo-text-muted)] mt-[1px]"
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
                                        className="h-4 w-4 flex items-center justify-center rounded shrink-0 text-[var(--todo-accent)] mt-[1px]"
                                      >
                                        {item.done ? (
                                          <CheckCircle2 className="h-3 w-3 text-[var(--todo-accent)]" />
                                        ) : (
                                          <Circle className="h-3 w-3 text-[var(--todo-text-muted)] opacity-60" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrgId(item.id)}
                                        className="min-w-0 flex-1 text-left flex items-start gap-1 py-[1px]"
                                      >
                                        <CatEmoticonIcon
                                          emoticonId={catId}
                                          text={item.text}
                                          variant="fullFace"
                                          sizeClass="h-4 w-4 mt-[1px]"
                                        />
                                        <span
                                          className={`block text-[10px] font-medium text-[var(--todo-text)] leading-[1.2] break-words ${
                                            item.done ? 'line-through opacity-55' : ''
                                          }`}
                                        >
                                          {item.text}
                                        </span>
                                      </button>

                                      <div className="flex items-center gap-0.5 shrink-0 mt-[1px]">
                                        {hasReminder && (
                                          <a
                                            href={buildGoogleCalendarUrl({
                                              title: item.text,
                                              details: `${formatItalianDateShort(isoDate)} · ${phase.title}: ${item.text}`,
                                              date: item.reminderDate!,
                                              time: item.reminderTime!,
                                            })}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title={`Aggiungi a Google Calendar (${remShort})`}
                                            aria-label={`Apri Google Calendar per ${item.text}`}
                                            className="h-4 w-4 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-accent-soft)] text-[var(--todo-accent)] hover:opacity-85"
                                          >
                                            <Calendar className="h-2.5 w-2.5" aria-hidden="true" />
                                          </a>
                                        )}

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDuplicateOrgItem(item);
                                            setDupDate(item.date);
                                            setDupPhase(item.phase);
                                          }}
                                          aria-label={`Duplica "${item.text}"`}
                                          title="Duplica in data e fase"
                                          className="h-4 w-4 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-surface)] text-[var(--todo-accent)] hover:bg-[var(--todo-accent-soft)]"
                                        >
                                          <CopyPlus className="h-2.5 w-2.5" aria-hidden="true" />
                                        </button>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              }

              return (
                <article
                  key={isoDate}
                  data-today-card={isToday ? 'true' : undefined}
                  className={`rounded-xl border flex flex-col transition-colors ${
                    isToday
                      ? 'border-[var(--todo-day-today-border)] bg-[var(--todo-day-today-bg)] ring-1 ring-[var(--todo-accent)]/40'
                      : 'border-[var(--todo-card-border)] bg-[var(--todo-day-bg)]'
                  } p-2`}
                >
                  {/* Day Header with Paste, Copy & Print icon buttons */}
                  <div className="flex items-center justify-between gap-1.5 border-b border-[var(--todo-phase-border)] pb-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="uppercase font-bold tracking-wide text-[11px] text-[var(--todo-text-muted)] shrink-0">
                        {weekdayLabel}
                      </span>
                      <span className="font-bold text-xs text-[var(--todo-text)] truncate">
                        {dateShort}
                      </span>
                      {isToday && (
                        <span className="rounded bg-[var(--todo-accent-dark)] px-1.5 py-[1px] text-[9px] font-bold text-white shrink-0">
                          Oggi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyDayNotes(isoDate)}
                        aria-label={`Copia note di ${dateShort}`}
                        title="Copia tutte le note del giorno con le fasi"
                        className="h-5 w-5 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-accent)] hover:opacity-85 transition-opacity"
                      >
                        {copiedDayIso === isoDate ? (
                          <Check className="h-2.5 w-2.5" aria-hidden="true" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPasteModalForDay(isoDate)}
                        aria-label={`Incolla note in ${dateShort}`}
                        title="Incolla da appunti (1 riga = 1 nota)"
                        className="h-5 w-5 inline-flex items-center justify-center rounded border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-accent)] hover:opacity-85 transition-opacity"
                      >
                        <ClipboardPaste className="h-2.5 w-2.5" aria-hidden="true" />
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
                        className="h-5 w-5 inline-flex items-center justify-center rounded border border-[var(--todo-note-border)] bg-[var(--todo-card)] text-[var(--todo-accent)] hover:opacity-85 transition-opacity"
                      >
                        <Printer className="h-2.5 w-2.5" aria-hidden="true" />
                      </button>
                      <span className="font-mono text-[10px] font-semibold text-[var(--todo-text-muted)] tabular-nums pl-0.5">
                        {dayTotalCount}
                      </span>
                    </div>
                  </div>

                  {/* 4 Phases Stacked One Below Another — shrink-wrapped, translucent until populated */}
                  <div className="flex flex-col gap-1">
                    {DAY_PHASES.map((phase) => {
                      const slotItems = itemsBySlot.get(`${isoDate}|${phase.key}`) || [];
                      const hasNotes = slotItems.length > 0;
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
                              ? 'border-[var(--todo-accent)] bg-[var(--todo-accent-soft)] ring-1 ring-[var(--todo-accent)]'
                              : hasNotes
                                ? 'border-[var(--todo-phase-border)] bg-[var(--todo-phase-populated-bg)]'
                                : 'opacity-40 hover:opacity-80 border-[var(--todo-phase-border)]/60 bg-transparent'
                          } ${hasNotes ? 'px-1.5 py-1' : 'px-1.5 py-[2px]'}`}
                        >
                          {/* Subtle compact Phase Strip */}
                          <button
                            type="button"
                            onClick={() => openNewNoteModal(isoDate, phase.key)}
                            className="w-full flex items-center justify-between gap-1 text-left group leading-none py-[1px]"
                          >
                            <span
                              className={`text-[8.5px] sm:text-[9px] font-semibold tracking-tight leading-none text-[var(--todo-text-muted)] group-hover:text-[var(--todo-text)] truncate ${
                                hasNotes ? 'opacity-75' : ''
                              }`}
                            >
                              {phase.title}
                            </span>
                            <Plus
                              className="h-2.5 w-2.5 shrink-0 text-[var(--todo-text-muted)] opacity-65 group-hover:opacity-100 group-hover:text-[var(--todo-accent)]"
                              aria-hidden="true"
                            />
                          </button>

                          {/* Readable Full-Size Note Rows matching Da Fare */}
                          {hasNotes && (
                            <div className="mt-1 space-y-1">
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
                                const hasReminder = Boolean(item.reminderDate && item.reminderTime);
                                const remShort = hasReminder
                                  ? `${item.reminderDate!.split('-')[2]}/${item.reminderDate!.split('-')[1]} ${item.reminderTime}`
                                  : '';

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
                                              ? 'h-[3px] bg-[var(--todo-accent)]'
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
                                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-[6px] min-h-[34px] transition-all ${
                                        isMergeTarget
                                          ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-soft)] ring-2 ring-[var(--todo-accent)]'
                                          : 'border-[var(--todo-note-border)] bg-[var(--todo-note-bg)] hover:border-[var(--todo-accent)]'
                                      } ${isDragged ? 'opacity-45' : ''}`}
                                    >
                                      <button
                                        type="button"
                                        aria-label={`Trascina "${item.text}"`}
                                        onPointerDown={(e) => {
                                          if (e.pointerType === 'mouse') return;
                                          e.stopPropagation();
                                          try {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                          } catch {
                                            // ignore
                                          }
                                          dragCursorRef.current = { x: e.clientX, y: e.clientY };
                                          pointerDragRef.current = { id: item.id, active: true };
                                          setDraggedOrgId(item.id);
                                        }}
                                        className="touch-none h-6 w-4.5 flex items-center justify-center rounded cursor-grab active:cursor-grabbing shrink-0 text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]"
                                      >
                                        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
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
                                        className="h-5 w-5 flex items-center justify-center rounded shrink-0 text-[var(--todo-accent)]"
                                      >
                                        {item.done ? (
                                          <CheckCircle2 className="h-4 w-4 text-[var(--todo-accent)]" />
                                        ) : (
                                          <Circle className="h-4 w-4 text-[var(--todo-text-muted)] opacity-60" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrgId(item.id)}
                                        className="min-w-0 flex-1 text-left flex items-center gap-1.5 py-[1px]"
                                      >
                                        <CatEmoticonIcon
                                          emoticonId={catId}
                                          text={item.text}
                                          variant="fullFace"
                                          sizeClass="h-6 w-6"
                                        />
                                        <span
                                          className={`block text-xs font-medium text-[var(--todo-text)] leading-[1.25] break-words ${
                                            item.done ? 'line-through opacity-55' : ''
                                          }`}
                                        >
                                          {item.text}
                                        </span>
                                      </button>

                                      {hasReminder && (
                                        <a
                                          href={buildGoogleCalendarUrl({
                                            title: item.text,
                                            details: `${formatItalianDateShort(isoDate)} · ${phase.title}: ${item.text}`,
                                            date: item.reminderDate!,
                                            time: item.reminderTime!,
                                          })}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          title={`Aggiungi a Google Calendar (${remShort})`}
                                          aria-label={`Apri Google Calendar per ${item.text}`}
                                          className="inline-flex items-center gap-1 rounded-md border border-[var(--todo-chip-border)] bg-[var(--todo-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--todo-text)] hover:opacity-85 shrink-0"
                                        >
                                          <Calendar className="h-3 w-3 text-[var(--todo-accent)]" aria-hidden="true" />
                                          <span className="font-mono tabular-nums">{remShort}</span>
                                        </a>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDuplicateOrgItem(item);
                                          setDupDate(item.date);
                                          setDupPhase(item.phase);
                                        }}
                                        aria-label={`Duplica "${item.text}"`}
                                        title="Duplica in data e fase"
                                        className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-[var(--todo-chip-border)] bg-[var(--todo-surface)] text-[var(--todo-accent)] hover:bg-[var(--todo-accent-soft)] shrink-0 transition-colors"
                                      >
                                        <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>

                                      {isMergeTarget && (
                                        <span className="rounded bg-[var(--todo-accent-dark)] px-1.5 py-[1px] text-[9.5px] font-bold text-white shrink-0">
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
                                        ? 'h-[3px] bg-[var(--todo-accent)]'
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
              className={`${
                viewMode === 'weekly' ? 'col-span-2' : ''
              } w-full min-h-[36px] rounded-xl border border-dashed border-[var(--todo-shell-border)] bg-[var(--todo-surface-alt)] text-xs font-semibold text-[var(--todo-text)] hover:opacity-85`}
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

      {/* Compact New Note Modal */}
      {newModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-new-modal-title"
          onClick={closeNewNoteModal}
        >
          <div
            className="w-full max-w-[330px] rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 id="org-new-modal-title" className="text-xs font-bold text-[var(--todo-text)]">
                  Nuova nota
                </h3>
                {newModalTab === 'create' && (
                  <button
                    type="button"
                    onClick={() => setShowNewCatPicker((v) => !v)}
                    aria-expanded={showNewCatPicker}
                    className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                      showNewCatPicker
                        ? 'border-[var(--todo-accent)] bg-[var(--todo-accent-soft)] text-[var(--todo-text)]'
                        : 'border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] text-[var(--todo-text)] hover:opacity-85'
                    }`}
                  >
                    <CatEmoticonIcon emoticonId={effectiveNewCat} variant="fullFace" sizeClass="h-4 w-4" />
                    <span>{CAT_EMOTICON_MAP[effectiveNewCat].label}</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeNewNoteModal}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-note-border)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] shrink-0"
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
            <div className="rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] p-2 space-y-1.5">
              <input
                type="date"
                value={newModalDate}
                onChange={(e) => setNewModalDate(e.target.value)}
                className="w-full min-h-[30px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-0.5 text-[11px] text-[var(--todo-text)]"
              />
              <div className="grid grid-cols-2 gap-1">
                {DAY_PHASES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setNewModalPhase(p.key)}
                    className={`min-h-[28px] rounded-lg border px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
                      newModalPhase === p.key
                        ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-dark)] text-white'
                        : 'border-[var(--todo-chip-border)] bg-[var(--todo-card)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--todo-surface-alt)] p-0.5">
              <button
                type="button"
                onClick={() => setNewModalTab('create')}
                className={`min-h-[28px] rounded-md px-2 text-[11px] font-semibold transition-colors ${
                  newModalTab === 'create'
                    ? 'bg-[var(--todo-accent-dark)] text-white shadow-xs'
                    : 'text-[var(--todo-text-muted)]'
                }`}
              >
                Nuova
              </button>
              <button
                type="button"
                onClick={() => setNewModalTab('from_todo')}
                className={`min-h-[28px] inline-flex items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors ${
                  newModalTab === 'from_todo'
                    ? 'bg-[var(--todo-accent-dark)] text-white shadow-xs'
                    : 'text-[var(--todo-text-muted)]'
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
                      className="w-full rounded-xl border border-[var(--todo-chip-border)] bg-[var(--todo-surface)] p-2 text-xs text-[var(--todo-text)] placeholder:text-[var(--todo-text-muted)]/60 focus:border-[var(--todo-accent)] focus:bg-[var(--todo-card)] focus:outline-none"
                    />

                    {/* Optional Reminder Toggle in New Note Modal */}
                    <div className="rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] px-2 py-1.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!showNewRemFields && !newModalRemDate) {
                              setNewModalRemDate(newModalDate);
                            }
                            setShowNewRemFields((v) => !v);
                          }}
                          className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--todo-text)] hover:opacity-80"
                        >
                          <Calendar className="h-3 w-3 text-[var(--todo-accent)]" aria-hidden="true" />
                          <span>
                            {newModalRemDate && newModalRemTime
                              ? `Promemoria: ${newModalRemDate.split('-').reverse().slice(0, 2).join('/')} ${newModalRemTime}`
                              : 'Imposta promemoria / Calendar'}
                          </span>
                        </button>
                        {(newModalRemDate || newModalRemTime) && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewModalRemDate('');
                              setNewModalRemTime('');
                            }}
                            className="text-[10px] font-semibold text-[var(--todo-text-muted)] hover:underline"
                          >
                            Rimuovi
                          </button>
                        )}
                      </div>
                      {showNewRemFields && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="date"
                            value={newModalRemDate}
                            onChange={(e) => setNewModalRemDate(e.target.value)}
                            aria-label="Data promemoria"
                            className="block w-full max-w-full min-w-0 min-h-[30px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-0.5 text-[var(--todo-text)]"
                          />
                          <input
                            type="time"
                            value={newModalRemTime}
                            onChange={(e) => setNewModalRemTime(e.target.value)}
                            aria-label="Ora promemoria"
                            className="block w-full max-w-full min-w-0 min-h-[30px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-0.5 text-[var(--todo-text)]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isTranscribing}
                        onClick={async () => {
                          clearMicError();
                          setNewModalError(null);
                          await startRecording();
                        }}
                        className="min-h-[34px] inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] px-2.5 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:opacity-85 disabled:opacity-50"
                      >
                        {isTranscribing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mic className="h-3.5 w-3.5 text-[var(--todo-accent)]" />
                        )}
                        <span>{isTranscribing ? 'Trascrivo...' : 'Voce'}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isTranscribing}
                        className="flex-1 min-h-[34px] inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        Inserisci
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl border border-[var(--todo-shell-border)] bg-[#062E2B] text-white p-2.5 space-y-2">
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
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {newModalError || micError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 rounded-lg border border-[var(--todo-note-border)] bg-[var(--todo-surface)] px-2 py-1 text-[11px] font-medium text-[var(--todo-text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removePickedTodo}
                    onChange={(e) => setRemovePickedTodo(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--todo-accent)] rounded"
                  />
                  <span>Sposta (rimuovi da «Da Fare»)</span>
                </label>

                {todoItems.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-[var(--todo-text-muted)]">
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
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--todo-text-muted)]">
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
                                className="w-full min-h-[28px] flex items-center justify-between gap-1.5 rounded-lg border border-[var(--todo-note-border)] bg-[var(--todo-note-bg)] px-2 py-0.5 text-left hover:border-[var(--todo-accent)]"
                              >
                                <span className="inline-flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-[var(--todo-text)]">
                                  <CatEmoticonIcon
                                    emoticonId={todo.emoji}
                                    text={todo.text}
                                    blockHint={todo.block}
                                    variant="fullFace"
                                    sizeClass="h-4 w-4"
                                  />
                                  <span className="truncate">{todo.text}</span>
                                </span>
                                <span className="text-[10px] font-semibold text-[var(--todo-accent)] shrink-0">
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

      {/* Compact Edit Existing Note Modal (Salva saves & auto-closes) */}
      {selectedOrgItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-edit-modal-title"
          onClick={() => setSelectedOrgId(null)}
        >
          <div
            className="w-full max-w-[330px] rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowEditCatPicker((v) => !v)}
                className="flex items-center gap-1.5 min-w-0 rounded-lg border border-[var(--todo-note-border)] bg-[var(--todo-surface)] px-2 py-1 hover:border-[var(--todo-accent)] transition-colors"
                title="Cambia emoticon gatto companion"
              >
                <CatEmoticonIcon
                  emoticonId={selectedOrgItem.emoji}
                  text={selectedOrgItem.text}
                  variant="fullFace"
                  sizeClass="h-5 w-5"
                />
                <h3 id="org-edit-modal-title" className="text-xs font-bold text-[var(--todo-text)] truncate">
                  {formatItalianDateShort(selectedOrgItem.date)} ·{' '}
                  {DAY_PHASE_MAP[selectedOrgItem.phase].title}
                </h3>
                <span className="text-[10px] font-semibold text-[var(--todo-accent)] shrink-0">
                  Cambia
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrgId(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-note-border)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] shrink-0"
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = editDraftText.trim();
                if (!clean) return;
                const oldAuto = inferCatEmoticonId(selectedOrgItem.text);
                const currentResolved = resolveCatEmoticonId(
                  selectedOrgItem.emoji,
                  selectedOrgItem.text
                );
                const shouldAutoUpdateIcon =
                  clean !== selectedOrgItem.text &&
                  (currentResolved === oldAuto || currentResolved === 'cat_note');
                onUpdateOrganizeItem(selectedOrgItem.id, {
                  text: clean,
                  ...(shouldAutoUpdateIcon
                    ? { emoji: reconcileAutoCatEmoticonId(undefined, clean) }
                    : {}),
                  reminderDate: editRemDate || undefined,
                  reminderTime: editRemTime || undefined,
                  updatedAt: new Date().toISOString(),
                });
                setSelectedOrgId(null);
                onNotify('Nota aggiornata');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={editDraftText}
                onChange={(e) => setEditDraftText(e.target.value)}
                className="flex-1 min-h-[34px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-surface)] px-2.5 py-1 text-xs text-[var(--todo-text)] focus:border-[var(--todo-accent)] focus:bg-[var(--todo-card)] focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-[34px] rounded-lg bg-[var(--todo-accent-dark)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 shrink-0"
              >
                Salva
              </button>
            </form>

            {/* Reminder Date & Time + Google Calendar Event */}
            <div className="rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--todo-text)]">
                  <Calendar className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
                  Promemoria e Calendario
                </span>
                {(editRemDate || editRemTime) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditRemDate('');
                      setEditRemTime('');
                    }}
                    className="text-[10px] font-semibold text-[var(--todo-text-muted)] hover:underline"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={editRemDate}
                  onChange={(e) => setEditRemDate(e.target.value)}
                  aria-label="Data promemoria"
                  className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-1 text-[var(--todo-text)]"
                />
                <input
                  type="time"
                  value={editRemTime}
                  onChange={(e) => setEditRemTime(e.target.value)}
                  aria-label="Ora promemoria"
                  className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-1 text-[var(--todo-text)]"
                />
              </div>
              {editRemDate && editRemTime && (
                <a
                  href={buildGoogleCalendarUrl({
                    title: editDraftText.trim() || selectedOrgItem.text,
                    details: `${formatItalianDateShort(selectedOrgItem.date)} · ${DAY_PHASE_MAP[selectedOrgItem.phase].title}: ${editDraftText.trim() || selectedOrgItem.text}`,
                    date: editRemDate,
                    time: editRemTime,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const clean = editDraftText.trim();
                    if (clean) {
                      onUpdateOrganizeItem(selectedOrgItem.id, {
                        text: clean,
                        reminderDate: editRemDate,
                        reminderTime: editRemTime,
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  }}
                  className="w-full min-h-[32px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--todo-accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Apri Google Calendar</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] p-2">
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
                className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-0.5 text-[var(--todo-text)]"
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
                className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-0.5 text-[var(--todo-text)]"
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
                className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] px-2 text-[11px] font-semibold text-[var(--todo-text)] hover:opacity-85"
              >
                <ArrowUp className="h-3 w-3" /> Su
              </button>
              <button
                type="button"
                onClick={() => onMoveOrganizeStep(selectedOrgItem.id, 1)}
                className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-surface-alt)] px-2 text-[11px] font-semibold text-[var(--todo-text)] hover:opacity-85"
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
                className="min-h-[32px] inline-flex items-center gap-1 rounded-lg border border-rose-300 dark:border-rose-700/70 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-200 hover:opacity-90"
              >
                <Trash2 className="h-3 w-3" /> Elimina
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrgId(null)}
                className="min-h-[32px] rounded-lg border border-[var(--todo-note-border)] bg-[var(--todo-surface-alt)] px-3 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:opacity-85"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
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
            className="w-full max-w-[330px] rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id="org-batch-paste-title" className="text-xs font-bold text-[var(--todo-text)] truncate">
                Incolla note · {formatItalianDateShort(pasteDate)}
              </h3>
              <button
                type="button"
                disabled={isParsingBatch}
                onClick={() => setPasteDate(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-note-border)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Phase Destination Selector */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] p-1.5">
              {DAY_PHASES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={isParsingBatch}
                  onClick={() => setPastePhase(p.key)}
                  className={`min-h-[28px] rounded-lg border px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
                    pastePhase === p.key
                      ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-dark)] text-white'
                      : 'border-[var(--todo-chip-border)] bg-[var(--todo-card)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]'
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
              className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--todo-shell-border)] bg-[var(--todo-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--todo-text)] hover:opacity-85 disabled:opacity-50"
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
                className="w-full rounded-xl border border-[var(--todo-chip-border)] bg-[var(--todo-surface)] p-2 text-[var(--todo-text)] placeholder:text-[var(--todo-text-muted)]/60 focus:border-[var(--todo-accent)] focus:bg-[var(--todo-card)] focus:outline-none"
              />

              {pasteError && (
                <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{pasteError}</p>
              )}

              <button
                type="submit"
                disabled={isParsingBatch || !pasteRawText.trim()}
                className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[var(--todo-accent)] to-[var(--todo-accent-dark)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
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

      {/* Compact Modal: Duplicate Note into Specific Date & Phase */}
      {duplicateOrgItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-duplicate-title"
          onClick={() => setDuplicateOrgItem(null)}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <CopyPlus className="h-4 w-4 text-[var(--todo-accent)] shrink-0" aria-hidden="true" />
                <h3 id="org-duplicate-title" className="text-xs font-bold text-[var(--todo-text)]">
                  Duplica nota
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateOrgItem(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-note-border)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-[var(--todo-note-border)] bg-[var(--todo-surface)] p-2">
              <CatEmoticonIcon
                emoticonId={duplicateOrgItem.emoji}
                text={duplicateOrgItem.text}
                variant="fullFace"
                sizeClass="h-6 w-6"
              />
              <span className="text-xs font-medium text-[var(--todo-text)] break-words leading-snug">
                {duplicateOrgItem.text}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dupDate) return;
                onDuplicateOrganizeItem(
                  {
                    text: duplicateOrgItem.text,
                    emoji: duplicateOrgItem.emoji,
                    done: duplicateOrgItem.done,
                    source: duplicateOrgItem.source,
                    reminderDate: duplicateOrgItem.reminderDate,
                    reminderTime: duplicateOrgItem.reminderTime,
                  },
                  dupDate,
                  dupPhase
                );
                setDuplicateOrgItem(null);
              }}
              className="space-y-2"
            >
              <label className="block">
                <span className="block text-[10.5px] font-semibold text-[var(--todo-text-muted)] mb-1">
                  Data di destinazione
                </span>
                <input
                  type="date"
                  required
                  value={dupDate}
                  onChange={(e) => setDupDate(e.target.value)}
                  className="block w-full max-w-full min-w-0 min-h-[34px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-surface)] px-2.5 py-1 text-xs text-[var(--todo-text)]"
                />
              </label>

              <div>
                <span className="block text-[10.5px] font-semibold text-[var(--todo-text-muted)] mb-1">
                  Fase del giorno
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {DAY_PHASES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setDupPhase(p.key)}
                      className={`min-h-[30px] rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                        dupPhase === p.key
                          ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-dark)] text-white'
                          : 'border-[var(--todo-chip-border)] bg-[var(--todo-surface)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background:
                    'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
                }}
                className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Conferma e duplica</span>
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
        <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-full bg-[var(--todo-accent-dark)] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg border border-[var(--todo-shell-border)] whitespace-nowrap max-w-[92vw] truncate">
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
