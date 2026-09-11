// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/container/seals
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const sealNameOptions: EnumOptionDTO[] = [
  {
    "value": 0,
    "key": "NONE",
    "name": {
      "pt-BR": "Nenhum",
      "en": "None",
      "es": "Ninguno",
      "zh": "无"
    }
  },
  {
    "value": 1,
    "key": "ASA",
    "name": {
      "pt-BR": "Lacre ASA",
      "en": "ASA Seal",
      "es": "Precinto ASA",
      "zh": "ASA封条"
    }
  },
  {
    "value": 2,
    "key": "ASI",
    "name": {
      "pt-BR": "Lacre ASI",
      "en": "ASI Seal",
      "es": "Precinto ASI",
      "zh": "ASI封条"
    }
  },
  {
    "value": 3,
    "key": "AMATEUR",
    "name": {
      "pt-BR": "Lacre Amador",
      "en": "Amateur Seal",
      "es": "Precinto Amateur",
      "zh": "业余封条"
    }
  },
  {
    "value": 9,
    "key": "EXTRA",
    "name": {
      "pt-BR": "Lacre Extra",
      "en": "Extra Seal",
      "es": "Precinto Extra",
      "zh": "额外封条"
    }
  }
];

export const sealNameOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  sealNameOptions.map((o) => [o.key, o]),
);

export function resolveSealNameLabel(key: string, locale: Locale): string {
  return sealNameOptionsByKey[key]?.name[locale] ?? key;
}
