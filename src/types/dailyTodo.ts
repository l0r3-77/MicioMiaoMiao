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
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:MM
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
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:MM
  createdAt: string;
  updatedAt: string;
}

