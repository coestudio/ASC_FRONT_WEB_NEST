import { createFileRoute } from "@tanstack/react-router";

import { AccessCrud } from "@/components/access/access-crud";
import { LoadingState } from "@/components/ui/loading-state";
import { useMounted } from "@/hooks/useMounted";
import { userListQueryOptions, userRolesQueryOptions } from "@/lib/queries/user";
import { fetchUserListFn, fetchUserRolesFn } from "@/lib/user-fns";
import { useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const Route = createFileRoute("/_dashboard/admin/access/")({
  head: () => ({ meta: [{ title: "Acesso — ASC" }] }),
  // Semeia o cache do React Query pra primeira página (sem busca) + roles.
  // No SSR busca server→Core com o cookie (fetchUserListFn/fetchUserRolesFn,
  // ver src/lib/user-fns.ts); o client re-hidrata sem refetch. Mesmo padrão
  // do profileMeQueryOptions/fetchMeFn no __root — os hooks gerados
  // (mutator.ts) recusam chamada autenticada no SSR.
  loader: async ({ context }) => {
    const firstPageParams = { Offset: 0, Limit: PAGE_SIZE };
    const [users, roles] = await Promise.all([
      fetchUserListFn({ data: firstPageParams }),
      fetchUserRolesFn(),
    ]);
    if (users) {
      context.queryClient.setQueryData(userListQueryOptions(firstPageParams).queryKey, users);
    }
    if (roles) {
      context.queryClient.setQueryData(userRolesQueryOptions().queryKey, roles);
    }
  },
  component: AdminAccessPage,
});

/**
 * Gate de montagem: `AccessCrud` chama `useSsrSafeQuery` pro
 * lookup de roles do form — pra esse hook nunca existir durante o SSR (não
 * só ficar `enabled: false`, que a integração de streaming SSR do
 * TanStack Query pode ignorar), o conteúdo real só monta depois que o
 * componente já confirma que está rodando no client (SPEC-10, mesmo padrão
 * do `CrudListPage`).
 */
function AdminAccessPage() {
  const t = useT();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div>
        <h1 className="h4 mb-3">{t("access.title")}</h1>
        <LoadingState variant="inline" />
      </div>
    );
  }

  return <AccessCrud titleKey="access.title" descriptionKey="access.description" />;
}
