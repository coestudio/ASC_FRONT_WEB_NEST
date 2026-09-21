import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { CollaboratorsCrud } from "@/components/collaborators/collaborators-crud";

export const Route = createFileRoute("/_dashboard/client/collaborators/")({
  head: () => ({ meta: [{ title: "Colaboradores — ASC" }] }),
  component: CollaboratorsPage,
});

// `clientId` vem do `beforeLoad` de `/_dashboard/client` (D1, SPEC-09) —
// route context é cumulativo, então o hook da própria rota já enxerga o
// valor colocado pelo pai.
const clientRouteApi = getRouteApi("/_dashboard/client");

function CollaboratorsPage() {
  const { clientId } = clientRouteApi.useRouteContext();
  return <CollaboratorsCrud clientId={clientId ?? undefined} />;
}
