import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { logoutFn } from "@/lib/auth-fns";

export const Route = createFileRoute("/auth/logout/")({
  head: () => ({ meta: [{ title: "Saindo — ASC" }] }),
  component: LogoutPage,
});

function LogoutPage() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void logoutFn().finally(() => {
      queryClient.clear();
      // Hard reload: garante que nada do cache autenticado sobra e re-roda o
      // SSR do __root (que agora vê `authed: false`).
      window.location.href = "/auth/login";
    });
  }, [queryClient]);

  return <p className="small text-body-secondary">Encerrando sua sessão...</p>;
}
