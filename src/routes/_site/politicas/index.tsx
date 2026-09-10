import { createFileRoute } from "@tanstack/react-router";

import { PoliticasPage } from "@/components/pages/politicas/PoliticasPage";

export const Route = createFileRoute("/_site/politicas/")({
  head: () => ({
    meta: [{ title: "Políticas | Alex Stewart Agriculture" }],
  }),
  component: PoliticasPage,
});
