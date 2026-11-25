export async function parseApiJsonSafe<T extends Record<string, unknown>>(
  response: Response
): Promise<T & { error?: string }> {
  const raw = await response.text();
  if (!raw) {
    return {} as T & { error?: string };
  }
  try {
    return JSON.parse(raw) as T & { error?: string };
  } catch {
    const trimmed = raw.trim();
    const looksLikeNotFound =
      response.status === 404 ||
      /NOT_FOUND|page could not be found|<!doctype|<html/i.test(trimmed);
    if (looksLikeNotFound) {
      return {
        error:
          'Servizio di analisi AI temporaneamente non raggiungibile (404). Ricarica la pagina o riprova tra qualche secondo.',
      } as T & { error?: string };
    }
    return {
      error: trimmed.slice(0, 220) || `Errore HTTP ${response.status}`,
    } as T & { error?: string };
  }
}
