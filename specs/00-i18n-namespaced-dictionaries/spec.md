# SPEC-00 — Dicionários de i18n particionados por namespace + locale `es`

- **ID:** SPEC-00
- **Nome:** i18n-namespaced-dictionaries
- **Status:** DRAFT
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
>     (glob só para os outros locales) — mantém `TranslationKey` forte;
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

| Arquivo | Ação |
| --- | --- |
| `src/i18n/config.ts` | editar — `es` em `locales` + `LOCALE_LABELS` |
| `src/i18n/dictionaries.ts` | reescrever — merge por namespace |
| `src/i18n/dictionaries/pt-BR/{common,navigation,home,auth,access}.json` | criar (a partir do `pt-BR.json`) |
| `src/i18n/dictionaries/en/{...}.json` | criar (a partir do `en.json`) |
| `src/i18n/dictionaries/es/{...}.json` | criar — **tradução nova** |
| `src/i18n/dictionaries/zh/{...}.json` | criar (a partir do `zh.json`) |
| `src/i18n/dictionaries/{pt-BR,en,zh}.json` | remover |
| `src/i18n/translate.ts` | revisar (idealmente inalterado) |
| `src/components/i18n/language-switcher.tsx` | revisar (deve funcionar sem mudança) |

## 11. Critérios de aceitação

| # | Critério | Verificação |
| --- | --- | --- |
| CA1 | `bun run check` passa | comando |
| CA2 | `bun run lint` passa | comando |
| CA3 | `bun run build` passa (glob resolve no build SSR) | comando |
| CA4 | App em `pt-BR` renderiza todas as telas atuais (login, forgot-password, dashboard, access) sem chave crua visível | manual, rota a rota |
| CA5 | Trocar para `en`, `es`, `zh` no switcher troca o texto na hora | manual |
| CA6 | Remover uma chave de `en/auth.json` → build ainda passa, tela mostra fallback + warn em dev | manual |
| CA7 | Remover `es/access.json` inteiro → `bun run check` **falha** (shape incompleto) | manual |
| CA8 | Nenhum call-site de `t(...)` foi alterado | `git diff` |

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

---

**Próximo passo:** usuário decide D1–D6, depois `APROVAR SPEC-00` para
implementação.
