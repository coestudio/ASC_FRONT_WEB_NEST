import type { NavFragment } from "./types";

/**
 * Item "Operações" da seção Administrativo — SPEC-07-01. Migrado de
 * `administrativo.ts` (rota antiga `/operacoes`) pra rota nova em inglês
 * (`/administrative/operations`, mesma convenção da SPEC-04/05). Reusa a
 * chave i18n `navigation.administrativoOperations` já existente (não
 * recriada). `nav/index.ts` funde este fragmento com os demais pela mesma
 * `area` ("administrativo").
 */
const fragment: NavFragment = {
  area: "administrativo",
  sectionLabelKey: "navigation.administrativo",
  items: [
    {
      labelKey: "navigation.administrativoOperations",
      to: "/administrative/operations",
      icon: "bi-clipboard-data",
      order: 3,
    },
  ],
};

export default fragment;
