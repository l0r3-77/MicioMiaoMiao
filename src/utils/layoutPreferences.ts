export type LayoutSectionKey =
  | 'sidebar'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'pinned'
  | 'stats'
  | 'reminders'
  | 'todo_list'
  | 'organize'
  | 'settings';

export interface SectionBlockDefinition {
  id: string;
  label: string;
}

export interface SectionLayoutState {
  order: string[];
  hidden: string[];
}

export type AllLayoutPreferences = Record<LayoutSectionKey, SectionLayoutState>;

const LAYOUT_STORAGE_KEY = 'agendavoce_layout_prefs_v1';

export const SECTION_BLOCKS: Record<LayoutSectionKey, SectionBlockDefinition[]> = {
  sidebar: [
    { id: 'recorder', label: 'Nuovo appunto & Registrazione' },
    { id: 'cat_companion', label: 'Compagno gattino del giorno' },
    { id: 'quick_pinned', label: 'Giornate appuntate rapide' },
    { id: 'pwa_install', label: 'Installa App / Info' },
  ],
  daily: [
    { id: 'daily_controls', label: 'Selezione giorno & Zoom' },
    { id: 'daily_notes', label: 'Nota e appunti della giornata' },
  ],
  weekly: [
    { id: 'weekly_controls', label: 'Intestazione settimana & Zoom' },
    { id: 'weekly_grid', label: 'Colonne dei 7 giorni' },
  ],
  monthly: [
    { id: 'monthly_calendar', label: 'Calendario mensile' },
    { id: 'monthly_day_notes', label: 'Appunti del giorno selezionato' },
  ],
  pinned: [
    { id: 'pinned_summary', label: 'Riepilogo gattino & Appuntate' },
    { id: 'pinned_list', label: 'Elenco giornate appuntate' },
  ],
  stats: [
    { id: 'stats_export', label: 'Esportazione Excel & PDF' },
    { id: 'stats_timeline', label: 'Andamento nel periodo' },
    { id: 'stats_five_dimensions', label: 'Andamento 5 sensazioni nel tempo' },
    { id: 'stats_colors', label: 'Colori & Valenza emotiva' },
    { id: 'stats_hourly', label: 'Orari & Fasce della giornata' },
    { id: 'stats_sensations', label: 'Sensazioni & Correlazioni' },
  ],
  reminders: [
    { id: 'reminders_header', label: 'Intestazione & Filtri promemoria' },
    { id: 'reminders_list', label: 'Blocchi promemoria dagli appunti' },
  ],
  todo_list: [
    { id: 'todo_composer', label: 'Aggiungi nota (Voce / Testo)' },
    { id: 'todo_poi', label: 'Blocco: Poi' },
    { id: 'todo_svaghi', label: 'Blocco: Svaghi' },
    { id: 'todo_bollette', label: 'Blocco: Bollette e pagamenti' },
    { id: 'todo_poi_poi', label: 'Blocco: Poi poi' },
  ],
  organize: [
    { id: 'org_controls', label: 'Barra Azioni & Nuova nota' },
    { id: 'org_calendar', label: 'Calendario verticale (Fasi & Zoom)' },
    { id: 'org_export', label: 'Esporta & Stampa Giornata / Settimana' },
  ],
  settings: [
    { id: 'settings_theme', label: 'Tema scuro / chiaro & Colori separati' },
    { id: 'settings_local_backup', label: 'Download, iCloud / File & Upload JSON' },
    { id: 'settings_preferences', label: 'Preferenze, Layout & Quota AI' },
  ],
};

export function createDefaultSectionLayout(section: LayoutSectionKey): SectionLayoutState {
  return {
    order: SECTION_BLOCKS[section].map((b) => b.id),
    hidden: [],
  };
}

export function createDefaultAllLayouts(): AllLayoutPreferences {
  return {
    sidebar: createDefaultSectionLayout('sidebar'),
    daily: createDefaultSectionLayout('daily'),
    weekly: createDefaultSectionLayout('weekly'),
    monthly: createDefaultSectionLayout('monthly'),
    pinned: createDefaultSectionLayout('pinned'),
    stats: createDefaultSectionLayout('stats'),
    reminders: createDefaultSectionLayout('reminders'),
    todo_list: createDefaultSectionLayout('todo_list'),
    organize: createDefaultSectionLayout('organize'),
    settings: createDefaultSectionLayout('settings'),
  };
}

function sanitizeSectionLayout(
  section: LayoutSectionKey,
  raw?: Partial<SectionLayoutState>
): SectionLayoutState {
  const validIds = SECTION_BLOCKS[section].map((b) => b.id);
  const rawOrder = Array.isArray(raw?.order) ? raw!.order : [];
  const filteredOrder = rawOrder.filter((id) => validIds.includes(id));
  const missing = validIds.filter((id) => !filteredOrder.includes(id));
  const order = [...filteredOrder, ...missing];

  const rawHidden = Array.isArray(raw?.hidden) ? raw!.hidden : [];
  const hidden = rawHidden.filter((id) => validIds.includes(id));
  // Ensure at least 1 block stays visible
  if (hidden.length >= validIds.length) {
    return { order, hidden: [] };
  }
  return { order, hidden };
}

export function loadAllLayoutPreferences(): AllLayoutPreferences {
  const defaults = createDefaultAllLayouts();
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<LayoutSectionKey, Partial<SectionLayoutState>>>;
    return {
      sidebar: sanitizeSectionLayout('sidebar', parsed.sidebar),
      daily: sanitizeSectionLayout('daily', parsed.daily),
      weekly: sanitizeSectionLayout('weekly', parsed.weekly),
      monthly: sanitizeSectionLayout('monthly', parsed.monthly),
      pinned: sanitizeSectionLayout('pinned', parsed.pinned),
      stats: sanitizeSectionLayout('stats', parsed.stats),
      reminders: sanitizeSectionLayout('reminders', parsed.reminders),
      todo_list: sanitizeSectionLayout('todo_list', parsed.todo_list),
      organize: sanitizeSectionLayout('organize', parsed.organize),
      settings: sanitizeSectionLayout('settings', parsed.settings),
    };
  } catch {
    return defaults;
  }
}

export function saveAllLayoutPreferences(prefs: AllLayoutPreferences): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}
