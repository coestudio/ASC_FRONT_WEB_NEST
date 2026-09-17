import type { ReactNode } from "react";

import { nextSort } from "./sort";

/**
 * `<th>` clicável com ícone de ordenação (SPEC-81) — mesmo visual/ciclo
 * (asc → desc → sem ordenação, `bi-sort-up-alt`/`bi-sort-down-alt`/
 * `bi-arrow-down-up`) que `crud-list-page.tsx` já usa via `CrudColumn.
 * sortKey`, extraído aqui pras telas com tabela própria (não usam
 * `CrudColumn`, ex. `operations-list.tsx`/`Containers.tsx`/`Documents.tsx`/
 * `Invoice.tsx`/`Occurrences.tsx`) — evita reimplementar o mesmo JSX em
 * cada uma. Sem `sortKey`, cabeçalho estático (mesmo comportamento de
 * sempre, aditivo).
 */
export function SortableTh({
  children,
  sortKey,
  sort,
  onSortChange,
  align,
  className,
}: {
  children: ReactNode;
  sortKey?: string;
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const active = sortKey != null && (sort === sortKey || sort === `-${sortKey}`);
  const descending = active && sort === `-${sortKey}`;

  return (
    <th
      className={`${align ? `text-${align}` : ""} ${className ?? ""}`.trim() || undefined}
      role={sortKey ? "button" : undefined}
      onClick={sortKey ? () => onSortChange?.(nextSort(sort, sortKey)) : undefined}
      style={sortKey ? { cursor: "pointer", userSelect: "none" } : undefined}
    >
      {children}
      {sortKey ? (
        <i
          className={`bi ms-1 ${
            active
              ? descending
                ? "bi-sort-down-alt"
                : "bi-sort-up-alt"
              : "bi-arrow-down-up text-body-secondary"
          }`}
          aria-hidden
        />
      ) : null}
    </th>
  );
}
