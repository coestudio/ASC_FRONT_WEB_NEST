# SPEC-28 — Paginação enxuta (`ListPagination`)

- **ID:** SPEC-28
- **Nome:** list-pagination-compact
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/ui/list-pagination.tsx` (compartilhado, 9
  consumidores)
- **Contexto do pedido:** item do `TODO.md` ("Paginação enxuta"),
  transformado em SPEC formal a pedido do usuário — grupo "frontend puro,
  sem dependência de Core".

---

## 1. Objetivo

Trocar a paginação numerada atual (`Prev` + botão por página + `Next`) por
um controle enxuto (`<< < (página) > >>`) que não degrada visualmente com
muitas páginas (ex.: 300 páginas hoje renderiza 300 `Pagination.Item`).

## 2. Contexto

`ListPagination` (`src/components/ui/list-pagination.tsx`) é usado em 9
lugares: `crud-list-page.tsx` (genérico — Acesso, Cadastros, Clientes) e
diretamente em `operations-list.tsx` + 5 abas de Operação
(`Responsible.tsx`, `Log.tsx`, `Containers.tsx`, `Reports.tsx`,
`Documents.tsx`, `Invoice.tsx` — 6 usos diretos, confirmado por grep). Hoje
`Array.from({ length: totalPages }, ...)` gera um `Pagination.Item` por
página — com listas grandes (romaneio de uma operação grande, por
exemplo) isso quebra o layout.

O usuário confirmou que o foco esperado do usuário final é a **busca**
(campo de texto já existente em todas as telas via `CrudListPage`/estado
local de `search`), não a navegação manual por número de página — a
paginação é só uma rede de segurança.

## 3. Escopo

- Reescrever `ListPagination` para o formato `<< < (página) > >>`:
  - `<<` — vai para a página 1 (desabilitado se já está na página 1).
  - `<` — página anterior (desabilitado se já está na página 1).
  - `(página)` — indicador textual da posição atual, não clicável (ex.:
    "3 / 42"), sem input numérico livre (fora de escopo — ver §9).
  - `>` — próxima página (desabilitado se já está na última).
  - `>>` — vai para a última página (desabilitado se já está na última).
- Manter a assinatura pública do componente (`page`, `totalPages`,
  `onPageChange`, `className`) — os 9 consumidores não mudam.
- Manter a regra de não renderizar nada com `totalPages <= 1`.

## 4. Fora do escopo

- Mudar o tamanho de página (`DEFAULT_PAGE_SIZE`, `src/lib/page-size.ts`).
- Adicionar campo de "ir para página N" digitável — não pedido, e
  reforça navegação manual em vez de busca (contrário ao foco confirmado
  pelo usuário). Se o usuário quiser isso depois, é SPEC própria.
- Mudar qualquer chamador (`crud-list-page.tsx`, abas de Operação) além do
  necessário para consumir a nova UI (a prop já é compatível).

## 5. Requisitos funcionais

- **RF1** — `ListPagination` renderiza 4 botões (`<<`, `<`, `>`, `>>`) e um
  indicador de posição central, sem depender de `totalPages` para a
  contagem de elementos renderizados (não itera mais 1 elemento por
  página).
- **RF2** — `<<`/`<` desabilitados quando `page <= 1`; `>`/`>>`
  desabilitados quando `page >= totalPages`.
- **RF3** — Indicador de posição usa i18n (`common.json` — chave nova, ver
  §7), formato `"{{page}} / {{totalPages}}"` (interpolação, mesmo padrão
  de `useT()` já usado no projeto).
- **RF4** — Acessibilidade: cada botão mantém `aria-label` descritivo
  (ex. "Primeira página", "Página anterior", "Próxima página", "Última
  página"), i18n também.

## 6. Não funcionais

- Sem regressão visual em telas estreitas (mobile) — o controle de 4
  botões + texto deve caber numa linha sem quebrar, ao contrário do atual
  com N botões.

## 7. i18n

Namespace `common` (`src/i18n/dictionaries/<locale>/common.json`), 4
locales:

- `pagination.first` (aria-label "Primeira página")
- `pagination.previous`
- `pagination.next`
- `pagination.last`
- `pagination.position` (ex. `"{{page}} de {{totalPages}}"` em pt-BR —
  texto exato de cada locale é tradução direta, não é decisão de negócio)

## 8. Camada de dados

Não se aplica — componente puramente visual, sem chamada à API.

## 9. Decisões pendentes

Nenhuma decisão de negócio pendente — mudança é puramente de UI, mantendo
o contrato de props. `[NEEDS_DECISION]` menor, não bloqueante (segue com a
opção A se o usuário não se manifestar antes da aprovação):

- **A)** Indicador de posição é só texto (`"3 / 42"`), sem interação —
  proposta desta SPEC.
- **B)** Indicador de posição é um `<select>`/dropdown com todas as
  páginas — mais interativo, mas reintroduz o problema de listar N opções
  (menos grave que N botões, mas ainda cresce com `totalPages`).

## 10. Arquivos esperados

- `src/components/ui/list-pagination.tsx` (reescrito)
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/common.json` (chaves novas)

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Com `totalPages` grande (ex. 300), `ListPagination` renderiza sempre o mesmo número fixo de elementos (4 botões + indicador), não 300 |
| CA2 | `<<`/`<` desabilitados na primeira página; `>`/`>>` desabilitados na última |
| CA3 | Clique em cada botão chama `onPageChange` com o valor correto (`1`, `page - 1`, `page + 1`, `totalPages`) |
| CA4 | Os 9 consumidores existentes continuam funcionando sem alteração de código (só o componente interno muda) |
| CA5 | i18n: 4 locales com as mesmas chaves novas, `pt-BR` como fonte |
| CA6 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Baixo: componente isolado, sem mudança de contrato de props;
  risco limitado a regressão visual, verificável manualmente nas 9 telas
  consumidoras.

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/ui/list-pagination.tsx` — reescrito: troca o
    `Array.from({ length: totalPages }, ...)` (1 `Pagination.Item` por
    página) por 4 botões fixos (`Pagination.First`/`Prev`/`Next`/`Last`) +
    um `Pagination.Item` `disabled` central usado só como indicador
    textual de posição (`t("pagination.position", { page, totalPages })`),
    seguindo a opção A do §9 (indicador só-texto, sem input/`<select>`).
    Assinatura pública (`page`, `totalPages`, `onPageChange`, `className`)
    inalterada.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/common.json` — namespace
    `pagination` novo (`first`, `previous`, `next`, `last`, `position`),
    mesmas chaves nos 4 locales, `pt-BR` como fonte.
- **Comandos executados:**
  - `bun install` — `VERIFIED` (531 pacotes, sem erro; `node_modules`
    estava ausente no worktree isolado).
  - `bun run check` (`tsc --noEmit`) — `VERIFIED`, sem erros.
  - `bun run lint` — `VERIFIED` a intenção (roda e reporta 3 erros/63
    warnings pré-existentes, todos em arquivos não tocados por esta SPEC
    — `src/lib/session.server.ts` (regra de hooks, débito antigo) e vários
    `layouts/Form/Fields/*` (warnings de `any`/unused var pré-existentes).
    Confirmado via `git diff` que nenhum desses arquivos foi alterado e via
    `grep` no output que `list-pagination.tsx`/`common.json` não aparecem
    entre os problemas — zero lint novo introduzido por esta SPEC).
  - `just map` — não se aplica (RF8/§8: componente puramente visual, sem
    contrato de API).
- **Critérios de aceitação:**

  | # | Critério | Resultado |
  | --- | --- | --- |
  | CA1 | `totalPages` grande renderiza sempre o mesmo número fixo de elementos | PASS — 4 botões + 1 indicador, sem `Array.from` por página |
  | CA2 | `<<`/`<` desabilitados na 1ª página; `>`/`>>` desabilitados na última | PASS — `isFirst`/`isLast` controlam os 4 `disabled` |
  | CA3 | Clique em cada botão chama `onPageChange` com o valor correto | PASS — `onPageChange(1)`, `(page - 1)`, `(page + 1)`, `(totalPages)` |
  | CA4 | Os 9 consumidores continuam funcionando sem alteração de código | PASS — assinatura de props inalterada, nenhum consumidor tocado (`crud-list-page.tsx`, `operations-list.tsx`, abas de Operação) |
  | CA5 | i18n: 4 locales com as mesmas chaves, `pt-BR` fonte | PASS — `pagination.{first,previous,next,last,position}` nos 4 `common.json`, JSON validado |
  | CA6 | `bun run check` + `bun run lint` sem regressão | PASS — `check` limpo; `lint` só reporta débito pré-existente não relacionado |

- **Decisões tomadas durante a implementação:** seguida a opção A do §9
  (fallback já definido na SPEC, sem manifestação em contrário do usuário)
  — indicador de posição é só texto, não interativo.
- **Limitações conhecidas:** nenhuma nova. Débito de lint pré-existente
  (`session.server.ts`, `layouts/Form/Fields/*`) permanece fora do escopo
  desta SPEC.
