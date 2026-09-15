// Constantes/tipos puros para o tema (client-side).
// Sem hooks aqui — ver src/lib/ui-prefs.tsx para o provider.

export const THEME_STORAGE_KEY = "theme";
export const THEME_COOKIE_NAME = "asc_theme";

/** Escolha do usuário. */
export type ThemeMode = "light" | "dark" | "system";

/** Tema efetivamente aplicado (`system` já resolvido). */
export type ResolvedTheme = "light" | "dark";

export const isThemeMode = (v: string | null | undefined): v is ThemeMode =>
  v === "light" || v === "dark" || v === "system";

/** Media query de preferência do SO (só faz sentido no client). */
export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}
