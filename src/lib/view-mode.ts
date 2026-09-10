// Preferência de visualização (Cards/Lista). Ainda sem consumidor real —
// só o mecanismo de leitura/escrita/persistência, pronto pra outras telas
// usarem depois. Mesmo padrão de src/styles/globals/color-modes.ts
// (useSyncExternalStore + localStorage é o padrão do projeto pra
// preferências de UI persistidas no cliente — não Zustand).
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export const VIEW_MODE_STORAGE_KEY = "viewMode";

export type ViewMode = "cards" | "list";

const MOBILE_BREAKPOINT_PX = 767.98;

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

function getSnapshot(): ViewMode {
  return (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null) ?? "list";
}

function getServerSnapshot(): ViewMode {
  return "list";
}

export function setViewMode(mode: ViewMode) {
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  emitChange();
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Detecta tela pequena (<768px) onde cards são ideais e a tabela não cabe. */
export function useIsMobile(breakpointPx: number = MOBILE_BREAKPOINT_PX): boolean {
  const query = `(max-width: ${breakpointPx}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return isMobile;
}

/** Retorna o modo de visualização resolvido (força "cards" no mobile) e o estado isMobile. */
export function useResponsiveViewMode() {
  const preferredMode = useViewMode();
  const isMobile = useIsMobile();
  const currentMode: ViewMode = isMobile ? "cards" : preferredMode;

  return {
    viewMode: currentMode,
    preferredMode,
    setViewMode,
    isMobile,
  };
}
