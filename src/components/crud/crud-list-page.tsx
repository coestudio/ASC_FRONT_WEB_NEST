import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, Form, Table } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import type { UseQueryOptions } from "@tanstack/react-query";

import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import { useResponsiveViewMode, type ViewMode } from "@/lib/view-mode";
import { ViewToggle } from "@/components/ui/view-toggle";
import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { ListPagination } from "@/components/ui/list-pagination";
import { FilterText } from "@/layouts/Filters/Index";
import { useMounted } from "@/hooks/useMounted";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { nextSort } from "./sort";
import styles from "./crud-list-page.module.css";

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
   * `true` faz a área da tabela (linhas) preencher exatamente o espaço
   * vertical restante até o fim da viewport, com scroll interno
   * (`overflow-y: auto`) e cabeçalho de coluna fixo (`position: sticky`)
   * — pedido do usuário na aba Estufagem, SPEC-75. A altura é medida
   * via `getBoundingClientRect`/`ResizeObserver` (não um valor fixo em
   * px) — tudo que vem antes (título, busca, toolbar) e depois
   * (paginação) da tabela ocupa só o espaço que precisa; a tabela cobre
   * o resto, mesmo com poucos itens (o fundo do card preenche a sobra,
   * deixando visualmente claro que não há mais itens abaixo). Ausente
   * (padrão), nenhuma mudança de comportamento — tabela cresce livre,
   * sem scroll próprio, cabeçalho não fixo.
   */
  fillHeight?: boolean;
  /**
   * Slot opcional renderizado abaixo da linha de busca/toggle/criar e
   * acima da listagem (tabela/cards) — ex.: toolbar de ação em massa da
   * Estufagem (SPEC-73/76), que precisa ficar colada na listagem, não
   * junto do título. Ausente, nenhuma mudança de layout.
   */
  belowSearch?: ReactNode;
  /** Seleção em massa (checkbox por linha + "selecionar tudo") — SPEC-53. */
  selection?: CrudSelection<T>;
  /** Valor cru do `Sort` atual (ex. `"-notaFiscal"`) — usado junto com
   * `CrudColumn.sortKey` pra deixar o cabeçalho clicável (SPEC-53). */
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
  /**
   * Menu de ações por item, revelado ao clicar na linha/card — SPEC-79
   * (reaberta: menu nasce na posição exata do clique, `clientX`/`clientY`,
   * nenhuma coluna/célula reservada). Substitui a antiga coluna fixa de
   * ações (`CrudColumn` com `key: "actions"`): sem essa prop, nada muda pro
   * resto dos consumidores. Quem chama monta `<CrudRowActions show={ctl.show}
   * position={ctl.position} onToggle={ctl.onToggle} onView={...} ... />`,
   * repassando o `show`/`position`/`onToggle` controlado que o
   * `CrudListPage` calcula a partir do clique — o item recebido já é o
   * registro clicado (só um item ativo por vez, então `rowActions` só é
   * chamado uma vez por render, não uma vez por linha).
   */
  rowActions?: (
    item: T,
    ctl: { show: boolean; position: { x: number; y: number }; onToggle: (show: boolean) => void },
  ) => ReactNode;
  /**
   * Duplo-clique (ou atalho de mouse equivalente) na linha/card — SPEC-79.
   * Mesmo destino que "Ver" no menu de `rowActions` (mesmo `onView` que o
   * consumidor já usa lá), só que sem precisar abrir o menu primeiro. Sem
   * `rowActions`, esta prop não tem efeito (linha/card não fica clicável).
   */
  onRowOpen?: (item: T) => void;
  /**
   * Clique simples na linha (fora de checkbox/botão) — pedido do usuário na
   * aba Romaneio (2026-09-17): seleciona o item sem precisar acertar o
   * checkbox. Independente de `rowActions`/`selection`; opcional e aditivo
   * — sem ela, nenhuma mudança de comportamento nas demais listagens.
   */
  onRowSingleClick?: (item: T) => void;
  /**
   * Duplo-clique na linha (fora de checkbox/botão) — mesmo pedido, abre
   * edição do item direto. Independente de `rowActions`/`onRowOpen`;
   * opcional e aditivo.
   */
  onRowDoubleClick?: (item: T) => void;
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
/** Espaço reservado embaixo da área preenchida — mesmo valor do padding
 * inferior de `.content` (AppShell, 1.5rem) pra manter o respiro visual
 * já usado no resto do app. */
const FILL_BOTTOM_GAP_PX = 24;
/** Nunca deixa a tabela menor que isso, mesmo em viewports muito baixas
 * (ex. mobile com teclado aberto) — evita uma altura negativa/inútil. */
const FILL_MIN_HEIGHT_PX = 160;

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
  fillHeight,
  selection,
  sort,
  onSortChange,
  rowActions,
  onRowOpen,
  onRowSingleClick,
  onRowDoubleClick,
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
  | "fillHeight"
  | "selection"
  | "sort"
  | "onSortChange"
  | "rowActions"
  | "onRowOpen"
  | "onRowSingleClick"
  | "onRowDoubleClick"
> & { viewMode: ViewMode }) {
  const t = useT();
  const query = useSsrSafeQuery(queryOptions);
  // Clique seleciona/revela o menu de `rowActions` daquele item, na posição
  // exata do clique (`clientX`/`clientY` — pedido do usuário, SPEC-79
  // reaberta: nada de coluna/célula reservada nem menu ancorado num ponto
  // fixo da linha); duplo-clique aciona `onRowOpen` direto. Só um item ativo
  // por vez — o próprio `CrudRowActions` (modo controlado) fecha ao clicar
  // fora ou em `Escape`.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const isLoading = query.isLoading;
  const isError = query.isError;
  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeItem =
    activeId != null ? (items.find((item) => getItemKey(item) === activeId) ?? null) : null;

  // "Selecionar tudo" só considera os itens selecionáveis (não desabilitados)
  // da página atual — linha desabilitada (ex.: Romaneio estufado) nunca entra
  // na seleção, mesmo via header (SPEC-53).
  const selectableItems = selection ? items.filter((item) => !selection.isDisabled?.(item)) : [];
  const allSelectableSelected =
    selection != null &&
    selectableItems.length > 0 &&
    selectableItems.every((item) => selection.selectedIds.has(getItemKey(item)));

  // SPEC-75/78: mede a posição real da área de listagem (via
  // `getBoundingClientRect`, não um número fixo) — tudo que renderiza
  // antes dela (título, busca, toolbar de seleção de quem chama) já
  // empurrou `top` pra baixo naturalmente, e a altura da paginação (que
  // pode nem existir, com 1 página só) é medida do jeito que ela
  // realmente ocupa. O resultado é a altura exata que sobra até o fim da
  // viewport, sem estimar nada. `fillCardRef` é reaproveitado nas duas
  // visões (tabela/cards, SPEC-78) — só uma existe no DOM por vez.
  const fillCardRef = useRef<HTMLDivElement>(null);
  const fillPaginationRef = useRef<HTMLDivElement>(null);
  const [fillBodyHeight, setFillBodyHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!fillHeight) return undefined;

    let lastHeight: number | undefined;
    const recompute = () => {
      const cardTop = fillCardRef.current?.getBoundingClientRect().top;
      if (cardTop == null) return;
      const paginationHeight = fillPaginationRef.current?.getBoundingClientRect().height ?? 0;
      const next = Math.max(
        FILL_MIN_HEIGHT_PX,
        window.innerHeight - cardTop - paginationHeight - FILL_BOTTOM_GAP_PX,
      );
      if (next !== lastHeight) {
        lastHeight = next;
        setFillBodyHeight(next);
      }
    };

    recompute();
    window.addEventListener("resize", recompute);
    // Pega mudança de layout que não é resize de janela (ex.: toolbar de
    // seleção aparecendo acima desta lista, no componente que chama).
    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("resize", recompute);
      resizeObserver.disconnect();
    };
  }, [fillHeight, items.length, isLoading, isError, viewMode]);

  return (
    <>
      {isLoading ? (
        <LoadingState variant="inline" />
      ) : isError ? (
        <div className="alert alert-danger">{t("crud.list.error")}</div>
      ) : items.length === 0 ? (
        <div className="alert alert-secondary">{t(emptyMessageKey ?? "crud.list.empty")}</div>
      ) : viewMode === "cards" ? (
        <div
          ref={fillCardRef}
          style={fillHeight ? { height: fillBodyHeight, overflowY: "auto" } : undefined}
        >
          <div className="row g-3">
            {items.map((item) => {
              const id = getItemKey(item);
              return (
                <div className="col-12 col-sm-6 col-lg-4" key={id}>
                  {rowActions ? (
                    <div
                      className={activeId === id ? styles.cardActive : undefined}
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        setActiveId(id);
                        setClickPos({ x: e.clientX, y: e.clientY });
                      }}
                      onDoubleClick={() => {
                        onRowOpen?.(item);
                        setActiveId(null);
                      }}
                    >
                      {renderCard(item)}
                    </div>
                  ) : (
                    renderCard(item)
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          ref={fillCardRef}
          className={styles.tableCard}
          style={fillHeight ? { height: fillBodyHeight, overflowY: "auto" } : undefined}
        >
          <Table
            // `responsive` (Bootstrap) injeta um `div.table-responsive` com
            // `overflow-x: auto` entre este card e o `<thead>` — o
            // `position: sticky` gruda no ancestral rolável *mais próximo*,
            // e esse `div` conta como um mesmo só rolando no eixo
            // horizontal, quebrando o cabeçalho fixo. Em `fillHeight`, quem
            // rola é o próprio `.tableCard` (`ref={fillCardRef}` acima) —
            // sem o wrapper extra, o sticky gruda nele corretamente.
            responsive={!fillHeight}
            hover
            bordered={spreadsheetVariant}
            size={spreadsheetVariant ? "sm" : undefined}
            className={`align-middle mb-0 ${styles.crudTable} ${
              spreadsheetVariant ? styles.crudTableSpreadsheet : ""
            } ${fillHeight ? styles.crudTableStickyHead : ""}`}
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
                  <tr
                    key={id}
                    onClick={
                      rowActions
                        ? (e) => {
                            setActiveId(id);
                            setClickPos({ x: e.clientX, y: e.clientY });
                          }
                        : onRowSingleClick
                          ? (e) => {
                              // Ignora clique em checkbox/botão dentro da linha —
                              // esses já têm o próprio handler (ex. toggle do
                              // checkbox de seleção, ícone de ação).
                              if ((e.target as HTMLElement).closest("button, a, input, label")) return;
                              onRowSingleClick(item);
                            }
                          : undefined
                    }
                    onDoubleClick={
                      rowActions
                        ? () => {
                            onRowOpen?.(item);
                            setActiveId(null);
                          }
                        : onRowDoubleClick
                          ? (e) => {
                              if ((e.target as HTMLElement).closest("button, a, input, label")) return;
                              onRowDoubleClick(item);
                            }
                          : undefined
                    }
                    className={rowActions && activeId === id ? "table-active" : undefined}
                    style={
                      rowActions || onRowSingleClick || onRowDoubleClick
                        ? { cursor: "pointer" }
                        : undefined
                    }
                  >
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

      <div ref={fillPaginationRef}>
        <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>

      {rowActions && activeItem && clickPos
        ? rowActions(activeItem, {
            show: true,
            position: clickPos,
            onToggle: (show) => {
              if (!show) {
                setActiveId(null);
                setClickPos(null);
              }
            },
          })
        : null}
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
  fillHeight,
  belowSearch,
  headerActions,
  selection,
  sort,
  onSortChange,
  rowActions,
  onRowOpen,
  onRowSingleClick,
  onRowDoubleClick,
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
            <FilterText
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

      {belowSearch}

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
          fillHeight={fillHeight}
          selection={selection}
          sort={sort}
          onSortChange={onSortChange}
          rowActions={rowActions}
          onRowOpen={onRowOpen}
          onRowSingleClick={onRowSingleClick}
          onRowDoubleClick={onRowDoubleClick}
        />
      ) : (
        <LoadingState variant="inline" />
      )}
    </div>
  );
}
