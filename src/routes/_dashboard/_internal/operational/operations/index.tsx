import { createFileRoute } from "@tanstack/react-router";

import { OperationsList } from "@/components/operations/operations-list";
import { PageLayout } from "@/layouts/PageLayout";

export const Route = createFileRoute("/_dashboard/_internal/operational/operations/")({
  head: () => ({ meta: [{ title: "Operações — ASC" }] }),
  component: OperationalOperationsPage,
});

/**
 * Reuso read-only da lista real de Operações (SPEC-07-01) — sem criar/editar
 * (RF1/RF2 da SPEC-08). Não duplica `operations-list.tsx`, só parametriza.
 */
function OperationalOperationsPage() {
  return (
    <PageLayout density="wide">
      <OperationsList readOnly />
    </PageLayout>
  );
}
