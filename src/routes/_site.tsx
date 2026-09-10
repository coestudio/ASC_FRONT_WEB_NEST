import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import WhatsAppButton from "@/components/WhatsAppButton";
import { LanguageProvider } from "@/i18n";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <WhatsAppButton />
        <SiteHeader />
        <main className="pt-26">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </LanguageProvider>
  );
}
