import { createFileRoute, redirect } from "@tanstack/react-router";

import { InternalRole } from "@/api/generated/model";
import { AccessCrud } from "@/components/access/access-crud";
import { LoadingState } from "@/components/ui/loading-state";
import { useMounted } from "@/hooks/useMounted";
import { PageLayout } from "@/layouts/PageLayout";
import { profileMeQueryOptions } from "@/lib/queries/profile";

// Laboratório > Acessos (SPEC-102) — mesmo CRUD do Admin > Acesso, restrito aos
// papéis da área. O Core exige `isAdmin` em todo `/user` (`[RequireAdmin]`),
// então não-admin volta pra home da área em vez de ver uma tela que só
// devolveria 403. O guard pai (`laboratory/route.tsx`) já semeou o
// `profile/me` no cache.
export const Route = createFileRoute("/_dashboard/_internal/laboratory/access/")({
  head: () => ({ meta: [{ title: "Acessos do Laboratório — ASC" }] }),
  beforeLoad: ({ context }) => {
    const user = context.queryClient.getQueryData(profileMeQueryOptions().queryKey);
    if (!user?.isAdmin) throw redirect({ to: "/laboratory" });
  },
  component: LaboratoryAccessPage,
});

const SCOPE_ROLES = [InternalRole.Laboratory];

function LaboratoryAccessPage() {
  const mounted = useMounted();

  // Gate de montagem (SPEC-10): `AccessCrud` usa `useSsrSafeQuery` fora do
  // `CrudListPage`, então só monta no client.
  if (!mounted) {
    return (
      <PageLayout density="wide">
        <LoadingState variant="inline" />
      </PageLayout>
    );
  }

  return (
    <AccessCrud
      titleKey="access.laboratory.title"
      descriptionKey="access.laboratory.description"
      scopeRoles={SCOPE_ROLES}
    />
  );
}
