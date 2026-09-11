// Helpers de tema (cookie + DOM). Sem React — o estado reativo vive no
// UiPrefsProvider (src/lib/ui-prefs.tsx). Ver specs/i18n-and-theme.md.

import {
  THEME_STORAGE_KEY,
  THEME_COOKIE_NAME,
  isThemeMode,
  resolveTheme,
  type ThemeMode,
  type ResolvedTheme,
} from "./color-modes";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Lê a escolha de tema do cookie (client-side). `null` se ausente/ inválida. */
export function readThemeCookie(): ThemeMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)asc_theme=([^;]+)/);
  const value = match ? decodeURIComponent(match[1]) : null;
  return isThemeMode(value) ? value : null;
}

export function writeThemeCookie(mode: ThemeMode): void {
  if (typeof document !== "undefined") {
    document.cookie = `${THEME_COOKIE_NAME}=${mode}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* private mode / storage bloqueado */
    }
  }
}

export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-bs-theme", resolved);
  }
}

export { resolveTheme };

/**
 * Script inline (blocking) injetado no <head> pelo __root para acertar
 * `data-bs-theme` antes do primeiro paint — cobre o caso `system` (o SSR não
 * conhece a preferência do SO) e qualquer divergência com o cookie.
 */
export const THEME_NO_FLASH_SCRIPT = `
try {
  var m = (document.cookie.match(/(?:^|;\\s*)asc_theme=([^;]+)/) || [])[1] || "system";
  var dark = m === "dark" || (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
} catch (e) {}
`.trim();
