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
import ptBRAdministrativeRegistry from "./dictionaries/pt-BR/administrative-registry.json";
import ptBRAuth from "./dictionaries/pt-BR/auth.json";
import ptBRCommon from "./dictionaries/pt-BR/common.json";
import ptBRCrud from "./dictionaries/pt-BR/crud.json";
import ptBRHome from "./dictionaries/pt-BR/home.json";
import ptBRNavigation from "./dictionaries/pt-BR/navigation.json";

import type { Locale } from "./config";

const ptBR = {
  ...ptBRCommon,
  navigation: ptBRNavigation,
  home: ptBRHome,
  auth: ptBRAuth,
  access: ptBRAccess,
  crud: ptBRCrud,
  // Chave com hífen (mesmo nome do arquivo, `administrative-registry.json`,
  // SPEC-04 §10) — `buildLocale` abaixo deriva o namespace do nome do
  // arquivo verbatim, então o nome da chave aqui precisa bater com o nome
  // do arquivo pros locales en/es/zh (senão o lookup diverge por locale).
  "administrative-registry": ptBRAdministrativeRegistry,
  // Namespace da SPEC-05 (Clientes) — mesmo racional da chave acima.
  "administrative-clients": ptBRAdministrativeClients,
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
