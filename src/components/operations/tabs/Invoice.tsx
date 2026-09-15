import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationOperationIdInvoiceQueryKey,
  getGetApiOperationOperationIdInvoiceQueryOptions,
  usePostApiOperationOperationIdInvoice,
  usePostApiOperationOperationIdInvoiceIdCancel,
  usePostApiOperationOperationIdInvoiceIdConfirm,
} from "@/api/generated/endpoints/invoice/invoice";
import {
  PostApiOperationOperationIdInvoiceBody,
  PostApiOperationOperationIdInvoiceIdConfirmBody,
} from "@/api/generated/zod/invoice/invoice.zod";
import type { FileDTO, InvoiceDTO } from "@/api/generated/model";
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
 * Aba Nota Fiscal (SPEC-07-10) — lista paginada das `Invoice`s da operação
 * (`invoice` gerado), criação manual com upload real de N arquivos numa
 * única chamada multipart (`Files: (Blob | File)[]`, D-NEW resolvida no
 * Core) e ações Confirmar/Cancelar restritas a `Status=Pending` +
 * `Source=Manual`. Sem rota própria (D2 revertida em SPEC-07-02 §13) —
 * montada pelo shell via estado local.
 */
export function Invoice({ operationId }: { operationId: string }) {
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

  const openCreateModal = () => {
    createForm.reset({
      Number: "",
      EntryDate: "",
      ExitDate: "",
      ExitTime: "",
      TotalInvoiceValue: "",
      TotalProductsValue: "",
      Observation: "",
      Files: [],
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit: SubmitHandler<CreateFormValues> = async (values) => {
    if (!hasFile) return;
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
        <Modal.Header closeButton>
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
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setCreateModalOpen(false)}>
              {t("crud.recordModal.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!hasFile || createForm.formState.isSubmitting}
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
      <Modal.Header closeButton>
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
