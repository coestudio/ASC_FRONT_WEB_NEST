import type { NavFragment } from "./types";

/** Seção Área do cliente — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
const fragment: NavFragment = {
  area: "client",
  sectionLabelKey: "navigation.client",
  items: [
    { labelKey: "navigation.clientHome", to: "/client", icon: "bi-house", order: 1 },
    {
      labelKey: "navigation.clientFinalReport",
      to: "/client/final-report",
      icon: "bi-file-earmark-text",
      order: 2,
    },
    {
      labelKey: "navigation.clientTracking",
      to: "/client/tracking",
      icon: "bi-graph-up-arrow",
      order: 3,
    },
    {
      labelKey: "navigation.clientCollaborators",
      to: "/client/collaborators",
      icon: "bi-people",
      order: 4,
    },
  ],
};

export default fragment;
