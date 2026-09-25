import type { AreaId } from "@/lib/permissions";
import type { TranslationKey } from "@/i18n/translate";

/**
 * Item de navegação de uma seção da sidebar. `icon` é o nome da classe
 * `bootstrap-icons` (ex.: `"bi-house-door"`), renderizado como
 * `<i className={`bi ${icon}`} aria-hidden />` — decisão D1 da SPEC-02.
 * `order` define a posição relativa dentro da seção (menor primeiro);
 * itens sem `order` vão para o fim, na ordem em que aparecem no fragmento.
 */
export type NavItem = {
  labelKey: TranslationKey;
  to: string;
  icon?: string;
  order?: number;
  /**
   * `true` só nos itens órfãos sem rota real ainda — força o sidebar
   * (`AppShell`) a renderizar `<a href>` (navegação full-page) em vez de
   * `<Link to>` tipado, porque `to` aqui não existe em `routeTree.gen.ts`.
   * Remover a flag assim que o item ganhar rota real. Sem consumidor hoje
   * (os dois exemplos antigos, `administrativoLog`/`administrativoOccurrences`,
   * foram removidos nas SPEC-39/SPEC-43 — viraram abas reais dentro do shell
   * de Operação) — mecanismo mantido pro próximo item órfão que aparecer.
   */
  legacyOrphanRoute?: boolean;
  /**
   * Item só pra usuário `isAdmin` dentro da seção (SPEC-102 — Acessos de
   * Laboratório/Operacional, que batem em `/user`, `[RequireAdmin]` no Core).
   * Só esconde na sidebar; a rota tem o próprio guard.
   */
  requiresAdmin?: boolean;
};

/**
 * Fragmento de navegação — cada SPEC de área cria o seu (`nav/<nome>.ts`)
 * exportando um `NavFragment`. `nav/index.ts` faz o merge de todos os
 * fragmentos por `area` (§3.1 da SPEC-02).
 */
export type NavFragment = {
  area: AreaId;
  sectionLabelKey: TranslationKey;
  /** Ícone do cabeçalho da seção — só precisa ser setado em um fragmento por
   * `area` (o merge em `nav/index.ts` usa o primeiro não vazio que encontrar). */
  icon?: string;
  items: NavItem[];
};

export type NavSection = {
  area: AreaId;
  sectionLabelKey: TranslationKey;
  icon?: string;
  items: NavItem[];
};

/**
 * Ordem fixa das seções entre si — não é a ordem alfabética dos arquivos de
 * fragmento em `nav/`, nem a ordem de descoberta do glob. SPEC de área nova
 * que introduz uma seção ainda não listada precisa adicionar 1 linha aqui.
 */
export const SECTION_ORDER: AreaId[] = [
  "admin",
  "administrativo",
  "operacional",
  "laboratorio",
  "client",
];
