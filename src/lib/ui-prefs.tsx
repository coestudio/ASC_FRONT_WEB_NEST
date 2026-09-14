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
import { DEFAULT_BRAND, isBrand, type Brand } from "@/styles/globals/brand";
import {
  readThemeCookie,
  writeThemeCookie,
  applyThemeToDocument,
  readBrandCookie,
  writeBrandCookie,
  applyBrandToDocument,
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
 * Preferências de UI (tema + idioma + brand). Resolvidas no servidor a
 * partir de cookie / Accept-Language, semeadas via `__root` no contexto do
 * router, e mantidas no client por este provider. Brand e modo são
 * dimensões ortogonais — ver specs/01-brand-theming/spec.md.
 */

export interface UiPrefs {
  themeMode: ThemeMode;
  locale: Locale;
  brand: Brand;
}

/** Lê as preferências no ambiente atual (server: request; client: cookie). */
export const readUiPrefs = createIsomorphicFn()
  .server((): UiPrefs => {
    const cookieTheme = getCookie("asc_theme");
    const cookieLocale = getCookie(LOCALE_COOKIE_NAME);
    const cookieBrand = getCookie("asc_brand");
    return {
      themeMode: isThemeMode(cookieTheme) ? cookieTheme : "system",
      locale: isLocale(cookieLocale)
        ? cookieLocale
        : negotiateLocale(getRequestHeader("accept-language")),
      brand: isBrand(cookieBrand) ? cookieBrand : DEFAULT_BRAND,
    };
  })
  .client((): UiPrefs => {
    const cookieLocale = document.cookie.match(/(?:^|;\s*)asc_locale=([^;]+)/)?.[1];
    return {
      themeMode: readThemeCookie() ?? "system",
      locale: isLocale(cookieLocale && decodeURIComponent(cookieLocale))
        ? (decodeURIComponent(cookieLocale!) as Locale)
        : defaultLocale,
      brand: readBrandCookie() ?? DEFAULT_BRAND,
    };
  });

interface UiPrefsContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  brand: Brand;
  setBrand: (brand: Brand) => void;
}

const UiPrefsContext = createContext<UiPrefsContextValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

export function UiPrefsProvider({ initial, children }: { initial: UiPrefs; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial.locale);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initial.themeMode);
  const [brand, setBrandState] = useState<Brand>(initial.brand);
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

  // Mantém <html data-bs-theme>, <html data-brand> e <html lang> em sincronia.
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);
  useEffect(() => {
    applyBrandToDocument(brand);
  }, [brand]);
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

  const setBrand = useCallback((next: Brand) => {
    writeBrandCookie(next);
    setBrandState(next);
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
      brand,
      setBrand,
    }),
    [locale, setLocale, themeMode, resolvedTheme, setThemeMode, brand, setBrand],
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

// ── brand ─────────────────────────────────────────────────────────────
export function useBrand(): Brand {
  return useUiPrefs().brand;
}

export function useSetBrand(): (brand: Brand) => void {
  return useUiPrefs().setBrand;
}

export { resolveTheme };
