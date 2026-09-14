// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/user/types
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const userTypeOptions: EnumOptionDTO[] = [
  {
    "value": 0,
    "key": "Internal",
    "name": {
      "pt-BR": "Interno",
      "en": "Internal",
      "es": "Interno",
      "zh": "内部"
    }
  },
  {
    "value": 1,
    "key": "External",
    "name": {
      "pt-BR": "Externo",
      "en": "External",
      "es": "Externo",
      "zh": "外部"
    }
  }
];

export const userTypeOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  userTypeOptions.map((o) => [o.key, o]),
);

export function resolveUserTypeLabel(key: string, locale: Locale): string {
  return userTypeOptionsByKey[key]?.name[locale] ?? key;
}
