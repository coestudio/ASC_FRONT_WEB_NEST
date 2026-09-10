// STUB — conteúdo real do detalhe de Política ainda não migrado do site anterior.
import { Route } from "@/routes/_site/politicas/$slug";

export function PoliticaDetailPage() {
  const politica = Route.useLoaderData();

  return (
    <div className="container py-5">
      <h1>{politica.nome}</h1>
      <p className="text-muted">{politica.conteudo ?? "Conteúdo ainda não migrado."}</p>
    </div>
  );
}
