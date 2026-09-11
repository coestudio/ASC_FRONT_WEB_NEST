import type { Dictionary } from "./dictionaries";

/** Chaves com ponto de um objeto aninhado: "auth.loginTitle", "theme.light"... */
type DeepKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DeepKeys<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DeepKeys<Dictionary>;

export type TranslateParams = Record<string, string | number>;

/**
 * Busca `key` (caminho com ponto) no dicionário e interpola `{param}`.
 * Chave ausente / não-string → devolve a própria key (+ warn em dev).
 */
export function translate(dict: Dictionary, key: TranslationKey, params?: TranslateParams): string {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      node = undefined;
      break;
    }
  }

  if (typeof node !== "string") {
    if (import.meta.env.DEV) console.warn(`[i18n] chave ausente: "${key}"`);
    return key;
  }

  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}
