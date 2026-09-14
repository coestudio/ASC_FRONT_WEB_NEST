import type { NavFragment } from "./types";

/** Seção Laboratório — portada do SECTIONS hard-coded de src/layouts/AppShell/index.tsx. */
const fragment: NavFragment = {
  area: "laboratorio",
  sectionLabelKey: "navigation.laboratorio",
  icon: "bi-flask",
  items: [
    { labelKey: "navigation.laboratorio", to: "/laboratory", icon: "bi-flask-fill", order: 1 },
  ],
};

export default fragment;
