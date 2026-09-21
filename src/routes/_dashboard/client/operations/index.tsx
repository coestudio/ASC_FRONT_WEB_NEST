import { createFileRoute } from "@tanstack/react-router";

import { OperationsList } from "@/components/operations/operations-list";
import { PageLayout } from "@/layouts/PageLayout";

export const Route = createFileRoute("/_dashboard/client/operations/")({
  head: () => ({ meta: [{ title: "Operações — ASC" }] }),
  component: ClientOperationsPage,
});

/** Lista real de Operações da área do cliente — só leitura (sem criar/editar). */
function ClientOperationsPage() {
  return (
    <PageLayout density="wide">
      <OperationsList readOnly />
    </PageLayout>
  );
}
