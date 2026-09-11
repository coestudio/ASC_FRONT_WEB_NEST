// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/invoice/statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const invoiceStatusOptions: EnumOptionDTO[] = [
  {
    "value": 1,
    "key": "Pending",
    "name": {
      "pt-BR": "Pendente",
      "en": "Pending",
      "es": "Pendiente",
      "zh": "待确认"
    }
  },
  {
    "value": 2,
    "key": "Confirmed",
    "name": {
      "pt-BR": "Confirmada",
      "en": "Confirmed",
      "es": "Confirmada",
      "zh": "已确认"
    }
  },
  {
    "value": 3,
    "key": "Canceled",
    "name": {
      "pt-BR": "Cancelada",
      "en": "Canceled",
      "es": "Cancelada",
      "zh": "已取消"
    }
  }
];

export const invoiceStatusOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  invoiceStatusOptions.map((o) => [o.key, o]),
);

export function resolveInvoiceStatusLabel(key: string, locale: Locale): string {
  return invoiceStatusOptionsByKey[key]?.name[locale] ?? key;
}
