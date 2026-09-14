// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/invoice/item-statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";

export const getApiInvoiceItemStatuses: EnumOptionDTO[] = [
  {
    value: 1,
    key: "Pending",
    name: {
      "pt-BR": "Pendente",
      en: "Pending",
      es: "Pendiente",
      zh: "待确认",
    },
  },
  {
    value: 2,
    key: "Linked",
    name: {
      "pt-BR": "Vinculado",
      en: "Linked",
      es: "Vinculado",
      zh: "已关联",
    },
  },
  {
    value: 3,
    key: "Canceled",
    name: {
      "pt-BR": "Cancelado",
      en: "Canceled",
      es: "Cancelado",
      zh: "已取消",
    },
  },
];
