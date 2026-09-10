import { createFileRoute } from "@tanstack/react-router";

import { GaleriasPage } from "@/components/pages/galerias/GaleriasPage";

export const Route = createFileRoute("/_site/galerias")({
  head: () => ({
    meta: [
      { title: "Galerias | Alex Stewart Agriculture" },
      { name: "description", content: "Imagens das operações de inspeção, amostragem e análise laboratorial da Alex Stewart Agriculture em portos brasileiros." },
      { property: "og:title", content: "Galerias | Alex Stewart Agriculture" },
      { property: "og:description", content: "Imagens das operações de inspeção, amostragem e análise laboratorial da Alex Stewart Agriculture em portos brasileiros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GaleriasPage,
});
