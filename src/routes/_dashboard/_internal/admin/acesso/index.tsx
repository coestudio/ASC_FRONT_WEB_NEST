import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";


import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

const AdminAcessosPage: React.FC = () => {
  /*
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PlaceholderPage
      title={dict.nav.adminAccessProfiles}
      description={dict.shell.underConstructionDescription}
    />
  );
  */
 return (<PlaceholderPage
      title="Admin Access Profiles"
      description="This page is under construction."
    />)
};

export const Route = createFileRoute("/_dashboard/_internal/admin/acesso/")({
  head: () => ({
    meta: [
      { title: "Alex Stewart Agriculture | Inspeção e Análise de Grãos" },
      {
        name: "description",
        content: "Admin access page for Alex Stewart Agriculture"
      }
    ]
  }),
  component: AdminAcessosPage,
});


