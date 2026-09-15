import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "react-toastify";
import type { ZodType } from "zod";
import { z } from "zod";

import { getApiContainer } from "@/api/generated/endpoints/container/container";
import {
  getGetApiOperationOperationIdContainerIdQueryKey,
  getGetApiOperationOperationIdContainerIdQueryOptions,
  getGetApiOperationOperationIdContainerQueryKey,
  getGetApiOperationOperationIdContainerQueryOptions,
  useDeleteApiOperationOperationIdContainerId,
  useDeleteApiOperationOperationIdContainerIdPhotoPhotoId,
  usePostApiOperationOperationIdContainer,
  usePostApiOperationOperationIdContainerIdPhoto,
  usePutApiOperationOperationIdContainerId,
} from "@/api/generated/endpoints/operation-container/operation-container";
import {
  PostApiOperationOperationIdContainerBody,
  PutApiOperationOperationIdContainerIdBody,
} from "@/api/generated/zod/operation-container/operation-container.zod";
import type { ContainerOperationDTO } from "@/api/generated/model";
import {
  containerOperationStatusOptions,
  resolveContainerOperationStatusLabel,
} from "@/api/generated/static/containerOperationStatusOptions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  InputDate,
  InputPhotoMulti,
  InputText,
  Select,
  SelectAsync,
} from "@/layouts/Form/Fields/Index";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import {
  operationContainerPhotosFormSchema,
  type OperationContainerPhotosFormValues,
} from "@/lib/validation/operation-container";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type LinkFormValues = z.infer<typeof PostApiOperationOperationIdContainerBody>;
type UpdateFormValues = z.infer<typeof PutApiOperationOperationIdContainerIdBody>;

/**
 * Normaliza `""` pra `null` (mesma causa raiz documentada em
 * `crud-record-modal.tsx`, regra 2 do AGENTS.md): os campos opcionais dos
 * schemas gerados pelo Orval são `.nullish()` (aceitam `null`/`undefined`,
 * não string vazia), mas nenhum Field de `layouts/Form/Fields` converte
 * sozinho um campo vazio pra `null`. Duplicado aqui (em vez de importar de
 * `crud-record-modal.tsx`, que não exporta o helper) porque este componente
 * monta seus próprios modais em vez do `CrudRecordModal` genérico — precisa
 * do `Select` com `enumOptions` resolvido por idioma, que o `RenderFields`
 * declarativo ainda não repassa (débito de `SPEC-07-01`, fora de escopo
 * daqui).
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
 * Aba Containers (SPEC-07-05) — vínculo de containers à operação: lista
 * paginada (`operation-container` gerado), criação do vínculo (busca de
 * container existente + tara), edição (tara/data do lacre/status via
 * `Select`) e fotos por container (`InputPhotoMulti`). Sem rota própria
 * (D2 revertida em SPEC-07-02 §13) — montada pelo shell via estado local.
 */
export function Containers({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerOperationDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerOperationDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdContainerQueryOptions(operationId, {
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdContainerQueryKey(operationId),
    });

  const linkMutation = usePostApiOperationOperationIdContainer();
  const updateMutation = usePutApiOperationOperationIdContainerId();
  const deleteMutation = useDeleteApiOperationOperationIdContainerId();

  const fetchContainerOptions = (search: string) =>
    getApiContainer({ Search: search, Limit: 20 }).then((res) =>
      res.items.map((c) => ({ value: c.id, label: c.identifier })),
    );

  const linkForm = useForm<LinkFormValues>({
    resolver: withEmptyStringsAsNull(PostApiOperationOperationIdContainerBody),
    defaultValues: { containerId: "", tara: "" },
  });

  const openLinkModal = () => {
    linkForm.reset({ containerId: "", tara: "" });
    setLinkModalOpen(true);
  };

  const handleLinkSubmit: SubmitHandler<LinkFormValues> = async (values) => {
    try {
      await linkMutation.mutateAsync({ operationId, data: values });
      toast.success(t("administrative-operations.containers.toast.linked"));
      invalidateList();
      setLinkModalOpen(false);
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  const updateForm = useForm<UpdateFormValues>({
    resolver: withEmptyStringsAsNull(PutApiOperationOperationIdContainerIdBody),
    defaultValues: { tara: "", sealDate: "", status: "Empty" },
  });

  useEffect(() => {
    if (!editing) return;
    updateForm.reset({
      tara: editing.tara != null ? String(editing.tara) : "",
      sealDate: editing.sealDate ?? "",
      status: editing.status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleUpdateSubmit: SubmitHandler<UpdateFormValues> = async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({ operationId, id: editing.id, data: values });
      toast.success(t("administrative-operations.containers.toast.updated"));
      invalidateList();
      setEditing(null);
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ operationId, id: pendingDelete.id });
      toast.success(t("administrative-operations.containers.toast.unlinked"));
      invalidateList();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" onClick={openLinkModal}>
          <i className="bi bi-plus-lg me-1" aria-hidden />
          {t("administrative-operations.containers.new")}
        </Button>
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
                <th>{t("administrative-operations.containers.colTara")}</th>
                <th>{t("administrative-operations.containers.colStatus")}</th>
                <th>{t("administrative-operations.containers.colPhotos")}</th>
                <th>{t("administrative-operations.containers.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.container.identifier}</td>
                  <td>{item.tara != null ? String(item.tara) : "—"}</td>
                  <td>
                    <Badge bg="secondary">
                      {resolveContainerOperationStatusLabel(item.status, locale)}
                    </Badge>
                  </td>
                  <td>{item.photos?.length ?? 0}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setEditing(item)}
                      >
                        <i className="bi bi-pencil" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setPendingDelete(item)}
                      >
                        <i className="bi bi-trash" aria-hidden />
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

      <Modal show={linkModalOpen} onHide={() => setLinkModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 mb-0">
            {t("administrative-operations.containers.newTitle")}
          </Modal.Title>
        </Modal.Header>
        <Form noValidate onSubmit={linkForm.handleSubmit(handleLinkSubmit)}>
          <Modal.Body>
            <SelectAsync<LinkFormValues>
              methods={linkForm}
              fieldName="containerId"
              label={t("administrative-operations.containers.form.container")}
              fetchOptions={fetchContainerOptions}
            />
            <InputText<LinkFormValues>
              methods={linkForm}
              fieldName="tara"
              label={t("administrative-operations.containers.form.tara")}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setLinkModalOpen(false)}>
              {t("crud.recordModal.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={linkForm.formState.isSubmitting}>
              {linkForm.formState.isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              {t("crud.recordModal.save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {editing ? (
        <Modal show onHide={() => setEditing(null)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title className="h5 mb-0">{editing.container.identifier}</Modal.Title>
          </Modal.Header>
          <Form noValidate onSubmit={updateForm.handleSubmit(handleUpdateSubmit)}>
            <Modal.Body>
              <Select<UpdateFormValues>
                methods={updateForm}
                fieldName="status"
                label={t("administrative-operations.containers.form.status")}
                enumOptions={containerOperationStatusOptions}
              />
              <InputText<UpdateFormValues>
                methods={updateForm}
                fieldName="tara"
                label={t("administrative-operations.containers.form.tara")}
              />
              <InputDate<UpdateFormValues>
                methods={updateForm}
                fieldName="sealDate"
                label={t("administrative-operations.containers.form.sealDate")}
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

          <div className="px-4 pb-4">
            <ContainerPhotos
              operationId={operationId}
              containerLinkId={editing.id}
              onChanged={invalidateList}
            />
          </div>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-operations.containers.confirm.deleteTitle")}
          message={t("administrative-operations.containers.confirm.deleteMessage", {
            identifier: pendingDelete.container.identifier,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Fotos do vínculo container↔operação — mantém sua própria busca
 * (`operation-container/{id}` gerado) pra sempre mostrar a lista de fotos
 * atual, mesmo com o modal de edição já aberto com um snapshot antigo do
 * registro. RF2/RF7 da SPEC-SHARE-01: preview em grid, remoção individual
 * antes do envio (dentro do `InputPhotoMulti`) e exclusão de foto já salva
 * (botão próprio, chama o DELETE do Core).
 */
function ContainerPhotos({
  operationId,
  containerLinkId,
  onChanged,
}: {
  operationId: string;
  containerLinkId: string;
  onChanged: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const detailQuery = useSsrSafeQuery(
    getGetApiOperationOperationIdContainerIdQueryOptions(operationId, containerLinkId),
  );
  const uploadMutation = usePostApiOperationOperationIdContainerIdPhoto();
  const deletePhotoMutation = useDeleteApiOperationOperationIdContainerIdPhotoPhotoId();

  const methods = useForm<OperationContainerPhotosFormValues>({
    resolver: zodResolver(operationContainerPhotosFormSchema),
    defaultValues: { files: [] },
  });

  const invalidateDetail = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdContainerIdQueryKey(operationId, containerLinkId),
    });

  const handleUpload: SubmitHandler<OperationContainerPhotosFormValues> = async (values) => {
    if (values.files.length === 0) return;
    try {
      // RF8 do InputPhotoMulti (SPEC-SHARE-01): o endpoint só aceita um
      // arquivo por vez — um POST por foto selecionada, sem slot específico
      // (não pedido pela SPEC-07-05, RF3 só cobre o `Select` de status).
      for (const file of values.files) {
        await uploadMutation.mutateAsync({
          operationId,
          id: containerLinkId,
          data: { file, slot: "None" },
        });
      }
      toast.success(t("administrative-operations.containers.toast.photoUploaded"));
      methods.reset({ files: [] });
      invalidateDetail();
      onChanged();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deletePhotoMutation.mutateAsync({ operationId, id: containerLinkId, photoId });
      toast.success(t("administrative-operations.containers.toast.photoDeleted"));
      invalidateDetail();
      onChanged();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    }
  };

  const photos = detailQuery.data?.photos ?? [];

  return (
    <div>
      <h2 className="h6">{t("administrative-operations.containers.photosTitle")}</h2>

      {photos.length > 0 ? (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="position-relative rounded overflow-hidden border"
              style={{ width: 88, height: 88 }}
            >
              <img
                src={photo.file.url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="position-absolute top-0 end-0 m-1 p-0 d-flex align-items-center justify-content-center"
                style={{ width: 20, height: 20, lineHeight: 1 }}
                aria-label={t("administrative-operations.containers.photosRemove")}
                onClick={() => handleDeletePhoto(photo.id)}
              >
                <i className="bi bi-x" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Form onSubmit={methods.handleSubmit(handleUpload)}>
        <InputPhotoMulti<OperationContainerPhotosFormValues>
          methods={methods}
          fieldName="files"
          label={t("administrative-operations.containers.photosAdd")}
        />
        <Button
          type="submit"
          variant="outline-primary"
          size="sm"
          disabled={methods.formState.isSubmitting}
        >
          {t("administrative-operations.containers.photosUpload")}
        </Button>
      </Form>
    </div>
  );
}
