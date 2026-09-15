import { createFileRoute, redirect } from "@tanstack/react-router";

// /admin redireciona para /admin/access (primeira sub-tela da área).
export const Route = createFileRoute("/_dashboard/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/access" });
  },
});
