// STUB — header real do site ainda não migrado.
import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-bottom bg-white py-3">
      <div className="container d-flex align-items-center justify-content-between">
        <Link to="/" className="fw-bold text-decoration-none">
          Alex Stewart Agriculture
        </Link>
        <nav className="d-flex gap-3">
          <Link to="/servicos">Serviços</Link>
          <Link to="/politicas">Políticas</Link>
          <Link to="/galerias">Galerias</Link>
          <Link to="/duvidas">Dúvidas</Link>
          <Link to="/contato">Contato</Link>
        </nav>
      </div>
    </header>
  );
}
