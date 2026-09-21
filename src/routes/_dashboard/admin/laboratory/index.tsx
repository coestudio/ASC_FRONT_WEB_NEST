import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Card } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  useDeleteApiUserId,
  usePatchApiUserIdActivate,
  usePatchApiUserIdDeactivate,
  usePostApiUser,
  usePostApiUserIdResetPassword,
  usePutApiUserId,
  getApiUser,
  getGetApiUserQueryKey,
} from "@/api/generated/endpoints/user/user";
import { PostApiUserBody } from "@/api/generated/zod/user/user.zod";
import { InternalRole, type UserDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { userListQueryOptions } from "@/lib/queries/user";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useFuzzyListQuery } from "@/lib/queries/fuzzy-list-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// Guard: `/_dashboard/admin/route.tsx` já barra quem não é administrador.
export const Route = createFileRoute("/_dashboard/admin/laboratory/")({
  head: () => ({ meta: [{ title: "Laboratório — ASC" }] }),
  component: AdminLaboratoryPage,
});

// Só remapeia o `.shape` gerado (regra 2 do AGENTS.md). Sem `isAdmin`/`roles`:
// nesta tela o usuário é sempre não-admin com o perfil Laboratory.
const laboratoryUserSchema = z.object({
  userName: PostApiUserBody.shape.userName,
  fullName: PostApiUserBody.shape.profile.shape.fullName,
  document: PostApiUserBody.shape.profile.shape.document,
  email: PostApiUserBody.shape.profile.shape.email,
  phone: PostApiUserBody.shape.profile.shape.phone,
  birthDate: PostApiUserBody.shape.profile.shape.birthDate,
});
type LaboratoryUserValues = z.infer<typeof laboratoryUserSchema>;

type PendingAction = {
  kind: "activate" | "deactivate" | "resetPassword" | "delete";
  user: UserDTO;
};

function toFormValues(user?: UserDTO): LaboratoryUserValues {
  return {
    userName: user?.userName ?? "",
    fullName: user?.profile.fullName ?? "",
    document: user?.profile.document ?? "",
    email: user?.profile.email ?? "",
    phone: user?.profile.phone ?? "",
    birthDate: user?.profile.birthDate ?? "",
  };
}

/**
 * Pessoal do laboratório — mesma ideia da página "Acesso", mas restrita a
 * usuários com o perfil `Laboratory` e **nunca** administradores: a listagem
 * filtra `Role=Laboratory` + `IsAdmin=false` no Core, e create/edit sempre
 * mandam `isAdmin: false` e `roles: ["Laboratory"]`.
 */
function AdminLaboratoryPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<{ mode: CrudRecordMode; user?: UserDTO } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  // Busca tolerante (sem caixa/acento, aceita erro de digitação) — ver `useFuzzyListQuery`.
  const listQueryOptions = useFuzzyListQuery({
    serverOptions: userListQueryOptions({
      Role: InternalRole.Laboratory,
      IsAdmin: false,
      Offset: (page - 1) * PAGE_SIZE,
      Limit: PAGE_SIZE,
      Sort: sort,
    }),
    baseKey: getGetApiUserQueryKey(),
    fetchPage: (offset, limit) =>
      getApiUser({
        Role: InternalRole.Laboratory,
        IsAdmin: false,
        Offset: offset,
        Limit: limit,
        Sort: sort,
      }),
    sort,
    search,
    page,
    pageSize: PAGE_SIZE,
    getTexts: (u: UserDTO) => [u.profile.fullName, u.userName, u.profile.email, u.profile.document],
  });

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: getGetApiUserQueryKey() });

  const createMutation = usePostApiUser();
  const updateMutation = usePutApiUserId();
  const activateMutation = usePatchApiUserIdActivate();
  const deactivateMutation = usePatchApiUserIdDeactivate();
  const resetPasswordMutation = usePostApiUserIdResetPassword();
  const deleteMutation = useDeleteApiUserId();

  const fields: LayoutField[] = [
    { type: "InputText", fieldName: "fullName", label: t("access.form.fullName"), col: { md: 6 } },
    { type: "InputText", fieldName: "userName", label: t("access.form.username"), col: { md: 6 } },
    { type: "InputEmail", fieldName: "email", label: t("access.form.email"), col: { md: 6 } },
    {
      type: "InputDocument",
      fieldName: "document",
      label: t("access.form.document"),
      col: { md: 6 },
    },
    { type: "InputPhone", fieldName: "phone", label: t("access.form.phone"), col: { md: 6 } },
    {
      type: "InputDate",
      fieldName: "birthDate",
      label: t("access.form.birthDate"),
      col: { md: 6 },
    },
  ];

  const columns: CrudColumn<UserDTO>[] = [
    {
      key: "name",
      headerKey: "access.colName",
      sortKey: "fullName",
      render: (u) => u.profile.fullName,
    },
    {
      key: "username",
      headerKey: "access.colUsername",
      sortKey: "userName",
      render: (u) => u.userName,
    },
    {
      key: "email",
      headerKey: "access.colEmail",
      sortKey: "email",
      render: (u) => u.profile.email ?? "—",
    },
    {
      key: "status",
      headerKey: "access.colStatus",
      sortKey: "isActive",
      render: (u) => (
        <Badge pill bg={u.isActive ? "success" : "secondary"}>
          {t(u.isActive ? "access.active" : "access.inactive")}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      headerKey: "access.colCreatedAt",
      sortKey: "createdAt",
      render: (u) => new Date(u.createdAt).toLocaleDateString(locale),
    },
  ];

  const handleSubmit = async (values: LaboratoryUserValues) => {
    const data = {
      userName: values.userName,
      profile: {
        fullName: values.fullName,
        document: values.document,
        email: values.email,
        phone: values.phone || null,
        birthDate: values.birthDate || null,
      },
      // Sempre não-admin e só com o perfil de laboratório.
      isAdmin: false,
      roles: [InternalRole.Laboratory],
    };
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data });
        toast.success(t("access.toast.created"));
      } else if (modal?.mode === "edit" && modal.user) {
        await updateMutation.mutateAsync({ id: modal.user.id, data });
        toast.success(t("access.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro
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
      // interceptor global (mutator.ts) já mostra o toast de erro
    } finally {
      setPending(null);
    }
  };

  const pendingName = pending ? (pending.user.profile.fullName ?? pending.user.userName) : "";
  const confirmCopy = {
    activate: {
      title: t("access.confirm.activateTitle"),
      message: t("access.confirm.activateMessage", { name: pendingName }),
    },
    deactivate: {
      title: t("access.confirm.deactivateTitle"),
      message: t("access.confirm.deactivateMessage", { name: pendingName }),
    },
    resetPassword: {
      title: t("access.confirm.resetPasswordTitle"),
      message: t("access.confirm.resetPasswordMessage", { name: pendingName }),
    },
    delete: {
      title: t("access.confirm.deleteTitle"),
      message: t("access.confirm.deleteMessage", { name: pendingName }),
    },
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="access.laboratoryTitle"
          descriptionKey="access.laboratoryDescription"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(u) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6">{u.profile.fullName}</Card.Title>
                <Card.Subtitle className="text-body-secondary small mb-2">
                  {u.userName}
                </Card.Subtitle>
                <div className="small text-body-secondary mb-2">{u.profile.email ?? "—"}</div>
                <Badge pill bg={u.isActive ? "success" : "secondary"}>
                  {t(u.isActive ? "access.active" : "access.inactive")}
                </Badge>
              </Card.Body>
            </Card>
          )}
          getItemKey={(u) => u.id}
          rowActions={(u, ctl) => (
            <CrudRowActions
              show={ctl.show}
              position={ctl.position}
              onToggle={ctl.onToggle}
              onView={() => setModal({ mode: "view", user: u })}
              onEdit={() => setModal({ mode: "edit", user: u })}
              onDelete={() => setPending({ kind: "delete", user: u })}
              extraActions={[
                {
                  key: "toggleActive",
                  icon: u.isActive ? "bi-slash-circle" : "bi-check-circle",
                  label: t(u.isActive ? "access.actions.deactivate" : "access.actions.activate"),
                  onClick: () =>
                    setPending({ kind: u.isActive ? "deactivate" : "activate", user: u }),
                },
                {
                  key: "resetPassword",
                  icon: "bi-key",
                  label: t("access.actions.resetPassword"),
                  disabled: !u.profile.email,
                  onClick: () => setPending({ kind: "resetPassword", user: u }),
                },
              ]}
            />
          )}
          onRowOpen={(u) => setModal({ mode: "view", user: u })}
          onRowEdit={(u) => setModal({ mode: "edit", user: u })}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          sort={sort}
          onSortChange={setSort}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="access.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<LaboratoryUserValues>
          show
          mode={modal.mode}
          titleKeys={{ create: "access.newUser", edit: "access.editUser", view: "access.viewUser" }}
          schema={laboratoryUserSchema}
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
