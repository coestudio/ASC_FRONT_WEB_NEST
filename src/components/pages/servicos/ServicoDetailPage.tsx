// STUB — conteúdo real do detalhe de Serviço ainda não migrado do site anterior.
import { Route } from "@/routes/_site/servicos/$slug";

export function ServicoDetailPage() {
  const servico = Route.useLoaderData();

  return (
    <div className="container py-5">
      <h1>{servico.nome}</h1>
      <p className="text-muted">{servico.conteudo ?? "Conteúdo ainda não migrado."}</p>
    </div>
  );
}
