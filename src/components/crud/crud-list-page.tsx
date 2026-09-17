import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button, Form, Table } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import type { UseQueryOptions } from "@tanstack/react-query";

import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import { useResponsiveViewMode, type ViewMode } from "@/lib/view-mode";
import { ViewToggle } from "@/components/ui/view-toggle";
import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { ListPagination } from "@/components/ui/list-pagination";
import { InputText } from "@/layouts/Form/Fields/Index";
import { useMounted } from "@/hooks/useMounted";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import styles from "./crud-list-page.module.css";

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
  /** Alinhamento do cabeçalho e da célula (ex.: `"end"` pra coluna numérica
   * de peso — SPEC-31). Sem valor, mantém o alinhamento padrão (`start`). */
  align?: "start" | "end" | "center";
  /**
   * Chave que o Core espera no parâmetro `Sort` (ex. `"notaFiscal"`) — SPEC-53.
   * Presente, o `<th>` vira clicável (asc → desc → sem ordenação). Ausente,
   * cabeçalho estático, sem mudança de comportamento (aditivo).
   */
  sortKey?: string;
};

/**
 * Seleção em massa de linhas (checkbox por linha + "selecionar tudo") — SPEC-53.
 * Prop opcional do `CrudListPage`; sem ela, nenhuma coluna extra é injetada e
 * nenhum dos demais consumidores muda de comportamento.
 */
export type CrudSelection<T> = {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  /**
   * Marca/desmarca só os itens selecionáveis (não desabilitados) da página
   * atual — `ids` já vem filtrado pelo `CrudListPage` (via `isDisabled`).
   */
  onToggleAll: (ids: string[], checked: boolean) => void;
  /** Linha não pode ser selecionada — checkbox desabilitado, sem `onClick`. */
  isDisabled?: (item: T) => boolean;
};

/**
 * Alterna a ordenação de uma coluna: sem ordenação → ascendente (`key`) →
 * descendente (`-key`) → volta a sem ordenação (`undefined`, Core aplica o
 * `defaultSort` do endpoint). Só uma coluna ordenada por vez — mesmo modelo
 * de `PageQuery.Sort` do Core (uma string só).
 */
function nextSort(current: string | undefined, key: string): string | undefined {
  if (current === key) return `-${key}`;
  if (current === `-${key}`) return undefined;
  return key;
}

/** Shape mínimo que toda resposta paginada do Core segue (`PagedDTOOfXxxDTO` gerado pelo Orval). */
export type CrudPagedResult<T> = {
  items: T[];
  total: number | string;
};

export type CrudListPageProps<
  T,
  TQueryData extends CrudPagedResult<T> = CrudPagedResult<T>,
  TError = unknown,
> = {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  /**
   * `queryOptions` já resolvido pros parâmetros atuais (busca/página) —
   * normalmente `xxxListQueryOptions(params)` do módulo
   * (`src/lib/queries/**`, mesma queryKey do hook Orval gerado, seedável no
   * loader da rota via server fn — ver `src/lib/queries/user.ts` +
   * `admin/access/index.tsx` como referência). `TQueryData` é o
   * `PagedDTOOfXxxDTO` gerado (só precisa ter `items`/`total`, o resto do
   * shape passa direto). O `CrudListPage` decide *como e quando* buscar
   * (SPEC-10) — a rota nunca chama `useQuery`/`useGetApiXxx` direto pro
   * dado da lista.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryOptions: UseQueryOptions<TQueryData, TError, TQueryData, any>;
  columns: CrudColumn<T>[];
  renderCard: (item: T) => ReactNode;
  getItemKey: (item: T) => string;
  search?: string;
  onSearchChange?: (value: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  emptyMessageKey?: TranslationKey;
  /** `true` quando os dados são mock (sem endpoint no Core) — mostra o `MockDataBanner`. */
  isMock?: boolean;
  /**
   * Slot opcional pra filtros extras da tela (ex.: papel/admin em
   * `admin/access`, SPEC-32) — renderizado no toolbar, ao lado da busca.
   * Cada tela monta seus próprios controles (React-Bootstrap puro, não é
   * formulário submetido) e decide o estado; o `CrudListPage` só reserva o
   * espaço. Consumidores que não passam `filters` não têm nenhuma mudança
   * de layout (slot ausente = nada renderizado).
   */
  filters?: ReactNode;
  /** `true` deixa a tabela com grade visível e mais densa (planilha Excel —
   * SPEC-31). Opt-in, `false` mantém o visual padrão (hairline, sem grade
   * vertical) usado pelas demais listagens CRUD. */
  spreadsheetVariant?: boolean;
  /**
   * Slot opcional de ações no cabeçalho, ao lado do título (ex.: botões
   * "Exportar"/"Importar" da aba Romaneio — SPEC-55). Cada tela monta seus
   * próprios controles (React-Bootstrap puro); o `CrudListPage` só reserva
   * o espaço, sem prop = nenhuma mudança de layout pras demais telas.
   */
  headerActions?: ReactNode;
  /**
   * Altura máxima da área da tabela (linhas) — define, ativa scroll
   * vertical interno (`overflow-y: auto`), com cabeçalho/toolbar de busca
   * e paginação fixos fora da área rolável (pedido do usuário na aba
   * Estufagem, SPEC-75). Ausente (padrão), mantém o comportamento atual:
   * tabela cresce livre, sem scroll próprio.
   */
  maxBodyHeight?: number | string;
  /** Seleção em massa (checkbox por linha + "selecionar tudo") — SPEC-53. */
  selection?: CrudSelection<T>;
  /** Valor cru do `Sort` atual (ex. `"-notaFiscal"`) — usado junto com
   * `CrudColumn.sortKey` pra deixar o cabeçalho clicável (SPEC-53). */
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
};

/**
 * Corpo da lista — só é montado depois que o `CrudListPage` confirma que já
 * está rodando no client (ver componente pai). É aqui que `useSsrSafeQuery`
 * roda de verdade: como este componente **nunca existe na árvore durante o
 * SSR** (só monta via `useEffect` do pai, que não roda no servidor), o hook
 * de busca nunca é registrado nem desidratado durante o SSR — não depende
 * só de `enabled: false` (a integração de streaming SSR do TanStack Query
 * pode ignorar `enabled` e buscar mesmo assim; a defesa real é o dado nunca
 * existir na árvore, ver SPEC-10).
 */
function CrudListPageBody<T, TQueryData extends CrudPagedResult<T>, TError>({
  queryOptions,
  columns,
  renderCard,
  getItemKey,
  page,
  pageSize,
  onPageChange,
  emptyMessageKey,
  viewMode,
  spreadsheetVariant,
  maxBodyHeight,
  selection,
  sort,
  onSortChange,
}: Pick<
  CrudListPageProps<T, TQueryData, TError>,
  | "queryOptions"
  | "columns"
  | "renderCard"
  | "getItemKey"
  | "page"
  | "pageSize"
  | "onPageChange"
  | "emptyMessageKey"
  | "spreadsheetVariant"
  | "maxBodyHeight"
  | "selection"
  | "sort"
  | "onSortChange"
> & { viewMode: ViewMode }) {
  const t = useT();
  const query = useSsrSafeQuery(queryOptions);
  const isLoading = query.isLoading;
  const isError = query.isError;
  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // "Selecionar tudo" só considera os itens selecionáveis (não desabilitados)
  // da página atual — linha desabilitada (ex.: Romaneio estufado) nunca entra
  // na seleção, mesmo via header (SPEC-53).
  const selectableItems = selection ? items.filter((item) => !selection.isDisabled?.(item)) : [];
  const allSelectableSelected =
    selection != null &&
    selectableItems.length > 0 &&
    selectableItems.every((item) => selection.selectedIds.has(getItemKey(item)));

  return (
    <>
      {isLoading ? (
        <LoadingState variant="inline" />
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
        <div
          className={styles.tableCard}
          style={maxBodyHeight ? { maxHeight: maxBodyHeight, overflowY: "auto" } : undefined}
        >
          <Table
            responsive
            hover
            bordered={spreadsheetVariant}
            size={spreadsheetVariant ? "sm" : undefined}
            className={`align-middle mb-0 ${styles.crudTable} ${
              spreadsheetVariant ? styles.crudTableSpreadsheet : ""
            }`}
          >
            <thead>
              <tr>
                {selection ? (
                  <th style={{ width: "1%" }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelectableSelected}
                      disabled={selectableItems.length === 0}
                      onChange={(e) =>
                        selection.onToggleAll(
                          selectableItems.map((item) => getItemKey(item)),
                          e.target.checked,
                        )
                      }
                      aria-label={t("crud.list.selectAll")}
                    />
                  </th>
                ) : null}
                {columns.map((col) => {
                  const active =
                    col.sortKey != null && (sort === col.sortKey || sort === `-${col.sortKey}`);
                  const descending = active && sort === `-${col.sortKey}`;
                  return (
                    <th
                      key={col.key}
                      className={col.align ? `text-${col.align}` : undefined}
                      role={col.sortKey ? "button" : undefined}
                      onClick={
                        col.sortKey
                          ? () => onSortChange?.(nextSort(sort, col.sortKey as string))
                          : undefined
                      }
                      style={col.sortKey ? { cursor: "pointer", userSelect: "none" } : undefined}
                    >
                      {t(col.headerKey)}
                      {col.sortKey ? (
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
                })}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const id = getItemKey(item);
                const disabledForSelection = selection?.isDisabled?.(item) ?? false;
                return (
                  <tr key={id}>
                    {selection ? (
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selection.selectedIds.has(id)}
                          disabled={disabledForSelection}
                          onChange={() => selection.onToggle(id)}
                          aria-label={t("crud.list.selectRow")}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} className={col.align ? `text-${col.align}` : undefined}>
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
}

/**
 * Lista genérica: título, busca, colunas (tabela) ou card (via `ViewToggle`),
 * paginação, estado vazio/erro, botão "novo". Config por módulo — nunca
 * reimplementada por SPEC de área (SPEC-02 §3.7). Busca o próprio dado via
 * `queryOptions` (SPEC-10) — nunca recebe `items` prontos da rota, pra
 * nenhum consumidor futuro esquecer o guard de SSR. O corpo (que chama o
 * hook de busca) só monta depois da hidratação (`mounted`), mostrando um
 * spinner até lá — garante que o hook nunca existe durante o SSR, em vez de
 * só ficar `enabled: false`.
 */
export function CrudListPage<
  T,
  TQueryData extends CrudPagedResult<T> = CrudPagedResult<T>,
  TError = unknown,
>({
  titleKey,
  descriptionKey,
  queryOptions,
  columns,
  renderCard,
  getItemKey,
  search,
  onSearchChange,
  page,
  pageSize,
  onPageChange,
  onCreate,
  emptyMessageKey,
  isMock,
  filters,
  spreadsheetVariant,
  maxBodyHeight,
  headerActions,
  selection,
  sort,
  onSortChange,
}: CrudListPageProps<T, TQueryData, TError>) {
  const t = useT();
  const { viewMode, preferredMode, setViewMode, isMobile } = useResponsiveViewMode();
  const mounted = useMounted();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3">
        <div>
          <h1 className="h4 mb-0">{t(titleKey)}</h1>
          {descriptionKey ? <p className="text-body-secondary mb-0">{t(descriptionKey)}</p> : null}
        </div>
        {headerActions ? (
          <div className="d-flex gap-2 flex-wrap flex-shrink-0">{headerActions}</div>
        ) : null}
      </div>

      {isMock ? <MockDataBanner className="mb-3" /> : null}

      {/* mb-4 (era mb-3) — respiro embaixo do toolbar de busca/toggle/criar,
          pedido do usuário (SPEC-11, escopo expandido). */}
      <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
        {onSearchChange ? (
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <ListSearchInput
              value={search ?? ""}
              onChange={onSearchChange}
              placeholder={t("crud.list.searchPlaceholder")}
            />
          </div>
        ) : null}
        {filters}
        <ViewToggle
          value={preferredMode}
          onChange={setViewMode}
          hidden={isMobile}
          ariaLabel={t("crud.list.viewMode")}
        />
        {onCreate ? (
          <Button variant="primary" onClick={onCreate}>
            <i className="bi bi-plus-lg me-1" aria-hidden />
            {t("crud.list.new")}
          </Button>
        ) : null}
      </div>

      {mounted ? (
        <CrudListPageBody
          queryOptions={queryOptions}
          columns={columns}
          renderCard={renderCard}
          getItemKey={getItemKey}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          emptyMessageKey={emptyMessageKey}
          viewMode={viewMode}
          spreadsheetVariant={spreadsheetVariant}
          maxBodyHeight={maxBodyHeight}
          selection={selection}
          sort={sort}
          onSortChange={onSortChange}
        />
      ) : (
        <LoadingState variant="inline" />
      )}
    </div>
  );
}
