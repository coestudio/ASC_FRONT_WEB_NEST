import type { NavFragment } from "./types";

/**
 * Itens de "Cadastro" da seção Administrativo (Terminal, Porto, Container,
 * Navio, Produto) — SPEC-04. Migrados de `administrativo.ts` (rotas antigas
 * em PT) pras rotas novas em inglês (`administrative/registry/*`, regra 6 +
 * D3 da SPEC-04). `nav/index.ts` funde este fragmento com o de
 * `administrativo.ts` pela mesma `area` ("administrativo").
 */
const fragment: NavFragment = {
  area: "administrativo",
  sectionLabelKey: "navigation.administrativo",
  items: [
    {
      labelKey: "navigation.administrativoVessel",
      to: "/administrative/registry/vessel",
      icon: "bi-water",
      order: 4,
    },
    {
      labelKey: "navigation.administrativoContainer",
      to: "/administrative/registry/container",
      icon: "bi-box-seam",
      order: 5,
    },
    {
      labelKey: "navigation.administrativoTerminal",
      to: "/administrative/registry/terminal",
      icon: "bi-building",
      order: 6,
    },
    {
      labelKey: "navigation.administrativoHarbor",
      to: "/administrative/registry/harbor",
      icon: "bi-geo-alt",
      order: 7,
    },
    {
      labelKey: "navigation.administrativoProduct",
      to: "/administrative/registry/product",
      icon: "bi-box2",
      order: 8,
    },
  ],
};

export default fragment;
