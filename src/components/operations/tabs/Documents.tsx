import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
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
import type { DocumentDTO } from "@/api/generated/model";
import {
  documentTypeOptions,
  resolveDocumentTypeLabel,
} from "@/api/generated/static/documentTypeOptions";
import { InputFileSingle, InputText, InputTextArea, Select } from "@/layouts/Form/Fields/Index";
import { ListPagination } from "@/components/ui/list-pagination";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 10;

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdDocumentQueryOptions(operationId, {
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
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
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1" aria-hidden />
          {t("administrative-operations.documents.new")}
        </Button>
      </div>

      {query.isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
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
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>{t("administrative-operations.documents.colTitle")}</th>
                <th>{t("administrative-operations.documents.colType")}</th>
                <th>{t("administrative-operations.documents.colFile")}</th>
                <th>{t("administrative-operations.documents.colCreatedAt")}</th>
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
                    {item.file.url ? (
                      <a href={item.file.url} target="_blank" rel="noreferrer">
                        {item.file.name || t("administrative-operations.documents.fileLink")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString(locale)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditing(item)}
                    >
                      <i className="bi bi-pencil" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal show={createModalOpen} onHide={() => setCreateModalOpen(false)} centered>
        <Modal.Header closeButton>
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
            <Button variant="outline-secondary" onClick={() => setCreateModalOpen(false)}>
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
          <Modal.Header closeButton>
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
              <Button variant="outline-secondary" onClick={() => setEditing(null)}>
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
