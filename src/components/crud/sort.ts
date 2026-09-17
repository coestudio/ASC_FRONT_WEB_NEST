/**
 * Alterna a ordenação de uma coluna: sem ordenação → ascendente (`key`) →
 * descendente (`-key`) → volta a sem ordenação (`undefined`, Core aplica o
 * `defaultSort` do endpoint). Só uma coluna ordenada por vez — mesmo modelo
 * de `PageQuery.Sort` do Core (uma string só). Extraído de `crud-list-page.tsx`
 * (SPEC-81) pra um módulo só de funções — reusado por `sortable-th.tsx`
 * (telas com tabela própria, sem `CrudColumn`) sem acionar o aviso de fast
 * refresh que exportar uma função não-componente de um arquivo de componente
 * gera.
 */
export function nextSort(current: string | undefined, key: string): string | undefined {
  if (current === key) return `-${key}`;
  if (current === `-${key}`) return undefined;
  return key;
}
