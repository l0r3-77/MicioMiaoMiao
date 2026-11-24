import type { DailyNote, NoteColor, NoteEntry } from '../types/note';

/**
 * Regex patterns matching Italian action/reminder/intention phrases in spoken or written notes:
 * e.g. "potrei fare...", "forse dovrei...", "mi sa che se faccio/dico/penso...",
 * "devo ricordarmi...", "sarebbe meglio se...", "bisogna che...", "magari...", etc.
 */
const REMINDER_TRIGGER_REGEX =
  /\b(potrei|forse\s+dovrei|forse\s+potrei|dovrei|mi\s+sa\s+che|se\s+(?:faccio|dico|penso|provo|chiedo|chiamo|scrivo|vado|aspetto|lascio|parlo)|devo\s+(?:fare|dire|ricordar|chiamar|scriver|mandar|inviar|parlar|comprar|prenotar|pagar|controllar|fissar|organizzar|finir|mandare)|ricordarmi|da\s+ricordare|non\s+(?:devo\s+)?dimenticar|sarebbe\s+(?:meglio|utile|opportuno|bene)|converrebbe|mi\s+conviene|bisogna\s+che|bisognerebbe|magari\s+(?:faccio|provo|chiamo|scrivo|prendo|cambio|proviamo)|appena\s+posso|la\s+prossima\s+volta|domani\s+(?:faccio|chiamo|scrivo|provo|devo|potrei)|proverò\s+a|devo\s+assolutamente|faccio\s+prima\s+a|meglio\s+se)\b/i;

export function splitItalianSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
}

export function extractRemindersLocally(text: string): string[] {
  const sentences = splitItalianSentences(text);
  const found: string[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    if (REMINDER_TRIGGER_REGEX.test(sentence)) {
      const normalized = sentence.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        found.push(sentence);
      }
    }
  }
  return found;
}

export function mergeReminders(
  aiReminders: unknown,
  transcript: string
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (raw: string) => {
    const clean = raw.replace(/^[•\-*\s]+/, '').trim();
    if (clean.length < 4) return;
    const key = clean.toLowerCase();
    // Avoid duplicates if one string is already contained inside another
    for (const existing of seen) {
      if (existing === key || existing.includes(key)) {
        return;
      }
    }
    seen.add(key);
    result.push(clean);
  };

  if (Array.isArray(aiReminders)) {
    for (const item of aiReminders) {
      if (typeof item === 'string') {
        pushUnique(item);
      }
    }
  }

  for (const localSentence of extractRemindersLocally(transcript)) {
    pushUnique(localSentence);
  }

  return result;
}

export interface FlattenedReminder {
  id: string;
  date: string;
  dayTitle: string;
  entryId: string;
  time: string;
  color: NoteColor;
  text: string;
  reminderIndex: number;
  dailyNote: DailyNote;
  entry: NoteEntry;
}

export function collectAllReminders(dailyNotes: DailyNote[]): FlattenedReminder[] {
  const items: FlattenedReminder[] = [];

  const sortedDays = [...dailyNotes].sort((a, b) => b.date.localeCompare(a.date));
  for (const dn of sortedDays) {
    const sortedEntries = [...dn.entries].sort((a, b) => b.time.localeCompare(a.time));
    for (const entry of sortedEntries) {
      // If entry.reminders is explicitly defined (even empty array if user dismissed all),
      // use it; if undefined (older entries before this feature), run local extraction!
      const list =
        Array.isArray(entry.reminders)
          ? entry.reminders
          : extractRemindersLocally(entry.transcript || '');

      list.forEach((phrase, idx) => {
        const clean = phrase.trim();
        if (!clean) return;
        items.push({
          id: `${entry.id}-rem-${idx}`,
          date: dn.date,
          dayTitle: dn.title,
          entryId: entry.id,
          time: entry.time,
          color: entry.color,
          text: clean,
          reminderIndex: idx,
          dailyNote: dn,
          entry,
        });
      });
    }
  }

  return items;
}
