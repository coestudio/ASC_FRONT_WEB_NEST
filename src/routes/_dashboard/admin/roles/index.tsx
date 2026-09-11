import { createFileRoute } from "@tanstack/react-router";

import { ADMIN_ROLES } from "@/data/admin-roles";
import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";

// Página estática de referência de perfis (SPEC-03, decisão D1: sem chamada
// ao Core, conteúdo mantido à mão). ADMIN_ROLES está vazio até o texto real
// (portado do legado ou fornecido) ser confirmado — ver src/data/admin-roles.ts.
export const Route = createFileRoute("/_dashboard/admin/roles/")({
  head: () => ({ meta: [{ title: "Perfis — ASC" }] }),
  component: AdminRolesPage,
});

function AdminRolesPage() {
  const t = useT();

  return (
    <PageLayout title={t("access.rolesTitle")} description={t("access.rolesDescription")}>
      {ADMIN_ROLES.length === 0 ? (
        <div className="alert alert-secondary">{t("access.rolesEmpty")}</div>
      ) : (
        <div className="row g-3">
          {ADMIN_ROLES.map((role) => (
            <div className="col-12 col-md-6 col-lg-4" key={role.role}>
              <div className="border rounded-3 p-3 h-100">
                <h2 className="h6 mb-1">{role.name}</h2>
                <p className="small text-body-secondary mb-0">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
