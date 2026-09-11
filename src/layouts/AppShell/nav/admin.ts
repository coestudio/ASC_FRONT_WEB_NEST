import type { NavFragment } from "./types";

/** Seção Admin — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
const fragment: NavFragment = {
  area: "admin",
  sectionLabelKey: "navigation.admin",
  items: [
    { labelKey: "navigation.adminAccess", to: "/admin/acesso", icon: "bi-shield-lock", order: 1 },
    {
      labelKey: "navigation.adminAccessProfiles",
      to: "/admin/acessos",
      icon: "bi-shield-check",
      order: 2,
    },
  ],
};

export default fragment;
