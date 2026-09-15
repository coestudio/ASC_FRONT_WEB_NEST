import type { NavFragment } from "./types";

/**
 * Item "Clientes" da seção Administrativo — SPEC-05. Migrado de
 * `administrativo.ts` (rota antiga `/administrativo/clientes`) pra rota nova
 * em inglês (`/administrative/clients`, mesma convenção da SPEC-04). Reusa a
 * chave i18n `navigation.administrativoClients` já existente (não recriada).
 * `nav/index.ts` funde este fragmento com os demais pela mesma `area`
 * ("administrativo").
 */
const fragment: NavFragment = {
  area: "administrativo",
  sectionLabelKey: "navigation.administrativo",
  items: [
    {
      labelKey: "navigation.administrativoClients",
      to: "/administrative/clients",
      icon: "bi-people",
      order: 2,
    },
  ],
};

export default fragment;
