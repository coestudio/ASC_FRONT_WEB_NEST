import type { NavFragment } from "./types";

/** Seção Operacional — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
const fragment: NavFragment = {
  area: "operacional",
  sectionLabelKey: "navigation.operacional",
  items: [
    { labelKey: "navigation.operacionalHome", to: "/operacional", icon: "bi-house", order: 1 },
    {
      labelKey: "navigation.operacionalOptions",
      to: "/operacional/operacoes",
      icon: "bi-clipboard-data",
      order: 2,
    },
  ],
};

export default fragment;
