// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/container/seal-statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const sealStatusOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Active",
    "name": {
      "pt-BR": "Ativo",
      "en": "Active",
      "es": "Activo",
      "zh": "生效中"
    }
  },
  {
    "value": 2,
    "key": "Removed",
    "name": {
      "pt-BR": "Removido",
      "en": "Removed",
      "es": "Eliminado",
      "zh": "已移除"
    }
  }
];

export const sealStatusOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  sealStatusOptions.map((o) => [o.key, o]),
);

export function resolveSealStatusLabel(key: string, locale: Locale): string {
  return sealStatusOptionsByKey[key]?.name[locale] ?? key;
}
