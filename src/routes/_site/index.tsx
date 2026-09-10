import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
