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
  getGetApiOperationOperationIdContainerIdSealCurrentQueryKey,
  getGetApiOperationOperationIdContainerIdSealCurrentQueryOptions,
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
import type { ContainerOperationDTO, ContainerPhotoSlot, SealDTO } from "@/api/generated/model";
import { resolveContainerOperationStatusLabel } from "@/api/generated/static/containerOperationStatusOptions";
import { sealNameOptions } from "@/api/generated/static/sealNameOptions";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  InputPhotoSingle,
  InputText,
  InputTextArea,
  Select,
  SelectAsync,
} from "@/layouts/Form/Fields/Index";
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
 * SPEC-38: busca por texto na listagem de containers — campo isolado (não
 * faz parte de um `useForm` maior, só filtra a lista), mas ainda assim via
 * `layouts/Form/Fields/InputText` (regra 10 do AGENTS.md: nenhum input cru
 * fora da biblioteca de Fields). Mesmo padrão de `ListSearchInput` já usado
 * em `components/crud/crud-list-page.tsx` (privado lá, replicado aqui
 * porque `Containers.tsx` não usa `CrudListPage`).
 *
 * Exportado para reuso em `Operational.tsx` (SPEC-60): a sub-aba Estufagem
 * também busca containers, com o mesmo padrão de campo isolado.
 */
export function ContainerSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const methods = useForm<{ search: string }>({ defaultValues: { search: value } });
  const search = methods.watch("search");

  useEffect(() => {
    if (search !== value) onChange(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (value !== methods.getValues("search")) methods.setValue("search", value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <InputText
      methods={methods}
      fieldName="search"
      placeholder={t("administrative-operations.containers.searchPlaceholder")}
      config={{ containerClass: "mb-0" }}
    />
  );
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
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerOperationDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerOperationDTO | null>(null);
  const [photosFor, setPhotosFor] = useState<ContainerOperationDTO | null>(null);
  const [sealFor, setSealFor] = useState<ContainerOperationDTO | null>(null);

  const listQueryOptions = getGetApiOperationOperationIdContainerQueryOptions(operationId, {
    Search: search || undefined,
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
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
        <div style={{ minWidth: 240 }}>
          <ContainerSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
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
                          icon: "bi-shield-lock",
                          label: t("administrative-operations.containers.sealActionButton"),
                          onClick: () => setSealFor(item),
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

      {sealFor ? (
        <Modal show onHide={() => setSealFor(null)} centered>
          <Modal.Header>
            <Modal.Title className="h5 mb-0">
              {t("administrative-operations.containers.sealModalTitle", {
                identifier: sealFor.container.identifier,
              })}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ContainerSeal
              operationId={operationId}
              containerLinkId={sealFor.id}
              onChanged={invalidateList}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setSealFor(null)}>
              {t("crud.recordModal.close")}
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}
    </div>
  );
}

/**
 * Lacre do container (SPEC-44) — substitui o antigo campo livre `sealDate`
 * (extinto no Core, SPEC-35) por ação dedicada: "Lacrar" (`AddSeal`) e
 * "Deslacrar" (`DELETE .../seal/{id}`, soft-delete no Core). O lacre ativo
 * atual vem sempre da consulta dedicada (`seal/current`, CA3 da SPEC-44) —
 * nunca inferido de uma lista. Sem lista de histórico (nice-to-have do §4
 * item 3 da SPEC-44): o Core não expõe hoje um endpoint de listagem de
 * lacres por container (só o lacre ativo), então não há dado pra montar
 * essa lista sem inventar um novo endpoint — fora do escopo desta
 * implementação, registrado como débito no spec.md.
 */
function ContainerSeal({
  operationId,
  containerLinkId,
  onChanged,
}: {
  operationId: string;
  containerLinkId: string;
  onChanged: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [addSealOpen, setAddSealOpen] = useState(false);
  const [confirmUnseal, setConfirmUnseal] = useState(false);

  const currentSealQuery = useSsrSafeQuery(
    getGetApiOperationOperationIdContainerIdSealCurrentQueryOptions(operationId, containerLinkId),
  );
  const removeSealMutation = useDeleteApiOperationOperationIdContainerIdSealSealId();

  // Contrato do Core: 200 com corpo `null` quando não há lacre ativo — não é
  // erro, é o estado "deslacrado" (SPEC-33/44). O tipo gerado não reflete a
  // nulabilidade do corpo (limitação do Orval sobre `SealDTO?`), por isso o
  // cast aqui.
  const currentSeal = (currentSealQuery.data ?? null) as SealDTO | null;

  const invalidateSeal = () => {
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdContainerIdSealCurrentQueryKey(
        operationId,
        containerLinkId,
      ),
    });
    onChanged();
  };

  const handleUnseal = async () => {
    if (!currentSeal) return;
    try {
      await removeSealMutation.mutateAsync({
        operationId,
        id: containerLinkId,
        sealId: currentSeal.id,
      });
      toast.success(t("administrative-operations.containers.seal.toast.unsealed"));
      invalidateSeal();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
    } finally {
      setConfirmUnseal(false);
    }
  };

  return (
    <div>
      <h2 className="h6">{t("administrative-operations.containers.seal.title")}</h2>

      {currentSealQuery.isLoading ? (
        <LoadingState variant="inline" />
      ) : currentSeal ? (
        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
          <Badge bg="success">{t("administrative-operations.containers.seal.activeBadge")}</Badge>
          <span>
            {currentSeal.name
              ? sealNameOptions.find((opt) => opt.key === currentSeal.name)?.name[locale]
              : null}
            {currentSeal.label ? ` — ${currentSeal.label}` : ""}
          </span>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => setConfirmUnseal(true)}
            disabled={removeSealMutation.isPending}
          >
            {t("administrative-operations.containers.seal.unsealButton")}
          </Button>
        </div>
      ) : (
        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
          <span className="text-body-secondary">
            {t("administrative-operations.containers.seal.none")}
          </span>
          <Button size="sm" variant="outline-primary" onClick={() => setAddSealOpen(true)}>
            {t("administrative-operations.containers.seal.sealButton")}
          </Button>
        </div>
      )}

      {addSealOpen ? (
        <AddSealModal
          operationId={operationId}
          containerLinkId={containerLinkId}
          onClose={() => setAddSealOpen(false)}
          onSealed={() => {
            invalidateSeal();
            setAddSealOpen(false);
          }}
        />
      ) : null}

      {confirmUnseal ? (
        <ConfirmationModal
          show
          title={t("administrative-operations.containers.seal.confirmUnsealTitle")}
          message={t("administrative-operations.containers.seal.confirmUnsealMessage")}
          variant="danger"
          onConfirm={handleUnseal}
          onCancel={() => setConfirmUnseal(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Formulário de "Lacrar" (SPEC-44 CA1) — `SealCreate` exige `userId`
 * explícito (quem lacrou fisicamente, não necessariamente quem está logado
 * no portal): mesma busca assíncrona de usuário já usada na aba
 * Responsáveis (`getApiUser`, `fetchUserOptions`). `name` vem do enum
 * `SealName` (snapshot estático); `label`/`description` são opcionais.
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
    defaultValues: { userId: "", name: "NONE", label: "", description: "" },
  });

  const fetchUserOptions = (search: string) =>
    getApiUser({ Search: search, Limit: 20 }).then((res) =>
      res.items.map((user) => ({
        value: user.id,
        label: user.profile.fullName || user.profile.email,
      })),
    );

  const handleSubmit: SubmitHandler<SealFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ operationId, id: containerLinkId, data: values });
      toast.success(t("administrative-operations.containers.seal.toast.sealed"));
      onSealed();
    } catch {
      toast.error(t("administrative-operations.containers.toast.error"));
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

  const handleUpload = async (slot: ContainerPhotoSlotKey, file: File) => {
    try {
      await uploadMutation.mutateAsync({ operationId, id: containerLinkId, data: { file, slot } });
      toast.success(t("administrative-operations.containers.toast.photoUploaded"));
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
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="h6 mb-0">{t("administrative-operations.containers.photosTitle")}</h2>
        <Badge
          bg={missingCount === 0 ? "success" : "warning"}
          text={missingCount === 0 ? undefined : "dark"}
        >
          {missingCount === 0
            ? t("administrative-operations.containers.photosChecklistComplete")
            : t("administrative-operations.containers.photosChecklistMissing", {
                count: missingCount,
              })}
        </Badge>
      </div>

      <div className="d-flex flex-column gap-2 mb-3">
        {PHOTO_CHECKLIST_SLOTS.map((slot) => (
          <ContainerPhotoSlotCell
            key={slot}
            slot={slot}
            photos={photosBySlot.get(slot) ?? []}
            onUpload={handleUpload}
            onRemove={handleDeletePhoto}
            removing={deletePhotoMutation.isPending}
          />
        ))}
      </div>

      {otherPhotos.length > 0 ? (
        <div className="mt-3">
          <div className="small fw-semibold text-body-secondary mb-1">
            {t("administrative-operations.containers.photosOther")}
          </div>
          <div className="d-flex flex-wrap gap-2">
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
        </div>
      ) : null}
    </div>
  );
}

type SlotUploadFormValues = { file: File | null };

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
    <div className="d-flex align-items-start gap-2 border rounded p-2">
      <i
        className={`bi ${hasPhoto ? "bi-check-circle-fill text-success" : "bi-exclamation-circle text-warning"} fs-5 mt-1`}
        aria-hidden
      />
      <div className="flex-grow-1 min-w-0">
        <div className="fw-semibold small">
          {t(`administrative-operations.containers.photoSlots.${slot}` as TranslationKey)}
        </div>

        {hasPhoto ? (
          <div className="d-flex flex-wrap gap-2 mt-1">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="position-relative rounded overflow-hidden border"
                style={{ width: 64, height: 64 }}
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
          config={{ containerClass: "mb-0 mt-2" }}
        />
      </div>
    </div>
  );
}
