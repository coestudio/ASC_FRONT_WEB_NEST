// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/operation/types
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const operationTypeOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Stuffing",
    "name": {
      "pt-BR": "Ova de Contêiner",
      "en": "Container Stuffing",
      "es": "Llenado de Contenedor",
      "zh": "集装箱装箱"
    }
  },
  {
    "value": 2,
    "key": "Boarding",
    "name": {
      "pt-BR": "Embarque",
      "en": "Boarding",
      "es": "Embarque",
      "zh": "装运"
    }
  }
];

export const operationTypeOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  operationTypeOptions.map((o) => [o.key, o]),
);

export function resolveOperationTypeLabel(key: string, locale: Locale): string {
  return operationTypeOptionsByKey[key]?.name[locale] ?? key;
}
