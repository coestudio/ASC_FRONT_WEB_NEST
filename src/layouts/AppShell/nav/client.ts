import type { NavFragment } from "./types";

/** Seção Área do cliente — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
const fragment: NavFragment = {
  area: "client",
  sectionLabelKey: "navigation.client",
  items: [
    { labelKey: "navigation.clientHome", to: "/client", icon: "bi-house", order: 1 },
    {
      labelKey: "navigation.clientFinalReport",
      to: "/client/relatorio-final",
      icon: "bi-file-earmark-text",
      order: 2,
    },
    {
      labelKey: "navigation.clientTracking",
      to: "/client/acompanhamento",
      icon: "bi-graph-up-arrow",
      order: 3,
    },
    {
      labelKey: "navigation.clientCollaborators",
      to: "/client/colaboradores",
      icon: "bi-people",
      order: 4,
    },
  ],
};

export default fragment;
