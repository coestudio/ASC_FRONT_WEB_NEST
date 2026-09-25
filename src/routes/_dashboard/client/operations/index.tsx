import { createFileRoute } from "@tanstack/react-router";

import { OperationsList } from "@/components/operations/operations-list";
import { PageLayout } from "@/layouts/PageLayout";

export const Route = createFileRoute("/_dashboard/client/operations/")({
  head: () => ({ meta: [{ title: "Operações — ASC" }] }),
  component: ClientOperationsPage,
});

/**
 * Operações da área do cliente (SPEC-103, ASCS-73) — mesma rota
 * `GET /api/operation` do administrativo; o Core filtra pelo cliente do
 * token do colaborador (Core SPEC-58). Só leitura, sem filtro de cliente.
 */
function ClientOperationsPage() {
  return (
    <PageLayout density="wide">
      <OperationsList clientArea />
    </PageLayout>
  );
}
