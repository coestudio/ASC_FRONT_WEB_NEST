// Store de tema (localStorage + pub/sub via useSyncExternalStore) usada por
// TODOS os controles de tema do app — hoje o ThemeToggle
// (src/components/theme/theme-toggle.tsx) e o submenu "Preferências > Tema"
// do menu de usuário do AppShell (src/components/shell/user-menu.tsx). É
// importante que ambos importem os mesmos `useThemeMode`/`setThemeMode`
// daqui (mesmo módulo = mesmo Set de listeners), garantindo uma única fonte
// de verdade sincronizada mesmo entre os dois controles quando ambos
// estão montados na mesma página.
//
// Separado de ./color-modes.ts (que é importado por um Server Component
// só pelas constantes/tipos) porque este arquivo usa hooks do React —
// precisa da boundary "use client".
"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  THEME_COOKIE_NAME,
  type ThemeMode,
} from "./color-modes";

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): ThemeMode {
  return (
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "light"
  );
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(mode)}; path=/; max-age=31536000; SameSite=Lax`;
  emitChange();
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-bs-theme", resolveTheme(mode));
}

/**
 * Aplica o tema atual no <html>. Chamado uma única vez no AppShell (montado
 * em toda página logada) — funciona independentemente de o ThemeToggle
 * "solto" estar renderizado na página ou não.
 */
export function useSyncThemeToDocument(mode: ThemeMode) {
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);
}
