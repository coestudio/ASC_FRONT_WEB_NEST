import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Form, Nav, Spinner, Tab, Table } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationOperationIdCargoQueryKey,
  getGetApiOperationOperationIdCargoQueryOptions,
  usePostApiOperationOperationIdCargoIdCancel,
  usePostApiOperationOperationIdCargoStuffIdentifiedBatch,
  usePostApiOperationOperationIdCargoStuffQuantity,
} from "@/api/generated/endpoints/cargo-unit/cargo-unit";
import {
  PostApiOperationOperationIdCargoIdCancelBody,
  PostApiOperationOperationIdCargoStuffQuantityBody,
} from "@/api/generated/zod/cargo-unit/cargo-unit.zod";
import { getApiOperationOperationIdInvoice } from "@/api/generated/endpoints/invoice/invoice";
import {
  getGetApiOperationOperationIdRomaneioQueryKey,
  getGetApiOperationOperationIdRomaneioQueryOptions,
} from "@/api/generated/endpoints/romaneio/romaneio";
import {
  getApiOperationOperationIdContainer,
  getGetApiOperationOperationIdContainerQueryOptions,
} from "@/api/generated/endpoints/operation-container/operation-container";
import type { CargoUnitDTO, RomaneioDTO } from "@/api/generated/model";
import { resolveCargoUnitStatusLabel } from "@/api/generated/static/cargoUnitStatusOptions";
import {
  CrudListPage,
  type CrudColumn,
  type CrudSelection,
} from "@/components/crud/crud-list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { InputNumber, InputText, InputTextArea, SelectAsync } from "@/layouts/Form/Fields/Index";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StuffQuantityFormValues = z.infer<typeof PostApiOperationOperationIdCargoStuffQuantityBody>;
type CancelCargoFormValues = z.infer<typeof PostApiOperationOperationIdCargoIdCancelBody>;
type ContainerPickFormValues = { containerOperationId: string };

/**
 * Aba "Operacional" (SPEC-60) — duas sub-abas, Estufagem e Desestufagem,
 * ambas migradas tal e qual da antiga aba Containers (histórico:
 * SPEC-07-11 criou estufagem, SPEC-36 criou desestufagem, SPEC-42/46
 * estenderam estufagem) — mudança de localização, sem mudança de
 * comportamento. Mesmo padrão de sub-abas de `Invoice.tsx` (SPEC-41):
 * `Nav`/`Tab.Container` do React-Bootstrap, `variant="pills"` pra não
 * conflitar visualmente com a `Nav variant="tabs"` do shell de Operação um
 * nível acima. Sem rota própria — montada pelo shell via estado local.
 */
export function Operational({ operationId }: { operationId: string }) {
  const t = useT();

  return (
    <Tab.Container defaultActiveKey="stuffing" id={`operational-subtabs-${operationId}`}>
      <Nav variant="pills" className="mb-3">
        <Nav.Item>
          <Nav.Link eventKey="stuffing">
            {t("administrative-operations.operational.subtabs.stuffing")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="destuffing">
            {t("administrative-operations.operational.subtabs.destuffing")}
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Tab.Content>
        <Tab.Pane eventKey="stuffing">
          <StuffingTab operationId={operationId} />
        </Tab.Pane>
        <Tab.Pane eventKey="destuffing">
          <DestuffingTab operationId={operationId} />
        </Tab.Pane>
      </Tab.Content>
    </Tab.Container>
  );
}

/**
 * Sub-aba Estufagem (SPEC-73) — listagem de fardos ainda não estufados,
 * mesma infraestrutura do Romaneio (`CrudListPage`/`CrudSelection`,
 * SPEC-53): busca, paginação e seleção múltipla por checkbox. Duas ações:
 * "Estufar em container" (multi-seleção → escolhe 1 container → resolve
 * NF→Invoice de cada fardo → `stuff/identified-batch` numa chamada só,
 * já que o endpoint aceita itens de Notas Fiscais diferentes na mesma
 * leva) e "Estufagem por quantidade" (Modo B, independente de seleção).
 * O antigo Modo A (estufar 1 fardo específico por vez, por linha de
 * container) saiu — selecionar 1 fardo só e usar "Estufar em container"
 * cobre o mesmo caso (D1 da SPEC-73).
 */
function StuffingTab({ operationId }: { operationId: string }) {
  const t = useT();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  // SPEC-74 §revisão: só a busca livre (já cobre Fardo/Código/NF/Lote via
  // OR no Core) — filtros dedicados de NF/Lote chegaram a ser
  // implementados, mas o usuário decidiu matá-los (dropdown de Lote não
  // tem fonte de dados viável, e a busca livre já resolve o caso comum).
  const [search, setSearch] = useState("");
  // SPEC-74: ordenação clicável (mesmo mecanismo de `Romaneio.tsx`,
  // SPEC-53) — o Core já expõe as 5 chaves em `RomaneioViewModel.Query.
  // Sortable`, sem mudança de contrato aqui.
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [quantityOpen, setQuantityOpen] = useState(false);

  const listQueryOptions = getGetApiOperationOperationIdRomaneioQueryOptions(operationId, {
    Search: search || undefined,
    IsStuffed: false,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: sort,
  });
  // Mesma queryKey/params do `CrudListPage` abaixo — React Query dedupe numa
  // única busca. Precisamos do `data` aqui fora pra acumular os itens já
  // vistos (`itemsByIdRef`): a seleção (só ids) pode atravessar páginas, e
  // o modal de batch precisa do `notaFiscal`/`lote` completos dos fardos
  // marcados, não só do id.
  const listQuery = useSsrSafeQuery(listQueryOptions);
  const itemsByIdRef = useRef<Record<string, RomaneioDTO>>({});
  useEffect(() => {
    (listQuery.data?.items ?? []).forEach((item) => {
      itemsByIdRef.current[item.id] = item;
    });
  }, [listQuery.data]);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdRomaneioQueryKey(operationId),
    });

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selection: CrudSelection<RomaneioDTO> = {
    selectedIds,
    onToggle: toggleSelected,
    onToggleAll: (ids, checked) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
        return next;
      });
    },
    // D2 da SPEC-73: sem checagem defensiva de "NF sem Invoice" aqui —
    // é garantia do Core, não do front. Nenhuma linha fica desabilitada.
  };

  const columns: CrudColumn<RomaneioDTO>[] = [
    {
      key: "itemIdentifier",
      headerKey: "administrative-operations.romaneio.colItemIdentifier",
      sortKey: "itemIdentifier",
      render: (r) => r.itemIdentifier,
    },
    {
      key: "itemCode",
      headerKey: "administrative-operations.romaneio.colItemCode",
      sortKey: "itemCode",
      render: (r) => r.itemCode,
    },
    {
      key: "notaFiscal",
      headerKey: "administrative-operations.romaneio.colNotaFiscal",
      sortKey: "notaFiscal",
      render: (r) => r.notaFiscal ?? "—",
    },
    {
      key: "lote",
      headerKey: "administrative-operations.romaneio.colLote",
      sortKey: "lote",
      render: (r) => r.lote,
    },
    {
      key: "peso",
      headerKey: "administrative-operations.romaneio.colPeso",
      sortKey: "peso",
      align: "end",
      render: (r) => (r.peso != null ? String(r.peso) : "—"),
    },
  ];

  const selectedItems = Array.from(selectedIds)
    .map((id) => itemsByIdRef.current[id])
    .filter((item): item is RomaneioDTO => item != null);

  return (
    <div>
      <CrudListPage
        titleKey="administrative-operations.operational.stuffing.title"
        descriptionKey="administrative-operations.operational.stuffing.description"
        headerActions={
          <Button variant="outline-primary" size="sm" onClick={() => setQuantityOpen(true)}>
            <i className="bi bi-stack me-1" aria-hidden />
            {t("administrative-operations.containers.stuffing.quantityButton")}
          </Button>
        }
        queryOptions={listQueryOptions}
        columns={columns}
        fillHeight
        // Pedido do usuário (SPEC-76): abaixo da busca, acima da
        // listagem — não junto do título/ações do cabeçalho. Sempre
        // visível (não só quando há seleção), botão desabilitado até
        // marcar algo.
        belowSearch={
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
            <span className="text-body-secondary small">
              {t("administrative-operations.containers.stuffing.batchSelected", {
                count: selectedIds.size,
              })}
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBatchOpen(true)}
            >
              <i className="bi bi-box-seam me-1" aria-hidden />
              {t("administrative-operations.containers.stuffing.batchButton")}
            </Button>
          </div>
        }
        selection={selection}
        sort={sort}
        onSortChange={setSort}
        renderCard={(r) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6 mb-0">{r.itemIdentifier}</Card.Title>
              <Card.Subtitle className="text-body-secondary small mt-1">
                {r.itemCode} · {r.lote}
              </Card.Subtitle>
            </Card.Body>
          </Card>
        )}
        getItemKey={(r) => r.id}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyMessageKey="administrative-operations.operational.stuffing.empty"
      />

      {batchOpen ? (
        <StuffBatchModal
          operationId={operationId}
          items={selectedItems}
          onClose={() => setBatchOpen(false)}
          onStuffed={() => {
            invalidateList();
            setSelectedIds(new Set());
            setBatchOpen(false);
          }}
        />
      ) : null}

      {quantityOpen ? (
        <StuffQuantityModal
          operationId={operationId}
          onClose={() => setQuantityOpen(false)}
          onStuffed={() => {
            invalidateList();
            setQuantityOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Modo B da estufagem (SPEC-07-11 §3.2) — cria `quantity` `CargoUnit`s numa
 * única chamada ao backend (RNF3). O resultado bifurca pela origem da
 * Invoice escolhida (`CargoStuffResultDTO.cargoUnits`, D5 fechada): quando a
 * Invoice tem romaneio (`Source=RomaneioImport`), o backend identifica
 * automaticamente `quantity` fardos livres e cada item do array vem com
 * `romaneioId` preenchido — a tela lista esses fardos (CA9). Quando a
 * Invoice é `Manual`, os itens vêm com `romaneioId: null` — a tela mostra só
 * o contador e o peso médio, sem prometer rastreabilidade individual.
 *
 * SPEC-73: `containerOperationId` deixou de vir implícito de uma linha de
 * container clicada — agora é campo do próprio formulário (`SelectAsync`),
 * já que esta tela não parte mais de uma listagem de containers.
 */
function StuffQuantityModal({
  operationId,
  onClose,
  onStuffed,
}: {
  operationId: string;
  onClose: () => void;
  onStuffed: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdCargoStuffQuantity();
  const [result, setResult] = useState<CargoUnitDTO[] | null>(null);

  const methods = useForm<StuffQuantityFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdCargoStuffQuantityBody),
    defaultValues: {
      containerOperationId: "",
      invoiceId: "",
      quantity: 1,
      lote: "",
    },
  });

  const fetchContainerOptions = (search: string) =>
    getApiOperationOperationIdContainer(operationId, { Search: search, Limit: 20 }).then((res) =>
      res.items.map((c) => ({ value: c.id, label: c.container.identifier })),
    );

  const fetchInvoiceOptions = (search: string) =>
    getApiOperationOperationIdInvoice(operationId, { Search: search, Limit: 20 }).then((res) =>
      res.items.map((invoice) => ({ value: invoice.id, label: invoice.number ?? invoice.id })),
    );

  const handleSubmit: SubmitHandler<StuffQuantityFormValues> = async (values) => {
    try {
      const response = await mutation.mutateAsync({ operationId, data: values });
      (response.warnings ?? []).forEach((warning) => toast.warning(warning));
      toast.success(t("administrative-operations.containers.stuffing.toast.quantitySuccess"));
      setResult(response.cargoUnits ?? []);
      onStuffed();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  // R5/D5: o próprio array `cargoUnits` já diz qual dos dois casos ocorreu
  // (todos os itens de uma mesma resposta vêm da mesma Invoice, então basta
  // olhar o primeiro) — sem precisar consultar `Invoice.source` de novo.
  const identifiedUnits = (result ?? []).filter((unit) => unit.romaneioId != null);
  const isIdentifiedResult = result != null && result.length > 0 && identifiedUnits.length > 0;
  const averageGrossWeight =
    result && result.length > 0 && result[0]?.grossWeight != null
      ? String(result[0].grossWeight)
      : null;

  return (
    <Modal show onHide={handleClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.containers.stuffing.quantityTitle")}
        </Modal.Title>
      </Modal.Header>

      {result ? (
        <>
          <Modal.Body>
            {isIdentifiedResult ? (
              <>
                <p className="mb-2">
                  {t("administrative-operations.containers.stuffing.resultIdentifiedTitle", {
                    count: String(result.length),
                  })}
                </p>
                <ul className="mb-0">
                  {result.map((unit) => (
                    <li key={unit.id}>{unit.romaneioId}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mb-0">
                {t("administrative-operations.containers.stuffing.resultManualTitle", {
                  count: String(result.length),
                  weight: averageGrossWeight ?? "—",
                })}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handleClose}>
              {t("crud.recordModal.close")}
            </Button>
          </Modal.Footer>
        </>
      ) : (
        <Form noValidate onSubmit={methods.handleSubmit(handleSubmit)}>
          <Modal.Body>
            <SelectAsync<StuffQuantityFormValues>
              methods={methods}
              fieldName="containerOperationId"
              label={t("administrative-operations.containers.form.container")}
              fetchOptions={fetchContainerOptions}
            />
            <SelectAsync<StuffQuantityFormValues>
              methods={methods}
              fieldName="invoiceId"
              label={t("administrative-operations.containers.stuffing.form.invoice")}
              fetchOptions={fetchInvoiceOptions}
            />
            <InputNumber<StuffQuantityFormValues>
              methods={methods}
              fieldName="quantity"
              label={t("administrative-operations.containers.stuffing.form.quantity")}
            />
            <InputText<StuffQuantityFormValues>
              methods={methods}
              fieldName="lote"
              label={t("administrative-operations.containers.stuffing.form.lote")}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={onClose}>
              {t("crud.recordModal.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={methods.formState.isSubmitting}>
              {methods.formState.isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              {t("administrative-operations.containers.stuffing.submit")}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  );
}

/**
 * Estufagem em lote a partir da seleção múltipla da listagem de fardos
 * (SPEC-73, substitui o antigo `StuffBatchModal` por Invoice/SPEC-42) — o
 * operador só escolhe o container; cada fardo selecionado já carrega sua
 * própria NF/lote (`items`, resolvidos pelo pai via `itemsByIdRef`).
 * `stuff/identified-batch` aceita itens de Notas Fiscais diferentes na
 * mesma chamada (SPEC-31 do Core) — a tela resolve NF→Invoice buscando as
 * Invoices da operação por número antes de montar o payload; se alguma NF
 * não tiver Invoice correspondente, nada é enviado (D2 da SPEC-73: isso é
 * tratado como exceção, não como uma checagem preventiva de UI).
 */
function StuffBatchModal({
  operationId,
  items,
  onClose,
  onStuffed,
}: {
  operationId: string;
  items: RomaneioDTO[];
  onClose: () => void;
  onStuffed: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdCargoStuffIdentifiedBatch();
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm<ContainerPickFormValues>({
    defaultValues: { containerOperationId: "" },
  });
  const containerOperationId = methods.watch("containerOperationId");

  const fetchContainerOptions = (search: string) =>
    getApiOperationOperationIdContainer(operationId, { Search: search, Limit: 20 }).then((res) =>
      res.items.map((c) => ({ value: c.id, label: c.container.identifier })),
    );

  const distinctNfCount = new Set(items.map((item) => item.notaFiscal ?? "")).size;

  const handleSubmit: SubmitHandler<ContainerPickFormValues> = async (values) => {
    setSubmitting(true);
    try {
      const uniqueNfs = Array.from(
        new Set(items.map((item) => item.notaFiscal).filter((nf): nf is string => !!nf)),
      );
      const invoiceIdByNf: Record<string, string> = {};
      await Promise.all(
        uniqueNfs.map((nf) =>
          getApiOperationOperationIdInvoice(operationId, { Search: nf, Limit: 20 }).then((res) => {
            const match = res.items.find((invoice) => invoice.number === nf);
            if (match) invoiceIdByNf[nf] = match.id;
          }),
        ),
      );

      const missing = items.find((item) => !item.notaFiscal || !invoiceIdByNf[item.notaFiscal]);
      if (missing) {
        toast.error(
          t("administrative-operations.containers.stuffing.batchMissingInvoice", {
            notaFiscal: missing.notaFiscal ?? "—",
          }),
        );
        return;
      }

      const result = await mutation.mutateAsync({
        operationId,
        data: {
          containerOperationId: values.containerOperationId,
          items: items.map((item) => ({
            romaneioId: item.id,
            invoiceId: invoiceIdByNf[item.notaFiscal!],
            lote: item.lote,
          })),
        },
      });
      toast.success(t("administrative-operations.containers.stuffing.toast.batchSuccess"));
      (result.warnings ?? []).forEach((warning) => toast.warning(warning));
      onStuffed();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.containers.stuffing.batchTitle")}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={methods.handleSubmit(handleSubmit)}>
        <Modal.Body>
          <p className="text-body-secondary">
            {t("administrative-operations.containers.stuffing.batchSummary", {
              count: items.length,
              nfCount: distinctNfCount,
            })}
          </p>
          <SelectAsync<ContainerPickFormValues>
            methods={methods}
            fieldName="containerOperationId"
            label={t("administrative-operations.containers.form.container")}
            fetchOptions={fetchContainerOptions}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={onClose}>
            {t("crud.recordModal.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={!containerOperationId || submitting}>
            {submitting ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            {t("administrative-operations.containers.stuffing.batchButton")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/**
 * Cancelamento de `CargoUnit` (§3.4) — motivo obrigatório (`reason`,
 * `maxLength 500`), mesmo padrão de `InvoiceStatusChange.note` usado em
 * Confirmar/Cancelar de Invoice (SPEC-07-10 §5 RF4).
 */
function CancelCargoUnitModal({
  operationId,
  cargoUnit,
  onClose,
  onCanceled,
}: {
  operationId: string;
  cargoUnit: CargoUnitDTO;
  onClose: () => void;
  onCanceled: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdCargoIdCancel();

  const methods = useForm<CancelCargoFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdCargoIdCancelBody),
    defaultValues: { reason: "" },
  });

  const handleSubmit: SubmitHandler<CancelCargoFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ operationId, id: cargoUnit.id, data: values });
      toast.success(t("administrative-operations.containers.stuffing.toast.canceled"));
      onCanceled();
      onClose();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.containers.stuffing.cancelTitle")}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={methods.handleSubmit(handleSubmit)}>
        <Modal.Body>
          <InputTextArea<CancelCargoFormValues>
            methods={methods}
            fieldName="reason"
            label={t("administrative-operations.containers.stuffing.cancelReason")}
            maxLength={500}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={onClose}>
            {t("crud.recordModal.cancel")}
          </Button>
          <Button type="submit" variant="danger" disabled={methods.formState.isSubmitting}>
            {methods.formState.isSubmitting ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            {t("administrative-operations.containers.stuffing.cancelConfirm")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/**
 * Sub-aba Desestufagem (ex-`AllStuffedCargoSection` da SPEC-36, movida da
 * aba Containers pela SPEC-60 — antes era uma seção com toggle dentro de
 * Containers, agora é o conteúdo inteiro desta sub-aba, sem toggle nem
 * moldura própria) — listagem de todos os fardos `Stuffed` da operação,
 * independente de container, com ação de cancelar (desestufar). Reaproveita
 * `CancelCargoUnitModal`, já genérico sobre `cargoUnit`. `GetApiOperation
 * OperationIdCargoParams` não devolve o container aninhado — só
 * `containerOperationId` — então o identifier de origem vem de um join
 * local contra a lista de vínculos da operação (`ContainerOperationDTO`).
 */
function DestuffingTab({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<CargoUnitDTO | null>(null);

  const cargoQuery = useSsrSafeQuery(
    getGetApiOperationOperationIdCargoQueryOptions(operationId, {
      Status: "Stuffed",
      Offset: (page - 1) * PAGE_SIZE,
      Limit: PAGE_SIZE,
    }),
  );
  // Busca leve só pra resolver `containerOperationId → identifier` — não é
  // a listagem paginada principal desta sub-aba (que fica limitada à
  // página atual), precisa cobrir todos os containers vinculados à
  // operação.
  const containersQuery = useSsrSafeQuery(
    getGetApiOperationOperationIdContainerQueryOptions(operationId, { Limit: 200 }),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdCargoQueryKey(operationId),
    });

  const items = cargoQuery.data?.items ?? [];
  const total = Number(cargoQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const identifierByContainerId = new Map(
    (containersQuery.data?.items ?? []).map((c) => [c.id, c.container.identifier]),
  );

  return (
    <div>
      {cargoQuery.isLoading ? (
        <LoadingState variant="inline" />
      ) : items.length === 0 ? (
        <div className="alert alert-secondary mb-0">
          {t("administrative-operations.containers.destuffing.empty")}
        </div>
      ) : (
        <div className="table-responsive">
          <Table hover size="sm" className="align-middle mb-0">
            <thead>
              <tr>
                <th>{t("administrative-operations.containers.stuffing.colStatus")}</th>
                <th>{t("administrative-operations.containers.stuffing.colIdentified")}</th>
                <th>{t("administrative-operations.containers.stuffing.colGrossWeight")}</th>
                <th>{t("administrative-operations.containers.destuffing.colContainer")}</th>
                <th>{t("administrative-operations.containers.stuffing.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <Badge bg="secondary">
                      {resolveCargoUnitStatusLabel(unit.status ?? "Stuffed", locale)}
                    </Badge>
                  </td>
                  <td>
                    {unit.identified
                      ? t("administrative-operations.containers.stuffing.yes")
                      : t("administrative-operations.containers.stuffing.no")}
                  </td>
                  <td>{unit.grossWeight != null ? String(unit.grossWeight) : "—"}</td>
                  <td>{identifierByContainerId.get(unit.containerOperationId ?? "") ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title={t("administrative-operations.containers.stuffing.cancelTitle")}
                      onClick={() => setCancelTarget(unit)}
                    >
                      <i className="bi bi-x-circle" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {cancelTarget ? (
        <CancelCargoUnitModal
          operationId={operationId}
          cargoUnit={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCanceled={invalidate}
        />
      ) : null}
    </div>
  );
}
