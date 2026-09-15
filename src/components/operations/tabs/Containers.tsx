import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Form, Spinner, Table } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
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
import {
  getGetApiOperationOperationIdCargoQueryKey,
  getGetApiOperationOperationIdCargoQueryOptions,
  usePostApiOperationOperationIdCargoIdCancel,
  usePostApiOperationOperationIdCargoStuffIdentified,
  usePostApiOperationOperationIdCargoStuffQuantity,
} from "@/api/generated/endpoints/cargo-unit/cargo-unit";
import {
  PostApiOperationOperationIdCargoIdCancelBody,
  PostApiOperationOperationIdCargoStuffIdentifiedBody,
  PostApiOperationOperationIdCargoStuffQuantityBody,
} from "@/api/generated/zod/cargo-unit/cargo-unit.zod";
import { getApiOperationOperationIdInvoice } from "@/api/generated/endpoints/invoice/invoice";
import { getApiOperationOperationIdRomaneio } from "@/api/generated/endpoints/romaneio/romaneio";
import type { CargoUnitDTO, ContainerOperationDTO } from "@/api/generated/model";
import {
  containerOperationStatusOptions,
  resolveContainerOperationStatusLabel,
} from "@/api/generated/static/containerOperationStatusOptions";
import { resolveCargoUnitStatusLabel } from "@/api/generated/static/cargoUnitStatusOptions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  InputDate,
  InputNumber,
  InputPhotoMulti,
  InputText,
  InputTextArea,
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
type StuffIdentifiedFormValues = z.infer<
  typeof PostApiOperationOperationIdCargoStuffIdentifiedBody
>;
type StuffQuantityFormValues = z.infer<typeof PostApiOperationOperationIdCargoStuffQuantityBody>;
type CancelCargoFormValues = z.infer<typeof PostApiOperationOperationIdCargoIdCancelBody>;

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
 *
 * SPEC-07-11 estende a lista com a ação de **estufagem** (criação de
 * `CargoUnit`): dois fluxos separados por botão (D1 fechada, não modal
 * único com toggle) — "Estufar fardo específico" (Modo A,
 * `stuff/identified`) e "Estufar por quantidade" (Modo B,
 * `stuff/quantity`) — mais um terceiro botão pra ver/cancelar as
 * `CargoUnit`s já estufadas de um container (`CargoUnit` nunca é editável,
 * só criada ou cancelada com motivo, §3.4).
 */
export function Containers({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerOperationDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerOperationDTO | null>(null);
  const [stuffIdentifiedFor, setStuffIdentifiedFor] = useState<ContainerOperationDTO | null>(null);
  const [stuffQuantityFor, setStuffQuantityFor] = useState<ContainerOperationDTO | null>(null);
  const [cargoUnitsFor, setCargoUnitsFor] = useState<ContainerOperationDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdContainerQueryOptions(operationId, {
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdContainerQueryKey(operationId),
    });

  // Estufagem não muda o vínculo container↔operação em si (só cria/cancela
  // `CargoUnit`), então invalida só a lista de cargas — a lista de
  // containers (`invalidateList`) não precisa recarregar.
  const invalidateCargo = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdCargoQueryKey(operationId),
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
                        title={t("administrative-operations.containers.stuffing.actionViewCargo")}
                        onClick={() => setCargoUnitsFor(item)}
                      >
                        <i className="bi bi-list-ul" aria-hidden />
                      </button>
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
        <Modal.Header>
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
          <Modal.Header>
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

      {cargoUnitsFor ? (
        <CargoUnitsModal
          operationId={operationId}
          containerLink={cargoUnitsFor}
          onClose={() => setCargoUnitsFor(null)}
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

  // Contrato novo do Core: `ContainerPhotoDTO.file` é opcional (registro pode
  // existir sem upload ainda, só metadata — `observation`/`visibleInReport`).
  // Filtra da grade até essa tela ganhar UI própria pra esse estado
  // "pendente" (decisão do usuário: comportamento visual idêntico ao de
  // antes, sem placeholder novo por ora).
  const photos = (detailQuery.data?.photos ?? []).filter(
    (photo): photo is typeof photo & { file: NonNullable<typeof photo.file> } => !!photo.file,
  );

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
    },
  });

  const fetchInvoiceOptions = (search: string) =>
    getApiOperationOperationIdInvoice(operationId, { Search: search, Limit: 20 }).then((res) =>
      res.items.map((invoice) => ({ value: invoice.id, label: invoice.number ?? invoice.id })),
    );

  // "Lote" não é campo do payload (D2) — só filtro de UI dentro deste
  // `SelectAsync`: o rótulo já combina lote/NF/identificador do fardo pra
  // o operador achar a linha certa digitando qualquer um dos três.
  const fetchRomaneioOptions = (search: string) =>
    getApiOperationOperationIdRomaneio(operationId, { Search: search, Limit: 20 }).then((res) =>
      res.items.map((romaneio) => ({
        value: romaneio.id,
        label: `${romaneio.lote} · NF ${romaneio.notaFiscal ?? "—"} · ${romaneio.itemIdentifier}`,
      })),
    );

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
 * Lista as `CargoUnit`s já estufadas de um vínculo container↔operação
 * (`GET /cargo` filtrado por `ContainerOperationId`, §8) e oferece a única
 * ação disponível sobre uma unidade existente: cancelar com motivo
 * obrigatório (§3.4/RF5 — `CargoUnit` nunca é editável).
 */
function CargoUnitsModal({
  operationId,
  containerLink,
  onClose,
}: {
  operationId: string;
  containerLink: ContainerOperationDTO;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<CargoUnitDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdCargoQueryOptions(operationId, {
    ContainerOperationId: containerLink.id,
    Limit: 100,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdCargoQueryKey(operationId),
    });

  const items = query.data?.items ?? [];

  return (
    <>
      <Modal show onHide={onClose} centered size="lg">
        <Modal.Header>
          <Modal.Title className="h5 mb-0">
            {t("administrative-operations.containers.stuffing.cargoUnitsTitle", {
              identifier: containerLink.container.identifier,
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {query.isLoading ? (
            <LoadingState variant="inline" />
          ) : items.length === 0 ? (
            <div className="alert alert-secondary mb-0">
              {t("administrative-operations.containers.stuffing.cargoUnitsEmpty")}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t("administrative-operations.containers.stuffing.colStatus")}</th>
                    <th>{t("administrative-operations.containers.stuffing.colIdentified")}</th>
                    <th>{t("administrative-operations.containers.stuffing.colGrossWeight")}</th>
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
                      <td>
                        {unit.status !== "Canceled" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title={t("administrative-operations.containers.stuffing.cancelTitle")}
                            onClick={() => setCancelTarget(unit)}
                          >
                            <i className="bi bi-x-circle" aria-hidden />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={onClose}>
            {t("crud.recordModal.close")}
          </Button>
        </Modal.Footer>
      </Modal>

      {cancelTarget ? (
        <CancelCargoUnitModal
          operationId={operationId}
          cargoUnit={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCanceled={invalidate}
        />
      ) : null}
    </>
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
