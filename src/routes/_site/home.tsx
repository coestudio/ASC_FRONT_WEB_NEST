import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/home")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
