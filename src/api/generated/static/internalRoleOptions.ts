// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/user/roles
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const internalRoleOptions: EnumOptionDTO[] = [
  {
    "value": 100,
    "key": "Agent",
    "name": {
      "pt-BR": "Agente",
      "en": "Agent",
      "es": "Agente",
      "zh": "代理"
    }
  },
  {
    "value": 200,
    "key": "Supervisor",
    "name": {
      "pt-BR": "Supervisor",
      "en": "Supervisor",
      "es": "Supervisor",
      "zh": "主管"
    }
  },
  {
    "value": 300,
    "key": "Laboratory",
    "name": {
      "pt-BR": "Laboratório",
      "en": "Laboratory",
      "es": "Laboratorio",
      "zh": "实验室"
    }
  }
];

export const internalRoleOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  internalRoleOptions.map((o) => [o.key, o]),
);

export function resolveInternalRoleLabel(key: string, locale: Locale): string {
  return internalRoleOptionsByKey[key]?.name[locale] ?? key;
}
