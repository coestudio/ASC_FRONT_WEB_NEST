// Constantes/tipos puros para o store de tema (client-side).
// Sem hooks aqui — ver ./theme-store.ts para a store com "use client".

export const THEME_STORAGE_KEY = "theme";
export const THEME_COOKIE_NAME = "theme";

export type ThemeMode = "light" | "dark";
