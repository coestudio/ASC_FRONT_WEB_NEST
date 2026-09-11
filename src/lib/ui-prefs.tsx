import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";

import {
  isThemeMode,
  resolveTheme,
  systemPrefersDark,
  type ResolvedTheme,
  type ThemeMode,
} from "@/styles/globals/color-modes";
import {
  readThemeCookie,
  writeThemeCookie,
  applyThemeToDocument,
} from "@/styles/globals/theme-store";
import {
  LOCALE_COOKIE_NAME,
  defaultLocale,
  isLocale,
  negotiateLocale,
  type Locale,
} from "@/i18n/config";
import { dictionaries, type Dictionary } from "@/i18n/dictionaries";
import { translate, type TranslateParams, type TranslationKey } from "@/i18n/translate";

/**
 * Preferências de UI (tema + idioma). Resolvidas no servidor a partir de
 * cookie / Accept-Language, semeadas via `__root` no contexto do router,
 * e mantidas no client por este provider. Ver specs/i18n-and-theme.md.
 */

export interface UiPrefs {
  themeMode: ThemeMode;
  locale: Locale;
}

/** Lê as preferências no ambiente atual (server: request; client: cookie). */
export const readUiPrefs = createIsomorphicFn()
  .server((): UiPrefs => {
    const cookieTheme = getCookie("asc_theme");
    const cookieLocale = getCookie(LOCALE_COOKIE_NAME);
    return {
      themeMode: isThemeMode(cookieTheme) ? cookieTheme : "system",
      locale: isLocale(cookieLocale)
        ? cookieLocale
        : negotiateLocale(getRequestHeader("accept-language")),
    };
  })
  .client((): UiPrefs => {
    const cookieLocale = document.cookie.match(/(?:^|;\s*)asc_locale=([^;]+)/)?.[1];
    return {
      themeMode: readThemeCookie() ?? "system",
      locale: isLocale(cookieLocale && decodeURIComponent(cookieLocale))
        ? (decodeURIComponent(cookieLocale!) as Locale)
        : defaultLocale,
    };
  });

interface UiPrefsContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const UiPrefsContext = createContext<UiPrefsContextValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

export function UiPrefsProvider({ initial, children }: { initial: UiPrefs; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial.locale);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initial.themeMode);
  const [systemDark, setSystemDark] = useState(false);

  // Reatividade a `prefers-color-scheme` quando mode === "system".
  useEffect(() => {
    setSystemDark(systemPrefersDark());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme =
    themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  // Mantém <html data-bs-theme> e <html lang> em sincronia.
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Sincronia entre abas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme") setThemeModeState(readThemeCookie() ?? "system");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    writeThemeCookie(mode);
    setThemeModeState(mode);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
    setLocaleState(next);
  }, []);

  const value = useMemo<UiPrefsContextValue>(
    () => ({
      locale,
      dict: dictionaries[locale],
      setLocale,
      themeMode,
      resolvedTheme,
      setThemeMode,
    }),
    [locale, setLocale, themeMode, resolvedTheme, setThemeMode],
  );

  return <UiPrefsContext.Provider value={value}>{children}</UiPrefsContext.Provider>;
}

function useUiPrefs(): UiPrefsContextValue {
  const ctx = useContext(UiPrefsContext);
  if (!ctx) throw new Error("useUiPrefs fora do <UiPrefsProvider> (ver __root).");
  return ctx;
}

// ── i18n ──────────────────────────────────────────────────────────────
export function useLocale(): Locale {
  return useUiPrefs().locale;
}

export function useSetLocale(): (locale: Locale) => void {
  return useUiPrefs().setLocale;
}

/** `t("auth.loginTitle")` · `t("home.welcome", { email })` */
export function useT(): (key: TranslationKey, params?: TranslateParams) => string {
  const { dict } = useUiPrefs();
  return useCallback((key, params) => translate(dict, key, params), [dict]);
}

// ── tema ──────────────────────────────────────────────────────────────
export function useThemeMode(): ThemeMode {
  return useUiPrefs().themeMode;
}

export function useResolvedTheme(): ResolvedTheme {
  return useUiPrefs().resolvedTheme;
}

export function useSetThemeMode(): (mode: ThemeMode) => void {
  return useUiPrefs().setThemeMode;
}

export { resolveTheme };
