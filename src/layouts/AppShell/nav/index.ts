import type { AreaId } from "@/lib/permissions";
import { SECTION_ORDER, type NavFragment, type NavSection } from "./types";

/**
 * Merge de todos os fragmentos de `nav/*.ts` (exceto `types.ts` e este
 * próprio `index.ts`, que não exportam `NavFragment`). Cada SPEC de área cria
 * o próprio arquivo de fragmento aqui dentro — nunca edita este arquivo nem
 * o fragmento de outra área (§3.1 da SPEC-02).
 */
const modules = import.meta.glob<{ default: NavFragment }>("./*.ts", { eager: true });

const fragments: NavFragment[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith("/types.ts") && !path.endsWith("/index.ts"))
  .map(([, mod]) => mod.default);

/**
 * Agrupa os fragmentos por área (duas SPECs podem contribuir pra mesma
 * seção, ex.: "administrativo" — o merge concatena os itens, sem precisar
 * de coordenação entre specs), ordena os itens dentro de cada seção por
 * `order`, e ordena as seções entre si por `SECTION_ORDER`.
 */
function buildSections(): NavSection[] {
  const byArea = new Map<AreaId, NavSection>();

  for (const fragment of fragments) {
    const existing = byArea.get(fragment.area);
    if (existing) {
      existing.items.push(...fragment.items);
    } else {
      byArea.set(fragment.area, {
        area: fragment.area,
        sectionLabelKey: fragment.sectionLabelKey,
        items: [...fragment.items],
      });
    }
  }

  for (const section of byArea.values()) {
    section.items.sort(
      (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return SECTION_ORDER.map((area) => byArea.get(area)).filter((s): s is NavSection => !!s);
}

const allSections = buildSections();

/** Seções visíveis para o usuário logado, já na ordem de `SECTION_ORDER`. */
export function getNavSections(areas: AreaId[]): NavSection[] {
  return allSections.filter((section) => areas.includes(section.area));
}

export type { NavItem, NavSection, NavFragment } from "./types";
