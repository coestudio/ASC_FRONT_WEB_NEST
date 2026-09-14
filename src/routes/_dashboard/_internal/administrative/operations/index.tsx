import { createFileRoute } from "@tanstack/react-router";

import { OperationsList } from "@/components/operations/operations-list";
import { PageLayout } from "@/layouts/PageLayout";

export const Route = createFileRoute("/_dashboard/_internal/administrative/operations/")({
  head: () => ({ meta: [{ title: "Operações — ASC" }] }),
  component: OperationsPage,
});

/** Modo completo (criar/editar) — a SPEC-08 (`operacional`) reusa `<OperationsList readOnly />` sem editar este arquivo (RF2/CA3 da SPEC-07-01). */
function OperationsPage() {
  return (
    <PageLayout density="wide">
      <OperationsList />
    </PageLayout>
  );
}
