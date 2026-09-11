import type { NavFragment } from "./types";

/** Seção Administrativo — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
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
      labelKey: "navigation.administrativoVessel",
      to: "/administrativo/cadastro/navio",
      icon: "bi-water",
      order: 4,
    },
    {
      labelKey: "navigation.administrativoContainer",
      to: "/administrativo/cadastro/container",
      icon: "bi-box-seam",
      order: 5,
    },
    {
      labelKey: "navigation.administrativoTerminal",
      to: "/administrativo/cadastro/terminal",
      icon: "bi-building",
      order: 6,
    },
    {
      labelKey: "navigation.administrativoHarbor",
      to: "/administrativo/cadastro/porto",
      icon: "bi-geo-alt",
      order: 7,
    },
    {
      labelKey: "navigation.administrativoProduct",
      to: "/administrativo/cadastro/produto",
      icon: "bi-box2",
      order: 8,
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
