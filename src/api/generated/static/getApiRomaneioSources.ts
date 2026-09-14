// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/romaneio/sources
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";

export const getApiRomaneioSources: EnumOptionDTO[] = [
  {
    value: 1,
    key: "AdministrativeImport",
    name: {
      "pt-BR": "Importação administrativa",
      en: "Administrative import",
    },
  },
  {
    value: 2,
    key: "ManualAdministrative",
    name: {
      "pt-BR": "Cadastro administrativo",
      en: "Administrative entry",
    },
  },
  {
    value: 3,
    key: "OperationalInvoice",
    name: {
      "pt-BR": "Nota fiscal operacional",
      en: "Operational invoice",
    },
  },
  {
    value: 4,
    key: "AdministrativeCorrection",
    name: {
      "pt-BR": "Correção administrativa",
      en: "Administrative correction",
    },
  },
];
