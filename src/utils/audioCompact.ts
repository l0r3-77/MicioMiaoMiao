// Ultra-compact client-side speech audio compression utility.
// Preserves already ultra-low-bitrate streams (e.g. 8-16 kbps WebM/Opus ~1-2 KB/s)
// while automatically compacting high-bitrate iOS Safari AAC captures or uploaded files
// into ultra-small mono 8-bit speech WAV so both short and long audio clips stay tiny.

export interface CompactAudioResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  wasCompacted: boolean;
}

export function encodeMono8BitWavFromSamples(
  samples: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): Blob {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  // Gentle auto-gain so low-volume speech remains crystal clear in 8-bit PCM
  const gain = peak > 0.002 && peak < 0.35 ? Math.min(6, 0.55 / peak) : 1;

  const ratio = Math.max(1, inputSampleRate / targetSampleRate);
  const outputLength = Math.max(1, Math.floor(samples.length / ratio));
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
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate, true); // 1 byte per sample
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // 8-bit unsigned PCM
  writeString(36, 'data');
  view.setUint32(40, outputLength, true);

  let writeOffset = 44;
  for (let i = 0; i < outputLength; i++) {
    const startIdx = Math.floor(i * ratio);
    const endIdx = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = startIdx; j < endIdx; j++) {
      sum += samples[j];
      count++;
    }
    const sample =
      (count > 0 ? sum / count : samples[Math.min(samples.length - 1, startIdx)] || 0) * gain;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setUint8(writeOffset, Math.round((clamped + 1) * 127.5));
    writeOffset += 1;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function mixAudioBufferToMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (numChannels <= 1) {
    return audioBuffer.getChannelData(0);
  }
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / numChannels;
    }
  }
  return mono;
}

export async function compactAudioBlob(
  blob: Blob,
  knownDurationSeconds?: number
): Promise<CompactAudioResult> {
  const baseMime = (blob.type || 'audio/mp4').split(';')[0].trim() || 'audio/mp4';
  const safeDuration =
    typeof knownDurationSeconds === 'number' && Number.isFinite(knownDurationSeconds) && knownDurationSeconds > 0
      ? Math.max(1, Math.round(knownDurationSeconds))
      : 1;

  // Skip decoding tiny files already below 40 KB (unless unknown upload bitrate needs inspection)
  if (blob.size <= 40 * 1024 && typeof knownDurationSeconds === 'number') {
    return {
      blob,
      mimeType: baseMime,
      durationSeconds: safeDuration,
      wasCompacted: false,
    };
  }

  // If duration is known and average byte rate is already ultra-low (<= 3.6 KB/s ~= 29 kbps), keep as-is
  if (typeof knownDurationSeconds === 'number' && knownDurationSeconds >= 2) {
    const bytesPerSec = blob.size / knownDurationSeconds;
    if (bytesPerSec <= 3600) {
      return {
        blob,
        mimeType: baseMime,
        durationSeconds: safeDuration,
        wasCompacted: false,
      };
    }
  }

  if (typeof window === 'undefined') {
    return { blob, mimeType: baseMime, durationSeconds: safeDuration, wasCompacted: false };
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return { blob, mimeType: baseMime, durationSeconds: safeDuration, wasCompacted: false };
  }

  let decodeCtx: AudioContext | null = null;
  try {
    decodeCtx = new AudioCtx();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
    const actualDuration = Math.max(1, Math.round(audioBuffer.duration || safeDuration));

    // If decoded bitrate is already <= 3.6 KB/s (e.g. Opus ~1.5 KB/s), keep original smaller stream
    const actualBytesPerSec = blob.size / Math.max(1, audioBuffer.duration || safeDuration);
    if (actualBytesPerSec <= 3600) {
      return {
        blob,
        mimeType: baseMime,
        durationSeconds: actualDuration,
        wasCompacted: false,
      };
    }

    // Choose ultra-low speech sample rate scaling slightly lower for very long recordings (>8 min)
    // Short/medium clips: 6500 Hz (~6.5 KB/s = ~390 KB/min)
    // Long clips (>8 min): 4800 Hz (~4.8 KB/s = ~288 KB/min, keeping 10+ min clips light!)
    const targetRate = actualDuration > 480 ? 4800 : 6500;
    const monoSamples = mixAudioBufferToMono(audioBuffer);
    const compactedWav = encodeMono8BitWavFromSamples(
      monoSamples,
      audioBuffer.sampleRate,
      targetRate
    );

    if (compactedWav.size > 128 && compactedWav.size < blob.size * 0.92) {
      return {
        blob: compactedWav,
        mimeType: 'audio/wav',
        durationSeconds: actualDuration,
        wasCompacted: true,
      };
    }

    return {
      blob,
      mimeType: baseMime,
      durationSeconds: actualDuration,
      wasCompacted: false,
    };
  } catch {
    return {
      blob,
      mimeType: baseMime,
      durationSeconds: safeDuration,
      wasCompacted: false,
    };
  } finally {
    if (decodeCtx) {
      decodeCtx.close().catch(() => {});
    }
  }
}
