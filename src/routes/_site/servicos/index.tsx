import { createFileRoute } from "@tanstack/react-router";

import { ServicosPage } from "@/components/pages/servicos/ServicosPage";

export const Route = createFileRoute("/_site/servicos/")({
  head: () => ({
    meta: [{ title: "Serviços | Alex Stewart Agriculture" }],
  }),
  component: ServicosPage,
});
