import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  Highlighter,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { blobToBase64 } from '../hooks/useVoiceRecorder';
import type { DailyNote, NoteColor, NoteEntry } from '../types/note';
import { fetchApiJsonWithRetry } from '../utils/apiError';
import { getAudioClip } from '../utils/audioStorage';
import { startBackgroundSession } from '../utils/backgroundKeepAlive';
import { formatBytes, formatDuration, formatRecordedDateTime } from '../utils/dateUtils';
import {
  NOTE_COLOR_LIST,
  NOTE_COLORS,
  VALID_NOTE_COLORS,
  inferNoteColorFromText,
} from '../utils/noteColors';
import { getNekoForDate } from '../utils/nekoCatalog';
import { publishQuotaSnapshot } from '../utils/quotaTracker';
import { extractRemindersLocally, mergeReminders } from '../utils/reminderExtractor';
import { fetchTranscribeWithDebug } from '../utils/transcribeDebugLog';
import { CatIllustration } from './CatIllustration';

interface NoteEditorModalProps {
  dailyNote: DailyNote;
  entry: NoteEntry;
  autoExtractReminders?: boolean;
  onClose: () => void;
  onSaveEntry: (originalDate: string, targetDate: string, updatedEntry: NoteEntry) => void;
  onDeleteEntry: (date: string, entryId: string) => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  dailyNote,
  entry,
  autoExtractReminders = true,
  onClose,
  onSaveEntry,
  onDeleteEntry,
}) => {
  const [date, setDate] = useState(dailyNote.date);
  const [time, setTime] = useState(typeof entry.time === 'string' ? entry.time : '09:00');
  const [color, setColor] = useState<NoteColor>(
    entry.color && NOTE_COLORS[entry.color] ? entry.color : 'amber'
  );
  const [transcript, setTranscript] = useState(
    typeof entry.transcript === 'string' ? entry.transcript : ''
  );
  const [bullets, setBullets] = useState<string[]>(
    Array.isArray(entry.bullets) && entry.bullets.length > 0
      ? entry.bullets.map((b) => String(b ?? ''))
      : []
  );
  const [reminders, setReminders] = useState<string[]>(() =>
    Array.isArray(entry.reminders)
      ? entry.reminders.map((r) => String(r ?? ''))
      : autoExtractReminders
        ? extractRemindersLocally(typeof entry.transcript === 'string' ? entry.transcript : '')
        : []
  );

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let activeUrl: string | null = null;
    if (entry.audioMetadata?.hasAudioClip) {
      getAudioClip(entry.id).then((blob) => {
        if (blob) {
          setAudioBlob(blob);
          activeUrl = URL.createObjectURL(blob);
          setAudioUrl(activeUrl);
        }
      });
    }
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [entry.id, entry.audioMetadata?.hasAudioClip]);

  const handleBulletChange = (index: number, value: string) => {
    setBullets((prev) => prev.map((b, i) => (i === index ? value : b)));
  };

  const handleRemoveBullet = (index: number) => {
    setBullets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBullet = () => {
    setBullets((prev) => [...prev, '']);
  };

  const handleRegenerateMoodBullets = async (alsoUpdateColor = true) => {
    const safeTranscript = (transcript || '').trim();
    if (!safeTranscript) return;
    setIsSynthesizing(true);
    setAiError(null);
    const releaseKeepAlive = startBackgroundSession('Analisi sensazioni in corso');
    try {
      const { response: res, data } = await fetchApiJsonWithRetry<{
        bullets?: unknown;
        reminders?: unknown;
        suggestedColor?: unknown;
        quota?: unknown;
      }>('/api/notes/summarize-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: safeTranscript, isDailyOverview: false }),
      });
      if (data?.quota) {
        publishQuotaSnapshot(data.quota);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Impossibile generare la sintesi.');
      }
      const nextBullets = Array.isArray(data.bullets)
        ? data.bullets.map((b) => String(b ?? '').trim()).filter(Boolean)
        : bullets;
      setBullets(nextBullets);
      if (autoExtractReminders) {
        setReminders(mergeReminders(data.reminders, safeTranscript));
      }
      if (alsoUpdateColor) {
        if (
          typeof data.suggestedColor === 'string' &&
          VALID_NOTE_COLORS.includes(data.suggestedColor as NoteColor)
        ) {
          setColor(data.suggestedColor as NoteColor);
        } else {
          setColor(inferNoteColorFromText(safeTranscript, nextBullets));
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Errore nella sintesi.');
    } finally {
      releaseKeepAlive();
      setIsSynthesizing(false);
    }
  };

  const handleTranscribeSavedAudio = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setAiError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120000);
    const releaseKeepAlive = startBackgroundSession('Trascrizione audio in corso');
    try {
      const base64 = await blobToBase64(audioBlob);
      const { ok, data } = await fetchTranscribeWithDebug<{
        transcript?: string;
        bullets?: unknown;
        reminders?: unknown;
        suggestedColor?: unknown;
        quota?: unknown;
      }>({
        endpoint: '/api/notes/transcribe',
        caller: 'NoteEditorModal',
        signal: controller.signal,
        payload: {
          audioBase64: base64,
          mimeType: entry.audioMetadata?.mimeType || audioBlob.type || 'audio/wav',
          durationSeconds: entry.audioMetadata?.durationSeconds || 1,
          sizeBytes: audioBlob.size,
          recordedAt: entry.audioMetadata?.recordedAt || entry.createdAt,
        },
      });
      if (data?.quota) {
        publishQuotaSnapshot(data.quota);
      }
      if (!ok) {
        throw new Error(data.error || 'Impossibile trascrivere questo audio.');
      }
      const nextTranscript =
        typeof data.transcript === 'string' && data.transcript.trim()
          ? data.transcript.trim()
          : transcript;
      setTranscript(nextTranscript);

      const nextBullets =
        Array.isArray(data.bullets) && data.bullets.length > 0
          ? data.bullets.map((b) => String(b ?? '').trim()).filter(Boolean)
          : bullets;
      setBullets(nextBullets);
      if (autoExtractReminders) {
        setReminders(mergeReminders(data.reminders, nextTranscript));
      }

      if (
        typeof data.suggestedColor === 'string' &&
        VALID_NOTE_COLORS.includes(data.suggestedColor as NoteColor)
      ) {
        setColor(data.suggestedColor as NoteColor);
      } else {
        setColor(inferNoteColorFromText(nextTranscript, nextBullets));
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setAiError('Tempo di attesa scaduto per la trascrizione. Riprova tra qualche secondo.');
      } else {
        setAiError(err instanceof Error ? err.message : 'Errore nella trascrizione.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      releaseKeepAlive();
      setIsTranscribing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeTranscript = (transcript || '').trim();
    const cleanedBullets = bullets.map((b) => (b || '').trim()).filter(Boolean);
    const cleanedReminders = reminders.map((r) => (r || '').trim()).filter(Boolean);
    onSaveEntry(dailyNote.date, date || dailyNote.date, {
      ...entry,
      time: time || entry.time,
      color,
      transcript: safeTranscript,
      bullets: cleanedBullets,
      reminders: cleanedReminders,
      updatedAt: new Date().toISOString(),
    });
  };

  const activeColorMeta = NOTE_COLORS[color] || NOTE_COLORS.amber;
  const modalNeko = getNekoForDate(date || dailyNote.date, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full sm:max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl overflow-hidden border border-[var(--app-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0">
          <div className="h-1.5 w-10 rounded-full bg-[var(--app-border-soft)]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-divider)] px-5 py-3.5 shrink-0 bg-[var(--app-card-alt)]">
          <div className="flex items-center gap-3 min-w-0">
            <CatIllustration
              src={modalNeko.src}
              alt={modalNeko.alt}
              className="h-11 w-11 rounded-2xl object-cover border-2 border-[var(--app-border)] bg-[var(--app-companion-bg)] shrink-0"
            />
            <span
              className={`h-3 w-3 rounded-full border shrink-0 ${activeColorMeta.swatchClass}`}
              aria-hidden="true"
            />
            <h2 id="editor-modal-title" className="text-base font-bold text-[var(--app-text)] truncate">
              Modifica appunto · {dailyNote.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi editor"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--app-text-subtle)] hover:bg-[var(--app-card)] hover:text-[var(--app-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form
          id="entry-editor-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
        >
          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2.5">
            <label className="block min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-text-muted)] mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--app-accent)] shrink-0" aria-hidden="true" />
                Giorno nota
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full max-w-full min-w-0 min-h-[44px] rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-card-alt)] px-2.5 py-2 font-sans text-[var(--app-text)] tabular-nums focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
              />
            </label>

            <label className="block min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-text-muted)] mb-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--app-accent)] shrink-0" aria-hidden="true" />
                Orario
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="block w-full max-w-full min-w-0 min-h-[44px] rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-card-alt)] px-2.5 py-2 font-sans text-[var(--app-text)] tabular-nums focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
              />
            </label>
          </div>

          {/* Per-Entry Highlight Color Selector (5 colors + AI suggest) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-text-muted)]">
                <Highlighter className="h-3.5 w-3.5 text-[var(--app-accent)]" aria-hidden="true" />
                Colore sensazione
              </span>
              <button
                type="button"
                disabled={isSynthesizing || !(transcript || '').trim()}
                onClick={() => handleRegenerateMoodBullets(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-accent)] hover:underline disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Ricalcola colore con AI
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NOTE_COLOR_LIST.map((col) => {
                const selected = color === col.key;
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setColor(col.key)}
                    aria-pressed={selected}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition-all ${
                      selected
                        ? 'border-[var(--app-btn-bg)] bg-[var(--app-btn-bg)] text-[var(--app-btn-text)]'
                        : 'border-[var(--app-border-soft)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:border-[var(--app-accent-soft-border)]'
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full border shrink-0 ${col.swatchClass}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--app-text-subtle)]">
              Attuale: <strong className="text-[var(--app-text)]">{activeColorMeta.label}</strong> ({activeColorMeta.valenceLabel})
            </p>
          </div>

          {/* Highlighted Transcript Textarea */}
          <div>
            <label htmlFor="entry-transcript" className="block text-xs font-medium text-[var(--app-text-muted)] mb-1.5">
              Testo dell’appunto
            </label>
            <textarea
              id="entry-transcript"
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Scrivi o modifica il testo dell'appunto..."
              className={`w-full rounded-xl border border-[var(--app-border-soft)] p-3.5 text-sm leading-relaxed placeholder:text-current/55 focus:border-[var(--app-accent)] focus:outline-none ${activeColorMeta.highlightClass}`}
            />
          </div>

          {/* Mood / Stress / Sensations Bullet Synthesis */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--app-text-muted)]">
                Sintesi sensazioni, stress e stati d’animo
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isSynthesizing || !(transcript || '').trim()}
                  onClick={() => handleRegenerateMoodBullets(true)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)] disabled:opacity-50 transition-colors"
                >
                  {isSynthesizing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Sintetizza
                </button>
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--app-accent-text)] hover:bg-[var(--app-accent-soft)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Aggiungi
                </button>
              </div>
            </div>

            {bullets.length === 0 ? (
              <p className="text-xs text-[var(--app-text-subtle)]">
                Nessun punto di sintesi. Premi “Sintetizza” o “Aggiungi” per annotare stress, focus o bisogni.
              </p>
            ) : (
              <div className="space-y-2">
                {bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)] shrink-0"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => handleBulletChange(idx, e.target.value)}
                      placeholder="Es. Stress: alto, Focus: esaurito..."
                      className="flex-1 min-h-[42px] rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-card-alt)] px-3 py-2 text-sm text-[var(--app-text)] focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(idx)}
                      aria-label={`Rimuovi punto ${idx + 1}`}
                      className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-[var(--app-text-subtle)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Reminders Section */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-text-muted)]">
                <Bell className="h-3.5 w-3.5 text-[var(--app-accent)]" aria-hidden="true" />
                Promemoria trovati in questo appunto
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setReminders((prev) =>
                      mergeReminders(prev, (transcript || '').trim())
                    )
                  }
                  disabled={!(transcript || '').trim()}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)] disabled:opacity-40 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Rileva frasi
                </button>
                <button
                  type="button"
                  onClick={() => setReminders((prev) => [...prev, ''])}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--app-accent-text)] hover:bg-[var(--app-accent-soft)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Aggiungi
                </button>
              </div>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-[var(--app-text-subtle)]">
                Nessun promemoria rilevato (es. “potrei fare…”, “forse dovrei…”, “mi sa che se…”).
              </p>
            ) : (
              <div className="space-y-2">
                {reminders.map((rem, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <textarea
                      rows={2}
                      value={rem}
                      onChange={(e) =>
                        setReminders((prev) =>
                          prev.map((item, i) => (i === idx ? e.target.value : item))
                        )
                      }
                      placeholder="Frase completa da ricordare..."
                      className="flex-1 rounded-xl border border-[var(--app-border-soft)] bg-[var(--app-card-alt)] px-3 py-2 text-xs text-[var(--app-text)] leading-relaxed focus:border-[var(--app-accent)] focus:bg-[var(--app-card)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setReminders((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label={`Rimuovi promemoria ${idx + 1}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--app-text-subtle)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {aiError && <p className="text-xs text-rose-600 dark:text-rose-400">{aiError}</p>}

          {/* Audio Metadata & Playback */}
          {entry.audioMetadata && (
            <div className="rounded-2xl border border-[var(--app-border-soft)] bg-[var(--app-card-alt)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--app-text)]">
                  <Mic className="h-4 w-4 text-[var(--app-accent)]" aria-hidden="true" />
                  <span>Metadati registrazione audio</span>
                </div>
                {audioBlob && (
                  <button
                    type="button"
                    disabled={isTranscribing}
                    onClick={handleTranscribeSavedAudio}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--app-border-soft)] bg-[var(--app-card)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)] disabled:opacity-50 transition-colors"
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{(transcript || '').trim() ? 'Ritrascrivi' : 'Trascrivi audio'}</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[var(--app-text-muted)]">
                <div>
                  <span className="block text-[11px] text-[var(--app-text-subtle)]">Data e ora registrazione</span>
                  <span className="font-mono text-[var(--app-text)] tabular-nums">
                    {formatRecordedDateTime(entry.audioMetadata.recordedAt)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--app-text-subtle)]">Durata</span>
                  <span className="font-mono text-[var(--app-text)] tabular-nums">
                    {formatDuration(entry.audioMetadata.durationSeconds)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--app-text-subtle)]">Formato e dimensione</span>
                  <span className="font-mono text-[var(--app-text)] tabular-nums">
                    {entry.audioMetadata.mimeType.replace('audio/', '').toUpperCase()} ·{' '}
                    {formatBytes(entry.audioMetadata.sizeBytes)}
                  </span>
                </div>
              </div>
              {audioUrl && (
                <audio controls src={audioUrl} className="w-full h-10" preload="metadata" />
              )}
            </div>
          )}
        </form>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--app-divider)] bg-[var(--app-card)] px-5 py-3.5 pb-safe shrink-0">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Elimina appunto
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDeleteEntry(dailyNote.date, entry.id)}
                className="min-h-[44px] rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Conferma elimina
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-card-alt)] transition-colors"
              >
                Annulla
              </button>
            </div>
          )}

          <button
            type="submit"
            form="entry-editor-form"
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--app-btn-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--app-btn-text)] hover:bg-[var(--app-btn-bg-hover)] transition-colors"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Salva modifiche
          </button>
        </div>
      </div>
    </div>
  );
};
