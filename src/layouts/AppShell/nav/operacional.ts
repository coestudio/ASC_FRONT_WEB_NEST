import type { NavFragment } from "./types";

/** Seção Operacional — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
const fragment: NavFragment = {
  area: "operacional",
  sectionLabelKey: "navigation.operacional",
  icon: "bi-gear",
  items: [
    {
      labelKey: "navigation.operacionalHome",
      to: "/operational",
      icon: "bi-house-gear",
      order: 1,
    },
    {
      labelKey: "navigation.operacionalOptions",
      to: "/operational/operations",
      icon: "bi-list-check",
      order: 2,
    },
    {
      labelKey: "navigation.operacionalAccess",
      to: "/operational/access",
      icon: "bi-shield-lock",
      order: 3,
      requiresAdmin: true,
    },
  ],
};

export default fragment;
