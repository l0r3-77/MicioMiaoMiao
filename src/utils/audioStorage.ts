const DB_NAME = 'agendavoce_audio_db';
const STORE_NAME = 'clips';
const DB_VERSION = 1;

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponibile'));
      return;
    }
    const timer = window.setTimeout(() => {
      reject(new Error('Timeout apertura IndexedDB'));
    }, 1500);

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      window.clearTimeout(timer);
      resolve(req.result);
    };
    req.onerror = () => {
      window.clearTimeout(timer);
      reject(req.error);
    };
    req.onblocked = () => {
      window.clearTimeout(timer);
      reject(new Error('IndexedDB bloccato'));
    };
  });
}

export async function saveAudioClip(noteId: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openAudioDB();
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, noteId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error('Timeout scrittura IndexedDB')), 1500)
      ),
    ]);
    db.close();
    return true;
  } catch (err) {
    console.warn('Impossibile salvare la clip audio in IndexedDB:', err);
    return false;
  }
}

export async function getAudioClip(noteId: string): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(noteId);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function deleteAudioClip(noteId: string): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(noteId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}

export async function clearAllAudioClips(): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}

