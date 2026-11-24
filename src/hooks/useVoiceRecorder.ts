import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecordedAudioResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  recordedAt: string;
}

function isAppleSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg|Android/i.test(ua);
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = isAppleSafari()
    ? [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ]
    : [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/webm',
        'audio/ogg',
      ];
  for (const type of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Impossibile leggere i dati audio registrati.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Errore nella conversione audio.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Fallback WAV compatto: 10 kHz mono 8-bit PCM (~10 KB/s, meno di 1/3 rispetto ai 32 KB/s del WAV 16kHz 16-bit).
 * Usato solo se MediaRecorder compresso (Opus/AAC ~2.5 KB/s) non è disponibile.
 */
function encodeCompactWavMono(
  chunks: Float32Array[],
  inputSampleRate: number
): { blob: Blob; peak: number } {
  let totalLength = 0;
  let peak = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
    for (let k = 0; k < chunk.length; k++) {
      const abs = Math.abs(chunk[k]);
      if (abs > peak) peak = abs;
    }
  }

  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const gain = peak > 0.002 && peak < 0.25 ? Math.min(6, 0.45 / peak) : 1;

  const targetRate = 10000;
  const ratio = inputSampleRate / targetRate;
  const outputLength = Math.max(1, Math.floor(merged.length / ratio));
  const buffer = new ArrayBuffer(44 + outputLength);
  const view = new DataView(buffer);

  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + outputLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate, true); // 1 byte per sample
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // 8-bit unsigned PCM
  writeString(36, 'data');
  view.setUint32(40, outputLength, true);

  let writeOffset = 44;
  for (let i = 0; i < outputLength; i++) {
    const startIdx = Math.floor(i * ratio);
    const endIdx = Math.min(merged.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = startIdx; j < endIdx; j++) {
      sum += merged[j];
      count++;
    }
    const sample =
      (count > 0 ? sum / count : merged[Math.min(merged.length - 1, startIdx)] || 0) * gain;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setUint8(writeOffset, Math.round((clamped + 1) * 127.5));
    writeOffset += 1;
  }

  return {
    blob: new Blob([buffer], { type: 'audio/wav' }),
    peak,
  };
}

const BAR_COUNT = 24;

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.12));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setLevels(Array(BAR_COUNT).fill(0.12));
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    pcmChunksRef.current = [];
    chunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Il microfono non è supportato in questo browser. Usa Safari su iOS o un browser moderno.');
      return false;
    }

    // Create & unlock AudioContext synchronously inside user gesture for iOS Safari reliability
    let preCtx: AudioContext | null = null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        preCtx = new AudioCtx();
        if (preCtx.state === 'suspended') {
          preCtx.resume().catch(() => {});
        }
        audioCtxRef.current = preCtx;
      }
    } catch {
      preCtx = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // Start compressed MediaRecorder first (20 kbps Opus/AAC -> ~2.5 KB/s, >10x smaller than WAV!)
      let mediaRecorderActive = false;
      if (typeof MediaRecorder !== 'undefined') {
        try {
          const preferredMime = getSupportedMimeType();
          let recorder: MediaRecorder;
          try {
            const opts: MediaRecorderOptions = { audioBitsPerSecond: 20000 };
            if (preferredMime) opts.mimeType = preferredMime;
            recorder = new MediaRecorder(stream, opts);
          } catch {
            recorder = preferredMime
              ? new MediaRecorder(stream, { mimeType: preferredMime })
              : new MediaRecorder(stream);
          }
          recorder.ondataavailable = (event: BlobEvent) => {
            if (event.data && event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
          mediaRecorderActive = true;
        } catch {
          mediaRecorderActive = false;
        }
      }

      if (preCtx) {
        try {
          if (preCtx.state === 'suspended') {
            await preCtx.resume().catch(() => {});
          }
          sampleRateRef.current = preCtx.sampleRate || 44100;

          const source = preCtx.createMediaStreamSource(stream);
          const analyser = preCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          // Capture raw PCM only if MediaRecorder is unavailable (keeps RAM low on multi-minute notes)
          if (!mediaRecorderActive) {
            const processor = preCtx.createScriptProcessor(4096, 1, 1);
            const silentGain = preCtx.createGain();
            silentGain.gain.value = 0;

            processor.onaudioprocess = (event: AudioProcessingEvent) => {
              const input = event.inputBuffer.getChannelData(0);
              if (input && input.length > 0) {
                pcmChunksRef.current.push(new Float32Array(input));
              }
            };

            source.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(preCtx.destination);
            processorRef.current = processor;
          }

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const tickLevels = () => {
            analyser.getByteFrequencyData(dataArray);
            const nextBars: number[] = [];
            for (let i = 0; i < BAR_COUNT; i++) {
              const binIdx = Math.min(dataArray.length - 1, Math.floor((i / BAR_COUNT) * dataArray.length));
              const val = dataArray[binIdx] / 255;
              nextBars.push(Math.max(0.12, Math.min(1, val * 1.45)));
            }
            setLevels(nextBars);
            rafRef.current = window.requestAnimationFrame(tickLevels);
          };
          rafRef.current = window.requestAnimationFrame(tickLevels);
        } catch {
          // Visualizer optional
        }
      }

      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);

      return true;
    } catch (err) {
      cleanup();
      setIsRecording(false);
      const errName = (err as { name?: string })?.name;
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setError(
          'Accesso al microfono negato. Abilita il microfono nelle impostazioni di Safari / iPhone e riprova.'
        );
      } else if (errName === 'NotFoundError') {
        setError('Nessun microfono rilevato su questo dispositivo.');
      } else {
        setError('Impossibile avviare il microfono. Verifica i permessi e riprova.');
      }
      return false;
    }
  }, [cleanup]);

  const stopRecording = useCallback(async (): Promise<RecordedAudioResult | null> => {
    const recordedAt = new Date().toISOString();
    const rawDuration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const pcmChunks = [...pcmChunksRef.current];
    const sampleRate = sampleRateRef.current;

    const recorder = mediaRecorderRef.current;
    let compressedBlob: Blob | null = null;
    let compressedMime = 'audio/webm';

    if (recorder && recorder.state !== 'inactive') {
      compressedMime = recorder.mimeType || getSupportedMimeType() || 'audio/mp4';
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 3500);
        recorder.onstop = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        try {
          recorder.stop();
        } catch {
          window.clearTimeout(timeout);
          resolve();
        }
      });
      if (chunksRef.current.length > 0) {
        compressedBlob = new Blob(chunksRef.current, { type: compressedMime });
      }
    }

    cleanup();
    setIsRecording(false);

    // Prefer compressed Opus/AAC MediaRecorder audio (~20 kbps, ~10x smaller than WAV!)
    let finalBlob: Blob | null = null;
    let finalMime = compressedMime;

    if (compressedBlob && compressedBlob.size > 512) {
      finalBlob = compressedBlob;
      finalMime = compressedMime.split(';')[0].trim() || compressedMime;
    } else if (pcmChunks.length > 0) {
      const { blob: compactWav } = encodeCompactWavMono(pcmChunks, sampleRate);
      if (compactWav.size > 128) {
        finalBlob = compactWav;
        finalMime = 'audio/wav';
      }
    }

    if (!finalBlob) {
      setError('Registrazione troppo breve o nessun audio catturato. Riprova a parlare nel microfono.');
      return null;
    }

    try {
      const base64 = await blobToBase64(finalBlob);
      return {
        blob: finalBlob,
        base64,
        mimeType: finalMime,
        durationSeconds: rawDuration,
        sizeBytes: finalBlob.size,
        recordedAt,
      };
    } catch (convErr) {
      setError(convErr instanceof Error ? convErr.message : 'Errore nella lettura audio.');
      return null;
    }
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    pcmChunksRef.current = [];
    chunksRef.current = [];
    cleanup();
    setIsRecording(false);
    setElapsedSeconds(0);
  }, [cleanup]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isRecording,
    elapsedSeconds,
    levels,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  };
}
