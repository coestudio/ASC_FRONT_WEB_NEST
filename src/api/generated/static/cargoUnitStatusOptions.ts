// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/cargo/statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const cargoUnitStatusOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Stuffed",
    "name": {
      "pt-BR": "Ovada",
      "en": "Stuffed",
      "es": "Llenada",
      "zh": "已装箱"
    }
  },
  {
    "value": 2,
    "key": "Canceled",
    "name": {
      "pt-BR": "Cancelada",
      "en": "Canceled",
      "es": "Cancelada",
      "zh": "已取消"
    }
  }
];

export const cargoUnitStatusOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  cargoUnitStatusOptions.map((o) => [o.key, o]),
);

export function resolveCargoUnitStatusLabel(key: string, locale: Locale): string {
  return cargoUnitStatusOptionsByKey[key]?.name[locale] ?? key;
}
