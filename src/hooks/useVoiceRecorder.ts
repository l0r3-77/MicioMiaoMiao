import { useCallback, useEffect, useRef, useState } from 'react';
import { compactAudioBlob, encodeMono8BitWavFromSamples } from '../utils/audioCompact';
import { startBackgroundSession } from '../utils/backgroundKeepAlive';
import {
  createTranscribeTraceId,
  logTranscribeEvent,
  probeMicPermissionState,
  type MicPermissionState,
  type MicRecordingDiagnostics,
} from '../utils/transcribeDebugLog';

export interface RecordedAudioResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  recordedAt: string;
  diagnostics?: MicRecordingDiagnostics;
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

function encodeCompactWavMono(chunks: Float32Array[], inputSampleRate: number): Blob {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return encodeMono8BitWavFromSamples(merged, inputSampleRate, 6000);
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
  const keepAliveReleaseRef = useRef<(() => void) | null>(null);
  const traceIdRef = useRef<string>('');
  const micPermAtStartRef = useRef<MicPermissionState>('unsupported');
  const trackMutedRef = useRef<boolean>(false);
  const trackEndedUnexpectedlyRef = useRef<boolean>(false);
  const visibilityChangedRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (keepAliveReleaseRef.current) {
      keepAliveReleaseRef.current();
      keepAliveReleaseRef.current = null;
    }
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
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.onmute = null;
        track.onunmute = null;
        track.stop();
      });
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setLevels(Array(BAR_COUNT).fill(0.12));
  }, []);

  useEffect(() => {
    const handleVis = () => {
      if (isRecording && traceIdRef.current) {
        visibilityChangedRef.current = true;
        logTranscribeEvent(
          traceIdRef.current,
          'recording_track_event',
          { event: 'visibilitychange', visibilityState: document.visibilityState },
          'info'
        );
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    pcmChunksRef.current = [];
    chunksRef.current = [];
    const traceId = createTranscribeTraceId();
    traceIdRef.current = traceId;
    trackMutedRef.current = false;
    trackEndedUnexpectedlyRef.current = false;
    visibilityChangedRef.current = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Il microfono non è supportato in questo browser. Usa Safari su iOS o un browser moderno.');
      return false;
    }

    const permBefore = await probeMicPermissionState();
    micPermAtStartRef.current = permBefore;
    logTranscribeEvent(traceId, 'mic_permission_check', {
      phase: 'before_getUserMedia',
      micPermission: permBefore,
    });

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

    if (!keepAliveReleaseRef.current) {
      keepAliveReleaseRef.current = startBackgroundSession('Registrazione vocale in corso');
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

      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          trackEndedUnexpectedlyRef.current = true;
          logTranscribeEvent(
            traceId,
            'recording_track_event',
            { event: 'track_ended', readyState: track.readyState, label: track.label },
            'warn'
          );
        };
        track.onmute = () => {
          trackMutedRef.current = true;
          logTranscribeEvent(
            traceId,
            'recording_track_event',
            { event: 'track_muted', muted: track.muted, readyState: track.readyState },
            'warn'
          );
        };
        track.onunmute = () => {
          logTranscribeEvent(traceId, 'recording_track_event', {
            event: 'track_unmuted',
            readyState: track.readyState,
          });
        };
      });

      const permAfterGrant = await probeMicPermissionState();
      micPermAtStartRef.current = permAfterGrant !== 'unsupported' ? permAfterGrant : permBefore;
      logTranscribeEvent(traceId, 'recording_start', {
        micPermissionAtStart: micPermAtStartRef.current,
        audioTracksCount: stream.getAudioTracks().length,
        firstTrackReadyState: stream.getAudioTracks()[0]?.readyState || 'none',
      });

      // Start ultra-compact speech MediaRecorder (8 kbps Opus/AAC -> ~1.0-1.5 KB/s)
      let mediaRecorderActive = false;
      if (typeof MediaRecorder !== 'undefined') {
        try {
          const preferredMime = getSupportedMimeType();
          let recorder: MediaRecorder;
          try {
            const opts: MediaRecorderOptions = { audioBitsPerSecond: 8000 };
            if (preferredMime) opts.mimeType = preferredMime;
            recorder = new MediaRecorder(stream, opts);
          } catch {
            try {
              const optsFallback: MediaRecorderOptions = { audioBitsPerSecond: 12000 };
              if (preferredMime) optsFallback.mimeType = preferredMime;
              recorder = new MediaRecorder(stream, optsFallback);
            } catch {
              recorder = preferredMime
                ? new MediaRecorder(stream, { mimeType: preferredMime })
                : new MediaRecorder(stream);
            }
          }
          recorder.ondataavailable = (event: BlobEvent) => {
            if (event.data && event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          try {
            recorder.start(1000);
          } catch {
            recorder.start();
          }
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
          'Accesso al microfono negato. In Safari/iPhone imposta Microfono su «Consenti» (icona aA nella barra indirizzi o Impostazioni Safari) per non doverlo autorizzare ogni volta.'
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
    const traceId = traceIdRef.current || createTranscribeTraceId();
    const trackStateBeforeStop =
      streamRef.current?.getAudioTracks()[0]?.readyState || 'none';

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

    const micPermissionAtStop = await probeMicPermissionState();
    const diagnostics: MicRecordingDiagnostics = {
      traceId,
      micPermissionAtStart: micPermAtStartRef.current,
      micPermissionAtStop,
      trackStateBeforeStop,
      trackMutedDuringRecord: trackMutedRef.current,
      trackEndedUnexpectedly: trackEndedUnexpectedlyRef.current,
      visibilityChangedDuringRecord: visibilityChangedRef.current,
    };

    logTranscribeEvent(traceId, 'recording_stop', {
      durationSeconds: rawDuration,
      compressedSize: compressedBlob?.size || 0,
      pcmChunksCount: pcmChunks.length,
      ...diagnostics,
    });

    let finalBlob: Blob | null = null;
    let finalMime = compressedMime;

    if (compressedBlob && compressedBlob.size > 512) {
      const compacted = await compactAudioBlob(compressedBlob, rawDuration);
      finalBlob = compacted.blob;
      finalMime = compacted.wasCompacted
        ? compacted.mimeType
        : compressedMime.split(';')[0].trim() || compressedMime;
    } else if (pcmChunks.length > 0) {
      const compactWav = encodeCompactWavMono(pcmChunks, sampleRate);
      if (compactWav.size > 128) {
        finalBlob = compactWav;
        finalMime = 'audio/wav';
      }
    }

    if (!finalBlob) {
      logTranscribeEvent(
        traceId,
        'recording_stop',
        { emptyCapture: true, ...diagnostics },
        'warn'
      );
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
        diagnostics,
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
