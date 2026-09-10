import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_system/not-found")({
  head: () => ({ meta: [{ title: "Página não encontrada — ASC" }] }),
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="text-center" style={{ maxWidth: "28rem" }}>
      <h1 className="display-1 fw-bold text-body">404</h1>
      <h2 className="mt-4 fs-5 fw-semibold text-body">Página não encontrada</h2>
      <p className="mt-2 small text-body-secondary">
        A página que você procura não existe ou foi movida.
      </p>
      <div className="mt-5">
        <Link to="/" className="btn btn-primary btn-sm">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
