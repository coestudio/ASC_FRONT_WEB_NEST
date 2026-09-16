// pt-BR é a fonte de verdade do shape das traduções — importado de forma
// estática, namespace por namespace, para manter a tipagem literal forte de
// `Dictionary` (SPEC-00, decisão D2). Os demais locales são montados via
// `import.meta.glob` e precisam ter exatamente as mesmas chaves: faltar um
// arquivo/chave estoura erro de tipo em `bun run check`.
//
// `common.json` (metadata + theme + shell, SPEC-00 D1) é o único namespace
// cujo conteúdo vira chaves de topo do dicionário em vez de ficar aninhado
// sob `common.*` — isso preserva os caminhos que já existiam antes da
// migração (ex.: `t("theme.light")`), sem quebrar nenhum call-site (RF1/CA8).
import ptBRAccess from "./dictionaries/pt-BR/access.json";
import ptBRAdministrativeClients from "./dictionaries/pt-BR/administrative-clients.json";
import ptBRAdministrativeHome from "./dictionaries/pt-BR/administrative-home.json";
import ptBRAdministrativeOperations from "./dictionaries/pt-BR/administrative-operations.json";
import ptBRAdministrativeRegistry from "./dictionaries/pt-BR/administrative-registry.json";
import ptBRAuth from "./dictionaries/pt-BR/auth.json";
import ptBRClient from "./dictionaries/pt-BR/client.json";
import ptBRCommon from "./dictionaries/pt-BR/common.json";
import ptBRCrud from "./dictionaries/pt-BR/crud.json";
import ptBRDebug from "./dictionaries/pt-BR/debug.json";
import ptBRFilePreview from "./dictionaries/pt-BR/filePreview.json";
import ptBRHome from "./dictionaries/pt-BR/home.json";
import ptBRNavigation from "./dictionaries/pt-BR/navigation.json";
import ptBROperational from "./dictionaries/pt-BR/operational.json";

import type { Locale } from "./config";

const ptBR = {
  ...ptBRCommon,
  navigation: ptBRNavigation,
  home: ptBRHome,
  auth: ptBRAuth,
  access: ptBRAccess,
  crud: ptBRCrud,
  // Namespace do `FilePreviewModal` (SPEC-20) — componente genérico
  // compartilhado (`src/components/ui/file-preview-modal.tsx`), não
  // aninhado em `common.json` nem em `administrative-operations` porque
  // não é específico de uma tela.
  filePreview: ptBRFilePreview,
  // Chave com hífen (mesmo nome do arquivo, `administrative-registry.json`,
  // SPEC-04 §10) — `buildLocale` abaixo deriva o namespace do nome do
  // arquivo verbatim, então o nome da chave aqui precisa bater com o nome
  // do arquivo pros locales en/es/zh (senão o lookup diverge por locale).
  "administrative-registry": ptBRAdministrativeRegistry,
  // Namespace da SPEC-05 (Clientes) — mesmo racional da chave acima.
  "administrative-clients": ptBRAdministrativeClients,
  // Namespace da SPEC-17 (Home de Administrativo, quick actions) — próprio,
  // não reaproveita `administrative-clients`/`-operations`/`-registry` pra
  // não acoplar a Home ao ciclo de vida de cada namespace de tela.
  "administrative-home": ptBRAdministrativeHome,
  // Namespace da árvore SPEC-07 (Operações) — único, compartilhado entre a
  // lista (SPEC-07-01) e todas as abas do shell de detalhe (SPEC-07-02 a
  // 07-09, ver `specs/07-operacoes/spec.md` §5). Criado pela SPEC-07-01,
  // editado (chaves adicionadas, ex. `shell.*`) pelas sub-SPECs seguintes,
  // nunca recriado.
  "administrative-operations": ptBRAdministrativeOperations,
  // Namespace da SPEC-09 (Área do cliente) — conteúdo das telas Home/
  // Colaboradores/Relatório Final/Acompanhamento; não duplica `navigation.client*`.
  client: ptBRClient,
  // Namespace da SPEC-08 (Operacional) — Home + detalhe mock; não duplica
  // `navigation.operacional*`.
  operational: ptBROperational,
  // Namespace da SPEC-48 (página de debug do catálogo de erros) — rota
  // isolada em /admin/debug, sem entrada na sidebar.
  debug: ptBRDebug,
};

export type Dictionary = typeof ptBR;

// eager: resolvido em build pelo Vite (compatível com SSR Nitro/azure-swa) —
// cobre só os locales que não são pt-BR, já importado estático acima.
const namespaceFiles = import.meta.glob(
  ["./dictionaries/en/*.json", "./dictionaries/es/*.json", "./dictionaries/zh/*.json"],
  { eager: true },
) as Record<string, { default: Record<string, unknown> }>;

/** Monta o dicionário de um locale a partir dos arquivos de namespace carregados por glob. */
function buildLocale(locale: string): Dictionary {
  const out: Record<string, unknown> = {};
  for (const [path, mod] of Object.entries(namespaceFiles)) {
    const match = path.match(/\.\/dictionaries\/([^/]+)\/([^/]+)\.json$/);
    if (!match || match[1] !== locale) continue;
    const namespace = match[2];
    if (namespace === "common") {
      // common.json vira chaves de topo (metadata/theme/shell), não `dict.common`.
      Object.assign(out, mod.default);
    } else {
      out[namespace] = mod.default;
    }
  }
  return out as Dictionary;
}

export const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  en: buildLocale("en"),
  zh: buildLocale("zh"),
  es: buildLocale("es"),
};
