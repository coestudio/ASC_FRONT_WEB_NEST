"use client";

import { useMemo, useState } from "react";
import { Button, Dropdown, Form, InputGroup, Spinner, Table } from "react-bootstrap";
import {
  ShieldLock,
  PlusLg,
  Pencil,
  Key,
  Trash,
  ThreeDotsVertical,
  Envelope,
  Telephone,
  CardText,
  CalendarDate,
  Inbox,
  Search,
} from "react-bootstrap-icons";
import { toast } from "react-toastify";
import { useGetApiUser } from "@/api/generated/endpoints/user/user";
import { apiRequest } from "@/api/mutator";
import type { UserDTO, GetApiUserParams } from "@/api/generated/model";
import { FormModal } from "@/components/ui/form-modal";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useResponsiveViewMode } from "@/lib/view-mode";
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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export function AccessPageClient({ dict }: AccessPageClientProps) {
  const t = dict.access;
  const { viewMode, setViewMode, isMobile } = useResponsiveViewMode();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Modais de confirmação
  const [deletingUser, setDeletingUser] = useState<UserDTO | null>(null);
  const [resettingUser, setResettingUser] = useState<UserDTO | null>(null);

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

  const setFormField = (patch: Partial<UserFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(user: UserDTO) {
    setEditing(user);
    setForm({
      userName: user.userName ?? "",
      fullName: user.profile?.fullName ?? "",
      document: user.profile?.document ?? "",
      email: user.profile?.email ?? "",
      phone: user.profile?.phone ?? "",
      birthDate: user.profile?.birthDate ? user.profile.birthDate.split("T")[0] : "",
      roles: (user as unknown as { roles?: string[] }).roles ?? [],
      isAdmin: user.isAdmin ?? false,
    });
    setShowForm(true);
  }

  function handleCloseForm() {
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
      handleCloseForm();
      refetch();
    } catch (err) {
      console.error("Falha ao salvar usuário:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingUser) return;
    const user = deletingUser;
    setDeletingUser(null);

    try {
      await apiRequest({
        url: `/api/user/${user.id}`,
        method: "DELETE",
      });
      toast.success("Usuário excluído com sucesso.");
      refetch();
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
    }
  }

  async function handleConfirmResetPassword() {
    if (!resettingUser) return;
    const user = resettingUser;
    setResettingUser(null);

    try {
      const result = await apiRequest<{ message?: string }>({
        url: `/api/user/${user.id}/reset-password`,
        method: "POST",
      });
      toast.success(result?.message || "Senha resetada com sucesso.");
    } catch (err) {
      console.error("Erro ao resetar senha:", err);
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
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

  return (
    <>
      {/* Cabeçalho da página */}
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
          <ShieldLock aria-hidden />
          {t.title}
        </h1>
        <p className="small mb-0" style={{ color: "var(--bs-secondary)" }}>
          {t.description}
        </p>
      </section>

      {/* Barra de Ações: Busca + ViewToggle + Novo Usuário */}
      <div className="d-flex flex-column flex-md-row gap-3 mb-4 align-items-stretch align-items-md-center">
        <div className="flex-grow-1">
          <InputGroup>
            <InputGroup.Text
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--bs-border-color)",
                color: "var(--bs-secondary)",
              }}
            >
              <Search aria-hidden />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <div className="d-flex gap-2 align-items-center justify-content-end flex-shrink-0">
          <ViewToggle value={viewMode} onChange={setViewMode} hidden={isMobile} />
          <Button
            variant="success"
            className="d-flex align-items-center justify-content-center gap-1 text-nowrap flex-grow-1 flex-md-grow-0"
            onClick={openNew}
          >
            <PlusLg aria-hidden />
            {t.newUser}
          </Button>
        </div>
      </div>

      {/* Conteúdo: Loading / Vazio / Tabela (List) / Cards */}
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
          <Inbox className="display-6 mb-3 d-block mx-auto opacity-50" />
          <p className="mb-0">{t.emptyState}</p>
        </div>
      ) : viewMode === "list" ? (
        /* Visualização em TABELA (React Bootstrap Table) */
        <div
          style={{
            border: "1px solid var(--bs-border-color)",
            borderRadius: "0.75rem",
          }}
        >
          <div className="table-responsive" style={{ minHeight: "160px" }}>
            <Table hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>{t.colName}</th>
                  <th>{t.colUsername}</th>
                  <th>{t.colEmail}</th>
                  <th>Telefone</th>
                  <th>Documento</th>
                  <th>{t.colStatus}</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td className="fw-semibold">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-inline-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: "var(--bs-success)",
                            color: "var(--sidebar-active-fg)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(user.profile?.fullName ?? "")}
                        </div>
                        <span>{user.profile?.fullName ?? "—"}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--bs-secondary)" }}>
                      @{user.userName || "?"}
                    </td>
                    <td style={{ color: "var(--bs-secondary)" }}>
                      {user.profile?.email || "—"}
                    </td>
                    <td style={{ color: "var(--bs-secondary)" }}>
                      {user.profile?.phone || "—"}
                    </td>
                    <td style={{ color: "var(--bs-secondary)" }}>
                      {user.profile?.document || "—"}
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
                    <td className="text-end">
                      <div className="d-inline-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          title="Editar"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          title="Resetar senha"
                          onClick={() => setResettingUser(user)}
                        >
                          <Key aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          title="Excluir"
                          onClick={() => setDeletingUser(user)}
                        >
                          <Trash aria-hidden />
                        </button>
                        <Dropdown align="end" className="d-inline-block">
                          <Dropdown.Toggle
                            variant="outline-success"
                            size="sm"
                            className="btn btn-sm"
                            title="Mais opções"
                          >
                            <ThreeDotsVertical aria-hidden />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => openEdit(user)}>
                              <Pencil className="me-2" aria-hidden />
                              {t.editUser}
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setResettingUser(user)}>
                              <Key className="me-2" aria-hidden />
                              Resetar senha
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleToggleActive(user)}>
                              {user.isActive ? t.inactive : t.active}
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item
                              className="text-danger"
                              onClick={() => setDeletingUser(user)}
                            >
                              <Trash className="me-2" aria-hidden />
                              Excluir
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      ) : (
        /* Visualização em CARDS (Grid) */
        <div className="row g-3">
          {filtered.map((user) => (
            <div key={user.id} className="col-12 col-md-6 col-xl-4">
              <div
                className="h-100 d-flex flex-column gap-3 p-3"
                style={{
                  border: "1px solid var(--bs-border-color)",
                  borderRadius: "0.75rem",
                  backgroundColor: "var(--bs-body-bg)",
                }}
              >
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: "var(--bs-success)",
                        color: "var(--sidebar-active-fg)",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(user.profile?.fullName || "")}
                    </div>
                    <div>
                      <h3 className="h6 fw-semibold mb-0">
                        {user.profile?.fullName || "—"}
                      </h3>
                      <div
                        className="small"
                        style={{ color: "var(--bs-secondary)" }}
                      >
                        @{user.userName || "?"}
                      </div>
                    </div>
                  </div>

                  <Dropdown align="end">
                    <Dropdown.Toggle
                      variant="outline-success"
                      size="sm"
                      className="btn btn-sm"
                    >
                      <ThreeDotsVertical aria-hidden />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => openEdit(user)}>
                        <Pencil className="me-2" aria-hidden />
                        {t.editUser}
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setResettingUser(user)}>
                        <Key className="me-2" aria-hidden />
                        Resetar senha
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleToggleActive(user)}>
                        {user.isActive ? t.inactive : t.active}
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item
                        className="text-danger"
                        onClick={() => setDeletingUser(user)}
                      >
                        <Trash className="me-2" aria-hidden />
                        Excluir
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>

                <ul
                  className="list-unstyled small mb-0 d-grid gap-1"
                  style={{ color: "var(--bs-secondary)" }}
                >
                  <li className="d-flex align-items-center gap-2">
                    <Envelope aria-hidden />
                    <span>{user.profile?.email || "—"}</span>
                  </li>
                  <li className="d-flex align-items-center gap-2">
                    <Telephone aria-hidden />
                    <span>{user.profile?.phone || "—"}</span>
                  </li>
                  <li className="d-flex align-items-center gap-2">
                    <CardText aria-hidden />
                    <span>{user.profile?.document || "—"}</span>
                  </li>
                  <li className="d-flex align-items-center gap-2">
                    <CalendarDate aria-hidden />
                    <span>{formatDate(user.profile?.birthDate)}</span>
                  </li>
                </ul>

                <div className="mt-auto pt-2 d-flex align-items-center justify-content-between">
                  <span
                    className={`badge ${
                      user.isActive ? "text-bg-success" : "text-bg-secondary"
                    }`}
                  >
                    {user.isActive ? t.active : t.inactive}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil className="me-1" aria-hidden />
                    {t.editUser}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Formulário (Criar / Editar) */}
      <FormModal
        show={showForm}
        onHide={handleCloseForm}
        title={editing?.id ? t.editUser : t.newUser}
        footer={
          <>
            <Button variant="outline-secondary" onClick={handleCloseForm}>
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
            <Form.Label className="small fw-semibold">
              {t.form.username}
            </Form.Label>
            <Form.Control
              value={form.userName}
              onChange={(e) => setFormField({ userName: e.target.value })}
              placeholder="Nome de usuário"
              disabled={!!editing?.id}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">
              {t.form.fullName}
            </Form.Label>
            <Form.Control
              value={form.fullName}
              onChange={(e) => setFormField({ fullName: e.target.value })}
              placeholder="Nome completo"
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">
              {t.form.document}
            </Form.Label>
            <Form.Control
              value={form.document}
              onChange={(e) => setFormField({ document: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">
              {t.form.email}
            </Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={(e) => setFormField({ email: e.target.value })}
              placeholder="nome@empresa.com"
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">
              {t.form.phone}
            </Form.Label>
            <Form.Control
              value={form.phone}
              onChange={(e) => setFormField({ phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="col-12 col-md-6">
            <Form.Label className="small fw-semibold">
              {t.form.birthDate}
            </Form.Label>
            <Form.Control
              type="date"
              value={form.birthDate}
              onChange={(e) => setFormField({ birthDate: e.target.value })}
            />
          </div>
          <div className="col-12 col-md-8">
            <Form.Label className="small fw-semibold">
              {t.form.roles}
            </Form.Label>
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
                    setFormField({
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
              onChange={(e) => setFormField({ isAdmin: e.target.checked })}
            />
          </div>
        </div>
      </FormModal>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        show={!!deletingUser}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário ${deletingUser?.profile?.fullName || deletingUser?.userName || ""}?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUser(null)}
      />

      {/* Modal de Confirmação de Reset de Senha */}
      <ConfirmationModal
        show={!!resettingUser}
        title="Resetar Senha"
        message={`Tem certeza que deseja resetar a senha de ${resettingUser?.profile?.fullName || resettingUser?.userName || ""}?`}
        confirmText="Resetar Senha"
        cancelText="Cancelar"
        confirmVariant="warning"
        onConfirm={handleConfirmResetPassword}
        onCancel={() => setResettingUser(null)}
      />
    </>
  );
}
