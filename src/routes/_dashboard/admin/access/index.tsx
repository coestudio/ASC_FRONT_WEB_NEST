import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card } from "react-bootstrap";
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
import type { UserDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { userListQueryOptions, userRolesQueryOptions } from "@/lib/queries/user";
import { fetchUserListFn, fetchUserRolesFn } from "@/lib/user-fns";
import { useLocale, useT } from "@/lib/ui-prefs";
import type { Locale } from "@/i18n/config";

// `EnumOptionDTO.name` usa chave de 2 letras (pt/en/es/zh, ver
// src/api/generated/static/getApiUserRoles.ts) — não bate 1:1 com `Locale`
// ("pt-BR"). Resolve pro texto certo, com fallback honesto (nunca inventa
// tradução: cai pro primeiro valor disponível ou pro próprio value).
function resolveEnumOptionName(name: Record<string, string>, locale: Locale): string {
  const key = locale === "pt-BR" ? "pt" : locale;
  return name[key] ?? name.pt ?? Object.values(name)[0] ?? "";
}

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

function AdminAccessPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; user?: UserDTO } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const { data, isLoading, isError } = useQuery(
    userListQueryOptions({
      Search: search || undefined,
      Offset: (page - 1) * PAGE_SIZE,
      Limit: PAGE_SIZE,
    }),
  );
  const { data: roleOptions } = useQuery(userRolesQueryOptions());

  const roleFieldOptions = useMemo(
    () =>
      (roleOptions ?? []).map((opt) => ({
        value: opt.value,
        label: resolveEnumOptionName(opt.name, locale),
      })),
    [roleOptions, locale],
  );

  const roleLabelByValue = useMemo(() => {
    const map = new Map<string | number, string>();
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
        <Badge bg={u.isActive ? "success" : "secondary"}>
          {t(u.isActive ? "access.active" : "access.inactive")}
        </Badge>
      ),
    },
    {
      key: "type",
      headerKey: "access.colType",
      render: (u) => t(u.type === 0 ? "access.internal" : "access.external"),
    },
    {
      key: "createdAt",
      headerKey: "access.colCreatedAt",
      render: (u) => new Date(u.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "access.colActions",
      render: (u) => (
        <div className="d-flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setModal({ mode: "view", user: u })}
          >
            <i className="bi bi-eye" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setModal({ mode: "edit", user: u })}
          >
            <i className="bi bi-pencil" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setPending({ kind: u.isActive ? "deactivate" : "activate", user: u })}
          >
            <i className={`bi ${u.isActive ? "bi-slash-circle" : "bi-check-circle"}`} aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={!u.profile.email}
            title={!u.profile.email ? t("access.actions.noEmailTooltip") : undefined}
            onClick={() => setPending({ kind: "resetPassword", user: u })}
          >
            <i className="bi bi-key" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => setPending({ kind: "delete", user: u })}
          >
            <i className="bi bi-trash" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  const items = data?.items ?? [];
  const total = Number(data?.total ?? 0);

  const handleSubmit = async (values: UserFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({
          data: {
            userName: values.userName,
            profile: {
              fullName: values.fullName,
              document: values.document || null,
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
              document: values.document || null,
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
    <div>
      <CrudListPage
        titleKey="access.title"
        descriptionKey="access.description"
        items={items}
        columns={columns}
        renderCard={(u) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6">{u.profile.fullName}</Card.Title>
              <Card.Subtitle className="text-body-secondary small mb-2">{u.userName}</Card.Subtitle>
              <div className="small text-body-secondary mb-2">{u.profile.email ?? "—"}</div>
              <Badge bg={u.isActive ? "success" : "secondary"} className="me-1">
                {t(u.isActive ? "access.active" : "access.inactive")}
              </Badge>
              <Badge bg="info">{t(u.type === 0 ? "access.internal" : "access.external")}</Badge>
              <div className="d-flex gap-1 flex-wrap mt-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setModal({ mode: "view", user: u })}
                >
                  <i className="bi bi-eye" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setModal({ mode: "edit", user: u })}
                >
                  <i className="bi bi-pencil" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() =>
                    setPending({ kind: u.isActive ? "deactivate" : "activate", user: u })
                  }
                >
                  <i
                    className={`bi ${u.isActive ? "bi-slash-circle" : "bi-check-circle"}`}
                    aria-hidden
                  />
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={!u.profile.email}
                  title={!u.profile.email ? t("access.actions.noEmailTooltip") : undefined}
                  onClick={() => setPending({ kind: "resetPassword", user: u })}
                >
                  <i className="bi bi-key" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => setPending({ kind: "delete", user: u })}
                >
                  <i className="bi bi-trash" aria-hidden />
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}
        getItemKey={(u) => u.id}
        isLoading={isLoading}
        isError={isError}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onCreate={() => setModal({ mode: "create" })}
        emptyMessageKey="access.emptyState"
      />

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
    </div>
  );
}
