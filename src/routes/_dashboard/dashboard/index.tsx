import { createFileRoute } from "@tanstack/react-router";

import { PageLayout } from "@/layouts/PageLayout";

// Home da área autenticada. Envolvida pelo layout pathless /_dashboard.
export const Route = createFileRoute("/_dashboard/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — ASC" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <PageLayout density="compact" title="Dashboard" description="Bem-vindo ao portal interno." />
  );
}
