// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/profile/genders
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const genderOptions: EnumOptionDTO[] = [
  {
    "value": 0,
    "key": "None",
    "name": {
      "pt-BR": "Não informado",
      "en": "Not informed",
      "es": "No informado",
      "zh": "未提供"
    }
  },
  {
    "value": 1,
    "key": "Male",
    "name": {
      "pt-BR": "Masculino",
      "en": "Male",
      "es": "Masculino",
      "zh": "男"
    }
  },
  {
    "value": 2,
    "key": "Female",
    "name": {
      "pt-BR": "Feminino",
      "en": "Female",
      "es": "Femenino",
      "zh": "女"
    }
  },
  {
    "value": 9,
    "key": "Other",
    "name": {
      "pt-BR": "Outro",
      "en": "Other",
      "es": "Otro",
      "zh": "其他"
    }
  }
];

export const genderOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  genderOptions.map((o) => [o.key, o]),
);

export function resolveGenderLabel(key: string, locale: Locale): string {
  return genderOptionsByKey[key]?.name[locale] ?? key;
}
