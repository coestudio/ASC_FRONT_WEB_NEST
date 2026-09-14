import type { NavFragment } from "./types";

/**
 * Sub-seção "Cadastro" dentro de Administrativo (SPEC-04) — as 5 telas de
 * cadastro básico (Navio, Container, Terminal, Porto, Produto). Contribui
 * pra mesma área "administrativo" que `administrativo.ts`; `nav/index.ts`
 * concatena os itens dos dois fragmentos e ordena por `order` (§3.1 da
 * SPEC-02). Rota em inglês (`/administrative/registry/*`, D3 da SPEC-04),
 * rótulo em português via as mesmas chaves de `navigation.json` que o
 * legado já usava.
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
