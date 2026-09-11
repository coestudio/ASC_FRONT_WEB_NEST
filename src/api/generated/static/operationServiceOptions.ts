// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/operation/services
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const operationServiceOptions: EnumOptionDTO[] = [
  {
    "value": 10,
    "key": "Bale",
    "name": {
      "pt-BR": "Fardo",
      "en": "Bale",
      "es": "Fardo",
      "zh": "棉包"
    }
  },
  {
    "value": 20,
    "key": "Bag",
    "name": {
      "pt-BR": "Saca",
      "en": "Bag",
      "es": "Saco",
      "zh": "袋装"
    }
  }
];

export const operationServiceOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  operationServiceOptions.map((o) => [o.key, o]),
);

export function resolveOperationServiceLabel(key: string, locale: Locale): string {
  return operationServiceOptionsByKey[key]?.name[locale] ?? key;
}
