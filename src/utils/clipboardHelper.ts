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
