"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dropdown, Form, Spinner, Table } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  useGetApiUser,
  usePostApiUser,
  usePutApiUserId,
  useDeleteApiUserId,
  usePostApiUserIdResetPassword,
  usePatchApiUserIdActivate,
  usePatchApiUserIdDeactivate,
  getGetApiUserQueryKey,
} from "@/api/generated/endpoints/user/user";
import {
  apiRequest,
} from "@/api/mutator";
import type {
  UserDTO,
  GetApiUserParams,
} from "@/api/generated/model";
import { PageHeader } from "@/components/ui/page-header";
import { FormModal } from "@/components/ui/form-modal";
import type { Dictionary } from "@/i18n/dictionaries";

type AccessPageClientProps = {
  dict: Dictionary;
};

type UserFormState = {
  userName: string;
  fullName: string;
  document: string;
  email: string;
  phone: string;
  birthDate: string;
  roles: string[];
  isAdmin: boolean;
};

const EMPTY_FORM: UserFormState = {
  userName: "",
  fullName: "",
  document: "",
  email: "",
  phone: "",
  birthDate: "",
  roles: [],
  isAdmin: false,
};

const USER_ROLES = ["Administrativo", "Operacional", "Laboratorio"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AccessPageClient({ dict }: AccessPageClientProps) {
  const t = dict.access;

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const params: GetApiUserParams = useMemo(
    () => ({
      Search: search || undefined,
      Limit: "100",
    }),
    [search]
  );

  const { data, isLoading, refetch } = useGetApiUser(params);

  const users = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.profile?.fullName ?? "").toLowerCase();
      const user = (u.userName ?? "").toLowerCase();
      const email = (u.profile?.email ?? "").toLowerCase();
      return name.includes(q) || user.includes(q) || email.includes(q);
    });
  }, [users, search]);

  useEffect(() => {
    if (showForm) {
      if (editing) {
        setForm({
          userName: editing.userName ?? "",
          fullName: editing.profile?.fullName ?? "",
          document: editing.profile?.document ?? "",
          email: editing.profile?.email ?? "",
          phone: editing.profile?.phone ?? "",
          birthDate: editing.profile?.birthDate ?? "",
          roles: (editing as unknown as { roles?: string[] }).roles ?? [],
          isAdmin: editing.isAdmin ?? false,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [showForm, editing]);

  const set = (patch: Partial<UserFormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(user: UserDTO) {
    setEditing(user);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    setSubmitting(true);

    try {
      if (editing?.id) {
        await apiRequest({
          url: `/api/user/${editing.id}`,
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          data: {
            userName: form.userName,
            profile: {
              fullName: form.fullName,
              document: form.document || null,
              email: form.email,
              phone: form.phone || null,
              birthDate: form.birthDate || null,
            },
          },
        });
        toast.success("Usuário atualizado com sucesso.");
      } else {
        await apiRequest({
          url: "/api/user",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          data: {
            userName: form.userName,
            profile: {
              fullName: form.fullName,
              document: form.document || null,
              email: form.email,
              phone: form.phone || null,
              birthDate: form.birthDate || null,
            },
            roles: form.roles,
            isAdmin: form.isAdmin,
          },
        });
        toast.success("Usuário criado com sucesso.");
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      console.error("Falha ao salvar usuário:", err);
      // Toast já tratado pelo interceptor
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: UserDTO) {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      await apiRequest({
        url: `/api/user/${user.id}`,
        method: "DELETE",
      });
      toast.success("Usuário excluído com sucesso.");
      refetch();
    } catch {
      // Toast já tratado pelo interceptor
    }
  }

  async function handleResetPassword(user: UserDTO) {
    if (
      !confirm(
        `Tem certeza que deseja resetar a senha de ${user.profile?.fullName || "este usuário"}?`
      )
    )
      return;

    try {
      const result = await apiRequest<{ message?: string }>({
        url: `/api/user/${user.id}/reset-password`,
        method: "POST",
      });
      toast.success(result?.message || "Senha resetada com sucesso.");
    } catch {
      // Toast já tratado pelo interceptor
    }
  }

  async function handleToggleActive(user: UserDTO) {
    try {
      if (user.isActive) {
        await apiRequest({
          url: `/api/user/${user.id}/deactivate`,
          method: "PATCH",
        });
        toast.success("Usuário desativado.");
      } else {
        await apiRequest({
          url: `/api/user/${user.id}/activate`,
          method: "PATCH",
        });
        toast.success("Usuário ativado.");
      }
      refetch();
    } catch {
      // Toast já tratado pelo interceptor
    }
  }

  return (
    <>
      <section className="mb-4">
        <div
          className="text-uppercase fw-semibold mb-1"
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            color: "var(--bs-secondary)",
          }}
        >
          {t.section}
        </div>
        <h1 className="h4 fw-semibold mt-1 mb-1 d-flex align-items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {t.title}
        </h1>
        <p
          className="small mb-0"
          style={{ color: "var(--bs-secondary)" }}
        >
          {t.description}
        </p>
      </section>

      <div className="d-flex align-items-center gap-2 mb-4">
        <Form.Control
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-grow-1"
        />
        <Button
          variant="success"
          className="d-flex align-items-center gap-1 text-nowrap flex-shrink-0"
          onClick={openNew}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t.newUser}
        </Button>
      </div>

      {isLoading ? (
        <div
          className="p-5 text-center"
          style={{
            border: "1px solid var(--bs-border-color)",
            borderRadius: "0.75rem",
            color: "var(--bs-secondary)",
          }}
        >
          <Spinner animation="border" size="sm" className="me-2" />
          Carregando usuários...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="p-5 text-center"
          style={{
            border: "1px solid var(--bs-border-color)",
            borderRadius: "0.75rem",
            color: "var(--bs-secondary)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-3 d-block mx-auto"
            style={{ opacity: 0.4 }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="mb-0">{t.emptyState}</p>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--bs-border-color)",
            borderRadius: "0.75rem",
            overflow: "hidden",
          }}
        >
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>{t.colName}</th>
                  <th>{t.colUsername}</th>
                  <th>{t.colEmail}</th>
                  <th className="d-none d-md-table-cell">{t.colProfile}</th>
                  <th>{t.colStatus}</th>
                  <th className="text-end">{t.colType}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} style={{ cursor: "pointer" }} onClick={() => openEdit(user)}>
                    <td className="fw-semibold">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-inline-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: "var(--bs-success)",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(user.profile?.fullName ?? "")}
                        </div>
                        {user.profile?.fullName ?? "-"}
                      </div>
                    </td>
                    <td style={{ color: "var(--bs-secondary)" }}>
                      @{user.userName || "?"}
                    </td>
                    <td style={{ color: "var(--bs-secondary)" }}>
                      {user.profile?.email || "\u2014"}
                    </td>
                    <td className="d-none d-md-table-cell" style={{ color: "var(--bs-secondary)" }}>
                      {user.isAdmin ? t.admin : t.internal}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          user.isActive ? "text-bg-success" : "text-bg-secondary"
                        }`}
                      >
                        {user.isActive ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          variant="ghost"
                          size="sm"
                          className="btn btn-sm"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => openEdit(user)}>
                            {t.editUser}
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleResetPassword(user)}>
                            Resetar senha
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleToggleActive(user)}>
                            {user.isActive ? t.inactive : t.active}
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="text-danger"
                            onClick={() => handleDelete(user)}
                          >
                            Excluir
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      <FormModal
        show={showForm}
        onHide={handleClose}
        title={editing?.id ? t.editUser : t.newUser}
        footer={
          <>
            <Button variant="outline-secondary" onClick={handleClose}>
              {t.form.cancel}
            </Button>
            <Button
              variant="success"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  {editing?.id ? t.form.saving : t.form.creating}
                </>
              ) : (
                t.form.save
              )}
            </Button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">{t.form.username}</Form.Label>
            <Form.Control
              value={form.userName}
              onChange={(e) => set({ userName: e.target.value })}
              placeholder="Nome de usuario"
              disabled={!!editing?.id}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">{t.form.fullName}</Form.Label>
            <Form.Control
              value={form.fullName}
              onChange={(e) => set({ fullName: e.target.value })}
              placeholder="Nome completo"
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">{t.form.document}</Form.Label>
            <Form.Control
              value={form.document}
              onChange={(e) => set({ document: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">{t.form.email}</Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="nome@empresa.com"
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">{t.form.phone}</Form.Label>
            <Form.Control
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">{t.form.birthDate}</Form.Label>
            <Form.Control
              type="date"
              value={form.birthDate}
              onChange={(e) => set({ birthDate: e.target.value })}
            />
          </div>
          <div className="col-12 col-md-8">
            <Form.Label className="small fw-semibold">{t.form.roles}</Form.Label>
            <div className="d-flex flex-wrap gap-3">
              {USER_ROLES.map((role) => (
                <Form.Check
                  key={role}
                  type="checkbox"
                  id={`role-${role}`}
                  label={role}
                  checked={form.roles.includes(role)}
                  onChange={(e) => {
                    const current = form.roles;
                    set({
                      roles: e.target.checked
                        ? [...current, role]
                        : current.filter((r) => r !== role),
                    });
                  }}
                />
              ))}
            </div>
          </div>
          <div className="col-12 col-md-4 d-flex align-items-end">
            <Form.Check
              type="switch"
              id="user-admin"
              label={t.form.isAdmin}
              checked={form.isAdmin}
              onChange={(e) => set({ isAdmin: e.target.checked })}
            />
          </div>
        </div>
      </FormModal>
    </>
  );
}
