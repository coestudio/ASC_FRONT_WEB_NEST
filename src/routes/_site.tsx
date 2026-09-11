import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  // i18n/tema vêm do <UiPrefsProvider> montado no __root.
  return (
    <div className="min-vh-100 bg-body">
      <SiteHeader />
      <main style={{ paddingTop: "6.5rem" }}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
