import React, { useRef, useState } from 'react';
import { ListChecks } from 'lucide-react';
import type {
  DayPhaseKey,
  OrganizeNoteItem,
  TodoBlockKey,
  TodoNoteItem,
} from '../types/dailyTodo';
import type { DailyNote } from '../types/note';
import { DAY_PHASE_MAP } from '../utils/dailyTodoStorage';
import { resolveCatEmoticonId } from '../utils/catEmoticonLibrary';
import { formatItalianDateShort } from '../utils/dateUtils';
import type { LayoutSectionKey, SectionLayoutState } from '../utils/layoutPreferences';
import { DaFareSubsection } from './DaFareSubsection';
import { OrganizzaSubsection } from './OrganizzaSubsection';

export type TodoSubTab = 'da_fare' | 'organizza';

export interface DuplicateSourcePayload {
  text: string;
  emoji?: string;
  done: boolean;
  source: 'voice' | 'text';
  reminderDate?: string;
  reminderTime?: string;
  blockHint?: TodoBlockKey;
}

const MAX_UNDO_HISTORY = 30;

interface DailyTodoSectionProps {
  subTab: TodoSubTab;
  focusTodaySignal?: number;
  dailyNotes?: DailyNote[];
  todoItems: TodoNoteItem[];
  organizeItems: OrganizeNoteItem[];
  todoLayout: SectionLayoutState;
  organizeLayout: SectionLayoutState;
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetLayout: (section: LayoutSectionKey) => void;
  onSetTodoItems: React.Dispatch<React.SetStateAction<TodoNoteItem[]>>;
  onSetOrganizeItems: React.Dispatch<React.SetStateAction<OrganizeNoteItem[]>>;
  onNotify: (msg: string) => void;
}

export const DailyTodoSection: React.FC<DailyTodoSectionProps> = ({
  subTab,
  focusTodaySignal,
  dailyNotes = [],
  todoItems,
  organizeItems,
  todoLayout,
  organizeLayout,
  onChangeLayout,
  onResetLayout,
  onSetTodoItems,
  onSetOrganizeItems,
  onNotify,
}) => {
  const [todoUndoStack, setTodoUndoStack] = useState<TodoNoteItem[][]>([]);
  const [organizeUndoStack, setOrganizeUndoStack] = useState<OrganizeNoteItem[][]>([]);

  const todoItemsRef = useRef(todoItems);
  todoItemsRef.current = todoItems;
  const organizeItemsRef = useRef(organizeItems);
  organizeItemsRef.current = organizeItems;

  const pushTodoUndo = () => {
    const snapshot = todoItemsRef.current;
    setTodoUndoStack((prev) => [...prev.slice(-(MAX_UNDO_HISTORY - 1)), snapshot]);
  };

  const pushOrganizeUndo = () => {
    const snapshot = organizeItemsRef.current;
    setOrganizeUndoStack((prev) => [...prev.slice(-(MAX_UNDO_HISTORY - 1)), snapshot]);
  };

  const handleUndoTodo = () => {
    if (todoUndoStack.length === 0) return;
    const previous = todoUndoStack[todoUndoStack.length - 1];
    setTodoUndoStack((prev) => prev.slice(0, -1));
    onSetTodoItems(previous);
    onNotify('Ultima azione annullata in «Da Fare»');
  };

  const handleUndoOrganize = () => {
    if (organizeUndoStack.length === 0) return;
    const previous = organizeUndoStack[organizeUndoStack.length - 1];
    setOrganizeUndoStack((prev) => prev.slice(0, -1));
    onSetOrganizeItems(previous);
    onNotify('Ultima azione annullata in «Organizza»');
  };

  const handleAddTodo = (item: TodoNoteItem) => {
    pushTodoUndo();
    onSetTodoItems((prev) => [...prev, item]);
  };

  const handleAddManyTodos = (items: TodoNoteItem[]) => {
    if (items.length === 0) return;
    pushTodoUndo();
    onSetTodoItems((prev) => [...prev, ...items]);
  };

  const handleUpdateTodo = (id: string, patch: Partial<TodoNoteItem>) => {
    pushTodoUndo();
    onSetTodoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleDeleteTodo = (id: string) => {
    pushTodoUndo();
    onSetTodoItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveOrReorderTodo = (
    draggedId: string,
    targetBlock: TodoBlockKey,
    targetItemId?: string | null
  ) => {
    if (targetItemId === draggedId) return;
    pushTodoUndo();
    onSetTodoItems((prev) => {
      const dragged = prev.find((i) => i.id === draggedId);
      if (!dragged) return prev;

      const nowIso = new Date().toISOString();
      const withoutDragged = prev.filter((i) => i.id !== draggedId);
      const targetList = withoutDragged
        .filter((i) => i.block === targetBlock)
        .sort((a, b) => a.order - b.order);

      let insertIdx = targetList.length;
      if (targetItemId) {
        const foundIdx = targetList.findIndex((i) => i.id === targetItemId);
        if (foundIdx >= 0) insertIdx = foundIdx;
      }

      const updatedDragged: TodoNoteItem = {
        ...dragged,
        block: targetBlock,
        updatedAt: nowIso,
      };
      const nextTargetList = [...targetList];
      nextTargetList.splice(insertIdx, 0, updatedDragged);

      const reindexedTarget = nextTargetList.map((item, idx) => ({
        ...item,
        order: idx,
      }));

      const otherItems = withoutDragged.filter((i) => i.block !== targetBlock);
      if (dragged.block !== targetBlock) {
        const srcList = otherItems
          .filter((i) => i.block === dragged.block)
          .sort((a, b) => a.order - b.order)
          .map((item, idx) => ({ ...item, order: idx }));
        const remaining = otherItems.filter((i) => i.block !== dragged.block);
        return [...remaining, ...srcList, ...reindexedTarget];
      }

      return [...otherItems, ...reindexedTarget];
    });
  };

  const handleMergeTodos = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    pushTodoUndo();
    const nowIso = new Date().toISOString();
    onSetTodoItems((prev) => {
      const source = prev.find((i) => i.id === sourceId);
      const target = prev.find((i) => i.id === targetId);
      if (!source || !target) return prev;

      const sText = source.text.trim();
      const tText = target.text.trim();
      const mergedText =
        !sText || tText.toLowerCase() === sText.toLowerCase()
          ? tText || sText
          : `${tText} · ${sText}`;

      const withoutSource = prev
        .filter((i) => i.id !== sourceId)
        .map((i) =>
          i.id === targetId
            ? {
                ...i,
                text: mergedText,
                done: i.done && source.done,
                updatedAt: nowIso,
              }
            : i
        );

      const affectedBlocks = new Set<TodoBlockKey>([source.block, target.block]);
      const untouched = withoutSource.filter((i) => !affectedBlocks.has(i.block));
      const reindexed: TodoNoteItem[] = [];
      for (const blk of affectedBlocks) {
        const list = withoutSource
          .filter((i) => i.block === blk)
          .sort((a, b) => a.order - b.order)
          .map((item, idx) => ({ ...item, order: idx }));
        reindexed.push(...list);
      }
      return [...untouched, ...reindexed];
    });
    onNotify('Note unite in «Da Fare»');
  };

  const handleMoveTodoStep = (id: string, delta: -1 | 1) => {
    pushTodoUndo();
    onSetTodoItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (!target) return prev;
      const blockList = prev
        .filter((i) => i.block === target.block)
        .sort((a, b) => a.order - b.order);
      const idx = blockList.findIndex((i) => i.id === id);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= blockList.length) return prev;

      const swapped = [...blockList];
      const [moved] = swapped.splice(idx, 1);
      swapped.splice(nextIdx, 0, moved);
      const reindexed = swapped.map((item, i) => ({
        ...item,
        order: i,
        updatedAt: new Date().toISOString(),
      }));
      return [...prev.filter((i) => i.block !== target.block), ...reindexed];
    });
  };

  const handleAddOrganizeItem = (item: OrganizeNoteItem) => {
    pushOrganizeUndo();
    onSetOrganizeItems((prev) => [...prev, item]);
  };

  const handleAddManyOrganizeItems = (items: OrganizeNoteItem[]) => {
    if (items.length === 0) return;
    pushOrganizeUndo();
    onSetOrganizeItems((prev) => [...prev, ...items]);
  };

  const handleUpdateOrganizeItem = (id: string, patch: Partial<OrganizeNoteItem>) => {
    pushOrganizeUndo();
    onSetOrganizeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleDeleteOrganizeItem = (id: string) => {
    pushOrganizeUndo();
    onSetOrganizeItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveOrReorderOrganizeItem = (
    draggedId: string,
    targetDate: string,
    targetPhase: DayPhaseKey,
    targetItemId?: string | null
  ) => {
    if (targetItemId === draggedId) return;
    pushOrganizeUndo();
    onSetOrganizeItems((prev) => {
      const dragged = prev.find((i) => i.id === draggedId);
      if (!dragged) return prev;

      const nowIso = new Date().toISOString();
      const withoutDragged = prev.filter((i) => i.id !== draggedId);
      const slotList = withoutDragged
        .filter((i) => i.date === targetDate && i.phase === targetPhase)
        .sort((a, b) => a.order - b.order);

      let insertIdx = slotList.length;
      if (targetItemId) {
        const foundIdx = slotList.findIndex((i) => i.id === targetItemId);
        if (foundIdx >= 0) insertIdx = foundIdx;
      }

      const updatedDragged: OrganizeNoteItem = {
        ...dragged,
        date: targetDate,
        phase: targetPhase,
        updatedAt: nowIso,
      };
      const nextSlot = [...slotList];
      nextSlot.splice(insertIdx, 0, updatedDragged);
      const reindexedTarget = nextSlot.map((item, idx) => ({ ...item, order: idx }));

      const others = withoutDragged.filter(
        (i) => !(i.date === targetDate && i.phase === targetPhase)
      );
      return [...others, ...reindexedTarget];
    });
  };

  const handleMergeOrganizeItems = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    pushOrganizeUndo();
    const nowIso = new Date().toISOString();
    onSetOrganizeItems((prev) => {
      const source = prev.find((i) => i.id === sourceId);
      const target = prev.find((i) => i.id === targetId);
      if (!source || !target) return prev;

      const sText = source.text.trim();
      const tText = target.text.trim();
      const mergedText =
        !sText || tText.toLowerCase() === sText.toLowerCase()
          ? tText || sText
          : `${tText} · ${sText}`;

      const keepReminder =
        target.reminderDate && target.reminderTime
          ? { reminderDate: target.reminderDate, reminderTime: target.reminderTime }
          : source.reminderDate && source.reminderTime
            ? { reminderDate: source.reminderDate, reminderTime: source.reminderTime }
            : {};

      const withoutSource = prev
        .filter((i) => i.id !== sourceId)
        .map((i) =>
          i.id === targetId
            ? {
                ...i,
                text: mergedText,
                done: i.done && source.done,
                ...keepReminder,
                updatedAt: nowIso,
              }
            : i
        );

      const affectedKeys = new Set([
        `${source.date}|${source.phase}`,
        `${target.date}|${target.phase}`,
      ]);
      const untouched = withoutSource.filter(
        (i) => !affectedKeys.has(`${i.date}|${i.phase}`)
      );
      const reindexed: OrganizeNoteItem[] = [];
      for (const key of affectedKeys) {
        const [d, p] = key.split('|');
        const list = withoutSource
          .filter((i) => i.date === d && i.phase === p)
          .sort((a, b) => a.order - b.order)
          .map((item, idx) => ({ ...item, order: idx }));
        reindexed.push(...list);
      }
      return [...untouched, ...reindexed];
    });
    onNotify('Note unite in «Organizza»');
  };

  const handleMoveOrganizeStep = (id: string, delta: -1 | 1) => {
    pushOrganizeUndo();
    onSetOrganizeItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (!target) return prev;
      const slotList = prev
        .filter((i) => i.date === target.date && i.phase === target.phase)
        .sort((a, b) => a.order - b.order);
      const idx = slotList.findIndex((i) => i.id === id);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= slotList.length) return prev;

      const swapped = [...slotList];
      const [moved] = swapped.splice(idx, 1);
      swapped.splice(nextIdx, 0, moved);
      const reindexed = swapped.map((item, i) => ({
        ...item,
        order: i,
        updatedAt: new Date().toISOString(),
      }));
      return [
        ...prev.filter((i) => !(i.date === target.date && i.phase === target.phase)),
        ...reindexed,
      ];
    });
  };

  const handleSendTodoToOrganize = (
    todo: TodoNoteItem,
    date: string,
    phase: DayPhaseKey,
    removeFromTodo: boolean
  ) => {
    pushOrganizeUndo();
    const newOrgId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    onSetOrganizeItems((prev) => {
      const existing = prev.filter((i) => i.date === date && i.phase === phase);
      const maxOrder =
        existing.length > 0 ? Math.max(...existing.map((i) => i.order)) + 1 : 0;
      const created: OrganizeNoteItem = {
        id: newOrgId,
        date,
        phase,
        text: todo.text,
        emoji: resolveCatEmoticonId(todo.emoji, todo.text, todo.block),
        color: 'none',
        done: false,
        order: maxOrder,
        source: todo.source,
        linkedTodoId: removeFromTodo ? undefined : todo.id,
        ...(todo.reminderDate ? { reminderDate: todo.reminderDate } : {}),
        ...(todo.reminderTime ? { reminderTime: todo.reminderTime } : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      return [...prev, created];
    });

    if (removeFromTodo) {
      pushTodoUndo();
      onSetTodoItems((prev) => prev.filter((t) => t.id !== todo.id));
    }

    onNotify(
      `${removeFromTodo ? 'Spostata' : 'Aggiunta'} in Organizza (${formatItalianDateShort(
        date
      )} · ${DAY_PHASE_MAP[phase].title})`
    );
  };

  const handleDuplicateToOrganize = (
    sourceNote: DuplicateSourcePayload,
    date: string,
    phase: DayPhaseKey
  ) => {
    pushOrganizeUndo();
    const nowIso = new Date().toISOString();
    onSetOrganizeItems((prev) => {
      const existing = prev.filter((i) => i.date === date && i.phase === phase);
      const maxOrder =
        existing.length > 0 ? Math.max(...existing.map((i) => i.order)) + 1 : 0;
      const duplicateItem: OrganizeNoteItem = {
        id: crypto.randomUUID(),
        date,
        phase,
        text: sourceNote.text,
        emoji: resolveCatEmoticonId(
          sourceNote.emoji,
          sourceNote.text,
          sourceNote.blockHint
        ),
        color: 'none',
        done: sourceNote.done,
        order: maxOrder,
        source: sourceNote.source,
        ...(sourceNote.reminderDate ? { reminderDate: sourceNote.reminderDate } : {}),
        ...(sourceNote.reminderTime ? { reminderTime: sourceNote.reminderTime } : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      return [...prev, duplicateItem];
    });
    onNotify(
      `Nota duplicata in ${formatItalianDateShort(date)} · ${DAY_PHASE_MAP[phase].title}`
    );
  };

  return (
    <div
      style={{
        background:
          'linear-gradient(135deg, var(--todo-shell-from), var(--todo-shell-via), var(--todo-shell-to))',
      }}
      className="rounded-[26px] border border-[var(--todo-shell-border)] p-3 sm:p-4 space-y-3 shadow-sm"
    >
      {/* Compact Section Title Bar (full-width readable title) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div
            style={{
              background: 'linear-gradient(135deg, var(--todo-accent), var(--todo-accent-dark))',
            }}
            className="h-7 w-7 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[var(--todo-text)] truncate">
            Da fare giornaliero ·{' '}
            <span className="text-[var(--todo-text-muted)]">
              {subTab === 'da_fare' ? 'Da Fare' : 'Organizza'}
            </span>
          </h2>
        </div>
      </div>

      {subTab === 'da_fare' ? (
        <DaFareSubsection
          todoItems={todoItems}
          sectionLayout={todoLayout}
          canUndo={todoUndoStack.length > 0}
          onUndo={handleUndoTodo}
          onChangeLayout={onChangeLayout}
          onResetLayout={onResetLayout}
          onAddTodo={handleAddTodo}
          onAddManyTodos={handleAddManyTodos}
          onUpdateTodo={handleUpdateTodo}
          onDeleteTodo={handleDeleteTodo}
          onMoveOrReorderTodo={handleMoveOrReorderTodo}
          onMergeTodos={handleMergeTodos}
          onMoveTodoStep={handleMoveTodoStep}
          onSendTodoToOrganize={handleSendTodoToOrganize}
          onDuplicateTodoToOrganize={handleDuplicateToOrganize}
          onNotify={onNotify}
        />
      ) : (
        <OrganizzaSubsection
          focusTodaySignal={focusTodaySignal}
          dailyNotes={dailyNotes}
          todoItems={todoItems}
          organizeItems={organizeItems}
          sectionLayout={organizeLayout}
          canUndo={organizeUndoStack.length > 0}
          onUndo={handleUndoOrganize}
          onChangeLayout={onChangeLayout}
          onResetLayout={onResetLayout}
          onAddOrganizeItem={handleAddOrganizeItem}
          onAddManyOrganizeItems={handleAddManyOrganizeItems}
          onUpdateOrganizeItem={handleUpdateOrganizeItem}
          onDeleteOrganizeItem={handleDeleteOrganizeItem}
          onMoveOrReorderOrganizeItem={handleMoveOrReorderOrganizeItem}
          onMergeOrganizeItems={handleMergeOrganizeItems}
          onMoveOrganizeStep={handleMoveOrganizeStep}
          onPickTodoForOrganize={handleSendTodoToOrganize}
          onDuplicateOrganizeItem={handleDuplicateToOrganize}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};


