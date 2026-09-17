import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
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
  useDeleteApiOperationOperationIdContainerIdSealSealId,
  usePostApiOperationOperationIdContainer,
  usePostApiOperationOperationIdContainerIdPhoto,
  usePostApiOperationOperationIdContainerIdSeal,
  usePutApiOperationOperationIdContainerId,
} from "@/api/generated/endpoints/operation-container/operation-container";
import { getApiUser } from "@/api/generated/endpoints/user/user";
import {
  PostApiOperationOperationIdContainerBody,
  PostApiOperationOperationIdContainerIdSealBody,
  PutApiOperationOperationIdContainerIdBody,
} from "@/api/generated/zod/operation-container/operation-container.zod";
import type { ContainerOperationDTO, ContainerPhotoSlot } from "@/api/generated/model";
import { resolveContainerOperationStatusLabel } from "@/api/generated/static/containerOperationStatusOptions";
import { sealNameOptions } from "@/api/generated/static/sealNameOptions";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { SortableTh } from "@/components/crud/sortable-th";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  InputDate,
  InputPhotoSingle,
  InputText,
  InputTextArea,
  InputTime,
  Select,
  SelectAsync,
} from "@/layouts/Form/Fields/Index";
import { FilterText } from "@/layouts/Filters/Index";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// SPEC-37: os 8 slots reais de foto do container, ordem fixa do enum
// (`ContainerPhotoSlot`, `Domain/Operations/Container/Photos/*` no Core) —
// exclui `None`, que não é um slot de checklist (foto sem categoria, nunca
// satisfaz nenhum dos 8 obrigatórios).
type ContainerPhotoSlotKey = Exclude<ContainerPhotoSlot, "None">;

const PHOTO_CHECKLIST_SLOTS: ContainerPhotoSlotKey[] = [
  "EmptyExternal",
  "EmptyInternal",
  "FirstRow",
  "Fifty",
  "Hundred",
  "FullExternal",
  "Sealed",
  "ShipownerSeal",
];

type LinkFormValues = z.infer<typeof PostApiOperationOperationIdContainerBody>;
type UpdateFormValues = z.infer<typeof PutApiOperationOperationIdContainerIdBody>;
type SealFormValues = z.infer<typeof PostApiOperationOperationIdContainerIdSealBody>;

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
 * container existente + tara), edição (só `tara` — `status` é sempre
 * calculado no Core desde SPEC-35, só exibição) e fotos por container —
 * checklist dos 8 `ContainerPhotoSlot` obrigatórios (`InputPhotoSingle`
 * por slot, SPEC-37). Sem rota própria (D2 revertida em SPEC-07-02 §13) —
 * montada pelo shell via estado local.
 *
 * SPEC-44 substitui o antigo campo livre `sealDate` (extinto no Core,
 * SPEC-35) por ação dedicada de lacre/deslacre — ver `ContainerSeal` abaixo.
 *
 * SPEC-60 move estufagem/desestufagem (antes aqui, ver histórico da
 * SPEC-07-11/36/42/46) para a nova aba "Operacional"
 * (`components/operations/tabs/Operational.tsx`) — esta aba não tem mais
 * nenhuma ação sobre `CargoUnit`. SPEC-61 extrai fotos e lacre (antes
 * empilhados dentro do modal de editar tara) para dois modais dedicados,
 * abertos por botão próprio na linha (`photosFor`/`sealFor`) — o modal de
 * editar volta a ser só o formulário de tara.
 */
export function Containers({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerOperationDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerOperationDTO | null>(null);
  const [photosFor, setPhotosFor] = useState<ContainerOperationDTO | null>(null);
  // SPEC-62: quando não há lacre ativo, o botão da linha abre o modal de
  // criar lacre direto. Quando já tem, pedido do usuário: direto pra um
  // `ConfirmationModal` de deslacrar (sem painel intermediário) — o lacre
  // ativo já vem no próprio item da listagem (`item.seals`), sem query
  // extra.
  const [addSealFor, setAddSealFor] = useState<ContainerOperationDTO | null>(null);
  const [unsealFor, setUnsealFor] = useState<ContainerOperationDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdContainerQueryOptions(operationId, {
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: sort,
  });
  const query = useSsrSafeQuery(listQueryOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdContainerQueryKey(operationId),
    });

  const linkMutation = usePostApiOperationOperationIdContainer();
  const updateMutation = usePutApiOperationOperationIdContainerId();
  const deleteMutation = useDeleteApiOperationOperationIdContainerId();
  const removeSealMutation = useDeleteApiOperationOperationIdContainerIdSealSealId();

  const handleUnseal = async () => {
    const activeSeal = unsealFor?.seals?.find((s) => s.status === "Active");
    if (!unsealFor || !activeSeal) {
      setUnsealFor(null);
      return;
    }
    try {
      await removeSealMutation.mutateAsync({
        operationId,
        id: unsealFor.id,
        sealId: activeSeal.id,
      });
      toast.success(t("administrative-operations.containers.seal.toast.unsealed"));
      invalidateList();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    } finally {
      setUnsealFor(null);
    }
  };

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
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  };

  const updateForm = useForm<UpdateFormValues>({
    resolver: withEmptyStringsAsNull(PutApiOperationOperationIdContainerIdBody),
    defaultValues: { tara: "" },
  });

  useEffect(() => {
    if (!editing) return;
    updateForm.reset({
      tara: editing.tara != null ? String(editing.tara) : "",
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
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ operationId, id: pendingDelete.id });
      toast.success(t("administrative-operations.containers.toast.unlinked"));
      invalidateList();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    } finally {
      setPendingDelete(null);
    }
  };

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
        <div style={{ minWidth: 240 }}>
          <FilterText
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t("administrative-operations.containers.searchPlaceholder")}
          />
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={openLinkModal}>
            <i className="bi bi-plus-lg me-1" aria-hidden />
            {t("administrative-operations.containers.new")}
          </Button>
        </div>
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
        <div className="soft-card table-responsive">
          <Table hover size="sm" className="align-middle mb-0">
            <thead>
              <tr>
                <SortableTh sortKey="identifier" sort={sort} onSortChange={setSort}>
                  {t("administrative-operations.containers.colIdentifier")}
                </SortableTh>
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
                    <CrudRowActions
                      extraActions={[
                        {
                          key: "photos",
                          icon: "bi-camera",
                          label: t("administrative-operations.containers.photosButton"),
                          onClick: () => setPhotosFor(item),
                        },
                        {
                          key: "seal",
                          icon: item.status === "Sealed" ? "bi-shield-lock" : "bi-shield",
                          label: t(
                            item.status === "Sealed"
                              ? "administrative-operations.containers.seal.unsealButton"
                              : "administrative-operations.containers.seal.sealButton",
                          ),
                          onClick: () =>
                            item.status === "Sealed" ? setUnsealFor(item) : setAddSealFor(item),
                        },
                      ]}
                      onEdit={() => setEditing(item)}
                      onDelete={() => setPendingDelete(item)}
                    />
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
              {/* Status é sempre calculado no Core (SPEC-35) — só exibição,
                  nunca mais um campo de formulário submetido no PUT. */}
              <div className="mb-3">
                <span className="text-body-secondary small d-block mb-1">
                  {t("administrative-operations.containers.form.status")}
                </span>
                <Badge bg="secondary">
                  {resolveContainerOperationStatusLabel(editing.status, locale)}
                </Badge>
              </div>
              <InputText<UpdateFormValues>
                methods={updateForm}
                fieldName="tara"
                label={t("administrative-operations.containers.form.tara")}
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

      {photosFor ? (
        <Modal show onHide={() => setPhotosFor(null)} centered size="lg">
          <Modal.Header>
            <Modal.Title className="h5 mb-0">
              {t("administrative-operations.containers.photosModalTitle", {
                identifier: photosFor.container.identifier,
              })}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ContainerPhotos
              operationId={operationId}
              containerLinkId={photosFor.id}
              onChanged={invalidateList}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setPhotosFor(null)}>
              {t("crud.recordModal.close")}
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}

      {unsealFor ? (
        <ConfirmationModal
          show
          title={t("administrative-operations.containers.seal.confirmUnsealTitle")}
          message={t("administrative-operations.containers.seal.confirmUnsealMessage")}
          variant="danger"
          onConfirm={handleUnseal}
          onCancel={() => setUnsealFor(null)}
        />
      ) : null}

      {addSealFor ? (
        <AddSealModal
          operationId={operationId}
          containerLinkId={addSealFor.id}
          onClose={() => setAddSealFor(null)}
          onSealed={() => {
            invalidateList();
            setAddSealFor(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Data/hora atual, já nos formatos que `InputDate`/`InputTime` esperam
 * (`YYYY-MM-DD`/`HH:mm`) — pré-preenche o formulário de lacrar (SPEC-62). */
function nowAsDateAndTime(): { sealDate: string; sealTime: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    sealDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    sealTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * Formulário de "Lacrar" (SPEC-44 CA1) — `SealCreate` exige `userId`
 * explícito (quem lacrou fisicamente, não necessariamente quem está logado
 * no portal): mesma busca assíncrona de usuário já usada na aba
 * Responsáveis (`getApiUser`, `fetchUserOptions`). `name` vem do enum
 * `SealName` (snapshot estático); `label`/`description` são opcionais.
 *
 * SPEC-62 acrescenta foto obrigatória e data/hora do lacre (Core
 * SPEC-45): a foto usa o mesmo campo `file` do payload tipado
 * (`SealFormValues`), checada manualmente antes do submit — o schema
 * gerado marca `file`/`sealedAt` como opcionais porque `[FromForm]`
 * escalar não expõe obrigatoriedade no OpenAPI (mesma situação já
 * existente no upload de foto de container). Data e hora **não** entram
 * no payload tipado — são um formulário local separado
 * (`dateTimeMethods`, mesmo padrão de campo isolado de
 * `ContainerSearchInput`), combinados num único `sealedAt` (ISO com
 * offset) só no submit.
 */
function AddSealModal({
  operationId,
  containerLinkId,
  onClose,
  onSealed,
}: {
  operationId: string;
  containerLinkId: string;
  onClose: () => void;
  onSealed: () => void;
}) {
  const t = useT();
  const mutation = usePostApiOperationOperationIdContainerIdSeal();

  const methods = useForm<SealFormValues>({
    resolver: withEmptyStringsAsNull(PostApiOperationOperationIdContainerIdSealBody),
    defaultValues: { userId: "", name: "NONE", label: "", description: "", file: undefined },
  });

  const dateTimeMethods = useForm<{ sealDate: string; sealTime: string }>({
    defaultValues: nowAsDateAndTime(),
  });

  const fetchUserOptions = (search: string) =>
    getApiUser({ Search: search, Limit: 20 }).then((res) =>
      res.items.map((user) => ({
        value: user.id,
        label: user.profile.fullName || user.profile.email,
      })),
    );

  const handleSubmit: SubmitHandler<SealFormValues> = async (values) => {
    if (!values.file) {
      toast.error(t("administrative-operations.containers.seal.photoRequired"));
      return;
    }

    const { sealDate, sealTime } = dateTimeMethods.getValues();
    const sealedAt = new Date(`${sealDate}T${sealTime}:00`).toISOString();

    try {
      await mutation.mutateAsync({
        operationId,
        id: containerLinkId,
        data: { ...values, sealedAt },
      });
      toast.success(t("administrative-operations.containers.seal.toast.sealed"));
      onSealed();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.containers.seal.sealButton")}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={methods.handleSubmit(handleSubmit)}>
        <Modal.Body>
          <SelectAsync<SealFormValues>
            methods={methods}
            fieldName="userId"
            label={t("administrative-operations.containers.seal.form.user")}
            fetchOptions={fetchUserOptions}
          />
          <Select<SealFormValues>
            methods={methods}
            fieldName="name"
            label={t("administrative-operations.containers.seal.form.name")}
            enumOptions={sealNameOptions}
          />
          <InputText<SealFormValues>
            methods={methods}
            fieldName="label"
            label={t("administrative-operations.containers.seal.form.label")}
          />
          <InputTextArea<SealFormValues>
            methods={methods}
            fieldName="description"
            label={t("administrative-operations.containers.seal.form.description")}
            maxLength={255}
          />
          <InputPhotoSingle<SealFormValues>
            methods={methods}
            fieldName="file"
            label={t("administrative-operations.containers.seal.form.photo")}
          />
          <div className="d-flex gap-2">
            <InputDate
              methods={dateTimeMethods}
              fieldName="sealDate"
              label={t("administrative-operations.containers.seal.form.date")}
              config={{ containerClass: "mb-1 flex-fill" }}
            />
            <InputTime
              methods={dateTimeMethods}
              fieldName="sealTime"
              label={t("administrative-operations.containers.seal.form.time")}
              config={{ containerClass: "mb-1 flex-fill" }}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={onClose}>
            {t("crud.recordModal.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={methods.formState.isSubmitting}>
            {methods.formState.isSubmitting ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            {t("administrative-operations.containers.seal.sealButton")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/**
 * Fotos do vínculo container↔operação — mantém sua própria busca
 * (`operation-container/{id}` gerado) pra sempre mostrar a lista de fotos
 * atual, mesmo com o modal de edição já aberto com um snapshot antigo do
 * registro.
 *
 * SPEC-37: checklist dos 8 `ContainerPhotoSlot` obrigatórios — cada slot
 * tem sua própria célula (`ContainerPhotoSlotCell`), sinalizando se já tem
 * foto anexada e oferecendo upload (`InputPhotoSingle`, associa o slot
 * fixo dessa célula) quando não tem. Fotos com `slot` fora dos 8
 * (`None`/`null`, dado legado de antes desta SPEC) aparecem numa seção
 * separada "Outras fotos" — achado da implementação: sem essa seção elas
 * ficariam invisíveis na UI, mesmo continuando a existir no Core.
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

  const invalidateDetail = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdContainerIdQueryKey(operationId, containerLinkId),
    });

  const handleUpload = async (slot: ContainerPhotoSlot, file: File) => {
    try {
      await uploadMutation.mutateAsync({ operationId, id: containerLinkId, data: { file, slot } });
      toast.success(t("administrative-operations.containers.toast.photoUploaded"));
      invalidateDetail();
      onChanged();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deletePhotoMutation.mutateAsync({ operationId, id: containerLinkId, photoId });
      toast.success(t("administrative-operations.containers.toast.photoDeleted"));
      invalidateDetail();
      onChanged();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
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

  const photosBySlot = new Map<ContainerPhotoSlotKey, typeof photos>();
  const otherPhotos: typeof photos = [];
  for (const photo of photos) {
    const slot = photo.slot;
    if (slot && (PHOTO_CHECKLIST_SLOTS as string[]).includes(slot)) {
      const key = slot as ContainerPhotoSlotKey;
      photosBySlot.set(key, [...(photosBySlot.get(key) ?? []), photo]);
    } else {
      otherPhotos.push(photo);
    }
  }

  const missingCount = PHOTO_CHECKLIST_SLOTS.filter(
    (slot) => (photosBySlot.get(slot)?.length ?? 0) === 0,
  ).length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h6 mb-0">{t("administrative-operations.containers.photosTitle")}</h2>
        <Badge
          bg={missingCount === 0 ? "success" : "warning"}
          text={missingCount === 0 ? undefined : "dark"}
          className="px-2 py-1"
        >
          {missingCount === 0
            ? t("administrative-operations.containers.photosChecklistComplete")
            : t("administrative-operations.containers.photosChecklistMissing", {
                count: missingCount,
              })}
        </Badge>
      </div>

      <Row className="g-3 mb-3">
        {PHOTO_CHECKLIST_SLOTS.map((slot) => (
          <Col key={slot} xs={12} md={6}>
            <ContainerPhotoSlotCell
              slot={slot}
              photos={photosBySlot.get(slot) ?? []}
              onUpload={handleUpload}
              onRemove={handleDeletePhoto}
              removing={deletePhotoMutation.isPending}
            />
          </Col>
        ))}
      </Row>

      <div className="soft-card p-3">
        <div className="small fw-semibold text-body-secondary mb-2">
          {t("administrative-operations.containers.photosOther")}
        </div>

        {otherPhotos.length > 0 ? (
          <div className="d-flex flex-wrap gap-2 mb-2">
            {otherPhotos.map((photo) => (
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

        <AddOtherPhotoControl onUpload={(file) => handleUpload("None", file)} />
      </div>
    </div>
  );
}

type SlotUploadFormValues = { file: File | null };

/**
 * SPEC-63: controle de upload sempre visível (não só quando já existem
 * fotos legadas fora do checklist) — mesmo padrão auto-submit de
 * `ContainerPhotoSlotCell`, mas sem checklist/ícone de obrigatoriedade
 * (foto avulsa nunca é obrigatória).
 */
function AddOtherPhotoControl({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const t = useT();
  const methods = useForm<SlotUploadFormValues>({ defaultValues: { file: null } });
  const watchedFile = methods.watch("file");

  useEffect(() => {
    if (!watchedFile) return;
    onUpload(watchedFile).finally(() => methods.setValue("file", null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFile]);

  return (
    <InputPhotoSingle<SlotUploadFormValues>
      methods={methods}
      fieldName="file"
      label={t("administrative-operations.containers.photosAddOther")}
      config={{ containerClass: "mb-0" }}
    />
  );
}

/**
 * Uma célula do checklist (SPEC-37) — mostra as fotos já anexadas a este
 * slot (com remoção individual) e, sempre, um controle de upload
 * (`InputPhotoSingle`) que já sobe a foto assim que selecionada (mesmo
 * padrão de auto-submit do `InputAvatar` em `profile-modal.tsx`/do
 * `SelectAsync` em `Responsible.tsx` — sem botão "Salvar" extra).
 */
function ContainerPhotoSlotCell({
  slot,
  photos,
  onUpload,
  onRemove,
  removing,
}: {
  slot: ContainerPhotoSlotKey;
  photos: { id: string; file: { url?: string } }[];
  onUpload: (slot: ContainerPhotoSlotKey, file: File) => Promise<void>;
  onRemove: (photoId: string) => void;
  removing: boolean;
}) {
  const t = useT();
  const methods = useForm<SlotUploadFormValues>({ defaultValues: { file: null } });
  const watchedFile = methods.watch("file");
  const hasPhoto = photos.length > 0;

  useEffect(() => {
    if (!watchedFile) return;
    onUpload(slot, watchedFile).finally(() => methods.setValue("file", null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFile]);

  return (
    <div className="soft-card p-3 h-100">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i
          className={`bi ${hasPhoto ? "bi-check-circle-fill text-success" : "bi-exclamation-circle text-warning"} fs-5`}
          aria-hidden
        />
        <span className="fw-semibold">
          {t(`administrative-operations.containers.photoSlots.${slot}` as TranslationKey)}
        </span>
      </div>

      {hasPhoto ? (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="position-relative rounded overflow-hidden border"
              style={{ width: 72, height: 72 }}
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
                style={{ width: 18, height: 18, lineHeight: 1 }}
                aria-label={t("administrative-operations.containers.photosRemove")}
                disabled={removing}
                onClick={() => onRemove(photo.id)}
              >
                <i className="bi bi-x" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <InputPhotoSingle<SlotUploadFormValues>
        methods={methods}
        fieldName="file"
        label={t("administrative-operations.containers.photosAddToSlot")}
        config={{ containerClass: "mb-0" }}
      />
    </div>
  );
}
