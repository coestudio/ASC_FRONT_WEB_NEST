// Preferência de visualização (Cards/Lista). Ainda sem consumidor real —
// só o mecanismo de leitura/escrita/persistência, pronto pra outras telas
// usarem depois. Mesmo padrão de src/styles/globals/color-modes.ts
// (useSyncExternalStore + localStorage é o padrão do projeto pra
// preferências de UI persistidas no cliente — não Zustand).
"use client";

import { useSyncExternalStore } from "react";

export const VIEW_MODE_STORAGE_KEY = "viewMode";

export type ViewMode = "cards" | "list";

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
  return (
    (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null) ?? "cards"
  );
}

function getServerSnapshot(): ViewMode {
  return "cards";
}

export function setViewMode(mode: ViewMode) {
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  emitChange();
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
