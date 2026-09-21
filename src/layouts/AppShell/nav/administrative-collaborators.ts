import type { NavFragment } from "./types";

/**
 * Item "Colaboradores" da seção Administrativo — escolhe um cliente e
 * gerencia os colaboradores dele (`/administrative/collaborators`).
 * `nav/index.ts` funde este fragmento com os demais pela mesma `area`.
 */
const fragment: NavFragment = {
  area: "administrativo",
  sectionLabelKey: "navigation.administrativo",
  items: [
    {
      labelKey: "navigation.administrativoCollaborators",
      to: "/administrative/collaborators",
      icon: "bi-person-lines-fill",
      order: 3,
    },
  ],
};

export default fragment;
