import { createFileRoute, notFound } from "@tanstack/react-router";

import { politicas } from "@/data/politicas";
import { PoliticaDetailPage } from "@/components/pages/politicas/PoliticaDetailPage";

export const Route = createFileRoute("/_site/politicas/$slug")({
  loader: ({ params }) => {
    const politica = politicas.find((p) => p.slug === params.slug);
    if (!politica) throw notFound();
    return politica;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.nome ?? "Não encontrado"} | Alex Stewart Agriculture` }],
  }),
  component: PoliticaDetailPage,
});
