import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Circle,
  ClipboardPaste,
  Copy,
  GripVertical,
  Loader2,
  Mic,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type {
  DayPhaseKey,
  TodoBlockKey,
  TodoNoteItem,
} from '../types/dailyTodo';
import {
  DAY_PHASES,
  TODO_BLOCK_MAP,
  TODO_BLOCKS,
  buildGoogleCalendarUrl,
} from '../utils/dailyTodoStorage';
import { fetchApiJsonWithRetry } from '../utils/apiError';
import { startBackgroundSession } from '../utils/backgroundKeepAlive';
import {
  copyTextToClipboard,
  parsePastedLinesSingleRow,
  readClipboardTextDirect,
} from '../utils/clipboardHelper';
import {
  CAT_EMOTICON_MAP,
  inferCatEmoticonId,
  resolveCatEmoticonId,
  type CatEmoticonId,
} from '../utils/catEmoticonLibrary';
import { formatDuration, toISODate } from '../utils/dateUtils';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import { publishQuotaSnapshot } from '../utils/quotaTracker';
import { fetchTranscribeWithDebug } from '../utils/transcribeDebugLog';
import { CatEmoticonIcon, CatEmoticonPicker } from './CatEmoticon';
import {
  CustomizableSectionStack,
  type CustomizableBlockItem,
} from './CustomizableSectionStack';

interface DaFareSubsectionProps {
  todoItems: TodoNoteItem[];
  sectionLayout: SectionLayoutState;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onAddTodo: (item: TodoNoteItem) => void;
  onAddManyTodos: (items: TodoNoteItem[]) => void;
  onUpdateTodo: (id: string, patch: Partial<TodoNoteItem>) => void;
  onDeleteTodo: (id: string) => void;
  onMoveOrReorderTodo: (
    draggedId: string,
    targetBlock: TodoBlockKey,
    targetItemId?: string | null
  ) => void;
  onMergeTodos: (sourceId: string, targetId: string) => void;
  onMoveTodoStep: (id: string, delta: -1 | 1) => void;
  onSendTodoToOrganize: (
    todo: TodoNoteItem,
    date: string,
    phase: DayPhaseKey,
    removeFromTodo: boolean
  ) => void;
  onNotify: (msg: string) => void;
}

export const DaFareSubsection: React.FC<DaFareSubsectionProps> = ({
  todoItems,
  sectionLayout,
  onChangeLayout,
  onResetLayout,
  onAddTodo,
  onAddManyTodos,
  onUpdateTodo,
  onDeleteTodo,
  onMoveOrReorderTodo,
  onMergeTodos,
  onMoveTodoStep,
  onSendTodoToOrganize,
  onNotify,
}) => {
  const [composerBlock, setComposerBlock] = useState<TodoBlockKey>('poi');
  const [composerText, setComposerText] = useState('');
  const [manualCatEmoticon, setManualCatEmoticon] = useState<CatEmoticonId | null>(null);
  const [showComposerCatPicker, setShowComposerCatPicker] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [copiedBlockKey, setCopiedBlockKey] = useState<TodoBlockKey | null>(null);

  // Batch Paste Modal for any block
  const [pasteBlock, setPasteBlock] = useState<TodoBlockKey | null>(null);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isParsingBatch, setIsParsingBatch] = useState(false);

  // Note Detail Modal (compact)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [modalTextDraft, setModalTextDraft] = useState('');
  const [modalRemDate, setModalRemDate] = useState('');
  const [modalRemTime, setModalRemTime] = useState('');
  const [showModalCatPicker, setShowModalCatPicker] = useState(false);
  const [modalOrgDate, setModalOrgDate] = useState(() => toISODate(new Date()));
  const [modalOrgPhase, setModalOrgPhase] = useState<DayPhaseKey>('mattina');

  // Drag & Drop state (Desktop HTML5 + Touch Pointer): supports Move/Reorder AND Merge
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<TodoBlockKey | null>(null);
  const [dragInsertBeforeId, setDragInsertBeforeId] = useState<string | null>(null);
  const [dragInsertEndBlock, setDragInsertEndBlock] = useState<TodoBlockKey | null>(null);
  const [dragMergeTargetId, setDragMergeTargetId] = useState<string | null>(null);
  const pointerDragRef = useRef<{ id: string; active: boolean } | null>(null);

  const composerRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const itemsByBlock = useMemo(() => {
    const map: Record<TodoBlockKey, TodoNoteItem[]> = {
      poi: [],
      svaghi: [],
      bollette: [],
      poi_poi: [],
    };
    for (const item of todoItems) {
      map[item.block].push(item);
    }
    for (const key of Object.keys(map) as TodoBlockKey[]) {
      map[key].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [todoItems]);

  const selectedTodo = useMemo(
    () => todoItems.find((t) => t.id === selectedTodoId) || null,
    [todoItems, selectedTodoId]
  );

  useEffect(() => {
    if (selectedTodo) {
      setModalTextDraft(selectedTodo.text);
      setModalRemDate(selectedTodo.reminderDate || '');
      setModalRemTime(selectedTodo.reminderTime || '');
      setShowModalCatPicker(false);
    }
  }, [selectedTodo?.id]);

  const resetDragState = () => {
    pointerDragRef.current = null;
    setDraggedTodoId(null);
    setDragOverBlock(null);
    setDragInsertBeforeId(null);
    setDragInsertEndBlock(null);
    setDragMergeTargetId(null);
  };

  // Global touch/pointer drag listeners for iPhone touch drag-and-drop (Move/Reorder + Merge)
  useEffect(() => {
    const inspectPoint = (x: number, y: number, draggedId: string) => {
      const elements = document.elementsFromPoint(x, y);
      let insertBefore: string | null = null;
      let insertEnd: TodoBlockKey | null = null;
      let mergeId: string | null = null;
      let blockKey: TodoBlockKey | null = null;

      for (const el of elements) {
        if (!insertBefore) {
          const ib = el.getAttribute('data-todo-insert-before');
          if (ib && ib !== draggedId) insertBefore = ib;
        }
        if (!insertEnd) {
          const ie = el.getAttribute('data-todo-insert-end') as TodoBlockKey | null;
          if (ie) insertEnd = ie;
        }
        if (!mergeId) {
          const mi = el.getAttribute('data-todo-merge-id');
          if (mi && mi !== draggedId) mergeId = mi;
        }
        if (!blockKey) {
          const bk = el.getAttribute('data-todo-block') as TodoBlockKey | null;
          if (bk) blockKey = bk;
        }
      }
      return { insertBefore, insertEnd, mergeId, blockKey };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = pointerDragRef.current;
      if (!state?.active) return;
      const hit = inspectPoint(e.clientX, e.clientY, state.id);
      setDragOverBlock(hit.blockKey);
      if (hit.insertBefore) {
        setDragInsertBeforeId(hit.insertBefore);
        setDragInsertEndBlock(null);
        setDragMergeTargetId(null);
      } else if (hit.insertEnd) {
        setDragInsertBeforeId(null);
        setDragInsertEndBlock(hit.insertEnd);
        setDragMergeTargetId(null);
      } else if (hit.mergeId) {
        setDragInsertBeforeId(null);
        setDragInsertEndBlock(null);
        setDragMergeTargetId(hit.mergeId);
      } else {
        setDragInsertBeforeId(null);
        setDragInsertEndBlock(null);
        setDragMergeTargetId(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = pointerDragRef.current;
      if (!state?.active) return;
      const hit = inspectPoint(e.clientX, e.clientY, state.id);

      if (hit.insertBefore && hit.blockKey) {
        onMoveOrReorderTodo(state.id, hit.blockKey, hit.insertBefore);
      } else if (hit.insertEnd) {
        onMoveOrReorderTodo(state.id, hit.insertEnd, null);
      } else if (hit.mergeId) {
        onMergeTodos(state.id, hit.mergeId);
      } else if (hit.blockKey) {
        onMoveOrReorderTodo(state.id, hit.blockKey, null);
      }
      resetDragState();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onMoveOrReorderTodo, onMergeTodos]);

  const nextOrderForBlock = (block: TodoBlockKey): number => {
    const list = itemsByBlock[block];
    if (list.length === 0) return 0;
    return Math.max(...list.map((i) => i.order)) + 1;
  };

  const effectiveComposerCat: CatEmoticonId =
    manualCatEmoticon ?? inferCatEmoticonId(composerText, composerBlock);

  const handleAddWrittenTodo = (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);
    const trimmed = composerText.trim();
    if (!trimmed) {
      setComposerError('Scrivi una nota o usa il microfono.');
      return;
    }
    const nowIso = new Date().toISOString();
    const chosenCat = manualCatEmoticon ?? inferCatEmoticonId(trimmed, composerBlock);
    const newItem: TodoNoteItem = {
      id: crypto.randomUUID(),
      block: composerBlock,
      text: trimmed,
      emoji: chosenCat,
      color: 'none',
      done: false,
      order: nextOrderForBlock(composerBlock),
      source: 'text',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    onAddTodo(newItem);
    setComposerText('');
    setManualCatEmoticon(null);
    setShowComposerCatPicker(false);
    onNotify(`Nota aggiunta in «${TODO_BLOCK_MAP[composerBlock].title}»`);
  };

  // Transcribe-only (no audio saved)
  const handleStopAndSaveVoiceTodo = async () => {
    setComposerError(null);
    const rec = await stopRecording();
    if (!rec) return;

    setIsTranscribing(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 90000);
    const stopKeepAlive = startBackgroundSession('Trascrizione nota in corso');
    try {
      const { ok, data } = await fetchTranscribeWithDebug<{
        text?: string;
        emoji?: string;
        quota?: unknown;
        error?: string;
      }>({
        endpoint: '/api/notes/transcribe-todo',
        caller: 'DaFareSubsection',
        signal: controller.signal,
        micDiagnostics: rec.diagnostics,
        payload: {
          audioBase64: rec.base64,
          mimeType: rec.mimeType,
        },
      });
      if (data.quota) publishQuotaSnapshot(data.quota);
      if (!ok || !data.text?.trim()) {
        setComposerError(
          data.error || 'Impossibile trascrivere la nota. Riprova o scrivila a mano.'
        );
        return;
      }

      const cleanText = data.text.trim();
      const nowIso = new Date().toISOString();
      const chosenCat =
        manualCatEmoticon ??
        resolveCatEmoticonId(
          typeof data.emoji === 'string' ? data.emoji.trim() : undefined,
          cleanText,
          composerBlock
        );
      const newItem: TodoNoteItem = {
        id: crypto.randomUUID(),
        block: composerBlock,
        text: cleanText,
        emoji: chosenCat,
        color: 'none',
        done: false,
        order: nextOrderForBlock(composerBlock),
        source: 'voice',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      onAddTodo(newItem);
      setManualCatEmoticon(null);
      setShowComposerCatPicker(false);
      onNotify(`Nota trascritta in «${TODO_BLOCK_MAP[composerBlock].title}»`);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setComposerError('Tempo di attesa scaduto durante la trascrizione. Riprova tra poco.');
      } else {
        setComposerError('Errore di rete durante la trascrizione.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      stopKeepAlive();
      setIsTranscribing(false);
    }
  };

  const handleOpenPasteModal = async (blockKey: TodoBlockKey) => {
    setPasteBlock(blockKey);
    setPasteRawText('');
    setPasteError(null);
    // Try direct clipboard read immediately inside the tap gesture
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

    // Fallback: focus textarea and attempt legacy execCommand paste
    if (pasteTextareaRef.current) {
      pasteTextareaRef.current.focus();
      try {
        const ok = document.execCommand('paste');
        if (ok && pasteTextareaRef.current.value.trim()) {
          setPasteRawText(pasteTextareaRef.current.value);
          return;
        }
      } catch {
        // execCommand blocked
      }
    }

    setPasteError(
      res.reason === 'empty'
        ? 'Gli appunti sono vuoti: scrivi o incolla qui sotto.'
        : 'Il browser limita l’accesso automatico: tocca dentro al riquadro qui sotto e premi Incolla.'
    );
  };

  const handleSubmitBatchPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteBlock) return;
    const raw = pasteRawText.trim();
    if (!raw) {
      setPasteError('Incolla almeno una riga di testo.');
      return;
    }

    // Strict 1-line = 1-note: preserve all multiple activities on one line together
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
        // Fallback to local emoticon inference cleanly
      }

      const baseOrder = nextOrderForBlock(pasteBlock);
      const nowIso = new Date().toISOString();
      const created: TodoNoteItem[] = strictLines.map((clean, idx) => ({
        id: crypto.randomUUID(),
        block: pasteBlock,
        text: clean,
        emoji: resolveCatEmoticonId(emojiSuggestions[idx] || undefined, clean, pasteBlock),
        color: 'none',
        done: false,
        order: baseOrder + idx,
        source: 'text',
        createdAt: nowIso,
        updatedAt: nowIso,
      }));

      onAddManyTodos(created);
      onNotify(
        `${created.length} ${created.length === 1 ? 'nota aggiunta' : 'note aggiunte'} in «${TODO_BLOCK_MAP[pasteBlock].title}»`
      );
      setPasteBlock(null);
      setPasteRawText('');
    } catch {
      setPasteError('Errore durante l’elaborazione del testo.');
    } finally {
      setIsParsingBatch(false);
    }
  };

  const focusComposerForBlock = (blockKey: TodoBlockKey) => {
    setComposerBlock(blockKey);
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.setTimeout(() => textInputRef.current?.focus(), 180);
  };

  const handleCopyBlockNotes = async (blockKey: TodoBlockKey) => {
    const items = itemsByBlock[blockKey] || [];
    const lines = items.map((i) => i.text.trim()).filter(Boolean);
    if (lines.length === 0) {
      onNotify(`Nessuna nota da copiare in «${TODO_BLOCK_MAP[blockKey].title}»`);
      return;
    }
    const ok = await copyTextToClipboard(lines.join('\n'));
    if (ok) {
      setCopiedBlockKey(blockKey);
      window.setTimeout(
        () => setCopiedBlockKey((prev) => (prev === blockKey ? null : prev)),
        1800
      );
      onNotify(`Note di «${TODO_BLOCK_MAP[blockKey].title}» copiate negli appunti`);
    } else {
      onNotify('Copia non consentita dal browser');
    }
  };

  const renderTodoBlockCard = (blockKey: TodoBlockKey) => {
    const meta = TODO_BLOCK_MAP[blockKey];
    const items = itemsByBlock[blockKey];
    const openCount = items.filter((i) => !i.done).length;
    const isDropZoneActive = dragOverBlock === blockKey;

    return (
      <section
        data-todo-block={blockKey}
        onDragOver={(e) => {
          if (!draggedTodoId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverBlock !== blockKey) setDragOverBlock(blockKey);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverBlock === blockKey) setDragOverBlock(null);
          }
        }}
        onDrop={(e) => {
          if (!draggedTodoId) return;
          e.preventDefault();
          const sourceId = draggedTodoId || e.dataTransfer.getData('text/plain');
          if (sourceId) {
            if (dragMergeTargetId && dragMergeTargetId !== sourceId) {
              onMergeTodos(sourceId, dragMergeTargetId);
            } else if (dragInsertBeforeId && dragInsertBeforeId !== sourceId) {
              onMoveOrReorderTodo(sourceId, blockKey, dragInsertBeforeId);
            } else {
              onMoveOrReorderTodo(sourceId, blockKey, null);
            }
          }
          resetDragState();
        }}
        className={`rounded-2xl border p-2.5 sm:p-3 shadow-xs transition-all ${meta.cardSurfaceClass} ${
          isDropZoneActive ? 'ring-2 ring-[var(--todo-accent)] scale-[0.995]' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-[var(--todo-phase-border)]">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className={`text-[13px] sm:text-sm font-bold leading-snug ${meta.headerAccentClass}`}>
              {meta.title}
            </h3>
            <span
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums shrink-0 ${meta.badgeClass}`}
            >
              {openCount}/{items.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => handleCopyBlockNotes(blockKey)}
              aria-label={`Copia note di ${meta.title}`}
              title={`Copia tutte le note di ${meta.title}`}
              className="min-h-[28px] w-7 inline-flex items-center justify-center rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-surface)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] hover:border-[var(--todo-accent)] transition-colors"
            >
              {copiedBlockKey === blockKey ? (
                <Check className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOpenPasteModal(blockKey)}
              aria-label={`Incolla più note in ${meta.title}`}
              title="Incolla da appunti (1 riga = 1 nota)"
              className="min-h-[28px] w-7 inline-flex items-center justify-center rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-surface)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] hover:border-[var(--todo-accent)] transition-colors"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => focusComposerForBlock(blockKey)}
              aria-label={`Aggiungi nota in ${meta.title}`}
              className="min-h-[28px] inline-flex items-center gap-1 rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] transition-colors whitespace-nowrap"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              <span>Aggiungi</span>
            </button>
          </div>
        </div>

        {/* Ultra-slim Note Strips + Reorder Gaps + Drop-to-Merge Targets */}
        <div className="mt-1.5 space-y-1">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--todo-card-border)] bg-[var(--todo-surface)] px-2.5 py-1.5 text-center text-[11px] text-[var(--todo-text-muted)]">
              Nessuna nota
            </div>
          ) : (
            <>
              {items.map((item) => {
                const isDragged = draggedTodoId === item.id;
                const isInsertBefore =
                  draggedTodoId !== null &&
                  draggedTodoId !== item.id &&
                  dragInsertBeforeId === item.id;
                const isMergeTarget =
                  draggedTodoId !== null &&
                  draggedTodoId !== item.id &&
                  dragMergeTargetId === item.id;
                const catId = resolveCatEmoticonId(item.emoji, item.text, blockKey);
                const hasReminder = Boolean(item.reminderDate && item.reminderTime);
                const remShort = hasReminder
                  ? `${item.reminderDate!.split('-')[2]}/${item.reminderDate!.split('-')[1]} ${item.reminderTime}`
                  : '';

                return (
                  <React.Fragment key={item.id}>
                    {draggedTodoId && draggedTodoId !== item.id && (
                      <div
                        data-todo-insert-before={item.id}
                        data-todo-block={blockKey}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverBlock(blockKey);
                          setDragInsertBeforeId(item.id);
                          setDragInsertEndBlock(null);
                          setDragMergeTargetId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const sourceId = draggedTodoId || e.dataTransfer.getData('text/plain');
                          if (sourceId && sourceId !== item.id) {
                            onMoveOrReorderTodo(sourceId, blockKey, item.id);
                          }
                          resetDragState();
                        }}
                        className="relative z-10 h-3 -my-1.5 flex items-center"
                      >
                        <div
                          className={`w-full rounded-full transition-all ${
                            isInsertBefore ? 'h-[3px] bg-[var(--todo-accent)]' : 'h-[1px] bg-transparent'
                          }`}
                        />
                      </div>
                    )}

                    <div
                      data-todo-merge-id={item.id}
                      data-todo-block={blockKey}
                      draggable
                      onDragStart={(e) => {
                        setDraggedTodoId(item.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragOver={(e) => {
                        if (!draggedTodoId || draggedTodoId === item.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverBlock(blockKey);
                        setDragInsertBeforeId(null);
                        setDragInsertEndBlock(null);
                        setDragMergeTargetId(item.id);
                      }}
                      onDrop={(e) => {
                        if (!draggedTodoId || draggedTodoId === item.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const sourceId = draggedTodoId || e.dataTransfer.getData('text/plain');
                        if (sourceId && sourceId !== item.id) {
                          onMergeTodos(sourceId, item.id);
                        }
                        resetDragState();
                      }}
                      onDragEnd={resetDragState}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-[6px] min-h-[34px] transition-all ${
                        isMergeTarget
                          ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-soft)] ring-2 ring-[var(--todo-accent)]'
                          : 'border-[var(--todo-note-border)] bg-[var(--todo-note-bg)] hover:border-[var(--todo-accent)]'
                      } ${isDragged ? 'opacity-45' : ''}`}
                    >
                      {/* Ultra-compact Touch + Mouse Drag Handle */}
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
                          pointerDragRef.current = { id: item.id, active: true };
                          setDraggedTodoId(item.id);
                        }}
                        className="touch-none h-6 w-4.5 flex items-center justify-center rounded cursor-grab active:cursor-grabbing shrink-0 text-[var(--todo-text-muted)] hover:text-[var(--todo-text)]"
                      >
                        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      {/* Ultra-compact Done Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateTodo(item.id, {
                            done: !item.done,
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                        aria-label={item.done ? 'Segna come da fare' : 'Segna come completata'}
                        className="h-5 w-5 flex items-center justify-center rounded shrink-0 text-[var(--todo-accent)]"
                      >
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 text-[var(--todo-accent)]" aria-hidden="true" />
                        ) : (
                          <Circle className="h-4 w-4 text-[var(--todo-text-muted)] opacity-60" aria-hidden="true" />
                        )}
                      </button>

                      {/* Clickable Note Text + Companion Cat Emoticon */}
                      <button
                        type="button"
                        onClick={() => setSelectedTodoId(item.id)}
                        className="min-w-0 flex-1 text-left flex items-center gap-1.5 py-[1px]"
                      >
                        <CatEmoticonIcon
                          emoticonId={catId}
                          text={item.text}
                          blockHint={blockKey}
                          variant="fullFace"
                          sizeClass="h-[22px] w-[22px]"
                        />
                        <span
                          className={`text-xs font-medium text-[var(--todo-text)] leading-[1.25] break-words ${
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
                            details: `${TODO_BLOCK_MAP[blockKey].title}: ${item.text}`,
                            date: item.reminderDate!,
                            time: item.reminderTime!,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`Aggiungi a Google Calendar (${remShort})`}
                          aria-label={`Apri Google Calendar per ${item.text}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--todo-card-border)] bg-[var(--todo-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--todo-text)] hover:opacity-85 shrink-0"
                        >
                          <Calendar className="h-3 w-3 text-[var(--todo-accent)]" aria-hidden="true" />
                          <span className="font-mono tabular-nums">{remShort}</span>
                        </a>
                      )}

                      {isMergeTarget && (
                        <span className="rounded bg-[var(--todo-accent-dark)] px-1.5 py-[1px] text-[9.5px] font-bold text-white shrink-0">
                          Unisci
                        </span>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {draggedTodoId && (
                <div
                  data-todo-insert-end={blockKey}
                  data-todo-block={blockKey}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverBlock(blockKey);
                    setDragInsertBeforeId(null);
                    setDragInsertEndBlock(blockKey);
                    setDragMergeTargetId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const sourceId = draggedTodoId || e.dataTransfer.getData('text/plain');
                    if (sourceId) {
                      onMoveOrReorderTodo(sourceId, blockKey, null);
                    }
                    resetDragState();
                  }}
                  className="relative z-10 h-3 -my-1 flex items-center"
                >
                  <div
                    className={`w-full rounded-full transition-all ${
                      dragInsertEndBlock === blockKey ? 'h-[3px] bg-[var(--todo-accent)]' : 'h-[1px] bg-transparent'
                    }`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  };

  const blocks: CustomizableBlockItem[] = [
    {
      id: 'todo_composer',
      render: () => (
        <section
          ref={composerRef}
          className="rounded-2xl border border-[var(--todo-card-border)] bg-[var(--todo-card)] p-3 shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--todo-text)]">Nuova nota</h3>
            <button
              type="button"
              onClick={() => setShowComposerCatPicker((v) => !v)}
              aria-expanded={showComposerCatPicker}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                showComposerCatPicker
                  ? 'border-[var(--todo-accent)] bg-[var(--todo-accent-soft)] text-[var(--todo-text)]'
                  : 'border-[var(--todo-card-border)] bg-[var(--todo-surface)] text-[var(--todo-text-muted)] hover:bg-[var(--todo-accent-soft)]'
              }`}
            >
              <CatEmoticonIcon
                emoticonId={effectiveComposerCat}
                variant="fullFace"
                sizeClass="h-4.5 w-4.5"
              />
              <span>
                {manualCatEmoticon
                  ? CAT_EMOTICON_MAP[effectiveComposerCat].label
                  : `Gattino · ${CAT_EMOTICON_MAP[effectiveComposerCat].label}`}
              </span>
            </button>
          </div>

          {showComposerCatPicker && (
            <CatEmoticonPicker
              value={effectiveComposerCat}
              variant="fullFace"
              isAuto={manualCatEmoticon === null}
              onSelect={(id) => {
                setManualCatEmoticon(id);
                setShowComposerCatPicker(false);
              }}
              onResetAuto={() => {
                setManualCatEmoticon(null);
                setShowComposerCatPicker(false);
              }}
            />
          )}

          {/* Block Destination Selector (full readable block names, no truncation) */}
          <div className="flex flex-wrap gap-1.5">
            {TODO_BLOCKS.map((b) => {
              const active = composerBlock === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setComposerBlock(b.key)}
                  aria-pressed={active}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
                        }
                      : undefined
                  }
                  className={`flex-auto min-h-[34px] rounded-lg border px-2.5 py-1 text-[11.5px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[var(--todo-accent-dark)] text-white shadow-xs'
                      : 'border-[var(--todo-card-border)] bg-[var(--todo-surface)] text-[var(--todo-text-muted)] hover:border-[var(--todo-accent)]'
                  }`}
                >
                  {b.title}
                </button>
              );
            })}
          </div>

          {/* Written Input + Transcribe-only Mic */}
          {!isRecording ? (
            <form onSubmit={handleAddWrittenTodo} className="flex flex-col sm:flex-row gap-1.5">
              <input
                ref={textInputRef}
                type="text"
                value={composerText}
                onChange={(e) => {
                  setComposerText(e.target.value);
                  if (composerError) setComposerError(null);
                }}
                placeholder={`Scrivi per «${TODO_BLOCK_MAP[composerBlock].title}»...`}
                className="flex-1 min-h-[36px] rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] px-3 py-1 text-xs text-[var(--todo-text)] placeholder:text-[var(--todo-text-muted)] placeholder:opacity-70 focus:border-[var(--todo-accent)] focus:bg-[var(--todo-card)] focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={isTranscribing}
                  onClick={async () => {
                    clearMicError();
                    setComposerError(null);
                    await startRecording();
                  }}
                  aria-label="Registra e trascrivi nota"
                  className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)] disabled:opacity-50 transition-colors"
                >
                  {isTranscribing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
                  )}
                  <span>{isTranscribing ? 'Trascrivo...' : 'Voce'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isTranscribing}
                  style={{
                    background:
                      'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
                  }}
                  className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-xl px-3.5 py-1 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  <span>Aggiungi</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-[var(--todo-accent)] bg-slate-900 text-white p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-200">
                  Trascrizione per «{TODO_BLOCK_MAP[composerBlock].title}»
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
                    className="flex-1 rounded-full bg-emerald-400/90 transition-all duration-75"
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStopAndSaveVoiceTodo}
                  className="flex-1 min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                >
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                  Trascrivi e aggiungi
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="min-h-[34px] rounded-lg border border-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {(composerError || micError) && (
            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">{composerError || micError}</p>
          )}
        </section>
      ),
    },
    {
      id: 'todo_poi',
      render: () => renderTodoBlockCard('poi'),
    },
    {
      id: 'todo_svaghi',
      render: () => renderTodoBlockCard('svaghi'),
    },
    {
      id: 'todo_bollette',
      render: () => renderTodoBlockCard('bollette'),
    },
    {
      id: 'todo_poi_poi',
      render: () => renderTodoBlockCard('poi_poi'),
    },
  ];

  return (
    <div className="space-y-3">
      <CustomizableSectionStack
        section="todo_list"
        layout={sectionLayout}
        blocks={blocks}
        onChangeLayout={onChangeLayout}
        onResetSection={onResetLayout}
        accentTheme="aqua"
        className="space-y-2.5"
      />

      {/* Compact Modal: Note Action + Reminder + Google Calendar */}
      {selectedTodo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="todo-detail-title"
          onClick={() => setSelectedTodoId(null)}
        >
          <div
            className="w-full max-w-[330px] max-h-[90dvh] overflow-y-auto rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowModalCatPicker((v) => !v)}
                className="flex items-center gap-1.5 min-w-0 rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-surface)] px-2 py-1 hover:border-[var(--todo-accent)] transition-colors"
                title="Cambia emoticon gatto companion"
              >
                <CatEmoticonIcon
                  emoticonId={selectedTodo.emoji}
                  text={selectedTodo.text}
                  blockHint={selectedTodo.block}
                  variant="fullFace"
                  sizeClass="h-5 w-5"
                />
                <h3 id="todo-detail-title" className="text-xs font-bold text-[var(--todo-text)] leading-tight">
                  {TODO_BLOCK_MAP[selectedTodo.block].title}
                </h3>
                <span className="text-[10px] font-semibold text-[var(--todo-accent)] shrink-0">
                  Cambia
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTodoId(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-card-border)] text-[var(--todo-text-muted)] hover:bg-[var(--todo-accent-soft)] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {showModalCatPicker && (
              <CatEmoticonPicker
                value={resolveCatEmoticonId(selectedTodo.emoji, selectedTodo.text, selectedTodo.block)}
                variant="fullFace"
                onSelect={(catId) => {
                  onUpdateTodo(selectedTodo.id, {
                    emoji: catId,
                    updatedAt: new Date().toISOString(),
                  });
                  setShowModalCatPicker(false);
                  onNotify(`Emoticon «${CAT_EMOTICON_MAP[catId].label}» applicata`);
                }}
              />
            )}

            {/* Edit Text (Salva updates text + reminder and auto-closes) */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={modalTextDraft}
                onChange={(e) => setModalTextDraft(e.target.value)}
                className="flex-1 min-h-[34px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-surface)] px-2.5 py-1 text-xs text-[var(--todo-text)] focus:border-[var(--todo-accent)] focus:bg-[var(--todo-card)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const clean = modalTextDraft.trim();
                  if (!clean) return;
                  onUpdateTodo(selectedTodo.id, {
                    text: clean,
                    reminderDate: modalRemDate || undefined,
                    reminderTime: modalRemTime || undefined,
                    updatedAt: new Date().toISOString(),
                  });
                  setSelectedTodoId(null);
                  onNotify('Nota aggiornata');
                }}
                className="min-h-[34px] rounded-lg bg-[var(--todo-accent-dark)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 shrink-0"
              >
                Salva
              </button>
            </div>

            {/* Reminder Date & Time + Google Calendar Event */}
            <div className="rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--todo-text)]">
                  <Calendar className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
                  Promemoria e Calendario
                </span>
                {(modalRemDate || modalRemTime) && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalRemDate('');
                      setModalRemTime('');
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
                  value={modalRemDate}
                  onChange={(e) => setModalRemDate(e.target.value)}
                  aria-label="Data promemoria"
                  className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 py-1 text-[var(--todo-text)]"
                />
                <input
                  type="time"
                  value={modalRemTime}
                  onChange={(e) => setModalRemTime(e.target.value)}
                  aria-label="Ora promemoria"
                  className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 py-1 text-[var(--todo-text)]"
                />
              </div>
              {modalRemDate && modalRemTime && (
                <a
                  href={buildGoogleCalendarUrl({
                    title: modalTextDraft.trim() || selectedTodo.text,
                    details: `${TODO_BLOCK_MAP[selectedTodo.block].title}: ${modalTextDraft.trim() || selectedTodo.text}`,
                    date: modalRemDate,
                    time: modalRemTime,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const clean = modalTextDraft.trim();
                    if (clean) {
                      onUpdateTodo(selectedTodo.id, {
                        text: clean,
                        reminderDate: modalRemDate,
                        reminderTime: modalRemTime,
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

            {/* Order & Move Block */}
            <div className="rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] p-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onMoveTodoStep(selectedTodo.id, -1)}
                  className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 text-[11px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]"
                >
                  <ArrowUp className="h-3 w-3" /> Su
                </button>
                <button
                  type="button"
                  onClick={() => onMoveTodoStep(selectedTodo.id, 1)}
                  className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 text-[11px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]"
                >
                  <ArrowDown className="h-3 w-3" /> Giù
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {TODO_BLOCKS.map((b) => {
                  const isCurrent = selectedTodo.block === b.key;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        onMoveOrReorderTodo(selectedTodo.id, b.key, null);
                        onNotify(`Spostata in «${b.title}»`);
                      }}
                      className={`flex-auto min-h-[28px] rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap transition-colors ${
                        isCurrent
                          ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-dark)] text-white'
                          : 'border-[var(--todo-card-border)] bg-[var(--todo-card)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]'
                      }`}
                    >
                      {b.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add / Move to Organizza */}
            <div className="rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-accent-soft)] p-2 space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--todo-text)]">
                <CalendarPlus className="h-3.5 w-3.5 text-[var(--todo-accent)]" aria-hidden="true" />
                <span>Invia in Organizza</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <input
                  type="date"
                  value={modalOrgDate}
                  onChange={(e) => setModalOrgDate(e.target.value)}
                  className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 py-1 text-[var(--todo-text)]"
                />
                <select
                  value={modalOrgPhase}
                  onChange={(e) => setModalOrgPhase(e.target.value as DayPhaseKey)}
                  className="block w-full max-w-full min-w-0 min-h-[32px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 py-1 text-[var(--todo-text)]"
                >
                  {DAY_PHASES.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSendTodoToOrganize(selectedTodo, modalOrgDate, modalOrgPhase, false);
                    setSelectedTodoId(null);
                  }}
                  className="min-h-[32px] rounded-lg bg-[var(--todo-accent-dark)] px-2 py-1 text-[10.5px] font-semibold text-white hover:opacity-90"
                >
                  Copia lì
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSendTodoToOrganize(selectedTodo, modalOrgDate, modalOrgPhase, true);
                    setSelectedTodoId(null);
                  }}
                  className="min-h-[32px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-2 py-1 text-[10.5px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-surface)]"
                >
                  Sposta lì
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const idToDel = selectedTodo.id;
                  setSelectedTodoId(null);
                  onDeleteTodo(idToDel);
                  onNotify('Nota eliminata');
                }}
                className="min-h-[32px] inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-200 hover:bg-rose-100"
              >
                <Trash2 className="h-3 w-3" /> Elimina
              </button>
              <button
                type="button"
                onClick={() => setSelectedTodoId(null)}
                className="min-h-[32px] rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-card)] px-3 py-1 text-[11px] font-semibold text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Modal: Batch Paste from Clipboard (1 line = 1 note, preserves multi-activities on one line) */}
      {pasteBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-paste-title"
          onClick={() => !isParsingBatch && setPasteBlock(null)}
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
            className="w-full max-w-[320px] rounded-2xl bg-[var(--todo-card)] border border-[var(--todo-card-border)] p-3.5 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id="batch-paste-title" className="text-xs font-bold text-[var(--todo-text)] truncate">
                Incolla note · {TODO_BLOCK_MAP[pasteBlock].title}
              </h3>
              <button
                type="button"
                disabled={isParsingBatch}
                onClick={() => setPasteBlock(null)}
                aria-label="Chiudi"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--todo-card-border)] text-[var(--todo-text-muted)] hover:bg-[var(--todo-accent-soft)] shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              disabled={isParsingBatch}
              onClick={handlePasteFromClipboard}
              className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--todo-card-border)] bg-[var(--todo-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--todo-text)] hover:opacity-90 disabled:opacity-50"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Incolla dagli appunti</span>
            </button>

            <form onSubmit={handleSubmitBatchPaste} className="space-y-2">
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
                className="w-full rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] p-2 text-[var(--todo-text)] placeholder:text-[var(--todo-text-muted)] placeholder:opacity-70 focus:border-[var(--todo-accent)] focus:bg-[var(--todo-card)] focus:outline-none"
              />

              {pasteError && (
                <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">{pasteError}</p>
              )}

              <button
                type="submit"
                disabled={isParsingBatch || !pasteRawText.trim()}
                style={{
                  background:
                    'linear-gradient(to bottom, var(--todo-accent), var(--todo-accent-dark))',
                }}
                className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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

      {/* Floating Drag Guidance Pill */}
      {draggedTodoId && (
        <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-full bg-[var(--todo-accent-dark)] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg border border-[var(--todo-card-border)] whitespace-nowrap max-w-[92vw] truncate">
          {dragMergeTargetId
            ? `Rilascia per unire con «${todoItems.find((t) => t.id === dragMergeTargetId)?.text || 'nota'}»`
            : dragInsertBeforeId || dragInsertEndBlock
              ? 'Rilascia per spostare qui'
              : dragOverBlock
                ? `Rilascia in «${TODO_BLOCK_MAP[dragOverBlock].title}»`
                : 'Trascina su una nota per unirla, o tra le righe per spostarla'}
        </div>
      )}
    </div>
  );
};
