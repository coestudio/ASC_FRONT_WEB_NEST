// Preferência de visualização (Cards/Lista) das listas CRUD compartilhadas
// (src/components/crud/crud-list-page.tsx). Global e única (decisão D3 da
// SPEC-02 — diferente do legado, que tinha override por tela): 1 chave só de
// localStorage pra toda tela. Mesmo padrão de src/styles/globals/theme-store.ts
// (useSyncExternalStore + localStorage, não Zustand).
import { useEffect, useState, useSyncExternalStore } from "react";

export const VIEW_MODE_STORAGE_KEY = "asc:view-mode";

export type ViewMode = "cards" | "list";

const MOBILE_BREAKPOINT_PX = 1024;

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

function isViewMode(value: string | null): value is ViewMode {
  return value === "cards" || value === "list";
}

function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return isViewMode(stored) ? stored : "list";
  } catch {
    return "list";
  }
}

function getServerSnapshot(): ViewMode {
  return "list";
}

function setViewModeValue(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    /* private mode / storage bloqueado */
  }
  emitChange();
}

/** Preferência global de visualização (cards/lista), sem `screenKey` (D3). */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [mode, setViewModeValue];
}

/**
 * Detecta tela pequena (<1024px, inclui tablet) onde cards são ideais e a
 * tabela não cabe.
 *
 * Estado inicial sempre `false` (nunca lê `window.matchMedia` no `useState`
 * inicializador) — o SSR não sabe o viewport real e sempre renderiza `false`;
 * se o inicializador rodasse `matchMedia` de cara no client, a *primeira*
 * renderização do client (antes da hidratação reconciliar) já pegaria o
 * valor real do viewport, divergindo da árvore do servidor sempre que a tela
 * for de fato <1024px — hydration mismatch (`ViewToggle` sumindo/aparecendo
 * na árvore). O valor real só é aplicado depois, no `useEffect` (roda só no
 * client, depois do mount) — 1 render extra, sem mismatch.
 */
export function useIsMobile(breakpointPx: number = MOBILE_BREAKPOINT_PX): boolean {
  const query = `(max-width: ${breakpointPx}px)`;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return isMobile;
}

/** Modo de visualização resolvido (força "cards" no mobile) — único "override" sobre a preferência. */
export function useResponsiveViewMode() {
  const [preferredMode, setViewMode] = useViewMode();
  const isMobile = useIsMobile();
  const viewMode: ViewMode = isMobile ? "cards" : preferredMode;

  return {
    viewMode,
    preferredMode,
    setViewMode,
    isMobile,
  };
}
