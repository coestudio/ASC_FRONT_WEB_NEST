import "server-only";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import type ptBR from "./dictionaries/pt-BR.json";

export type Dictionary = typeof ptBR;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  "pt-BR": () => import("./dictionaries/pt-BR.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
};

export async function getDictionary(lang: string): Promise<Dictionary> {
  if (!isLocale(lang)) notFound();
  return dictionaries[lang]();
}
