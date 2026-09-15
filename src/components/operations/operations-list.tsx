import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Col, Row, Spinner, Table } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationIdQueryOptions,
  getGetApiOperationQueryKey,
  getGetApiOperationQueryOptions,
  usePostApiOperation,
  usePutApiOperationId,
} from "@/api/generated/endpoints/operation/operation";
import { getApiClient } from "@/api/generated/endpoints/client/client";
import { getApiProduct } from "@/api/generated/endpoints/product/product";
import { getApiVessel } from "@/api/generated/endpoints/vessel/vessel";
import {
  PostApiOperationBody,
  PutApiOperationIdBody,
} from "@/api/generated/zod/operation/operation.zod";
import type { OperationDetailDTO, OperationDTO } from "@/api/generated/model";
import {
  operationStatusOptions,
  resolveOperationStatusLabel,
} from "@/api/generated/static/operationStatusOptions";
import {
  operationTypeOptions,
  resolveOperationTypeLabel,
} from "@/api/generated/static/operationTypeOptions";
import {
  operationServiceOptions,
  resolveOperationServiceLabel,
} from "@/api/generated/static/operationServiceOptions";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ListPagination } from "@/components/ui/list-pagination";
import { InputText, Select, SelectAsync } from "@/layouts/Form/Fields/Index";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import type { Locale } from "@/i18n/config";
import { useResponsiveViewMode } from "@/lib/view-mode";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import styles from "./operations-list.module.css";

const PAGE_SIZE = 20;

// Cor semântica (token Bootstrap, nunca hex fixo — regra 8 do AGENTS.md) por
// status real de `OperationStatus` (Core).
const STATUS_VARIANT: Record<OperationDTO["status"], string> = {
  Draft: "secondary",
  InProgress: "primary",
  Finished: "success",
  Pause: "warning",
  Canceled: "danger",
};

/** Data `yyyy-mm-dd`/ISO completo → `dd/mm/aaaa`, mesmo corte de `formatDate` do legado (`OperationCards.tsx`). */
function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Date(value.slice(0, 10)).toLocaleDateString(locale, { timeZone: "UTC" });
}

/**
 * Nome de cliente/produto/navio por item — `OperationDTO` (item de lista) só
 * tem os ids, não os nomes; só `OperationDetailDTO` (`GET /api/operation/{id}`)
 * traz os objetos aninhados. Um fetch de detalhe por linha, limitado ao
 * tamanho da página (mesma decisão do legado, `useOperations.ts` do Portal —
 * ver "Riscos e bloqueios" item 2, opção B, no índice geral da SPEC-07):
 * falha de um item pontual não derruba os demais, a linha cai de volta pro id.
 */
function useOperationEnrichment(id: string) {
  const { data } = useSsrSafeQuery(getGetApiOperationIdQueryOptions(id));
  return {
    clientName: data?.client?.fullName,
    productName: data?.product?.name,
    vesselName: data?.vessel?.name,
    detail: data,
  };
}

type OperationFiltersValues = {
  opType: string;
  status: string;
  clientId: string;
};

/**
 * Busca livre (`Search` do Core) — campo isolado (não faz parte de um
 * `useForm` maior, só filtra a lista), mesmo racional do `ListSearchInput`
 * de `crud-list-page.tsx` (regra 10 do AGENTS.md: `layouts/Form/Fields`,
 * nunca `<input>` cru).
 */
function OperationsSearchInput({
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

/**
 * Barra de filtros (tipo/status/cliente, RF3 da SPEC-07-01) — `Select`/
 * `SelectAsync` (SPEC-SHARE-01) exigem `methods` de um `useForm`, mesmo fora
 * de um formulário de submit; aqui os valores só são espelhados pro estado
 * do componente pai a cada mudança (mesma ideia do `ListSearchInput` de
 * `crud-list-page.tsx`, generalizada pra 3 campos).
 */
function OperationsFilters({
  value,
  onChange,
}: {
  value: OperationFiltersValues;
  onChange: (value: OperationFiltersValues) => void;
}) {
  const t = useT();
  const methods = useForm<OperationFiltersValues>({ defaultValues: value });
  const watched = methods.watch();

  useEffect(() => {
    if (
      watched.opType !== value.opType ||
      watched.status !== value.status ||
      watched.clientId !== value.clientId
    ) {
      onChange(watched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched.opType, watched.status, watched.clientId]);

  useEffect(() => {
    const current = methods.getValues();
    if (
      current.opType !== value.opType ||
      current.status !== value.status ||
      current.clientId !== value.clientId
    ) {
      methods.reset(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.opType, value.status, value.clientId]);

  return (
    <Row className="g-2 flex-grow-1">
      <Select
        methods={methods}
        fieldName="opType"
        label={t("administrative-operations.filters.type")}
        enumOptions={operationTypeOptions}
        config={{
          placeholder: t("administrative-operations.filters.typePlaceholder"),
          containerClass: "mb-0",
        }}
        md={3}
      />
      <Select
        methods={methods}
        fieldName="status"
        label={t("administrative-operations.filters.status")}
        enumOptions={operationStatusOptions}
        config={{
          placeholder: t("administrative-operations.filters.statusPlaceholder"),
          containerClass: "mb-0",
        }}
        md={3}
      />
      <SelectAsync
        methods={methods}
        fieldName="clientId"
        label={t("administrative-operations.filters.client")}
        config={{
          placeholder: t("administrative-operations.filters.clientPlaceholder"),
          containerClass: "mb-0",
          fetchOptions: (search) =>
            getApiClient({ Search: search, Limit: 20 }).then((res) =>
              res.items.map((c) => ({ value: c.id, label: c.fullName })),
            ),
        }}
        md={4}
      />
    </Row>
  );
}

// Create/Update do Core têm shapes diferentes (`opType`/`opService`/
// `booking`/`instruction` só existem na criação — travados depois, regra do
// Core) — dois schemas gerados, dois `LayoutField[]`, nunca um Zod escrito à
// mão (regra 2 do AGENTS.md).
type OperationCreateValues = z.infer<typeof PostApiOperationBody>;
type OperationEditValues = z.infer<typeof PutApiOperationIdBody>;

function createDefaultValues(): OperationCreateValues {
  return {
    booking: "",
    instruction: "",
    // Enum obrigatório sem opção vazia própria — "" só existe pro placeholder
    // do `Select` (regra 10) até o usuário escolher; a validação Zod gerada
    // barra o submit sem escolha real.
    opType: "" as OperationCreateValues["opType"],
    opService: "" as OperationCreateValues["opService"],
    clientId: "",
    productId: "",
    vesselId: "",
    nameDate: "",
    opDate: "",
    startDate: "",
    observation: "",
  };
}

function editDefaultValues(record?: OperationDetailDTO): OperationEditValues {
  return {
    clientId: record?.clientId ?? "",
    productId: record?.productId ?? "",
    vesselId: record?.vesselId ?? "",
    nameDate: record?.nameDate ?? "",
    opDate: record?.opDate ?? "",
    startDate: record?.startDate ?? "",
    observation: record?.observation ?? "",
  };
}

/** Resumo somente-leitura dos campos travados após a criação (`opType`/`opService`/`booking`/`instruction`/`status`/`number`) — não fazem parte de `PutApiOperationIdBody`, então não são `LayoutField`, só texto no `extraContent` do modal (§9 da SPEC-02). */
function OperationSummary({ operation }: { operation: OperationDetailDTO }) {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="mt-4 border-top pt-3">
      <Row className="g-2 small">
        <Col md={3}>
          <strong>{t("administrative-operations.detail.number")}:</strong> {operation.number}
        </Col>
        <Col md={3}>
          <strong>{t("administrative-operations.detail.status")}:</strong>{" "}
          <Badge bg={STATUS_VARIANT[operation.status]}>
            {resolveOperationStatusLabel(operation.status, locale)}
          </Badge>
        </Col>
        <Col md={3}>
          <strong>{t("administrative-operations.detail.type")}:</strong>{" "}
          {resolveOperationTypeLabel(operation.opType, locale)}
        </Col>
        <Col md={3}>
          <strong>{t("administrative-operations.detail.service")}:</strong>{" "}
          {resolveOperationServiceLabel(operation.opService, locale)}
        </Col>
        <Col md={6}>
          <strong>{t("administrative-operations.detail.booking")}:</strong>{" "}
          {operation.booking || "—"}
        </Col>
        <Col md={6}>
          <strong>{t("administrative-operations.detail.instruction")}:</strong>{" "}
          {operation.instruction || "—"}
        </Col>
      </Row>
    </div>
  );
}

export type OperationsListProps = {
  /**
   * Esconde criar/editar (sem endpoint de exclusão no Core — `Operation` não
   * tem `DELETE`) mantendo listagem/filtro/busca (RF2 da SPEC-07-01). É o
   * modo que a SPEC-08 (`operacional`) consome, sem editar este arquivo.
   */
  readOnly?: boolean;
};

/**
 * Lista real de Operações (`Operation` API) — filtro por tipo/status/cliente
 * (`Select`/`SelectAsync`, SPEC-SHARE-01), paginação, `ViewToggle`. Não reusa
 * o `CrudListPage` genérico (SPEC-02): os filtros e o enriquecimento de nome
 * de cliente/produto/navio por item são mais complexos do que o molde
 * genérico cobre (§9 da SPEC-07-01).
 */
export function OperationsList({ readOnly = false }: OperationsListProps) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { viewMode, preferredMode, setViewMode, isMobile } = useResponsiveViewMode();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<OperationFiltersValues>({
    opType: "",
    status: "",
    clientId: "",
  });

  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: OperationDetailDTO } | null>(
    null,
  );
  // Requisição de detalhe (`GET /api/operation/{id}`) em andamento — só
  // depois dela resolver é que o modal `edit`/`view` abre (mesmo padrão de
  // `administrative/clients/index.tsx`, `detailRequest`).
  const [detailRequest, setDetailRequest] = useState<{
    id: string;
    mode: Extract<CrudRecordMode, "edit" | "view">;
  } | null>(null);

  const listQueryOptions = getGetApiOperationQueryOptions({
    Search: search || undefined,
    OpType: (filters.opType || undefined) as OperationDTO["opType"] | undefined,
    Status: (filters.status || undefined) as OperationDTO["status"] | undefined,
    ClientId: filters.clientId || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: "-number",
  });
  const query = useSsrSafeQuery(listQueryOptions);
  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiOperationQueryKey() });

  const createMutation = usePostApiOperation();
  const updateMutation = usePutApiOperationId();

  const detailQueryOptions = getGetApiOperationIdQueryOptions(detailRequest?.id ?? "");
  const detailQuery = useSsrSafeQuery({ ...detailQueryOptions, enabled: !!detailRequest });

  useEffect(() => {
    if (detailRequest && detailQuery.data && detailQuery.data.id === detailRequest.id) {
      setModal({ mode: detailRequest.mode, record: detailQuery.data });
      setDetailRequest(null);
    }
  }, [detailRequest, detailQuery.data]);

  useEffect(() => {
    if (detailRequest && detailQuery.isError) {
      toast.error(t("administrative-operations.toast.loadError"));
      setDetailRequest(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailRequest, detailQuery.isError]);

  const fetchClientOptions = (searchTerm: string) =>
    getApiClient({ Search: searchTerm, Limit: 20 }).then((res) =>
      res.items.map((c) => ({ value: c.id, label: c.fullName })),
    );
  const fetchProductOptions = (searchTerm: string) =>
    getApiProduct({ Search: searchTerm, Limit: 20 }).then((res) =>
      res.items.map((p) => ({ value: p.id, label: p.name })),
    );
  const fetchVesselOptions = (searchTerm: string) =>
    getApiVessel({ Search: searchTerm, Limit: 20 }).then((res) =>
      res.items.map((v) => ({ value: v.id, label: v.name })),
    );

  const createFields: LayoutField[] = [
    {
      type: "Select",
      fieldName: "opType",
      label: t("administrative-operations.form.opType"),
      col: { md: 4 },
      config: { enumOptions: operationTypeOptions },
    },
    {
      // Campo obrigatório no `PostApiOperationBody` (zod.enum(['Bale','Bag']))
      // que faltava aqui — sem ele o submit sempre falhava a validação
      // silenciosamente (opType parecia ser o único enum "quebrado").
      type: "Select",
      fieldName: "opService",
      label: t("administrative-operations.form.opService"),
      col: { md: 4 },
      config: { enumOptions: operationServiceOptions },
    },
    {
      type: "SelectAsync",
      fieldName: "clientId",
      label: t("administrative-operations.form.client"),
      col: { md: 4 },
      config: { fetchOptions: fetchClientOptions },
    },
    {
      type: "SelectAsync",
      fieldName: "productId",
      label: t("administrative-operations.form.product"),
      col: { md: 4 },
      config: { fetchOptions: fetchProductOptions },
    },
    {
      type: "SelectAsync",
      fieldName: "vesselId",
      label: t("administrative-operations.form.vessel"),
      col: { md: 6 },
      config: { fetchOptions: fetchVesselOptions },
    },
    {
      type: "InputText",
      fieldName: "booking",
      label: t("administrative-operations.form.booking"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "instruction",
      label: t("administrative-operations.form.instruction"),
      col: { md: 12 },
    },
    {
      type: "InputDate",
      fieldName: "nameDate",
      label: t("administrative-operations.form.nameDate"),
      col: { md: 4 },
    },
    {
      type: "InputDate",
      fieldName: "opDate",
      label: t("administrative-operations.form.opDate"),
      col: { md: 4 },
    },
    {
      type: "InputDate",
      fieldName: "startDate",
      label: t("administrative-operations.form.startDate"),
      col: { md: 4 },
    },
    {
      type: "InputTextArea",
      fieldName: "observation",
      label: t("administrative-operations.form.observation"),
      col: { md: 12 },
    },
  ];

  const editFields: LayoutField[] = [
    {
      type: "SelectAsync",
      fieldName: "clientId",
      label: t("administrative-operations.form.client"),
      col: { md: 6 },
      config: { fetchOptions: fetchClientOptions, selectedLabel: modal?.record?.client.fullName },
    },
    {
      type: "SelectAsync",
      fieldName: "productId",
      label: t("administrative-operations.form.product"),
      col: { md: 6 },
      config: { fetchOptions: fetchProductOptions, selectedLabel: modal?.record?.product.name },
    },
    {
      type: "SelectAsync",
      fieldName: "vesselId",
      label: t("administrative-operations.form.vessel"),
      col: { md: 6 },
      config: {
        fetchOptions: fetchVesselOptions,
        selectedLabel: modal?.record?.vessel?.name ?? undefined,
      },
    },
    {
      type: "InputDate",
      fieldName: "nameDate",
      label: t("administrative-operations.form.nameDate"),
      col: { md: 6 },
    },
    {
      type: "InputDate",
      fieldName: "opDate",
      label: t("administrative-operations.form.opDate"),
      col: { md: 6 },
    },
    {
      type: "InputDate",
      fieldName: "startDate",
      label: t("administrative-operations.form.startDate"),
      col: { md: 6 },
    },
    {
      type: "InputTextArea",
      fieldName: "observation",
      label: t("administrative-operations.form.observation"),
      col: { md: 12 },
    },
  ];

  const handleCreateSubmit = async (values: OperationCreateValues) => {
    try {
      await createMutation.mutateAsync({ data: values });
      toast.success(t("administrative-operations.toast.created"));
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-operations.toast.error"));
    }
  };

  const handleEditSubmit = async (values: OperationEditValues) => {
    if (!modal?.record) return;
    try {
      await updateMutation.mutateAsync({ id: modal.record.id, data: values });
      toast.success(t("administrative-operations.toast.updated"));
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-operations.toast.error"));
    }
  };

  const renderStatusBadge = (status: OperationDTO["status"]) => (
    <Badge bg={STATUS_VARIANT[status]}>{resolveOperationStatusLabel(status, locale)}</Badge>
  );

  // Clique em "visualizar" — no modo completo (administrativo) navega pra
  // página de detalhe com abas (`administrative/operations/$id`, SPEC-07-02
  // a 07-09, que já existia mas não tinha nenhum link apontando pra ela).
  // No modo `readOnly` (SPEC-08, área Operacional) mantém o modal antigo:
  // aquela área tem seu próprio detalhe mock e desacoplado por decisão
  // explícita do usuário (D1 da SPEC-08) — o id real de `operation.id` não
  // bate com os ids mock daquela tela, então não dá pra navegar pra lá.
  const viewOperation = (id: string) => {
    if (readOnly) {
      setDetailRequest({ id, mode: "view" });
      return;
    }
    navigate({ to: "/administrative/operations/$id", params: { id } });
  };

  const renderRowActions = (operation: OperationDTO) => {
    const isLoadingDetail = detailRequest?.id === operation.id;
    return (
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          disabled={isLoadingDetail}
          onClick={() => viewOperation(operation.id)}
        >
          {isLoadingDetail && detailRequest?.mode === "view" ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <i className="bi bi-eye" aria-hidden />
          )}
        </button>
        {!readOnly ? (
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            disabled={isLoadingDetail}
            onClick={() => setDetailRequest({ id: operation.id, mode: "edit" })}
          >
            {isLoadingDetail && detailRequest?.mode === "edit" ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <i className="bi bi-pencil" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3">
        <h1 className="h4 mb-0">{t("administrative-operations.title")}</h1>
        <p className="text-body-secondary mb-0">{t("administrative-operations.description")}</p>
      </div>

      <div className="d-flex align-items-start gap-2 mb-4 flex-wrap">
        <div style={{ minWidth: 220 }}>
          <OperationsSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t("administrative-operations.searchPlaceholder")}
          />
        </div>
        <OperationsFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
        <ViewToggle
          value={preferredMode}
          onChange={setViewMode}
          hidden={isMobile}
          ariaLabel={t("crud.list.viewMode")}
        />
        {!readOnly ? (
          <Button
            variant="primary"
            className="flex-shrink-0"
            onClick={() => setModal({ mode: "create" })}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden />
            {t("administrative-operations.newButton")}
          </Button>
        ) : null}
      </div>

      {!mounted ? (
        <LoadingState variant="inline" />
      ) : query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger">{t("crud.list.error")}</div>
      ) : items.length === 0 ? (
        <div className="alert alert-secondary">{t("administrative-operations.emptyState")}</div>
      ) : viewMode === "cards" ? (
        <div className="row g-3">
          {items.map((operation) => (
            <OperationCard
              key={operation.id}
              operation={operation}
              locale={locale}
              onView={() => viewOperation(operation.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <Table responsive hover className={`align-middle mb-0 ${styles.operationsTable}`}>
            <thead>
              <tr>
                <th>{t("administrative-operations.colNumber")}</th>
                <th>{t("administrative-operations.colClient")}</th>
                <th>{t("administrative-operations.colProduct")}</th>
                <th>{t("administrative-operations.colBooking")}</th>
                <th>{t("administrative-operations.colType")}</th>
                <th>{t("administrative-operations.colService")}</th>
                <th>{t("administrative-operations.colStatus")}</th>
                <th>{t("administrative-operations.colOpDate")}</th>
                <th>{t("administrative-operations.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((operation) => (
                <OperationRow
                  key={operation.id}
                  operation={operation}
                  locale={locale}
                  renderStatusBadge={renderStatusBadge}
                  renderActions={renderRowActions}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {modal?.mode === "create" ? (
        <CrudRecordModal<OperationCreateValues>
          show
          mode="create"
          titleKeys={{
            create: "administrative-operations.newTitle",
            edit: "administrative-operations.editTitle",
            view: "administrative-operations.viewTitle",
          }}
          schema={PostApiOperationBody}
          fields={createFields}
          defaultValues={createDefaultValues()}
          onSubmit={handleCreateSubmit}
          onClose={() => setModal(null)}
        />
      ) : modal?.mode === "edit" || modal?.mode === "view" ? (
        <CrudRecordModal<OperationEditValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-operations.newTitle",
            edit: "administrative-operations.editTitle",
            view: "administrative-operations.viewTitle",
          }}
          schema={PutApiOperationIdBody}
          fields={editFields}
          defaultValues={editDefaultValues(modal.record)}
          onSubmit={handleEditSubmit}
          onClose={() => setModal(null)}
          extraContent={modal.record ? <OperationSummary operation={modal.record} /> : undefined}
        />
      ) : null}
    </div>
  );
}

/** Linha da tabela — busca o detalhe (enriquecimento) uma vez, reusa pras 3 colunas de nome. */
function OperationRow({
  operation,
  locale,
  renderStatusBadge,
  renderActions,
}: {
  operation: OperationDTO;
  locale: Locale;
  renderStatusBadge: (status: OperationDTO["status"]) => ReactNode;
  renderActions: (operation: OperationDTO) => ReactNode;
}) {
  const { clientName, productName } = useOperationEnrichment(operation.id);

  return (
    <tr>
      <td className="font-monospace">Nº {operation.number}</td>
      <td className="fw-semibold">{clientName ?? operation.clientId}</td>
      <td className="text-body-secondary">{productName ?? operation.productId}</td>
      <td className="text-body-secondary">{operation.booking || "—"}</td>
      <td>{resolveOperationTypeLabel(operation.opType, locale)}</td>
      <td>{resolveOperationServiceLabel(operation.opService, locale)}</td>
      <td>{renderStatusBadge(operation.status)}</td>
      <td className="text-body-secondary">{formatDate(operation.opDate, locale)}</td>
      <td>{renderActions(operation)}</td>
    </tr>
  );
}

/** Card (modo `cards` do `ViewToggle`) — mesmo enriquecimento da linha da tabela. */
function OperationCard({
  operation,
  locale,
  onView,
}: {
  operation: OperationDTO;
  locale: Locale;
  onView: () => void;
}) {
  const t = useT();
  const { clientName, productName } = useOperationEnrichment(operation.id);

  return (
    <div className="col-12 col-sm-6 col-lg-4">
      <Card role="button" onClick={onView}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <span className="small text-body-secondary font-monospace">Nº {operation.number}</span>
            <Badge bg={STATUS_VARIANT[operation.status]}>
              {resolveOperationStatusLabel(operation.status, locale)}
            </Badge>
          </div>
          <Card.Title className="h6 mb-1">{clientName ?? operation.clientId}</Card.Title>
          <Card.Subtitle className="text-body-secondary small mb-2">
            {productName ?? operation.productId}
          </Card.Subtitle>
          <div className="d-flex gap-2 small text-body-secondary">
            <span>{resolveOperationTypeLabel(operation.opType, locale)}</span>
            <span aria-hidden>·</span>
            <span>{resolveOperationServiceLabel(operation.opService, locale)}</span>
          </div>
          {operation.booking ? (
            <div className="small text-body-secondary mt-1">
              {t("administrative-operations.colBooking")}: {operation.booking}
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
