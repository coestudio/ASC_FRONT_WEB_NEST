import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Card, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  useDeleteApiUserId,
  usePatchApiUserIdActivate,
  usePatchApiUserIdDeactivate,
  usePostApiUser,
  usePostApiUserIdResetPassword,
  usePutApiUserId,
  getGetApiUserQueryKey,
} from "@/api/generated/endpoints/user/user";
import { PostApiUserBody } from "@/api/generated/zod/user/user.zod";
import { UserType, type UserDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { userListQueryOptions, userRolesQueryOptions } from "@/lib/queries/user";
import { fetchUserListFn, fetchUserRolesFn } from "@/lib/user-fns";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import { resolveInternalRoleLabel } from "@/api/generated/static/internalRoleOptions";
import styles from "./index.module.css";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/admin/access/")({
  head: () => ({ meta: [{ title: "Acesso — ASC" }] }),
  // Semeia o cache do React Query pra primeira página (sem busca) + roles.
  // No SSR busca server→Core com o cookie (fetchUserListFn/fetchUserRolesFn,
  // ver src/lib/user-fns.ts); o client re-hidrata sem refetch. Mesmo padrão
  // do profileMeQueryOptions/fetchMeFn no __root — os hooks gerados
  // (mutator.ts) recusam chamada autenticada no SSR.
  loader: async ({ context }) => {
    const firstPageParams = { Offset: 0, Limit: PAGE_SIZE };
    const [users, roles] = await Promise.all([
      fetchUserListFn({ data: firstPageParams }),
      fetchUserRolesFn(),
    ]);
    if (users) {
      context.queryClient.setQueryData(userListQueryOptions(firstPageParams).queryKey, users);
    }
    if (roles) {
      context.queryClient.setQueryData(userRolesQueryOptions().queryKey, roles);
    }
  },
  component: AdminAccessPage,
});

// Schema unificado (create/edit/view usam o mesmo T; edit só não renderiza
// isAdmin/roles nem manda no PUT — UserUpdate do Core não aceita esses
// campos, ver spec §13 D3).
const userFormSchema = z.object({
  userName: PostApiUserBody.shape.userName,
  fullName: PostApiUserBody.shape.profile.shape.fullName,
  document: PostApiUserBody.shape.profile.shape.document,
  email: PostApiUserBody.shape.profile.shape.email,
  phone: PostApiUserBody.shape.profile.shape.phone,
  birthDate: PostApiUserBody.shape.profile.shape.birthDate,
  isAdmin: PostApiUserBody.shape.isAdmin,
  roles: PostApiUserBody.shape.roles,
});
type UserFormValues = z.infer<typeof userFormSchema>;

type PendingAction = {
  kind: "activate" | "deactivate" | "resetPassword" | "delete";
  user: UserDTO;
};

/**
 * Ações da linha/card — pílulas circulares coloridas (verde pra editar e
 * redefinir senha, vermelho pra excluir, neutro pro resto), referência de
 * design: print da tela de Acesso (SPEC-11 escopo expandido). Compartilhada
 * entre a tabela e o card do `CrudListPage` pra não duplicar o markup.
 */
function RowActions({
  user: u,
  setModal,
  setPending,
  t,
}: {
  user: UserDTO;
  setModal: (v: { mode: CrudRecordMode; user?: UserDTO } | null) => void;
  setPending: (v: PendingAction | null) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="d-flex gap-1 flex-wrap">
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnNeutral}`}
        onClick={() => setModal({ mode: "view", user: u })}
      >
        <i className="bi bi-eye" aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
        onClick={() => setModal({ mode: "edit", user: u })}
      >
        <i className="bi bi-pencil" aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnNeutral}`}
        onClick={() => setPending({ kind: u.isActive ? "deactivate" : "activate", user: u })}
      >
        <i className={`bi ${u.isActive ? "bi-slash-circle" : "bi-check-circle"}`} aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
        disabled={!u.profile.email}
        title={!u.profile.email ? t("access.actions.noEmailTooltip") : undefined}
        onClick={() => setPending({ kind: "resetPassword", user: u })}
      >
        <i className="bi bi-key" aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
        onClick={() => setPending({ kind: "delete", user: u })}
      >
        <i className="bi bi-trash" aria-hidden />
      </button>
    </div>
  );
}

function toFormValues(user?: UserDTO): UserFormValues {
  return {
    userName: user?.userName ?? "",
    fullName: user?.profile.fullName ?? "",
    document: user?.profile.document ?? "",
    email: user?.profile.email ?? "",
    phone: user?.profile.phone ?? "",
    birthDate: user?.profile.birthDate ?? "",
    isAdmin: user?.isAdmin ?? false,
    roles: user?.roles ?? [],
  };
}

/**
 * Gate de montagem: `AdminAccessPageContent` chama `useSsrSafeQuery` pro
 * lookup de roles do form — pra esse hook nunca existir durante o SSR (não
 * só ficar `enabled: false`, que a integração de streaming SSR do
 * TanStack Query pode ignorar), o conteúdo real só monta depois que o
 * componente já confirma que está rodando no client (SPEC-10, mesmo padrão
 * do `CrudListPage`).
 */
function AdminAccessPage() {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div>
        <h1 className="h4 mb-3">{t("access.title")}</h1>
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  return <AdminAccessPageContent />;
}

function AdminAccessPageContent() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; user?: UserDTO } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const listQueryOptions = userListQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });
  // Lookup de roles pro multi-select do form (fora do CrudListPage) — mesmo
  // guard de SSR via useSsrSafeQuery (SPEC-10); o cache já vem quente do
  // loader acima na primeira renderização.
  const { data: roleOptions } = useSsrSafeQuery(userRolesQueryOptions());

  // Bind por `opt.key` (string), não `opt.value` (int legado do snapshot) —
  // `UserDTO.roles`/`UserCreate.roles` são `InternalRole[]`, enum string
  // (SPEC-15). Achado da auditoria §3.4 da SPEC-15, corrigido aqui (fora da
  // "Área" formal daquela spec, autorizado pelo usuário como extensão pontual).
  const roleFieldOptions = useMemo(
    () =>
      (roleOptions ?? []).map((opt) => ({
        value: opt.key,
        label: resolveInternalRoleLabel(opt.key, locale),
      })),
    [roleOptions, locale],
  );

  // Mapa key→label pra exibir a coluna "perfil" na lista (contrato de
  // colunas da SPEC-03 §3.2) sem repetir a resolução de EnumOptionDTO por
  // linha. `u.roles` já vem como `InternalRole[]` (string) do Core.
  const roleLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    roleFieldOptions.forEach((opt) => map.set(opt.value, opt.label));
    return map;
  }, [roleFieldOptions]);

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: getGetApiUserQueryKey() });

  const createMutation = usePostApiUser();
  const updateMutation = usePutApiUserId();
  const activateMutation = usePatchApiUserIdActivate();
  const deactivateMutation = usePatchApiUserIdDeactivate();
  const resetPasswordMutation = usePostApiUserIdResetPassword();
  const deleteMutation = useDeleteApiUserId();

  const createFields: LayoutField[] = [
    { type: "InputText", fieldName: "fullName", label: t("access.form.fullName"), col: { md: 6 } },
    { type: "InputText", fieldName: "userName", label: t("access.form.username"), col: { md: 6 } },
    { type: "InputEmail", fieldName: "email", label: t("access.form.email"), col: { md: 6 } },
    { type: "InputText", fieldName: "document", label: t("access.form.document"), col: { md: 6 } },
    { type: "InputText", fieldName: "phone", label: t("access.form.phone"), col: { md: 6 } },
    {
      type: "InputDate",
      fieldName: "birthDate",
      label: t("access.form.birthDate"),
      col: { md: 6 },
    },
    {
      type: "InputMultiSelect",
      fieldName: "roles",
      label: t("access.form.roles"),
      col: { md: 8 },
      config: { options: roleFieldOptions },
    },
    { type: "InputSwitch", fieldName: "isAdmin", label: t("access.form.isAdmin"), col: { md: 4 } },
  ];

  const editFields: LayoutField[] = [
    { type: "InputText", fieldName: "fullName", label: t("access.form.fullName"), col: { md: 6 } },
    { type: "InputText", fieldName: "userName", label: t("access.form.username"), col: { md: 6 } },
    { type: "InputEmail", fieldName: "email", label: t("access.form.email"), col: { md: 6 } },
    { type: "InputText", fieldName: "document", label: t("access.form.document"), col: { md: 6 } },
    { type: "InputText", fieldName: "phone", label: t("access.form.phone"), col: { md: 6 } },
    {
      type: "InputDate",
      fieldName: "birthDate",
      label: t("access.form.birthDate"),
      col: { md: 6 },
    },
  ];

  const fields = modal?.mode === "create" || modal?.mode === "view" ? createFields : editFields;

  const columns: CrudColumn<UserDTO>[] = [
    { key: "name", headerKey: "access.colName", render: (u) => u.profile.fullName },
    { key: "username", headerKey: "access.colUsername", render: (u) => u.userName },
    { key: "email", headerKey: "access.colEmail", render: (u) => u.profile.email ?? "—" },
    {
      key: "profile",
      headerKey: "access.colProfile",
      render: (u) => u.roles.map((r) => roleLabelByValue.get(r) ?? r).join(", ") || "—",
    },
    {
      key: "status",
      headerKey: "access.colStatus",
      render: (u) => (
        <Badge pill bg={u.isActive ? "success" : "secondary"}>
          {t(u.isActive ? "access.active" : "access.inactive")}
        </Badge>
      ),
    },
    {
      key: "type",
      headerKey: "access.colType",
      render: (u) => t(u.type === UserType.Internal ? "access.internal" : "access.external"),
    },
    {
      key: "createdAt",
      headerKey: "access.colCreatedAt",
      render: (u) => new Date(u.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "access.colActions",
      render: (u) => <RowActions user={u} setModal={setModal} setPending={setPending} t={t} />,
    },
  ];

  const handleSubmit = async (values: UserFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({
          data: {
            userName: values.userName,
            profile: {
              fullName: values.fullName,
              document: values.document,
              email: values.email,
              phone: values.phone || null,
              birthDate: values.birthDate || null,
            },
            isAdmin: values.isAdmin ?? false,
            roles: values.roles ?? [],
          },
        });
        toast.success(t("access.toast.created"));
      } else if (modal?.mode === "edit" && modal.user) {
        await updateMutation.mutateAsync({
          id: modal.user.id,
          data: {
            userName: values.userName,
            profile: {
              fullName: values.fullName,
              document: values.document,
              email: values.email,
              phone: values.phone || null,
              birthDate: values.birthDate || null,
            },
          },
        });
        toast.success(t("access.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("access.toast.error"));
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    try {
      switch (pending.kind) {
        case "activate":
          await activateMutation.mutateAsync({ id: pending.user.id });
          toast.success(t("access.toast.activated"));
          break;
        case "deactivate":
          await deactivateMutation.mutateAsync({ id: pending.user.id });
          toast.success(t("access.toast.deactivated"));
          break;
        case "resetPassword":
          await resetPasswordMutation.mutateAsync({ id: pending.user.id });
          toast.success(t("access.toast.resetPasswordSent"));
          break;
        case "delete":
          await deleteMutation.mutateAsync({ id: pending.user.id });
          toast.success(t("access.toast.deleted"));
          break;
      }
      invalidateList();
    } catch {
      toast.error(t("access.toast.error"));
    } finally {
      setPending(null);
    }
  };

  const confirmCopy: Record<PendingAction["kind"], { title: string; message: string }> = pending
    ? {
        activate: {
          title: t("access.confirm.activateTitle"),
          message: t("access.confirm.activateMessage", {
            name: pending.user.profile.fullName ?? pending.user.userName,
          }),
        },
        deactivate: {
          title: t("access.confirm.deactivateTitle"),
          message: t("access.confirm.deactivateMessage", {
            name: pending.user.profile.fullName ?? pending.user.userName,
          }),
        },
        resetPassword: {
          title: t("access.confirm.resetPasswordTitle"),
          message: t("access.confirm.resetPasswordMessage", {
            name: pending.user.profile.fullName ?? pending.user.userName,
          }),
        },
        delete: {
          title: t("access.confirm.deleteTitle"),
          message: t("access.confirm.deleteMessage", {
            name: pending.user.profile.fullName ?? pending.user.userName,
          }),
        },
      }
    : ({} as never);

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="access.title"
          descriptionKey="access.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(u) => (
            <Card className={styles.card}>
              <Card.Body>
                <Card.Title className="h6">{u.profile.fullName}</Card.Title>
                <Card.Subtitle className="text-body-secondary small mb-2">
                  {u.userName}
                </Card.Subtitle>
                <div className="small text-body-secondary mb-2">{u.profile.email ?? "—"}</div>
                <Badge pill bg={u.isActive ? "success" : "secondary"} className="me-1">
                  {t(u.isActive ? "access.active" : "access.inactive")}
                </Badge>
                <Badge pill bg="info">
                  {t(u.type === UserType.Internal ? "access.internal" : "access.external")}
                </Badge>
                <div className="mt-2">
                  <RowActions user={u} setModal={setModal} setPending={setPending} t={t} />
                </div>
              </Card.Body>
            </Card>
          )}
          getItemKey={(u) => u.id}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="access.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<UserFormValues>
          show
          mode={modal.mode}
          titleKeys={{ create: "access.newUser", edit: "access.editUser", view: "access.viewUser" }}
          schema={userFormSchema}
          fields={fields}
          defaultValues={toFormValues(modal.user)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}

      {pending ? (
        <ConfirmationModal
          show
          title={confirmCopy[pending.kind].title}
          message={confirmCopy[pending.kind].message}
          variant={pending.kind === "delete" ? "danger" : "primary"}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </>
  );
}
