import { createFileRoute } from "@tanstack/react-router";

import { DuvidasPage } from "@/components/pages/duvidas/DuvidasPage";

export const Route = createFileRoute("/_site/duvidas")({
  head: () => ({
    meta: [
      { title: "Dúvidas Frequentes | Alex Stewart Agriculture" },
      { name: "description", content: "Respostas sobre supervisão de embarque, amostragem, prazos de certificados e acreditações GAFTA, FOSFA e ISO." },
      { property: "og:title", content: "Dúvidas Frequentes | Alex Stewart Agriculture" },
      { property: "og:description", content: "Respostas sobre supervisão de embarque, amostragem, prazos de certificados e acreditações GAFTA, FOSFA e ISO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DuvidasPage,
});
