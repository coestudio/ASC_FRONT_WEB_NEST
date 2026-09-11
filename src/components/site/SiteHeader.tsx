// STUB — header real do site ainda não migrado. Os links abaixo apontavam
// pra rotas (/servicos, /politicas, /galerias, /duvidas, /contato) que não
// existem em src/routes/_site/** — achado ao regenerar routeTree.gen.ts
// durante a SPEC-03 (admin-access), que nunca tinha sido refeito desde que
// esses arquivos de rota foram removidos (commit b4a5206). Trocado
// `Link to=` por `<span>` pra não quebrar `bun run check`/navegação com rota
// inexistente — migração real do site público é fora do escopo da SPEC-03.
import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-bottom bg-white py-3">
      <div className="container d-flex align-items-center justify-content-between">
        <Link to="/" className="fw-bold text-decoration-none">
          Alex Stewart Agriculture
        </Link>
        <nav className="d-flex gap-3">
          <span className="text-body-secondary">Serviços</span>
          <span className="text-body-secondary">Políticas</span>
          <span className="text-body-secondary">Galerias</span>
          <span className="text-body-secondary">Dúvidas</span>
          <span className="text-body-secondary">Contato</span>
        </nav>
      </div>
    </header>
  );
}
