// STUB — conteúdo real da listagem de Serviços ainda não migrado do site anterior.
import { servicos } from "@/data/servicos";

export function ServicosPage() {
  return (
    <div className="container py-5">
      <h1>Serviços</h1>
      {servicos.length === 0 ? (
        <p className="text-muted">
          Página em construção — dados de serviços ainda não migrados (src/data/servicos.ts).
        </p>
      ) : (
        <ul>
          {servicos.map((s) => (
            <li key={s.slug}>{s.nome}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
