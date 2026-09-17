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
 * final é a busca (SPEC-28 §2).
 *
 * Sempre renderiza, mesmo com 1 página só (decisão revista — antes escondia
 * com `totalPages <= 1`; o usuário quer a paginação sempre visível em toda
 * listagem do projeto, não condicionada à quantidade de itens). Os botões
 * ficam desabilitados quando não há pra onde navegar (`isFirst`/`isLast`),
 * o indicador de posição continua mostrando "1 de 1".
 */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
  className = "justify-content-center mt-3",
}: ListPaginationProps) {
  const t = useT();

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
