// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/invoice/sources
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const invoiceSourceOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "RomaneioImport",
    "name": {
      "pt-BR": "Importação de romaneio",
      "en": "Romaneio import",
      "es": "Importación de romaneio",
      "zh": "货物清单导入"
    }
  },
  {
    "value": 2,
    "key": "Manual",
    "name": {
      "pt-BR": "Manual",
      "en": "Manual",
      "es": "Manual",
      "zh": "手动"
    }
  }
];

export const invoiceSourceOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  invoiceSourceOptions.map((o) => [o.key, o]),
);

export function resolveInvoiceSourceLabel(key: string, locale: Locale): string {
  return invoiceSourceOptionsByKey[key]?.name[locale] ?? key;
}
