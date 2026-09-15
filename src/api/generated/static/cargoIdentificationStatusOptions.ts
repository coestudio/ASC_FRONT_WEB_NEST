// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/cargo/identification-statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const cargoIdentificationStatusOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Unidentified",
    "name": {
      "pt-BR": "Não identificada",
      "en": "Unidentified",
      "es": "No identificada",
      "zh": "未识别"
    }
  },
  {
    "value": 2,
    "key": "Partial",
    "name": {
      "pt-BR": "Parcial",
      "en": "Partial",
      "es": "Parcial",
      "zh": "部分识别"
    }
  },
  {
    "value": 3,
    "key": "Identified",
    "name": {
      "pt-BR": "Identificada",
      "en": "Identified",
      "es": "Identificada",
      "zh": "已识别"
    }
  },
  {
    "value": 4,
    "key": "Divergent",
    "name": {
      "pt-BR": "Divergente",
      "en": "Divergent",
      "es": "Divergente",
      "zh": "存在差异"
    }
  },
  {
    "value": 5,
    "key": "Reconciled",
    "name": {
      "pt-BR": "Reconciliada",
      "en": "Reconciled",
      "es": "Reconciliada",
      "zh": "已核对"
    }
  }
];

export const cargoIdentificationStatusOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  cargoIdentificationStatusOptions.map((o) => [o.key, o]),
);

export function resolveCargoIdentificationStatusLabel(key: string, locale: Locale): string {
  return cargoIdentificationStatusOptionsByKey[key]?.name[locale] ?? key;
}
