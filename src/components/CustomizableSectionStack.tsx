import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  SECTION_BLOCKS,
  type LayoutSectionKey,
  type SectionLayoutState,
} from '../utils/layoutPreferences';

export interface CustomizableBlockItem {
  id: string;
  render: () => React.ReactNode;
}

interface CustomizableSectionStackProps {
  section: LayoutSectionKey;
  layout: SectionLayoutState;
  blocks: CustomizableBlockItem[];
  onChangeLayout: (section: LayoutSectionKey, next: SectionLayoutState) => void;
  onResetSection: (section: LayoutSectionKey) => void;
  compactToolbar?: boolean;
  accentTheme?: 'purple' | 'teal' | 'slate' | 'aqua';
  className?: string;
}

export const CustomizableSectionStack: React.FC<CustomizableSectionStackProps> = ({
  section,
  layout,
  blocks,
  onChangeLayout,
  onResetSection,
  compactToolbar = false,
  accentTheme = 'purple',
  className = 'space-y-4',
}) => {
  const isTeal = accentTheme === 'teal';
  const isSlate = accentTheme === 'slate';
  const isAqua = accentTheme === 'aqua';
  const isAltTheme = isTeal || isSlate || isAqua;
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const defs = SECTION_BLOCKS[section];
  const blockMap = new Map(blocks.map((b) => [b.id, b]));
  const defLabelMap = new Map(defs.map((d) => [d.id, d.label]));

  const orderedIds = layout.order.filter((id) => blockMap.has(id));
  for (const b of blocks) {
    if (!orderedIds.includes(b.id)) orderedIds.push(b.id);
  }

  const moveBlock = (id: string, delta: -1 | 1) => {
    const idx = orderedIds.indexOf(id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= orderedIds.length) return;
    const nextOrder = [...orderedIds];
    const [item] = nextOrder.splice(idx, 1);
    nextOrder.splice(targetIdx, 0, item);
    onChangeLayout(section, { ...layout, order: nextOrder });
  };

  const reorderByDrop = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const fromIdx = orderedIds.indexOf(sourceId);
    const toIdx = orderedIds.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const nextOrder = [...orderedIds];
    const [moved] = nextOrder.splice(fromIdx, 1);
    nextOrder.splice(toIdx, 0, moved);
    onChangeLayout(section, { ...layout, order: nextOrder });
  };

  const toggleVisibility = (id: string) => {
    const isHidden = layout.hidden.includes(id);
    if (isHidden) {
      onChangeLayout(section, {
        ...layout,
        hidden: layout.hidden.filter((h) => h !== id),
      });
    } else {
      const visibleCount = orderedIds.filter((oid) => !layout.hidden.includes(oid)).length;
      if (visibleCount <= 1) return; // keep at least one block visible
      onChangeLayout(section, {
        ...layout,
        hidden: [...layout.hidden, id],
      });
    }
  };

  const isModified =
    layout.hidden.length > 0 ||
    orderedIds.some((id, i) => defs[i]?.id !== id);

  return (
    <div className={`min-w-0 ${className}`}>
      {/* Compact Section Block Customizer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsCustomizing((v) => !v)}
          aria-expanded={isCustomizing}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            isCustomizing
              ? isAqua
                ? 'border-[#0B5B53] bg-[#0B5B53] text-white'
                : isSlate
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : isTeal
                    ? 'border-teal-900 bg-teal-900 text-white'
                    : 'border-stone-900 bg-stone-900 text-white'
              : isAqua
                ? 'border-[#7ECBBF] bg-[#F7FEFC]/95 text-[#083B37] hover:border-[#0E8A7E] hover:bg-[#D8F4EE]/75'
                : isSlate
                  ? 'border-slate-300 bg-white/95 text-slate-800 hover:border-blue-400 hover:bg-blue-50/60'
                  : isTeal
                    ? 'border-teal-300/90 bg-white/95 text-teal-900 hover:border-teal-500 hover:bg-teal-50/70'
                    : 'border-stone-200/90 bg-white/90 text-stone-700 hover:border-purple-300 hover:bg-purple-50/50'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isCustomizing ? 'Fine personalizzazione' : 'Personalizza blocchi'}</span>
        </button>

        {(isCustomizing || isModified) && !compactToolbar && (
          <button
            type="button"
            onClick={() => onResetSection(section)}
            className={`inline-flex items-center gap-1 rounded-xl border bg-[#F7FEFC] px-2.5 py-1.5 text-[11px] font-medium hover:bg-stone-50 whitespace-nowrap ${
              isAqua
                ? 'border-[#7ECBBF] text-[#083B37]'
                : isSlate
                  ? 'border-slate-300 text-slate-800'
                  : isTeal
                    ? 'border-teal-200 text-teal-900'
                    : 'border-stone-200 text-stone-600'
            }`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Ripristina ordine
          </button>
        )}
      </div>

      {/* Visibility & Quick Order Drawer when Customizing */}
      {isCustomizing && (
        <div
          className={`rounded-2xl border p-3 space-y-2 ${
            isAqua
              ? 'border-[#7ECBBF] bg-[#DCF6F0]/90'
              : isSlate
                ? 'border-slate-300 bg-slate-100/90'
                : isTeal
                  ? 'border-teal-300/90 bg-teal-100/55'
                  : 'border-purple-200/90 bg-purple-50/45'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-stone-800">
              Trascina i blocchi qui sotto oppure usa le frecce e l’occhio per mostrare o nascondere
            </p>
            {compactToolbar && (
              <button
                type="button"
                onClick={() => onResetSection(section)}
                className={`text-[11px] font-semibold hover:underline whitespace-nowrap ${
                  isAqua
                    ? 'text-[#0F766E]'
                    : isSlate
                      ? 'text-blue-800'
                      : isTeal
                        ? 'text-teal-800'
                        : 'text-purple-700'
                }`}
              >
                Ripristina
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {orderedIds.map((id) => {
              const hidden = layout.hidden.includes(id);
              const label = defLabelMap.get(id) || id;
              return (
                <button
                  key={`toggle-${id}`}
                  type="button"
                  onClick={() => toggleVisibility(id)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                    hidden
                      ? 'border-stone-200 bg-white/60 text-stone-400 line-through'
                      : isAqua
                        ? 'border-[#74C4B6] bg-[#F7FEFC] text-[#083B37]'
                        : isSlate
                          ? 'border-blue-300 bg-white text-slate-900'
                          : isTeal
                            ? 'border-teal-400 bg-white text-teal-950'
                            : 'border-purple-300 bg-white text-stone-800'
                  }`}
                >
                  {hidden ? (
                    <EyeOff className="h-3 w-3 text-stone-400" aria-hidden="true" />
                  ) : (
                    <Eye
                      className={`h-3 w-3 ${
                        isAqua
                          ? 'text-[#0F766E]'
                          : isSlate
                            ? 'text-blue-700'
                            : isTeal
                              ? 'text-teal-700'
                              : 'text-purple-600'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Render Ordered Blocks */}
      {orderedIds.map((id, index) => {
        const isHidden = layout.hidden.includes(id);
        if (isHidden) return null;

        const block = blockMap.get(id);
        if (!block) return null;
        const label = defLabelMap.get(id) || id;
        const isDragged = draggedId === id;
        const isDropTarget = dragOverId === id && draggedId !== id;

        return (
          <div
            key={id}
            draggable={isCustomizing}
            onDragStart={(e) => {
              if (!isCustomizing) return;
              setDraggedId(id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', id);
            }}
            onDragOver={(e) => {
              if (!isCustomizing) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverId !== id) setDragOverId(id);
            }}
            onDragLeave={() => {
              if (dragOverId === id) setDragOverId(null);
            }}
            onDrop={(e) => {
              if (!isCustomizing) return;
              e.preventDefault();
              const source = draggedId || e.dataTransfer.getData('text/plain');
              reorderByDrop(source, id);
              setDraggedId(null);
              setDragOverId(null);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
            className={`min-w-0 transition-all ${
              isCustomizing
                ? isAqua
                  ? 'rounded-2xl ring-2 ring-dashed ring-[#0E8A7E]/80 p-1.5 bg-[#DCF6F0]/60'
                  : isSlate
                    ? 'rounded-2xl ring-2 ring-dashed ring-blue-400/80 p-1.5 bg-slate-100/60'
                    : isTeal
                      ? 'rounded-2xl ring-2 ring-dashed ring-teal-400/85 p-1.5 bg-teal-50/35'
                      : 'rounded-2xl ring-2 ring-dashed ring-purple-300/80 p-1.5 bg-purple-50/20'
                : ''
            } ${isDragged ? 'opacity-50' : ''} ${
              isDropTarget
                ? isAqua
                  ? 'ring-[#0B5B53] bg-[#B4ECE0]/55 scale-[0.99]'
                  : isSlate
                    ? 'ring-blue-700 bg-blue-100/50 scale-[0.99]'
                    : isTeal
                      ? 'ring-teal-700 bg-teal-100/50 scale-[0.99]'
                      : 'ring-purple-600 bg-purple-100/40 scale-[0.99]'
                : ''
            }`}
          >
            {isCustomizing && (
              <div className="mb-1.5 flex items-center justify-between gap-2 px-1.5 py-0.5 text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold text-stone-700 cursor-grab active:cursor-grabbing min-w-0">
                  <GripVertical
                    className={`h-4 w-4 shrink-0 ${
                      isAqua
                        ? 'text-[#0F766E]'
                        : isSlate
                          ? 'text-blue-700'
                          : isAltTheme
                            ? 'text-teal-700'
                            : 'text-purple-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveBlock(id, -1)}
                    aria-label={`Sposta su ${label}`}
                    className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-35"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === orderedIds.length - 1}
                    onClick={() => moveBlock(id, 1)}
                    aria-label={`Sposta giù ${label}`}
                    className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-35"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(id)}
                    aria-label={`Nascondi ${label}`}
                    className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {block.render()}
          </div>
        );
      })}
    </div>
  );
};
