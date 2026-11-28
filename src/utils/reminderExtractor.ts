import type { DailyNote, NoteColor, NoteEntry } from '../types/note';
import { compareExtendedDayTimes } from './dateUtils';

/**
 * Regex patterns matching Italian action/reminder/intention phrases, self-questions,
 * wellbeing/focus/lifestyle reflections, and proposed solutions in spoken or written notes.
 */
const REMINDER_TRIGGER_REGEX =
  /\b(potrei|forse\s+dovrei|forse\s+potrei|dovrei|mi\s+sa\s+che|se\s+(?:faccio|dico|penso|provo|chiedo|chiamo|scrivo|vado|aspetto|lascio|parlo|cambio|smetto|inizio)|devo\s+(?:fare|dire|ricordar\w*|chiamar\w*|scriver\w*|mandar\w*|inviar\w*|parlar\w*|comprar\w*|prenotar\w*|pagar\w*|controllar\w*|fissar\w*|organizzar\w*|finir\w*|capir\w*|provar\w*|cambiar\w*|riposar\w*|staccar\w*|smetter\w*|iniziar\w*)|ricordarmi|da\s+ricordare|non\s+(?:devo\s+)?dimenticar\w*|sarebbe\s+(?:meglio|utile|opportuno|bene)|converrebbe|mi\s+conviene|bisogna\s+che|bisognerebbe|magari\s+(?:faccio|provo|chiamo|scrivo|prendo|cambio|proviamo)|appena\s+posso|la\s+prossima\s+volta|domani\s+(?:faccio|chiamo|scrivo|provo|devo|potrei)|proverò\s+a|devo\s+assolutamente|faccio\s+prima\s+a|meglio\s+se|mi\s+chiedo\s+(?:se|come|perch[eé]|cosa|quanto)|mi\s+domando|chiss[aà]\s+(?:se|come|perch[eé]|cosa)|come\s+(?:posso|faccio|potrei|fare\s+a)|perch[eé]\s+(?:mi|non|sono|ho|faccio|succede)|cosa\s+(?:posso|potrei|dovrei|mi\s+fa)|che\s+cosa\s+(?:posso|potrei|dovrei|mi)|e\s+se\s+(?:provassi|provo|facessi|faccio|cambiassi|cambio|provassimo)|ha\s+senso|vale\s+la\s+pena|vorrei\s+capire|devo\s+capire|potrei\s+provare|dovrei\s+provare|(?:la\s+|una\s+possibile\s+)?soluzion[ei]\s+(?:[eè]|sarebbe|potrebbe)|un['’]?\s*idea\s+(?:sarebbe|potrebbe|\b[eè]\b)|mi\s+aiuterebbe|mi\s+farebbe\s+bene|per\s+stare\s+meglio|benessere|focus|concentrarmi\s+meglio|modo\s+di\s+vivere|stile\s+di\s+vita|abitudin[ei])\b/i;

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
    const isExplicitQuestion = sentence.includes('?') && sentence.length >= 8;
    if (isExplicitQuestion || REMINDER_TRIGGER_REGEX.test(sentence)) {
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
    const sortedEntries = [...dn.entries].sort((a, b) => compareExtendedDayTimes(b.time, a.time));
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
