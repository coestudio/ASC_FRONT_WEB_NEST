import { createFileRoute } from "@tanstack/react-router";

import { PageLayout } from "@/layouts/PageLayout";

export const Route = createFileRoute("/_dashboard/_internal/laboratory/")({
  head: () => ({ meta: [{ title: "Laboratório — ASC" }] }),
  component: LaboratoryPage,
});

function LaboratoryPage() {
  return (
    <PageLayout density="compact">
      <div className="border rounded-3 bg-body-tertiary p-4">
        <h1 className="fs-5 fw-semibold text-body">Página em construção</h1>
        <p className="mt-2 small text-body-secondary">
          Em breve você poderá acessar a página de laboratório.
        </p>
        <i className="bi bi-building d-block mt-4 fs-4 text-body-secondary" />
      </div>
    </PageLayout>
  );
}
