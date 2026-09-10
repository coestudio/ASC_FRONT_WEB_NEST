import { createFileRoute, notFound } from "@tanstack/react-router";

import { servicos } from "@/data/servicos";
import { ServicoDetailPage } from "@/components/pages/servicos/ServicoDetailPage";

export const Route = createFileRoute("/_site/servicos/$slug")({
  loader: ({ params }) => {
    const servico = servicos.find((s) => s.slug === params.slug);
    if (!servico) throw notFound();
    return servico;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.nome ?? "Não encontrado"} | Alex Stewart Agriculture` }],
  }),
  component: ServicoDetailPage,
});
