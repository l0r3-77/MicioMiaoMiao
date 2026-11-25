import type { AppColorPreset, AppSettings, ThemeMode, TodoColorPreset } from './appSettings';

export interface AppThemeTokens {
  bg: string;
  bgSoft: string;
  headerBg: string;
  card: string;
  cardAlt: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentSoftBorder: string;
  accentText: string;
  buttonBg: string;
  buttonBgHover: string;
  buttonText: string;
  companionBg: string;
  companionBorder: string;
  divider: string;
}

export interface TodoThemeTokens {
  shellFrom: string;
  shellVia: string;
  shellTo: string;
  shellBorder: string;
  card: string;
  cardBorder: string;
  surface: string;
  surfaceAlt: string;
  dayBg: string;
  dayTodayBg: string;
  dayTodayBorder: string;
  /** Strictly ONE lighter shade of the SAME background hue as dayBg */
  phasePopulatedBg: string;
  phaseBorder: string;
  noteBg: string;
  noteBorder: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  chipBorder: string;
}

export interface AppColorPresetOption {
  id: Exclude<AppColorPreset, 'custom'>;
  label: string;
  swatch: string;
  darkSwatch: string;
}

export interface TodoColorPresetOption {
  id: Exclude<TodoColorPreset, 'custom'>;
  label: string;
  swatch: string;
  darkSwatch: string;
}

export const APP_COLOR_PRESET_OPTIONS: AppColorPresetOption[] = [
  { id: 'default', label: 'Crema & Viola', swatch: '#FAF7F0', darkSwatch: '#1E1B24' },
  { id: 'sky', label: 'Cielo', swatch: '#E8F4FD', darkSwatch: '#112030' },
  { id: 'rose', label: 'Rosa antico', swatch: '#FCEEF2', darkSwatch: '#28151D' },
  { id: 'sage', label: 'Salvia', swatch: '#EAF5ED', darkSwatch: '#13241A' },
  { id: 'sand', label: 'Sabbia calda', swatch: '#F9EFE0', darkSwatch: '#251D13' },
];

export const TODO_COLOR_PRESET_OPTIONS: TodoColorPresetOption[] = [
  { id: 'default', label: 'Verdino acqua', swatch: '#CCF3EC', darkSwatch: '#0D2D29' },
  { id: 'ocean', label: 'Blu oceano', swatch: '#D6EEFC', darkSwatch: '#0F2538' },
  { id: 'mint', label: 'Menta fresca', swatch: '#D6F7DF', darkSwatch: '#102B1A' },
  { id: 'lavender', label: 'Lavanda', swatch: '#EAE3FD', darkSwatch: '#211938' },
  { id: 'peach', label: 'Pesca morbida', swatch: '#FDE8D7', darkSwatch: '#2E1B12' },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (!Number.isFinite(num)) return { r: 126, g: 34, b: 206 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) {
    r = c;
    g = x;
  } else if (hn < 120) {
    r = x;
    g = c;
  } else if (hn < 180) {
    g = c;
    b = x;
  } else if (hn < 240) {
    g = x;
    b = c;
  } else if (hn < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    clamp(Math.round((v + m) * 255), 0, 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildAppTokens(preset: AppColorPreset, customHex: string, dark: boolean): AppThemeTokens {
  if (preset === 'default') {
    if (!dark) {
      return {
        bg: '#FAF7F0',
        bgSoft: '#F3EFE4',
        headerBg: 'rgba(250, 247, 240, 0.92)',
        card: '#FFFFFF',
        cardAlt: '#FAF7F0',
        border: 'rgba(28, 25, 23, 0.12)',
        borderSoft: '#E7E5E4',
        text: '#1C1917',
        textMuted: '#57534E',
        textSubtle: '#78716C',
        accent: '#7E22CE',
        accentHover: '#6B21A8',
        accentSoft: '#F3E8FF',
        accentSoftBorder: '#E9D5FF',
        accentText: '#6B21A8',
        buttonBg: '#1C1917',
        buttonBgHover: '#292524',
        buttonText: '#FFFFFF',
        companionBg: '#FAF5E8',
        companionBorder: 'rgba(216, 180, 254, 0.8)',
        divider: '#F5F5F4',
      };
    }
    return {
      bg: '#141218',
      bgSoft: '#1B1822',
      headerBg: 'rgba(20, 18, 24, 0.92)',
      card: '#1E1B24',
      cardAlt: '#26222E',
      border: 'rgba(245, 245, 244, 0.13)',
      borderSoft: '#353040',
      text: '#F5F5F4',
      textMuted: '#D6D3D1',
      textSubtle: '#A8A29E',
      accent: '#C084FC',
      accentHover: '#D8B4FE',
      accentSoft: 'rgba(168, 85, 247, 0.2)',
      accentSoftBorder: 'rgba(192, 132, 252, 0.45)',
      accentText: '#E9D5FF',
      buttonBg: '#E7E5E4',
      buttonBgHover: '#FFFFFF',
      buttonText: '#141218',
      companionBg: '#27222D',
      companionBorder: 'rgba(192, 132, 252, 0.32)',
      divider: '#2E2938',
    };
  }

  const presetBaseHex: Record<Exclude<AppColorPreset, 'default' | 'custom'>, string> = {
    sky: '#0284C7',
    rose: '#E11D48',
    sage: '#15803D',
    sand: '#B45309',
  };

  const baseHex = preset === 'custom' ? customHex : presetBaseHex[preset];
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s } = rgbToHsl(r, g, b);
  const satSoft = clamp(s, 18, 55);
  const satVivid = clamp(s, 52, 82);

  if (!dark) {
    return {
      bg: hslToHex(h, clamp(satSoft * 0.65, 16, 48), 96),
      bgSoft: hslToHex(h, clamp(satSoft * 0.7, 18, 52), 92),
      headerBg: `${hslToHex(h, clamp(satSoft * 0.65, 16, 48), 96)}eb`,
      card: '#FFFFFF',
      cardAlt: hslToHex(h, clamp(satSoft * 0.55, 14, 42), 97),
      border: 'rgba(28, 25, 23, 0.13)',
      borderSoft: hslToHex(h, clamp(satSoft * 0.6, 16, 44), 86),
      text: '#1C1917',
      textMuted: '#44403C',
      textSubtle: '#78716C',
      accent: hslToHex(h, satVivid, 42),
      accentHover: hslToHex(h, satVivid, 35),
      accentSoft: hslToHex(h, clamp(satVivid * 0.85, 35, 80), 93),
      accentSoftBorder: hslToHex(h, clamp(satVivid * 0.7, 30, 70), 82),
      accentText: hslToHex(h, satVivid, 32),
      buttonBg: hslToHex(h, clamp(satVivid * 0.65, 20, 62), 20),
      buttonBgHover: hslToHex(h, clamp(satVivid * 0.65, 20, 62), 28),
      buttonText: '#FFFFFF',
      companionBg: hslToHex(h, clamp(satSoft * 0.75, 22, 55), 95),
      companionBorder: hslToHex(h, clamp(satSoft * 0.7, 22, 55), 82),
      divider: hslToHex(h, clamp(satSoft * 0.4, 12, 30), 92),
    };
  }

  return {
    bg: hslToHex(h, clamp(satSoft * 0.55, 14, 34), 10),
    bgSoft: hslToHex(h, clamp(satSoft * 0.55, 14, 36), 14),
    headerBg: `${hslToHex(h, clamp(satSoft * 0.55, 14, 34), 10)}eb`,
    card: hslToHex(h, clamp(satSoft * 0.5, 14, 32), 15),
    cardAlt: hslToHex(h, clamp(satSoft * 0.5, 14, 32), 19),
    border: 'rgba(245, 245, 244, 0.14)',
    borderSoft: hslToHex(h, clamp(satSoft * 0.45, 14, 30), 26),
    text: '#F5F5F4',
    textMuted: '#D6D3D1',
    textSubtle: '#A8A29E',
    accent: hslToHex(h, clamp(satVivid, 55, 85), 72),
    accentHover: hslToHex(h, clamp(satVivid, 55, 85), 79),
    accentSoft: hslToHex(h, clamp(satVivid * 0.6, 22, 45), 22),
    accentSoftBorder: hslToHex(h, clamp(satVivid * 0.65, 28, 55), 38),
    accentText: hslToHex(h, clamp(satVivid, 55, 85), 82),
    buttonBg: hslToHex(h, clamp(satVivid, 48, 82), 76),
    buttonBgHover: hslToHex(h, clamp(satVivid, 48, 82), 84),
    buttonText: '#111827',
    companionBg: hslToHex(h, clamp(satSoft * 0.52, 16, 34), 17),
    companionBorder: hslToHex(h, clamp(satSoft * 0.6, 20, 44), 34),
    divider: hslToHex(h, clamp(satSoft * 0.45, 14, 30), 23),
  };
}

function buildTodoTokens(preset: TodoColorPreset, customHex: string, dark: boolean): TodoThemeTokens {
  if (preset === 'default') {
    if (!dark) {
      return {
        shellFrom: '#CCF3EC',
        shellVia: '#E5FAF6',
        shellTo: '#B7ECE2',
        shellBorder: '#74C4B6',
        card: '#F7FEFC',
        cardBorder: '#7ECBBF',
        surface: '#EDFBF8',
        surfaceAlt: '#E5F9F4',
        dayBg: '#E1F6F1',
        dayTodayBg: '#CEEFE8',
        dayTodayBorder: '#0E8A7E',
        // Strictly one lighter shade of the SAME background hue as dayBg:
        phasePopulatedBg: '#F4FCFA',
        phaseBorder: '#B6E6DD',
        noteBg: '#F9FEFD',
        noteBorder: '#9BDCD1',
        accent: '#0E8A7E',
        accentDark: '#0B5B53',
        accentSoft: '#D8F4EE',
        text: '#083B37',
        textMuted: '#0E645D',
        chipBorder: '#7ECBBF',
      };
    }
    return {
      shellFrom: '#082220',
      shellVia: '#0C2D2A',
      shellTo: '#071C1A',
      shellBorder: '#1E5E57',
      card: '#0F332F',
      cardBorder: '#246B63',
      surface: '#123B37',
      surfaceAlt: '#15443F',
      dayBg: '#103531',
      dayTodayBg: '#154640',
      dayTodayBorder: '#2DD4BF',
      // Strictly one lighter shade of the SAME background hue as dayBg:
      phasePopulatedBg: '#184A44',
      phaseBorder: '#266E65',
      noteBg: '#1C534C',
      noteBorder: '#2E7D73',
      accent: '#2DD4BF',
      accentDark: '#14B8A6',
      accentSoft: '#164943',
      text: '#ECFDF5',
      textMuted: '#99F6E4',
      chipBorder: '#2D7D74',
    };
  }

  const presetBaseHex: Record<Exclude<TodoColorPreset, 'default' | 'custom'>, string> = {
    ocean: '#0284C7',
    mint: '#059669',
    lavender: '#7C3AED',
    peach: '#EA580C',
  };

  const baseHex = preset === 'custom' ? customHex : presetBaseHex[preset];
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s } = rgbToHsl(r, g, b);
  const satBg = clamp(s, 26, 62);
  const satAccent = clamp(s, 54, 84);

  if (!dark) {
    return {
      shellFrom: hslToHex(h, satBg, 86),
      shellVia: hslToHex(h, satBg, 92),
      shellTo: hslToHex(h, satBg, 82),
      shellBorder: hslToHex(h, satBg, 62),
      card: hslToHex(h, clamp(satBg * 0.7, 20, 50), 98),
      cardBorder: hslToHex(h, satBg, 68),
      surface: hslToHex(h, satBg, 95),
      surfaceAlt: hslToHex(h, satBg, 91),
      dayBg: hslToHex(h, satBg, 90),
      dayTodayBg: hslToHex(h, satBg, 85),
      dayTodayBorder: hslToHex(h, satAccent, 38),
      // Strictly ONE lighter lightness shade (+6% L) of the SAME hue as dayBg:
      phasePopulatedBg: hslToHex(h, satBg, 96),
      phaseBorder: hslToHex(h, satBg, 78),
      noteBg: hslToHex(h, clamp(satBg * 0.6, 18, 45), 98),
      noteBorder: hslToHex(h, satBg, 73),
      accent: hslToHex(h, satAccent, 38),
      accentDark: hslToHex(h, satAccent, 26),
      accentSoft: hslToHex(h, satBg, 88),
      text: hslToHex(h, clamp(satAccent, 38, 72), 16),
      textMuted: hslToHex(h, clamp(satAccent * 0.85, 30, 62), 29),
      chipBorder: hslToHex(h, satBg, 66),
    };
  }

  return {
    shellFrom: hslToHex(h, clamp(satBg * 0.62, 18, 42), 11),
    shellVia: hslToHex(h, clamp(satBg * 0.62, 18, 42), 14),
    shellTo: hslToHex(h, clamp(satBg * 0.62, 18, 42), 9),
    shellBorder: hslToHex(h, clamp(satBg * 0.65, 22, 48), 28),
    card: hslToHex(h, clamp(satBg * 0.58, 18, 40), 16),
    cardBorder: hslToHex(h, clamp(satBg * 0.65, 22, 48), 31),
    surface: hslToHex(h, clamp(satBg * 0.58, 18, 40), 19),
    surfaceAlt: hslToHex(h, clamp(satBg * 0.58, 18, 40), 22),
    dayBg: hslToHex(h, clamp(satBg * 0.58, 18, 40), 17),
    dayTodayBg: hslToHex(h, clamp(satBg * 0.62, 20, 44), 21),
    dayTodayBorder: hslToHex(h, satAccent, 62),
    // Strictly ONE lighter lightness shade (+6% L) of the SAME hue as dayBg:
    phasePopulatedBg: hslToHex(h, clamp(satBg * 0.58, 18, 40), 23),
    phaseBorder: hslToHex(h, clamp(satBg * 0.6, 20, 44), 32),
    noteBg: hslToHex(h, clamp(satBg * 0.55, 18, 38), 26),
    noteBorder: hslToHex(h, clamp(satBg * 0.62, 20, 45), 36),
    accent: hslToHex(h, satAccent, 65),
    accentDark: hslToHex(h, satAccent, 52),
    accentSoft: hslToHex(h, clamp(satBg * 0.58, 20, 42), 23),
    text: hslToHex(h, clamp(satBg * 0.5, 16, 45), 94),
    textMuted: hslToHex(h, clamp(satBg * 0.7, 25, 65), 77),
    chipBorder: hslToHex(h, clamp(satBg * 0.62, 20, 46), 34),
  };
}

export function resolveEffectiveDarkMode(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyThemeToDocument(settings: AppSettings): boolean {
  const isDark = resolveEffectiveDarkMode(settings.themeMode);
  if (typeof document === 'undefined') return isDark;

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const appTokens = buildAppTokens(settings.appColorPreset, settings.appCustomColor, isDark);
  const todoTokens = buildTodoTokens(settings.todoColorPreset, settings.todoCustomColor, isDark);

  const vars: Record<string, string> = {
    '--app-bg': appTokens.bg,
    '--app-bg-soft': appTokens.bgSoft,
    '--app-header-bg': appTokens.headerBg,
    '--app-card': appTokens.card,
    '--app-card-alt': appTokens.cardAlt,
    '--app-border': appTokens.border,
    '--app-border-soft': appTokens.borderSoft,
    '--app-text': appTokens.text,
    '--app-text-muted': appTokens.textMuted,
    '--app-text-subtle': appTokens.textSubtle,
    '--app-accent': appTokens.accent,
    '--app-accent-hover': appTokens.accentHover,
    '--app-accent-soft': appTokens.accentSoft,
    '--app-accent-soft-border': appTokens.accentSoftBorder,
    '--app-accent-text': appTokens.accentText,
    '--app-btn-bg': appTokens.buttonBg,
    '--app-btn-bg-hover': appTokens.buttonBgHover,
    '--app-btn-text': appTokens.buttonText,
    '--app-companion-bg': appTokens.companionBg,
    '--app-companion-border': appTokens.companionBorder,
    '--app-divider': appTokens.divider,

    '--todo-shell-from': todoTokens.shellFrom,
    '--todo-shell-via': todoTokens.shellVia,
    '--todo-shell-to': todoTokens.shellTo,
    '--todo-shell-border': todoTokens.shellBorder,
    '--todo-card': todoTokens.card,
    '--todo-card-border': todoTokens.cardBorder,
    '--todo-surface': todoTokens.surface,
    '--todo-surface-alt': todoTokens.surfaceAlt,
    '--todo-day-bg': todoTokens.dayBg,
    '--todo-day-today-bg': todoTokens.dayTodayBg,
    '--todo-day-today-border': todoTokens.dayTodayBorder,
    '--todo-phase-populated-bg': todoTokens.phasePopulatedBg,
    '--todo-phase-border': todoTokens.phaseBorder,
    '--todo-note-bg': todoTokens.noteBg,
    '--todo-note-border': todoTokens.noteBorder,
    '--todo-accent': todoTokens.accent,
    '--todo-accent-dark': todoTokens.accentDark,
    '--todo-accent-soft': todoTokens.accentSoft,
    '--todo-text': todoTokens.text,
    '--todo-text-muted': todoTokens.textMuted,
    '--todo-chip-border': todoTokens.chipBorder,
  };

  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', appTokens.bg);
  }

  return isDark;
}

export function subscribeSystemThemeChanges(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}
