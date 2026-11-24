export interface ClipboardReadResult {
  text: string | null;
  reason?: 'empty' | 'blocked';
}

/**
 * Attempts to read text from the system clipboard directly inside a user-gesture click.
 * Never throws: distinguishes empty clipboard vs browser/iframe permission block.
 */
export async function readClipboardTextDirect(): Promise<ClipboardReadResult> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim().length > 0) {
        return { text: clip };
      }
      return { text: null, reason: 'empty' };
    } catch {
      return { text: null, reason: 'blocked' };
    }
  }
  return { text: null, reason: 'blocked' };
}

/**
 * Strict 1-line = 1-note parser.
 * Never splits a single line containing multiple activities (e.g. commas, "e", semicolons)
 * into multiple rows: keeps everything written on one line together on that single row.
 */
export function parsePastedLinesSingleRow(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-•*–—]|(?:\d+[.)])|\[[ xX]?\])\s*/, '')
        .trim()
    )
    .filter((line) => line.length > 0)
    .slice(0, 60);
}

/**
 * Copies plain text to the system clipboard inside a user-gesture click.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to textarea fallback
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}
