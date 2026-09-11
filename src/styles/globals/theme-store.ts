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
import { BRAND_COOKIE_NAME, DEFAULT_BRAND, isBrand, type Brand } from "./brand";

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

/** Lê a brand ativa do cookie (client-side). `null` se ausente/inválida. */
export function readBrandCookie(): Brand | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)asc_brand=([^;]+)/);
  const value = match ? decodeURIComponent(match[1]) : null;
  return isBrand(value) ? value : null;
}

export function writeBrandCookie(brand: Brand): void {
  if (typeof document !== "undefined") {
    document.cookie = `${BRAND_COOKIE_NAME}=${brand}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  }
}

export function applyBrandToDocument(brand: Brand): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-brand", brand);
  }
}

/**
 * Script inline (blocking) injetado no <head> pelo __root para acertar
 * `data-brand`/`data-bs-theme` antes do primeiro paint — cobre o caso
 * `system` (o SSR não conhece a preferência do SO) e qualquer divergência
 * com o cookie. `data-brand` já vem certo do SSR na maioria dos casos; o
 * script só reforça (defesa contra cache/edge servindo HTML desatualizado).
 */
export const THEME_NO_FLASH_SCRIPT = `
try {
  var ck = document.cookie;
  var brand = (ck.match(/(?:^|;\\s*)asc_brand=([^;]+)/) || [])[1] || "${DEFAULT_BRAND}";
  if (brand !== "asa" && brand !== "asi" && brand !== "asc") brand = "${DEFAULT_BRAND}";
  document.documentElement.setAttribute("data-brand", brand);
  var m = (ck.match(/(?:^|;\\s*)asc_theme=([^;]+)/) || [])[1] || "system";
  var dark = m === "dark" || (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
} catch (e) {}
`.trim();
