import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

import { LanguageProvider } from "@/i18n";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  return (
    <LanguageProvider>
      <div className="min-vh-100 bg-body">
        <SiteHeader />
        <main style={{ paddingTop: "6.5rem" }}>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </LanguageProvider>
  );
}
