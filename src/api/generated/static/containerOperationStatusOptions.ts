// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/container/operation-statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const containerOperationStatusOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Empty",
    "name": {
      "pt-BR": "Vazio",
      "en": "Empty",
      "es": "Vacío",
      "zh": "空箱"
    }
  },
  {
    "value": 2,
    "key": "Stuffing",
    "name": {
      "pt-BR": "Em Ova",
      "en": "Stuffing",
      "es": "En Llenado",
      "zh": "装箱中"
    }
  },
  {
    "value": 3,
    "key": "Stuffed",
    "name": {
      "pt-BR": "Ovado",
      "en": "Stuffed",
      "es": "Llenado",
      "zh": "已装箱"
    }
  },
  {
    "value": 4,
    "key": "Shipped",
    "name": {
      "pt-BR": "Embarcado",
      "en": "Shipped",
      "es": "Embarcado",
      "zh": "已装船"
    }
  }
];

export const containerOperationStatusOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  containerOperationStatusOptions.map((o) => [o.key, o]),
);

export function resolveContainerOperationStatusLabel(key: string, locale: Locale): string {
  return containerOperationStatusOptionsByKey[key]?.name[locale] ?? key;
}
