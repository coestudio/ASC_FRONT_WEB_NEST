import { Pagination } from "react-bootstrap";

type ListPaginationProps = {
  /** Página atual (1-based), mesmo padrão de `crud-list-page.tsx`/`operations-list.tsx`. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Paginação numerada (`Prev`/números/`Next`) — extraída do bloco duplicado
 * em `crud-list-page.tsx` (SPEC-10, usado por Acesso/Cadastros/Clientes) e
 * nas 3 tabelas de Operações que não reusam o `CrudListPage` genérico
 * (`operations-list.tsx`, aba Containers, aba Documentos — filtros/colunas
 * próprios demais pro molde genérico, SPEC-07-01 §9). Não renderiza nada com
 * 1 página só ou menos.
 */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
  className = "justify-content-center mt-3",
}: ListPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
      <Pagination.Prev disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Pagination.Item key={p} active={p === page} onClick={() => onPageChange(p)}>
          {p}
        </Pagination.Item>
      ))}
      <Pagination.Next disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} />
    </Pagination>
  );
}
