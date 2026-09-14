import type { NavFragment } from "./types";

/**
 * Seção Administrativo — portada do SECTIONS hard-coded de
 * src/layouts/AppShell/index.tsx. Os 5 itens de cadastro (Navio, Container,
 * Terminal, Porto, Produto) migraram pra `nav/administrative-registry.ts`
 * (SPEC-04, rotas novas em inglês) — não duplicar aqui. O item "Clientes"
 * migrou pra `nav/administrative-clients.ts` (SPEC-05, rota nova
 * `/administrative/clients`) — também não duplicar aqui.
 * `administrativoLog`/`administrativoOccurrences` continuam órfãos,
 * apontando pra rota antiga: SPEC-06 (que os removeria) foi cancelada, sem
 * spec própria ainda pra essas duas telas.
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
