// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/cargo/statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";

export const getApiCargoStatuses: EnumOptionDTO[] = [
  {
    value: 1,
    key: "Open",
    name: {
      "pt-BR": "Aberta",
      en: "Open",
      es: "Abierta",
      zh: "开放",
    },
  },
  {
    value: 2,
    key: "Stuffed",
    name: {
      "pt-BR": "Ovada",
      en: "Stuffed",
      es: "Llenada",
      zh: "已装箱",
    },
  },
  {
    value: 3,
    key: "Canceled",
    name: {
      "pt-BR": "Cancelada",
      en: "Canceled",
      es: "Cancelada",
      zh: "已取消",
    },
  },
];
