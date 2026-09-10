// STUB — conteúdo real da listagem de Políticas ainda não migrado do site anterior.
import { politicas } from "@/data/politicas";

export function PoliticasPage() {
  return (
    <div className="container py-5">
      <h1>Políticas</h1>
      {politicas.length === 0 ? (
        <p className="text-muted">
          Página em construção — dados de políticas ainda não migrados (src/data/politicas.ts).
        </p>
      ) : (
        <ul>
          {politicas.map((p) => (
            <li key={p.slug}>{p.nome}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
