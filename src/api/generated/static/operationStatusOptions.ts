// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/operation/statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const operationStatusOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Draft",
    "name": {
      "pt-BR": "Rascunho",
      "en": "Draft",
      "es": "Borrador",
      "zh": "草稿"
    }
  },
  {
    "value": 2,
    "key": "InProgress",
    "name": {
      "pt-BR": "Em Andamento",
      "en": "In Progress",
      "es": "En Progreso",
      "zh": "进行中"
    }
  },
  {
    "value": 3,
    "key": "Finished",
    "name": {
      "pt-BR": "Finalizada",
      "en": "Finished",
      "es": "Finalizada",
      "zh": "已完成"
    }
  },
  {
    "value": 9,
    "key": "Pause",
    "name": {
      "pt-BR": "Pausada",
      "en": "Paused",
      "es": "Pausada",
      "zh": "已暂停"
    }
  },
  {
    "value": 10,
    "key": "Canceled",
    "name": {
      "pt-BR": "Cancelada",
      "en": "Canceled",
      "es": "Cancelada",
      "zh": "已取消"
    }
  }
];

export const operationStatusOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  operationStatusOptions.map((o) => [o.key, o]),
);

export function resolveOperationStatusLabel(key: string, locale: Locale): string {
  return operationStatusOptionsByKey[key]?.name[locale] ?? key;
}
