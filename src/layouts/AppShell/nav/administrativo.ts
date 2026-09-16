import type { NavFragment } from "./types";

/**
 * Seção Administrativo — portada do SECTIONS hard-coded de
 * src/layouts/AppShell/index.tsx. Os 5 itens de cadastro (Navio, Container,
 * Terminal, Porto, Produto) migraram pra `nav/administrative-registry.ts`
 * (SPEC-04, rotas novas em inglês) — não duplicar aqui. O item "Clientes"
 * migrou pra `nav/administrative-clients.ts` (SPEC-05, rota nova
 * `/administrative/clients`) — também não duplicar aqui. O item "Operações"
 * migrou pra `nav/administrative-operations.ts` (SPEC-07-01, rota nova
 * `/administrative/operations`) — idem, não duplicar. O item "Início" agora
 * aponta pra `/administrative` (SPEC-17, Home real com quick actions —
 * antes era link morto pra `/administrativo`, rota que nunca existiu).
 * `administrativoLog`/`administrativoOccurrences` (órfãos, apontando pra
 * rota antiga inexistente) foram removidos: "Log" virou aba real dentro do
 * shell de Operação (SPEC-39) e "Ocorrências" idem (SPEC-43, nova aba
 * própria, paralela a Log) — nenhum dos dois precisa mais de entrada no
 * menu Administrativo.
 */
const fragment: NavFragment = {
  area: "administrativo",
  sectionLabelKey: "navigation.administrativo",
  icon: "bi-briefcase",
  items: [
    {
      labelKey: "navigation.administrativoHome",
      to: "/administrative",
      icon: "bi-house-door",
      order: 1,
    },
  ],
};

export default fragment;
