import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Highlighter,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
  Square,
  Upload,
  X,
} from 'lucide-react';
import { useVoiceRecorder, type RecordedAudioResult } from '../hooks/useVoiceRecorder';
import type { NoteColor, NoteEntry } from '../types/note';
import { saveAudioClip } from '../utils/audioStorage';
import { formatDuration, getCurrentTimeHHMM } from '../utils/dateUtils';
import {
  NOTE_COLOR_LIST,
  NOTE_COLORS,
  VALID_NOTE_COLORS,
  inferNoteColorFromText,
} from '../utils/noteColors';
import { CHIBI_CAT_MASCOTS, getNekoForDate } from '../utils/nekoCatalog';
import { publishQuotaSnapshot } from '../utils/quotaTracker';
import { extractRemindersLocally, mergeReminders } from '../utils/reminderExtractor';
import { CatIllustration } from './CatIllustration';
import { QuotaStatusBar } from './QuotaStatusBar';

interface VoiceRecorderPanelProps {
  selectedDate: string;
  autoExtractReminders?: boolean;
  onEntryCreated: (targetDate: string, entry: NoteEntry) => void;
}

type ColorSelection = 'auto' | NoteColor;

function resolveColorSelection(
  selection: ColorSelection,
  suggestedRaw: unknown,
  text: string,
  bullets: string[]
): NoteColor {
  if (selection !== 'auto') return selection;
  if (typeof suggestedRaw === 'string' && VALID_NOTE_COLORS.includes(suggestedRaw as NoteColor)) {
    return suggestedRaw as NoteColor;
  }
  return inferNoteColorFromText(text, bullets);
}

export const VoiceRecorderPanel: React.FC<VoiceRecorderPanelProps> = ({
  selectedDate,
  autoExtractReminders = true,
  onEntryCreated,
}) => {
  const {
    isRecording,
    elapsedSeconds,
    levels,
    error: micError,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  } = useVoiceRecorder();

  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [manualText, setManualText] = useState('');
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [targetTime, setTargetTime] = useState(() => getCurrentTimeHHMM());
  const [useCurrentSelectionDate, setUseCurrentSelectionDate] = useState(true);
  const [colorChoice, setColorChoice] = useState<ColorSelection>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<RecordedAudioResult | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const effectiveDate = useCurrentSelectionDate ? selectedDate : targetDate;

  const parseJsonSafe = async (response: Response) => {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return { error: raw || `Errore HTTP ${response.status}` };
    }
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setApiError('Trascrizione annullata.');
  };

  const processAudioPayload = async (result: RecordedAudioResult) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const dynamicTimeoutMs = Math.max(
      150000,
      Math.min(300000, (result.durationSeconds || 60) * 1500 + 90000)
    );
    const timeoutId = window.setTimeout(() => controller.abort(), dynamicTimeoutMs);

    setIsProcessing(true);
    setApiError(null);
    setPendingAudio(result);

    try {
      const response = await fetch('/api/notes/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          audioBase64: result.base64,
          mimeType: result.mimeType,
          durationSeconds: result.durationSeconds,
          sizeBytes: result.sizeBytes,
          recordedAt: result.recordedAt,
        }),
      });

      const data = await parseJsonSafe(response);
      if (data?.quota) {
        publishQuotaSnapshot(data.quota);
      }
      if (!response.ok) {
        throw new Error(data.error || 'Impossibile trascrivere la registrazione audio.');
      }

      const entryId = crypto.randomUUID();
      const savedClip = await saveAudioClip(entryId, result.blob);
      const safeTranscript = typeof data.transcript === 'string' ? data.transcript.trim() : '';
      const safeBullets = Array.isArray(data.bullets)
        ? data.bullets.map((b: unknown) => String(b ?? '').trim()).filter(Boolean)
        : [];
      const safeReminders = autoExtractReminders
        ? mergeReminders(data.reminders, safeTranscript)
        : [];
      const finalColor = resolveColorSelection(
        colorChoice,
        data.suggestedColor,
        safeTranscript,
        safeBullets
      );

      const nowIso = new Date().toISOString();
      const newEntry: NoteEntry = {
        id: entryId,
        time: targetTime || getCurrentTimeHHMM(),
        transcript: safeTranscript,
        bullets: safeBullets,
        reminders: safeReminders,
        color: finalColor,
        source: 'voice',
        audioMetadata: {
          recordedAt: data.audioMetadata?.recordedAt || result.recordedAt,
          durationSeconds: data.audioMetadata?.durationSeconds || result.durationSeconds,
          mimeType: data.audioMetadata?.mimeType || result.mimeType,
          sizeBytes: data.audioMetadata?.sizeBytes || result.sizeBytes,
          hasAudioClip: savedClip,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setPendingAudio(null);
      onEntryCreated(effectiveDate, newEntry);
      setTargetTime(getCurrentTimeHHMM());
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setApiError((prev) =>
          prev === 'Trascrizione annullata.'
            ? prev
            : 'Tempo di attesa scaduto per la trascrizione. Puoi riprovare senza perdere la registrazione.'
        );
      } else {
        setApiError(
          err instanceof Error ? err.message : 'Errore imprevisto durante la trascrizione.'
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const handleSaveAudioWithoutTranscript = async () => {
    if (!pendingAudio) return;
    const entryId = crypto.randomUUID();
    const savedClip = await saveAudioClip(entryId, pendingAudio.blob);
    const nowIso = new Date().toISOString();

    const newEntry: NoteEntry = {
      id: entryId,
      time: targetTime || getCurrentTimeHHMM(),
      transcript: '',
      bullets: [],
      color: colorChoice === 'auto' ? 'amber' : colorChoice,
      source: 'voice',
      audioMetadata: {
        recordedAt: pendingAudio.recordedAt,
        durationSeconds: pendingAudio.durationSeconds,
        mimeType: pendingAudio.mimeType,
        sizeBytes: pendingAudio.sizeBytes,
        hasAudioClip: savedClip,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setPendingAudio(null);
    setApiError(null);
    onEntryCreated(effectiveDate, newEntry);
    setTargetTime(getCurrentTimeHHMM());
  };

  const handleToggleRecord = async () => {
    setApiError(null);
    clearError();

    if (!isRecording) {
      setTargetTime(getCurrentTimeHHMM());
      await startRecording();
      return;
    }

    const result = await stopRecording();
    if (!result) return;
    await processAudioPayload(result);
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setApiError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result;
          if (typeof res !== 'string') {
            reject(new Error('Impossibile leggere il file audio.'));
            return;
          }
          const idx = res.indexOf(',');
          resolve(idx >= 0 ? res.slice(idx + 1) : res);
        };
        reader.onerror = () => reject(new Error('Errore durante la lettura del file audio.'));
        reader.readAsDataURL(file);
      });

      await processAudioPayload({
        blob: file,
        base64,
        mimeType: file.type || 'audio/mp4',
        durationSeconds: 1,
        sizeBytes: file.size,
        recordedAt: new Date().toISOString(),
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Impossibile caricare il file audio.');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualText.trim();
    if (!cleaned) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);

    setIsProcessing(true);
    setApiError(null);

    let bullets: string[] = [];
    let aiReminders: unknown;
    let suggestedRaw: unknown;
    try {
      const response = await fetch('/api/notes/summarize-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text: cleaned, isDailyOverview: false }),
      });
      const data = await parseJsonSafe(response);
      if (data?.quota) {
        publishQuotaSnapshot(data.quota);
      }
      if (response.ok) {
        if (Array.isArray(data.bullets)) {
          bullets = data.bullets.map((b: unknown) => String(b ?? '').trim()).filter(Boolean);
        }
        aiReminders = data.reminders;
        suggestedRaw = data.suggestedColor;
      }
    } catch {
      // Save note anyway even if offline / summary skipped
    } finally {
      window.clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
    }

    const finalColor = resolveColorSelection(colorChoice, suggestedRaw, cleaned, bullets);
    const finalReminders = autoExtractReminders
      ? aiReminders !== undefined
        ? mergeReminders(aiReminders, cleaned)
        : extractRemindersLocally(cleaned)
      : [];

    const nowIso = new Date().toISOString();
    const newEntry: NoteEntry = {
      id: crypto.randomUUID(),
      time: targetTime || getCurrentTimeHHMM(),
      transcript: cleaned,
      bullets,
      reminders: finalReminders,
      color: finalColor,
      source: 'text',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onEntryCreated(effectiveDate, newEntry);
    setManualText('');
    setTargetTime(getCurrentTimeHHMM());
  };

  const activeError = micError || apiError;
  const recorderCat =
    inputMode === 'voice' ? CHIBI_CAT_MASCOTS.mic : getNekoForDate(effectiveDate, 1);

  return (
    <section
      id="recorder"
      aria-label="Registrazione appunto giornaliero"
      className="rounded-3xl border border-stone-900/12 bg-white p-4 sm:p-5 shadow-xs overflow-hidden"
    >
      {/* Chibi Black Cat Mascot Header + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <CatIllustration
            src={recorderCat.src}
            alt={recorderCat.alt}
            className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl object-cover border-2 border-stone-900/15 bg-[#FAF5E8] shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              Nuovo appunto
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5 leading-snug">
              {isRecording
                ? 'Ti ascolto con attenzione...'
                : 'Registra o scrivi come ti senti'}
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Modalità inserimento"
          className="inline-flex rounded-xl bg-purple-50/90 border border-purple-200/70 p-0.5 sm:p-1 shrink-0"
        >
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            disabled={isRecording || isProcessing}
            className={`min-h-[34px] sm:min-h-[36px] rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              inputMode === 'voice'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Voce
          </button>
          <button
            type="button"
            onClick={() => setInputMode('text')}
            disabled={isRecording || isProcessing}
            className={`min-h-[34px] sm:min-h-[36px] rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              inputMode === 'text'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Testo
          </button>
        </div>
      </div>

      {/* Small Daily AI Quota Indicator + Reset Countdown Timer */}
      <QuotaStatusBar className="mt-3" />

      {/* Date & Time Selection (always bounded inside card on mobile & narrow sidebars) */}
      <div className="mt-3.5 grid grid-cols-1 gap-2.5 min-w-0">
        <label className="block min-w-0 max-w-full overflow-hidden">
          <span className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-1">
            <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" aria-hidden="true" />
            Giorno nota
          </span>
          <input
            type="date"
            value={effectiveDate}
            disabled={isRecording || isProcessing}
            onChange={(e) => {
              setUseCurrentSelectionDate(false);
              setTargetDate(e.target.value);
            }}
            className="appearance-none block w-full max-w-full min-w-0 box-border min-h-[42px] rounded-xl border border-stone-200 bg-[#FAF7F0] px-2.5 py-1.5 font-sans text-stone-900 tabular-nums focus:border-purple-500 focus:bg-white focus:outline-none"
          />
        </label>

        <label className="block min-w-0 max-w-full overflow-hidden">
          <span className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-1">
            <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" aria-hidden="true" />
            Orario appunto
          </span>
          <input
            type="time"
            value={targetTime}
            disabled={isRecording || isProcessing}
            onChange={(e) => setTargetTime(e.target.value)}
            className="appearance-none block w-full max-w-full min-w-0 box-border min-h-[42px] rounded-xl border border-stone-200 bg-[#FAF7F0] px-2.5 py-1.5 font-sans text-stone-900 tabular-nums focus:border-purple-500 focus:bg-white focus:outline-none"
          />
        </label>
      </div>

      {/* Automatic AI Color Selection + Manual Override */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mb-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-stone-700">
            <Highlighter className="h-3.5 w-3.5 text-purple-600 shrink-0" aria-hidden="true" />
            Colore sensazione
          </span>
          <span className="text-[11px] text-stone-500">
            {colorChoice === 'auto'
              ? 'Scelto dall’AI e modificabile dopo'
              : `Manuale: ${NOTE_COLORS[colorChoice].label}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            disabled={isRecording || isProcessing}
            onClick={() => setColorChoice('auto')}
            aria-pressed={colorChoice === 'auto'}
            className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
              colorChoice === 'auto'
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-purple-200 bg-purple-50/70 text-purple-900 hover:border-purple-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Auto AI</span>
          </button>

          {NOTE_COLOR_LIST.map((col) => {
            const active = colorChoice === col.key;
            return (
              <button
                key={col.key}
                type="button"
                disabled={isRecording || isProcessing}
                onClick={() => setColorChoice(col.key)}
                aria-pressed={active}
                title={`${col.label} — ${col.valenceLabel}`}
                className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                  active
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full border shrink-0 ${col.swatchClass}`}
                  aria-hidden="true"
                />
                <span>{col.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {inputMode === 'voice' ? (
        <div className="mt-4">
          {/* Waveform / Status Display */}
          <div
            className={`rounded-2xl border p-3.5 sm:p-4 transition-colors ${
              isRecording
                ? 'border-rose-300 bg-rose-50/70'
                : isProcessing
                  ? 'border-purple-300 bg-purple-50/70'
                  : 'border-stone-200/90 bg-[#FAF7F0]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-stone-700 min-w-0">
                {isRecording
                  ? 'Registrazione in corso'
                  : isProcessing
                    ? 'Trascrivo, analizzo sensazioni e colore...'
                    : 'Pronto per registrare'}
              </span>
              <span className="font-mono font-semibold text-stone-900 tabular-nums shrink-0">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>

            {/* 24-bar Audio Visualizer */}
            <div
              className="mt-4 flex h-12 items-center justify-between gap-1"
              aria-hidden="true"
            >
              {levels.map((level, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-75 ${
                    isRecording
                      ? 'bg-rose-500'
                      : isProcessing
                        ? 'bg-purple-500'
                        : 'bg-purple-300/80'
                  }`}
                  style={{ height: `${Math.round(level * 100)}%` }}
                />
              ))}
            </div>
          </div>

          {/* Primary Microphone CTA */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleToggleRecord}
              className={`flex-1 min-w-0 min-h-[50px] inline-flex items-center justify-center gap-2 rounded-2xl px-3.5 sm:px-5 py-2.5 text-sm font-semibold leading-tight text-center transition-all active:scale-[0.98] disabled:opacity-60 ${
                isRecording
                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                  : 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Analizzo nota e colore...
                </>
              ) : isRecording ? (
                <>
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  Termina e trascrivi
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" aria-hidden="true" />
                  Registra nota vocale
                </>
              )}
            </button>

            {isRecording && (
              <button
                type="button"
                onClick={cancelRecording}
                aria-label="Annulla registrazione"
                className="min-h-[52px] min-w-[52px] inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {isProcessing && (
              <button
                type="button"
                onClick={cancelProcessing}
                aria-label="Annulla trascrizione"
                className="min-h-[52px] min-w-[52px] inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {!isRecording && !isProcessing && (
              <label
                title="Carica memo vocale da File o Memo Vocali iPhone"
                className="min-h-[52px] min-w-[52px] cursor-pointer inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 hover:border-purple-300 hover:bg-purple-50/40 transition-colors"
              >
                <Upload className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Carica file audio</span>
                <input
                  type="file"
                  accept="audio/*,.m4a,.mp3,.wav,.webm"
                  onChange={handleUploadAudio}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            placeholder="Scrivi come ti senti ora (es. livello di stress, energia, focus o pensieri)..."
            className="w-full rounded-2xl border border-stone-200 bg-[#FAF7F0] p-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-purple-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={isProcessing || !manualText.trim()}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analizzo sensazioni e colore...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" aria-hidden="true" />
                Aggiungi al diario di oggi
              </>
            )}
          </button>
        </form>
      )}

      {activeError && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">{activeError}</span>
          </div>
          {pendingAudio && !isProcessing && (
            <div className="flex flex-wrap items-center gap-2 pl-6">
              <button
                type="button"
                onClick={() => processAudioPayload(pendingAudio)}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Riprova trascrizione
              </button>
              <button
                type="button"
                onClick={handleSaveAudioWithoutTranscript}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-100/60 transition-colors"
              >
                Salva solo audio
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
