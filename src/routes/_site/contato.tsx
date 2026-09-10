import { createFileRoute } from "@tanstack/react-router";

import { ContatoPage } from "@/components/pages/contato/ContatoPage";

export const Route = createFileRoute("/_site/contato")({
  head: () => ({
    meta: [
      { title: "Contato | Alex Stewart Agriculture" },
      { name: "description", content: "Fale com a Alex Stewart Agriculture em Santos: solicite inspeção, amostragem e certificação de peso e qualidade de commodities agrícolas." },
      { property: "og:title", content: "Contato | Alex Stewart Agriculture" },
      { property: "og:description", content: "Fale com a Alex Stewart Agriculture em Santos: solicite inspeção, amostragem e certificação de peso e qualidade de commodities agrícolas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContatoPage,
});
