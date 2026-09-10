import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout de páginas de sistema (/_system): NotFound, erros, manutenção, etc.
// Pathless — não adiciona segmento na URL.
export const Route = createFileRoute("/_system")({
  component: SystemLayout,
});

function SystemLayout() {
  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-body px-4">
      <Outlet />
    </div>
  );
}
