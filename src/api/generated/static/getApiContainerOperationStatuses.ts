// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/container/operation-statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";

export const getApiContainerOperationStatuses: EnumOptionDTO[] = [
  {
    value: 1,
    key: "Empty",
    name: {
      "pt-BR": "Vazio",
      en: "Empty",
      es: "Vacío",
      zh: "空箱",
    },
  },
  {
    value: 2,
    key: "Stuffing",
    name: {
      "pt-BR": "Em Ova",
      en: "Stuffing",
      es: "En Llenado",
      zh: "装箱中",
    },
  },
  {
    value: 3,
    key: "Stuffed",
    name: {
      "pt-BR": "Ovado",
      en: "Stuffed",
      es: "Llenado",
      zh: "已装箱",
    },
  },
  {
    value: 4,
    key: "Shipped",
    name: {
      "pt-BR": "Embarcado",
      en: "Shipped",
      es: "Embarcado",
      zh: "已装船",
    },
  },
];
