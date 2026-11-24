export type NoteColor =
  | 'celeste'
  | 'sky'
  | 'amber'
  | 'light_red'
  | 'red'
  | 'anthracite';

export type AgendaViewMode = 'day' | 'week' | 'month';

export interface AudioMetadata {
  recordedAt: string;
  durationSeconds: number;
  mimeType: string;
  sizeBytes: number;
  hasAudioClip: boolean;
}

export interface NoteEntry {
  id: string;
  time: string; // HH:MM
  transcript: string;
  bullets: string[]; // Sintesi automatica su stati d'animo, stress, focus e sensazioni
  reminders?: string[]; // Frasi estratte automaticamente con cose fondamentali da ricordare
  color: NoteColor; // Colore evidenziatore (assegnato automaticamente dall'AI o modificato manualmente)
  source: 'voice' | 'text';
  audioMetadata?: AudioMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface DailyNote {
  id: string;
  date: string; // YYYY-MM-DD (nota unica per giornata)
  title: string;
  pinned: boolean;
  dailySummaryBullets: string[];
  entries: NoteEntry[];
  createdAt: string;
  updatedAt: string;
}
