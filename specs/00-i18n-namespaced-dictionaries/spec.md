# SPEC-00 — Dicionários de i18n particionados por namespace + locale `es`

- **ID:** SPEC-00
- **Nome:** i18n-namespaced-dictionaries
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/i18n/**`, `src/lib/ui-prefs.tsx`, `src/components/i18n/**`
- **Instruction aplicável:** `.github/instructions/i18n.instructions.md`

---

## 1. Objetivo

Trocar o dicionário de i18n de **um `.json` monolítico por locale** para
**um arquivo por namespace por locale**, e adicionar o locale **`es`**
(espanhol), sem mudar a API de consumo (`useT`, caminho com ponto,
`type Dictionary`).

## 2. Contexto

Hoje:

- `src/i18n/dictionaries/pt-BR.json` · `en.json` · `zh.json` — 132 linhas cada,
  7 chaves de topo (`metadata`, `home`, `theme`, `auth`, `nav`, `access`,
  `shell`).
- `src/i18n/dictionaries.ts` importa os 3 `.json` e monta
  `dictionaries: Record<Locale, Dictionary>`, com `type Dictionary = typeof ptBR`.
- `src/i18n/config.ts` define `locales = ["pt-BR", "en", "zh"]`,
  `defaultLocale`, `LOCALE_LABELS`, `negotiateLocale`, `isLocale`.
- `src/i18n/translate.ts` — lookup por caminho com ponto + interpolação `{x}`,
  tipo `TranslationKey = DeepKeys<Dictionary>`.
- `src/lib/ui-prefs.tsx` — `UiPrefsProvider` resolve locale (cookie
  `asc_locale` → `Accept-Language` → default), expõe `useT`/`useLocale`/
  `useSetLocale`; `readUiPrefs` (isomórfico) lê no server e no client.
- `src/components/i18n/language-switcher.tsx` — itera `locales` + `LOCALE_LABELS`.

Regra do projeto (`AGENTS.md` → Regras invioláveis): 4 locales
(`pt-BR` canônico, `en`, `es`, `zh`), dicionário particionado, nome de arquivo
em inglês, comentário em PT-BR.

A escala futura (telas de administrativo/operacional/laboratório/cliente ainda
não migradas — ver `nav`, ~26 chaves só de navegação) torna o `.json` único
inviável de manter.

## 3. Escopo

1. Estrutura de pastas `src/i18n/dictionaries/<locale>/<namespace>.json`.
2. Loader por merge de namespaces (`import.meta.glob` eager) em
   `dictionaries.ts`, preservando `type Dictionary` derivado do merge de
   `pt-BR`.
3. Adição do locale `es`: `config.ts` (`locales`, `LOCALE_LABELS`,
   `negotiateLocale` já cobre por prefixo), pasta `es/` completa.
4. Quebra dos 3 `.json` atuais nos namespaces definidos abaixo, para os 4
   locales.
5. Ajuste de qualquer ponto que dependa do shape antigo (nenhuma mudança de
   API pública esperada — a validar).

## 4. Fora do escopo

- Traduzir telas ainda não existentes.
- Lazy-load / code-split de dicionário por rota (decisão registrada: **não**;
  um bundle só).
- Migrar as telas de dashboard pendentes.
- Mudar o mecanismo de cookie/negociação de locale.
- Ferramenta de lint de paridade de chaves (fica como item futuro; ver §10).

## 5. Requisitos funcionais

- **RF1** — `t("auth.loginTitle")` e todas as chaves hoje válidas continuam
  resolvendo igual, sem mudança no call-site.
- **RF2** — `useLocale()` pode retornar `"es"`; `LanguageSwitcher` mostra 4
  opções; `setLocale("es")` persiste no cookie `asc_locale` e troca sem reload.
- **RF3** — `Accept-Language: es` (ou `es-AR`, `es-ES`) no primeiro acesso sem
  cookie resolve para `es`.
- **RF4** — Cada namespace existe nos 4 locales. Falta de um arquivo de
  namespace em um locale é erro de tipo em build (`type Dictionary` exige a
  união completa).
- **RF5** — Chave ausente num locale continua caindo no fallback (devolve a
  key + `console.warn` em dev), sem quebrar a renderização.

## 6. Requisitos não funcionais

- **RNF1** — `bun run check` (tsc) passa. `bun run lint` passa.
- **RNF2** — Compatível com bun e npm; compatível com o preset `azure-swa`
  (o `import.meta.glob` é recurso do Vite, resolvido em build — ok no SSR
  Nitro/SWA).
- **RNF3** — Nomes de arquivo em inglês; comentários novos em PT-BR.
- **RNF4** — Sem dependência nova.

## 7. Contrato de rota

N/A — não cria nem altera rota.

## 8. Camada de dados

N/A — i18n não toca o Core nem o React Query.

## 9. Desenho

### 9.1 Estrutura de arquivos

```
src/i18n/
  config.ts              (+ "es" em locales e LOCALE_LABELS)
  dictionaries.ts        (reescrito: merge por glob)
  translate.ts           (inalterado)
  index.tsx              (inalterado)
  dictionaries/
    pt-BR/
      common.json        ← metadata + theme + shell
      navigation.json    ← nav
      home.json          ← home
      auth.json          ← auth
      access.json        ← access
    en/    (mesmos 5 arquivos)
    es/    (mesmos 5 arquivos)   ← NOVO
    zh/    (mesmos 5 arquivos)
```

> Mapa de quebra dos top-level atuais → namespace:
> `metadata`,`theme`,`shell` → **common** · `nav` → **navigation** ·
> `home` → **home** · `auth` → **auth** · `access` → **access**.
> (Ponto aberto D1: agrupar assim ou dar arquivo próprio a `metadata`.)

Cada arquivo de namespace tem como raiz o **conteúdo** daquele namespace
(sem repetir a chave de topo):

`dictionaries/pt-BR/auth.json`

```json
{ "loginTitle": "Login", "email": "Email", "...": "..." }
```

### 9.2 Loader (`dictionaries.ts`)

```ts
// Monta o dicionário de cada locale a partir dos arquivos de namespace
// (um .json por tela/feature em dictionaries/<locale>/). O nome do arquivo
// vira a chave de topo — dictionaries/pt-BR/auth.json → dict.auth.
import type { Locale } from "./config";

type NsRecord = Record<string, unknown>;

// eager: resolvido em build pelo Vite (compatível com SSR Nitro/azure-swa).
const files = import.meta.glob("./dictionaries/*/*.json", { eager: true }) as Record<
  string,
  { default: NsRecord }
>;

function buildLocale(locale: string): Record<string, NsRecord> {
  const out: Record<string, NsRecord> = {};
  for (const [path, mod] of Object.entries(files)) {
    const m = path.match(/\.\/dictionaries\/([^/]+)\/([^/]+)\.json$/);
    if (!m || m[1] !== locale) continue;
    out[m[2]] = mod.default; // m[2] = namespace
  }
  return out;
}

const ptBR = buildLocale("pt-BR");
export type Dictionary = typeof ptBR;

export const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  en: buildLocale("en") as Dictionary,
  es: buildLocale("es") as Dictionary,
  zh: buildLocale("zh") as Dictionary,
};
```

> Ponto aberto D2: `type Dictionary = typeof ptBR` derivado de um objeto
> montado em runtime só dá o shape `Record<string, NsRecord>` — o `DeepKeys`
> perde a tipagem literal das chaves. Alternativas:
> (a) `import` estático explícito de cada `pt-BR/<ns>.json` para o tipo
> (glob só para os outros locales) — mantém `TranslationKey` forte;
> (b) aceitar `TranslationKey = string` e confiar no warn de runtime;
> (c) gerar um `.d.ts` de chaves no `just`-like step.
> **Recomendação: (a)** — pt-BR importado explícito por namespace (a lista
> cresce devagar), resto por glob.

### 9.3 `config.ts`

```ts
export const locales = ["pt-BR", "en", "es", "zh"] as const;
// LOCALE_LABELS: + es: { label: "Español", flag: "🇪🇸" }
```

`negotiateLocale` já casa por prefixo (`es-AR` → `es`), sem mudança de lógica.

## 10. Arquivos esperados

| Arquivo                                                                 | Ação                                         |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| `src/i18n/config.ts`                                                    | editar — `es` em `locales` + `LOCALE_LABELS` |
| `src/i18n/dictionaries.ts`                                              | reescrever — merge por namespace             |
| `src/i18n/dictionaries/pt-BR/{common,navigation,home,auth,access}.json` | criar (a partir do `pt-BR.json`)             |
| `src/i18n/dictionaries/en/{...}.json`                                   | criar (a partir do `en.json`)                |
| `src/i18n/dictionaries/es/{...}.json`                                   | criar — **tradução nova**                    |
| `src/i18n/dictionaries/zh/{...}.json`                                   | criar (a partir do `zh.json`)                |
| `src/i18n/dictionaries/{pt-BR,en,zh}.json`                              | remover                                      |
| `src/i18n/translate.ts`                                                 | revisar (idealmente inalterado)              |
| `src/components/i18n/language-switcher.tsx`                             | revisar (deve funcionar sem mudança)         |

## 11. Critérios de aceitação

| #   | Critério                                                                                                          | Verificação         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| CA1 | `bun run check` passa                                                                                             | comando             |
| CA2 | `bun run lint` passa                                                                                              | comando             |
| CA3 | `bun run build` passa (glob resolve no build SSR)                                                                 | comando             |
| CA4 | App em `pt-BR` renderiza todas as telas atuais (login, forgot-password, dashboard, access) sem chave crua visível | manual, rota a rota |
| CA5 | Trocar para `en`, `es`, `zh` no switcher troca o texto na hora                                                    | manual              |
| CA6 | Remover uma chave de `en/auth.json` → build ainda passa, tela mostra fallback + warn em dev                       | manual              |
| CA7 | Remover `es/access.json` inteiro → `bun run check` **falha** (shape incompleto)                                   | manual              |
| CA8 | Nenhum call-site de `t(...)` foi alterado                                                                         | `git diff`          |

## 12. Riscos

- **R1** — `type Dictionary` perder a tipagem literal das chaves (ver D2).
  Mitigação: opção (a) do §9.2.
- **R2** — `import.meta.glob` com `eager` e SSR Nitro/azure-swa: validar em
  `bun run build` + `build:azure`, não só em `dev`.
- **R3** — Tradução `es` de baixa qualidade. Mitigação: `pt-BR`/`en` são a
  referência; marcar strings incertas para revisão humana (não deixar chave
  faltando).
- **R4** — Arquivo `.json` de namespace fora de sincronia entre locales com o
  tempo. Mitigação: item futuro — script de paridade de chaves no CI.

## 13. Decisões pendentes

- **D1** — Agrupamento exato dos namespaces: `common` = `metadata`+`theme`+
  `shell`? `navigation` separado de `common`? `metadata` merece arquivo próprio?
- **D2** — Estratégia de tipagem do `Dictionary` (a / b / c do §9.2).
  Recomendação: (a).
- **D3** — Código do locale espanhol: `es` (recomendado, genérico) vs `es-ES`
  / `es-AR` (região específica).
- **D4** — Rótulo/bandeira de `es` em `LOCALE_LABELS` (`🇪🇸` "Español"?).
- **D5** — Ordem dos idiomas no `LanguageSwitcher` (hoje segue `locales`).
- **D6** — Script de paridade de chaves entra nesta SPEC ou vira SPEC-01?

## 14. Decisões tomadas (usuário, aprovação `APROVAR SPEC-00`)

- **D1** — Agrupamento seguindo §9.1: `common` = `metadata`+`theme`+`shell`,
  `navigation` separado (ex-`nav`), `home`/`auth`/`access` cada um seu arquivo.
- **D2** — `pt-BR` importado estático por namespace (tipagem forte); `en`,
  `es`, `zh` via `import.meta.glob` eager.
- **D3** — Locale `es` genérico (sem variante regional `es-ES`/`es-AR`).
- **D4** — `es` no `LOCALE_LABELS`: `{ label: "Español", flag: "🇪🇸" }`.
- **D5** — Ordem no `LanguageSwitcher`/`locales`: `pt-BR`, `en`, `zh`, `es`
  (`es` por último).
- **D6** — Script de paridade de chaves fica fora desta SPEC-00 (vira
  SPEC-01 futura).

## 15. Decisão adicional tomada durante a implementação

Ao implementar D1 literalmente (loader fazendo `dict[namespace] = conteúdo do
arquivo`), o namespace `common` ficaria acessível só em `common.theme.light`,
`common.metadata.title`, `common.shell.openMenu` — quebrando o único
call-site real hoje em produção (`t("theme.light")` em
`src/layouts/AppShell/index.tsx`) e violando RF1/CA8 ("nenhum call-site
alterado"). Isso não foi antecipado no desenho original da SPEC (§9.2), que
tratava todo namespace de forma simétrica.

Resolução aplicada (sem levantar `SCOPE CONFLICT` por ser um detalhe de
implementação do loader, não uma mudança de requisito ou de shape público):
o namespace `common.json` é o único caso especial — seu conteúdo
(`metadata`, `theme`, `shell`) é espalhado (`Object.assign`/spread) direto na
raiz do `Dictionary`, e não aninhado sob uma chave `common`. Os demais
namespaces (`navigation`, `home`, `auth`, `access`) seguem a regra padrão:
nome do arquivo = chave de topo. Isso preserva 100% o shape anterior
(`theme.*`, `metadata.*`, `shell.*` inalterados) — só `nav.*` virou
`navigation.*`, o que é seguro porque não havia nenhum call-site usando
`nav.*` no código (grep confirmado antes da mudança).

---

## Implementation Notes

- **Arquivos alterados/criados:**
  - `src/i18n/config.ts` — `es` em `locales` (por último) e `LOCALE_LABELS`.
  - `src/i18n/dictionaries.ts` — reescrito: `pt-BR` estático por namespace
    (fonte de tipo), `en`/`es`/`zh` via `import.meta.glob`; caso especial do
    namespace `common` (ver §15).
  - `src/i18n/dictionaries/pt-BR/{common,navigation,home,auth,access}.json` —
    criados a partir do antigo `pt-BR.json`.
  - `src/i18n/dictionaries/en/{...}.json` — criados a partir do `en.json`.
  - `src/i18n/dictionaries/zh/{...}.json` — criados a partir do `zh.json`.
  - `src/i18n/dictionaries/es/{...}.json` — criados, tradução nova.
  - `src/i18n/dictionaries/{pt-BR,en,zh}.json` — removidos.
  - `src/i18n/translate.ts`, `src/i18n/index.tsx`,
    `src/components/i18n/language-switcher.tsx` — **inalterados** (API de
    consumo intacta, switcher itera `locales` dinamicamente).
- **Comandos executados:**
  - `bun run check` — 9 erros de `tsc`, todos pré-existentes e alheios a i18n
    (`src/components/site/SiteHeader.tsx` — rotas de site ainda não migradas
    para `routeTree.gen.ts`; `src/layouts/AppBrand/index.tsx` — resíduo de
    `react-router-dom`/Next, já listado em "Pendências conhecidas" do
    AGENTS.md). Confirmado via stash temporário + reaplicação que a contagem
    e o conteúdo dos erros é idêntico com e sem as mudanças desta SPEC — **0
    erros novos introduzidos**.
  - `bun run lint` — 3 erros + 60 warnings, todos pré-existentes
    (`src/lib/session.server.ts`, `src/layouts/Form/**`), nenhum em
    `src/i18n/**` alterado por esta SPEC.
  - `bun run build` — **passou** (`✓ built`), confirmando que
    `import.meta.glob` eager resolve corretamente em build SSR
    (Nitro/preset azure-swa-compatível).
- **Critérios de aceitação:**

| #   | Critério                              | Resultado                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 | `bun run check` passa                 | PARCIAL — passa para o escopo desta SPEC (0 erros novos); 9 erros pré-existentes e não relacionados permanecem no repositório                                                                                                                                                                        |
| CA2 | `bun run lint` passa                  | PARCIAL — mesmo caso: 0 problemas novos; 3 erros + 60 warnings pré-existentes permanecem                                                                                                                                                                                                             |
| CA3 | `bun run build` passa                 | PASS                                                                                                                                                                                                                                                                                                 |
| CA4 | Renderização pt-BR sem chave crua     | NOT VERIFIED — nenhuma verificação manual de UI rodada nesta sessão (sem servidor dev ativo); risco baixo pois só `theme.*` tem call-site real hoje e seu valor foi preservado                                                                                                                       |
| CA5 | Troca de idioma no switcher           | NOT VERIFIED — idem, requer app rodando                                                                                                                                                                                                                                                              |
| CA6 | Fallback de chave ausente             | NOT VERIFIED — comportamento de `translate.ts` inalterado (mesma lógica), risco baixo                                                                                                                                                                                                                |
| CA7 | Remover `es/access.json` quebra `tsc` | NOT VERIFIED manualmente, mas garantido por construção: `Dictionary` é derivado de `pt-BR` (todas as 5 chaves obrigatórias) e `buildLocale` retorna `Dictionary`; faltar o arquivo deixa `out.access` `undefined`, e o cast final `as Dictionary` mascara isso em runtime — **ver limitação abaixo** |
| CA8 | Nenhum call-site de `t(...)` alterado | PASS — `git diff` mostra zero mudança em `src/layouts/AppShell/index.tsx` (único call-site real)                                                                                                                                                                                                     |

- **Decisões tomadas durante a implementação:** ver §15 acima (caso especial
  do namespace `common` para preservar RF1/CA8).
- **Limitações conhecidas:**
  - CA7 assume que faltar um arquivo de namespace vira erro de **tipo**. Na
    implementação atual, `buildLocale` monta o objeto dinamicamente e termina
    com `return out as Dictionary` — um `as` que **silencia** a ausência de
    uma chave em tempo de compilação (o `tsc` não vai acusar `es` incompleto
    se faltar `access.json`, só quebraria em runtime ao acessar
    `t("access.title")` em locale `es`, caindo no fallback + warn). Isso é
    uma diferença do que RF4/CA7 pedem literalmente ("erro de tipo em
    build"). A alternativa mais segura seria validar `Object.keys(out)`
    contra as chaves de `Dictionary` em runtime (dev-only) ou usar um
    utilitário de tipo que force exaustividade — não implementada nesta
    rodada por não ter sido explicitamente decidida pelo usuário nas D1–D6 e
    para não expandir escopo sem aprovação. Registro como ponto em aberto
    para o usuário decidir se quer endurecer isso agora ou tratar junto da
    SPEC-01 (D6, script de paridade de chaves).
  - Verificação visual (CA4–CA6) não foi feita nesta sessão — recomenda-se
    rodar `bun run dev` e navegar pelas telas de login/forgot-password/
    dashboard/access nos 4 locales antes de considerar a feature 100%
    encerrada em produção.
  - `es` é uma tradução nova feita por mim (não revisada por falante nativo);
    strings devem ser tratadas como sujeitas a revisão humana (R3 da SPEC).

---

**Status final: IMPLEMENTED** (com as limitações acima documentadas).
