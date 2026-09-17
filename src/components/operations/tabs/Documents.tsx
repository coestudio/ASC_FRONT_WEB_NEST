import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Spinner, Table } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { FilePreviewModal } from "@/components/ui/file-preview-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { SortableTh } from "@/components/crud/sortable-th";
import { toast } from "react-toastify";
import type { ZodType } from "zod";
import { z } from "zod";

import {
  getGetApiOperationOperationIdDocumentQueryKey,
  getGetApiOperationOperationIdDocumentQueryOptions,
  usePostApiOperationOperationIdDocument,
  usePutApiOperationOperationIdDocumentId,
} from "@/api/generated/endpoints/document/document";
import {
  PostApiOperationOperationIdDocumentBody,
  PutApiOperationOperationIdDocumentIdBody,
} from "@/api/generated/zod/document/document.zod";
import type { DocumentDTO, DocumentType } from "@/api/generated/model";
import {
  documentTypeOptions,
  resolveDocumentTypeLabel,
} from "@/api/generated/static/documentTypeOptions";
import { InputFileSingle, InputText, InputTextArea, Select } from "@/layouts/Form/Fields/Index";
import { FilterText } from "@/layouts/Filters/Index";
import { ListPagination } from "@/components/ui/list-pagination";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";
import styles from "./documents.module.css";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type CreateFormValues = z.infer<typeof PostApiOperationOperationIdDocumentBody>;
type UpdateFormValues = z.infer<typeof PutApiOperationOperationIdDocumentIdBody>;

/**
 * Normaliza `""` pra `null`/`undefined` (mesma causa raiz de
 * `crud-record-modal.tsx`, regra 2 do AGENTS.md) antes da validação Zod —
 * duplicado aqui pelo mesmo motivo do `Containers.tsx`: este componente
 * monta seus próprios modais (precisa do `Select` com `enumOptions`
 * resolvido por idioma, que o `RenderFields` declarativo ainda não repassa).
 */
function emptyStringsToNull<V>(value: V): V {
  if (value === "") return null as unknown as V;
  if (Array.isArray(value)) return value.map((item) => emptyStringsToNull(item)) as unknown as V;
  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !(value instanceof File)
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        emptyStringsToNull(val),
      ]),
    ) as V;
  }
  return value;
}

function withEmptyStringsAsNull<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  const resolver = zodResolver(schema as never) as unknown as Resolver<T>;
  return (values, context, options) => resolver(emptyStringsToNull(values), context, options);
}

/**
 * Aba Documentos (SPEC-07-06) — CRUD real de documentos da operação
 * (`document` gerado): lista paginada, criação (arquivo via
 * `InputFileSingle`, tipo via `Select` populado pelo lookup de
 * `DocumentType`) e edição (título/tipo/observação — o Core não expõe
 * substituição de arquivo, só criação). Sem rota própria (D2 revertida em
 * SPEC-07-02 §13) — montada pelo shell via estado local.
 */
export function Documents({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  // SPEC-81 §4.2 — busca por texto (`Search`, Core/specs/48 já `IMPLEMENTED`
  // no momento desta implementação — resolve o bloqueio que a SPEC-85 tinha
  // documentado, que partiu de um Core sem esse campo ainda).
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  // SPEC-85 (3.3): filtro por Tipo de arquivo.
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentDTO | null>(null);
  const [previewing, setPreviewing] = useState<DocumentDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdDocumentQueryOptions(operationId, {
    Search: search || undefined,
    Type: typeFilter || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: sort,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdDocumentQueryKey(operationId),
    });

  const createMutation = usePostApiOperationOperationIdDocument();
  const updateMutation = usePutApiOperationOperationIdDocumentId();

  const createForm = useForm<CreateFormValues>({
    resolver: withEmptyStringsAsNull(PostApiOperationOperationIdDocumentBody),
    defaultValues: { Title: "", Type: "Other", Observation: "" },
  });

  const openCreateModal = () => {
    createForm.reset({ Title: "", Type: "Other", Observation: "", File: undefined });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit: SubmitHandler<CreateFormValues> = async (values) => {
    try {
      await createMutation.mutateAsync({ operationId, data: values });
      toast.success(t("administrative-operations.documents.toast.created"));
      invalidateList();
      setCreateModalOpen(false);
    } catch {
      toast.error(t("administrative-operations.documents.toast.error"));
    }
  };

  const updateForm = useForm<UpdateFormValues>({
    resolver: withEmptyStringsAsNull(PutApiOperationOperationIdDocumentIdBody),
    defaultValues: { title: "", type: "Other", observation: "" },
  });

  useEffect(() => {
    if (!editing) return;
    updateForm.reset({
      title: editing.title ?? "",
      type: editing.type,
      observation: editing.observation ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleUpdateSubmit: SubmitHandler<UpdateFormValues> = async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({ operationId, id: editing.id, data: values });
      toast.success(t("administrative-operations.documents.toast.updated"));
      invalidateList();
      setEditing(null);
    } catch {
      toast.error(t("administrative-operations.documents.toast.error"));
    }
  };

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
        <div className="d-flex gap-2 flex-wrap">
          <div style={{ minWidth: 240 }}>
            <FilterText
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("administrative-operations.documents.searchPlaceholder")}
            />
          </div>
          <Form.Select
            size="sm"
            style={{ width: "auto" }}
            aria-label={t("administrative-operations.documents.form.type")}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as DocumentType | "");
              setPage(1);
            }}
          >
            <option value="">{t("administrative-operations.documents.filterAllTypes")}</option>
            {documentTypeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {resolveDocumentTypeLabel(opt.key, locale)}
              </option>
            ))}
          </Form.Select>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1" aria-hidden />
          {t("administrative-operations.documents.new")}
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <span>{t("administrative-operations.documents.loadError")}</span>
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
          {t("administrative-operations.documents.empty")}
        </div>
      ) : (
        <div className="soft-card table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <SortableTh sortKey="title" sort={sort} onSortChange={setSort}>
                  {t("administrative-operations.documents.colTitle")}
                </SortableTh>
                <SortableTh sortKey="type" sort={sort} onSortChange={setSort}>
                  {t("administrative-operations.documents.colType")}
                </SortableTh>
                <th>{t("administrative-operations.documents.colFile")}</th>
                <SortableTh sortKey="createdOn" sort={sort} onSortChange={setSort}>
                  {t("administrative-operations.documents.colCreatedAt")}
                </SortableTh>
                <th>{t("administrative-operations.documents.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title || "—"}</td>
                  <td>
                    <Badge bg="secondary">{resolveDocumentTypeLabel(item.type, locale)}</Badge>
                  </td>
                  <td>
                    {item.observation ? (
                      <span className={styles.observationPreview}>{item.observation}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString(locale)}</td>
                  <td>
                    {/* `download` só força o nome de arquivo quando o link é
                        mesma origem — em storage externo (S3/blob) o browser
                        ainda assim baixa em vez de navegar, contanto que o
                        servidor não force Content-Disposition:inline;
                        `target="_blank"` cobre o caso de acabar abrindo. */}
                    <CrudRowActions
                      onView={() => setPreviewing(item)}
                      extraActions={[
                        {
                          key: "download",
                          icon: "bi-download",
                          label: t("administrative-operations.documents.download"),
                          href: item.file.url ?? undefined,
                          download: item.file.name ?? undefined,
                          target: "_blank",
                          rel: "noreferrer",
                          disabled: !item.file.url,
                        },
                      ]}
                      onEdit={() => setEditing(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <FilePreviewModal
        show={!!previewing}
        onHide={() => setPreviewing(null)}
        file={previewing?.file ?? null}
      />

      <Modal show={createModalOpen} onHide={() => setCreateModalOpen(false)} centered>
        <Modal.Header>
          <Modal.Title className="h5 mb-0">
            {t("administrative-operations.documents.newTitle")}
          </Modal.Title>
        </Modal.Header>
        <Form noValidate onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
          <Modal.Body>
            <InputText<CreateFormValues>
              methods={createForm}
              fieldName="Title"
              label={t("administrative-operations.documents.form.title")}
            />
            <Select<CreateFormValues>
              methods={createForm}
              fieldName="Type"
              label={t("administrative-operations.documents.form.type")}
              enumOptions={documentTypeOptions}
            />
            <InputTextArea<CreateFormValues>
              methods={createForm}
              fieldName="Observation"
              label={t("administrative-operations.documents.form.observation")}
            />
            <InputFileSingle<CreateFormValues>
              methods={createForm}
              fieldName="File"
              label={t("administrative-operations.documents.form.file")}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setCreateModalOpen(false)}>
              {t("crud.recordModal.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              {t("crud.recordModal.save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {editing ? (
        <Modal show onHide={() => setEditing(null)} centered>
          <Modal.Header>
            <Modal.Title className="h5 mb-0">
              {t("administrative-operations.documents.editTitle")}
            </Modal.Title>
          </Modal.Header>
          <Form noValidate onSubmit={updateForm.handleSubmit(handleUpdateSubmit)}>
            <Modal.Body>
              <InputText<UpdateFormValues>
                methods={updateForm}
                fieldName="title"
                label={t("administrative-operations.documents.form.title")}
              />
              <Select<UpdateFormValues>
                methods={updateForm}
                fieldName="type"
                label={t("administrative-operations.documents.form.type")}
                enumOptions={documentTypeOptions}
              />
              <InputTextArea<UpdateFormValues>
                methods={updateForm}
                fieldName="observation"
                label={t("administrative-operations.documents.form.observation")}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-primary" onClick={() => setEditing(null)}>
                {t("crud.recordModal.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={updateForm.formState.isSubmitting}>
                {updateForm.formState.isSubmitting ? (
                  <Spinner size="sm" animation="border" className="me-2" />
                ) : null}
                {t("crud.recordModal.save")}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      ) : null}
    </div>
  );
}
