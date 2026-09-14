import type { NavFragment } from "./types";

/**
 * Seção Administrativo — portada do SECTIONS hard-coded de
 * src/layouts/AppShell/index.tsx. Os 5 itens de cadastro (navio, container,
 * terminal, porto, produto) migraram pro fragmento
 * `administrative-registry.ts` (SPEC-04), que aponta pra
 * `/administrative/registry/*` (rota em inglês, D3) em vez das rotas
 * antigas em PT — `nav/index.ts` faz o merge de ambos os fragmentos na
 * mesma área "administrativo".
 */
const fragment: NavFragment = {
  area: "administrativo",
  sectionLabelKey: "navigation.administrativo",
  items: [
    {
      labelKey: "navigation.administrativoHome",
      to: "/administrativo",
      icon: "bi-house",
      order: 1,
    },
    {
      labelKey: "navigation.administrativoClients",
      to: "/administrativo/clientes",
      icon: "bi-people",
      order: 2,
    },
    {
      labelKey: "navigation.administrativoOperations",
      to: "/operacoes",
      icon: "bi-clipboard-data",
      order: 3,
    },
    {
      labelKey: "navigation.administrativoLog",
      to: "/administrativo/log",
      icon: "bi-journal-text",
      order: 9,
    },
    {
      labelKey: "navigation.administrativoOccurrences",
      to: "/administrativo/ocorrencias",
      icon: "bi-exclamation-triangle",
      order: 10,
    },
  ],
};

export default fragment;
