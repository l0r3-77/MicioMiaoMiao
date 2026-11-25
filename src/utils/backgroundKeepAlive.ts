// Ref-counted background keep-alive for iOS Safari / mobile browsers
// Keeps microphone recording & AI transcription requests alive when screen turns off.

interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
}

let activeCount = 0;
let activeLabel = 'MicioMiao in esecuzione';
let wakeLock: WakeLockSentinelLike | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;
let silentWavUrl: string | null = null;
let visListenerAttached = false;

function buildSilentWavBlobUrl(): string {
  // 1 second of 8kHz mono 8-bit silent PCM WAV (bytes = 0x80)
  const sampleRate = 8000;
  const dataSize = sampleRate;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

async function acquireWakeLock() {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as unknown as {
    wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
  };
  if (!nav.wakeLock?.request) return;
  try {
    if (!wakeLock || wakeLock.released) {
      wakeLock = await nav.wakeLock.request('screen');
    }
  } catch {
    // Wake lock not permitted or unsupported; silent audio keep-alive still applies
  }
}

function updateMediaSession(title: string, playing: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const ms = navigator.mediaSession;
    if (playing) {
      if (typeof MediaMetadata !== 'undefined') {
        ms.metadata = new MediaMetadata({
          title,
          artist: 'MicioMiao',
          album: 'Note vocali',
        });
      }
      ms.playbackState = 'playing';
    } else {
      ms.playbackState = 'none';
    }
  } catch {
    // ignore MediaSession errors
  }
}

function ensureAudioPlaying() {
  if (typeof document === 'undefined') return;
  try {
    if (!silentWavUrl) {
      silentWavUrl = buildSilentWavBlobUrl();
    }
    if (!keepAliveAudio) {
      const audio = document.createElement('audio');
      audio.src = silentWavUrl;
      audio.loop = true;
      audio.preload = 'auto';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.volume = 0.01;
      keepAliveAudio = audio;
    }
    if (keepAliveAudio.paused) {
      void keepAliveAudio.play().catch(() => {});
    }
  } catch {
    // ignore playback errors
  }
}

function onVisibilityChange() {
  if (activeCount > 0 && document.visibilityState === 'visible') {
    void acquireWakeLock();
    ensureAudioPlaying();
  }
}

export function startBackgroundSession(label: string): () => void {
  activeCount += 1;
  activeLabel = label;

  if (typeof document !== 'undefined' && !visListenerAttached) {
    document.addEventListener('visibilitychange', onVisibilityChange);
    visListenerAttached = true;
  }

  void acquireWakeLock();
  ensureAudioPlaying();
  updateMediaSession(activeLabel, true);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount === 0) {
      if (keepAliveAudio) {
        try {
          keepAliveAudio.pause();
          keepAliveAudio.currentTime = 0;
        } catch {
          // ignore
        }
      }
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
      updateMediaSession('', false);
    }
  };
}
