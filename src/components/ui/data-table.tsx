"use client";

import type { ReactNode } from "react";
import { Table, Badge, Pagination, Spinner } from "react-bootstrap";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  /** Chave em `T` usada como row key (ex: "id"). */
  rowKey: keyof T;
  /** Total de itens (para paginação). */
  total?: number;
  /** Página atual (0-indexed). */
  page?: number;
  /** Itens por página. */
  pageSize?: number;
  /** Callback ao mudar de página. */
  onPageChange?: (page: number) => void;
  /** Callback ao clicar em uma linha. */
  onRowClick?: (row: T) => void;
  /** Ações renderizadas no canto direito de cada linha. */
  rowActions?: (row: T) => ReactNode;
  /** Coluna de ordenação atual. */
  sortField?: string;
  /** Direção da ordenação. */
  sortDirection?: "asc" | "desc";
  /** Callback ao ordenar. */
  onSort?: (field: string) => void;
};

export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  total = 0,
  page = 0,
  pageSize = 10,
  onPageChange,
  onRowClick,
  rowActions,
  sortField,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);

  function renderSortIcon(field: string) {
    if (sortField !== field) {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ms-1 opacity-25">
          <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
      );
    }
    return sortDirection === "asc" ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ms-1">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ms-1">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="secondary" />
      </div>
    );
  }

  return (
    <div>
      <Table hover responsive className="mb-3 align-middle">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.className ?? ""} ${col.sortable ? "user-select-none" : ""}`}
                style={col.sortable ? { cursor: "pointer" } : undefined}
                onClick={col.sortable ? () => onSort?.(col.key) : undefined}
              >
                {col.header}
                {col.sortable && renderSortIcon(col.key)}
              </th>
            ))}
            {rowActions && <th style={{ width: 80 }} />}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="text-center py-4" style={{ color: "var(--bs-secondary)" }}>
                Nenhum registro encontrado.
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[rowKey])}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {rowActions && (
                  <td className="text-end" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {totalPages > 1 && onPageChange && (
        <div className="d-flex justify-content-center">
          <Pagination className="mb-0">
            <Pagination.Prev
              disabled={page <= 0}
              onClick={() => onPageChange(page - 1)}
            />
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => {
                if (totalPages <= 7) return true;
                if (i === 0 || i === totalPages - 1) return true;
                if (Math.abs(i - page) <= 1) return true;
                return false;
              })
              .reduce<(number | "ellipsis")[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - (arr[idx - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <Pagination.Ellipsis key={`e-${idx}`} disabled />
                ) : (
                  <Pagination.Item
                    key={item}
                    active={item === page}
                    onClick={() => onPageChange(item)}
                  >
                    {item + 1}
                  </Pagination.Item>
                )
              )}
            <Pagination.Next
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge bg={active ? "success" : "secondary"} className="fw-medium">
      {active ? "Ativo" : "Inativo"}
    </Badge>
  );
}
