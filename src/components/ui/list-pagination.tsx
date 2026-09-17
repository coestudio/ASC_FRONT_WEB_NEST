import { Pagination } from "react-bootstrap";

import { useT } from "@/lib/ui-prefs";

type ListPaginationProps = {
  /** Página atual (1-based), mesmo padrão de `crud-list-page.tsx`/`operations-list.tsx`. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Paginação enxuta (`<< < (página) > >>`) — extraída do bloco duplicado em
 * `crud-list-page.tsx` (SPEC-10, usado por Acesso/Cadastros/Clientes) e nas
 * tabelas de Operações que não reusam o `CrudListPage` genérico
 * (`operations-list.tsx` + abas — filtros/colunas próprios demais pro molde
 * genérico, SPEC-07-01 §9). Reescrita na SPEC-28: em vez de um
 * `Pagination.Item` por página (degrada com muitas páginas), renderiza
 * sempre 4 botões fixos + um indicador textual de posição — a navegação
 * manual por número é só rede de segurança, o foco esperado do usuário
 * final é a busca (SPEC-28 §2). Não renderiza nada com 1 página só ou
 * menos.
 */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
  className = "justify-content-center mt-3",
}: ListPaginationProps) {
  const t = useT();

  if (totalPages <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <Pagination className={className}>
      <Pagination.First
        disabled={isFirst}
        onClick={() => onPageChange(1)}
        aria-label={t("pagination.first")}
      />
      <Pagination.Prev
        disabled={isFirst}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("pagination.previous")}
      />
      <Pagination.Item disabled>{t("pagination.position", { page, totalPages })}</Pagination.Item>
      <Pagination.Next
        disabled={isLast}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("pagination.next")}
      />
      <Pagination.Last
        disabled={isLast}
        onClick={() => onPageChange(totalPages)}
        aria-label={t("pagination.last")}
      />
    </Pagination>
  );
}
