// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/operation/statuses
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";

export const getApiOperationStatuses: EnumOptionDTO[] = [
  {
    value: 1,
    name: {
      pt: "Rascunho",
      en: "Draft",
      es: "Borrador",
      zh: "草稿",
    },
  },
  {
    value: 2,
    name: {
      pt: "Em Andamento",
      en: "In Progress",
      es: "En Progreso",
      zh: "进行中",
    },
  },
  {
    value: 3,
    name: {
      pt: "Finalizada",
      en: "Finished",
      es: "Finalizada",
      zh: "已完成",
    },
  },
  {
    value: 9,
    name: {
      pt: "Pausada",
      en: "Paused",
      es: "Pausada",
      zh: "已暂停",
    },
  },
  {
    value: 10,
    name: {
      pt: "Cancelada",
      en: "Canceled",
      es: "Cancelada",
      zh: "已取消",
    },
  },
];
