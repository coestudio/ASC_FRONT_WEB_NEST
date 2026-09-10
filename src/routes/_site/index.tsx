import { createFileRoute } from "@tanstack/react-router";

const HomePage = () => {
  return <div>Home Page Content</div>;
};

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Alex Stewart Agriculture | Inspeção e Análise de Grãos" },
      {
        name: "description",
        content:
          "Supervisão de embarques, amostragem e análises laboratoriais de produtos agrícolas no Brasil. Mais de 50 anos de experiência e serviços regulados pela GAFTA.",
      },
      { property: "og:title", content: "Alex Stewart Agriculture | Inspeção e Análise de Grãos" },
      {
        property: "og:description",
        content:
          "Certificação de peso e qualidade de commodities agrícolas com imparcialidade, agilidade e alcance global.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});


