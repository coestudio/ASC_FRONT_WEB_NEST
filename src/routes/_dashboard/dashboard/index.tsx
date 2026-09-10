import { createFileRoute } from "@tanstack/react-router";

// Home da área autenticada. Envolvida pelo layout pathless /_dashboard.
export const Route = createFileRoute("/_dashboard/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — ASC" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <div className="mx-auto p-4" style={{ maxWidth: "56rem" }}>
      <h1 className="fs-5 fw-semibold text-body">Dashboard</h1>
      <p className="mt-2 small text-body-secondary">
        Bem-vindo ao portal interno.
      </p>
    </div>
  );
}
