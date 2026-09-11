import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button, Pagination, Spinner } from "react-bootstrap";

import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import { useResponsiveViewMode } from "@/lib/view-mode";
import { ViewToggle } from "@/components/ui/view-toggle";
import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { InputText } from "@/layouts/Form/Fields/Index";

/**
 * Busca da lista — campo isolado (não faz parte de um `useForm` maior, só
 * filtra a lista) mas ainda assim é `layouts/Form/Fields/InputText` (regra
 * 10 do AGENTS.md: nenhum elemento de input cru fora da biblioteca de
 * Fields). `methods` é local só pra esse campo.
 */
function ListSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const methods = useForm<{ search: string }>({ defaultValues: { search: value } });
  const search = methods.watch("search");

  useEffect(() => {
    if (search !== value) onChange(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (value !== methods.getValues("search")) methods.setValue("search", value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <InputText
      methods={methods}
      fieldName="search"
      placeholder={placeholder}
      config={{ containerClass: "mb-0" }}
    />
  );
}

export type CrudColumn<T> = {
  key: string;
  headerKey: TranslationKey;
  render: (item: T) => ReactNode;
};

export type CrudListPageProps<T> = {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  items: T[];
  columns: CrudColumn<T>[];
  renderCard: (item: T) => ReactNode;
  getItemKey: (item: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  emptyMessageKey?: TranslationKey;
  /** `true` quando os dados são mock (sem endpoint no Core) — mostra o `MockDataBanner`. */
  isMock?: boolean;
};

/**
 * Lista genérica: título, busca, colunas (tabela) ou card (via `ViewToggle`),
 * paginação, estado vazio/erro, botão "novo". Config por módulo — nunca
 * reimplementada por SPEC de área (SPEC-02 §3.7).
 */
export function CrudListPage<T>({
  titleKey,
  descriptionKey,
  items,
  columns,
  renderCard,
  getItemKey,
  isLoading,
  isError,
  search,
  onSearchChange,
  page,
  pageSize,
  total,
  onPageChange,
  onCreate,
  emptyMessageKey,
  isMock,
}: CrudListPageProps<T>) {
  const t = useT();
  const { viewMode, preferredMode, setViewMode, isMobile } = useResponsiveViewMode();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-0">{t(titleKey)}</h1>
          {descriptionKey ? <p className="text-body-secondary mb-0">{t(descriptionKey)}</p> : null}
        </div>
        {onCreate ? (
          <Button variant="primary" onClick={onCreate}>
            <i className="bi bi-plus-lg me-1" aria-hidden />
            {t("crud.list.new")}
          </Button>
        ) : null}
      </div>

      {isMock ? <MockDataBanner className="mb-3" /> : null}

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        {onSearchChange ? (
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <ListSearchInput
              value={search ?? ""}
              onChange={onSearchChange}
              placeholder={t("crud.list.searchPlaceholder")}
            />
          </div>
        ) : null}
        <ViewToggle
          value={preferredMode}
          onChange={setViewMode}
          hidden={isMobile}
          ariaLabel={t("crud.list.viewMode")}
        />
      </div>

      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : isError ? (
        <div className="alert alert-danger">{t("crud.list.error")}</div>
      ) : items.length === 0 ? (
        <div className="alert alert-secondary">{t(emptyMessageKey ?? "crud.list.empty")}</div>
      ) : viewMode === "cards" ? (
        <div className="row g-3">
          {items.map((item) => (
            <div className="col-12 col-sm-6 col-lg-4" key={getItemKey(item)}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{t(col.headerKey)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={getItemKey(item)}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination className="justify-content-center mt-3">
          <Pagination.Prev disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Pagination.Item key={p} active={p === page} onClick={() => onPageChange(p)}>
              {p}
            </Pagination.Item>
          ))}
          <Pagination.Next disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} />
        </Pagination>
      ) : null}
    </div>
  );
}
