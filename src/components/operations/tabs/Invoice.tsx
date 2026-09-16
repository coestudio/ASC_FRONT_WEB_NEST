import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Nav, Spinner, Tab, Table } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationOperationIdInvoiceComparisonQueryOptions,
  getGetApiOperationOperationIdInvoiceQueryKey,
  getGetApiOperationOperationIdInvoiceQueryOptions,
  usePostApiOperationOperationIdInvoice,
  usePostApiOperationOperationIdInvoiceIdCancel,
  usePostApiOperationOperationIdInvoiceIdConfirm,
} from "@/api/generated/endpoints/invoice/invoice";
import { getGetApiOperationOperationIdRomaneioComparisonByLoteQueryOptions } from "@/api/generated/endpoints/romaneio/romaneio";
import {
  PostApiOperationOperationIdInvoiceBody,
  PostApiOperationOperationIdInvoiceIdConfirmBody,
} from "@/api/generated/zod/invoice/invoice.zod";
import type {
  FileDTO,
  InvoiceComparisonDTO,
  InvoiceDTO,
  RomaneioLoteComparisonDTO,
} from "@/api/generated/model";
import { resolveInvoiceSourceLabel } from "@/api/generated/static/invoiceSourceOptions";
import { resolveInvoiceStatusLabel } from "@/api/generated/static/invoiceStatusOptions";
import { LoadingState } from "@/components/ui/loading-state";
import { FilePreviewModal } from "@/components/ui/file-preview-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  InputDate,
  InputFileMulti,
  InputMoney,
  InputText,
  InputTextArea,
  InputTime,
} from "@/layouts/Form/Fields/Index";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type CreateFormValues = z.infer<typeof PostApiOperationOperationIdInvoiceBody>;
type StatusChangeFormValues = z.infer<typeof PostApiOperationOperationIdInvoiceIdConfirmBody>;

/** Cor do badge de status — mesmo padrão de `Containers.tsx`/`Responsible.tsx`. */
function statusBadgeVariant(status: InvoiceDTO["status"]): string {
  if (status === "Confirmed") return "success";
  if (status === "Canceled") return "secondary";
  return "warning";
}

/** Cor do badge de origem — só pra distinguir visualmente (RF2), sem
 * semântica de sucesso/erro (`resolveInvoiceSourceLabel` cuida do rótulo). */
function sourceBadgeVariant(source: InvoiceDTO["source"]): string {
  return source === "RomaneioImport" ? "info" : "primary";
}

/**
 * Aba Nota Fiscal (SPEC-07-10, SPEC-41) — 3 sub-abas via
 * `Nav`/`Tab.Container` do React-Bootstrap (`variant="pills"`, pra não
 * conflitar visualmente com a `Nav variant="tabs"` do shell de Operação
 * um nível acima — RF1):
 *  - "Listagem" — CRUD de NF (comportamento idêntico ao pré-SPEC-41, RF2).
 *  - "Comparação NF" — leitura pura, declarado vs. estufado por NF (RF3).
 *  - "Comparação Lotes" — idem, por lote (RF4).
 * Sem rota própria (D2 revertida em SPEC-07-02 §13) — montada pelo shell
 * via estado local.
 */
export function Invoice({ operationId }: { operationId: string }) {
  const t = useT();

  return (
    <Tab.Container defaultActiveKey="listing" id={`invoice-subtabs-${operationId}`}>
      <Nav variant="pills" className="mb-3">
        <Nav.Item>
          <Nav.Link eventKey="listing">
            {t("administrative-operations.invoice.subtabs.listing")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="comparisonInvoice">
            {t("administrative-operations.invoice.subtabs.comparisonInvoice")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="comparisonLot">
            {t("administrative-operations.invoice.subtabs.comparisonLot")}
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Tab.Content>
        <Tab.Pane eventKey="listing">
          <InvoiceListing operationId={operationId} />
        </Tab.Pane>
        <Tab.Pane eventKey="comparisonInvoice">
          <InvoiceComparisonTab operationId={operationId} />
        </Tab.Pane>
        <Tab.Pane eventKey="comparisonLot">
          <InvoiceLoteComparisonTab operationId={operationId} />
        </Tab.Pane>
      </Tab.Content>
    </Tab.Container>
  );
}

/**
 * Sub-aba "Listagem" (RF2) — conteúdo original de `Invoice.tsx` antes da
 * SPEC-41, movido tal e qual (CRUD de NF, sem mudança de comportamento).
 */
function InvoiceListing({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InvoiceDTO | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvoiceDTO | null>(null);
  const [previewing, setPreviewing] = useState<FileDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdInvoiceQueryOptions(operationId, {
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdInvoiceQueryKey(operationId),
    });

  const createMutation = usePostApiOperationOperationIdInvoice();
  const confirmMutation = usePostApiOperationOperationIdInvoiceIdConfirm();
  const cancelMutation = usePostApiOperationOperationIdInvoiceIdCancel();

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdInvoiceBody),
    defaultValues: {
      Number: "",
      EntryDate: "",
      ExitDate: "",
      ExitTime: "",
      DeclaredItemsCount: "",
      DeclaredGrossWeight: "",
      DeclaredNetWeight: "",
      TotalInvoiceValue: "",
      TotalProductsValue: "",
      Observation: "",
      Files: [],
    },
  });
  const files = createForm.watch("Files");
  // RF3/CA2 — gate de UI (≥1 arquivo), já que o schema Zod gerado não
  // expressa a obrigatoriedade (D2 §14 da SPEC): desabilita o submit até ter
  // pelo menos 1 arquivo selecionado, sem inventar `.min()` no schema.
  const hasFile = Array.isArray(files) && files.length > 0;
  // Mesmo gate pros três campos agregados — o Core exige (SPEC-14 §2:
  // sem romaneio de origem, não tem de onde derivar depois), mas o Zod
  // gerado marca como `.nullish()` (mesmo quirk de anotação de R4/`Number`),
  // então o resolver sozinho não barra o submit vazio.
  const declaredItemsCount = createForm.watch("DeclaredItemsCount");
  const declaredGrossWeight = createForm.watch("DeclaredGrossWeight");
  const declaredNetWeight = createForm.watch("DeclaredNetWeight");
  const hasDeclaredFields =
    declaredItemsCount !== "" &&
    declaredItemsCount != null &&
    declaredGrossWeight !== "" &&
    declaredGrossWeight != null &&
    declaredNetWeight !== "" &&
    declaredNetWeight != null;
  const canSubmitCreate = hasFile && hasDeclaredFields;

  const openCreateModal = () => {
    createForm.reset({
      Number: "",
      EntryDate: "",
      ExitDate: "",
      ExitTime: "",
      DeclaredItemsCount: "",
      DeclaredGrossWeight: "",
      DeclaredNetWeight: "",
      TotalInvoiceValue: "",
      TotalProductsValue: "",
      Observation: "",
      Files: [],
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit: SubmitHandler<CreateFormValues> = async (values) => {
    if (!canSubmitCreate) return;
    try {
      await createMutation.mutateAsync({ operationId, data: values });
      toast.success(t("administrative-operations.invoice.toast.created"));
      invalidateList();
      setCreateModalOpen(false);
    } catch {
      toast.error(t("administrative-operations.invoice.toast.error"));
    }
  };

  const handleConfirm = async (note: string) => {
    if (!confirmTarget) return;
    try {
      await confirmMutation.mutateAsync({ operationId, id: confirmTarget.id, data: { note } });
      toast.success(t("administrative-operations.invoice.toast.confirmed"));
      invalidateList();
      setConfirmTarget(null);
    } catch {
      toast.error(t("administrative-operations.invoice.toast.error"));
    }
  };

  const handleCancel = async (note: string) => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({ operationId, id: cancelTarget.id, data: { note } });
      toast.success(t("administrative-operations.invoice.toast.canceled"));
      invalidateList();
      setCancelTarget(null);
    } catch {
      toast.error(t("administrative-operations.invoice.toast.error"));
    }
  };

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString(locale) : "—";
  const formatMoney = (value?: number | string | null) =>
    value != null && value !== ""
      ? Number(value).toLocaleString(locale, { minimumFractionDigits: 2 })
      : "—";

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1" aria-hidden />
          {t("administrative-operations.invoice.new")}
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <span>{t("administrative-operations.invoice.loadError")}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => query.refetch()}
          >
            {t("administrative-operations.shell.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="alert alert-secondary">{t("administrative-operations.invoice.empty")}</div>
      ) : (
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>{t("administrative-operations.invoice.colNumber")}</th>
                <th>{t("administrative-operations.invoice.colSource")}</th>
                <th>{t("administrative-operations.invoice.colStatus")}</th>
                <th>{t("administrative-operations.invoice.colDates")}</th>
                <th>{t("administrative-operations.invoice.colValues")}</th>
                <th>{t("administrative-operations.invoice.colDocuments")}</th>
                <th>{t("administrative-operations.invoice.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const canChangeStatus = item.status === "Pending" && item.source === "Manual";
                const documents = item.documents ?? [];
                return (
                  <tr key={item.id}>
                    <td>{item.number || "—"}</td>
                    <td>
                      {item.source ? (
                        <Badge bg={sourceBadgeVariant(item.source)}>
                          {resolveInvoiceSourceLabel(item.source, locale)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Badge bg={statusBadgeVariant(item.status)}>
                        {item.status ? resolveInvoiceStatusLabel(item.status, locale) : "—"}
                      </Badge>
                    </td>
                    <td className="small">
                      <div>
                        {t("administrative-operations.invoice.entryDate")}:{" "}
                        {formatDate(item.entryDate)}
                      </div>
                      <div>
                        {t("administrative-operations.invoice.exitDate")}:{" "}
                        {formatDate(item.exitDate)}
                      </div>
                    </td>
                    <td className="small">
                      <div>
                        {t("administrative-operations.invoice.totalInvoiceValue")}:{" "}
                        {formatMoney(item.totalInvoiceValue)}
                      </div>
                      <div>
                        {t("administrative-operations.invoice.totalProductsValue")}:{" "}
                        {formatMoney(item.totalProductsValue)}
                      </div>
                    </td>
                    <td>
                      {documents.length === 0 ? (
                        "—"
                      ) : (
                        <div className="d-flex flex-column gap-1">
                          {documents.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              className="btn btn-link btn-sm p-0 text-start text-truncate"
                              style={{ maxWidth: 180 }}
                              onClick={() => setPreviewing(doc.file ?? null)}
                            >
                              {doc.file?.name ||
                                t("administrative-operations.invoice.documentFallbackName")}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {canChangeStatus ? (
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setConfirmTarget(item)}
                            title={t("administrative-operations.invoice.confirm.action")}
                            aria-label={t("administrative-operations.invoice.confirm.action")}
                          >
                            <i className="bi bi-check-lg" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setCancelTarget(item)}
                            title={t("administrative-operations.invoice.cancel.action")}
                            aria-label={t("administrative-operations.invoice.cancel.action")}
                          >
                            <i className="bi bi-x-lg" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <FilePreviewModal show={!!previewing} onHide={() => setPreviewing(null)} file={previewing} />

      <Modal show={createModalOpen} onHide={() => setCreateModalOpen(false)} centered size="lg">
        <Modal.Header>
          <Modal.Title className="h5 mb-0">
            {t("administrative-operations.invoice.newTitle")}
          </Modal.Title>
        </Modal.Header>
        <Form noValidate onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
          <Modal.Body>
            <div className="row">
              <InputText<CreateFormValues>
                methods={createForm}
                fieldName="Number"
                label={t("administrative-operations.invoice.form.number")}
                md={6}
              />
              <InputDate<CreateFormValues>
                methods={createForm}
                fieldName="EntryDate"
                label={t("administrative-operations.invoice.form.entryDate")}
                md={6}
              />
              <InputDate<CreateFormValues>
                methods={createForm}
                fieldName="ExitDate"
                label={t("administrative-operations.invoice.form.exitDate")}
                md={6}
              />
              <InputTime<CreateFormValues>
                methods={createForm}
                fieldName="ExitTime"
                label={t("administrative-operations.invoice.form.exitTime")}
                md={6}
              />
              {/* Obrigatórios no Core pra criação manual (SPEC-14 §2) — sem
                  fonte relacional (romaneio) pra derivar depois, então tem
                  que vir informado aqui. InputText, não InputNumber/InputMoney,
                  mesmo padrão de tara/maxWeight em registry/container. */}
              <InputText<CreateFormValues>
                methods={createForm}
                fieldName="DeclaredItemsCount"
                label={t("administrative-operations.invoice.form.declaredItemsCount")}
                md={4}
              />
              <InputText<CreateFormValues>
                methods={createForm}
                fieldName="DeclaredGrossWeight"
                label={t("administrative-operations.invoice.form.declaredGrossWeight")}
                md={4}
              />
              <InputText<CreateFormValues>
                methods={createForm}
                fieldName="DeclaredNetWeight"
                label={t("administrative-operations.invoice.form.declaredNetWeight")}
                md={4}
              />
              <InputMoney<CreateFormValues>
                methods={createForm}
                fieldName="TotalInvoiceValue"
                label={t("administrative-operations.invoice.form.totalInvoiceValue")}
                md={6}
              />
              <InputMoney<CreateFormValues>
                methods={createForm}
                fieldName="TotalProductsValue"
                label={t("administrative-operations.invoice.form.totalProductsValue")}
                md={6}
              />
              <InputTextArea<CreateFormValues>
                methods={createForm}
                fieldName="Observation"
                label={t("administrative-operations.invoice.form.observation")}
                md={12}
              />
              <InputFileMulti<CreateFormValues>
                methods={createForm}
                fieldName="Files"
                label={t("administrative-operations.invoice.form.files")}
                md={12}
              />
              {!hasFile ? (
                <div className="text-body-secondary small px-3">
                  {t("administrative-operations.invoice.form.filesRequiredHint")}
                </div>
              ) : null}
              {!hasDeclaredFields ? (
                <div className="text-body-secondary small px-3">
                  {t("administrative-operations.invoice.form.declaredFieldsRequiredHint")}
                </div>
              ) : null}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setCreateModalOpen(false)}>
              {t("crud.recordModal.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmitCreate || createForm.formState.isSubmitting}
            >
              {createForm.formState.isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              {t("crud.recordModal.save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {confirmTarget ? (
        <StatusChangeModal
          title={t("administrative-operations.invoice.confirm.title")}
          noteLabel={t("administrative-operations.invoice.confirm.noteLabel")}
          submitLabel={t("administrative-operations.invoice.confirm.action")}
          onSubmit={handleConfirm}
          onClose={() => setConfirmTarget(null)}
        />
      ) : null}

      {cancelTarget ? (
        <StatusChangeModal
          title={t("administrative-operations.invoice.cancel.title")}
          noteLabel={t("administrative-operations.invoice.cancel.noteLabel")}
          submitLabel={t("administrative-operations.invoice.cancel.action")}
          variant="danger"
          onSubmit={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Modal reusado por Confirmar/Cancelar — os dois corpos gerados
 * (`PostApiOperationOperationIdInvoiceIdConfirmBody`/`...CancelBody`) têm o
 * mesmo shape (`{ note: string, max 500 }`, D3 §14 da SPEC), então um único
 * componente com `zodResolver` sobre qualquer um dos dois (shape idêntico)
 * cobre as duas ações.
 */
function StatusChangeModal({
  title,
  noteLabel,
  submitLabel,
  variant = "primary",
  onSubmit,
  onClose,
}: {
  title: string;
  noteLabel: string;
  submitLabel: string;
  variant?: "primary" | "danger";
  onSubmit: (note: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const methods = useForm<StatusChangeFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdInvoiceIdConfirmBody),
    defaultValues: { note: "" },
  });

  const handle: SubmitHandler<StatusChangeFormValues> = async (values) => {
    await onSubmit(values.note);
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">{title}</Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={methods.handleSubmit(handle)}>
        <Modal.Body>
          <InputTextArea<StatusChangeFormValues>
            methods={methods}
            fieldName="note"
            label={noteLabel}
            md={12}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={onClose}>
            {t("crud.recordModal.cancel")}
          </Button>
          <Button type="submit" variant={variant} disabled={methods.formState.isSubmitting}>
            {methods.formState.isSubmitting ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            {submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/** Converte o valor numérico (às vezes string, por causa do `pattern` do
 * Zod gerado) pra `number`, tratando ausência como 0 — mesma convenção dos
 * DTOs de comparação (`Stuffed* = 0` quando nada foi estufado ainda). */
function toNumber(value?: number | string | null): number {
  if (value == null || value === "") return 0;
  return Number(value);
}

/** Badge de divergência (RF3/RF4, §8) — verde quando estufado bate com o
 * declarado, vermelho quando diverge. */
function DivergenceBadge({
  declared,
  stuffed,
  format,
}: {
  declared?: number | string | null;
  stuffed?: number | string | null;
  format: (value?: number | string | null) => string;
}) {
  const matches = toNumber(declared) === toNumber(stuffed);
  return <Badge bg={matches ? "success" : "danger"}>{format(stuffed)}</Badge>;
}

/**
 * Sub-aba "Comparação NF" (RF3) — leitura pura de
 * `invoice/comparison`, uma linha por `Invoice` da operação, comparando as
 * 3 métricas declaradas na NF contra o que já foi estufado (`CargoUnit`).
 * Sem ação corretiva aqui (fora do escopo, SPEC §6).
 */
function InvoiceComparisonTab({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const query = useSsrSafeQuery(
    getGetApiOperationOperationIdInvoiceComparisonQueryOptions(operationId),
  );

  const formatQty = (value?: number | string | null) => toNumber(value).toLocaleString(locale);
  const formatWeight = (value?: number | string | null) =>
    toNumber(value).toLocaleString(locale, { minimumFractionDigits: 2 });

  const items: InvoiceComparisonDTO[] = query.data ?? [];

  if (query.isLoading) return <LoadingState variant="inline" />;

  if (query.isError) {
    return (
      <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
        <span>{t("administrative-operations.invoice.comparison.loadErrorInvoice")}</span>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => query.refetch()}
        >
          {t("administrative-operations.shell.retry")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="alert alert-secondary">
        {t("administrative-operations.invoice.comparison.emptyInvoice")}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table hover className="align-middle mb-0">
        <thead>
          <tr>
            <th>{t("administrative-operations.invoice.comparison.colNumber")}</th>
            <th>{t("administrative-operations.invoice.comparison.colDeclaredItemsCount")}</th>
            <th>{t("administrative-operations.invoice.comparison.colDeclaredGrossWeight")}</th>
            <th>{t("administrative-operations.invoice.comparison.colDeclaredNetWeight")}</th>
            <th>{t("administrative-operations.invoice.comparison.colStuffedItemsCount")}</th>
            <th>{t("administrative-operations.invoice.comparison.colStuffedGrossWeight")}</th>
            <th>{t("administrative-operations.invoice.comparison.colStuffedNetWeight")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.invoiceId}>
              <td>{item.number || "—"}</td>
              <td>{formatQty(item.declaredItemsCount)}</td>
              <td>{formatWeight(item.declaredGrossWeight)}</td>
              <td>{formatWeight(item.declaredNetWeight)}</td>
              <td>
                <DivergenceBadge
                  declared={item.declaredItemsCount}
                  stuffed={item.stuffedItemsCount}
                  format={formatQty}
                />
              </td>
              <td>
                <DivergenceBadge
                  declared={item.declaredGrossWeight}
                  stuffed={item.stuffedGrossWeight}
                  format={formatWeight}
                />
              </td>
              <td>
                <DivergenceBadge
                  declared={item.declaredNetWeight}
                  stuffed={item.stuffedNetWeight}
                  format={formatWeight}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

/**
 * Sub-aba "Comparação Lotes" (RF4) — leitura pura de
 * `romaneio/comparison-by-lote`, uma linha por lote. `Lote: null` é um item
 * especial (`CargoUnit`s estufadas sem lote resolvível, dado histórico
 * anterior à SPEC-25 do Core) — exibido com o rótulo "Sem lote" em vez de
 * tentar renderizar `null` cru (§4 da SPEC).
 */
function InvoiceLoteComparisonTab({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const query = useSsrSafeQuery(
    getGetApiOperationOperationIdRomaneioComparisonByLoteQueryOptions(operationId),
  );

  const formatQty = (value?: number | string | null) => toNumber(value).toLocaleString(locale);
  const formatWeight = (value?: number | string | null) =>
    toNumber(value).toLocaleString(locale, { minimumFractionDigits: 2 });

  const items: RomaneioLoteComparisonDTO[] = query.data ?? [];

  if (query.isLoading) return <LoadingState variant="inline" />;

  if (query.isError) {
    return (
      <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
        <span>{t("administrative-operations.invoice.comparison.loadErrorLot")}</span>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => query.refetch()}
        >
          {t("administrative-operations.shell.retry")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="alert alert-secondary">
        {t("administrative-operations.invoice.comparison.emptyLot")}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table hover className="align-middle mb-0">
        <thead>
          <tr>
            <th>{t("administrative-operations.invoice.comparison.colLote")}</th>
            <th>{t("administrative-operations.invoice.comparison.colDeclaredItemsCount")}</th>
            <th>{t("administrative-operations.invoice.comparison.colDeclaredGrossWeight")}</th>
            <th>{t("administrative-operations.invoice.comparison.colDeclaredNetWeight")}</th>
            <th>{t("administrative-operations.invoice.comparison.colStuffedItemsCount")}</th>
            <th>{t("administrative-operations.invoice.comparison.colStuffedGrossWeight")}</th>
            <th>{t("administrative-operations.invoice.comparison.colStuffedNetWeight")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.lote ?? `sem-lote-${index}`}>
              <td>
                {item.lote ? (
                  item.lote
                ) : (
                  <Badge bg="secondary">
                    {t("administrative-operations.invoice.comparison.noLote")}
                  </Badge>
                )}
              </td>
              <td>{formatQty(item.declaredItemsCount)}</td>
              <td>{formatWeight(item.declaredGrossWeight)}</td>
              <td>{formatWeight(item.declaredNetWeight)}</td>
              <td>
                <DivergenceBadge
                  declared={item.declaredItemsCount}
                  stuffed={item.stuffedItemsCount}
                  format={formatQty}
                />
              </td>
              <td>
                <DivergenceBadge
                  declared={item.declaredGrossWeight}
                  stuffed={item.stuffedGrossWeight}
                  format={formatWeight}
                />
              </td>
              <td>
                <DivergenceBadge
                  declared={item.declaredNetWeight}
                  stuffed={item.stuffedNetWeight}
                  format={formatWeight}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
