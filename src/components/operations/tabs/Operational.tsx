import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Nav, Spinner, Tab, Table } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationOperationIdCargoQueryKey,
  getGetApiOperationOperationIdCargoQueryOptions,
  usePostApiOperationOperationIdCargoIdCancel,
  usePostApiOperationOperationIdCargoStuffIdentified,
  usePostApiOperationOperationIdCargoStuffIdentifiedBatch,
  usePostApiOperationOperationIdCargoStuffQuantity,
} from "@/api/generated/endpoints/cargo-unit/cargo-unit";
import {
  PostApiOperationOperationIdCargoIdCancelBody,
  PostApiOperationOperationIdCargoStuffIdentifiedBody,
  PostApiOperationOperationIdCargoStuffQuantityBody,
} from "@/api/generated/zod/cargo-unit/cargo-unit.zod";
import { getApiOperationOperationIdInvoice } from "@/api/generated/endpoints/invoice/invoice";
import { getApiOperationOperationIdRomaneio } from "@/api/generated/endpoints/romaneio/romaneio";
import { getGetApiOperationOperationIdContainerQueryOptions } from "@/api/generated/endpoints/operation-container/operation-container";
import type { CargoUnitDTO, ContainerOperationDTO } from "@/api/generated/model";
import { resolveCargoUnitStatusLabel } from "@/api/generated/static/cargoUnitStatusOptions";
import { resolveContainerOperationStatusLabel } from "@/api/generated/static/containerOperationStatusOptions";
import { ListPagination } from "@/components/ui/list-pagination";
import { InputNumber, InputText, InputTextArea, SelectAsync } from "@/layouts/Form/Fields/Index";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";
import { ContainerSearchInput } from "@/components/operations/tabs/Containers";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StuffIdentifiedFormValues = z.infer<
  typeof PostApiOperationOperationIdCargoStuffIdentifiedBody
>;
type StuffQuantityFormValues = z.infer<typeof PostApiOperationOperationIdCargoStuffQuantityBody>;
type CancelCargoFormValues = z.infer<typeof PostApiOperationOperationIdCargoIdCancelBody>;

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
 * Sub-aba Estufagem — lista de containers da operação (mesma busca/
 * paginação que já existia em `Containers.tsx`) com os 3 modos de
 * estufagem por linha (identificado/quantidade/lote). Vincular/editar/
 * desvincular/fotos/lacre continuam só na aba Containers.
 */
function StuffingTab({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stuffIdentifiedFor, setStuffIdentifiedFor] = useState<ContainerOperationDTO | null>(null);
  const [stuffQuantityFor, setStuffQuantityFor] = useState<ContainerOperationDTO | null>(null);
  const [stuffBatchFor, setStuffBatchFor] = useState<ContainerOperationDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdContainerQueryOptions(operationId, {
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  // Estufagem não muda o vínculo container↔operação em si (só cria/cancela
  // `CargoUnit`) — só a lista de cargas precisa invalidar.
  const invalidateCargo = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdCargoQueryKey(operationId),
    });

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-3" style={{ minWidth: 240, maxWidth: 360 }}>
        <ContainerSearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      {query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <span>{t("administrative-operations.containers.loadError")}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => query.refetch()}
          >
            {t("administrative-operations.shell.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="alert alert-secondary">
          {t("administrative-operations.containers.empty")}
        </div>
      ) : (
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>{t("administrative-operations.containers.colIdentifier")}</th>
                <th>{t("administrative-operations.containers.colStatus")}</th>
                <th>{t("administrative-operations.containers.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.container.identifier}</td>
                  <td>
                    <Badge bg="secondary">
                      {resolveContainerOperationStatusLabel(item.status, locale)}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title={t("administrative-operations.containers.stuffing.actionIdentified")}
                        onClick={() => setStuffIdentifiedFor(item)}
                      >
                        <i className="bi bi-box-seam" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title={t("administrative-operations.containers.stuffing.actionQuantity")}
                        onClick={() => setStuffQuantityFor(item)}
                      >
                        <i className="bi bi-stack" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title={t("administrative-operations.containers.stuffing.actionBatch")}
                        onClick={() => setStuffBatchFor(item)}
                      >
                        <i className="bi bi-collection" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {stuffIdentifiedFor ? (
        <StuffIdentifiedModal
          operationId={operationId}
          containerLink={stuffIdentifiedFor}
          onClose={() => setStuffIdentifiedFor(null)}
          onStuffed={invalidateCargo}
        />
      ) : null}

      {stuffQuantityFor ? (
        <StuffQuantityModal
          operationId={operationId}
          containerLink={stuffQuantityFor}
          onClose={() => setStuffQuantityFor(null)}
          onStuffed={invalidateCargo}
        />
      ) : null}

      {stuffBatchFor ? (
        <StuffBatchModal
          operationId={operationId}
          containerLink={stuffBatchFor}
          onClose={() => setStuffBatchFor(null)}
          onStuffed={invalidateCargo}
        />
      ) : null}
    </div>
  );
}

/**
 * Modo A da estufagem (SPEC-07-11 §3.1) — cria uma `CargoUnit` identificada
 * a partir de um fardo específico do romaneio (`romaneioId`) mais a Invoice
 * explícita (`invoiceId`, D2 fechada: o Core não resolve a Invoice
 * implicitamente a partir do `NotaFiscal` da linha). `containerOperationId`
 * vem implícito da linha clicada, não é campo do formulário.
 */
function StuffIdentifiedModal({
  operationId,
  containerLink,
  onClose,
  onStuffed,
}: {
  operationId: string;
  containerLink: ContainerOperationDTO;
  onClose: () => void;
  onStuffed: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdCargoStuffIdentified();

  const methods = useForm<StuffIdentifiedFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdCargoStuffIdentifiedBody),
    defaultValues: {
      containerOperationId: containerLink.id,
      romaneioId: "",
      invoiceId: "",
      lote: "",
    },
  });

  // Mapa auxiliar `romaneioId → lote` populado a cada busca do `SelectAsync`
  // abaixo — o Core agora exige `lote` no payload (SPEC-25 do Core/SPEC-46
  // aqui), e o valor já está disponível na própria linha do romaneio
  // escolhida, sem precisar de nova consulta.
  const romaneioLoteByIdRef = useRef<Record<string, string>>({});

  const fetchInvoiceOptions = (search: string) =>
    getApiOperationOperationIdInvoice(operationId, { Search: search, Limit: 20 }).then((res) =>
      res.items.map((invoice) => ({ value: invoice.id, label: invoice.number ?? invoice.id })),
    );

  const fetchRomaneioOptions = (search: string) =>
    getApiOperationOperationIdRomaneio(operationId, { Search: search, Limit: 20 }).then((res) => {
      res.items.forEach((romaneio) => {
        romaneioLoteByIdRef.current[romaneio.id] = romaneio.lote ?? "";
      });
      return res.items.map((romaneio) => ({
        value: romaneio.id,
        label: `${romaneio.lote} · NF ${romaneio.notaFiscal ?? "—"} · ${romaneio.itemIdentifier}`,
      }));
    });

  const romaneioId = methods.watch("romaneioId");

  // Preenche `lote` sozinho assim que o operador escolhe a linha do
  // romaneio (recomendação da SPEC-46 §4/`[NEEDS_DECISION-1]`, opção 1) —
  // campo fica desabilitado abaixo, é confirmação visual, não digitação.
  useEffect(() => {
    if (!romaneioId) return;
    const lote = romaneioLoteByIdRef.current[romaneioId];
    if (lote != null) methods.setValue("lote", lote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [romaneioId]);

  const handleSubmit: SubmitHandler<StuffIdentifiedFormValues> = async (values) => {
    try {
      const result = await mutation.mutateAsync({ operationId, data: values });
      toast.success(t("administrative-operations.containers.stuffing.toast.identifiedSuccess"));
      (result.warnings ?? []).forEach((warning) => toast.warning(warning));
      onStuffed();
      onClose();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.containers.stuffing.identifiedTitle", {
            identifier: containerLink.container.identifier,
          })}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={methods.handleSubmit(handleSubmit)}>
        <Modal.Body>
          <SelectAsync<StuffIdentifiedFormValues>
            methods={methods}
            fieldName="invoiceId"
            label={t("administrative-operations.containers.stuffing.form.invoice")}
            fetchOptions={fetchInvoiceOptions}
          />
          <SelectAsync<StuffIdentifiedFormValues>
            methods={methods}
            fieldName="romaneioId"
            label={t("administrative-operations.containers.stuffing.form.romaneio")}
            fetchOptions={fetchRomaneioOptions}
          />
          <InputText<StuffIdentifiedFormValues>
            methods={methods}
            fieldName="lote"
            label={t("administrative-operations.containers.stuffing.form.lote")}
            disabled
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
    </Modal>
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
 */
function StuffQuantityModal({
  operationId,
  containerLink,
  onClose,
  onStuffed,
}: {
  operationId: string;
  containerLink: ContainerOperationDTO;
  onClose: () => void;
  onStuffed: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdCargoStuffQuantity();
  const [result, setResult] = useState<CargoUnitDTO[] | null>(null);

  const methods = useForm<StuffQuantityFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdCargoStuffQuantityBody),
    defaultValues: {
      containerOperationId: containerLink.id,
      invoiceId: "",
      quantity: 1,
      lote: "",
    },
  });

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
          {t("administrative-operations.containers.stuffing.quantityTitle", {
            identifier: containerLink.container.identifier,
          })}
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
 * Estufagem em lote por checkbox (SPEC-42, `stuff/identified-batch`) — o
 * operador escolhe uma única Invoice (o Core valida cada linha contra o
 * `Number` dela, `EnsureRomaneioMatchesInvoice`) e marca N linhas de
 * romaneio numa lista com checkbox (mesmo padrão visual de
 * `ImportRomaneioModal` em `Romaneio.tsx`). `Lote` de cada item é derivado
 * automaticamente da própria linha (mesmo `romaneioLoteByIdRef` de
 * `StuffIdentifiedModal`/SPEC-46) — não pedimos pro operador digitar de
 * novo algo que a tela já sabe. Chamada é atômica (tudo ou nada, sem UX de
 * sucesso parcial) — erro cai no mesmo catch genérico de toast já usado no
 * resto do arquivo.
 */
function StuffBatchModal({
  operationId,
  containerLink,
  onClose,
  onStuffed,
}: {
  operationId: string;
  containerLink: ContainerOperationDTO;
  onClose: () => void;
  onStuffed: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdCargoStuffIdentifiedBatch();

  const invoiceForm = useForm<{ invoiceId: string }>({ defaultValues: { invoiceId: "" } });
  const invoiceId = invoiceForm.watch("invoiceId");

  const [romaneioOptions, setRomaneioOptions] = useState<
    { id: string; lote: string; notaFiscal: string | null; itemIdentifier: string }[]
  >([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingRomaneios, setLoadingRomaneios] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Não existe filtro `InvoiceId` no endpoint de Romaneio (só `Search`,
  // livre) — usamos o `Number` da Invoice escolhida (guardado aqui a cada
  // resposta do `SelectAsync`, mesma técnica do `romaneioLoteByIdRef`) como
  // termo de busca, já que o Core casa `Search` contra `NotaFiscal` (entre
  // outros campos) em `RomaneioController.GetAll`.
  const invoiceNumberByIdRef = useRef<Record<string, string>>({});

  const fetchInvoiceOptions = (search: string) =>
    getApiOperationOperationIdInvoice(operationId, { Search: search, Limit: 20 }).then((res) => {
      res.items.forEach((invoice) => {
        invoiceNumberByIdRef.current[invoice.id] = invoice.number ?? "";
      });
      return res.items.map((invoice) => ({
        value: invoice.id,
        label: invoice.number ?? invoice.id,
      }));
    });

  useEffect(() => {
    setSelected(new Set());
    if (!invoiceId) {
      setRomaneioOptions([]);
      return;
    }
    const invoiceNumber = invoiceNumberByIdRef.current[invoiceId] ?? "";
    setLoadingRomaneios(true);
    getApiOperationOperationIdRomaneio(operationId, { Search: invoiceNumber, Limit: 100 })
      .then((res) => {
        setRomaneioOptions(
          res.items.map((romaneio) => ({
            id: romaneio.id,
            lote: romaneio.lote ?? "",
            notaFiscal: romaneio.notaFiscal ?? null,
            itemIdentifier: romaneio.itemIdentifier,
          })),
        );
      })
      .finally(() => setLoadingRomaneios(false));
  }, [invoiceId, operationId]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!invoiceId || selected.size === 0) return;
    setSubmitting(true);
    try {
      const result = await mutation.mutateAsync({
        operationId,
        data: {
          containerOperationId: containerLink.id,
          items: romaneioOptions
            .filter((romaneio) => selected.has(romaneio.id))
            .map((romaneio) => ({
              romaneioId: romaneio.id,
              invoiceId,
              lote: romaneio.lote,
            })),
        },
      });
      toast.success(t("administrative-operations.containers.stuffing.toast.batchSuccess"));
      (result.warnings ?? []).forEach((warning) => toast.warning(warning));
      onStuffed();
      onClose();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onClose} centered size="lg">
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.containers.stuffing.batchTitle", {
            identifier: containerLink.container.identifier,
          })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <SelectAsync<{ invoiceId: string }>
          methods={invoiceForm}
          fieldName="invoiceId"
          label={t("administrative-operations.containers.stuffing.form.invoice")}
          fetchOptions={fetchInvoiceOptions}
        />

        {loadingRomaneios ? (
          <LoadingState variant="inline" />
        ) : invoiceId && romaneioOptions.length === 0 ? (
          <div className="alert alert-secondary">
            {t("administrative-operations.containers.stuffing.batchEmpty")}
          </div>
        ) : romaneioOptions.length > 0 ? (
          <>
            <div className="text-body-secondary small mb-2">
              {t("administrative-operations.containers.stuffing.batchSelected", {
                count: selected.size,
              })}
            </div>
            <div className="list-group" style={{ maxHeight: 320, overflowY: "auto" }}>
              {romaneioOptions.map((romaneio) => (
                <label
                  key={romaneio.id}
                  className="list-group-item d-flex align-items-center gap-2"
                >
                  <Form.Check
                    type="checkbox"
                    checked={selected.has(romaneio.id)}
                    onChange={() => toggleSelected(romaneio.id)}
                  />
                  <span>
                    {romaneio.lote} · NF {romaneio.notaFiscal ?? "—"} · {romaneio.itemIdentifier}
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={onClose}>
          {t("crud.recordModal.cancel")}
        </Button>
        <Button
          variant="primary"
          disabled={submitting || selected.size === 0}
          onClick={handleSubmit}
        >
          {submitting ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          {t("administrative-operations.containers.stuffing.submit")}
        </Button>
      </Modal.Footer>
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
