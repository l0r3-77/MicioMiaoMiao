import type { AudioMetadata, NoteColor } from './note';

export type TodoBlockKey = 'poi' | 'svaghi' | 'bollette' | 'poi_poi';
export type DayPhaseKey = 'mattina' | 'dopopranzo' | 'pomeriggio' | 'dopocena';

export type TaskHighlightColor = 'none' | NoteColor;

export interface TodoNoteItem {
  id: string;
  block: TodoBlockKey;
  text: string;
  emoji?: string;
  color: TaskHighlightColor;
  done: boolean;
  order: number;
  source: 'voice' | 'text';
  audioMetadata?: AudioMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizeNoteItem {
  id: string;
  date: string; // YYYY-MM-DD
  phase: DayPhaseKey;
  text: string;
  emoji?: string;
  color: TaskHighlightColor;
  done: boolean;
  order: number;
  source: 'voice' | 'text';
  audioMetadata?: AudioMetadata;
  linkedTodoId?: string;
  createdAt: string;
  updatedAt: string;
}

export type WidgetSourceKey = 'today' | TodoBlockKey;
export type WidgetSizePreset = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  token: string;
  source: WidgetSourceKey;
  size: WidgetSizePreset;
  customHeightPx: number;
  customWidthPct: number;
}
