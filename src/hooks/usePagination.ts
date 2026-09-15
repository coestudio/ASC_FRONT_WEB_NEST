import { useEffect, useMemo, useState } from "react";

/**
 * Paginação client-side de uma lista já carregada por inteiro (mock ou
 * endpoint sem `Offset`/`Limit` no Core, ex. `Operation/Responsible`) —
 * complementa `ListPagination` (`components/ui/list-pagination.tsx`, só a UI
 * de botões), que hoje só era alimentado por paginação server-side
 * (`Offset`/`Limit` + `total` da API, ex. Documents/Containers/Romaneio).
 *
 * Reseta pra página 1 sempre que a lista de entrada muda de tamanho (busca,
 * filtro, ou item removido) e nunca deixa `page` passar de `totalPages`.
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalPages, pageItems };
}
