import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationOperationIdOccurrenceQueryKey,
  getGetApiOperationOperationIdOccurrenceQueryOptions,
  usePostApiOperationOperationIdOccurrence,
  usePutApiOperationOperationIdOccurrenceId,
} from "@/api/generated/endpoints/operation-occurrence/operation-occurrence";
import { PutApiOperationOperationIdOccurrenceIdBody } from "@/api/generated/zod/operation-occurrence/operation-occurrence.zod";
import type { OperationOccurrenceDTO } from "@/api/generated/model";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { SortableTh } from "@/components/crud/sortable-th";
import { InputPhotoMulti, InputText, InputTextArea } from "@/layouts/Form/Fields/Index";
import { FilterText } from "@/layouts/Filters/Index";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import {
  operationOccurrenceCreateFormSchema,
  type OperationOccurrenceCreateFormValues,
} from "@/lib/validation/operation-occurrence";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type EditFormValues = z.infer<typeof PutApiOperationOperationIdOccurrenceIdBody>;

/**
 * Aba "Ocorrências" (SPEC-43) — registro manual de ocorrência dentro da
 * Operação (distinto do Log automático, SPEC-39): título, nota e 0..N fotos.
 * Decisão de navegação (§5 `[NEEDS_DECISION]` da spec): aba própria, paralela
 * a Log, seguindo a recomendação do próprio documento — sem sub-rota, mesmo
 * padrão de estado local das demais abas do shell (`OperationShellBody`).
 *
 * Create é `multipart` com foto (`POST`); Edit é `JSON` só com
 * `title`/`note` (`PUT`) — o Core não aceita foto na edição (SPEC-43 §4,
 * debt conhecido do lado Core, não desta tela). Não existe `DELETE` no
 * contrato — nenhuma ação de exclusão é oferecida aqui.
 * Gate de criação: qualquer usuário Internal autenticado, sem checagem de
 * role adicional (Core `specs/32-operation-occurrences` §5.3) — nenhum
 * `useCan` extra além do guard de área já aplicado pela rota.
 */
export function Occurrences({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  // SPEC-81 §4.2 — busca por texto (`Search`, Core/specs/48 já `IMPLEMENTED`).
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OperationOccurrenceDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdOccurrenceQueryOptions(operationId, {
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: sort,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdOccurrenceQueryKey(operationId),
    });

  const createMutation = usePostApiOperationOperationIdOccurrence();
  const updateMutation = usePutApiOperationOperationIdOccurrenceId();

  const createForm = useForm<OperationOccurrenceCreateFormValues>({
    resolver: zodResolver(operationOccurrenceCreateFormSchema),
    defaultValues: { Title: "", Note: "", Photos: [] },
  });

  const openCreateModal = () => {
    createForm.reset({ Title: "", Note: "", Photos: [] });
    setCreateOpen(true);
  };

  const handleCreateSubmit: SubmitHandler<OperationOccurrenceCreateFormValues> = async (values) => {
    try {
      await createMutation.mutateAsync({ operationId, data: values });
      toast.success(t("administrative-operations.occurrences.toast.created"));
      invalidateList();
      setCreateOpen(false);
    } catch {
      toast.error(t("administrative-operations.occurrences.toast.error"));
    }
  };

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(PutApiOperationOperationIdOccurrenceIdBody),
    defaultValues: { title: "", note: "" },
  });

  useEffect(() => {
    if (!editing) return;
    editForm.reset({ title: editing.title ?? "", note: editing.note ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleEditSubmit: SubmitHandler<EditFormValues> = async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({ operationId, id: editing.id, data: values });
      toast.success(t("administrative-operations.occurrences.toast.updated"));
      invalidateList();
      setEditing(null);
    } catch {
      toast.error(t("administrative-operations.occurrences.toast.error"));
    }
  };

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <p className="text-body-secondary mb-3">
        {t("administrative-operations.occurrences.description")}
      </p>

      <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
        <div style={{ minWidth: 240 }}>
          <FilterText
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t("administrative-operations.occurrences.searchPlaceholder")}
          />
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1" aria-hidden />
          {t("administrative-operations.occurrences.new")}
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <span>{t("administrative-operations.occurrences.loadError")}</span>
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
          {t("administrative-operations.occurrences.empty")}
        </div>
      ) : (
        <div className="soft-card table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <SortableTh sortKey="title" sort={sort} onSortChange={setSort}>
                  {t("administrative-operations.occurrences.colTitle")}
                </SortableTh>
                <th>{t("administrative-operations.occurrences.colNote")}</th>
                <th>{t("administrative-operations.occurrences.colPhotos")}</th>
                <SortableTh sortKey="createdOn" sort={sort} onSortChange={setSort}>
                  {t("administrative-operations.occurrences.colCreatedAt")}
                </SortableTh>
                <th>{t("administrative-operations.occurrences.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title || "—"}</td>
                  <td className="text-truncate" style={{ maxWidth: 320 }}>
                    {item.note || "—"}
                  </td>
                  <td>{item.photos?.length ?? 0}</td>
                  <td>{new Date(item.createdAt).toLocaleString(locale)}</td>
                  <td>
                    <CrudRowActions onEdit={() => setEditing(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal show={createOpen} onHide={() => setCreateOpen(false)} centered>
        <Modal.Header>
          <Modal.Title className="h5 mb-0">
            {t("administrative-operations.occurrences.newTitle")}
          </Modal.Title>
        </Modal.Header>
        <Form noValidate onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
          <Modal.Body>
            <InputText<OperationOccurrenceCreateFormValues>
              methods={createForm}
              fieldName="Title"
              label={t("administrative-operations.occurrences.form.title")}
            />
            <InputTextArea<OperationOccurrenceCreateFormValues>
              methods={createForm}
              fieldName="Note"
              label={t("administrative-operations.occurrences.form.note")}
            />
            <InputPhotoMulti<OperationOccurrenceCreateFormValues>
              methods={createForm}
              fieldName="Photos"
              label={t("administrative-operations.occurrences.form.photos")}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setCreateOpen(false)}>
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
              {t("administrative-operations.occurrences.editTitle")}
            </Modal.Title>
          </Modal.Header>
          <Form noValidate onSubmit={editForm.handleSubmit(handleEditSubmit)}>
            <Modal.Body>
              <InputText<EditFormValues>
                methods={editForm}
                fieldName="title"
                label={t("administrative-operations.occurrences.form.title")}
              />
              <InputTextArea<EditFormValues>
                methods={editForm}
                fieldName="note"
                label={t("administrative-operations.occurrences.form.note")}
              />
              {editing.photos && editing.photos.length > 0 ? (
                <div>
                  <Form.Label>{t("administrative-operations.occurrences.form.photos")}</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {editing.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="rounded overflow-hidden border"
                        style={{ width: 88, height: 88 }}
                      >
                        <img
                          src={photo.file.url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                  <Form.Text className="text-muted">
                    {t("administrative-operations.occurrences.photosEditNote")}
                  </Form.Text>
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-primary" onClick={() => setEditing(null)}>
                {t("crud.recordModal.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? (
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
